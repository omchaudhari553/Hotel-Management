import api, { ApiResponse } from './api';
import { CafeTable, CafeMenuItem, CafeOrder } from '../types';

export const cafeService = {
  getTables: async (businessId = 1, status?: string): Promise<CafeTable[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (status && status !== 'ALL') params.status = status;

    const response = await api.get<ApiResponse<any[]>>('/hotel/tables', { params });
    const rawTables = response.data.data || [];

    return rawTables.map((t) => ({
      id: t.id,
      businessId: t.businessId,
      tableNumber: t.name || t.tableNumber || `T-${t.id}`,
      name: t.name,
      seatingCapacity: t.capacity || t.seatingCapacity || 2,
      capacity: t.capacity,
      status: t.status || 'AVAILABLE',
      section: t.area || t.section || 'INDOOR',
      area: t.area,
    }));
  },

  createTable: async (table: Partial<CafeTable>): Promise<CafeTable> => {
    const body = {
      branchId: (table as any).branchId || 1,
      name: table.tableNumber || (table as any).name || 'Table',
      capacity: table.seatingCapacity || (table as any).capacity || 2,
      area: table.section || (table as any).area || 'INDOOR',
      note: (table as any).note || '',
    };

    const response = await api.post<ApiResponse<any>>('/hotel/tables', body);
    const t = response.data.data;

    return {
      id: t.id,
      businessId: t.businessId,
      tableNumber: t.name || t.tableNumber,
      name: t.name,
      seatingCapacity: t.capacity || t.seatingCapacity,
      capacity: t.capacity,
      status: t.status,
      section: t.area || t.section,
      area: t.area,
    };
  },

  updateTableStatus: async (id: number, status: string): Promise<CafeTable> => {
    const response = await api.patch<ApiResponse<any>>(`/hotel/tables/${id}/status`, { status });
    const t = response.data.data;

    return {
      id: t.id,
      businessId: t.businessId,
      tableNumber: t.name || t.tableNumber,
      name: t.name,
      seatingCapacity: t.capacity || t.seatingCapacity,
      capacity: t.capacity,
      status: t.status,
      section: t.area || t.section,
      area: t.area,
    };
  },

  getMenuItems: async (businessId = 1, category?: string): Promise<CafeMenuItem[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (category) params.category = category;

    const response = await api.get<ApiResponse<CafeMenuItem[]>>('/hotel/menu-items', { params });
    return response.data.data || [];
  },

  createMenuItem: async (item: Partial<CafeMenuItem>): Promise<CafeMenuItem> => {
    const response = await api.post<ApiResponse<CafeMenuItem>>('/hotel/menu-items', item);
    return response.data.data;
  },

  updateMenuItem: async (id: number, item: Partial<CafeMenuItem>): Promise<CafeMenuItem> => {
    const response = await api.put<ApiResponse<CafeMenuItem>>(`/hotel/menu-items/${id}`, item);
    return response.data.data;
  },

  updateAvailability: async (id: number, available: boolean): Promise<CafeMenuItem> => {
    const response = await api.patch<ApiResponse<CafeMenuItem>>(`/hotel/menu-items/${id}/availability`, { available });
    return response.data.data;
  },

  deleteMenuItem: async (id: number): Promise<boolean> => {
    await api.delete(`/hotel/menu-items/${id}`);
    return true;
  },

  getOrders: async (businessId = 1, status?: string): Promise<CafeOrder[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (status && status !== 'ALL') params.status = status;

    const response = await api.get<ApiResponse<any[]>>('/hotel/orders', { params });
    const rawOrders = response.data.data || [];

    return rawOrders.map((o) => ({
      id: o.id,
      businessId: o.businessId,
      tableId: o.tableId,
      tableNumber: o.tableName || (o.tableId ? `T-${o.tableId}` : undefined),
      orderNumber: o.orderNumber || `ORD-${o.id}`,
      orderType: o.orderType || (o.tableId ? 'DINE_IN' : 'TAKEAWAY'),
      status: o.status,
      subtotal: o.subtotal || o.totalAmount || 0,
      taxAmount: o.taxAmount || 0,
      totalAmount: o.totalAmount || 0,
      notes: o.notes || '',
      items: (o.items || []).map((it: any) => ({
        id: it.id,
        menuItemId: it.menuItemId,
        itemName: it.name || it.itemName,
        quantity: it.qty || it.quantity || 1,
        unitPrice: it.price || it.unitPrice || 0,
        totalPrice: (it.qty || it.quantity || 1) * (it.price || it.unitPrice || 0),
        specialInstructions: it.customization,
      })),
      createdAt: o.createdAt || new Date().toISOString(),
    }));
  },

  createOrder: async (orderPayload: any): Promise<CafeOrder> => {
    const body = {
      branchId: orderPayload.branchId || 1,
      tableId: orderPayload.tableId || null,
      bookingId: orderPayload.bookingId || null,
      guestName: orderPayload.guestName || 'Walk-in Guest',
      guestCount: orderPayload.guestCount || 1,
      discount: orderPayload.discount || 0,
      taxRate: orderPayload.taxRate || 5,
      items: (orderPayload.items || []).map((it: any) => ({
        menuItemId: it.menuItemId || null,
        name: it.itemName || it.name,
        quantity: it.quantity || it.qty || 1,
        unitPrice: it.unitPrice || it.price || 0,
        customization: it.specialInstructions || it.customization || '',
      })),
    };

    const response = await api.post<ApiResponse<any>>('/hotel/orders', body);
    const o = response.data.data;

    return {
      id: o.id,
      businessId: o.businessId,
      tableId: o.tableId,
      tableNumber: o.tableName,
      orderNumber: o.orderNumber,
      orderType: o.tableId ? 'DINE_IN' : 'TAKEAWAY',
      status: o.status,
      subtotal: o.subtotal || o.totalAmount,
      taxAmount: o.taxAmount || 0,
      totalAmount: o.totalAmount,
      notes: o.notes,
      items: (o.items || []).map((it: any) => ({
        id: it.id,
        menuItemId: it.menuItemId,
        itemName: it.name,
        quantity: it.qty || it.quantity,
        unitPrice: it.price || it.unitPrice,
        totalPrice: (it.qty || it.quantity) * (it.price || it.unitPrice),
        specialInstructions: it.customization,
      })),
      createdAt: o.createdAt,
    };
  },

  updateOrderStatus: async (id: number, status: string): Promise<CafeOrder> => {
    const response = await api.patch<ApiResponse<any>>(`/hotel/orders/${id}/status`, { status });
    const o = response.data.data;

    return {
      id: o.id,
      businessId: o.businessId,
      tableId: o.tableId,
      orderNumber: o.orderNumber,
      orderType: o.tableId ? 'DINE_IN' : 'TAKEAWAY',
      status: o.status,
      subtotal: o.subtotal || o.totalAmount,
      taxAmount: o.taxAmount || 0,
      totalAmount: o.totalAmount,
      items: [],
      createdAt: o.createdAt,
    };
  },
};
