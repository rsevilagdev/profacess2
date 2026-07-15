import { useState, useEffect } from 'react';
import {
  X, Loader2, User, IdCard, Mail, Phone, Building2, Shield, Clock,
  Car, ArrowDownToLine, ArrowUpFromLine, Truck, UserCheck, FileText,
  Search, ChevronLeft, ChevronRight, MessageCircle, Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCuritiba } from '@/lib/curitiba-time.js';
import { maskCPF } from '@/lib/lgpd-utils.js';

const PAGE_SIZE = 8;

export default function UserProfileModal({ colaborador, onClose }) {
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({
    accessLogs: [],
    fornecedores: [],
    visitantes: [],
    veiculos: [],
    crdk: [],
    auditoria: [],
  });

  useEffect(() => {
    if (!colaborador) return;
    loadData();
  }, [colaborador]);

  const loadData = async () => {
    setLoading(true);
    try {
      const nome = colaborador.nome?.trim().toUpperCase();
      const sobrenome = colaborador.sobrenome?.trim().toUpperCase();
      const nomeCompleto = (nome + (sobrenome ? ' ' + sobrenome : '')).toUpperCase();
      const cpf = colaborador.cpf?.replace(/\D/g, '');
      const cpfFormatted = colaborador.cpf;

      const [logs, forn, visit, veics, crdk, audit] = await Promise.all([
        base44.entities.AccessLog.list('-created_date', 500).catch(() => []),
        base44.entities.ControleFornecedores.list('-created_date', 500).catch(() => []),
        base44.entities.ControleVisitantes.list('-created_date', 500).catch(() => []),
        base44.entities.VeiculoColaborador.list('-created_date', 500).catch(() => []),
        base44.entities.AcessoCRDK.list('-created_date', 500).catch(() => []),
        base44.entities.AuditLog.list('-created_date', 500).catch(() => []),
      ]);

      const matchName = (val) => {
        if (!val) return false;
        const v = val.trim().toUpperCase();
        return v === nome || v === nomeCompleto || (nome && v.includes(nome));
      };

      setData({
        accessLogs: logs.filter(l => matchName(l.operador_nome) || matchName(l.motorista_nome) || (cpf && l.operador_cpf?.replace(/\D/g, '') === cpf)),
        fornecedores: forn.filter(f => matchName(f.operador_nome) || matchName(f.entrada_liberado_por) || matchName(f.saida_liberado_por)),
        visitantes: visit.filter(v => matchName(v.vigilante)),
        veiculos: veics.filter(v => matchName(v.operador_nome) || matchName(v.nome)),
        crdk: crdk.filter(c => matchName(c.operador_nome) || matchName(c.nome)),
        auditoria: audit.filter(a => a.user_cpf?.replace(/\D/g, '') === cpf || matchName(a.user_name)),
      });
    } catch (e) {}
    setLoading(false);
  };

  const currentList = data[tab] || [];
  const filtered = currentList.filter(r => {
    if (!search) return true;
    return JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (page >= totalPages && page !== 0) setPage(0);

  if (!colaborador) return null;

  const initials = colaborador.nome?.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/70 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-lg truncate">{colaborador.nome} {colaborador.sobrenome || ''}</h2>
              <p className="text-xs text-muted-foreground">{colaborador.cargo} · {colaborador.filial_nome || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-muted flex items-center justify-center shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 overflow-x-auto shrink-0">
          <TabButton active={tab === 'info'} onClick={() => { setTab('info'); setPage(0); }} icon={User} label="Perfil" />
          <TabButton active={tab === 'accessLogs'} onClick={() => { setTab('accessLogs'); setPage(0); }} icon={ArrowDownToLine} label={`Acessos (${data.accessLogs.length})`} />
          <TabButton active={tab === 'fornecedores'} onClick={() => { setTab('fornecedores'); setPage(0); }} icon={Truck} label={`Fornecedores (${data.fornecedores.length})`} />
          <TabButton active={tab === 'visitantes'} onClick={() => { setTab('visitantes'); setPage(0); }} icon={UserCheck} label={`Visitantes (${data.visitantes.length})`} />
          <TabButton active={tab === 'veiculos'} onClick={() => { setTab('veiculos'); setPage(0); }} icon={Car} label={`Veículos (${data.veiculos.length})`} />
          <TabButton active={tab === 'crdk'} onClick={() => { setTab('crdk'); setPage(0); }} icon={Truck} label={`CRDK (${data.crdk.length})`} />
          <TabButton active={tab === 'auditoria'} onClick={() => { setTab('auditoria'); setPage(0); }} icon={FileText} label={`Auditoria (${data.auditoria.length})`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : tab === 'info' ? (
            <ProfileInfoTab colaborador={colaborador} />
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Buscar nos registros..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {pageData.length === 0 ? (
                <div className="text-center py-8"><p className="text-sm text-muted-foreground">Nenhum registro encontrado</p></div>
              ) : (
                <div className="space-y-2">
                  {tab === 'accessLogs' && pageData.map(r => <AccessLogRow key={r.id} r={r} />)}
                  {tab === 'fornecedores' && pageData.map(r => <FornecedorRow key={r.id} r={r} />)}
                  {tab === 'visitantes' && pageData.map(r => <VisitanteRow key={r.id} r={r} />)}
                  {tab === 'veiculos' && pageData.map(r => <VeiculoRow key={r.id} r={r} />)}
                  {tab === 'crdk' && pageData.map(r => <CrdkRow key={r.id} r={r} />)}
                  {tab === 'auditoria' && pageData.map(r => <AuditRow key={r.id} r={r} />)}
                </div>
              )}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} · {total} registros</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ProfileInfoTab({ colaborador }) {
  const info = [
    { icon: User, label: 'Nome', value: `${colaborador.nome || ''} ${colaborador.sobrenome || ''}`.trim() },
    { icon: IdCard, label: 'CPF', value: maskCPF(colaborador.cpf) },
    { icon: IdCard, label: 'Matrícula', value: colaborador.matricula || '—' },
    { icon: Mail, label: 'Email', value: colaborador.email || '—' },
    { icon: Phone, label: 'Telefone', value: colaborador.telefone || '—' },
    { icon: Building2, label: 'Filial', value: colaborador.filial_nome || '—' },
    { icon: Shield, label: 'Cargo', value: colaborador.cargo || '—' },
    { icon: Clock, label: 'Último acesso', value: colaborador.ultimo_acesso ? formatCuritiba(colaborador.ultimo_acesso) : '—' },
    { icon: Calendar, label: 'Termos aceitos', value: colaborador.termos_aceitos ? (colaborador.termos_data || 'Sim') : 'Pendente' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {info.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notificação preferences */}
      <div className="p-3 rounded-xl border border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> Preferências de Notificação
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <PrefItem label="Liberação de Veículos" value={colaborador.notification_vehicle_release} />
          <PrefItem label="Entrada e Saída" value={colaborador.notification_entry_exit} />
          <PrefItem label="Docs de Motoristas" value={colaborador.notification_driver_docs} />
          <PrefItem label="Operações Admin" value={colaborador.notification_admin_ops} />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${colaborador.ativo ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
          {colaborador.ativo ? 'Ativo' : 'Inativo'}
        </span>
        {colaborador.termos_aceitos && (
          <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-primary/10 text-primary">Termos OK</span>
        )}
        {colaborador.filiais_permitidas && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted">
            {colaborador.filiais_permitidas.split(',').length} filial(is) permitida(s)
          </span>
        )}
      </div>
    </div>
  );
}

function PrefItem({ label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
      <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function AccessLogRow({ r }) {
  const isSaida = r.tipo === 'saida';
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isSaida ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
          {isSaida ? <ArrowUpFromLine className="h-3 w-3" /> : <ArrowDownToLine className="h-3 w-3" />}
          {isSaida ? 'Saída' : 'Entrada'}
        </span>
        <p className="text-sm font-medium">{r.veiculo_placa}</p>
        {r.empresa && <span className="text-xs text-muted-foreground">· {r.empresa}</span>}
        <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${r.status === 'validado' ? 'bg-green-500/10 text-green-600' : r.status === 'bloqueado' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
          {r.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        {r.filial_nome && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.filial_nome}</span>}
        {r.motorista_nome && <span>Motorista: {r.motorista_nome}</span>}
      </div>
    </div>
  );
}

function FornecedorRow({ r }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${r.status === 'saida' ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
          <Truck className="h-3 w-3" /> {r.status === 'saida' ? 'Saída' : 'Entrada'}
        </span>
        <p className="text-sm font-medium">{r.placa}</p>
        <span className="text-xs text-muted-foreground">· {r.transportadora}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {r.entrada_data && <span>Entrada: {r.entrada_data} {r.entrada_horario}</span>}
        {r.saida_data && <span>Saída: {r.saida_data} {r.saida_horario}</span>}
        {r.motorista && <span>Motorista: {r.motorista}</span>}
      </div>
    </div>
  );
}

function VisitanteRow({ r }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
          <UserCheck className="h-3 w-3" /> Visitante
        </span>
        <p className="text-sm font-medium">{r.nome}</p>
        {r.empresa && <span className="text-xs text-muted-foreground">· {r.empresa}</span>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.data || '—'}</span>
        {r.horario_entrada && <span>Entrada: {r.horario_entrada}</span>}
        {r.horario_saida && <span>Saída: {r.horario_saida}</span>}
        {r.setor_visitado && <span>Setor: {r.setor_visitado}</span>}
      </div>
    </div>
  );
}

function VeiculoRow({ r }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
          <Car className="h-3 w-3" /> Veículo
        </span>
        <p className="text-sm font-medium">{r.placa}</p>
        {r.modelo_veiculo && <span className="text-xs text-muted-foreground">· {r.modelo_veiculo} {r.cor && `· ${r.cor}`}</span>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {r.matricula && <span>Mat: {r.matricula}</span>}
        {r.setor && <span>Setor: {r.setor}</span>}
        {r.cnh && <span>CNH: {r.cnh}</span>}
        <span>{r.data} {r.horario}</span>
      </div>
    </div>
  );
}

function CrdkRow({ r }) {
  const isSaida = r.status === 'saida';
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isSaida ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
          <Truck className="h-3 w-3" /> {isSaida ? 'Saída' : 'Descarregamento'}
        </span>
        <p className="text-sm font-medium">{r.placa_carreta}{r.placa_cavalo && ` / ${r.placa_cavalo}`}</p>
        {r.empresa && <span className="text-xs text-muted-foreground">· {r.empresa}</span>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        {r.horario_entrada && <span>Entrada: {r.horario_entrada}</span>}
        {r.horario_saida && <span>Saída: {r.horario_saida}</span>}
      </div>
    </div>
  );
}

function AuditRow({ r }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 hover:bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted flex items-center gap-1">
          <FileText className="h-3 w-3" /> {r.category || '—'}
        </span>
        <p className="text-sm font-medium">{r.action}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatCuritiba(r.created_date, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        {r.ip_address && <span>IP: {r.ip_address}</span>}
      </div>
      {r.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.details}</p>}
    </div>
  );
}