import dotenv from 'dotenv';
import { runTrackerRefreshJob } from './jobs/tracker-refresh.js';
import { runMailboxPollJob } from './jobs/mailbox-poll.js';
import { runEmailProcessingJob } from './jobs/email-processing.js';
import { BrowserAutomation } from './utils/browser-automation.js';
import { getOpenAiModel } from './utils/tracker-html-analyzer.js';

// Load environment variables
dotenv.config();

function getPollingIntervalMs(): number {
  return parseInt(process.env.POLLING_INTERVAL_MS || '5000', 10);
}

// Inboxes are polled less often than the app: IMAP logins are not free
function getMailboxPollIntervalMs(): number {
  return parseInt(process.env.MAILBOX_POLL_INTERVAL_MS || '60000', 10);
}

console.log('=================================');
console.log('CargoPax Background Processor Starting');
console.log('=================================');
console.log(`Build: ${process.env.GIT_COMMIT || 'dev'} (${process.env.BUILD_TIME || 'unknown build time'})`);
console.log(`NextJS API URL: ${process.env.NEXTJS_API_URL}`);
console.log(`OpenAI model: ${getOpenAiModel()} (key ${process.env.OPENAI_API_KEY ? 'set' : 'MISSING'})`);
console.log(`IMAP host: ${process.env.IMAP_HOST || 'imap.migadu.com'}`);
console.log(`Polling Interval: ${getPollingIntervalMs()}ms (inboxes every ${getMailboxPollIntervalMs()}ms)`);
console.log('=================================');

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const browser = new BrowserAutomation();
let lastMailboxPoll = 0;

async function runJobLoop(): Promise<void> {
  while (true) {
    try {
      // The three loops of the original scraper, one cycle each
      if (Date.now() - lastMailboxPoll >= getMailboxPollIntervalMs()) {
        lastMailboxPoll = Date.now();
        await runMailboxPollJob();
      }
      await runEmailProcessingJob();
      await runTrackerRefreshJob(browser);
    } catch (error: any) {
      console.error('[Job Loop] Error:', error.message);
    }

    // Wait before next cycle
    await sleep(getPollingIntervalMs());
  }
}

async function shutdown(): Promise<void> {
  await browser.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the job loop
runJobLoop().catch(error => {
  console.error('[Fatal Error]:', error);
  process.exit(1);
});
