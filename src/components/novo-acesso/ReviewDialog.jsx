import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, User, X, Save, Loader2, FileText } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function ReviewDialog({ review, onDecide, loading, onClose }) {
  const raw = review?.dados_json ? (() => { try { return JSON.parse(review.dados_json); } catch { return {}; } })() : {};

  const [vPlaca, setVPlaca] = useState(raw.veiculo?.placa || raw.veiculo_existente?.placa || '');
  const [vModelo, setVModelo] = useState(raw.veiculo?.modelo || '');
  const [mNome, setMNome] = useState(raw.motorista?.nome || raw.motorista_existente?.nome || '');
  const [mCpf, setMCpf] = useState(raw.motorista?.cpf || raw.motorista_existente?.cpf || '');
  const [status, setStatus] = useState('validado');

  const hasVeiculo = !!raw.veiculo;
  const hasVeiculoExistente = !!raw.veiculo_existente;
  const hasMotorista = !!raw.motorista;
  const hasMotoristaExistente = !!raw.motorista_existente;

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
    onDecide(status, editedData);
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
        {(hasVeiculo || hasVeiculoExistente) && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{hasVeiculoExistente ? 'Veículo Existente' : 'Veículo'}</p>
              {hasVeiculoExistente && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">{raw.veiculo_existente.status}</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placa</label>
                <input value={vPlaca} onChange={e => setVPlaca(e.target.value.toUpperCase())} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                <input value={vModelo} onChange={e => setVModelo(e.target.value)} placeholder="Modelo" className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        )}

        {/* Motorista */}
        {(hasMotorista || hasMotoristaExistente) && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{hasMotoristaExistente ? 'Motorista Existente' : 'Motorista'}</p>
              {hasMotoristaExistente && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">{raw.motorista_existente.status}</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input value={mNome} onChange={e => setMNome(e.target.value)} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
                <input value={formatCPF(mCpf)} onChange={e => setMCpf(e.target.value)} maxLength={14} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        )}

        {/* Status dropdown */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="validado">Validado</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-11 rounded-xl" disabled={loading} onClick={handleSave}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}