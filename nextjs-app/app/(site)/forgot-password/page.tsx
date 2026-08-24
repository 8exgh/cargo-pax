'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <img src="/logo.svg" alt={SITE_NAME} className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
          Reset your password
        </h1>

        {sent ? (
          <div className="text-center text-gray-700 space-y-4">
            <p>
              If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
              It works once and expires in an hour.
            </p>
            <p className="text-sm text-gray-500">Check your spam folder if it does not arrive in a minute or two.</p>
            <Link href="/login" className="inline-block text-blue-600 hover:text-blue-800 hover:underline text-sm">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 mb-8">
              Enter your email and we will send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
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
              </div>

              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
              >
                {loading ? 'Please wait...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
              <Link href="/login" className="text-blue-600 hover:text-blue-800 hover:underline">
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
