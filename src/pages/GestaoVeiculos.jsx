import { useState, useEffect } from 'react';
import { Search, Plus, Truck, Edit2, Trash2, X, Check, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;
const TIPOS = ['caminhao', 'utilitario', 'moto', 'carro', 'outros'];
const STATUS = ['ativo', 'bloqueado', 'manutencao'];

export default function GestaoVeiculos() {
  const { colaborador } = useProfarmaAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const list = await base44.entities.Vehicle.list('-created_date', 500).catch(() => []);
    setVeiculos(list);
    setLoading(false);
  };

  const filtered = veiculos.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (!search) return true;
    const t = search.toLowerCase();
    return v.placa?.toLowerCase().includes(t) || v.modelo?.toLowerCase().includes(t) || v.transportadora?.toLowerCase().includes(t) || v.status_opentech?.toLowerCase().includes(t);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setForm({ placa: '', modelo: '', cor: '', tipo: 'caminhao', transportadora: '', status: 'ativo', status_opentech: '', observacao: '' });
    setShowForm(true);
  };
  const openEdit = (v) => { setEditing(v); setForm({ ...v }); setShowForm(true); };

  const save = async () => {
    if (!form.placa) return;
    setSaving(true);
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    const data = { ...form, placa: form.placa.toUpperCase(), filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome };
    if (editing) {
      await base44.entities.Vehicle.update(editing.id, data);
      await logAudit('Veículo editado', `Placa: ${data.placa} | Editado por: ${editorName}`);
    } else {
      await base44.entities.Vehicle.create(data);
      await logAudit('Veículo cadastrado', `Placa: ${data.placa} | Cadastrado por: ${editorName}`);
    }
    setSaving(false); setShowForm(false); loadData();
  };

  const remove = async (v) => {
    if (!confirm(`Excluir veículo ${v.placa}?`)) return;
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    await base44.entities.Vehicle.delete(v.id);
    await logAudit('Veículo excluído', `Placa: ${v.placa} | Excluído por: ${editorName}`);
    loadData();
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action, details, ip_address: 'local',
      domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
    });
  };

  const statusBadge = (s) => s === 'ativo' ? 'bg-primary/10 text-primary' : s === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Gestão de Veículos</h1>
          <p className="text-sm text-muted-foreground">Cadastre, edite e gerencie placas e status de validade</p>
        </div>
        <Button onClick={openNew} className="h-12 rounded-2xl"><Plus className="h-5 w-5 mr-1" /> Novo Veículo</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={veiculos.length} color="text-primary" />
        <StatCard label="Ativos" value={veiculos.filter(v => v.status === 'ativo').length} color="text-primary" />
        <StatCard label="Bloqueados" value={veiculos.filter(v => v.status === 'bloqueado').length} color="text-destructive" />
        <StatCard label="Manutenção" value={veiculos.filter(v => v.status === 'manutencao').length} color="text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por placa, modelo, transportadora..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className="h-12 px-4 rounded-2xl border border-input bg-card text-sm">
          <option value="all">Todos os status</option>
          {STATUS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : pageData.length === 0 ? (
          <div className="text-center py-12"><Truck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Nenhum veículo encontrado</p></div>
        ) : (
          <div className="space-y-2">
            {pageData.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Truck className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">{v.placa}</p>
                    <p className="text-xs text-muted-foreground">{v.modelo || '—'} · {v.cor || '—'} · {v.tipo || '—'}</p>
                    {v.transportadora && <p className="text-xs text-muted-foreground">Transportadora: {v.transportadora}</p>}
                    {v.status_opentech && <p className="text-xs text-muted-foreground">Opentech: {v.status_opentech}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(v.status)}`}>{v.status}</span>
                  <button onClick={() => openEdit(v)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(v)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} · {filtered.length} registros</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">‹</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">{editing ? 'Editar' : 'Novo'} Veículo</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Placa *" value={form.placa || ''} onChange={v => setForm({ ...form, placa: v.toUpperCase() })} />
              <Field label="Modelo" value={form.modelo || ''} onChange={v => setForm({ ...form, modelo: v })} />
              <Field label="Cor" value={form.cor || ''} onChange={v => setForm({ ...form, cor: v })} />
              <SelectField label="Tipo" value={form.tipo || 'caminhao'} options={TIPOS} onChange={v => setForm({ ...form, tipo: v })} />
              <Field label="Transportadora" value={form.transportadora || ''} onChange={v => setForm({ ...form, transportadora: v })} />
              <Field label="Status Opentech" value={form.status_opentech || ''} onChange={v => setForm({ ...form, status_opentech: v })} />
              <SelectField label="Status" value={form.status || 'ativo'} options={STATUS} onChange={v => setForm({ ...form, status: v })} />
              <Field label="Observação" value={form.observacao || ''} onChange={v => setForm({ ...form, observacao: v })} />
              <Button onClick={save} disabled={saving || !form.placa} className="w-full h-12 rounded-2xl">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
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
        {options.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
      </select>
    </div>
  );
}