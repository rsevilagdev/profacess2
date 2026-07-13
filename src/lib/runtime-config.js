/**
 * Configuração Dinâmica em Tempo de Execução
 * =============================================================================
 * Resolve as variáveis de configuração do app a partir de múltiplas fontes,
 * em ordem de prioridade, permitindo que o app funcione em qualquer host
 * sem depender de injeção da plataforma Base44.
 *
 * Ordem de resolução (primeiro encontrado vence):
 *   1. window.__BASE44_CONFIG__ (injetado no index.html — pode ser editado em produção)
 *   2. URL params (?app_id=...&app_base_url=...)
 *   3. localStorage (configuração persistida pelo usuário)
 *   4. import.meta.env (variáveis de build do Vite)
 *   5. Auto-detecção baseada no domínio atual
 * =============================================================================
 */

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

// URLs padrão conhecidas da API Base44
const KNOWN_API_URLS = [
  'https://api.base44.com',
  'https://base44.com',
];

// Mapeamento de domínios conhecidos para App IDs (editável em produção)
const DOMAIN_APP_MAP = {
  // Adicione mapeamentos personalizados aqui se necessário
  // 'meuapp.com': 'com.base44.meuapp',
};

/**
 * Tenta detectar automaticamente a URL base da API
 */
function autoDetectApiBaseUrl() {
  if (isNode) return KNOWN_API_URLS[0];

  const origin = window.location.origin;

  // Se estamos rodando na Base44 (preview ou produção), usar origem relativa
  if (
    origin.includes('base44.com') ||
    origin.includes('base44.dev') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return ''; // URL relativa — mesmo domínio do app
  }

  // Se estamos em host externo, usar a API pública da Base44
  return KNOWN_API_URLS[0];
}

/**
 * Tenta detectar automaticamente o App ID
 */
function autoDetectAppId() {
  if (isNode) return null;

  const origin = window.location.origin;
  const hostname = window.location.hostname;

  // 1. Mapeamento manual por domínio
  if (DOMAIN_APP_MAP[hostname]) {
    return DOMAIN_APP_MAP[hostname];
  }

  // 2. Tentar extrair do subdomínio (ex: meuapp.base44.com → com.base44.meuapp)
  if (hostname.includes('base44.com') && hostname !== 'base44.com') {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      return `com.base44.${subdomain}`;
    }
  }

  // 3. Procurar no localStorage (configuração persistida anteriormente)
  const stored = storage.getItem('base44_app_id');
  if (stored) return stored;

  // 4. Procurar no window.__BASE44_CONFIG__
  if (windowObj.__BASE44_CONFIG__?.appId) {
    return windowObj.__BASE44_CONFIG__.appId;
  }

  return null;
}

/**
 * Lê um valor de configuração de múltiplas fontes
 */
function resolveConfigValue(key, envKey, autoDetectFn) {
  // 1. window.__BASE44_CONFIG__ (configuração de tempo de execução)
  if (!isNode && windowObj.__BASE44_CONFIG__?.[key] != null) {
    return windowObj.__BASE44_CONFIG__[key];
  }

  if (isNode) {
    return import.meta.env[envKey] || autoDetectFn();
  }

  // 2. URL params
  const urlParams = new URLSearchParams(window.location.search);
  const urlValue = urlParams.get(key);
  if (urlValue) {
    const storageKey = `base44_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    storage.setItem(storageKey, urlValue);
    return urlValue;
  }

  // 3. localStorage
  const storageKey = `base44_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
  const stored = storage.getItem(storageKey);
  if (stored) return stored;

  // 4. Variável de ambiente do Vite (build-time)
  if (import.meta.env[envKey]) {
    return import.meta.env[envKey];
  }

  // 5. Auto-detecção
  return autoDetectFn();
}

/**
 * Resolve todas as configurações do app
 */
export function resolveRuntimeConfig() {
  const appId = resolveConfigValue('appId', 'VITE_BASE44_APP_ID', autoDetectAppId);
  const appBaseUrl = resolveConfigValue('appBaseUrl', 'VITE_BASE44_APP_BASE_URL', autoDetectApiBaseUrl);
  const functionsVersion = resolveConfigValue('functionsVersion', 'VITE_BASE44_FUNCTIONS_VERSION', () => '');

  // Token e fromUrl continuam usando a lógica original
  const urlParams = !isNode ? new URLSearchParams(window.location.search) : null;
  let token = null;
  if (urlParams) {
    token = urlParams.get('access_token');
    if (token) {
      storage.setItem('base44_access_token', token);
      // Remove da URL
      urlParams.delete('access_token');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    } else {
      token = storage.getItem('base44_access_token');
    }
  }

  const fromUrl = !isNode ? window.location.href : '';

  // Limpa token se solicitado
  if (!isNode && urlParams?.get('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
    token = null;
  }

  // Persiste appId detectado para reuso
  if (appId && !isNode) {
    storage.setItem('base44_app_id', appId);
  }

  return {
    appId,
    token,
    fromUrl,
    functionsVersion,
    appBaseUrl,
    serverUrl: appBaseUrl || '',
    isAutoDetected: !import.meta.env.VITE_BASE44_APP_ID,
  };
}

/**
 * Verifica se a configuração está completa
 */
export function isConfigComplete(config) {
  return !!(config.appId && (config.appBaseUrl !== undefined));
}

/**
 * Permite atualizar a configuração em tempo de execução (para auto-reparo)
 */
export function updateRuntimeConfig(updates) {
  if (isNode) return;

  if (updates.appId) {
    storage.setItem('base44_app_id', updates.appId);
  }
  if (updates.appBaseUrl !== undefined) {
    const storageKey = 'base44_app_base_url';
    if (updates.appBaseUrl) {
      storage.setItem(storageKey, updates.appBaseUrl);
    } else {
      storage.removeItem(storageKey);
    }
  }
  if (updates.functionsVersion !== undefined) {
    const storageKey = 'base44_functions_version';
    if (updates.functionsVersion) {
      storage.setItem(storageKey, updates.functionsVersion);
    }
  }
}