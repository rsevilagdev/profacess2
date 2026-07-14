import { useState, useEffect } from 'react';
import { Loader2, FileText, FileSpreadsheet, Mail, Calendar, Database } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AverbacaoReport({ tipo, periodo }) {
  // tipo: 'mensal' | 'semestral'
  // periodo: selected month name (mensal) or semester number 1|2 (semestral)
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

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
      // Deduplicate by prioridade + dados_json content
      const seen = new Set();
      const deduped = [];
      for (const r of filtered) {
        const key = `${r.prioridade}_${r.dados_json}`;
        if (!seen.has(key)) { seen.add(key); deduped.push(r); }
      }
      deduped.sort((a, b) => (parseInt(a.prioridade) || 0) - (parseInt(b.prioridade) || 0));
      setRecords(deduped);
    } catch (e) {}
    setLoading(false);
  };

  const parsed = records.map(r => {
    try {
      const data = JSON.parse(r.dados_json || '{}');
      return { ...r, row: data.row || {}, lists: data.lists || {}, count: data.count || 0 };
    } catch (e) {
      return { ...r, row: {}, lists: {}, count: 0 };
    }
  });

  const columns = parsed.length > 0 ? Object.keys(parsed[0].row) : [];
  const totalGeral = records.reduce((acc, r) => acc + (r.total_geral || 0), 0);

  const periodoLabel = tipo === 'mensal' ? periodo : `Semestre ${periodo}º`;

  const buildExportRows = () => {
    return parsed.map(r => {
      const row = {};
      columns.forEach(col => {
        const cellLists = r.lists[col];
        if (cellLists && cellLists.length > 1) {
          row[col] = cellLists.join(', ');
        } else {
          row[col] = r.row[col] || '';
        }
      });
      return row;
    });
  };

  const exportPDF = () => {
    if (parsed.length === 0) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 12;
      let y = 16;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA LIBERAAUTO PRO', pw / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const title = tipo === 'mensal' ? `Averbação Mensal — ${periodoLabel}` : `Averbação Semestral — ${periodoLabel}`;
      doc.text(title, pw / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pw / 2, y, { align: 'center' });
      y += 8;

      // Table
      const availWidth = pw - m * 2;
      const colCount = columns.length;
      const colWidth = availWidth / colCount;

      // Header row
      doc.setFillColor(0, 105, 92);
      doc.rect(m, y - 4, availWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      let x = m;
      columns.forEach(col => {
        const label = String(col).substring(0, Math.floor(colWidth / 1.8));
        doc.text(label, x + 1, y);
        x += colWidth;
      });
      y += 6;

      // Data rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const rowH = 5;
      parsed.forEach((r, idx) => {
        if (y > ph - 20) { doc.addPage(); y = 16; }
        if (idx % 2 === 0) {
          doc.setFillColor(240, 245, 244);
          doc.rect(m, y - 4, availWidth, rowH, 'F');
        }
        x = m;
        columns.forEach(col => {
          const cellLists = r.lists[col];
          const val = cellLists && cellLists.length > 1
            ? `${cellLists[0]} +${cellLists.length - 1}`
            : (r.row[col] || '');
          doc.text(String(val).substring(0, Math.floor(colWidth / 1.8)), x + 1, y);
          x += colWidth;
        });
        y += rowH;
      });

      // Total
      if (y > ph - 15) { doc.addPage(); y = 16; }
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 105, 92);
      doc.text(`Total Geral: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, m, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${parsed.length} grupo(s) de prioridade`, m, y);

      // Footer pagination
      const pc = doc.internal.getNumberOfPages();
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
    if (parsed.length === 0) return;
    setExportingExcel(true);
    try {
      const rows = buildExportRows();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Averbação');
      XLSX.writeFile(wb, `averbacao_${tipo}_${periodoLabel.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {}
    setExportingExcel(false);
  };

  const sendEmail = async () => {
    if (parsed.length === 0 || !emailTo) return;
    setSendingEmail(true);
    setEmailMsg('');
    try {
      const rows = buildExportRows();
      const htmlTable = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:11px;font-family:Arial">
        <thead><tr>${columns.map(c => `<th style="background:#00695C;color:#fff">${c}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${r[c] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
      const body = `
        <h2 style="color:#00695C">PROFARMA LIBERAAUTO PRO</h2>
        <h3>${tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — ${periodoLabel}</h3>
        <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Total Geral:</strong> R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p><strong>Grupos:</strong> ${parsed.length}</p>
        ${htmlTable}
      `;
      await base44.integrations.Core.SendEmail({
        to: emailTo,
        subject: `${tipo === 'mensal' ? 'Averbação Mensal' : 'Averbação Semestral'} — ${periodoLabel}`,
        body,
      });
      setEmailMsg('E-mail enviado com sucesso!');
      setTimeout(() => setEmailMsg(''), 5000);
    } catch (e) {
      setEmailMsg('Erro ao enviar: ' + (e.message || 'desconhecido'));
    }
    setSendingEmail(false);
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
        {parsed.length > 0 && (
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
      ) : parsed.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado para o período selecionado</p>
      ) : (
        <>
          <div className="overflow-auto max-h-[600px] border border-border rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="border border-black px-2 py-1.5 bg-primary text-primary-foreground font-medium text-left whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, idx) => (
                  <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                    {columns.map(col => {
                      const cellLists = r.lists[col];
                      const cellValue = r.row[col];
                      return (
                        <td key={col} className="border border-black px-2 py-1 whitespace-nowrap">
                          {cellLists && cellLists.length > 1
                            ? <span>{cellLists[0]} <span className="text-primary font-medium">+{cellLists.length - 1}</span></span>
                            : <span>{cellValue || '—'}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm">
              <span className="font-bold text-primary">Total Geral: </span>
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-muted-foreground ml-3">{parsed.length} grupo(s)</span>
            </div>
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
            </div>
            {emailMsg && (
              <p className={`mt-2 text-xs ${emailMsg.includes('Erro') ? 'text-destructive' : 'text-primary'}`}>{emailMsg}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}