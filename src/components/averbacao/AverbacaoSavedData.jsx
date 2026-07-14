import { useState, useEffect, useRef } from 'react';
import { Database, Loader2, Calendar, ChevronDown, Check, FileText, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import DropdownCell from './DropdownCell';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function findCol(columns, possibleNames) {
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const c of columns) {
      if (c.toUpperCase().trim() === upper) return c;
    }
  }
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const c of columns) {
      if (c.toUpperCase().trim().includes(upper)) return c;
    }
  }
  return null;
}

function parseNum(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.');
  return Number(cleaned) || 0;
}

function formatNum(val) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groupSavedByPriority(records) {
  if (records.length === 0) return records;

  const columns = Object.keys(records[0].parsedRow || {});
  const colRota = findCol(columns, ['ROTA', 'RUTA', 'ITINERÁRIO', 'ITINERARIO', 'ITINERARY', 'ITINER', 'ROUTE']);

  const groups = {};
  const groupKeys = [];

  for (const r of records) {
    const priority = String(r.prioridade || '').trim();
    const priorityNum = parseInt(priority) || 0;
    let groupKey;
    if ((priorityNum === 90 || priorityNum === 91) && colRota) {
      const rota = String(r.parsedRow?.[colRota] || '').trim();
      groupKey = `${priority}_${rota}`;
    } else {
      groupKey = priority;
    }
    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groupKeys.push({ key: groupKey, priority: priorityNum });
    }
    groups[groupKey].push(r);
  }

  groupKeys.sort((a, b) => a.priority - b.priority);

  const result = [];
  for (const gk of groupKeys) {
    const groupRecords = groups[gk.key];
    if (groupRecords.length === 1) {
      result.push(groupRecords[0]);
      continue;
    }

    const merged = { ...groupRecords[0] };
    const mergedRow = {};
    const mergedLists = {};
    let mergedCount = 0;

    for (const col of columns) {
      const isListCol = groupRecords.some(r => r.parsedLists?.[col]);

      if (isListCol) {
        const allValues = new Set();
        for (const r of groupRecords) {
          const vals = r.parsedLists?.[col] || [];
          vals.forEach(v => allValues.add(v));
        }
        const uniqueValues = [...allValues];
        mergedRow[col] = uniqueValues.length > 1
          ? `${uniqueValues[0]} +${uniqueValues.length - 1}`
          : (uniqueValues[0] || '');
        mergedLists[col] = uniqueValues;
      } else {
        let sum = 0;
        for (const r of groupRecords) {
          sum += parseNum(r.parsedRow?.[col]);
        }
        mergedRow[col] = formatNum(sum);
      }
    }

    for (const r of groupRecords) {
      mergedCount += r.parsedCount || 0;
    }

    merged.parsedRow = mergedRow;
    merged.parsedLists = mergedLists;
    merged.parsedCount = mergedCount;
    result.push(merged);
  }

  return result;
}

export default function AverbacaoSavedData({ refreshTrigger = 0 }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDias, setSelectedDias] = useState([]);
  const [diaDropdownOpen, setDiaDropdownOpen] = useState(false);
  const diaDropdownRef = useRef(null);

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!diaDropdownOpen) return;
    const handleClick = (e) => {
      if (diaDropdownRef.current && !diaDropdownRef.current.contains(e.target)) {
        setDiaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [diaDropdownOpen]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.AverbacaoRecord.list('-created_date', 2000);
      setRecords(list);
    } catch (e) {}
    setLoading(false);
  };

  const meses = [...new Set(records.map(r => r.mes).filter(Boolean))];
  const dias = (() => {
    if (!selectedMes) return [];
    const monthIdx = MESES.indexOf(selectedMes);
    if (monthIdx < 0) return [];
    const year = new Date().getFullYear();
    const count = new Date(year, monthIdx + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
  })();

  const filtered = records.filter(r =>
    (!selectedMes || r.mes === selectedMes) &&
    (selectedDias.length === 0 || selectedDias.includes(r.dia))
  );

  const parsed = filtered.map(r => {
    try {
      const data = JSON.parse(r.dados_json || '{}');
      return { ...r, parsedRow: data.row || {}, parsedLists: data.lists || {}, parsedCount: data.count || 0 };
    } catch (e) {
      return { ...r, parsedRow: {}, parsedLists: {}, parsedCount: 0 };
    }
  });

  const sortedParsed = groupSavedByPriority(parsed);
  const columns = sortedParsed.length > 0 ? Object.keys(sortedParsed[0].parsedRow) : [];

  const toggleDia = (dia) => {
    setSelectedDias(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const diaLabel = selectedDias.length === 0
    ? 'Todos os dias'
    : selectedDias.length === 1
      ? `Dia ${selectedDias[0]}`
      : `${selectedDias.length} dias selecionados`;

  const buildExportRows = () => {
    return sortedParsed.map(r => {
      const row = {};
      columns.forEach(col => {
        const cellLists = r.parsedLists[col];
        if (cellLists && cellLists.length > 1) {
          row[col] = cellLists.join(', ');
        } else {
          row[col] = r.parsedRow[col] || '';
        }
      });
      return row;
    });
  };

  const exportPDF = () => {
    if (sortedParsed.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let y = 15;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Averbação - Dados Salvos', margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const filtroStr = `${selectedMes || 'Todos os meses'}${selectedDias.length > 0 ? ' · Dias: ' + selectedDias.sort((a, b) => Number(a) - Number(b)).join(', ') : ''}`;
    doc.text(`Filtro: ${filtroStr}`, margin, y);
    y += 8;

    const colWidths = [];
    const totalTextWidth = columns.reduce((acc, col) => {
      const w = Math.max(doc.getTextWidth(col) + 6, doc.getTextWidth(String(sortedParsed[0].parsedRow[col] || '')) + 6, 30);
      colWidths.push(w);
      return acc + w;
    }, 0);
    const scale = (pageWidth - margin * 2) / totalTextWidth;
    const scaledWidths = colWidths.map(w => w * scale);

    // Header
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 6, 'F');
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    let x = margin;
    columns.forEach((col, i) => {
      doc.text(col.substring(0, Math.floor(scaledWidths[i] / 2)), x + 1, y);
      x += scaledWidths[i];
    });
    y += 6;
    doc.setFont(undefined, 'normal');

    // Rows
    const rowHeight = 5;
    const pageHeight = doc.internal.pageSize.getHeight();
    sortedParsed.forEach(r => {
      if (y > pageHeight - 10) { doc.addPage(); y = 15; }
      x = margin;
      columns.forEach((col, i) => {
        const cellLists = r.parsedLists[col];
        const val = cellLists && cellLists.length > 1
          ? `${cellLists[0]} +${cellLists.length - 1}`
          : (r.parsedRow[col] || '');
        doc.text(String(val).substring(0, Math.floor(scaledWidths[i] / 2)), x + 1, y);
        x += scaledWidths[i];
      });
      y += rowHeight;
    });

    doc.save(`averbacao_${selectedMes || 'todos'}_${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    if (sortedParsed.length === 0) return;
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Averbação');
    XLSX.writeFile(wb, `averbacao_${selectedMes || 'todos'}_${Date.now()}.xlsx`);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Dados Salvos</h3>
        </div>
        <div className="flex items-center gap-2">
          {sortedParsed.length > 0 && (
            <>
              <Button onClick={exportPDF} variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button onClick={exportExcel} variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
            </>
          )}
          <Button onClick={loadRecords} variant="ghost" size="sm" className="h-8 rounded-xl text-xs">
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Mês
          </label>
          <select
            value={selectedMes}
            onChange={e => { setSelectedMes(e.target.value); setSelectedDias([]); }}
            className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
          >
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Multi-select day filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Dia(s)</label>
          <div ref={diaDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDiaDropdownOpen(!diaDropdownOpen)}
              disabled={!selectedMes}
              className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px] flex items-center justify-between gap-2 disabled:opacity-50"
            >
              <span className="truncate">{diaLabel}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${diaDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {diaDropdownOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto min-w-[200px]">
                {dias.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1">Nenhum dia disponível</p>
                ) : (
                  dias.map(d => (
                    <label
                      key={d}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-muted transition-colors ${selectedDias.includes(d) ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selectedDias.includes(d) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {selectedDias.includes(d) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedDias.includes(d)}
                        onChange={() => toggleDia(d)}
                        className="hidden"
                      />
                      <span className="text-sm">Dia {d}</span>
                    </label>
                  ))
                )}
                {dias.length > 1 && (
                  <>
                    <div className="border-t border-border my-1" />
                    <div className="flex gap-2 px-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDias([...dias])}
                        className="flex-1 text-xs py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDias([])}
                        className="flex-1 text-xs py-1 rounded-lg bg-muted hover:bg-muted/80"
                      >
                        Limpar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {(selectedMes || selectedDias.length > 0) && (
          <Button
            variant="secondary"
            className="h-10 rounded-xl mt-auto"
            onClick={() => { setSelectedMes(''); setSelectedDias([]); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : parsed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {records.length === 0
            ? 'Nenhum dado salvo ainda. Processe um arquivo e clique em "Salvar".'
            : 'Nenhum registro encontrado para o filtro selecionado.'}
        </p>
      ) : (
        <div className="overflow-auto max-h-[500px] border border-border rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {columns.map(col => (
                  <th key={col} className="text-left px-3 py-2 border-b border-border bg-secondary font-medium text-xs whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedParsed.map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-muted/30">
                  {columns.map(col => {
                    const cellLists = r.parsedLists[col];
                    const cellValue = r.parsedRow[col];
                    return (
                      <td key={col} className="px-3 py-1.5 border-b border-border/50 whitespace-nowrap text-xs align-top">
                        {cellLists && cellLists.length > 1 ? (
                          <DropdownCell values={cellLists} displayValue={cellValue} />
                        ) : (
                          <span>{cellValue || '—'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sortedParsed.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {sortedParsed.length} registro(s) · {selectedMes || 'Todos os meses'}
          {selectedDias.length > 0 ? ` · Dias: ${selectedDias.sort((a, b) => Number(a) - Number(b)).join(', ')}` : ''}
        </p>
      )}
    </div>
  );
}