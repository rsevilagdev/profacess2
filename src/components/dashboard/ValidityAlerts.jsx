import { useState, useEffect } from 'react';
import { AlertTriangle, Truck, Users, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCuritiba } from '@/lib/curitiba-time.js';

export default function ValidityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  const loadAlerts = async () => {
    try {
      const [vehicles, drivers] = await Promise.all([
        base44.entities.Vehicle.list().catch(() => []),
        base44.entities.Driver.list().catch(() => []),
      ]);

      const now = new Date();
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const vAlerts = vehicles
        .filter(v => v.data_validade && v.status === 'validado')
        .filter(v => {
          const validade = new Date(v.data_validade);
          return validade <= oneWeek;
        })
        .map(v => ({
          id: `v_${v.id}`,
          type: 'Veículo',
          identifier: v.placa,
          validade: v.data_validade,
          expired: new Date(v.data_validade) < now,
        }));

      const dAlerts = drivers
        .filter(d => d.data_validade && d.status === 'validado')
        .filter(d => {
          const validade = new Date(d.data_validade);
          return validade <= oneWeek;
        })
        .map(d => ({
          id: `d_${d.id}`,
          type: 'Motorista',
          identifier: d.nome,
          validade: d.data_validade,
          expired: new Date(d.data_validade) < now,
        }));

      setAlerts([...vAlerts, ...dAlerts]);
    } catch (e) {}
  };

  useEffect(() => { loadAlerts(); }, []);

  useEffect(() => {
    const u1 = base44.entities.Vehicle.subscribe(() => loadAlerts());
    const u2 = base44.entities.Driver.subscribe(() => loadAlerts());
    return () => { u1(); u2(); };
  }, []);

  if (dismissed || alerts.length === 0) return null;

  const expiredCount = alerts.filter(a => a.expired).length;
  const soonCount = alerts.length - expiredCount;

  return (
    <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-4 fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center pulse-teal">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-orange-700">Alertas de Validade — Vencimento Próximo</h2>
            <p className="text-xs text-orange-600">
              {expiredCount > 0 && `${expiredCount} vencido(s)`}
              {expiredCount > 0 && soonCount > 0 && ' · '}
              {soonCount > 0 && `${soonCount} vence(m) em até 7 dias`}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="h-8 w-8 rounded-lg hover:bg-orange-500/10 flex items-center justify-center">
          <X className="h-4 w-4 text-orange-600" />
        </button>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {alerts.map(a => (
          <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${a.expired ? 'bg-destructive/10 border border-destructive/20' : 'bg-orange-500/5 border border-orange-500/10'}`}>
            {a.type === 'Veículo' ? <Truck className="h-4 w-4 text-orange-600 shrink-0" /> : <Users className="h-4 w-4 text-orange-600 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.identifier}</p>
              <p className="text-xs text-muted-foreground">{a.type}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-bold ${a.expired ? 'text-destructive' : 'text-orange-600'}`}>
                {a.expired ? 'Vencido' : 'Vence em breve'}
              </p>
              <p className="text-xs text-muted-foreground">{formatCuritiba(a.validade, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}