import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, ShieldAlert, Truck, Users, Cloud, Smartphone, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { formatCuritiba } from '@/lib/curitiba-time.js';
import { maskPlaca, maskCPF } from '@/lib/lgpd-utils.js';
import PainelRelatorios from '@/components/dashboard/PainelRelatorios';
import SmartDashboard from '@/components/dashboard/SmartDashboard';

function StatCard({ icon: Icon, label, value, color, to }) {
  const card = (
    <div className={`bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold font-heading">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function Dashboard() {
  const { colaborador } = useProfarmaAuth();
  const [stats, setStats] = useState({ acessos: 0, bloqueados: 0, veiculos: 0, veiculosTotal: 0, motoristas: 0, motoristasTotal: 0 });
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [logs, veiculos, motoristas] = await Promise.all([
      base44.entities.AccessLog.list('-created_date', 100).catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Driver.list().catch(() => []),
    ]);
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.created_date).toDateString() === today);
    const bloqueados = veiculos.filter(v => v.status === 'bloqueado').length + motoristas.filter(m => m.status === 'bloqueado').length;

    setStats({
      acessos: todayLogs.length,
      bloqueados,
      veiculos: veiculos.filter(v => v.status === 'validado').length,
      veiculosTotal: veiculos.length,
      motoristas: motoristas.filter(m => m.status === 'validado').length,
      motoristasTotal: motoristas.length,
    });
    setRecentes(logs.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Real-time — atualiza dashboard sem refresh
  useEffect(() => {
    const unsubA = base44.entities.AccessLog.subscribe(() => loadData());
    const unsubV = base44.entities.Vehicle.subscribe(() => loadData());
    const unsubD = base44.entities.Driver.subscribe(() => loadData());
    return () => { unsubA(); unsubV(); unsubD(); };
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Smartphone className="h-8 w-8 animate-pulse text-primary" /></div>;

  const filialNome = colaborador?.filial_nome || '—';

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo,</p>
          <h1 className="brand-title text-2xl">{colaborador?.nome || 'Operador'}</h1>
          <p className="text-sm text-muted-foreground">Filial: {filialNome}</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl pulse-teal">
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">Nuvem: Sincronizado</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ScanLine} label="Acessos Hoje" value={stats.acessos} color="bg-primary/10 text-primary" to="/acessos" />
        <StatCard icon={ShieldAlert} label="Bloqueados" value={stats.bloqueados} color="bg-destructive/10 text-destructive" to="/painel-bloqueio" />
        <StatCard icon={Truck} label={`Veículos Ativos (${stats.veiculosTotal})`} value={stats.veiculos} color="bg-blue-500/10 text-blue-600" to="/editar-base" />
        <StatCard icon={Users} label={`Motoristas Ativos (${stats.motoristasTotal})`} value={stats.motoristas} color="bg-orange-500/10 text-orange-600" to="/editar-base" />
      </div>

      {/* Smart Dashboard with selectable charts */}
      <SmartDashboard />

      {/* Painel de Relatórios */}
      <PainelRelatorios />

      {/* Recent Accesses */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg">Acessos Recentes</h3>
          <Link to="/acessos" className="text-sm text-primary flex items-center gap-1 hover:underline">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum acesso registrado ainda</p>
        ) : (
          <div className="space-y-2">
            {recentes.map(log => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${log.status === 'validado' ? 'bg-primary' : log.status === 'bloqueado' ? 'bg-destructive' : 'bg-orange-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{maskPlaca(log.veiculo_placa)}</p>
                    <p className="text-xs text-muted-foreground">{maskCPF(log.motorista_cpf)} · {log.motorista_nome || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium capitalize">{log.status}</p>
                  <p className="text-xs text-muted-foreground">{formatCuritiba(log.created_date, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}