import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, CheckCircle2, XCircle, Clock, Loader2, FileCheck } from 'lucide-react';

export default function Liberacoes() {
  const { colaborador } = useProfarmaAuth();
  const [liberacoes, setLiberacoes] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [form, setForm] = useState({ numero_pedido: '', cliente: '', cnpj_cliente: '', filial_id: '', valor: '', motivo_bloqueio: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([
      base44.entities.Liberacao.filter({}),
      base44.entities.Filial.filter({ ativo: true }),
    ]).then(([lib, fil]) => {
      setLiberacoes(lib.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setFiliais(fil);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.numero_pedido || !form.cliente) {
      toast({ title: 'Preencha pedido e cliente', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const filial = filiais.find(f => f.id === form.filial_id);
    await base44.entities.Liberacao.create({
      ...form,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      filial_nome: filial ? `${filial.codigo} - ${filial.cidade || filial.nome}` : '',
      status: 'pendente',
    });
    toast({ title: 'Liberação criada' });
    setDialogOpen(false);
    setForm({ numero_pedido: '', cliente: '', cnpj_cliente: '', filial_id: '', valor: '', motivo_bloqueio: '' });
    setSaving(false);
    loadData();
  };

  const handleAction = async (action) => {
    if (!actionDialog) return;
    setSaving(true);
    await base44.entities.Liberacao.update(actionDialog.id, {
      status: action,
      observacao,
      liberado_por: colaborador?.nome,
      data_liberacao: new Date().toISOString(),
    });
    toast({ title: action === 'liberado' ? 'Pedido liberado!' : 'Pedido rejeitado' });
    setActionDialog(null);
    setObservacao('');
    setSaving(false);
    loadData();
  };

  const filtered = liberacoes.filter(l => {
    const matchSearch = !search || l.numero_pedido?.includes(search) || l.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Liberações</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} registro(s)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] rounded-xl h-10">
          <Plus className="w-4 h-4 mr-2" /> Nova liberação
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido ou cliente..." className="bg-white/5 border-white/10 text-white pl-10 h-10 rounded-xl placeholder:text-white/25" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 rounded-xl w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(200,12%,16%)] border-white/10">
            <SelectItem value="todos" className="text-white/80 focus:bg-white/10 focus:text-white">Todos</SelectItem>
            <SelectItem value="pendente" className="text-white/80 focus:bg-white/10 focus:text-white">Pendentes</SelectItem>
            <SelectItem value="liberado" className="text-white/80 focus:bg-white/10 focus:text-white">Liberados</SelectItem>
            <SelectItem value="rejeitado" className="text-white/80 focus:bg-white/10 focus:text-white">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileCheck className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhuma liberação encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lib) => (
            <div key={lib.id} className="bg-[hsl(200,12%,14%)] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">Pedido #{lib.numero_pedido}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      lib.status === 'pendente' ? 'bg-yellow-500/15 text-yellow-400' :
                      lib.status === 'liberado' ? 'bg-emerald-500/15 text-emerald-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {lib.status === 'pendente' ? 'Pendente' : lib.status === 'liberado' ? 'Liberado' : 'Rejeitado'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 truncate">{lib.cliente} {lib.cnpj_cliente ? `· ${lib.cnpj_cliente}` : ''}</p>
                  {lib.filial_nome && <p className="text-xs text-white/30 mt-0.5">{lib.filial_nome}</p>}
                  {lib.motivo_bloqueio && <p className="text-xs text-orange-400/70 mt-1">Bloqueio: {lib.motivo_bloqueio}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {lib.valor && <span className="text-sm text-white/60 font-medium">R$ {lib.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                  {lib.status === 'pendente' && (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => { setActionDialog(lib); setObservacao(''); }} className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 h-8 rounded-lg text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Liberar
                      </Button>
                      <Button size="sm" onClick={() => { setActionDialog({ ...lib, _action: 'rejeitar' }); setObservacao(''); }} variant="ghost" className="text-red-400 hover:bg-red-500/15 h-8 rounded-lg text-xs">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  )}
                  {lib.status !== 'pendente' && lib.liberado_por && (
                    <span className="text-[10px] text-white/25">por {lib.liberado_por}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[hsl(200,12%,14%)] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Nova Liberação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Nº do Pedido *</Label>
              <Input value={form.numero_pedido} onChange={(e) => setForm({...form, numero_pedido: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Cliente *</Label>
              <Input value={form.cliente} onChange={(e) => setForm({...form, cliente: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">CNPJ do Cliente</Label>
              <Input value={form.cnpj_cliente} onChange={(e) => setForm({...form, cnpj_cliente: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Filial</Label>
                <Select value={form.filial_id} onValueChange={(v) => setForm({...form, filial_id: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(200,12%,16%)] border-white/10">
                    {filiais.map(f => <SelectItem key={f.id} value={f.id} className="text-white/80 focus:bg-white/10 focus:text-white">{f.codigo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Valor (R$)</Label>
                <Input type="number" value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Motivo do Bloqueio</Label>
              <Input value={form.motivo_bloqueio} onChange={(e) => setForm({...form, motivo_bloqueio: e.target.value})} className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] rounded-xl h-10">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Criar liberação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-[hsl(200,12%,14%)] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionDialog?._action === 'rejeitar' ? 'Rejeitar' : 'Liberar'} Pedido #{actionDialog?.numero_pedido}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-white/50">Cliente: {actionDialog?.cliente}</p>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px] resize-none" />
            </div>
            <Button
              onClick={() => handleAction(actionDialog?._action === 'rejeitar' ? 'rejeitado' : 'liberado')}
              disabled={saving}
              className={`w-full rounded-xl h-10 ${actionDialog?._action === 'rejeitar' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionDialog?._action === 'rejeitar' ? 'Confirmar rejeição' : 'Confirmar liberação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}