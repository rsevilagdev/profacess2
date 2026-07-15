import { useState, useRef } from 'react';
import { AlertTriangle, Camera, Loader2, X, CheckCircle2, ScanText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/image-compress.js';

export default function CnhRequiredModal({ open, onClose, onCaptured, colaboradorNome }) {
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCapturing(true);
    setError('');
    setPreview(URL.createObjectURL(file));
    try {
      const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.7 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise a imagem da Carteira Nacional de Habilitação (CNH) brasileira e extraia:
1. Nome completo do condutor
2. Número do registro da CNH

Retorne APENAS os dados no formato JSON. Se algum campo não for legível, retorne string vazia.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome completo do condutor' },
            cnh: { type: 'string', description: 'Número do registro da CNH' }
          }
        }
      });

      // Verificar se o nome reconhecido corresponde ao colaborador selecionado
      let match = null;
      if (result.nome && colaboradorNome) {
        const nomeReconhecido = result.nome.toUpperCase().trim();
        const nomeColaborador = colaboradorNome.toUpperCase().trim();
        const nomesC = nomeColaborador.split(/\s+/);
        const nomesR = nomeReconhecido.split(/\s+/);
        const intersection = nomesC.filter(n => nomesR.includes(n) && n.length > 2);
        match = intersection.length >= 2 ? 'match' : 'mismatch';
      }

      setMatchResult({ nome: result.nome || '', cnh: result.cnh || '', match });
      onCaptured({ foto_cnh: file_url, nome: result.nome || '', cnh: result.cnh || '' });

      if (!result.nome && !result.cnh) {
        setError('Não foi possível identificar os dados da CNH. Tente outra foto com melhor qualidade.');
      }
    } catch (err) {
      setError('Erro ao processar CNH: ' + (err.message || 'desconhecido'));
    }
    setCapturing(false);
  };

  const canClose = matchResult && (matchResult.nome || matchResult.cnh);

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6 fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Foto da CNH Obrigatória</h3>
              <p className="text-xs text-muted-foreground">É necessário capturar a foto da CNH para continuar</p>
            </div>
          </div>
          {canClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!preview ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {colaboradorNome
                ? `O colaborador "${colaboradorNome}" não possui foto da CNH cadastrada. Capture a foto agora para prosseguir.`
                : 'Nenhuma foto da CNH foi capturada. Capture a foto agora para prosseguir.'}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={capturing}
              className="h-14 rounded-2xl w-full"
              size="lg"
            >
              {capturing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              {capturing ? 'Processando...' : 'Capturar Foto da CNH'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img src={preview} alt="CNH" className="w-full max-h-48 object-contain rounded-xl border border-border" />
              {!canClose && (
                <button
                  onClick={() => { setPreview(''); setMatchResult(null); setError(''); }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-foreground/70 text-background flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {capturing && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analisando imagem e comparando dados...</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            {matchResult && !error && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Nome reconhecido:</p>
                  <p className="text-sm font-medium">{matchResult.nome || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-2 mb-1">CNH:</p>
                  <p className="text-sm font-medium">{matchResult.cnh || '—'}</p>
                </div>

                {colaboradorNome && matchResult.match === 'match' && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700">Dados da CNH correspondem ao colaborador cadastrado.</p>
                  </div>
                )}
                {colaboradorNome && matchResult.match === 'mismatch' && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">Atenção: o nome da CNH pode não corresponder ao colaborador selecionado. Verifique antes de prosseguir.</p>
                  </div>
                )}
              </div>
            )}

            {canClose && (
              <Button onClick={onClose} className="h-12 rounded-2xl w-full">
                <CheckCircle2 className="h-5 w-5" /> Confirmar e Continuar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}