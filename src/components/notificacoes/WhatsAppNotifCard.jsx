import { useState, useEffect } from 'react';
import { MessageCircle, Phone, Loader2, CheckCircle2, Save, Plus, Trash2, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function WhatsAppNotifCard() {
  const { colaborador, login } = useProfarmaAuth();
  const [telefone, setTelefone] = useState(colaborador?.telefone || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [autorizados, setAutorizados] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [novoCargo, setNovoCargo] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAutorizados();
  }, []);

  const loadAutorizados = async () => {
    setLoadingList(true);
    try {
      const list = await base44.entities.WhatsAppAutorizado.list('-created_date', 100);
      setAutorizados(list);
    } catch (e) {}
    setLoadingList(false);
  };

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
      setTestResult({ type: 'success', msg: 'Telefone salvo!' });
    } catch (e) {
      setTestResult({ type: 'error', msg: 'Erro ao salvar' });
    }
    setSaving(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const enviarTeste = async () => {
    setTesting(true);
    const phone = formatPhone(telefone);
    if (!phone) {
      setTestResult({ type: 'error', msg: 'Telefone inválido' });
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

  const adicionarAutorizado = async () => {
    if (!novoNome || !novoTel) return;
    setAdding(true);
    try {
      await base44.entities.WhatsAppAutorizado.create({
        nome: novoNome,
        telefone: novoTel,
        cargo: novoCargo || 'Autorizado',
        ativo: true,
        filial_id: colaborador?.filial_id,
      });
      setNovoNome(''); setNovoTel(''); setNovoCargo('');
      await loadAutorizados();
      setTestResult({ type: 'success', msg: 'Número adicionado à lista!' });
    } catch (e) {
      setTestResult({ type: 'error', msg: 'Erro ao adicionar' });
    }
    setAdding(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const removerAutorizado = async (id) => {
    try {
      await base44.entities.WhatsAppAutorizado.delete(id);
      await loadAutorizados();
    } catch (e) {}
  };

  const toggleAtivo = async (item) => {
    try {
      await base44.entities.WhatsAppAutorizado.update(item.id, { ativo: !item.ativo });
      await loadAutorizados();
    } catch (e) {}
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">Notificações via WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Gerencie os números que recebem alertas do sistema</p>
        </div>
      </div>

      {/* Meu número */}
      <div className="rounded-xl p-4 border bg-primary/5 border-primary/20">
        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
          <Phone className="h-3.5 w-3.5" /> Meu número de WhatsApp
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(DD) 99999-9999"
            className="flex-1 h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={salvarTelefone} disabled={saving || !telefone} size="sm" className="h-10 rounded-xl px-3">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={enviarTeste} disabled={testing || !telefone} variant="secondary" className="h-9 rounded-xl w-full text-sm mt-2">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar mensagem de teste
        </Button>
      </div>

      {/* Lista de autorizados */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold">Números Autorizados ({autorizados.filter(a => a.ativo).length})</h4>
        </div>

        {/* Adicionar novo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome"
            className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="tel"
            value={novoTel}
            onChange={e => setNovoTel(e.target.value)}
            placeholder="(DD) 99999-9999"
            className="h-9 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={novoCargo}
              onChange={e => setNovoCargo(e.target.value)}
              placeholder="Cargo"
              className="flex-1 h-9 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={adicionarAutorizado} disabled={adding || !novoNome || !novoTel} size="sm" className="h-9 rounded-xl px-3">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Lista */}
        {loadingList ? (
          <div className="text-center py-3"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
        ) : autorizados.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum número autorizado. Adicione acima.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {autorizados.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <button
                  onClick={() => toggleAtivo(a)}
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${a.ativo ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                  title={a.ativo ? 'Ativo' : 'Inativo'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">{a.telefone} {a.cargo && `· ${a.cargo}`}</p>
                </div>
                <button onClick={() => removerAutorizado(a.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {testResult && (
        <div className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${testResult.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
          {testResult.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
          {testResult.msg}
        </div>
      )}
    </div>
  );
}