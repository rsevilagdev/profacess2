import { FileText, Shield, Lock, Cloud, Bell, Database } from 'lucide-react';

export default function TermosUso() {
  const sections = [
    { icon: Shield, title: '1. Aceitação dos Termos', text: 'Ao utilizar este aplicativo, você concorda integralmente com estes Termos de Uso e Política de Privacidade. O sistema PROFARMA LIBERAAUTO PRO é uma plataforma de gestão de liberação de veículos, controle de acessos e auditoria operacional.' },
    { icon: Database, title: '2. Finalidade do Sistema', text: 'O sistema destina-se ao controle de liberação de veículos em portarias, gestão de motoristas terceirizados, verificação de documentos via QR Code, integração com cancelas automáticas, geração de relatórios contábeis e auditoria de acessos.' },
    { icon: Lock, title: '3. Proteção de Dados (LGPD)', text: 'Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), o sistema aplica ofuscação de dados sensíveis (CPF, CNH, placas) em listagens e painéis de visualização. Os dados completos são acessíveis apenas a usuários autorizados com as permissões adequadas.' },
    { icon: Shield, title: '4. Responsabilidades do Usuário', text: 'Manter a confidencialidade de suas credenciais (CPF e senha). Utilizar o sistema apenas para fins profissionais autorizados. Não tentar burlar as restrições de acesso e permissões. Reportar imediatamente qualquer irregularidade ou falha de segurança.' },
    { icon: Database, title: '5. Auditoria e Rastreabilidade', text: 'Todas as ações realizadas no sistema são registradas em logs de auditoria invioláveis, incluindo identificação do usuário, IP de acesso, dispositivo utilizado, data e hora. Os registros não podem ser alterados ou removidos.' },
    { icon: Lock, title: '6. Proibição de Captura de Tela', text: 'É proibida a captura de tela, screenshots ou gravação de tela a partir do aplicativo móvel, para proteção de dados sensíveis e conformidade com a LGPD.' },
    { icon: Cloud, title: '7. Backup e Segurança', text: 'O sistema realiza backups automáticos periódicos dos dados, armazenados de forma criptografada em nuvem. Backups manuais podem ser acionados pelo administrador a qualquer momento.' },
    { icon: Bell, title: '8. Notificações', text: 'O sistema envia notificações em tempo real para eventos críticos, configuráveis pelo usuário em seu perfil. As categorias incluem: liberações de veículos, entradas/saídas, documentação de motoristas e operações administrativas.' },
    { icon: Shield, title: '9. Sanções', text: 'O descumprimento destes termos pode resultar na suspensão ou revogação do acesso ao sistema, sem prejuízo das medidas legais cabíveis.' },
    { icon: FileText, title: '10. Alterações', text: 'Estes termos podem ser atualizados a qualquer momento. Os usuários serão notificados sobre alterações significativas.' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Diretrizes de segurança e políticas internas</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="font-heading font-bold">PROFARMA LIBERAAUTO PRO</h2>
            <p className="text-sm text-muted-foreground">Termos de Uso e Política de Privacidade</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <h3 className="font-heading font-bold text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">© 2026 PROFARMA LIBERAAUTO PRO · Todos os direitos reservados · Em conformidade com a LGPD (Lei 13.709/2018)</p>
      </div>
    </div>
  );
}