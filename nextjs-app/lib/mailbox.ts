import { isMailboxLocalPartTaken } from '@/lib/db/system';
import { isMailboxLocalPartClaimed } from '@/lib/queries/account-queries';
import { getMailbox, migaduConfigured } from '@/lib/migadu';
import { isEmailTestMode } from '@/lib/mail';

/* Everything about the @cargopax.ca name a user picks (at registration,
   or later in Settings): the rules, the reserved list, and the
   availability check the forms and the routes share. Provisioning itself
   is the job in lib/jobs.ts. */

export { MAIL_HOSTS } from '@/lib/site';

const LOCAL_PART_PATTERN = /^[a-z0-9][a-z0-9._-]{0,39}$/;

const RESERVED_LOCAL_PARTS = new Set([
  'postmaster', 'abuse', 'admin', 'administrator', 'hostmaster', 'webmaster',
  'root', 'mail', 'mailer-daemon', 'noreply', 'no-reply', 'security',
  'support', 'help', 'info', 'contact', 'sales', 'billing', 'legal',
  'cargopax', 'sean', 'sbennett', '8examples'
]);

export function normalizeLocalPart(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
}

export function validateLocalPart(local: string): { valid: boolean; message?: string } {
  if (!LOCAL_PART_PATTERN.test(local)) {
    return { valid: false, message: 'Use letters, numbers, dots or dashes; start with a letter or number.' };
  }
  if (RESERVED_LOCAL_PARTS.has(local)) {
    return { valid: false, message: 'That name is reserved.' };
  }
  return { valid: true };
}

/* Is local@domain still free? Checks the rules, every account that already
   claimed the name (system db), and Migadu itself (covers hand-made ones).
   When Migadu is unreachable the answer is optimistic; the provisioning job
   re-checks before creating anything. */
export async function mailboxAvailability(
  local: string,
  domain: string,
  exceptTenantId?: string
): Promise<{ available: boolean; reason?: string }> {
  const validation = validateLocalPart(local);
  if (!validation.valid) {
    return { available: false, reason: validation.message };
  }
  if (isMailboxLocalPartTaken(local, exceptTenantId) || isMailboxLocalPartClaimed(local, domain, exceptTenantId)) {
    return { available: false, reason: 'That inbox name is taken.' };
  }
  if (migaduConfigured() && !isEmailTestMode()) {
    try {
      const existing = await getMailbox(domain, local);
      if (existing.ok) {
        return { available: false, reason: 'That inbox name is taken.' };
      }
    } catch {
      /* provider unreachable: fall through */
    }
  }
  return { available: true };
}
