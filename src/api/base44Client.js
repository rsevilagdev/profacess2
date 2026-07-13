import { createClient } from '@base44/sdk';

// O plugin @base44/vite-plugin injeta automaticamente as variáveis
// de ambiente (VITE_BASE44_APP_ID, etc.) no build.
// O SDK resolve tudo internamente — não é necessário config custom.
export const base44 = createClient({
  requiresAuth: false,
});