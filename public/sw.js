self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ÖSYM Aday İşlemleri Alarmı', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'ÖSYM Aday İşlemleri Alarmı';
  const options = {
    body: data.body || 'Uygulama güncellendi.',
    data: { url: data.url || 'https://ais.osym.gov.tr' },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'https://ais.osym.gov.tr';
  event.waitUntil(clients.openWindow(url));
});
