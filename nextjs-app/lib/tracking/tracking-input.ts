import { DeliveryCompany } from '@/types/events';
import {
  carriersForTrackingNumber,
  COMPANY_LABELS,
  deliveryCompanyForUrl,
  looksLikeUrl,
  normalizeTrackingNumberInput,
  trackingNumberFromUrl
} from './carrier';

/* Turns whatever someone typed into the tracking box - a carrier link, or
   a bare tracking number - into the url the scraper will read.
   Ambiguity is handed back rather than guessed at: 12 digits is FedEx or
   Purolator, and only the person holding the parcel knows which. */

// Where each carrier shows a single shipment. The scraper prefers the Bing
// answer box for UPS/FedEx/USPS/DHL anyway, so these are mainly the fallback
// (and the link shown on the dashboard).
const TRACKING_URL_BUILDERS: Partial<Record<DeliveryCompany, (n: string) => string>> = {
  ups: n => `https://www.ups.com/track?loc=en_CA&requester=ST&tracknum=${encodeURIComponent(n)}`,
  fedex: n => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  usps: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  dhl: n => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}&brand=DHL`,
  canada_post: n =>
    `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${encodeURIComponent(n)}`,
  purolator: n => `https://www.purolator.com/en/shipping/tracker?pin=${encodeURIComponent(n)}`
};

export function canBuildTrackingUrl(company: DeliveryCompany): boolean {
  return TRACKING_URL_BUILDERS[company] !== undefined;
}

// Every carrier a user may pick from the dropdown
export const SELECTABLE_COMPANIES: DeliveryCompany[] = (
  Object.keys(TRACKING_URL_BUILDERS) as DeliveryCompany[]
).sort((a, b) => COMPANY_LABELS[a].localeCompare(COMPANY_LABELS[b]));

export type TrackingInputResolution =
  | { ok: true; url: string; company: DeliveryCompany; trackingNumber: string }
  | { ok: false; reason: 'empty' | 'invalid_url' | 'unknown_number' | 'unsupported_carrier'; message: string }
  | { ok: false; reason: 'ambiguous'; message: string; candidates: DeliveryCompany[] };

function describe(companies: DeliveryCompany[]): string {
  const labels = companies.map(c => COMPANY_LABELS[c]);
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

/**
 * @param input   a carrier url, or a bare tracking number
 * @param chosen  the carrier the user picked, when they picked one
 */
export function resolveTrackingInput(input: string, chosen?: DeliveryCompany | null): TrackingInputResolution {
  const raw = (input || '').trim();
  if (!raw) {
    return { ok: false, reason: 'empty', message: 'Paste a tracking link or number.' };
  }

  // A url is self-describing: its host names the carrier, so a dropdown
  // choice never overrides it.
  if (looksLikeUrl(raw)) {
    let url: string;
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      url = new URL(withScheme).toString();
    } catch {
      return { ok: false, reason: 'invalid_url', message: 'That does not look like a valid url.' };
    }
    const company = deliveryCompanyForUrl(url);
    return {
      ok: true,
      url,
      company,
      trackingNumber: trackingNumberFromUrl(url, company) ?? ''
    };
  }

  const number = normalizeTrackingNumberInput(raw);

  if (chosen) {
    if (!canBuildTrackingUrl(chosen)) {
      return {
        ok: false,
        reason: 'unsupported_carrier',
        message: `Paste the tracking link for ${COMPANY_LABELS[chosen]} instead - a number alone is not enough for that carrier.`
      };
    }
    return { ok: true, url: TRACKING_URL_BUILDERS[chosen]!(number), company: chosen, trackingNumber: number };
  }

  const candidates = carriersForTrackingNumber(number).filter(canBuildTrackingUrl);

  if (candidates.length === 1) {
    const company = candidates[0];
    return { ok: true, url: TRACKING_URL_BUILDERS[company]!(number), company, trackingNumber: number };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
      message: `That number could be ${describe(candidates)}. Pick the carrier so we track the right one.`,
      candidates
    };
  }

  return {
    ok: false,
    reason: 'unknown_number',
    message: 'That does not match a tracking number we recognise. Pick the carrier, or paste the tracking link instead.'
  };
}
