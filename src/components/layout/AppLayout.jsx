import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import FloatingMenu from './FloatingMenu.jsx';
import TermsModal from '@/components/TermsModal.jsx';
import NotificationBanner from '@/components/NotificationBanner.jsx';
import { Loader2 } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AppLayout() {
  const { colaborador, loading } = useProfarmaAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !colaborador) navigate('/');
  }, [loading, colaborador, navigate]);

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
      <NotificationBanner />
      <TermsModal />
      <main className="pt-20 px-4 md:px-8 pb-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}