import { useState, useEffect } from 'react';
import { Lock, Shield, Save, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskCPF } from '@/lib/lgpd-utils.js';

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

export default function ConfiguracoesSeguranca() {
  const { colaborador } = useProfarmaAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Colaborador.list().then(list => {
      setUsers(list.filter(u => u.ativo && u.cargo !== 'administrador_master'));
      if (list.length > 0) selectUser(list.find(u => u.cargo !== 'administrador_master') || list[0]);
    });
  }, []);

  const selectUser = (u) => {
    setSelectedUser(u);
    const current = u.paginas_permitidas ? u.paginas_permitidas.split(',').map(s => s.trim()) : [];
    const map = {};
    ALL_PAGES.forEach(p => { map[p.path] = current.includes(p.path); });
    setPermissions(map);
  };

  const togglePage = (path) => setPermissions(prev => ({ ...prev, [path]: !prev[path] }));

  const save = async () => {
    setSaving(true);
    const allowed = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k).join(',');
    await base44.entities.Colaborador.update(selectedUser.id, { paginas_permitidas: allowed });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome, user_cpf: colaborador.cpf, action: 'Permissões atualizadas',
      details: `Usuário: ${selectedUser.nome}`, ip_address: 'local', domain: window.location.hostname,
      category: 'user_management', branch_id: colaborador.filial_id
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Configurações de Segurança</h1>
        <p className="text-sm text-muted-foreground">Permissões de páginas por usuário</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Users List */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <h3 className="font-heading font-bold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Usuários</h3>
          <div className="space-y-1">
            {users.map(u => (
              <button key={u.id} onClick={() => selectUser(u)} className={`w-full text-left p-2 rounded-xl ${selectedUser?.id === u.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                <p className="text-sm font-medium">{u.nome}</p>
                <p className={`text-xs ${selectedUser?.id === u.id ? 'opacity-80' : 'text-muted-foreground'}`}>{u.cargo}</p>
              </button>
            ))}
            {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário</p>}
          </div>
        </div>

        {/* Permissions */}
        <div className="md:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold">{selectedUser.nome}</h3>
                  <p className="text-xs text-muted-foreground">{maskCPF(selectedUser.cpf)} · {selectedUser.cargo}</p>
                </div>
                <Button onClick={save} disabled={saving} className="h-10 rounded-xl">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </Button>
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
    </div>
  );
}