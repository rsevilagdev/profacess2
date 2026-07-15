import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Truck, User, X, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

export default function ReviewResultModal() {
  const { colaborador } = useProfarmaAuth();
  const [pendingResults, setPendingResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const loadPending = async () => {
    if (!colaborador?.cpf) return;
    try {
      const all = await base44.entities.ReviewRequest.filter({ solicitante_cpf: colaborador.cpf }, '-created_date', 50);
      const pending = all.filter(r => r.status === 'aprovado' && !r.operador_confirmou);
      setPendingResults(pending);
    } catch (e) {}
  };

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 15000);
    return () => clearInterval(interval);
  }, [colaborador?.cpf]);

  useEffect(() => {
    const unsub = base44.entities.ReviewRequest.subscribe(() => loadPending());
    return unsub;
  }, [colaborador?.cpf]);

  const confirm = async () => {
    const review = pendingResults[currentIndex];
    if (!review) return;
    setConfirming(true);
    try {
      await base44.entities.ReviewRequest.update(review.id, { operador_confirmou: true });
      setPendingResults(prev => prev.filter((_, i) => i !== currentIndex));
      setCurrentIndex(0);
    } catch (e) {}
    setConfirming(false);
  };

  if (pendingResults.length === 0) return null;

  const review = pendingResults[currentIndex];
  if (!review) return null;

  const hasVeiculo = review.resultado_veiculo;
  const hasMotorista = review.resultado_motorista;

  return (
    <div className="fixed inset-0 z-[70] bg-foreground/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">Resultado da Revisão</h2>
              <p className="text-xs text-muted-foreground">Sua solicitação foi revisada</p>
            </div>
          </div>
          {pendingResults.length > 1 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {currentIndex + 1}/{pendingResults.length}
            </span>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {/* Veículo Result */}
          {hasVeiculo && (
            <div className={`p-3 rounded-xl border ${review.resultado_veiculo === 'validado' ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                {review.resultado_veiculo === 'validado'
                  ? <CheckCircle className="h-5 w-5 text-primary" />
                  : <XCircle className="h-5 w-5 text-destructive" />
                }
                <div className="flex items-center gap-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Veículo</p>
                </div>
              </div>
              <p className="text-sm ml-7">
                <span className={`font-bold ${review.resultado_veiculo === 'validado' ? 'text-primary' : 'text-destructive'}`}>
                  {review.resultado_veiculo === 'validado' ? 'VALIDADO' : 'BLOQUEADO'}
                </span>
              </p>
              {review.motivo_bloqueio_veiculo && (
                <p className="text-xs text-destructive mt-1 ml-7">Motivo: {review.motivo_bloqueio_veiculo}</p>
              )}
            </div>
          )}

          {/* Motorista Result */}
          {hasMotorista && (
            <div className={`p-3 rounded-xl border ${review.resultado_motorista === 'validado' ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                {review.resultado_motorista === 'validado'
                  ? <CheckCircle className="h-5 w-5 text-primary" />
                  : <XCircle className="h-5 w-5 text-destructive" />
                }
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Motorista</p>
                </div>
              </div>
              <p className="text-sm ml-7">
                <span className={`font-bold ${review.resultado_motorista === 'validado' ? 'text-primary' : 'text-destructive'}`}>
                  {review.resultado_motorista === 'validado' ? 'VALIDADO' : 'BLOQUEADO'}
                </span>
              </p>
              {review.motivo_bloqueio_motorista && (
                <p className="text-xs text-destructive mt-1 ml-7">Motivo: {review.motivo_bloqueio_motorista}</p>
              )}
            </div>
          )}
        </div>

        {((hasVeiculo && review.resultado_veiculo === 'validado') || (hasMotorista && review.resultado_motorista === 'validado')) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-primary">
              ✓ {[
                hasVeiculo && review.resultado_veiculo === 'validado' ? 'veículo' : null,
                hasMotorista && review.resultado_motorista === 'validado' ? 'motorista' : null,
              ].filter(Boolean).join(' e ')} validado(s). Você pode buscar novamente a placa/CPF para registrar o acesso.
            </p>
          </div>
        )}

        <Button onClick={confirm} disabled={confirming} className="w-full h-12 rounded-2xl">
          {confirming ? 'Confirmando...' : 'Confirmar e Fechar'}
        </Button>
      </div>
    </div>
  );
}