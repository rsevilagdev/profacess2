import { Loader2 } from 'lucide-react';
import { formatCuritiba } from '@/lib/curitiba-time.js';

const HEADERS = [
  'Data', 'Placa', 'Nome', 'CPF', 'Empresa', 'Ajudante', 'CPF',
  'Horário de Entrada', 'Horário de Saída', 'Classificação', 'Observação'
];

function formatData(iso) {
  if (!iso) return '';
  return formatCuritiba(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(iso) {
  if (!iso) return '';
  return formatCuritiba(iso, { hour: '2-digit', minute: '2-digit' });
}

function buildObservacao(log) {
  const parts = [];
  if (log.tipo === 'saida') {
    parts.push(log.carregado ? 'Saiu carregado' : 'Saiu vazio');
  }
  if (log.observacao) {
    const obsParts = log.observacao.split(' | ');
    const exitObs = obsParts.length > 1 ? obsParts[obsParts.length - 1] : (log.tipo === 'saida' && !obsParts[0].startsWith('Acompanhante:') ? log.observacao : '');
    if (exitObs) parts.push(exitObs);
  }
  return parts.join(' — ');
}

export default function ControleVeiculosExpedicao({ logs, loading }) {
  return (
    <div className="print-area bg-card rounded-2xl border border-border p-6 shadow-sm overflow-x-auto">
      <h2 className="text-center font-heading font-bold text-lg mb-4">Controle de Veículos Expedição</h2>
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
                <td className="border border-black px-2 py-1 whitespace-nowrap font-medium">{log.veiculo_placa}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.motorista_nome || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.motorista_cpf || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.empresa || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.ajudante_nome || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.ajudante_cpf || '—'}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{formatHora(log.created_date)}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{log.tipo === 'saida' ? formatHora(log.data_aprovacao) : ''}</td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1">{buildObservacao(log)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}