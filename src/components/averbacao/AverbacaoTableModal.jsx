import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { X, CheckCircle, RotateCcw, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROW_HEIGHT = 32;
const BUFFER = 8;

export default function AverbacaoTableModal({ fileData, onClose, onProcess, onRestore }) {
  const [selectedColumns, setSelectedColumns] = useState([...fileData.visibleColumns]);
  const [showSelector, setShowSelector] = useState(!fileData.processed);
  const [processing, setProcessing] = useState(false);

  // Virtual scroll
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);
  const scrollRef = useRef(null);
  const rafRef = useRef(null);

  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    setViewportHeight(scrollRef.current.clientHeight);
    const ro = new ResizeObserver(() => {
      if (scrollRef.current) setViewportHeight(scrollRef.current.clientHeight);
    });
    ro.observe(scrollRef.current);
    return () => { ro.disconnect(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
      rafRef.current = null;
    });
  }, []);

  const toggleColumn = (col) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleProcess = () => {
    setProcessing(true);
    setTimeout(() => {
      onProcess(selectedColumns);
      setShowSelector(false);
      setProcessing(false);
    }, 300);
  };

  const handleRestore = () => {
    onRestore();
    setSelectedColumns([...fileData.headers]);
    setShowSelector(true);
  };

  const displayColumns = fileData.processed ? fileData.visibleColumns : fileData.headers;
  const rows = fileData.processed && fileData.processedRows ? fileData.processedRows : fileData.rows;
  const totalRows = rows.length;
  const totalHeight = totalRows * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + BUFFER * 2;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  const visibleRows = rows.slice(startIndex, endIndex);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, totalHeight - endIndex * ROW_HEIGHT);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-heading font-bold text-lg truncate">{fileData.fileName}</h2>
            {fileData.processed && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">Processado</span>
            )}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Column selector */}
        {showSelector && (
          <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Selecione as colunas que deseja manter</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {fileData.headers.map(col => (
                <label key={col} className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${selectedColumns.includes(col) ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:bg-accent'}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={() => toggleColumn(col)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Table with virtual scroll */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto p-3">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {displayColumns.map(col => (
                  <th key={col} className="text-left px-3 py-2 border-b border-border bg-secondary font-medium text-xs whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topSpacer > 0 && (
                <tr><td colSpan={displayColumns.length} style={{ height: topSpacer, padding: 0, border: 'none' }} /></tr>
              )}
              {visibleRows.map((row, i) => (
                <tr key={startIndex + i} className="hover:bg-muted/30" style={{ height: ROW_HEIGHT }}>
                  {displayColumns.map(col => (
                    <td key={col} className="px-3 py-1.5 border-b border-border/50 whitespace-nowrap text-xs">
                      {row[col] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {bottomSpacer > 0 && (
                <tr><td colSpan={displayColumns.length} style={{ height: bottomSpacer, padding: 0, border: 'none' }} /></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            {displayColumns.length} colunas · {totalRows} registros
            {fileData.processed && <span className="text-primary font-medium"> · agrupado por prioridade</span>}
          </span>
          <div className="flex gap-2">
            {fileData.processed ? (
              <Button onClick={handleRestore} variant="secondary" className="h-10 rounded-xl">
                <RotateCcw className="h-4 w-4" /> Restaurar
              </Button>
            ) : (
              <Button onClick={handleProcess} disabled={selectedColumns.length === 0 || processing} className="h-10 rounded-xl">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Processar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}