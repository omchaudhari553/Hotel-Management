import api, { ApiResponse } from './api';
import { Industry, IndustryContext, Business } from '../types';

const FALLBACK_INDUSTRIES: Industry[] = [
  {
    id: 1,
    code: 'HOTEL',
    name: 'Hotel & Restaurant',
    description: 'Hotel and restaurant dining management',
    icon: 'hotel',
    active: true,
  },
  {
    id: 2,
    code: 'MESS',
    name: 'Mess',
    description: 'Mess and meal management',
    icon: 'utensils',
    active: true,
  },
  {
    id: 3,
    code: 'CAFE',
    name: 'Cafe',
    description: 'Cafe and table-order management',
    icon: 'coffee',
    active: true,
  },
];

export const industryService = {
  getIndustries: async (): Promise<Industry[]> => {
    try {
      const response = await api.get<ApiResponse<Industry[]>>('/industries');
      return response.data?.data && response.data.data.length > 0
        ? response.data.data
        : FALLBACK_INDUSTRIES;
    } catch {
      return FALLBACK_INDUSTRIES;
    }
  },

  getIndustryByCode: async (code: string): Promise<Industry> => {
    try {
      const response = await api.get<ApiResponse<Industry>>(`/industries/${code}`);
      return response.data?.data || FALLBACK_INDUSTRIES.find(i => i.code === code) || FALLBACK_INDUSTRIES[0];
    } catch {
      return FALLBACK_INDUSTRIES.find(i => i.code === code) || FALLBACK_INDUSTRIES[0];
    }
  },

  selectIndustry: async (industry: string, businessId?: number): Promise<IndustryContext> => {
    try {
      const response = await api.post<ApiResponse<IndustryContext>>('/industries/select', {
        industry,
        businessId,
      });
      return response.data?.data;
    } catch {
      const ind = FALLBACK_INDUSTRIES.find(i => i.code === industry) || FALLBACK_INDUSTRIES[0];
      return {
        business: {} as any,
        selectedIndustry: ind,
        availableModules: [],
        dashboardRoute: `/${ind.code.toLowerCase()}/dashboard`,
        message: `Switched to ${ind.name}`,
      };
    }
  },

  getBusinesses: async (): Promise<Business[]> => {
    try {
      const response = await api.get<ApiResponse<Business[]>>('/businesses');
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  getModuleStatuses: async (): Promise<Record<string, boolean>> => {
    try {
      const response = await api.get<ApiResponse<Record<string, boolean>>>('/industries/modules/status');
      if (response.data?.data && typeof response.data.data === 'object') {
        const statusMap = response.data.data;
        try {
          localStorage.setItem('platform_hotel_modules_status', JSON.stringify(statusMap));
          window.dispatchEvent(new CustomEvent('platform-modules-updated', { detail: statusMap }));
        } catch {}
        return statusMap;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  updateModuleStatus: async (moduleCode: string, active: boolean): Promise<Record<string, boolean>> => {
    try {
      const response = await api.post<ApiResponse<Record<string, boolean>>>('/industries/modules/status', {
        moduleCode,
        active,
      });
      if (response.data?.data && typeof response.data.data === 'object') {
        const updated = response.data.data;
        try {
          localStorage.setItem('platform_hotel_modules_status', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('platform-modules-updated', { detail: updated }));
          const bc = new BroadcastChannel('hotel_platform_modules');
          bc.postMessage(updated);
        } catch {}
        return updated;
      }
    } catch {}

    // Fallback: update local storage
    try {
      let current: Record<string, boolean> = {};
      const raw = localStorage.getItem('platform_hotel_modules_status');
      if (raw) current = JSON.parse(raw);
      current[moduleCode] = active;
      if (moduleCode === 'HOTEL_OVERVIEW') current['HOTEL_DASHBOARD'] = active;
      if (moduleCode === 'HOTEL_KOT') current['KOT'] = active;
      if (moduleCode === 'HOTEL_BILLING') current['POS_BILLING'] = active;
      if (moduleCode === 'HOTEL_TABLES') current['TABLE_MGMT'] = active;
      if (moduleCode === 'HOTEL_PURCHASE') {
        current['PURCHASE'] = active;
        current['INVENTORY'] = active;
      }
      if (moduleCode === 'HOTEL_STAFF') current['STAFF_PAYROLL'] = active;
      if (moduleCode === 'HOTEL_SETTINGS') {
        current['HOTEL_REPORTS'] = active;
        current['REPORTS'] = active;
      }
      localStorage.setItem('platform_hotel_modules_status', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('platform-modules-updated', { detail: current }));
      try {
        const bc = new BroadcastChannel('hotel_platform_modules');
        bc.postMessage(current);
      } catch {}
      return current;
    } catch {
      return {};
    }
  },
};

