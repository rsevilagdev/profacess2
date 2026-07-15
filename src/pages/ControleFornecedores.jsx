import { useState, useEffect } from 'react';
import { Truck, LogOut, Loader2, Download, Clock, User, Building2, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import { getCuritibaDateTime } from '@/lib/curitiba-time.js';
import { triggerDownload } from '@/lib/export-utils';

export default function ControleFornecedores() {
  const { colaborador } = useProfarmaAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saindo, setSaindo] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [form, setForm] = useState({ transportadora: '', placa: '', motorista: '', rg_cpf: '' });

  const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ControleFornecedores.list('-created_date', 200);
      setRegistros(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {loadRegistros();}, []);

  useEffect(() => {
    const unsub = base44.entities.ControleFornecedores.subscribe(() => loadRegistros());
    return unsub;
  }, []);

  const registrarEntrada = async () => {
    if (!form.transportadora || !form.placa) return;
    setSaving(true);
    try {
      const now = getCuritibaDateTime();
      const [data, horario] = now.split(' ');
      await base44.entities.ControleFornecedores.create({
        ...form,
        placa: form.placa.toUpperCase(),
        entrada_data: data,
        entrada_horario: horario,
        entrada_liberado_por: editorName,
        status: 'entrada',
        filial_id: colaborador.filial_id,
        filial_nome: colaborador.filial_nome,
        operador_nome: colaborador.nome
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Entrada de fornecedor registrada', details: `Transportadora: ${form.transportadora} | Placa: ${form.placa} | Motorista: ${form.motorista}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      setForm({ transportadora: '', placa: '', motorista: '', rg_cpf: '' });
      await loadRegistros();
    } catch (e) {}
    setSaving(false);
  };

  const liberarSaida = async (reg) => {
    setSaindo(reg.id);
    try {
      const now = getCuritibaDateTime();
      const [data, horario] = now.split(' ');
      await base44.entities.ControleFornecedores.update(reg.id, {
        saida_data: data,
        saida_horario: horario,
        saida_liberado_por: editorName,
        status: 'saida'
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Saída de fornecedor liberada', details: `Transportadora: ${reg.transportadora} | Placa: ${reg.placa}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
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
      const m = 12;
      let y = 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA DISTRIBUIDORA DE MEDICAMENTOS', pw / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('CONTROLE DE ENTRADA E SA\u00cdDA DE FORNECEDORES', pw / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${getCuritibaDateTime()} por ${colaborador.nome}`, pw / 2, y, { align: 'center' });
      y += 8;

      const colW = [40, 30, 45, 35, 35, 25, 35, 35, 25, 35, 25];
      const headers = ['TRANSPORTADORA', 'PLACA', 'MOTORISTA', 'RG/CPF', 'ENTRADA DATA', 'ENTRADA HORA', 'ENTRADA LIBERADO POR', 'SA\u00cdDA DATA', 'SA\u00cdDA HORA', 'SA\u00cdDA LIBERADO POR', 'STATUS'];

      doc.setFillColor(220, 220, 220);
      doc.rect(m, y - 4, pw - m * 2, 6, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      let x = m;
      headers.forEach((h, i) => {doc.text(h, x + 1, y);x += colW[i];});
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      for (const reg of registros) {
        if (y > ph - 12) {doc.addPage();y = 18;}
        x = m;
        const row = [reg.transportadora || '—', reg.placa || '—', reg.motorista || '—', reg.rg_cpf || '—', reg.entrada_data || '—', reg.entrada_horario || '—', reg.entrada_liberado_por || '—', reg.saida_data || '—', reg.saida_horario || '—', reg.saida_liberado_por || '—', reg.status === 'saida' ? 'Saída' : 'Entrada'];
        row.forEach((val, i) => {doc.text(String(val).substring(0, Math.floor(colW[i] / 1.8)), x + 1, y);x += colW[i];});
        y += 5;
      }

      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA — Controle de Fornecedores — P\u00e1gina ${i} de ${pc}`, pw / 2, ph - 6, { align: 'center' });
      }
      const blob = doc.output('blob');
      triggerDownload(blob, 'Controle_Fornecedores.pdf');
    } catch (e) {}
    setExportingPdf(false);
  };

  const ativos = registros.filter((r) => r.status === 'entrada');
  const concluidos = registros.filter((r) => r.status === 'saida');

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Controle de Entrada e Saída de Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Registro de entrada e saída de veiculos de transportadoras</p>
        </div>
        <Button onClick={exportarPDF} disabled={exportingPdf || registros.length === 0} variant="secondary" className="h-12 rounded-2xl">
          {exportingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Exportar PDF
        </Button>
      </div>

      {/* Formul\u00e1rio */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Novo Registro de Entrada</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Transportadora *" value={form.transportadora} onChange={(v) => setForm({ ...form, transportadora: v })} placeholder="Nome da transportadora" />
          <Field label="Placa *" value={form.placa} onChange={(v) => setForm({ ...form, placa: v.toUpperCase() })} placeholder="ABC1D23" />
          <Field label="Motorista" value={form.motorista} onChange={(v) => setForm({ ...form, motorista: v })} placeholder="Nome do motorista" />
          <Field label="RG / CPF" value={form.rg_cpf} onChange={(v) => setForm({ ...form, rg_cpf: formatCPF(v) })} placeholder="000.000.000-00" maxLength={14} />
        </div>
        <Button onClick={registrarEntrada} disabled={saving || !form.transportadora || !form.placa} className="h-12 rounded-2xl mt-3 w-full sm:w-auto">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />}
          Registrar Entrada
        </Button>
      </div>

      {/* Ve\u00edculos em entrada */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Em Entrada ({ativos.length})</h3>
        </div>
        {loading ?
        <div className="text-center py-8 text-muted-foreground">Carregando...</div> :
        ativos.length === 0 ?
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum ve\u00edculo em entrada</p> :

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ativos.map((reg) =>
          <div key={reg.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-primary pulse-teal" />
                  <p className="text-sm font-medium">{reg.placa}</p>
                </div>
                <p className="text-xs text-muted-foreground">{reg.transportadora}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {reg.motorista || '—'}</p>
                {reg.rg_cpf && <p className="text-xs text-muted-foreground">RG/CPF: {reg.rg_cpf}</p>}
                <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Entrada: {reg.entrada_data} {reg.entrada_horario}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Liberado por: {reg.entrada_liberado_por || '—'}</p>
                </div>
                <Button size="sm" className="h-8 w-full rounded-xl mt-2" disabled={saindo === reg.id} onClick={() => liberarSaida(reg)}>
                  {saindo === reg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Liberar Sa\u00edda
                </Button>
              </div>
          )}
          </div>
        }
      </div>

      {/* Registros conclu\u00eddos */}
      {concluidos.length > 0 &&
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-bold">Registros Conclu\u00eddos ({concluidos.length})</h3>
          </div>
          <div className="overflow-auto max-h-[400px] border border-border rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Transportadora', 'Placa', 'Motorista', 'RG/CPF', 'Entrada', 'Liberado por', 'Sa\u00edda', 'Liberado por'].map((h) =>
                <th key={h} className="text-left px-3 py-2 border-b border-border bg-secondary font-medium text-xs whitespace-nowrap">{h}</th>
                )}
                </tr>
              </thead>
              <tbody>
                {concluidos.map((reg) =>
              <tr key={reg.id} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.transportadora}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs font-medium whitespace-nowrap">{reg.placa}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.motorista || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.rg_cpf || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.entrada_data} {reg.entrada_horario}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.entrada_liberado_por || '—'}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.saida_data} {reg.saida_horario}</td>
                    <td className="px-3 py-1.5 border-b border-border/50 text-xs whitespace-nowrap">{reg.saida_liberado_por || '—'}</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>);

}

function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </div>);

}