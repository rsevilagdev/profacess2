import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function NotificationBanner() {
  const { colaborador } = useProfarmaAuth();
  const [current, setCurrent] = useState(null);

  const fetchUnread = useCallback(async () => {
    if (!colaborador) return;
    try {
      const list = await base44.entities.Notification.list('-created_date', 5);
      const unread = list.filter(n => !n.read);
      if (unread.length > 0) {
        const prefMap = {
          admin_ops: 'notification_admin_ops',
          vehicle_release: 'notification_vehicle_release',
          driver_docs: 'notification_driver_docs',
          entry_exit: 'notification_entry_exit',
        };
        const prefKey = prefMap[unread[0].type] || 'notification_admin_ops';
        if (colaborador[prefKey] !== false) {
          setCurrent(unread[0]);
        }
      }
    } catch (e) { /* silent */ }
  }, [colaborador]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const sub = base44.entities.Notification.subscribe(() => fetchUnread());
    return sub;
  }, [fetchUnread]);

  if (!current) return null;

  const dismiss = async () => {
    try { await base44.entities.Notification.update(current.id, { read: true }); } catch (e) {}
    setCurrent(null);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 slide-down w-full max-w-md px-4">
      <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{current.title}</p>
          <p className="text-xs opacity-90 mt-0.5">{current.message}</p>
        </div>
        <button onClick={dismiss} className="shrink-0 hover:bg-primary-foreground/20 rounded-lg p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}