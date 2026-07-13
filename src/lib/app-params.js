import { resolveRuntimeConfig, isConfigComplete } from '@/lib/runtime-config';

/**
 * Parâmetros do App — Resolvidos dinamicamente
 * =============================================================================
 * As variáveis são resolvidas em tempo de execução a partir de múltiplas fontes:
 *   1. window.__BASE44_CONFIG__ (index.html)
 *   2. URL params (?app_id=...&app_base_url=...)
 *   3. localStorage (configuração persistida)
 *   4. Variáveis de build do Vite (VITE_BASE44_*)
 *   5. Auto-detecção baseada no domínio atual
 *
 * Isto permite que o app funcione em qualquer host (GitHub Pages, Vercel,
 * Netlify, etc.) sem depender de injeção manual da plataforma Base44.
 * =============================================================================
 */

const resolved = resolveRuntimeConfig();

// Aviso amigável no console se a configuração estiver incompleta
if (!isConfigComplete(resolved) && !resolved.appId) {
  console.warn(
    '%c⚠️ PROFARMA LIBERAAUTO PRO',
    'color: #dc2626; font-weight: bold; font-size: 14px;',
    '\n\nApp ID não detectado automaticamente.\n' +
    'O app tentará funcionar, mas pode não conectar ao backend.\n\n' +
    'Para configurar manualmente:\n' +
    '  1. Edite window.__BASE44_CONFIG__ no index.html, ou\n' +
    '  2. Adicione ?app_id=SEU_APP_ID na URL, ou\n' +
    '  3. Configure a variável VITE_BASE44_APP_ID no ambiente de build\n'
  );
}

export const appParams = resolved;