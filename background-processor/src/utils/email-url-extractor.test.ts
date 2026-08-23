import { describe, expect, it } from '@jest/globals';
import { extractTrackableLinks, extractUrls } from './email-url-extractor';

describe('extractUrls', () => {
  it('finds links in text and html, decodes entities, trims junk', () => {
    const text = 'Track it here: https://www.ups.com/track?tracknum=1Z999AA10123456784&loc=en_CA. Thanks!';
    const html = '<a href="https://www.fedex.com/fedextrack/?trknbr=123456789012&amp;trkqual=2460">Track</a> <p>https://example.org/unsubscribe/abcdefghijklmnop123/</p>';
    const urls = extractUrls(`${text}\n${html}`);
    expect(urls).toEqual([
      'https://www.ups.com/track?tracknum=1Z999AA10123456784&loc=en_CA',
      'https://www.fedex.com/fedextrack/?trknbr=123456789012&trkqual=2460',
      'https://example.org/unsubscribe/abcdefghijklmnop123'
    ]);
  });

  it('dedupes', () => {
    const urls = extractUrls('https://www.ups.com/track?tracknum=1Z999AA10123456784 https://www.ups.com/track?tracknum=1Z999AA10123456784');
    expect(urls).toHaveLength(1);
  });
});

describe('extractTrackableLinks', () => {
  it('keeps only carrier links whose number fits that carrier, one per number', () => {
    const text = [
      'Your order shipped! https://www.ups.com/track?tracknum=1Z999AA10123456784',
      'Also https://www.ups.com/track?loc=en_US&tracknum=1Z999AA10123456784&requester=WT (same package)',
      'Second box: https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223397938644',
      'Third: https://www.fedex.com/fedextrack/?trknbr=123456789012&trkqual=2460',
      'Manage preferences: https://example.org/prefs/abcdefghijklmnopqrs1234',
      'Carrier home: https://www.ups.com/ca/en/Home.page',
      'Survey: https://www.ups.com/campaign?cid=ac9f8123bd7742aa9931f0e5'
    ].join('\n');
    const links = extractTrackableLinks(text, '');
    expect(links.map(l => [l.company, l.trackingNumber])).toEqual([
      ['ups', '1Z999AA10123456784'],
      ['usps', '9400111899223397938644'],
      ['fedex', '123456789012']
    ]);
  });

  it('returns nothing for an email without carrier links', () => {
    expect(extractTrackableLinks('Hello, no links here', '<p>none</p>')).toEqual([]);
  });
});
