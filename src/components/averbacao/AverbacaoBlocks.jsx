import { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Layers, Route } from 'lucide-react';

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

export default function AverbacaoBlocks({ records, view }) {
  // Group by day (mensal) or month (semestral)
  const groups = {};
  records.forEach(r => {
    const date = new Date(r.data_embarque);
    if (isNaN(date)) return;
    const key = view === 'mensal' ? date.toDateString() : String(date.getMonth());
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (view === 'mensal') return new Date(a) - new Date(b);
    return Number(a) - Number(b);
  });

  const grandTotal = records.reduce((s, r) => s + (r.valor || 0), 0);

  if (sortedKeys.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
        Nenhum registro encontrado para o período selecionado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedKeys.map(key => {
        const dayRecords = groups[key];
        const label = view === 'mensal'
          ? formatDate(dayRecords[0].data_embarque)
          : MESES[Number(key)];
        return <DayBlock key={key} label={label} records={dayRecords} />;
      })}
      <div className="bg-[#a6bac9] text-[#202020] rounded-2xl px-4 py-3 flex items-center justify-between font-bold">
        <span>Total Geral</span>
        <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}

function DayBlock({ label, records }) {
  const [expanded, setExpanded] = useState(true);
  const dayTotal = records.reduce((s, r) => s + (r.valor || 0), 0);

  // Build 3 blocks
  const block1 = buildSimpleBlock(records.filter(r => (r.prioridade || 0) < 90));
  const block2 = buildRouteBlock(records.filter(r => r.prioridade === 90 || r.prioridade === 91));
  const block3 = buildSimpleBlock(records.filter(r => (r.prioridade || 0) > 91));

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-heading font-bold text-sm">{label}</span>
        </div>
        <span className="font-bold tabular-nums text-primary">{formatCurrency(dayTotal)}</span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Block 1: Prioridades 1-89 */}
          {block1.items.length > 0 && (
            <SimpleBlock title="Prioridades 1 a 89" items={block1.items} total={block1.total} />
          )}

          {/* Block 2: Prioridades 90 e 91 (por Rota) */}
          {block2.items.length > 0 && (
            <RouteBlock title="Prioridades 90 e 91 (por Rota)" items={block2.items} total={block2.total} />
          )}

          {/* Block 3: Prioridades >91 */}
          {block3.items.length > 0 && (
            <SimpleBlock title="Prioridades acima de 91" items={block3.items} total={block3.total} />
          )}

          {/* Day total */}
          <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-xl border border-primary/20">
            <span className="text-sm font-medium text-primary">Total do dia</span>
            <span className="font-bold tabular-nums text-primary">{formatCurrency(dayTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleBlock({ title, items, total }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-border/50">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
              <span className="text-sm">Prioridade {item.prioridade}</span>
              <span className="text-sm tabular-nums">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteBlock({ title, items, total }) {
  const [expanded, setExpanded] = useState(true);
  // Group by prioridade
  const byPrioridade = {};
  items.forEach(item => {
    if (!byPrioridade[item.prioridade]) byPrioridade[item.prioridade] = [];
    byPrioridade[item.prioridade].push(item);
  });
  const prioridadeKeys = Object.keys(byPrioridade).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Route className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-border/50">
          {prioridadeKeys.map(p => {
            const routes = byPrioridade[p];
            const prioridadeTotal = routes.reduce((s, r) => s + r.total, 0);
            return (
              <div key={p} className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-primary">Prioridade {p}</span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(prioridadeTotal)}</span>
                </div>
                <div className="pl-4 space-y-1">
                  {routes.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>↳ Rota {item.rota}</span>
                      <span className="tabular-nums">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildSimpleBlock(records) {
  const groups = {};
  records.forEach(r => {
    const p = r.prioridade || 0;
    if (!groups[p]) groups[p] = 0;
    groups[p] += r.valor || 0;
  });
  const items = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(p => ({
    prioridade: p,
    total: groups[p]
  }));
  const total = items.reduce((s, i) => s + i.total, 0);
  return { items, total };
}

function buildRouteBlock(records) {
  const groups = {};
  records.forEach(r => {
    const key = `${r.prioridade}|${r.rota || 0}`;
    if (!groups[key]) groups[key] = { prioridade: r.prioridade, rota: r.rota || 0, total: 0 };
    groups[key].total += r.valor || 0;
  });
  const items = Object.keys(groups).sort((a, b) => {
    const [pa, ra] = a.split('|').map(Number);
    const [pb, rb] = b.split('|').map(Number);
    return pa !== pb ? pa - pb : ra - rb;
  }).map(k => groups[k]);
  const total = items.reduce((s, i) => s + i.total, 0);
  return { items, total };
}