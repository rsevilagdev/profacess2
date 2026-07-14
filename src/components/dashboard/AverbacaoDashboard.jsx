import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Loader2, Settings2, Check, DollarSign, Calendar, Route } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const CHART_DEFS = [
  { id: 'monthly', label: 'Valores por Mês' },
  { id: 'topRoutes', label: 'Top Rotas' },
  { id: 'daily', label: 'Tendência Diária' },
  { id: 'urban', label: 'Urbano vs Não Urbano' },
];

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AverbacaoDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState('');
  const [visibleCharts, setVisibleCharts] = useState(() => {
    try { const s = localStorage.getItem('averbacao_dash_charts'); return s ? JSON.parse(s) : CHART_DEFS.map(c => c.id); }
    catch { return CHART_DEFS.map(c => c.id); }
  });
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => { localStorage.setItem('averbacao_dash_charts', JSON.stringify(visibleCharts)); }, [visibleCharts]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = []; let skip = 0;
      while (true) {
        const batch = await base44.entities.AverbacaoRecord.list('-created_date', 5000, skip);
        all.push(...batch);
        if (batch.length < 5000) break;
        skip += 5000;
      }
      setRecords(all);
    } catch (e) {}
    setLoading(false);
  };

  const toggleChart = (id) => setVisibleCharts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  let filtered = records;
  for (const pn of [90, 91]) {
    const hasRoute = filtered.some(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n === pn && String(r.prioridade || '').includes('_'); });
    if (hasRoute) filtered = filtered.filter(r => String(r.prioridade || '').trim() !== String(pn));
  }

  const monthlyData = MESES.map(m => ({
    mes: m.substring(0, 3),
    valor: filtered.filter(r => r.mes === m).reduce((acc, r) => acc + (Number(r.total_geral) || 0), 0),
  })).filter(d => d.valor > 0);

  const routeMap = {};
  filtered.forEach(r => { const p = String(r.prioridade || '').trim(); if (!p) return; if (!routeMap[p]) routeMap[p] = 0; routeMap[p] += Number(r.total_geral) || 0; });
  const topRoutes = Object.entries(routeMap).map(([route, valor]) => ({ route: route.includes('_') ? route.replace('_', '-') : route, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);

  const dailyData = (() => {
    if (!selectedMes) return [];
    const monthRecords = filtered.filter(r => r.mes === selectedMes);
    const days = {};
    monthRecords.forEach(r => { const dia = parseInt(r.dia) || 0; if (dia > 0) { if (!days[dia]) days[dia] = 0; days[dia] += Number(r.total_geral) || 0; } });
    return Object.entries(days).map(([dia, valor]) => ({ dia: `D${dia}`, valor })).sort((a, b) => parseInt(a.dia.substring(1)) - parseInt(b.dia.substring(1)));
  })();

  const urbanData = [
    { name: 'Urbano (90/91)', value: filtered.filter(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n === 90 || n === 91; }).reduce((a, r) => a + (Number(r.total_geral) || 0), 0), color: '#00695C' },
    { name: 'Não Urbano', value: filtered.filter(r => { const n = parseInt(String(r.prioridade || '')) || 0; return n !== 90 && n !== 91; }).reduce((a, r) => a + (Number(r.total_geral) || 0), 0), color: '#f97316' },
  ].filter(d => d.value > 0);

  const totalGeral = filtered.reduce((acc, r) => acc + (Number(r.total_geral) || 0), 0);
  const bestMonth = monthlyData.length > 0 ? monthlyData.reduce((max, d) => d.valor > max.valor ? d : max, monthlyData[0]) : null;
  const bestRoute = topRoutes.length > 0 ? topRoutes[0] : null;
  const meses = [...new Set(filtered.map(r => r.mes).filter(Boolean))];

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  if (records.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-heading font-bold text-lg">Dashboard de Averbação</h3>
        <Button onClick={() => setShowSelector(!showSelector)} variant="outline" size="sm" className="h-9 rounded-xl">
          <Settings2 className="h-4 w-4" /> Configurar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-lg font-bold truncate">R$ {formatCurrency(totalGeral)}</p><p className="text-xs text-muted-foreground">Total Geral</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><Calendar className="h-5 w-5 text-blue-600" /></div>
          <div className="min-w-0"><p className="text-lg font-bold truncate">{bestMonth ? bestMonth.mes : '—'}</p><p className="text-xs text-muted-foreground">Melhor Mês{bestMonth ? ` · R$ ${formatCurrency(bestMonth.valor)}` : ''}</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0"><Route className="h-5 w-5 text-orange-600" /></div>
          <div className="min-w-0"><p className="text-lg font-bold truncate">{bestRoute ? bestRoute.route : '—'}</p><p className="text-xs text-muted-foreground">Rota com Maior Receita</p></div>
        </div>
      </div>

      {showSelector && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CHART_DEFS.map(c => {
              const checked = visibleCharts.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleChart(c.id)} className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-input'}`}>{checked && <Check className="h-3 w-3 text-primary-foreground" />}</div>
                  <span className="text-xs">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {visibleCharts.includes('monthly') && monthlyData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Valores por Mês</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {visibleCharts.includes('topRoutes') && topRoutes.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Top 10 Rotas por Receita</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topRoutes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 8 }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                <Bar dataKey="valor" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {visibleCharts.includes('daily') && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-sm">Tendência Diária</h4>
              <select value={selectedMes} onChange={e => setSelectedMes(e.target.value)} className="h-8 px-2 rounded-lg border border-input bg-transparent text-xs">
                <option value="">Selecione um mês</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
                  <Bar dataKey="valor" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-xs text-muted-foreground">{selectedMes ? 'Nenhum dado para este mês' : 'Selecione um mês para ver a tendência diária'}</p>
            )}
          </div>
        )}

        {visibleCharts.includes('urban') && urbanData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Urbano vs Não Urbano</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={urbanData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {urbanData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v) => `R$ ${formatCurrency(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}