import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business, AuthResponse } from '../types';
import { authService, RegisterPayload } from '../services/authService';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (usernameOrEmailOrPhone: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  setSession: (user: User, business: Business, token: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ajalkar_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [business, setBusiness] = useState<Business | null>(() => {
    const saved = localStorage.getItem('ajalkar_business');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || localStorage.getItem('ajalkar_token'));

  useEffect(() => {
    if (user) {
      localStorage.setItem('ajalkar_user', JSON.stringify(user));
    }
    if (business) {
      localStorage.setItem('ajalkar_business', JSON.stringify(business));
    }
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('ajalkar_token', token);
    }
  }, [user, business, token]);

  const setSession = (newUser: User, newBusiness: Business, newToken: string, newRefreshToken?: string) => {
    setUser(newUser);
    setBusiness(newBusiness);
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('ajalkar_token', newToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    localStorage.setItem('ajalkar_user', JSON.stringify(newUser));
    localStorage.setItem('ajalkar_business', JSON.stringify(newBusiness));
    if (newBusiness?.industryType) {
      localStorage.setItem('ajalkar_industry', newBusiness.industryType);
    }
  };

  const login = async (usernameOrEmailOrPhone: string, password: string, rememberMe = false): Promise<AuthResponse> => {
    const res = await authService.login(usernameOrEmailOrPhone, password, rememberMe);
    setUser(res.user);
    setBusiness(res.business);
    setToken(res.token);
    localStorage.setItem('token', res.token);
    localStorage.setItem('ajalkar_token', res.token);
    if (res.refreshToken) {
      localStorage.setItem('refreshToken', res.refreshToken);
    }
    localStorage.setItem('ajalkar_user', JSON.stringify(res.user));
    if (res.business) {
      localStorage.setItem('ajalkar_business', JSON.stringify(res.business));
      if (res.business.industryType) {
        localStorage.setItem('ajalkar_industry', res.business.industryType);
      }
    }
    if (rememberMe) {
      localStorage.setItem('ajalkar_remember_identifier', usernameOrEmailOrPhone);
    } else {
      localStorage.removeItem('ajalkar_remember_identifier');
    }
    return res;
  };

  const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    if (payload.industryType) {
      localStorage.setItem('ajalkar_industry', payload.industryType);
    }
    const res = await authService.register(payload);
    if (res && res.token && res.user) {
      setUser(res.user);
      setBusiness(res.business);
      setToken(res.token);
      localStorage.setItem('token', res.token);
      localStorage.setItem('ajalkar_token', res.token);
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      localStorage.setItem('ajalkar_user', JSON.stringify(res.user));
      if (res.business) {
        localStorage.setItem('ajalkar_business', JSON.stringify(res.business));
        if (res.business.industryType) {
          localStorage.setItem('ajalkar_industry', res.business.industryType);
        } else if (payload.industryType) {
          localStorage.setItem('ajalkar_industry', payload.industryType);
        }
      }
    }
    return res;
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setBusiness(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('ajalkar_token');
      localStorage.removeItem('ajalkar_user');
      localStorage.removeItem('ajalkar_business');
      localStorage.removeItem('ajalkar_industry');
    }
  };

  return (
    <AuthContext.Provider value={{ user, business, token, isAuthenticated: !!user, login, register, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
