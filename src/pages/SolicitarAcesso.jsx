import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Building2, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function SolicitarAcesso() {
  const [form, setForm] = useState({ nome: '', cpf: '', email: '', telefone: '', matricula: '', motivo: '' });
  const [filiais, setFiliais] = useState([]);
  const [filialId, setFilialId] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { colaborador } = useProfarmaAuth();

  useEffect(() => {
    base44.entities.Filial.list().then(list => {
      setFiliais(list.filter(f => f.ativo));
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.nome || !form.cpf || !form.email) return;
    setLoading(true);
    const cpfDigits = form.cpf.replace(/\D/g, '');
    const filial = filiais.find(f => f.id === filialId);
    try {
      await base44.entities.SolicitacaoAcesso.create({
        nome: form.nome, cpf: cpfDigits, email: form.email, telefone: form.telefone,
        matricula: form.matricula, filial_id: filialId, filial_nome: filial?.nome,
        motivo: form.motivo, status: 'pendente'
      });
      const admins = await base44.entities.Colaborador.list();
      const destinatarios = admins.filter(a => a.email && (a.cargo === 'administrador_master' || a.cargo === 'administrador' || a.cargo === 'encarregado'));
      for (const admin of destinatarios) {
        try {
          await base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'Nova Solicitação de Acesso - PROFARMA LIBERAAUTO PRO',
            body: `Nova solicitação de acesso:\n\nNome: ${form.nome}\nCPF: ${cpfDigits}\nEmail: ${form.email}\nMatrícula: ${form.matricula}\nFilial: ${filial?.nome}\nMotivo: ${form.motivo}`
          });
        } catch (e) {}
      }
      setDone(true);
    } catch (e) {}
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary text-primary-foreground mb-4">
            <Send className="h-8 w-8" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Solicitação Enviada!</h2>
          <p className="text-sm text-muted-foreground mb-6">Sua solicitação foi enviada aos administradores. Você receberá um email de resposta.</p>
          <Button onClick={() => navigate('/')} className="h-12 rounded-2xl px-8">Voltar ao Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h2 className="font-heading font-bold text-xl mb-1">Solicitar Acesso</h2>
          <p className="text-sm text-muted-foreground mb-6">Preencha seus dados para solicitação</p>

          <div className="space-y-4">
            <input className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nome completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="CPF" value={form.cpf} onChange={e => setForm({...form, cpf: formatCPF(e.target.value)})} maxLength={14} />
            <input className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="E-mail" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Telefone/Celular" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
            <input className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Matrícula" value={form.matricula} onChange={e => setForm({...form, matricula: e.target.value})} />

            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent flex items-center justify-between text-left">
                <span className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-primary" />
                  {filiais.find(f => f.id === filialId)?.nome || 'Selecionar filial...'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto z-10">
                  {filiais.map(f => (
                    <button key={f.id} onClick={() => { setFilialId(f.id); setShowDropdown(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-accent first:rounded-t-2xl last:rounded-b-2xl">{f.nome}</button>
                  ))}
                </div>
              )}
            </div>

            <textarea className="w-full px-4 py-3 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]" placeholder="Motivo / Serviço solicitado" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} />

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-2xl">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ENVIAR SOLICITAÇÃO'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}