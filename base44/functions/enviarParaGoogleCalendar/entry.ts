import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const CONNECTOR_ID = '6a55e0eb7be8e64d717e793e';

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

    const { titulo, descricao, inicio, fim } = body;
    if (!titulo || !inicio) return Response.json({ error: 'titulo e inicio são obrigatórios' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const event = {
      summary: titulo,
      description: descricao || '',
      start: { dateTime: inicio, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: fim || inicio, timeZone: 'America/Sao_Paulo' },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: errText }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ success: true, event_id: data.id, html_link: data.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});