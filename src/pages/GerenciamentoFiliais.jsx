import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building2, MapPin, Hash } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

export default function GerenciamentoFiliais() {
  const { colaborador } = useProfarmaAuth();
  const [filiais, setFiliais] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', codigo: '', cidade: '', endereco: '', descricao: '', ativo: true });

  const loadFiliais = async () => {
    const list = await base44.entities.Filial.list();
    setFiliais(list);
  };

  useEffect(() => { loadFiliais(); }, []);

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
      user_name: colaborador.nome, user_cpf: colaborador.cpf, action, details,
      ip_address: 'local', domain: window.location.hostname, category: 'branch'
    });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', codigo: '', cidade: '', endereco: '', descricao: '', ativo: true });
    setShowForm(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm(f);
    setShowForm(true);
  };

  const isAdmin = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Gerenciamento de Filiais</h1>
          <p className="text-sm text-muted-foreground">Cadastro de unidades operacionais</p>
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="h-12 rounded-2xl">
            <Plus className="h-5 w-5 mr-1" /> Nova Filial
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filiais.map(f => (
          <div key={f.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(f)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(f)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            <p className="font-heading font-bold text-base truncate">{f.nome}</p>
            <div className="space-y-1 mt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Hash className="h-3 w-3" />{f.codigo}</p>
              {f.cidade && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" />{f.cidade}</p>}
            </div>
            {f.endereco && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{f.endereco}</p>}
            <div className="mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${f.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{f.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
        ))}
      </div>

      {filiais.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-12 shadow-sm text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma filial cadastrada</p>
        </div>
      )}

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