import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // Extract data from Excel/CSV — generic schema to capture all columns
    const schema = { type: 'object', properties: { data: { type: 'array', items: { type: 'object' } } } };
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: schema });
    const rawRecords = result.output?.data || (Array.isArray(result.output) ? result.output : []);

    if (rawRecords.length === 0) {
      return Response.json({ error: 'Nenhum registro encontrado no arquivo' }, { status: 400 });
    }

    // Analyze columns to determine entity type
    const firstRecord = rawRecords[0];
    const columns = Object.keys(firstRecord).map(k => k.toUpperCase().trim());
    const hasVehicleCols = columns.some(c => c.includes('PLACA') || c.includes('VEIC'));
    const hasDriverCols = columns.some(c => c.includes('CPF') || c.includes('MOTORISTA') || c.includes('CNH') || c.includes('NOME'));
    const isVehicle = hasVehicleCols && !hasDriverCols;
    const isDriver = hasDriverCols && !hasVehicleCols;

    // If ambiguous, check more
    let entityType;
    if (isVehicle) entityType = 'Vehicle';
    else if (isDriver) entityType = 'Driver';
    else if (hasVehicleCols && hasDriverCols) entityType = 'Vehicle';
    else entityType = 'Driver';

    // Normalize column names
    const normalizeKey = (key) => key.toUpperCase().trim();
    const findValue = (record, possibleKeys) => {
      for (const key of Object.keys(record)) {
        const upper = normalizeKey(key);
        if (possibleKeys.some(pk => upper === pk || upper.includes(pk))) {
          return record[key];
        }
      }
      return '';
    };

    let created = 0, updated = 0, errors = 0;

    if (entityType === 'Vehicle') {
      const existing = await base44.asServiceRole.entities.Vehicle.list('-created_date', 5000);
      const placaMap = {};
      existing.forEach(v => { if (v.placa) placaMap[v.placa.toUpperCase()] = v; });

      for (const record of rawRecords) {
        try {
          const placa = String(findValue(record, ['PLACA']) || '').toUpperCase().trim();
          if (!placa) { errors++; continue; }
          const modelo = String(findValue(record, ['MODELO']) || '').trim();
          const statusOpentech = String(findValue(record, ['EST', 'STATUS', 'OPENTECH']) || '').trim();

          if (placaMap[placa]) {
            await base44.asServiceRole.entities.Vehicle.update(placaMap[placa].id, { status_opentech: statusOpentech });
            updated++;
          } else {
            await base44.asServiceRole.entities.Vehicle.create({
              placa, modelo, status_opentech: statusOpentech, status: 'ativo'
            });
            created++;
          }
        } catch (e) { errors++; }
      }
    } else {
      const existing = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);
      const cpfMap = {};
      existing.forEach(d => { if (d.cpf) cpfMap[String(d.cpf).replace(/\D/g, '')] = d; });

      for (const record of rawRecords) {
        try {
          const cpf = String(findValue(record, ['CPF']) || '').replace(/\D/g, '');
          if (!cpf) { errors++; continue; }
          const nome = String(findValue(record, ['NOME', 'MOTORISTA']) || '').trim();
          const sobrenome = String(findValue(record, ['SOBRENOME', 'SOBRENOME DO MOTORISTA']) || '').trim();
          const statusOpentech = String(findValue(record, ['EST', 'STATUS', 'OPENTECH']) || '').trim();

          if (cpfMap[cpf]) {
            await base44.asServiceRole.entities.Driver.update(cpfMap[cpf].id, { status_opentech: statusOpentech });
            updated++;
          } else {
            await base44.asServiceRole.entities.Driver.create({
              nome, sobrenome, cpf, status_opentech: statusOpentech, status: 'ativo'
            });
            created++;
          }
        } catch (e) { errors++; }
      }
    }

    if (user) {
      await base44.asServiceRole.entities.AuditLog.create({
        user_name: user.full_name || 'Sistema',
        action: `Importação Excel inteligente: ${entityType}`,
        details: `${created} criados, ${updated} atualizados, ${errors} erros`,
        category: 'export',
        ip_address: 'system',
        domain: 'automated'
      });
    }

    return Response.json({ success: true, entityType, created, updated, errors, totalProcessed: rawRecords.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});