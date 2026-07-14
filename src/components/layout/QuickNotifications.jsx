import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Truck, ClipboardList, ShieldAlert, FileCheck, Car, Users, X, PackageCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function QuickNotifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ tasks: 0, vehicles: 0, drivers: 0, accessLogs: 0, reviews: 0, liberacoes: 0, filaLiberacao: 0 });
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { colaborador } = useProfarmaAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasks, vehicles, drivers, accessLogs, reviews, liberacoes, filaLiberacao] = await Promise.all([
        base44.entities.Task.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.Vehicle.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.Driver.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.AccessLog.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.ReviewRequest.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.Liberacao.filter({ status: 'pendente' }).catch(() => []),
        base44.entities.AcessoCRDK.filter({ status: 'descarregamento' }).catch(() => []),
      ]);
      setData({
        tasks: tasks.length,
        vehicles: vehicles.length,
        drivers: drivers.length,
        accessLogs: accessLogs.length,
        reviews: reviews.length,
        liberacoes: liberacoes.length,
        filaLiberacao: filaLiberacao.length,
      });
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
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = data.tasks + data.vehicles + data.drivers + data.accessLogs + data.reviews + data.liberacoes + data.filaLiberacao;

  const items = [
    { label: 'Fila de Liberação', count: data.filaLiberacao, icon: PackageCheck, path: '/acesso-crdk', color: 'text-teal-600 bg-teal-500/10' },
    { label: 'Tarefas Pendentes', count: data.tasks, icon: ClipboardList, path: '/plano-trabalho', color: 'text-blue-600 bg-blue-500/10' },
    { label: 'Veículos p/ Liberação', count: data.vehicles, icon: Truck, path: '/editar-base', color: 'text-orange-600 bg-orange-500/10' },
    { label: 'Motoristas p/ Revisão', count: data.drivers, icon: Users, path: '/editar-base', color: 'text-purple-600 bg-purple-500/10' },
    { label: 'Acessos p/ Revisão', count: data.accessLogs, icon: ShieldAlert, path: '/painel-bloqueio', color: 'text-destructive bg-destructive/10' },
    { label: 'Solicitações de Revisão', count: data.reviews, icon: FileCheck, path: '/editar-base', color: 'text-primary bg-primary/10' },
    { label: 'Liberações Pendentes', count: data.liberacoes, icon: Car, path: '/painel-bloqueio', color: 'text-amber-600 bg-amber-500/10' },
  ].filter(i => i.count > 0);

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

          {loading ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
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