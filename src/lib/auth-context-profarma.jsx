import { createContext, useContext, useState, useEffect } from 'react';

const ProfarmaAuthContext = createContext(null);

export function ProfarmaAuthProvider({ children }) {
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('profarma_user');
    if (stored) {
      setColaborador(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = (user) => {
    localStorage.setItem('profarma_user', JSON.stringify(user));
    setColaborador(user);
  };

  const logout = () => {
    localStorage.removeItem('profarma_user');
    setColaborador(null);
  };

  return (
    <ProfarmaAuthContext.Provider value={{ colaborador, login, logout, loading }}>
      {children}
    </ProfarmaAuthContext.Provider>
  );
}

export function useProfarmaAuth() {
  return useContext(ProfarmaAuthContext);
}