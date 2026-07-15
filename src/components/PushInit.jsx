import { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { registerServiceWorker, requestNotificationPermission } from '@/lib/push-manager.js';

/**
 * Auto-prompts for push notification permission on first run or PWA install.
 * - Registers the service worker immediately on mount.
 * - Listens for the 'appinstalled' event (PWA install) → requests permission.
 * - On first visit (no localStorage flag), shows a visual prompt after 3s.
 * - After permission is granted, the actual push subscription happens after login
 *   (via subscribeToPush in AppLayout).
 */
export default function PushInit() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    // Register SW immediately
    registerServiceWorker();

    // Listen for PWA install event
    const onInstall = () => {
      requestNotificationPermission().then(result => {
        setPermission(result);
        localStorage.setItem('push_permission_requested', 'true');
      });
    };
    window.addEventListener('appinstalled', onInstall);

    // On first visit, show prompt after 3 seconds
    const alreadyRequested = localStorage.getItem('push_permission_requested') === 'true';
    if (!alreadyRequested && permission === 'default') {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('appinstalled', onInstall);
      };
    }

    return () => window.removeEventListener('appinstalled', onInstall);
  }, []);

  const handleAccept = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    localStorage.setItem('push_permission_requested', 'true');
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push_permission_requested', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:w-96 slide-up-fade">
      <div className="bg-card rounded-2xl shadow-2xl border border-border p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-sm">Ativar Notificações</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receba alertas em tempo real de liberações, acessos e bloqueios, mesmo com o aplicativo fechado.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg px-3 py-1.5 hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              Permitir
            </button>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg px-3 py-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}