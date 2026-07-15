import { useState, useEffect } from 'react';
import { UserPlus, LogOut, Loader2, Download, CheckCircle, X, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { getCuritibaDateTime } from '@/lib/curitiba-time.js';
import { triggerDownload } from '@/lib/export-utils';

export default function ControleVisitantes() {
  const { colaborador } = useProfarmaAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saindo, setSaindo] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [search, setSearch] = useState('');
  const [saidaItem, setSaidaItem] = useState(null);
  const [form, setForm] = useState({ numero_cracha: '', nome: '', rg: '', empresa: '', modo_acesso: 'pe', placa: '', setor_visitado: '' });

  const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ControleVisitantes.list('-created_date', 500);
      setRegistros(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadRegistros(); }, []);

  useEffect(() => {
    const unsub = base44.entities.ControleVisitantes.subscribe(() => loadRegistros());
    return unsub;
  }, []);

  const registrarEntrada = async () => {
    if (!form.nome) return;
    setSaving(true);
    try {
      const now = getCuritibaDateTime();
      const [data, horario] = now.split(' ');
      await base44.entities.ControleVisitantes.create({
        numero_cracha: form.numero_cracha,
        nome: form.nome,
        rg: form.rg,
        empresa: form.empresa,
        placa: form.modo_acesso === 'veiculo' ? form.placa.toUpperCase() : '-',
        setor_visitado: form.setor_visitado,
        data,
        horario_entrada: horario,
        vigilante: editorName,
        status: 'entrada',
        cracha_devolvido: 'sim',
        filial_id: colaborador.filial_id,
        filial_nome: colaborador.filial_nome,
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Entrada de visitante registrada', details: `Crachá: ${form.numero_cracha} | Nome: ${form.nome} | Empresa: ${form.empresa}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      setForm({ numero_cracha: '', nome: '', rg: '', empresa: '', modo_acesso: 'pe', placa: '', setor_visitado: '' });
      await loadRegistros();
    } catch (e) {}
    setSaving(false);
  };

  const registrarSaida = async (item) => {
    setSaindo(item.id);
    try {
      const now = getCuritibaDateTime();
      const [, horario] = now.split(' ');
      await base44.entities.ControleVisitantes.update(item.id, {
        horario_saida: horario,
        cracha_devolvido: 'sim',
        status: 'saida',
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Saída de visitante registrada', details: `Nome: ${item.nome} | Crachá: ${item.numero_cracha || '—'}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      setSaidaItem(null);
      await loadRegistros();
    } catch (e) {}
    setSaindo(null);
  };

  const exportarPDF = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 10;
      let y = 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA DISTRIBUIDORA DE MEDICAMENTOS', pw / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('CONTROLE DE ACESSO DE VISITANTES', pw / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${getCuritibaDateTime()} por ${colaborador.nome}`, pw / 2, y, { align: 'center' });
      y += 8;

      const colW = [22, 22, 45, 30, 35, 22, 35, 18, 18, 25, 30];
      const headers = ['DATA', 'Nº CRACHÁ', 'NOME', 'RG', 'EMPRESA', 'PLACA', 'SETOR VISITADO', 'ENTRADA', 'SAÍDA', 'CRACHÁ DEVOLVIDO?', 'VIGILANTE'];

      doc.setFillColor(220, 220, 220);
      doc.rect(m, y - 4, pw - m * 2, 6, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      let x = m;
      headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colW[i]; });
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      for (const reg of filtered) {
        if (y > ph - 12) { doc.addPage(); y = 18; }
        x = m;
        const row = [reg.data || '—', reg.numero_cracha || '—', reg.nome || '—', reg.rg || '—', reg.empresa || '—', reg.placa || '—', reg.setor_visitado || '—', reg.horario_entrada || '—', reg.horario_saida || '—', reg.cracha_devolvido === 'sim' ? 'Sim' : reg.cracha_devolvido === 'nao' ? 'Não' : 'Pendente', reg.vigilante || '—'];
        row.forEach((val, i) => { doc.text(String(val).substring(0, Math.floor(colW[i] / 1.8)), x + 1, y); x += colW[i]; });
        y += 5;
      }

      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA — Controle de Visitantes — Página ${i} de ${pc}`, pw / 2, ph - 6, { align: 'center' });
      }
      const blob = doc.output('blob');
      triggerDownload(blob, 'Controle_Visitantes.pdf');
    } catch (e) {}
    setExportingPdf(false);
  };

  const filtered = registros.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return r.nome?.toLowerCase().includes(term) || r.rg?.includes(search) || r.empresa?.toLowerCase().includes(term) || r.numero_cracha?.includes(search);
  });

  const ativos = filtered.filter(r => r.status === 'entrada');
  const concluidos = filtered.filter(r => r.status === 'saida');

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Controle de Acesso de Visitantes</h1>
          <p className="text-sm text-muted-foreground">Registro de entrada e saída de visitantes e colaboradores terceiros</p>
        </div>
        <Button onClick={exportarPDF} disabled={exportingPdf || registros.length === 0} variant="secondary" className="h-12 rounded-2xl">
          {exportingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Exportar PDF
        </Button>
      </div>

      {/* Formul\u00e1rio */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Novo Registro de Entrada</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Número do Crachá" value={form.numero_cracha} onChange={v => setForm({...form, numero_cracha: v})} placeholder="Nº do crachá" />
          <Field label="Nome *" value={form.nome} onChange={v => setForm({...form, nome: v})} placeholder="Nome do visitante" />
          <Field label="RG" value={form.rg} onChange={v => setForm({...form, rg: v})} placeholder="RG do visitante" />
          <Field label="Empresa" value={form.empresa} onChange={v => setForm({...form, empresa: v})} placeholder="Empresa" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Modo de Acesso</label>
            <select
              value={form.modo_acesso}
              onChange={e => setForm({...form, modo_acesso: e.target.value, placa: e.target.value === 'pe' ? '' : form.placa})}
              className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pe">A pé</option>
              <option value="veiculo">De veículo</option>
            </select>
          </div>
          {form.modo_acesso === 'veiculo' ? (
            <Field label="Placa do Veículo *" value={form.placa} onChange={v => setForm({...form, placa: v.toUpperCase()})} placeholder="ABC1D23" />
          ) : (
            <div className="flex items-end">
              <div className="w-full h-10 px-3 rounded-xl border border-input bg-muted/30 text-sm text-muted-foreground flex items-center">—</div>
            </div>
          )}
          <Field label="Setor Visitado" value={form.setor_visitado} onChange={v => setForm({...form, setor_visitado: v})} placeholder="Setor visitado" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">A data, horário de entrada e vigilante são preenchidos automaticamente. O crachá é marcado como devolvido ao registrar a entrada.</p>
        <Button onClick={registrarEntrada} disabled={saving || !form.nome} className="h-12 rounded-2xl mt-3 w-full sm:w-auto">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          Registrar Entrada
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, RG, empresa ou crachá..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Visitantes ({filtered.length})</h3>
          {ativos.length > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ativos.length} em entrada</span>}
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum visitante registrado</p>
        ) : (
          <div className="overflow-auto max-h-[500px] border border-border rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Data', 'Crachá', 'Nome', 'RG', 'Empresa', 'Placa', 'Setor', 'Entrada', 'Saída', 'Crachá Devolvido?', 'Vigilante', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 border-b border-border bg-secondary font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(reg => (
                  <tr key={reg.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.data || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.numero_cracha || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs font-medium whitespace-nowrap">{reg.nome}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.rg || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.empresa || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.placa || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.setor_visitado || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.horario_entrada || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.horario_saida || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full ${reg.cracha_devolvido === 'sim' ? 'bg-primary/10 text-primary' : reg.cracha_devolvido === 'nao' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                        {reg.cracha_devolvido === 'sim' ? 'Sim' : reg.cracha_devolvido === 'nao' ? 'Não' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.vigilante || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">
                      {reg.status === 'entrada' && (
                        <Button size="sm" className="h-7 rounded-lg text-xs" disabled={saindo === reg.id} onClick={() => setSaidaItem(reg)}>
                          {saindo === reg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                          Saída
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirma\u00e7\u00e3o de sa\u00edda */}
      {saidaItem && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Registrar Saída</h2>
              </div>
              <button onClick={() => setSaidaItem(null)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Confirmar a saída de <span className="font-medium text-foreground">{saidaItem.nome}</span> e devolução do crachá?
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => setSaidaItem(null)}>Cancelar</Button>
              <Button className="flex-1 h-11 rounded-xl" disabled={saindo === saidaItem.id} onClick={() => registrarSaida(saidaItem)}>
                {saindo === saidaItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirmar Saída
              </Button>
            </div>
          </div>
        </div>
      )}
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