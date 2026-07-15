import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, User, X, Save, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function ReviewDialog({ review, onDecide, loading, onClose }) {
  const raw = review?.dados_json ? (() => { try { return JSON.parse(review.dados_json); } catch { return {}; } })() : {};

  const [vPlaca, setVPlaca] = useState(raw.veiculo?.placa || raw.veiculo_existente?.placa || '');
  const [vModelo, setVModelo] = useState(raw.veiculo?.modelo || '');
  const [mNome, setMNome] = useState(raw.motorista?.nome || raw.motorista_existente?.nome || '');
  const [mCpf, setMCpf] = useState(raw.motorista?.cpf || raw.motorista_existente?.cpf || '');

  const hasVeiculo = !!raw.veiculo;
  const hasVeiculoExistente = !!raw.veiculo_existente;
  const hasMotorista = !!raw.motorista;
  const hasMotoristaExistente = !!raw.motorista_existente;

  const showVeiculoSection = hasVeiculo || hasVeiculoExistente;
  const showMotoristaSection = hasMotorista || hasMotoristaExistente;

  const [veiculoStatus, setVeiculoStatus] = useState(showVeiculoSection ? 'validado' : null);
  const [motoristaStatus, setMotoristaStatus] = useState(showMotoristaSection ? 'validado' : null);
  const [veiculoMotivo, setVeiculoMotivo] = useState('');
  const [motoristaMotivo, setMotoristaMotivo] = useState('');

  if (!review) return null;

  const handleSave = () => {
    const editedData = {};
    if (hasVeiculo) {
      editedData.veiculo = { placa: vPlaca.toUpperCase(), modelo: vModelo };
    }
    if (hasVeiculoExistente) {
      editedData.veiculo_existente = { id: raw.veiculo_existente.id, placa: vPlaca.toUpperCase(), status: raw.veiculo_existente.status };
    }
    if (hasMotorista) {
      editedData.motorista = { nome: mNome, cpf: mCpf.replace(/\D/g, '') };
    }
    if (hasMotoristaExistente) {
      editedData.motorista_existente = { id: raw.motorista_existente.id, cpf: mCpf.replace(/\D/g, ''), nome: mNome, status: raw.motorista_existente.status };
    }

    const decisions = {};
    if (showVeiculoSection) {
      decisions.veiculo = veiculoStatus;
      if (veiculoStatus === 'bloqueado' && veiculoMotivo.trim()) {
        decisions.veiculoMotivo = veiculoMotivo.trim();
      }
    }
    if (showMotoristaSection) {
      decisions.motorista = motoristaStatus;
      if (motoristaStatus === 'bloqueado' && motoristaMotivo.trim()) {
        decisions.motoristaMotivo = motoristaMotivo.trim();
      }
    }
    onDecide(decisions, editedData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-lg">Revisar Cadastro</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">Solicitante</p>
          <p className="text-sm font-medium">{review.solicitante_nome}</p>
          <p className="text-xs text-muted-foreground mt-1">{review.motivo}</p>
        </div>

        {/* Veículo */}
        {showVeiculoSection && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{hasVeiculoExistente ? 'Veículo Existente' : 'Veículo'}</p>
              {hasVeiculoExistente && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">{raw.veiculo_existente.status}</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placa</label>
                <input value={vPlaca} onChange={e => setVPlaca(e.target.value.toUpperCase())} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                <input value={vModelo} onChange={e => setVModelo(e.target.value)} placeholder="Modelo" className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Decisão do Veículo:</label>
              <button onClick={() => setVeiculoStatus('validado')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${veiculoStatus === 'validado' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                <CheckCircle className="h-3.5 w-3.5" /> Validar
              </button>
              <button onClick={() => setVeiculoStatus('bloqueado')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${veiculoStatus === 'bloqueado' ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-accent'}`}>
                <XCircle className="h-3.5 w-3.5" /> Bloquear
              </button>
            </div>
            {veiculoStatus === 'bloqueado' && (
              <input value={veiculoMotivo} onChange={e => setVeiculoMotivo(e.target.value)} placeholder="Motivo do bloqueio do veículo *" className="mt-2 w-full h-10 px-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30" />
            )}
          </div>
        )}

        {/* Motorista */}
        {showMotoristaSection && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{hasMotoristaExistente ? 'Motorista Existente' : 'Motorista'}</p>
              {hasMotoristaExistente && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">{raw.motorista_existente.status}</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input value={mNome} onChange={e => setMNome(e.target.value)} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
                <input value={formatCPF(mCpf)} onChange={e => setMCpf(e.target.value)} maxLength={14} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Decisão do Motorista:</label>
              <button onClick={() => setMotoristaStatus('validado')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${motoristaStatus === 'validado' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                <CheckCircle className="h-3.5 w-3.5" /> Validar
              </button>
              <button onClick={() => setMotoristaStatus('bloqueado')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${motoristaStatus === 'bloqueado' ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-accent'}`}>
                <XCircle className="h-3.5 w-3.5" /> Bloquear
              </button>
            </div>
            {motoristaStatus === 'bloqueado' && (
              <input value={motoristaMotivo} onChange={e => setMotoristaMotivo(e.target.value)} placeholder="Motivo do bloqueio do motorista *" className="mt-2 w-full h-10 px-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30" />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 h-11 rounded-xl"
            disabled={loading || (veiculoStatus === 'bloqueado' && !veiculoMotivo.trim()) || (motoristaStatus === 'bloqueado' && !motoristaMotivo.trim())}
            onClick={handleSave}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Decisões
          </Button>
        </div>
      </div>
    </div>
  );
}