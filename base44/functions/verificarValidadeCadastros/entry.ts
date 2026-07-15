import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    let backfilledVehicles = 0;
    let backfilledDrivers = 0;
    let expiredVehicles = 0;
    let expiredDrivers = 0;

    // Process vehicles — backfill missing dates and auto-expire
    const vehicles = await base44.asServiceRole.entities.Vehicle.list('-created_date', 500);
    for (const v of vehicles) {
      const updateData = {};

      // Backfill: set data_cadastro and data_validade if missing
      if (!v.data_cadastro) {
        const createdDate = v.created_date || now.toISOString();
        const validade = new Date(createdDate);
        validade.setMonth(validade.getMonth() + 6);
        updateData.data_cadastro = createdDate;
        updateData.data_validade = validade.toISOString();
        backfilledVehicles++;
      }

      // Auto-expire: if data_validade is in the past and still validated, set to pending
      if (v.data_validade && new Date(v.data_validade) < now && v.status === 'validado') {
        updateData.status = 'pendente_revisao';
        expiredVehicles++;
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Vehicle.update(v.id, updateData);
      }
    }

    // Process drivers — same logic
    const drivers = await base44.asServiceRole.entities.Driver.list('-created_date', 500);
    for (const d of drivers) {
      const updateData = {};

      if (!d.data_cadastro) {
        const createdDate = d.created_date || now.toISOString();
        const validade = new Date(createdDate);
        validade.setMonth(validade.getMonth() + 6);
        updateData.data_cadastro = createdDate;
        updateData.data_validade = validade.toISOString();
        backfilledDrivers++;
      }

      if (d.data_validade && new Date(d.data_validade) < now && d.status === 'validado') {
        updateData.status = 'pendente_revisao';
        expiredDrivers++;
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Driver.update(d.id, updateData);
      }
    }

    // Log results
    await base44.asServiceRole.entities.AuditLog.create({
      user_name: 'Sistema',
      action: 'Verificação automática de validade',
      details: `Veículos: ${backfilledVehicles} backfill, ${expiredVehicles} vencidos | Motoristas: ${backfilledDrivers} backfill, ${expiredDrivers} vencidos`,
      ip_address: 'system',
      category: 'vehicle',
    });

    return Response.json({
      success: true,
      backfilledVehicles,
      backfilledDrivers,
      expiredVehicles,
      expiredDrivers
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});