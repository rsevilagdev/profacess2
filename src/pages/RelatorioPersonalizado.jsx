import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, Download, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const ALL_COLUMNS = {
  veiculo_placa: 'Placa do Veículo',
  motorista_nome: 'Nome do Motorista',
  motorista_cpf: 'CPF do Motorista',
  ajudante_nome: 'Nome do Ajudante',
  ajudante_cpf: 'CPF do Ajudante',
  filial_nome: 'Filial',
  tipo: 'Tipo',
  status: 'Status',
  carregado: 'Carregado',
  operador_nome: 'Operador',
  created_date: 'Data/Hora',
  observacao: 'Observação',
};

const ALL_STATUSES = ['validado', 'bloqueado', 'pendente_revisao'];

export default function RelatorioPersonalizado() {
  const { colaborador } = useProfarmaAuth();
  const [logs, setLogs] = useState([]);
  const [selectedCols, setSelectedCols] = useState(Object.keys(ALL_COLUMNS));
  const [selectedStatuses, setSelectedStatuses] = useState(ALL_STATUSES);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => { base44.entities.AccessLog.list('-created_date', 500).then(setLogs); }, []);

  const toggleCol = (col) => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleStatus = (s) => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filtered = logs.filter(l => selectedStatuses.includes(l.status));

  const exportPDF = async () => {
    setExporting(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(60); doc.setTextColor(200, 200, 200);
    doc.text('CONFIDENCIAL PROFARMA', 105, 148, { angle: 45, align: 'center' });

    doc.setFontSize(16); doc.setTextColor(0, 107, 94);
    doc.text('PROFARMA LIBERAAUTO PRO', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Relatório Personalizado - ${new Date().toLocaleString('pt-BR')}`, 14, 27);
    doc.text(`Total de registros: ${filtered.length}`, 14, 33);

    doc.setFontSize(8); doc.setTextColor(255);
    let x = 14, y = 45;
    doc.setFillColor(0, 107, 94);
    doc.rect(x, y - 4, 182, 6, 'F');
    selectedCols.forEach(col => { doc.text(ALL_COLUMNS[col].substring(0, 18), x, y); x += 182 / selectedCols.length; });

    doc.setTextColor(50);
    let rowY = y + 5;
    filtered.slice(0, 80).forEach((log, idx) => {
      if (rowY > 270) { doc.addPage(); rowY = 20; }
      if (idx % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(14, rowY - 4, 182, 6, 'F'); }
      x = 14;
      selectedCols.forEach(col => {
        let val = log[col] || '—';
        if (col === 'created_date') val = new Date(val).toLocaleString('pt-BR');
        doc.text(String(val).substring(0, 18), x, rowY);
        x += 182 / selectedCols.length;
      });
      rowY += 6;
    });

    doc.save(`relatorio_profarma_${Date.now()}.pdf`);
    setExporting(false); setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const exportExcel = async () => {
    setExporting(true);
    const headers = selectedCols.map(c => ALL_COLUMNS[c]);
    const rows = filtered.map(log => selectedCols.map(col => {
      let val = log[col] || '';
      if (col === 'created_date') val = new Date(val).toLocaleString('pt-BR');
      return `"${String(val).replace(/"/g, '""')}"`;
    }));
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio_profarma_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setExporting(false); setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Relatório Personalizado</h1>
        <p className="text-sm text-muted-foreground">Selecione colunas e status para exportar — dados completos visíveis</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Colunas a Exportar</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(ALL_COLUMNS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-muted">
              <button onClick={() => toggleCol(key)} className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${selectedCols.includes(key) ? 'bg-primary border-primary' : 'border-input'}`}>
                {selectedCols.includes(key) && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Status a Exportar</h3>
        <div className="flex gap-2">
          {ALL_STATUSES.map(s => (
            <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-muted">
              <button onClick={() => toggleStatus(s)} className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${selectedStatuses.includes(s) ? 'bg-primary border-primary' : 'border-input'}`}>
                {selectedStatuses.includes(s) && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <span className="text-sm capitalize">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Pré-visualização ({filtered.length} registros)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {selectedCols.map(c => <th key={c} className="text-left py-2 px-2 font-medium text-muted-foreground">{ALL_COLUMNS[c]}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 5).map((log, i) => (
                <tr key={log.id || i} className="border-b border-border/50">
                  {selectedCols.map(col => {
                    let val = log[col] || '—';
                    if (col === 'created_date') val = new Date(val).toLocaleString('pt-BR');
                    return <td key={col} className="py-2 px-2">{String(val)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 5 && <p className="text-xs text-muted-foreground mt-2">+ {filtered.length - 5} registros adicionais...</p>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={exportPDF} disabled={exporting || selectedCols.length === 0} className="flex-1 h-14 rounded-2xl">
          {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : exported ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          {exported ? 'Exportado!' : 'Exportar PDF'}
        </Button>
        <Button onClick={exportExcel} disabled={exporting || selectedCols.length === 0} variant="secondary" className="flex-1 h-14 rounded-2xl">
          {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : exported ? <Check className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
          {exported ? 'Exportado!' : 'Exportar Excel'}
        </Button>
      </div>
    </div>
  );
}