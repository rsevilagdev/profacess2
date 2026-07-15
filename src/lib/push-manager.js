// Push notification manager
// Handles SW registration, permission requests, and system notification display

const DB_NAME = 'profarma_sw';
const STORE = 'config';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function setConfig(key, value) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, value });
  } catch { /* silent */ }
}

/**
 * Store user context in IndexedDB so the service worker can
 * fetch pending notifications even when the app is closed.
 */
export async function storeUserContext(colaborador) {
  if (!colaborador) return;
  const serverUrl = import.meta.env.VITE_BASE44_BACKEND_URL;
  const appId = import.meta.env.VITE_BASE44_APP_ID;
  await setConfig('context', {
    serverUrl,
    appId,
    colaborador_id: colaborador.id,
    filial_id: colaborador.filial_id || '',
    nome: colaborador.nome || '',
  });
}

/**
 * Request notification permission from the browser.
 * Returns 'granted', 'denied', 'default', or 'unsupported'.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

/**
 * Register the service worker and periodic sync (Chrome/Edge/Android only).
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Register periodic background sync if supported
    if ('periodicSync' in reg) {
      try {
        await reg.periodicSync.register('check-notifications', {
          minInterval: 24 * 60 * 60 * 1000, // 24 hours minimum
        });
      } catch { /* periodic sync not supported or permission denied */ }
    }
    return reg;
  } catch {
    return null;
  }
}

/**
 * Show a system notification (used when the app tab is in the background).
 * Auto-closes after 5 seconds.
 */
export async function showSystemNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(title, {
      body: body || '',
      tag: tag || `notif-${Date.now()}`,
      requireInteraction: false,
      silent: false,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    // Auto-close after 5 seconds
    setTimeout(() => { try { notif.close(); } catch { /* silent */ } }, 5000);
  } catch { /* silent */ }
}

/**
 * Initialize push notifications: store context, register SW, request permission.
 * Called after the user accepts terms or logs in.
 */
export async function initPushNotifications(colaborador) {
  await storeUserContext(colaborador);
  await registerServiceWorker();
  await requestNotificationPermission();
}