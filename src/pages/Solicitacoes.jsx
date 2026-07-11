import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function Solicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = () => {
    base44.entities.SolicitacaoAcesso.filter({}).then((data) => {
      setSolicitacoes(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (sol, action) => {
    await base44.entities.SolicitacaoAcesso.update(sol.id, { status: action });
    if (action === 'aprovado') {
      await base44.entities.Colaborador.create({
        nome: sol.nome,
        cpf: sol.cpf,
        senha: '123456',
        filial_id: sol.filial_id || '',
        filial_nome: sol.filial_nome || '',
        cargo: 'operador',
        ativo: true,
      });
      toast({ title: 'Acesso aprovado', description: `Colaborador ${sol.nome} criado com senha padrão 123456` });
    } else {
      toast({ title: 'Solicitação rejeitada' });
    }
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Solicitações de Acesso</h1>
        <p className="text-white/40 text-sm mt-1">{solicitacoes.length} solicitação(ões)</p>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhuma solicitação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {solicitacoes.map((sol) => (
            <div key={sol.id} className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm text-white font-medium">{sol.nome}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      sol.status === 'pendente' ? 'bg-yellow-500/15 text-yellow-400' :
                      sol.status === 'aprovado' ? 'bg-emerald-500/15 text-emerald-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {sol.status === 'pendente' ? 'Pendente' : sol.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">CPF: {sol.cpf} {sol.email ? `· ${sol.email}` : ''}</p>
                  {sol.filial_nome && <p className="text-xs text-white/30">{sol.filial_nome}</p>}
                  {sol.motivo && <p className="text-xs text-white/50 mt-1 italic">"{sol.motivo}"</p>}
                </div>
                {sol.status === 'pendente' && (
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => handleAction(sol, 'aprovado')} className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 h-8 rounded-lg text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" onClick={() => handleAction(sol, 'rejeitado')} variant="ghost" className="text-red-400 hover:bg-red-500/15 h-8 rounded-lg text-xs">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}