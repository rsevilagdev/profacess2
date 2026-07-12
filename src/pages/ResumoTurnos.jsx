import { useState, useEffect } from 'react';
import { Clock, Users, Mail, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    base44.entities.AccessLog.list('-created_date', 500).then(allLogs => {
      const today = new Date().toDateString();
      const todayLogs = allLogs.filter(l => new Date(l.created_date).toDateString() === today);
      setLogs(todayLogs);
      const byOp = {};
      todayLogs.forEach(l => {
        const nome = l.operador_nome || 'Desconhecido';
        if (!byOp[nome]) byOp[nome] = { nome, total: 0, liberados: 0, bloqueados: 0, acessados: 0 };
        byOp[nome].total++;
        if (l.status === 'liberado') byOp[nome].liberados++;
        if (l.status === 'bloqueado') byOp[nome].bloqueados++;
        if (l.status === 'acessado') byOp[nome].acessados++;
      });
      setOperadores(Object.values(byOp).sort((a, b) => b.total - a.total));
      setLoading(false);
    });
  }, []);

  const sendEmail = async () => {
    setSending(true);
    const summary = operadores.map(o => `${o.nome}: ${o.total} validações (${o.liberados} liberados, ${o.bloqueados} bloqueados)`).join('\n');
    try {
      await base44.integrations.Core.SendEmail({
        to: colaborador?.email || 'admin@profarma.com',
        subject: 'Resumo de Turnos - ' + new Date().toLocaleDateString('pt-BR'),
        body: `RESUMO DE TURNOS - ${new Date().toLocaleDateString('pt-BR')}\n\nTotal de validações hoje: ${logs.length}\n\nPor operador:\n${summary}`
      });
    } catch (e) {}
    setSending(false);
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Resumo de Turnos</h1>
          <p className="text-sm text-muted-foreground">Validações por operador no turno atual</p>
        </div>
        <Button onClick={sendEmail} disabled={sending} className="h-12 rounded-2xl">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Enviar por Email
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Turno de Hoje</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{logs.filter(l => l.status === 'liberado').length}</p>
            <p className="text-xs text-muted-foreground">Liberados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-destructive">{logs.filter(l => l.status === 'bloqueado').length}</p>
            <p className="text-xs text-muted-foreground">Bloqueados</p>
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Por Operador</h3>
        {operadores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma validação registrada hoje</p>
        ) : (
          <div className="space-y-3">
            {operadores.map((op, i) => (
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
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{op.liberados} liberados</span>
                  {op.bloqueados > 0 && <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive">{op.bloqueados} bloqueados</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}