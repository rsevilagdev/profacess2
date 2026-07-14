import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const CONNECTOR_ID = '6a55e0fd672f74bf2706a36a';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function sanitizeTabName(name) {
  return (name || 'Averbação').replace(/[\\/?*[\]:]/g, '-').substring(0, 31);
}

function formatDateBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('pt-BR');
}

function formatCurrencyBR(v) {
  return (v || 0).toFixed(2).replace('.', ',');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { spreadsheet_id, records, view, period_label, metadata } = body;

    if (!spreadsheet_id) return Response.json({ error: 'spreadsheet_id é obrigatório' }, { status: 400 });
    if (!Array.isArray(records) || records.length === 0) return Response.json({ error: 'records vazio' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const tabName = sanitizeTabName(period_label || 'Averbação');
    const encTab = encodeURIComponent(tabName);

    // Check if tab exists, create if not
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meta = await metaRes.json();
    const exists = meta.sheets?.some(s => s.properties?.title === tabName);

    if (!exists) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] })
      });
    }

    // Clear existing data
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encTab}!A1:Z10000:clear`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: '{}'
    });

    // Build rows
    const rows = [];
    rows.push(['AVERBAÇÃO - PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA']);
    rows.push([`Período: ${period_label || ''} | CNPJ: ${metadata?.cnpj || ''} | Filial: ${metadata?.filial || ''}`]);
    rows.push([]);
    rows.push(['Data', 'Prioridade', 'Rota', 'Valor']);

    // Group by day (mensal) or month (semestral)
    const groups = {};
    records.forEach(r => {
      const date = new Date(r.data_embarque);
      if (isNaN(date)) return;
      const key = view === 'mensal' ? date.toDateString() : String(date.getMonth());
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (view === 'mensal') return new Date(a) - new Date(b);
      return Number(a) - Number(b);
    });

    let grandTotal = 0;

    sortedKeys.forEach(key => {
      const dayRecords = groups[key];
      const groupLabel = view === 'mensal'
        ? formatDateBR(dayRecords[0].data_embarque)
        : MESES[Number(key)];

      rows.push([`${view === 'mensal' ? 'DIA' : 'MÊS'}: ${groupLabel}`, '', '', '']);

      // Block 1: Prioridades 1-89 (agrupado por prioridade)
      const block1 = dayRecords.filter(r => r.prioridade < 90);
      const b1Groups = {};
      block1.forEach(r => {
        const p = r.prioridade || 0;
        if (!b1Groups[p]) b1Groups[p] = 0;
        b1Groups[p] += r.valor || 0;
      });
      let b1Total = 0;
      if (Object.keys(b1Groups).length > 0) {
        rows.push(['', 'Prioridades 1 a 89', '', '']);
        Object.keys(b1Groups).sort((a, b) => Number(a) - Number(b)).forEach(p => {
          rows.push(['', `Prioridade ${p}`, '', formatCurrencyBR(b1Groups[p])]);
          b1Total += b1Groups[p];
        });
        rows.push(['', 'Subtotal 1-89', '', formatCurrencyBR(b1Total)]);
      }

      // Block 2: Prioridades 90 e 91 (detalhado por rota)
      const block2 = dayRecords.filter(r => r.prioridade === 90 || r.prioridade === 91);
      const b2Groups = {};
      block2.forEach(r => {
        const key2 = `${r.prioridade}|${r.rota || 0}`;
        if (!b2Groups[key2]) b2Groups[key2] = { prioridade: r.prioridade, rota: r.rota || 0, total: 0 };
        b2Groups[key2].total += r.valor || 0;
      });
      let b2Total = 0;
      if (Object.keys(b2Groups).length > 0) {
        rows.push(['', 'Prioridades 90 e 91 (por Rota)', '', '']);
        const b2Keys = Object.keys(b2Groups).sort((a, b) => {
          const [pa, ra] = a.split('|').map(Number);
          const [pb, rb] = b.split('|').map(Number);
          return pa !== pb ? pa - pb : ra - rb;
        });
        let lastPrioridade = -1;
        let prioridadeTotal = 0;
        b2Keys.forEach((k, idx) => {
          const g = b2Groups[k];
          if (g.prioridade !== lastPrioridade && lastPrioridade >= 0) {
            rows.push(['', `Subtotal Prioridade ${lastPrioridade}`, '', formatCurrencyBR(prioridadeTotal)]);
            prioridadeTotal = 0;
          }
          rows.push(['', `Prioridade ${g.prioridade}`, `Rota ${g.rota}`, formatCurrencyBR(g.total)]);
          prioridadeTotal += g.total;
          b2Total += g.total;
          lastPrioridade = g.prioridade;
          if (idx === b2Keys.length - 1) {
            rows.push(['', `Subtotal Prioridade ${lastPrioridade}`, '', formatCurrencyBR(prioridadeTotal)]);
          }
        });
        rows.push(['', 'Subtotal 90-91', '', formatCurrencyBR(b2Total)]);
      }

      // Block 3: Prioridades >91 (agrupado por prioridade)
      const block3 = dayRecords.filter(r => r.prioridade > 91);
      const b3Groups = {};
      block3.forEach(r => {
        const p = r.prioridade || 0;
        if (!b3Groups[p]) b3Groups[p] = 0;
        b3Groups[p] += r.valor || 0;
      });
      let b3Total = 0;
      if (Object.keys(b3Groups).length > 0) {
        rows.push(['', 'Prioridades acima de 91', '', '']);
        Object.keys(b3Groups).sort((a, b) => Number(a) - Number(b)).forEach(p => {
          rows.push(['', `Prioridade ${p}`, '', formatCurrencyBR(b3Groups[p])]);
          b3Total += b3Groups[p];
        });
        rows.push(['', 'Subtotal >91', '', formatCurrencyBR(b3Total)]);
      }

      const dayTotal = b1Total + b2Total + b3Total;
      rows.push([`TOTAL ${groupLabel}`, '', '', formatCurrencyBR(dayTotal)]);
      rows.push([]);
      grandTotal += dayTotal;
    });

    rows.push([`TOTAL ${period_label || ''}`, '', '', formatCurrencyBR(grandTotal)]);

    // Write data
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encTab}!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      }
    );

    if (!writeRes.ok) {
      const errText = await writeRes.text();
      return Response.json({ error: errText }, { status: writeRes.status });
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_name: user.full_name || 'Sistema',
        action: 'Averbação enviada para Google Sheets',
        details: `${period_label} - ${records.length} registros, ${rows.length} linhas, aba ${tabName}`,
        category: 'export',
        ip_address: 'system',
        domain: 'averbacao_sheets'
      });
    } catch (e) {}

    return Response.json({ success: true, rows_written: rows.length, tab_name: tabName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});