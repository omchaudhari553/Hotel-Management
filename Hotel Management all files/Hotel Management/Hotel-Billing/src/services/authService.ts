import api, { ApiResponse, setAuthTokens, clearAuthTokens } from './api';
import { AuthResponse, User, Business } from '../types';

export interface RegisterPayload {
  fullName: string;
  businessName?: string;
  username?: string;
  email: string;
  password: string;
  phone?: string;
  industryType?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  login: async (identifierOrUsername: string, password: string, rememberMe = false): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      identifier: identifierOrUsername,
      password: password,
      rememberMe: rememberMe,
    });

    const data = response.data.data;

    // Save tokens and session
    setAuthTokens(data.token, data.refreshToken);
    if (data.user) {
      localStorage.setItem('ajalkar_user', JSON.stringify(data.user));
    }
    if (data.business) {
      localStorage.setItem('ajalkar_business', JSON.stringify(data.business));
      if (data.business.industryType) {
        localStorage.setItem('ajalkar_industry', data.business.industryType);
      }
    }

    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const registerBody = {
      fullName: payload.fullName,
      businessName: payload.businessName || `${payload.fullName} Hotel`,
      username: payload.username || (payload.email ? payload.email.split('@')[0] : `user_${Date.now()}`),
      email: payload.email,
      password: payload.password,
      phone: payload.phone || '0000000000',
      industryType: payload.industryType || 'HOTEL',
    };

    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', registerBody);
    const data = response.data.data;

    // Save tokens and session
    setAuthTokens(data.token, data.refreshToken);
    if (data.user) {
      localStorage.setItem('ajalkar_user', JSON.stringify(data.user));
    }
    if (data.business) {
      localStorage.setItem('ajalkar_business', JSON.stringify(data.business));
      if (data.business.industryType) {
        localStorage.setItem('ajalkar_industry', data.business.industryType);
      }
    }

    return data;
  },

  refreshToken: async (token?: string): Promise<AuthResponse> => {
    const refreshToken = token || localStorage.getItem('refreshToken') || '';
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refreshToken: refreshToken,
    });

    const data = response.data.data;
    setAuthTokens(data.token, data.refreshToken);
    return data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    try {
      await api.post<ApiResponse<void>>(
        '/auth/logout',
        {},
        {
          headers: {
            'X-Refresh-Token': refreshToken,
          },
        }
      );
    } finally {
      clearAuthTokens();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.post<ApiResponse<void>>('/auth/change-password', payload);
  },

  getUsers: async (_businessId?: number): Promise<User[]> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return [response.data.data];
  },
};
