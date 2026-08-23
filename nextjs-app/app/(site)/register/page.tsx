'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';
import { Spinner } from '@/components/Spinner';

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; address: string }
  | { state: 'taken'; reason: string };

// Mirrors lib/mailbox normalizeLocalPart so the field only ever holds what
// the server would accept.
function normalizeLocalPart(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [mailboxLocalPart, setMailboxLocalPart] = useState('');
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });
  const [mailDomain, setMailDomain] = useState('cargopax.ca');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  // Suggest an inbox name from the email's local part until the user types one
  const [mailboxTouched, setMailboxTouched] = useState(false);
  useEffect(() => {
    if (!mailboxTouched) {
      setMailboxLocalPart(normalizeLocalPart(email.split('@')[0] || ''));
    }
  }, [email, mailboxTouched]);

  // Debounced live availability check
  useEffect(() => {
    if (checkTimer.current) {
      clearTimeout(checkTimer.current);
    }
    if (!mailboxLocalPart) {
      setAvailability({ state: 'idle' });
      return;
    }
    setAvailability({ state: 'checking' });
    checkTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/queries/mailbox-availability?localPart=${encodeURIComponent(mailboxLocalPart)}`);
        if (!response.ok) {
          setAvailability({ state: 'idle' });
          return;
        }
        const data = await response.json();
        if (data.address) {
          setMailDomain(String(data.address).split('@')[1] || 'cargopax.ca');
        }
        if (data.available) {
          setAvailability({ state: 'available', address: data.address });
        } else {
          setAvailability({ state: 'taken', reason: data.reason || 'That inbox name is taken.' });
        }
      } catch {
        setAvailability({ state: 'idle' });
      }
    }, 500);
    return () => {
      if (checkTimer.current) {
        clearTimeout(checkTimer.current);
      }
    };
  }, [mailboxLocalPart]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (!mailboxLocalPart) {
      setError(`Pick a name for your @${mailDomain} address`);
      setLoading(false);
      return;
    }
    if (!organizationName.trim()) {
      setError('Give your organization a name');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, emailIdentifier: mailboxLocalPart, organizationName })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Registration failed');
        if (data.field === 'emailIdentifier') {
          setAvailability({ state: 'taken', reason: data.error });
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('pendingEmail', email);

      // The organization exists now, so its logo can go up. A failure here
      // must not cost someone their account - it is changeable in Settings.
      if (logo) {
        try {
          const body = new FormData();
          body.append('logo', logo);
          await fetch('/api/commands/set-organization-logo', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.token}` },
            body
          });
        } catch {
          /* carry on to verification */
        }
      }
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      setError(error.message || 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <img
          src="/logo.svg"
          alt={SITE_NAME}
          className="mx-auto mb-4 h-16 w-16"
        />
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Create your account
        </h1>
        <p className="text-center text-gray-600 mb-8">
          You will be the admin of a new organization, with its own @{mailDomain}
          address for forwarding shipment emails
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
              Organization name
            </label>
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              maxLength={120}
              placeholder="Acme Tools Ltd."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Everyone you add later shares this organization&apos;s shipments.
            </p>
          </div>

          <div>
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
              Logo <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500">PNG, JPEG, WebP or GIF, up to 512 KB. You can add it later instead.</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Your email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Where we send your verification code, password resets and shipment updates.
            </p>
          </div>

          <div>
            <label htmlFor="mailboxLocalPart" className="block text-sm font-medium text-gray-700 mb-1">
              Your {mailDomain} address
            </label>
            <div className="flex items-stretch">
              <input
                id="mailboxLocalPart"
                type="text"
                value={mailboxLocalPart}
                onChange={(e) => {
                  setMailboxTouched(true);
                  setMailboxLocalPart(normalizeLocalPart(e.target.value));
                }}
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="yourname"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-600 rounded-r-md text-sm">
                @{mailDomain}
              </span>
            </div>
            <p className="mt-1 text-xs min-h-[1rem]">
              {availability.state === 'checking' && (
                <span className="text-gray-500 inline-flex items-center gap-1"><Spinner className="h-3 w-3" /> Checking…</span>
              )}
              {availability.state === 'available' && (
                <span className="text-green-700">{availability.address} is available</span>
              )}
              {availability.state === 'taken' && (
                <span className="text-red-600">{availability.reason}</span>
              )}
              {availability.state === 'idle' && (
                <span className="text-gray-500">Letters, numbers, dots and dashes.</span>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              At least 8 characters with uppercase, lowercase, and a number
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || availability.state === 'taken'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {loading ? 'Please wait...' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
          <p>
            Already have an account?{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
