import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { loginApi, getMeApi, setApiSessionId } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessionId, setSessionId] = useState(() => {
    // Cria um identificador único em memória para a sessão na aba
    return localStorage.getItem('access_token') ? crypto.randomUUID() : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Sincroniza a sessão ativa com o módulo de requisições Axios
  useEffect(() => {
    setApiSessionId(sessionId);
  }, [sessionId]);

  // Monitora alterações em outras abas (logout ou troca de usuário)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'access_token') {
        if (!e.newValue) {
          // Token removido em outra aba -> encerra sessão local
          setUser(null);
          setSessionId(null);
          setApiSessionId(null);
        } else if (e.newValue !== e.oldValue) {
          // Token substituído por nova conta em outra aba -> renova identidade da sessão
          const newSession = crypto.randomUUID();
          setSessionId(newSession);
          setApiSessionId(newSession);
          getMeApi()
            .then((userData) => {
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            })
            .catch(() => {
              setUser(null);
              setSessionId(null);
              setApiSessionId(null);
            });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getMeApi()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          if (!sessionId) {
            const newSession = crypto.randomUUID();
            setSessionId(newSession);
            setApiSessionId(newSession);
          }
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
          setSessionId(null);
          setApiSessionId(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSessionId(null);
      setApiSessionId(null);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    const newSession = crypto.randomUUID();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    setSessionId(newSession);
    setApiSessionId(newSession);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setSessionId(null);
    setApiSessionId(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (newUserData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newUserData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const isAdmin = user?.role === 'ADMINISTRACAO';
  const isSecretaria = user?.role === 'SECRETARIA';
  const isDoutora = user?.role === 'DOUTORA';

  return (
    <AuthContext.Provider
      value={{
        sessionId,
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isSecretaria,
        isDoutora,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
