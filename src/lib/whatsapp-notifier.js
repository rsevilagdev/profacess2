import { base44 } from '@/api/base44Client';

const AGENT_NAME = 'notificador_whatsapp';

/**
 * Envia uma notificacao via WhatsApp chamando a funcao backend.
 * @param {string} titulo - Titulo da notificacao
 * @param {string} mensagem - Corpo da mensagem
 * @param {string} tipo - Tipo: 'entrada', 'saida', 'problema', 'colaborador', 'cnh'
 * @returns {Promise<boolean>} - true se enviado com sucesso
 */
export async function sendWhatsAppNotification(titulo, mensagem, tipo = 'entrada') {
  try {
    await base44.functions.invoke('enviarNotificacaoWhatsApp', { titulo, mensagem, tipo });
    return true;
  } catch (e) {
    console.warn('Notificacao WhatsApp falhou:', e?.message || e);
    return false;
  }
}

/**
 * Retorna a URL para conectar o WhatsApp ao agente de notificacoes.
 */
export function getWhatsAppConnectURL() {
  return base44.agents.getWhatsAppConnectURL(AGENT_NAME);
}

/**
 * Verifica se o WhatsApp esta conectado (existe conversa com o agente).
 * @returns {Promise<boolean>}
 */
export async function checkWhatsAppConnected() {
  try {
    const conversations = await base44.agents.listConversations({ agent_name: AGENT_NAME });
    return !!(conversations && conversations.length > 0);
  } catch (e) {
    return false;
  }
}