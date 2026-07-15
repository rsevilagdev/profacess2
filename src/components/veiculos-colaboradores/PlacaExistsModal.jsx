import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlacaExistsModal({ placa, nome, open, onClose }) {
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
          Não é necessário cadastrar novamente. Verifique a lista de veículos cadastrados abaixo.
        </p>
        <Button onClick={onClose} className="w-full h-12 rounded-2xl">
          <Check className="h-5 w-5" /> Entendi, Fechar
        </Button>
      </div>
    </div>
  );
}