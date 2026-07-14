import { useState, useEffect } from 'react';
import { Loader2, FileText, FileSpreadsheet, Mail, Database } from 'lucide-react';
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

function getLastColumnValue(row) {
  const keys = Object.keys(row);
  if (keys.length === 0) return 0;
  const lastKey = keys[keys.length - 1];
  return parseNumber(row[lastKey]);
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
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [sendingManagers, setSendingManagers] = useState(false);
  const [managersMsg, setManagersMsg] = useState('');

  useEffect(() => {
    if (!periodo) { setRecords([]); return; }
    loadData();
  }, [tipo, periodo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AverbacaoRecord.list('-created_date', 500);
      let filtered = all;
      if (tipo === 'mensal') {
        filtered = all.filter(r => r.mes === periodo);
      } else {
        const semMonths = periodo === 1 ? MESES.slice(0, 6) : MESES.slice(6);
        filtered = all.filter(r => semMonths.includes(r.mes));
      }
      setRecords(filtered);
    } catch (e) {}
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
        groups[key].total += getLastColumnValue(r.row) || (r.total_geral || 0);
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
      // Mensal: one row per priority group, deduplicated
      const seen = new Set();
      const deduped = [];
      for (const r of parsed) {
        const key = `${r.prioridade}_${r.dados_json}`;
        if (!seen.has(key)) { seen.add(key); deduped.push(r); }
      }
      deduped.sort((a, b) => (parseInt(a.prioridade) || 0) - (parseInt(b.prioridade) || 0));
      return deduped.map(r => ({
        'Data do Embarque': getField(r.row, r.lists, FIELD_MAP.data) || r.data_referencia || '',
        'Placa Veículo': getField(r.row, r.lists, FIELD_MAP.placa),
        'Itinerário': r.prioridade || '',
        'UF Origem': getField(r.row, r.lists, FIELD_MAP.ufOrigem),
        'UF Destino': getField(r.row, r.lists, FIELD_MAP.ufDestino),
        'Urbano': getField(r.row, r.lists, FIELD_MAP.urbano),
        'Valor de mercadoria': getLastColumnValue(r.row) || (r.total_geral || 0),
      }));
    }
  };

  const reportRows = buildReportRows();
  const totalGeral = reportRows.reduce((acc, r) => acc + (Number(r['Valor de mercadoria']) || 0), 0);
  const periodoLabel = tipo === 'mensal' ? periodo : `${periodo}º Semestre`;
  const filialNome = records.length > 0 ? (records[0].filial_nome || 'PR01') : 'PR01';

  const exportPDF = () => {
    if (reportRows.length === 0) return;
    setExportingPdf(true);
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

      doc.save(`averbacao_${tipo}_${periodoLabel.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {}
    setExportingPdf(false);
  };

  const exportExcel = () => {
    if (reportRows.length === 0) return;
    setExportingExcel(true);
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
      XLSX.writeFile(wb, `averbacao_${tipo}_${periodoLabel.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {}
    setExportingExcel(false);
  };

  const sendEmail = async () => {
    if (reportRows.length === 0 || !emailTo) return;
    setSendingEmail(true);
    setEmailMsg('');
    try {
      const subject = `${tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — ${periodoLabel}`;
      const body = buildEmailBody();
      await base44.integrations.Core.SendEmail({
        to: emailTo,
        subject,
        body,
      });
      setEmailMsg('E-mail enviado com sucesso!');
      setTimeout(() => setEmailMsg(''), 5000);
    } catch (e) {
      setEmailMsg('Erro ao enviar: ' + (e.message || 'desconhecido'));
    }
    setSendingEmail(false);
  };

  const buildEmailBody = () => {
    const htmlTable = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:11px;font-family:Arial">
      <thead><tr>${REPORT_COLUMNS.map(c => `<th style="background:#00695C;color:#fff">${c}</th>`).join('')}</tr></thead>
      <tbody>${reportRows.map(r => `<tr>${REPORT_COLUMNS.map(c => `<td>${c === 'Valor de mercadoria' ? formatCurrency(r[c]) : (r[c] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="6" style="font-weight:bold;background:#00695C;color:#fff">TOTAL GERAL</td><td style="font-weight:bold;background:#00695C;color:#fff">R$ ${formatCurrency(totalGeral)}</td></tr></tfoot>
    </table>`;
    return `
      <h2 style="color:#00695C">PROFARMA LIBERAAUTO PRO</h2>
      <p><strong>Razão Social Segurado:</strong> PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA</p>
      <p><strong>CNPJ:</strong> 45.453.214/0002-86 | <strong>Filial:</strong> ${filialNome}</p>
      <h3>${tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — ${periodoLabel}</h3>
      <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <p><strong>Total Geral:</strong> R$ ${formatCurrency(totalGeral)}</p>
      ${htmlTable}
    `;
  };

  const sendToManagers = async () => {
    if (reportRows.length === 0) return;
    setSendingManagers(true);
    setManagersMsg('');
    try {
      const colaboradores = await base44.entities.Colaborador.list('-created_date', 500);
      const managers = colaboradores.filter(c =>
        ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo) && c.email && c.ativo
      );
      if (managers.length === 0) {
        setManagersMsg('Nenhum gestor cadastrado com e-mail encontrado.');
        setSendingManagers(false);
        return;
      }
      const subject = `${tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — ${periodoLabel}`;
      const body = buildEmailBody();
      await Promise.all(managers.map(m =>
        base44.integrations.Core.SendEmail({ to: m.email, subject, body })
      ));
      setManagersMsg(`Enviado para ${managers.length} gestor(es)!`);
      setTimeout(() => setManagersMsg(''), 6000);
    } catch (e) {
      setManagersMsg('Erro: ' + (e.message || 'desconhecido'));
    }
    setSendingManagers(false);
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

          {/* Email section */}
          <div className="mt-4 p-4 bg-muted/30 rounded-xl no-print">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Enviar por e-mail</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                placeholder="destinatario@exemplo.com"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                className="h-9 flex-1 min-w-[200px] px-3 rounded-xl border border-input bg-transparent text-sm"
              />
              <Button onClick={sendEmail} disabled={sendingEmail || !emailTo} className="h-9 rounded-xl">
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar
              </Button>
              <Button onClick={sendToManagers} disabled={sendingManagers} variant="default" className="h-9 rounded-xl">
                {sendingManagers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar para gestores
              </Button>
            </div>
            {emailMsg && (
              <p className={`mt-2 text-xs ${emailMsg.includes('Erro') ? 'text-destructive' : 'text-primary'}`}>{emailMsg}</p>
            )}
            {managersMsg && (
              <p className={`mt-2 text-xs ${managersMsg.includes('Erro') ? 'text-destructive' : 'text-primary'}`}>{managersMsg}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}