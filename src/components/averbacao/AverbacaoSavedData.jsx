import { useState, useEffect } from 'react';
import { Database, Loader2, Search, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import DropdownCell from './DropdownCell';

export default function AverbacaoSavedData({ refreshTrigger = 0 }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDia, setSelectedDia] = useState('');

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

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
    (!selectedDia || r.dia === selectedDia)
  );

  const parsed = filtered.map(r => {
    try {
      const data = JSON.parse(r.dados_json || '{}');
      return { ...r, parsedRow: data.row || {}, parsedLists: data.lists || {}, parsedCount: data.count || 0 };
    } catch {
      return { ...r, parsedRow: {}, parsedLists: {}, parsedCount: 0 };
    }
  });

  const columns = parsed.length > 0 ? Object.keys(parsed[0].parsedRow) : [];

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

      {/* Search / Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Mês
          </label>
          <select
            value={selectedMes}
            onChange={e => { setSelectedMes(e.target.value); setSelectedDia(''); }}
            className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
          >
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Dia</label>
          <select
            value={selectedDia}
            onChange={e => setSelectedDia(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
            disabled={!selectedMes}
          >
            <option value="">Todos os dias</option>
            {dias.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {(selectedMes || selectedDia) && (
          <Button
            variant="secondary"
            className="h-10 rounded-xl mt-auto"
            onClick={() => { setSelectedMes(''); setSelectedDia(''); }}
          >
            Limpar
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
              {parsed.map((r, idx) => (
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

      {parsed.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {parsed.length} registro(s) · {selectedMes || 'Todos os meses'}{selectedDia ? ` · Dia ${selectedDia}` : ''}
        </p>
      )}
    </div>
  );
}