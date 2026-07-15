import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get VAPID config
    const configs = await base44.asServiceRole.entities.PushConfig.list();
    if (configs.length === 0) {
      return Response.json({ error: 'VAPID config não encontrado' }, { status: 400 });
    }
    const config = configs[0];

    webpush.setVapidDetails(
      'mailto:profarma@liberaauto.pro',
      config.vapid_public_key,
      config.vapid_private_key
    );

    // Get unread + unpushed notifications
    const allNotifs = await base44.asServiceRole.entities.Notification.list('-created_date', 100);
    const pending = allNotifs.filter(n => !n.read && !n.pushed);

    if (pending.length === 0) {
      return Response.json({ sent: 0, message: 'Nenhuma notificação pendente' });
    }

    // Get all push subscriptions
    const allSubs = await base44.asServiceRole.entities.PushSubscription.list();

    let sentCount = 0;
    let processedCount = 0;

    for (const notif of pending) {
      // Find subscriptions for this notification's target
      const targetSubs = allSubs.filter(s => {
        if (notif.target_user_id) return s.colaborador_id === notif.target_user_id;
        if (notif.branch_id) return s.filial_id === notif.branch_id;
        return false;
      });

      const payload = JSON.stringify({
        id: notif.id,
        title: notif.title,
        message: notif.message || '',
        sender_name: notif.sender_name || '',
      });

      let pushSent = false;
      let hasTargets = targetSubs.length > 0;

      for (const sub of targetSubs) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          }, payload);
          pushSent = true;
          sentCount++;
        } catch (e) {
          // If subscription is expired (410 Gone / 404), delete it
          const statusCode = e?.statusCode || e?.status;
          if (statusCode === 410 || statusCode === 404) {
            try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch { /* silent */ }
          }
        }
      }

      // Mark as pushed if: push was sent successfully, OR there are no target subscriptions
      if (pushSent || !hasTargets) {
        try {
          await base44.asServiceRole.entities.Notification.update(notif.id, { pushed: true });
          processedCount++;
        } catch { /* silent */ }
      }
    }

    return Response.json({ sent: sentCount, processed: processedCount, pending: pending.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});