import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('civele_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authService.login(email, password);
      localStorage.setItem('civele_token', data.token);
      localStorage.setItem('civele_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, rol: data.user.rol };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al iniciar sesion' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const { data } = await authService.register(formData);
      localStorage.setItem('civele_token', data.token);
      localStorage.setItem('civele_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, rol: data.user.rol };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al registrarse' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('civele_token');
    localStorage.removeItem('civele_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
