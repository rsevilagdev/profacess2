import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { triggerDownload } from '@/lib/export-utils';

/**
 * Exporta uma tabela (headers + rows) para PDF em paisagem, ajustando
 * as colunas à largura da página com quebra de linha — sem perder dados.
 */
export function exportTableToPDF({ title, subtitle, headers, rows, columnWeights, fileName }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 10;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 105, 92);
  doc.text('PROFARMA LIBERAAUTO PRO', pw / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.text(title, pw / 2, y, { align: 'center' });
  if (subtitle) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, pw / 2, y, { align: 'center' });
  }
  y += 6;

  const availWidth = pw - m * 2;
  const weights = columnWeights && columnWeights.length === headers.length
    ? columnWeights
    : headers.map(() => 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const scaledWidths = weights.map(w => (w / totalWeight) * availWidth);

  const drawHeader = () => {
    doc.setFillColor(0, 105, 92);
    doc.rect(m, y - 4, availWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    let x = m;
    headers.forEach((h, i) => {
      const lines = doc.splitTextToSize(String(h), scaledWidths[i] - 2);
      doc.text(lines, x + 1, y);
      x += scaledWidths[i];
    });
    y += 6;
  };

  drawHeader();

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const lineH = 4;
  rows.forEach((row, idx) => {
    const cellLines = headers.map((_, i) =>
      doc.splitTextToSize(String(row[i] != null ? row[i] : ''), scaledWidths[i] - 2)
    );
    const maxLines = Math.max(...cellLines.map(l => l.length), 1);
    const thisRowH = lineH * maxLines + 2;
    if (y + thisRowH > ph - 12) { doc.addPage(); y = 16; drawHeader(); }
    if (idx % 2 === 0) {
      doc.setFillColor(240, 245, 244);
      doc.rect(m, y - 4, availWidth, thisRowH, 'F');
    }
    let x = m;
    cellLines.forEach((lines, i) => {
      lines.forEach((line, li) => {
        doc.text(line, x + 1, y + li * lineH);
      });
      x += scaledWidths[i];
    });
    y += thisRowH;
  });

  const pc = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`PROFARMA LIBERAAUTO PRO — ${title} — Página ${i} de ${pc}`, pw / 2, ph - 5, { align: 'center' });
  }

  const blob = doc.output('blob');
  triggerDownload(blob, fileName);
}

export function exportTableToExcel({ headers, rows, fileName, sheetName }) {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Relatório');
  const xlsxBlob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(new Blob([xlsxBlob], { type: 'application/octet-stream' }), fileName);
}