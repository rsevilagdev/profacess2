import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X, Car, User, Truck, Users, IdCard, Building2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCuritiba } from '@/lib/curitiba-time.js';
import { useNavigate } from 'react-router-dom';

const SEARCH_ENTITIES = [
  { key: 'veiculo_colaborador', entity: 'VeiculoColaborador', label: 'Veículos de Colaboradores', path: '/controle-veiculos-colaboradores', icon: Car,
    fields: ['placa', 'nome', 'matricula', 'cnh', 'modelo_veiculo'] },
  { key: 'vehicle', entity: 'Vehicle', label: 'Veículos (Base)', path: '/editar-base', icon: Car,
    fields: ['placa', 'transportadora', 'modelo'] },
  { key: 'driver', entity: 'Driver', label: 'Motoristas (Base)', path: '/editar-base', icon: User,
    fields: ['nome', 'cpf', 'cnh', 'transportadora'] },
  { key: 'accesslog', entity: 'AccessLog', label: 'Logs de Acesso', path: '/auditoria', icon: ArrowRight,
    fields: ['veiculo_placa', 'motorista_nome', 'motorista_cpf', 'empresa', 'ajudante_nome'] },
  { key: 'crdk', entity: 'AcessoCRDK', label: 'Acesso CRDK', path: '/acesso-crdk', icon: Truck,
    fields: ['placa_carreta', 'placa_cavalo', 'nome', 'empresa'] },
  { key: 'fornecedores', entity: 'ControleFornecedores', label: 'Fornecedores', path: '/controle-fornecedores', icon: Users,
    fields: ['transportadora', 'placa', 'motorista', 'rg_cpf'] },
  { key: 'visitantes', entity: 'ControleVisitantes', label: 'Visitantes', path: '/controle-visitantes', icon: Users,
    fields: ['nome', 'rg', 'empresa', 'placa'] },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 350);
  }, [query]);

  const doSearch = async (term) => {
    setLoading(true);
    setOpen(true);
    const upper = term.toUpperCase();
    try {
      const all = await Promise.all(
        SEARCH_ENTITIES.map(async (cfg) => {
          try {
            const list = await base44.entities[cfg.entity].list('-created_date', 200);
            const matched = list.filter(r =>
              cfg.fields.some(f => {
                const val = r[f];
                return val && String(val).toUpperCase().includes(upper);
              })
            ).slice(0, 5);
            return matched.map(r => ({ ...r, _entity: cfg }));
          } catch (e) {
            return [];
          }
        })
      );
      setResults(all.flat());
    } catch (e) {}
    setLoading(false);
  };

  const getPrimaryText = (r) => {
    const f = r._entity.fields;
    for (const field of f) {
      if (r[field]) return String(r[field]);
    }
    return '—';
  };

  const getSecondaryText = (r) => {
    const f = r._entity.fields;
    for (const field of f.slice(1)) {
      if (r[field]) return String(r[field]);
    }
    return '';
  };

  const grouped = results.reduce((acc, r) => {
    const key = r._entity.label;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const goTo = (path) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar por nome, placa, CPF, CNH..."
          className="w-full h-10 pl-9 pr-9 rounded-2xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-card rounded-2xl border border-border shadow-xl max-h-[60vh] overflow-y-auto">
          {!loading && results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(grouped).map(([label, items]) => {
                const Icon = items[0]._entity.icon;
                const path = items[0]._entity.path;
                return (
                  <div key={label} className="mb-2">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" /> {label}
                        <span className="bg-muted text-muted-foreground px-1.5 rounded-full text-[10px]">{items.length}</span>
                      </span>
                      <button onClick={() => goTo(path)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                        Ver página <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    {items.map(r => {
                      const Icon2 = r._entity.icon;
                      return (
                        <button
                          key={r.id}
                          onClick={() => goTo(r._entity.path)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-muted/50 text-left transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getPrimaryText(r)}</p>
                            <p className="text-xs text-muted-foreground truncate">{getSecondaryText(r)}</p>
                          </div>
                          {r.filial_nome && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                              <Building2 className="h-3 w-3" /> {r.filial_nome}
                            </span>
                          )}
                          {r.created_date && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}