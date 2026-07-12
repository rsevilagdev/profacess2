import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Shield, Building2, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { formatCPF } from '@/lib/cpf-utils.js';

export default function LoginProfarma() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [filiais, setFiliais] = useState([]);
  const [filialId, setFilialId] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilialDropdown, setShowFilialDropdown] = useState(false);
  const navigate = useNavigate();
  const { login } = useProfarmaAuth();

  useEffect(() => {
    base44.entities.Filial.list().then(list => {
      setFiliais(list.filter(f => f.ativo));
      if (list.length > 0) setFilialId(list[0].id);
    }).catch(() => {});
  }, []);

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

        const now = new Date().toISOString();
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
        const newColab = await base44.entities.Colaborador.create({
          nome: 'Administrador Master', cpf: cpfDigits, senha,
          cargo: 'administrador_master', ativo: true, filial_id: filialId, filial_nome: filial.nome,
          filiais_permitidas: filialId, matricula: 'AUTO', termos_aceitos: false,
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/5 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-md fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary text-primary-foreground shadow-xl mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="brand-title text-3xl text-foreground">PROFARMA</h1>
          <p className="text-sm text-muted-foreground tracking-wide mt-1">LIBERAAUTO PRO</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
          <h2 className="font-heading font-bold text-xl mb-1">Acesso ao Sistema</h2>
          <p className="text-sm text-muted-foreground mb-6">Faça login com seu CPF e senha</p>

          {error && <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-3 mb-4">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">CPF</label>
              <input
                type="text" value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength={14}
                className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full h-12 px-4 pr-12 rounded-2xl border border-input bg-transparent text-base focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                <button onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Filial</label>
              <div className="relative">
                <button
                  onClick={() => setShowFilialDropdown(!showFilialDropdown)}
                  className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent flex items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-primary" />
                    {selectedFilial ? `${selectedFilial.codigo} - ${selectedFilial.nome}` : 'Selecionar filial...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {showFilialDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto z-10">
                    {filiais.map(f => (
                      <button
                        key={f.id} onClick={() => { setFilialId(f.id); setShowFilialDropdown(false); }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-accent first:rounded-t-2xl last:rounded-b-2xl ${filialId === f.id ? 'bg-accent font-medium' : ''}`}
                      >
                        {f.codigo} - {f.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleLogin} disabled={loading} className="w-full h-12 rounded-2xl text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ENTRAR'}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/solicitar-acesso" className="text-sm text-primary hover:underline">
              Solicitar novo acesso
            </Link>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-xl text-xs text-muted-foreground text-center">
            <p>Primeiro acesso? Seu CPF será cadastrado como Administrador Master.</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 PROFARMA LIBERAAUTO PRO · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}