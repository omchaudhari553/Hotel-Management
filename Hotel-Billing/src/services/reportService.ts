import api, { ApiResponse } from './api';
import {
  DashboardStats,
  IndustryRevenue,
  IndustryReportWrapper,
  MessReport,
  HotelReport,
  CafeReport,
} from '../types';

export const reportService = {
  getCurrentIndustryReport: async (businessId = 1): Promise<IndustryReportWrapper> => {
    const savedIndustry = (localStorage.getItem('ajalkar_industry') || 'HOTEL').toUpperCase();
    const response = await api.get<ApiResponse<any>>('/hotel/reports/summary', {
      params: { businessId },
    });
    const summary = response.data.data || {};

    const grossRevenue = Number(summary.grossRevenue) || 0;
    const totalExpenses = Number(summary.totalExpenses) || 0;
    const netProfit = Number(summary.netProfit) || grossRevenue - totalExpenses;

    const baseTaxSummary = {
      grossRevenue,
      totalDiscounts: 0,
      taxableAmount: grossRevenue,
      cgst: grossRevenue * 0.06,
      sgst: grossRevenue * 0.06,
      totalTax: grossRevenue * 0.12,
      totalExpenses,
      netProfit,
      profitMarginPercentage: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
    };

    const hotelReport: HotelReport = {
      totalRoomRevenue: grossRevenue,
      occupancyRatePercentage: Number(summary.occupancyRate) || 0,
      totalRooms: Number(summary.totalRooms) || 0,
      occupiedRooms: 0,
      availableRooms: Number(summary.totalRooms) || 0,
      totalBookings: Number(summary.totalBookings) || 0,
      todayCheckIns: 0,
      todayCheckOuts: 0,
      guestDiningRevenue: 0,
      totalExpenses,
      netProfit,
      taxSummary: baseTaxSummary,
      roomTypeBreakdown: [],
    };

    const messReport: MessReport = {
      totalSubscriptionRevenue: grossRevenue,
      activeMembers: 0,
      mealsServedToday: 0,
      totalMealsServedMonth: 0,
      tiffinDispatchesCount: 0,
      activeTiffinMembers: 0,
      attendanceRatePercentage: 0,
      totalExpenses,
      netProfit,
      taxSummary: baseTaxSummary,
      planRevenueBreakdown: [],
      attendanceByDay: [],
    };

    const cafeReport: CafeReport = {
      totalPosSales: grossRevenue,
      totalOrdersProcessed: Number(summary.totalKots) || 0,
      dineInTableOrders: 0,
      takeawayCounterOrders: 0,
      averageOrderValue: 0,
      inventoryConsumptionCost: 0,
      totalExpenses,
      netProfit,
      taxSummary: baseTaxSummary,
      topSellingItems: [],
    };

    return {
      industryType: savedIndustry,
      businessName: 'Hotel Management System',
      messReport: savedIndustry === 'MESS' ? messReport : undefined,
      hotelReport: savedIndustry === 'HOTEL' ? hotelReport : undefined,
      cafeReport: savedIndustry === 'CAFE' ? cafeReport : undefined,
    };
  },

  getMessReport: async (businessId = 1): Promise<MessReport> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/summary', {
      params: { businessId },
    });
    const s = response.data.data || {};
    const rev = Number(s.grossRevenue) || 0;
    const exp = Number(s.totalExpenses) || 0;

    return {
      totalSubscriptionRevenue: rev,
      activeMembers: 0,
      mealsServedToday: 0,
      totalMealsServedMonth: 0,
      tiffinDispatchesCount: 0,
      activeTiffinMembers: 0,
      attendanceRatePercentage: 0,
      totalExpenses: exp,
      netProfit: rev - exp,
      taxSummary: {
        grossRevenue: rev,
        totalDiscounts: 0,
        taxableAmount: rev,
        cgst: rev * 0.025,
        sgst: rev * 0.025,
        totalTax: rev * 0.05,
        totalExpenses: exp,
        netProfit: rev - exp,
        profitMarginPercentage: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
      },
      planRevenueBreakdown: [],
      attendanceByDay: [],
    };
  },

  getHotelReport: async (businessId = 1): Promise<HotelReport> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/summary', {
      params: { businessId },
    });
    const s = response.data.data || {};
    const rev = Number(s.grossRevenue) || 0;
    const exp = Number(s.totalExpenses) || 0;

    return {
      totalRoomRevenue: rev,
      occupancyRatePercentage: Number(s.occupancyRate) || 0,
      totalRooms: Number(s.totalRooms) || 0,
      occupiedRooms: 0,
      availableRooms: Number(s.totalRooms) || 0,
      totalBookings: Number(s.totalBookings) || 0,
      todayCheckIns: 0,
      todayCheckOuts: 0,
      guestDiningRevenue: 0,
      totalExpenses: exp,
      netProfit: rev - exp,
      taxSummary: {
        grossRevenue: rev,
        totalDiscounts: 0,
        taxableAmount: rev,
        cgst: rev * 0.06,
        sgst: rev * 0.06,
        totalTax: rev * 0.12,
        totalExpenses: exp,
        netProfit: rev - exp,
        profitMarginPercentage: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
      },
      roomTypeBreakdown: [],
    };
  },

  getCafeReport: async (businessId = 1): Promise<CafeReport> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/summary', {
      params: { businessId },
    });
    const s = response.data.data || {};
    const rev = Number(s.grossRevenue) || 0;
    const exp = Number(s.totalExpenses) || 0;

    return {
      totalPosSales: rev,
      totalOrdersProcessed: Number(s.totalKots) || 0,
      dineInTableOrders: 0,
      takeawayCounterOrders: 0,
      averageOrderValue: 0,
      inventoryConsumptionCost: 0,
      totalExpenses: exp,
      netProfit: rev - exp,
      taxSummary: {
        grossRevenue: rev,
        totalDiscounts: 0,
        taxableAmount: rev,
        cgst: rev * 0.025,
        sgst: rev * 0.025,
        totalTax: rev * 0.05,
        totalExpenses: exp,
        netProfit: rev - exp,
        profitMarginPercentage: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
      },
      topSellingItems: [],
    };
  },

  getDashboardStats: async (
    branchId?: number,
    industryCode?: string,
    startDate?: string,
    endDate?: string
  ): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<any>>('/hotel/dashboard/kpis', {
      params: { branchId: branchId || undefined, businessId: 1, industryCode, startDate, endDate },
    });
    const k = response.data.data || {};

    const totalRevenue = Number(k.totalRevenue) || Number(k.todayRevenue) || 0;

    return {
      totalRevenue,
      totalInvoices: Number(k.totalInvoices) || 0,
      activeCustomers: Number(k.activeCustomers) || Number(k.activeStaff) || 0,
      lowStockProductsCount: Number(k.lowStockProductsCount) || 0,
      totalHotelRooms: Number(k.totalHotelRooms) || 0,
      occupiedHotelRooms: Number(k.occupiedHotelRooms) || 0,
      todayHotelBookings: Number(k.todayHotelBookings) || 0,
      hotelOccupancyRate: Number(k.hotelOccupancyRate) || 0,
      activeMessSubscribers: Number(k.activeMessSubscribers) || 0,
      todayMessMealsServed: Number(k.todayMessMealsServed) || 0,
      todayTiffinsDispatched: Number(k.todayTiffinsDispatched) || Number(k.todayDeliveries) || 0,
      totalCafeTables: Number(k.totalTables) || 0,
      occupiedCafeTables: (Number(k.totalTables) || 0) - (Number(k.availableTables) || 0),
      todayCafeOrders: Number(k.todayCafeOrders) || 0,
      todayCafeSales: Number(k.todayCafeSales) || 0,
      revenueByIndustry: [
        {
          industryCode: 'HOTEL',
          industryName: 'Hotel / Restro',
          revenue: totalRevenue,
          invoiceCount: Number(k.totalInvoices) || 0,
          percentage: 100,
        },
      ],
    };
  },

  getRevenueByIndustry: async (businessId = 1): Promise<IndustryRevenue[]> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/revenue', {
      params: { businessId },
    });
    const data = response.data.data || {};
    const totalRev = Number(data.grossRevenue) || 0;

    return [
      {
        industryCode: 'HOTEL',
        industryName: 'Hotel / Restro',
        revenue: totalRev,
        invoiceCount: Number(data.totalBookings) || 0,
        percentage: 100,
      },
    ];
  },

  getSummaryReport: async (
    businessId = 1,
    filters?: { startDate?: string; endDate?: string; period?: string }
  ): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/summary', {
      params: { businessId, ...filters },
    });
    return response.data.data;
  },

  getRevenueReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/revenue', { params: { businessId } });
    return response.data.data;
  },

  getBookingReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/bookings', { params: { businessId } });
    return response.data.data;
  },

  getExpenseReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/expenses', { params: { businessId } });
    return response.data.data;
  },

  getKotReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/kot', { params: { businessId } });
    return response.data.data;
  },

  getOccupancyReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/occupancy', { params: { businessId } });
    return response.data.data;
  },

  getPaymentReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/payments', { params: { businessId } });
    return response.data.data;
  },

  getStaffReport: async (businessId = 1): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/hotel/reports/staff', { params: { businessId } });
    return response.data.data;
  },
};
export default reportService;
