'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { ShipmentJourney } from '@/components/ShipmentJourney';
import { TrackingInput } from '@/components/TrackingInput';
import type { DeliveryCompany } from '@/types/events';
import type { AccountView, GroupView, TrackerView } from '@/types/queries';

const POLL_FAST_MS = 4000; // while a refresh or the inbox setup is pending
const POLL_SLOW_MS = 30000; // forwarded emails arrive any time

function shortUrl(url: string): string {
  return url.length > 70 ? `${url.substring(0, 70)}…` : url;
}

export default function Dashboard() {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [actionError, setActionError] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const router = useRouter();
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const response = await fetch('/api/queries/account', { headers: authHeaders() });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        router.push('/');
        return;
      }
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.email) localStorage.setItem('pendingEmail', data.email);
        router.push('/verify');
        return;
      }
      if (!response.ok) {
        setFatalError('Could not load your account.');
        return;
      }

      setAccount(await response.json());
      setFatalError('');
    } catch (error) {
      console.error('Failed to load account:', error);
      setFatalError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    loadAccount();
  }, [loadAccount, router]);

  // A push means something changed; pull the new state in behind the
  // notification rather than waiting for the next poll.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'cargopax-push') {
        loadAccount();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [loadAccount]);

  // Poll quickly while something is in flight, slowly otherwise
  useEffect(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
    }
    const busy =
      account?.mailbox?.status === 'requested' ||
      account?.tracking.some(t => t.refreshInProgress);
    pollTimer.current = setTimeout(loadAccount, busy ? POLL_FAST_MS : POLL_SLOW_MS);
    return () => {
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
      }
    };
  }, [account, loadAccount]);

  async function command(path: string, body?: object): Promise<{ ok: boolean; data: any }> {
    setActionError('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body ?? {})
      });
      if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/');
        return { ok: false, data: null };
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionError(data.error || 'Something went wrong');
        return { ok: false, data };
      }
      await loadAccount();
      return { ok: true, data };
    } catch (error: any) {
      setActionError(error.message || 'Something went wrong');
      return { ok: false, data: null };
    }
  }

  async function startTracking(input: string, company: DeliveryCompany | null) {
    setAdding(true);
    await command('/api/commands/start-tracking-shipment', { input, company });
    setAdding(false);
  }

  async function refreshAll() {
    setRefreshingAll(true);
    await command('/api/commands/refresh-trackers');
    setRefreshingAll(false);
  }

  async function createGroup(): Promise<string | null> {
    const name = prompt('Name for the new group:');
    if (!name || !name.trim()) {
      return null;
    }
    const { ok, data } = await command('/api/commands/create-group', { name: name.trim() });
    return ok ? data.groupId : null;
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-700 inline-flex items-center gap-2"><Spinner /> Loading your account…</div>
      </div>
    );
  }

  if (fatalError || !account) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header email={null} onLogout={handleLogout} />
        <div className="max-w-3xl mx-auto p-4">
          <div className="p-4 bg-red-100 text-red-700 rounded">{fatalError || 'Account not found.'}</div>
        </div>
      </div>
    );
  }

  const visibleTracking = account.tracking.filter(t => groupFilter === 'all' || (t.groupId ?? 'none') === groupFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header email={account.email} onLogout={handleLogout} />
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <ForwardingBanner account={account} />

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Or add one yourself</h2>
          <p className="text-sm text-gray-500 mb-3">UPS, FedEx, Canada Post, Purolator, DHL, USPS.</p>
          <TrackingInput onTrack={startTracking} busy={adding} error={actionError} />
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
            <div className="flex items-center gap-2">
              {account.groups.length > 0 && (
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700"
                >
                  <option value="all">All groups</option>
                  <option value="none">No group</option>
                  {account.groups.map(g => (
                    <option key={g.groupId} value={g.groupId}>{g.name}</option>
                  ))}
                </select>
              )}
              {account.tracking.length > 0 && (
                <button
                  onClick={refreshAll}
                  disabled={refreshingAll || account.tracking.every(t => t.refreshInProgress)}
                  className="text-sm bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:bg-gray-300"
                >
                  {refreshingAll ? 'Requesting…' : 'Refresh all'}
                </button>
              )}
            </div>
          </div>

          {visibleTracking.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {account.tracking.length === 0
                ? 'Nothing on the way yet. Forward a shipment email to your address above, or paste a tracking link.'
                : 'No shipments in this group.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleTracking.map(t => (
                <TrackerRow key={t.trackerId} tracker={t} groups={account.groups} command={command} createGroup={createGroup} />
              ))}
            </ul>
          )}
        </section>

        {account.completedDeliveries.length > 0 && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Delivered</h2>
            <ul className="divide-y divide-gray-100">
              {account.completedDeliveries.map(t => (
                <TrackerRow key={t.trackerId} tracker={t} groups={account.groups} command={command} createGroup={createGroup} />
              ))}
            </ul>
          </section>
        )}

        {account.recentEmails.length > 0 && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Forwarded emails</h2>
            <ul className="divide-y divide-gray-100 text-sm">
              {account.recentEmails.map(m => (
                <li key={m.messageId} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-gray-900 truncate">{m.subject || '(no subject)'}</div>
                    <div className="text-gray-500 truncate">{m.from}</div>
                  </div>
                  <div className="text-right whitespace-nowrap text-gray-500">
                    <div>{new Date(m.receivedAt).toLocaleDateString()}</div>
                    <div className={m.processed ? 'text-green-700' : 'text-blue-700'}>
                      {m.processed
                        ? m.trackerIds.length > 0
                          ? `${m.trackerIds.length} shipment${m.trackerIds.length === 1 ? '' : 's'} found`
                          : 'no tracking links'
                        : 'reading…'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ForwardingBanner({ account }: { account: AccountView }) {
  const [copied, setCopied] = useState(false);
  const mailbox = account.mailbox;
  if (!mailbox) {
    return null;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(mailbox!.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="bg-blue-600 text-white rounded-lg shadow p-6">
      <h2 className="text-sm uppercase tracking-wide opacity-80 mb-1">Forward your shipment emails to</h2>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-mono break-all">{mailbox.address}</p>
        <button onClick={copy} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            mailbox.status === 'provisioned' ? 'bg-green-400 text-green-950' : 'bg-amber-300 text-amber-950'
          }`}
        >
          {mailbox.status === 'provisioned' ? 'Live' : mailbox.status === 'failed' ? 'Setting up (retrying)' : 'Setting up…'}
        </span>
      </div>
      <p className="text-sm mt-2 opacity-90">
        Every order confirmation or carrier email you forward here gets its tracking links picked out
        and followed automatically. You will get an email as each package moves.
        {' '}<Link href="/settings" className="underline">Inbox details and settings</Link>
      </p>
    </section>
  );
}

function TrackerRow({
  tracker,
  groups,
  command,
  createGroup
}: {
  tracker: TrackerView;
  groups: GroupView[];
  command: (path: string, body?: object) => Promise<{ ok: boolean; data: any }>;
  createGroup: () => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tracker.label);
  const [busy, setBusy] = useState(false);

  async function saveLabel() {
    const label = draft.trim();
    if (!label) {
      return;
    }
    setBusy(true);
    const { ok } = await command('/api/commands/update-tracking-shipment-label', { trackerId: tracker.trackerId, label });
    setBusy(false);
    if (ok) {
      setEditing(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${tracker.label}"?`)) {
      return;
    }
    setBusy(true);
    await command('/api/commands/delete-tracking-shipment', { trackerId: tracker.trackerId });
    setBusy(false);
  }

  async function changeGroup(value: string) {
    let groupId: string | null = value === 'none' ? null : value;
    if (value === '__new__') {
      groupId = await createGroup();
      if (!groupId) {
        return;
      }
    }
    setBusy(true);
    await command('/api/commands/assign-tracker-to-group', { trackerId: tracker.trackerId, groupId });
    setBusy(false);
  }

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveLabel();
                  if (e.key === 'Escape') { setEditing(false); setDraft(tracker.label); }
                }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
              />
              <button onClick={saveLabel} disabled={busy} className="text-sm text-blue-600 hover:underline disabled:text-gray-400">Save</button>
              <button onClick={() => { setEditing(false); setDraft(tracker.label); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{tracker.label}</span>
              <button onClick={() => { setDraft(tracker.label); setEditing(true); }} className="text-xs text-blue-600 hover:underline">
                Edit
              </button>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">
            {tracker.deliveryCompanyLabel}
            {tracker.trackingNumber && <> · <span className="font-mono">{tracker.trackingNumber}</span></>}
            {tracker.source === 'email' && <> · from a forwarded email</>}
          </div>
          <a
            href={tracker.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {shortUrl(tracker.url)}
          </a>

          <ShipmentJourney tracker={tracker} />

          {!tracker.autoRefresh && (
            <div className="text-sm text-amber-700 mt-1">
              Automatic updates are not available for this site yet; check the link for status.
            </div>
          )}
          {tracker.errorMessage && (
            <div className="text-sm text-red-600 mt-1">Could not update: {tracker.errorMessage}</div>
          )}
          {tracker.refreshInProgress && (
            <div className="text-sm text-blue-700 mt-1 inline-flex items-center gap-1">
              <Spinner className="h-3 w-3" /> Checking the carrier…
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
          <select
            value={tracker.groupId ?? 'none'}
            onChange={(e) => changeGroup(e.target.value)}
            disabled={busy}
            title="Group"
            className="text-xs border border-gray-300 rounded-md px-1.5 py-1 text-gray-700 max-w-[10rem]"
          >
            <option value="none">No group</option>
            {groups.map(g => (
              <option key={g.groupId} value={g.groupId}>{g.name}</option>
            ))}
            <option value="__new__">New group…</option>
          </select>
          <button
            onClick={remove}
            disabled={busy}
            title="Delete"
            className="text-xs text-gray-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
