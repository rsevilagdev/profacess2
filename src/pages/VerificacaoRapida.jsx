import { useState } from 'react';
import { Search, Truck, Users, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function VerificacaoRapida() {
  const [placa, setPlaca] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [veiculo, setVeiculo] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [searched, setSearched] = useState(false);

  const buscar = async () => {
    if (!placa && !cpf.replace(/\D/g, '')) return;
    setLoading(true);
    setSearched(false);
    setVeiculo(null);
    setMotorista(null);
    try {
      const cpfDigits = cpf.replace(/\D/g, '');
      const [veiculos, motoristas] = await Promise.all([
        placa ? base44.entities.Vehicle.filter({ placa: placa.toUpperCase() }).catch(() => []) : Promise.resolve([]),
        cpfDigits ? base44.entities.Driver.filter({ cpf: cpfDigits }).catch(() => []) : Promise.resolve([]),
      ]);
      setVeiculo(veiculos.length > 0 ? veiculos[0] : null);
      setMotorista(motoristas.length > 0 ? motoristas[0] : null);
    } catch (e) {}
    setLoading(false);
    setSearched(true);
  };

  const reset = () => {
    setPlaca(''); setCpf(''); setVeiculo(null); setMotorista(null); setSearched(false);
  };

  const StatusBadge = ({ status }) => {
    const config = {
      validado: { label: 'Validado', color: 'bg-primary/10 text-primary', icon: CheckCircle },
      bloqueado: { label: 'Bloqueado', color: 'bg-destructive/10 text-destructive', icon: XCircle },
      pendente_revisao: { label: 'Pendente de Revisão', color: 'bg-orange-500/10 text-orange-600', icon: ShieldCheck },
    };
    const c = config[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: ShieldCheck };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${c.color}`}>
        <Icon className="h-3.5 w-3.5" /> {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Verificação Rápida</h1>
        <p className="text-sm text-muted-foreground">Consulte veículos e motoristas instantaneamente</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Placa do Veículo</label>
            <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="ABC1234" className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring uppercase" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CPF do Motorista</label>
            <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="000.000.000-00" maxLength={14} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={buscar} disabled={loading || (!placa && !cpf.replace(/\D/g, ''))} className="h-12 rounded-2xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Verificar
          </Button>
          {(placa || cpf) && (
            <Button variant="secondary" onClick={reset} className="h-12 rounded-2xl">Limpar</Button>
          )}
        </div>
      </div>

      {searched && (
        <div className="grid sm:grid-cols-2 gap-4 fade-in">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold">Veículo</h3>
            </div>
            {veiculo ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Placa</p>
                  <p className="text-lg font-bold">{veiculo.placa}</p>
                </div>
                {veiculo.modelo && (
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="text-sm">{veiculo.modelo}</p>
                  </div>
                )}
                {veiculo.transportadora && (
                  <div>
                    <p className="text-xs text-muted-foreground">Transportadora</p>
                    <p className="text-sm">{veiculo.transportadora}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={veiculo.status} />
                </div>
                {veiculo.observacao && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observação</p>
                    <p className="text-sm">{veiculo.observacao}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <XCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {placa ? `Veículo ${placa.toUpperCase()} não encontrado` : 'Nenhuma placa informada'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold">Motorista</h3>
            </div>
            {motorista ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-lg font-bold">{motorista.nome}</p>
                </div>
                {motorista.cpf && (
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="text-sm">{formatCPF(motorista.cpf)}</p>
                  </div>
                )}
                {motorista.transportadora && (
                  <div>
                    <p className="text-xs text-muted-foreground">Transportadora</p>
                    <p className="text-sm">{motorista.transportadora}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={motorista.status} />
                </div>
                {motorista.observacao && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observação</p>
                    <p className="text-sm">{motorista.observacao}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <XCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {cpf.replace(/\D/g, '') ? 'Motorista não encontrado' : 'Nenhum CPF informado'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}