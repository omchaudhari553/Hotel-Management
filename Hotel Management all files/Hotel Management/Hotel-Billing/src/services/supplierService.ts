import api, { ApiResponse } from './api';
import { Supplier } from '../types';
import { purchaseDataBundle } from './purchaseDataBundle';

export const supplierService = {
  getSuppliers: async (businessId = 1): Promise<Supplier[]> => {
    try {
      const response = await api.get<ApiResponse<Supplier[]>>('/hotel/suppliers', {
        params: { businessId },
      });
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend suppliers fetch failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.suppliers as unknown as Supplier[]) || [];
  },

  getSupplierById: async (id: number): Promise<Supplier> => {
    const response = await api.get<ApiResponse<Supplier>>(`/hotel/suppliers/${id}`);
    return response.data.data;
  },

  createSupplier: async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const body = {
      name: supplier.name,
      company: supplier.company || supplier.name || 'Vendor Company',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      status: supplier.status || 'ACTIVE',
      branchId: (supplier as any).branchId || 1,
    };

    const response = await api.post<ApiResponse<Supplier>>('/hotel/suppliers', body);
    return response.data.data;
  },

  updateSupplier: async (id: number, supplier: Partial<Supplier>): Promise<Supplier> => {
    const body = {
      name: supplier.name,
      company: supplier.company || supplier.name,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      status: supplier.status || 'ACTIVE',
      branchId: (supplier as any).branchId || 1,
    };

    const response = await api.put<ApiResponse<Supplier>>(`/hotel/suppliers/${id}`, body);
    return response.data.data;
  },

  deleteSupplier: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/suppliers/${id}`);
  },
};

export default supplierService;
