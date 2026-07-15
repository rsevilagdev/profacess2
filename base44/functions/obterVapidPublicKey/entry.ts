import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check if VAPID config already exists
    const configs = await base44.asServiceRole.entities.PushConfig.list();
    if (configs.length > 0) {
      return Response.json({ publicKey: configs[0].vapid_public_key });
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();
    await base44.asServiceRole.entities.PushConfig.create({
      vapid_public_key: vapidKeys.publicKey,
      vapid_private_key: vapidKeys.privateKey,
      vapid_subject: 'mailto:profarma@liberaauto.pro',
    });

    return Response.json({ publicKey: vapidKeys.publicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});