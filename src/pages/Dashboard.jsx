import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ScanLine, ShieldAlert, Truck, Users, Cloud, Smartphone, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { maskPlaca, maskCPF } from '@/lib/lgpd-utils.js';

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
  const [stats, setStats] = useState({ acessos: 0, bloqueados: 0, veiculos: 0, motoristas: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AccessLog.list('-created_date', 100).catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Driver.list().catch(() => []),
    ]).then(([logs, veiculos, motoristas]) => {
      const today = new Date().toDateString();
      const todayLogs = logs.filter(l => new Date(l.created_date).toDateString() === today);
      const bloqueados = veiculos.filter(v => v.status === 'bloqueado').length + motoristas.filter(m => m.status === 'bloqueado').length;

      const hours = {};
      for (let h = 0; h < 24; h++) hours[`${h}h`] = 0;
      todayLogs.forEach(l => {
        const h = new Date(l.created_date).getHours();
        hours[`${h}h`] = (hours[`${h}h`] || 0) + 1;
      });
      setChartData(Object.entries(hours).map(([hour, count]) => ({ hour, count })));

      setStats({
        acessos: todayLogs.length,
        bloqueados,
        veiculos: veiculos.length,
        motoristas: motoristas.length,
      });
      setRecentes(logs.slice(0, 5));
      setLoading(false);
    });
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
        <StatCard icon={ScanLine} label="Acessos Hoje" value={stats.acessos} color="bg-primary/10 text-primary" to="/novo-acesso" />
        <StatCard icon={ShieldAlert} label="Bloqueados" value={stats.bloqueados} color="bg-destructive/10 text-destructive" to="/painel-bloqueio" />
        <StatCard icon={Truck} label="Veículos" value={stats.veiculos} color="bg-blue-500/10 text-blue-600" to="/editar-base" />
        <StatCard icon={Users} label="Motoristas" value={stats.motoristas} color="bg-orange-500/10 text-orange-600" to="/editar-base" />
      </div>

      {/* Chart + Connected Devices */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold text-lg mb-4">Fluxo de Saída por Hora</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold text-lg mb-4">Dispositivos Conectados</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center pulse-teal">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading mt-4">1</p>
            <p className="text-sm text-muted-foreground">Celular ativo</p>
          </div>
        </div>
      </div>

      {/* Recent Accesses */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg">Acessos Recentes</h3>
          <Link to="/novo-acesso" className="text-sm text-primary flex items-center gap-1 hover:underline">
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
                  <div className={`h-2 w-2 rounded-full ${log.status === 'liberado' ? 'bg-primary' : log.status === 'bloqueado' ? 'bg-destructive' : 'bg-orange-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{maskPlaca(log.veiculo_placa)}</p>
                    <p className="text-xs text-muted-foreground">{maskCPF(log.motorista_cpf)} · {log.motorista_nome ? log.motorista_nome[0] + '***' : '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium capitalize">{log.status}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}