import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Link } from 'react-router-dom';
import { FileCheck, Users, Building2, UserPlus, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { colaborador } = useProfarmaAuth();
  const [stats, setStats] = useState(null);
  const [recentLib, setRecentLib] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Liberacao.filter({}),
      base44.entities.Colaborador.filter({}),
      base44.entities.Filial.filter({}),
      base44.entities.SolicitacaoAcesso.filter({ status: 'pendente' }),
    ]).then(([liberacoes, colaboradores, filiais, solicitacoes]) => {
      setStats({
        totalLib: liberacoes.length,
        pendentes: liberacoes.filter(l => l.status === 'pendente').length,
        liberados: liberacoes.filter(l => l.status === 'liberado').length,
        rejeitados: liberacoes.filter(l => l.status === 'rejeitado').length,
        colaboradores: colaboradores.length,
        filiais: filiais.length,
        solicitacoes: solicitacoes.length,
      });
      setRecentLib(liberacoes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting()}, {colaborador?.nome?.split(' ')[0]}</h1>
        <p className="text-white/40 text-sm mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Pendentes" value={stats?.pendentes || 0} color="bg-yellow-500/15 text-yellow-400" to="/liberacoes" />
        <StatCard icon={CheckCircle2} label="Liberados" value={stats?.liberados || 0} color="bg-emerald-500/15 text-emerald-400" to="/liberacoes" />
        <StatCard icon={XCircle} label="Rejeitados" value={stats?.rejeitados || 0} color="bg-red-500/15 text-red-400" to="/liberacoes" />
        <StatCard icon={UserPlus} label="Solicitações pendentes" value={stats?.solicitacoes || 0} color="bg-blue-500/15 text-blue-400" to="/solicitacoes" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FileCheck} label="Total de liberações" value={stats?.totalLib || 0} color="bg-[hsl(160,50%,40%)]/15 text-[hsl(160,50%,50%)]" to="/liberacoes" />
        <StatCard icon={Users} label="Colaboradores" value={stats?.colaboradores || 0} color="bg-purple-500/15 text-purple-400" to="/colaboradores" />
        <StatCard icon={Building2} label="Filiais" value={stats?.filiais || 0} color="bg-orange-500/15 text-orange-400" to="/filiais" />
      </div>

      {/* Recent */}
      <div className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Liberações recentes</h2>
        {recentLib.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">Nenhuma liberação registrada</p>
        ) : (
          <div className="space-y-2">
            {recentLib.map((lib) => (
              <div key={lib.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">Pedido #{lib.numero_pedido}</p>
                  <p className="text-xs text-white/40 truncate">{lib.cliente}</p>
                </div>
                <div className="flex items-center gap-3">
                  {lib.valor && <span className="text-xs text-white/50">R$ {lib.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    lib.status === 'pendente' ? 'bg-yellow-500/15 text-yellow-400' :
                    lib.status === 'liberado' ? 'bg-emerald-500/15 text-emerald-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {lib.status === 'pendente' ? 'Pendente' : lib.status === 'liberado' ? 'Liberado' : 'Rejeitado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}