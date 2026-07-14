import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, Percent, Building2, Mail, Loader2, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
];

export default function Relatorios() {
  const [logs, setLogs] = useState([]);
  const [liberacoes, setLiberacoes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.AccessLog.list('-created_date', 500).catch(() => []),
      base44.entities.Liberacao.list('-created_date', 500).catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Driver.list().catch(() => []),
      base44.entities.Filial.list().catch(() => []),
    ]).then(([l, lib, v, m, f]) => {
      setLogs(l); setLiberacoes(lib); setVeiculos(v); setMotoristas(m); setFiliais(f);
      setLoading(false);
    });
  }, []);

  const sendMonthlyReport = async () => {
    setSendingReport(true); setReportResult(null);
    try {
      const res = await base44.functions.invoke('enviarRelatorioMensal', {});
      setReportResult({ success: true, data: res.data });
    } catch (err) {
      setReportResult({ success: false, error: err.message });
    }
    setSendingReport(false);
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando relatórios...</div>;

  const now = new Date();
  const periodStart = new Date(); periodStart.setDate(periodStart.getDate() - period);
  const periodLogs = logs.filter(l => new Date(l.created_date) >= periodStart);
  const periodLib = liberacoes.filter(l => l.data_liberacao ? new Date(l.data_liberacao) >= periodStart : false);

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.created_date).toDateString() === today);

  // Flow by day for selected period
  const dayCount = Math.min(period, 30);
  const days = {};
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: dayCount <= 7 ? 'short' : '2-digit' });
    days[key] = { liberado: 0, bloqueado: 0, acessado: 0 };
  }
  periodLogs.forEach(l => {
    const d = new Date(l.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: dayCount <= 7 ? 'short' : '2-digit' });
    if (days[d]) {
      if (l.status === 'validado') days[d].liberado++;
      else if (l.status === 'bloqueado') days[d].bloqueado++;
      else days[d].acessado++;
    }
  });
  const flowData = Object.entries(days).map(([day, counts]) => ({ day, ...counts }));

  // By branch (filial)
  const branchMap = {};
  filiais.forEach(f => { branchMap[f.nome] = { filial: f.nome, liberado: 0, bloqueado: 0, acessado: 0, total: 0 }; });
  periodLogs.forEach(l => {
    const name = l.filial_nome || 'Sem filial';
    if (!branchMap[name]) branchMap[name] = { filial: name, liberado: 0, bloqueado: 0, acessado: 0, total: 0 };
    branchMap[name].total++;
    if (l.status === 'validado') branchMap[name].liberado++;
    else if (l.status === 'bloqueado') branchMap[name].bloqueado++;
    else branchMap[name].acessado++;
  });
  const branchData = Object.values(branchMap).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

  // Status distribution
  const validado = periodLogs.filter(l => l.status === 'validado').length;
  const bloqueado = periodLogs.filter(l => l.status === 'bloqueado').length;
  const pendente = periodLogs.filter(l => l.status === 'pendente_revisao').length;
  const statusData = [
    { name: 'Validado', value: validado, color: 'hsl(173 100% 21%)' },
    { name: 'Bloqueado', value: bloqueado, color: 'hsl(0 62% 50%)' },
    { name: 'Pendente', value: pendente, color: 'hsl(30 80% 50%)' },
  ];

  // Entry vs Exit
  const entradas = periodLogs.filter(l => l.tipo === 'entrada').length;
  const saidas = periodLogs.filter(l => l.tipo === 'saida').length;
  const tipoData = [
    { name: 'Entradas', value: entradas, color: 'hsl(200 60% 45%)' },
    { name: 'Saídas', value: saidas, color: 'hsl(173 100% 21%)' },
  ];

  // Compliance metrics
  const veiculosAtivos = veiculos.filter(v => v.status === 'validado').length;
  const motoristasAtivos = motoristas.filter(m => m.status === 'validado').length;
  const motoristasVerificados = motoristas.filter(m => m.documento_verificado).length;
  const complianceVeiculos = veiculos.length > 0 ? Math.round((veiculosAtivos / veiculos.length) * 100) : 0;
  const complianceMotoristas = motoristas.length > 0 ? Math.round((motoristasAtivos / motoristas.length) * 100) : 0;


  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="brand-title text-2xl">Relatórios Operacionais</h1>
          <p className="text-sm text-muted-foreground">Dashboard de acessos, liberações e conformidade por período e filial</p>
        </div>
        <Button onClick={sendMonthlyReport} disabled={sendingReport} className="h-11 rounded-2xl">
          {sendingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Enviar Relatório Mensal
        </Button>
      </div>

      {/* Report result banner */}
      {reportResult && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${reportResult.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          {reportResult.success ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <div className="text-sm">
            {reportResult.success
              ? `Relatório de ${reportResult.data.month} enviado! ${reportResult.data.emailsSent} e-mails enviados · ${reportResult.data.totalAccessLogs} acessos · ${reportResult.data.totalLiberacoes} liberações.`
              : `Erro: ${reportResult.error}`}
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-2 bg-card rounded-2xl border border-border p-2 shadow-sm w-fit">
        <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${period === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <TrendingUp className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold font-heading">{periodLogs.length}</p>
          <p className="text-sm text-muted-foreground">Acessos no período</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <CheckCircle className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold font-heading">{validado}</p>
          <p className="text-sm text-muted-foreground">Liberações</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
          <p className="text-2xl font-bold font-heading">{bloqueado}</p>
          <p className="text-sm text-muted-foreground">Bloqueios</p>
        </div>

      </div>

      {/* Flow by period */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4">Fluxo de Liberações por Período ({period} dias)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={flowData}>
            <defs>
              <linearGradient id="gradLiberado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173 100% 21%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(173 100% 21%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gradBloqueado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 62% 50%)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="hsl(0 62% 50%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(dayCount / 8))} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="liberado" name="Liberado" stroke="hsl(173 100% 21%)" fill="url(#gradLiberado)" strokeWidth={2} />
            <Area type="monotone" dataKey="bloqueado" name="Bloqueado" stroke="hsl(0 62% 50%)" fill="url(#gradBloqueado)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* By branch */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Acessos por Filial</h3>
        </div>
        {branchData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum acesso no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="filial" tick={{ fontSize: 11 }} width={120} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="liberado" name="Liberado" stackId="a" fill="hsl(173 100% 21%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bloqueado" name="Bloqueado" stackId="a" fill="hsl(0 62% 50%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="acessado" name="Acessado" stackId="a" fill="hsl(30 80% 50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status + Entry/Exit */}
      <div className="grid md:grid-cols-2 gap-4">
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
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-4">Entradas vs Saídas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tipoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {tipoData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo de Conformidade */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4">Resumo de Conformidade</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Veículos Validados</p>
            <p className="text-3xl font-bold font-heading text-primary">{complianceVeiculos}%</p>
            <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${complianceVeiculos}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{veiculosAtivos} de {veiculos.length} veículos</p>
          </div>
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Motoristas Validados</p>
            <p className="text-3xl font-bold font-heading text-primary">{complianceMotoristas}%</p>
            <div className="h-2 bg-background rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${complianceMotoristas}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{motoristasAtivos} de {motoristas.length} motoristas</p>
          </div>
        </div>
      </div>
    </div>
  );
}