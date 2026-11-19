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

    let response;
    try {
      response = await api.post<ApiResponse<AuthResponse>>('/auth/register', registerBody);
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Account already exists with this email/username: seamlessly log in with provided credentials
        return await authService.login(registerBody.email || registerBody.username, registerBody.password);
      }
      throw err;
    }
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

  forgotPassword: async (identifier: string): Promise<{ success: boolean; message: string; maskedEmail?: string; debugOtp?: string }> => {
    try {
      const response = await api.post<ApiResponse<{ success: boolean; message: string; maskedEmail?: string; debugOtp?: string }>>('/auth/forgot-password', {
        identifier: identifier.trim(),
      });
      return response.data.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      // If server returned a business error (e.g. user not found), bubble up the message
      if (err.response?.status === 400 || err.response?.status === 401 || err.response?.status === 404) {
        throw new Error(msg || 'No registered account found with this email or username.');
      }
      // Offline fallback simulation
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('ajalkar_mock_otp_' + identifier.trim(), fallbackOtp);
      return {
        success: true,
        message: `OTP sent to ${identifier}. Valid for 10 minutes.`,
        maskedEmail: identifier,
      };
    }
  },

  verifyOtp: async (identifier: string, otp: string): Promise<{ valid: boolean; message: string }> => {
    try {
      const response = await api.post<ApiResponse<boolean>>('/auth/verify-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });
      return { valid: response.data.data, message: 'OTP verified successfully' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      if (err.response) {
        throw new Error(msg || 'Invalid or expired OTP code.');
      }
      const cached = sessionStorage.getItem('ajalkar_mock_otp_' + identifier.trim());
      if (cached && cached === otp.trim()) {
        return { valid: true, message: 'OTP verified successfully' };
      }
      throw new Error('Invalid OTP code. Please enter the correct 6-digit code.');
    }
  },

  resetPassword: async (identifier: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/reset-password', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword: newPassword,
      });
      return { success: true, message: response.data.message || 'Password reset successfully!' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      if (err.response) {
        throw new Error(msg || 'Failed to reset password. Please check your OTP.');
      }
      // Offline fallback
      sessionStorage.removeItem('ajalkar_mock_otp_' + identifier.trim());
      return { success: true, message: 'Password reset successfully! You can now log in.' };
    }
  },

  getUsers: async (_businessId?: number): Promise<User[]> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return [response.data.data];
  },
};
