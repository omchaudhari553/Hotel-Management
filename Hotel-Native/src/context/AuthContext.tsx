import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business } from '../types';
import { authService } from '../api/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  business: Business | null;
  isLoading: boolean;
  login: (credentials: { usernameOrEmail: string; password: string }) => Promise<void>;
  register: (details: any) => Promise<void>;
  logout: () => Promise<void>;
  setBusiness: (business: Business) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        setUser(session.user);
        setToken(session.token);
        setBusiness(session.business);
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (credentials: { usernameOrEmail: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      setToken(res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (details: any) => {
    setIsLoading(true);
    try {
      const res = await authService.register(details);
      setUser(res.user);
      setToken(res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        business,
        isLoading,
        login,
        register,
        logout,
        setBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
