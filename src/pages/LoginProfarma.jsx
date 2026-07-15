import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Shield, Building2, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';
import { getCuritibaISO } from '@/lib/curitiba-time.js';
import { enforceSystemTimezone } from '@/lib/timezone-enforcer.js';
import ParticleBackground from '@/components/ParticleBackground';

export default function LoginProfarma() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [filiais, setFiliais] = useState([]);
  const [filialId, setFilialId] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilialDropdown, setShowFilialDropdown] = useState(false);
  const [filiaisLoading, setFiliaisLoading] = useState(true);
  const [filiaisError, setFiliaisError] = useState('');
  const navigate = useNavigate();
  const { login } = useProfarmaAuth();

  const loadFiliais = useCallback(() => {
    setFiliaisLoading(true);
    setFiliaisError('');
    base44.entities.Filial.list().then(list => {
      setFiliais(list.filter(f => f.ativo));
      if (list.length > 0) setFilialId(list[0].id);
      setFiliaisLoading(false);
    }).catch((err) => {
      setFiliaisError('Erro ao carregar filiais: ' + (err?.message || 'verifique a conexão'));
      setFiliaisLoading(false);
    });
  }, []);

  useEffect(() => { loadFiliais(); }, [loadFiliais]);

  const handleCpfChange = (e) => setCpf(formatCPF(e.target.value));

  const handleLogin = async () => {
    setError('');
    if (!cpf || !senha || !filialId) {
      setError('Preencha CPF, senha e filial');
      return;
    }
    setLoading(true);
    const cpfDigits = cpf.replace(/\D/g, '');
    try {
      const colaboradores = await base44.entities.Colaborador.filter({ cpf: cpfDigits });
      const filial = filiais.find(f => f.id === filialId);

      if (colaboradores.length > 0) {
        const colab = colaboradores[0];
        if (!colab.ativo) { setError('Conta desativada. Contate o administrador.'); setLoading(false); return; }
        if (colab.senha !== senha) { setError('Senha incorreta'); setLoading(false); return; }
        const filiaisPermitidas = colab.filiais_permitidas ? colab.filiais_permitidas.split(',').map(s => s.trim()) : [];
        const hasAccess = colab.cargo === 'administrador_master' || colab.cargo === 'administrador' || filiaisPermitidas.includes(filialId);
        if (!hasAccess) { setError('Você não tem permissão para acessar esta filial'); setLoading(false); return; }

        enforceSystemTimezone();
        const now = getCuritibaISO();
        await base44.entities.Colaborador.update(colab.id, { ultimo_acesso: now });
        await base44.entities.AuditLog.create({
          user_name: colab.nome, user_cpf: colab.cpf, action: 'Login realizado',
          details: `Filial: ${filial.nome}`, ip_address: 'local', category: 'login',
          domain: window.location.hostname, branch_id: filialId
        });

        login({
          ...colab, ultimo_acesso: now, filial_id: filialId, filial_nome: filial.nome,
          filiais_permitidas: colab.filiais_permitidas || filialId
        });
        navigate('/dashboard');
      } else {
        enforceSystemTimezone();
        const newColab = await base44.entities.Colaborador.create({
          nome: 'Administrador Master', cpf: cpfDigits, senha,
          cargo: 'administrador_master', ativo: true, filial_id: filialId, filial_nome: filial.nome,
          filiais_permitidas: filialId, matricula: 'AUTO', termos_aceitos: false,
          fuso_horario: 'America/Sao_Paulo',
          notification_vehicle_release: true, notification_entry_exit: true,
          notification_driver_docs: true, notification_admin_ops: true,
        });
        await base44.entities.AuditLog.create({
          user_name: 'Administrador Master', user_cpf: cpfDigits, action: 'Novo administrador cadastrado',
          details: `Primeiro acesso - Filial: ${filial.nome}`, ip_address: 'local', category: 'user_management',
          domain: window.location.hostname, branch_id: filialId
        });
        login({ ...newColab, filial_id: filialId, filial_nome: filial.nome, filiais_permitidas: filialId });
        navigate('/dashboard');
      }
    } catch (e) {
      setError('Erro ao processar login: ' + e.message);
    }
    setLoading(false);
  };

  const selectedFilial = filiais.find(f => f.id === filialId);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#061614]">
      <ParticleBackground />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full bg-teal-500/20 blur-[100px] float-orb-1" />
        <div className="absolute -bottom-20 -right-20 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full bg-emerald-500/15 blur-[100px] float-orb-2" />
        <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-teal-600/10 blur-[120px] float-orb-3" />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-8 card-entrance">
          <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-primary shadow-2xl mb-4 logo-glow">
            <Shield className="h-10 w-10 text-primary-foreground" />
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="absolute left-0 right-0 h-0.5 bg-white/50 laser-scan" />
            </div>
          </div>
          <h1 className="brand-title text-3xl text-white">PROFARMA</h1>
          <p className="text-xs text-teal-300/70 tracking-[0.3em] mt-1 font-medium">LIBERAAUTO PRO</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-6 sm:p-8 card-entrance" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-heading font-bold text-xl text-white mb-1">Acesso ao Sistema</h2>
          <p className="text-sm text-teal-200/50 mb-6">Faça login com seu CPF e senha</p>

          {error && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 mb-4 border border-red-500/20">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-teal-100/80 mb-1.5 block">CPF</label>
              <input type="text" value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength={14}
                className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all" />
            </div>

            <div>
              <label className="text-sm font-medium text-teal-100/80 mb-1.5 block">Senha</label>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all" />
                <button onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200/40 hover:text-teal-200 transition-colors">
                  {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {filiaisError && (
              <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">
                {filiaisError}
                <button onClick={loadFiliais} className="ml-2 underline text-xs">Tentar novamente</button>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-teal-100/80 mb-1.5 block">Filial</label>
              <div className="relative">
                <button onClick={() => setShowFilialDropdown(!showFilialDropdown)}
                  className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-between text-left hover:bg-white/10 transition-all">
                  <span className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-teal-400" />
                    {filiaisLoading ? 'Carregando filiais...' : selectedFilial ? `${selectedFilial.codigo} - ${selectedFilial.nome}` : 'Selecionar filial...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-teal-200/40" />
                </button>
                {showFilialDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1f1c] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-10">
                    {filiaisLoading ? (
                      <div className="px-4 py-3 text-sm text-teal-200/50 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando filiais...
                      </div>
                    ) : filiais.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-teal-200/50">Nenhuma filial ativa encontrada</div>
                    ) : (
                      filiais.map(f => (
                        <button key={f.id} onClick={() => { setFilialId(f.id); setShowFilialDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 first:rounded-t-2xl last:rounded-b-2xl transition-colors ${filialId === f.id ? 'bg-white/10 font-medium' : ''}`}>
                          {f.codigo} - {f.nome}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleLogin} disabled={loading} className="w-full h-12 rounded-2xl text-base font-bold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ENTRAR'}
            </Button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <Link to="/forgot-password" className="text-sm text-teal-300/70 hover:text-teal-200 transition-colors">Esqueci minha senha</Link>
            <Link to="/solicitar-acesso" className="text-sm text-teal-300/70 hover:text-teal-200 transition-colors">Solicitar novo acesso</Link>
          </div>
        </div>

        <p className="text-center text-xs text-teal-200/30 mt-6">© 2026 PROFARMA LIBERAAUTO PRO · Todos os direitos reservados</p>
      </div>
    </div>
  );
}