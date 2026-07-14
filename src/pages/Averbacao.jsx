import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Download, Calendar, CalendarRange, ChevronDown, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('pt-BR');
}

export default function Averbacao() {
  const { colaborador } = useProfarmaAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [view, setView] = useState('mensal');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('processarAverbacao', { file_url });
      const result = response.data || response;
      if (result.error) throw new Error(result.error);

      setData(result);
      setSelectedMonth(result.available_months?.[0] ?? null);
      setSelectedSemester(result.available_semesters?.[0] ?? null);
      setView('mensal');
    } catch (e) {}
    setLoading(false);
  };

  const resetFile = () => {
    setData(null);
    setSelectedMonth(null);
    setSelectedSemester(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const filteredRecords = () => {
    if (!data?.records) return [];
    return data.records.filter(r => {
      const date = new Date(r.data_embarque);
      if (isNaN(date)) return false;
      if (view === 'mensal') {
        return date.getMonth() === selectedMonth;
      } else {
        const sem = date.getMonth() < 6 ? 1 : 2;
        return sem === selectedSemester;
      }
    });
  };

  // Group by day (monthly) or by month (semester)
  const grouped = () => {
    const records = filteredRecords();
    const groups = {};
    records.forEach(r => {
      const date = new Date(r.data_embarque);
      const key = view === 'mensal' ? date.toDateString() : String(date.getMonth());
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (view === 'mensal') return new Date(a) - new Date(b);
      return Number(a) - Number(b);
    });
  };

  const periodTotal = filteredRecords().reduce((s, r) => s + (r.valor || 0), 0);
  const periodLabel = view === 'mensal'
    ? (selectedMonth !== null ? MESES[selectedMonth] : '')
    : (selectedSemester === 1 ? '1º Semestre (Jan - Jun)' : '2º Semestre (Jul - Dez)');

  const exportCSV = () => {
    const groups = grouped();
    const headers = ['Data do Embarque', 'Placa Veículo', 'Itinerário', 'UF Origem', 'UF Destino', 'Urbano', 'Valor de mercadoria'];
    const lines = [headers.join(';')];

    groups.forEach(([key, dayRecords]) => {
      const groupLabel = view === 'mensal'
        ? formatDate(dayRecords[0].data_embarque)
        : MESES[Number(key)];
      lines.push(`;;${groupLabel};;;`);
      dayRecords.sort((a, b) => a.itinerario - b.itinerario).forEach(r => {
        lines.push([
          formatDate(r.data_embarque),
          r.placa,
          r.itinerario_formatado,
          r.uf_origem,
          r.uf_destino,
          r.urbano,
          (r.valor || 0).toFixed(2).replace('.', ',')
        ].join(';'));
      });
      const groupTotal = dayRecords.reduce((s, r) => s + (r.valor || 0), 0);
      lines.push(`;;Subtotal ${groupLabel};;;;${groupTotal.toFixed(2).replace('.', ',')}`);
      lines.push('');
    });

    lines.push(`;;Total ${periodLabel};;;;${periodTotal.toFixed(2).replace('.', ',')}`);

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Averbacao_${periodLabel.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload screen
  if (!data) {
    return (
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="brand-title text-2xl">Averbação</h1>
          <p className="text-sm text-muted-foreground">Importe a planilha de averbação para visualizar por mês e semestre</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <label className="flex flex-col items-center justify-center gap-3 h-48 border-2 border-dashed border-input rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Processando planilha...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Selecione a planilha de averbação (.xlsx)</span>
                <span className="text-xs text-muted-foreground/70">Clique para selecionar o arquivo</span>
              </>
            )}
            <input type="file" accept=".xlsx,.xls" ref={fileRef} onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  const groups = grouped();
  const availableMonths = data.available_months || [];
  const availableSemesters = data.available_semesters || [];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Averbação</h1>
          <p className="text-sm text-muted-foreground">{data.total} registros processados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetFile} variant="secondary" className="h-12 rounded-2xl">
            <RefreshCw className="h-5 w-5" /> Trocar Arquivo
          </Button>
          <Button onClick={exportCSV} className="h-12 rounded-2xl">
            <Download className="h-5 w-5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('mensal')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors flex items-center gap-2 ${view === 'mensal' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}
        >
          <Calendar className="h-4 w-4" /> Mensal
        </button>
        <button
          onClick={() => setView('semestral')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors flex items-center gap-2 ${view === 'semestral' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}
        >
          <CalendarRange className="h-4 w-4" /> Semestral
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {view === 'mensal' ? (
          availableMonths.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedMonth === m ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
            >
              {MESES[m]}
            </button>
          ))
        ) : (
          availableSemesters.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSemester(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedSemester === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
            >
              {s}º Semestre
            </button>
          ))
        )}
      </div>

      {/* Report Header */}
      <div className="bg-[#7a95a9] text-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 text-center font-medium text-sm">
          Razão Social Segurado : PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA
        </div>
        <div className="bg-[#a6bac9] text-[#202020] px-5 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div><span className="font-medium">Cnpj Segurado:</span> {data.metadata.cnpj}</div>
          <div><span className="font-medium">Mês:</span> {periodLabel}</div>
          <div><span className="font-medium">Filial:</span> {data.metadata.filial}</div>
          <div className="text-right font-medium">{formatCurrency(periodTotal)}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#7a95a9] text-white">
                <th className="px-3 py-2 text-left font-medium">Data do Embarque</th>
                <th className="px-3 py-2 text-left font-medium">Placa Veículo</th>
                <th className="px-3 py-2 text-center font-medium">Itinerário</th>
                <th className="px-3 py-2 text-center font-medium">UF Origem</th>
                <th className="px-3 py-2 text-center font-medium">UF Destino</th>
                <th className="px-3 py-2 text-center font-medium">Urbano</th>
                <th className="px-3 py-2 text-right font-medium">Valor de mercadoria</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado para o período selecionado</td>
                </tr>
              ) : (
                groups.map(([key, dayRecords]) => {
                  const groupLabel = view === 'mensal'
                    ? formatDate(dayRecords[0].data_embarque)
                    : MESES[Number(key)];
                  const groupTotal = dayRecords.reduce((s, r) => s + (r.valor || 0), 0);
                  const sorted = [...dayRecords].sort((a, b) => a.itinerario - b.itinerario);
                  return (
                    <FragmentGroup key={key} label={groupLabel} records={sorted} total={groupTotal} isMonth={view === 'semestral'} />
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#a6bac9] text-[#202020] font-bold">
                <td colSpan={6} className="px-3 py-2 text-right">Total {periodLabel}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(periodTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentGroup({ label, records, total, isMonth }) {
  return (
    <>
      <tr className="bg-muted/50">
        <td colSpan={7} className="px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {isMonth ? 'Mês' : 'Dia'}: {label}
        </td>
      </tr>
      {records.map((r, idx) => (
        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
          <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(r.data_embarque)}</td>
          <td className="px-3 py-1.5">{r.placa || '—'}</td>
          <td className="px-3 py-1.5 text-center">{r.itinerario_formatado}</td>
          <td className="px-3 py-1.5 text-center">{r.uf_origem || '—'}</td>
          <td className="px-3 py-1.5 text-center">{r.uf_destino || '—'}</td>
          <td className="px-3 py-1.5 text-center">{r.urbano || '—'}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(r.valor)}</td>
        </tr>
      ))}
      <tr className="bg-primary/5 font-medium">
        <td colSpan={6} className="px-3 py-1.5 text-right text-xs">Subtotal {label}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-primary">{formatCurrency(total)}</td>
      </tr>
    </>
  );
}