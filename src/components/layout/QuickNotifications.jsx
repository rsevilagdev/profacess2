import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Truck, ClipboardList, ShieldAlert, FileCheck, Car, Users, X, PackageCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { formatCuritiba } from '@/lib/curitiba-time.js';

export default function QuickNotifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ tasks: 0, vehicles: 0, drivers: 0, accessLogs: 0, reviews: 0, liberacoes: 0, filaLiberacao: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { colaborador } = useProfarmaAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasks, vehicles, drivers, accessLogs, reviews, liberacoes, crdkDescarga, accessValidados] = await Promise.all([
        base44.entities.Task.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.Vehicle.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.Driver.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.AccessLog.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.ReviewRequest.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.Liberacao.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.AcessoCRDK.filter({ status: 'descarregamento' }).catch(() => []),
        base44.entities.AccessLog.filter({ status: 'validado' }).catch(() => []),
      ]);
      setData({
        tasks: tasks.length,
        vehicles: vehicles.length,
        drivers: drivers.length,
        accessLogs: accessLogs.length,
        reviews: reviews.length,
        liberacoes: liberacoes.length,
        filaLiberacao: crdkDescarga.length + accessValidados.filter(a => a.tipo !== 'saida').length,
      });

      const notifList = await base44.entities.Notification.list('-created_date', 20);
      const myNotifs = notifList.filter(n => {
        if (n.read) return false;
        if (n.target_user_id) return n.target_user_id === colaborador?.id;
        if (n.branch_id) return n.branch_id === colaborador?.filial_id;
        return false;
      });
      setNotifications(myNotifs);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const u1 = base44.entities.Task.subscribe(() => loadData());
    const u2 = base44.entities.Vehicle.subscribe(() => loadData());
    const u3 = base44.entities.Driver.subscribe(() => loadData());
    const u4 = base44.entities.AccessLog.subscribe(() => loadData());
    const u5 = base44.entities.ReviewRequest.subscribe(() => loadData());
    const u6 = base44.entities.Liberacao.subscribe(() => loadData());
    const u7 = base44.entities.AcessoCRDK.subscribe(() => loadData());
    const u8 = base44.entities.Notification.subscribe(() => loadData());
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isOperator = colaborador?.cargo === 'operador';

  const allItems = [
    { label: 'Fila de Liberação', count: data.filaLiberacao, icon: PackageCheck, path: '/acessos', color: 'text-teal-600 bg-teal-500/10' },
    { label: 'Tarefas Pendentes', count: data.tasks, icon: ClipboardList, path: '/plano-trabalho', color: 'text-blue-600 bg-blue-500/10' },
    { label: 'Veículos p/ Liberação', count: data.vehicles, icon: Truck, path: '/editar-base', color: 'text-orange-600 bg-orange-500/10' },
    { label: 'Motoristas p/ Revisão', count: data.drivers, icon: Users, path: '/editar-base', color: 'text-purple-600 bg-purple-500/10' },
    { label: 'Acessos p/ Revisão', count: data.accessLogs, icon: ShieldAlert, path: '/painel-bloqueio', color: 'text-destructive bg-destructive/10' },
    { label: 'Solicitações de Revisão', count: data.reviews, icon: FileCheck, path: '/editar-base', color: 'text-primary bg-primary/10' },
    { label: 'Liberações Pendentes', count: data.liberacoes, icon: Car, path: '/painel-bloqueio', color: 'text-amber-600 bg-amber-500/10' },
  ].filter(i => i.count > 0);

  // Operadores: apenas Fila de Liberação (sem gestão de base de dados)
  const items = isOperator ? allItems.filter(i => i.path === '/acessos') : allItems;
  const total = items.reduce((sum, i) => sum + i.count, 0) + notifications.length;

  const markAsRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {}
  };

  return (
    <div ref={ref} className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-12 w-12 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-md transition-shadow"
        aria-label="Notificações rápidas"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center pulse-teal">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-14 right-0 w-80 max-h-[70vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border p-3 fade-in">
          <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <p className="font-heading font-bold text-sm">Acessos Rápidos</p>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-muted rounded-lg p-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {!loading && notifications.length > 0 && (
            <div className="mb-3 pb-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Notificações</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors text-left"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.sender_name && <span className="text-[10px] text-muted-foreground">De: {n.sender_name}</span>}
                        <span className="text-[10px] text-muted-foreground">{formatCuritiba(n.created_date, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground text-center">Tudo em dia! Nenhum item pendente.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => { setOpen(false); navigate(item.path); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors text-left"
                  >
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    <span className="h-6 min-w-6 px-2 rounded-full bg-muted text-xs font-bold flex items-center justify-center">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}