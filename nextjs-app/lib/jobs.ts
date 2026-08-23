import { getLogger } from '@/lib/logger';
import { getAppBaseUrl, SITE_NAME } from '@/lib/site';
import { mailConfigured, notifyOwner, sendEmail } from '@/lib/mail';
import { createMailbox, deleteMailbox, generatePassword, getMailbox, migaduConfigured } from '@/lib/migadu';
import { ensureMailDomain, getMailDomainStatus } from '@/lib/mail-domain';
import { MAIL_HOSTS } from '@/lib/site';
import {
  getMailboxesToDelete,
  getMailboxesToProvision,
  getOwnerNotificationsToSend,
  getPasswordResetEmailsToSend,
  getPasswordResetToken,
  getShipmentNotificationsToSend,
  getVerificationEmailsToSend,
  getWelcomeEmailsToSend
} from '@/lib/queries/account-queries';
import {
  handleRecordEmailNotificationSent,
  handleRecordMailboxDeleted,
  handleRecordMailboxProvisionFailed,
  handleRecordMailboxProvisioned,
  handleRecordOwnerNotified,
  handleRecordPasswordResetEmailSent,
  handleRecordVerificationEmailSent,
  handleRecordWelcomeEmailSent
} from '@/lib/commands/account-commands';
import { ShipmentChange, ShipmentChangeType } from '@/types/events';
import { notificationTitle, pushConfigured, sendPush } from '@/lib/push';
import { getPushNotificationsToSend } from '@/lib/queries/account-queries';
import { handleRecordPushNotificationSent, handleRemoveWebPushSubscription } from '@/lib/commands/account-commands';

/* The in-process background jobs (the 8examples "pump" pattern): each job
   is a query for work that has no completion marker yet, does the side
   effect, then appends the marker. Nothing is scheduled; pumpJobs() runs
   after the commands that create work (register, forgot-password, a
   status update from the processor) and on every poll of the background
   processor, so the jobs also run with zero page traffic. A failed side
   effect leaves the marker absent and the work is retried on the next
   pump. These are the jobs the original cargopax scraper ran against SES
   (notifications, verification), moved in-process and onto Gmail/Migadu. */

const log = getLogger('jobs');

let running = false;
let rerun = false;

export async function pumpJobs(): Promise<void> {
  if (running) {
    // Whatever triggered this may have created work; run once more after
    rerun = true;
    return;
  }
  running = true;
  try {
    do {
      rerun = false;
      await runJobs();
    } while (rerun);
  } finally {
    running = false;
  }
}

async function runJobs(): Promise<void> {
  await sendVerificationEmails();
  // The mail domain has to be live on Migadu before any address on it can
  // be created; this converges it (and re-checks every few hours).
  await ensureMailDomain();
  await provisionMailboxes();
  await deleteRetiredMailboxes();
  await sendWelcomeEmails();
  await notifyOwnerOfSignups();
  await sendShipmentNotifications();
  await sendPushNotifications();
  await sendPasswordResetEmails();
}

/* ------------------------------------------------------------------ */
/* Account verification                                               */
/* ------------------------------------------------------------------ */

async function sendVerificationEmails(): Promise<void> {
  if (!mailConfigured()) {
    return;
  }
  for (const task of getVerificationEmailsToSend()) {
    try {
      const minutes = Math.max(1, Math.round((task.expiresAt - Date.now()) / 60000));
      const sent = await sendEmail({
        to: task.email,
        subject: `${task.code} is your ${SITE_NAME} verification code`,
        text: [
          `Welcome to ${SITE_NAME}.`,
          '',
          `Your verification code is: ${task.code}`,
          '',
          `Enter it at ${getAppBaseUrl()}/verify to finish creating your account.`,
          `The code expires in ${minutes} minutes.`,
          '',
          'If you did not sign up, ignore this email.'
        ].join('\n')
      });
      if (sent) {
        handleRecordVerificationEmailSent(task.tenantId, task.code, task.email);
        log.info(`Verification email sent to ${task.email}`);
      }
    } catch (error: any) {
      log.error(`Verification email to ${task.email} failed:`, error);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Mailboxes                                                          */
/* ------------------------------------------------------------------ */

async function provisionMailboxes(): Promise<void> {
  const domainStatus = getMailDomainStatus();
  for (const task of getMailboxesToProvision()) {
    const address = `${task.localPart}@${task.domain}`;
    try {
      if (!migaduConfigured()) {
        throw new Error('email provider not configured (MIGADU_ADMIN_EMAIL / MIGADU_API_KEY)');
      }
      // Fail with the domain's real problem rather than a confusing
      // per-mailbox API error
      if (task.domain === domainStatus.domain && domainStatus.stage !== 'ready') {
        throw new Error(`the mail domain is not live yet: ${domainStatus.stage} (${domainStatus.detail})`);
      }

      // A name that already exists on the mail server is someone else's
      // inbox: never touch it, and never reset its password.
      const existing = await getMailbox(task.domain, task.localPart);
      if (existing.ok) {
        throw new Error('mailbox already exists on the mail server');
      }

      const password = generatePassword();
      const made = await createMailbox({ domain: task.domain, localPart: task.localPart, name: task.localPart, password });
      if (!made.ok) {
        throw new Error(`mailbox create returned ${made.status}: ${JSON.stringify(made.data).slice(0, 300)}`);
      }

      handleRecordMailboxProvisioned(task.tenantId, { localPart: task.localPart, domain: task.domain, password });
      log.info(`Provisioned ${address} for tenant ${task.tenantId}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      log.warn(`Mailbox ${address} attempt ${task.attemptNumber} failed: ${message}`);
      try {
        handleRecordMailboxProvisionFailed(task.tenantId, { localPart: task.localPart, error: message });
      } catch (recordError: any) {
        log.error(`Could not record mailbox failure for ${address}:`, recordError);
      }
    }
  }
}

// When an account picks a new @cargopax.ca name the old inbox is removed
// from the mail server so the name can be claimed again.
async function deleteRetiredMailboxes(): Promise<void> {
  if (!migaduConfigured()) {
    return;
  }
  for (const task of getMailboxesToDelete()) {
    const address = `${task.localPart}@${task.domain}`;
    try {
      const result = await deleteMailbox(task.domain, task.localPart);
      if (!result.ok && result.status !== 404) {
        throw new Error(`mailbox delete returned ${result.status}`);
      }
      handleRecordMailboxDeleted(task.tenantId, { localPart: task.localPart, domain: task.domain });
      log.info(`Deleted retired mailbox ${address}`);
    } catch (error: any) {
      log.warn(`Deleting retired mailbox ${address} failed: ${error?.message || error}`);
    }
  }
}

async function sendWelcomeEmails(): Promise<void> {
  if (!mailConfigured()) {
    return;
  }
  for (const task of getWelcomeEmailsToSend()) {
    try {
      const sent = await sendEmail({
        to: task.email,
        subject: `Your ${SITE_NAME} address is ready: ${task.address}`,
        text: [
          `Your ${SITE_NAME} address ${task.address} is live.`,
          '',
          'Forward your shipment emails (UPS, FedEx, Canada Post, Purolator, DHL,',
          `USPS...) to ${task.address} and ${SITE_NAME} will pick out the tracking`,
          'links, follow each package, and email you as it moves.',
          '',
          'It is also a real inbox you can read from any mail app:',
          `Address:  ${task.address}`,
          `Password: ${task.password}`,
          `Webmail:  ${MAIL_HOSTS.webmail}`,
          `IMAP:     ${MAIL_HOSTS.imap}`,
          `SMTP:     ${MAIL_HOSTS.smtp}`,
          '',
          `These details also stay on your dashboard: ${getAppBaseUrl()}/dashboard`,
          '',
          'Reply to this email if anything is off and a human will help.'
        ].join('\n')
      });
      if (sent) {
        handleRecordWelcomeEmailSent(task.tenantId, task.email, task.address);
        log.info(`Welcome email sent to ${task.email}`);
      }
    } catch (error: any) {
      log.error(`Welcome email to ${task.email} failed:`, error);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

async function notifyOwnerOfSignups(): Promise<void> {
  if (!mailConfigured()) {
    return;
  }
  for (const task of getOwnerNotificationsToSend()) {
    try {
      const sent = await notifyOwner(
        `New account: ${task.email}`,
        [
          `A new ${SITE_NAME} account was created.`,
          '',
          `Email:      ${task.email}`,
          `Forward to: ${task.forwardingAddress ?? '(none requested)'}`,
          `Tenant:     ${task.tenantId}`,
          `Created:    ${new Date(task.createdAt).toISOString()}`
        ].join('\n')
      );
      if (sent) {
        handleRecordOwnerNotified(task.tenantId);
      }
    } catch (error: any) {
      log.error(`Owner notification for ${task.email} failed:`, error);
    }
  }
}

const CHANGE_WORDING: Record<ShipmentChangeType, string> = {
  trackingHasStarted: 'Started tracking',
  shipmentLabelCreated: 'Label created',
  shipmentOnTheWay: 'On the way',
  shipmentEstimatedDeliveryDateChanged: 'Estimated delivery',
  shipmentOutForDelivery: 'Out for delivery',
  shipmentDelivered: 'Delivered'
};

function describeChanges(changes: ShipmentChange[]): string[] {
  return changes.map(c => `- ${CHANGE_WORDING[c.changeType] ?? c.changeType}: ${c.date}`);
}

// One email per tracker with everything that changed since the last one
async function sendShipmentNotifications(): Promise<void> {
  if (!mailConfigured()) {
    return;
  }
  for (const task of getShipmentNotificationsToSend()) {
    try {
      const delivered = task.changes.some(c => c.changeType === 'shipmentDelivered');
      const sent = await sendEmail({
        to: task.email,
        subject: delivered ? `Delivered: ${task.label}` : `Shipment update: ${task.label}`,
        text: [
          `Update for "${task.label}" (${task.companyLabel}${task.trackingNumber ? ` ${task.trackingNumber}` : ''}):`,
          '',
          ...describeChanges(task.changes),
          ...(task.errorMessage ? ['', `We could not read the carrier page just now (${task.errorMessage}); we will keep trying when you refresh.`] : []),
          '',
          `Tracking page: ${task.url}`,
          `All your shipments: ${getAppBaseUrl()}/dashboard`
        ].join('\n')
      });
      if (sent) {
        handleRecordEmailNotificationSent(task.tenantId, { trackerId: task.trackerId, to: task.email, changes: task.changes });
        log.info(`Shipment notification sent to ${task.email} for ${task.trackerId}`);
      }
    } catch (error: any) {
      log.error(`Shipment notification to ${task.email} failed:`, error);
    }
  }
}

/* One push per tracker per device, with the same batch of changes the email
   carries. A subscription the push service rejects as gone is forgotten, so
   dead devices do not accumulate. */
async function sendPushNotifications(): Promise<void> {
  if (!pushConfigured()) {
    return;
  }
  for (const task of getPushNotificationsToSend()) {
    const delivered = task.changes.some(c => c.changeType === 'shipmentDelivered');
    const lines = describeChanges(task.changes).map(l => l.replace(/^- /, ''));
    const payload = {
      title: notificationTitle(delivered, task.label),
      body: lines.join('\n'),
      tag: task.trackerId
    };

    const reached: string[] = [];
    for (const subscription of task.subscriptions) {
      const outcome = await sendPush(subscription, payload);
      if (outcome === 'sent') {
        reached.push(subscription.endpoint);
      } else if (outcome === 'expired') {
        try {
          handleRemoveWebPushSubscription(task.tenantId, { endpoint: subscription.endpoint, reason: 'expired' });
          log.info(`Dropped an expired push subscription for tenant ${task.tenantId}`);
        } catch (error: any) {
          log.error('Could not drop an expired push subscription:', error);
        }
      }
    }

    // Only mark the changes pushed if at least one device actually got them;
    // otherwise they stay pending and the next pump tries again.
    if (reached.length > 0) {
      try {
        handleRecordPushNotificationSent(task.tenantId, {
          trackerId: task.trackerId,
          endpoints: reached,
          changes: task.changes
        });
        log.info(`Pushed ${task.changes.length} change(s) for ${task.trackerId} to ${reached.length} device(s)`);
      } catch (error: any) {
        log.error(`Could not record push for ${task.trackerId}:`, error);
      }
    }
  }
}

async function sendPasswordResetEmails(): Promise<void> {
  if (!mailConfigured()) {
    return;
  }
  for (const task of getPasswordResetEmailsToSend()) {
    try {
      const token = getPasswordResetToken(task.tenantId, task.requestId);
      if (!token) {
        continue;
      }
      const link = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const minutes = Math.max(1, Math.round((task.expiresAt - Date.now()) / 60000));
      const sent = await sendEmail({
        to: task.email,
        subject: `Reset your ${SITE_NAME} password`,
        text: [
          `Someone (hopefully you) asked to reset the password for ${task.email}.`,
          '',
          `Set a new password here (the link works once and expires in ${minutes} minutes):`,
          link,
          '',
          'If you did not ask for this, ignore this email; your password is unchanged.'
        ].join('\n')
      });
      if (sent) {
        handleRecordPasswordResetEmailSent(task.tenantId, { requestId: task.requestId });
        log.info(`Password reset email sent to ${task.email}`);
      }
    } catch (error: any) {
      log.error(`Password reset email to ${task.email} failed:`, error);
    }
  }
}
