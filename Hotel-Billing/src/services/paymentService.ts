import api, { ApiResponse } from './api';
import { Payment } from '../types';

const normalizePaymentMethod = (value: unknown): string => {
  const v = String(value || 'CASH').trim().toUpperCase().replace(/[-\s]+/g, '_');
  if (v === 'BANK' || v === 'BANKTRANSFER') return 'BANK_TRANSFER';
  if (v === 'CREDIT_CARD' || v === 'DEBIT_CARD') return 'CARD';
  if (v === 'ONLINE') return 'UPI';
  return ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].includes(v) ? v : 'CASH';
};

export const paymentService = {
  getPayments: async (params?: number | { branchId?: number; businessId?: number }, industryCode?: string): Promise<Payment[]> => {
    const q: Record<string, any> = {};
    if (typeof params === 'number') {
      q.branchId = params;
    } else if (params && typeof params === 'object') {
      if (params.branchId != null) q.branchId = params.branchId;
      if (params.businessId != null) q.businessId = params.businessId;
    }
    if (industryCode && industryCode !== 'ALL') q.industryCode = industryCode;

    const response = await api.get<ApiResponse<any[]>>('/hotel/payments', { params: q });
    const raw = response.data.data || [];

    return raw.map((p) => ({
      id: p.id,
      businessId: p.businessId || 1,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : ''),
      customerId: p.customerId,
      customerName: p.customerName || 'Customer',
      amount: Number(p.amount) || 0,
      paymentMethod: p.paymentMethod || 'CASH',
      transactionRef: p.transactionRef || '',
      paymentDate: p.paymentDate || new Date().toISOString().split('T')[0],
      status: p.status || 'SUCCESS',
      notes: p.notes || '',
    }));
  },

  recordPayment: async (payload: Partial<Payment>): Promise<Payment> => {
    const body = {
      invoiceId: Number(payload.invoiceId) || 1,
      amount: Number(payload.amount) || 0,
      paymentMethod: normalizePaymentMethod(payload.paymentMethod),
      transactionRef: payload.transactionRef || `TXN-${Date.now()}`,
      paymentDate: payload.paymentDate || new Date().toISOString().split('T')[0],
      notes: payload.notes || '',
    };

    const response = await api.post<ApiResponse<any>>('/hotel/payments', body);
    const p = response.data.data;

    return {
      id: p.id,
      businessId: p.businessId || 1,
      invoiceId: p.invoiceId || body.invoiceId,
      invoiceNumber: p.invoiceNumber,
      customerId: p.customerId,
      customerName: p.customerName,
      amount: Number(p.amount) || body.amount,
      paymentMethod: p.paymentMethod || body.paymentMethod,
      transactionRef: p.transactionRef || body.transactionRef,
      paymentDate: p.paymentDate || body.paymentDate,
      status: p.status || 'SUCCESS',
      notes: p.notes,
    };
  },
};
