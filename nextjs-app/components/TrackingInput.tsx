'use client';

import { useEffect, useState } from 'react';
import type { DeliveryCompany } from '@/types/events';
import { carriersForTrackingNumber, COMPANY_LABELS, deliveryCompanyForUrl, looksLikeUrl } from '@/lib/tracking/carrier';
import { canBuildTrackingUrl, SELECTABLE_COMPANIES } from '@/lib/tracking/tracking-input';

/* Accepts a carrier link or a bare tracking number. The dropdown is
   optional: it fills itself in from whatever we can work out, and the user
   only has to touch it when a number's format belongs to more than one
   carrier (12 digits is FedEx or Purolator) or when we cannot place it. */

type Detection =
  | { kind: 'idle' }
  | { kind: 'from-url'; company: DeliveryCompany }
  | { kind: 'identified'; company: DeliveryCompany }
  | { kind: 'ambiguous'; candidates: DeliveryCompany[] }
  | { kind: 'unknown' };

function detect(input: string): Detection {
  const value = input.trim();
  if (!value) {
    return { kind: 'idle' };
  }
  if (looksLikeUrl(value)) {
    return { kind: 'from-url', company: deliveryCompanyForUrl(/^https?:\/\//i.test(value) ? value : `https://${value}`) };
  }
  const candidates = carriersForTrackingNumber(value).filter(canBuildTrackingUrl);
  if (candidates.length === 1) {
    return { kind: 'identified', company: candidates[0] };
  }
  if (candidates.length > 1) {
    return { kind: 'ambiguous', candidates };
  }
  return { kind: 'unknown' };
}

export function TrackingInput({
  onTrack,
  busy,
  error
}: {
  onTrack: (input: string, company: DeliveryCompany | null) => void | Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [input, setInput] = useState('');
  const [company, setCompany] = useState<DeliveryCompany | ''>('');
  // Once the user picks a carrier we stop overriding them - until they edit
  // the box again, which starts the guessing over.
  const [companyTouched, setCompanyTouched] = useState(false);
  const detection = detect(input);

  useEffect(() => {
    if (companyTouched) {
      return;
    }
    if (detection.kind === 'identified' || (detection.kind === 'from-url' && detection.company !== 'unknown')) {
      setCompany(detection.company);
    } else {
      setCompany('');
    }
    // detection is derived from input, so this runs on every edit
  }, [input, companyTouched, detection.kind]);

  const fromUrl = detection.kind === 'from-url';
  const mustChoose = !company && (detection.kind === 'ambiguous' || detection.kind === 'unknown');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (input.trim()) {
          onTrack(input.trim(), company || null);
        }
      }}
      className="space-y-2"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setCompanyTouched(false);
          }}
          placeholder="Tracking number, or a link like https://www.ups.com/track?tracknum=…"
          spellCheck={false}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
        <select
          value={company}
          onChange={e => {
            setCompany(e.target.value as DeliveryCompany | '');
            setCompanyTouched(true);
          }}
          disabled={fromUrl}
          title={fromUrl ? 'The link already says which carrier it is' : 'Carrier'}
          aria-label="Carrier"
          className={`px-2 py-2 border rounded-md text-sm text-gray-800 sm:w-44 ${
            mustChoose ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
          } disabled:bg-gray-100 disabled:text-gray-500`}
        >
          <option value="">{fromUrl ? 'From the link' : 'Detect carrier'}</option>
          {SELECTABLE_COMPANIES.map(c => (
            <option key={c} value={c}>
              {COMPANY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !input.trim() || mustChoose}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
        >
          {busy ? 'Adding…' : 'Track'}
        </button>
      </div>

      <p className="text-xs min-h-[1rem]">
        {detection.kind === 'idle' && (
          <span className="text-gray-500">Paste the number from the carrier, or the whole tracking link.</span>
        )}
        {detection.kind === 'from-url' && detection.company !== 'unknown' && (
          <span className="text-green-700">{COMPANY_LABELS[detection.company]} link</span>
        )}
        {detection.kind === 'from-url' && detection.company === 'unknown' && (
          <span className="text-amber-700">
            We do not know this site, so we will keep the link but cannot check it for updates.
          </span>
        )}
        {detection.kind === 'identified' && !companyTouched && (
          <span className="text-green-700">Looks like {COMPANY_LABELS[detection.company]} — change it if that is wrong.</span>
        )}
        {detection.kind === 'ambiguous' && !company && (
          <span className="text-amber-700">
            That number could be {detection.candidates.map(c => COMPANY_LABELS[c]).join(' or ')} — pick the carrier.
          </span>
        )}
        {detection.kind === 'unknown' && !company && (
          <span className="text-amber-700">Not a number we recognise — pick the carrier, or paste the link instead.</span>
        )}
        {company && companyTouched && <span className="text-gray-500">Tracking as {COMPANY_LABELS[company]}.</span>}
      </p>

      {error && <p className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
    </form>
  );
}
