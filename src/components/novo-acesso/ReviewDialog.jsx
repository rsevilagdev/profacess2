import { Button } from '@/components/ui/button';
import { Truck, User, X, Clock, Ban, CheckCircle, Loader2, FileText } from 'lucide-react';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function ReviewDialog({ review, onDecide, loading, onClose }) {
  if (!review) return null;

  const dados = review.dados_json ? (() => { try { return JSON.parse(review.dados_json); } catch { return {}; } })() : {};

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

        {/* Solicitante */}
        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">Solicitante</p>
          <p className="text-sm font-medium">{review.solicitante_nome}</p>
          <p className="text-xs text-muted-foreground mt-1">{review.motivo}</p>
          {review.observacao && <p className="text-xs text-muted-foreground mt-1 italic">{review.observacao}</p>}
        </div>

        {/* Dados do Veículo */}
        {dados.veiculo && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Veículo — {dados.veiculo.placa}</p>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <p><span className="text-foreground/60">Modelo:</span> {dados.veiculo.modelo || '—'}</p>
              <p><span className="text-foreground/60">Cor:</span> {dados.veiculo.cor || '—'}</p>
              <p><span className="text-foreground/60">Tipo:</span> {dados.veiculo.tipo || '—'}</p>
              <p><span className="text-foreground/60">Transportadora:</span> {dados.veiculo.transportadora || '—'}</p>
            </div>
          </div>
        )}

        {/* Dados do Motorista */}
        {dados.motorista && (
          <div className="mb-3 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Motorista</p>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <p><span className="text-foreground/60">Nome:</span> {dados.motorista.nome || '—'}</p>
              <p><span className="text-foreground/60">CPF:</span> {formatCPF(dados.motorista.cpf) || '—'}</p>
              <p><span className="text-foreground/60">CNH:</span> {dados.motorista.cnh || '—'}</p>
              <p><span className="text-foreground/60">Validade CNH:</span> {dados.motorista.cnh_validade || '—'}</p>
              <p><span className="text-foreground/60">Telefone:</span> {dados.motorista.telefone || '—'}</p>
              <p><span className="text-foreground/60">Transportadora:</span> {dados.motorista.transportadora || '—'}</p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground text-center mb-2">Escolha uma das opções abaixo:</p>
          <Button variant="secondary" className="h-11 rounded-xl w-full" disabled={loading} onClick={() => onDecide('pendente')}>
            <Clock className="h-4 w-4" /> Manter Pendente
          </Button>
          <Button variant="destructive" className="h-11 rounded-xl w-full" disabled={loading} onClick={() => onDecide('bloqueado')}>
            <Ban className="h-4 w-4" /> Bloquear
          </Button>
          <Button className="h-11 rounded-xl w-full" disabled={loading} onClick={() => onDecide('validado')}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Validar
          </Button>
        </div>
      </div>
    </div>
  );
}