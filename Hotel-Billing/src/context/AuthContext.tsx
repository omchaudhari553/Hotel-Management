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
    } else {
      localStorage.removeItem('ajalkar_user');
      localStorage.removeItem('user');
      localStorage.removeItem('superadmin_user');
    }
    if (business) {
      localStorage.setItem('ajalkar_business', JSON.stringify(business));
    } else {
      localStorage.removeItem('ajalkar_business');
    }
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('ajalkar_token', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('ajalkar_token');
      localStorage.removeItem('superadmin_token');
    }
  }, [user, business, token]);

  // Synchronize authentication state across browser tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'ajalkar_user' ||
        e.key === 'token' ||
        e.key === 'ajalkar_token' ||
        e.key === 'ajalkar_business' ||
        e.key === null
      ) {
        try {
          const rawUser = localStorage.getItem('ajalkar_user');
          const rawBiz = localStorage.getItem('ajalkar_business');
          const rawToken = localStorage.getItem('token') || localStorage.getItem('ajalkar_token');

          setUser(rawUser ? JSON.parse(rawUser) : null);
          setBusiness(rawBiz ? JSON.parse(rawBiz) : null);
          setToken(rawToken);
        } catch {
          // ignore parsing error
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    if (newUser?.branchId) {
      localStorage.setItem('ajalkar_selected_branch_id', String(newUser.branchId));
      localStorage.setItem('ajalkar_selected_main_branch_id', String(newUser.branchId));
    } else if (newUser?.role === 'OWNER') {
      localStorage.setItem('ajalkar_selected_branch_id', '1');
      localStorage.setItem('ajalkar_selected_main_branch_id', '1');
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

    if (res.user?.branchId) {
      localStorage.setItem('ajalkar_selected_branch_id', String(res.user.branchId));
      localStorage.setItem('ajalkar_selected_main_branch_id', String(res.user.branchId));
    } else if (res.user?.role === 'OWNER') {
      localStorage.setItem('ajalkar_selected_branch_id', '1');
      localStorage.setItem('ajalkar_selected_main_branch_id', '1');
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
      const savedModules = localStorage.getItem('platform_hotel_modules_status');
      localStorage.clear();
      sessionStorage.clear();
      if (savedModules) {
        localStorage.setItem('platform_hotel_modules_status', savedModules);
      }
    } catch (e) {}
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setBusiness(null);
      setToken(null);
      window.location.replace('/login');
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
  if (!context) {
    let user: User | null = null;
    let business: Business | null = null;
    let token: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        const u = localStorage.getItem('ajalkar_user');
        user = u ? JSON.parse(u) : null;
        const b = localStorage.getItem('ajalkar_business');
        business = b ? JSON.parse(b) : null;
        token = localStorage.getItem('token') || localStorage.getItem('ajalkar_token');
      }
    } catch {}

    return {
      user,
      business,
      token,
      isAuthenticated: !!user,
      login: async (usernameOrEmailOrPhone: string, password: string, rememberMe = false): Promise<AuthResponse> => {
        return await authService.login(usernameOrEmailOrPhone, password, rememberMe);
      },
      register: async (payload: RegisterPayload): Promise<AuthResponse> => {
        return await authService.register(payload);
      },
      setSession: () => {},
      logout: async (): Promise<void> => {
        try {
          await authService.logout();
        } catch {}
      },
    };
  }
  return context;
};
