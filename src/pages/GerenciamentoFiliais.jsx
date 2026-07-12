import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Building2, Truck, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

export default function GerenciamentoFiliais() {
  const { colaborador } = useProfarmaAuth();
  const [filiais, setFiliais] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [subTab, setSubTab] = useState('veiculos');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', codigo: '', cidade: '', endereco: '', descricao: '', ativo: true });

  const loadFiliais = async () => {
    const list = await base44.entities.Filial.list();
    setFiliais(list);
    if (!selectedFilial && list.length > 0) selectFilial(list[0]);
  };

  const selectFilial = async (f) => {
    setSelectedFilial(f);
    const [veics, drivers] = await Promise.all([
      base44.entities.Vehicle.filter({ filial_id: f.id }).catch(() => []),
      base44.entities.Driver.filter({ filial_id: f.id }).catch(() => []),
    ]);
    setVeiculos(veics); setMotoristas(drivers); setPage(0);
  };

  useEffect(() => { loadFiliais(); }, []);

  const currentList = subTab === 'veiculos' ? veiculos : motoristas;
  const filteredItems = currentList.filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (subTab === 'veiculos') return item.placa?.toLowerCase().includes(term) || item.modelo?.toLowerCase().includes(term) || item.transportadora?.toLowerCase().includes(term);
    return item.nome?.toLowerCase().includes(term) || item.sobrenome?.toLowerCase().includes(term) || item.cpf?.includes(search);
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageData = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const save = async () => {
    if (editing) {
      await base44.entities.Filial.update(editing.id, form);
      await logAudit('Filial editada', form.nome);
    } else {
      await base44.entities.Filial.create(form);
      await logAudit('Filial criada', form.nome);
    }
    setShowForm(false); loadFiliais();
  };

  const remove = async (f) => {
    await base44.entities.Filial.delete(f.id);
    await logAudit('Filial excluída', f.nome);
    loadFiliais();
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action, details,
      ip_address: 'local', domain: window.location.hostname, category: 'branch'
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Gerenciamento de Filiais</h1>
          <p className="text-sm text-muted-foreground">Filiais, veículos e motoristas por unidade</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ nome: '', codigo: '', cidade: '', endereco: '', descricao: '', ativo: true }); setShowForm(true); }} className="h-12 rounded-2xl">
          <Plus className="h-5 w-5 mr-1" /> Nova Filial
        </Button>
      </div>

      {/* Filiais Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        {filiais.map(f => (
          <div key={f.id} className={`bg-card rounded-2xl border-2 p-4 shadow-sm cursor-pointer transition-colors ${selectedFilial?.id === f.id ? 'border-primary' : 'border-border hover:border-primary/30'}`} onClick={() => selectFilial(f)}>
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditing(f); setForm(f); setShowForm(true); }} className="h-7 w-7 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); remove(f); }} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="font-medium text-sm truncate">{f.nome}</p>
            <p className="text-xs text-muted-foreground">{f.codigo}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${f.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{f.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Vehicles and Drivers per Filial */}
      {selectedFilial && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-2">
              <button onClick={() => { setSubTab('veiculos'); setPage(0); }} className={`px-3 py-2 rounded-xl text-sm font-medium ${subTab === 'veiculos' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Truck className="h-4 w-4 inline mr-1" /> Veículos ({veiculos.length})
              </button>
              <button onClick={() => { setSubTab('motoristas'); setPage(0); }} className={`px-3 py-2 rounded-xl text-sm font-medium ${subTab === 'motoristas' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Users className="h-4 w-4 inline mr-1" /> Motoristas ({motoristas.length})
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{selectedFilial.nome}</span>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder={`Buscar ${subTab === 'veiculos' ? 'veículo' : 'motorista'}...`} className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {pageData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum {subTab === 'veiculos' ? 'veículo' : 'motorista'} nesta filial</p>
          ) : (
            <div className="space-y-2">
              {pageData.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {subTab === 'veiculos' ? <Truck className="h-4 w-4 text-muted-foreground" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      {subTab === 'veiculos' ? (
                        <>
                          <p className="text-sm font-medium">{item.placa}</p>
                          <p className="text-xs text-muted-foreground">{item.modelo || '—'} · {item.transportadora || '—'}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium">{item.nome} {item.sobrenome || ''}</p>
                          <p className="text-xs text-muted-foreground">{item.cpf}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'ativo' ? 'bg-primary/10 text-primary' : item.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
          {filteredItems.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">{editing ? 'Editar' : 'Nova'} Filial</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Nome *" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Código (ex: CD-PR) *" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Cidade" value={form.cidade || ''} onChange={e => setForm({...form, cidade: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Endereço" value={form.endereco || ''} onChange={e => setForm({...form, endereco: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Descrição" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({...form, ativo: e.target.checked})} className="h-4 w-4" />
                <span className="text-sm">Filial ativa</span>
              </label>
              <Button onClick={save} className="w-full h-12 rounded-2xl">Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}