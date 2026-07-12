import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Loader2, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function ForgotPassword() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setResult({ type: 'error', message: 'CPF inválido. Digite os 11 dígitos.' });
      setLoading(false);
      return;
    }
    try {
      const colaboradores = await base44.entities.Colaborador.filter({ cpf: cpfDigits });
      if (colaboradores.length === 0) {
        setResult({ type: 'not_found', message: 'CPF não encontrado no sistema. Contate o administrador para recuperar seu acesso.' });
        setLoading(false);
        return;
      }
      const colab = colaboradores[0];
      if (!colab.email) {
        setResult({ type: 'no_email', message: 'Não há e-mail cadastrado para este CPF. Contate o administrador para recuperar seu acesso.' });
        setLoading(false);
        return;
      }
      const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
      await base44.entities.Colaborador.update(colab.id, { senha: tempPassword });
      await base44.integrations.Core.SendEmail({
        to: colab.email,
        subject: 'Recuperação de Senha - PROFARMA LIBERAAUTO PRO',
        body: `Olá ${colab.nome},\n\nSua senha foi redefinida conforme solicitação.\n\nSenha temporária: ${tempPassword}\n\nFaça login com esta senha e altere-a nas configurações de perfil.\n\nSe você não solicitou esta recuperação, contate o administrador imediatamente.\n\nEste é um envio automático do sistema PROFARMA LIBERAAUTO PRO.`,
        from_name: 'PROFARMA LIBERAAUTO PRO'
      });
      await base44.entities.AuditLog.create({
        user_name: colab.nome, user_cpf: colab.cpf, action: 'Recuperação de senha por CPF',
        details: `E-mail enviado para ${colab.email}`, ip_address: 'local', category: 'login',
        domain: window.location.hostname
      });
      setResult({ type: 'success', message: `E-mail de recuperação enviado para ${colab.email}. Verifique sua caixa de entrada.` });
    } catch (err) {
      setResult({ type: 'error', message: 'Erro ao processar solicitação: ' + err.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary text-primary-foreground shadow-xl mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="brand-title text-2xl text-foreground">PROFARMA</h1>
          <p className="text-sm text-muted-foreground tracking-wide mt-1">LIBERAAUTO PRO</p>
        </div>
        <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
          <h2 className="font-heading font-bold text-xl mb-1">Recuperar Senha</h2>
          <p className="text-sm text-muted-foreground mb-6">Digite seu CPF para receber uma senha temporária por e-mail</p>

          {result && (
            <div className={`mb-4 p-4 rounded-2xl flex items-start gap-3 ${
              result.type === 'success' ? 'bg-primary/10 text-primary' :
              result.type === 'error' ? 'bg-destructive/10 text-destructive' :
              'bg-orange-500/10 text-orange-600'
            }`}>
              {result.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
              <p className="text-sm">{result.message}</p>
            </div>
          )}

          {result?.type !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">CPF</label>
                <input
                  type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00" maxLength={14}
                  className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl text-base">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                {loading ? 'Enviando...' : 'Enviar Senha por E-mail'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar ao login
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 PROFARMA LIBERAAUTO PRO · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}