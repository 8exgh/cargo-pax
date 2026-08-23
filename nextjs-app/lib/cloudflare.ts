import { DnsRecord } from './migadu';
import { isEmailTestMode } from './mail';

/* Cloudflare DNS adapter, the parts of 8examples/src/app/lib/cloudflare.ts
   this app needs: does Cloudflare host the zone, and write Migadu's mail
   records into it. Env: CLOUDFLARE_API_TOKEN (Zone:Read + DNS:Edit) and
   optionally CLOUDFLARE_ACCOUNT_ID.

   When the mail domain's DNS lives somewhere else (cargopax.ca is on
   Google Cloud DNS today), leave the token unset: lib/mail-domain.ts then
   reports the exact records to publish by hand instead of writing them. */

let cachedAccountId: string | null = null;

async function creds(): Promise<{ token: string; account: string } | null> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return null;
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || cachedAccountId;
  if (account) {
    return { token, account };
  }
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      return null;
    }
    const body = await res.json();
    const id = body.result?.[0]?.id;
    if (!id) {
      return null;
    }
    cachedAccountId = id;
    return { token, account: id };
  } catch (error) {
    console.error('cloudflare account discovery failed:', error);
    return null;
  }
}

export function cloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN);
}

/* true / false / null when we cannot tell (no token, API error). */
export async function zoneExists(domain: string): Promise<boolean | null> {
  if (isEmailTestMode()) {
    return false;
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return null;
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain.toLowerCase())}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!res.ok) {
      return null;
    }
    const body = await res.json();
    if (!body.success || !Array.isArray(body.result)) {
      return null;
    }
    return body.result.length > 0;
  } catch {
    return null;
  }
}

/* Creates DNS records in a zone we host. Mail records are always DNS-only
   (proxied: false); an already-identical record counts as ok. */
export async function createZoneRecords(
  domain: string,
  records: DnsRecord[]
): Promise<{ ok: boolean; created: number; errors: string[] }> {
  const c = await creds();
  if (!c) {
    return { ok: false, created: 0, errors: ['Cloudflare is not configured'] };
  }
  const headers = { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' };
  const zres = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain.toLowerCase())}`,
    { headers, cache: 'no-store' }
  );
  const zbody = await zres.json().catch(() => null);
  const zone = zbody?.result?.[0];
  if (!zone) {
    return { ok: false, created: 0, errors: [`no zone for ${domain}`] };
  }

  let created = 0;
  const errors: string[] = [];
  for (const record of records) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: record.type,
          name: record.name,
          content: record.content,
          ...(record.priority !== undefined ? { priority: record.priority } : {}),
          proxied: false,
          ttl: 1
        })
      });
      if (res.ok) {
        created++;
        continue;
      }
      const body = await res.json().catch(() => null);
      const codes = (body?.errors ?? []).map((e: { code?: number }) => e.code);
      // Cloudflare has used 81053, 81057, and 81058 for an identical record
      // across API revisions. Existing desired state is success.
      if (codes.includes(81053) || codes.includes(81057) || codes.includes(81058)) {
        continue;
      }
      errors.push(`${record.type} ${record.name}: ${JSON.stringify(body?.errors ?? res.status)}`);
    } catch (error) {
      errors.push(`${record.type} ${record.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { ok: errors.length === 0, created, errors };
}
