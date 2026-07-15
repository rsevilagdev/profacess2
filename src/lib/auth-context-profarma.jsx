import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ProfarmaAuthContext = createContext(null);

export function ProfarmaAuthProvider({ children }) {
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);
  const colaboradorIdRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('profarma_colaborador');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setColaborador(parsed);
        colaboradorIdRef.current = parsed.id;
      } catch (e) {
        localStorage.removeItem('profarma_colaborador');
      }
    }
    setLoading(false);
  }, []);

  // Realtime subscription: auto-sync permissions when admin changes this user's record
  useEffect(() => {
    const unsub = base44.entities.Colaborador.subscribe(async (event) => {
      if (!colaboradorIdRef.current) return;
      const changedId = event.data?.id;
      if (changedId !== colaboradorIdRef.current) return;
      try {
        const updated = await base44.entities.Colaborador.get(colaboradorIdRef.current);
        const current = JSON.parse(localStorage.getItem('profarma_colaborador') || '{}');
        const merged = { ...current, ...updated, filial_id: current.filial_id, filial_nome: current.filial_nome, filiais_permitidas: current.filiais_permitidas };
        localStorage.setItem('profarma_colaborador', JSON.stringify(merged));
        setColaborador(merged);
      } catch (e) { /* silent */ }
    });
    return unsub;
  }, []);

  const login = (colaboradorData) => {
    localStorage.setItem('profarma_colaborador', JSON.stringify(colaboradorData));
    setColaborador(colaboradorData);
    colaboradorIdRef.current = colaboradorData.id;
  };

  const logout = () => {
    localStorage.removeItem('profarma_colaborador');
    setColaborador(null);
    colaboradorIdRef.current = null;
  };

  const updateColaborador = (data) => {
    const updated = { ...colaborador, ...data };
    localStorage.setItem('profarma_colaborador', JSON.stringify(updated));
    setColaborador(updated);
  };

  const OPERATOR_ALWAYS_PAGES = ['/acessos', '/acesso-crdk', '/verificacao-rapida', '/notificacoes'];

  const canAccessPage = (pagePath) => {
    if (!colaborador) return false;
    if (colaborador.cargo === 'administrador_master' || colaborador.cargo === 'administrador') return true;
    if (colaborador.cargo === 'operador' && OPERATOR_ALWAYS_PAGES.includes(pagePath)) return true;
    if (!colaborador.paginas_permitidas || colaborador.paginas_permitidas.length === 0) return true;
    const pages = colaborador.paginas_permitidas.split(',').map(p => p.trim());
    return pages.includes(pagePath);
  };

  const needsTermsAcceptance = () => {
    return colaborador && !colaborador.termos_aceitos;
  };

  return (
    <ProfarmaAuthContext.Provider value={{
      colaborador, loading, login, logout, updateColaborador, canAccessPage, needsTermsAcceptance
    }}>
      {children}
    </ProfarmaAuthContext.Provider>
  );
}

export function useProfarmaAuth() {
  const ctx = useContext(ProfarmaAuthContext);
  if (!ctx) throw new Error('useProfarmaAuth deve ser usado dentro de ProfarmaAuthProvider');
  return ctx;
}