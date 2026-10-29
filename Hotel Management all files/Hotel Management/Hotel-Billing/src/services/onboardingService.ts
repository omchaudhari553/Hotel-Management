import api, { ApiResponse, setAuthTokens } from './api';
import { User, Business, Industry } from '../types';

export interface OnboardingPayload {
  industryType: 'HOTEL' | 'MESS' | 'CAFE';
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  planId: string;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  adminPassword?: string;
}

export interface OnboardingResult {
  token: string;
  tokenType: string;
  user: User;
  business: Business;
  selectedIndustry: Industry;
  dashboardRoute: string;
  message: string;
}

export const onboardingService = {
  completeOnboarding: async (payload: OnboardingPayload): Promise<OnboardingResult> => {
    const registerBody = {
      fullName: payload.ownerName,
      businessName: payload.businessName,
      username: payload.email.split('@')[0] || `user_${Date.now()}`,
      email: payload.email,
      password: payload.adminPassword || 'Admin@123',
      phone: payload.mobile,
      industryType: payload.industryType,
    };

    const response = await api.post<ApiResponse<any>>('/auth/register', registerBody);
    const data = response.data.data;

    // Persist authentication tokens
    setAuthTokens(data.token, data.refreshToken);

    const user: User = {
      id: data.user?.id || 1,
      businessId: data.business?.id || data.user?.businessId || 1,
      businessName: data.business?.name || payload.businessName,
      username: data.user?.username || registerBody.username,
      fullName: data.user?.fullName || payload.ownerName,
      email: data.user?.email || payload.email,
      phone: data.user?.phone || payload.mobile,
      roles: data.user?.roles || ['ADMIN'],
      active: true,
    };

    const business: Business = {
      id: data.business?.id || 1,
      name: data.business?.name || payload.businessName,
      code: data.business?.code || `BIZ_${Date.now()}`,
      industryType: payload.industryType,
      contactEmail: payload.email,
      phone: payload.mobile,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      active: true,
    };

    const selectedIndustry: Industry = {
      id: payload.industryType === 'HOTEL' ? 1 : payload.industryType === 'MESS' ? 2 : 3,
      code: payload.industryType,
      name: payload.industryType.charAt(0) + payload.industryType.slice(1).toLowerCase(),
      description: `${payload.industryType} Management`,
      icon: 'icon',
      active: true,
    };

    localStorage.setItem('ajalkar_user', JSON.stringify(user));
    localStorage.setItem('ajalkar_business', JSON.stringify(business));
    localStorage.setItem('ajalkar_industry', payload.industryType);

    return {
      token: data.token,
      tokenType: data.tokenType || 'Bearer',
      user,
      business,
      selectedIndustry,
      dashboardRoute: `/${payload.industryType.toLowerCase()}/dashboard`,
      message: response.data.message || 'Onboarding completed successfully',
    };
  },
};
