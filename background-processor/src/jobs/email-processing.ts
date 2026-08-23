import {
  getEmailMessageContent,
  getEmailMessagesToProcess,
  markEmailMessageAsProcessed,
  startTrackingShipment
} from '../utils/api-client.js';
import { extractTrackableLinks } from '../utils/email-url-extractor.js';
import { formatLabel, TrackerHtmlAnalyzer } from '../utils/tracker-html-analyzer.js';
import { stripHtml } from '../utils/strip-html.js';

const analyzer = new TrackerHtmlAnalyzer();

// The original processEmailsForever: for each forwarded email, find the
// carrier links with tracking numbers, name the shipment from the email,
// start a tracker per link, and mark the email processed.
export async function runEmailProcessingJob(): Promise<void> {
  let messages;
  try {
    messages = await getEmailMessagesToProcess();
  } catch (error: any) {
    console.error('[Email Processing] Could not fetch messages:', error.message);
    return;
  }

  for (const message of messages) {
    try {
      const content = await getEmailMessageContent(message.tenantId, message.messageId);
      const links = extractTrackableLinks(content.text, content.html);
      console.log(`[Email Processing] "${content.subject}" from ${content.from}: ${links.length} trackable link(s)`);

      const trackerIds: string[] = [];
      let note = links.length === 0 ? 'no carrier tracking links found' : '';

      if (links.length > 0) {
        let label = null;
        try {
          const emailText = content.text.trim().length > 0 ? content.text : stripHtml(content.html);
          label = await analyzer.computeLabel(`Subject: ${content.subject}\nFrom: ${content.from}\n\n${emailText}`);
        } catch (error: any) {
          console.warn(`[Email Processing] Could not compute a label: ${error.message}`);
        }

        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          const trackerId = await startTrackingShipment({
            tenantId: message.tenantId,
            url: link.url,
            shipmentCompany: link.company,
            trackingNumber: link.trackingNumber,
            label: formatLabel(label, i, links.length),
            messageId: message.messageId
          });
          if (trackerId) {
            trackerIds.push(trackerId);
            console.log(`[Email Processing] tracking ${link.company} ${link.trackingNumber} as ${trackerId}`);
          } else {
            console.log(`[Email Processing] ${link.company} ${link.trackingNumber} is already tracked`);
            note = 'already tracked';
          }
        }
      }

      await markEmailMessageAsProcessed(message.tenantId, message.messageId, trackerIds, note);
    } catch (error: any) {
      // Left unprocessed; retried next cycle
      console.error(`[Email Processing] ${message.messageId} failed:`, error.message);
    }
  }
}
