import { useState, useRef } from 'react';
import { User, Camera, Mail, Phone, IdCard, Building2, Shield, Save, Send, Loader2, Check, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import PerfilHistorico from '@/components/perfil/PerfilHistorico';
import WhatsAppNotifCard from '@/components/notificacoes/WhatsAppNotifCard';

export default function Perfil() {
  const { colaborador, updateColaborador } = useProfarmaAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: colaborador?.nome || '', email: colaborador?.email || '', telefone: colaborador?.telefone || '',
    matricula: colaborador?.matricula || '', foto_perfil: colaborador?.foto_perfil || ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestForm, setRequestForm] = useState({ motivo: '', paginas: '' });
  const [mainTab, setMainTab] = useState('perfil');
  const fileRef = useRef(null);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Colaborador.update(colaborador.id, form);
      updateColaborador(form);
      await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action: 'Perfil atualizado', ip_address: 'local', domain: window.location.hostname, category: 'user_management' });
      setEditing(false);
    } catch (e) {}
    setSaving(false);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, foto_perfil: file_url }));
    } catch (e) {}
    setUploading(false);
  };

  const sendRequest = async () => {
    try {
      const admins = await base44.entities.Colaborador.list();
      const dest = admins.filter(a => a.email && (a.cargo === 'administrador_master' || a.cargo === 'administrador'));
      for (const admin of dest) {
        await base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'Solicitação de Novas Permissões - PROFARMA',
          body: `Usuário: ${colaborador.nome} (CPF: ${colaborador.cpf})\n\nMotivo: ${requestForm.motivo}\nPáginas/Permissões solicitadas: ${requestForm.paginas}`
        });
      }
      await base44.entities.AuditLog.create({ user_name: colaborador.nome, user_cpf: colaborador.cpf, action: 'Solicitação de permissões', details: requestForm.motivo, ip_address: 'local', domain: window.location.hostname, category: 'user_management' });
      setRequestSent(true);
      setTimeout(() => { setRequestSent(false); setShowRequest(false); setRequestForm({ motivo: '', paginas: '' }); }, 3000);
    } catch (e) {}
  };

  const initials = colaborador?.nome?.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gestão de dados pessoais e permissões</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${mainTab === 'perfil' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          <User className="h-4 w-4" /> Dados Pessoais
        </button>
        <button
          onClick={() => setMainTab('historico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${mainTab === 'historico' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
        >
          <Clock className="h-4 w-4" /> Histórico
        </button>
      </div>

      {mainTab === 'historico' && <PerfilHistorico colaborador={colaborador} />}

      {mainTab === 'perfil' && (
      <>
      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl overflow-hidden bg-primary/10 flex items-center justify-center">
              {form.foto_perfil ? <img src={form.foto_perfil} alt="Foto" className="h-full w-full object-cover" /> : <span className="text-2xl font-bold text-primary">{initials}</span>}
            </div>
            {editing && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-lg">{colaborador?.nome}</h2>
            <p className="text-sm text-muted-foreground">{colaborador?.cargo}</p>
            <p className="text-xs text-muted-foreground">Filial: {colaborador?.filial_nome || '—'}</p>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="secondary" className="h-10 rounded-xl">Editar</Button>
          ) : (
            <Button onClick={save} disabled={saving} className="h-10 rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Nome</label>
            {editing ? <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /> : <p className="text-sm font-medium">{colaborador?.nome}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><IdCard className="h-3 w-3" /> CPF</label>
            <p className="text-sm font-medium">{colaborador?.cpf}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><IdCard className="h-3 w-3" /> Matrícula</label>
            {editing ? <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm" value={form.matricula} onChange={e => setForm({...form, matricula: e.target.value})} /> : <p className="text-sm font-medium">{colaborador?.matricula || '—'}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</label>
            {editing ? <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /> : <p className="text-sm font-medium">{colaborador?.email || '—'}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</label>
            {editing ? <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} /> : <p className="text-sm font-medium">{colaborador?.telefone || '—'}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Filial</label>
            <p className="text-sm font-medium">{colaborador?.filial_nome || '—'}</p>
          </div>
        </div>

        {/* Terms Status */}
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-muted/50">
          <Shield className={`h-4 w-4 ${colaborador?.termos_aceitos ? 'text-primary' : 'text-orange-500'}`} />
          <span className="text-sm">Termos de Uso: {colaborador?.termos_aceitos ? `Aceitos em ${colaborador?.termos_data}` : 'Pendentes'}</span>
        </div>
      </div>

      {/* WhatsApp Notifications */}
      <WhatsAppNotifCard />

      {/* Permission Request */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Solicitar Novas Permissões</h3>
          <Button onClick={() => setShowRequest(!showRequest)} variant="secondary" className="h-10 rounded-xl">{showRequest ? 'Cancelar' : 'Solicitar'}</Button>
        </div>
        {showRequest && (
          <div className="space-y-3 fade-in">
            <input className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm" placeholder="Páginas/permissões solicitadas (ex: /relatorios, /configuracoes)" value={requestForm.paginas} onChange={e => setRequestForm({...requestForm, paginas: e.target.value})} />
            <textarea className="w-full px-3 py-2 rounded-xl border border-input bg-transparent text-sm min-h-[80px]" placeholder="Motivo da solicitação" value={requestForm.motivo} onChange={e => setRequestForm({...requestForm, motivo: e.target.value})} />
            <Button onClick={sendRequest} disabled={requestSent} className="w-full h-12 rounded-2xl">
              {requestSent ? <><Check className="h-5 w-5" /> Solicitação Enviada!</> : <><Send className="h-4 w-4" /> Enviar Solicitação</>}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">As solicitações são enviadas por email aos administradores. Após aprovação, as permissões serão adicionadas automaticamente.</p>
      </div>
      </>
      )}
    </div>
  );
}