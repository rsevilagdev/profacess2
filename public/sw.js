// Service Worker - PROFARMA LIBERAAUTO PRO
// Handles push notifications, periodic sync, and notification clicks
// Notifications auto-close after 5 seconds

const NOTIFICATION_DURATION = 5000;
const DB_NAME = 'profarma_sw';
const DB_VERSION = 1;

// ─── IndexedDB helpers ───
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('shown')) db.createObjectStore('shown', { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getConfig() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const req = tx.objectStore('config').get('context');
      req.onsuccess = (e) => resolve(e.target.result?.value || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function getShownIds() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('shown', 'readonly');
      const req = tx.objectStore('shown').getAll();
      req.onsuccess = (e) => resolve(new Set(e.target.result.map(r => r.id)));
      req.onerror = () => resolve(new Set());
    });
  } catch { return new Set(); }
}

async function addShownId(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('shown', 'readwrite');
    tx.objectStore('shown').put({ id, ts: Date.now() });
    // Clean old entries (older than 7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const store = tx.objectStore('shown');
    store.getAll().onsuccess = (e) => {
      e.target.result.forEach(r => { if (r.ts < cutoff) store.delete(r.id); });
    };
  } catch { /* silent */ }
}

// ─── Show notification + auto-close after 5s ───
async function showSystemNotification(title, options = {}) {
  const reg = await self.registration;
  const tag = options.tag || `notif-${Date.now()}`;
  await reg.showNotification(title, {
    body: options.body || '',
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/icon-192.png',
    tag,
    requireInteraction: false,
    data: options.data || {},
  });
  // Auto-close after 5 seconds
  setTimeout(async () => {
    try {
      const notifications = await reg.getNotifications({ tag });
      notifications.forEach(n => n.close());
    } catch { /* silent */ }
  }, NOTIFICATION_DURATION);
}

// ─── Push event (for future push server integration) ───
self.addEventListener('push', (event) => {
  let data = { title: 'PROFARMA LIBERAAUTO PRO', message: 'Nova notificação' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data = { title: 'PROFARMA LIBERAAUTO PRO', message: event.data.text() };
  }
  event.waitUntil(
    showSystemNotification(data.title || 'PROFARMA LIBERAAUTO PRO', {
      body: data.message || '',
      tag: data.id || undefined,
      data: { url: data.url || '/' },
    })
  );
});

// ─── Notification click - focus or open app ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ─── Periodic sync - check for pending notifications (Chrome/Edge/Android) ───
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkPendingNotifications());
  }
});

async function checkPendingNotifications() {
  const config = await getConfig();
  if (!config || !config.serverUrl || !config.appId || !config.colaborador_id) return;

  const shownIds = await getShownIds();

  try {
    const response = await fetch(`${config.serverUrl}/apps/${config.appId}/functions/buscarNotificacoesPendentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        colaborador_id: config.colaborador_id,
        filial_id: config.filial_id || '',
      }),
    });
    if (!response.ok) return;
    const result = await response.json();
    const notifications = result.notifications || [];

    for (const n of notifications) {
      if (shownIds.has(n.id)) continue;
      await showSystemNotification(n.title || 'PROFARMA LIBERAAUTO PRO', {
        body: n.message || '',
        tag: n.id,
        data: { url: '/' },
      });
      await addShownId(n.id);
    }
  } catch { /* silent */ }
}

// ─── Lifecycle ───
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(clients.claim()); });
