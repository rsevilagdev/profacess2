import { useState } from 'react';
import { LifeBuoy, BookOpen, ChevronDown, ChevronUp, MessageSquare, Search, Send } from 'lucide-react';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';

const FAQ = [
  { q: 'Como faço a validação de um motorista?', a: 'Na página "Novo Acesso", busque o veículo pela placa. Em seguida, clique no botão "Escanear QR Code" para verificar os documentos do motorista terceirizado. O sistema validará automaticamente a autenticidade e o status do motorista na base de dados.' },
  { q: 'Como proceder em caso de erro nos dados do veículo?', a: 'Se os dados do veículo estiverem incorretos, acesse "Editar Base de Dados", busque o veículo pela placa e clique no ícone de edição. Após corrigir, o status será atualizado imediatamente. Se o erro for de bloqueio indevido, altere o status para "ativo".' },
  { q: 'O que fazer quando um veículo está bloqueado?', a: 'Veículos bloqueados não podem ser liberados. O sistema exibirá um alerta vermelho. Para desbloquear, um administrador deve acessar "Editar Base de Dados", localizar o veículo e alterar o status para "ativo".' },
  { q: 'Como funciona a integração com a cancela automática?', a: 'Após validar o veículo e o motorista, o sistema envia o comando de abertura da cancela. Uma animação visual confirma o acionamento. Os logs de comunicação são registrados em tempo real. Em caso de falha de comunicação, o operador deve verificar a conexão e tentar novamente.' },
  { q: 'Como exportar relatórios contábeis?', a: 'Acesse "Relatório Personalizado", selecione as colunas e status desejados, e clique em "Exportar PDF" (com marca d\'água confidencial) ou "Exportar Excel" (protegido com senha do CPF do administrador).' },
  { q: 'Como solicitar acesso a outras filiais?', a: 'Na página "Perfil", clique em "Solicitar Novas Permissões". O sistema enviará um email aos administradores que poderão autorizar o acesso. Após aprovação, as permissões serão adicionadas automaticamente.' },
  { q: 'Como funciona o backup automático?', a: 'O sistema realiza backups periódicos automáticos em segundo plano, armazenados de forma criptografada na nuvem. O indicador de sincronização no painel principal mostra o status. Backups manuais podem ser acionados em "Configurações > Backup".' },
  { q: 'Por que os dados aparecem borrados?', a: 'Para proteção de dados (LGPD), a maioria dos dados sensíveis (CPF, CNH, placas) são exibidos de forma ofuscada/borrada. Apenas o status é totalmente visível. Dados completos são acessíveis apenas em operações específicas autorizadas.' },
];

export default function Suporte() {
  const { colaborador } = useProfarmaAuth();
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const filtered = FAQ.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  const askQuestion = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    const match = FAQ.find(f => f.q.toLowerCase().includes(userMsg.toLowerCase()) || userMsg.toLowerCase().includes(f.q.toLowerCase().split(' ')[0]));
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: match ? match.a : 'Não encontrei uma resposta exata para sua pergunta. Tente reformular ou consulte as perguntas frequentes abaixo. Se persistir, contate o administrador do sistema.' }]);
    }, 500);
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Suporte & Manual do Operador</h1>
        <p className="text-sm text-muted-foreground">Base de conhecimento e ajuda interativa</p>
      </div>

      {/* Quick Help */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <BookOpen className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-heading font-bold text-sm mb-1">Validação de Motoristas</h3>
          <p className="text-xs text-muted-foreground">Busque o veículo e escaneie o QR Code do motorista</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <LifeBuoy className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-heading font-bold text-sm mb-1">Cancela Automática</h3>
          <p className="text-xs text-muted-foreground">Liberação automática após validação bem-sucedida</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <MessageSquare className="h-6 w-6 text-primary mb-2" />
          <h3 className="font-heading font-bold text-sm mb-1">Chat de Suporte</h3>
          <p className="text-xs text-muted-foreground">Tire dúvidas com o assistente interativo</p>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Assistente de Suporte</h3>
          <button onClick={() => setShowChat(!showChat)} className="text-sm text-primary hover:underline">{showChat ? 'Fechar' : 'Abrir chat'}</button>
        </div>
        {showChat && (
          <div className="fade-in">
            <div className="bg-muted rounded-2xl p-4 h-64 overflow-y-auto mb-3 space-y-2">
              {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Faça uma pergunta sobre o sistema...</p>}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>{m.content}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && askQuestion()} placeholder="Digite sua pergunta..." className="flex-1 h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={askQuestion} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nas perguntas frequentes..." className="flex-1 h-10 px-2 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="space-y-2">
          {filtered.map((f, i) => (
            <div key={i} className="border border-border rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50">
                <span className="text-sm font-medium">{f.q}</span>
                {open === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {open === i && <div className="p-4 pt-0 text-sm text-muted-foreground fade-in">{f.a}</div>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>}
        </div>
      </div>
    </div>
  );
}