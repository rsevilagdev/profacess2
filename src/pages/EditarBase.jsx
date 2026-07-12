import { useState, useEffect } from 'react';
import { Search, Plus, Truck, Users, Edit2, Trash2, X, ChevronLeft, ChevronRight, Check, User, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

export default function EditarBase() {
  const { colaborador } = useProfarmaAuth();
  const [tab, setTab] = useState('veiculos');
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [v, m] = await Promise.all([
      base44.entities.Vehicle.list('-created_date', 500).catch(() => []),
      base44.entities.Driver.list('-created_date', 500).catch(() => []),
    ]);
    setVeiculos(v); setMotoristas(m); setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = (tab === 'veiculos' ? veiculos : motoristas).filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'veiculos') return item.placa?.toLowerCase().includes(term) || item.modelo?.toLowerCase().includes(term) || item.status_opentech?.toLowerCase().includes(term);
    return item.nome?.toLowerCase().includes(term) || item.sobrenome?.toLowerCase().includes(term) || item.cpf?.includes(search);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setForm(tab === 'veiculos'
      ? { placa: '', modelo: '', status: 'ativo', status_opentech: '', observacao: '' }
      : { nome: '', sobrenome: '', cpf: '', status: 'ativo', status_opentech: '', cnh: '', cnh_validade: '', telefone: '', observacao: '' });
    setShowForm(true);
  };

  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    if (tab === 'veiculos') {
      const data = { ...form, placa: form.placa?.toUpperCase(), filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome };
      if (editing) {
        await base44.entities.Vehicle.update(editing.id, data);
        await logAudit('Veículo editado', `Placa: ${data.placa} | Editado por: ${editorName}`);
      } else {
        await base44.entities.Vehicle.create(data);
        await logAudit('Veículo cadastrado', `Placa: ${data.placa} | Cadastrado por: ${editorName}`);
      }
    } else {
      const data = { ...form, filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome };
      if (editing) {
        await base44.entities.Driver.update(editing.id, data);
        await logAudit('Motorista editado', `Nome: ${data.nome} ${data.sobrenome || ''} | Editado por: ${editorName}`);
      } else {
        await base44.entities.Driver.create(data);
        await logAudit('Motorista cadastrado', `Nome: ${data.nome} ${data.sobrenome || ''} | Cadastrado por: ${editorName}`);
      }
    }
    setSaving(false); setShowForm(false); loadData();
  };

  const remove = async (item) => {
    if (!confirm('Confirma a exclusão deste registro?')) return;
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    if (tab === 'veiculos') {
      await base44.entities.Vehicle.delete(item.id);
      await logAudit('Veículo excluído', `Placa: ${item.placa} | Excluído por: ${editorName}`);
    } else {
      await base44.entities.Driver.delete(item.id);
      await logAudit('Motorista excluído', `Nome: ${item.nome} ${item.sobrenome || ''} | Excluído por: ${editorName}`);
    }
    loadData();
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action, details,
      ip_address: 'local', domain: window.location.hostname,
      category: tab === 'veiculos' ? 'vehicle' : 'driver', branch_id: colaborador.filial_id
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Editar Base de Dados</h1>
          <p className="text-sm text-muted-foreground">Cadastre, edite e exclua veículos e motoristas</p>
        </div>
        <Button onClick={openNew} className="h-12 rounded-2xl"><Plus className="h-5 w-5 mr-1" /> Novo</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('veiculos'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium ${tab === 'veiculos' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Truck className="h-4 w-4 inline mr-2" /> Veículos ({veiculos.length})
        </button>
        <button onClick={() => { setTab('motoristas'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium ${tab === 'motoristas' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Users className="h-4 w-4 inline mr-2" /> Motoristas ({motoristas.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> :
         pageData.length === 0 ? <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhum registro encontrado</p></div> : (
          <div className="space-y-2">
            {pageData.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {tab === 'veiculos' ? <Truck className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    {tab === 'veiculos' ? (
                      <>
                        <p className="text-sm font-medium">{item.placa}</p>
                        <p className="text-xs text-muted-foreground">{item.modelo || '—'} · {item.transportadora || '—'}</p>
                        {item.status_opentech && <p className="text-xs text-muted-foreground">Opentech: {item.status_opentech}</p>}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{item.nome} {item.sobrenome || ''}</p>
                        <p className="text-xs text-muted-foreground">{item.cpf}</p>
                        {item.status_opentech && <p className="text-xs text-muted-foreground">Opentech: {item.status_opentech}</p>}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'ativo' ? 'bg-primary/10 text-primary' : item.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>{item.status}</span>
                  <button onClick={() => openEdit(item)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(item)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">{editing ? 'Editar' : 'Novo'} {tab === 'veiculos' ? 'Veículo' : 'Motorista'}</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {tab === 'veiculos' ? (
                <>
                  <Field label="Placa *" value={form.placa || ''} onChange={v => setForm({...form, placa: v.toUpperCase()})} />
                  <Field label="Modelo" value={form.modelo || ''} onChange={v => setForm({...form, modelo: v})} />
                  <Field label="Status Opentech" value={form.status_opentech || ''} onChange={v => setForm({...form, status_opentech: v})} />
                  <SelectField label="Status" value={form.status || 'ativo'} options={['ativo', 'bloqueado', 'manutencao']} onChange={v => setForm({...form, status: v})} />
                  <Field label="Transportadora" value={form.transportadora || ''} onChange={v => setForm({...form, transportadora: v})} />
                  <Field label="Observação" value={form.observacao || ''} onChange={v => setForm({...form, observacao: v})} />
                </>
              ) : (
                <>
                  <Field label="Nome *" value={form.nome || ''} onChange={v => setForm({...form, nome: v})} />
                  <Field label="Sobrenome" value={form.sobrenome || ''} onChange={v => setForm({...form, sobrenome: v})} />
                  <Field label="CPF *" value={form.cpf || ''} onChange={v => setForm({...form, cpf: v})} />
                  <Field label="CNH" value={form.cnh || ''} onChange={v => setForm({...form, cnh: v})} />
                  <DateField label="Validade CNH" value={form.cnh_validade || ''} onChange={v => setForm({...form, cnh_validade: v})} />
                  <Field label="Telefone" value={form.telefone || ''} onChange={v => setForm({...form, telefone: v})} />
                  <Field label="Status Opentech" value={form.status_opentech || ''} onChange={v => setForm({...form, status_opentech: v})} />
                  <SelectField label="Status" value={form.status || 'ativo'} options={['ativo', 'bloqueado', 'pendente']} onChange={v => setForm({...form, status: v})} />
                  <Field label="Observação" value={form.observacao || ''} onChange={v => setForm({...form, observacao: v})} />
                </>
              )}
              <div className="text-xs text-muted-foreground bg-muted rounded-xl p-2 flex items-center gap-2">
                <User className="h-3 w-3" /> Modificado por: {colaborador.nome} {colaborador.sobrenome || ''}
              </div>
              <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <select className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function DateField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input type="date" className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}