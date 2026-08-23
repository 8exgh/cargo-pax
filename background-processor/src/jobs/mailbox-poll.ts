import { getMailboxesToPoll, recordEmailMessageReceived } from '../utils/api-client.js';
import { fetchNewMessages } from '../utils/imap-client.js';

// Reads every account's @cargopax.ca inbox over IMAP and records each new
// message with the app (email_message_received). The email-processing job
// then pulls the tracking links out. Replaces the original's SES/S3/Lambda
// inbound pipeline.
export async function runMailboxPollJob(): Promise<void> {
  let mailboxes;
  try {
    mailboxes = await getMailboxesToPoll();
  } catch (error: any) {
    console.error('[Mailbox Poll] Could not fetch mailboxes:', error.message);
    return;
  }

  for (const mailbox of mailboxes) {
    try {
      const messages = await fetchNewMessages({
        address: mailbox.address,
        password: mailbox.password,
        lastUid: mailbox.lastUid,
        uidValidity: mailbox.uidValidity
      });
      if (messages.length === 0) {
        continue;
      }
      console.log(`[Mailbox Poll] ${mailbox.address}: ${messages.length} new message(s)`);
      for (const message of messages) {
        const recorded = await recordEmailMessageReceived({ tenantId: mailbox.tenantId, ...message });
        console.log(`[Mailbox Poll] ${recorded ? 'recorded' : 'already had'} "${message.subject}" (uid ${message.uid}) for ${mailbox.address}`);
      }
    } catch (error: any) {
      // One broken inbox (wrong password, server down) must not stop the rest
      console.error(`[Mailbox Poll] ${mailbox.address} failed:`, error.message);
    }
  }
}
