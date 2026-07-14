import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if ((char === ';' || char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 1 && !values[0]) continue;
    const record = {};
    headers.forEach((h, idx) => { record[h || `col${idx}`] = values[idx] || ''; });
    records.push(record);
  }
  return records;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ success: false, error: 'file_url é obrigatório' });

    let rawRecords = [];

    // Strategy 1: Try fetching and parsing as CSV/text
    try {
      const fileRes = await fetch(fileUrl);
      const text = await fileRes.text();
      if (text && text.length > 0) {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          // Verify it's not binary garbage
          const firstHeader = Object.keys(parsed[0])[0] || '';
          if (firstHeader.length < 50 && !firstHeader.includes('\u0000')) {
            rawRecords = parsed;
          }
        }
      }
    } catch (fetchErr) { /* will try extraction */ }

    // Strategy 2: Fall back to extraction integration (for Excel files)
    if (rawRecords.length === 0) {
      try {
        const schema = {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  col1: { type: 'string' },
                  col2: { type: 'string' },
                  col3: { type: 'string' },
                  col4: { type: 'string' },
                  col5: { type: 'string' },
                  col6: { type: 'string' },
                }
              }
            }
          },
          required: ['rows']
        };
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: schema });
        const output = result.output;
        if (Array.isArray(output)) {
          rawRecords = output;
        } else if (output && typeof output === 'object') {
          if (Array.isArray(output.rows)) rawRecords = output.rows;
          else if (Array.isArray(output.data)) rawRecords = output.data;
          else if (Array.isArray(output.items)) rawRecords = output.items;
          else {
            const keys = Object.keys(output);
            const hasMeaningfulKeys = keys.some(k => !['status', 'details'].includes(k));
            if (hasMeaningfulKeys) rawRecords = [output];
          }
        }
      } catch (extractErr) { /* extraction failed */ }
    }

    if (rawRecords.length === 0) {
      return Response.json({ success: false, error: 'Nenhum registro encontrado no arquivo. Verifique se o arquivo contém colunas com cabeçalhos (PLACA, CPF, NOME, etc.).' });
    }

    // Clean records — stringify all values
    rawRecords = rawRecords.map(r => {
      const cleaned = {};
      for (const [k, v] of Object.entries(r)) {
        cleaned[k] = v === null || v === undefined ? '' : String(v).trim();
      }
      return cleaned;
    });

    // Analyze columns to determine entity type
    const firstRecord = rawRecords[0];
    const columns = Object.keys(firstRecord).map(k => k.toUpperCase().trim());
    const hasPlaca = columns.some(c => c.includes('PLACA'));
    const hasCpf = columns.some(c => c.includes('CPF'));
    const hasNome = columns.some(c => c.includes('NOME') || c.includes('MOTORISTA'));

    let entityType;
    if (hasPlaca && !hasCpf) entityType = 'Vehicle';
    else if (hasCpf && !hasPlaca) entityType = 'Driver';
    else if (hasPlaca && hasCpf) entityType = 'Vehicle';
    else if (hasNome) entityType = 'Driver';
    else entityType = 'Driver';

    // Find value: exact match first, then partial (longest key first for precision)
    const findValue = (record, possibleKeys) => {
      const keys = Object.keys(record);
      // Exact match
      for (const key of keys) {
        const upper = key.toUpperCase().trim();
        for (const pk of possibleKeys) {
          if (upper === pk.toUpperCase()) return record[key];
        }
      }
      // Partial match — longest key first
      const sorted = [...possibleKeys].sort((a, b) => b.length - a.length);
      for (const key of keys) {
        const upper = key.toUpperCase().trim();
        for (const pk of sorted) {
          if (upper.includes(pk.toUpperCase())) return record[key];
        }
      }
      return '';
    };

    const mapStatus = (raw) => {
      const s = String(raw || '').toUpperCase().trim();
      if (s.includes('BLOQ')) return 'bloqueado';
      if (s.includes('VALID') || s.includes('ATIVO')) return 'validado';
      if (s.includes('PEND') || s.includes('REVIS')) return 'pendente_revisao';
      return 'pendente_revisao';
    };

    let created = 0, updated = 0, errors = 0;
    const errorDetails = [];

    if (entityType === 'Vehicle') {
      const existing = await base44.entities.Vehicle.list('-created_date', 5000);
      const placaMap = {};
      existing.forEach(v => { if (v.placa) placaMap[v.placa.toUpperCase()] = v; });

      for (const record of rawRecords) {
        try {
          const placa = String(findValue(record, ['PLACA']) || '').toUpperCase().trim();
          if (!placa) { errors++; continue; }
          const modelo = String(findValue(record, ['MODELO']) || '').trim();
          const statusRaw = String(findValue(record, ['EST. VEICULO', 'EST VEICULO', 'ESTADO VEICULO', 'STATUS', 'OPENTECH', 'EST']) || '').trim();
          const status = mapStatus(statusRaw);

          if (placaMap[placa]) {
            await base44.entities.Vehicle.update(placaMap[placa].id, { modelo, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.entities.Vehicle.create({ placa, modelo, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(e.message); }
      }
    } else {
      const existing = await base44.entities.Driver.list('-created_date', 5000);
      const cpfMap = {};
      existing.forEach(d => { if (d.cpf) cpfMap[String(d.cpf).replace(/\D/g, '')] = d; });

      for (const record of rawRecords) {
        try {
          const cpf = String(findValue(record, ['CPF']) || '').replace(/\D/g, '');
          if (!cpf) { errors++; continue; }
          const nomeCompleto = String(findValue(record, ['NOME E SOBRENOME', 'NOME', 'MOTORISTA']) || '').trim();
          const statusRaw = String(findValue(record, ['EST. DE MOTORISTA', 'EST DE MOTORISTA', 'ESTADO MOTORISTA', 'STATUS', 'OPENTECH', 'EST']) || '').trim();
          const status = mapStatus(statusRaw);

          if (cpfMap[cpf]) {
            await base44.entities.Driver.update(cpfMap[cpf].id, { nome: nomeCompleto, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.entities.Driver.create({ nome: nomeCompleto, cpf, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(e.message); }
      }
    }

    if (user) {
      try {
        await base44.entities.AuditLog.create({
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