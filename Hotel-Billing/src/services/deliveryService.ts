import api, { ApiResponse } from './api';

export interface DeliveryItem {
  id: number;
  staffId?: number;
  staffName?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  instructions?: string;
  deliveryCharge?: number;
  paymentStatus?: string;
  status: 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | string;
  branchId?: number;
  orderId?: number;
  orderNumber?: string;
  orderSource?: string;
  externalPlatform?: string;
  externalOrderId?: string;
  deliveryMode?: string;
  createdAt?: string;
}

export interface SettlementItem {
  id: number; deliveryOrderId: number; orderId?: number; platform: string; externalOrderId?: string;
  grossAmount: number; commissionAmount: number; feeAmount: number; refundAmount: number; netAmount: number;
  status: string; reference?: string; settlementDate?: string;
}
export interface ReconciliationItem {
  id: number; settlementId: number; deliveryOrderId: number; orderId?: number; platform: string; externalOrderId?: string;
  platformAmount: number; systemAmount: number; bankAmount?: number | null; differenceAmount: number;
  status: string; remark?: string; reconciledAt?: string;
}

export interface DeliveryAnalytics {
  totalOrders:number; deliveredOrders:number; notDeliveredOrders:number; cancelledOrders:number;
  paidOrders:number; unpaidOrders:number; paidRevenue:number; deliveredRevenue:number; settlementNet:number;
  reconciliationMatched:number; reconciliationMismatched:number; reconciliationPending:number;
}

export interface DeliveryPayload {
  branchId?: number;
  orderId?: number;
  staffId?: number;
  customerName: string;
  customerPhone: string;
  address: string;
  instructions?: string;
  deliveryCharge?: number;
  paymentStatus?: string;
}

export const deliveryService = {
  getDeliveries: async (branchId?: number): Promise<DeliveryItem[]> => {
    const response = await api.get<ApiResponse<DeliveryItem[]>>('/hotel/deliveries', {
      params: branchId ? { branchId } : {}
    });
    return response.data.data || [];
  },

  createDelivery: async (payload: DeliveryPayload): Promise<DeliveryItem> => {
    const body = {
      branchId: payload.branchId,
      orderId: payload.orderId || null,
      staffId: payload.staffId || null,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      address: payload.address,
      instructions: payload.instructions || '',
      deliveryCharge: Number(payload.deliveryCharge) || 0,
      paymentStatus: payload.paymentStatus || 'PENDING',
    };

    const response = await api.post<ApiResponse<DeliveryItem>>('/hotel/deliveries', body);
    return response.data.data;
  },

  assignRider: async (id: number, staffId: number): Promise<DeliveryItem> => {
    const response = await api.patch<ApiResponse<DeliveryItem>>(`/hotel/deliveries/${id}/assign`, { staffId });
    return response.data.data;
  },

  updateDeliveryStatus: async (id: number, status: string): Promise<DeliveryItem> => {
    const response = await api.patch<ApiResponse<DeliveryItem>>(`/hotel/deliveries/${id}/status`, { status });
    return response.data.data;
  },

  updatePaymentStatus: async (id: number, status: 'PENDING'|'PAID'|'FAILED'|'REFUNDED'): Promise<any> => {
    const response = await api.patch<ApiResponse<any>>(`/hotel/deliveries/${id}/payment`, { status });
    return response.data.data;
  },

  getSettlements: async (): Promise<SettlementItem[]> =>
    (await api.get<ApiResponse<SettlementItem[]>>('/hotel/deliveries/finance/settlements')).data.data || [],

  getReconciliation: async (): Promise<ReconciliationItem[]> =>
    (await api.get<ApiResponse<ReconciliationItem[]>>('/hotel/deliveries/finance/reconciliation')).data.data || [],

  reconcile: async (id:number, bankAmount:number, remark?:string): Promise<ReconciliationItem> =>
    (await api.patch<ApiResponse<ReconciliationItem>>(`/hotel/deliveries/finance/reconciliation/${id}`, { bankAmount, remark })).data.data,

  getAnalytics: async (): Promise<DeliveryAnalytics> =>
    (await api.get<ApiResponse<DeliveryAnalytics>>('/hotel/deliveries/finance/analytics')).data.data,
};

export default deliveryService;
