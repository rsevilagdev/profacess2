import { useState, useEffect } from 'react';
import { Shield, Loader2, Settings, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { updateRuntimeConfig, resolveRuntimeConfig } from '@/lib/runtime-config';

/**
 * Componente de Auto-Reparo de Configuração
 * =============================================================================
 * Detecta se as variáveis de ambiente estão ausentes ou inválidas e
 * oferece uma interface para o usuário configurar o app em tempo de execução,
 * sem precisar recompilar ou acessar a plataforma Base44.
 */
export default function ConfigAutoRepair() {
  const [show, setShow] = useState(false);
  const [config, setConfig] = useState({
    appId: appParams.appId || '',
    appBaseUrl: appParams.appBaseUrl || '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Mostra o painel se o appId não foi detectado
    const checkConfig = () => {
      const current = resolveRuntimeConfig();
      if (!current.appId) {
        setShow(true);
      }
    };
    checkConfig();
  }, []);

  const handleSave = () => {
    updateRuntimeConfig({
      appId: config.appId.trim(),
      appBaseUrl: config.appBaseUrl.trim(),
    });
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Salva antes de testar
      updateRuntimeConfig({
        appId: config.appId.trim(),
        appBaseUrl: config.appBaseUrl.trim(),
      });

      // Tenta uma chamada simples para verificar conexão
      await base44.entities.Filial.list();
      setTestResult('success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setTestResult('error');
    }
    setTesting(false);
  };

  const handleReset = () => {
    localStorage.removeItem('base44_app_id');
    localStorage.removeItem('base44_app_base_url');
    localStorage.removeItem('base44_functions_version');
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary text-primary-foreground shadow-xl mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="brand-title text-2xl text-foreground">PROFARMA</h1>
          <p className="text-sm text-muted-foreground tracking-wide mt-1">LIBERAAUTO PRO</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl shadow-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="font-heading font-bold text-lg">Configuração Necessária</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-5">
            O App ID não foi detectado automaticamente. Configure abaixo para que o
            aplicativo funcione corretamente.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">App ID *</label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="com.base44.profarma"
                className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontrado no editor da Base44 ou na URL do app
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">URL da API</label>
              <input
                type="text"
                value={config.appBaseUrl}
                onChange={(e) => setConfig({ ...config, appBaseUrl: e.target.value })}
                placeholder="https://api.base44.com (deixe vazio para mesmo domínio)"
                className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio se o app está hospedado na Base44
              </p>
            </div>

            {/* Status */}
            {testResult === 'success' && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-xl p-3 text-sm">
                <CheckCircle className="h-4 w-4" />
                Conexão bem-sucedida! Recarregando...
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Falha na conexão. Verifique os valores e tente novamente.
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-xl p-3 text-sm">
                <CheckCircle className="h-4 w-4" />
                Configuração salva!
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 h-12 rounded-2xl border border-border bg-card hover:bg-muted flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <Settings className="h-4 w-4" />
                Salvar
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !config.appId}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {testing ? 'Testando...' : 'Salvar e Testar'}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mt-2"
            >
              <RefreshCw className="h-3 w-3" />
              Limpar configuração e tentar auto-detecção
            </button>
          </div>

          <div className="mt-5 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
            <p className="font-medium mb-1">💡 Dica</p>
            <p>
              Você também pode configurar via URL adicionando:
              <code className="block mt-1 p-2 bg-background rounded-lg overflow-x-auto">
                ?app_id=SEU_APP_ID&app_base_url=https://api.base44.com
              </code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 PROFARMA LIBERAAUTO PRO
        </p>
      </div>
    </div>
  );
}