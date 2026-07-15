import { useState, useEffect } from 'react';
import { Check, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { base44 } from '@/api/base44Client';
import { getCuritibaISO } from '@/lib/curitiba-time.js';
import { requestNotificationPermission, storeUserContext } from '@/lib/push-manager.js';

const TERMOS_TEXTO = `TERMOS DE USO E POLÍTICA DE PRIVACIDADE – PROFARMA LIBERAAUTO PRO

1. ACEITAÇÃO DOS TERMOS
Ao utilizar este aplicativo, você concorda integralmente com estes Termos de Uso e Política de Privacidade. O sistema PROFARMA LIBERAAUTO PRO é uma plataforma de gestão de liberação de veículos, controle de acessos e auditoria operacional.

2. FINALIDADE DO SISTEMA
O sistema destina-se ao controle de liberação de veículos em portarias, gestão de motoristas terceirizados, verificação de documentos via QR Code, integração com cancelas automáticas, geração de relatórios contábeis e auditoria de acessos.

3. PROTEÇÃO DE DADOS (LGPD)
Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), o sistema aplica ofuscação de dados sensíveis (CPF, CNH, placas) em listagens e painéis de visualização. Os dados completos são acessíveis apenas a usuários autorizados com as permissões adequadas.

4. RESPONSABILIDADES DO USUÁRIO
- Manter a confidencialidade de suas credenciais (CPF e senha).
- Utilizar o sistema apenas para fins profissionais autorizados.
- Não tentar burlar as restrições de acesso e permissões.
- Reportar imediatamente qualquer irregularidade ou falha de segurança.

5. AUDITORIA E RASTREABILIDADE
Todas as ações realizadas no sistema são registradas em logs de auditoria invioláveis, incluindo identificação do usuário, IP de acesso, dispositivo utilizado, data e hora. Os registros não podem ser alterados ou removidos.

6. PROIBIÇÃO DE CAPTURA DE TELA
É proibida a captura de tela, screenshots ou gravação de tela a partir do aplicativo móvel, para proteção de dados sensíveis e conformidade com a LGPD.

7. BACKUP E SEGURANÇA
O sistema realiza backups automáticos periódicos dos dados, armazenados de forma criptografada em nuvem. Backups manuais podem ser acionados pelo administrador a qualquer momento.

8. NOTIFICAÇÕES
O sistema envia notificações em tempo real para eventos críticos, configuráveis pelo usuário em seu perfil. As categorias incluem: liberações de veículos, entradas/saídas, documentação de motoristas e operações administrativas.

9. SANÇÕES
O descumprimento destes termos pode resultar na suspensão ou revogação do acesso ao sistema, sem prejuízo das medidas legais cabíveis.

10. ALTERAÇÕES
Estes termos podem ser atualizados a qualquer momento. Os usuários serão notificados sobre alterações significativas.

Ao clicar em "ACEITAR", você declara ter lido e concordado com todos os termos acima.`;

export default function TermsModal() {
  const { colaborador, updateColaborador } = useProfarmaAuth();
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (colaborador && !colaborador.termos_aceitos) {
      setOpen(true);
    }
  }, [colaborador]);

  if (!open || !colaborador) return null;

  const handleAccept = async () => {
    if (!checked) return;
    const data = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const nowISO = getCuritibaISO();
    const payload = {
      termos_aceitos: true,
      termos_data: data,
      fuso_horario: 'America/Sao_Paulo',
      ultimo_acesso: nowISO
    };
    updateColaborador(payload);
    try {
      await base44.entities.Colaborador.update(colaborador.id, payload);
    } catch (e) { /* silent */ }
    setOpen(false);
    // Initialize push notifications after terms acceptance
    try {
      await storeUserContext({ ...colaborador, ...payload });
      await requestNotificationPermission();
    } catch (e) { /* silent */ }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="brand-title text-lg">Termos de Uso</h2>
              <p className="text-xs text-muted-foreground">Aceitação obrigatória para continuar</p>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <div className="bg-muted rounded-2xl p-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {TERMOS_TEXTO}
          </div>
        </div>
        <div className="p-6 border-t border-border">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <button
              onClick={() => setChecked(!checked)}
              className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-input'}`}
            >
              {checked && <Check className="h-4 w-4 text-primary-foreground" />}
            </button>
            <span className="text-sm">Li e aceito os Termos de Uso e Política de Privacidade</span>
          </label>
          <Button onClick={handleAccept} disabled={!checked} className="w-full h-12 rounded-2xl">
            ACEITAR
          </Button>
        </div>
      </div>
    </div>
  );
}