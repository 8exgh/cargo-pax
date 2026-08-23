'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    const stored = localStorage.getItem('pendingEmail');
    setEmail(fromQuery || stored || '');
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not verify');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.removeItem('pendingEmail');
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'An error occurred');
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not resend');
        return;
      }
      setNotice('A new code is on its way.');
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
          placeholder="6 digits"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono tracking-widest"
        />
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {notice && <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{notice}</div>}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
      >
        {loading ? 'Please wait...' : 'Verify'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Did not get it?{' '}
        <button type="button" onClick={resend} className="text-blue-600 hover:text-blue-800 hover:underline">
          Send a new code
        </button>
      </p>
    </form>
  );
}

export default function Verify() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <img src="/logo.svg" alt={SITE_NAME} className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">Check your email</h1>
        <p className="text-center text-gray-600 mb-6">
          We sent a 6-digit code to confirm it is really you.
        </p>
        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <VerifyForm />
        </Suspense>
        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
          <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
