import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

function formatItinerario(n) {
  const num = Number(n);
  if (isNaN(num) || num === 0) return String(n || '');
  if (num % 2 === 1) {
    return `90 - ${(num + 1) / 2 * 10}`;
  } else {
    return `91 - ${num / 2 * 10 + 1}`;
  }
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
    const arrayBuffer = await fileRes.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return Response.json({ error: 'Nenhuma aba encontrada no arquivo' }, { status: 400 });

    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });

    // Row 0: merged title (Razão Social Segurado: PROFARMA...)
    // Row 1: metadata (Cnpj Segurado:, CNPJ, Mês:, Mês, Filial, Filial, Total)
    // Row 2: column headers
    // Row 3+: data
    let metadata = { cnpj: '', mes: '', filial: '', total: 0 };
    if (rows.length > 1) {
      const r1 = rows[1];
      metadata = {
        cnpj: String(r1[1] || ''),
        mes: String(r1[3] || ''),
        filial: String(r1[5] || ''),
        total: Number(r1[6] || 0)
      };
    }

    const records = [];
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;

      const itinerarioRaw = row[2];
      const itinerario = Number(itinerarioRaw) || 0;
      const dateVal = row[0];
      const dataEmbarque = dateVal instanceof Date ? dateVal.toISOString() : String(dateVal || '');

      records.push({
        data_embarque: dataEmbarque,
        placa: String(row[1] || ''),
        itinerario: itinerario,
        itinerario_formatado: formatItinerario(itinerarioRaw),
        uf_origem: String(row[3] || ''),
        uf_destino: String(row[4] || ''),
        urbano: String(row[5] || ''),
        valor: Number(row[6] || 0)
      });
    }

    // Determine available months and semesters
    const monthsSet = new Set();
    const semestersSet = new Set();
    records.forEach(r => {
      const d = new Date(r.data_embarque);
      if (!isNaN(d)) {
        monthsSet.add(d.getMonth());
        semestersSet.add(d.getMonth() < 6 ? 1 : 2);
      }
    });

    if (user) {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_name: user.full_name || 'Sistema',
          action: 'Processamento de planilha de averbação',
          details: `${records.length} registros processados`,
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
      available_months: [...monthsSet].sort((a, b) => a - b),
      available_semesters: [...semestersSet].sort((a, b) => a - b)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});