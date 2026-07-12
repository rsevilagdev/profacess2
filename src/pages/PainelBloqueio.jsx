import { useState, useEffect } from 'react';
import { ShieldAlert, Truck, Users, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { maskPlaca, maskCPF, maskNome } from '@/lib/lgpd-utils.js';

const PAGE_SIZE = 10;

export default function PainelBloqueio() {
  const { colaborador } = useProfarmaAuth();
  const [tab, setTab] = useState('veiculos');
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Vehicle.filter({ status: 'bloqueado' }).catch(() => []),
      base44.entities.Driver.filter({ status: 'bloqueado' }).catch(() => []),
    ]).then(([v, m]) => {
      setVeiculos(v); setMotoristas(m); setLoading(false);
    });
  }, []);

  const filtered = (tab === 'veiculos' ? veiculos : motoristas).filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'veiculos') return item.placa?.toLowerCase().includes(term) || item.transportadora?.toLowerCase().includes(term);
    return item.nome?.toLowerCase().includes(term) || item.cpf?.includes(term);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Painel de Bloqueio</h1>
        <p className="text-sm text-muted-foreground">Veículos e motoristas bloqueados administrativamente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('veiculos'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${tab === 'veiculos' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Truck className="h-4 w-4 inline mr-2" /> Veículos ({veiculos.length})
        </button>
        <button onClick={() => { setTab('motoristas'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${tab === 'motoristas' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Users className="h-4 w-4 inline mr-2" /> Motoristas ({motoristas.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : pageData.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum registro bloqueado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageData.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    {tab === 'veiculos' ? <Truck className="h-5 w-5 text-destructive" /> : <Users className="h-5 w-5 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium blur-lg-text">{tab === 'veiculos' ? maskPlaca(item.placa) : maskNome(item.nome)}</p>
                    <p className="text-xs text-muted-foreground blur-lg-text">{tab === 'veiculos' ? item.transportadora || '—' : maskCPF(item.cpf)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">Bloqueado</span>
                  <p className="text-xs text-muted-foreground mt-1">{item.observacao || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}