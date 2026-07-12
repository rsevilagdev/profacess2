import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, CheckCircle, AlertTriangle, Truck, X, ShieldCheck, Ban, Loader2, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const COLUMNS = [
  { id: 'acessado', title: 'Aguardando Autorização', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  { id: 'liberado', title: 'Autorizado / Em Carga', icon: Truck, color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  { id: 'bloqueado', title: 'Bloqueado', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
];

export default function KanbanBoard({ acessos, onRefresh, colaborador }) {
  const [moving, setMoving] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [approving, setApproving] = useState(null);

  const canApprove = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = acessos.filter(a => a.status === col.id);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    if (!canApprove) return;
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    if (newStatus === 'bloqueado') {
      setBlocking({ id: draggableId, acessos });
      return;
    }
    setMoving(draggableId);
    try {
      await base44.entities.AccessLog.update(draggableId, {
        status: newStatus,
        aprovado_por: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        aprovado_por_cpf: colaborador.cpf,
        data_aprovacao: new Date().toISOString(),
      });
      await logApproval(draggableId, newStatus, acessos, null);
      onRefresh();
    } catch (e) {}
    setMoving(null);
  };

  const approveAccess = async (id) => {
    setApproving(id);
    try {
      await base44.entities.AccessLog.update(id, {
        status: 'liberado',
        aprovado_por: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        aprovado_por_cpf: colaborador.cpf,
        data_aprovacao: new Date().toISOString(),
        motivo_bloqueio: '',
      });
      await logApproval(id, 'liberado', acessos, null);
      onRefresh();
    } catch (e) {}
    setApproving(null);
  };

  const confirmBlock = async () => {
    if (!blocking || !motivo.trim()) return;
    setMoving(blocking.id);
    try {
      await base44.entities.AccessLog.update(blocking.id, {
        status: 'bloqueado',
        aprovado_por: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        aprovado_por_cpf: colaborador.cpf,
        data_aprovacao: new Date().toISOString(),
        motivo_bloqueio: motivo.trim(),
      });
      await logApproval(blocking.id, 'bloqueado', acessos, motivo.trim());
      onRefresh();
    } catch (e) {}
    setBlocking(null); setMotivo(''); setMoving(null);
  };

  const logApproval = async (id, newStatus, allAcessos, blockReason) => {
    const log = allAcessos.find(a => a.id === id);
    if (!log) return;
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    const action = newStatus === 'liberado' ? 'Acesso autorizado' : 'Acesso bloqueado';
    const details = `Placa: ${log.veiculo_placa} | Motorista: ${log.motorista_nome || '—'} | Operador: ${log.operador_nome || '—'}${blockReason ? ' | Motivo: ' + blockReason : ''}`;

    await base44.entities.AuditLog.create({
      user_name: editorName, user_cpf: colaborador.cpf,
      action, details,
      ip_address: 'local', domain: window.location.hostname,
      category: 'vehicle', branch_id: colaborador.filial_id
    });

    // Notify the operator who registered the access
    if (log.operador_cpf && log.operador_cpf !== colaborador.cpf) {
      const operators = await base44.entities.Colaborador.filter({ cpf: log.operador_cpf });
      const op = operators[0];
      if (op) {
        await base44.entities.Notification.create({
          title: newStatus === 'liberado' ? 'Acesso Autorizado' : 'Acesso Bloqueado',
          message: `Veículo ${log.veiculo_placa} — ${newStatus === 'liberado' ? 'autorizado' : 'bloqueado'} por ${editorName}${blockReason ? ' | Motivo: ' + blockReason : ''}`,
          type: newStatus === 'liberado' ? 'vehicle_release' : 'admin_ops',
          sender_name: editorName,
          target_user_id: op.id,
          branch_id: colaborador.filial_id,
        });
      }
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold">Kanban de Veículos — Fluxo de Aprovação</h3>
        {!canApprove && (
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Apenas administradores podem autorizar/bloquear
          </span>
        )}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const Icon = col.icon;
            const items = grouped[col.id] || [];
            return (
              <div key={col.id} className={`${col.bg} rounded-2xl p-3`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Icon className={`h-4 w-4 ${col.color}`} />
                  <span className="text-sm font-medium">{col.title}</span>
                  <span className="ml-auto text-xs bg-card px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                </div>
                <Droppable droppableId={col.id} isDropDisabled={!canApprove}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[120px]">
                      {items.map((item, idx) => (
                        <Draggable key={item.id} draggableId={item.id} index={idx} isDragDisabled={!canApprove}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`bg-card rounded-xl p-3 border border-border shadow-sm ${canApprove ? 'cursor-grab active:cursor-grabbing' : ''} ${moving === item.id ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                                <p className="text-sm font-medium">{item.veiculo_placa}</p>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.motorista_nome || '—'}</span>
                                <span>{new Date(item.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {item.carregado && (
                                <span className="inline-block mt-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Carregado</span>
                              )}
                              {item.operador_nome && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {item.operador_nome}
                                </p>
                              )}

                              {/* Approval actions on pending items */}
                              {col.id === 'acessado' && canApprove && (
                                <div className="flex gap-1.5 mt-2">
                                  <Button
                                    size="sm"
                                    className="h-7 flex-1 rounded-lg text-xs"
                                    disabled={approving === item.id}
                                    onClick={(e) => { e.stopPropagation(); approveAccess(item.id); }}
                                  >
                                    {approving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                    Autorizar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 flex-1 rounded-lg text-xs"
                                    onClick={(e) => { e.stopPropagation(); setBlocking({ id: item.id, acessos }); }}
                                  >
                                    <Ban className="h-3 w-3" /> Bloquear
                                  </Button>
                                </div>
                              )}

                              {/* Approval info on authorized/blocked items */}
                              {col.id !== 'acessado' && item.aprovado_por && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground">
                                    {col.id === 'liberado' ? 'Autorizado' : 'Bloqueado'} por: <span className="font-medium text-foreground">{item.aprovado_por}</span>
                                  </p>
                                  {item.data_aprovacao && (
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(item.data_aprovacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                  {item.motivo_bloqueio && (
                                    <p className="text-xs text-destructive mt-1">Motivo: {item.motivo_bloqueio}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {col.id === 'acessado' ? 'Nenhum veículo aguardando' : 'Arraste veículos para cá'}
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Block reason modal */}
      {blocking && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <h2 className="font-heading font-bold text-lg">Bloquear Acesso</h2>
              </div>
              <button onClick={() => { setBlocking(null); setMotivo(''); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Informe o motivo do bloqueio do veículo <span className="font-medium text-foreground">{blocking.acessos.find(a => a.id === blocking.id)?.veiculo_placa}</span>. O operador será notificado.
            </p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Documentação irregular, veículo com pendência..."
              rows={3}
              className="w-full p-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => { setBlocking(null); setMotivo(''); }}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 h-11 rounded-xl" disabled={!motivo.trim() || moving === blocking.id} onClick={confirmBlock}>
                {moving === blocking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Confirmar Bloqueio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}