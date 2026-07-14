import { useState } from 'react';
import { Printer, Loader2, LayoutGrid, Calendar, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ControleVeiculosExpedicao from '@/components/modelos/ControleVeiculosExpedicao';
import ControleVeiculosRecebimento from '@/components/modelos/ControleVeiculosRecebimento';

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
];

export default function Modelos() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

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
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .no-print { display: none !important; }
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

      {/* Date range */}
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
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          )}
        </div>
      </div>

      {/* Template render */}
      {generated && selectedTemplate === 'controle_veiculos_expedicao' && (
        <ControleVeiculosExpedicao logs={logs} loading={loading} />
      )}
      {generated && selectedTemplate === 'controle_veiculos_recebimento' && (
        <ControleVeiculosRecebimento logs={logs} loading={loading} />
      )}
    </div>
  );
}