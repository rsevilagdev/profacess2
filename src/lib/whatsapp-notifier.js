import { base44 } from '@/api/base44Client';

/**
 * Envia uma notificacao via WhatsApp.
 * Primeiro tenta o agente (se conectado), depois fall back para wa.me com o telefone do perfil.
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

  // 2. Fallback: wa.me link para administradores com telefone cadastrado
  try {
    const colaboradores = await base44.entities.Colaborador.list();
    const admins = colaboradores.filter(c =>
      c.ativo &&
      ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo) &&
      c.telefone
    );
    if (admins.length === 0) return false;

    const formatPhone = (tel) => {
      let digits = (tel || '').replace(/\D/g, '');
      if (!digits) return null;
      if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
      return digits;
    };

    // Abrir wa.me para o primeiro admin com telefone valido
    for (const admin of admins) {
      const phone = formatPhone(admin.telefone);
      if (phone) {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(content)}`;
        // Criar link e clicar programaticamente (evita bloqueio de popup)
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