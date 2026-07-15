import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Clock, Truck, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCuritiba } from '@/lib/curitiba-time.js';

const PAGE_SIZE = 10;

export default function RegistrosAcesso() {
  const [tab, setTab] = useState('accesslog');
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [photoModal, setPhotoModal] = useState(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'accesslog') {
        const [logs, veics] = await Promise.all([
          base44.entities.AccessLog.list('-created_date', 500),
          base44.entities.Vehicle.list('-created_date', 500)
        ]);
        setRecords(logs);
        setVehicles(veics);
      } else {
        const list = await base44.entities.AcessoCRDK.list('-created_date', 500);
        setRecords(list);
      }
    } catch (e) {}
    setLoading(false);
  };

  const getVehiclePhoto = (placa) => {
    if (!placa) return null;
    const v = vehicles.find(v => v.placa === placa.toUpperCase());
    return v?.comprovante_foto || null;
  };

  const filtered = records.filter(r => {
    if (tipoFilter !== 'all' && r.tipo !== tipoFilter && r.status !== tipoFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'accesslog') {
      return r.veiculo_placa?.toLowerCase().includes(term) ||
        r.motorista_nome?.toLowerCase().includes(term) ||
        r.motorista_cpf?.includes(term) ||
        r.empresa?.toLowerCase().includes(term) ||
        r.filial_nome?.toLowerCase().includes(term);
    }
    return r.placa_carreta?.toLowerCase().includes(term) ||
      r.placa_cavalo?.toLowerCase().includes(term) ||
      r.nome?.toLowerCase().includes(term) ||
      r.empresa?.toLowerCase().includes(term);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const placaCompleta = (r) => `${r.placa_carreta || ''}${r.placa_cavalo ? '/' + r.placa_cavalo : ''}`;

  return (
    <div className="space-y-4 fade-in">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('accesslog'); setPage(0); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'accesslog' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          Logs de Acesso/Saída
        </button>
        <button
          onClick={() => { setTab('crdk'); setPage(0); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'crdk' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          Registros CRDK
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por placa, motorista, empresa..."
            className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={e => { setTipoFilter(e.target.value); setPage(0); }}
          className="h-12 px-4 rounded-2xl border border-input bg-card text-sm"
        >
          {tab === 'accesslog' ? (
            <>
              <option value="all">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </>
          ) : (
            <>
              <option value="all">Todos</option>
              <option value="descarregamento">Em Descarregamento</option>
              <option value="saida">Saída Liberada</option>
            </>
          )}
        </select>
      </div>

      {/* Records list */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : pageData.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhum registro encontrado</p></div>
        ) : (
          <div className="space-y-2">
            {pageData.map(r => {
              const isSaida = tab === 'accesslog' ? r.tipo === 'saida' : r.status === 'saida';
              const foto = tab === 'crdk' ? r.foto_interior : getVehiclePhoto(r.veiculo_placa);
              return (
                <div key={r.id} className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
                  <div className="flex items-start gap-3">
                    {/* Photo thumbnail */}
                    <div className="shrink-0">
                      {foto ? (
                        <button
                          onClick={() => setPhotoModal(foto)}
                          className="relative h-16 w-16 rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img src={foto} alt="Foto" className="h-full w-full object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-foreground/60 flex justify-center py-0.5">
                            <ImageIcon className="h-3 w-3 text-background" />
                          </div>
                        </button>
                      ) : (
                        <div className="h-16 w-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/30">
                          <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isSaida ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                          {isSaida ? <ArrowUpFromLine className="h-3 w-3" /> : <ArrowDownToLine className="h-3 w-3" />}
                          {isSaida ? 'Saída' : (tab === 'crdk' ? 'Descarregamento' : 'Entrada')}
                        </span>
                        <p className="text-sm font-medium truncate">
                          {tab === 'crdk' ? placaCompleta(r) : r.veiculo_placa}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {tab === 'crdk' ? r.nome : r.motorista_nome || '—'}
                        {r.empresa && ` · ${r.empresa}`}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        {(tab === 'crdk' ? r.horario_entrada : r.tipo) && tab === 'crdk' && <span>Entrada: {r.horario_entrada}</span>}
                        {tab === 'crdk' && r.horario_saida && <span>Saída: {r.horario_saida}</span>}
                        {r.filial_nome && <span>{r.filial_nome}</span>}
                        {r.observacao && <span className="truncate max-w-[200px]">Obs: {r.observacao}</span>}
                      </div>
                      {tab === 'accesslog' && r.carregado !== undefined && r.tipo === 'saida' && (
                        <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {r.carregado ? 'Carregado' : 'Vazio'}
                        </span>
                      )}
                    </div>

                    {foto && (
                      <Button size="sm" variant="ghost" className="h-8 rounded-xl shrink-0" onClick={() => setPhotoModal(foto)}>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* Photo modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-3xl w-full">
            <button onClick={() => setPhotoModal(null)} className="absolute -top-10 right-0 h-8 w-8 rounded-lg bg-card flex items-center justify-center shadow-lg">
              <X className="h-4 w-4" />
            </button>
            <img src={photoModal} alt="Foto do registro" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}