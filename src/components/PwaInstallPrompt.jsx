import { useState, useEffect } from 'react';
import { Download, X, Monitor } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa_install_dismissed') === 'true';
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setTimeout(() => setShow(true), 5000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-xs slide-up-fade">
      <div className="bg-card rounded-2xl shadow-2xl border border-border p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Monitor className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-sm">Instalar Aplicativo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instale o app no seu computador para receber notificações push mesmo com o navegador fechado.
          </p>
          <button
            onClick={handleInstall}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar agora
          </button>
        </div>
        <button onClick={handleDismiss} className="shrink-0 hover:bg-muted rounded-lg p-1">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}