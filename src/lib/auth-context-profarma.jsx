import { createContext, useContext, useState, useEffect } from 'react';

const ProfarmaAuthContext = createContext(null);

export function ProfarmaAuthProvider({ children }) {
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('profarma_colaborador');
    if (stored) {
      try {
        setColaborador(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('profarma_colaborador');
      }
    }
    setLoading(false);
  }, []);

  const login = (colaboradorData) => {
    localStorage.setItem('profarma_colaborador', JSON.stringify(colaboradorData));
    setColaborador(colaboradorData);
  };

  const logout = () => {
    localStorage.removeItem('profarma_colaborador');
    setColaborador(null);
  };

  const updateColaborador = (data) => {
    const updated = { ...colaborador, ...data };
    localStorage.setItem('profarma_colaborador', JSON.stringify(updated));
    setColaborador(updated);
  };

  const canAccessPage = (pagePath) => {
    if (!colaborador) return false;
    if (colaborador.cargo === 'administrador_master' || colaborador.cargo === 'administrador') return true;
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