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
};

