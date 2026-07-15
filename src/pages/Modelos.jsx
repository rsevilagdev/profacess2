import { useState } from 'react';
import { Printer, Loader2, LayoutGrid, Calendar, Truck, FileSpreadsheet, Users, Car } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ControleVeiculosExpedicao from '@/components/modelos/ControleVeiculosExpedicao';
import ControleVeiculosRecebimento from '@/components/modelos/ControleVeiculosRecebimento';
import AverbacaoReport from '@/components/modelos/AverbacaoReport';
import ControleFornecedoresReport from '@/components/modelos/ControleFornecedoresReport';
import ControleVisitantesReport from '@/components/modelos/ControleVisitantesReport';
import ControleVeiculosColaboradoresReport from '@/components/modelos/ControleVeiculosColaboradoresReport';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TEMPLATES = [
  {
    id: 'controle_veiculos_expedicao',
    name: 'Controle de Veículos Expedição',
    icon: LayoutGrid,
    description: 'Controle de entrada e saída de veículos com motorista e ajudante',
  },
  {
    id: 'controle_veiculos_recebimento',
    name: 'Controle de Veículos Recebimento',
    icon: Truck,
    description: 'Controle de recebimento de veículos — transferência entre CDs (CRDK)',
  },
  {
    id: 'averbacao_mensal',
    name: 'Averbação Mensal',
    icon: FileSpreadsheet,
    description: 'Relatório de averbação agrupado por mês com exportação PDF, Excel e e-mail',
  },
  {
    id: 'averbacao_semestral',
    name: 'Averbação Semestral',
    icon: FileSpreadsheet,
    description: 'Relatório de averbação agrupado por semestre com exportação PDF, Excel e e-mail',
  },
  {
    id: 'controle_fornecedores',
    name: 'Controle de Entrada e Saída de Fornecedores',
    icon: Users,
    description: 'Formulário de controle de entrada e saída de transportadoras com filtros de seleção múltipla',
  },
  {
    id: 'controle_visitantes',
    name: 'Controle de Acesso de Visitantes',
    icon: Users,
    description: 'Relatório de controle de acesso de visitantes com filtros de seleção múltipla e exportação PDF/Excel',
  },
  {
    id: 'controle_veiculos_colaboradores',
    name: 'Controle de Veículos — Colaboradores',
    icon: Car,
    description: 'Relatório de veículos de colaboradores com filtros de seleção múltipla e exportação PDF/Excel',
  },
];

export default function Modelos() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedSemestre, setSelectedSemestre] = useState(1);

  const isAverbacao = selectedTemplate === 'averbacao_mensal' || selectedTemplate === 'averbacao_semestral';
  const isFornecedores = selectedTemplate === 'controle_fornecedores';
  const isVisitantes = selectedTemplate === 'controle_visitantes';
  const isVeiculosColaboradores = selectedTemplate === 'controle_veiculos_colaboradores';

  const gerar = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const entity = selectedTemplate === 'controle_veiculos_recebimento' ? 'AcessoCRDK' : 'AccessLog';
      const allLogs = await base44.entities[entity].list('-created_date', 1000);
      let filtered = allLogs;
      if (dataInicio) {
        const inicio = new Date(dataInicio + 'T00:00:00');
        filtered = filtered.filter(l => new Date(l.created_date) >= inicio);
      }
      if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59');
        filtered = filtered.filter(l => new Date(l.created_date) <= fim);
      }
      filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setLogs(filtered);
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 8px; }
          .no-print { display: none !important; }
          table { width: 100% !important; font-size: 9px; }
          table th, table td { white-space: normal !important; word-break: break-word; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="brand-title text-2xl">Modelos Corporativos</h1>
        <p className="text-sm text-muted-foreground">Relatórios corporativos preenchidos automaticamente com os dados do sistema</p>
      </div>

      {/* Template selector */}
      <div className="no-print grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          const active = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-left p-4 rounded-2xl border transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-heading font-bold text-sm">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      {isFornecedores ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm">Controle de Fornecedores</h3>
              <p className="text-xs text-muted-foreground">Os filtros e botões de exportação estão no relatório abaixo</p>
            </div>
          </div>
        </div>
      ) : isVisitantes ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm">Controle de Acesso de Visitantes</h3>
              <p className="text-xs text-muted-foreground">Os filtros e botões de exportação estão no relatório abaixo</p>
            </div>
          </div>
        </div>
      ) : isVeiculosColaboradores ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm">Controle de Veículos — Colaboradores</h3>
              <p className="text-xs text-muted-foreground">Os filtros e botões de exportação estão no relatório abaixo</p>
            </div>
          </div>
        </div>
      ) : isAverbacao ? (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {selectedTemplate === 'averbacao_mensal' ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mês</label>
                <select
                  value={selectedMes}
                  onChange={e => setSelectedMes(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm min-w-[180px]"
                >
                  <option value="">Selecione um mês</option>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Semestre</label>
                <select
                  value={selectedSemestre}
                  onChange={e => setSelectedSemestre(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm min-w-[180px]"
                >
                  <option value={1}>1º Semestre (Jan–Jun)</option>
                  <option value={2}>2º Semestre (Jul–Dez)</option>
                </select>
              </div>
            )}
            {generated && (
              <Button onClick={() => window.print()} variant="secondary" className="h-10 rounded-xl ml-auto">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="no-print bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data inicial</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data final</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 px-3 rounded-xl border border-input bg-transparent text-sm" />
            </div>
            <Button onClick={gerar} disabled={loading} className="h-10 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Gerar Relatório
            </Button>
            {generated && !loading && (
              <Button onClick={() => window.print()} variant="secondary" className="h-10 rounded-xl ml-auto">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Template render */}
      {generated && selectedTemplate === 'controle_veiculos_expedicao' && (
        <ControleVeiculosExpedicao logs={logs} loading={loading} />
      )}
      {generated && selectedTemplate === 'controle_veiculos_recebimento' && (
        <ControleVeiculosRecebimento logs={logs} loading={loading} />
      )}
      {selectedTemplate === 'averbacao_mensal' && selectedMes && (
        <AverbacaoReport tipo="mensal" periodo={selectedMes} />
      )}
      {selectedTemplate === 'averbacao_semestral' && (
        <AverbacaoReport tipo="semestral" periodo={selectedSemestre} />
      )}
      {isFornecedores && (
        <ControleFornecedoresReport />
      )}
      {isVisitantes && (
        <ControleVisitantesReport />
      )}
      {isVeiculosColaboradores && (
        <ControleVeiculosColaboradoresReport />
      )}
    </div>
  );
}