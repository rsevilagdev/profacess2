import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const AGENT_NAME = 'notificador_whatsapp';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { titulo, mensagem, tipo } = body;

    if (!titulo || !mensagem) {
      return Response.json({ error: 'titulo e mensagem sao obrigatorios' }, { status: 400 });
    }

    const emojiMap = {
      entrada: '🚛',
      saida: '✅',
      problema: '⚠️',
      colaborador: '👤',
      cnh: '📋',
    };
    const emoji = emojiMap[tipo] || '🔔';
    const content = `${emoji} *${titulo}*\n\n${mensagem}`;

    // Tentar listar conversas via service role (acessa todas as conversas)
    let conversations = [];
    let agentsApi = null;

    try {
      agentsApi = base44.asServiceRole.agents;
    } catch (_e) {
      agentsApi = null;
    }

    if (!agentsApi) {
      try {
        agentsApi = base44.agents;
      } catch (_e2) {
        agentsApi = null;
      }
    }

    if (!agentsApi) {
      return Response.json({
        error: 'API de agentes nao disponivel no backend',
        success: false
      }, { status: 500 });
    }

    // Listar conversas do agente
    try {
      conversations = await agentsApi.listConversations({ agent_name: AGENT_NAME });
    } catch (e) {
      return Response.json({
        error: 'Erro ao listar conversas: ' + (e.message || 'desconhecido'),
        success: false
      }, { status: 500 });
    }

    if (!conversations || conversations.length === 0) {
      return Response.json({
        success: false,
        reason: 'no_conversation',
        message: 'Nenhum WhatsApp conectado. Conecte o WhatsApp nas configuracoes de notificacoes.'
      }, { status: 200 });
    }

    // Enviar para todas as conversas conectadas (todos os admins/gestores)
    let sent = 0;
    let errors = 0;
    for (const conversation of conversations) {
      try {
        await agentsApi.addMessage(conversation, {
          role: 'user',
          content: content
        });
        sent++;
      } catch (_e) {
        errors++;
      }
    }

    return Response.json({
      success: sent > 0,
      sent,
      errors,
      message: sent > 0 ? `${sent} notificacao(oes) enviada(s) via WhatsApp` : 'Falha ao enviar notificacoes'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});