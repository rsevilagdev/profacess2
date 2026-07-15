import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Globe, Smartphone, Download, Loader2, Calendar, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 15;
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

export default function AuditoriaSistema() {
  const { colaborador } = useProfarmaAuth();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 1000).then(list => {
      setLogs(list);
      const uniqueUsers = [...new Set(list.map(l => l.user_name).filter(Boolean))];
      setUsers(uniqueUsers);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter(l => {
    if (category !== 'all' && l.category !== category) return false;
    if (userFilter !== 'all' && l.user_name !== userFilter) return false;
    if (dateFrom && new Date(l.created_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.created_date) > new Date(dateTo + 'T23:59:59')) return false;
    if (!search) return true;
    const t = search.toLowerCase();
    return l.action?.toLowerCase().includes(t) || l.user_name?.toLowerCase().includes(t) || l.details?.toLowerCase().includes(t) || l.ip_address?.includes(search) || l.domain?.includes(search);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const clearFilters = () => { setSearch(''); setCategory('all'); setUserFilter('all'); setDateFrom(''); setDateTo(''); setPage(0); };

  const exportCSV = async () => {
    setExporting(true);
    const headers = ['Data/Hora', 'Usuário', 'CPF', 'Ação', 'Categoria', 'Detalhes', 'IP', 'Domínio', 'Dispositivo'];
    const rows = filtered.map(l => [
      new Date(l.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), l.user_name || '', l.user_cpf || '', l.action || '',
      l.category || '', l.details || '', l.ip_address || '', l.domain || '', l.device_info || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `auditoria_sistema_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
      user_cpf: colaborador.cpf, action: 'Exportação de logs de auditoria',
      details: `${filtered.length} registros exportados`, ip_address: 'local',
      domain: window.location.hostname, category: 'export', branch_id: colaborador.filial_id
    });
    setExporting(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Histórico de Auditoria</h1>
          <p className="text-sm text-muted-foreground">Todas as ações realizadas por usuários, com horários e detalhes</p>
        </div>
        <Button onClick={exportCSV} disabled={exporting} variant="secondary" className="h-12 rounded-2xl">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total de Logs" value={logs.length} />
        <StatCard label="Filtrados" value={filtered.length} color="text-primary" />
        <StatCard label="Usuários Únicos" value={users.length} />
        <StatCard label="Categorias" value={CATEGORIES.length - 1} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4 text-primary" /> Filtros</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por ação, usuário, IP, domínio..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="h-10 px-3 rounded-xl border border-input bg-card text-sm">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(0); }} className="h-10 px-3 rounded-xl border border-input bg-card text-sm">
            <option value="all">Todos os usuários</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-card text-sm" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-card text-sm" />
          </div>
        </div>
        <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpar filtros</button>
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
                    {log.details && <p className="text-xs text-muted-foreground truncate mb-1">{log.details}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="font-medium">{log.user_name || '—'}</span>
                      {log.user_cpf && <span>CPF: {log.user_cpf}</span>}
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {log.domain || '—'}</span>
                      <span>IP: {log.ip_address || '—'}</span>
                      {log.device_info && <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> {log.device_info.substring(0, 40)}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{new Date(log.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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
    </div>
  );
}

function StatCard({ label, value, color = 'text-foreground' }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}