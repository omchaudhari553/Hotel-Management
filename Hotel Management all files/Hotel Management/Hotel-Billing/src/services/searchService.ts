import api, { ApiResponse } from './api';

export interface SearchResultItem {
  id: string;
  type: 'TABLE' | 'ORDER' | 'KOT' | 'INVOICE' | 'PAYMENT' | 'PURCHASE' | 'DELIVERY' | 'BRANCH' | 'STAFF';
  title: string;
  subtitle: string;
  tag: string;
  path: string;
}

export const searchService = {
  search: async (query: string, branchId?: number | null): Promise<SearchResultItem[]> => {
    if (!query || !query.trim()) return [];
    try {
      const params: any = { q: query.trim() };
      if (branchId) params.branchId = branchId;
      const res = await api.get<ApiResponse<SearchResultItem[]>>('/search', { params });
      return res.data.data || [];
    } catch (err) {
      console.warn('Global search query failed:', err);
      return [];
    }
  },
};
