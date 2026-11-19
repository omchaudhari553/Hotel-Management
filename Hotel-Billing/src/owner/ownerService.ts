import apiClient from '../services/api';

export interface BranchRecord {
  id: number;
  name: string;
  code: string;
  managerName: string;
  contactPhone: string;
  email?: string;
  operatingHours?: string;
  address?: string;
  city?: string;
  state?: string;
  status: 'ACTIVE' | 'INACTIVE';
  establishedOn?: string;
  createdAt?: string;
  username?: string;
  userActive?: boolean;
  userId?: number;
  staffCount: number;
  totalSales: number;
  invoiceCount: number;
}

export interface CreateBranchPayload {
  branchName: string;
  contactNumber: string;
  branchAddress?: string;
  city?: string;
  state?: string;
  branchManagerName: string;
  username: string;
  password?: string;
  status?: string;
}

export interface UpdateBranchPayload {
  branchName?: string;
  contactNumber?: string;
  branchAddress?: string;
  city?: string;
  state?: string;
  branchManagerName?: string;
  password?: string;
  status?: string;
}

export interface OwnerDashboardData {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  todaySales: number;
  monthlySales: number;
  totalBillingAmount: number;
  totalPayments: number;
  totalPurchaseAmount: number;
  branchSalesOverview: Array<{
    branchId: number;
    branchName: string;
    code: string;
    city: string;
    status: string;
    managerName: string;
    contactPhone: string;
    todaySales: number;
    monthlySales: number;
    totalSales: number;
    invoiceCount: number;
  }>;
  branchPerformanceComparison: Array<{
    branchId: number;
    branchName: string;
    sales: number;
    payments: number;
    purchases: number;
    profit: number;
  }>;
  branchStatus: {
    ACTIVE: number;
    INACTIVE: number;
    TOTAL: number;
  };
}

export interface OwnerSalesData {
  branches: Array<{
    branchId: number;
    branchName: string;
    code: string;
    city: string;
    status: string;
    todaySales: number;
    weeklySales: number;
    monthlySales: number;
    yearlySales: number;
    totalSales: number;
    invoiceCount: number;
  }>;
  consolidated: {
    todaySales: number;
    weeklySales: number;
    monthlySales: number;
    yearlySales: number;
    totalSales: number;
    totalInvoices: number;
  };
  dailyBreakdown: Array<{
    date: string;
    sales: number;
  }>;
  salesByPaymentMethod: {
    CASH: number;
    UPI: number;
    CARD: number;
    [key: string]: number;
  };
}

export interface OwnerProfitAnalysisData {
  totalBillingAmount: number;
  totalPaymentsReceived: number;
  totalPurchaseAmount: number;
  estimatedBusinessProfit: number;
  profitMarginPercent: number;
  branchBreakdown: Array<{
    branchId: number;
    branchName: string;
    city: string;
    totalBillingAmount: number;
    totalPaymentsReceived: number;
    totalPurchaseAmount: number;
    estimatedBusinessProfit: number;
    profitMarginPercent: number;
  }>;
}

export interface OwnerBillingPerformanceData {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalBilled: number;
  totalCollected: number;
  collectionEfficiencyPercent: number;
  averageTicketSize: number;
  totalKots: number;
  completedKots: number;
  totalPurchases: number;
  totalPurchaseAmount: number;
  branchComparison: Array<{
    branchId: number;
    branchName: string;
    totalInvoices: number;
    paidInvoices: number;
    unpaidInvoices: number;
    totalBilled: number;
    totalCollected: number;
    collectionEfficiencyPercent: number;
    averageTicketSize: number;
    totalKots: number;
    completedKots: number;
    totalPurchases: number;
    totalPurchaseAmount: number;
  }>;
}

export interface OwnerStaffItem {
  id: number;
  name: string;
  staffCode: string;
  phone: string;
  designation: string;
  role: string;
  branchId: number;
  branchName: string;
  managerName: string;
  active: boolean;
  status: string;
  joiningDate?: string;
  basicSalary?: number;
  salaryFrequency?: string;
}

export const ownerService = {
  // MODULE 1: DASHBOARD
  getDashboard: async (): Promise<OwnerDashboardData> => {
    const res = await apiClient.get('/owner/dashboard');
    return res.data?.data;
  },

  // MODULE 2: BRANCH MANAGEMENT
  getBranches: async (): Promise<BranchRecord[]> => {
    const res = await apiClient.get('/owner/branches');
    return res.data?.data || [];
  },

  getBranchById: async (id: number): Promise<BranchRecord> => {
    const res = await apiClient.get(`/owner/branches/${id}`);
    return res.data?.data;
  },

  createBranch: async (payload: CreateBranchPayload): Promise<BranchRecord> => {
    const res = await apiClient.post('/owner/branches', payload);
    return res.data?.data;
  },

  updateBranch: async (id: number, payload: UpdateBranchPayload): Promise<BranchRecord> => {
    const res = await apiClient.put(`/owner/branches/${id}`, payload);
    return res.data?.data;
  },

  updateBranchStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<any> => {
    const res = await apiClient.patch(`/owner/branches/${id}/status`, { status });
    return res.data?.data;
  },

  deleteBranch: async (id: number): Promise<any> => {
    const res = await apiClient.delete(`/owner/branches/${id}`);
    return res.data?.data;
  },

  // MODULE 3: SALES
  getSales: async (params?: { branchId?: number; startDate?: string; endDate?: string; month?: number; year?: number }): Promise<OwnerSalesData> => {
    const res = await apiClient.get('/owner/sales', { params });
    return res.data?.data;
  },

  // MODULE 4: PROFIT ANALYSIS
  getProfitAnalysis: async (params?: { branchId?: number; startDate?: string; endDate?: string }): Promise<OwnerProfitAnalysisData> => {
    const res = await apiClient.get('/owner/profit-analysis', { params });
    return res.data?.data;
  },

  // MODULE 5: STAFF
  getStaff: async (params?: { branchId?: number }): Promise<OwnerStaffItem[]> => {
    const res = await apiClient.get('/owner/staff', { params });
    return res.data?.data || [];
  },

  deleteStaff: async (id: number): Promise<void> => {
    await apiClient.delete(`/owner/staff/${id}`);
  },

  // MODULE 6: REPORTS
  getReports: async (params?: { type?: string; branchId?: number; startDate?: string; endDate?: string; period?: string }): Promise<any> => {
    const res = await apiClient.get('/owner/reports', { params });
    return res.data?.data;
  },

  // MODULE 7: BILLING PERFORMANCE
  getBillingPerformance: async (params?: { branchId?: number; startDate?: string; endDate?: string }): Promise<OwnerBillingPerformanceData> => {
    const res = await apiClient.get('/owner/billing-performance', { params });
    return res.data?.data;
  },

  // MODULE 8: SETTINGS
  getSettings: async (): Promise<any> => {
    const res = await apiClient.get('/owner/settings');
    return res.data?.data;
  },

  updateSettings: async (payload: any): Promise<any> => {
    const res = await apiClient.post('/owner/settings', payload);
    return res.data?.data;
  },
};

export default ownerService;

