import { createClient } from "@base44/sdk";

// As variáveis são injetadas pelo @base44/vite-plugin no build da plataforma.
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  serverUrl: import.meta.env.VITE_BASE44_BACKEND_URL,
  appBaseUrl: import.meta.env.VITE_BASE44_BACKEND_URL,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
});