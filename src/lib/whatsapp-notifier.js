import { base44 } from '@/api/base44Client';

/**
 * Envia uma notificacao via WhatsApp.
 * 1. Tenta o agente (backend function) — envio automatico se conectado
 * 2. Fallback: abre wa.me para o primeiro numero autorizado ativo
 * @param {string} titulo - Titulo da notificacao
 * @param {string} mensagem - Corpo da mensagem
 * @param {string} tipo - Tipo: 'entrada', 'saida', 'problema', 'colaborador', 'cnh'
 * @returns {Promise<boolean>} - true se enviado/aberto com sucesso
 */
export async function sendWhatsAppNotification(titulo, mensagem, tipo = 'entrada') {
  const emojiMap = {
    entrada: '🚛',
    saida: '✅',
    problema: '⚠️',
    colaborador: '👤',
    cnh: '📋',
  };
  const emoji = emojiMap[tipo] || '🔔';
  const content = `${emoji} *${titulo}*\n\n${mensagem}`;

  // 1. Tentar via agente (backend function)
  try {
    const response = await base44.functions.invoke('enviarNotificacaoWhatsApp', { titulo, mensagem, tipo });
    if (response?.data?.success) return true;
  } catch (_e) {}

  // 2. Fallback: wa.me para numeros autorizados
  try {
    const autorizados = await base44.entities.WhatsAppAutorizado.filter({ ativo: true });
    if (autorizados.length === 0) return false;

    const formatPhone = (tel) => {
      let digits = (tel || '').replace(/\D/g, '');
      if (!digits) return null;
      if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
      return digits;
    };

    // Abrir wa.me para o primeiro numero valido
    for (const item of autorizados) {
      const phone = formatPhone(item.telefone);
      if (phone) {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(content)}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.warn('Notificacao WhatsApp falhou:', e?.message || e);
    return false;
  }
}