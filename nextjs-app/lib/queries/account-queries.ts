import { loadEvents, getPayloadBlobByEventId } from '@/lib/db/tenant-db';
import { getTenantIds, getUsersByTenant } from '@/lib/db/system';
import { replayEvents } from '@/lib/commands/event-replay';
import { accountAggregateId } from '@/lib/commands/account-commands';
import { COMPANY_LABELS, deliveryCompanyForUrl } from '@/lib/tracking/carrier';
import { AccountState, Tracker } from '@/types/events';
import {
  AccountView,
  EmailMessageContent,
  EmailMessageToProcess,
  InvitationEmailTask,
  MailboxDeletionTask,
  MailboxTask,
  MailboxToPoll,
  OwnerNotificationTask,
  PasswordResetEmailTask,
  PasswordResetLookup,
  PushNotificationTask,
  ShipmentNotificationTask,
  TrackerRefreshRequest,
  TrackerView,
  VerificationEmailTask,
  WelcomeEmailTask
} from '@/types/queries';
import { MAIL_HOSTS } from '@/lib/site';

// Every query is a replay of the account stream. No read model to keep in
// sync; at this scale a replay per request is cheap.
export function getAccountState(tenantId: string): AccountState {
  return replayEvents(loadEvents(tenantId, accountAggregateId(tenantId)));
}

function accountStates(): Array<{ tenantId: string; state: AccountState }> {
  return getTenantIds()
    .map(tenantId => ({ tenantId, state: getAccountState(tenantId) }))
    .filter(({ state }) => state.status === 'created');
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

// Carriers the scraper knows how to read. A url on any other site is
// tracked but never loaded in the browser (the allow-list is the SSRF
// guard, since the processor runs a real browser against these urls).
export function isAllowedTrackingUrl(url: string): boolean {
  const configured = process.env.TRACKING_ALLOWED_HOSTS;
  if (configured && configured.trim()) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return configured
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean)
        .some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`));
    } catch {
      return false;
    }
  }
  return deliveryCompanyForUrl(url) !== 'unknown';
}

function journeyPosition(t: Tracker): number {
  if (t.deliveredOnDate) return 3;
  if (t.outForDeliveryDate) return 2;
  if (t.onTheWayDate) return 1;
  if (t.labelCreatedOnDate) return 0;
  return -1;
}

function toTrackerView(t: Tracker): TrackerView {
  const autoRefresh = isAllowedTrackingUrl(t.url);
  return {
    trackerId: t.trackerId,
    url: t.url,
    label: t.label,
    deliveryCompany: t.deliveryCompany,
    deliveryCompanyLabel: COMPANY_LABELS[t.deliveryCompany] ?? COMPANY_LABELS.unknown,
    trackingNumber: t.trackingNumber,
    groupId: t.groupId,
    source: t.source,
    estimatedDeliveryDate: t.estimatedDeliveryDate,
    labelCreatedOnDate: t.labelCreatedOnDate,
    onTheWayDate: t.onTheWayDate,
    outForDeliveryDate: t.outForDeliveryDate,
    deliveredOnDate: t.deliveredOnDate,
    isDelivered: t.deliveredOnDate !== null,
    journeyPosition: journeyPosition(t),
    autoRefresh,
    refreshInProgress: autoRefresh && t.refreshRequested !== null,
    errorMessage: t.errorMessage,
    startedAt: t.startedAt
  };
}

export function getAccountView(tenantId: string, userId: string): AccountView | null {
  const state = getAccountState(tenantId);
  if (state.status !== 'created') {
    return null;
  }

  // The users table is the authority on who belongs and what they may do;
  // the stream carries the organization's own facts (name, logo).
  const users = getUsersByTenant(tenantId);
  const you = users.find(u => u.id === userId);

  const trackers = [...state.trackers].reverse().map(toTrackerView);
  return {
    organization: {
      name: state.organizationName ?? (state.email ? state.email.split('@')[1] : 'Your organization'),
      hasLogo: state.organizationLogo !== null,
      logoVersion: state.organizationLogo?.eventId ?? null
    },
    you: { userId, email: you?.email ?? state.email!, role: (you?.role as 'admin' | 'member') ?? 'member' },
    members: users
      .map(u => ({
        userId: u.id,
        email: u.email,
        role: u.role as 'admin' | 'member',
        createdAt: u.created_at,
        isYou: u.id === userId
      }))
      .sort((a, b) => a.createdAt - b.createdAt),
    email: state.email!,
    verified: state.verified,
    pushEndpoints: state.pushSubscriptions.map(p => p.endpoint),
    mailbox: state.mailbox
      ? {
          address: `${state.mailbox.localPart}@${state.mailbox.domain}`,
          status: state.mailbox.status,
          password: state.mailbox.password,
          webmail: MAIL_HOSTS.webmail,
          imap: MAIL_HOSTS.imap,
          smtp: MAIL_HOSTS.smtp
        }
      : null,
    forwardingAddress: state.mailbox ? `${state.mailbox.localPart}@${state.mailbox.domain}` : null,
    groups: state.groups.map(g => ({ groupId: g.groupId, name: g.name })),
    tracking: trackers.filter(t => !t.isDelivered),
    completedDeliveries: trackers.filter(t => t.isDelivered),
    recentEmails: [...state.emailMessages]
      .reverse()
      .slice(0, 20)
      .map(m => ({
        messageId: m.messageId,
        subject: m.subject,
        from: m.from,
        receivedAt: m.receivedAt,
        processed: m.processed,
        trackerIds: m.trackerIds
      }))
  };
}

/* ------------------------------------------------------------------ */
/* Background processor                                               */
/* ------------------------------------------------------------------ */

export function getRefreshRequests(): TrackerRefreshRequest[] {
  const requests: TrackerRefreshRequest[] = [];

  for (const { tenantId, state } of accountStates()) {
    for (const tracker of state.trackers) {
      if (!tracker.refreshRequested || !isAllowedTrackingUrl(tracker.url)) {
        continue;
      }
      requests.push({
        tenantId,
        trackerId: tracker.trackerId,
        url: tracker.url,
        company: tracker.deliveryCompany,
        trackingNumber: tracker.trackingNumber,
        priority: tracker.refreshRequested.priority,
        requestedAt: tracker.refreshRequested.requestedAt,
        hasLabelCreatedValue: tracker.labelCreatedOnDate !== null,
        hasOnTheWayValue: tracker.onTheWayDate !== null,
        hasOutForDeliveryValue: tracker.outForDeliveryDate !== null
      });
    }
  }

  // Highest priority first, then oldest request first
  requests.sort((a, b) => (b.priority - a.priority) || (a.requestedAt - b.requestedAt));
  return requests;
}

// Every provisioned inbox, with where its last poll got to. Credentials
// travel to the processor the way inventory-shopify hands it Shopify tokens.
export function getMailboxesToPoll(): MailboxToPoll[] {
  const mailboxes: MailboxToPoll[] = [];
  for (const { tenantId, state } of accountStates()) {
    const mailbox = state.mailbox;
    if (!mailbox || mailbox.status !== 'provisioned' || !mailbox.password) {
      continue;
    }
    const address = `${mailbox.localPart}@${mailbox.domain}`;
    // Only messages received into the current address count for the cursor
    const mine = state.emailMessages.filter(m => m.to.toLowerCase() === address.toLowerCase());
    const latest = mine.reduce<{ uid: number; uidValidity: number } | null>((acc, m) => {
      if (!acc || m.uidValidity > acc.uidValidity || (m.uidValidity === acc.uidValidity && m.uid > acc.uid)) {
        return { uid: m.uid, uidValidity: m.uidValidity };
      }
      return acc;
    }, null);
    mailboxes.push({
      tenantId,
      address,
      password: mailbox.password,
      lastUid: latest ? latest.uid : 0,
      uidValidity: latest ? latest.uidValidity : null
    });
  }
  return mailboxes;
}

export function getEmailMessagesToProcess(): EmailMessageToProcess[] {
  const tasks: EmailMessageToProcess[] = [];
  for (const { tenantId, state } of accountStates()) {
    for (const message of state.emailMessages) {
      if (message.processed) {
        continue;
      }
      tasks.push({ tenantId, messageId: message.messageId, subject: message.subject, from: message.from });
    }
  }
  return tasks;
}

export function getEmailMessageContent(tenantId: string, messageId: string): EmailMessageContent | null {
  const state = getAccountState(tenantId);
  const message = state.emailMessages.find(m => m.messageId === messageId);
  if (!message) {
    return null;
  }
  const blob = getPayloadBlobByEventId(tenantId, message.eventId);
  let body = { text: '', html: '' };
  if (blob) {
    try {
      body = JSON.parse(blob.toString('utf8'));
    } catch {
      body = { text: blob.toString('utf8'), html: '' };
    }
  }
  return {
    messageId: message.messageId,
    subject: message.subject,
    from: message.from,
    to: message.to,
    receivedAt: message.receivedAt,
    text: body.text ?? '',
    html: body.html ?? ''
  };
}

/* ------------------------------------------------------------------ */
/* In-process jobs: mailboxes and outbound email                       */
/* ------------------------------------------------------------------ */

// Failed provisioning retries with backoff: 1, 2, 4 ... minutes, capped at
// an hour, forever (the usual cause is the mail domain not being ready yet).
function mailboxRetryDue(failureCount: number, lastFailureAt: number | null, now: number): boolean {
  if (failureCount === 0 || lastFailureAt === null) {
    return true;
  }
  const delay = Math.min(60 * 1000 * 2 ** (failureCount - 1), 60 * 60 * 1000);
  return now - lastFailureAt >= delay;
}

export function getMailboxesToProvision(now: number = Date.now()): MailboxTask[] {
  const tasks: MailboxTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    const mailbox = state.mailbox;
    if (!mailbox || mailbox.status === 'provisioned') {
      continue;
    }
    if (!mailboxRetryDue(mailbox.failureCount, mailbox.lastFailureAt, now)) {
      continue;
    }
    tasks.push({ tenantId, localPart: mailbox.localPart, domain: mailbox.domain, attemptNumber: mailbox.failureCount + 1 });
  }
  return tasks;
}

export function getMailboxesToDelete(): MailboxDeletionTask[] {
  const tasks: MailboxDeletionTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    for (const retired of state.retiredMailboxes) {
      if (!retired.deleted) {
        tasks.push({ tenantId, localPart: retired.localPart, domain: retired.domain });
      }
    }
  }
  return tasks;
}

export function getWelcomeEmailsToSend(): WelcomeEmailTask[] {
  const tasks: WelcomeEmailTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    const mailbox = state.mailbox;
    if (!mailbox || mailbox.status !== 'provisioned' || mailbox.welcomeEmailSent || !mailbox.password) {
      continue;
    }
    tasks.push({ tenantId, email: state.email!, address: `${mailbox.localPart}@${mailbox.domain}`, password: mailbox.password });
  }
  return tasks;
}

export function getVerificationEmailsToSend(now: number = Date.now()): VerificationEmailTask[] {
  const tasks: VerificationEmailTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    const v = state.verification;
    if (state.verified || !v || v.emailSent || v.expiresAt < now) {
      continue;
    }
    tasks.push({ tenantId, email: state.email!, code: v.code, expiresAt: v.expiresAt });
  }
  return tasks;
}

export function getOwnerNotificationsToSend(): OwnerNotificationTask[] {
  const tasks: OwnerNotificationTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    if (state.ownerNotified) {
      continue;
    }
    tasks.push({
      tenantId,
      email: state.email!,
      forwardingAddress: state.mailbox ? `${state.mailbox.localPart}@${state.mailbox.domain}` : null,
      createdAt: state.createdAt!
    });
  }
  return tasks;
}

// Trackers with status changes the user hasn't been told about. A tracker
// still waiting on a scrape is skipped so "started + label created + on the
// way + estimate" go out as one email once the first read completes.
export function getShipmentNotificationsToSend(): ShipmentNotificationTask[] {
  const tasks: ShipmentNotificationTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    if (!state.verified) {
      continue;
    }
    for (const tracker of state.trackers) {
      if (tracker.pendingChanges.length === 0 || tracker.refreshRequested) {
        continue;
      }
      tasks.push({
        tenantId,
        email: state.email!,
        trackerId: tracker.trackerId,
        label: tracker.label,
        url: tracker.url,
        companyLabel: COMPANY_LABELS[tracker.deliveryCompany] ?? COMPANY_LABELS.unknown,
        trackingNumber: tracker.trackingNumber,
        changes: [...tracker.pendingChanges],
        errorMessage: tracker.errorMessage
      });
    }
  }
  return tasks;
}

// Trackers with changes nobody has been pushed about yet, for accounts that
// have at least one subscribed device. Mirrors the email query but keeps its
// own pending list, so a push failure never eats an email and vice versa.
export function getOrganizationLogo(tenantId: string): { blob: Buffer; mimeType: string; version: number } | null {
  const logo = getAccountState(tenantId).organizationLogo;
  if (!logo) {
    return null;
  }
  const blob = getPayloadBlobByEventId(tenantId, logo.eventId);
  return blob ? { blob, mimeType: logo.mimeType, version: logo.eventId } : null;
}

// Invitations whose welcome-with-password email has not gone out yet
export function getInvitationEmailsToSend(): InvitationEmailTask[] {
  const tasks: InvitationEmailTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    for (const member of state.members) {
      if (member.invitationEmailSent || member.removed || !member.temporaryPassword) {
        continue;
      }
      tasks.push({
        tenantId,
        userId: member.userId,
        email: member.email,
        organizationName: state.organizationName ?? 'CargoPax',
        temporaryPassword: member.temporaryPassword
      });
    }
  }
  return tasks;
}

export function getPushNotificationsToSend(): PushNotificationTask[] {
  const tasks: PushNotificationTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    if (!state.verified || state.pushSubscriptions.length === 0) {
      continue;
    }
    for (const tracker of state.trackers) {
      if (tracker.pendingPushChanges.length === 0 || tracker.refreshRequested) {
        continue;
      }
      tasks.push({
        tenantId,
        trackerId: tracker.trackerId,
        label: tracker.label,
        companyLabel: COMPANY_LABELS[tracker.deliveryCompany] ?? COMPANY_LABELS.unknown,
        trackingNumber: tracker.trackingNumber,
        changes: [...tracker.pendingPushChanges],
        subscriptions: state.pushSubscriptions.map(p => ({ endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth }))
      });
    }
  }
  return tasks;
}

export function getPasswordResetEmailsToSend(now: number = Date.now()): PasswordResetEmailTask[] {
  const tasks: PasswordResetEmailTask[] = [];
  for (const { tenantId, state } of accountStates()) {
    for (const reset of state.passwordResets) {
      if (reset.emailSent || reset.completed || reset.expiresAt < now) {
        continue;
      }
      tasks.push({ tenantId, email: state.email!, requestId: reset.requestId, expiresAt: reset.expiresAt });
    }
  }
  return tasks;
}

export function getPasswordResetToken(tenantId: string, requestId: string): string | null {
  const reset = getAccountState(tenantId).passwordResets.find(r => r.requestId === requestId);
  return reset ? reset.token : null;
}

// A reset link carries only the token; find which account issued it.
export function findPasswordResetByToken(token: string): PasswordResetLookup | null {
  for (const { tenantId, state } of accountStates()) {
    const reset = state.passwordResets.find(r => r.token === token);
    if (reset) {
      return { tenantId, requestId: reset.requestId, expiresAt: reset.expiresAt, completed: reset.completed };
    }
  }
  return null;
}

// Has any account already claimed this @cargopax.ca name (current address
// or a retired one not yet deleted from the mail server)?
export function isMailboxLocalPartClaimed(localPart: string, domain: string, exceptTenantId?: string): boolean {
  const wanted = localPart.toLowerCase();
  const sameDomain = (d: string) => d.toLowerCase() === domain.toLowerCase();
  return accountStates().some(({ tenantId, state }) => {
    if (tenantId === exceptTenantId) {
      return false;
    }
    if (state.mailbox && sameDomain(state.mailbox.domain) && state.mailbox.localPart.toLowerCase() === wanted) {
      return true;
    }
    return state.retiredMailboxes.some(m => !m.deleted && sameDomain(m.domain) && m.localPart.toLowerCase() === wanted);
  });
}
