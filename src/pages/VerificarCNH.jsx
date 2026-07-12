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
    if (!cnh || !cpf) return;
    setLoading(true); setResult(null);
    const cpfDigits = cpf.replace(/\D/g, '');
    try {
      const drivers = await base44.entities.Driver.filter({ cnh });
      let status, message;
      if (drivers.length > 0) {
        const driver = drivers[0];
        if (driver.status === 'bloqueado') { status = 'invalid'; message = 'Motorista bloqueado'; }
        else if (driver.cpf !== cpfDigits) { status = 'invalid'; message = 'CPF não corresponde ao CNH'; }
        else if (driver.cnh_validade && new Date(driver.cnh_validade) < new Date()) { status = 'invalid'; message = 'CNH vencida'; }
        else { status = 'valid'; message = 'CNH válida e verificada'; }
      } else {
        status = 'inconclusive'; message = 'CNH não encontrada na base de dados';
      }
      setResult({ status, message });

      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf, action: 'Verificação de CNH',
        details: `CNH: ${cnh}, CPF: ${formatCPF(cpf)}, Status: ${status === 'valid' ? 'Válido' : status === 'invalid' ? 'Inválido' : 'Inconclusivo'}`,
        ip_address: 'local', domain: window.location.hostname, category: 'search', branch_id: colaborador.filial_id
      });
    } catch (e) { setResult({ status: 'error', message: 'Erro na verificação' }); }
    setLoading(false);
  };

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
            <input type="text" value={cnh} onChange={e => setCnh(e.target.value)} placeholder="Digite o número da CNH" className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CPF do Motorista</label>
            <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <Button onClick={verificar} disabled={loading || !cnh || !cpf} className="w-full h-12 rounded-2xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Verificar
          </Button>
        </div>
      </div>

      {result && (
        <div className={`rounded-2xl p-5 border ${result.status === 'valid' ? 'bg-primary/5 border-primary/20' : result.status === 'invalid' ? 'bg-destructive/5 border-destructive/20' : 'bg-orange-500/5 border-orange-500/20'} fade-in max-w-md`}>
          <div className="flex items-center gap-3">
            {result.status === 'valid' ? <CheckCircle className="h-8 w-8 text-primary" /> : result.status === 'invalid' ? <AlertTriangle className="h-8 w-8 text-destructive" /> : <HelpCircle className="h-8 w-8 text-orange-500" />}
            <div>
              <p className={`font-heading font-bold text-lg ${result.status === 'valid' ? 'text-primary' : result.status === 'invalid' ? 'text-destructive' : 'text-orange-500'}`}>
                {result.status === 'valid' ? 'VÁLIDO' : result.status === 'invalid' ? 'INVÁLIDO' : 'INCONCLUSIVO'}
              </p>
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}