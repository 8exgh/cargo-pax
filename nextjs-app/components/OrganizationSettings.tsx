'use client';

import { useRef, useState } from 'react';
import { OrganizationLogo } from '@/components/OrganizationLogo';
import type { AccountView } from '@/types/queries';

/* Name and logo. Admin-only: everyone else sees what the organization is
   called, without the controls to change it. */
export function OrganizationSettings({ account, onChanged }: { account: AccountView; onChanged: () => Promise<void> }) {
  const isAdmin = account.you.role === 'admin';
  const [name, setName] = useState(account.organization.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  async function post(path: string, body?: object) {
    setError('');
    setNotice('');
    const response = await fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body ?? {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Something went wrong');
      return false;
    }
    await onChanged();
    return true;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await post('/api/commands/name-organization', { name })) {
      setNotice('Name saved.');
    }
    setBusy(false);
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('logo', file);
      const response = await fetch('/api/commands/set-organization-logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Could not upload that image');
        return;
      }
      await onChanged();
      setNotice('Logo updated.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-3">
        <OrganizationLogo
          hasLogo={account.organization.hasLogo}
          version={account.organization.logoVersion}
          name={account.organization.name}
          className="h-12 w-12 rounded object-contain border border-gray-200 bg-white"
        />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{account.organization.name}</h2>
          <p className="text-sm text-gray-500">
            {account.members.length} {account.members.length === 1 ? 'person' : 'people'} · you are {account.you.role === 'admin' ? 'an admin' : 'read only'}
          </p>
        </div>
      </div>

      {isAdmin && (
        <>
          <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={120}
              aria-label="Organization name"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={busy || !name.trim() || name === account.organization.name}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm whitespace-nowrap"
            >
              Save name
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
              disabled={busy}
              className="text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {account.organization.hasLogo && (
              <button
                onClick={() => post('/api/commands/remove-organization-logo')}
                disabled={busy}
                className="text-sm text-gray-600 hover:underline"
              >
                Remove logo
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">PNG, JPEG, WebP or GIF, up to 512 KB.</p>
        </>
      )}

      {notice && <p className="p-3 bg-green-100 text-green-700 rounded text-sm">{notice}</p>}
      {error && <p className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
    </section>
  );
}
