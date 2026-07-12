import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Building2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskPlaca } from '@/lib/lgpd-utils.js';

const PAGE_SIZE = 10;

export default function GerenciamentoFiliais() {
  const { colaborador } = useProfarmaAuth();
  const [filiais, setFiliais] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
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
    const veics = await base44.entities.Vehicle.filter({ filial_id: f.id });
    setVeiculos(veics);
    setPage(0);
  };

  useEffect(() => { loadFiliais(); }, []);

  const filteredVeiculos = veiculos.filter(v => !search || v.placa?.toLowerCase().includes(search.toLowerCase()) || v.transportadora?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredVeiculos.length / PAGE_SIZE));
  const pageData = filteredVeiculos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const save = async () => {
    if (editing) {
      await base44.entities.Filial.update(editing.id, form);
      await logAudit('Filial editada', form.nome);
    } else {
      const created = await base44.entities.Filial.create(form);
      await logAudit('Filial criada', form.nome);
      await base44.entities.Notification.create({ title: 'Filial Criada', message: `Filial "${form.nome}" foi criada`, type: 'admin_ops', sender_name: colaborador.nome });
    }
    setShowForm(false); loadFiliais();
  };

  const remove = async (f) => {
    await base44.entities.Filial.delete(f.id);
    await logAudit('Filial excluída', f.nome);
    await base44.entities.Notification.create({ title: 'Filial Excluída', message: `Filial "${f.nome}" foi removida`, type: 'admin_ops', sender_name: colaborador.nome });
    loadFiliais();
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action, details, ip_address: 'local', domain: window.location.hostname, category: 'branch' });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Gerenciamento de Filiais</h1>
          <p className="text-sm text-muted-foreground">CRUD de filiais e veículos por filial</p>
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

      {/* Vehicles per Filial */}
      {selectedFilial && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Veículos - {selectedFilial.nome}</h3>
            <span className="text-xs text-muted-foreground">{filteredVeiculos.length} veículos</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar veículo..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {pageData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo nesta filial</p>
          ) : (
            <div className="space-y-2">
              {pageData.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium blur-lg-text">{maskPlaca(v.placa)}</p>
                      <p className="text-xs text-muted-foreground blur-lg-text">{v.transportadora || '—'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${v.status === 'ativo' ? 'bg-primary/10 text-primary' : v.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
          {filteredVeiculos.length > PAGE_SIZE && (
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