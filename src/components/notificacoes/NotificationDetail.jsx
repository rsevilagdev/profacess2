import { useState, useEffect } from 'react';
import { X, Trash2, Bell, User, Truck, ShieldAlert, Clock, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import { formatCuritiba } from '@/lib/curitiba-time.js';

const TYPE_LABELS = {
  admin_ops: 'Operações Administrativas',
  vehicle_release: 'Liberação de Veículos',
  driver_docs: 'Documentação de Motoristas',
  entry_exit: 'Entradas e Saídas',
};

export default function NotificationDetail({ notification, onClose, onDelete }) {
  const [related, setRelated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msg = (notification.message || '').toLowerCase();
        const title = (notification.title || '').toLowerCase();

        // Extract placa (ABC1234 or ABC1D23 pattern)
        const placaMatch = notification.message?.match(/\b([A-Z]{3}[\d]([A-Z]|\d)[A-Z]?\d{2}|[A-Z]{3}\d{4})\b/i);

        // Extract CPF
        const cpfMatch = notification.message?.match(/\b(\d{3}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-]?\d{2})\b/);

        // Determine context: vehicle or driver
        const isVehicle = msg.includes('veículo') || msg.includes('placa') || msg.includes('carregad') || title.includes('veículo') || title.includes('saída') || title.includes('acesso');
        const isDriver = msg.includes('motorista') || msg.includes('cpf') || title.includes('motorista') || title.includes('cadastro') || title.includes('bloqueio') || title.includes('valida');

        const results = { vehicles: [], drivers: [], accessLogs: [], reviewRequests: [] };

        if (placaMatch) {
          const placa = placaMatch[0].toUpperCase();
          results.vehicles = await base44.entities.Vehicle.filter({ placa }).catch(() => []);
          results.accessLogs = await base44.entities.AccessLog.filter({ veiculo_placa: placa }).catch(() => []);
        }

        if (cpfMatch) {
          const cpfDigits = cpfMatch[1].replace(/\D/g, '');
          results.drivers = await base44.entities.Driver.filter({ cpf: cpfDigits }).catch(() => []);
        }

        // If notification is about a review/cadastro, find review requests
        if (title.includes('cadastro') || title.includes('revisão') || title.includes('revisao')) {
          const reviews = await base44.entities.ReviewRequest.list('-created_date', 20).catch(() => []);
          results.reviewRequests = reviews.filter(r => {
            const motivo = (r.motivo || '').toLowerCase();
            return notification.message && (
              (r.solicitante_nome && notification.message.includes(r.solicitante_nome)) ||
              (r.target_nome && notification.message.includes(r.target_nome)) ||
              (r.target_cpf && notification.message.toLowerCase().includes(r.target_cpf.toLowerCase()))
            );
          });
        }

        if (!cancelled) setRelated(results);
      } catch (e) {
        if (!cancelled) setRelated({ vehicles: [], drivers: [], accessLogs: [], reviewRequests: [] });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [notification]);

  const handleClose = () => {
    onClose();
  };

  const handleDelete = () => {
    onDelete(notification);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${notification.read ? 'bg-muted' : 'bg-primary/10'}`}>
              <Bell className={`h-5 w-5 ${notification.read ? 'text-muted-foreground' : 'text-primary'}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{TYPE_LABELS[notification.type] || 'Notificação'}</p>
              <p className="font-heading font-bold text-base leading-tight">{notification.title}</p>
            </div>
          </div>
          <button onClick={handleClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message body */}
        <div className="bg-muted/30 rounded-xl p-3 mb-3">
          <p className="text-sm">{notification.message}</p>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatCuritiba(notification.created_date, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {notification.sender_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {notification.sender_name}
            </span>
          )}
          {notification.read && (
            <span className="flex items-center gap-1 text-primary">
              <Check className="h-3 w-3" /> Lida
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Buscando dados relacionados...</div>
        ) : (
          <>
            {/* Vehicle data */}
            {related?.vehicles && related.vehicles.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Veículo{related.vehicles.length > 1 ? 's' : ''} Relacionado{related.vehicles.length > 1 ? 's' : ''}
                </p>
                {related.vehicles.map(v => (
                  <div key={v.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{v.placa}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'validado' ? 'bg-primary/10 text-primary' : v.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {v.modelo && <span>Modelo: {v.modelo}</span>}
                      {v.cor && <span>Cor: {v.cor}</span>}
                      {v.transportadora && <span>Transportadora: {v.transportadora}</span>}
                      {v.tipo && <span>Tipo: {v.tipo}</span>}
                      {v.status_opentech && <span>Opentech: {v.status_opentech}</span>}
                      {v.data_validade && <span>Validade: {formatCuritiba(v.data_validade, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                    </div>
                    {v.observacao && <p className="text-xs text-muted-foreground mt-1">Obs: {v.observacao}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Driver data */}
            {related?.drivers && related.drivers.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <User className="h-3 w-3" /> Motorista{related.drivers.length > 1 ? 's' : ''} Relacionado{related.drivers.length > 1 ? 's' : ''}
                </p>
                {related.drivers.map(d => (
                  <div key={d.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{d.nome}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'validado' ? 'bg-primary/10 text-primary' : d.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>CPF: {formatCPF(d.cpf)}</span>
                      {d.cnh && <span>CNH: {d.cnh}</span>}
                      {d.cnh_validade && <span>CNH val.: {formatCuritiba(d.cnh_validade, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                      {d.transportadora && <span>Transp.: {d.transportadora}</span>}
                      {d.telefone && <span>Tel: {d.telefone}</span>}
                      {d.data_validade && <span>Validade: {formatCuritiba(d.data_validade, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                    </div>
                    {d.observacao && <p className="text-xs text-muted-foreground mt-1">Obs: {d.observacao}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Access logs */}
            {related?.accessLogs && related.accessLogs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Registros de Acesso
                </p>
                {related.accessLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="bg-muted/30 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{log.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'validado' ? 'bg-primary/10 text-primary' : log.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {log.motorista_nome && <span>Motorista: {log.motorista_nome}</span>}
                      {log.motorista_cpf && <span>CPF: {formatCPF(log.motorista_cpf)}</span>}
                      {log.empresa && <span>Empresa: {log.empresa}</span>}
                      {log.operador_nome && <span>Operador: {log.operador_nome}</span>}
                      {log.carregado && <span className="text-primary">Saiu carregado</span>}
                      {log.aprovado_por && <span>Autorizado por: {log.aprovado_por}</span>}
                      {log.motivo_bloqueio && <span className="text-destructive col-span-2">Motivo bloqueio: {log.motivo_bloqueio}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatCuritiba(log.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Review requests */}
            {related?.reviewRequests && related.reviewRequests.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Solicitação de Revisão
                </p>
                {related.reviewRequests.map(r => (
                  <div key={r.id} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 mb-2">
                    <p className="text-sm font-medium">{r.tipo === 'veiculo' ? 'Veículo' : r.tipo === 'motorista' ? 'Motorista' : 'Ambos'}: {r.target_nome || r.target_cpf}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.motivo}</p>
                    <p className="text-xs text-muted-foreground mt-1">Solicitante: {r.solicitante_nome} — {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}

            {/* No related data */}
            {!loading && related && related.vehicles.length === 0 && related.drivers.length === 0 && related.accessLogs.length === 0 && related.reviewRequests.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">Nenhum dado relacionado encontrado.</div>
            )}
          </>
        )}

        {/* Actions: delete or keep */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={handleClose}>
            Manter
          </Button>
          <Button variant="destructive" className="flex-1 h-12 rounded-2xl" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}