const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


// Verificação de variáveis de ambiente — avisa no console se faltar
// configuração essencial (apenas em desenvolvimento)
if (!getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID })) {
	console.warn(
		'%c⚠️ PROFARMA LIBERAAUTO PRO — Variável de ambiente ausente',
		'color: #dc2626; font-weight: bold; font-size: 14px;',
		'\n\nVITE_BASE44_APP_ID não está definida. O app não funcionará corretamente.\n' +
		'Se está fazendo build fora da plataforma Base44 (GitHub, Vercel, etc.),\n' +
		'configure as variáveis de ambiente conforme o arquivo .env.example\n\n' +
		'Variáveis necessárias:\n' +
		'  • VITE_BASE44_APP_ID       → ID do app na Base44\n' +
		'  • VITE_BASE44_APP_BASE_URL → URL do backend da Base44\n'
	);
}
if (!getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL })) {
	console.warn(
		'%c⚠️ PROFARMA LIBERAAUTO PRO — Variável de ambiente ausente',
		'color: #dc2626; font-weight: bold; font-size: 14px;',
		'\n\nVITE_BASE44_APP_BASE_URL não está definida. O app não conseguirá\n' +
		'conectar ao backend da Base44.\n' +
		'Veja o arquivo .env.example para instruções de configuração.\n'
	);
}

export const appParams = {
	...getAppParams()
}