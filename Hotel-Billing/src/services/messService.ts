import api, { ApiResponse } from './api';
import { MessPlan, MessCustomer, MessMenu, MessAttendance, MessOrder } from '../types';

export const messService = {
  getPlans: async (businessId = 1): Promise<MessPlan[]> => {
    const response = await api.get<ApiResponse<MessPlan[]>>('/hotel/mess/plans', {
      params: { businessId },
    });
    return response.data.data || [];
  },

  createPlan: async (plan: Partial<MessPlan>): Promise<MessPlan> => {
    const body = {
      planName: plan.planName || (plan as any).name || 'Standard Plan',
      planType: plan.planType || 'MONTHLY',
      mealsIncluded: plan.mealsIncluded || 'LUNCH, DINNER',
      price: plan.price != null ? Number(plan.price) : 0,
      validityDays: plan.validityDays != null ? Number(plan.validityDays) : 30,
      totalMealsCount: plan.totalMealsCount != null ? Number(plan.totalMealsCount) : 60,
      description: plan.description || '',
    };
    const response = await api.post<ApiResponse<MessPlan>>('/hotel/mess/plans', body);
    return response.data.data;
  },

  getCustomers: async (businessId = 1, status?: string, tiffinOnly?: boolean): Promise<MessCustomer[]> => {
    const response = await api.get<ApiResponse<any[]>>('/hotel/guests', {
      params: { businessId },
    });
    const guests = response.data.data || [];

    const mapped: MessCustomer[] = guests.map((g) => ({
      id: g.id,
      businessId: g.businessId,
      planId: 1,
      planName: 'Mess Dining Plan',
      fullName: g.fullName || g.name || 'Guest',
      phone: g.phone || '',
      email: g.email || '',
      joinDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      remainingMeals: 30,
      tiffinEnabled: false,
      deliveryAddress: g.address || '',
      status: 'ACTIVE',
    }));

    if (tiffinOnly) {
      return mapped.filter((c) => c.tiffinEnabled);
    }
    if (status && status !== 'ALL') {
      return mapped.filter((c) => c.status === status);
    }
    return mapped;
  },

  subscribe: async (payload: any): Promise<MessCustomer> => {
    const response = await api.post<ApiResponse<MessCustomer>>('/hotel/mess/subscriptions', payload);
    return response.data.data;
  },

  updateCustomerStatus: async (id: number, status: string): Promise<MessCustomer> => {
    const response = await api.patch<ApiResponse<MessCustomer>>(`/hotel/mess/customers/${id}/status`, { status });
    return response.data.data;
  },

  getWeeklyMenu: async (businessId = 1): Promise<MessMenu[]> => {
    const response = await api.get<ApiResponse<MessMenu[]>>('/hotel/mess/menu', {
      params: { businessId },
    });
    return response.data.data || [];
  },

  saveMenuItem: async (item: Partial<MessMenu>): Promise<MessMenu> => {
    const response = await api.post<ApiResponse<MessMenu>>('/hotel/mess/menu', item);
    return response.data.data;
  },

  getAttendance: async (businessId = 1, date?: string): Promise<MessAttendance[]> => {
    const response = await api.get<ApiResponse<MessAttendance[]>>('/hotel/mess/attendance', {
      params: { businessId, date },
    });
    return response.data.data || [];
  },

  markAttendance: async (payload: {
    customerId: number;
    mealTime: string;
    status?: string;
    businessId?: number;
    attendanceDate?: string;
  }): Promise<MessAttendance> => {
    const response = await api.post<ApiResponse<MessAttendance>>('/hotel/mess/attendance', payload);
    return response.data.data;
  },

  getOrders: async (businessId = 1, deliveryStatus?: string): Promise<MessOrder[]> => {
    const params: Record<string, any> = {};
    if (businessId) params.businessId = businessId;
    if (deliveryStatus && deliveryStatus !== 'ALL') params.status = deliveryStatus;

    const response = await api.get<ApiResponse<any[]>>('/hotel/deliveries', { params });
    const raw = response.data.data || [];

    return raw.map((d) => ({
      id: d.id,
      businessId: d.businessId,
      customerId: d.orderId,
      customerName: d.customerName || 'Delivery Customer',
      orderType: 'TIFFIN_DELIVERY',
      deliveryStatus: d.deliveryStatus || d.status || 'PENDING',
      totalAmount: d.deliveryCharge || 0,
      deliveryAddress: d.address || '',
      orderDate: d.createdAt || new Date().toISOString(),
    }));
  },

  updateOrderStatus: async (id: number, status: string): Promise<MessOrder> => {
    const response = await api.patch<ApiResponse<any>>(`/hotel/deliveries/${id}/status`, { status });
    const d = response.data.data;

    return {
      id: d.id,
      businessId: d.businessId,
      customerName: d.customerName,
      orderType: 'TIFFIN_DELIVERY',
      deliveryStatus: d.status || status,
      totalAmount: d.deliveryCharge || 0,
      deliveryAddress: d.address,
      orderDate: d.createdAt || new Date().toISOString(),
    };
  },
};
