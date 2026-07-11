import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Users, Loader2, Pencil } from 'lucide-react';
import { formatCPF, cleanCPF } from '@/lib/cpf-utils';

const CARGOS = {
  administrador_master: 'Admin Master',
  administrador: 'Administrador',
  operador: 'Operador',
  visualizador: 'Visualizador',
};

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', cpf: '', senha: '', filial_id: '', cargo: 'operador' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([
      base44.entities.Colaborador.filter({}),
      base44.entities.Filial.filter({ ativo: true }),
    ]).then(([col, fil]) => {
      setColaboradores(col.sort((a, b) => a.nome?.localeCompare(b.nome)));
      setFiliais(fil);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', cpf: '', senha: '', filial_id: '', cargo: 'operador' });
    setDialogOpen(true);
  };

  const openEdit = (col) => {
    setEditing(col);
    setForm({ nome: col.nome, cpf: formatCPF(col.cpf || ''), senha: '', filial_id: col.filial_id || '', cargo: col.cargo || 'operador' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.cpf) {
      toast({ title: 'Preencha nome e CPF', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const filial = filiais.find(f => f.id === form.filial_id);
    const data = {
      nome: form.nome,
      cpf: cleanCPF(form.cpf),
      filial_id: form.filial_id,
      filial_nome: filial ? `${filial.codigo} - ${filial.cidade || filial.nome}` : '',
      cargo: form.cargo,
    };
    if (form.senha) data.senha = form.senha;

    if (editing) {
      await base44.entities.Colaborador.update(editing.id, data);
      toast({ title: 'Colaborador atualizado' });
    } else {
      if (!form.senha) { toast({ title: 'Senha obrigatória', variant: 'destructive' }); setSaving(false); return; }
      data.senha = form.senha;
      data.ativo = true;
      await base44.entities.Colaborador.create(data);
      toast({ title: 'Colaborador criado' });
    }
    setDialogOpen(false);
    setSaving(false);
    loadData();
  };

  const toggleAtivo = async (col) => {
    await base44.entities.Colaborador.update(col.id, { ativo: !col.ativo });
    loadData();
  };

  const filtered = colaboradores.filter(c =>
    !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.cpf?.includes(cleanCPF(search))
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Colaboradores</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} colaborador(es)</p>
        </div>
        <Button onClick={openNew} className="bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] rounded-xl h-10">
          <Plus className="w-4 h-4 mr-2" /> Novo colaborador
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..." className="bg-white/5 border-white/10 text-white pl-10 h-10 rounded-xl placeholder:text-white/25" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((col) => (
            <div key={col.id} className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm text-white font-medium truncate">{col.nome}</span>
                  {!col.ativo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Inativo</span>}
                </div>
                <p className="text-xs text-white/40">CPF: {formatCPF(col.cpf || '')} · {CARGOS[col.cargo] || col.cargo}</p>
                {col.filial_nome && <p className="text-xs text-white/30">{col.filial_nome}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={col.ativo !== false} onCheckedChange={() => toggleAtivo(col)} className="data-[state=checked]:bg-[hsl(160,50%,40%)]" />
                <Button size="icon" variant="ghost" onClick={() => openEdit(col)} className="text-white/30 hover:text-white hover:bg-white/5 h-8 w-8">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[hsl(200,12%,14%)] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Colaborador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">CPF *</Label>
              <Input value={form.cpf} onChange={(e) => setForm({...form, cpf: formatCPF(e.target.value)})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">{editing ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}</Label>
              <Input type="password" value={form.senha} onChange={(e) => setForm({...form, senha: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Cargo</Label>
                <Select value={form.cargo} onValueChange={(v) => setForm({...form, cargo: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(200,12%,16%)] border-white/10">
                    {Object.entries(CARGOS).map(([k, v]) => <SelectItem key={k} value={k} className="text-white/80 focus:bg-white/10 focus:text-white">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Filial</Label>
                <Select value={form.filial_id} onValueChange={(v) => setForm({...form, filial_id: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(200,12%,16%)] border-white/10">
                    {filiais.map(f => <SelectItem key={f.id} value={f.id} className="text-white/80 focus:bg-white/10 focus:text-white">{f.codigo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] rounded-xl h-10">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}