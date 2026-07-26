import React, { createContext, useCallback, useContext, useState } from 'react';
import { Permission, User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: () => boolean;
  canManageUsers: () => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) =>
      !!user && (user.role === 'admin' || user.role === 'master' || user.permissions?.includes(permission)),
    [user]
  );

  const isAdmin = useCallback(() => user?.role === 'admin', [user]);

  const canManageUsers = useCallback(() => user?.role === 'admin' || user?.role === 'master', [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission, isAdmin, canManageUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
