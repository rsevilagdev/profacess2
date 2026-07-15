import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Truck, User, X, AlertTriangle } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function CadastroForm({ veiculo, motorista, placa, cpf, onSubmit, loading, onClose }) {
  const [vModelo, setVModelo] = useState('');
  const [vCor, setVCor] = useState('');
  const [vTipo, setVTipo] = useState('caminhao');
  const [vTransportadora, setVTransportadora] = useState('');
  const [mNome, setMNome] = useState('');
  const [mCnh, setMCnh] = useState('');
  const [mCnhValidade, setMCnhValidade] = useState('');
  const [mTelefone, setMTelefone] = useState('');
  const [mTransportadora, setMTransportadora] = useState('');

  const needVeiculo = !veiculo;
  const needMotorista = !motorista;

  const handleSubmit = () => {
    const dados = {};
    if (needVeiculo) {
      dados.veiculo = { placa: placa.toUpperCase(), modelo: vModelo, cor: vCor, tipo: vTipo, transportadora: vTransportadora };
    }
    if (needMotorista) {
      dados.motorista = { nome: mNome, cpf: cpf.replace(/\D/g, ''), cnh: mCnh, cnh_validade: mCnhValidade, telefone: mTelefone, transportadora: mTransportadora };
    }
    onSubmit(dados);
  };

  const canSubmit = (!needVeiculo || vModelo.trim()) && (!needMotorista || mNome.trim());

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
        <p className="text-sm text-muted-foreground mb-4">Preencha os dados abaixo para solicitar cadastro. O acesso só será liberado após aprovação do administrador.</p>

        {needVeiculo && (
          <div className="bg-muted/30 rounded-xl p-3 border border-border mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Dados do Veículo — {placa.toUpperCase()}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={vModelo} onChange={e => setVModelo(e.target.value)} placeholder="Modelo *" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={vCor} onChange={e => setVCor(e.target.value)} placeholder="Cor" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <select value={vTipo} onChange={e => setVTipo(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="caminhao">Caminhão</option>
                <option value="utilitario">Utilitário</option>
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
                <option value="outros">Outros</option>
              </select>
              <input value={vTransportadora} onChange={e => setVTransportadora(e.target.value)} placeholder="Transportadora" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        )}

        {needMotorista && (
          <div className="bg-muted/30 rounded-xl p-3 border border-border mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Dados do Motorista — {formatCPF(cpf)}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Nome completo *" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={mCnh} onChange={e => setMCnh(e.target.value)} placeholder="CNH" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="date" value={mCnhValidade} onChange={e => setMCnhValidade(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={mTelefone} onChange={e => setMTelefone(e.target.value)} placeholder="Telefone" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={mTransportadora} onChange={e => setMTransportadora(e.target.value)} placeholder="Transportadora" className="h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
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