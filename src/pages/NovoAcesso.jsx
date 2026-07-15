import { useState, useEffect } from 'react';
import { Search, Truck, X, CheckCircle, AlertTriangle, Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import { getCuritibaISO, getCuritibaDateTime, getSixMonthsFromNow } from '@/lib/curitiba-time.js';
import KanbanBoard from '@/components/novo-acesso/KanbanBoard';
import CadastroForm from '@/components/novo-acesso/CadastroForm';
import ReviewDialog from '@/components/novo-acesso/ReviewDialog';
import { sendWhatsAppNotification } from '@/lib/whatsapp-notifier.js';

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
  const [saidas, setSaidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showRevision, setShowRevision] = useState(false);
  const [requestingAuth, setRequestingAuth] = useState(false);
  const [reviewRequests, setReviewRequests] = useState([]);
  const [showCadastroDialog, setShowCadastroDialog] = useState(false);
  const [reviewDialogItem, setReviewDialogItem] = useState(null);
  const [decidingReview, setDecidingReview] = useState(false);

  const canEditDB = ['administrador_master', 'administrador', 'encarregado'].includes(colaborador?.cargo);

  useEffect(() => {
    loadAcessos();
    if (canEditDB) loadReviewRequests();
  }, [canEditDB]);

  // Real-time subscription — atualiza fila sem refresh
  useEffect(() => {
    const unsubAccess = base44.entities.AccessLog.subscribe(() => loadAcessos());
    const unsubVehicle = base44.entities.Vehicle.subscribe(() => loadAcessos());
    return () => { unsubAccess(); unsubVehicle(); };
  }, []);

  const loadReviewRequests = async () => {
    try {
      const list = await base44.entities.ReviewRequest.list('-created_date', 100);
      setReviewRequests(list.filter(r => r.status !== 'aprovado'));
    } catch (e) {}
  };

  const decideReview = async (review, decisions, editedData) => {
    setDecidingReview(true);
    try {
      const dados = editedData || {};
      const editorName = colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : '');
      const vDecision = decisions?.veiculo || (typeof decisions === 'string' ? decisions : null);
      const mDecision = decisions?.motorista || (typeof decisions === 'string' ? decisions : null);
      const overallStatus = (vDecision === 'bloqueado' || mDecision === 'bloqueado') ? 'bloqueado' : 'validado';

      // Veículo: buscar por placa e atualizar status; se não existe, criar
      const placaVeiculo = dados.veiculo?.placa || dados.veiculo_existente?.placa || '';
      if (placaVeiculo) {
        const existingVehicles = await base44.entities.Vehicle.filter({ placa: placaVeiculo });
        if (existingVehicles.length > 0) {
          for (const v of existingVehicles) {
            await base44.entities.Vehicle.update(v.id, {
              status: vDecision,
              ...(dados.veiculo?.modelo ? { modelo: dados.veiculo.modelo } : {}),
              ...(vDecision === 'validado' ? { data_cadastro: getCuritibaISO(), data_validade: getSixMonthsFromNow() } : {})
            });
          }
        } else if (dados.veiculo) {
          await base44.entities.Vehicle.create({
            ...dados.veiculo,
            status: vDecision,
            filial_id: colaborador.filial_id,
            filial_nome: colaborador.filial_nome,
            data_cadastro: getCuritibaISO(),
            data_validade: getSixMonthsFromNow()
          });
        }
      }

      // Motorista: buscar por CPF e atualizar status; se não existe, criar
      const cpfMotorista = dados.motorista?.cpf || dados.motorista_existente?.cpf || '';
      if (cpfMotorista) {
        let existingDrivers = await base44.entities.Driver.filter({ cpf: cpfMotorista.replace(/\D/g, '') });
      if (existingDrivers.length === 0) {
        existingDrivers = await base44.entities.Driver.filter({ cpf: formatCPF(cpfMotorista) });
      }
        if (existingDrivers.length > 0) {
          for (const d of existingDrivers) {
            await base44.entities.Driver.update(d.id, {
              status: mDecision,
              ...(dados.motorista?.nome ? { nome: dados.motorista.nome } : {}),
              ...(mDecision === 'validado' ? { data_cadastro: getCuritibaISO(), data_validade: getSixMonthsFromNow() } : {})
            });
          }
        } else if (dados.motorista) {
          await base44.entities.Driver.create({
            ...dados.motorista,
            status: mDecision,
            filial_id: colaborador.filial_id,
            filial_nome: colaborador.filial_nome,
            data_cadastro: getCuritibaISO(),
            data_validade: getSixMonthsFromNow()
          });
        }
      }

      // Atualizar AccessLog entries que correspondem à placa
      if (placaVeiculo) {
        const accessLogs = await base44.entities.AccessLog.filter({ veiculo_placa: placaVeiculo });
        for (const log of accessLogs) {
          if (log.tipo === 'saida') continue;
          await base44.entities.AccessLog.update(log.id, {
            status: overallStatus,
            aprovado_por: editorName,
            aprovado_por_cpf: colaborador.cpf,
            data_aprovacao: getCuritibaISO(),
          });
        }
      }

      const resultParts = [];
      if (vDecision) resultParts.push(`Veículo: ${vDecision}`);
      if (mDecision) resultParts.push(`Motorista: ${mDecision}`);
      const reviewUpdate = {
        status: 'aprovado',
        observacao: `Revisado por ${colaborador.nome} — ${resultParts.join(' | ')}`,
      };
      if (vDecision) reviewUpdate.resultado_veiculo = vDecision;
      if (mDecision) reviewUpdate.resultado_motorista = mDecision;
      if (decisions?.veiculoMotivo) reviewUpdate.motivo_bloqueio_veiculo = decisions.veiculoMotivo;
      if (decisions?.motoristaMotivo) reviewUpdate.motivo_bloqueio_motorista = decisions.motoristaMotivo;
      await base44.entities.ReviewRequest.update(review.id, reviewUpdate);
      try {
        const colab = await base44.entities.Colaborador.list();
        const solicitante = colab.find(c => c.cpf === review.solicitante_cpf);
        if (solicitante) {
          await base44.entities.Notification.create({
            title: 'Revisão de Cadastro Concluída',
            message: `Resultado: ${resultParts.join(' | ')}. Veja detalhes no modal.`,
            type: 'driver_docs', sender_name: colaborador.nome,
            target_user_id: solicitante.id, branch_id: review.filial_id
          });
        }
      } catch (e) {}

      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: `Revisão de cadastro: ${resultParts.join(' | ')}`,
        details: review.motivo, ip_address: 'local', domain: window.location.hostname,
        category: 'user_management', branch_id: colaborador.filial_id
      });

      await loadReviewRequests();
      await loadAcessos();
      setReviewDialogItem(null);
    } catch (e) {}
    setDecidingReview(false);
  };

  const loadAcessos = async () => {
    try {
      const [logs, saidaLogs, pendingVehicles, blockedVehicles] = await Promise.all([
        base44.entities.AccessLog.filter({ tipo: 'entrada' }, '-created_date', 200).catch(() => []),
        base44.entities.AccessLog.filter({ tipo: 'saida' }, '-created_date', 20).catch(() => []),
        base44.entities.Vehicle.filter({ status: 'pendente_revisao' }).catch(() => []),
        base44.entities.Vehicle.filter({ status: 'bloqueado' }).catch(() => []),
      ]);
      const seenSaidas = new Set();
      const uniqueSaidas = saidaLogs.filter(s => {
        const key = (s.veiculo_placa || '').toUpperCase().trim();
        if (!key || seenSaidas.has(key)) return false;
        seenSaidas.add(key);
        return true;
      }).slice(0, 3);
      setSaidas(uniqueSaidas);

      // Merge: vehicles without a corresponding AccessLog entry appear as Kanban items
      const logPlacas = new Set(logs.map(l => (l.veiculo_placa || '').toUpperCase().trim()));
      const vehicleItems = [...pendingVehicles, ...blockedVehicles]
        .filter(v => v && v.placa && !logPlacas.has(v.placa.toUpperCase().trim()))
        .map(v => ({
          id: `vehicle_${v.id}`,
          vehicle_id: v.id,
          veiculo_placa: v.placa,
          motorista_nome: '',
          motorista_cpf: '',
          filial_id: v.filial_id || colaborador?.filial_id,
          filial_nome: v.filial_nome || '',
          tipo: 'entrada',
          status: v.status,
          empresa: v.transportadora || '',
          operador_nome: '',
          operador_cpf: '',
          observacao: v.observacao || '',
          source: 'vehicle',
          created_date: v.created_date,
        }));

      setAcessos([...logs, ...vehicleItems]);
    } catch (e) {}
  };

  const buscar = async () => {
    setLoading(true); setCheckResult(null); setVeiculo(null); setMotorista(null); setShowRevision(false);
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!placa || !cpfDigits) { setLoading(false); return; }

    try {
      const veiculos = await base44.entities.Vehicle.filter({ placa: placa.toUpperCase().trim() });
      let motoristas = await base44.entities.Driver.filter({ cpf: cpfDigits });
      // Fallback: try formatted CPF (in case it was stored that way)
      if (motoristas.length === 0) {
        motoristas = await base44.entities.Driver.filter({ cpf: formatCPF(cpfDigits) });
      }

      const v = veiculos.length > 0 ? veiculos[0] : null;
      const m = motoristas.length > 0 ? motoristas[0] : null;
      setVeiculo(v); setMotorista(m);

      const vOk = v && v.status === 'validado';
      const mOk = m && m.status === 'validado';

      if (vOk && mOk) {
        // Both validated — register in exit release queue
        await base44.entities.AccessLog.create({
          veiculo_placa: v.placa,
          motorista_nome: m.nome,
          motorista_cpf: m.cpf,
          ajudante_nome: hasAjudante ? ajudanteNome : '',
          ajudante_cpf: hasAjudante ? ajudanteCpf.replace(/\D/g, '') : '',
          filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome,
          tipo: 'entrada', status: 'validado',
          empresa: m.transportadora || v.transportadora || '',
          operador_nome: colaborador.nome,
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
        sendWhatsAppNotification(
          'Entrada de Veículo',
          `Placa: ${v.placa}\nMotorista: ${m.nome}\nEmpresa: ${m.transportadora || v.transportadora || '—'}\nFilial: ${colaborador.filial_nome || '—'}\nOperador: ${colaborador.nome}`,
          'entrada'
        );
        setTimeout(() => { setCheckResult(null); reset(); }, 2000);
      } else {
        // Criar AccessLog com status pendente/bloqueado para aparecer no Kanban
        const accessStatus = (v && v.status === 'bloqueado') || (m && m.status === 'bloqueado') ? 'bloqueado' : 'pendente_revisao';
        const freshLogs = await base44.entities.AccessLog.filter({ veiculo_placa: placa.toUpperCase(), tipo: 'entrada' }, '-created_date', 10);
        const existingPending = freshLogs.find(a => a.status === 'pendente_revisao' || a.status === 'bloqueado');
        if (!existingPending) {
          await base44.entities.AccessLog.create({
            veiculo_placa: placa.toUpperCase(),
            motorista_nome: m?.nome || '',
            motorista_cpf: cpfDigits,
            filial_id: colaborador.filial_id, filial_nome: colaborador.filial_nome,
            tipo: 'entrada', status: accessStatus,
            empresa: m?.transportadora || v?.transportadora || '',
            operador_nome: colaborador.nome, operador_cpf: colaborador.cpf,
          });
          await loadAcessos();
        }
        setCheckResult('revision');
        setShowRevision(true);
        sendWhatsAppNotification(
          '⚠️ Problema no Acesso de Veículo',
          `Placa: ${placa.toUpperCase()}\nCPF: ${cpfDigits}\nVeículo: ${v ? v.status : 'não encontrado'}\nMotorista: ${m ? m.status : 'não encontrado'}\nFilial: ${colaborador.filial_nome || '—'}\nOperador: ${colaborador.nome}`,
          'problema'
        );
        // Criar tarefa de revisão para administradores, gestores e colaboradores
        try {
          await base44.entities.Task.create({
            titulo: `Revisar acesso - Placa: ${placa.toUpperCase()} | CPF: ${cpfDigits}`,
            descricao: `Veículo: ${v ? v.status : 'não encontrado'} | Motorista: ${m ? m.status : 'não encontrado'}. Solicitado por ${colaborador.nome} na filial ${colaborador.filial_nome || ''}.`,
            status: 'pendente',
            prioridade: 'alta',
            filial_id: colaborador.filial_id
          });
        } catch (e) {}
      }
    } catch (e) {
      setCheckResult('error');
    }
    setLoading(false);
  };

  // addToDB removido — cadastros agora passam por fluxo de aprovação

  const solicitarAutorizacao = async (dados) => {
    setRequestingAuth(true);
    const cpfDigits = cpf.replace(/\D/g, '');
    try {
      const colab = await base44.entities.Colaborador.list();
      const recipients = colab.filter(c => c.ativo && ['administrador_master', 'administrador', 'encarregado'].includes(c.cargo) && (c.filial_id === colaborador.filial_id || c.cargo === 'administrador_master'));
      const destinatariosIds = recipients.map(r => r.id).join(',');
      const destinatariosNomes = recipients.map(r => r.nome).join(', ');

      const tipo = !veiculo && !motorista ? 'ambos' : (!veiculo ? 'veiculo' : (!motorista ? 'motorista' : 'status'));

      await base44.entities.ReviewRequest.create({
        solicitante_nome: colaborador.nome,
        solicitante_cpf: colaborador.cpf,
        tipo,
        target_nome: !veiculo ? placa.toUpperCase() : (motorista?.nome || cpfDigits),
        target_cpf: !veiculo ? placa.toUpperCase() : cpfDigits,
        motivo: `Placa: ${placa} | CPF: ${cpfDigits} | Veículo: ${veiculo ? veiculo.status : 'não encontrado'} | Motorista: ${motorista ? motorista.status : 'não encontrado'}`,
        status: 'pendente',
        filial_id: colaborador.filial_id,
        destinatarios: destinatariosIds,
        destinatarios_nomes: destinatariosNomes,
        dados_json: JSON.stringify(dados)
      });

      for (const r of recipients) {
        try {
          await base44.entities.Notification.create({
            title: 'Solicitação de Cadastro - Revisão Necessária',
            message: `${colaborador.nome} solicitou cadastramento - Placa: ${placa} | CPF: ${cpfDigits}`,
            type: 'driver_docs', sender_name: colaborador.nome, target_user_id: r.id, branch_id: colaborador.filial_id
          });
        } catch (e) {}
      }
      await logAudit('Solicitação de cadastro enviada', `Placa: ${placa} | CPF: ${cpfDigits}`);
      setCheckResult('requested');
      setShowCadastroDialog(false);
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
    const obsSaida = log.observacao_saida || '';
    const existingObs = log.observacao || '';
    const finalObs = [existingObs, obsSaida].filter(Boolean).join(' | ');
    await base44.entities.AccessLog.update(log.id, {
      tipo: 'saida',
      carregado: log.carregado || false,
      observacao: finalObs || existingObs,
      data_aprovacao: getCuritibaISO(),
      aprovado_por: colaborador.nome,
      aprovado_por_cpf: colaborador.cpf,
    });
    await base44.entities.AuditLog.create({
      user_name: colaborador.nome, user_cpf: colaborador.cpf,
      action: 'Saída liberada', details: `Placa: ${log.veiculo_placa} | Motorista: ${log.motorista_nome || '—'}`,
      ip_address: 'local', domain: window.location.hostname, category: 'vehicle', branch_id: colaborador.filial_id
    });
    // Notificar todos os operadores da filial em tempo real
    try {
      const colab = await base44.entities.Colaborador.list();
      const recipients = colab.filter(c => c.ativo && c.filial_id === colaborador.filial_id && c.id !== colaborador.id);
      for (const r of recipients) {
        await base44.entities.Notification.create({
          title: 'Veículo Liberado para Saída',
          message: `Veículo ${log.veiculo_placa} — Motorista: ${log.motorista_nome || '—'} | Saindo ${log.carregado ? 'CARREGADO' : 'VAZIO'} | Liberado por ${colaborador.nome}`,
          type: 'vehicle_release', sender_name: colaborador.nome,
          target_user_id: r.id, branch_id: colaborador.filial_id
        });
      }
    } catch (e) {}

    // Integrar com Google Sheets e Calendar (silencioso se não conectado)
    const spreadsheetId = localStorage.getItem('google_sheets_id');
    if (spreadsheetId) {
      try {
        await base44.functions.invoke('enviarParaGoogleSheets', {
          spreadsheet_id: spreadsheetId,
          dados: [log.veiculo_placa, log.motorista_nome || '—', log.motorista_cpf || '—', log.empresa || '—', 'Saída', log.carregado ? 'Carregado' : 'Vazio', getCuritibaDateTime(), colaborador.nome, finalObs || '—']
        });
      } catch (e) {}
    }
    try {
      const entradaDate = new Date(log.created_date);
      const saidaDate = new Date();
      await base44.functions.invoke('enviarParaGoogleCalendar', {
        titulo: `Saída - ${log.veiculo_placa}`,
        descricao: `Motorista: ${log.motorista_nome || '—'} | Empresa: ${log.empresa || '—'} | Saindo: ${log.carregado ? 'CARREGADO' : 'VAZIO'} | Operador: ${colaborador.nome}`,
        inicio: entradaDate.toISOString(),
        fim: saidaDate.toISOString()
      });
    } catch (e) {}

    sendWhatsAppNotification(
      'Saída de Veículo',
      `Placa: ${log.veiculo_placa}\nMotorista: ${log.motorista_nome || '—'}\nSaindo: ${log.carregado ? 'CARREGADO' : 'VAZIO'}\nFilial: ${colaborador.filial_nome || '—'}\nLiberado por: ${colaborador.nome}`,
      'saida'
    );
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
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className={`rounded-xl p-3 border ${veiculo ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground">Veículo — {placa.toUpperCase()}</p>
              {veiculo ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${veiculo.status === 'validado' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{veiculo.status}</span>
                  {canEditDB && veiculo.status !== 'validado' && (
                    <Button size="sm" className="h-7 rounded-lg text-xs" onClick={() => base44.entities.Vehicle.update(veiculo.id, { status: 'validado' }).then(buscar)}>Validar</Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive">Não encontrado na base</p>
              )}
            </div>
            <div className={`rounded-xl p-3 border ${motorista ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground">Motorista — {cpf}</p>
              {motorista ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${motorista.status === 'validado' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{motorista.status}</span>
                  {canEditDB && motorista.status !== 'validado' && (
                    <Button size="sm" className="h-7 rounded-lg text-xs" onClick={() => base44.entities.Driver.update(motorista.id, { status: 'validado' }).then(buscar)}>Validar</Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive">Não encontrado na base</p>
              )}
            </div>
          </div>

          <Button onClick={() => setShowCadastroDialog(true)} className="h-10 rounded-xl">
            <Send className="h-4 w-4" /> Mandar para Revisão
          </Button>
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

      {/* Review Requests (admin/encarregado only) */}
      {canEditDB && reviewRequests.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-3">Solicitações de Cadastro ({reviewRequests.length})</h3>
          <div className="space-y-2">
            {reviewRequests.map(rr => {
              const dados = rr.dados_json ? (() => { try { return JSON.parse(rr.dados_json); } catch { return {}; } })() : {};
              return (
                <div key={rr.id} className={`p-3 rounded-xl border ${rr.status === 'rejeitado' ? 'bg-destructive/5 border-destructive/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rr.solicitante_nome} — {rr.tipo}</p>
                      <p className="text-xs text-muted-foreground truncate">{rr.motivo}</p>
                      {dados.veiculo && <p className="text-xs text-muted-foreground">Veículo: {dados.veiculo.placa} {dados.veiculo.modelo}</p>}
                      {dados.motorista && <p className="text-xs text-muted-foreground">Motorista: {dados.motorista.nome} — CPF: {dados.motorista.cpf}</p>}
                      {rr.status === 'rejeitado' && <p className="text-xs text-destructive font-medium mt-1">Rejeitado — pode cadastrar como bloqueado</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="h-8 rounded-xl" onClick={() => setReviewDialogItem(rr)}>Revisar</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban */}
      <KanbanBoard acessos={acessos} saidas={saidas} onRefresh={loadAcessos} colaborador={colaborador} onLiberarSaida={liberarSaida} />

      {/* Dialog: Cadastro (operador) */}
      {showCadastroDialog && (
        <CadastroForm veiculo={veiculo} motorista={motorista} placa={placa} cpf={cpf} onSubmit={solicitarAutorizacao} loading={requestingAuth} onClose={() => setShowCadastroDialog(false)} />
      )}

      {/* Dialog: Revisão (admin/supervisor/gestor) */}
      {reviewDialogItem && (
        <ReviewDialog review={reviewDialogItem} onDecide={(decisions, editedData) => decideReview(reviewDialogItem, decisions, editedData)} loading={decidingReview} onClose={() => setReviewDialogItem(null)} />
      )}
    </div>
  );
}