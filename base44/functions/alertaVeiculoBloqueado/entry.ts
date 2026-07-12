import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (e) {}

    const placa = body.placa || '';
    const filial_id = body.filial_id || '';
    const filial_nome = body.filial_nome || 'N/A';
    const operador_nome = body.operador_nome || 'N/A';
    const observacao = body.observacao || 'Tentativa de liberação recusada';

    if (!placa) return Response.json({ error: 'Placa é obrigatória' }, { status: 400 });

    const colab = await base44.asServiceRole.entities.Colaborador.list();
    const supervisors = colab.filter(c => {
      if (!c.ativo || !['administrador_master', 'administrador', 'encarregado'].includes(c.cargo)) return false;
      if (c.cargo === 'administrador_master') return true;
      const filiaisPermitidas = c.filiais_permitidas ? c.filiais_permitidas.split(',').map(s => s.trim()) : [];
      return filiaisPermitidas.includes(filial_id) || c.filial_id === filial_id;
    });

    let notificationsCreated = 0;
    let emailsSent = 0;
    const timestamp = new Date().toLocaleString('pt-BR');

    for (const sup of supervisors) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: 'VEÍCULO BLOQUEADO NA PORTARIA',
          message: `Placa: ${placa} | Filial: ${filial_nome} | Operador: ${operador_nome} | ${observacao}`,
          type: 'vehicle_release',
          sender_name: operador_nome,
          branch_id: filial_id,
          target_user_id: sup.id
        });
        notificationsCreated++;

        if (sup.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: sup.email,
            subject: `ALERTA: Veículo Bloqueado - ${placa} | PROFARMA LIBERAAUTO PRO`,
            body: `Olá ${sup.nome},\n\nUm veículo foi marcado como BLOQUEADO na portaria.\n\nDETALHES:\n- Placa: ${placa}\n- Filial: ${filial_nome}\n- Operador: ${operador_nome}\n- Observação: ${observacao}\n- Data/Hora: ${timestamp}\n\nVerifique o sistema para mais detalhes.\n\nEste é um alerta automático do PROFARMA LIBERAAUTO PRO.`,
            from_name: 'PROFARMA LIBERAAUTO PRO'
          });
          emailsSent++;
        }
      } catch (e) {}
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_name: 'Sistema Automático',
      action: `Alerta de veículo bloqueado: ${placa}`,
      details: `${notificationsCreated} notificações criadas - ${emailsSent} emails enviados`,
      category: 'vehicle',
      ip_address: 'system',
      domain: 'automated',
      branch_id: filial_id
    });

    return Response.json({ success: true, placa, notificationsCreated, emailsSent, supervisorCount: supervisors.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});