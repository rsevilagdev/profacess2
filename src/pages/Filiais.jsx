import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Building2, Loader2, Pencil } from 'lucide-react';

export default function Filiais() {
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', codigo: '', cidade: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    base44.entities.Filial.filter({}).then((data) => {
      setFiliais(data.sort((a, b) => a.codigo?.localeCompare(b.codigo)));
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: '', codigo: '', cidade: '' }); setDialogOpen(true); };
  const openEdit = (f) => { setEditing(f); setForm({ nome: f.nome, codigo: f.codigo, cidade: f.cidade || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nome || !form.codigo) { toast({ title: 'Preencha nome e código', variant: 'destructive' }); return; }
    setSaving(true);
    if (editing) {
      await base44.entities.Filial.update(editing.id, form);
      toast({ title: 'Filial atualizada' });
    } else {
      await base44.entities.Filial.create({ ...form, ativo: true });
      toast({ title: 'Filial criada' });
    }
    setDialogOpen(false);
    setSaving(false);
    loadData();
  };

  const toggleAtivo = async (f) => {
    await base44.entities.Filial.update(f.id, { ativo: !f.ativo });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Filiais</h1>
          <p className="text-white/40 text-sm mt-1">{filiais.length} filial(is)</p>
        </div>
        <Button onClick={openNew} className="bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] rounded-xl h-10">
          <Plus className="w-4 h-4 mr-2" /> Nova filial
        </Button>
      </div>

      {filiais.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhuma filial cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filiais.map((f) => (
            <div key={f.id} className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={f.ativo !== false} onCheckedChange={() => toggleAtivo(f)} className="data-[state=checked]:bg-[hsl(160,50%,40%)]" />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(f)} className="text-white/30 hover:text-white hover:bg-white/5 h-8 w-8">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-white font-semibold text-sm">{f.codigo}</p>
              <p className="text-xs text-white/50">{f.nome}</p>
              {f.cidade && <p className="text-xs text-white/30 mt-0.5">{f.cidade}</p>}
              {!f.ativo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 mt-2 inline-block">Inativa</span>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[hsl(200,12%,14%)] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Filial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Código *</Label>
              <Input value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} placeholder="Ex: CD PR" className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} placeholder="Nome da filial" className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} placeholder="Cidade" className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
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