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
    rows.push(['Data do Embarque', 'Placa Veículo', 'Itinerário', 'UF Origem', 'UF Destino', 'Urbano', 'Valor de mercadoria']);

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

      // Day/month header row
      rows.push([`${view === 'mensal' ? 'DIA' : 'MÊS'}: ${groupLabel}`, '', '', '', '', '', '']);

      // Group by route (priority) within the day
      const routeGroups = {};
      dayRecords.forEach(r => {
        const route = r.itinerario != null ? String(r.itinerario) : 'Outros';
        if (!routeGroups[route]) routeGroups[route] = [];
        routeGroups[route].push(r);
      });

      const routeKeys = Object.keys(routeGroups).sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      let dayTotal = 0;

      routeKeys.forEach(route => {
        const routeRecords = routeGroups[route];
        let routeTotal = 0;

        routeRecords.forEach(r => {
          rows.push([
            formatDateBR(r.data_embarque),
            r.placa || '',
            r.itinerario_formatado || '',
            r.uf_origem || '',
            r.uf_destino || '',
            r.urbano || '',
            formatCurrencyBR(r.valor)
          ]);
          routeTotal += r.valor || 0;
        });

        // Route subtotal
        rows.push(['', '', `Subtotal Rota ${route}`, '', '', '', formatCurrencyBR(routeTotal)]);
        dayTotal += routeTotal;
      });

      // Day subtotal
      rows.push(['', `TOTAL ${groupLabel}`, '', '', '', '', formatCurrencyBR(dayTotal)]);
      rows.push([]);
      grandTotal += dayTotal;
    });

    // Grand total
    rows.push(['', `TOTAL ${period_label || ''}`, '', '', '', '', formatCurrencyBR(grandTotal)]);

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