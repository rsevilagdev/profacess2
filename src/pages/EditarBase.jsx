import { useState, useEffect } from 'react';
import { Search, Plus, Truck, Users, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskPlaca, maskCPF, maskNome } from '@/lib/lgpd-utils.js';

const PAGE_SIZE = 10;
const VEICULO_STATUS = ['ativo', 'bloqueado', 'manutencao'];
const MOTORISTA_STATUS = ['ativo', 'bloqueado', 'pendente'];

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

  const loadData = async () => {
    setLoading(true);
    const filialId = colaborador?.filial_id;
    const [v, m] = await Promise.all([
      base44.entities.Vehicle.filter({ filial_id: filialId }).catch(() => []),
      base44.entities.Driver.filter({ filial_id: filialId }).catch(() => []),
    ]);
    setVeiculos(v); setMotoristas(m); setLoading(false);
  };

  useEffect(() => { loadData(); }, [colaborador?.filial_id]);

  const filtered = (tab === 'veiculos' ? veiculos : motoristas).filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'veiculos') return item.placa?.toLowerCase().includes(term);
    return item.nome?.toLowerCase().includes(term) || item.cpf?.includes(search);
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setForm(tab === 'veiculos' ? { placa: '', modelo: '', cor: '', tipo: 'caminhao', transportadora: '', status: 'ativo', carregado: false } : { nome: '', cpf: '', cnh: '', cnh_validade: '', telefone: '', transportadora: '', status: 'ativo', documento_verificado: false });
    setShowForm(true);
  };

  const openEdit = (item) => { setEditing(item); setForm(item); setShowForm(true); };

  const save = async () => {
    if (tab === 'veiculos') {
      const data = { ...form, placa: form.placa?.toUpperCase(), filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome };
      if (editing) { await base44.entities.Vehicle.update(editing.id, data); await logAudit('Veículo editado', `Placa: ${data.placa}`); }
      else { await base44.entities.Vehicle.create(data); await logAudit('Veículo cadastrado', `Placa: ${data.placa}`); }
    } else {
      const data = { ...form, filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome };
      if (editing) { await base44.entities.Driver.update(editing.id, data); await logAudit('Motorista editado', `Nome: ${data.nome}`); }
      else { await base44.entities.Driver.create(data); await logAudit('Motorista cadastrado', `Nome: ${data.nome}`); }
    }
    setShowForm(false); loadData();
  };

  const remove = async (item) => {
    if (tab === 'veiculos') { await base44.entities.Vehicle.delete(item.id); await logAudit('Veículo excluído', `Placa: ${item.placa}`); }
    else { await base44.entities.Driver.delete(item.id); await logAudit('Motorista excluído', `Nome: ${item.nome}`); }
    loadData();
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action, details, ip_address: 'local', domain: window.location.hostname, category: tab === 'veiculos' ? 'vehicle' : 'driver', branch_id: colaborador.filial_id });
  };

  const updateStatus = async (item, status) => {
    if (tab === 'veiculos') await base44.entities.Vehicle.update(item.id, { status });
    else await base44.entities.Driver.update(item.id, { status });
    loadData();
  };

  const statusList = tab === 'veiculos' ? VEICULO_STATUS : MOTORISTA_STATUS;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Editar Base de Dados</h1>
          <p className="text-sm text-muted-foreground">Cadastre, edite e gerencie veículos e motoristas</p>
        </div>
        <Button onClick={openNew} className="h-12 rounded-2xl">
          <Plus className="h-5 w-5 mr-1" /> Novo
        </Button>
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
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {tab === 'veiculos' ? <Truck className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium blur-lg-text">{tab === 'veiculos' ? maskPlaca(item.placa) : maskNome(item.nome)}</p>
                    <p className="text-xs text-muted-foreground blur-lg-text">{tab === 'veiculos' ? item.transportadora || '—' : maskCPF(item.cpf)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={item.status} onChange={e => updateStatus(item, e.target.value)} className="h-8 text-xs rounded-lg border border-input bg-card px-2">
                    {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => openEdit(item)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(item)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
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
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Placa *" value={form.placa || ''} onChange={e => setForm({...form, placa: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Modelo" value={form.modelo || ''} onChange={e => setForm({...form, modelo: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Cor" value={form.cor || ''} onChange={e => setForm({...form, cor: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Transportadora" value={form.transportadora || ''} onChange={e => setForm({...form, transportadora: e.target.value})} />
                  <select className="w-full h-10 px-3 rounded-xl border border-input bg-card" value={form.status || 'ativo'} onChange={e => setForm({...form, status: e.target.value})}>
                    {VEICULO_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Nome *" value={form.nome || ''} onChange={e => setForm({...form, nome: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="CPF *" value={form.cpf || ''} onChange={e => setForm({...form, cpf: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="CNH" value={form.cnh || ''} onChange={e => setForm({...form, cnh: e.target.value})} />
                  <input type="date" className="w-full h-10 px-3 rounded-xl border border-input bg-card" value={form.cnh_validade || ''} onChange={e => setForm({...form, cnh_validade: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Telefone" value={form.telefone || ''} onChange={e => setForm({...form, telefone: e.target.value})} />
                  <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Transportadora" value={form.transportadora || ''} onChange={e => setForm({...form, transportadora: e.target.value})} />
                  <select className="w-full h-10 px-3 rounded-xl border border-input bg-card" value={form.status || 'ativo'} onChange={e => setForm({...form, status: e.target.value})}>
                    {MOTORISTA_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
              <Button onClick={save} className="w-full h-12 rounded-2xl">Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}