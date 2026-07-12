import { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, AlertTriangle, CheckCircle, XCircle, Loader2, FileSpreadsheet, RefreshCw, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function VerificacaoMotoristas() {
  const { colaborador } = useProfarmaAuth();
  const [searchCpf, setSearchCpf] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allDrivers, setAllDrivers] = useState([]);
  const [syncModal, setSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    base44.entities.Driver.list('-created_date', 500).then(setAllDrivers).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchCpf) return;
    setSearching(true); setSearched(true); setResult(null);
    const cpfDigits = searchCpf.replace(/\D/g, '');
    try {
      const drivers = await base44.entities.Driver.filter({ cpf: cpfDigits });
      if (drivers.length > 0) {
        setResult(drivers[0]);
        await base44.entities.AuditLog.create({
          user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
          user_cpf: colaborador.cpf, action: 'Verificação de motorista',
          details: `CPF consultado: ${cpfDigits} | Encontrado: ${drivers[0].nome}`,
          ip_address: 'local', domain: window.location.hostname, category: 'search', branch_id: colaborador.filial_id
        });
      } else {
        setResult({ notFound: true, cpf: cpfDigits });
        await base44.entities.AuditLog.create({
          user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
          user_cpf: colaborador.cpf, action: 'Verificação de motorista',
          details: `CPF consultado: ${cpfDigits} | Não encontrado`,
          ip_address: 'local', domain: window.location.hostname, category: 'search', branch_id: colaborador.filial_id
        });
      }
    } catch (e) { setResult({ error: e.message }); }
    setSearching(false);
  };

  const checkCnhStatus = (validade) => {
    if (!validade) return { label: 'Sem data', color: 'text-muted-foreground', icon: AlertTriangle };
    const today = new Date();
    const exp = new Date(validade);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'CNH Vencida', color: 'text-destructive', icon: XCircle };
    if (diffDays <= 30) return { label: `Vence em ${diffDays} dias`, color: 'text-orange-600', icon: AlertTriangle };
    return { label: 'CNH Válida', color: 'text-primary', icon: CheckCircle };
  };

  const stats = {
    total: allDrivers.length,
    ativos: allDrivers.filter(d => d.status === 'ativo').length,
    bloqueados: allDrivers.filter(d => d.status === 'bloqueado').length,
    pendentes: allDrivers.filter(d => d.status === 'pendente').length,
    verificados: allDrivers.filter(d => d.documento_verificado).length,
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Verificação de Motoristas</h1>
          <p className="text-sm text-muted-foreground">Pesquise por CPF e verifique documentos e status de cadastro</p>
        </div>
        <Button onClick={() => setSyncModal(true)} variant="secondary" className="h-12 rounded-2xl">
          <FileSpreadsheet className="h-5 w-5 mr-1" /> Sincronizar Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Ativos" value={stats.ativos} color="text-primary" />
        <StatCard label="Bloqueados" value={stats.bloqueados} color="text-destructive" />
        <StatCard label="Pendentes" value={stats.pendentes} color="text-orange-600" />
        <StatCard label="Docs Verificados" value={stats.verificados} color="text-primary" />
      </div>

      {/* Search */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Verificar Motorista</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text" value={searchCpf} onChange={e => setSearchCpf(formatCPF(e.target.value))}
              placeholder="Digite o CPF do motorista..." maxLength={14}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="h-12 rounded-2xl">
            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Verificar
          </Button>
        </div>
      </div>

      {/* Result */}
      {searched && result && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          {result.notFound ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 text-destructive/50 mx-auto mb-3" />
              <p className="text-lg font-heading font-bold text-destructive">Motorista não encontrado</p>
              <p className="text-sm text-muted-foreground">CPF: {result.cpf} não está cadastrado na base de dados</p>
            </div>
          ) : result.error ? (
            <div className="text-center py-8"><p className="text-sm text-destructive">Erro: {result.error}</p></div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                {result.status === 'ativo' ? <UserCheck className="h-10 w-10 text-primary" /> : <UserX className="h-10 w-10 text-destructive" />}
                <div>
                  <h3 className="font-heading font-bold text-lg">{result.nome} {result.sobrenome || ''}</h3>
                  <p className="text-sm text-muted-foreground">CPF: {result.cpf}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-3 py-1 rounded-full ${result.status === 'ativo' ? 'bg-primary/10 text-primary' : result.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                  {result.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <InfoBox label="CNH" value={result.cnh || '—'} />
                <InfoBox label="Validade CNH" value={result.cnh_validade ? new Date(result.cnh_validade).toLocaleDateString('pt-BR') : '—'} />
                <InfoBox label="Telefone" value={result.telefone || '—'} />
                <InfoBox label="Transportadora" value={result.transportadora || '—'} />
                <InfoBox label="Status Opentech" value={result.status_opentech || '—'} />
                <InfoBox label="Filial" value={result.filial_nome || '—'} />
              </div>

              {/* CNH Status */}
              <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 bg-muted/50 ${checkCnhStatus(result.cnh_validade).color}`}>
                {(() => { const CnhIcon = checkCnhStatus(result.cnh_validade).icon; return <CnhIcon className="h-5 w-5" />; })()}
                <span className="text-sm font-medium">{checkCnhStatus(result.cnh_validade).label}</span>
              </div>

              {/* Document verification */}
              <div className={`mt-2 p-3 rounded-xl flex items-center gap-2 bg-muted/50 ${result.documento_verificado ? 'text-primary' : 'text-orange-600'}`}>
                {result.documento_verificado ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                <span className="text-sm font-medium">{result.documento_verificado ? 'Documento verificado' : 'Documento não verificado'}</span>
              </div>

              {result.observacao && (
                <div className="mt-2 p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observação:</p>
                  <p className="text-sm">{result.observacao}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync Modal */}
      {syncModal && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">Sincronizar com Excel</h2>
              <button onClick={() => setSyncModal(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <p className="text-sm">Conecte sua conta Microsoft Excel para sincronizar a planilha compartilhada de motoristas com a base de dados.</p>
              </div>
              <p className="text-xs text-muted-foreground">A sincronização lê a planilha e atualiza os registros de motoristas (CPF, nome, status Opentech). Registros existentes são atualizados; novos são criados.</p>
              {syncResult && (
                <div className={`p-3 rounded-xl ${syncResult.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  <p className="text-sm">{syncResult.message}</p>
                </div>
              )}
              <Button
                onClick={async () => {
                  setSyncing(true); setSyncResult(null);
                  try {
                    const res = await base44.functions.invoke('sincronizarMotoristasExcel', {});
                    const d = res.data;
                    if (d.success) {
                      setSyncResult({ success: true, message: `${d.created} criados, ${d.updated} atualizados, ${d.errors} erros.` });
                      base44.entities.Driver.list('-created_date', 500).then(setAllDrivers);
                    } else {
                      setSyncResult({ success: false, message: d.error || 'Erro na sincronização.' });
                    }
                  } catch (e) {
                    setSyncResult({ success: false, message: 'Função de sincronização não disponível. Autorize a conexão do Excel primeiro.' });
                  }
                  setSyncing(false);
                }}
                disabled={syncing} className="w-full h-12 rounded-2xl"
              >
                {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar Agora
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-foreground' }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
function InfoBox({ label, value }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}