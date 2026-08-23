import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

/* Reads new messages out of an account's @cargopax.ca inbox. This replaces
   the original's SES -> S3 -> Lambda -> Postgres pipeline: the inbox is a
   Migadu mailbox, so IMAP is the inbound path. Messages are identified by
   UID; the app remembers the last UID (and UIDVALIDITY) it recorded, and a
   changed UIDVALIDITY means start over (the Message-ID keeps that from
   recording anything twice). */

export interface InboundMessage {
  messageId: string;
  uid: number;
  uidValidity: number;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  text: string;
  html: string;
}

export interface PollTarget {
  address: string;
  password: string;
  lastUid: number;
  uidValidity: number | null;
}

function imapHost(): string {
  return process.env.IMAP_HOST || 'imap.migadu.com';
}

function imapPort(): number {
  return parseInt(process.env.IMAP_PORT || '993', 10);
}

export const MAX_MESSAGES_PER_POLL = 20;

function toTimestamp(value: Date | string | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

export async function fetchNewMessages(target: PollTarget): Promise<InboundMessage[]> {
  const client = new ImapFlow({
    host: imapHost(),
    port: imapPort(),
    secure: true,
    // Only a local test server (GreenMail) needs the self-signed escape hatch
    tls: { rejectUnauthorized: (process.env.IMAP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false' },
    auth: { user: target.address, pass: target.password },
    logger: false
  });

  await client.connect();
  const found: InboundMessage[] = [];
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      if (!mailbox) {
        return [];
      }
      const uidValidity = Number(mailbox.uidValidity);
      const startUid = target.uidValidity !== null && target.uidValidity === uidValidity ? target.lastUid + 1 : 1;

      const uids = await client.search({ uid: `${startUid}:*` }, { uid: true });
      if (!uids || uids.length === 0) {
        return [];
      }
      // "N:*" also returns the last message when N is past the end
      const fresh = uids.filter(uid => uid >= startUid).sort((a, b) => a - b).slice(0, MAX_MESSAGES_PER_POLL);

      for (const uid of fresh) {
        const message = await client.fetchOne(String(uid), { source: true, internalDate: true }, { uid: true });
        if (!message || !message.source) {
          continue;
        }
        const parsed = await simpleParser(message.source);
        const from = parsed.from?.text ?? '';
        const toHeader = parsed.to;
        const to = Array.isArray(toHeader) ? toHeader.map(t => t.text).join(', ') : toHeader?.text ?? target.address;
        found.push({
          messageId: parsed.messageId || `uid-${uidValidity}-${uid}@${target.address}`,
          uid,
          uidValidity,
          subject: parsed.subject ?? '',
          from,
          to,
          receivedAt: toTimestamp(parsed.date ?? message.internalDate),
          text: parsed.text ?? '',
          html: typeof parsed.html === 'string' ? parsed.html : ''
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return found;
}
