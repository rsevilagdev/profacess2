export const MANUAL_SECTIONS = [
  {
    id: 'acessos',
    title: 'Acessos e Validação',
    icon: 'ScanLine',
    image: 'https://media.base44.com/images/public/6a52c95a887ed48b22b409b4/27cc93163_generated_image.png',
    topics: [
      { title: 'Registrar novo acesso', content: 'Na página "Acessos", digite a placa do veículo e o CPF do motorista. O sistema cruza os dados na base centralizada. Se ambos estiverem validados, o acesso é registrado automaticamente no Kanban. É possível incluir um acompanhante/ajudante (não verificado) marcando a opção correspondente.' },
      { title: 'Fluxo do Kanban', content: 'Os veículos passam por três estágios: Pendente de Revisão (laranja) → Validado / Em Carga (verde) → Bloqueado (vermelho). Administradores e encarregados podem arrastar cards entre as colunas ou usar os botões de ação rápida.' },
      { title: 'Aprovar acesso', content: 'Na coluna "Pendente de Revisão", clique em "Autorizar" para validar. O operador que registrou o acesso será notificado em tempo real. Aprovação registra o nome e CPF de quem autorizou, com data e hora.' },
      { title: 'Bloquear acesso', content: 'Clique em "Bloquear" e informe o motivo (obrigatório). O operador será notificado com o motivo do bloqueio. Veículos bloqueados não podem ser liberados até que um administrador altere o status.' },
      { title: 'Liberar saída (vazio ou carregado)', content: 'Na coluna "Validado", clique em "Liberar Saída". O sistema pergunta se o veículo está saindo vazio ou carregado. Observações opcionais podem ser adicionadas. Todos os operadores da filial são notificados em tempo real sobre a liberação.' },
      { title: 'Solicitar cadastro', content: 'Se o veículo ou motorista não for encontrado na base, operadores podem "Solicitar Autorização de Cadastro". A solicitação é enviada para administradores e encarregados da mesma filial, que podem aprovar ou negar.' },
    ]
  },
  {
    id: 'crdk',
    title: 'Acesso CRDK — Transferências entre CDs',
    icon: 'Truck',
    image: 'https://media.base44.com/images/public/6a52c95a887ed48b22b409b4/4bba2397c_generated_image.png',
    topics: [
      { title: 'O que é o Acesso CRDK', content: 'Módulo dedicado ao registro de transferências de mercadorias entre centros de distribuição. As placas da carreta e do cavalo são registradas separadamente.' },
      { title: 'Registro de entrada', content: 'Preencha placa da carreta (obrigatória), placa do cavalo, nome do motorista (obrigatório), empresa, destino, RG/CPF, crachá e autorização. O veículo entra com status "Validado em Descarregamento".' },
      { title: 'Liberar saída com verificação de placa', content: 'Ao liberar a saída, tire uma foto do interior da carreta. O sistema detecta automaticamente o texto da placa na imagem via inteligência artificial e compara com a placa registrada no acesso. Se coincidir, a foto é aceita. Se não coincidir, a foto é rejeitada e uma nova foto é solicitada.' },
      { title: 'Requisitos da foto', content: 'A placa do veículo deve aparecer visível e legível na foto. Tire a foto de frente para a placa, sem obstruções. Boa iluminação é necessária para a leitura automática. O sistema mostra qual placa é esperada antes da captura.' },
    ]
  },
  {
    id: 'bloqueio',
    title: 'Painel de Bloqueio',
    icon: 'ShieldAlert',
    topics: [
      { title: 'Gestão de veículos e motoristas', content: 'Visualize todos os veículos e motoristas com seus respectivos status (validado, bloqueado, pendente de revisão). Use abas para alternar entre veículos e motoristas.' },
      { title: 'Filtros e busca', content: 'Busque por placa, nome ou CPF. Filtre por status e filial. A paginação permite navegar por grandes volumes de registros.' },
      { title: 'Atualização de status', content: 'Administradores podem validar, bloquear ou enviar para revisão. Cada alteração é registrada no log de auditoria.' },
      { title: 'Comprovante Opentech', content: 'Upload de foto do comprovante de atualização no Opentech para veículos e motoristas. A foto fica vinculada ao registro.' },
    ]
  },
  {
    id: 'modelos',
    title: 'Modelos Corporativos',
    icon: 'LayoutGrid',
    topics: [
      { title: 'Controle de Veículos — Expedição', content: 'Relatório de veículos que saíram carregados da filial. Inclui placa (carreta/cavalo separadas por "/"), motorista, empresa, data e hora.' },
      { title: 'Controle de Veículos — Recebimento', content: 'Relatório de veículos que chegaram na filial. Mesmo formato do relatório de expedição.' },
      { title: 'Impressão', content: 'Selecione o modelo desejado, defina o período (data inicial e final) e clique em "Gerar". O relatório é exibido em formato de tabela pronta para impressão.' },
    ]
  },
  {
    id: 'auditoria',
    title: 'Auditoria e Registros',
    icon: 'ScrollText',
    topics: [
      { title: 'Auditoria de Sistema', content: 'Log completo de ações do sistema com IP, domínio, dispositivo, categoria e data/hora. Filtre por categoria (login, veículo, motorista, busca, gestão de usuários, filial, exportação, backup).' },
      { title: 'Registros de Acesso/Saída', content: 'Aba dedicada para visualizar todos os registros de entrada e saída, incluindo fotos anexadas. Sub-abas para Logs de Acesso e registros CRDK.' },
      { title: 'Exportação', content: 'Exporte os logs em PDF (com marca d\'água confidencial), Excel (CSV) ou envie por email. Filtre por data, categoria e termo de busca antes de exportar.' },
    ]
  },
  {
    id: 'monitor',
    title: 'Monitor de Filiais',
    icon: 'Activity',
    image: 'https://media.base44.com/images/public/6a52c95a887ed48b22b409b4/a2f485bee_generated_image.png',
    topics: [
      { title: 'Visão geral', content: 'Dashboard com gráficos analíticos de volume de liberações por filial e por período. Compare o desempenho entre filiais.' },
      { title: 'Seletor de período', content: 'Visualize dados de 7, 15 ou 30 dias. Os gráficos são atualizados dinamicamente.' },
      { title: 'Calendário operacional', content: 'Visualize as operações em formato de calendário, com indicadores de volume por dia.' },
    ]
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    icon: 'Bell',
    topics: [
      { title: 'Segmentação por filial', content: 'As notificações são segmentadas por filial para evitar poluição visual. Você só recebe avisos relevantes para sua unidade.' },
      { title: 'Tipos de notificação', content: 'Liberação de veículos, entrada/saída, documentação de motoristas e operações administrativas. Configure em "Configurações de Notificações" quais tipos deseja receber.' },
      { title: 'Envio de mensagens', content: 'Envie notificações para usuários específicos ou para toda a filial. Cada envio é registrado no log de auditoria.' },
      { title: 'Tempo real', content: 'As notificações aparecem em tempo real, sem necessidade de atualizar a página. Notificações push são auto-ocultáveis após 3 segundos.' },
    ]
  },
  {
    id: 'exportar',
    title: 'Exportar e Importar Dados',
    icon: 'Download',
    topics: [
      { title: 'Backup completo (JSON)', content: 'Exporte todos os dados do sistema em formato JSON, incluindo configurações, metadados e registros de todas as entidades.' },
      { title: 'Importação Excel/CSV', content: 'Importe planilhas de veículos e motoristas. O sistema detecta automaticamente o tipo de dado e faz o mapeamento inteligente de colunas. Registros existentes são atualizados, novos são criados.' },
      { title: 'Exportação de logs', content: 'Na página de Auditoria, exporte logs filtrados em PDF ou CSV, ou envie relatórios por email.' },
      { title: 'Restrições', content: 'Apenas administradores e administradores master podem exportar e importar dados. A operação é registrada no log de auditoria.' },
    ]
  },
  {
    id: 'config',
    title: 'Configurações e Segurança',
    icon: 'Settings',
    topics: [
      { title: 'Gestão de usuários', content: 'Crie, edite ou remova colaboradores. Defina cargo (administrador master, administrador, encarregado, operador, visualizador), filiais permitidas e páginas permitidas.' },
      { title: 'Gestão de filiais', content: 'Cadastre, edite ou desative filiais. Cada filial tem nome, código, cidade e endereço.' },
      { title: 'Configurações de segurança', content: 'Defina tempo de sessão, máximo de tentativas de login, IPs permitidos, permissões de exportar/importar/excluir por cargo, e exigência de 2FA.' },
      { title: 'Backup', content: 'Realize backups manuais ou configure backups automáticos. O histórico de backups fica disponível na aba correspondente.' },
      { title: 'Termos de uso', content: 'Todo colaborador deve aceitar os Termos de Uso no primeiro acesso. O aceite é registrado com data e hora.' },
    ]
  },
];

export const FAQ = [
  { q: 'Como funciona o Kanban de veículos?', a: 'Na página "Acessos", após registrar um acesso, o veículo aparece no Kanban na coluna "Pendente de Revisão". Administradores e encarregados podem arrastar o card para "Validado" ou "Bloquear" com motivo. Na coluna "Validado", é possível liberar a saída informando se o veículo saiu vazio ou carregado.' },
  { q: 'Como liberar a saída de um veículo?', a: 'No Kanban, coluna "Validado", clique em "Liberar Saída". Selecione se o veículo está saindo "Vazio" ou "Carregado". Observações opcionais podem ser adicionadas. Todos os operadores da filial recebem notificação em tempo real.' },
  { q: 'O que é o Acesso CRDK?', a: 'É o módulo para registro de transferências de mercadorias entre centros de distribuição. As placas da carreta e do cavalo são registradas separadamente. Ao liberar a saída, o sistema tira uma foto do interior da carreta e verifica a placa automaticamente via IA.' },
  { q: 'Como funciona a verificação de placa na foto?', a: 'Ao liberar a saída de um CRDK, tire uma foto do interior da carreta. O sistema usa IA para detectar o texto da placa na imagem e compara com a placa registrada. Se coincidir, a foto é aceita. Se não, é rejeitada e você deve tirar uma nova foto. A placa deve estar visível, legível e bem iluminada.' },
  { q: 'Como solicitar cadastro de veículo/motorista não encontrado?', a: 'Na página "Acessos", se o veículo ou motorista não for encontrado na base, clique em "Solicitar Autorização de Cadastro". A solicitação vai para administradores e encarregados da sua filial, que podem aprovar ou negar. Você é notificado quando houver resposta.' },
  { q: 'Como exportar relatórios?', a: 'Na página "Relatórios", selecione o período (7, 30 ou 90 dias) e visualize os gráficos. Em "Relatório Personalizado", escolha as colunas e status, e exporte em PDF (com marca d\'água) ou Excel. Em "Modelos Corporativos", gere relatórios prontos de Expedição e Recebimento.' },
  { q: 'Como importar dados via Excel?', a: 'Na página "Exportar/Importar", aba "Importar", selecione um arquivo Excel ou CSV. O sistema detecta automaticamente se são veículos ou motoristas e faz o mapeamento de colunas. Registros existentes são atualizados; novos são criados. Apenas administradores podem importar.' },
  { q: 'Como funcionam as notificações por filial?', a: 'As notificações são segmentadas por filial — você só recebe avisos da sua unidade. Em "Configurações de Notificações", ajuste quais tipos deseja receber (liberação de veículos, entrada/saída, documentação, operações administrativas).' },
  { q: 'Como fazer backup dos dados?', a: 'Em "Configurações", aba "Backup", clique em "Backup Manual" para exportar todos os dados em JSON. O histórico de backups é exibido na mesma aba. Apenas administradores podem realizar backups.' },
  { q: 'Por que os dados aparecem borrados?', a: 'Para proteção de dados (LGPD), dados sensíveis como CPF, CNH e placas são exibidos de forma ofuscada/borrada em listagens. Apenas o status é totalmente visível. Dados completos são acessíveis em operações específicas autorizadas.' },
];