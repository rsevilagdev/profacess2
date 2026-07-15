import { useState } from 'react';
import { Printer, Loader2, LayoutGrid, Calendar, Truck, Download, FileSpreadsheet, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { imageUrlToBase64 } from '@/lib/pdf-utils';
import { triggerDownload } from '@/lib/export-utils';
import ControleVeiculosExpedicao from '@/components/modelos/ControleVeiculosExpedicao';
import ControleVeiculosRecebimento from '@/components/modelos/ControleVeiculosRecebimento';
import AverbacaoReport from '@/components/modelos/AverbacaoReport';
import ControleFornecedoresReport from '@/components/modelos/ControleFornecedoresReport';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TEMPLATES = [
  {
    id: 'controle_veiculos_expedicao',
    name: 'Controle de Veículos Expedição',
    icon: LayoutGrid,
    description: 'Controle de entrada e saída de veículos com motorista e ajudante',
  },
  {
    id: 'controle_veiculos_recebimento',
    name: 'Controle de Veículos Recebimento',
    icon: Truck,
    description: 'Controle de recebimento de veículos — transferência entre CDs (CRDK)',
  },
  {
    id: 'averbacao_mensal',
    name: 'Averbação Mensal',
    icon: FileSpreadsheet,
    description: 'Relatório de averbação agrupado por mês com exportação PDF, Excel e e-mail',
  },
  {
    id: 'averbacao_semestral',
    name: 'Averbação Semestral',
    icon: FileSpreadsheet,
    description: 'Relatório de averbação agrupado por semestre com exportação PDF, Excel e e-mail',
  },
  {
    id: 'controle_fornecedores',
    name: 'Controle de Entrada e Saída de Fornecedores',
    icon: Users,
    description: 'Formulário de controle de entrada e saída de transportadoras com filtros de seleção múltipla',
  },
];

export default function Modelos() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedSemestre, setSelectedSemestre] = useState(1);

  const isAverbacao = selectedTemplate === 'averbacao_mensal' || selectedTemplate === 'averbacao_semestral';
  const isFornecedores = selectedTemplate === 'controle_fornecedores';

  const gerar = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const entity = selectedTemplate === 'controle_veiculos_recebimento' ? 'AcessoCRDK' : 'AccessLog';
      const allLogs = await base44.entities[entity].list('-created_date', 1000);
      let filtered = allLogs;
      if (dataInicio) {
        const inicio = new Date(dataInicio + 'T00:00:00');
        filtered = filtered.filter(l => new Date(l.created_date) >= inicio);
      }
      if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59');
        filtered = filtered.filter(l => new Date(l.created_date) <= fim);
      }
      filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setLogs(filtered);
    } catch (e) {}
    setLoading(false);
  };

  const exportarPDF = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 15;
      let y = 20;
      const isRecebimento = selectedTemplate === 'controle_veiculos_recebimento';
      const templateName = TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Relatório';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA LIBERAAUTO PRO', pw / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(templateName, pw / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const period = `${dataInicio || 'Início'} a ${dataFim || 'Fim'}`;
      doc.text(`Período: ${period} | Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, pw / 2, y, { align: 'center' });
      y += 8;

      for (const log of logs) {
        if (y > ph - 50) { doc.addPage(); y = 20; }
        doc.setDrawColor(200, 200, 200);
        doc.line(m, y, pw - m, y);
        y += 5;

        if (isRecebimento) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text(`Placa: ${log.placa_carreta || '—'}${log.placa_cavalo ? ' / ' + log.placa_cavalo : ''}`, m, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(70, 70, 70);
          doc.text(`Motorista: ${log.nome || '—'}`, m, y); y += 4;
          doc.text(`Empresa: ${log.empresa || '—'} | Destino: ${log.destino || '—'}`, m, y); y += 4;
          doc.text(`Entrada: ${log.horario_entrada || '—'} | Saída: ${log.horario_saida || '—'}`, m, y); y += 4;
          if (log.observacao) { const obsLines = doc.splitTextToSize(`Obs: ${log.observacao}`, pw - m * 2); for (const l of obsLines) { doc.text(l, m, y); y += 4; } }
          if (log.foto_interior) {
            try {
              const dataUrl = await imageUrlToBase64(log.foto_interior);
              if (y + 30 > ph - 15) { doc.addPage(); y = 20; }
              doc.addImage(dataUrl, 'PNG', m, y, 50, 30);
              doc.setFontSize(8);
              doc.setTextColor(120, 120, 120);
              doc.text('Foto verificada', m + 52, y + 5);
              y += 32;
            } catch (e) {}
          }
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text(`Placa: ${log.veiculo_placa || '—'}`, m, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(70, 70, 70);
          doc.text(`Motorista: ${log.motorista_nome || '—'}`, m, y); y += 4;
          doc.text(`Empresa: ${log.empresa || '—'} | Tipo: ${log.tipo || '—'}`, m, y); y += 4;
          doc.text(`Operador: ${log.operador_nome || '—'}`, m, y); y += 4;
          doc.text(`Data: ${new Date(log.created_date).toLocaleString('pt-BR')}`, m, y); y += 4;
          if (log.observacao) { const obsLines = doc.splitTextToSize(`Obs: ${log.observacao}`, pw - m * 2); for (const l of obsLines) { doc.text(l, m, y); y += 4; } }
          if (log.carregado) { doc.text('Veículo saiu carregado', m, y); y += 4; }
        }
        y += 3;
      }

      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA LIBERAAUTO PRO — ${templateName} — Página ${i} de ${pc}`, pw / 2, ph - 8, { align: 'center' });
      }
      const pdfBlob = doc.output('blob');
      triggerDownload(pdfBlob, `${templateName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {}
    setExportingPdf(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="brand-title text-2xl">Modelos Corporativos</h1>
        <p className="text-sm text-muted-foreground">Relatórios corporativos preenchidos automaticamente com os dados do sistema</p>
      </div>

      {/* Template selector */}
      <div className="no-print grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          const active = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-left p-4 rounded-2xl border transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-heading font-bold text-sm">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      {isFornecedores ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm">Controle de Fornecedores</h3>
              <p className="text-xs text-muted-foreground">Os filtros de seleção múltipla estão no relatório abaixo</p>
            </div>
            {generated && (
              <Button onClick={() => window.print()} variant="secondary" className="h-10 rounded-xl">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            )}
          </div>
        </div>
      ) : isAverbacao ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {selectedTemplate === 'averbacao_mensal' ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mês</label>
                <select
                  value={selectedMes}
                  onChange={e => setSelectedMes(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm min-w-[180px]"
                >
                  <option value="">Selecione um mês</option>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Semestre</label>
                <select
                  value={selectedSemestre}
                  onChange={e => setSelectedSemestre(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm min-w-[180px]"
                >
                  <option value={1}>1º Semestre (Jan–Jun)</option>
                  <option value={2}>2º Semestre (Jul–Dez)</option>
                </select>
              </div>
            )}
            {generated && (
              <Button onClick={() => window.print()} variant="secondary" className="h-10 rounded-xl ml-auto">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data inicial</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data final</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm" />
            </div>
            <Button onClick={gerar} disabled={loading} className="h-10 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Gerar Relatório
            </Button>
            {generated && !loading && (
              <div className="flex gap-2 ml-auto">
                <Button onClick={exportarPDF} disabled={exportingPdf} variant="secondary" className="h-10 rounded-xl">
                  {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar PDF
                </Button>
                <Button onClick={() => window.print()} variant="secondary" className="h-10 rounded-xl">
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template render */}
      {generated && selectedTemplate === 'controle_veiculos_expedicao' && (
        <ControleVeiculosExpedicao logs={logs} loading={loading} />
      )}
      {generated && selectedTemplate === 'controle_veiculos_recebimento' && (
        <ControleVeiculosRecebimento logs={logs} loading={loading} />
      )}
      {selectedTemplate === 'averbacao_mensal' && selectedMes && (
        <AverbacaoReport tipo="mensal" periodo={selectedMes} />
      )}
      {selectedTemplate === 'averbacao_semestral' && (
        <AverbacaoReport tipo="semestral" periodo={selectedSemestre} />
      )}
      {isFornecedores && (
        <ControleFornecedoresReport />
      )}
    </div>
  );
}