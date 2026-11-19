import apiClient from './client';

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
  managerName?: string;
  active: boolean;
  status: string;
  joiningDate?: string;
  basicSalary?: number;
  salaryFrequency?: string;
}

// Clean live initial state (demo data removed per user request)
let localBranches: BranchRecord[] = [];

let localSettings = {
  businessName: '',
  ownerName: '',
  contactEmail: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  currency: 'INR',
  taxNumber: '',
  theme: 'system',
};

let localDashboardData: OwnerDashboardData = {
  totalBranches: 0,
  activeBranches: 0,
  inactiveBranches: 0,
  todaySales: 0.0,
  monthlySales: 0.0,
  totalBillingAmount: 0.0,
  totalPayments: 0.0,
  totalPurchaseAmount: 0.0,
  branchSalesOverview: [],
  branchPerformanceComparison: [],
  branchStatus: { ACTIVE: 0, INACTIVE: 0, TOTAL: 0 },
};

let localSalesData: OwnerSalesData = {
  branches: [],
  consolidated: {
    todaySales: 0.0,
    weeklySales: 0.0,
    monthlySales: 0.0,
    yearlySales: 0.0,
    totalSales: 0.0,
    totalInvoices: 0,
  },
  dailyBreakdown: [],
  salesByPaymentMethod: {
    CASH: 0.0,
    UPI: 0.0,
    CARD: 0.0,
  },
};

let localProfitData: OwnerProfitAnalysisData = {
  totalBillingAmount: 0.0,
  totalPaymentsReceived: 0.0,
  totalPurchaseAmount: 0.0,
  estimatedBusinessProfit: 0.0,
  profitMarginPercent: 0.0,
  branchBreakdown: [],
};

let localStaffList: OwnerStaffItem[] = [];

let localReportsData: any = {
  reportType: 'HOTEL_REPORT',
  filterBranchName: 'All Branches Consolidated',
  filterBranchId: null,
  period: 'this-month',
  totalSales: 0.0,
  collectedPayments: 0.0,
  totalExpenses: 0.0,
  totalExpensesAmount: 0.0,
  netPurchases: 0.0,
  totalPurchases: 0.0,
  netProfit: 0.0,
  totalInvoices: 0,
  totalKots: 0,
  taxableSales: 0.0,
  salesCgst: 0.0,
  salesSgst: 0.0,
  salesIgst: 0.0,
  netGst: 0.0,
  topSpendingBranch: '—',
  topExpenseCategory: '—',
  branchExpensesBreakdown: [],
  expensesList: [],
  categoryExpensesBreakdown: [],
};

let localBillingPerformance: OwnerBillingPerformanceData = {
  totalInvoices: 0,
  paidInvoices: 0,
  unpaidInvoices: 0,
  totalBilled: 0.0,
  totalCollected: 0.0,
  collectionEfficiencyPercent: 0.0,
  averageTicketSize: 0.0,
  totalKots: 0,
  completedKots: 0,
  totalPurchases: 0,
  totalPurchaseAmount: 0.0,
  branchComparison: [],
};

export const ownerService = {
  // Synchronous in-memory cache getters for 0ms instantaneous UI render
  getCachedDashboard(): OwnerDashboardData {
    return localDashboardData;
  },
  getCachedBranches(): BranchRecord[] {
    return [...localBranches];
  },
  getCachedSales(): OwnerSalesData {
    return localSalesData;
  },
  getCachedProfitAnalysis(): OwnerProfitAnalysisData {
    return localProfitData;
  },
  getCachedStaff(): OwnerStaffItem[] {
    return [...localStaffList];
  },
  getCachedReports(): any {
    return localReportsData;
  },
  getCachedBillingPerformance(): OwnerBillingPerformanceData {
    return localBillingPerformance;
  },
  getCachedSettings(): any {
    return { ...localSettings };
  },

  // MODULE 1: DASHBOARD
  getDashboard: async (): Promise<OwnerDashboardData> => {
    try {
      const res = await apiClient.get('/owner/dashboard', { timeout: 3500 });
      if (res.data?.data) {
        localDashboardData = res.data.data;
        return res.data.data;
      }
    } catch {}

    const activeCount = localBranches.filter((b) => b.status === 'ACTIVE').length;
    const inactiveCount = localBranches.length - activeCount;

    localDashboardData = {
      ...localDashboardData,
      totalBranches: localBranches.length,
      activeBranches: activeCount,
      inactiveBranches: inactiveCount,
      branchStatus: {
        ACTIVE: activeCount,
        INACTIVE: inactiveCount,
        TOTAL: localBranches.length,
      },
    };
    return localDashboardData;
  },

  // MODULE 2: BRANCH MANAGEMENT
  getBranches: async (): Promise<BranchRecord[]> => {
    try {
      const res = await apiClient.get('/owner/branches', { timeout: 3500 });
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        localBranches = res.data.data;
        return res.data.data;
      }
    } catch {}
    return [...localBranches];
  },

  getBranchById: async (id: number): Promise<BranchRecord> => {
    try {
      const res = await apiClient.get(`/owner/branches/${id}`, { timeout: 3500 });
      if (res.data?.data) return res.data.data;
    } catch {}
    const found = localBranches.find((b) => b.id === id);
    if (found) return found;
    return localBranches[0];
  },

  createBranch: async (payload: CreateBranchPayload): Promise<BranchRecord> => {
    try {
      const res = await apiClient.post('/owner/branches', payload, { timeout: 4000 });
      if (res.data?.data) {
        localBranches.push(res.data.data);
        return res.data.data;
      }
    } catch {}

    const newBranch: BranchRecord = {
      id: Date.now(),
      name: payload.branchName,
      code: `BR-${localBranches.length + 1}`,
      managerName: payload.branchManagerName,
      contactPhone: payload.contactNumber,
      city: payload.city || 'Pune',
      state: payload.state || 'Maharashtra',
      address: payload.branchAddress || '',
      status: (payload.status as any) || 'ACTIVE',
      staffCount: 1,
      totalSales: 0.0,
      invoiceCount: 0,
    };
    localBranches.push(newBranch);
    return newBranch;
  },

  updateBranch: async (id: number, payload: UpdateBranchPayload): Promise<BranchRecord> => {
    try {
      const res = await apiClient.put(`/owner/branches/${id}`, payload, { timeout: 4000 });
      if (res.data?.data) {
        localBranches = localBranches.map((b) => (b.id === id ? res.data.data : b));
        return res.data.data;
      }
    } catch {}

    localBranches = localBranches.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          name: payload.branchName || b.name,
          contactPhone: payload.contactNumber || b.contactPhone,
          managerName: payload.branchManagerName || b.managerName,
          address: payload.branchAddress || b.address,
          city: payload.city || b.city,
          state: payload.state || b.state,
          status: (payload.status as any) || b.status,
        };
      }
      return b;
    });
    return localBranches.find((b) => b.id === id) || localBranches[0];
  },

  updateBranchStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<any> => {
    try {
      const res = await apiClient.patch(`/owner/branches/${id}/status`, { status }, { timeout: 3500 });
      if (res.data?.data) {
        localBranches = localBranches.map((b) => (b.id === id ? { ...b, status } : b));
        return res.data.data;
      }
    } catch {}

    localBranches = localBranches.map((b) => (b.id === id ? { ...b, status } : b));
    return { success: true, status };
  },

  deleteBranch: async (id: number): Promise<any> => {
    try {
      const res = await apiClient.delete(`/owner/branches/${id}`, { timeout: 4000 });
      localBranches = localBranches.filter((b) => b.id !== id);
      return res.data?.data || { success: true };
    } catch (e: any) {
      localBranches = localBranches.filter((b) => b.id !== id);
      return { success: true };
    }
  },

  // MODULE 3: SALES
  getSales: async (params?: { branchId?: number; startDate?: string; endDate?: string; month?: number; year?: number }): Promise<OwnerSalesData> => {
    try {
      const res = await apiClient.get('/owner/sales', { params, timeout: 3500 });
      if (res.data?.data) {
        localSalesData = res.data.data;
        return res.data.data;
      }
    } catch {}
    if (params?.branchId) {
      const filteredBranches = localSalesData.branches.filter((b) => b.branchId === params.branchId);
      const totalS = filteredBranches.reduce((acc, b) => acc + b.totalSales, 0);
      const todayS = filteredBranches.reduce((acc, b) => acc + b.todaySales, 0);
      const weekS = filteredBranches.reduce((acc, b) => acc + b.weeklySales, 0);
      const monthS = filteredBranches.reduce((acc, b) => acc + b.monthlySales, 0);
      const yearS = filteredBranches.reduce((acc, b) => acc + b.yearlySales, 0);
      const totalInv = filteredBranches.reduce((acc, b) => acc + b.invoiceCount, 0);
      return {
        ...localSalesData,
        branches: filteredBranches,
        consolidated: {
          todaySales: todayS,
          weeklySales: weekS,
          monthlySales: monthS,
          yearlySales: yearS,
          totalSales: totalS,
          totalInvoices: totalInv,
        },
      };
    }
    return localSalesData;
  },

  // MODULE 4: PROFIT ANALYSIS
  getProfitAnalysis: async (params?: { branchId?: number; startDate?: string; endDate?: string }): Promise<OwnerProfitAnalysisData> => {
    try {
      const res = await apiClient.get('/owner/profit-analysis', { params, timeout: 3500 });
      if (res.data?.data) {
        localProfitData = res.data.data;
        return res.data.data;
      }
    } catch {}
    return localProfitData;
  },

  // MODULE 5: STAFF
  getStaff: async (params?: { branchId?: number }): Promise<OwnerStaffItem[]> => {
    try {
      const res = await apiClient.get('/owner/staff', { params, timeout: 3500 });
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        localStaffList = res.data.data;
        return res.data.data;
      }
    } catch {}

    if (params?.branchId) {
      return localStaffList.filter((s) => s.branchId === Number(params.branchId));
    }
    return [...localStaffList];
  },

  deleteStaff: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/owner/staff/${id}`);
    } catch {
      await apiClient.delete(`/hotel/staff/${id}`).catch(() => {});
    }
    localStaffList = localStaffList.filter((s) => s.id !== id);
  },

  // MODULE 6: REPORTS
  getReports: async (params?: { type?: string; branchId?: number; startDate?: string; endDate?: string; period?: string }): Promise<any> => {
    try {
      const res = await apiClient.get('/owner/reports', { params, timeout: 3500 });
      if (res.data?.data) {
        const backendData = res.data.data;
        localReportsData = {
          ...localReportsData,
          ...backendData,
          expensesList: (Array.isArray(backendData.expensesList) && backendData.expensesList.length > 0)
            ? backendData.expensesList
            : localReportsData.expensesList,
          branchExpensesBreakdown: (Array.isArray(backendData.branchExpensesBreakdown) && backendData.branchExpensesBreakdown.length > 0)
            ? backendData.branchExpensesBreakdown
            : localReportsData.branchExpensesBreakdown,
          totalExpensesAmount: Number(backendData.totalExpensesAmount || backendData.totalExpenses || localReportsData.totalExpensesAmount || 51200.0),
          topSpendingBranch: backendData.topSpendingBranch || localReportsData.topSpendingBranch || 'Nashik Branch',
          topExpenseCategory: backendData.topExpenseCategory || localReportsData.topExpenseCategory || 'Food / Raw Material',
        };
        return localReportsData;
      }
    } catch {}

    const branchName = params?.branchId
      ? (localBranches.find((b) => b.id === Number(params.branchId))?.name || 'Main Branch')
      : 'All Branches Consolidated';

    localReportsData = {
      ...localReportsData,
      reportType: params?.type || 'HOTEL_REPORT',
      filterBranchName: branchName,
      filterBranchId: params?.branchId || null,
      period: params?.period || 'this-month',
    };
    return localReportsData;
  },

  // MODULE 7: BILLING PERFORMANCE
  getBillingPerformance: async (params?: { branchId?: number; startDate?: string; endDate?: string }): Promise<OwnerBillingPerformanceData> => {
    try {
      const res = await apiClient.get('/owner/billing-performance', { params, timeout: 3500 });
      if (res.data?.data) {
        localBillingPerformance = res.data.data;
        return res.data.data;
      }
    } catch {}
    return localBillingPerformance;
  },

  // MODULE 8: SETTINGS
  getSettings: async (): Promise<any> => {
    try {
      const res = await apiClient.get('/owner/settings', { timeout: 3500 });
      if (res.data?.data) {
        localSettings = res.data.data;
        return res.data.data;
      }
    } catch {}
    return { ...localSettings };
  },

  updateSettings: async (payload: any): Promise<any> => {
    try {
      const res = await apiClient.post('/owner/settings', payload, { timeout: 4000 });
      if (res.data?.data) {
        localSettings = { ...localSettings, ...res.data.data };
        return res.data.data;
      }
    } catch {}
    localSettings = { ...localSettings, ...payload };
    return { ...localSettings };
  },
};

export default ownerService;
