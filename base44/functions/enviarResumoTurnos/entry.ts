import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (e) {}

    const now = new Date();
    const currentHour = now.getHours();
    let shiftStart, shiftEnd, shiftName;

    if (body.shift === 'manha' || (currentHour >= 6 && currentHour < 14)) {
      shiftStart = new Date(now); shiftStart.setHours(6, 0, 0, 0);
      shiftEnd = new Date(now); shiftEnd.setHours(14, 0, 0, 0);
      shiftName = 'Manhã (06h-14h)';
    } else {
      shiftStart = new Date(now); shiftStart.setHours(14, 0, 0, 0);
      shiftEnd = new Date(now); shiftEnd.setHours(22, 0, 0, 0);
      shiftName = 'Tarde (14h-22h)';
    }

    const allLogs = await base44.asServiceRole.entities.AccessLog.list('-created_date', 3000);
    const shiftLogs = allLogs.filter(l => {
      const d = new Date(l.created_date);
      return d >= shiftStart && d < shiftEnd;
    });

    const byFilial = {};
    shiftLogs.forEach(l => {
      const name = l.filial_nome || 'Sem filial';
      if (!byFilial[name]) byFilial[name] = { total: 0, liberado: 0, bloqueado: 0, acessado: 0, entradas: 0, saidas: 0 };
      byFilial[name].total++;
      if (l.status === 'liberado') byFilial[name].liberado++;
      else if (l.status === 'bloqueado') byFilial[name].bloqueado++;
      else byFilial[name].acessado++;
      if (l.tipo === 'entrada') byFilial[name].entradas++;
      else byFilial[name].saidas++;
    });

    const colab = await base44.asServiceRole.entities.Colaborador.list();
    const gestores = colab.filter(c => c.email && c.ativo && ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo));

    const dateStr = now.toLocaleDateString('pt-BR');
    const totalLib = shiftLogs.filter(l => l.status === 'liberado').length;
    const totalBlq = shiftLogs.filter(l => l.status === 'bloqueado').length;

    let summary = `RESUMO DE TURNO - ${shiftName}\nData: ${dateStr}\n\n`;
    summary += `TOTAL GERAL: ${shiftLogs.length} acessos\n`;
    summary += `Liberacoes: ${totalLib}\n`;
    summary += `Bloqueios: ${totalBlq}\n\n`;
    summary += 'POR FILIAL:\n';
    for (const [filial, data] of Object.entries(byFilial)) {
      summary += `- ${filial}: ${data.total} acessos (${data.liberado} liberados, ${data.bloqueado} bloqueados, ${data.entradas} entradas, ${data.saidas} saidas)\n`;
    }

    let emailsSent = 0;
    for (const g of gestores) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: g.email,
          subject: `Resumo de Turnos - ${shiftName} - ${dateStr} | PROFARMA LIBERAAUTO PRO`,
          body: `Olá ${g.nome},\n\n${summary}\n\nEste é um envio automático do sistema PROFARMA LIBERAAUTO PRO.\nNão responda a este e-mail.`,
          from_name: 'PROFARMA LIBERAAUTO PRO'
        });
        emailsSent++;
      } catch (e) {}
    }

    await base44.asServiceRole.entities.Notification.create({
      title: `Resumo de Turno ${shiftName} enviado`,
      message: `${shiftLogs.length} acessos no turno - ${emailsSent} gestores notificados`,
      type: 'admin_ops',
      sender_name: 'Sistema Automático'
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_name: 'Sistema Automático',
      action: `Resumo de turnos enviado: ${shiftName}`,
      details: `${shiftLogs.length} acessos - ${emailsSent} emails enviados`,
      category: 'export',
      ip_address: 'system',
      domain: 'automated'
    });

    return Response.json({ success: true, shift: shiftName, date: dateStr, totalLogs: shiftLogs.length, emailsSent, byFilial });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});