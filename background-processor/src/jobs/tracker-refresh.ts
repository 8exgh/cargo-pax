import { getRefreshRequests, updateTrackingShipmentStatus, TrackerRefreshRequest } from '../utils/api-client.js';
import { BrowserAutomation } from '../utils/browser-automation.js';
import { TrackerHtmlAnalyzer } from '../utils/tracker-html-analyzer.js';
import { errorCommand, toStatusCommand } from '../utils/shipment-status.js';
import type { DeliveryCompany } from '../utils/carrier.js';

const analyzer = new TrackerHtmlAnalyzer();

// The original's trick: for these carriers Bing renders a package-tracking
// answer box for "<number> tracking number", which is far easier to read
// than the carrier's own (bot-hostile) page. The carrier page is the
// fallback when the box does not show.
const BING_SUPPORTED: DeliveryCompany[] = ['ups', 'fedex', 'usps', 'dhl'];
const BING_ANSWER_SELECTOR = '#package_tr_ans';

function bingEnabled(): boolean {
  return (process.env.TRACKING_USE_BING || 'true').toLowerCase() !== 'false';
}

async function fetchTrackingHtml(
  browser: BrowserAutomation,
  request: TrackerRefreshRequest
): Promise<{ html: string | null; navigationError: string | null; via: string }> {
  const trackingNumber = (request.trackingNumber || '').replace(/[^A-Za-z0-9]/g, '');
  if (bingEnabled() && BING_SUPPORTED.includes(request.company) && trackingNumber.length >= 8) {
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(`${trackingNumber} tracking number`)}`;
    const result = await browser.getHtmlFromUrlBySelector(bingUrl, BING_ANSWER_SELECTOR);
    if (result.html && result.html.trim().length > 0) {
      return { ...result, via: 'bing' };
    }
    console.log(`[Tracker Refresh] no Bing answer box for ${trackingNumber}; reading the carrier page`);
  }
  const result = await browser.getHtmlFromUrlBySelector(request.url, 'body');
  return { ...result, via: 'carrier' };
}

// One refresh: render the tracking information, have the model read it,
// report the outcome. Any failure on our side (browser, model, network) is
// reported as an error status too, so the tracker never stays "refresh in
// progress" forever; the user can ask again.
export async function refreshTracker(browser: BrowserAutomation, request: TrackerRefreshRequest): Promise<void> {
  let command;
  try {
    const page = await fetchTrackingHtml(browser, request);
    if (page.navigationError) {
      command = errorCommand(request.tenantId, request.trackerId, `Could not open the tracking page: ${page.navigationError}`);
    } else if (!page.html) {
      command = errorCommand(request.tenantId, request.trackerId, 'The tracking page had no content.');
    } else {
      const journey = await analyzer.processPage(page.html);
      console.log(`[Tracker Refresh] ${request.url} (${page.via}) -> ${JSON.stringify(journey)}`);
      command = toStatusCommand(request.tenantId, request.trackerId, journey);
    }
  } catch (error: any) {
    console.error(`[Tracker Refresh] Failed to read ${request.url}:`, error.message);
    command = errorCommand(request.tenantId, request.trackerId, `Could not read the tracking page: ${error.message}`);
  }

  await updateTrackingShipmentStatus(command);
}

export async function runTrackerRefreshJob(browser: BrowserAutomation): Promise<void> {
  let requests: TrackerRefreshRequest[];
  try {
    requests = await getRefreshRequests();
  } catch (error: any) {
    console.error('[Tracker Refresh] Could not fetch refresh requests:', error.message);
    return;
  }

  if (requests.length === 0) {
    return;
  }

  console.log(`[Tracker Refresh] ${requests.length} tracker(s) to refresh`);

  // The app already sorted them: highest priority first, then oldest
  for (const request of requests) {
    try {
      console.log(`[Tracker Refresh] Refreshing ${request.url} (tenant ${request.tenantId}, ${request.company} ${request.trackingNumber})`);
      await refreshTracker(browser, request);
    } catch (error: any) {
      // Reporting itself failed (app down, tracker deleted meanwhile); the
      // request stays queued and is retried next cycle
      console.error(`[Tracker Refresh] Could not report status for ${request.url}:`, error.message);
    }
  }
}
