import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlacaExistsModal({ placa, nome, open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
        </div>
        <h2 className="font-heading font-bold text-lg mb-2">Placa Já Cadastrada</h2>
        <p className="text-sm text-muted-foreground mb-4">
          A placa <strong className="text-foreground">{placa}</strong> já existe no sistema
          {nome && <> e pertence a <strong className="text-foreground">{nome}</strong></>}.
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          Deseja continuar cadastrando ou cancelar o registro?
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onCancel}>
            <X className="h-5 w-5" /> Cancelar Registro
          </Button>
          <Button className="flex-1 h-12 rounded-2xl" onClick={onConfirm}>
            <Check className="h-5 w-5" /> Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}