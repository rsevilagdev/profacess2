import { useState, useEffect } from 'react';
import { Truck, CheckCircle, Loader2, Clock, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

export default function AcessoCRDK() {
  const { colaborador } = useProfarmaAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    placa: '', nome: '', empresa: '', destino: 'PR', rg_cpf: '',
    cracha: '', autorizacao_contato: '', observacao: ''
  });
  const [saidaId, setSaidaId] = useState(null);

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.AcessoCRDK.list('-created_date', 100);
      setRegistros(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadRegistros(); }, []);

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.AcessoCRDK.subscribe(() => loadRegistros());
    return unsub;
  }, []);

  const registrar = async () => {
    if (!form.placa || !form.nome) return;
    setSaving(true);
    try {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await base44.entities.AcessoCRDK.create({
        ...form,
        placa: form.placa.toUpperCase(),
        horario_entrada: now,
        status: 'entrada',
        filial_id: colaborador.filial_id,
        filial_nome: colaborador.filial_nome,
        operador_nome: colaborador.nome,
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Acesso CRDK registrado', details: `Placa: ${form.placa.toUpperCase()} | Motorista: ${form.nome} | Destino: ${form.destino}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      setForm({ placa: '', nome: '', empresa: '', destino: 'PR', rg_cpf: '', cracha: '', autorizacao_contato: '', observacao: '' });
      await loadRegistros();
    } catch (e) {}
    setSaving(false);
  };

  const registrarSaida = async (reg) => {
    setSaidaId(reg.id);
    try {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await base44.entities.AcessoCRDK.update(reg.id, {
        horario_saida: now,
        status: 'saida'
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Saída CRDK registrada', details: `Placa: ${reg.placa} | Motorista: ${reg.nome}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      await loadRegistros();
    } catch (e) {}
    setSaidaId(null);
  };

  const ativos = registros.filter(r => r.status === 'entrada');

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Acesso CRDK</h1>
        <p className="text-sm text-muted-foreground">Registro de transferência de mercadorias entre centros de distribuição</p>
      </div>

      {/* Formulário */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Novo Registro</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Placa *" value={form.placa} onChange={v => setForm({...form, placa: v.toUpperCase()})} placeholder="ABC1234" />
          <Field label="Nome *" value={form.nome} onChange={v => setForm({...form, nome: v})} placeholder="Nome do motorista" />
          <Field label="Empresa" value={form.empresa} onChange={v => setForm({...form, empresa: v})} placeholder="Transportadora" />
          <Field label="Destino" value={form.destino} onChange={v => setForm({...form, destino: v})} placeholder="PR" />
          <Field label="RG / CPF" value={form.rg_cpf} onChange={v => setForm({...form, rg_cpf: v})} placeholder="RG ou CPF" />
          <Field label="Crachá" value={form.cracha} onChange={v => setForm({...form, cracha: v})} placeholder="Nº do crachá" />
          <Field label="Autorização / Contato" value={form.autorizacao_contato} onChange={v => setForm({...form, autorizacao_contato: v})} placeholder="Autorização ou contato" />
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Observação</label>
            <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} placeholder="Observações" />
          </div>
        </div>
        <Button onClick={registrar} disabled={saving || !form.placa || !form.nome} className="h-12 rounded-2xl mt-3 w-full sm:w-auto">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          Registrar Entrada
        </Button>
      </div>

      {/* Registros ativos */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Veículos no Pátio ({ativos.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo no pátio</p>
        ) : (
          <div className="space-y-2">
            {ativos.map(reg => (
              <div key={reg.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{reg.placa} — {reg.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {reg.empresa || '—'} | Destino: {reg.destino || '—'} | RG/CPF: {reg.rg_cpf || '—'}
                    </p>
                    {reg.cracha && <p className="text-xs text-muted-foreground">Crachá: {reg.cracha}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Entrada: {reg.horario_entrada || '—'}
                    </p>
                    {reg.observacao && <p className="text-xs text-muted-foreground">Obs: {reg.observacao}</p>}
                  </div>
                </div>
                <Button size="sm" className="h-8 rounded-xl" disabled={saidaId === reg.id} onClick={() => registrarSaida(reg)}>
                  {saidaId === reg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Registrar Saída
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}