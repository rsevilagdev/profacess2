import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, CheckCircle, AlertTriangle, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';


const COLUMNS = [
  { id: 'acessado', title: 'Aguardando Autorização', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  { id: 'liberado', title: 'Autorizado / Em Carga', icon: Truck, color: 'text-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  { id: 'bloqueado', title: 'Bloqueado', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
];

export default function KanbanBoard({ acessos, onRefresh }) {
  const [moving, setMoving] = useState(null);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = acessos.filter(a => a.status === col.id);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    setMoving(draggableId);
    try {
      await base44.entities.AccessLog.update(draggableId, { status: newStatus });
      onRefresh();
    } catch (e) {}
    setMoving(null);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <h3 className="font-heading font-bold mb-4">Kanban de Veículos — Fluxo de Liberação</h3>
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
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[120px]">
                      {items.map((item, idx) => (
                        <Draggable key={item.id} draggableId={item.id} index={idx}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`bg-card rounded-xl p-3 border border-border shadow-sm cursor-grab active:cursor-grabbing ${moving === item.id ? 'opacity-50' : ''}`}
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
                              {item.filial_nome && (
                                <p className="text-xs text-muted-foreground mt-1">{item.filial_nome}</p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Arraste veículos para cá</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}