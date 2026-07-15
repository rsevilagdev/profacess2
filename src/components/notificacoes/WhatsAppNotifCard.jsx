import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getWhatsAppConnectURL, checkWhatsAppConnected } from '@/lib/whatsapp-notifier.js';
import { Button } from '@/components/ui/button';

export default function WhatsAppNotifCard() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = async () => {
    setChecking(true);
    const ok = await checkWhatsAppConnected();
    setConnected(ok);
    setChecking(false);
  };

  useEffect(() => { checkStatus(); }, []);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${connected ? 'bg-green-500/15' : 'bg-primary/10'}`}>
          <MessageCircle className={`h-5 w-5 ${connected ? 'text-green-600' : 'text-primary'}`} />
        </div>
        <div>
          <h3 className="font-heading font-bold">Notificações via WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Receba alertas de entrada, saída e problemas diretamente no WhatsApp</p>
        </div>
      </div>

      <div className={`rounded-xl p-3 border ${connected ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/50 border-border'}`}>
        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
          </div>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">WhatsApp conectado</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={checkStatus}>
              Atualizar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>WhatsApp ainda não conectado</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Conecte seu WhatsApp para receber notificações automáticas de:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>🚛 Entrada e saída de veículos</li>
              <li>⚠️ Problemas com placas ou motoristas</li>
              <li>👤 Cadastro de colaboradores</li>
              <li>📋 Vencimento de CNH</li>
            </ul>
            <a href={getWhatsAppConnectURL()} target="_blank" rel="noopener noreferrer">
              <Button className="h-11 rounded-xl w-full">
                <MessageCircle className="h-4 w-4" /> Conectar WhatsApp
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}