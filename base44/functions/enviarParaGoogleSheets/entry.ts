import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const CONNECTOR_ID = '6a55e0fd672f74bf2706a36a';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body.check_only) {
      try {
        await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        return Response.json({ connected: true });
      } catch {
        return Response.json({ connected: false }, { status: 400 });
      }
    }

    const { spreadsheet_id, dados } = body;
    if (!spreadsheet_id) return Response.json({ error: 'spreadsheet_id é obrigatório' }, { status: 400 });
    if (!Array.isArray(dados)) return Response.json({ error: 'dados deve ser um array' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [dados] }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: errText }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ success: true, updatedCells: data.updates?.updatedCells || 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});