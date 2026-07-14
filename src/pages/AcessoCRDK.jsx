import { useState, useEffect } from 'react';
import { Truck, CheckCircle, Loader2, Clock, LogOut, X, Camera, PackageCheck, AlertCircle, Info, ShieldCheck, Download, ScanLine } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { imageUrlToBase64 } from '@/lib/pdf-utils';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function AcessoCRDK() {
  const { colaborador } = useProfarmaAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    placa_carreta: '', placa_cavalo: '', nome: '', empresa: '', destino: 'PR', rg_cpf: '',
    cracha: '', autorizacao_contato: ''
  });
  const [saidaItem, setSaidaItem] = useState(null);
  const [liberando, setLiberando] = useState(null);
  const [saidaObs, setSaidaObs] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoUploadUrl, setFotoUploadUrl] = useState('');
  const [fotoVerificando, setFotoVerificando] = useState(false);
  const [fotoStatus, setFotoStatus] = useState(null);
  const [fotoErro, setFotoErro] = useState('');
  const [fotoPlacasDetectadas, setFotoPlacasDetectadas] = useState([]);
  const [fotoStep, setFotoStep] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.AcessoCRDK.list('-created_date', 100);
      setRegistros(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadRegistros(); }, []);

  useEffect(() => {
    const unsub = base44.entities.AcessoCRDK.subscribe(() => loadRegistros());
    return unsub;
  }, []);

  const registrar = async () => {
    if (!form.placa_carreta || !form.nome) return;
    setSaving(true);
    try {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await base44.entities.AcessoCRDK.create({
        ...form,
        placa_carreta: form.placa_carreta.toUpperCase(),
        placa_cavalo: form.placa_cavalo.toUpperCase(),
        horario_entrada: now,
        status: 'descarregamento',
        filial_id: colaborador.filial_id,
        filial_nome: colaborador.filial_nome,
        operador_nome: colaborador.nome,
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Acesso CRDK registrado', details: `Placa Carreta: ${form.placa_carreta.toUpperCase()} | Placa Cavalo: ${form.placa_cavalo.toUpperCase() || '—'} | Motorista: ${form.nome} | Destino: ${form.destino}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      setForm({ placa_carreta: '', placa_cavalo: '', nome: '', empresa: '', destino: 'PR', rg_cpf: '', cracha: '', autorizacao_contato: '' });
      await loadRegistros();
    } catch (e) {}
    setSaving(false);
  };

  const normalizePlaca = (p) => (p || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoPreview(URL.createObjectURL(file));
    setFotoVerificando(true);
    setFotoStatus('verificando');
    setFotoErro('');
    setFotoFile(null);
    setFotoUploadUrl('');
    setFotoPlacasDetectadas([]);
    try {
      setFotoStep('Enviando foto...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotoStep('Analisando imagem com IA...');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Analise esta imagem e identifique TODAS as placas de veículo visíveis. Placas brasileiras têm formato ABC1D23 (padrão Mercosul) ou ABC1234 (padrão antigo). Retorne apenas as placas encontradas em maiúsculas, sem hífens ou espaços. Se nenhuma placa for visível na imagem, retorne uma lista vazia.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            placas_encontradas: { type: "array", items: { type: "string" } }
          }
        }
      });
      setFotoStep('Comparando placas...');
      const registradas = [normalizePlaca(saidaItem.placa_carreta), normalizePlaca(saidaItem.placa_cavalo)].filter(Boolean);
      const detectadas = (result.placas_encontradas || []).map(normalizePlaca);
      setFotoPlacasDetectadas(detectadas);
      const coincidiu = detectadas.some(p => registradas.includes(p));
      if (coincidiu) {
        setFotoFile(file);
        setFotoUploadUrl(file_url);
        setFotoStatus('aceita');
      } else {
        setFotoStatus('rejeitada');
        setFotoErro(`Placa não reconhecida na foto. Esperada: ${registradas.join(' / ')}.`);
      }
    } catch (e) {
      setFotoStatus('rejeitada');
      setFotoErro('Erro ao verificar a foto. Tente novamente.');
    }
    setFotoVerificando(false);
    setFotoStep('');
  };

  const confirmarSaida = async () => {
    setLiberando(saidaItem.id);
    try {
      const now = new Date();
      const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const placaCompleta = `${saidaItem.placa_carreta}${saidaItem.placa_cavalo ? '/' + saidaItem.placa_cavalo : ''}`;
      await base44.entities.AcessoCRDK.update(saidaItem.id, {
        horario_saida: hora,
        data_saida: now.toISOString(),
        observacao: saidaObs.trim(),
        foto_interior: fotoUploadUrl,
        status: 'saida'
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Saída CRDK liberada', details: `Placas: ${placaCompleta} | Motorista: ${saidaItem.nome} | Foto: ${fotoUploadUrl ? 'Sim (placa verificada)' : 'Não'}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });

      // Integrar com Google Sheets e Calendar (silencioso se não conectado)
      const spreadsheetId = localStorage.getItem('google_sheets_id');
      if (spreadsheetId) {
        try {
          await base44.functions.invoke('enviarParaGoogleSheets', {
            spreadsheet_id: spreadsheetId,
            dados: [placaCompleta, saidaItem.nome, saidaItem.empresa || '—', saidaItem.destino || '—', saidaItem.horario_entrada || '—', hora, saidaObs.trim(), new Date().toLocaleString('pt-BR')]
          });
        } catch (e) {}
      }
      try {
        const entradaDate = new Date(saidaItem.created_date);
        const saidaDate = new Date();
        await base44.functions.invoke('enviarParaGoogleCalendar', {
          titulo: `CRDK Saída - ${placaCompleta}`,
          descricao: `Motorista: ${saidaItem.nome} | Empresa: ${saidaItem.empresa || '—'} | Destino: ${saidaItem.destino || '—'} | Operador: ${colaborador.nome}`,
          inicio: entradaDate.toISOString(),
          fim: saidaDate.toISOString()
        });
      } catch (e) {}

      await loadRegistros();
    } catch (e) {}
    setLiberando(null);
    setSaidaItem(null); setSaidaObs(''); setFotoFile(null); setFotoPreview(null); setFotoUploadUrl(''); setFotoStatus(null); setFotoErro(''); setFotoVerificando(false); setFotoPlacasDetectadas([]); setFotoStep('');
  };

  const exportarPDF = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 15;
      let y = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA LIBERAAUTO PRO', pw / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório de Transferências CRDK', pw / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} por ${colaborador.nome}`, pw / 2, y, { align: 'center' });
      y += 8;

      for (const reg of registros) {
        if (y > ph - 60) { doc.addPage(); y = 20; }
        doc.setDrawColor(200, 200, 200);
        doc.line(m, y, pw - m, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(`Placa: ${reg.placa_carreta || '—'}${reg.placa_cavalo ? ' / ' + reg.placa_cavalo : ''}`, m, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        doc.text(`Motorista: ${reg.nome || '—'}`, m, y); y += 4;
        doc.text(`Empresa: ${reg.empresa || '—'} | Destino: ${reg.destino || '—'}`, m, y); y += 4;
        doc.text(`Entrada: ${reg.horario_entrada || '—'} | Saída: ${reg.horario_saida || '—'}`, m, y); y += 4;
        if (reg.rg_cpf) { doc.text(`RG/CPF: ${reg.rg_cpf}`, m, y); y += 4; }
        if (reg.cracha) { doc.text(`Crachá: ${reg.cracha}`, m, y); y += 4; }
        if (reg.observacao) { const obsLines = doc.splitTextToSize(`Observações: ${reg.observacao}`, pw - m * 2); for (const l of obsLines) { if (y > ph - 20) { doc.addPage(); y = 20; } doc.text(l, m, y); y += 4; } }
        doc.text(`Status: ${reg.status === 'saida' ? 'Saída liberada' : 'Em descarregamento'}`, m, y); y += 4;

        if (reg.foto_interior) {
          try {
            const dataUrl = await imageUrlToBase64(reg.foto_interior);
            const iw = 60; const ih = 35;
            if (y + ih > ph - 15) { doc.addPage(); y = 20; }
            doc.addImage(dataUrl, 'PNG', m, y, iw, ih);
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text('Foto do interior (placa verificada por IA)', m + iw + 5, y + 5);
            y += ih + 5;
          } catch (e) {}
        }
        y += 4;
      }

      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA LIBERAAUTO PRO — Relatório CRDK — Página ${i} de ${pc}`, pw / 2, ph - 8, { align: 'center' });
      }
      doc.save('Relatorio_CRDK.pdf');
    } catch (e) {}
    setExportingPdf(false);
  };

  const ativos = registros.filter(r => r.status === 'descarregamento');
  const placaCompleta = (r) => `${r.placa_carreta || ''}${r.placa_cavalo ? '/' + r.placa_cavalo : ''}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Acesso CRDK</h1>
          <p className="text-sm text-muted-foreground">Registro de transferência de mercadorias entre centros de distribuição</p>
        </div>
        <Button onClick={exportarPDF} disabled={exportingPdf} variant="secondary" className="h-12 rounded-2xl">
          {exportingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Exportar PDF
        </Button>
      </div>

      {/* Formulário */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Novo Registro</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Placa da Carreta *" value={form.placa_carreta} onChange={v => setForm({...form, placa_carreta: v.toUpperCase()})} placeholder="ABC1D23" />
          <Field label="Placa do Cavalo" value={form.placa_cavalo} onChange={v => setForm({...form, placa_cavalo: v.toUpperCase()})} placeholder="ABC1D23" />
          <Field label="Nome *" value={form.nome} onChange={v => setForm({...form, nome: v})} placeholder="Nome do motorista" />
          <Field label="Empresa" value={form.empresa} onChange={v => setForm({...form, empresa: v})} placeholder="Transportadora" />
          <Field label="Destino" value={form.destino} onChange={v => setForm({...form, destino: v})} placeholder="PR" />
          <Field label="RG / CPF" value={form.rg_cpf} onChange={v => setForm({...form, rg_cpf: formatCPF(v)})} placeholder="000.000.000-00" maxLength={14} />
          <Field label="Crachá" value={form.cracha} onChange={v => setForm({...form, cracha: v})} placeholder="Nº do crachá" />
          <Field label="Autorização / Contato" value={form.autorizacao_contato} onChange={v => setForm({...form, autorizacao_contato: v})} placeholder="Autorização ou contato" />
        </div>
        <Button onClick={registrar} disabled={saving || !form.placa_carreta || !form.nome} className="h-12 rounded-2xl mt-3 w-full sm:w-auto">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          Registrar Entrada
        </Button>
      </div>

      {/* Veículos em descarregamento (Kanban) */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-bold">Validado em Descarregamento ({ativos.length})</h3>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo em descarregamento</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ativos.map(reg => (
              <div key={reg.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-primary pulse-teal" />
                  <p className="text-sm font-medium">{placaCompleta(reg)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{reg.nome}</p>
                <p className="text-xs text-muted-foreground">{reg.empresa || '—'} | Destino: {reg.destino || '—'}</p>
                {reg.rg_cpf && <p className="text-xs text-muted-foreground">RG/CPF: {reg.rg_cpf}</p>}
                {reg.cracha && <p className="text-xs text-muted-foreground">Crachá: {reg.cracha}</p>}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" /> Entrada: {reg.horario_entrada || '—'}
                </p>
                <Button
                  size="sm"
                  className="h-8 w-full rounded-xl mt-2"
                  disabled={liberando === reg.id}
                  onClick={() => { setSaidaItem(reg); }}
                >
                  {liberando === reg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Liberar Saída
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Liberar Saída */}
      {saidaItem && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Liberar Saída</h2>
              </div>
              <button onClick={() => { setSaidaItem(null); setSaidaObs(''); setFotoFile(null); setFotoPreview(null); setFotoUploadUrl(''); setFotoStatus(null); setFotoErro(''); setFotoVerificando(false); setFotoPlacasDetectadas([]); setFotoStep(''); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Veículo: <span className="font-medium text-foreground">{placaCompleta(saidaItem)}</span> — {saidaItem.nome}
            </p>

            {/* Foto do interior da carreta */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Foto do Interior da Carreta *</label>

              {/* Requisitos da foto */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">Requisitos da foto:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>A placa do veículo deve aparecer visível e legível</li>
                    <li>Tire a foto de frente para a placa, sem obstruções</li>
                    <li>Boa iluminação para facilitar a leitura automática</li>
                    <li>Placa esperada: <span className="font-medium text-foreground">{saidaItem.placa_carreta}{saidaItem.placa_cavalo ? ' / ' + saidaItem.placa_cavalo : ''}</span></li>
                  </ul>
                </div>
              </div>

              {/* Sem foto */}
              {!fotoPreview && (
                <label className="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-input rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tirar foto / Selecionar imagem</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
                </label>
              )}

              {/* Verificando */}
              {fotoPreview && fotoVerificando && (
                <div className="relative">
                  <img src={fotoPreview} alt="Verificando" className="w-full h-40 object-cover rounded-xl border border-border opacity-60" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <span className="text-xs font-medium text-foreground bg-card px-3 py-1 rounded-full">{fotoStep}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-6 rounded-full ${fotoStep.includes('Analisando') || fotoStep.includes('Comparando') ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`h-1.5 w-6 rounded-full ${fotoStep.includes('Analisando') || fotoStep.includes('Comparando') ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      <div className={`h-1.5 w-6 rounded-full ${fotoStep.includes('Comparando') ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Aceita */}
              {fotoPreview && fotoStatus === 'aceita' && (
                <div className="space-y-2">
                  <div className="relative">
                    <img src={fotoPreview} alt="Aceita" className="w-full h-40 object-cover rounded-xl border border-primary/40" />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-lg text-xs">
                      <ShieldCheck className="h-3 w-3" /> Placa verificada
                    </div>
                    <button onClick={() => { setFotoFile(null); setFotoPreview(null); setFotoStatus(null); setFotoUploadUrl(''); setFotoPlacasDetectadas([]); }} className="absolute top-2 left-2 h-8 w-8 rounded-lg bg-foreground/60 text-background flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-2">
                    <ScanLine className="h-4 w-4 text-primary shrink-0" />
                    <div className="text-xs">
                      <span className="text-muted-foreground">Placa detectada: </span>
                      <span className="font-bold text-primary">{fotoPlacasDetectadas.join(', ')}</span>
                      <CheckCircle className="h-3 w-3 text-primary inline ml-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Rejeitada */}
              {fotoPreview && fotoStatus === 'rejeitada' && (
                <div className="space-y-2">
                  <div className="relative">
                    <img src={fotoPreview} alt="Rejeitada" className="w-full h-40 object-cover rounded-xl border border-destructive/40 opacity-50" />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-lg text-xs">
                      <AlertCircle className="h-3 w-3" /> Não aceita
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <span className="text-xs text-destructive text-center">{fotoErro}</span>
                    </div>
                  </div>
                  {fotoPlacasDetectadas.length > 0 && (
                    <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-2">
                      <ScanLine className="h-4 w-4 text-destructive shrink-0" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Detectada(s) na foto: </span>
                        <span className="font-bold text-destructive">{fotoPlacasDetectadas.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {fotoPlacasDetectadas.length === 0 && (
                    <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-2">
                      <ScanLine className="h-4 w-4 text-destructive shrink-0" />
                      <span className="text-xs text-destructive">Nenhuma placa foi detectada na foto. Certifique-se de que a placa esteja visível.</span>
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 h-10 border-2 border-dashed border-input rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tirar nova foto</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações (opcional)</label>
              <textarea
                value={saidaObs}
                onChange={e => setSaidaObs(e.target.value)}
                placeholder="Observações sobre a saída..."
                rows={2}
                className="w-full p-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => { setSaidaItem(null); setSaidaObs(''); setFotoFile(null); setFotoPreview(null); setFotoUploadUrl(''); setFotoStatus(null); setFotoErro(''); setFotoVerificando(false); setFotoPlacasDetectadas([]); setFotoStep(''); }}>
                Cancelar
              </Button>
              <Button className="flex-1 h-11 rounded-xl" disabled={liberando === saidaItem.id || fotoStatus !== 'aceita'} onClick={confirmarSaida}>
                {liberando === saidaItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirmar Saída
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </div>
  );
}