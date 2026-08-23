import { deliveryCompanyForUrl, DeliveryCompany, isTrackingNumberForCompany, trackingNumberFromUrl } from './carrier.js';

/* Pulls the trackable carrier links out of a forwarded email. The original
   scraper regexed raw MIME (decoding base64 parts by hand); here mailparser
   has already produced text and html, so the url regex runs over both.
   A link counts when its host is a known carrier AND it carries a token in
   that carrier's own tracking-number format (see carrier.ts), so the
   "manage your preferences" and campaign links that ride in the same
   emails are left alone. One link per tracking number. */

export interface TrackableLink {
  url: string;
  company: DeliveryCompany;
  trackingNumber: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"'()\]]+/gi;

function cleanUrl(raw: string): string {
  let url = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/=3D/g, '=');
  // Trailing punctuation that belongs to the sentence, not the link
  url = url.replace(/[.,;:!?]+$/, '');
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

export function extractUrls(content: string): string[] {
  const matches = content.match(URL_PATTERN) || [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const url = cleanUrl(match);
    if (!url || seen.has(url)) {
      continue;
    }
    try {
      new URL(url);
    } catch {
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function extractTrackableLinks(text: string, html: string): TrackableLink[] {
  const byTrackingNumber = new Map<string, TrackableLink>();
  for (const url of extractUrls(`${text}\n${html}`)) {
    const company = deliveryCompanyForUrl(url);
    if (company === 'unknown') {
      continue;
    }
    const trackingNumber = trackingNumberFromUrl(url, company);
    if (!isTrackingNumberForCompany(company, trackingNumber)) {
      continue;
    }
    const key = trackingNumber.toLowerCase();
    if (!byTrackingNumber.has(key)) {
      byTrackingNumber.set(key, { url, company, trackingNumber });
    }
  }
  return [...byTrackingNumber.values()];
}
