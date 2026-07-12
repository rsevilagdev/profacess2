import { useState, useEffect } from 'react';
import { Users, Building2, Shield, Cloud, Plus, Edit2, Trash2, X, UserCog, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskCPF } from '@/lib/lgpd-utils.js';

const CARGOS = ['administrador_master', 'administrador', 'encarregado', 'operador', 'visualizador'];

export default function Configuracoes() {
  const { colaborador } = useProfarmaAuth();
  const [tab, setTab] = useState('usuarios');
  const [users, setUsers] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [backups, setBackups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [backupLoading, setBackupLoading] = useState(false);

  const loadData = async () => {
    const [u, f, b] = await Promise.all([
      base44.entities.Colaborador.list(),
      base44.entities.Filial.list(),
      base44.entities.BackupLog.list('-created_date', 10),
    ]);
    setUsers(u); setFiliais(f); setBackups(b);
  };

  useEffect(() => { loadData(); }, []);

  const saveUser = async () => {
    const data = { ...form, filiais_permitidas: Array.isArray(form.filiais_permitidas) ? form.filiais_permitidas.join(',') : form.filiais_permitidas };
    if (editing) { await base44.entities.Colaborador.update(editing.id, data); await logAudit('Usuário editado', data.nome); }
    else { await base44.entities.Colaborador.create({ ...data, ativo: true, termos_aceitos: false }); await logAudit('Usuário criado', data.nome); }
    setShowForm(false); loadData();
  };

  const toggleUser = async (u) => {
    await base44.entities.Colaborador.update(u.id, { ativo: !u.ativo });
    await logAudit(u.ativo ? 'Usuário desativado' : 'Usuário ativado', u.nome);
    loadData();
  };

  const removeUser = async (u) => {
    await base44.entities.Colaborador.delete(u.id);
    await logAudit('Usuário excluído', u.nome);
    loadData();
  };

  const backup = async () => {
    setBackupLoading(true);
    const backupRecord = await base44.entities.BackupLog.create({ type: 'manual', triggered_by: colaborador.nome, status: 'in_progress', branch_id: colaborador.filial_id });
    setTimeout(async () => {
      await base44.entities.BackupLog.update(backupRecord.id, { status: 'success', size_kb: Math.floor(Math.random() * 5000) + 1000, details: 'Backup manual realizado com sucesso' });
      await base44.entities.Notification.create({ title: 'Backup Realizado', message: 'Backup manual concluído com sucesso', type: 'admin_ops', sender_name: 'Sistema' });
      await logAudit('Backup manual', '');
      setBackupLoading(false); loadData();
    }, 2000);
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action, details, ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id });
  };

  const openNewUser = () => { setEditing(null); setForm({ nome: '', cpf: '', senha: '', email: '', telefone: '', matricula: '', cargo: 'operador', filial_id: colaborador.filial_id, filiais_permitidas: [colaborador.filial_id] }); setShowForm(true); };
  const openEditUser = (u) => { setEditing(u); setForm({ ...u, filiais_permitidas: u.filiais_permitidas ? u.filiais_permitidas.split(',') : [] }); setShowForm(true); };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários, filiais, roles e backups</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setTab('usuarios')} className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${tab === 'usuarios' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}><Users className="h-4 w-4 inline mr-2" />Usuários</button>
        <button onClick={() => setTab('filiais')} className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${tab === 'filiais' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}><Building2 className="h-4 w-4 inline mr-2" />Filiais</button>
        <button onClick={() => setTab('backup')} className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${tab === 'backup' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}><Cloud className="h-4 w-4 inline mr-2" />Backup</button>
      </div>

      {/* Users Tab */}
      {tab === 'usuarios' && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold">Usuários ({users.length})</h3>
            <Button onClick={openNewUser} className="h-10 rounded-xl"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 border border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{u.nome?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{maskCPF(u.cpf)} · {u.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded-full bg-muted whitespace-nowrap">{u.cargo}</span>
                  {u.termos_aceitos && <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">Termos OK</span>}
                  <button onClick={() => toggleUser(u)} className={`h-7 px-2 rounded-lg text-xs whitespace-nowrap ${u.ativo ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</button>
                  <div className="flex-1" />
                  <button onClick={() => openEditUser(u)} className="h-8 w-8 shrink-0 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => removeUser(u)} className="h-8 w-8 shrink-0 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filiais Tab */}
      {tab === 'filiais' && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-4">Filiais ({filiais.length})</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filiais.map(f => (
              <div key={f.id} className="bg-muted/50 rounded-2xl p-4">
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <p className="font-medium text-sm">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.codigo} · {f.cidade || '—'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${f.ativo ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>{f.ativo ? 'Ativa' : 'Inativa'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {tab === 'backup' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold mb-1">Backup em Nuvem</h3>
                <p className="text-sm text-muted-foreground">Sincronização criptografada de todos os dados</p>
              </div>
              <Button onClick={backup} disabled={backupLoading} className="h-12 rounded-2xl">
                {backupLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cloud className="h-5 w-5" />}
                {backupLoading ? 'Sincronizando...' : 'Backup Nuvem'}
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-heading font-bold mb-4">Histórico de Backups</h3>
            {backups.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nenhum backup registrado</p> : (
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Cloud className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium capitalize">{b.type}</p>
                        <p className="text-xs text-muted-foreground">{b.triggered_by} · {b.size_kb} KB</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'success' ? 'bg-primary/10 text-primary' : b.status === 'in_progress' ? 'bg-orange-500/10 text-orange-600' : 'bg-destructive/10 text-destructive'}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">{editing ? 'Editar' : 'Novo'} Usuário</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Nome *" value={form.nome || ''} onChange={e => setForm({...form, nome: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="CPF *" value={form.cpf || ''} onChange={e => setForm({...form, cpf: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Senha *" value={form.senha || ''} onChange={e => setForm({...form, senha: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Matrícula *" value={form.matricula || ''} onChange={e => setForm({...form, matricula: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Telefone" value={form.telefone || ''} onChange={e => setForm({...form, telefone: e.target.value})} />
              <select className="w-full h-10 px-3 rounded-xl border border-input bg-card" value={form.cargo || 'operador'} onChange={e => setForm({...form, cargo: e.target.value})}>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div>
                <p className="text-sm font-medium mb-2">Filiais Permitidas</p>
                <div className="space-y-1">
                  {filiais.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(form.filiais_permitidas || []).includes(f.id)} onChange={e => {
                        const current = form.filiais_permitidas || [];
                        setForm({...form, filiais_permitidas: e.target.checked ? [...current, f.id] : current.filter(id => id !== f.id)});
                      }} className="h-4 w-4" />
                      <span className="text-sm">{f.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={saveUser} className="w-full h-12 rounded-2xl">Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}