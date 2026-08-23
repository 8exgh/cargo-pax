// One aggregate per tenant: the "account" (aggregate_id = tenantId). Its
// stream holds the account's auth state, its @cargopax.ca address and
// mailbox, the emails forwarded to that mailbox, the shipment trackers
// those emails (or the user) started, groups, and the outbound-email
// markers. Event names follow the original cargopax backend where the
// concept exists there.
export type EventType =
  // account + auth
  | 'account_created'
  | 'account_verification_code_issued'
  | 'account_verification_email_sent'
  | 'account_verified'
  | 'password_reset_requested'
  | 'password_reset_email_sent'
  | 'password_reset_completed'
  | 'owner_notified'
  // the @cargopax.ca address (the identifier) and its mailbox
  | 'cargo_pax_email_identifier_assigned'
  | 'mailbox_provisioned'
  | 'mailbox_provision_failed'
  | 'mailbox_deleted'
  | 'welcome_email_sent'
  // emails forwarded to the mailbox
  | 'email_message_received'
  | 'email_message_processed'
  // groups
  | 'group_created'
  | 'shipment_tracker_assigned_to_group'
  // shipment trackers
  | 'shipment_tracking_started'
  | 'shipment_tracking_label_changed'
  | 'shipment_tracking_refresh_requested'
  | 'shipment_tracker_refresh_request_completed'
  | 'shipment_label_created'
  | 'shipment_on_the_way'
  | 'shipment_out_for_delivery'
  | 'shipment_estimated_delivery_date_changed'
  | 'shipment_delivered'
  | 'shipment_tracker_error_parsing_website_occurred'
  | 'shipment_tracker_error_cleared'
  | 'shipment_tracker_deleted'
  // notifications
  | 'email_notification_sent';

export type DeliveryCompany = 'ups' | 'fedex' | 'usps' | 'dhl' | 'canada_post' | 'purolator' | 'priority1' | 'unknown';

export type ShipmentChangeType =
  | 'trackingHasStarted'
  | 'shipmentLabelCreated'
  | 'shipmentOnTheWay'
  | 'shipmentEstimatedDeliveryDateChanged'
  | 'shipmentOutForDelivery'
  | 'shipmentDelivered';

export interface ShipmentChange {
  changeType: ShipmentChangeType;
  date: string;
}

/* ---- event payloads ---- */

export interface AccountCreatedData {
  email: string;
}

export interface AccountVerificationCodeIssuedData {
  code: string;
  expiresAt: number;
}

export interface AccountVerificationEmailSentData {
  code: string;
  to: string;
}

export interface PasswordResetRequestedData {
  requestId: string;
  token: string; // single-use, short-lived; stored like 8examples stores login codes
  expiresAt: number;
}

export interface PasswordResetEmailSentData {
  requestId: string;
}

export interface PasswordResetCompletedData {
  requestId: string;
}

export interface OwnerNotifiedData {
  kind: 'account_created';
}

export interface CargoPaxEmailIdentifierAssignedData {
  emailIdentifier: string;
  domain: string;
}

export interface MailboxProvisionedData {
  localPart: string;
  domain: string;
  password: string;
}

export interface MailboxProvisionFailedData {
  localPart: string;
  error: string;
  attemptNumber: number;
}

export interface MailboxDeletedData {
  localPart: string;
  domain: string;
}

export interface WelcomeEmailSentData {
  to: string;
  address: string;
}

// The parsed body (text + html) rides on the event as payload_blob (JSON).
export interface EmailMessageReceivedData {
  messageId: string;
  uid: number;
  uidValidity: number;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  textLength: number;
}

export interface EmailMessageProcessedData {
  messageId: string;
  trackerIds: string[];
  note: string;
}

export interface GroupCreatedData {
  groupId: string;
  name: string;
}

export interface ShipmentTrackerAssignedToGroupData {
  trackerId: string;
  groupId: string | null;
}

export interface ShipmentTrackingStartedData {
  trackerId: string;
  url: string;
  shipmentCompany: DeliveryCompany;
  trackingNumber: string;
  source: 'manual' | 'email';
  messageId: string | null;
}

export interface ShipmentTrackingLabelChangedData {
  trackerId: string;
  label: string;
}

export interface ShipmentTrackingRefreshRequestedData {
  trackerId: string;
  priority: number;
}

export interface TrackerIdData {
  trackerId: string;
}

export interface TrackerDateData {
  trackerId: string;
  date: string; // YYYY-MM-DD
}

export interface ShipmentTrackerErrorParsingWebsiteOccurredData {
  trackerId: string;
  errorMessage: string;
}

export interface EmailNotificationSentData {
  trackerId: string;
  to: string;
  changes: ShipmentChange[];
}

// Matches database columns with snake case
export interface Event {
  id: number;
  aggregate_id: string;
  event_type: EventType;
  event_data: string; // JSON
  payload_blob: Buffer | null;
  timestamp: number;
  version: number;
}

/* ---- replayed state ---- */

export interface RefreshRequest {
  priority: number;
  requestedAt: number;
  eventId: number;
}

export interface Tracker {
  trackerId: string;
  url: string;
  deliveryCompany: DeliveryCompany;
  trackingNumber: string;
  label: string;
  groupId: string | null;
  source: 'manual' | 'email';
  messageId: string | null;
  estimatedDeliveryDate: string | null;
  labelCreatedOnDate: string | null;
  onTheWayDate: string | null;
  outForDeliveryDate: string | null;
  deliveredOnDate: string | null;
  refreshRequested: RefreshRequest | null;
  errorMessage: string | null;
  startedAt: number;
  // Status changes not yet emailed to the user
  pendingChanges: ShipmentChange[];
}

export interface Group {
  groupId: string;
  name: string;
}

export type MailboxStatus = 'requested' | 'provisioned' | 'failed';

export interface Mailbox {
  localPart: string;
  domain: string;
  status: MailboxStatus;
  password: string | null;
  failureCount: number;
  lastFailureAt: number | null;
  lastError: string | null;
  welcomeEmailSent: boolean;
}

export interface RetiredMailbox {
  localPart: string;
  domain: string;
  deleted: boolean;
}

export interface EmailMessage {
  messageId: string;
  uid: number;
  uidValidity: number;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  eventId: number;
  processed: boolean;
  trackerIds: string[];
}

export interface Verification {
  code: string;
  expiresAt: number;
  emailSent: boolean;
}

export interface PasswordReset {
  requestId: string;
  token: string;
  expiresAt: number;
  requestedAt: number;
  emailSent: boolean;
  completed: boolean;
}

export interface AccountState {
  status: 'not-created' | 'created';
  email?: string;
  createdAt?: number;
  verified: boolean;
  verification: Verification | null;
  ownerNotified: boolean;
  mailbox: Mailbox | null;
  retiredMailboxes: RetiredMailbox[];
  emailMessages: EmailMessage[];
  groups: Group[];
  trackers: Tracker[];
  passwordResets: PasswordReset[];
}
