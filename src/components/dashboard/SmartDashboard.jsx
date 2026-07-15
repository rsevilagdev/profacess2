import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { Settings2, BarChart3, TrendingUp, PieChart as PieIcon, Users, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const CHART_DEFS = [
  { id: 'hourly', label: 'Acessos por Hora', icon: BarChart3 },
  { id: 'trend', label: 'Tendência 7 Dias', icon: TrendingUp },
  { id: 'status', label: 'Status de Acessos', icon: PieIcon },
  { id: 'operators', label: 'Top Operadores', icon: Users },
];

const STATUS_COLORS = { validado: '#00695C', bloqueado: '#dc2626', pendente_revisao: '#f97316' };

export default function SmartDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCharts, setVisibleCharts] = useState(() => {
    try { const s = localStorage.getItem('dashboard_charts'); return s ? JSON.parse(s) : CHART_DEFS.map(c => c.id); }
    catch { return CHART_DEFS.map(c => c.id); }
  });
  const [showSelector, setShowSelector] = useState(false);

  const loadData = async () => {
    try {
      const l = await base44.entities.AccessLog.list('-created_date', 200);
      setLogs(l);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { localStorage.setItem('dashboard_charts', JSON.stringify(visibleCharts)); }, [visibleCharts]);
  useEffect(() => { const u = base44.entities.AccessLog.subscribe(() => loadData()); return u; }, []);

  const toggleChart = (id) => setVisibleCharts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.created_date).toDateString() === today);
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: todayLogs.filter(l => new Date(l.created_date).getHours() === h).length }));
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    return { day: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).replace('.', ''), acessos: logs.filter(l => new Date(l.created_date).toDateString() === ds).length };
  });
  const statusData = ['validado', 'bloqueado', 'pendente_revisao'].map(s => ({
    name: s === 'validado' ? 'Validado' : s === 'bloqueado' ? 'Bloqueado' : 'Pendente',
    value: logs.filter(l => l.status === s).length,
    color: STATUS_COLORS[s],
  })).filter(s => s.value > 0);
  const operatorData = Object.entries(logs.reduce((acc, l) => { const n = l.operador_nome || 'Desconhecido'; acc[n] = (acc[n] || 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name: name.split(' ')[0], count }));

  if (loading) return <p className="text-center py-8 text-sm text-muted-foreground">Carregando dashboard...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-lg">Dashboard Dinâmico</h3>
        <Button onClick={() => setShowSelector(!showSelector)} variant="outline" size="sm" className="h-9 rounded-xl">
          <Settings2 className="h-4 w-4" /> Configurar Gráficos
        </Button>
      </div>

      {showSelector && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CHART_DEFS.map(c => {
              const checked = visibleCharts.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleChart(c.id)} className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-input'}`}>
                    {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <c.icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {visibleCharts.includes('hourly') && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Acessos por Hora (Hoje)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {visibleCharts.includes('trend') && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Tendência de Acessos (7 dias)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="acessos" stroke="hsl(var(--primary))" fill="url(#trendGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {visibleCharts.includes('status') && statusData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Status de Acessos</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {visibleCharts.includes('operators') && operatorData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h4 className="font-heading font-bold text-sm mb-3">Top 5 Operadores</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={operatorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}