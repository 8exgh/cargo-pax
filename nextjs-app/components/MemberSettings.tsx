'use client';

import { useState } from 'react';
import type { AccountView } from '@/types/queries';

/* Who is in the organization, and what they may do. New people are read
   only: they see every shipment and can ask for a fresh check, which is the
   part everyone actually wants, without being able to change what is
   tracked or who is here. */
export function MemberSettings({ account, onChanged }: { account: AccountView; onChanged: () => Promise<void> }) {
  const isAdmin = account.you.role === 'admin';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  async function post(path: string, body: object): Promise<boolean> {
    setError('');
    setNotice('');
    const response = await fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Something went wrong');
      return false;
    }
    await onChanged();
    return true;
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await post('/api/commands/invite-member', { email: email.trim(), role })) {
      setNotice(`${email.trim()} has been added and emailed a password to sign in with.`);
      setEmail('');
      setRole('member');
    }
    setBusy(false);
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">People</h2>

      <ul className="divide-y divide-gray-100">
        {account.members.map(member => (
          <li key={member.userId} className="py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <span className="text-gray-900">{member.email}</span>
              {member.isYou && <span className="ml-2 text-xs text-gray-500">you</span>}
              <div className="text-xs text-gray-500">
                {member.role === 'admin' ? 'Admin — full control' : 'Read only — can view and refresh'}
              </div>
            </div>

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={async e => {
                    setBusy(true);
                    await post('/api/commands/change-member-role', { userId: member.userId, role: e.target.value });
                    setBusy(false);
                  }}
                  disabled={busy}
                  aria-label={`Role for ${member.email}`}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-700"
                >
                  <option value="member">Read only</option>
                  <option value="admin">Admin</option>
                </select>
                {!member.isYou && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${member.email} from ${account.organization.name}?`)) return;
                      setBusy(true);
                      await post('/api/commands/remove-member', { userId: member.userId });
                      setBusy(false);
                    }}
                    disabled={busy}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">{member.role === 'admin' ? 'Admin' : 'Read only'}</span>
            )}
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="their@email.com"
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'member' | 'admin')}
            aria-label="Role for the new person"
            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
          >
            <option value="member">Read only</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm whitespace-nowrap"
          >
            {busy ? 'Adding…' : 'Add person'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
          Only an admin can add people or change what someone may do.
        </p>
      )}

      {notice && <p className="p-3 bg-green-100 text-green-700 rounded text-sm">{notice}</p>}
      {error && <p className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
    </section>
  );
}
