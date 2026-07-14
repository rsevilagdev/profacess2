import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Building2, Activity, Truck, Users, ShieldAlert, CheckCircle, XCircle, Calendar, ChevronLeft, ChevronRight, ClipboardList, FileClock, Loader2, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { maskPlaca } from '@/lib/lgpd-utils.js';
import EconomicAnalysis from '@/components/monitor/EconomicAnalysis';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
];

function FilialHealthCard({ filial, stats }) {
  const ativa = filial.ativo;
  const healthScore = stats.total > 0 ? Math.round((stats.validados / stats.total) * 100) : 0;
  return (
    <div className={`bg-card rounded-2xl border p-4 shadow-sm ${ativa ? 'border-border' : 'border-destructive/30 opacity-70'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{filial.nome}</p>
          <p className="text-xs text-muted-foreground">{filial.codigo} · {filial.cidade || '—'}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0 ${ativa ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          {ativa ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {ativa ? 'Ativa' : 'Inativa'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-muted/50 rounded-lg py-2">
          <Truck className="h-4 w-4 text-blue-600 mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.veiculos}</p>
          <p className="text-[10px] text-muted-foreground">Veículos</p>
        </div>
        <div className="bg-muted/50 rounded-lg py-2">
          <Users className="h-4 w-4 text-orange-600 mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.motoristas}</p>
          <p className="text-[10px] text-muted-foreground">Motoristas</p>
        </div>
        <div className="bg-muted/50 rounded-lg py-2">
          <Activity className="h-4 w-4 text-primary mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.acessos}</p>
          <p className="text-[10px] text-muted-foreground">Acessos</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Saúde operacional</span>
          <span className={`text-[10px] font-bold ${healthScore >= 70 ? 'text-primary' : healthScore >= 40 ? 'text-orange-600' : 'text-destructive'}`}>{healthScore}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${healthScore >= 70 ? 'bg-primary' : healthScore >= 40 ? 'bg-orange-500' : 'bg-destructive'}`} style={{ width: `${healthScore}%` }} />
        </div>
      </div>
    </div>
  );
}

function CalendarView({ liberacoes, reviewTasks }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStr = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isSameDay = (date, day) => {
    const d = new Date(date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  };

  const itemsOnDay = (day) => {
    const libs = liberacoes.filter(l => isSameDay(l.created_date, day));
    const reviews = reviewTasks.filter(r => isSameDay(r.created_date, day));
    return { libs, reviews };
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="h-9 w-9 rounded-xl hover:bg-accent flex items-center justify-center"><ChevronLeft /></button>
        <h3 className="font-heading font-bold text-lg">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="h-9 w-9 rounded-xl hover:bg-accent flex items-center justify-center"><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[90px] rounded-lg bg-muted/20" />;
          const { libs, reviews } = itemsOnDay(day);
          const totalItems = libs.length + reviews.length;
          return (
            <div key={i} className={`min-h-[90px] rounded-lg border p-1.5 transition-colors ${isToday(day) ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
              <p className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
              <div className="space-y-0.5">
                {libs.slice(0, 2).map(l => (
                  <div key={l.id} className="text-[10px] px-1 py-0.5 rounded truncate bg-blue-500/10 text-blue-600" title={`Liberação: ${l.cliente || l.numero_pedido}`}>
                    <FileClock className="h-2.5 w-2.5 inline mr-0.5" />{l.cliente || l.numero_pedido}
                  </div>
                ))}
                {reviews.slice(0, 2).map(r => (
                  <div key={r.id} className="text-[10px] px-1 py-0.5 rounded truncate bg-orange-500/10 text-orange-600" title={`Revisão: ${r.target_nome || r.target_cpf}`}>
                    <ClipboardList className="h-2.5 w-2.5 inline mr-0.5" />{r.target_nome || r.target_cpf}
                  </div>
                ))}
                {totalItems > 4 && <p className="text-[10px] text-muted-foreground">+{totalItems - 4} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-blue-500/30" /><span className="text-xs text-muted-foreground">Liberações Pendentes</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-orange-500/30" /><span className="text-xs text-muted-foreground">Tarefas de Revisão</span></div>
      </div>
    </div>
  );
}

export default function MonitorFiliais() {
  const { colaborador } = useProfarmaAuth();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState([]);
  const [logs, setLogs] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [liberacoes, setLiberacoes] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]);

  const loadData = async () => {
    const [f, l, v, m, libs, rt] = await Promise.all([
      base44.entities.Filial.list().catch(() => []),
      base44.entities.AccessLog.list('-created_date', 2000).catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Driver.list().catch(() => []),
      base44.entities.Liberacao.filter({ status: 'pendente' }).catch(() => []),
      base44.entities.ReviewRequest.filter({ status: 'pendente' }).catch(() => []),
    ]);
    setFiliais(f); setLogs(l); setVeiculos(v); setMotoristas(m); setLiberacoes(libs); setReviewTasks(rt);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsubF = base44.entities.Filial.subscribe(() => loadData());
    const unsubL = base44.entities.AccessLog.subscribe(() => loadData());
    const unsubV = base44.entities.Vehicle.subscribe(() => loadData());
    const unsubD = base44.entities.Driver.subscribe(() => loadData());
    const unsubLib = base44.entities.Liberacao.subscribe(() => loadData());
    const unsubR = base44.entities.ReviewRequest.subscribe(() => loadData());
    return () => { unsubF(); unsubL(); unsubV(); unsubD(); unsubLib(); unsubR(); };
  }, []);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - period);
  const periodLogs = logs.filter(l => new Date(l.created_date) >= cutoffDate);

  const filialStats = (filialId) => {
    const fLogs = periodLogs.filter(l => l.filial_id === filialId);
    const fVeiculos = veiculos.filter(v => v.filial_id === filialId);
    const fMotoristas = motoristas.filter(m => m.filial_id === filialId);
    const total = fVeiculos.length + fMotoristas.length;
    const validados = fVeiculos.filter(v => v.status === 'validado').length + fMotoristas.filter(m => m.status === 'validado').length;
    return { acessos: fLogs.length, veiculos: fVeiculos.length, motoristas: fMotoristas.length, total, validados };
  };

  const chartVolumeData = filiais.map(f => {
    const stats = filialStats(f.id);
    return { name: f.codigo || f.nome.substring(0, 8), acessos: stats.acessos, bloqueados: periodLogs.filter(l => l.filial_id === f.id && l.status === 'bloqueado').length };
  });

  const chartVehicleData = filiais.map(f => {
    const fVeiculos = veiculos.filter(v => v.filial_id === f.id);
    return {
      name: f.codigo || f.nome.substring(0, 8),
      validados: fVeiculos.filter(v => v.status === 'validado').length,
      bloqueados: fVeiculos.filter(v => v.status === 'bloqueado').length,
      pendentes: fVeiculos.filter(v => v.status === 'pendente_revisao').length,
    };
  });

  const totalFiliais = filiais.length;
  const ativas = filiais.filter(f => f.ativo).length;
  const inativas = totalFiliais - ativas;
  const totalAcessos = periodLogs.length;
  const totalBloqueados = periodLogs.filter(l => l.status === 'bloqueado').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Monitor de Filiais</h1>
          <p className="text-sm text-muted-foreground">Saúde operacional e status da rede em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-2xl text-sm font-medium ${tab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            <Activity className="h-4 w-4 inline mr-2" /> Visão Geral
          </button>
          <button onClick={() => setTab('calendario')} className={`px-4 py-2 rounded-2xl text-sm font-medium ${tab === 'calendario' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            <Calendar className="h-4 w-4 inline mr-2" /> Calendário
          </button>
          <button onClick={() => setTab('economico')} className={`px-4 py-2 rounded-2xl text-sm font-medium ${tab === 'economico' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
            <DollarSign className="h-4 w-4 inline mr-2" /> Econômico
          </button>
        </div>
      </div>

      {tab === 'overview' ? (
        <>
          {/* Period filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">Período:</span>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${period === p.value ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div></div>
              <p className="text-2xl font-bold font-heading">{totalFiliais}</p>
              <p className="text-sm text-muted-foreground">Filiais ({ativas} ativas, {inativas} inativas)</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center"><Activity className="h-4 w-4 text-blue-600" /></div></div>
              <p className="text-2xl font-bold font-heading">{totalAcessos}</p>
              <p className="text-sm text-muted-foreground">Liberações no período</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center"><ShieldAlert className="h-4 w-4 text-destructive" /></div></div>
              <p className="text-2xl font-bold font-heading">{totalBloqueados}</p>
              <p className="text-sm text-muted-foreground">Bloqueados no período</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center"><Truck className="h-4 w-4 text-orange-600" /></div></div>
              <p className="text-2xl font-bold font-heading">{veiculos.length}</p>
              <p className="text-sm text-muted-foreground">Veículos cadastrados</p>
            </div>
          </div>

          {/* Filial health cards */}
          <div>
            <h3 className="font-heading font-bold text-lg mb-3">Saúde por Filial</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filiais.length === 0 ? (
                <div className="col-span-full bg-card rounded-2xl border border-border p-8 text-center">
                  <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma filial cadastrada</p>
                </div>
              ) : filiais.map(f => <FilialHealthCard key={f.id} filial={f} stats={filialStats(f.id)} />)}
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold mb-4">Volume de Liberações por Filial</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartVolumeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="acessos" name="Liberações" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bloqueados" name="Bloqueados" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-heading font-bold mb-4">Status de Veículos por Filial</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartVehicleData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="validados" name="Validados" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="hsl(30, 80%, 50%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bloqueados" name="Bloqueados" stackId="a" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : tab === 'calendario' ? (
        <>
          {/* Calendar tab */}
...
          <CalendarView liberacoes={liberacoes} reviewTasks={reviewTasks} />
        </>
      ) : tab === 'economico' ? (
        <EconomicAnalysis filialId={colaborador?.filial_id} filialNome={colaborador?.filial_nome} />
      ) : null}
    </div>
  );
}