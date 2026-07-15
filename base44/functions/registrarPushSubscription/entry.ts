import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { colaborador_id, filial_id, subscription } = body;

    if (!colaborador_id || !subscription?.endpoint) {
      return Response.json({ error: 'colaborador_id e subscription.endpoint são obrigatórios' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Check if subscription already exists (by endpoint)
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint: subscription.endpoint });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, {
        colaborador_id,
        filial_id: filial_id || '',
        keys_p256dh: subscription.keys?.p256dh || '',
        keys_auth: subscription.keys?.auth || '',
      });
      return Response.json({ success: true, updated: true });
    }

    // Create new subscription
    await base44.asServiceRole.entities.PushSubscription.create({
      colaborador_id,
      filial_id: filial_id || '',
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys?.p256dh || '',
      keys_auth: subscription.keys?.auth || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});