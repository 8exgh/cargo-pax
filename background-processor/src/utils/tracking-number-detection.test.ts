import { describe, expect, it } from '@jest/globals';
import { carriersForTrackingNumber, looksLikeUrl, normalizeTrackingNumberInput } from './carrier';

describe('normalizeTrackingNumberInput', () => {
  it('strips the spaces and dashes carriers print', () => {
    expect(normalizeTrackingNumberInput(' 1Z999AA1 0123 456784 ')).toBe('1Z999AA10123456784');
    expect(normalizeTrackingNumberInput('7023-2101-2345-6789')).toBe('7023210123456789');
  });
});

describe('carriersForTrackingNumber', () => {
  it('identifies a carrier outright when the format is unique to it', () => {
    expect(carriersForTrackingNumber('1Z999AA10123456784')).toEqual(['ups']);
    expect(carriersForTrackingNumber('7023210123456789')).toEqual(['canada_post']);   // 16 digits
    expect(carriersForTrackingNumber('1234567890')).toEqual(['dhl']);                 // 10 digits
    expect(carriersForTrackingNumber('LZ123456789US')).toEqual(['usps', 'canada_post']);
  });

  it('returns every candidate when formats overlap', () => {
    expect(carriersForTrackingNumber('123456789012').sort()).toEqual(['fedex', 'purolator']);       // 12 digits
    expect(carriersForTrackingNumber('9400111899223397938644').sort()).toEqual(['fedex', 'ups', 'usps']); // 22 digits
  });

  it('returns nothing for input that is not a tracking number', () => {
    expect(carriersForTrackingNumber('hello')).toEqual([]);
    expect(carriersForTrackingNumber('12345')).toEqual([]);
    expect(carriersForTrackingNumber('')).toEqual([]);
  });
});

describe('looksLikeUrl', () => {
  it('tells a pasted link from a pasted number', () => {
    expect(looksLikeUrl('https://www.ups.com/track?tracknum=1Z999AA10123456784')).toBe(true);
    expect(looksLikeUrl('www.ups.com/track?tracknum=1Z999')).toBe(true);
    expect(looksLikeUrl('ups.com/track')).toBe(true);
    expect(looksLikeUrl('1Z999AA10123456784')).toBe(false);
    expect(looksLikeUrl('9400 1118 9922 3397 9386 44')).toBe(false);
  });
});
