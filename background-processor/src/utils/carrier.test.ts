import { describe, expect, it } from '@jest/globals';
import { deliveryCompanyForUrl, isTrackingNumberForCompany, trackingNumberFromUrl } from './carrier';

describe('deliveryCompanyForUrl', () => {
  it('maps carrier hosts including subdomains', () => {
    expect(deliveryCompanyForUrl('https://www.ups.com/track?tracknum=1Z999AA10123456784')).toBe('ups');
    expect(deliveryCompanyForUrl('https://www.fedex.com/fedextrack/?trknbr=123456789012')).toBe('fedex');
    expect(deliveryCompanyForUrl('https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223397938644')).toBe('usps');
    expect(deliveryCompanyForUrl('https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=7023210123456789')).toBe('canada_post');
    expect(deliveryCompanyForUrl('https://www.purolator.com/en/shipping/tracker?pin=332938204011')).toBe('purolator');
  });

  it('is unknown for everything else, including look-alikes', () => {
    expect(deliveryCompanyForUrl('https://example.org/track/123')).toBe('unknown');
    expect(deliveryCompanyForUrl('https://ups.com.evil.example/track')).toBe('unknown');
    expect(deliveryCompanyForUrl('not a url')).toBe('unknown');
  });
});

describe('isTrackingNumberForCompany', () => {
  it('accepts each carrier its real formats', () => {
    expect(isTrackingNumberForCompany('ups', '1Z999AA10123456784')).toBe(true);
    expect(isTrackingNumberForCompany('ups', 'T1234567890')).toBe(true);
    expect(isTrackingNumberForCompany('fedex', '123456789012')).toBe(true);
    expect(isTrackingNumberForCompany('fedex', '123456789012345')).toBe(true);
    expect(isTrackingNumberForCompany('usps', '9400111899223397938644')).toBe(true);
    expect(isTrackingNumberForCompany('usps', 'LZ123456789US')).toBe(true);
    expect(isTrackingNumberForCompany('dhl', '1234567890')).toBe(true);
    expect(isTrackingNumberForCompany('canada_post', '7023210123456789')).toBe(true);
    expect(isTrackingNumberForCompany('purolator', '332938204011')).toBe(true);
  });

  it('rejects the campaign ids and session tokens that share those urls', () => {
    expect(isTrackingNumberForCompany('ups', 'abcdefghijklmnop1234')).toBe(false);
    expect(isTrackingNumberForCompany('ups', '123456789012')).toBe(false); // a FedEx-shaped number is not a UPS one
    expect(isTrackingNumberForCompany('fedex', '2460')).toBe(false);
    expect(isTrackingNumberForCompany('usps', 'TrackConfirmAction')).toBe(false);
    expect(isTrackingNumberForCompany('canada_post', '70232101234567')).toBe(false); // 14 digits, not 16
    expect(isTrackingNumberForCompany('ups', null)).toBe(false);
  });

  it('falls back to a generic rule for carriers without a documented format', () => {
    expect(isTrackingNumberForCompany('priority1', 'P1X8834720')).toBe(true);
    expect(isTrackingNumberForCompany('priority1', 'shipmentdetails')).toBe(false); // no digit
  });
});

describe('trackingNumberFromUrl', () => {
  it('picks the token that fits the carrier, not just the least English-looking one', () => {
    expect(trackingNumberFromUrl('https://www.ups.com/track?loc=en_CA&tracknum=1Z999AA10123456784&requester=ST')).toBe('1Z999AA10123456784');
    expect(trackingNumberFromUrl('https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223397938644')).toBe('9400111899223397938644');
    expect(trackingNumberFromUrl('https://www.fedex.com/fedextrack/?trknbr=123456789012&trkqual=2460')).toBe('123456789012');
    // A tracking url that also carries a longer campaign token
    expect(trackingNumberFromUrl('https://www.ups.com/track?tracknum=1Z999AA10123456784&cid=ac9f8123bd7742aa9931f0e5')).toBe('1Z999AA10123456784');
  });

  it('still returns a best effort when nothing fits the carrier format', () => {
    expect(trackingNumberFromUrl('https://www.ups.com/track/summary/9f8123bd77')).toBe('9f8123bd77');
  });

  it('returns null when there is no candidate at all', () => {
    expect(trackingNumberFromUrl('https://ups.com/track')).toBeNull();
  });
});
