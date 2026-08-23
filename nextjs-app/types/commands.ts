import { DeliveryCompany } from './events';

export interface CreateAccountCommand {
  email: string;
  emailIdentifier: string;
  mailboxDomain: string;
  organizationName: string;
}

export interface NameOrganizationCommand {
  name: string;
}

export interface SetOrganizationLogoCommand {
  mimeType: string;
  filename: string;
  bytes: Buffer;
}

export interface InviteMemberCommand {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  temporaryPassword: string;
}

export interface ChangeMemberRoleCommand {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  changedBy: string;
}

export interface RemoveMemberCommand {
  userId: string;
  email: string;
  removedBy: string;
}

export interface IssueVerificationCodeCommand {
  code: string;
  expiresAt: number;
}

export interface VerifyAccountCommand {
  code: string;
}

export interface AssignCargoPaxEmailIdentifierCommand {
  emailIdentifier: string;
  mailboxDomain: string;
}

export interface StartTrackingShipmentCommand {
  url: string;
  trackerId?: string;
  shipmentCompany?: DeliveryCompany;
  trackingNumber?: string;
  label?: string;
  source?: 'manual' | 'email';
  messageId?: string | null;
}

export interface UpdateTrackingShipmentLabelCommand {
  trackerId: string;
  label: string;
}

export interface DeleteTrackingShipmentCommand {
  trackerId: string;
}

export interface CreateGroupCommand {
  groupId: string;
  name: string;
}

export interface AssignTrackerToGroupCommand {
  trackerId: string;
  groupId: string | null;
}

// Posted by the background processor after reading the carrier page.
// Every date is YYYY-MM-DD or ''. Only changed values produce events.
export interface UpdateTrackingShipmentStatusCommand {
  trackerId: string;
  estimatedDeliveryDate: string;
  labelCreatedOnDate: string;
  onTheWayDate: string;
  outForDeliveryDate: string;
  deliveredOnDate: string;
  errorMessage: string;
}

export interface RecordEmailMessageReceivedCommand {
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

export interface MarkEmailMessageAsProcessedCommand {
  messageId: string;
  trackerIds: string[];
  note: string;
}

export interface RecordMailboxProvisionedCommand {
  localPart: string;
  domain: string;
  password: string;
}

export interface RecordMailboxProvisionFailedCommand {
  localPart: string;
  error: string;
}

export interface RecordMailboxDeletedCommand {
  localPart: string;
  domain: string;
}

export interface RecordEmailNotificationSentCommand {
  trackerId: string;
  to: string;
  changes: { changeType: string; date: string }[];
}

export interface RequestPasswordResetCommand {
  requestId: string;
  token: string;
  expiresAt: number;
}

export interface RecordPasswordResetEmailSentCommand {
  requestId: string;
}

export interface CompletePasswordResetCommand {
  requestId: string;
}

export interface RegisterWebPushSubscriptionCommand {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

export interface RemoveWebPushSubscriptionCommand {
  endpoint: string;
  reason: 'user' | 'expired';
}

export interface RecordPushNotificationSentCommand {
  trackerId: string;
  endpoints: string[];
  changes: { changeType: string; date: string }[];
}
