/// <reference lib="webworker" />

self.addEventListener('push', (e) => {
  const event = e as PushEvent;
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/admin/payments' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  const event = e as NotificationEvent;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const url = event.notification.data?.url ?? '/admin/payments';
      const match = clients.find((c) => c.url.includes(url));
      if (match) return match.focus();
      return self.clients.openWindow(url);
    }),
  );
});
