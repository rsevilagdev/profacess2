import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Loader2, DollarSign, Building2, Calendar, Route, ChevronDown, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import EconomicAnalysis from '@/components/monitor/EconomicAnalysis';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const FILIAL_COLORS = ['#00695C', '#2563eb', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#dc2626'];

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SupervisaoFiliais() {
  const { colaborador } = useProfarmaAuth();
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedFilialId, setSelectedFilialId] = useState(null);
  const [filialDropdownOpen, setFilialDropdownOpen] = useState(false);

  const isSupervisor = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  const loadData = async () => {
    try {
      const [f, allRecords] = await Promise.all([
        base44.entities.Filial.list().catch(() => []),
        (async () => {
          const all = []; let skip = 0;
          while (true) {
            const batch = await base44.entities.AverbacaoRecord.list('-created_date', 5000, skip);
            all.push(...batch);
            if (batch.length < 5000) break;
            skip += 5000;
          }
          return all;
        })(),
      ]);
      setFiliais(f);
      setRecords(allRecords);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const u = base44.entities.AverbacaoRecord.subscribe(() => loadData());
    const u2 = base44.entities.Filial.subscribe(() => loadData());
    return () => { u(); u2(); };
  }, []);

  if (!isSupervisor) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Acesso restrito a supervisores.</p>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Filter out aggregated 90/91 when route records exist
  let filtered = records;
  for (const pn of [90, 91]) {
    const hasRoute = filtered.some(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n === pn && String(r.prioridade || '').includes('_'); });
    if (hasRoute) filtered = filtered.filter(r => String(r.prioridade || '').trim() !== String(pn));
  }

  // Revenue by filial
  const filialRevenue = filiais.map((f, i) => ({
    name: f.codigo || f.nome.substring(0, 8),
    filialId: f.id,
    filialNome: f.nome,
    valor: filtered.filter(r => r.filial_id === f.id).reduce((acc, r) => acc + (Number(r.total_geral) || 0), 0),
    color: FILIAL_COLORS[i % FILIAL_COLORS.length],
  })).filter(f => f.valor > 0);

  // Monthly trends by filial (for line chart)
  const monthsWithData = [...new Set(filtered.map(r => r.mes).filter(Boolean))];
  const trendData = monthsWithData.map(m => {
    const point = { mes: m.substring(0, 3) };
    filialRevenue.forEach(fr => {
      point[fr.name] = filtered.filter(r => r.filial_id === fr.filialId && r.mes === m).reduce((acc, r) => acc + (Number(r.total_geral) || 0), 0);
    });
    return point;
  });

  // Top routes across all filiais
  const routeMap = {};
  filtered.forEach(r => { const p = String(r.prioridade || '').trim(); if (!p) return; if (!routeMap[p]) routeMap[p] = 0; routeMap[p] += Number(r.total_geral) || 0; });
  const topRoutesAll = Object.entries(routeMap).map(([route, valor]) => ({ route: route.includes('_') ? route.replace('_', '-') : route, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);

  // Urban vs non-urban across all
  const urbanData = [
    { name: 'Urbano (90/91)', value: filtered.filter(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n === 90 || n === 91; }).reduce((a, r) => a + (Number(r.total_geral) || 0), 0), color: '#00695C' },
    { name: 'Não Urbano', value: filtered.filter(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n !== 90 && n !== 91; }).reduce((a, r) => a + (Number(r.total_geral) || 0), 0), color: '#f97316' },
  ].filter(d => d.value > 0);

  // Summary stats
  const totalGeral = filialRevenue.reduce((acc, f) => acc + f.valor, 0);
  const bestFilial = filialRevenue.length > 0 ? filialRevenue.reduce((max, f) => f.valor > max.valor ? f : max, filialRevenue[0]) : null;
  const bestMonthData = monthsWithData.map(m => ({ mes: m, valor: filtered.filter(r => r.mes === m).reduce((acc, r) => acc + (Number(r.total_geral) || 0), 0) })).sort((a, b) => b.valor - a.valor);
  const bestMonth = bestMonthData.length > 0 ? bestMonthData[0] : null;
  const bestRoute = topRoutesAll.length > 0 ? topRoutesAll[0] : null;

  const selectedFilial = filiais.find(f => f.id === selectedFilialId);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Supervisão de Filiais</h1>
        <p className="text-sm text-muted-foreground">Análise econômica consolidada de todas as filiais em tempo real</p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
          <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum dado econômico encontrado.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0"><p className="text-sm font-bold truncate">R$ {formatCurrency(totalGeral)}</p><p className="text-[10px] text-muted-foreground">Receita total (todas filiais)</p></div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><Building2 className="h-5 w-5 text-blue-600" /></div>
              <div className="min-w-0"><p className="text-sm font-bold truncate">{bestFilial ? bestFilial.name : '—'}</p><p className="text-[10px] text-muted-foreground">Melhor filial{bestFilial ? ` · R$ ${formatCurrency(bestFilial.valor)}` : ''}</p></div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0"><Calendar className="h-5 w-5 text-orange-600" /></div>
              <div className="min-w-0"><p className="text-sm font-bold truncate">{bestMonth ? bestMonth.mes.substring(0, 3) : '—'}</p><p className="text-[10px] text-muted-foreground">Melhor mês{bestMonth ? ` · R$ ${formatCurrency(bestMonth.valor)}` : ''}</p></div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0"><Route className="h-5 w-5 text-green-600" /></div>
              <div className="min-w-0"><p className="text-sm font-bold truncate">{bestRoute ? bestRoute.route : '—'}</p><p className="text-[10px] text-muted-foreground">Rota com maior receita</p></div>
            </div>
          </div>

          {/* Comparative charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold text-sm mb-3">Receita por Filial</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filialRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {filialRevenue.map((f, i) => <Cell key={i} fill={f.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold text-sm mb-3">Tendência Mensal por Filial</h3>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {filialRevenue.map((fr, i) => (
                      <Line key={fr.name} type="monotone" dataKey={fr.name} stroke={fr.color} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-sm text-muted-foreground">Sem dados suficientes</p>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold text-sm mb-3">Top 10 Rotas — Todas Filiais</h3>
              {topRoutesAll.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topRoutesAll} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="route" tick={{ fontSize: 8 }} width={60} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                    <Bar dataKey="valor" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-sm text-muted-foreground">Sem dados</p>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold text-sm mb-3">Urbano vs Não Urbano — Consolidado</h3>
              {urbanData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={urbanData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {urbanData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-sm text-muted-foreground">Sem dados</p>
              )}
            </div>
          </div>

          {/* Per-filial drill-down */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="font-heading font-bold text-lg">Análise por Filial</h3>
              <div className="relative">
                <button
                  onClick={() => setFilialDropdownOpen(!filialDropdownOpen)}
                  className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm flex items-center justify-between gap-2 min-w-[220px]"
                >
                  <span className="truncate">{selectedFilial ? selectedFilial.nome : 'Selecione uma filial'}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${filialDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {filialDropdownOpen && (
                  <div className="absolute z-50 top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-1 max-h-64 overflow-y-auto min-w-[240px]">
                    {filiais.map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFilialId(f.id); setFilialDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left ${selectedFilialId === f.id ? 'bg-primary/5 text-primary font-medium' : ''}`}
                      >
                        {selectedFilialId === f.id && <Check className="h-3 w-3" />}
                        <span className="flex-1 truncate">{f.nome}</span>
                        <span className="text-xs text-muted-foreground">{f.codigo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedFilialId ? (
              <EconomicAnalysis filialId={selectedFilialId} filialNome={selectedFilial?.nome} />
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">Selecione uma filial para ver a análise detalhada</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}