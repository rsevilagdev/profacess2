import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ success: false, error: 'file_url é obrigatório' });

    // Extract data from Excel/CSV — generic schema to capture all rows
    const schema = {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: { type: 'object' }
        }
      },
      required: ['rows']
    };
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: schema });

    // Handle multiple possible output formats from the extraction
    let rawRecords = [];
    const output = result.output;
    if (Array.isArray(output)) {
      rawRecords = output;
    } else if (output && typeof output === 'object') {
      if (Array.isArray(output.rows)) rawRecords = output.rows;
      else if (Array.isArray(output.data)) rawRecords = output.data;
      else if (Array.isArray(output.items)) rawRecords = output.items;
      else {
        // Single object that looks like a record — wrap it
        const keys = Object.keys(output);
        const hasMeaningfulKeys = keys.some(k => !['status', 'details'].includes(k));
        if (hasMeaningfulKeys) rawRecords = [output];
      }
    }

    if (rawRecords.length === 0) {
      return Response.json({ success: false, error: 'Nenhum registro encontrado no arquivo. Verifique se o arquivo contém colunas com cabeçalhos (PLACA, CPF, NOME, etc.).' });
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
        for (const pk of possibleKeys) {
          if (upper === pk || upper.includes(pk)) {
            return record[key];
          }
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
    const errorDetails = [];

    if (entityType === 'Vehicle') {
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
            await base44.asServiceRole.entities.Vehicle.create({ placa, modelo, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(e.message); }
      }
    } else {
      const existing = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);
      const cpfMap = {};
      existing.forEach(d => { if (d.cpf) cpfMap[String(d.cpf).replace(/\D/g, '')] = d; });

      for (const record of rawRecords) {
        try {
          const cpf = String(findValue(record, ['CPF']) || '').replace(/\D/g, '');
          if (!cpf) { errors++; continue; }
          const nomeCompleto = String(findValue(record, ['NOME E SOBRENOME', 'NOME', 'MOTORISTA']) || '').trim();
          const statusRaw = String(findValue(record, ['EST. DE MOTORISTA', 'EST DE MOTORISTA', 'EST', 'STATUS', 'OPENTECH']) || '').trim();
          const status = mapStatus(statusRaw);

          if (cpfMap[cpf]) {
            await base44.asServiceRole.entities.Driver.update(cpfMap[cpf].id, { nome: nomeCompleto, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.asServiceRole.entities.Driver.create({ nome: nomeCompleto, cpf, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(e.message); }
      }
    }

    if (user) {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_name: user.full_name || 'Sistema',
          action: `Importação Excel inteligente: ${entityType}`,
          details: `${created} criados, ${updated} atualizados, ${errors} erros`,
          category: 'export',
          ip_address: 'system',
          domain: 'automated'
        });
      } catch (e) {}
    }

    return Response.json({ success: true, entityType, created, updated, errors, totalProcessed: rawRecords.length, errorDetails: errorDetails.slice(0, 5) });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});