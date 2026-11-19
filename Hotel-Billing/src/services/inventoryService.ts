import api, { ApiResponse } from './api';
import { Product, StockMovement } from '../types';

export const inventoryService = {
  getProducts: async (businessId = 1, category?: string, lowStockOnly?: boolean): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (category) params.category = category;
    if (lowStockOnly !== undefined) params.lowStockOnly = lowStockOnly;

    const response = await api.get<ApiResponse<Product[]>>('/hotel/inventory/products', { params });
    return response.data.data || [];
  },

  createProduct: async (product: Partial<Product>): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/hotel/inventory/products', product);
    return response.data.data;
  },

  adjustStock: async (payload: {
    businessId?: number;
    productId: number;
    movementType: string;
    quantity: number;
    referenceId?: string;
    notes?: string;
  }): Promise<StockMovement> => {
    const response = await api.post<ApiResponse<StockMovement>>('/hotel/inventory/adjust', payload);
    return response.data.data;
  },

  getMovements: async (businessId = 1): Promise<StockMovement[]> => {
    const response = await api.get<ApiResponse<StockMovement[]>>('/hotel/inventory/movements', {
      params: { businessId },
    });
    return response.data.data || [];
  },
};
