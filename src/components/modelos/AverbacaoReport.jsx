import { useState, useEffect } from 'react';
import { Loader2, FileText, FileSpreadsheet, Database } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const REPORT_COLUMNS = [
  'Data do Embarque',
  'Placa Veículo',
  'Itinerário',
  'UF Origem',
  'UF Destino',
  'Urbano',
  'Valor de mercadoria',
];

function findColumnInRow(row, possibleNames) {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const k of keys) {
      if (k.toUpperCase().trim() === upper) return k;
    }
  }
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const k of keys) {
      if (k.toUpperCase().trim().includes(upper)) return k;
    }
  }
  return null;
}

function getField(row, lists, field) {
  const key = findColumnInRow(row, field.names);
  if (!key) return '';
  const val = row[key] || '';
  if (lists && lists[key] && lists[key].length > 1) {
    return lists[key].join(', ');
  }
  return String(val);
}

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.');
  return Number(cleaned) || 0;
}

function getValorAfterVlLiquido(row) {
  const keys = Object.keys(row);
  if (keys.length === 0) return 0;
  const vlLiquidoKey = findColumnInRow(row, ['VL LITO', 'VL LIT', 'VLLITO', 'VL_LITO', 'VALOR LÍQUIDO', 'VALOR LIQUIDO', 'VLLIQUIDO', 'VL_LIQUIDO', 'LIQUIDO', 'LÍQUIDO', 'VL. LÍQ', 'VL LIQ', 'VL LÍQ']);
  if (vlLiquidoKey) {
    const idx = keys.indexOf(vlLiquidoKey);
    // Find first column without header (__col_X) after Vl Lito
    for (let i = idx + 1; i < keys.length; i++) {
      if (keys[i].startsWith('__col_')) {
        return parseNumber(row[keys[i]]);
      }
    }
    // If no synthetic column found, use the column immediately after Vl Lito
    if (idx >= 0 && idx + 1 < keys.length) {
      return parseNumber(row[keys[idx + 1]]);
    }
  }
  // Fallback to last column
  return parseNumber(row[keys[keys.length - 1]]);
}

const FIELD_MAP = {
  data: { names: ['DATA DO EMBARQUE', 'DATA EMBARQUE', 'DATA', 'DT_EMBARQUE', 'DTEMBARQUE', 'EMBARQUE'] },
  placa: { names: ['PLACA VEÍCULO', 'PLACA VEICULO', 'PLACA', 'VEICULO', 'VEÍCULO'] },
  itinerario: { names: ['ITINERÁRIO', 'ITINERARIO', 'ROTA', 'RUTA', 'ROUTE'] },
  ufOrigem: { names: ['UF ORIGEM', 'UF_ORIGEM', 'ORIGEM'] },
  ufDestino: { names: ['UF DESTINO', 'UF_DESTINO', 'DESTINO'] },
  urbano: { names: ['URBANO'] },
  valor: { names: ['VALOR DE MERCADORIA', 'VL NF', 'VL_NF', 'VLNF', 'VALOR NF', 'VALOR DA NF', 'VALOR DA NOTA', 'VALOR NOTA', 'VALOR', 'VL MERCADORIA', 'VLMERCADORIA', 'VL_MERCADORIA'] },
};

export default function AverbacaoReport({ tipo, periodo }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError] = useState('');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!periodo) { setRecords([]); return; }
    loadData();
  }, [tipo, periodo]);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      // Load ALL records using list + pagination (same approach as AverbacaoSavedData)
      const all = [];
      const PAGE_SIZE = 5000;
      let skip = 0;
      while (true) {
        const batch = await base44.entities.AverbacaoRecord.list('-created_date', PAGE_SIZE, skip);
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
      }
      // Filter in JavaScript by month
      let filtered = [];
      if (tipo === 'mensal') {
        filtered = all.filter(r => r.mes === periodo);
      } else {
        const semMonths = periodo === 1 ? MESES.slice(0, 6) : MESES.slice(6);
        filtered = all.filter(r => semMonths.includes(r.mes));
      }
      setRecords(filtered);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setLoadError('Erro ao carregar dados: ' + (e.message || 'desconhecido'));
    }
    setLoading(false);
  };

  // Parse records and build report rows
  const buildReportRows = () => {
    const parsed = records.map(r => {
      try {
        const data = JSON.parse(r.dados_json || '{}');
        return { ...r, row: data.row || {}, lists: data.lists || {}, count: data.count || 0 };
      } catch (e) {
        return { ...r, row: {}, lists: {}, count: 0 };
      }
    });

    if (tipo === 'semestral') {
      // Group by mes + prioridade, sum total_geral
      const groups = {};
      for (const r of parsed) {
        const key = `${r.mes}__${r.prioridade}`;
        if (!groups[key]) groups[key] = { mes: r.mes, prioridade: r.prioridade, total: 0, first: r };
        groups[key].total += (Number(r.total_geral) || 0);
      }
      // Sort by month order then priority
      return Object.values(groups).sort((a, b) => {
        const ma = MESES.indexOf(a.mes);
        const mb = MESES.indexOf(b.mes);
        if (ma !== mb) return ma - mb;
        return (parseInt(a.prioridade) || 0) - (parseInt(b.prioridade) || 0);
      }).map(g => ({
        'Data do Embarque': g.mes ? g.mes.toUpperCase() : '',
        'Placa Veículo': '',
        'Itinerário': g.prioridade || '',
        'UF Origem': getField(g.first.row, g.first.lists, FIELD_MAP.ufOrigem),
        'UF Destino': getField(g.first.row, g.first.lists, FIELD_MAP.ufDestino),
        'Urbano': getField(g.first.row, g.first.lists, FIELD_MAP.urbano),
        'Valor de mercadoria': g.total,
      }));
    } else {
      // Mensal: one row per date+priority, sorted by date then priority
      // Filter out aggregated 90/91 records (without route) when individual route records exist
      let filtered = parsed;
      for (const pn of [90, 91]) {
        const hasRouteRecords = filtered.some(r => {
          const num = parseInt(String(r.prioridade || '')) || 0;
          return num === pn && String(r.prioridade || '').includes('_');
        });
        if (hasRouteRecords) {
          filtered = filtered.filter(r => String(r.prioridade || '').trim() !== String(pn));
        }
      }

      const rows = filtered.map(r => {
        const priorityStr = String(r.prioridade || '').trim();
        const priorityNum = parseInt(priorityStr) || 0;
        const isUrban = (priorityNum === 90 || priorityNum === 91);
        const itinerario = priorityStr.includes('_')
          ? priorityStr.replace('_', '-')
          : priorityStr;
        const rotaNum = priorityStr.includes('_') ? parseNumber(priorityStr.split('_')[1]) : 0;

        return {
          _dia: parseInt(r.dia) || 0,
          _priorityNum: priorityNum,
          _rotaNum: rotaNum,
          'Data do Embarque': r.data_referencia || '',
          'Placa Veículo': '',
          'Itinerário': itinerario,
          'UF Origem': 'PR',
          'UF Destino': 'PR',
          'Urbano': isUrban ? 'Sim' : 'Não',
          'Valor de mercadoria': Number(r.total_geral) || 0,
        };
      });

      rows.sort((a, b) => {
        if (a._dia !== b._dia) return a._dia - b._dia;
        if (a._priorityNum !== b._priorityNum) return a._priorityNum - b._priorityNum;
        return a._rotaNum - b._rotaNum;
      });

      return rows.map(({ _dia, _priorityNum, _rotaNum, ...rest }) => rest);
    }
  };

  const reportRows = buildReportRows();
  const totalGeral = reportRows.reduce((acc, r) => acc + (Number(r['Valor de mercadoria']) || 0), 0);
  const periodoLabel = tipo === 'mensal' ? periodo : `${periodo}º Semestre`;
  const filialNome = records.length > 0 ? (records[0].filial_nome || 'PR01') : 'PR01';

  const exportPDF = () => {
    if (reportRows.length === 0) return;
    setExportingPdf(true);
    setExportError('');
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 12;
      let y = 14;

      // Header - Razão Social
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 105, 92);
      doc.text('Razão Social Segurado: PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA', m, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`CNPJ Segurado: 45.453.214/0002-86`, m, y);
      doc.text(`Mês: ${tipo === 'mensal' ? periodo.toUpperCase() : periodoLabel.toUpperCase()}`, pw / 2, y);
      doc.text(`Filial: ${filialNome}`, pw - m - 60, y);
      y += 5;
      doc.text(`Total Geral: R$ ${formatCurrency(totalGeral)}`, m, y);
      y += 7;

      // Table
      const availWidth = pw - m * 2;
      const colWidths = [50, 35, 25, 25, 25, 25, 45]; // proportional widths
      const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
      const scale = availWidth / totalColWidth;
      const scaledWidths = colWidths.map(w => w * scale);

      // Header row
      doc.setFillColor(0, 105, 92);
      doc.rect(m, y - 4, availWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      let x = m;
      REPORT_COLUMNS.forEach((col, i) => {
        doc.text(col, x + 1, y);
        x += scaledWidths[i];
      });
      y += 6;

      // Data rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const rowH = 5;
      reportRows.forEach((r, idx) => {
        if (y > ph - 20) { doc.addPage(); y = 14; }
        if (idx % 2 === 0) {
          doc.setFillColor(240, 245, 244);
          doc.rect(m, y - 4, availWidth, rowH, 'F');
        }
        x = m;
        REPORT_COLUMNS.forEach((col, i) => {
          let val = r[col];
          if (col === 'Valor de mercadoria') {
            val = formatCurrency(val);
          }
          doc.text(String(val || '—').substring(0, Math.floor(scaledWidths[i] / 1.8)), x + 1, y);
          x += scaledWidths[i];
        });
        y += rowH;
      });

      // Total row
      if (y > ph - 15) { doc.addPage(); y = 14; }
      y += 3;
      doc.setFillColor(0, 105, 92);
      doc.rect(m, y - 4, availWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL GERAL', m + 1, y);
      doc.text(`R$ ${formatCurrency(totalGeral)}`, m + availWidth - 60, y);

      // Footer
      const pc = doc.internal.getNumberOfPages();
      const title = tipo === 'mensal' ? `Averbação Mensal — ${periodoLabel}` : `Averbação Semestral — ${periodoLabel}`;
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA LIBERAAUTO PRO — ${title} — Página ${i} de ${pc}`, pw / 2, ph - 6, { align: 'center' });
      }

      const pdfFileName = `averbacao_${tipo}_${periodoLabel.replace(/\s+/g, '_')}.pdf`;
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro export PDF:', e);
      setExportError('Erro ao exportar PDF: ' + (e.message || 'desconhecido'));
    }
    setExportingPdf(false);
  };

  const exportExcel = () => {
    if (reportRows.length === 0) return;
    setExportingExcel(true);
    setExportError('');
    try {
      // Build sheet with header info like the original spreadsheet
      const aoa = [];
      // Row 0: header info
      aoa.push(['Razão Social Segurado: PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA', 'Cnpj Segurado: ', '45453214002286', 'Mês: ', tipo === 'mensal' ? periodo.toUpperCase() : periodoLabel.toUpperCase(), 'Filial ', filialNome, totalGeral]);
      // Row 1: column headers
      aoa.push(REPORT_COLUMNS);
      // Data rows
      for (const r of reportRows) {
        aoa.push(REPORT_COLUMNS.map(col => col === 'Valor de mercadoria' ? r[col] : (r[col] || '')));
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Averbação');
      const xlsxBlob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxBlob], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `averbacao_${tipo}_${periodoLabel.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro export Excel:', e);
      setExportError('Erro ao exportar Excel: ' + (e.message || 'desconhecido'));
    }
    setExportingExcel(false);
  };

  return (
    <div className="print-area bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">
            {tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — {periodoLabel}
          </h2>
        </div>
        {reportRows.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportPDF} disabled={exportingPdf} variant="secondary" size="sm" className="h-9 rounded-xl">
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
            </Button>
            <Button onClick={exportExcel} disabled={exportingExcel} variant="secondary" size="sm" className="h-9 rounded-xl">
              {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
            </Button>
          </div>
        )}
      </div>

      {(exportError || loadError) && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive">
          {loadError && <p>{loadError}</p>}
          {exportError && <p>{exportError}</p>}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : reportRows.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado para o período selecionado</p>
      ) : (
        <>
          {/* Header info like the spreadsheet */}
          <div className="mb-4 text-xs space-y-1">
            <p className="font-bold">Razão Social Segurado: PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA</p>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <span>CNPJ Segurado: 45.453.214/0002-86</span>
              <span>Mês: {tipo === 'mensal' ? periodo.toUpperCase() : periodoLabel.toUpperCase()}</span>
              <span>Filial: {filialNome}</span>
              <span className="font-bold text-primary">Total: R$ {formatCurrency(totalGeral)}</span>
            </div>
          </div>

          <div className="overflow-auto max-h-[600px] border border-border rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {REPORT_COLUMNS.map(col => (
                    <th key={col} className="border border-black px-2 py-1.5 bg-primary text-primary-foreground font-medium text-left whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                    {REPORT_COLUMNS.map(col => (
                      <td key={col} className="border border-black px-2 py-1 whitespace-nowrap">
                        {col === 'Valor de mercadoria'
                          ? formatCurrency(r[col])
                          : (r[col] || '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary">
                  <td colSpan={6} className="border border-black px-2 py-1.5 text-primary-foreground font-bold text-right">TOTAL GERAL</td>
                  <td className="border border-black px-2 py-1.5 text-primary-foreground font-bold whitespace-nowrap">R$ {formatCurrency(totalGeral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </>
      )}
    </div>
  );
}