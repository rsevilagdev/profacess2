import { useState } from 'react';
import { LifeBuoy, BookOpen, ChevronDown, ChevronUp, MessageSquare, Search, Send, Download, Loader2, ScanLine, Truck, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { MANUAL_SECTIONS, FAQ } from '@/lib/manual-data';
import ManualSection from '@/components/suporte/ManualSection';

const imageUrlToBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

export default function Suporte() {
  const { colaborador } = useProfarmaAuth();
  const [openSection, setOpenSection] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [search, setSearch] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [exporting, setExporting] = useState(false);

  const filteredFaq = FAQ.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  const askQuestion = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    const match = FAQ.find(f => f.q.toLowerCase().includes(userMsg.toLowerCase()) || userMsg.toLowerCase().includes(f.q.toLowerCase().split(' ')[0]));
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: match ? match.a : 'Não encontrei uma resposta exata. Consulte as seções do manual acima ou as perguntas frequentes abaixo. Se persistir, contate o administrador.' }]);
    }, 500);
  };

  const exportManualPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = 30;

      // Capa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(0, 105, 92);
      doc.text('PROFARMA', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(16);
      doc.text('LIBERAAUTO PRO', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(80, 80, 80);
      doc.text('Manual do Operador', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y, { align: 'center' });
      y += 6;
      if (colaborador?.nome) {
        doc.text(`Usuário: ${colaborador.nome}`, pageWidth / 2, y, { align: 'center' });
      }

      // Seções
      for (const section of MANUAL_SECTIONS) {
        doc.addPage();
        y = 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(0, 105, 92);
        doc.text(section.title, margin, y);
        y += 8;

        // Imagem
        if (section.image) {
          try {
            const dataUrl = await imageUrlToBase64(section.image);
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = 55;
            if (y + imgHeight > pageHeight - 20) { doc.addPage(); y = 25; }
            doc.addImage(dataUrl, 'PNG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 6;
          } catch (e) {}
        }

        // Tópicos
        for (const topic of section.topics) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(30, 30, 30);
          if (y > pageHeight - 25) { doc.addPage(); y = 25; }
          doc.text(topic.title, margin, y);
          y += 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(70, 70, 70);
          const lines = doc.splitTextToSize(topic.content, pageWidth - margin * 2);
          for (const line of lines) {
            if (y > pageHeight - 20) { doc.addPage(); y = 25; }
            doc.text(line, margin, y);
            y += 5;
          }
          y += 4;
        }
      }

      // FAQ
      doc.addPage();
      y = 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 105, 92);
      doc.text('Perguntas Frequentes', margin, y);
      y += 8;
      for (const f of FAQ) {
        if (y > pageHeight - 30) { doc.addPage(); y = 25; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        const qLines = doc.splitTextToSize(`P: ${f.q}`, pageWidth - margin * 2);
        for (const line of qLines) {
          if (y > pageHeight - 20) { doc.addPage(); y = 25; }
          doc.text(line, margin, y);
          y += 5;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        const aLines = doc.splitTextToSize(`R: ${f.a}`, pageWidth - margin * 2);
        for (const line of aLines) {
          if (y > pageHeight - 20) { doc.addPage(); y = 25; }
          doc.text(line, margin, y);
          y += 5;
        }
        y += 5;
      }

      // Rodapé em todas as páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`PROFARMA LIBERAAUTO PRO — Manual do Operador — Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save('Manual_PROFARMA_LIBERAAUTO_PRO.pdf');
    } catch (e) {}
    setExporting(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Suporte & Manual do Operador</h1>
          <p className="text-sm text-muted-foreground">Base de conhecimento, manual completo e ajuda interativa</p>
        </div>
        <Button onClick={exportManualPDF} disabled={exporting} className="h-12 rounded-2xl">
          {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Exportar Manual (PDF)
        </Button>
      </div>

      {/* Quick Help */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ScanLine className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-sm mb-1">Acessos & Kanban</h3>
          <p className="text-xs text-muted-foreground">Registro de acesso, fluxo de aprovação e liberação de saída</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-sm mb-1">CRDK & Verificação</h3>
          <p className="text-xs text-muted-foreground">Transferências entre CDs com verificação de placa por IA na foto</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-sm mb-1">Segurança & LGPD</h3>
          <p className="text-xs text-muted-foreground">Dados protegidos, auditoria completa e backup criptografado</p>
        </div>
      </div>

      {/* Manual */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Manual do Sistema</h3>
          <span className="text-xs text-muted-foreground ml-auto">{MANUAL_SECTIONS.length} seções</span>
        </div>
        <div className="space-y-2">
          {MANUAL_SECTIONS.map((section, i) => (
            <ManualSection key={section.id} section={section} isOpen={openSection === i} onToggle={() => setOpenSection(openSection === i ? null : i)} />
          ))}
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
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Perguntas Frequentes</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nas perguntas..." className="flex-1 h-10 px-2 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="space-y-2">
          {filteredFaq.map((f, i) => (
            <div key={i} className="border border-border rounded-2xl overflow-hidden">
              <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50">
                <span className="text-sm font-medium pr-2">{f.q}</span>
                {faqOpen === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {faqOpen === i && <div className="p-4 pt-0 text-sm text-muted-foreground fade-in">{f.a}</div>}
            </div>
          ))}
          {filteredFaq.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>}
        </div>
      </div>
    </div>
  );
}