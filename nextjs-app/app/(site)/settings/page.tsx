'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import type { AccountView } from '@/types/queries';
import { PushNotifications } from '@/components/PushNotifications';
import { OrganizationSettings } from '@/components/OrganizationSettings';
import { MemberSettings } from '@/components/MemberSettings';

function normalizeLocalPart(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
}

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; address: string }
  | { state: 'taken'; reason: string };

export default function Settings() {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authHeaders = useCallback((): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }), []);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/queries/account', { headers: authHeaders() });
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (response.status === 403) {
        router.push('/verify');
        return;
      }
      if (response.ok) {
        setAccount(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/');
      return;
    }
    load();
  }, [load, router]);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!editing || !identifier) {
      setAvailability({ state: 'idle' });
      return;
    }
    setAvailability({ state: 'checking' });
    checkTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/queries/mailbox-availability?localPart=${encodeURIComponent(identifier)}`, { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) {
          setAvailability({ state: 'idle' });
        } else if (data.available) {
          setAvailability({ state: 'available', address: data.address });
        } else {
          setAvailability({ state: 'taken', reason: data.reason || 'That address is taken.' });
        }
      } catch {
        setAvailability({ state: 'idle' });
      }
    }, 500);
  }, [identifier, editing, authHeaders]);

  async function takeOwnership(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/commands/assign-cargo-pax-email-identifier', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ emailIdentifier: identifier })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not change the address');
        return;
      }
      setNotice(`${data.forwardingAddress} is yours. The inbox is being set up; the old address stops working.`);
      setEditing(false);
      await load();
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/');
  }

  if (loading || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-700 inline-flex items-center gap-2"><Spinner /> Loading…</div>
      </div>
    );
  }

  const mailbox = account.mailbox;
  const domain = mailbox ? mailbox.address.split('@')[1] : 'cargopax.ca';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header email={account.you.email} organization={account.organization} role={account.you.role} onLogout={handleLogout} />
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <OrganizationSettings account={account} onChanged={load} />
        <MemberSettings account={account} onChanged={load} />

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your {domain} address</h2>
          {mailbox && !editing && account.you.role !== 'admin' && (
            <p className="text-gray-700">
              Forward shipment emails to <span className="font-mono font-medium">{mailbox.address}</span> and they
              show up for everyone here. Only an admin can change the address.
            </p>
          )}
          {mailbox && !editing && account.you.role === 'admin' && (
            <>
              <p className="text-gray-700">
                Forward your shipment emails from FedEx, UPS, Canada Post and the rest to{' '}
                <span className="font-mono font-medium">{mailbox.address}</span>
                {' '}and {`they'll`} show up on your dashboard with live updates and email notifications.
              </p>
              <button
                onClick={() => { setIdentifier(mailbox.address.split('@')[0]); setEditing(true); setNotice(''); }}
                className="text-sm bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
              >
                Pick a different @{domain} address
              </button>
            </>
          )}
          {editing && (
            <form onSubmit={takeOwnership} className="space-y-3">
              <div className="flex items-stretch max-w-md">
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(normalizeLocalPart(e.target.value))}
                  autoFocus
                  spellCheck={false}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-600 rounded-r-md text-sm">@{domain}</span>
              </div>
              <p className="text-xs min-h-[1rem]">
                {availability.state === 'checking' && <span className="text-gray-500">Checking…</span>}
                {availability.state === 'available' && <span className="text-green-700">{availability.address} is available</span>}
                {availability.state === 'taken' && <span className="text-red-600">{availability.reason}</span>}
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || availability.state !== 'available'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                >
                  {saving ? 'Saving…' : `Take ownership of ${identifier || '…'}@${domain}`}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="text-sm text-gray-600 hover:underline">
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Your current inbox is removed and a new one created; anything sent to the old address is lost.
              </p>
            </form>
          )}
          {error && <p className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
          {notice && <p className="p-3 bg-green-100 text-green-700 rounded text-sm">{notice}</p>}
        </section>

        {mailbox && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Inbox details</h2>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                  mailbox.status === 'provisioned' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {mailbox.status === 'provisioned' ? 'Ready' : mailbox.status === 'failed' ? 'Setting up (retrying)' : 'Setting up…'}
              </span>
            </div>
            {mailbox.status === 'provisioned' && mailbox.password ? (
              <div className="text-sm text-gray-700 space-y-2">
                <p className="text-gray-600">
                  {mailbox.address} is a real mailbox too: read it from any mail app.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-20 text-gray-500">Password</span>
                  <code className="font-mono bg-gray-100 px-2 py-0.5 rounded">{showPassword ? mailbox.password : '••••••••••••••••'}</code>
                  <button onClick={() => setShowPassword(v => !v)} className="text-blue-600 hover:underline text-xs">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex items-center gap-2"><span className="w-20 text-gray-500">Webmail</span>
                  <a href={mailbox.webmail} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{mailbox.webmail}</a>
                </div>
                <div className="flex items-center gap-2"><span className="w-20 text-gray-500">IMAP</span><span className="font-mono">{mailbox.imap}</span></div>
                <div className="flex items-center gap-2"><span className="w-20 text-gray-500">SMTP</span><span className="font-mono">{mailbox.smtp}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 inline-flex items-center gap-2">
                <Spinner className="h-3 w-3" /> Your inbox is being created.
              </p>
            )}
          </section>
        )}

        <PushNotifications endpoints={account.pushEndpoints} />

        <section className="bg-white rounded-lg shadow p-6 text-sm text-gray-700 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <p>
            Signed in as <span className="font-medium">{account.you.email}</span>
            {account.you.role === 'admin' ? ' (admin)' : ' (read only)'}. Shipment updates are emailed to{' '}
            <span className="font-medium">{account.email}</span>.
          </p>
          <Link href="/change-password" className="text-blue-600 hover:underline">Change password</Link>
        </section>

        <Link href="/dashboard" className="inline-block text-sm text-blue-600 hover:underline">← Back to shipments</Link>
      </div>
    </div>
  );
}
