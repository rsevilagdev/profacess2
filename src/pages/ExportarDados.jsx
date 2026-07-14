import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Database, Loader2, Check, X, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const ENTITIES = [
  { name: 'Vehicle', label: 'Veículos' },
  { name: 'Driver', label: 'Motoristas' },
  { name: 'AccessLog', label: 'Logs de Acesso' },
  { name: 'AuditLog', label: 'Logs de Auditoria' },
  { name: 'Colaborador', label: 'Colaboradores' },
  { name: 'Filial', label: 'Filiais' },
  { name: 'Notification', label: 'Notificações' },
  { name: 'BackupLog', label: 'Backups' },
  { name: 'ReviewRequest', label: 'Solicitações de Revisão' },
  { name: 'SolicitacaoAcesso', label: 'Solicitações de Acesso' },
];

export default function ExportarDados() {
  const { colaborador } = useProfarmaAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const isAdmin = ['administrador_master', 'administrador'].includes(colaborador?.cargo);

  const exportJSON = async () => {
    setExporting(true);
    try {
      const data = {};
      for (const ent of ENTITIES) {
        try { data[ent.name] = await base44.entities[ent.name].list('-created_date', 1000); } catch (e) { data[ent.name] = []; }
      }
      const exportObj = {
        exportDate: new Date().toISOString(),
        exportedBy: colaborador.nome,
        system: 'PROFARMA_LIBERAAUTO_PRO',
        version: '4.0',
        appDesign: {
          theme: 'Material 3 - Paleta verde/cinza',
          darkMode: false,
          layout: 'Menu flutuante superior',
          responsive: true,
          language: 'pt-BR',
          fonts: { heading: 'Inter', body: 'Inter', display: 'Inter' },
          colors: {
            primary: 'hsl(173 100% 21%) - Verde teal',
            background: 'hsl(80 27% 96%) - Cinza claro',
            destructive: 'hsl(0 62% 50%) - Vermelho',
          }
        },
        pages: [
          { path: '/', name: 'LoginProfarma', description: 'Login por CPF, senha e filial' },
          { path: '/solicitar-acesso', name: 'SolicitarAcesso', description: 'Solicitação de acesso ao sistema' },
          { path: '/forgot-password', name: 'ForgotPassword', description: 'Recuperação de senha por CPF' },
          { path: '/dashboard', name: 'Dashboard', description: 'Painel principal com métricas e relatórios' },
          { path: '/acessos', name: 'Acessos', description: 'Registro de acesso com verificação de placa e CPF, kanban de liberação' },
          { path: '/painel-bloqueio', name: 'PainelBloqueio', description: 'Painel de bloqueios com multi-filtro e validação com foto' },
          { path: '/editar-base', name: 'EditarBase', description: 'CRUD de veículos e motoristas' },
          { path: '/relatorios', name: 'Relatorios', description: 'Relatórios operacionais com gráficos' },
          { path: '/relatorio-personalizado', name: 'RelatorioPersonalizado', description: 'Relatório personalizado exportável' },
          { path: '/resumo-turnos', name: 'ResumoTurnos', description: 'Resumo de turnos operacionais' },
          { path: '/notificacoes', name: 'Notificacoes', description: 'Central de notificações com seleção de usuários' },
          { path: '/auditoria', name: 'Auditoria', description: 'Logs de auditoria do sistema' },
          { path: '/gerenciamento-filiais', name: 'GerenciamentoFiliais', description: 'CRUD de filiais' },
          { path: '/configuracoes', name: 'Configuracoes', description: 'Configurações do sistema' },
          { path: '/configuracoes-seguranca', name: 'ConfiguracoesSeguranca', description: 'Permissões de páginas e regras de segurança por cargo' },
          { path: '/exportar-dados', name: 'ExportarDados', description: 'Exportação e importação completa do sistema' },
          { path: '/suporte', name: 'Suporte', description: 'Suporte e manual do sistema' },
          { path: '/termos-uso', name: 'TermosUso', description: 'Termos de uso com botão de aceitação' },
          { path: '/perfil', name: 'Perfil', description: 'Perfil do usuário' },
        ],
        authentication: {
          type: 'CPF + Senha + Filial',
          firstAccess: 'Cria automaticamente Administrador Master',
          passwordRecovery: 'Por CPF, envia senha temporária por e-mail',
          termsRequired: true,
          roles: ['administrador_master', 'administrador', 'encarregado', 'operador', 'visualizador'],
        },
        statuses: ['validado', 'bloqueado', 'pendente_revisao'],
        functionalities: [
          'Controle de acesso por placa e CPF do motorista',
          'Verificação de status de veículo e motorista na base de dados',
          'Fila de liberação de saída (kanban)',
          'Solicitação de autorização de cadastro para administradores',
          'Registro de acompanhante/ajudante (sem verificação, apenas log)',
          'Alerta automático para supervisores quando veículo é bloqueado',
          'Relatório mensal automático por e-mail (CSV/Excel)',
          'Resumo de turnos automático por e-mail aos gestores',
          'Importação inteligente de Excel (auto-detecta motoristas/veículos, upsert)',
          'Permissões de páginas por usuário',
          'Regras de segurança por cargo (2FA, timeout, tentativas de login)',
          'Auditoria completa (IP, domínio, ajudantes, todas as ações)',
          'Ofuscação de dados sensíveis (LGPD)',
        ],
        entities: data,
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `profarma_export_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action: 'Exportação JSON completa', ip_address: 'local', domain: window.location.hostname, category: 'export', branch_id: colaborador.filial_id });
    } catch (e) {}
    setExporting(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isJSON = file.name.endsWith('.json');

      if (isJSON) {
        const response = await fetch(file_url);
        const data = await response.json();
        let totalImported = 0;
        if (data.entities) {
          for (const [entityName, records] of Object.entries(data.entities)) {
            if (base44.entities[entityName] && Array.isArray(records) && records.length > 0) {
              const cleanRecords = records.map(r => { const { id, created_date, updated_date, created_by_id, is_sample, ...rest } = r; return rest; });
              await base44.entities[entityName].bulkCreate(cleanRecords);
              totalImported += cleanRecords.length;
            }
          }
        }
        setImportResult({ success: true, count: totalImported });
      } else {
        const res = await base44.functions.invoke('importarExcelInteligente', { file_url });
        const d = res.data;
        if (d.success) {
          setImportResult({ success: true, count: d.created + d.updated, detail: `${d.entityType === 'Vehicle' ? 'Veículos' : 'Motoristas'}: ${d.created} criados, ${d.updated} atualizados, ${d.errors} erros` });
        } else {
          setImportResult({ success: false, error: d.error || 'Erro na importação' });
        }
      }
      await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action: `Importação: ${file.name}`, ip_address: 'local', domain: window.location.hostname, category: 'export', branch_id: colaborador.filial_id });
    } catch (err) { setImportResult({ success: false, error: err.message }); }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="brand-title text-2xl">Exportar / Importar Dados</h1>
          <p className="text-sm text-muted-foreground">Backup completo do sistema</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
          <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Apenas administradores podem exportar e importar dados do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Exportar / Importar Dados</h1>
        <p className="text-sm text-muted-foreground">Backup completo do sistema — apenas administradores</p>
      </div>

      {/* Full System Export / Import */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-heading font-bold">Exportação / Importação Completa do Sistema</h3>
            <p className="text-sm text-muted-foreground">Exporta todas as entidades (JSON) permitindo duplicar o sistema, ou importe um backup anterior</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportJSON} disabled={exporting} className="h-12 rounded-2xl flex-1">
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            Exportar Sistema
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={importing} variant="secondary" className="h-12 rounded-2xl flex-1">
            {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            Importar Sistema
          </Button>
        </div>
        <input ref={fileRef} type="file" accept=".json,.xlsx,.xls,.csv" onChange={handleImport} disabled={importing} className="hidden" id="file-input" />

        {importResult && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${importResult.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            {importResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            <span className="text-sm">{importResult.success ? `${importResult.count} registros processados! ${importResult.detail || ''}` : `Erro: ${importResult.error}`}</span>
          </div>
        )}
      </div>

      {/* Excel Template Reference */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-heading font-bold">Modelo de Planilha (Excel/CSV)</h3>
            <p className="text-sm text-muted-foreground">Formato padrão para importação de Motoristas e Veículos</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">Aba: MOTORISTAS</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">CPF</th>
                  <th className="text-left px-3 py-2 font-medium">NOME E SOBRENOME</th>
                  <th className="text-left px-3 py-2 font-medium">EST. DE MOTORISTA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border"><td className="px-3 py-2">007.220.389-76</td><td className="px-3 py-2">Márcio Granella</td><td className="px-3 py-2">VALIDADO</td></tr>
                <tr><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">Aba: VEICULOS</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">PLACA</th>
                  <th className="text-left px-3 py-2 font-medium">MODELO</th>
                  <th className="text-left px-3 py-2 font-medium">EST. VEICULO</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border"><td className="px-3 py-2">AXM9F80</td><td className="px-3 py-2">TOCO</td><td className="px-3 py-2">VALIDADO</td></tr>
                <tr><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">A importação inteligente detecta automaticamente se os dados são de motoristas ou veículos. Se o registro já existe na base, atualiza o status. Se não existe, cria um novo registro.</p>
      </div>
    </div>
  );
}