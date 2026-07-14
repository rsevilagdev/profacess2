import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { ProfarmaAuthProvider } from '@/lib/auth-context-profarma.jsx';

import LoginProfarma from '@/pages/LoginProfarma';
import SolicitarAcesso from '@/pages/SolicitarAcesso';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import NovoAcesso from '@/pages/NovoAcesso';
import PainelBloqueio from '@/pages/PainelBloqueio';
import EditarBase from '@/pages/EditarBase';
import Relatorios from '@/pages/Relatorios';
import RelatorioPersonalizado from '@/pages/RelatorioPersonalizado';
import ResumoTurnos from '@/pages/ResumoTurnos';
import Notificacoes from '@/pages/Notificacoes';
import Auditoria from '@/pages/Auditoria';
import GerenciamentoFiliais from '@/pages/GerenciamentoFiliais';
import Configuracoes from '@/pages/Configuracoes';
import ConfiguracoesSeguranca from '@/pages/ConfiguracoesSeguranca';
import ExportarDados from '@/pages/ExportarDados';
import Suporte from '@/pages/Suporte';
import TermosUso from '@/pages/TermosUso';
import Perfil from '@/pages/Perfil';
import AuditoriaSistema from '@/pages/AuditoriaSistema';
import ConfiguracoesNotificacoes from '@/pages/ConfiguracoesNotificacoes';
import PlanoTrabalho from '@/pages/PlanoTrabalho';
import MonitorFiliais from '@/pages/MonitorFiliais';
import Modelos from '@/pages/Modelos';
import AcessoCRDK from '@/pages/AcessoCRDK';
import AppLayout from '@/components/layout/AppLayout';

function App() {
  return (
    <AuthProvider>
      <ProfarmaAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<LoginProfarma />} />
              <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/acessos" element={<NovoAcesso />} />
                <Route path="/painel-bloqueio" element={<PainelBloqueio />} />
                <Route path="/editar-base" element={<EditarBase />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/relatorio-personalizado" element={<RelatorioPersonalizado />} />
                <Route path="/resumo-turnos" element={<ResumoTurnos />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/gerenciamento-filiais" element={<GerenciamentoFiliais />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/configuracoes-seguranca" element={<ConfiguracoesSeguranca />} />
                <Route path="/exportar-dados" element={<ExportarDados />} />
                <Route path="/suporte" element={<Suporte />} />
                <Route path="/termos-uso" element={<TermosUso />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/auditoria-sistema" element={<AuditoriaSistema />} />
                <Route path="/configuracoes-notificacoes" element={<ConfiguracoesNotificacoes />} />
                <Route path="/plano-trabalho" element={<PlanoTrabalho />} />
                <Route path="/monitor-filiais" element={<MonitorFiliais />} />
                <Route path="/modelos" element={<Modelos />} />
                <Route path="/acesso-crdk" element={<AcessoCRDK />} />
              </Route>
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ProfarmaAuthProvider>
    </AuthProvider>
  )
}

export default App