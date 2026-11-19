import api, { ApiResponse, getAuthToken } from './api';

export interface SettingItem {
  id?: number;
  category: string;
  settingKey: string;
  settingValue: string;
}

export interface BusinessProfile {
  id?: number;
  name: string;
  ownerName?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  currency?: string;
  taxNumber?: string;
}

export const settingsService = {
  getSettings: async (): Promise<SettingItem[]> => {
    const token = getAuthToken();
    if (!token) {
      return [];
    }
    try {
      const response = await api.get<ApiResponse<SettingItem[]>>('/hotel/settings');
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  saveSetting: async (category: string, settingKey: string, settingValue: string): Promise<SettingItem> => {
    const response = await api.put<ApiResponse<SettingItem>>('/hotel/settings', {
      category,
      settingKey,
      settingValue,
    });
    return response.data?.data;
  },

  getProfile: async (): Promise<BusinessProfile> => {
    const token = getAuthToken();
    if (!token) {
      return { name: '' };
    }
    try {
      const response = await api.get<ApiResponse<BusinessProfile>>('/hotel/profile');
      return response.data?.data || { name: '' };
    } catch {
      return { name: '' };
    }
  },

  updateProfile: async (profile: BusinessProfile): Promise<BusinessProfile> => {
    const response = await api.put<ApiResponse<BusinessProfile>>('/hotel/profile', profile);
    return response.data?.data;
  },
};

export default settingsService;
