import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { showSystemNotification } from '@/lib/push-manager.js';

export default function NotificationBanner() {
  const { colaborador } = useProfarmaAuth();
  const [current, setCurrent] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [seenIds, setSeenIds] = useState(new Set());
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const markRead = useCallback(async (id) => {
    try { await base44.entities.Notification.update(id, { read: true }); } catch { /* silent */ }
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!colaborador) return;
    try {
      const list = await base44.entities.Notification.list('-created_date', 10);
      const mine = list.filter(n => {
        if (n.read) return false;
        if (seenIds.has(n.id)) return false;
        if (n.target_user_id) return n.target_user_id === colaborador.id;
        if (n.branch_id) return n.branch_id === colaborador.filial_id;
        return false;
      });
      if (mine.length > 0) {
        const prefMap = {
          admin_ops: 'notification_admin_ops',
          vehicle_release: 'notification_vehicle_release',
          driver_docs: 'notification_driver_docs',
          entry_exit: 'notification_entry_exit',
        };
        const n = mine[0];
        const prefKey = prefMap[n.type] || 'notification_admin_ops';
        if (colaborador[prefKey] !== false) {
          // App in background → system push notification (5s auto-close)
          if (document.hidden) {
            showSystemNotification(
              n.title || 'PROFARMA LIBERAAUTO PRO',
              n.message || '',
              n.id
            );
            await markRead(n.id);
            setSeenIds(prev => new Set([...prev, n.id]));
          } else {
            // App in foreground → in-app sliding popup (5s)
            setCurrent(n);
          }
        }
      }
    } catch { /* silent */ }
  }, [colaborador, seenIds, markRead]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const sub = base44.entities.Notification.subscribe(() => fetchUnread());
    return sub;
  }, [fetchUnread]);

  // Re-check when user returns to the app
  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) fetchUnread(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchUnread]);

  // Auto-hide after 5 seconds + slide-out exit
  useEffect(() => {
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExiting(true);
      exitTimerRef.current = setTimeout(() => {
        markRead(current.id);
        setSeenIds(prev => new Set([...prev, current.id]));
        setCurrent(null);
        setExiting(false);
      }, 300);
    }, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [current, markRead]);

  if (!current) return null;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      markRead(current.id);
      setSeenIds(prev => new Set([...prev, current.id]));
      setCurrent(null);
      setExiting(false);
    }, 300);
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-[55] flex justify-center px-4 pt-2 ${exiting ? 'slide-to-top' : 'slide-from-top'}`}>
      <div className="w-full max-w-md bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{current.title}</p>
          <p className="text-xs opacity-90 mt-0.5">{current.message}</p>
          {current.sender_name && <p className="text-[10px] opacity-70 mt-1">De: {current.sender_name}</p>}
        </div>
        <button onClick={dismiss} className="shrink-0 hover:bg-primary-foreground/20 rounded-lg p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}