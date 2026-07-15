import { useState } from 'react';
import { MessageCircle, Phone, Loader2, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function WhatsAppNotifCard() {
  const { colaborador, login } = useProfarmaAuth();
  const [telefone, setTelefone] = useState(colaborador?.telefone || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const formatPhone = (tel) => {
    let digits = (tel || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
    return digits;
  };

  const salvarTelefone = async () => {
    setSaving(true);
    try {
      await base44.entities.Colaborador.update(colaborador.id, { telefone });
      login({ ...colaborador, telefone });
      setTestResult({ type: 'success', msg: 'Telefone salvo com sucesso!' });
    } catch (e) {
      setTestResult({ type: 'error', msg: 'Erro ao salvar telefone' });
    }
    setSaving(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const enviarTeste = async () => {
    setTesting(true);
    const phone = formatPhone(telefone);
    if (!phone) {
      setTestResult({ type: 'error', msg: 'Telefone inválido. Use o formato (DD) 99999-9999' });
      setTesting(false);
      return;
    }
    const msg = `✅ *Teste de Notificação*\n\nOlá ${colaborador.nome}! As notificações do ProfAcesso estão configuradas para este número.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setTestResult({ type: 'success', msg: 'WhatsApp aberto com mensagem de teste' });
    setTesting(false);
    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">Notificações via WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Receba alertas do sistema no seu WhatsApp</p>
        </div>
      </div>
      <div className="rounded-xl p-4 border bg-primary/5 border-primary/20 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> Número de WhatsApp
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(DD) 99999-9999"
              className="flex-1 h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={salvarTelefone} disabled={saving || !telefone} size="sm" className="h-10 rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registre seu número para receber notificações de entradas, saídas e alertas.
          </p>
        </div>

        <Button onClick={enviarTeste} disabled={testing || !telefone} variant="secondary" className="h-10 rounded-xl w-full text-sm">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Enviar mensagem de teste
        </Button>

        {testResult && (
          <div className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${testResult.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
            {testResult.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {testResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}