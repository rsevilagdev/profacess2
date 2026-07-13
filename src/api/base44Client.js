import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

// Cria o cliente com configuração dinâmica
// serverUrl é resolvido dinamicamente: '' (mesmo domínio) ou URL da API Base44
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: serverUrl || '',
  requiresAuth: false,
  appBaseUrl
});