import api, { ApiResponse } from './api';

export type KotStatusType =
  | 'PENDING'
  | 'SENT_TO_KITCHEN'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'BILL_REQUESTED'
  | 'BILLED'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export interface KotItem {
  id: number;
  kotNumber: string;
  orderId?: number;
  orderNumber?: string;
  orderStatus?: string;
  guestName?: string;
  customerName?: string;
  guestCount?: number;
  tableId?: number;
  tableName?: string;
  tableNumber?: string;
  branchId?: number;
  branchName?: string;
  totalAmount?: number;
  discount?: number;
  taxRate?: number;
  status: KotStatusType;
  instructions?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: Array<{
    id?: number;
    name: string;
    itemName?: string;
    quantity: number;
    qty?: number;
    unitPrice?: number;
    price?: number;
    totalPrice?: number;
    customization?: string;
  }>;
}

export interface KotPayload {
  branchId?: number;
  orderId?: number;
  instructions?: string;
}

export const kotService = {
  getKots: async (branchId?: number, dateFilter?: { startDate?: string; endDate?: string }): Promise<KotItem[]> => {
    const params: Record<string, any> = branchId ? { branchId } : {};
    if (dateFilter?.startDate) params.startDate = dateFilter.startDate;
    if (dateFilter?.endDate) params.endDate = dateFilter.endDate;
    const response = await api.get<ApiResponse<KotItem[]>>('/hotel/kot', { params });
    return response.data.data || [];
  },

  getKotById: async (id: number): Promise<KotItem> => {
    const response = await api.get<ApiResponse<KotItem>>(`/hotel/kot/${id}`);
    return response.data.data;
  },

  createKot: async (payload: KotPayload): Promise<KotItem> => {
    const body = {
      branchId: payload.branchId,
      orderId: payload.orderId || null,
      instructions: payload.instructions || '',
    };
    const response = await api.post<ApiResponse<KotItem>>('/hotel/kot', body);
    return response.data.data;
  },

  updateKotStatus: async (id: number, status: string): Promise<KotItem> => {
    const response = await api.patch<ApiResponse<KotItem>>(`/hotel/kot/${id}/status`, { status });
    return response.data.data;
  },

  cancelKot: async (id: number): Promise<KotItem> => {
    const response = await api.delete<ApiResponse<KotItem>>(`/hotel/kot/${id}`);
    return response.data.data;
  },
};

export default kotService;
