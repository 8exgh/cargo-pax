import { v4 as uuidv4 } from 'uuid';
import { loadEvents, insertEvent } from '@/lib/db/tenant-db';
import { replayEvents } from './event-replay';
import { deliveryCompanyForUrl, trackingNumberFromUrl } from '@/lib/tracking/carrier';
import { AccountState, EventType, ShipmentChange, Tracker } from '@/types/events';
import {
  AssignCargoPaxEmailIdentifierCommand,
  AssignTrackerToGroupCommand,
  CompletePasswordResetCommand,
  CreateAccountCommand,
  CreateGroupCommand,
  DeleteTrackingShipmentCommand,
  IssueVerificationCodeCommand,
  MarkEmailMessageAsProcessedCommand,
  RecordEmailMessageReceivedCommand,
  RecordEmailNotificationSentCommand,
  RecordMailboxDeletedCommand,
  RecordMailboxProvisionFailedCommand,
  RecordMailboxProvisionedCommand,
  RecordPasswordResetEmailSentCommand,
  RequestPasswordResetCommand,
  StartTrackingShipmentCommand,
  UpdateTrackingShipmentLabelCommand,
  UpdateTrackingShipmentStatusCommand,
  VerifyAccountCommand
} from '@/types/commands';

// The account aggregate's id is the tenant id: one account per tenant.
export function accountAggregateId(tenantId: string): string {
  return tenantId;
}

// Same priority for every refresh, as in the original; the queue is then
// oldest-first.
export const REFRESH_PRIORITY = 3;

// Parsed email bodies are capped so one huge forward cannot bloat the store
export const MAX_EMAIL_BODY_CHARS = 400_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function normalizeTrackingUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Throws on garbage; the route turns that into a 400
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http(s) urls can be tracked');
  }
  return parsed.toString();
}

// Every command follows the same shape: load the stream, replay it, validate
// against the current state, append the new events with the next versions.
function load(tenantId: string): { state: AccountState; version: number } {
  const events = loadEvents(tenantId, accountAggregateId(tenantId));
  return { state: replayEvents(events), version: events.length };
}

function append(tenantId: string, version: number, eventType: EventType, data: object, payloadBlob: Buffer | null = null): number {
  insertEvent(tenantId, {
    aggregateId: accountAggregateId(tenantId),
    eventType,
    eventData: JSON.stringify(data),
    payloadBlob,
    timestamp: Date.now(),
    version: version + 1
  });
  return version + 1;
}

function requireCreated(state: AccountState): void {
  if (state.status !== 'created') {
    throw new Error('Account not created');
  }
}

function requireTracker(state: AccountState, trackerId: string): Tracker {
  const tracker = state.trackers.find(t => t.trackerId === trackerId);
  if (!tracker) {
    throw new Error('Tracker not found');
  }
  return tracker;
}

/* ------------------------------------------------------------------ */
/* Account + auth                                                     */
/* ------------------------------------------------------------------ */

export function handleCreateAccount(tenantId: string, command: CreateAccountCommand): void {
  const { state, version } = load(tenantId);
  if (state.status !== 'not-created') {
    throw new Error('Account already created');
  }

  const v = append(tenantId, version, 'account_created', { email: command.email });
  append(tenantId, v, 'cargo_pax_email_identifier_assigned', {
    emailIdentifier: command.emailIdentifier,
    domain: command.mailboxDomain
  });
}

export function handleIssueVerificationCode(tenantId: string, command: IssueVerificationCodeCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (state.verified) {
    throw new Error('Account already verified');
  }

  append(tenantId, version, 'account_verification_code_issued', { code: command.code, expiresAt: command.expiresAt });
}

export function handleRecordVerificationEmailSent(tenantId: string, code: string, to: string): void {
  const { state, version } = load(tenantId);
  if (!state.verification || state.verification.code !== code) {
    throw new Error('No such verification code outstanding');
  }
  if (state.verification.emailSent) {
    throw new Error('Verification email already sent');
  }

  append(tenantId, version, 'account_verification_email_sent', { code, to });
}

export function handleVerifyAccount(tenantId: string, command: VerifyAccountCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (state.verified) {
    return;
  }
  if (!state.verification) {
    throw new Error('No verification code has been issued');
  }
  if (state.verification.expiresAt < Date.now()) {
    throw new Error('That code has expired; request a new one');
  }
  if (state.verification.code !== command.code.trim()) {
    throw new Error('That code is not right');
  }

  append(tenantId, version, 'account_verified', {});
}

export function handleRecordOwnerNotified(tenantId: string): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (state.ownerNotified) {
    throw new Error('Owner already notified');
  }

  append(tenantId, version, 'owner_notified', { kind: 'account_created' });
}

export function handleRequestPasswordReset(tenantId: string, command: RequestPasswordResetCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);

  append(tenantId, version, 'password_reset_requested', {
    requestId: command.requestId,
    token: command.token,
    expiresAt: command.expiresAt
  });
}

export function handleRecordPasswordResetEmailSent(tenantId: string, command: RecordPasswordResetEmailSentCommand): void {
  const { state, version } = load(tenantId);
  const reset = state.passwordResets.find(r => r.requestId === command.requestId);
  if (!reset) {
    throw new Error('Unknown password reset request');
  }
  if (reset.emailSent) {
    throw new Error('Password reset email already sent');
  }

  append(tenantId, version, 'password_reset_email_sent', { requestId: command.requestId });
}

export function handleCompletePasswordReset(tenantId: string, command: CompletePasswordResetCommand): void {
  const { state, version } = load(tenantId);
  const reset = state.passwordResets.find(r => r.requestId === command.requestId);
  if (!reset) {
    throw new Error('Unknown password reset request');
  }
  if (reset.completed) {
    throw new Error('Password reset already used');
  }
  if (reset.expiresAt < Date.now()) {
    throw new Error('Password reset link has expired');
  }

  append(tenantId, version, 'password_reset_completed', { requestId: command.requestId });
}

/* ------------------------------------------------------------------ */
/* The @cargopax.ca address and its mailbox                           */
/* ------------------------------------------------------------------ */

export function handleAssignCargoPaxEmailIdentifier(tenantId: string, command: AssignCargoPaxEmailIdentifierCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (state.mailbox && state.mailbox.localPart === command.emailIdentifier && state.mailbox.domain === command.mailboxDomain) {
    throw new Error('That is already your address');
  }
  if (state.mailbox && state.mailbox.status !== 'provisioned' && state.mailbox.status !== 'failed') {
    throw new Error('Your current address is still being set up');
  }

  append(tenantId, version, 'cargo_pax_email_identifier_assigned', {
    emailIdentifier: command.emailIdentifier,
    domain: command.mailboxDomain
  });
}

export function handleRecordMailboxProvisioned(tenantId: string, command: RecordMailboxProvisionedCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (!state.mailbox || state.mailbox.localPart !== command.localPart) {
    throw new Error('That mailbox is not the requested one');
  }
  if (state.mailbox.status === 'provisioned') {
    throw new Error('Mailbox already provisioned');
  }

  append(tenantId, version, 'mailbox_provisioned', {
    localPart: command.localPart,
    domain: command.domain,
    password: command.password
  });
}

export function handleRecordMailboxProvisionFailed(tenantId: string, command: RecordMailboxProvisionFailedCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (!state.mailbox || state.mailbox.localPart !== command.localPart) {
    throw new Error('That mailbox is not the requested one');
  }
  if (state.mailbox.status === 'provisioned') {
    throw new Error('Mailbox already provisioned');
  }

  append(tenantId, version, 'mailbox_provision_failed', {
    localPart: command.localPart,
    error: command.error,
    attemptNumber: state.mailbox.failureCount + 1
  });
}

export function handleRecordMailboxDeleted(tenantId: string, command: RecordMailboxDeletedCommand): void {
  const { state, version } = load(tenantId);
  const retired = state.retiredMailboxes.find(m => m.localPart === command.localPart && !m.deleted);
  if (!retired) {
    throw new Error('No such retired mailbox');
  }

  append(tenantId, version, 'mailbox_deleted', { localPart: command.localPart, domain: command.domain });
}

export function handleRecordWelcomeEmailSent(tenantId: string, to: string, address: string): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (!state.mailbox || state.mailbox.status !== 'provisioned') {
    throw new Error('Mailbox not provisioned');
  }
  if (state.mailbox.welcomeEmailSent) {
    throw new Error('Welcome email already sent');
  }

  append(tenantId, version, 'welcome_email_sent', { to, address });
}

/* ------------------------------------------------------------------ */
/* Emails forwarded to the mailbox                                    */
/* ------------------------------------------------------------------ */

// The parsed body rides on the event as a blob; nothing else keeps it.
export function handleRecordEmailMessageReceived(tenantId: string, command: RecordEmailMessageReceivedCommand): boolean {
  const { state, version } = load(tenantId);
  requireCreated(state);
  if (state.emailMessages.some(m => m.messageId === command.messageId)) {
    return false; // already recorded: the poll simply saw it again
  }

  const text = command.text.slice(0, MAX_EMAIL_BODY_CHARS);
  const html = command.html.slice(0, MAX_EMAIL_BODY_CHARS);
  append(
    tenantId,
    version,
    'email_message_received',
    {
      messageId: command.messageId,
      uid: command.uid,
      uidValidity: command.uidValidity,
      subject: command.subject.slice(0, 500),
      from: command.from.slice(0, 300),
      to: command.to.slice(0, 300),
      receivedAt: command.receivedAt,
      textLength: text.length + html.length
    },
    Buffer.from(JSON.stringify({ text, html }), 'utf8')
  );
  return true;
}

export function handleMarkEmailMessageAsProcessed(tenantId: string, command: MarkEmailMessageAsProcessedCommand): void {
  const { state, version } = load(tenantId);
  const message = state.emailMessages.find(m => m.messageId === command.messageId);
  if (!message) {
    throw new Error('Unknown email message');
  }
  if (message.processed) {
    throw new Error('Email message already processed');
  }

  append(tenantId, version, 'email_message_processed', {
    messageId: command.messageId,
    trackerIds: command.trackerIds,
    note: command.note
  });
}

/* ------------------------------------------------------------------ */
/* Groups                                                             */
/* ------------------------------------------------------------------ */

export function handleCreateGroup(tenantId: string, command: CreateGroupCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  const name = command.name.trim();
  if (!name) {
    throw new Error('Group name is required');
  }
  if (state.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A group with that name already exists');
  }

  append(tenantId, version, 'group_created', { groupId: command.groupId, name });
}

export function handleAssignTrackerToGroup(tenantId: string, command: AssignTrackerToGroupCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  requireTracker(state, command.trackerId);
  if (command.groupId !== null && !state.groups.some(g => g.groupId === command.groupId)) {
    throw new Error('Group not found');
  }

  append(tenantId, version, 'shipment_tracker_assigned_to_group', {
    trackerId: command.trackerId,
    groupId: command.groupId
  });
}

/* ------------------------------------------------------------------ */
/* Shipment trackers                                                  */
/* ------------------------------------------------------------------ */

// Returns the new tracker's id. The carrier and tracking number are read
// off the url unless the caller (the email processor) already knows them.
export function handleStartTrackingShipment(tenantId: string, command: StartTrackingShipmentCommand): string {
  const url = normalizeTrackingUrl(command.url);
  const { state, version } = load(tenantId);
  requireCreated(state);

  const trackingNumber = (command.trackingNumber || trackingNumberFromUrl(url) || '').trim();
  const shipmentCompany = command.shipmentCompany || deliveryCompanyForUrl(url);

  const duplicate = state.trackers.find(t =>
    t.url.toLowerCase() === url.toLowerCase() ||
    (trackingNumber.length > 0 && t.trackingNumber.toLowerCase() === trackingNumber.toLowerCase())
  );
  if (duplicate) {
    throw new Error(`That shipment is already being tracked (${duplicate.label})`);
  }

  const trackerId = command.trackerId || uuidv4();
  let v = append(tenantId, version, 'shipment_tracking_started', {
    trackerId,
    url,
    shipmentCompany,
    trackingNumber,
    source: command.source || 'manual',
    messageId: command.messageId ?? null
  });
  const label = (command.label || '').trim();
  if (label) {
    v = append(tenantId, v, 'shipment_tracking_label_changed', { trackerId, label: label.slice(0, 200) });
  }
  append(tenantId, v, 'shipment_tracking_refresh_requested', { trackerId, priority: REFRESH_PRIORITY });
  return trackerId;
}

export function handleUpdateTrackingShipmentLabel(tenantId: string, command: UpdateTrackingShipmentLabelCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  requireTracker(state, command.trackerId);

  append(tenantId, version, 'shipment_tracking_label_changed', {
    trackerId: command.trackerId,
    label: command.label
  });
}

export function handleDeleteTrackingShipment(tenantId: string, command: DeleteTrackingShipmentCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  requireTracker(state, command.trackerId);

  append(tenantId, version, 'shipment_tracker_deleted', { trackerId: command.trackerId });
}

// Requests a fresh scrape of every undelivered tracker not already waiting
export function handleRefreshTrackers(tenantId: string): number {
  const { state, version } = load(tenantId);
  requireCreated(state);

  let v = version;
  let requested = 0;
  for (const tracker of state.trackers) {
    if (tracker.deliveredOnDate || tracker.refreshRequested) {
      continue;
    }
    v = append(tenantId, v, 'shipment_tracking_refresh_requested', { trackerId: tracker.trackerId, priority: REFRESH_PRIORITY });
    requested += 1;
  }
  return requested;
}

// Outcome of one scrape. The refresh is always completed; each date that
// is new or changed gets its own event (so a re-scrape that reads the same
// page again is a no-op apart from completing the refresh); delivered goes
// last, as in the original. An error message records the error; a clean
// read after an error clears it.
export function handleUpdateTrackingShipmentStatus(tenantId: string, command: UpdateTrackingShipmentStatusCommand): void {
  const { state, version } = load(tenantId);
  requireCreated(state);
  const tracker = requireTracker(state, command.trackerId);
  const trackerId = tracker.trackerId;

  const dated: Array<[string, string]> = [
    ['labelCreatedOnDate', command.labelCreatedOnDate],
    ['onTheWayDate', command.onTheWayDate],
    ['outForDeliveryDate', command.outForDeliveryDate],
    ['estimatedDeliveryDate', command.estimatedDeliveryDate],
    ['deliveredOnDate', command.deliveredOnDate]
  ];
  for (const [field, value] of dated) {
    if (value && !isValidDate(value)) {
      throw new Error(`Could not parse ${field}: '${value}'`);
    }
  }

  let v = append(tenantId, version, 'shipment_tracker_refresh_request_completed', { trackerId });

  if (command.errorMessage) {
    append(tenantId, v, 'shipment_tracker_error_parsing_website_occurred', {
      trackerId,
      errorMessage: command.errorMessage
    });
    return;
  }
  if (tracker.errorMessage !== null) {
    v = append(tenantId, v, 'shipment_tracker_error_cleared', { trackerId });
  }

  if (command.labelCreatedOnDate && command.labelCreatedOnDate !== tracker.labelCreatedOnDate) {
    v = append(tenantId, v, 'shipment_label_created', { trackerId, date: command.labelCreatedOnDate });
  }
  if (command.onTheWayDate && command.onTheWayDate !== tracker.onTheWayDate) {
    v = append(tenantId, v, 'shipment_on_the_way', { trackerId, date: command.onTheWayDate });
  }
  if (command.outForDeliveryDate && command.outForDeliveryDate !== tracker.outForDeliveryDate) {
    v = append(tenantId, v, 'shipment_out_for_delivery', { trackerId, date: command.outForDeliveryDate });
  }
  if (command.estimatedDeliveryDate && command.estimatedDeliveryDate !== tracker.estimatedDeliveryDate) {
    v = append(tenantId, v, 'shipment_estimated_delivery_date_changed', { trackerId, date: command.estimatedDeliveryDate });
  }
  if (command.deliveredOnDate && command.deliveredOnDate !== tracker.deliveredOnDate) {
    append(tenantId, v, 'shipment_delivered', { trackerId, date: command.deliveredOnDate });
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export function handleRecordEmailNotificationSent(tenantId: string, command: RecordEmailNotificationSentCommand): void {
  const { state, version } = load(tenantId);
  const tracker = requireTracker(state, command.trackerId);
  if (tracker.pendingChanges.length === 0) {
    throw new Error('No pending changes for that tracker');
  }

  append(tenantId, version, 'email_notification_sent', {
    trackerId: command.trackerId,
    to: command.to,
    changes: command.changes as ShipmentChange[]
  });
}
