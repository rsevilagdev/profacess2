import { useState, useRef } from 'react';
import { Camera, CheckCircle, X, Loader2, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { compressImage } from '@/lib/image-compress.js';

export default function FotoLiberacaoModal({ registro, onConfirm, onClose, saving }) {
  const [fotoUrl, setFotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (e) {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setUploading(true);
      setError('');
      try {
        const file = await compressImage(blob, { maxWidth: 1024, maxHeight: 1024, quality: 0.6 });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFotoUrl(file_url);
      } catch (e) {
        setError('Erro ao enviar a foto. Tente novamente.');
      }
      setUploading(false);
    }, 'image/jpeg', 0.85);
  };

  const retakePhoto = () => {
    setFotoUrl(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleConfirm = () => {
    if (!fotoUrl) return;
    stopCamera();
    onConfirm(fotoUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-lg">Foto de Liberação — Obrigatória</h2>
          </div>
          <button onClick={handleClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-xl p-3 mb-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Veículo</p>
          <p className="font-medium text-sm">{registro.placa} — {registro.transportadora}</p>
          {registro.motorista && <p className="text-xs text-muted-foreground">Motorista: {registro.motorista}</p>}
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          É obrigatório tirar uma foto de comprovação para liberar a saída do veículo.
        </p>

        {/* Camera / Photo area */}
        <div className="bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
          {!cameraActive && !fotoUrl && (
            <button onClick={startCamera} className="flex flex-col items-center gap-2 text-white/80 hover:text-white">
              <Camera className="h-12 w-12" />
              <span className="text-sm">Iniciar Câmera</span>
            </button>
          )}
          {cameraActive && !fotoUrl && (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <div className="h-10 w-10 rounded-full bg-primary" />
              </button>
            </>
          )}
          {fotoUrl && (
            <img src={fotoUrl} alt="Foto de liberação" className="w-full h-full object-cover" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <span className="text-sm">Enviando foto...</span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {fotoUrl && (
          <div className="flex items-center gap-2 mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-primary font-medium">Foto capturada e salva com sucesso!</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {fotoUrl && (
            <Button variant="secondary" className="h-11 rounded-xl" onClick={retakePhoto} disabled={uploading}>
              <RefreshCw className="h-4 w-4" /> Refazer Foto
            </Button>
          )}
          <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={handleClose} disabled={uploading || saving}>
            Cancelar
          </Button>
          <Button className="flex-1 h-11 rounded-xl" disabled={!fotoUrl || uploading || saving} onClick={handleConfirm}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Confirmar Saída
          </Button>
        </div>
      </div>
    </div>
  );
}