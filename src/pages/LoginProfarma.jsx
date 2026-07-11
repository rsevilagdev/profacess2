import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Truck, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { formatCPF, cleanCPF } from '@/lib/cpf-utils';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

export default function LoginProfarma() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [filialId, setFilialId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filiais, setFiliais] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, colaborador } = useProfarmaAuth();

  useEffect(() => {
    if (colaborador) navigate('/dashboard');
  }, [colaborador]);

  useEffect(() => {
    base44.entities.Filial.filter({ ativo: true }).then(setFiliais).catch(() => {});
  }, []);

  const handleCpfChange = (e) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleLogin = async () => {
    const cpfClean = cleanCPF(cpf);
    if (cpfClean.length !== 11) {
      toast({ title: 'CPF inválido', description: 'Digite um CPF válido com 11 dígitos.', variant: 'destructive' });
      return;
    }
    if (!senha) {
      toast({ title: 'Senha obrigatória', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const colaboradores = await base44.entities.Colaborador.filter({ cpf: cpfClean });
      
      if (colaboradores.length === 0) {
        // Primeiro acesso — criar como Administrador Master
        const novoColaborador = await base44.entities.Colaborador.create({
          nome: 'Administrador',
          cpf: cpfClean,
          senha: senha,
          filial_id: filialId || '',
          filial_nome: filiais.find(f => f.id === filialId)?.nome || '',
          cargo: 'administrador_master',
          ativo: true,
          ultimo_acesso: new Date().toISOString()
        });
        login(novoColaborador);
        toast({ title: 'Bem-vindo!', description: 'Conta de Administrador Master criada com sucesso.' });
        navigate('/dashboard');
        return;
      }

      const user = colaboradores[0];
      if (user.senha !== senha) {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (!user.ativo) {
        toast({ title: 'Acesso bloqueado', description: 'Sua conta está desativada.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      await base44.entities.Colaborador.update(user.id, { ultimo_acesso: new Date().toISOString() });
      login(user);
      navigate('/dashboard');
    } catch (err) {
      toast({ title: 'Erro ao entrar', description: 'Tente novamente.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(200,12%,8%)] via-[hsl(200,10%,10%)] to-[hsl(160,20%,12%)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[hsl(200,12%,14%)]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(160,50%,40%)]/15 flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-[hsl(160,50%,40%)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">PROFARMA</h1>
            <p className="text-xs tracking-[0.3em] text-white/40 mt-1 font-medium">LIBERAAUTO PRO</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium">CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-12 rounded-xl focus:border-[hsl(160,50%,40%)]/50 focus:ring-[hsl(160,50%,40%)]/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-12 rounded-xl pr-12 focus:border-[hsl(160,50%,40%)]/50 focus:ring-[hsl(160,50%,40%)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium">Filial</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-[hsl(160,50%,40%)]/50 focus:ring-[hsl(160,50%,40%)]/20">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(200,12%,16%)] border-white/10">
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-white/80 focus:bg-white/10 focus:text-white">
                      {f.codigo} - {f.cidade || f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] text-white font-semibold text-base mt-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Truck className="w-5 h-5 mr-2" />}
              Entrar
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/solicitar-acesso')}
              className="text-[hsl(160,50%,50%)] hover:text-[hsl(160,50%,60%)] text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Solicitar acesso
            </button>
            <p className="text-white/25 text-xs mt-4 leading-relaxed">
              Primeiro acesso com CPF não registrado cria conta de Administrador Master
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}