import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { colaborador_id, filial_id } = body;

    if (!colaborador_id) {
      return Response.json({ error: 'colaborador_id é obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch recent unread notifications using service role (SW has no user auth)
    const allNotifications = await base44.asServiceRole.entities.Notification.list('-created_date', 50);

    const unread = allNotifications.filter(n => {
      if (n.read) return false;
      // Directly targeted to this user
      if (n.target_user_id) return n.target_user_id === colaborador_id;
      // Targeted to this filial
      if (n.branch_id && filial_id) return n.branch_id === filial_id;
      return false;
    });

    // Mark them as read so the main app doesn't show duplicates when it opens
    for (const n of unread) {
      try {
        await base44.asServiceRole.entities.Notification.update(n.id, { read: true });
      } catch { /* silent */ }
    }

    return Response.json({
      notifications: unread.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        sender_name: n.sender_name,
        type: n.type,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message, notifications: [] }, { status: 500 });
  }
});