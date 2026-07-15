import { Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import { formatCuritiba } from '@/lib/curitiba-time.js';
import { exportTableToPDF, exportTableToExcel } from '@/lib/modelo-export-utils';

const HEADERS = [
  'Data', 'Placa', 'Nome', 'Empresa', 'Destino', 'RG/CPF',
  'Horário de Entrada', 'Horário de Saída', 'Crachá', 'Autorização/Contato', 'Observação'
];

const COL_WEIGHTS = [16, 18, 28, 26, 14, 22, 22, 22, 16, 28, 36];

function formatData(iso) {
  if (!iso) return '';
  return formatCuritiba(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildRow(log) {
  const placa = `${log.placa_carreta || ''}${log.placa_cavalo ? '/' + log.placa_cavalo : ''}`;
  return [
    formatData(log.created_date),
    placa,
    log.nome || '—',
    log.empresa || '—',
    log.destino || 'PR',
    log.rg_cpf || '—',
    log.horario_entrada || '—',
    log.horario_saida || '',
    log.cracha || '—',
    log.autorizacao_contato || '—',
    log.observacao || '',
  ];
}

export default function ControleVeiculosRecebimento({ logs, loading }) {
  const handlePDF = () => {
    exportTableToPDF({
      title: 'Controle de Veículos Recebimento',
      headers: HEADERS,
      rows: logs.map(buildRow),
      columnWeights: COL_WEIGHTS,
      fileName: 'controle_veiculos_recebimento.pdf',
    });
  };

  const handleExcel = () => {
    exportTableToExcel({
      headers: HEADERS,
      rows: logs.map(buildRow),
      fileName: 'controle_veiculos_recebimento.xlsx',
      sheetName: 'Recebimento',
    });
  };

  return (
    <div className="print-area bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 no-print">
        <h2 className="text-center font-heading font-bold text-lg">Controle de Veículos Recebimento</h2>
        {!loading && logs.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handlePDF} className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={handleExcel} className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado no período selecionado</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                {HEADERS.map(h => (
                  <th key={h} className="border border-black px-2 py-3 bg-primary text-primary-foreground font-medium text-left leading-tight">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const placa = `${log.placa_carreta || ''}${log.placa_cavalo ? '/' + log.placa_cavalo : ''}`;
                return (
                  <tr key={log.id}>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{formatData(log.created_date)}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap font-medium align-top">{placa}</td>
                    <td className="border border-black px-2 py-2 break-words align-top">{log.nome || '—'}</td>
                    <td className="border border-black px-2 py-2 break-words align-top">{log.empresa || '—'}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{log.destino || 'PR'}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{log.rg_cpf || '—'}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{log.horario_entrada || '—'}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{log.horario_saida || ''}</td>
                    <td className="border border-black px-2 py-2 whitespace-nowrap align-top">{log.cracha || '—'}</td>
                    <td className="border border-black px-2 py-2 break-words align-top">{log.autorizacao_contato || '—'}</td>
                    <td className="border border-black px-2 py-2 break-words align-top">{log.observacao || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}