import { useState, useEffect } from 'react';
import { Clock, Users, Download, Loader2, Filter, Calendar, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskNome } from '@/lib/lgpd-utils.js';
import { triggerDownload } from '@/lib/export-utils';

export default function ResumoTurnos() {
  const { colaborador } = useProfarmaAuth();
  const [logs, setLogs] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState(['validado', 'bloqueado', 'pendente_revisao']);
  const [filterOp, setFilterOp] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.AccessLog.subscribe(() => loadLogs());
    return unsub;
  }, []);

  const loadLogs = async () => {
    try {
      const allLogs = await base44.entities.AccessLog.list('-created_date', 1000);
      setLogs(allLogs);
      updateOperadores(allLogs);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const updateOperadores = (allLogs) => {
    const byOp = {};
    allLogs.forEach(l => {
      const nome = l.operador_nome || 'Desconhecido';
      if (!byOp[nome]) byOp[nome] = { nome, total: 0, validados: 0, bloqueados: 0, pendentes: 0 };
      byOp[nome].total++;
      if (l.status === 'validado') byOp[nome].validados++;
      if (l.status === 'bloqueado') byOp[nome].bloqueados++;
      if (l.status === 'pendente_revisao') byOp[nome].pendentes++;
    });
    setOperadores(Object.values(byOp).sort((a, b) => b.total - a.total));
  };

  // Filter by date range
  const dateFiltered = logs.filter(l => {
    if (dateFrom && new Date(l.created_date) < new Date(dateFrom + 'T00:00:00')) return false;
    if (dateTo && new Date(l.created_date) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const filteredLogs = dateFiltered.filter(l => filterStatus.includes(l.status));
  const filteredOps = filterOp === 'all' ? operadores : operadores.filter(o => o.nome === filterOp);

  // Recalculate operator stats for date-filtered logs
  const dateOpStats = {};
  dateFiltered.forEach(l => {
    const nome = l.operador_nome || 'Desconhecido';
    if (!dateOpStats[nome]) dateOpStats[nome] = { nome, total: 0, validados: 0, bloqueados: 0, pendentes: 0 };
    dateOpStats[nome].total++;
    if (l.status === 'validado') dateOpStats[nome].validados++;
    if (l.status === 'bloqueado') dateOpStats[nome].bloqueados++;
    if (l.status === 'pendente_revisao') dateOpStats[nome].pendentes++;
  });
  const dateFilteredOps = Object.values(dateOpStats).sort((a, b) => b.total - a.total);
  const displayOps = filterOp === 'all' ? dateFilteredOps : dateFilteredOps.filter(o => o.nome === filterOp);

  const exportCSV = () => {
    const headers = ['Operador', 'Total', 'Validados', 'Bloqueados', 'Pendentes'];
    const rows = displayOps.map(o => [o.nome, o.total, o.validados, o.bloqueados, o.pendentes]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `resumo_turnos_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14); doc.setTextColor(0, 107, 94);
      doc.text('PROFARMA - Resumo de Turnos', 14, 20);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Período: ${dateFrom || 'Início'} a ${dateTo || 'Hoje'}`, 14, 27);
      doc.text(`Total de validações: ${filteredLogs.length}`, 14, 33);
      let y = 45;
      doc.setFillColor(0, 107, 94); doc.rect(14, y - 4, 182, 6, 'F');
      doc.setFontSize(8); doc.setTextColor(255);
      doc.text('Operador', 16, y); doc.text('Total', 90, y); doc.text('Validados', 110, y); doc.text('Bloqueados', 140, y); doc.text('Pendentes', 170, y);
      doc.setTextColor(50);
      y += 6;
      displayOps.forEach((op, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(14, y - 4, 182, 6, 'F'); }
        doc.text(maskNome(op.nome).substring(0, 35), 16, y);
        doc.text(String(op.total), 90, y);
        doc.text(String(op.validados), 110, y);
        doc.text(String(op.bloqueados), 140, y);
        doc.text(String(op.pendentes), 170, y);
        y += 6;
      });
      const pdfBlob = doc.output('blob');
      triggerDownload(pdfBlob, `resumo_turnos_${Date.now()}.pdf`);
    } catch (e) {}
    setExporting(false);
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Resumo de Turnos</h1>
          <p className="text-sm text-muted-foreground">Validações por operador e período</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportCSV} variant="secondary" className="h-12 rounded-2xl"><Download className="h-4 w-4" /> Excel</Button>
          <Button onClick={exportPDF} disabled={exporting} variant="secondary" className="h-12 rounded-2xl">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF</Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Resumo do Período</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{filteredLogs.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-primary">{filteredLogs.filter(l => l.status === 'validado').length}</p>
            <p className="text-xs text-muted-foreground">Validados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-heading text-destructive">{filteredLogs.filter(l => l.status === 'bloqueado').length}</p>
            <p className="text-xs text-muted-foreground">Bloqueados</p>
          </div>
        </div>
      </div>

      {/* Multi-filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Filtros</p></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Data inicial</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Data final</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Status</p>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'validado', l: 'Validado' }, { v: 'bloqueado', l: 'Bloqueado' }, { v: 'pendente_revisao', l: 'Pendente' }].map(s => (
              <button key={s.v} onClick={() => setFilterStatus(prev => prev.includes(s.v) ? prev.filter(x => x !== s.v) : [...prev, s.v])}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filterStatus.includes(s.v) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Operador</p>
          <select value={filterOp} onChange={e => setFilterOp(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-card text-sm">
            <option value="all">Todos</option>
            {operadores.map((o, i) => <option key={i} value={o.nome}>{maskNome(o.nome)}</option>)}
          </select>
        </div>
      </div>

      {/* Operators */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Por Operador</h3>
        {displayOps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma validação registrada no período</p>
        ) : (
          <div className="space-y-3">
            {displayOps.map((op, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {op.nome?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{maskNome(op.nome)}</p>
                    <p className="text-xs text-muted-foreground">{op.total} validações</p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs flex-wrap justify-end">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{op.validados} validados</span>
                  {op.bloqueados > 0 && <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive">{op.bloqueados} bloqueados</span>}
                  {op.pendentes > 0 && <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-600">{op.pendentes} pendentes</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}