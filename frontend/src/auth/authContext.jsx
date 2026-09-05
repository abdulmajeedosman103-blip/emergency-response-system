// frontend/src/auth/authContext.jsx
// Simple, maintainable auth state: token in localStorage, session verified via /auth/me.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      try {
        if (!getToken()) {
          return;
        }
        const { data } = await api.me();
        if (active) {
          setUser(data);
        }
      } catch {
        clearToken();
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.login(credentials);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback((payload) => api.register(payload), []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}