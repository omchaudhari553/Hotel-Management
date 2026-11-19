import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ensureBackendToken } from './client';
import { BillingSettingsState } from '../types';

const SETTINGS_KEY = '@ajalkar_billing_settings';

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

export const DEFAULT_BILLING_SETTINGS: BillingSettingsState = {
  taxEnabled: true,
  discountEnabled: true,
  roundOffEnabled: true,
  defaultTaxRate: 5,
  currency: 'INR (₹)',
  footerNote: 'Thank you for visiting! Please visit again.',
};

export const settingsService = {
  async getSettings(): Promise<SettingItem[]> {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/settings');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  async saveSetting(category: string, settingKey: string, settingValue: string): Promise<SettingItem | null> {
    try {
      await ensureBackendToken();
      const res = await apiClient.put('/hotel/settings', {
        category,
        settingKey,
        settingValue,
      });
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async getProfile(): Promise<BusinessProfile | null> {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/profile');
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async updateProfile(profile: BusinessProfile): Promise<BusinessProfile | null> {
    try {
      await ensureBackendToken();
      const res = await apiClient.put('/hotel/profile', profile);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async getBillingSettings(): Promise<BillingSettingsState> {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/settings').catch(() => null);
      const items: SettingItem[] = res?.data?.data || [];
      const billingItem = items.find(
        (s) => s.category === 'billing' && (s.settingKey === 'general_config' || s.settingKey === 'billing_settings')
      );
      if (billingItem && billingItem.settingValue) {
        try {
          const parsed = JSON.parse(billingItem.settingValue);
          return { ...DEFAULT_BILLING_SETTINGS, ...parsed };
        } catch {}
      }
    } catch {}

    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
    return DEFAULT_BILLING_SETTINGS;
  },

  async saveBillingSettings(settings: BillingSettingsState): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    try {
      await ensureBackendToken();
      await apiClient.put('/hotel/settings', {
        category: 'billing',
        settingKey: 'general_config',
        settingValue: JSON.stringify(settings),
      });
    } catch {}
  },
};

export default settingsService;
