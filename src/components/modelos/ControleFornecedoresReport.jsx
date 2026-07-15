import { useState, useMemo } from 'react';
import { Loader2, X, Check, ChevronDown, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { exportTableToPDF, exportTableToExcel } from '@/lib/modelo-export-utils';

const FORN_HEADERS = [
  'Transportadora', 'Placa', 'Motorista', 'RG/CPF',
  'Entrada Data', 'Entrada Horário', 'Entrada Liberado por',
  'Saída Data', 'Saída Horário', 'Saída Liberado por', 'Status'
];

const FORN_COL_WEIGHTS = [28, 14, 24, 22, 16, 16, 24, 16, 16, 24, 14];

function buildFornRow(reg) {
  return [
    reg.transportadora || '',
    reg.placa || '',
    reg.motorista || '',
    reg.rg_cpf || '',
    reg.entrada_data || '',
    reg.entrada_horario || '',
    reg.entrada_liberado_por || '',
    reg.saida_data || '',
    reg.saida_horario || '',
    reg.saida_liberado_por || '',
    reg.status || '',
  ];
}

const FILTER_FIELDS = [
  { key: 'transportadora', label: 'Transportadora' },
  { key: 'placa', label: 'Placa' },
  { key: 'motorista', label: 'Motorista' },
  { key: 'rg_cpf', label: 'RG/CPF' },
  { key: 'entrada_liberado_por', label: 'Entrada Liberado por' },
  { key: 'saida_liberado_por', label: 'Saída Liberado por' },
  { key: 'status', label: 'Status' },
];

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
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50"
              >
                <span className="truncate">{opt || '—'}</span>
                {selected.includes(opt) && <Check className="h-3 w-3 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ reg }) {
  return (
    <div className="flex border border-black">
      <div className="w-28 shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1">
        <span className="text-[10px] font-bold text-black">TRANSPORTADORA:</span>
      </div>
      <div className="flex-1 border-r border-black px-1.5 py-1 bg-white min-h-[22px]">
        <span className="text-[10px] text-black">{reg.transportadora || ''}</span>
      </div>
      <div className="w-16 shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1">
        <span className="text-[10px] font-bold text-black">PLACA:</span>
      </div>
      <div className="w-24 shrink-0 px-1.5 py-1 bg-white min-h-[22px]">
        <span className="text-[10px] text-black">{reg.placa || ''}</span>
      </div>
    </div>
  );
}

function FieldRow({ label, value, fullWidth }) {
  return (
    <div className="flex border border-black border-t-0">
      <div className={`shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1 ${fullWidth ? '' : 'w-28'}`}>
        <span className="text-[10px] font-bold text-black">{label}</span>
      </div>
      <div className={`px-1.5 py-1 bg-white min-h-[22px] ${fullWidth ? 'flex-1' : ''}`}>
        <span className="text-[10px] text-black">{value || ''}</span>
      </div>
    </div>
  );
}

function EntradaSaidaRow({ label, data, horario, liberadoPor }) {
  return (
    <div className="flex border border-black border-t-0">
      <div className="w-28 shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1">
        <span className="text-[10px] font-bold text-black">{label}</span>
      </div>
      <div className="w-36 shrink-0 border-r border-black px-1.5 py-1 bg-white min-h-[22px]">
        <span className="text-[10px] text-black">{data || ''}</span>
      </div>
      <div className="w-24 shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1">
        <span className="text-[10px] font-bold text-black">HORÁRIO:</span>
      </div>
      <div className="w-28 shrink-0 border-r border-black px-1.5 py-1 bg-white min-h-[22px]">
        <span className="text-[10px] text-black">{horario || ''}</span>
      </div>
      <div className="w-32 shrink-0 bg-[#C0C0C0] border-r border-black px-1.5 py-1">
        <span className="text-[10px] font-bold text-black">LIBERADO POR:</span>
      </div>
      <div className="flex-1 px-1.5 py-1 bg-white min-h-[22px]">
        <span className="text-[10px] text-black">{liberadoPor || ''}</span>
      </div>
    </div>
  );
}

export default function ControleFornecedoresReport() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [filters, setFilters] = useState({});

  const loadAndGerar = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ControleFornecedores.list('-created_date', 2000);
      setRegistros(all);
      setGenerated(true);
    } catch (e) {}
    setLoading(false);
  };

  const filterOptions = useMemo(() => {
    const opts = {};
    for (const field of FILTER_FIELDS) {
      const vals = [...new Set(registros.map(r => r[field.key]).filter(v => v !== undefined && v !== null && String(v).trim() !== ''))];
      opts[field.key] = vals.sort();
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
                  title: 'Controle de Entrada e Saída de Fornecedores',
                  headers: FORN_HEADERS,
                  rows: filtered.map(buildFornRow),
                  columnWeights: FORN_COL_WEIGHTS,
                  fileName: 'controle_fornecedores.pdf',
                })}
                className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => exportTableToExcel({
                  headers: FORN_HEADERS,
                  rows: filtered.map(buildFornRow),
                  fileName: 'controle_fornecedores.xlsx',
                  sheetName: 'Fornecedores',
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

      {/* Template Form */}
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
                <p className="text-[8px] text-muted-foreground leading-tight">MOVIDOS POR MAIS. PRONTOS PARA MAIS</p>
              </div>
            </div>
            <div className="flex-1 text-center">
              <h2 className="font-heading font-bold text-sm text-black">CONTROLE DE ENTRADA E SAÍDA DE FORNECEDORES</h2>
            </div>
          </div>

          {/* Records */}
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado com os filtros selecionados</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((reg, idx) => (
                <div key={reg.id} className="break-inside-avoid">
                  <p className="text-[9px] text-muted-foreground mb-0.5">Registro {idx + 1}</p>
                  <Row reg={reg} />
                  <FieldRow label="MOTORISTA:" value={reg.motorista} />
                  <FieldRow label="RG/CPF:" value={reg.rg_cpf} />
                  <EntradaSaidaRow
                    label="ENTRADA:"
                    data={reg.entrada_data}
                    horario={reg.entrada_horario}
                    liberadoPor={reg.entrada_liberado_por}
                  />
                  <EntradaSaidaRow
                    label="SAÍDA:"
                    data={reg.saida_data}
                    horario={reg.saida_horario}
                    liberadoPor={reg.saida_liberado_por}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}