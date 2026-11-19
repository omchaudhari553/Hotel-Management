import api, { ApiResponse } from './api';

export interface Branch {
  id: number;
  businessId?: number;
  name: string;
  code: string;
  parentBranchId?: number | null;
  parentBranchName?: string | null;
  managerName?: string;
  contactPhone?: string;
  email?: string;
  operatingHours?: string;
  address?: string;
  establishedOn?: string;
  status: string;
}

export const branchService = {
  getBranches: async (): Promise<Branch[]> => {
    // 1. If assigned to a specific branch (Branch User / Admin like Pune Admin), return their branch directly
    try {
      const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('ajalkar_user') : null;
      if (savedUserStr) {
        const user = JSON.parse(savedUserStr);
        if (user.branchId) {
          return [
            {
              id: Number(user.branchId),
              name: user.branchName || 'Pune Branch',
              code: user.branchCode || 'PUNE',
              status: 'ACTIVE',
            },
          ];
        }
      }
    } catch {}

    // 2. Check for active auth token before triggering remote request to avoid 401
    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('ajalkar_token')) : null;
    if (!token || !token.startsWith('ey')) {
      return [];
    }

    try {
      const response = await api.get<ApiResponse<Branch[]>>('/hotel/branches');
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  createBranch: async (branch: Partial<Branch>): Promise<Branch> => {
    const body = {
      name: branch.name,
      code: branch.code || `BR-${Date.now()}`,
      parentBranchId: branch.parentBranchId ?? null,
      managerName: branch.managerName || '',
      contactPhone: branch.contactPhone || '',
      email: branch.email || '',
      operatingHours: branch.operatingHours || '9 AM - 10 PM',
      address: branch.address || '',
      establishedOn: branch.establishedOn || new Date().toISOString().split('T')[0],
      status: branch.status || 'ACTIVE',
    };

    const response = await api.post<ApiResponse<Branch>>('/hotel/branches', body);
    return response.data.data;
  },

  updateBranch: async (id: number, branch: Partial<Branch>): Promise<Branch> => {
    const response = await api.put<ApiResponse<Branch>>(`/hotel/branches/${id}`, branch);
    return response.data.data;
  },

  deleteBranch: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/branches/${id}`);
  },

  getOutlets: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/hotel/branches/outlets');
    return response.data.data || [];
  },

  createOutlet: async (branchId: number, outlet: any): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(`/hotel/branches/${branchId}/outlets`, {
      name: outlet.name,
      code: outlet.code,
      type: outlet.type || 'Restaurant',
      contactPhone: outlet.contactPhone || outlet.contact || '',
      status: String(outlet.status || 'Active').toUpperCase(),
    });
    return response.data.data;
  },

  updateOutlet: async (id: number, outlet: any): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/hotel/branches/outlets/${id}`, {
      name: outlet.name,
      code: outlet.code,
      type: outlet.type || 'Restaurant',
      contactPhone: outlet.contactPhone || outlet.contact || '',
      status: String(outlet.status || 'Active').toUpperCase(),
    });
    return response.data.data;
  },

  deleteOutlet: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/branches/outlets/${id}`);
  },

  getBranchAnalytics: async (branchId: number): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/hotel/branches/${branchId}/analytics`);
    return response.data.data;
  },
};

export default branchService;
