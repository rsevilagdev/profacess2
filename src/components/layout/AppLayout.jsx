import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import FloatingMenu from './FloatingMenu.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import QuickNotifications from './QuickNotifications.jsx';
import TermsModal from '@/components/TermsModal.jsx';
import NotificationBanner from '@/components/NotificationBanner.jsx';
import { Loader2, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getCuritibaHour, getCuritibaMinute } from '@/lib/curitiba-time.js';
import { enforceSystemTimezone } from '@/lib/timezone-enforcer.js';
import { storeUserContext } from '@/lib/push-manager.js';

export default function AppLayout() {
  const { colaborador, loading, logout } = useProfarmaAuth();
  const navigate = useNavigate();
  const [forceLogoutMsg, setForceLogoutMsg] = useState(null);
  const lastCheckRef = useRef('');

  useEffect(() => {
    if (!loading && !colaborador) navigate('/');
  }, [loading, colaborador, navigate]);

  // Enforce system timezone (America/Sao_Paulo) for all date/time operations
  useEffect(() => {
    if (colaborador) {
      enforceSystemTimezone();
      storeUserContext(colaborador);
    }
  }, [colaborador]);

  // Forced logout at 07:00 and 19:00 for portaria users (operador)
  useEffect(() => {
    if (!colaborador) return;
    const checkTurno = () => {
      const hh = getCuritibaHour();
      const mm = getCuritibaMinute();
      const key = `${hh}:${mm}`;
      if (lastCheckRef.current === key) return;
      lastCheckRef.current = key;

      // 07:00 and 19:00 — exact minute
      if ((hh === 7 || hh === 19) && mm === 0) {
        setForceLogoutMsg('Fechamento de turno (07:00 / 19:00). Você será desconectado.');
        setTimeout(() => {
          logout();
          navigate('/');
        }, 3000);
      }
    };
    checkTurno();
    const interval = setInterval(checkTurno, 30000);
    return () => clearInterval(interval);
  }, [colaborador, logout, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!colaborador) return null;

  return (
    <div className="min-h-screen bg-background" style={{ userSelect: 'none' }}>
      <FloatingMenu />
      {/* Global search bar — second row on mobile, inline on desktop */}
      <div className="fixed top-[68px] left-4 right-4 z-30 sm:top-3 sm:right-[72px] sm:left-auto sm:w-72 md:w-96">
        <GlobalSearch />
      </div>
      <QuickNotifications />
      <NotificationBanner />
      <TermsModal />
      {forceLogoutMsg && (
        <div className="fixed inset-0 z-[60] bg-foreground/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
            <LogOut className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="font-heading font-bold text-lg mb-1">Fechamento de Turno</p>
            <p className="text-sm text-muted-foreground">{forceLogoutMsg}</p>
          </div>
        </div>
      )}
      <main className="pt-32 sm:pt-20 px-4 md:px-8 pb-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}