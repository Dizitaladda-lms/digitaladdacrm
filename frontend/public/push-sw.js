// Dizital Adda CRM - Native Mobile & Desktop Web Push Notification Worker
self.addEventListener('push', function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Dizital Adda CRM',
        body: event.data.text() || 'You have a new notification.',
      };
    }
  }

  const title = data.title || 'Dizital Adda CRM';
  const options = {
    body: data.body || 'You have a new notification from Dizital Adda.',
    icon: data.icon || '/pwa-icon-192.png',
    badge: data.badge || '/pwa-icon-192.png',
    tag: data.tag || 'dizital-crm-alert',
    renotify: false,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: data.timestamp || Date.now(),
      ...data.data,
    },
    actions: [
      { action: 'open', title: 'Open CRM' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const parsedUrl = new URL(rawUrl, self.location.origin);
  const targetUrl = parsedUrl.origin === self.location.origin
    ? parsedUrl.href
    : self.location.origin + '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return Promise.resolve(client.navigate(targetUrl))
            .then(() => client.focus())
            .catch(() => clients.openWindow(targetUrl));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil((async () => {
    try {
      const keyResponse = await fetch('/api/notifications/vapid-public-key', {
        credentials: 'include',
      });
      if (!keyResponse.ok) {
        throw new Error(`VAPID key request failed (${keyResponse.status}).`);
      }
      const keyPayload = await keyResponse.json();
      const publicKey = keyPayload?.data?.publicKey;
      if (!publicKey) throw new Error('VAPID public key is missing.');

      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const rawKey = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
      const applicationServerKey = Uint8Array.from(rawKey, (character) => character.charCodeAt(0));
      const subscription = event.newSubscription ||
        await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      const saveResponse = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: self.navigator.userAgent,
        }),
      });
      if (!saveResponse.ok) {
        throw new Error(`Push subscription sync failed (${saveResponse.status}).`);
      }
    } catch (error) {
      console.error('Push subscription renewal failed:', error);
    }
  })());
});
