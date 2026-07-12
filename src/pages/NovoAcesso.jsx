import { useState, useEffect } from 'react';
import { Search, QrCode, Truck, X, CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskPlaca, maskCPF, maskNome } from '@/lib/lgpd-utils.js';
import KanbanBoard from '@/components/novo-acesso/KanbanBoard';

export default function NovoAcesso() {
  const { colaborador } = useProfarmaAuth();
  const [placa, setPlaca] = useState('');
  const [veiculo, setVeiculo] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [gateOpening, setGateOpening] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showReleaseForm, setShowReleaseForm] = useState(null);

  useEffect(() => {
    loadAcessos();
  }, []);

  const loadAcessos = async () => {
    const logs = await base44.entities.AccessLog.list('-created_date', 20);
    setAcessos(logs);
  };

  const buscarVeiculo = async () => {
    setSearchError(''); setVeiculo(null); setMotorista(null); setGateOpen(false);
    if (!placa) return;
    setLoading(true);
    try {
      const veiculos = await base44.entities.Vehicle.filter({ placa: placa.toUpperCase() });
      if (veiculos.length > 0) {
        const v = veiculos[0];
        setVeiculo(v);
        if (v.status === 'bloqueado') {
          setSearchError('VEÍCULO BLOQUEADO - Liberação recusada');
          await base44.entities.AccessLog.create({
            veiculo_placa: v.placa, filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome,
            status: 'bloqueado', operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
            observacao: 'Tentativa de liberação de veículo bloqueado'
          });
          await loadAcessos();
        }
      } else {
        setSearchError('Veículo não encontrado na base de dados');
      }
    } catch (e) { setSearchError('Erro na busca'); }
    setLoading(false);
  };

  const scanQR = async () => {
    setScanning(true); setScanResult(null); setGateOpen(false);
    setTimeout(async () => {
      setScanning(false);
      const motoristas = await base44.entities.Driver.list('-created_date', 20);
      if (motoristas.length > 0) {
        const m = motoristas[0];
        setMotorista(m);
        setScanResult(m.status === 'ativo' ? 'valid' : 'blocked');
        await base44.entities.Driver.update(m.id, { documento_verificado: true });
      } else {
        setScanResult('not_found');
      }
    }, 2000);
  };

  const liberarAcesso = async (log) => {
    await base44.entities.AccessLog.update(log.id, { status: 'liberado' });
    await loadAcessos();
    setShowReleaseForm(null);
  };

  const registrarAcesso = async (carregado) => {
    setGateOpening(true);
    setTimeout(async () => {
      setGateOpening(false); setGateOpen(true);
      await base44.entities.AccessLog.create({
        veiculo_placa: veiculo.placa, motorista_nome: motorista?.nome, motorista_cpf: motorista?.cpf,
        filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome,
        tipo: 'entrada', status: 'liberado', carregado,
        operador_nome: colaborador.nome, operador_cpf: colaborador.cpf
      });
      await base44.entities.Notification.create({
        title: 'Veículo Liberado', message: `Placa: ${maskPlaca(veiculo.placa)} liberado na filial ${colaborador.filial_nome}`,
        type: 'vehicle_release', sender_name: colaborador.nome, branch_id: colaborador.filial_id
      });
      await loadAcessos();
    }, 1500);
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Novo Acesso</h1>
        <p className="text-sm text-muted-foreground">Verificação de placa, QR Code e liberação de cancela</p>
      </div>

      {/* Search Vehicle */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Buscar Veículo</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="Digite a placa..."
              onKeyDown={e => e.key === 'Enter' && buscarVeiculo()}
              className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring uppercase"
            />
          </div>
          <Button onClick={buscarVeiculo} disabled={loading} className="h-12 rounded-2xl px-6">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar'}
          </Button>
        </div>

        {searchError && (
          <div className="mt-3 bg-destructive/10 text-destructive text-sm rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {searchError}
          </div>
        )}

        {veiculo && veiculo.status !== 'bloqueado' && (
          <div className="mt-4 bg-primary/5 rounded-2xl p-4 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{maskPlaca(veiculo.placa)}</p>
                <p className="text-xs text-muted-foreground">{veiculo.transportadora || '—'}</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">Ativo</span>
            </div>

            {/* QR Scanner */}
            {!motorista && (
              <button onClick={scanQR} disabled={scanning} className="w-full h-12 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors">
                {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                {scanning ? 'Escaneando...' : 'Escanear QR Code do Motorista'}
              </button>
            )}

            {/* QR Scanner Animation */}
            {scanning && (
              <div className="relative mt-3 h-48 rounded-2xl bg-foreground/90 overflow-hidden">
                <div className="absolute left-0 right-0 h-0.5 bg-primary laser-scan" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-primary/30" />
                </div>
              </div>
            )}

            {/* Scan Result */}
            {scanResult === 'valid' && motorista && (
              <div className="mt-3 bg-primary/10 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Documento Verificado</p>
                  <p className="text-xs text-muted-foreground">{maskNome(motorista.nome)} · {maskCPF(motorista.cpf)}</p>
                </div>
              </div>
            )}
            {scanResult === 'blocked' && (
              <div className="mt-3 bg-destructive/10 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-sm font-medium text-destructive">Motorista bloqueado</p>
              </div>
            )}

            {/* Gate Control */}
            {scanResult === 'valid' && (
              <div className="mt-4">
                {/* Gate Animation */}
                <div className="bg-muted rounded-2xl p-4 mb-3 h-32 flex items-end justify-center relative overflow-hidden">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground">
                    {gateOpening ? 'ABRINDO CANCELA...' : gateOpen ? 'CANCELA ABERTA' : 'AGUARDANDO LIBERAÇÃO'}
                  </div>
                  {/* Gate bar */}
                  <div className="relative h-1.5 w-32 bg-foreground/20 rounded-full origin-left">
                    <div className={`h-full bg-primary rounded-full transition-transform duration-1000 ${gateOpen ? 'gate-open' : ''}`} />
                  </div>
                  {/* Post */}
                  <div className="absolute left-[calc(50%-5.5rem)] bottom-4 h-8 w-3 bg-foreground/30 rounded" />
                </div>

                {!gateOpen ? (
                  <div className="flex gap-2">
                    <Button onClick={() => registrarAcesso(false)} className="flex-1 h-12 rounded-2xl" disabled={gateOpening}>
                      {gateOpening ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Liberar (Vazio)'}
                    </Button>
                    <Button onClick={() => registrarAcesso(true)} variant="secondary" className="flex-1 h-12 rounded-2xl" disabled={gateOpening}>
                      {gateOpening ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Liberar (Carregado)'}
                    </Button>
                  </div>
                ) : (
                  <div className="bg-primary/10 text-primary text-sm rounded-2xl p-3 flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4" /> Liberação registrada com sucesso
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard acessos={acessos} onRefresh={loadAcessos} />

      {/* Access List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Acessos de Hoje</h3>
        {acessos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum acesso registrado</p>
        ) : (
          <div className="space-y-2">
            {acessos.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${log.status === 'liberado' ? 'bg-primary' : log.status === 'bloqueado' ? 'bg-destructive' : 'bg-orange-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{maskPlaca(log.veiculo_placa)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${log.status === 'liberado' ? 'bg-primary/10 text-primary' : log.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                    {log.status}
                  </span>
                  {log.status === 'acessado' && (
                    <Button size="sm" className="h-8 rounded-xl" onClick={() => liberarAcesso(log)}>
                      Liberar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}