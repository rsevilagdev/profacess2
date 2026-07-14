import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X, Flag, CheckCircle, Clock, Loader2, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const STATUS_OPTS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-orange-500/10 text-orange-600', icon: Clock },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600', icon: Loader2 },
  { value: 'concluida', label: 'Concluída', color: 'bg-primary/10 text-primary', icon: CheckCircle },
];
const PRIORIDADE_OPTS = [
  { value: 'baixa', label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'alta', label: 'Alta', color: 'bg-destructive/10 text-destructive' },
];

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PlanoTrabalho() {
  const { colaborador } = useProfarmaAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('lista');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titulo: '', descricao: '', status: 'pendente', prioridade: 'media', data_limite: '', responsavel: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadTasks = async () => {
    const list = await base44.entities.Task.list('-created_date', 500);
    setTasks(list); setLoading(false);
  };

  useEffect(() => {
    const sub = base44.entities.Task.subscribe(() => loadTasks());
    loadTasks();
    return sub;
  }, []);

  const save = async () => {
    if (!form.titulo) return;
    const data = { ...form, responsavel: form.responsavel || colaborador.nome, filial_id: colaborador.filial_id };
    if (editing) {
      await base44.entities.Task.update(editing.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome, user_cpf: colaborador.cpf,
      action: editing ? 'Tarefa editada' : 'Tarefa criada',
      details: form.titulo, ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
    });
    setShowForm(false); loadTasks();
  };

  const remove = async (t) => {
    await base44.entities.Task.delete(t.id);
    loadTasks();
  };

  const quickStatus = async (t, newStatus) => {
    await base44.entities.Task.update(t.id, { status: newStatus });
    loadTasks();
  };

  const openNew = (dateStr) => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', status: 'pendente', prioridade: 'media', data_limite: dateStr || '', responsavel: colaborador.nome });
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm(t);
    setShowForm(true);
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const tasksOnDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.data_limite === dateStr);
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const statusIcon = (status) => STATUS_OPTS.find(s => s.value === status)?.icon || Clock;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Plano de Trabalho</h1>
          <p className="text-sm text-muted-foreground">Tarefas e compromissos da equipe</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-card rounded-2xl border border-border p-1">
            <button onClick={() => setView('lista')} className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'lista' ? 'bg-primary text-primary-foreground' : ''}`}>
              <ListChecks className="h-4 w-4 inline mr-1" /> Lista
            </button>
            <button onClick={() => setView('calendario')} className={`px-4 py-2 rounded-xl text-sm font-medium ${view === 'calendario' ? 'bg-primary text-primary-foreground' : ''}`}>
              <Calendar className="h-4 w-4 inline mr-1" /> Calendário
            </button>
          </div>
          <Button onClick={() => openNew('')} className="h-12 rounded-2xl">
            <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      ) : view === 'lista' ? (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>Todas ({tasks.length})</button>
            {STATUS_OPTS.map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filterStatus === s.value ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                {s.label} ({tasks.filter(t => t.status === s.value).length})
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 shadow-sm text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
              </div>
            ) : (
              filtered.map(t => {
                const sOpt = STATUS_OPTS.find(s => s.value === t.status) || STATUS_OPTS[0];
                const pOpt = PRIORIDADE_OPTS.find(p => p.value === t.prioridade) || PRIORIDADE_OPTS[0];
                const SIcon = sOpt.icon;
                return (
                  <div key={t.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <button onClick={() => quickStatus(t, t.status === 'concluida' ? 'pendente' : 'concluida')} className="mt-0.5 shrink-0">
                        <SIcon className={`h-5 w-5 ${t.status === 'concluida' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>{t.titulo}</p>
                        {t.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sOpt.color}`}>{sOpt.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${pOpt.color}`}><Flag className="h-2.5 w-2.5" />{pOpt.label}</span>
                          {t.data_limite && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.data_limite + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          {t.responsavel && <span className="text-xs text-muted-foreground">· {t.responsavel}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {t.status !== 'concluida' && (
                          <button onClick={() => quickStatus(t, 'em_andamento')} className="h-8 px-2 rounded-lg text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Iniciar</button>
                        )}
                        <button onClick={() => openEdit(t)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => remove(t)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Calendar View */
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="h-9 w-9 rounded-xl hover:bg-accent flex items-center justify-center"><ChevronLeft /></button>
            <h3 className="font-heading font-bold text-lg">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="h-9 w-9 rounded-xl hover:bg-accent flex items-center justify-center"><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={i} className="min-h-[80px] rounded-lg bg-muted/20" />;
              const dayTasks = tasksOnDay(day);
              return (
                <div key={i} className={`min-h-[80px] rounded-lg border p-1 cursor-pointer hover:border-primary/40 transition-colors ${isToday(day) ? 'border-primary bg-primary/5' : 'border-border/50'}`}
                  onClick={() => openNew(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}>
                  <p className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${t.status === 'concluida' ? 'bg-primary/10 text-primary line-through' : t.prioridade === 'alta' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`} title={t.titulo}>
                        {t.titulo}
                      </div>
                    ))}
                    {dayTasks.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">{editing ? 'Editar' : 'Nova'} Tarefa</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Título *" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} />
              <textarea className="w-full px-3 py-2 rounded-xl border border-input bg-transparent min-h-[60px]" placeholder="Descrição" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <select className="h-10 px-3 rounded-xl border border-input bg-card text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select className="h-10 px-3 rounded-xl border border-input bg-card text-sm" value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                  {PRIORIDADE_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <input type="date" className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" value={form.data_limite || ''} onChange={e => setForm({...form, data_limite: e.target.value})} />
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Responsável" value={form.responsavel || ''} onChange={e => setForm({...form, responsavel: e.target.value})} />
              <Button onClick={save} className="w-full h-12 rounded-2xl">Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}