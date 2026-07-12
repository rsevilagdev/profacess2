import { useState, useEffect, useRef } from 'react';
import { Download, Upload, FileText, FileSpreadsheet, Database, Loader2, Check, X } from 'lucide-react';
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

// Excel column mappings — match the imported spreadsheet format
const COLUMN_MAPS = {
  Driver: {
    columns: [
      { field: 'cpf', header: 'CPF' },
      { field: 'nome', header: 'NOME' },
      { field: 'sobrenome', header: 'SOBRENOME' },
      { field: 'status_opentech', header: 'STATUS OPENTECH' },
    ],
    statusMap: {},
  },
  Vehicle: {
    columns: [
      { field: 'placa', header: 'PLACA' },
      { field: 'modelo', header: 'MODELO' },
      { field: 'status_opentech', header: 'STATUS OPENTECH' },
    ],
    statusMap: {},
  },
};

export default function ExportarDados() {
  const { colaborador } = useProfarmaAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('Vehicle');
  const [exportType, setExportType] = useState('json');
  const fileRef = useRef(null);

  const exportJSON = async () => {
    setExporting(true);
    try {
      const data = {};
      for (const ent of ENTITIES) {
        try { data[ent.name] = await base44.entities[ent.name].list('-created_date', 1000); } catch (e) { data[ent.name] = []; }
      }
      const exportObj = {
        exportDate: new Date().toISOString(),
        exportedBy: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        system: 'PROFARMA_LIBERAAUTO_PRO',
        version: '3.0',
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
          { path: '/dashboard', name: 'Dashboard', description: 'Painel principal com métricas' },
          { path: '/novo-acesso', name: 'NovoAcesso', description: 'Registro de acesso com verificação de placa e CPF, kanban de liberação' },
          { path: '/painel-bloqueio', name: 'PainelBloqueio', description: 'Painel de bloqueios' },
          { path: '/editar-base', name: 'EditarBase', description: 'CRUD de veículos e motoristas com modal' },
          { path: '/relatorios', name: 'Relatorios', description: 'Relatórios operacionais com gráficos' },
          { path: '/relatorio-personalizado', name: 'RelatorioPersonalizado', description: 'Relatório personalizado exportável' },
          { path: '/resumo-turnos', name: 'ResumoTurnos', description: 'Resumo de turnos operacionais' },
          { path: '/notificacoes', name: 'Notificacoes', description: 'Central de notificações com seleção de usuários' },
          { path: '/auditoria', name: 'Auditoria', description: 'Logs de auditoria do sistema' },
          { path: '/gerenciamento-filiais', name: 'GerenciamentoFiliais', description: 'CRUD de filiais com veículos e motoristas paginados' },
          { path: '/configuracoes', name: 'Configuracoes', description: 'Configurações do sistema' },
          { path: '/configuracoes-seguranca', name: 'ConfiguracoesSeguranca', description: 'Permissões de páginas e regras de segurança por cargo' },
          { path: '/verificar-cnh', name: 'VerificarCNH', description: 'Verificação de autenticidade de CNH' },
          { path: '/exportar-dados', name: 'ExportarDados', description: 'Exportação e importação de dados com Excel inteligente' },
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
        functionalities: [
          'Controle de acesso por placa e CPF do motorista',
          'Verificação de status de veículo e motorista na base de dados',
          'Fila de liberação de saída (kanban)',
          'Solicitação de autorização de cadastro para administradores',
          'Registro de acompanhante/ajudante (sem verificação, apenas log)',
          'Alerta automático para supervisores quando veículo é bloqueado',
          'Relatório mensal automático por e-mail (CSV/Excel)',
          'Resumo de turnos automático por e-mail aos gestores',
          'Verificação de CNH com autenticidade via IA',
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

  const exportEntity = async () => {
    setExporting(true);
    try {
      const records = await base44.entities[selectedEntity].list('-created_date', 1000);
      if (exportType === 'json') {
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${selectedEntity}_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const colMap = COLUMN_MAPS[selectedEntity];
        let headers, rows;
        if (colMap) {
          headers = colMap.columns.map(c => c.header);
          rows = records.map(r => colMap.columns.map(c => {
            let val = r[c.field] || '';
            if (c.field === 'status' && colMap.statusMap) val = colMap.statusMap[val] || val;
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(','));
        } else {
          headers = records.length > 0 ? Object.keys(records[0]) : [];
          rows = records.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
        }
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${selectedEntity}_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action: `Exportação: ${selectedEntity}`, ip_address: 'local', domain: window.location.hostname, category: 'export', branch_id: colaborador.filial_id });
    } catch (e) {}
    setExporting(false);
  };

  const remapImportRecord = (record, entityName) => {
    const colMap = COLUMN_MAPS[entityName];
    if (!colMap) return record;
    const remapped = {};
    for (const col of colMap.columns) {
      const val = record[col.header] ?? record[col.field] ?? '';
      if (col.field === 'status' && colMap.statusMap) {
        const inverse = Object.fromEntries(Object.entries(colMap.statusMap).map(([k, v]) => [v, k]));
        remapped.status = inverse[val] || val || 'ativo';
      } else {
        remapped[col.field] = val;
      }
    }
    // preserve any extra fields not in the map
    return { ...record, ...remapped };
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
        } else if (Array.isArray(data)) {
          if (base44.entities[selectedEntity]) {
            const cleanRecords = data.map(r => { const { id, created_date, updated_date, created_by_id, is_sample, ...rest } = r; return rest; });
            await base44.entities[selectedEntity].bulkCreate(cleanRecords);
            totalImported = cleanRecords.length;
          }
        }
        setImportResult({ success: true, count: totalImported });
      } else {
        // Smart Excel/CSV import — auto-detects entity type, upserts (update status_opentech if exists, create if not)
        const res = await base44.functions.invoke('importarExcelInteligente', { file_url });
        const d = res.data;
        if (d.success) {
          setImportResult({ success: true, count: d.created + d.updated, detail: `${d.entityType === 'Vehicle' ? 'Veículos' : 'Motoristas'}: ${d.created} criados, ${d.updated} atualizados, ${d.errors} erros` });
        } else {
          setImportResult({ success: false, error: d.error || 'Erro na importação' });
        }
      }
      await base44.entities.AuditLog.create({ user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''), user_cpf: colaborador.cpf, action: `Importação: ${file.name}`, ip_address: 'local', domain: window.location.hostname, category: 'export', branch_id: colaborador.filial_id });
    } catch (err) { setImportResult({ success: false, error: err.message }); }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Exportar / Importar Dados</h1>
        <p className="text-sm text-muted-foreground">Backup completo do sistema e importação de arquivos</p>
      </div>

      {/* Full System Export */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-heading font-bold">Exportação Completa do Sistema (JSON)</h3>
            <p className="text-sm text-muted-foreground">Exporta todas as entidades, permitindo duplicar o sistema inteiro</p>
          </div>
        </div>
        <Button onClick={exportJSON} disabled={exporting} className="h-12 rounded-2xl">
          {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Exportar Sistema Completo
        </Button>
      </div>

      {/* Entity Export */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Exportação por Entidade</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} className="h-12 px-4 rounded-2xl border border-input bg-card text-sm flex-1">
            {ENTITIES.map(ent => <option key={ent.name} value={ent.name}>{ent.label}</option>)}
          </select>
          <select value={exportType} onChange={e => setExportType(e.target.value)} className="h-12 px-4 rounded-2xl border border-input bg-card text-sm">
            <option value="json">JSON</option>
            <option value="csv">CSV/Excel</option>
          </select>
          <Button onClick={exportEntity} disabled={exporting} className="h-12 rounded-2xl">
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : exportType === 'json' ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
            Exportar
          </Button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Upload className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-heading font-bold">Importar Dados</h3>
            <p className="text-sm text-muted-foreground">Importe JSON (sistema completo) ou Excel/CSV (entidade selecionada)</p>
          </div>
        </div>
        <div className="mb-3">
          <p className="text-sm text-muted-foreground mb-1">Entidade destino (para Excel/CSV):</p>
          <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-card text-sm">
            {ENTITIES.map(ent => <option key={ent.name} value={ent.name}>{ent.label}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" accept=".json,.xlsx,.xls,.csv" onChange={handleImport} disabled={importing} className="hidden" id="file-input" />
        <Button onClick={() => fileRef.current?.click()} disabled={importing} variant="secondary" className="h-12 rounded-2xl">
          {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {importing ? 'Importando...' : 'Selecionar Arquivo'}
        </Button>

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
                  <th className="text-left px-3 py-2 font-medium">NOME</th>
                  <th className="text-left px-3 py-2 font-medium">SOBRENOME</th>
                  <th className="text-left px-3 py-2 font-medium">STATUS OPENTECH</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border"><td className="px-3 py-2">007.220.389-76</td><td className="px-3 py-2">Márcio</td><td className="px-3 py-2">Granella</td><td className="px-3 py-2">VALIDADO</td></tr>
                <tr><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td></tr>
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
                  <th className="text-left px-3 py-2 font-medium">STATUS OPENTECH</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border"><td className="px-3 py-2">AXM9F80</td><td className="px-3 py-2">TOCO</td><td className="px-3 py-2">VALIDADO</td></tr>
                <tr><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td><td className="px-3 py-2 text-muted-foreground">...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">A importação inteligente detecta automaticamente se os dados são de motoristas ou veículos. Se o registro já existe na base, atualiza apenas o Status Opentech. Se não existe, cria um novo registro.</p>
      </div>
    </div>
  );
}