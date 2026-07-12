import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    let body = {};
    try { body = await req.json(); } catch (e) {}
    const cnhNumber = String(body.cnh || '').trim();
    const cpf = String(body.cpf || '').replace(/\D/g, '');

    if (!cnhNumber) return Response.json({ error: 'Número da CNH é obrigatório' }, { status: 400 });

    // Check in database first
    const drivers = await base44.asServiceRole.entities.Driver.filter({ cnh: cnhNumber }).catch(() => []);
    let dbStatus = 'not_found';
    let driverData = null;
    if (drivers.length > 0) {
      driverData = drivers[0];
      if (cpf && driverData.cpf && String(driverData.cpf).replace(/\D/g, '') !== cpf) {
        dbStatus = 'cpf_mismatch';
      } else if (driverData.status === 'bloqueado') {
        dbStatus = 'blocked';
      } else if (driverData.cnh_validade && new Date(driverData.cnh_validade) < new Date()) {
        dbStatus = 'expired';
      } else {
        dbStatus = 'valid_in_db';
      }
    }

    // Verify authenticity using LLM with internet context
    const prompt = `Verifique a autenticidade e validade da seguinte CNH brasileira:
Número da CNH: ${cnhNumber}
${cpf ? 'CPF do motorista: ' + cpf : ''}

Forneça:
1. Se o formato do número da CNH é válido (11 dígitos)
2. Se há alguma informação pública sobre esta CNH
3. Status geral da verificação

Responda em JSON no formato:
{
  "formato_valido": true/false,
  "numero_digitos": número,
  "observacoes": "texto",
  "status_verificacao": "valido" | "invalido" | "inconclusivo"
}`;

    let llmResult = null;
    try {
      llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            formato_valido: { type: 'boolean' },
            numero_digitos: { type: 'number' },
            observacoes: { type: 'string' },
            status_verificacao: { type: 'string' }
          }
        }
      });
    } catch (e) {
      llmResult = { formato_valido: cnhNumber.length === 11, numero_digitos: cnhNumber.length, observacoes: 'Verificação automática indisponível', status_verificacao: 'inconclusivo' };
    }

    if (user) {
      await base44.asServiceRole.entities.AuditLog.create({
        user_name: user.full_name || 'Sistema',
        user_cpf: cpf || '',
        action: 'Verificação de CNH realizada',
        details: `CNH: ${cnhNumber} | DB: ${dbStatus} | LLM: ${llmResult.status_verificacao}`,
        category: 'search',
        ip_address: 'system',
        domain: 'automated'
      });
    }

    return Response.json({
      success: true,
      cnh: cnhNumber,
      dbStatus,
      driverData: driverData ? { nome: driverData.nome, sobrenome: driverData.sobrenome, cpf: driverData.cpf, cnh_validade: driverData.cnh_validade, status: driverData.status } : null,
      verification: llmResult
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});