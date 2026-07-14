import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Globe, Smartphone, Download, Loader2, Filter, Calendar, ScrollText, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { triggerDownload } from '@/lib/export-utils';
import RegistrosAcesso from '@/components/auditoria/RegistrosAcesso';

const PAGE_SIZE = 10;
const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'login', label: 'Login' },
  { value: 'driver', label: 'Motoristas' },
  { value: 'vehicle', label: 'Veículos' },
  { value: 'search', label: 'Buscas' },
  { value: 'user_management', label: 'Usuários' },
  { value: 'branch', label: 'Filiais' },
  { value: 'export', label: 'Exportação' },
  { value: 'backup', label: 'Backup' },
];

export default function Auditoria() {
  const { colaborador } = useProfarmaAuth();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedCats, setSelectedCats] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mainTab, setMainTab] = useState('auditoria');

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 500).then(list => {
      setLogs(list); setLoading(false);
    });
  }, []);

  const toggleCat = (cat) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    setPage(0);
  };

  const filtered = logs.filter(l => {
    if (selectedCats.length > 0 && !selectedCats.includes(l.category)) return false;
    if (category !== 'all' && l.category !== category) return false;
    if (dateFrom && new Date(l.created_date) < new Date(dateFrom + 'T00:00:00')) return false;
    if (dateTo && new Date(l.created_date) > new Date(dateTo + 'T23:59:59')) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return l.action?.toLowerCase().includes(term) || l.user_name?.toLowerCase().includes(term) || l.details?.toLowerCase().includes(term) || l.ip_address?.includes(search) || l.domain?.includes(search);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportPDF = async () => {
    setExporting(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setTextColor(0, 107, 94);
    doc.text('PROFARMA - Logs de Auditoria', 14, 20);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Total: ${filtered.length} registros - ${new Date().toLocaleString('pt-BR')}`, 14, 27);
    let y = 40;
    filtered.slice(0, 60).forEach((log, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(7); doc.setTextColor(50);
      doc.text(`${new Date(log.created_date).toLocaleString('pt-BR')} | ${log.user_name || '—'} | ${log.action}`, 14, y);
      doc.text(`IP: ${log.ip_address || '—'} | Domínio: ${log.domain || '—'} | Cat: ${log.category}`, 14, y + 4);
      doc.text(`Detalhes: ${log.details || '—'}`, 14, y + 8);
      y += 14;
    });
    const pdfBlob = doc.output('blob');
    triggerDownload(pdfBlob, `auditoria_profarma_${Date.now()}.pdf`);
    setExporting(false);
  };

  const exportCSV = () => {
    const headers = ['Data', 'Usuário', 'CPF', 'Ação', 'Categoria', 'Detalhes', 'IP', 'Domínio'];
    const rows = filtered.map(l => [
      new Date(l.created_date).toLocaleString('pt-BR'),
      l.user_name || '—', l.user_cpf || '—', l.action || '—', l.category || '—',
      l.details || '—', l.ip_address || '—', l.domain || '—'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const csvBlob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(csvBlob, `auditoria_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Log completo de ações com IP, domínio e dispositivo</p>
        </div>
        {mainTab === 'auditoria' && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportCSV} variant="secondary" className="h-12 rounded-2xl"><Download className="h-4 w-4" /> Excel</Button>
            <Button onClick={exportPDF} disabled={exporting} className="h-12 rounded-2xl">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF</Button>
          </div>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainTab('auditoria')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${mainTab === 'auditoria' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          <ScrollText className="h-4 w-4" /> Auditoria de Sistema
        </button>
        <button
          onClick={() => setMainTab('acessos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${mainTab === 'acessos' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          <Truck className="h-4 w-4" /> Registros de Acesso/Saída
        </button>
      </div>

      {mainTab === 'acessos' ? (
        <RegistrosAcesso />
      ) : (
        <>
      {/* Search + Quick category */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por ação, usuário, IP, domínio..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="h-12 px-4 rounded-2xl border border-input bg-card text-sm">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Multi-filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Filtros Avançados</p></div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Categorias (multi-seleção)</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.filter(c => c.value !== 'all').map(c => (
              <button key={c.value} onClick={() => toggleCat(c.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${selectedCats.includes(c.value) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Data inicial</p>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Data final</p>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : pageData.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhum log encontrado</p></div>
        ) : (
          <div className="space-y-2">
            {pageData.map(log => (
              <div key={log.id} className="p-3 rounded-xl hover:bg-muted/50 border border-border/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{log.category}</span>
                      <p className="text-sm font-medium truncate">{log.action}</p>
                    </div>
                    {log.details && <p className="text-xs text-muted-foreground truncate">{log.details}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{log.user_name || '—'}</span>
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {log.domain || '—'}</span>
                      <span>IP: {log.ip_address || '—'}</span>
                      <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> {log.device_info?.substring(0, 40) || '—'}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{new Date(log.created_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} · {total} registros</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}