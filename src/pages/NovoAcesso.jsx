import { useState, useEffect } from 'react';
import { Search, Truck, X, CheckCircle, AlertTriangle, Loader2, UserPlus, User, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import KanbanBoard from '@/components/novo-acesso/KanbanBoard';

export default function NovoAcesso() {
  const { colaborador } = useProfarmaAuth();
  const [placa, setPlaca] = useState('');
  const [cpf, setCpf] = useState('');
  const [hasAjudante, setHasAjudante] = useState(false);
  const [ajudanteNome, setAjudanteNome] = useState('');
  const [ajudanteCpf, setAjudanteCpf] = useState('');
  const [veiculo, setVeiculo] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showRevision, setShowRevision] = useState(false);
  const [requestingAuth, setRequestingAuth] = useState(false);
  const [reviewRequests, setReviewRequests] = useState([]);

  const canEditDB = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  useEffect(() => {
    loadAcessos();
    if (canEditDB) loadReviewRequests();
  }, [canEditDB]);

  const loadReviewRequests = async () => {
    try {
      const list = await base44.entities.ReviewRequest.filter({ status: 'pendente' });
      setReviewRequests(list);
    } catch (e) {}
  };

  const respondReview = async (review, approved) => {
    await base44.entities.ReviewRequest.update(review.id, { status: approved ? 'aprovado' : 'rejeitado' });
    const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
    if (approved) {
      const colab = await base44.entities.Colaborador.list();
      const recipients = colab.filter(c => c.email && c.ativo && ['administrador_master', 'administrador', 'encarregado', 'operador'].includes(c.cargo));
      for (const r of recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            to: r.email,
            subject: 'Solicitação de Cadastro Aprovada | PROFARMA LIBERAAUTO PRO',
            body: `Olá ${r.nome},\n\nA solicitação de cadastro de ${review.solicitante_nome} foi APROVADA.\n\nDetalhes:\n${review.motivo}\n\nPor favor, acesse o sistema em Editar Base de Dados para inserir os registros.\n\nPROFARMA LIBERAAUTO PRO`,
            from_name: 'PROFARMA LIBERAAUTO PRO'
          });
        } catch (e) {}
      }
    }
    await base44.entities.AuditLog.create({
      user_name: editorName, user_cpf: colaborador.cpf,
      action: approved ? 'Solicitação de cadastro aprovada' : 'Solicitação de cadastro negada',
      details: review.motivo, ip_address: 'local', domain: window.location.hostname,
      category: 'user_management', branch_id: colaborador.filial_id
    });
    await loadReviewRequests();
  };

  const loadAcessos = async () => {
    const logs = await base44.entities.AccessLog.list('-created_date', 50);
    setAcessos(logs);
  };

  const buscar = async () => {
    setLoading(true); setCheckResult(null); setVeiculo(null); setMotorista(null); setShowRevision(false);
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!placa || !cpfDigits) { setLoading(false); return; }

    try {
      const veiculos = await base44.entities.Vehicle.filter({ placa: placa.toUpperCase() });
      const motoristas = await base44.entities.Driver.filter({ cpf: cpfDigits });

      const v = veiculos.length > 0 ? veiculos[0] : null;
      const m = motoristas.length > 0 ? motoristas[0] : null;
      setVeiculo(v); setMotorista(m);

      const vOk = v && v.status === 'validado';
      const mOk = m && m.status === 'validado';

      if (vOk && mOk) {
        // Both validated — register in exit release queue
        await base44.entities.AccessLog.create({
          veiculo_placa: v.placa,
          motorista_nome: m.nome + (m.sobrenome ? ' ' + m.sobrenome : ''),
          motorista_cpf: m.cpf,
          ajudante_nome: hasAjudante ? ajudanteNome : '',
          ajudante_cpf: hasAjudante ? ajudanteCpf.replace(/\D/g, '') : '',
          filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome,
          tipo: 'entrada', status: 'validado',
          operador_nome: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
          operador_cpf: colaborador.cpf,
          observacao: hasAjudante ? `Acompanhante: ${ajudanteNome} - CPF: ${ajudanteCpf}` : ''
        });
        await base44.entities.AuditLog.create({
          user_name: colaborador.nome, user_cpf: colaborador.cpf,
          action: 'Acesso validado para fila',
          details: `Placa: ${v.placa} | Motorista CPF: ${m.cpf} | Ajudante: ${hasAjudante ? ajudanteNome : 'N/A'}`,
          ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
        });
        setCheckResult('success');
        await loadAcessos();
      } else {
        setCheckResult('revision');
        setShowRevision(true);
      }
    } catch (e) {
      setCheckResult('error');
    }
    setLoading(false);
  };

  const addToDB = async (type) => {
    if (type === 'veiculo' && !veiculo) {
      await base44.entities.Vehicle.create({
        placa: placa.toUpperCase(), modelo: '', status: 'pendente_revisao', status_opentech: ''
      });
      await logAudit('Veículo cadastrado via revisão', `Placa: ${placa.toUpperCase()}`);
    }
    if (type === 'motorista' && !motorista) {
      const cpfDigits = cpf.replace(/\D/g, '');
      await base44.entities.Driver.create({
        nome: '', cpf: cpfDigits, status: 'pendente_revisao', status_opentech: ''
      });
      await logAudit('Motorista cadastrado via revisão', `CPF: ${cpfDigits}`);
    }
    // Re-check
    buscar();
  };

  const solicitarAutorizacao = async () => {
    setRequestingAuth(true);
    const cpfDigits = cpf.replace(/\D/g, '');
    try {
      // Create review request
      const review = await base44.entities.ReviewRequest.create({
        solicitante_nome: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        solicitante_cpf: colaborador.cpf,
        tipo: !veiculo ? 'veiculo' : 'motorista',
        target_nome: !veiculo ? placa.toUpperCase() : cpfDigits,
        target_cpf: !veiculo ? placa.toUpperCase() : cpfDigits,
        motivo: `Veículo não encontrado: ${!veiculo} | Motorista não encontrado: ${!motorista} | Placa: ${placa} | CPF: ${cpfDigits}`,
        status: 'pendente'
      });

      // Notify admins, supervisors, support
      const colab = await base44.entities.Colaborador.list();
      const recipients = colab.filter(c => c.email && c.ativo && ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo));
      for (const r of recipients) {
        try {
          await base44.entities.Notification.create({
            title: 'Solicitação de Cadastro - Revisão Necessária',
            message: `${colaborador.nome} solicitou cadastramento - Placa: ${placa} | CPF: ${cpfDigits}`,
            type: 'driver_docs', sender_name: colaborador.nome, target_user_id: r.id, branch_id: colaborador.filial_id
          });
          await base44.integrations.Core.SendEmail({
            to: r.email,
            subject: 'Solicitação de Cadastro - Revisão Necessária | PROFARMA LIBERAAUTO PRO',
            body: `Olá ${r.nome},\n\n${colaborador.nome} solicitou autorização de cadastro.\n\nDetalhes:\n- Placa: ${placa}\n- CPF Motorista: ${cpfDigits}\n- Veículo na base: ${veiculo ? 'Sim' : 'Não'}\n- Motorista na base: ${motorista ? 'Sim' : 'Não'}\n\nAcesse o sistema para aprovar ou negar a solicitação.\n\nPROFARMA LIBERAAUTO PRO`,
            from_name: 'PROFARMA LIBERAAUTO PRO'
          });
        } catch (e) {}
      }
      await logAudit('Solicitação de cadastro enviada', `Placa: ${placa} | CPF: ${cpfDigits}`);
      setCheckResult('requested');
    } catch (e) {}
    setRequestingAuth(false);
  };

  const logAudit = async (action, details) => {
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome, user_cpf: colaborador.cpf, action, details,
      ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
    });
  };

  const liberarSaida = async (log) => {
    await base44.entities.AccessLog.update(log.id, { tipo: 'saida' });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome, user_cpf: colaborador.cpf,
      action: 'Saída liberada', details: `Placa: ${log.veiculo_placa}`,
      ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
    });
    await loadAcessos();
  };

  const reset = () => {
    setPlaca(''); setCpf(''); setVeiculo(null); setMotorista(null); setCheckResult(null);
    setShowRevision(false); setHasAjudante(false); setAjudanteNome(''); setAjudanteCpf('');
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Acessos</h1>
        <p className="text-sm text-muted-foreground">Registro de acesso com verificação de placa e CPF do motorista</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Verificar Acesso</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Placa do Veículo</label>
            <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1234" className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring uppercase" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CPF do Motorista</label>
            <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00" maxLength={14} className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {/* Acompanhante */}
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={hasAjudante} onChange={e => setHasAjudante(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Possui acompanhante/ajudante</span>
          </label>
          {hasAjudante && (
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <input type="text" value={ajudanteNome} onChange={e => setAjudanteNome(e.target.value)}
                placeholder="Nome do acompanhante" className="h-12 px-4 rounded-2xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" value={ajudanteCpf} onChange={e => setAjudanteCpf(formatCPF(e.target.value))}
                placeholder="CPF do acompanhante" maxLength={14} className="h-12 px-4 rounded-2xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button onClick={buscar} disabled={loading || !placa || !cpf} className="flex-1 h-12 rounded-2xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Verificar Acesso
          </Button>
          {checkResult && <Button onClick={reset} variant="secondary" className="h-12 rounded-2xl"><X className="h-5 w-5" /></Button>}
        </div>
      </div>

      {/* Results */}
      {checkResult === 'success' && veiculo && motorista && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 fade-in">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="font-heading font-bold text-primary">Acesso Permitido</p>
              <p className="text-sm text-muted-foreground">Veículo e motorista validados — na fila para liberação</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="font-medium">{veiculo.placa}</p>
              <p className="text-sm">{veiculo.modelo || '—'}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Validado</span>
            </div>
            <div className="bg-card rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Motorista</p>
              <p className="font-medium">{motorista.nome} {motorista.sobrenome || ''}</p>
              <p className="text-sm">{motorista.cpf}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Validado</span>
            </div>
          </div>
          {hasAjudante && (
            <div className="bg-card rounded-xl p-3 mt-2">
              <p className="text-xs text-muted-foreground">Acompanhante (não verificado)</p>
              <p className="text-sm">{ajudanteNome} — {ajudanteCpf}</p>
            </div>
          )}
        </div>
      )}

      {/* Revision needed */}
      {showRevision && checkResult === 'revision' && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 fade-in">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div>
              <p className="font-heading font-bold text-orange-500">Revisão Necessária</p>
              <p className="text-sm text-muted-foreground">Dados não encontrados ou não validados na base</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border ${veiculo ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground">Veículo — {placa.toUpperCase()}</p>
              {veiculo ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${veiculo.status === 'validado' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{veiculo.status}</span>
              ) : (
                <p className="text-sm text-destructive">Não encontrado na base</p>
              )}
            </div>
            <div className={`rounded-xl p-3 border ${motorista ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground">Motorista — {cpf}</p>
              {motorista ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${motorista.status === 'validado' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{motorista.status}</span>
              ) : (
                <p className="text-sm text-destructive">Não encontrado na base</p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {canEditDB ? (
              <div className="flex flex-wrap gap-2">
                {!veiculo && <Button onClick={() => addToDB('veiculo')} className="h-10 rounded-xl"><UserPlus className="h-4 w-4" /> Cadastrar Veículo</Button>}
                {!motorista && <Button onClick={() => addToDB('motorista')} className="h-10 rounded-xl"><UserPlus className="h-4 w-4" /> Cadastrar Motorista</Button>}
                {(veiculo && veiculo.status !== 'validado') && <Button onClick={() => base44.entities.Vehicle.update(veiculo.id, { status: 'validado' }).then(buscar)} className="h-10 rounded-xl">Validar Veículo</Button>}
                {(motorista && motorista.status !== 'validado') && <Button onClick={() => base44.entities.Driver.update(motorista.id, { status: 'validado' }).then(buscar)} className="h-10 rounded-xl">Validar Motorista</Button>}
              </div>
            ) : (
              <Button onClick={solicitarAutorizacao} disabled={requestingAuth} className="h-10 rounded-xl">
                {requestingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Solicitar Autorização de Cadastro
              </Button>
            )}
          </div>
        </div>
      )}

      {checkResult === 'requested' && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <p className="text-sm">Solicitação enviada aos administradores e supervisores. Você será notificado quando for processada.</p>
          </div>
        </div>
      )}

      {/* Pending Review Requests (admin only) */}
      {canEditDB && reviewRequests.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-3">Solicitações de Cadastro Pendentes ({reviewRequests.length})</h3>
          <div className="space-y-2">
            {reviewRequests.map(rr => (
              <div key={rr.id} className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rr.solicitante_nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{rr.motivo}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 rounded-xl bg-primary" onClick={() => respondReview(rr, true)}>Aprovar</Button>
                  <Button size="sm" variant="destructive" className="h-8 rounded-xl" onClick={() => respondReview(rr, false)}>Negar</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
      <KanbanBoard acessos={acessos} onRefresh={loadAcessos} colaborador={colaborador} />

      {/* Queue List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Fila de Liberação de Saída</h3>
        {acessos.filter(a => a.status === 'validado' && a.tipo === 'entrada').length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo aguardando liberação</p>
        ) : (
          <div className="space-y-2">
            {acessos.filter(a => a.status === 'validado' && a.tipo === 'entrada').map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{log.veiculo_placa}</p>
                    <p className="text-xs text-muted-foreground">{log.motorista_nome || '—'} — {log.motorista_cpf || '—'}</p>
                    {log.ajudante_nome && <p className="text-xs text-muted-foreground">Ajudante: {log.ajudante_nome} — {log.ajudante_cpf || ''}</p>}
                  </div>
                </div>
                <Button size="sm" className="h-8 rounded-xl" onClick={() => liberarSaida(log)}>
                  Liberar Saída
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}