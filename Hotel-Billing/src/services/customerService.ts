import api, { ApiResponse } from './api';
import { Customer } from '../types';

export const customerService = {
  getCustomers: async (businessId = 1, search?: string): Promise<Customer[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (search) params.search = search;

    const response = await api.get<ApiResponse<any[]>>('/hotel/guests', { params });
    const guests = response.data.data || [];

    const mapped = guests.map((g) => ({
      id: g.id,
      businessId: g.businessId,
      name: g.fullName || g.name || '',
      phone: g.phone || '',
      email: g.email || '',
      address: g.address || '',
      balance: g.balance || 0,
      loyaltyPoints: g.loyaltyPoints || 0,
    }));

    if (search && search.trim()) {
      const q = search.toLowerCase();
      return mapped.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return mapped;
  },

  createCustomer: async (customer: Partial<Customer>): Promise<Customer> => {
    const body = {
      fullName: customer.name || (customer as any).fullName || 'Customer',
      phone: customer.phone,
      email: customer.email || '',
      idProofType: (customer as any).idProofType || 'AADHAAR',
      idProofNumber: (customer as any).idProofNumber || '',
      address: customer.address || '',
      branchId: (customer as any).branchId || 1,
    };

    const response = await api.post<ApiResponse<any>>('/hotel/guests', body);
    const g = response.data.data;

    return {
      id: g.id,
      businessId: g.businessId,
      name: g.fullName || g.name,
      phone: g.phone,
      email: g.email || '',
      address: g.address || '',
      balance: 0,
      loyaltyPoints: 0,
    };
  },
};
