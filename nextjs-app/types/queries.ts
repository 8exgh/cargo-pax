import { DeliveryCompany, ShipmentChange } from './events';

/* ---- dashboard ---- */

export type JourneyStage = 'labelCreated' | 'onTheWay' | 'outForDelivery' | 'delivered';

export interface TrackerView {
  trackerId: string;
  url: string;
  label: string;
  deliveryCompany: DeliveryCompany;
  deliveryCompanyLabel: string;
  trackingNumber: string;
  groupId: string | null;
  source: 'manual' | 'email';
  estimatedDeliveryDate: string | null;
  labelCreatedOnDate: string | null;
  onTheWayDate: string | null;
  outForDeliveryDate: string | null;
  deliveredOnDate: string | null;
  isDelivered: boolean;
  // 0..3 = label created, on the way, out for delivery, delivered; -1 = nothing yet
  journeyPosition: number;
  // False for sites outside the carrier list: tracked, never scraped
  autoRefresh: boolean;
  refreshInProgress: boolean;
  errorMessage: string | null;
  startedAt: number;
}

export interface GroupView {
  groupId: string;
  name: string;
}

export interface MailboxView {
  address: string;
  status: 'requested' | 'provisioned' | 'failed';
  password: string | null;
  webmail: string;
  imap: string;
  smtp: string;
}

export interface EmailMessageView {
  messageId: string;
  subject: string;
  from: string;
  receivedAt: number;
  processed: boolean;
  trackerIds: string[];
}

export interface AccountView {
  email: string;
  verified: boolean;
  // Endpoints this account has registered, so the UI can tell whether *this*
  // device is already subscribed
  pushEndpoints: string[];
  mailbox: MailboxView | null;
  forwardingAddress: string | null;
  groups: GroupView[];
  tracking: TrackerView[];
  completedDeliveries: TrackerView[];
  recentEmails: EmailMessageView[];
}

/* ---- background processor ---- */

export interface TrackerRefreshRequest {
  tenantId: string;
  trackerId: string;
  url: string;
  company: DeliveryCompany;
  trackingNumber: string;
  priority: number;
  requestedAt: number;
  hasLabelCreatedValue: boolean;
  hasOnTheWayValue: boolean;
  hasOutForDeliveryValue: boolean;
}

export interface MailboxToPoll {
  tenantId: string;
  address: string;
  password: string;
  lastUid: number;
  uidValidity: number | null;
}

export interface EmailMessageToProcess {
  tenantId: string;
  messageId: string;
  subject: string;
  from: string;
}

export interface EmailMessageContent {
  messageId: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  text: string;
  html: string;
}

/* ---- in-process jobs ---- */

export interface MailboxTask {
  tenantId: string;
  localPart: string;
  domain: string;
  attemptNumber: number;
}

export interface MailboxDeletionTask {
  tenantId: string;
  localPart: string;
  domain: string;
}

export interface WelcomeEmailTask {
  tenantId: string;
  email: string;
  address: string;
  password: string;
}

export interface VerificationEmailTask {
  tenantId: string;
  email: string;
  code: string;
  expiresAt: number;
}

export interface OwnerNotificationTask {
  tenantId: string;
  email: string;
  forwardingAddress: string | null;
  createdAt: number;
}

export interface ShipmentNotificationTask {
  tenantId: string;
  email: string;
  trackerId: string;
  label: string;
  url: string;
  companyLabel: string;
  trackingNumber: string;
  changes: ShipmentChange[];
  errorMessage: string | null;
}

export interface PushSubscriptionView {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushNotificationTask {
  tenantId: string;
  trackerId: string;
  label: string;
  companyLabel: string;
  trackingNumber: string;
  changes: ShipmentChange[];
  subscriptions: PushSubscriptionView[];
}

export interface PasswordResetEmailTask {
  tenantId: string;
  email: string;
  requestId: string;
  expiresAt: number;
}

export interface PasswordResetLookup {
  tenantId: string;
  requestId: string;
  expiresAt: number;
  completed: boolean;
}
