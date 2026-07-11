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
import Dashboard from '@/pages/Dashboard';
import Liberacoes from '@/pages/Liberacoes';
import Colaboradores from '@/pages/Colaboradores';
import Filiais from '@/pages/Filiais';
import Solicitacoes from '@/pages/Solicitacoes';
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
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/liberacoes" element={<Liberacoes />} />
                <Route path="/colaboradores" element={<Colaboradores />} />
                <Route path="/filiais" element={<Filiais />} />
                <Route path="/solicitacoes" element={<Solicitacoes />} />
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