import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const AGENT_NAME = 'notificador_whatsapp';

export default function WhatsAppNotifCard() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectUrl, setConnectUrl] = useState('');
  const [error, setError] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setError('');
    try {
      const conversations = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConnected(!!(conversations && conversations.length > 0));
    } catch (e) {
      setConnected(false);
    }
    try {
      const url = base44.agents.getWhatsAppConnectURL(AGENT_NAME);
      setConnectUrl(url || '');
    } catch (e) {
      setError('Não foi possível gerar o link de conexão. Tente novamente.');
    }
    setChecking(false);
  };

  useEffect(() => { checkStatus(); }, []);

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${connected ? 'bg-green-500/15' : 'bg-primary/10'}`}>
          <MessageCircle className={`h-6 w-6 ${connected ? 'text-green-600' : 'text-primary'}`} />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">Notificações via WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Conecte seu WhatsApp para receber alertas do sistema</p>
        </div>
      </div>

      <div className={`rounded-xl p-4 border ${connected ? 'bg-green-500/5 border-green-500/20' : 'bg-primary/5 border-primary/20'}`}>
        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
          </div>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">WhatsApp conectado</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={checkStatus}>
              Atualizar
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={checkStatus}>
              Tentar novamente
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
            {connectUrl ? (
              <a href={connectUrl} target="_blank" rel="noopener noreferrer">
                <Button className="h-12 rounded-xl w-full text-base font-medium">
                  <MessageCircle className="h-5 w-5" /> Conectar WhatsApp
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                Erro ao gerar link de conexão. Contate o suporte.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}