import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Truck, User } from 'lucide-react';

export default function CadastroForm({ veiculo, motorista, placa, cpf, onSubmit, loading }) {
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
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Preencha os dados abaixo para solicitar cadastro. O acesso só será liberado após aprovação do administrador.</p>

      {needVeiculo && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Dados do Veículo — {placa.toUpperCase()}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={vModelo} onChange={e => setVModelo(e.target.value)} placeholder="Modelo *" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={vCor} onChange={e => setVCor(e.target.value)} placeholder="Cor" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={vTipo} onChange={e => setVTipo(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="caminhao">Caminhão</option>
              <option value="utilitario">Utilitário</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="outros">Outros</option>
            </select>
            <input value={vTransportadora} onChange={e => setVTransportadora(e.target.value)} placeholder="Transportadora" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      )}

      {needMotorista && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Dados do Motorista — {cpf}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Nome completo *" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={mCnh} onChange={e => setMCnh(e.target.value)} placeholder="CNH" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="date" value={mCnhValidade} onChange={e => setMCnhValidade(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={mTelefone} onChange={e => setMTelefone(e.target.value)} placeholder="Telefone" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={mTransportadora} onChange={e => setMTransportadora(e.target.value)} placeholder="Transportadora" className="h-10 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="h-10 rounded-xl w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar Solicitação de Cadastro
      </Button>
    </div>
  );
}