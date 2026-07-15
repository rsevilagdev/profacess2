import { useState, useEffect } from 'react';
import { Loader2, Car, ArrowDownToLine, ArrowUpFromLine, Clock, Building2, IdCard, Search, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCuritiba } from '@/lib/curitiba-time.js';

const PAGE_SIZE = 8;

export default function PerfilHistorico({ colaborador }) {
  const [tab, setTab] = useState('veiculos');
  const [veiculos, setVeiculos] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [crdkLogs, setCrdkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const nome = colaborador?.nome?.trim().toUpperCase();
      const cpf = colaborador?.cpf?.replace(/\D/g, '');
      if (!nome) { setLoading(false); return; }

      const [veics, logs, crdk] = await Promise.all([
        base44.entities.VeiculoColaborador.list('-created_date', 500),
        base44.entities.AccessLog.list('-created_date', 500),
        base44.entities.AcessoCRDK.list('-created_date', 500),
      ]);

      setVeiculos(veics.filter(v =>
        v.nome?.trim().toUpperCase() === nome ||
        (cpf && v.cnh?.includes(cpf))
      ));

      setAccessLogs(logs.filter(l =>
        l.motorista_nome?.trim().toUpperCase() === nome ||
        l.operador_nome?.trim().toUpperCase() === nome ||
        (cpf && l.motorista_cpf?.replace(/\D/g, '') === cpf)
      ));

      setCrdkLogs(crdk.filter(c =>
        c.nome?.trim().toUpperCase() === nome ||
        c.operador_nome?.trim().toUpperCase() === nome
      ));
    } catch (e) {}
    setLoading(false);
  };

  const currentList = tab === 'veiculos' ? veiculos : tab === 'accesslog' ? accessLogs : crdkLogs;

  const filtered = currentList.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'veiculos') {
      return r.placa?.toLowerCase().includes(term) ||
        r.modelo_veiculo?.toLowerCase().includes(term) ||
        r.setor?.toLowerCase().includes(term) ||
        r.matricula?.toLowerCase().includes(term);
    }
    if (tab === 'accesslog') {
      return r.veiculo_placa?.toLowerCase().includes(term) ||
        r.empresa?.toLowerCase().includes(term) ||
        r.tipo?.toLowerCase().includes(term) ||
        r.filial_nome?.toLowerCase().includes(term);
    }
    return r.placa_carreta?.toLowerCase().includes(term) ||
      r.placa_cavalo?.toLowerCase().includes(term) ||
      r.empresa?.toLowerCase().includes(term);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (page >= totalPages) setPage(0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-heading font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Histórico Detalhado
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('veiculos'); setPage(0); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${tab === 'veiculos' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
          >
            <Car className="h-3.5 w-3.5" /> Veículos ({veiculos.length})
          </button>
          <button
            onClick={() => { setTab('accesslog'); setPage(0); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${tab === 'accesslog' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" /> Acessos ({accessLogs.length})
          </button>
          <button
            onClick={() => { setTab('crdk'); setPage(0); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${tab === 'crdk' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
          >
            <Truck className="h-3.5 w-3.5" /> CRDK ({crdkLogs.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Buscar nos registros..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : pageData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tab === 'veiculos' && pageData.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    <Car className="h-3 w-3" /> Veículo
                  </span>
                  <p className="text-sm font-medium">{r.placa}</p>
                  {r.modelo_veiculo && <span className="text-xs text-muted-foreground">· {r.modelo_veiculo} {r.cor && `· ${r.cor}`}</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {r.matricula && <span>Mat: {r.matricula}</span>}
                  {r.setor && <span>Setor: {r.setor}</span>}
                  {r.cnh && <span className="flex items-center gap-1"><IdCard className="h-3 w-3" /> CNH: {r.cnh}</span>}
                  {r.filial_nome && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.filial_nome}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastro: {r.data || '—'} {r.horario || ''} · Operador: {r.operador_nome || '—'}
                </p>
              </div>
            ))}

            {tab === 'accesslog' && pageData.map(r => {
              const isSaida = r.tipo === 'saida';
              return (
                <div key={r.id} className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isSaida ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                      {isSaida ? <ArrowUpFromLine className="h-3 w-3" /> : <ArrowDownToLine className="h-3 w-3" />}
                      {isSaida ? 'Saída' : 'Entrada'}
                    </span>
                    <p className="text-sm font-medium">{r.veiculo_placa}</p>
                    {r.empresa && <span className="text-xs text-muted-foreground">· {r.empresa}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    {r.filial_nome && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.filial_nome}</span>}
                    {r.operador_nome && <span>Operador: {r.operador_nome}</span>}
                    {r.tipo === 'saida' && <span className={r.carregado ? 'text-primary font-medium' : ''}>{r.carregado ? 'Carregado' : 'Vazio'}</span>}
                  </div>
                  {r.observacao && <p className="text-xs text-muted-foreground mt-0.5 truncate">Obs: {r.observacao}</p>}
                </div>
              );
            })}

            {tab === 'crdk' && pageData.map(r => {
              const isSaida = r.status === 'saida';
              return (
                <div key={r.id} className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isSaida ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                      <Truck className="h-3 w-3" /> {isSaida ? 'Saída' : 'Descarregamento'}
                    </span>
                    <p className="text-sm font-medium">{r.placa_carreta}{r.placa_cavalo && ` / ${r.placa_cavalo}`}</p>
                    {r.empresa && <span className="text-xs text-muted-foreground">· {r.empresa}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    {r.horario_entrada && <span>Entrada: {r.horario_entrada}</span>}
                    {r.horario_saida && <span>Saída: {r.horario_saida}</span>}
                    {r.filial_nome && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.filial_nome}</span>}
                  </div>
                  {r.observacao && <p className="text-xs text-muted-foreground mt-0.5 truncate">Obs: {r.observacao}</p>}
                </div>
              );
            })}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} · {total} registros</p>
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
        </>
      )}
    </div>
  );
}