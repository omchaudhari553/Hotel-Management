import api, { ApiResponse } from './api';
import { Invoice } from '../types';

export const billingService = {
  getInvoices: async (params?: number | { branchId?: number; businessId?: number; status?: string }, industryCode?: string, status?: string): Promise<Invoice[]> => {
    const q: Record<string, any> = {};
    if (typeof params === 'number') {
      q.branchId = params;
    } else if (params && typeof params === 'object') {
      if (params.branchId != null) q.branchId = params.branchId;
      if (params.businessId != null) q.businessId = params.businessId;
      if (params.status && params.status !== 'ALL') q.status = params.status;
    }
    if (status && status !== 'ALL') q.status = status;

    const response = await api.get<ApiResponse<Invoice[]>>('/hotel/invoices', { params: q });
    const invoices = response.data.data || [];

    // Filter in-memory if industryCode is specified
    if (industryCode && industryCode !== 'ALL') {
      return invoices.filter((i) => !(i as any).industryCode || (i as any).industryCode === industryCode);
    }
    return invoices;
  },

  getInvoiceById: async (id: number): Promise<Invoice> => {
    const response = await api.get<ApiResponse<Invoice>>(`/hotel/invoices/${id}`);
    return response.data.data;
  },

  createInvoice: async (invoicePayload: any): Promise<Invoice> => {
    const body = {
      branchId: invoicePayload.branchId || null,
      bookingId: invoicePayload.bookingId || null,
      orderId: invoicePayload.orderId || null,
      guestId: invoicePayload.guestId || invoicePayload.customerId || null,
      dueDate: invoicePayload.dueDate || null,
      discountAmount: invoicePayload.discountAmount || 0,
      cgstRate: invoicePayload.cgstRate || 0,
      sgstRate: invoicePayload.sgstRate || 0,
      igstRate: invoicePayload.igstRate || 0,
      items: (invoicePayload.items || []).map((item: any) => ({
        productId: item.productId || null,
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        taxRate: item.taxRate || 0,
      })),
      notes: invoicePayload.notes || '',
      invoiceNumber: invoicePayload.invoiceNumber || null,
    };

    const response = await api.post<ApiResponse<Invoice>>('/hotel/invoices', body);
    return response.data.data;
  },

  getNextInvoiceNumber: async (): Promise<string> => {
    try {
      const response = await api.get<ApiResponse<{ invoiceNumber: string }>>('/hotel/invoices/next-number');
      if (response.data?.data?.invoiceNumber) {
        return response.data.data.invoiceNumber;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('ajalkar_billing_config');
      const cfg = raw ? JSON.parse(raw) : {};
      const prefix = (cfg.invoicePrefix || 'INV').trim();
      const start = parseInt(cfg.invoiceStart || '1001', 10) || 1001;
      return `${prefix}-${start}`;
    } catch {
      return 'INV-1001';
    }
  },
};
