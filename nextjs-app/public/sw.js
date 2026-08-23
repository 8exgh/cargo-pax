/* CargoPax service worker: it exists for push notifications.
   No offline caching - the dashboard is live data and a stale cache would
   show people the wrong delivery date. */

self.addEventListener('install', event => {
  // Take over immediately so a freshly installed app can receive push
  // without the user reopening it.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'CargoPax', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CargoPax';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Same tracker replaces its previous notification instead of stacking
    tag: payload.tag || 'cargopax',
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() =>
      // Tell any open tab so it can refresh itself: seeing the notification
      // and a stale dashboard behind it would be silly.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          client.postMessage({ type: 'cargopax-push', tag: options.tag });
        }
      })
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus the app if it is already open, rather than opening a second copy
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
