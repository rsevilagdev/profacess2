import { useState, useMemo } from 'react';
import { Loader2, X, Check, ChevronDown, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { exportTableToPDF, exportTableToExcel } from '@/lib/modelo-export-utils';

const VIS_HEADERS = [
  'DATA', 'NÚMERO DO CRACHÁ', 'NOME', 'RG', 'EMPRESA', 'PLACA',
  'SETOR VISITADO', 'HORÁRIO ENTRADA', 'HORÁRIO SAÍDA',
  'CRACHÁ DEVOLVIDO? (SIM ou NÃO)', 'VIGILANTE'
];

const VIS_COL_WEIGHTS = [16, 20, 30, 22, 24, 14, 22, 16, 16, 24, 24];

function buildVisRow(reg) {
  return [
    reg.data || '',
    reg.numero_cracha || '',
    reg.nome || '',
    reg.rg || '',
    reg.empresa || '',
    reg.placa || '',
    reg.setor_visitado || '',
    reg.horario_entrada || '',
    reg.horario_saida || '',
    reg.cracha_devolvido === 'sim' ? 'SIM' : reg.cracha_devolvido === 'nao' ? 'NÃO' : '',
    reg.vigilante || '',
  ];
}

const FILTER_FIELDS = [
  { key: 'data', label: 'Data' },
  { key: 'numero_cracha', label: 'Número do Crachá' },
  { key: 'nome', label: 'Nome' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'placa', label: 'Placa' },
  { key: 'setor_visitado', label: 'Setor Visitado' },
  { key: 'cracha_devolvido', label: 'Crachá Devolvido' },
  { key: 'vigilante', label: 'Vigilante' },
];

const CRACHA_LABELS = { sim: 'Sim', nao: 'Não', pendente: 'Pendente' };

function MultiSelectFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectAll = () => onChange(options.length === selected.length ? [] : [...options]);

  return (
    <div className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm flex items-center justify-between gap-2 hover:bg-muted/30"
      >
        <span className={selected.length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
          {selected.length === 0 ? 'Todos' : `${selected.length} selecionado(s)`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={selectAll}
              className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 border-b border-border font-medium"
            >
              <span>Selecionar todos</span>
              {options.length === selected.length && options.length > 0 && <Check className="h-3 w-3 text-primary" />}
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50"
              >
                <span className="truncate">{opt.label}</span>
                {selected.includes(opt.value) && <Check className="h-3 w-3 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ControleVisitantesReport() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [filters, setFilters] = useState({});

  const loadAndGerar = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ControleVisitantes.list('-created_date', 2000);
      setRegistros(all);
      setGenerated(true);
    } catch (e) {}
    setLoading(false);
  };

  const filterOptions = useMemo(() => {
    const opts = {};
    for (const field of FILTER_FIELDS) {
      const rawVals = registros.map(r => r[field.key]).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      if (field.key === 'cracha_devolvido') {
        const uniqueVals = [...new Set(rawVals)];
        opts[field.key] = uniqueVals.map(v => ({ value: v, label: CRACHA_LABELS[v] || v }));
      } else {
        const uniqueVals = [...new Set(rawVals)].sort();
        opts[field.key] = uniqueVals.map(v => ({ value: v, label: v }));
      }
    }
    return opts;
  }, [registros]);

  const filtered = useMemo(() => {
    return registros.filter(r => {
      for (const field of FILTER_FIELDS) {
        const selected = filters[field.key] || [];
        if (selected.length > 0 && !selected.includes(r[field.key] || '')) return false;
      }
      return true;
    });
  }, [registros, filters]);

  const updateFilter = (key, vals) => setFilters(prev => ({ ...prev, [key]: vals }));
  const clearFilters = () => setFilters({});
  const activeFilterCount = Object.values(filters).filter(v => v && v.length > 0).length;

  const crachaLabel = (v) => v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Pendente';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-bold text-sm">Filtros de Seleção Múltipla</h3>
            <p className="text-xs text-muted-foreground">Selecione múltiplos valores para cada campo</p>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Limpar ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FILTER_FIELDS.map(field => (
            <MultiSelectFilter
              key={field.key}
              label={field.label}
              options={filterOptions[field.key] || []}
              selected={filters[field.key] || []}
              onChange={vals => updateFilter(field.key, vals)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <button
            onClick={loadAndGerar}
            disabled={loading}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {generated ? 'Atualizar Dados' : 'Gerar Relatório'}
          </button>
          {generated && !loading && (
            <span className="text-xs text-muted-foreground self-center mr-auto">
              {filtered.length} registro(s) exibido(s) de {registros.length} total
            </span>
          )}
          {generated && !loading && filtered.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportTableToPDF({
                  title: 'Controle de Acesso de Visitantes',
                  headers: VIS_HEADERS,
                  rows: filtered.map(buildVisRow),
                  columnWeights: VIS_COL_WEIGHTS,
                  fileName: 'controle_visitantes.pdf',
                })}
                className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => exportTableToExcel({
                  headers: VIS_HEADERS,
                  rows: filtered.map(buildVisRow),
                  fileName: 'controle_visitantes.xlsx',
                  sheetName: 'Visitantes',
                })}
                className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button
                onClick={() => window.print()}
                className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Template Table */}
      {generated && (
        <div className="print-area bg-card rounded-2xl border border-border p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-black text-sm">P</span>
              </div>
              <div>
                <p className="font-heading font-black text-base text-black leading-tight">PROFARMA</p>
                <p className="text-[8px] text-muted-foreground leading-tight">DISTRIBUIDORA DE MEDICAMENTOS</p>
              </div>
            </div>
            <div className="flex-1 text-center">
              <h2 className="font-heading font-bold text-sm text-black">CONTROLE DE ACESSO DE VISITANTES</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado com os filtros selecionados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse table-fixed">
                <thead>
                  <tr>
                    {VIS_HEADERS.map(h => (
                      <th key={h} className="border border-black px-1.5 py-1.5 bg-primary text-primary-foreground font-medium text-left leading-tight">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(reg => (
                    <tr key={reg.id} className="hover:bg-muted/20">
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.data || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.numero_cracha || '—'}</td>
                      <td className="border border-black px-1.5 py-1 font-medium break-words align-top">{reg.nome || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.rg || '—'}</td>
                      <td className="border border-black px-1.5 py-1 break-words align-top">{reg.empresa || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.placa || '—'}</td>
                      <td className="border border-black px-1.5 py-1 break-words align-top">{reg.setor_visitado || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.horario_entrada || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap align-top">{reg.horario_saida || '—'}</td>
                      <td className="border border-black px-1.5 py-1 whitespace-nowrap font-medium align-top">{crachaLabel(reg.cracha_devolvido)}</td>
                      <td className="border border-black px-1.5 py-1 break-words align-top">{reg.vigilante || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}