import { useState, useEffect } from 'react';
import { Lock, Shield, Save, Loader2, Check, UserCog, Power, Search, CheckSquare, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskCPF } from '@/lib/lgpd-utils.js';
import SecurityRules from '@/components/configuracoes/SecurityRules';

const ALL_PAGES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/novo-acesso', label: 'Novo Acesso' },
  { path: '/painel-bloqueio', label: 'Painel de Bloqueio' },
  { path: '/editar-base', label: 'Editar Base de Dados' },
  { path: '/verificar-cnh', label: 'Verificar CNH' },
  { path: '/relatorios', label: 'Relatórios' },
  { path: '/relatorio-personalizado', label: 'Relatório Personalizado' },
  { path: '/resumo-turnos', label: 'Resumo de Turnos' },
  { path: '/notificacoes', label: 'Notificações' },
  { path: '/auditoria', label: 'Auditoria' },
  { path: '/gerenciamento-filiais', label: 'Gerenciamento de Filiais' },
  { path: '/configuracoes', label: 'Configurações' },
  { path: '/exportar-dados', label: 'Exportar/Importar' },
  { path: '/suporte', label: 'Suporte & Manual' },
  { path: '/termos-uso', label: 'Termos de Uso' },
  { path: '/perfil', label: 'Perfil' },
];

const CARGO_LABELS = {
  administrador_master: 'Admin Master',
  administrador: 'Administrador',
  encarregado: 'Encarregado',
  operador: 'Operador',
  visualizador: 'Visualizador',
};

export default function ConfiguracoesSeguranca() {
  const { colaborador } = useProfarmaAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');
  const [changingCargo, setChangingCargo] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const list = await base44.entities.Colaborador.list();
    setUsers(list);
    const firstNonMaster = list.find(u => u.cargo !== 'administrador_master');
    if (firstNonMaster) selectUser(firstNonMaster);
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    const current = u.paginas_permitidas ? u.paginas_permitidas.split(',').map(s => s.trim()) : [];
    const map = {};
    ALL_PAGES.forEach(p => { map[p.path] = current.includes(p.path); });
    setPermissions(map);
    setSaved(false);
  };

  const togglePage = (path) => { setPermissions(prev => ({ ...prev, [path]: !prev[path] })); setSaved(false); };
  const selectAll = () => { const map = {}; ALL_PAGES.forEach(p => { map[p.path] = true; }); setPermissions(map); setSaved(false); };
  const clearAll = () => { const map = {}; ALL_PAGES.forEach(p => { map[p.path] = false; }); setPermissions(map); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const allowed = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k).join(',');
    await base44.entities.Colaborador.update(selectedUser.id, { paginas_permitidas: allowed });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action: 'Permissões de páginas atualizadas',
      details: `Usuário: ${selectedUser.nome} ${selectedUser.sobrenome || ''} | Páginas: ${allowed || 'nenhuma'}`,
      ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const changeCargo = async (newCargo) => {
    setChangingCargo(true);
    await base44.entities.Colaborador.update(selectedUser.id, { cargo: newCargo });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action: 'Cargo de usuário alterado',
      details: `Usuário: ${selectedUser.nome} | Novo cargo: ${CARGO_LABELS[newCargo]}`,
      ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
    });
    const updated = { ...selectedUser, cargo: newCargo };
    setSelectedUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setChangingCargo(false);
  };

  const toggleActive = async () => {
    setTogglingStatus(true);
    const newStatus = !selectedUser.ativo;
    await base44.entities.Colaborador.update(selectedUser.id, { ativo: newStatus });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action: newStatus ? 'Usuário ativado' : 'Usuário desativado',
      details: `Usuário: ${selectedUser.nome} ${selectedUser.sobrenome || ''}`,
      ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
    });
    const updated = { ...selectedUser, ativo: newStatus };
    setSelectedUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setTogglingStatus(false);
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const term = search.toLowerCase();
    return u.nome?.toLowerCase().includes(term) || u.cpf?.includes(search) || (u.matricula || '').includes(search);
  });

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Configurações de Segurança</h1>
        <p className="text-sm text-muted-foreground">Permissões avançadas de usuários e regras por nível de acesso</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Users List */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Usuários</h3>
            <span className="text-xs text-muted-foreground">{filteredUsers.length}</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredUsers.map(u => (
              <button key={u.id} onClick={() => selectUser(u)} className={`w-full text-left p-2.5 rounded-xl transition-colors ${selectedUser?.id === u.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome} {u.sobrenome || ''}</p>
                    <p className={`text-xs ${selectedUser?.id === u.id ? 'opacity-80' : 'text-muted-foreground'}`}>{CARGO_LABELS[u.cargo] || u.cargo}</p>
                  </div>
                  {!u.ativo && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full whitespace-nowrap">Inativo</span>}
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário</p>}
          </div>
        </div>

        {/* Permissions */}
        <div className="md:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-heading font-bold">{selectedUser.nome} {selectedUser.sobrenome || ''}</h3>
                  <p className="text-xs text-muted-foreground">{maskCPF(selectedUser.cpf)} · Matrícula: {selectedUser.matricula || '—'}</p>
                </div>
                <Button onClick={save} disabled={saving} className="h-10 rounded-xl">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
                </Button>
              </div>

              {/* Cargo + Status controls */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/50 rounded-xl p-3">
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><UserCog className="h-3 w-3" /> Cargo</label>
                  <select
                    value={selectedUser.cargo}
                    onChange={e => changeCargo(e.target.value)}
                    disabled={changingCargo || selectedUser.cargo === 'administrador_master'}
                    className="w-full h-9 px-2 rounded-lg border border-input bg-card text-sm disabled:opacity-50"
                  >
                    {Object.entries(CARGO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {selectedUser.cargo === 'administrador_master' && <p className="text-xs text-muted-foreground mt-1">Cargo fixo — não alterável</p>}
                </div>
                <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Power className="h-3 w-3" /> Status da Conta</label>
                    <p className="text-sm font-medium mt-1">{selectedUser.ativo ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <button
                    onClick={toggleActive}
                    disabled={togglingStatus || selectedUser.cargo === 'administrador_master'}
                    className={`h-6 w-11 rounded-full transition-colors disabled:opacity-30 ${selectedUser.ativo ? 'bg-primary' : 'bg-destructive'}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${selectedUser.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Page permissions */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Páginas Permitidas</p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-primary hover:underline flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Todas</button>
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><Square className="h-3 w-3" /> Nenhuma</button>
                </div>
              </div>
              <div className="space-y-1">
                {ALL_PAGES.map(p => (
                  <label key={p.path} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted cursor-pointer">
                    <span className="text-sm">{p.label}</span>
                    <button onClick={() => togglePage(p.path)} className={`h-6 w-11 rounded-full transition-colors ${permissions[p.path] ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${permissions[p.path] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12"><Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Selecione um usuário</p></div>
          )}
        </div>
      </div>

      <SecurityRules />
    </div>
  );
}