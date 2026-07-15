import { useState, useEffect } from 'react';
import { Bell, BellRing, Save, Loader2, Check, Truck, LogOut, FileText, Shield, Mail } from 'lucide-react';
import WhatsAppNotifCard from '@/components/notificacoes/WhatsAppNotifCard';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const NOTIF_TYPES = [
  { key: 'notification_vehicle_release', label: 'Liberação de Veículos', icon: Truck, desc: 'Alertas quando veículos são liberados ou bloqueados' },
  { key: 'notification_entry_exit', label: 'Entrada e Saída', icon: LogOut, desc: 'Notificações de entrada e saída de veículos' },
  { key: 'notification_driver_docs', label: 'Documentação de Motoristas', icon: FileText, desc: 'Alertas sobre validade de CNH e documentos' },
  { key: 'notification_admin_ops', label: 'Operações Administrativas', icon: Shield, desc: 'Notificações de operações administrativas' },
];

export default function ConfiguracoesNotificacoes() {
  const { colaborador } = useProfarmaAuth();
  const [users, setUsers] = useState([]);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailShiftSummary, setEmailShiftSummary] = useState(true);
  const [shiftTimes, setShiftTimes] = useState({ morning: '14:00', evening: '22:00' });

  useEffect(() => {
    base44.entities.Colaborador.list().then(list => {
      setUsers(list.filter(u => u.ativo));
      const map = {};
      list.filter(u => u.ativo).forEach(u => {
        map[u.id] = {
          notification_vehicle_release: u.notification_vehicle_release ?? true,
          notification_entry_exit: u.notification_entry_exit ?? true,
          notification_driver_docs: u.notification_driver_docs ?? true,
          notification_admin_ops: u.notification_admin_ops ?? true,
          email: u.email || '',
        };
      });
      setConfigs(map);
      setLoading(false);
    });
  }, []);

  const toggle = (userId, key) => {
    setConfigs(prev => ({ ...prev, [userId]: { ...prev[userId], [key]: !prev[userId][key] } }));
    setSaved(false);
  };

  const updateEmail = (userId, value) => {
    setConfigs(prev => ({ ...prev, [userId]: { ...prev[userId], email: value } }));
    setSaved(false);
  };

  const toggleAll = (key, value) => {
    const map = { ...configs };
    Object.keys(map).forEach(uid => { map[uid] = { ...map[uid], [key]: value }; });
    setConfigs(map);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(configs).map(([userId, cfg]) =>
        base44.entities.Colaborador.update(userId, {
          notification_vehicle_release: cfg.notification_vehicle_release,
          notification_entry_exit: cfg.notification_entry_exit,
          notification_driver_docs: cfg.notification_driver_docs,
          notification_admin_ops: cfg.notification_admin_ops,
          email: cfg.email,
        })
      );
      await Promise.all(updates);
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome,
        user_cpf: colaborador.cpf, action: 'Configurações de notificação atualizadas',
        details: `Notificações de ${users.length} usuários atualizadas | Resumo de turnos: ${emailShiftSummary ? 'ativo' : 'inativo'} (${shiftTimes.morning}, ${shiftTimes.evening})`,
        ip_address: 'local', domain: window.location.hostname, category: 'user_management', branch_id: colaborador.filial_id
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {}
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Configurações de Notificações</h1>
          <p className="text-sm text-muted-foreground">Configure alertas e notificações por e-mail para cada usuário</p>
        </div>
        <Button onClick={save} disabled={saving} className="h-12 rounded-2xl">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Tudo'}
        </Button>
      </div>

      {/* WhatsApp Connection */}
      <WhatsAppNotifCard />

      {/* Shift Summary Settings */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BellRing className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Resumo de Turnos por E-mail</h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted cursor-pointer">
            <div>
              <p className="text-sm font-medium">Enviar resumo de turnos aos gestores</p>
              <p className="text-xs text-muted-foreground">E-mails automáticos no final de cada turno (seg-sáb)</p>
            </div>
            <button onClick={() => setEmailShiftSummary(!emailShiftSummary)} className={`h-6 w-11 rounded-full transition-colors ${emailShiftSummary ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${emailShiftSummary ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>
          {emailShiftSummary && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horário turno da manhã</label>
                <input type="time" value={shiftTimes.morning} onChange={e => setShiftTimes({ ...shiftTimes, morning: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horário turno da noite</label>
                <input type="time" value={shiftTimes.evening} onChange={e => setShiftTimes({ ...shiftTimes, evening: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Notifications */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Preferências por Usuário</h3>

        {/* Header with bulk actions */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium">Usuário</th>
                {NOTIF_TYPES.map(t => (
                  <th key={t.key} className="text-center p-2 font-medium text-xs whitespace-nowrap">
                    {t.label}
                    <div className="flex gap-1 justify-center mt-1">
                      <button onClick={() => toggleAll(t.key, true)} className="text-[10px] text-primary hover:underline">Todos</button>
                      <button onClick={() => toggleAll(t.key, false)} className="text-[10px] text-muted-foreground hover:underline">Nenhum</button>
                    </div>
                  </th>
                ))}
                <th className="text-center p-2 font-medium text-xs">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-2">
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">{u.cargo}</p>
                  </td>
                  {NOTIF_TYPES.map(t => (
                    <td key={t.key} className="text-center p-2">
                      <button onClick={() => toggle(u.id, t.key)} className={`h-6 w-11 rounded-full transition-colors ${configs[u.id]?.[t.key] ? 'bg-primary' : 'bg-muted'}`}>
                        <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${configs[u.id]?.[t.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                  ))}
                  <td className="p-2">
                    <input type="email" value={configs[u.id]?.email || ''} onChange={e => updateEmail(u.id, e.target.value)} placeholder="email@..." className="w-full h-8 px-2 rounded-lg border border-input bg-transparent text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification type descriptions */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Tipos de Notificação</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {NOTIF_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}