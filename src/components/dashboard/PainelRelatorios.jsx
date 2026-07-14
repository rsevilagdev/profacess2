import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Building2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
];

export default function PainelRelatorios() {
  const [logs, setLogs] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    Promise.all([
      base44.entities.AccessLog.list('-created_date', 500).catch(() => []),
      base44.entities.Filial.list().catch(() => []),
    ]).then(([l, f]) => {
      setLogs(l);
      setFiliais(f);
      setLoading(false);
    });
  }, []);

  const periodStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d;
  }, [period]);

  const periodLogs = useMemo(
    () => logs.filter(l => new Date(l.created_date) >= periodStart),
    [logs, periodStart]
  );

  // Liberações por filial (status liberado)
  const branchData = useMemo(() => {
    const map = {};
    filiais.forEach(f => { map[f.nome] = { filial: f.nome, liberado: 0, bloqueado: 0, total: 0 }; });
    periodLogs.forEach(l => {
      const name = l.filial_nome || 'Sem filial';
      if (!map[name]) map[name] = { filial: name, liberado: 0, bloqueado: 0, total: 0 };
      map[name].total++;
      if (l.status === 'liberado') map[name].liberado++;
      else if (l.status === 'bloqueado') map[name].bloqueado++;
    });
    return Object.values(map).filter(b => b.total > 0).sort((a, b) => b.total - a.total);
  }, [periodLogs, filiais]);

  // Liberações por dia no período
  const flowData = useMemo(() => {
    const days = {};
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: period <= 7 ? 'short' : '2-digit' });
      days[key] = { dia: key, liberado: 0, bloqueado: 0 };
    }
    periodLogs.forEach(l => {
      const key = new Date(l.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: period <= 7 ? 'short' : '2-digit' });
      if (days[key]) {
        if (l.status === 'liberado') days[key].liberado++;
        else if (l.status === 'bloqueado') days[key].bloqueado++;
      }
    });
    return Object.values(days);
  }, [periodLogs, period]);

  const totalLiberado = periodLogs.filter(l => l.status === 'liberado').length;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <p className="text-sm text-muted-foreground text-center py-8">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Header + period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-heading font-bold text-lg leading-tight">Painel de Liberações</h2>
            <p className="text-xs text-muted-foreground">{totalLiberado} liberações no período</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === opt.value ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liberações por período */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Volume de Liberações por Período ({period} dias)
        </h3>
        {flowData.every(d => d.liberado === 0 && d.bloqueado === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma liberação no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={flowData}>
              <defs>
                <linearGradient id="gradLib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(173 100% 21%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(173 100% 21%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="gradBloq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 62% 50%)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(0 62% 50%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(period / 8))} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="liberado" name="Liberado" stroke="hsl(173 100% 21%)" fill="url(#gradLib)" strokeWidth={2} />
              <Area type="monotone" dataKey="bloqueado" name="Bloqueado" stroke="hsl(0 62% 50%)" fill="url(#gradBloq)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Liberações por filial */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Volume de Liberações por Filial
        </h3>
        {branchData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma liberação por filial no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, branchData.length * 50)}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="filial" tick={{ fontSize: 11 }} width={110} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="liberado" name="Liberado" stackId="a" fill="hsl(173 100% 21%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bloqueado" name="Bloqueado" stackId="a" fill="hsl(0 62% 50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}