import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ success: false, error: 'file_url é obrigatório' });

    // Fetch file and parse with XLSX (handles both Excel and CSV)
    let rawRecords = [];
    try {
      const fileRes = await fetch(fileUrl);
      const arrayBuffer = await fileRes.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (firstSheet) {
        const worksheet = workbook.Sheets[firstSheet];
        rawRecords = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }
    } catch (parseErr) {
      return Response.json({ success: false, error: 'Não foi possível ler o arquivo: ' + (parseErr.message || String(parseErr)) });
    }

    if (!rawRecords || rawRecords.length === 0) {
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
      for (const key of keys) {
        const upper = key.toUpperCase().trim();
        for (const pk of possibleKeys) {
          if (upper === pk.toUpperCase()) return record[key];
        }
      }
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
    const errMsg = (e) => e?.message || e?.error || String(e) || 'Unknown error';

    if (entityType === 'Vehicle') {
      const existing = await base44.asServiceRole.entities.Vehicle.list('-created_date', 5000);
      const placaMap = {};
      existing.forEach(v => { if (v.placa) placaMap[v.placa.toUpperCase()] = v; });

      for (const record of rawRecords) {
        try {
          const placa = String(findValue(record, ['PLACA']) || '').toUpperCase().trim();
          if (!placa) { errors++; errorDetails.push('Placa vazia'); continue; }
          const modelo = String(findValue(record, ['MODELO']) || '').trim();
          const statusRaw = String(findValue(record, ['STATUS PARA VEICULO', 'EST. VEICULO', 'EST VEICULO', 'ESTADO VEICULO', 'STATUS', 'OPENTECH', 'EST']) || '').trim();
          const status = mapStatus(statusRaw);

          if (placaMap[placa]) {
            await base44.asServiceRole.entities.Vehicle.update(placaMap[placa].id, { modelo, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.asServiceRole.entities.Vehicle.create({ placa, modelo, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(errMsg(e)); }
      }
    } else {
      const existing = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);
      const cpfMap = {};
      existing.forEach(d => { if (d.cpf) cpfMap[String(d.cpf).replace(/\D/g, '')] = d; });

      for (const record of rawRecords) {
        try {
          const cpf = String(findValue(record, ['CPF']) || '').replace(/\D/g, '');
          if (!cpf) { errors++; errorDetails.push('CPF vazio'); continue; }
          const nomeCompleto = String(findValue(record, ['NOME E SOBRENOME', 'NOME', 'MOTORISTA']) || '').trim();
          const statusRaw = String(findValue(record, ['EST. DE MOTORISTA', 'EST DE MOTORISTA', 'ESTADO MOTORISTA', 'STATUS', 'OPENTECH', 'EST']) || '').trim();
          const status = mapStatus(statusRaw);

          if (cpfMap[cpf]) {
            await base44.asServiceRole.entities.Driver.update(cpfMap[cpf].id, { nome: nomeCompleto, status, status_opentech: statusRaw });
            updated++;
          } else {
            await base44.asServiceRole.entities.Driver.create({ nome: nomeCompleto, cpf, status, status_opentech: statusRaw });
            created++;
          }
        } catch (e) { errors++; errorDetails.push(errMsg(e)); }
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