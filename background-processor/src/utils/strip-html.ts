import striptags from 'striptags';

// Turns a rendered carrier page into the plain text the model reads. The
// original service kept long lists of carrier boilerplate phrases and
// deleted them (and every comma-separated fragment of them) to squeeze the
// page under a 4k-token model; that also ate words like "or" and "Track".
// The current model has room to spare, so this only drops the obvious
// noise (scripts, styles, nav links, cookie banners) line by line and caps
// the length so a runaway page cannot run up the bill.

export const MAX_TEXT_LENGTH = 40_000;

const BOILERPLATE_LINES = new Set(
  [
    'skip to main content',
    'log in / sign up',
    'log in',
    'sign up',
    'menu',
    'menuclose',
    'close',
    'search',
    'searchclose',
    'searchclosex',
    'previous',
    'next',
    'feedback',
    'cookie settings',
    'privacy notice',
    'website terms of use',
    'terms and conditions',
    'global home',
    'protect against fraud',
    'tips to avoid fraud',
    'connect with us',
    'select another country or territory',
    'canada - english',
    'canada - français',
    'this site uses cookies',
    'stay safe - avoid fraud and scams',
    'enter up to 25 tracking numbers, one per line.',
    'track by reference number',
    'import tracking numbers',
    'other tracking services',
    'create a shipment',
    'calculate shipping cost',
    'schedule a pickup',
    'find a location',
    'view shipping history',
    'batch file shipping',
    'packaging and shipping supplies',
    'manage customer orders',
    'how to ship a package',
    'how to ship internationally',
    'how to return a package',
    'go to shipping support',
    'go to tracking support',
    'view all shipments',
    'manage with quantum view',
    'change a delivery',
    'business solutions',
    'open an account to save up to 52%',
    'business shipping tools',
    'view and control your shipments',
    'manage shipments for large enterprises',
    'understand and pay bills',
    'file or view a claim',
    'start or grow your business',
    'expand your online business',
    'pickup and drop-off options',
    'simplify returns',
    'manage your profile',
    'contact us',
    'tracking support',
    'shipping support',
    'international tools and resources',
    'communication preferences',
    'other ups sites',
    'supply chain solutions',
    'ups jobs'
  ].map(s => s.toLowerCase())
);

const BOILERPLATE_PATTERNS: RegExp[] = [
  /open the link in a new window/i,
  /^copyright ©/i,
  /all rights reserved\.?$/i,
  /^ups freight less-than-truckload/i,
  /^service information \.\.\./i,
  /^by continuing, you consent to our use of cookies/i,
  /^received a text, call or email that seems suspicious/i
];

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function stripHtml(html: string): string {
  // Block-level boundaries become newlines before the tags go, so that
  // adjacent cells and list items don't fuse into one word
  let text = html
    .replace(/<(script|style|noscript|svg|template|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|nav|table|ul|ol|dd|dt|dl|option|label|button|td|th)>/gi, '\n');

  text = decodeEntities(striptags(text));

  const lines = text
    .split('\n')
    .map(line => line.replace(/[ \t ]+/g, ' ').trim())
    .filter(line => line.length > 0)
    .filter(line => !BOILERPLATE_LINES.has(line.toLowerCase()))
    .filter(line => !BOILERPLATE_PATTERNS.some(p => p.test(line)));

  // Collapse runs of identical lines (nav menus repeat in mobile + desktop)
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }

  let result = deduped.join('\n');
  if (result.length > MAX_TEXT_LENGTH) {
    result = result.slice(0, MAX_TEXT_LENGTH);
  }
  return result;
}
