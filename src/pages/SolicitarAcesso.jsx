import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Truck, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatCPF, cleanCPF } from '@/lib/cpf-utils';

export default function SolicitarAcesso() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [filialId, setFilialId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [filiais, setFiliais] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Filial.filter({ ativo: true }).then(setFiliais).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!nome || !cpf) {
      toast({ title: 'Preencha nome e CPF', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const filial = filiais.find(f => f.id === filialId);
      await base44.entities.SolicitacaoAcesso.create({
        nome,
        cpf: cleanCPF(cpf),
        email,
        filial_id: filialId,
        filial_nome: filial ? `${filial.codigo} - ${filial.cidade || filial.nome}` : '',
        motivo,
        status: 'pendente'
      });
      toast({ title: 'Solicitação enviada!', description: 'Aguarde a aprovação de um administrador.' });
      navigate('/');
    } catch (err) {
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(200,12%,8%)] via-[hsl(200,10%,10%)] to-[hsl(160,20%,12%)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[hsl(200,12%,14%)]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(160,50%,40%)]/15 flex items-center justify-center mb-4">
              <Truck className="w-7 h-7 text-[hsl(160,50%,40%)]" />
            </div>
            <h1 className="text-xl font-bold text-white">Solicitar Acesso</h1>
            <p className="text-xs text-white/40 mt-1">PROFARMA · LIBERAAUTO PRO</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Nome completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" type="email" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Filial</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
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
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Motivo</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que precisa de acesso?" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl min-h-[80px] resize-none" />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 rounded-xl bg-[hsl(160,50%,40%)] hover:bg-[hsl(160,50%,35%)] text-white font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar solicitação
            </Button>

            <button onClick={() => navigate('/')} className="w-full text-white/40 hover:text-white/60 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 mt-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}