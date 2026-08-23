import { AccountState, Event, ShipmentChange, ShipmentChangeType, Tracker } from '@/types/events';

export const DEFAULT_TRACKER_LABEL = 'Enter a description';

function findTracker(state: AccountState, trackerId: string): Tracker | undefined {
  return state.trackers.find(t => t.trackerId === trackerId);
}

// A status change waiting to be emailed. One entry per change type; a
// repeat of the same type (a re-scrape) just refreshes the date, the way
// the original applyEmailNotification did.
function addPendingChange(tracker: Tracker, changeType: ShipmentChangeType, date: string): void {
  for (const pending of [tracker.pendingChanges, tracker.pendingPushChanges]) {
    const existing = pending.find(c => c.changeType === changeType);
    if (existing) {
      existing.date = date;
    } else {
      pending.push({ changeType, date });
    }
  }
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

// Folds the account stream into its current state. Pure: the same events
// always give the same state, and every query builds on this.
export function replayEvents(events: Event[]): AccountState {
  const state: AccountState = {
    status: 'not-created',
    organizationName: null,
    organizationLogo: null,
    members: [],
    verified: false,
    verification: null,
    ownerNotified: false,
    mailbox: null,
    retiredMailboxes: [],
    emailMessages: [],
    groups: [],
    trackers: [],
    passwordResets: [],
    pushSubscriptions: []
  };

  for (const event of events) {
    const data = JSON.parse(event.event_data);

    switch (event.event_type) {
      case 'account_created':
        state.status = 'created';
        state.email = data.email;
        state.createdAt = event.timestamp;
        break;

      case 'organization_named':
        state.organizationName = data.name;
        break;

      case 'organization_logo_set':
        state.organizationLogo = {
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          filename: data.filename,
          eventId: event.id
        };
        break;

      case 'organization_logo_removed':
        state.organizationLogo = null;
        break;

      case 'member_invited': {
        const existing = state.members.find(m => m.userId === data.userId);
        if (existing) {
          existing.role = data.role;
          existing.removed = false;
        } else {
          state.members.push({
            userId: data.userId,
            email: data.email,
            role: data.role,
            temporaryPassword: data.temporaryPassword ?? '',
            invitedAt: event.timestamp,
            invitationEmailSent: false,
            removed: false
          });
        }
        break;
      }

      case 'member_role_changed': {
        const member = state.members.find(m => m.userId === data.userId);
        if (member) {
          member.role = data.role;
        }
        break;
      }

      case 'member_removed': {
        const member = state.members.find(m => m.userId === data.userId);
        if (member) {
          member.removed = true;
        }
        break;
      }

      case 'invitation_email_sent': {
        const member = state.members.find(m => m.userId === data.userId);
        if (member) {
          member.invitationEmailSent = true;
        }
        break;
      }

      case 'account_verification_code_issued':
        state.verification = { code: data.code, expiresAt: data.expiresAt, emailSent: false };
        break;

      case 'account_verification_email_sent':
        if (state.verification && state.verification.code === data.code) {
          state.verification.emailSent = true;
        }
        break;

      case 'account_verified':
        state.verified = true;
        state.verification = null;
        break;

      case 'password_reset_requested':
        state.passwordResets.push({
          requestId: data.requestId,
          token: data.token,
          expiresAt: data.expiresAt,
          requestedAt: event.timestamp,
          emailSent: false,
          completed: false
        });
        break;

      case 'password_reset_email_sent': {
        const reset = state.passwordResets.find(r => r.requestId === data.requestId);
        if (reset) reset.emailSent = true;
        break;
      }

      case 'password_reset_completed': {
        const reset = state.passwordResets.find(r => r.requestId === data.requestId);
        if (reset) reset.completed = true;
        break;
      }

      case 'owner_notified':
        state.ownerNotified = true;
        break;

      case 'cargo_pax_email_identifier_assigned':
        // A new identifier retires the current mailbox (deleted by a job)
        if (state.mailbox && state.mailbox.status === 'provisioned') {
          state.retiredMailboxes.push({ localPart: state.mailbox.localPart, domain: state.mailbox.domain, deleted: false });
        }
        state.mailbox = {
          localPart: data.emailIdentifier,
          domain: data.domain,
          status: 'requested',
          password: null,
          failureCount: 0,
          lastFailureAt: null,
          lastError: null,
          welcomeEmailSent: false
        };
        break;

      case 'mailbox_provisioned':
        if (state.mailbox && state.mailbox.localPart === data.localPart) {
          state.mailbox.status = 'provisioned';
          state.mailbox.password = data.password;
          state.mailbox.lastError = null;
        }
        break;

      case 'mailbox_provision_failed':
        if (state.mailbox && state.mailbox.localPart === data.localPart && state.mailbox.status !== 'provisioned') {
          state.mailbox.status = 'failed';
          state.mailbox.failureCount += 1;
          state.mailbox.lastFailureAt = event.timestamp;
          state.mailbox.lastError = data.error;
        }
        break;

      case 'mailbox_deleted': {
        const retired = state.retiredMailboxes.find(m => m.localPart === data.localPart && !m.deleted);
        if (retired) retired.deleted = true;
        break;
      }

      case 'welcome_email_sent':
        if (state.mailbox && `${state.mailbox.localPart}@${state.mailbox.domain}` === data.address) {
          state.mailbox.welcomeEmailSent = true;
        }
        break;

      case 'email_message_received':
        state.emailMessages.push({
          messageId: data.messageId,
          uid: data.uid,
          uidValidity: data.uidValidity,
          subject: data.subject,
          from: data.from,
          to: data.to,
          receivedAt: data.receivedAt,
          eventId: event.id,
          processed: false,
          trackerIds: []
        });
        break;

      case 'email_message_processed': {
        const message = state.emailMessages.find(m => m.messageId === data.messageId);
        if (message) {
          message.processed = true;
          message.trackerIds = data.trackerIds ?? [];
        }
        break;
      }

      case 'group_created':
        state.groups.push({ groupId: data.groupId, name: data.name });
        break;

      case 'shipment_tracker_assigned_to_group': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) tracker.groupId = data.groupId ?? null;
        break;
      }

      case 'shipment_tracking_started': {
        const tracker: Tracker = {
          trackerId: data.trackerId,
          url: data.url,
          deliveryCompany: data.shipmentCompany ?? 'unknown',
          trackingNumber: data.trackingNumber ?? '',
          label: DEFAULT_TRACKER_LABEL,
          groupId: null,
          source: data.source ?? 'manual',
          messageId: data.messageId ?? null,
          estimatedDeliveryDate: null,
          labelCreatedOnDate: null,
          onTheWayDate: null,
          outForDeliveryDate: null,
          deliveredOnDate: null,
          refreshRequested: null,
          errorMessage: null,
          startedAt: event.timestamp,
          pendingChanges: [],
          pendingPushChanges: []
        };
        addPendingChange(tracker, 'trackingHasStarted', isoDate(event.timestamp));
        state.trackers.push(tracker);
        break;
      }

      case 'shipment_tracking_label_changed': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) tracker.label = data.label;
        break;
      }

      case 'shipment_tracking_refresh_requested': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.refreshRequested = { priority: data.priority, requestedAt: event.timestamp, eventId: event.id };
        }
        break;
      }

      case 'shipment_tracker_refresh_request_completed': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) tracker.refreshRequested = null;
        break;
      }

      case 'shipment_label_created': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.labelCreatedOnDate = data.date;
          addPendingChange(tracker, 'shipmentLabelCreated', data.date);
        }
        break;
      }

      case 'shipment_on_the_way': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.onTheWayDate = data.date;
          addPendingChange(tracker, 'shipmentOnTheWay', data.date);
        }
        break;
      }

      case 'shipment_out_for_delivery': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.outForDeliveryDate = data.date;
          addPendingChange(tracker, 'shipmentOutForDelivery', data.date);
        }
        break;
      }

      case 'shipment_estimated_delivery_date_changed': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.estimatedDeliveryDate = data.date;
          addPendingChange(tracker, 'shipmentEstimatedDeliveryDateChanged', data.date);
        }
        break;
      }

      case 'shipment_delivered': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          tracker.deliveredOnDate = data.date;
          addPendingChange(tracker, 'shipmentDelivered', data.date);
        }
        break;
      }

      case 'shipment_tracker_error_parsing_website_occurred': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) tracker.errorMessage = data.errorMessage;
        break;
      }

      case 'shipment_tracker_error_cleared': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) tracker.errorMessage = null;
        break;
      }

      case 'shipment_tracker_deleted':
        state.trackers = state.trackers.filter(t => t.trackerId !== data.trackerId);
        break;

      case 'web_push_subscription_registered': {
        const existing = state.pushSubscriptions.find(p => p.endpoint === data.endpoint);
        if (existing) {
          // The browser re-issued the same endpoint with fresh keys
          existing.p256dh = data.p256dh;
          existing.auth = data.auth;
          existing.userAgent = data.userAgent;
        } else {
          state.pushSubscriptions.push({
            endpoint: data.endpoint,
            p256dh: data.p256dh,
            auth: data.auth,
            userAgent: data.userAgent,
            registeredAt: event.timestamp
          });
        }
        break;
      }

      case 'web_push_subscription_removed':
        state.pushSubscriptions = state.pushSubscriptions.filter(p => p.endpoint !== data.endpoint);
        break;

      case 'push_notification_sent': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          const sent = (data.changes ?? []) as ShipmentChange[];
          tracker.pendingPushChanges = tracker.pendingPushChanges.filter(
            p => !sent.some(s => s.changeType === p.changeType && s.date === p.date)
          );
        }
        break;
      }

      case 'email_notification_sent': {
        const tracker = findTracker(state, data.trackerId);
        if (tracker) {
          const sent = (data.changes ?? []) as ShipmentChange[];
          // Drop exactly what was sent; a change that arrived meanwhile stays
          tracker.pendingChanges = tracker.pendingChanges.filter(
            p => !sent.some(s => s.changeType === p.changeType && s.date === p.date)
          );
        }
        break;
      }
    }
  }

  return state;
}
