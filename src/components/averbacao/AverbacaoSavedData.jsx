import { useState, useEffect, useRef } from 'react';
import { Database, Loader2, Calendar, ChevronDown, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import DropdownCell from './DropdownCell';

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
      const list = await base44.entities.AverbacaoRecord.list('-created_date', 500);
      setRecords(list);
    } catch (e) {}
    setLoading(false);
  };

  const meses = [...new Set(records.map(r => r.mes).filter(Boolean))];
  const dias = [...new Set(records.filter(r => r.mes === selectedMes).map(r => r.dia).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));

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

  const sortedParsed = [...parsed].sort((a, b) => {
    const pa = parseInt(a.prioridade) || 0;
    const pb = parseInt(b.prioridade) || 0;
    return pa - pb;
  });
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

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Dados Salvos</h3>
        </div>
        <Button onClick={loadRecords} variant="ghost" size="sm" className="h-8 rounded-xl text-xs">
          Atualizar
        </Button>
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