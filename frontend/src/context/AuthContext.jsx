// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sentinel_auth')) || null; }
    catch { return null; }
  });

  useEffect(() => {
    if (auth) localStorage.setItem('sentinel_auth', JSON.stringify(auth));
    else localStorage.removeItem('sentinel_auth');
  }, [auth]);

  const login = async (email, password) => {
    try {
      const data = await authApi.login({ email, password });
      setAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch (e) {
      // 429 rate limit (authLimiter)
      if (e.status === 429) return { success: false, error: 'Too many attempts. Please try again in a minute.' };
      // 400 Zod validation (e.g., malformed email)
      if (e.status === 400 && Array.isArray(e.details) && e.details.length) {
        const first = e.details[0];
        const field = Array.isArray(first.path) ? first.path[0] : null;
        const msg = first.message || 'Validation failed.';
        return { success: false, error: msg, field, details: e.details };
      }
      // 401 invalid credentials
      if (e.status === 401) return { success: false, error: 'Invalid email or password.' };
      return { success: false, error: e.message || 'Login failed.' };
    }
  };

  const register = async (email, password, confirmPassword) => {
    try {
      const data = await authApi.register({ email, password, confirmPassword });
      setAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch (e) {
      if (e.status === 409) return { success: false, error: 'User already exists. Try signing in.' };
      if (e.status === 400 && Array.isArray(e.details) && e.details.length) {
        const first = e.details[0];
        const field = Array.isArray(first.path) ? first.path[0] : null;
        const msg = first.message || 'Validation failed.';
        return { success: false, error: msg, field, details: e.details };
      }
      return { success: false, error: e.message || 'Registration failed.' };
    }
  };

  const logout = () => setAuth(null);

  const value = useMemo(() => ({
    user: auth?.user || null,
    token: auth?.token || null,
    isAuthenticated: !!auth?.token,
    login, register, logout
  }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
