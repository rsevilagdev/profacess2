import { useState } from 'react';
import { IdCard, Search, Loader2, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function VerificarCNH() {
  const { colaborador } = useProfarmaAuth();
  const [cnh, setCnh] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const verificar = async () => {
    if (!cnh) return;
    setLoading(true); setResult(null);
    try {
      const response = await base44.functions.invoke('verificarCNH', { cnh, cpf: cpf.replace(/\D/g, '') });
      const data = response.data;
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  const dbStatusText = (status) => {
    const map = {
      'valid_in_db': { text: 'Válida na base de dados', color: 'text-primary', icon: CheckCircle },
      'blocked': { text: 'Motorista bloqueado', color: 'text-destructive', icon: AlertTriangle },
      'expired': { text: 'CNH vencida', color: 'text-destructive', icon: AlertTriangle },
      'cpf_mismatch': { text: 'CPF não corresponde à CNH', color: 'text-destructive', icon: AlertTriangle },
      'not_found': { text: 'CNH não encontrada na base de dados', color: 'text-orange-500', icon: HelpCircle },
    };
    return map[status] || { text: status, color: 'text-muted-foreground', icon: HelpCircle };
  };

  const verifStatus = result?.verification?.status_verificacao;
  const DbIcon = result ? dbStatusText(result.dbStatus).icon : null;
  const dbInfo = result ? dbStatusText(result.dbStatus) : null;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Verificar CNH</h1>
        <p className="text-sm text-muted-foreground">Verificação de validade e autenticidade de CNH</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><IdCard className="h-6 w-6 text-primary" /></div>
          <h3 className="font-heading font-bold">Dados da CNH</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Número da CNH</label>
            <input type="text" value={cnh} onChange={e => setCnh(e.target.value.replace(/\D/g, ''))} placeholder="Digite o número da CNH (11 dígitos)" maxLength={11} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CPF do Motorista (opcional)</label>
            <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <Button onClick={verificar} disabled={loading || !cnh} className="w-full h-12 rounded-2xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Verificar Autenticidade
          </Button>
        </div>
      </div>

      {result && !result.error && (
        <div className="space-y-4 max-w-md fade-in">
          {/* DB Result */}
          <div className={`rounded-2xl p-5 border ${result.dbStatus === 'valid_in_db' ? 'bg-primary/5 border-primary/20' : result.dbStatus === 'not_found' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-destructive/5 border-destructive/20'}`}>
            <div className="flex items-center gap-3">
              {DbIcon && <DbIcon className={`h-8 w-8 ${dbInfo.color}`} />}
              <div>
                <p className={`font-heading font-bold text-lg ${dbInfo.color}`}>BASE DE DADOS</p>
                <p className="text-sm text-muted-foreground">{dbInfo.text}</p>
              </div>
            </div>
            {result.driverData && (
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> {result.driverData.nome} {result.driverData.sobrenome || ''}</p>
                <p><span className="text-muted-foreground">CPF:</span> {result.driverData.cpf}</p>
                <p><span className="text-muted-foreground">Validade CNH:</span> {result.driverData.cnh_validade || '—'}</p>
                <p><span className="text-muted-foreground">Status:</span> {result.driverData.status}</p>
              </div>
            )}
          </div>

          {/* LLM Verification */}
          <div className={`rounded-2xl p-5 border ${verifStatus === 'valido' ? 'bg-primary/5 border-primary/20' : verifStatus === 'invalido' ? 'bg-destructive/5 border-destructive/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
            <div className="flex items-center gap-3">
              {verifStatus === 'valido' ? <CheckCircle className="h-8 w-8 text-primary" /> : verifStatus === 'invalido' ? <AlertTriangle className="h-8 w-8 text-destructive" /> : <HelpCircle className="h-8 w-8 text-orange-500" />}
              <div>
                <p className={`font-heading font-bold text-lg ${verifStatus === 'valido' ? 'text-primary' : verifStatus === 'invalido' ? 'text-destructive' : 'text-orange-500'}`}>VERIFICAÇÃO DE AUTENTICIDADE</p>
                <p className="text-sm text-muted-foreground capitalize">{verifStatus}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Formato válido:</span> {result.verification.formato_valido ? 'Sim' : 'Não'}</p>
              <p><span className="text-muted-foreground">Dígitos:</span> {result.verification.numero_digitos}</p>
              <p><span className="text-muted-foreground">Observações:</span> {result.verification.observacoes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}