import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

function detectDelimiter(text) {
  const firstLine = (text.split('\n')[0] || '').trim();
  const candidates = ['\t', ';', '|', ','];
  let maxCount = 1;
  let delimiter = ';';
  for (const d of candidates) {
    const count = firstLine.split(d).length;
    if (count > maxCount) { maxCount = count; delimiter = d; }
  }
  return delimiter;
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values;
}

function parseDelimitedText(text) {
  const delimiter = detectDelimiter(text);
  const allLines = text.split(/\r?\n/).filter(l => l.trim());
  if (allLines.length === 0) return { headers: [], records: [] };

  // Find the header row by looking for known column names in the first 10 lines
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(allLines.length, 10); i++) {
    const upper = allLines[i].toUpperCase();
    if (upper.includes('NUMNF') || upper.includes('PRIORIDADE') || upper.includes('VL LITO') || upper.includes('VL_LITO') || upper.includes('VLLITO') || upper.includes('ROTA')) {
      headerLineIdx = i;
      break;
    }
  }

  const headers = parseDelimitedLine(allLines[headerLineIdx], delimiter);
  const records = [];
  for (let i = headerLineIdx + 1; i < allLines.length; i++) {
    const values = parseDelimitedLine(allLines[i], delimiter);
    // Skip rows where first value is empty or matches the first header (repeated header)
    if (!values[0] || values[0].toUpperCase().trim() === (headers[0] || '').toUpperCase().trim()) continue;
    const record = {};
    headers.forEach((h, idx) => { record[h] = values[idx] || ''; });
    records.push(record);
  }
  return { headers, records };
}

function findColumn(headers, possibleNames) {
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const h of headers) {
      if (h.toUpperCase().trim() === upper) return h;
    }
  }
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const h of headers) {
      if (h.toUpperCase().trim().includes(upper)) return h;
    }
  }
  return null;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val).trim();
  let d = new Date(str);
  if (!isNaN(d)) return d;
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    if (!isNaN(d)) return d;
  }
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    d = new Date(Number(dashMatch[3]), Number(dashMatch[2]) - 1, Number(dashMatch[1]));
    if (!isNaN(d)) return d;
  }
  return null;
}

function parseNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.');
  return Number(cleaned) || 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const { file_url } = body;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    const fileRes = await fetch(file_url);
    let headers = [];
    let rawRecords = [];

    const isExcel = file_url.toLowerCase().endsWith('.xlsx') || file_url.toLowerCase().endsWith('.xls');

    if (isExcel) {
      const arrayBuffer = await fileRes.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) return Response.json({ error: 'Nenhuma aba encontrada' }, { status: 400 });
      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
      if (rows.length > 2) {
        headers = rows[2].map(h => String(h || ''));
        for (let i = 3; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const record = {};
          headers.forEach((h, idx) => { record[h] = row[idx] !== undefined ? row[idx] : ''; });
          rawRecords.push(record);
        }
      }
    } else {
      const text = await fileRes.text();
      const parsed = parseDelimitedText(text);
      headers = parsed.headers;
      rawRecords = parsed.records;
    }

    if (rawRecords.length === 0) {
      return Response.json({ error: 'Nenhum registro encontrado no arquivo' }, { status: 400 });
    }

    // Find columns flexibly
    const colNumNf = findColumn(headers, ['NUMNF', 'NUM_NF', 'NUMERO NF', 'NUMERO_NF', 'NOTA FISCAL', 'NF', 'NUMERONF', 'NUM NOTA', 'NUMNOTA']);
    const colData = findColumn(headers, ['DATA DO EMBARQUE', 'DATA EMBARQUE', 'DATA', 'DT_EMBARQUE', 'DTEMBARQUE', 'EMBARQUE', 'DT EMBARQUE']);
    const colPrioridade = findColumn(headers, ['PRIORIDADE', 'PRIORIDAD', 'PRIORITY', 'PRIOR']);
    const colRota = findColumn(headers, ['ROTA', 'RUTA', 'ITINERÁRIO', 'ITINERARIO', 'ITINERARY', 'ITINER', 'ROUTE']);
    const colPlaca = findColumn(headers, ['PLACA VEÍCULO', 'PLACA VEICULO', 'PLACA', 'VEICULO', 'VEÍCULO', 'PLACA VEIC']);
    const colUfOrigem = findColumn(headers, ['UF ORIGEM', 'UF_ORIGEM', 'ORIGEM', 'UF ORIG']);
    const colUfDestino = findColumn(headers, ['UF DESTINO', 'UF_DESTINO', 'DESTINO', 'UF DEST']);
    const colUrbano = findColumn(headers, ['URBANO']);
    const colValor = findColumn(headers, ['VL LITO', 'VL_LITO', 'VLLITO', 'VALOR LITO', 'VL LITRO', 'VL_LITRO', 'VALOR LITRO', 'VL NF', 'VL_NF', 'VLNF', 'VALOR DA NOTA FISCAL', 'VALOR DA NF', 'VALOR DA NOTA', 'VALOR NOTA FISCAL', 'VALOR DE MERCADORIA', 'VALOR MERCADORIA', 'VALOR', 'VL_MERCADORIA', 'VLMERCADORIA', 'MERCADORIA', 'VL MERCADORIA']);

    // Deduplicate by NumNf
    const seenNf = new Set();
    const deduped = [];
    let duplicatesRemoved = 0;
    for (const record of rawRecords) {
      const nf = colNumNf ? String(record[colNumNf] || '').trim() : '';
      if (nf && seenNf.has(nf)) { duplicatesRemoved++; continue; }
      if (nf) seenNf.add(nf);
      deduped.push(record);
    }

    // Parse records
    const parsed = deduped.map(record => {
      const prioridade = colPrioridade ? parseInt(parseNumber(record[colPrioridade])) || 0 : 0;
      const rota = colRota ? parseInt(parseNumber(record[colRota])) || 0 : 0;
      const dataObj = colData ? parseDate(record[colData]) : null;
      const itinerarioFormatado = (prioridade === 90 || prioridade === 91) && rota > 0
        ? `${prioridade} - ${rota}`
        : `${prioridade}`;
      return {
        data_embarque: dataObj ? dataObj.toISOString() : '',
        prioridade,
        rota,
        placa: colPlaca ? String(record[colPlaca] || '') : '',
        itinerario: prioridade,
        itinerario_formatado: itinerarioFormatado,
        uf_origem: colUfOrigem ? String(record[colUfOrigem] || '') : '',
        uf_destino: colUfDestino ? String(record[colUfDestino] || '') : '',
        urbano: colUrbano ? String(record[colUrbano] || '') : '',
        vl_lito: colValor ? parseNumber(record[colValor]) : 0,
        valor: colValor ? parseNumber(record[colValor]) : 0,
        num_nf: colNumNf ? String(record[colNumNf] || '') : ''
      };
    });

    // Sort by date ascending
    parsed.sort((a, b) => {
      if (!a.data_embarque) return 1;
      if (!b.data_embarque) return -1;
      return new Date(a.data_embarque) - new Date(b.data_embarque);
    });

    const records = parsed;

    // Determine available months and semesters
    const monthsSet = new Set();
    const semestersSet = new Set();
    records.forEach(r => {
      if (r.data_embarque) {
        const d = new Date(r.data_embarque);
        if (!isNaN(d)) {
          monthsSet.add(d.getMonth());
          semestersSet.add(d.getMonth() < 6 ? 1 : 2);
        }
      }
    });

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let mesNome = '';
    if (monthsSet.size === 1) mesNome = meses[[...monthsSet][0]];

    const metadata = {
      cnpj: '',
      mes: mesNome,
      filial: '',
      total: records.reduce((s, r) => s + (r.valor || 0), 0)
    };

    if (user) {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_name: user.full_name || 'Sistema',
          action: 'Processamento de averbação (TXT/Excel)',
          details: `${records.length} registros, ${duplicatesRemoved} duplicados removidos`,
          category: 'export',
          ip_address: 'system',
          domain: 'averbacao'
        });
      } catch (e) {}
    }

    return Response.json({
      metadata,
      records,
      total: records.length,
      duplicates_removed: duplicatesRemoved,
      available_months: [...monthsSet].sort((a, b) => a - b),
      available_semesters: [...semestersSet].sort((a, b) => a - b),
      columns_found: {
        num_nf: colNumNf,
        data: colData,
        prioridade: colPrioridade,
        rota: colRota,
        placa: colPlaca,
        uf_origem: colUfOrigem,
        uf_destino: colUfDestino,
        urbano: colUrbano,
        vl_lito: colValor,
        valor: colValor
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});