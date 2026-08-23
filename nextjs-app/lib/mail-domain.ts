import { getLogger } from '@/lib/logger';
import { getMailDomain } from '@/lib/site';
import { activateDomain, addDomain, DnsRecord, getDomainRecords, migaduConfigured, parseMigaduRecords } from '@/lib/migadu';
import { cloudflareConfigured, createZoneRecords, zoneExists } from '@/lib/cloudflare';

/* Converges the mail domain (MAIL_DOMAIN, cargopax.ca) on the Migadu
   account so accounts can be issued addresses on it. Ported from
   8examples' ensureMailboxDns, which does the same for customer domains:

     1. read the domain's records from Migadu; add the domain if it is not
        on the account yet, then read again
     2. publish those records if the DNS provider is one we can write to
        (Cloudflare); otherwise report them so an operator can publish them
     3. ask Migadu to verify and activate

   Platform-wide state, not per-account, so it lives in memory rather than
   in an account's event stream: it runs from pumpJobs (before mailbox
   provisioning), succeeds once, and is re-checked every 6 hours in case
   records drift. `/api/queries/mail-domain` reports the current state,
   including the exact records still to publish. */

const log = getLogger('mail-domain');

const VERIFIED_TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

export type MailDomainStage =
  | 'unconfigured'   // no Migadu credentials
  | 'ready'          // on the account, records verified, activated
  | 'awaiting_dns'   // on the account; records must be published
  | 'error';

export interface MailDomainStatus {
  domain: string;
  stage: MailDomainStage;
  checkedAt: number | null;
  detail: string;
  // The records Migadu wants published, when they are not published yet
  requiredRecords: DnsRecord[];
  dnsProvider: 'cloudflare' | 'external' | 'unknown';
}

let status: MailDomainStatus = {
  domain: getMailDomain(),
  stage: 'unconfigured',
  checkedAt: null,
  detail: 'not checked yet',
  requiredRecords: [],
  dnsProvider: 'unknown'
};

let inFlight: Promise<MailDomainStatus> | null = null;

export function getMailDomainStatus(): MailDomainStatus {
  return { ...status, requiredRecords: [...status.requiredRecords] };
}

function dueForCheck(now: number): boolean {
  if (status.checkedAt === null) {
    return true;
  }
  const age = now - status.checkedAt;
  return status.stage === 'ready' ? age >= VERIFIED_TTL_MS : age >= RETRY_AFTER_FAILURE_MS;
}

function settle(next: Omit<MailDomainStatus, 'domain' | 'checkedAt'>): MailDomainStatus {
  status = { domain: getMailDomain(), checkedAt: Date.now(), ...next };
  const line = `${status.domain}: ${status.stage} (${status.detail})`;
  if (status.stage === 'ready') {
    log.info(line);
  } else if (status.stage === 'error') {
    log.error(line);
  } else {
    log.warn(line);
    if (status.requiredRecords.length > 0) {
      log.warn(
        `Publish these records for ${status.domain}, then it activates on its own:\n` +
          status.requiredRecords
            .map(r => `  ${r.type.padEnd(5)} ${r.name} -> ${r.content}${r.priority !== undefined ? ` (priority ${r.priority})` : ''}`)
            .join('\n')
      );
    }
  }
  return getMailDomainStatus();
}

export async function ensureMailDomain(force: boolean = false): Promise<MailDomainStatus> {
  if (inFlight) {
    return inFlight;
  }
  if (!force && !dueForCheck(Date.now())) {
    return getMailDomainStatus();
  }
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<MailDomainStatus> {
  const domain = getMailDomain();

  if (!migaduConfigured()) {
    return settle({
      stage: 'unconfigured',
      detail: 'MIGADU_ADMIN_EMAIL / MIGADU_API_KEY are not set',
      requiredRecords: [],
      dnsProvider: 'unknown'
    });
  }

  try {
    // 1. Is the domain on the account? Migadu may refuse the records call
    //    outright for a domain it does not have, so a throw counts as "no".
    let records = await getDomainRecords(domain).catch(() => null);
    if (!records?.ok) {
      const added = await addDomain(domain);
      records = await getDomainRecords(domain).catch(() => null);
      if (!records?.ok) {
        return settle({
          stage: 'error',
          detail: `domain is not on the Migadu account (add returned ${added.status}, records returned ${records?.status ?? 'no response'})`,
          requiredRecords: [],
          dnsProvider: 'unknown'
        });
      }
      log.info(`Added ${domain} to the Migadu account`);
    }

    const required = parseMigaduRecords(records.data);
    if (!required) {
      return settle({
        stage: 'error',
        detail: `Migadu returned no usable DNS records: ${JSON.stringify(records.data).slice(0, 300)}`,
        requiredRecords: [],
        dnsProvider: 'unknown'
      });
    }

    // 2. Publish them if this domain's DNS is somewhere we can write.
    const onCloudflare = await zoneExists(domain);
    const dnsProvider: MailDomainStatus['dnsProvider'] =
      onCloudflare === true ? 'cloudflare' : onCloudflare === false ? 'external' : 'unknown';

    if (onCloudflare === true) {
      const written = await createZoneRecords(domain, required);
      if (!written.ok) {
        return settle({
          stage: 'awaiting_dns',
          detail: `could not write every record to Cloudflare: ${written.errors.join('; ').slice(0, 300)}`,
          requiredRecords: required,
          dnsProvider
        });
      }
      log.info(`Published ${written.created} DNS record(s) for ${domain} to Cloudflare`);
    }

    // 3. Migadu re-checks DNS and flips the domain live.
    const activation = await activateDomain(domain);
    if (!activation.ok) {
      const where = onCloudflare === true
        ? 'records were written to Cloudflare but have not propagated yet'
        : cloudflareConfigured()
          ? `${domain} is not a Cloudflare zone here, so its records must be published wherever its DNS lives`
          : 'no DNS provider is configured (set CLOUDFLARE_API_TOKEN, or publish the records by hand)';
      return settle({
        stage: 'awaiting_dns',
        detail: `Migadu has not verified the domain yet (${activation.status}); ${where}`,
        requiredRecords: required,
        dnsProvider
      });
    }

    return settle({
      stage: 'ready',
      detail: 'on the Migadu account, DNS verified, activated',
      requiredRecords: [],
      dnsProvider
    });
  } catch (error: any) {
    return settle({
      stage: 'error',
      detail: error?.message || String(error),
      requiredRecords: [],
      dnsProvider: 'unknown'
    });
  }
}
