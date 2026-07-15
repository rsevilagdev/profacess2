import { useState, useEffect } from 'react';
import { IdCard, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCuritiba } from '@/lib/curitiba-time.js';

const WARNING_DAYS = 30;

export default function CnhExpiryAlert() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const loadAlerts = async () => {
    try {
      const drivers = await base44.entities.Driver.list('-created_date', 500).catch(() => []);
      const now = new Date();
      const warningThreshold = new Date(now.getTime() + WARNING_DAYS * 24 * 60 * 60 * 1000);

      const cnhAlerts = drivers
        .filter(d => d.cnh_validade)
        .map(d => {
          const validade = new Date(d.cnh_validade + 'T23:59:59');
          const diffMs = validade - now;
          const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          return {
            id: d.id,
            nome: d.nome,
            cnh: d.cnh,
            validade: d.cnh_validade,
            expired: diffDays < 0,
            daysLeft: diffDays,
          };
        })
        .filter(a => a.expired || a.daysLeft <= WARNING_DAYS)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setAlerts(cnhAlerts);
    } catch (e) {}
  };

  useEffect(() => { loadAlerts(); }, []);

  useEffect(() => {
    const unsub = base44.entities.Driver.subscribe(() => loadAlerts());
    return unsub;
  }, []);

  if (dismissed || alerts.length === 0) return null;

  const expiredCount = alerts.filter(a => a.expired).length;
  const soonCount = alerts.length - expiredCount;

  return (
    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${expiredCount > 0 ? 'bg-red-500/20' : 'bg-orange-500/20'} pulse-teal`}>
            <IdCard className={`h-5 w-5 ${expiredCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-red-700">Alerta de Vencimento de CNH</h2>
            <p className="text-xs text-red-600">
              {expiredCount > 0 && `${expiredCount} CNH vencida(s)`}
              {expiredCount > 0 && soonCount > 0 && ' · '}
              {soonCount > 0 && `${soonCount} vence(m) em até ${WARNING_DAYS} dias`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="h-8 w-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center">
            {expanded ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
          </button>
          <button onClick={() => setDismissed(true)} className="h-8 w-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center">
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {alerts.map(a => (
            <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${a.expired ? 'bg-destructive/10 border border-destructive/20' : 'bg-orange-500/5 border border-orange-500/10'}`}>
              <AlertTriangle className={`h-4 w-4 shrink-0 ${a.expired ? 'text-destructive' : 'text-orange-600'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.nome}</p>
                <p className="text-xs text-muted-foreground">CNH: {a.cnh ? a.cnh.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.***.$3**') : '—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-bold ${a.expired ? 'text-destructive' : 'text-orange-600'}`}>
                  {a.expired ? 'Vencida' : `${a.daysLeft} dia(s)`}
                </p>
                <p className="text-xs text-muted-foreground">{formatCuritiba(a.validade, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}