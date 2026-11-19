import api, { ApiResponse } from './api';

export interface OrderItem {
  id?: number;
  menuItemId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  customization?: string;
}

export interface Order {
  id: number;
  orderNumber?: string;
  branchId?: number;
  tableId?: number;
  tableName?: string;
  tableNumber?: string;
  bookingId?: number;
  guestName: string;
  guestCount?: number;
  status: string;
  totalAmount: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  netAmount?: number;
  items: OrderItem[];
  createdAt?: string;
}

export interface OrderPayload {
  branchId?: number;
  tableId?: number;
  bookingId?: number;
  guestName: string;
  guestCount?: number;
  items: {
    menuItemId?: number;
    name: string;
    quantity: number;
    unitPrice: number;
    customization?: string;
  }[];
  discount?: number;
  taxRate?: number;
}

export const orderService = {
  getOrders: async (branchId?: number): Promise<Order[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<ApiResponse<Order[]>>('/hotel/orders', { params });
    return response.data.data || [];
  },

  getOrderById: async (id: number): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/hotel/orders/${id}`);
    return response.data.data;
  },

  createOrder: async (payload: OrderPayload): Promise<Order> => {
    const body = {
      branchId: payload.branchId,
      tableId: payload.tableId || null,
      bookingId: payload.bookingId || null,
      guestName: payload.guestName || 'Guest',
      guestCount: Number(payload.guestCount) || 1,
      discount: Number(payload.discount) || 0,
      taxRate: Number(payload.taxRate) || 0,
      items: (payload.items || []).map((item) => ({
        menuItemId: item.menuItemId || null,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        customization: item.customization || '',
      })),
    };

    const response = await api.post<ApiResponse<Order>>('/hotel/orders', body);
    return response.data.data;
  },

  updateOrder: async (id: number, payload: OrderPayload): Promise<Order> => {
    const body = {
      branchId: payload.branchId,
      tableId: payload.tableId || null,
      bookingId: payload.bookingId || null,
      guestName: payload.guestName || 'Guest',
      guestCount: Number(payload.guestCount) || 1,
      discount: Number(payload.discount) || 0,
      taxRate: Number(payload.taxRate) || 0,
      items: (payload.items || []).map((item) => ({
        menuItemId: item.menuItemId || null,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        customization: item.customization || '',
      })),
    };

    const response = await api.put<ApiResponse<Order>>(`/hotel/orders/${id}`, body);
    return response.data.data;
  },

  updateOrderStatus: async (id: number, status: string): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/hotel/orders/${id}/status`, { status });
    return response.data.data;
  },
};

export default orderService;
