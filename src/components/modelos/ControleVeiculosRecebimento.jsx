import { Loader2 } from 'lucide-react';

const HEADERS = [
  'Data', 'Placa', 'Nome', 'Empresa', 'Destino', 'RG/CPF',
  'Horário de Entrada', 'Horário de Saída', 'Crachá', 'Autorização/Contato', 'Observação'
];

function formatData(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ControleVeiculosRecebimento({ logs, loading }) {
  return (
    <div className="print-area bg-card rounded-2xl border border-border p-6 shadow-sm overflow-x-auto">
      <h2 className="text-center font-heading font-bold text-lg mb-4">Controle de Veículos Recebimento</h2>
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado no período selecionado</p>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {HEADERS.map(h => (
                <th key={h} className="border border-black px-2 py-1.5 bg-primary text-primary-foreground font-medium text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{formatData(log.created_date)}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap font-medium">{log.placa}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.nome || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.empresa || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.destino || 'PR'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.rg_cpf || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.horario_entrada || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.horario_saida || ''}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.cracha || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.autorizacao_contato || '—'}</td>
                <td className="border border-black px-2 py-1">{log.observacao || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}