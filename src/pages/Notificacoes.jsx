import { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Check, Loader2, X, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

export default function Notificacoes() {
  const { colaborador } = useProfarmaAuth();
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'admin_ops', targetUserIds: [] });
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    const [notifs, usersList] = await Promise.all([
      base44.entities.Notification.list('-created_date', 50),
      base44.entities.Colaborador.list(),
    ]);
    // Show only notifications targeted to me or broadcast (no target_user_id)
    const mine = notifs.filter(n => !n.target_user_id || n.target_user_id === colaborador?.id);
    setNotifications(mine);
    setUsers(usersList.filter(u => u.ativo));
  };

  useEffect(() => { loadData(); }, [colaborador]);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Notification.subscribe(() => loadData());
    return unsubscribe;
  }, [colaborador]);

  const toggleUser = (userId) => {
    setForm(prev => ({
      ...prev,
      targetUserIds: prev.targetUserIds.includes(userId)
        ? prev.targetUserIds.filter(id => id !== userId)
        : [...prev.targetUserIds, userId]
    }));
  };

  const send = async () => {
    if (!form.title) return;
    setSending(true);
    const senderName = colaborador.nome;
    const targets = form.targetUserIds.length > 0 ? form.targetUserIds : users.map(u => u.id);

    for (const userId of targets) {
      const target = users.find(u => u.id === userId);
      await base44.entities.Notification.create({
        ...form, sender_name: senderName, read: false, target_user_id: userId
      });
      if (target?.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: target.email, subject: form.title, body: form.message || '',
            from_name: 'PROFARMA LIBERAAUTO PRO'
          });
        } catch (e) {}
      }
    }

    await base44.entities.AuditLog.create({
      user_name: senderName, user_cpf: colaborador.cpf,
      action: 'Notificação enviada',
      details: `Título: ${form.title} | Destinatários: ${targets.length}`,
      ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
    });

    setForm({ title: '', message: '', type: 'admin_ops', targetUserIds: [] });
    setShowForm(false); setSending(false); loadData();
  };

  const markRead = async (id) => { await base44.entities.Notification.update(id, { read: true }); loadData(); };
  const remove = async (id) => { await base44.entities.Notification.delete(id); loadData(); };

  const userDisplayName = (u) => `${u.nome} — Mat: ${u.matricula || 'N/A'}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brand-title text-2xl">Notificações</h1>
          <p className="text-sm text-muted-foreground">Central de comunicados do sistema</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-12 rounded-2xl">
          <Send className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {notifications.length === 0 ? (
          <div className="text-center py-12"><Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Nenhuma notificação</p></div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.read ? 'bg-muted/30' : 'bg-primary/5'}`}>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Bell className={`h-5 w-5 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString('pt-BR')} · {n.sender_name}</p>
                </div>
                <div className="flex gap-1">
                  {!n.read && <button onClick={() => markRead(n.id)} className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center"><Check className="h-4 w-4" /></button>}
                  <button onClick={() => remove(n.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">Nova Notificação</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent" placeholder="Título" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <textarea className="w-full px-3 py-2 rounded-xl border border-input bg-transparent min-h-[80px]" placeholder="Mensagem" value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
              <select className="w-full h-10 px-3 rounded-xl border border-input bg-card" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="admin_ops">Operações Administrativas</option>
                <option value="vehicle_release">Liberação de Veículos</option>
                <option value="driver_docs">Documentação de Motoristas</option>
                <option value="entry_exit">Entradas e Saídas</option>
              </select>

              {/* User selection */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Destinatários {form.targetUserIds.length > 0 && `(${form.targetUserIds.length} selecionados)`}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Selecione um ou mais usuários. Deixe vazio para enviar a todos.</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={form.targetUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="h-4 w-4" />
                      <span className="text-sm">{userDisplayName(u)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1 h-12 rounded-2xl">Cancelar</Button>
                <Button onClick={send} disabled={sending} className="flex-1 h-12 rounded-2xl">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}