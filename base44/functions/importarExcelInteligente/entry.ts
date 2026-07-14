import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
    const hasDriverCols = columns.some(c => c.includes('CPF') || c.includes('MOTORISTA') || c.includes('NOME'));
    const isVehicle = hasVehicleCols && !hasDriverCols;
    const isDriver = hasDriverCols && !hasVehicleCols;

    let entityType;
    if (isVehicle) entityType = 'Vehicle';
    else if (isDriver) entityType = 'Driver';
    else if (hasVehicleCols && hasDriverCols) entityType = 'Vehicle';
    else entityType = 'Driver';

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

    // Map Excel status text to enum
    const mapStatus = (raw) => {
      const s = String(raw || '').toUpperCase().trim();
      if (s.includes('BLOQ')) return 'bloqueado';
      if (s.includes('VALID')) return 'validado';
      if (s.includes('PEND') || s.includes('REVIS')) return 'pendente_revisao';
      return 'pendente_revisao';
    };

    let created = 0, updated = 0, errors = 0;

    if (entityType === 'Vehicle') {
      // Excel format: A1=PLACA, B1=MODELO, C1=EST. VEICULO (status)
      const existing = await base44.asServiceRole.entities.Vehicle.list('-created_date', 5000);
      const placaMap = {};
      existing.forEach(v => { if (v.placa) placaMap[v.placa.toUpperCase()] = v; });

      for (const record of rawRecords) {
        try {
          const placa = String(findValue(record, ['PLACA']) || '').toUpperCase().trim();
          if (!placa) { errors++; continue; }
          const modelo = String(findValue(record, ['MODELO']) || '').trim();
          const statusRaw = String(findValue(record, ['EST', 'STATUS', 'OPENTECH', 'VEICULO']) || '').trim();
          const status = mapStatus(statusRaw);

          if (placaMap[placa]) {
            await base44.asServiceRole.entities.Vehicle.update(placaMap[placa].id, { modelo, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.asServiceRole.entities.Vehicle.create({
              placa, modelo, status, status_opentech: statusRaw
            });
            created++;
          }
        } catch (e) { errors++; }
      }
    } else {
      // Excel format: A1=CPF, B1=NOME E SOBRENOME, C1=EST. DE MOTORISTA (status)
      const existing = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);
      const cpfMap = {};
      existing.forEach(d => { if (d.cpf) cpfMap[String(d.cpf).replace(/\D/g, '')] = d; });

      for (const record of rawRecords) {
        try {
          const cpf = String(findValue(record, ['CPF']) || '').replace(/\D/g, '');
          if (!cpf) { errors++; continue; }
          const nomeCompleto = String(findValue(record, ['NOME', 'MOTORISTA', 'NOME E SOBRENOME']) || '').trim();
          const statusRaw = String(findValue(record, ['EST', 'STATUS', 'OPENTECH', 'MOTORISTA']) || '').trim();
          const status = mapStatus(statusRaw);

          if (cpfMap[cpf]) {
            await base44.asServiceRole.entities.Driver.update(cpfMap[cpf].id, { nome: nomeCompleto, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.asServiceRole.entities.Driver.create({
              nome: nomeCompleto, cpf, status, status_opentech: statusRaw
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