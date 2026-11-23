import apiClient from '../services/api';

export interface DashboardKpis {
  totalBusinesses: number;
  totalHotelBusinesses: number;
  totalMessBusinesses: number;
  totalCafeBusinesses: number;
  totalBranches: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  suspendedBusinesses: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  lifetimeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  pendingPayments: number;
  failedPayments: number;
}

export interface RevenueChartPoint {
  month: string;
  hotelRevenue: number;
  messRevenue: number;
  cafeRevenue: number;
  totalRevenue: number;
}

export interface ProductDistributionPoint {
  product: string;
  count: number;
  revenue: number;
}

export interface BusinessSummary {
  id: number;
  name: string;
  code: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  businessType: string;
  accountType?: 'SINGLE' | 'MULTI_BRANCH';
  products: string[];
  branchCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface BusinessDetail extends BusinessSummary {
  address: string;
  country: string;
  pinCode: string;
  gstin: string;
  branches: BranchSummary[];
  subscriptions: SubscriptionItem[];
  payments: PaymentItem[];
}

export interface BusinessSavePayload {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstin?: string;
  businessType?: string;
  accountType?: 'SINGLE' | 'MULTI_BRANCH';
  products?: string[];
  username?: string;
  password?: string;
}

export interface BranchSummary {
  id: number;
  businessId: number;
  businessName: string;
  name: string;
  code: string;
  managerName: string;
  contactPhone: string;
  email?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
  totalSales?: number;
  totalInvoices?: number;
}

export interface BranchSavePayload {
  businessId: number;
  name: string;
  code?: string;
  managerName?: string;
  contactPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: string;
  username?: string;
  password?: string;
}

export interface ProductItem {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  moduleCount: number;
  planCount: number;
  activeSubscribers: number;
}

export interface ProductModuleItem {
  id: number;
  productId: number;
  productCode: string;
  code: string;
  name: string;
  description: string;
  isCore: boolean;
  active: boolean;
  createdAt?: string;
}

export interface SubscriptionPlanItem {
  id?: number;
  productId?: number;
  productCode: string;
  productName?: string;
  code?: string;
  name: string;
  planType: 'TRIAL' | 'YEARLY' | 'THREE_YEAR' | 'LIFETIME';
  billingIntervalMonths: number;
  basePrice: number;
  gstRate: number;
  discountAmount: number;
  finalPrice: number;
  maxBranches: number;
  maxUsers: number;
  description?: string;
  active: boolean;
}

export interface SubscriptionItem {
  id: number;
  businessId: number;
  businessName: string;
  branchId?: number;
  branchName?: string;
  productId: number;
  productCode: string;
  productName: string;
  planId: number;
  planName: string;
  planType: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  trialStartAt?: string;
  trialEndAt?: string;
  isLifetime: boolean;
  autoRenew: boolean;
  active: boolean;
  notes?: string;
}

export interface SubscriptionSavePayload {
  businessId: number;
  branchId?: number;
  productId: number;
  planId: number;
  status?: string;
  durationMonths?: number;
  isLifetime?: boolean;
  notes?: string;
}

export interface PaymentItem {
  id: number;
  subscriptionId?: number;
  businessId: number;
  businessName: string;
  branchId?: number;
  branchName?: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  paymentGateway: string;
  gatewayPaymentId?: string;
  status: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  businessId: number;
  businessName: string;
  branchId?: number;
  branchName?: string;
  baseAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  status: string;
  invoiceDate: string;
}

export interface SupportTicketItem {
  id: number;
  ticketNumber: string;
  businessId: number;
  businessName: string;
  subject: string;
  description: string;
  productCode?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  createdAt: string;
  replies?: Array<{
    id: number;
    senderType: string;
    senderName: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
}

export interface PlatformSettingItem {
  id: number;
  settingKey: string;
  settingValue: string;
  category: string;
  description?: string;
}

export interface AuditLogItem {
  id: number;
  actorUsername: string;
  role: string;
  businessId?: number;
  branchId?: number;
  action: string;
  module: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

// ==========================================
// API CLIENT SERVICE METHODS
// ==========================================

export const superAdminApi = {
  // 1. Dashboard
  getDashboardKpis: async (): Promise<DashboardKpis> => {
    const res = await apiClient.get('/superadmin/dashboard/kpis');
    return res.data?.data;
  },

  getRevenueChart: async (): Promise<RevenueChartPoint[]> => {
    const res = await apiClient.get('/superadmin/dashboard/revenue-chart');
    return res.data?.data || [];
  },

  getProductDistribution: async (): Promise<ProductDistributionPoint[]> => {
    const res = await apiClient.get('/superadmin/dashboard/product-distribution');
    return res.data?.data || [];
  },

  // 2. Businesses
  getBusinesses: async (search?: string, status?: string): Promise<BusinessSummary[]> => {
    const res = await apiClient.get('/superadmin/businesses', { params: { search, status } });
    return res.data?.data || [];
  },

  getBusinessById: async (id: number): Promise<BusinessDetail> => {
    const res = await apiClient.get(`/superadmin/businesses/${id}`);
    return res.data?.data;
  },

  createBusiness: async (payload: BusinessSavePayload): Promise<BusinessDetail> => {
    const res = await apiClient.post('/superadmin/businesses', payload);
    return res.data?.data;
  },

  updateBusiness: async (id: number, payload: Partial<BusinessSavePayload>): Promise<BusinessDetail> => {
    const res = await apiClient.put(`/superadmin/businesses/${id}`, payload);
    return res.data?.data;
  },

  deleteBusiness: async (id: number): Promise<void> => {
    await apiClient.delete(`/superadmin/businesses/${id}`);
  },

  toggleBusinessStatus: async (id: number, status: string): Promise<void> => {
    await apiClient.patch(`/superadmin/businesses/${id}/status`, null, { params: { status } });
  },

  // 3. Branches
  getBranches: async (businessId?: number): Promise<BranchSummary[]> => {
    const res = await apiClient.get('/superadmin/branches', { params: { businessId } });
    return res.data?.data || [];
  },

  createBranch: async (payload: BranchSavePayload): Promise<BranchSummary> => {
    const res = await apiClient.post('/superadmin/branches', payload);
    return res.data?.data;
  },

  updateBranch: async (id: number, payload: Partial<BranchSavePayload>): Promise<BranchSummary> => {
    const res = await apiClient.put(`/superadmin/branches/${id}`, payload);
    return res.data?.data;
  },

  deleteBranch: async (id: number): Promise<void> => {
    await apiClient.delete(`/superadmin/branches/${id}`);
  },

  toggleBranchStatus: async (id: number, status: string): Promise<void> => {
    await apiClient.patch(`/superadmin/branches/${id}/status`, null, { params: { status } });
  },

  // 4. Products & Modules
  getProducts: async (): Promise<ProductItem[]> => {
    const res = await apiClient.get('/superadmin/products');
    return res.data?.data || [];
  },

  getProductModules: async (productId: number): Promise<ProductModuleItem[]> => {
    const res = await apiClient.get(`/superadmin/products/${productId}/modules`);
    return res.data?.data || [];
  },

  createProductModule: async (productId: number, payload: Partial<ProductModuleItem>): Promise<ProductModuleItem> => {
    const res = await apiClient.post(`/superadmin/products/${productId}/modules`, payload);
    return res.data?.data;
  },

  toggleModuleStatus: async (moduleId: number, active: boolean, code?: string): Promise<void> => {
    try {
      if (moduleId < 100) {
        await apiClient.patch(`/superadmin/modules/${moduleId}/status`, null, { params: { active } });
      }
    } catch (e) {
      console.warn('Backend module status update warning:', e);
    }
  },

  // 5. Subscription Plans
  getPlans: async (productCode?: string): Promise<SubscriptionPlanItem[]> => {
    const res = await apiClient.get('/superadmin/plans', { params: { productCode } });
    return res.data?.data || [];
  },

  savePlan: async (plan: SubscriptionPlanItem): Promise<SubscriptionPlanItem> => {
    const res = await apiClient.post('/superadmin/plans', plan);
    return res.data?.data;
  },

  deletePlan: async (id: number): Promise<void> => {
    await apiClient.delete(`/superadmin/plans/${id}`);
  },

  // 6. Subscriptions
  getSubscriptions: async (productCode?: string, status?: string): Promise<SubscriptionItem[]> => {
    const res = await apiClient.get('/superadmin/subscriptions', { params: { productCode, status } });
    return res.data?.data || [];
  },

  assignSubscription: async (payload: SubscriptionSavePayload): Promise<SubscriptionItem> => {
    const res = await apiClient.post('/superadmin/subscriptions', payload);
    return res.data?.data;
  },

  renewSubscription: async (id: number, months: number = 12): Promise<void> => {
    await apiClient.post(`/superadmin/subscriptions/${id}/renew`, null, { params: { months } });
  },

  toggleSubscriptionStatus: async (id: number, status: string): Promise<void> => {
    await apiClient.patch(`/superadmin/subscriptions/${id}/status`, null, { params: { status } });
  },

  extendTrial: async (id: number, days: number = 14): Promise<void> => {
    await apiClient.post(`/superadmin/trials/${id}/extend`, null, { params: { days } });
  },

  // 7. Payments & Invoices
  getPayments: async (): Promise<PaymentItem[]> => {
    const res = await apiClient.get('/superadmin/payments');
    return res.data?.data || [];
  },

  getInvoices: async (): Promise<InvoiceItem[]> => {
    const res = await apiClient.get('/superadmin/invoices');
    return res.data?.data || [];
  },

  // 8. Support Tickets
  getTickets: async (status?: string): Promise<SupportTicketItem[]> => {
    const res = await apiClient.get('/superadmin/support/tickets', { params: { status } });
    return res.data?.data || [];
  },

  getTicketById: async (id: number): Promise<SupportTicketItem> => {
    const res = await apiClient.get(`/superadmin/support/tickets/${id}`);
    return res.data?.data;
  },

  getSupportTicketById: async (id: number): Promise<SupportTicketItem> => {
    const res = await apiClient.get(`/superadmin/support/tickets/${id}`);
    return res.data?.data;
  },

  createTicket: async (data: any): Promise<SupportTicketItem> => {
    const res = await apiClient.post('/superadmin/support/tickets', data);
    return res.data?.data;
  },

  replyTicket: async (ticketId: number, message: string, isInternal: boolean = false): Promise<void> => {
    await apiClient.post(`/superadmin/support/tickets/${ticketId}/reply`, { message, isInternal });
  },

  updateTicketStatus: async (ticketId: number, status: string): Promise<void> => {
    await apiClient.patch(`/superadmin/support/tickets/${ticketId}/status`, null, { params: { status } });
  },

  // 9. Platform Settings
  getSettings: async (): Promise<PlatformSettingItem[]> => {
    const res = await apiClient.get('/superadmin/settings');
    return res.data?.data || [];
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
    await apiClient.put('/superadmin/settings', { key, value });
  },

  // 10. Audit Logs
  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    const res = await apiClient.get('/superadmin/audit-logs');
    return res.data?.data || [];
  },

  // 11. Live Operational Hotel Invoices & Orders (Database & Live Sync)
  getHotelInvoices: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get('/hotel/invoices');
      let invs: any[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      try {
        const raw = localStorage.getItem('mess_invoices');
        if (raw) {
          const locals: any[] = JSON.parse(raw);
          if (Array.isArray(locals)) {
            locals.forEach((li) => {
              const idx = invs.findIndex((i: any) => Number(i.id) === Number(li.id) || (li.invoiceNumber && i.invoiceNumber === li.invoiceNumber));
              if (idx >= 0) {
                invs[idx] = { ...invs[idx], ...li };
              } else {
                invs.push(li);
              }
            });
          }
        }
      } catch {}
      return invs;
    } catch {
      try {
        const raw = localStorage.getItem('mess_invoices');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  },

  getHotelOrders: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get('/hotel/orders');
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }
};
