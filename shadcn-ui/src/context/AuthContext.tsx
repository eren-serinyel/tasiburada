import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/types';
import {
  getAuthToken,
  clearAuth,
  getUserType,
  getUserId,
  getUserName,
  getUserEmail,
} from '@/lib/auth';
import { getSessionUser, setSessionUser, clearSessionUser } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  userType: 'customer' | 'carrier' | null;
  isAuthenticated: boolean;
  login: (token: string, sessionUser: User, ttlMs?: number) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Builds a minimal User from JWT if session storage has no entry */
function buildUserFromToken(): User | null {
  const tokenType = getUserType();
  const tokenId = getUserId();
  if (!tokenType || !tokenId) return null;

  const name = getUserName() || 'Kullanıcı';
  const [firstName = name, ...rest] = name.split(' ');

  return {
    id: tokenId,
    name: firstName,
    surname: rest.join(' '),
    email: getUserEmail(),
    phone: '',
    city: '',
    type: tokenType,
    createdAt: new Date(),
    pictureUrl: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSessionUser() ?? buildUserFromToken());
  const [userType, setUserType] = useState<'customer' | 'carrier' | null>(
    () => getSessionUser()?.type ?? getUserType()
  );

  const refreshUser = useCallback(() => {
    const sessionUser = getSessionUser();
    if (sessionUser) {
      setUser(sessionUser);
      setUserType(sessionUser.type);
    } else if (getAuthToken()) {
      const tokenUser = buildUserFromToken();
      setUser(tokenUser);
      setUserType(tokenUser?.type ?? null);
    } else {
      setUser(null);
      setUserType(null);
    }
  }, []);

  /** Called after a successful login — saves token + session and updates state */
  const login = useCallback(
    (token: string, sessionUser: User, ttlMs = 5 * 24 * 60 * 60 * 1000) => {
      localStorage.setItem('authToken', token);
      setSessionUser(sessionUser, ttlMs);
      setUser(sessionUser);
      setUserType(sessionUser.type);
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth();
    clearSessionUser();
    setUser(null);
    setUserType(null);
  }, []);

  // Stay in sync when another tab modifies localStorage
  useEffect(() => {
    const handleStorage = () => refreshUser();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser]);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, userType, isAuthenticated, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
