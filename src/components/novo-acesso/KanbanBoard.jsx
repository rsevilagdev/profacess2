import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, CheckCircle, AlertTriangle, Truck, X, ShieldCheck, Ban, Loader2, User, LogIn, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { getCuritibaISO, getSixMonthsFromNow, formatCuritiba } from '@/lib/curitiba-time.js';

const COLUMNS = [
  { id: 'pendente_revisao', title: 'Pendente de Revisão', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  { id: 'validado', title: 'Validado / Em Carga', icon: Truck, color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  { id: 'bloqueado', title: 'Bloqueado', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
];

export default function KanbanBoard({ acessos, saidas, onRefresh, colaborador, onLiberarSaida }) {
  const [moving, setMoving] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [approving, setApproving] = useState(null);
  const [liberando, setLiberando] = useState(null);
  const [liberandoItem, setLiberandoItem] = useState(null);
  const [liberandoObs, setLiberandoObs] = useState('');
  const [reEntering, setReEntering] = useState(null);
  const [reEntryItem, setReEntryItem] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const canApproveBlock = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);
  const canLiberar = ['administrador_master', 'administrador', 'encarregado', 'operador'].includes(colaborador?.cargo);
  const canDelete = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  // Itens liberados (tipo='saida') saem do kanban de fluxo
  const activeAcessos = acessos.filter(a => a.tipo !== 'saida');

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = activeAcessos.filter(a => a.status === col.id);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    if (!canApproveBlock) return;
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const item = acessos.find(a => a.id === draggableId);
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');

    if (newStatus === 'bloqueado') {
      setBlocking({ id: draggableId, acessos });
      return;
    }
    setMoving(draggableId);
    try {
      if (item?.source === 'vehicle') {
        const vehicleUpdate = { status: newStatus };
        if (newStatus === 'validado') {
          vehicleUpdate.data_cadastro = getCuritibaISO();
          vehicleUpdate.data_validade = getSixMonthsFromNow();
        }
        await base44.entities.Vehicle.update(item.vehicle_id, vehicleUpdate);
        await base44.entities.AccessLog.create({
          veiculo_placa: item.veiculo_placa, motorista_nome: item.motorista_nome || '', motorista_cpf: item.motorista_cpf || '',
          filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome, tipo: 'entrada', status: newStatus,
          empresa: item.empresa || '', operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
          aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf, data_aprovacao: getCuritibaISO(),
        });
      } else {
        await base44.entities.AccessLog.update(draggableId, {
          status: newStatus, aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf, data_aprovacao: getCuritibaISO(),
        });
      }
      await logApproval(draggableId, newStatus, acessos, null);
      onRefresh();
    } catch (e) {}
    setMoving(null);
  };

  const approveAccess = async (id) => {
    setApproving(id);
    try {
      const item = acessos.find(a => a.id === id);
      const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
      if (item?.source === 'vehicle') {
        await base44.entities.Vehicle.update(item.vehicle_id, { status: 'validado', data_cadastro: getCuritibaISO(), data_validade: getSixMonthsFromNow() });
        await base44.entities.AccessLog.create({
          veiculo_placa: item.veiculo_placa, motorista_nome: item.motorista_nome || '', motorista_cpf: item.motorista_cpf || '',
          filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome, tipo: 'entrada', status: 'validado',
          empresa: item.empresa || '', operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
          aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf, data_aprovacao: getCuritibaISO(),
        });
      } else {
        await base44.entities.AccessLog.update(id, {
          status: 'validado', aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf,
          data_aprovacao: getCuritibaISO(), motivo_bloqueio: '',
        });
      }
      await logApproval(id, 'validado', acessos, null);
      onRefresh();
    } catch (e) {}
    setApproving(null);
  };

  const confirmBlock = async () => {
    if (!blocking || !motivo.trim()) return;
    setMoving(blocking.id);
    try {
      const item = acessos.find(a => a.id === blocking.id);
      const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
      if (item?.source === 'vehicle') {
        await base44.entities.Vehicle.update(item.vehicle_id, { status: 'bloqueado' });
        await base44.entities.AccessLog.create({
          veiculo_placa: item.veiculo_placa, motorista_nome: item.motorista_nome || '', motorista_cpf: item.motorista_cpf || '',
          filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome, tipo: 'entrada', status: 'bloqueado',
          empresa: item.empresa || '', operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
          aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf, data_aprovacao: getCuritibaISO(),
          motivo_bloqueio: motivo.trim(),
        });
      } else {
        await base44.entities.AccessLog.update(blocking.id, {
          status: 'bloqueado', aprovado_por: editorName, aprovado_por_cpf: colaborador.cpf,
          data_aprovacao: getCuritibaISO(), motivo_bloqueio: motivo.trim(),
        });
      }
      await logApproval(blocking.id, 'bloqueado', acessos, motivo.trim());
      onRefresh();
    } catch (e) {}
    setBlocking(null); setMotivo(''); setMoving(null);
  };

  const reEntry = async (item) => {
    setReEntering(item.id);
    try {
      await base44.entities.AccessLog.create({
        veiculo_placa: item.veiculo_placa, motorista_nome: item.motorista_nome || '', motorista_cpf: item.motorista_cpf || '',
        filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome, tipo: 'entrada', status: 'validado',
        empresa: item.empresa || '', operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: 'Re-entrada de veículo', details: `Placa: ${item.veiculo_placa} | Motorista: ${item.motorista_nome || '—'}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      onRefresh();
    } catch (e) {}
    setReEntering(null);
  };

  const deleteItem = async (item) => {
    setDeleting(item.id);
    try {
      if (item.source === 'vehicle' && item.vehicle_id) {
        await base44.entities.Vehicle.delete(item.vehicle_id);
      } else {
        await base44.entities.AccessLog.delete(item.id);
      }
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        user_cpf: colaborador.cpf,
        action: 'Registro excluído do Kanban',
        details: `Placa: ${item.veiculo_placa} | Motorista: ${item.motorista_nome || '—'}`,
        ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
      });
      onRefresh();
    } catch (e) {}
    setDeleting(null);
    setDeleteConfirm(null);
  };

  const logApproval = async (id, newStatus, allAcessos, blockReason) => {
    const log = allAcessos.find(a => a.id === id);
    if (!log) return;
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    const action = newStatus === 'validado' ? 'Acesso autorizado' : 'Acesso bloqueado';
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
          title: newStatus === 'validado' ? 'Acesso Validado' : 'Acesso Bloqueado',
          message: `Veículo ${log.veiculo_placa} — ${newStatus === 'validado' ? 'validado' : 'bloqueado'} por ${editorName}${blockReason ? ' | Motivo: ' + blockReason : ''}`,
          type: newStatus === 'validado' ? 'vehicle_release' : 'admin_ops',
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
        {!canApproveBlock && (
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
                <Droppable droppableId={col.id} isDropDisabled={!canApproveBlock}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[120px]">
                      {items.map((item, idx) => (
                        <Draggable key={item.id} draggableId={item.id} index={idx} isDragDisabled={!canApproveBlock || col.id === 'validado'}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`bg-card rounded-xl p-3 border border-border shadow-sm ${canApproveBlock ? 'cursor-grab active:cursor-grabbing' : ''} ${moving === item.id ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                                <p className="text-sm font-medium">{item.veiculo_placa}</p>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.motorista_nome || '—'}</span>
                                <span>{formatCuritiba(item.created_date, { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {item.carregado && (
                                <span className="inline-block mt-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Carregado</span>
                              )}
                              {item.operador_nome && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {item.operador_nome}
                                </p>
                              )}

                              {/* Delete button — apenas para pendentes de revisão */}
                              {canDelete && col.id === 'pendente_revisao' && (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 w-full rounded-lg text-xs"
                                    disabled={deleting === item.id}
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item); }}
                                  >
                                    {deleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    Apagar Registro
                                  </Button>
                                </div>
                              )}

                              {/* Approval actions on pending items */}
                              {col.id === 'pendente_revisao' && canApproveBlock && (
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
                              {col.id !== 'pendente_revisao' && item.aprovado_por && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <p className="text-xs text-muted-foreground">
                                    {col.id === 'validado' ? 'Validado' : 'Bloqueado'} por: <span className="font-medium text-foreground">{item.aprovado_por}</span>
                                  </p>
                                  {item.data_aprovacao && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatCuritiba(item.data_aprovacao, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                  {item.motivo_bloqueio && (
                                    <p className="text-xs text-destructive mt-1">Motivo: {item.motivo_bloqueio}</p>
                                  )}
                                </div>
                              )}

                              {/* Liberar saída — pergunta se vazio ou carregado */}
                              {col.id === 'validado' && canLiberar && item.source !== 'vehicle' && (
                                <Button
                                  size="sm"
                                  className="h-7 w-full rounded-lg text-xs mt-2"
                                  disabled={liberando === item.id}
                                  onClick={(e) => { e.stopPropagation(); setLiberandoItem(item); }}
                                >
                                  {liberando === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                  Liberar Saída
                                </Button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {col.id === 'pendente_revisao' ? 'Nenhum veículo aguardando' : 'Arraste veículos para cá'}
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

      {/* Veículos que já deram saída — re-entrada */}
      {saidas && saidas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <LogIn className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Veículos que já deram saída — Re-entrada</h4>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {saidas.map(item => (
              <div key={item.id} className="bg-muted/50 rounded-xl p-3 border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <p className="text-sm font-medium">{item.veiculo_placa}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.motorista_nome || '—'}</p>
                {item.empresa && <p className="text-xs text-muted-foreground">{item.empresa}</p>}
                <p className="text-xs text-muted-foreground mt-1">Saída: {formatCuritiba(item.data_aprovacao || item.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                <Button
                  size="sm"
                  className="h-8 w-full rounded-lg text-xs mt-2"
                  disabled={reEntering === item.id}
                  onClick={() => setReEntryItem(item)}
                >
                  {reEntering === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                  Dar Entrada
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liberar saída — vazio ou carregado */}
      {liberandoItem && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Liberar Saída</h2>
              </div>
              <button onClick={() => { setLiberandoItem(null); setLiberandoObs(''); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              O veículo <span className="font-medium text-foreground">{liberandoItem.veiculo_placa}</span> está saindo vazio ou carregado?
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações (opcional)</label>
              <textarea
                value={liberandoObs}
                onChange={e => setLiberandoObs(e.target.value)}
                placeholder="Motorista ou segurança podem declarar algo..."
                rows={2}
                className="w-full p-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="h-14 rounded-2xl flex-col gap-1"
                disabled={liberando === liberandoItem.id}
                onClick={async () => {
                  setLiberando(liberandoItem.id);
                  await onLiberarSaida({ ...liberandoItem, carregado: false, observacao_saida: liberandoObs.trim() });
                  setLiberando(null); setLiberandoItem(null); setLiberandoObs('');
                }}
              >
                <Truck className="h-5 w-5" />
                <span className="text-xs">Vazio</span>
              </Button>
              <Button
                className="h-14 rounded-2xl flex-col gap-1"
                disabled={liberando === liberandoItem.id}
                onClick={async () => {
                  setLiberando(liberandoItem.id);
                  await onLiberarSaida({ ...liberandoItem, carregado: true, observacao_saida: liberandoObs.trim() });
                  setLiberando(null); setLiberandoItem(null); setLiberandoObs('');
                }}
              >
                {liberando === liberandoItem.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                <span className="text-xs">Carregado</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Re-entry confirmation modal */}
      {reEntryItem && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Confirmar Re-entrada</h2>
              </div>
              <button onClick={() => setReEntryItem(null)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Confirme os dados do veículo e motorista para registrar a nova entrada:</p>
            <div className="space-y-3 mb-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Truck className="h-3 w-3" /> Veículo</p>
                <p className="font-medium">{reEntryItem.veiculo_placa}</p>
                {reEntryItem.empresa && <p className="text-xs text-muted-foreground">{reEntryItem.empresa}</p>}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Motorista</p>
                <p className="font-medium">{reEntryItem.motorista_nome || '—'}</p>
                {reEntryItem.motorista_cpf && <p className="text-xs text-muted-foreground">CPF: {reEntryItem.motorista_cpf}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => setReEntryItem(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl"
                disabled={reEntering === reEntryItem.id}
                onClick={async () => {
                  const item = reEntryItem;
                  setReEntryItem(null);
                  await reEntry(item);
                }}
              >
                {reEntering === reEntryItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirmar Entrada
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <h2 className="font-heading font-bold text-lg">Apagar Registro</h2>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tem certeza que deseja apagar permanentemente este registro?
              <span className="block mt-2 font-medium text-foreground">{deleteConfirm.veiculo_placa} — {deleteConfirm.motorista_nome || '—'}</span>
              <span className="block text-xs mt-1">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1 h-11 rounded-xl" disabled={deleting === deleteConfirm.id} onClick={() => deleteItem(deleteConfirm)}>
                {deleting === deleteConfirm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Apagar
              </Button>
            </div>
          </div>
        </div>
      )}

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