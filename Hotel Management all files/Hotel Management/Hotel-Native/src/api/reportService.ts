import apiClient, { ensureBackendToken } from './client';
import { KPIStats } from '../types';

export interface DailyReportRow {
  date: string;
  sales: number;
  expenses: number;
  gst: number;
  net: number;
  ordersCount: number;
}

export const reportService = {
  async getKPIOverview(branchId: number = 1): Promise<KPIStats> {
    try {
      await ensureBackendToken();
      const [kpiRes, summaryRes] = await Promise.allSettled([
        apiClient.get('/hotel/dashboard/kpis', { params: { branchId, businessId: 1 } }),
        apiClient.get('/hotel/reports/summary', { params: { branchId, businessId: 1 } }),
      ]);

      const k = kpiRes.status === 'fulfilled' ? kpiRes.value.data?.data || {} : {};
      const s = summaryRes.status === 'fulfilled' ? summaryRes.value.data?.data || {} : {};

      const totalSales = Number(k.totalRevenue ?? k.todayRevenue ?? s.grossRevenue ?? 0);
      const totalExpenses = Number(k.totalExpenses ?? s.totalExpenses ?? 0);
      const netAmount = Number(k.netRevenue ?? s.netProfit ?? (totalSales - totalExpenses));
      const amountReceived = Number(k.collectedPayments ?? s.paidRevenue ?? totalSales);
      const pendingAmount = Math.max(0, totalSales - amountReceived);
      const netFlow = amountReceived - totalExpenses;
      const taxAmount = Number(s.totalTax ?? Math.round(totalSales * 0.05));
      const totalOrders = Number(k.totalInvoices ?? k.todayBills ?? s.totalKots ?? 0);
      const activeTables = Number(k.occupiedCafeTables ?? 0);
      const occupiedRooms = Number(k.occupiedHotelRooms ?? 0);

      return {
        totalSales,
        totalExpenses,
        netAmount,
        taxAmount,
        amountReceived,
        pendingAmount,
        netFlow,
        totalOrders,
        activeTables,
        occupiedRooms,
      };
    } catch {
      return {
        totalSales: 0,
        totalExpenses: 0,
        netAmount: 0,
        taxAmount: 0,
        amountReceived: 0,
        pendingAmount: 0,
        netFlow: 0,
        totalOrders: 0,
        activeTables: 0,
        occupiedRooms: 0,
      };
    }
  },

  async getRecentDaysReport(branchId: number = 1): Promise<DailyReportRow[]> {
    try {
      await ensureBackendToken();
      const invRes = await apiClient.get('/hotel/invoices', { params: { branchId } });
      const invoices = invRes.data?.data || [];

      if (Array.isArray(invoices) && invoices.length > 0) {
        const dateMap: Record<string, { sales: number; gst: number; count: number }> = {};
        invoices.forEach((inv: any) => {
          const d = inv.invoiceDate || (inv.createdAt ? String(inv.createdAt).split('T')[0] : 'Today');
          if (!dateMap[d]) {
            dateMap[d] = { sales: 0, gst: 0, count: 0 };
          }
          const tot = Number(inv.grandTotal || inv.total || inv.totalAmount || 0);
          const tax = Number(inv.taxAmount || (inv.cgst || 0) + (inv.sgst || 0));
          dateMap[d].sales += tot;
          dateMap[d].gst += tax;
          dateMap[d].count += 1;
        });

        const rows: DailyReportRow[] = Object.entries(dateMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 7)
          .map(([date, data]) => ({
            date,
            sales: Math.round(data.sales),
            expenses: 0,
            gst: Math.round(data.gst),
            net: Math.round(data.sales),
            ordersCount: data.count,
          }));

        if (rows.length > 0) return rows;
      }
    } catch {}

    return [
      { date: 'Today', sales: 0, expenses: 0, gst: 0, net: 0, ordersCount: 0 },
    ];
  },
};
export default reportService;
