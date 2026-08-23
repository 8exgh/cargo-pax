/* Which carrier a tracking url belongs to, and the tracking number inside
   it. Mirrors nextjs-app/lib/tracking/carrier.ts (keep both in sync). */

export type DeliveryCompany = 'ups' | 'fedex' | 'usps' | 'dhl' | 'canada_post' | 'purolator' | 'priority1' | 'unknown';

interface DomainCompanyMap {
  domainName: string;
  deliveryCompany: DeliveryCompany;
}

export const DOMAIN_MAPPING: DomainCompanyMap[] = [
  { domainName: 'ups.com', deliveryCompany: 'ups' },
  { domainName: 'usps.com', deliveryCompany: 'usps' },
  { domainName: 'fedex.com', deliveryCompany: 'fedex' },
  { domainName: 'dhl.com', deliveryCompany: 'dhl' },
  { domainName: 'canadapost.ca', deliveryCompany: 'canada_post' },
  { domainName: 'canadapost-postescanada.ca', deliveryCompany: 'canada_post' },
  { domainName: 'purolator.com', deliveryCompany: 'purolator' },
  { domainName: 'priority1.com', deliveryCompany: 'priority1' }
];

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function deliveryCompanyForUrl(url: string): DeliveryCompany {
  const hostname = hostnameOf(url);
  if (!hostname) {
    return 'unknown';
  }
  const match = DOMAIN_MAPPING.find(
    m => hostname === m.domainName || hostname.endsWith(`.${m.domainName}`)
  );
  return match ? match.deliveryCompany : 'unknown';
}

/* What each carrier's tracking numbers actually look like. The original
   service had no per-carrier rule and required 15+ characters, which no
   FedEx (12), Purolator (12) or DHL (10) number ever meets; a plain "8+
   characters" rule instead matches campaign ids and session tokens that
   sit in the same urls. These patterns are the real formats, so a link in
   a forwarded email is only tracked when its number fits its carrier. */
const TRACKING_NUMBER_PATTERNS: Partial<Record<DeliveryCompany, RegExp[]>> = {
  // 1Z + 16, "T" + 10 (InfoNotice), or Mail Innovations 18/22 digits
  ups: [/^1Z[0-9A-Z]{16}$/i, /^T\d{10}$/i, /^\d{18}$/, /^\d{22}$/],
  // Express 12, older 15, SmartPost/door tag 20, ground-to-post 22
  fedex: [/^\d{12}$/, /^\d{15}$/, /^\d{20}$/, /^\d{22}$/],
  // Domestic 20-26 digits, international 2 letters + 9 digits + 2 letters
  usps: [/^\d{20,26}$/, /^[A-Z]{2}\d{9}[A-Z]{2}$/i],
  // Express 10-11 digits, eCommerce JD/JJD/GM prefixes
  dhl: [/^\d{10,11}$/, /^J[A-Z0-9]{9,19}$/i, /^GM\d{10,20}$/i],
  // Domestic 16 digits, international 2 letters + 9 digits + 2 letters
  canada_post: [/^\d{16}$/, /^[A-Z]{2}\d{9}[A-Z]{2}$/i],
  // PIN: 12 digits, or 3-4 letters + 8-9 digits
  purolator: [/^\d{12}$/, /^[A-Z]{3,4}\d{8,9}$/i]
};

// Carriers without a documented format fall back to this
const GENERIC_TRACKING_NUMBER = /^(?=.*\d)[0-9A-Z]{8,}$/i;

export function isTrackingNumberForCompany(company: DeliveryCompany, value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  const candidate = value.trim();
  const patterns = TRACKING_NUMBER_PATTERNS[company];
  if (patterns) {
    return patterns.some(pattern => pattern.test(candidate));
  }
  return GENERIC_TRACKING_NUMBER.test(candidate);
}

// Scores how much a token looks like an English word (vowel ratio, camel
// case, digits). The tracking number is the least English-looking token.
export function englishLikenessScore(str: string): number {
  if (!str) return 0;
  let score = 0;
  const vowelCount = (str.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowelCount / str.length;
  if (vowelRatio > 0.2 && vowelRatio < 0.6) {
    score += 1;
  }
  const camelCaseMatches = str.match(/[A-Z]/g) || [];
  if (camelCaseMatches.length > 1) {
    score += 1;
  }
  const numberCount = (str.match(/[0-9]/g) || []).length;
  if (numberCount === 0) {
    score += 1;
  } else {
    score -= numberCount * 0.5;
  }
  return score;
}

/* The tracking number in a url: the longest token that fits the carrier's
   format, or (when nothing fits) the original's least-English-looking
   token as a best effort, so a pasted url still gets a number to show. */
export function trackingNumberFromUrl(
  url: string,
  company: DeliveryCompany = deliveryCompanyForUrl(url)
): string | null {
  const matches = url.match(/\b[a-zA-Z0-9]+\b/g);
  if (!matches) {
    return null;
  }
  const candidates = matches.filter(m => m.length >= 8);
  if (candidates.length === 0) {
    return null;
  }

  const fitting = candidates.filter(c => isTrackingNumberForCompany(company, c));
  if (fitting.length > 0) {
    return fitting.reduce((a, b) => (b.length > a.length ? b : a));
  }

  return candidates.reduce((a, b) => (englishLikenessScore(a) < englishLikenessScore(b) ? a : b));
}
