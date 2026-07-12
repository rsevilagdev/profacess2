import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, Percent } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Relatorios() {
  const [logs, setLogs] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AccessLog.list('-created_date', 200).catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Driver.list().catch(() => []),
    ]).then(([l, v, m]) => { setLogs(l); setVeiculos(v); setMotoristas(m); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando relatórios...</div>;

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.created_date).toDateString() === today);
  const weekLogs = logs.filter(l => {
    const d = new Date(l.created_date);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  // Flow by day (last 7 days)
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days[d.toLocaleDateString('pt-BR', { weekday: 'short' })] = 0;
  }
  weekLogs.forEach(l => {
    const d = new Date(l.created_date).toLocaleDateString('pt-BR', { weekday: 'short' });
    if (days[d] !== undefined) days[d]++;
  });
  const flowData = Object.entries(days).map(([day, count]) => ({ day, count }));

  // Status distribution
  const liberado = logs.filter(l => l.status === 'liberado').length;
  const bloqueado = logs.filter(l => l.status === 'bloqueado').length;
  const acessado = logs.filter(l => l.status === 'acessado').length;
  const statusData = [
    { name: 'Liberado', value: liberado, color: 'hsl(173 100% 21%)' },
    { name: 'Bloqueado', value: bloqueado, color: 'hsl(0 62% 50%)' },
    { name: 'Acessado', value: acessado, color: 'hsl(30 80% 50%)' },
  ];

  // Compliance metrics
  const veiculosAtivos = veiculos.filter(v => v.status === 'ativo').length;
  const motoristasAtivos = motoristas.filter(m => m.status === 'ativo').length;
  const motoristasVerificados = motoristas.filter(m => m.documento_verificado).length;
  const complianceVeiculos = veiculos.length > 0 ? Math.round((veiculosAtivos / veiculos.length) * 100) : 0;
  const complianceMotoristas = motoristas.length > 0 ? Math.round((motoristasAtivos / motoristas.length) * 100) : 0;
  const complianceDocs = motoristas.length > 0 ? Math.round((motoristasVerificados / motoristas.length) * 100) : 0;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Relatórios Operacionais</h1>
        <p className="text-sm text-muted-foreground">Dashboard de acessos, conformidade e fluxo</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <TrendingUp className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold font-heading">{todayLogs.length}</p>
          <p className="text-sm text-muted-foreground">Acessos Hoje</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <CheckCircle className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold font-heading">{liberado}</p>
          <p className="text-sm text-muted-foreground">Liberações Totais</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
          <p className="text-2xl font-bold font-heading">{bloqueado}</p>
          <p className="text-sm text-muted-foreground">Bloqueios</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <Percent className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold font-heading">{complianceDocs}%</p>
          <p className="text-sm text-muted-foreground">Docs Verificados</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-4">Fluxo de Acessos (7 dias)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={flowData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-4">Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo de Conformidade */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4">Resumo de Conformidade</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Veículos Ativos</p>
            <p className="text-3xl font-bold font-heading text-primary">{complianceVeiculos}%</p>
            <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${complianceVeiculos}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{veiculosAtivos} de {veiculos.length} veículos</p>
          </div>
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Motoristas Ativos</p>
            <p className="text-3xl font-bold font-heading text-primary">{complianceMotoristas}%</p>
            <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${complianceMotoristas}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{motoristasAtivos} de {motoristas.length} motoristas</p>
          </div>
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Documentos Verificados</p>
            <p className="text-3xl font-bold font-heading text-primary">{complianceDocs}%</p>
            <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${complianceDocs}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{motoristasVerificados} de {motoristas.length} motoristas</p>
          </div>
        </div>
      </div>
    </div>
  );
}