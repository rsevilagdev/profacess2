import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Truck, User, X, AlertTriangle } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function CadastroForm({ veiculo, motorista, placa, cpf, onSubmit, loading, onClose }) {
  const [vModelo, setVModelo] = useState('');
  const [mNome, setMNome] = useState('');
  const [mSobrenome, setMSobrenome] = useState('');

  const needVeiculo = !veiculo;
  const needMotorista = !motorista;

  const handleSubmit = () => {
    const dados = {};
    if (needVeiculo) {
      dados.veiculo = { placa: placa.toUpperCase(), modelo: vModelo };
    } else if (veiculo && veiculo.status !== 'validado') {
      dados.veiculo_existente = { id: veiculo.id, placa: veiculo.placa, status: veiculo.status };
    }
    if (needMotorista) {
      const cpfDigits = cpf.replace(/\D/g, '');
      dados.motorista = { nome: `${mNome} ${mSobrenome}`.trim(), cpf: cpfDigits };
    } else if (motorista && motorista.status !== 'validado') {
      dados.motorista_existente = { id: motorista.id, cpf: motorista.cpf, nome: motorista.nome, status: motorista.status };
    }
    onSubmit(dados);
  };

  const canSubmit = (!needVeiculo || vModelo.trim()) && (!needMotorista || (mNome.trim() && mSobrenome.trim()));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="font-heading font-bold text-lg">Mandar para Revisão</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Preencha os dados abaixo para solicitar cadastro. O acesso só será liberado após aprovação.</p>

        {needVeiculo ? (
          <div className="bg-muted/30 rounded-xl p-3 border border-border mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Dados do Veículo</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placa</label>
                <input value={placa.toUpperCase()} disabled className="h-10 px-3 rounded-lg border border-input bg-muted text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo *</label>
                <input value={vModelo} onChange={e => setVModelo(e.target.value)} placeholder="Modelo do veículo" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        ) : veiculo && veiculo.status !== 'validado' && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              <p className="text-sm">Veículo encontrado — Status: <span className="font-medium">{veiculo.status}</span></p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Será enviada solicitação para revisão do status.</p>
          </div>
        )}

        {needMotorista ? (
          <div className="bg-muted/30 rounded-xl p-3 border border-border mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Dados do Motorista</p>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
                <input value={formatCPF(cpf)} disabled className="h-10 px-3 w-full rounded-lg border border-input bg-muted text-sm" />
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                  <input value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Nome" className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sobrenome *</label>
                  <input value={mSobrenome} onChange={e => setMSobrenome(e.target.value)} placeholder="Sobrenome" className="h-10 px-3 w-full rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          </div>
        ) : motorista && motorista.status !== 'validado' && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-orange-500" />
              <p className="text-sm">Motorista encontrado — Status: <span className="font-medium">{motorista.status}</span></p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Será enviada solicitação para revisão do status.</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-11 rounded-xl" disabled={loading || !canSubmit} onClick={handleSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para Revisão
          </Button>
        </div>
      </div>
    </div>
  );
}