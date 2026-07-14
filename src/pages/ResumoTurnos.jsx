import { useState, useEffect } from 'react';
import { Clock, Users, Mail, Download, Loader2, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskNome } from '@/lib/lgpd-utils.js';

export default function ResumoTurnos() {
  const { colaborador } = useProfarmaAuth();
  const [logs, setLogs] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState(['validado', 'bloqueado', 'pendente_revisao']);
  const [filterOp, setFilterOp] = useState('all');

  useEffect(() => {
    base44.entities.AccessLog.list('-created_date', 500).then(allLogs => {
      const today = new Date().toDateString();
      const todayLogs = allLogs.filter(l => new Date(l.created_date).toDateString() === today);
      setLogs(todayLogs);
      const byOp = {};
      todayLogs.forEach(l => {
        const nome = l.operador_nome || 'Desconhecido';
        if (!byOp[nome]) byOp[nome] = { nome, total: 0, validados: 0, bloqueados: 0, pendentes: 0 };
        byOp[nome].total++;
        if (l.status === 'validado') byOp[nome].validados++;
        if (l.status === 'bloqueado') byOp[nome].bloqueados++;
        if (l.status === 'pendente_revisao') byOp[nome].pendentes++;
      });
      setOperadores(Object.values(byOp).sort((a, b) => b.total - a.total));
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter(l => filterStatus.includes(l.status));
  const filteredOps = filterOp === 'all' ? operadores : operadores.filter(o => o.nome === filterOp);

  const sendEmail = async () => {
    setSending(true);
    const summary = filteredOps.map(o => `${o.nome}: ${o.total} validações (${o.validados} validados, ${o.bloqueados} bloqueados, ${o.pendentes} pendentes)`).join('\n');
    try {
      await base44.integrations.Core.SendEmail({
        to: colaborador?.email || 'admin@profarma.com',
        subject: 'Resumo de Turnos - ' + new Date().toLocaleDateString('pt-BR'),
        body: `RESUMO DE TURNOS - ${new Date().toLocaleDateString('pt-BR')}\n\nTotal de validações hoje: ${filteredLogs.length}\n\nPor operador:\n${summary}`
      });
    } catch (e) {}
    setSending(false);
  };

  const exportCSV = () => {
    const headers = ['Operador', 'Total', 'Validados', 'Bloqueados', 'Pendentes'];
    const rows = filteredOps.map(o => [o.nome, o.total, o.validados, o.bloqueados, o.pendentes]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `resumo_turnos_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Resumo de Turnos</h1>
          <p className="text-sm text-muted-foreground">Validações por operador no turno atual</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="secondary" className="h-12 rounded-2xl">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={sendEmail} disabled={sending} className="h-12 rounded-2xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Enviar por Email
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Turno de Hoje</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{filteredLogs.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{filteredLogs.filter(l => l.status === 'validado').length}</p>
            <p className="text-xs text-muted-foreground">Validados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-destructive">{filteredLogs.filter(l => l.status === 'bloqueado').length}</p>
            <p className="text-xs text-muted-foreground">Bloqueados</p>
          </div>
        </div>
      </div>

      {/* Multi-filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Filtros</p></div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Status</p>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'validado', l: 'Validado' }, { v: 'bloqueado', l: 'Bloqueado' }, { v: 'pendente_revisao', l: 'Pendente' }].map(s => (
              <button key={s.v} onClick={() => setFilterStatus(prev => prev.includes(s.v) ? prev.filter(x => x !== s.v) : [...prev, s.v])}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filterStatus.includes(s.v) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Operador</p>
          <select value={filterOp} onChange={e => setFilterOp(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-card text-sm">
            <option value="all">Todos</option>
            {operadores.map((o, i) => <option key={i} value={o.nome}>{maskNome(o.nome)}</option>)}
          </select>
        </div>
      </div>

      {/* Operators */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Por Operador</h3>
        {filteredOps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma validação registrada</p>
        ) : (
          <div className="space-y-3">
            {filteredOps.map((op, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {op.nome?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{maskNome(op.nome)}</p>
                    <p className="text-xs text-muted-foreground">{op.total} validações</p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs flex-wrap justify-end">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{op.validados} validados</span>
                  {op.bloqueados > 0 && <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive">{op.bloqueados} bloqueados</span>}
                  {op.pendentes > 0 && <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">{op.pendentes} pendentes</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}