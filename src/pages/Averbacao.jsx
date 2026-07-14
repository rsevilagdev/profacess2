import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Download, Calendar, CalendarRange, RefreshCw, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import AverbacaoBlocks from '@/components/averbacao/AverbacaoBlocks';

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
  const [sendingSheets, setSendingSheets] = useState(false);
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
      // Envio automático para Google Sheets se configurado
      const spreadsheetId = localStorage.getItem('google_sheets_id');
      if (spreadsheetId && result.available_months?.length > 0) {
        const month = result.available_months[0];
        const monthRecords = result.records.filter(r => {
          const d = new Date(r.data_embarque);
          return !isNaN(d) && d.getMonth() === month;
        });
        try {
          await base44.functions.invoke('enviarAverbacaoParaSheets', {
            spreadsheet_id: spreadsheetId,
            records: monthRecords,
            view: 'mensal',
            period_label: MESES[month],
            metadata: result.metadata
          });
        } catch (e) {}
      }
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

  const periodTotal = filteredRecords().reduce((s, r) => s + (r.valor || 0), 0);
  const periodLabel = view === 'mensal'
    ? (selectedMonth !== null ? MESES[selectedMonth] : '')
    : (selectedSemester === 1 ? '1º Semestre (Jan - Jun)' : '2º Semestre (Jul - Dez)');

  const enviarParaSheets = async () => {
    const spreadsheetId = localStorage.getItem('google_sheets_id');
    if (!spreadsheetId) {
      alert('Configure o ID da planilha do Google Sheets nas Configurações > Integrações.');
      return;
    }
    const records = filteredRecords();
    if (records.length === 0) return;
    setSendingSheets(true);
    try {
      const response = await base44.functions.invoke('enviarAverbacaoParaSheets', {
        spreadsheet_id: spreadsheetId,
        records,
        view,
        period_label: periodLabel,
        metadata: data.metadata
      });
      const result = response.data || response;
      if (result.error) throw new Error(result.error);
    } catch (e) {
      alert('Erro ao enviar para Google Sheets. Verifique se a conta Google está conectada em Configurações > Integrações.');
    }
    setSendingSheets(false);
  };

  const exportCSV = () => {
    const records = filteredRecords();
    const lines = ['Data;Prioridade;Rota;Valor'];

    // Group by day
    const groups = {};
    records.forEach(r => {
      const date = new Date(r.data_embarque);
      if (isNaN(date)) return;
      const key = date.toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    Object.keys(groups).sort((a, b) => new Date(a) - new Date(b)).forEach(key => {
      const dayRecords = groups[key];
      const dayLabel = formatDate(dayRecords[0].data_embarque);
      lines.push(`DIA: ${dayLabel};;;`);

      // Block 1: 1-89
      const b1 = dayRecords.filter(r => (r.prioridade || 0) < 90);
      const b1g = {};
      b1.forEach(r => { const p = r.prioridade || 0; b1g[p] = (b1g[p] || 0) + (r.valor || 0); });
      if (Object.keys(b1g).length > 0) {
        lines.push(`;Prioridades 1 a 89;;`);
        Object.keys(b1g).sort((a, b) => Number(a) - Number(b)).forEach(p => {
          lines.push(`;Prioridade ${p};;${b1g[p].toFixed(2).replace('.', ',')}`);
        });
      }

      // Block 2: 90-91
      const b2 = dayRecords.filter(r => r.prioridade === 90 || r.prioridade === 91);
      const b2g = {};
      b2.forEach(r => { const k = `${r.prioridade}|${r.rota || 0}`; if (!b2g[k]) b2g[k] = { prioridade: r.prioridade, rota: r.rota || 0, total: 0 }; b2g[k].total += r.valor || 0; });
      if (Object.keys(b2g).length > 0) {
        lines.push(`;Prioridades 90 e 91 (por Rota);;`);
        Object.keys(b2g).sort((a, b) => { const [pa, ra] = a.split('|').map(Number); const [pb, rb] = b.split('|').map(Number); return pa !== pb ? pa - pb : ra - rb; }).forEach(k => {
          const g = b2g[k];
          lines.push(`;${g.prioridade} - ${g.rota};;${g.total.toFixed(2).replace('.', ',')}`);
        });
      }

      // Block 3: >91
      const b3 = dayRecords.filter(r => (r.prioridade || 0) > 91);
      const b3g = {};
      b3.forEach(r => { const p = r.prioridade || 0; b3g[p] = (b3g[p] || 0) + (r.valor || 0); });
      if (Object.keys(b3g).length > 0) {
        lines.push(`;Prioridades acima de 91;;`);
        Object.keys(b3g).sort((a, b) => Number(a) - Number(b)).forEach(p => {
          lines.push(`;Prioridade ${p};;${b3g[p].toFixed(2).replace('.', ',')}`);
        });
      }

      const dayTotal = dayRecords.reduce((s, r) => s + (r.valor || 0), 0);
      lines.push(`Total ${dayLabel};;${dayTotal.toFixed(2).replace('.', ',')}`);
      lines.push('');
    });

    lines.push(`Total ${periodLabel};;${periodTotal.toFixed(2).replace('.', ',')}`);

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
                <span className="text-sm text-muted-foreground">Processando arquivo...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Selecione o arquivo de averbação (.txt ou .xlsx)</span>
                <span className="text-xs text-muted-foreground/70">Serão eliminados duplicados por NumNf e ordenados por data</span>
              </>
            )}
            <input type="file" accept=".txt,.csv,.xlsx,.xls" ref={fileRef} onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  const availableMonths = data.available_months || [];
  const availableSemesters = data.available_semesters || [];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Averbação</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} registros processados
            {data.duplicates_removed > 0 && <span className="text-orange-600"> · {data.duplicates_removed} duplicados removidos</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetFile} variant="secondary" className="h-12 rounded-2xl">
            <RefreshCw className="h-5 w-5" /> Trocar Arquivo
          </Button>
          <Button onClick={enviarParaSheets} disabled={sendingSheets} variant="secondary" className="h-12 rounded-2xl">
            {sendingSheets ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Enviar para Sheets
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

      {/* Hierarchical Blocks */}
      <AverbacaoBlocks records={filteredRecords()} view={view} />
    </div>
  );
}