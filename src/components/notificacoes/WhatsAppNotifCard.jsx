import { MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const AGENT_NAME = 'notificador_whatsapp';

export default function WhatsAppNotifCard() {
  let connectUrl = '';
  let urlError = false;
  try {
    if (base44.agents && typeof base44.agents.getWhatsAppConnectURL === 'function') {
      connectUrl = base44.agents.getWhatsAppConnectURL(AGENT_NAME) || '';
    } else {
      urlError = true;
    }
  } catch (e) {
    urlError = true;
  }

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">Notificações via WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Conecte seu WhatsApp para receber alertas do sistema</p>
        </div>
      </div>
      <div className="rounded-xl p-4 border bg-primary/5 border-primary/20">
        <p className="text-xs text-muted-foreground mb-3">
          Conecte seu WhatsApp para receber notificações automáticas de:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 ml-4 mb-3">
          <li>🚛 Entrada e saída de veículos</li>
          <li>⚠️ Problemas com placas ou motoristas</li>
          <li>👤 Cadastro de colaboradores</li>
          <li>📋 Vencimento de CNH</li>
        </ul>
        {urlError ? (
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-destructive text-center">
            Não foi possível gerar o link de conexão. Contate o suporte.
          </div>
        ) : connectUrl ? (
          <a href={connectUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="h-12 rounded-xl w-full text-base font-medium">
              <MessageCircle className="h-5 w-5" /> Conectar WhatsApp
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        ) : (
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground text-center">
            Aguarde, gerando link...
          </div>
        )}
      </div>
    </div>
  );
}