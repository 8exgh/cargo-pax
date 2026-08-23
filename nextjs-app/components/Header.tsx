import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export function Header({ email, onLogout }: { email: string | null; onLogout?: () => void }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-3xl mx-auto flex justify-between items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold text-gray-900">{SITE_NAME}</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {email && <span className="text-gray-600 hidden sm:inline">{email}</span>}
          <Link href="/settings" className="text-blue-600 hover:text-blue-800 hover:underline">
            Settings
          </Link>
          {onLogout && (
            <button onClick={onLogout} className="bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-700">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
