import { useState, useEffect, useRef } from 'react';
import { Car, Loader2, Download, Search, Pencil, Trash2, X, ScanText, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { getCuritibaDateTime } from '@/lib/curitiba-time.js';

export default function ControleVeiculosColaboradores() {
  const { colaborador } = useProfarmaAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeError, setRecognizeError] = useState('');
  const [recognizePreview, setRecognizePreview] = useState('');
  const [fotoCnhUrl, setFotoCnhUrl] = useState('');
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    placa: '', nome: '', matricula: '', setor: '',
    modelo_veiculo: '', cor: '', cnh: '', obs: ''
  });

  const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.VeiculoColaborador.list('-created_date', 500);
      setRegistros(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadRegistros(); }, []);

  useEffect(() => {
    const unsub = base44.entities.VeiculoColaborador.subscribe(() => loadRegistros());
    return unsub;
  }, []);

  const resetForm = () => {
    setForm({ placa: '', nome: '', matricula: '', setor: '', modelo_veiculo: '', cor: '', cnh: '', obs: '' });
    setEditId(null);
    setFotoCnhUrl('');
    setRecognizePreview('');
    setRecognizeError('');
  };

  const salvar = async () => {
    if (!form.placa || !form.nome) return;
    setSaving(true);
    try {
      const now = getCuritibaDateTime();
      const [data, horario] = now.split(' ');
      const payload = {
        placa: form.placa.toUpperCase(),
        nome: form.nome,
        matricula: form.matricula,
        setor: form.setor,
        modelo_veiculo: form.modelo_veiculo,
        cor: form.cor,
        cnh: form.cnh,
        obs: form.obs,
        foto_cnh: fotoCnhUrl || undefined,
        filial_id: colaborador.filial_id,
        filial_nome: colaborador.filial_nome,
        operador_nome: editorName,
      };

      if (editId) {
        await base44.entities.VeiculoColaborador.update(editId, payload);
        await base44.entities.AuditLog.create({
          user_name: colaborador.nome, user_cpf: colaborador.cpf,
          action: 'Veículo de colaborador editado',
          details: `Placa: ${form.placa} | Nome: ${form.nome}`,
          ip_address: 'local', domain: window.location.hostname,
          category: 'vehicle', branch_id: colaborador.filial_id
        });
      } else {
        payload.data = data;
        payload.horario = horario;
        await base44.entities.VeiculoColaborador.create(payload);
        await base44.entities.AuditLog.create({
          user_name: colaborador.nome, user_cpf: colaborador.cpf,
          action: 'Veículo de colaborador cadastrado',
          details: `Placa: ${form.placa} | Nome: ${form.nome}`,
          ip_address: 'local', domain: window.location.hostname,
          category: 'vehicle', branch_id: colaborador.filial_id
        });
      }

      resetForm();
      await loadRegistros();
    } catch (e) {}
    setSaving(false);
  };

  const editar = (reg) => {
    setEditId(reg.id);
    setForm({
      placa: reg.placa || '', nome: reg.nome || '', matricula: reg.matricula || '',
      setor: reg.setor || '', modelo_veiculo: reg.modelo_veiculo || '',
      cor: reg.cor || '', cnh: reg.cnh || '', obs: reg.obs || ''
    });
    setFotoCnhUrl(reg.foto_cnh || '');
    setRecognizePreview(reg.foto_cnh || '');
    setRecognizeError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluir = async (id) => {
    if (!confirm('Confirmar exclusão deste registro?')) return;
    try {
      await base44.entities.VeiculoColaborador.delete(id);
      await loadRegistros();
    } catch (e) {}
  };

  const reconhecerCNH = async (file) => {
    if (!file) return;
    setRecognizing(true);
    setRecognizeError('');
    setRecognizePreview(URL.createObjectURL(file));
    setFotoCnhUrl('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotoCnhUrl(file_url);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise a imagem da Carteira Nacional de Habilitação (CNH) brasileira e extraia os seguintes dados do motorista:
1. Nome completo do condutor
2. Número do registro da CNH (número da habilitação)

Retorne APENAS os dados no formato JSON especificado. Se algum campo não for legível, retorne string vazia.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome completo do condutor' },
            cnh: { type: 'string', description: 'Número do registro da CNH' }
          }
        }
      });
      setForm(prev => ({
        ...form,
        nome: result.nome || form.nome,
        cnh: result.cnh || form.cnh,
      }));
      if (!result.nome && !result.cnh) {
        setRecognizeError('Não foi possível identificar os dados da CNH na foto. Tente outra imagem com melhor qualidade.');
      }
    } catch (e) {
      setFotoCnhUrl('');
      setRecognizeError('Erro ao reconhecer CNH: ' + (e.message || 'desconhecido'));
    }
    setRecognizing(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) reconhecerCNH(file);
    e.target.value = '';
  };

  const filtered = registros.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return r.placa?.toLowerCase().includes(term)
      || r.nome?.toLowerCase().includes(term)
      || r.matricula?.toLowerCase().includes(term)
      || r.setor?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Controle de Veículos — Colaboradores</h1>
          <p className="text-sm text-muted-foreground">Cadastro de veículos de colaboradores das filiais</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">{editId ? 'Editar Registro' : 'Novo Registro'}</h3>
          {editId && (
            <button onClick={resetForm} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Cancelar edição
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Placa *" value={form.placa} onChange={v => setForm({ ...form, placa: v.toUpperCase() })} placeholder="ABC1D23" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome * <span className="text-primary">(via foto da CNH)</span></label>
            <input
              className="w-full h-10 px-3 rounded-xl border border-input bg-muted/30 text-sm cursor-not-allowed"
              value={form.nome}
              readOnly
              placeholder="Reconhecer via CNH"
            />
          </div>
          <Field label="Matrícula" value={form.matricula} onChange={v => setForm({ ...form, matricula: v })} placeholder="Nº de matrícula" />
          <Field label="Setor" value={form.setor} onChange={v => setForm({ ...form, setor: v })} placeholder="Setor" />
          <Field label="Modelo do Veículo" value={form.modelo_veiculo} onChange={v => setForm({ ...form, modelo_veiculo: v })} placeholder="Modelo" />
          <Field label="Cor" value={form.cor} onChange={v => setForm({ ...form, cor: v })} placeholder="Cor" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CNH * <span className="text-primary">(via foto da CNH)</span></label>
            <input
              className="w-full h-10 px-3 rounded-xl border border-input bg-muted/30 text-sm cursor-not-allowed"
              value={form.cnh}
              readOnly
              placeholder="Reconhecer via CNH"
            />
          </div>
          <Field label="OBS" value={form.obs} onChange={v => setForm({ ...form, obs: v })} placeholder="Observações" />
        </div>

        {/* Reconhecimento de CNH por foto */}
        <div className="mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ScanText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Reconhecimento de CNH por foto</p>
                <p className="text-xs text-muted-foreground">Tire uma foto da CNH para preencher nome e número automaticamente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              <Button
                type="button"
                variant="secondary"
                disabled={recognizing}
                onClick={() => fileInputRef.current?.click()}
                className="h-10 rounded-xl"
              >
                {recognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {recognizing ? 'Reconhecendo...' : 'Reconhecer CNH'}
              </Button>
            </div>
          </div>
          {recognizePreview && (
            <div className="mt-3 flex items-start gap-3">
              <img src={recognizePreview} alt="CNH" className="h-24 rounded-lg border border-border object-cover" />
              <div className="flex-1">
                {recognizing && <p className="text-xs text-primary flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analisando imagem...</p>}
                {recognizeError && <p className="text-xs text-destructive">{recognizeError}</p>}
                {!recognizing && !recognizeError && (form.nome || form.cnh) && (
                  <p className="text-xs text-primary">Dados preenchidos a partir da CNH. Revise antes de salvar.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-2">Os campos <strong>Nome</strong> e <strong>CNH</strong> são preenchidos exclusivamente via foto da CNH. A data, horário e operador são automáticos.</p>
        <Button onClick={salvar} disabled={saving || !form.placa || !form.nome} className="h-12 rounded-2xl mt-3 w-full sm:w-auto">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Car className="h-5 w-5" />}
          {editId ? 'Salvar Alterações' : 'Cadastrar Veículo'}
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por placa, nome, matrícula ou setor..."
          className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4">Veículos Cadastrados ({filtered.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo cadastrado</p>
        ) : (
          <div className="overflow-auto max-h-[500px] border border-border rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Placa', 'Nome', 'Matrícula', 'Setor', 'Modelo', 'Cor', 'CNH', 'OBS', 'Data', 'Horário', 'Operador', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 border-b border-border bg-secondary font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(reg => (
                  <tr key={reg.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs font-medium whitespace-nowrap">{reg.placa}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.nome}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.matricula || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.setor || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.modelo_veiculo || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.cor || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.cnh || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs max-w-[120px] truncate" title={reg.obs}>{reg.obs || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.data || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.horario || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.operador_nome || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => editar(reg)} className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary flex items-center justify-center">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => excluir(reg.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <input
        className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}