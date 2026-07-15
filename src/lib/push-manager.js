// Push notification manager
// Handles SW registration, VAPID push subscription, permission requests, and system notification display

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

/** Convert base64url string to Uint8Array for Push API */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
 * Subscribe to the Push API and register the subscription in the backend.
 * This enables real push notifications even when the browser/app is closed
 * (Windows desktop, Android, iOS via installed PWA).
 */
export async function subscribeToPush(colaborador) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!colaborador) return;

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      // Already subscribed — ensure backend has it
      await registerSubscriptionInBackend(colaborador, existingSub);
      return;
    }

    // Get VAPID public key from backend
    const serverUrl = import.meta.env.VITE_BASE44_BACKEND_URL;
    const appId = import.meta.env.VITE_BASE44_APP_ID;
    const response = await fetch(`${serverUrl}/apps/${appId}/functions/obterVapidPublicKey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!data.publicKey) return;

    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // Subscribe to push service
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Store subscription in backend
    await registerSubscriptionInBackend(colaborador, subscription);
  } catch { /* silent */ }
}

async function registerSubscriptionInBackend(colaborador, subscription) {
  try {
    const serverUrl = import.meta.env.VITE_BASE44_BACKEND_URL;
    const appId = import.meta.env.VITE_BASE44_APP_ID;
    await fetch(`${serverUrl}/apps/${appId}/functions/registrarPushSubscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        colaborador_id: colaborador.id,
        filial_id: colaborador.filial_id || '',
        subscription: subscription.toJSON(),
      }),
    });
  } catch { /* silent */ }
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
 * Initialize push notifications: store context, register SW, request permission,
 * and subscribe to push service.
 * Called after the user accepts terms or logs in.
 */
export async function initPushNotifications(colaborador) {
  await storeUserContext(colaborador);
  await registerServiceWorker();
  const permission = await requestNotificationPermission();
  if (permission === 'granted') {
    await subscribeToPush(colaborador);
  }
}