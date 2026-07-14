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
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], records: [] };
  const headers = parseDelimitedLine(lines[0], delimiter);
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i], delimiter);
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
      // Row 0=title, Row 1=metadata, Row 2=headers, Row 3+=data
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
    const colPlaca = findColumn(headers, ['PLACA VEÍCULO', 'PLACA VEICULO', 'PLACA', 'VEICULO', 'VEÍCULO', 'PLACA VEIC']);
    const colItinerario = findColumn(headers, ['ITINERÁRIO', 'ITINERARIO', 'ROTA', 'RUTA', 'ITINERARY', 'ITINER']);
    const colUfOrigem = findColumn(headers, ['UF ORIGEM', 'UF_ORIGEM', 'ORIGEM', 'UF ORIG']);
    const colUfDestino = findColumn(headers, ['UF DESTINO', 'UF_DESTINO', 'DESTINO', 'UF DEST']);
    const colUrbano = findColumn(headers, ['URBANO']);
    const colValor = findColumn(headers, ['VALOR DE MERCADORIA', 'VALOR MERCADORIA', 'VALOR', 'VL_MERCADORIA', 'VLMERCADORIA', 'MERCADORIA', 'VL MERCADORIA']);

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
    const parsed = deduped.map(record => ({
      data_embarque: colData ? record[colData] : null,
      data_obj: colData ? parseDate(record[colData]) : null,
      placa: colPlaca ? String(record[colPlaca] || '') : '',
      itinerario_raw: colItinerario ? String(record[colItinerario] || '').trim() : '',
      uf_origem: colUfOrigem ? String(record[colUfOrigem] || '') : '',
      uf_destino: colUfDestino ? String(record[colUfDestino] || '') : '',
      urbano: colUrbano ? String(record[colUrbano] || '') : '',
      valor: colValor ? parseNumber(record[colValor]) : 0,
      num_nf: colNumNf ? String(record[colNumNf] || '') : ''
    }));

    // Sort by date ascending
    parsed.sort((a, b) => {
      if (!a.data_obj) return 1;
      if (!b.data_obj) return -1;
      return a.data_obj - b.data_obj;
    });

    // Group by date, then by route, assign sequential positions
    const byDate = {};
    parsed.forEach(r => {
      const dateKey = r.data_obj ? r.data_obj.toDateString() : 'sem_data';
      if (!byDate[dateKey]) byDate[dateKey] = {};
      const route = r.itinerario_raw || 'sem_rota';
      if (!byDate[dateKey][route]) byDate[dateKey][route] = [];
      byDate[dateKey][route].push(r);
    });

    const records = [];
    Object.keys(byDate).sort((a, b) => {
      if (a === 'sem_data') return 1;
      if (b === 'sem_data') return -1;
      return new Date(a) - new Date(b);
    }).forEach(dateKey => {
      const routes = byDate[dateKey];
      Object.keys(routes).sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }).forEach(route => {
        const routeRecords = routes[route];
        const routeNum = Number(route);
        routeRecords.forEach((r, idx) => {
          const position = idx + 1;
          let itinerarioFormatado;
          let itinerarioNum = null;
          if (!isNaN(routeNum) && routeNum >= 90) {
            const suffix = position * 10 + (routeNum - 90);
            itinerarioFormatado = `${routeNum} - ${suffix}`;
            itinerarioNum = routeNum;
          } else {
            itinerarioFormatado = route;
          }
          const { data_obj, ...rest } = r;
          records.push({
            ...rest,
            data_embarque: r.data_obj ? r.data_obj.toISOString() : '',
            itinerario: itinerarioNum,
            itinerario_formatado: itinerarioFormatado,
            sequencia: position
          });
        });
      });
    });

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
        placa: colPlaca,
        itinerario: colItinerario,
        uf_origem: colUfOrigem,
        uf_destino: colUfDestino,
        urbano: colUrbano,
        valor: colValor
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});