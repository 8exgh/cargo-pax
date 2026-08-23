import crypto from 'crypto';
import { isEmailTestMode } from './mail';

/* Migadu admin API adapter, lifted from 8examples. Flat-fee hosted email:
   unlimited domains and mailboxes under one account. HTTP Basic auth
   (admin email + API key). Env: MIGADU_ADMIN_EMAIL, MIGADU_API_KEY
   (injected at deploy from the devops secrets MIGADU_8EXAMPLES_ADMIN_EMAIL /
   MIGADU_8EXAMPLES_API_KEY). When absent, mailbox provisioning records a
   failure and retries later; nothing else breaks.

   The mail domain itself is added to the Migadu account by lib/mail-domain.ts
   (the app does it on startup/pump); only publishing the DNS records needs a
   DNS provider the app can write to. */

const BASE = 'https://api.migadu.com/v1';

export interface MigaduResult {
  ok: boolean;
  status: number;
  data: unknown;
}

function creds() {
  const email = process.env.MIGADU_ADMIN_EMAIL;
  const key = process.env.MIGADU_API_KEY;
  if (!email || !key) {
    return null;
  }
  return { auth: 'Basic ' + Buffer.from(`${email}:${key}`).toString('base64') };
}

export function migaduConfigured(): boolean {
  return isEmailTestMode() || creds() !== null;
}

async function call(method: string, pathPart: string, body?: object): Promise<MigaduResult> {
  if (isEmailTestMode()) {
    // Pretend no mailbox exists yet and every write succeeds
    if (method === 'GET' && pathPart.includes('/mailboxes/')) {
      return { ok: false, status: 404, data: null };
    }
    if (method === 'GET' && pathPart.endsWith('/records')) {
      return {
        ok: true,
        status: 200,
        data: [{ type: 'MX', name: '@', value: 'aspmx1.migadu.com', priority: 10 }]
      };
    }
    return { ok: true, status: 200, data: { test: true, body } };
  }

  const c = creds();
  if (!c) {
    throw new Error('Migadu not configured');
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${pathPart}`, {
        method,
        headers: {
          Authorization: c.auth,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (res.status < 500 || attempt === 3) {
        return { ok: res.ok, status: res.status, data };
      }
      lastError = new Error(`Migadu returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 300));
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Migadu request failed after 3 attempts: ${detail}`);
}

export function generatePassword(): string {
  // 16 chars, no ambiguous lookalikes
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/* Adds the mail domain to the Migadu account. Idempotent-ish: a duplicate
   returns a non-2xx we treat as already-present (the records read below is
   the authoritative check that the account owns it). */
export async function addDomain(domain: string): Promise<MigaduResult> {
  return call('POST', '/domains', {
    name: domain,
    hosted_dns: false,
    create_default_addresses: false
  });
}

/* The DNS records Migadu needs published for the domain (MX, SPF, DKIM,
   DMARC, verification). */
export async function getDomainRecords(domain: string): Promise<MigaduResult> {
  return call('GET', `/domains/${encodeURIComponent(domain)}/records`);
}

/* Asks Migadu to re-check the published records and activate the domain. */
export async function activateDomain(domain: string): Promise<MigaduResult> {
  return call('GET', `/domains/${encodeURIComponent(domain)}/activate`);
}

export interface DnsRecord {
  type: string;
  name: string;
  content: string;
  priority?: number;
}

/* Migadu's records endpoint shape is only loosely documented; accept the
   obvious field spellings (lifted from 8examples, which confirmed these
   against the live API). */
export function parseMigaduRecords(data: unknown): DnsRecord[] | null {
  const grouped = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const groupedRecords = grouped
    ? ['dns_verification', 'mx_records', 'spf', 'dkim', 'dmarc']
        .flatMap(key => {
          const value = grouped[key];
          return Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
        })
    : [];
  const list = Array.isArray(data)
    ? data
    : grouped && Array.isArray(grouped.records)
      ? grouped.records
      : groupedRecords.length
        ? groupedRecords
        : null;
  if (!list) {
    return null;
  }
  const out: DnsRecord[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const o = item as Record<string, unknown>;
    const type = String(o.type ?? o.record_type ?? '').toUpperCase();
    const name = String(o.name ?? o.host ?? o.hostname ?? '');
    const values = Array.isArray(o.values) ? o.values.map(String) : [String(o.value ?? o.content ?? '')];
    const priority = o.priority !== undefined ? Number(o.priority) : undefined;
    if (!type || !name || values.every(v => !v)) {
      return null;
    }
    for (const content of values) {
      if (content) {
        out.push({ type, name, content, priority });
      }
    }
  }
  return out.length > 0 ? out : null;
}

/* Looks up a single mailbox; ok=true means it exists. */
export async function getMailbox(domain: string, localPart: string): Promise<MigaduResult> {
  return call('GET', `/domains/${encodeURIComponent(domain)}/mailboxes/${encodeURIComponent(localPart)}`);
}

/* Creates local@domain with the given password. */
export async function createMailbox(opts: {
  domain: string;
  localPart: string;
  name: string;
  password: string;
}): Promise<MigaduResult> {
  return call('POST', `/domains/${encodeURIComponent(opts.domain)}/mailboxes`, {
    local_part: opts.localPart,
    domain_name: opts.domain,
    name: opts.name,
    password: opts.password,
    may_send: true,
    may_receive: true,
    may_access_imap: true,
    may_access_pop3: true
  });
}

/* Removes a mailbox. A 404 means it was never created (or already gone). */
export async function deleteMailbox(domain: string, localPart: string): Promise<MigaduResult> {
  return call('DELETE', `/domains/${encodeURIComponent(domain)}/mailboxes/${encodeURIComponent(localPart)}`);
}

/* Diagnostic: is the API key good and does it see the mail domain? */
export async function debugMigadu(domain: string): Promise<object> {
  if (!creds()) {
    return { configured: false };
  }
  const res = await call('GET', '/domains');
  const data = res.data as { domains?: { domain_name?: string }[] } | null;
  const names = Array.isArray(data?.domains) ? data!.domains!.map(d => d.domain_name) : [];
  return { configured: true, status: res.status, ok: res.ok, domainCount: names.length, hasMailDomain: names.includes(domain) };
}
