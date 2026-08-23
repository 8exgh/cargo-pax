'use client';

import { useCallback, useEffect, useState } from 'react';

/* Turning on notifications for this device.
   The awkward part is Apple: web push only reaches a site that was added to
   the Home Screen, and in a Safari tab the Push API is not even defined. So
   rather than show a button that silently cannot work, iOS visitors who have
   not installed the app get the install instructions instead. */

type State =
  | { kind: 'checking' }
  | { kind: 'unsupported' }
  | { kind: 'needs-install' }       // iOS, not added to the Home Screen
  | { kind: 'server-off' }          // no VAPID key configured
  | { kind: 'blocked' }             // permission denied in the browser
  | { kind: 'off' }
  | { kind: 'on'; endpoint: string };

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS says it is a Mac
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// VAPID keys travel as base64url; the Push API wants bytes. The explicit
// ArrayBuffer keeps TypeScript's BufferSource happy under newer lib types.
function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

export function PushNotifications({ endpoints }: { endpoints: string[] }) {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const authHeaders = useCallback((): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }), []);

  const refresh = useCallback(async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      setState(isIos() && !isStandalone() ? { kind: 'needs-install' } : { kind: 'unsupported' });
      return;
    }
    if (isIos() && !isStandalone()) {
      setState({ kind: 'needs-install' });
      return;
    }

    const config = await fetch('/api/queries/push-config').then(r => r.json()).catch(() => ({ enabled: false }));
    if (!config.enabled) {
      setState({ kind: 'server-off' });
      return;
    }
    if (Notification.permission === 'denied') {
      setState({ kind: 'blocked' });
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const existing = registration ? await registration.pushManager.getSubscription() : null;
    // Only "on" if the server also knows about this device
    setState(existing && endpoints.includes(existing.endpoint) ? { kind: 'on', endpoint: existing.endpoint } : { kind: 'off' });
  }, [endpoints]);

  useEffect(() => {
    refresh().catch(() => setState({ kind: 'unsupported' }));
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Must be called from the click, or Safari refuses
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState({ kind: 'blocked' });
        return;
      }

      const { publicKey } = await fetch('/api/queries/push-config').then(r => r.json());
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(publicKey)
      });

      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const response = await fetch('/api/commands/register-push-subscription', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth })
      });
      if (!response.ok) {
        setError((await response.json().catch(() => ({}))).error || 'Could not save the subscription');
        return;
      }

      setState({ kind: 'on', endpoint: subscription.endpoint });
      setNotice('Notifications are on for this device.');
    } catch (error: any) {
      setError(error?.message || 'Could not turn notifications on');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        await fetch('/api/commands/remove-push-subscription', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setState({ kind: 'off' });
      setNotice('Notifications are off for this device.');
    } catch (error: any) {
      setError(error?.message || 'Could not turn notifications off');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/commands/send-test-push', { method: 'POST', headers: authHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'The test notification could not be sent');
        return;
      }
      setNotice(`Sent to ${data.sent} device${data.sent === 1 ? '' : 's'} — it should appear in a moment.`);
    } catch (error: any) {
      setError(error?.message || 'The test notification could not be sent');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Notifications on this device</h2>

      {state.kind === 'checking' && <p className="text-sm text-gray-500">Checking…</p>}

      {state.kind === 'needs-install' && (
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            On iPhone and iPad, notifications only work once CargoPax is on your Home Screen —
            Apple does not allow them from a Safari tab.
          </p>
          <ol className="list-decimal list-inside text-gray-600 space-y-1">
            <li>Tap the Share button in Safari</li>
            <li>Choose <span className="font-medium">Add to Home Screen</span></li>
            <li>Open CargoPax from the new icon, then come back here</li>
          </ol>
        </div>
      )}

      {state.kind === 'unsupported' && (
        <p className="text-sm text-gray-600">This browser cannot show notifications. Shipment updates still arrive by email.</p>
      )}

      {state.kind === 'server-off' && (
        <p className="text-sm text-gray-600">Notifications are not enabled on this server yet.</p>
      )}

      {state.kind === 'blocked' && (
        <p className="text-sm text-amber-700">
          Notifications are blocked for this site in your browser settings. Allow them there, then reload this page.
        </p>
      )}

      {state.kind === 'off' && (
        <>
          <p className="text-sm text-gray-600">
            Get a notification the moment a package moves, instead of waiting for the email.
          </p>
          <button
            onClick={enable}
            disabled={busy}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
          >
            {busy ? 'Please wait…' : 'Turn on notifications'}
          </button>
        </>
      )}

      {state.kind === 'on' && (
        <>
          <p className="text-sm text-green-700">Notifications are on for this device.</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={test}
              disabled={busy}
              className="bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:bg-gray-300 text-sm"
            >
              Send a test notification
            </button>
            <button onClick={disable} disabled={busy} className="text-sm text-gray-600 hover:underline">
              Turn off
            </button>
          </div>
        </>
      )}

      {notice && <p className="p-3 bg-green-100 text-green-700 rounded text-sm">{notice}</p>}
      {error && <p className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
    </section>
  );
}
