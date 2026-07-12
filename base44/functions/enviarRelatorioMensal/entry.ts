import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Determine month range — defaults to previous month, or accepts explicit params
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const targetYear = body.year ?? (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const targetMonth = body.month ?? (new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1);

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Fetch access logs (service role for full access)
    const allLogs = await base44.asServiceRole.entities.AccessLog.list('-created_date', 3000);
    const monthLogs = allLogs.filter(l => {
      const d = new Date(l.created_date);
      return d >= monthStart && d <= monthEnd;
    });

    // Fetch liberacoes
    const allLib = await base44.asServiceRole.entities.Liberacao.list('-created_date', 1000).catch(() => []);
    const monthLib = allLib.filter(l => {
      if (!l.data_liberacao) return false;
      const d = new Date(l.data_liberacao);
      return d >= monthStart && d <= monthEnd;
    });

    // Build CSV — sheet 1: Access Logs
    const logHeaders = ['Data/Hora', 'Placa', 'Motorista', 'CPF Motorista', 'Filial', 'Tipo', 'Status', 'Carregado', 'Operador', 'CPF Operador', 'Observacao'];
    const logRows = monthLogs.map(l => [
      new Date(l.created_date).toLocaleString('pt-BR'),
      l.veiculo_placa || '',
      l.motorista_nome || '',
      l.motorista_cpf || '',
      l.filial_nome || '',
      l.tipo || '',
      l.status || '',
      l.carregado ? 'Sim' : 'Nao',
      l.operador_nome || '',
      l.operador_cpf || '',
      (l.observacao || '').replace(/[\n\r]/g, ' ')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvLogs = [logHeaders.map(h => `"${h}"`).join(','), ...logRows].join('\n');

    // Build CSV — sheet 2: Liberacoes
    const libHeaders = ['Numero Pedido', 'Cliente', 'CNPJ', 'Filial', 'Valor', 'Status', 'Liberado Por', 'Data Liberacao', 'Observacao'];
    const libRows = monthLib.map(l => [
      l.numero_pedido || '',
      l.cliente || '',
      l.cnpj_cliente || '',
      l.filial_nome || '',
      l.valor || 0,
      l.status || '',
      l.liberado_por || '',
      l.data_liberacao ? new Date(l.data_liberacao).toLocaleString('pt-BR') : '',
      (l.observacao || '').replace(/[\n\r]/g, ' ')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvLib = [libHeaders.map(h => `"${h}"`).join(','), ...libRows].join('\n');

    const fullCsv = '\ufeff' +
      'RELATORIO MENSAL DE ACESSOS - ' + monthName.toUpperCase() + '\n' +
      'PROFARMA LIBERAAUTO PRO\n\n' +
      '=== ACESSOS ===\n' + csvLogs + '\n\n' +
      '=== LIBERACOES ===\n' + csvLib + '\n';

    const fileName = `relatorio_acessos_${targetYear}_${String(targetMonth + 1).padStart(2, '0')}.csv`;
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], fileName, { type: 'text/csv' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;

    // Get recipients — admins and encarregados with email
    const colab = await base44.asServiceRole.entities.Colaborador.list();
    const recipients = colab.filter(c => c.email && c.ativo && ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo));

    const liberadoCount = monthLogs.filter(l => l.status === 'liberado').length;
    const bloqueadoCount = monthLogs.filter(l => l.status === 'bloqueado').length;

    let emailsSent = 0;
    for (const r of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: r.email,
          subject: `Relatório Mensal de Acessos - ${monthName} | PROFARMA LIBERAAUTO PRO`,
          body: `Olá ${r.nome},\n\nSegue o relatório mensal de acessos referente a ${monthName}.\n\n` +
                `RESUMO:\n` +
                `- Total de acessos: ${monthLogs.length}\n` +
                `- Liberações: ${liberadoCount}\n` +
                `- Bloqueios: ${bloqueadoCount}\n` +
                `- Liberações de pedidos: ${monthLib.length}\n\n` +
                `Download do relatório completo (compatível com Excel):\n${fileUrl}\n\n` +
                `Este é um envio automático do sistema PROFARMA LIBERAAUTO PRO.\n` +
                `Não responda a este e-mail.`,
          from_name: 'PROFARMA LIBERAAUTO PRO'
        });
        emailsSent++;
      } catch (e) {}
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_name: user.full_name || 'Sistema',
      action: 'Relatório mensal enviado por e-mail',
      details: `Mês: ${monthName} | ${emailsSent} emails enviados | ${monthLogs.length} acessos | ${monthLib.length} liberações`,
      category: 'export',
      ip_address: 'system',
      domain: 'automated'
    });

    return Response.json({
      success: true,
      month: monthName,
      totalAccessLogs: monthLogs.length,
      totalLiberacoes: monthLib.length,
      emailsSent,
      fileUrl
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});