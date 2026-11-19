import api, { ApiResponse } from './api';
import { purchaseDataBundle } from './purchaseDataBundle';

export interface PurchaseOrderItem {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface PurchaseOrder {
  id: number;
  branchId?: number;
  supplierId: number;
  supplierName?: string;
  poNumber?: string;
  poDate?: string;
  expectedDeliveryDate?: string;
  status?: string;
  totalAmount?: number;
  items?: PurchaseOrderItem[];
  notes?: string;
  createdAt?: string;
}

export interface GoodsReceiptItem {
  id?: number;
  name?: string;
  itemName: string;
  unit?: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty?: number;
  batchNo?: string;
  expiryDate?: string;
}

export interface GoodsReceipt {
  id: number;
  branchId?: number;
  supplierId: number;
  supplierName?: string;
  purchaseOrderId?: number;
  poNumber?: string;
  grnNumber: string;
  grnDate: string;
  receivedBy?: string;
  status: string;
  totalOrderedQty?: number;
  totalReceivedQty?: number;
  totalAcceptedQty?: number;
  totalRejectedQty?: number;
  notes?: string;
  items?: GoodsReceiptItem[];
  createdAt?: string;
}

export interface PurchaseInvoiceItem {
  id?: number;
  name?: string;
  itemName: string;
  quantity: number;
  qty?: number;
  unitPrice: number;
  rate?: number;
  discountPercent?: number;
  discount?: number;
  taxRate?: number;
  gst?: number;
  total: number;
}

export interface PurchaseInvoice {
  id: number;
  supplierId: number;
  supplierName?: string;
  purchaseOrderId?: number;
  poNumber?: string;
  goodsReceiptId?: number;
  grnNumber?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?: string;
  status?: string;
  notes?: string;
  paymentMethod?: string;
  items?: PurchaseInvoiceItem[];
  createdAt?: string;
}

export interface PurchaseReturnItem {
  id?: number;
  name?: string;
  itemName: string;
  unit?: string;
  quantity: number;
  qty?: number;
  unitPrice: number;
  rate?: number;
  totalPrice?: number;
  total?: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: number;
  branchId?: number;
  supplierId: number;
  supplierName?: string;
  purchaseInvoiceId?: number;
  invoiceNumber?: string;
  purchaseOrderId?: number;
  poNumber?: string;
  returnNumber: string;
  returnDate: string;
  status: string;
  totalAmount: number;
  taxAmount?: number;
  reason?: string;
  items?: PurchaseReturnItem[];
  createdAt?: string;
}

export interface SupplierPayment {
  id: number;
  supplierId: number;
  supplierName?: string;
  purchaseInvoiceId: number;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paymentDate: string;
  status?: string;
}

export const purchaseService = {
  // Purchase Orders
  getPurchaseOrders: async (branchId?: number): Promise<PurchaseOrder[]> => {
    try {
      const params = branchId ? { branchId } : {};
      const response = await api.get<ApiResponse<PurchaseOrder[]>>('/hotel/purchase-orders', { params });
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend getPurchaseOrders failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.purchaseOrders as unknown as PurchaseOrder[]) || [];
  },

  createPurchaseOrder: async (payload: {
    branchId?: number;
    supplierId: number;
    poDate?: string;
    expectedDeliveryDate?: string;
    status?: string;
    items: PurchaseOrderItem[];
    notes?: string;
  }): Promise<PurchaseOrder> => {
    const body = {
      branchId: payload.branchId || 1,
      supplierId: Number(payload.supplierId),
      poDate: payload.poDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: payload.expectedDeliveryDate || null,
      status: payload.status || 'ORDERED',
      items: (payload.items || []).map((it) => ({
        itemName: it.itemName,
        unit: it.unit || 'PCS',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
      })),
      notes: payload.notes || '',
    };
    const response = await api.post<ApiResponse<PurchaseOrder>>('/hotel/purchase-orders', body);
    return response.data.data;
  },

  updatePurchaseOrder: async (
    id: number,
    payload: {
      branchId?: number;
      supplierId?: number;
      poDate?: string;
      expectedDeliveryDate?: string;
      status?: string;
      items?: PurchaseOrderItem[];
      notes?: string;
    }
  ): Promise<PurchaseOrder> => {
    const body = {
      branchId: payload.branchId || 1,
      supplierId: payload.supplierId ? Number(payload.supplierId) : undefined,
      poDate: payload.poDate || undefined,
      expectedDeliveryDate: payload.expectedDeliveryDate || null,
      status: payload.status || undefined,
      items: payload.items
        ? payload.items.map((it) => ({
            itemName: it.itemName,
            unit: it.unit || 'PCS',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            taxRate: Number(it.taxRate) || 0,
          }))
        : undefined,
      notes: payload.notes,
    };
    const response = await api.put<ApiResponse<PurchaseOrder>>(`/hotel/purchase-orders/${id}`, body);
    return response.data.data;
  },

  getPurchaseOrderById: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get<ApiResponse<PurchaseOrder>>(`/hotel/purchase-orders/${id}`);
    return response.data.data;
  },

  updatePurchaseOrderStatus: async (id: number, status: string): Promise<PurchaseOrder> => {
    const response = await api.patch<ApiResponse<PurchaseOrder>>(`/hotel/purchase-orders/${id}/status`, { status });
    return response.data.data;
  },

  deletePurchaseOrder: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/hotel/purchase-orders/${id}`);
  },

  // Goods Receipts (GRN)
  getGoodsReceipts: async (): Promise<GoodsReceipt[]> => {
    try {
      const response = await api.get<ApiResponse<GoodsReceipt[]>>('/hotel/goods-receipts');
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend getGoodsReceipts failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.goodsReceipts as unknown as GoodsReceipt[]) || [];
  },

  createGoodsReceipt: async (payload: {
    branchId?: number;
    supplierId: number;
    purchaseOrderId?: number;
    grnNumber?: string;
    grnDate?: string;
    receivedBy?: string;
    status?: string;
    notes?: string;
    items: {
      itemName: string;
      unit?: string;
      orderedQty?: number;
      receivedQty?: number;
      acceptedQty?: number;
      rejectedQty?: number;
      batchNo?: string;
      expiryDate?: string;
    }[];
  }): Promise<GoodsReceipt> => {
    const response = await api.post<ApiResponse<GoodsReceipt>>('/hotel/goods-receipts', payload);
    return response.data.data;
  },

  // Purchase Invoices
  getPurchaseInvoices: async (): Promise<PurchaseInvoice[]> => {
    try {
      const response = await api.get<ApiResponse<PurchaseInvoice[]>>('/hotel/purchase-invoices');
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend getPurchaseInvoices failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.purchaseInvoices as unknown as PurchaseInvoice[]) || [];
  },

  createPurchaseInvoice: async (payload: {
    supplierId: number;
    purchaseOrderId?: number;
    goodsReceiptId?: number;
    invoiceNumber: string;
    invoiceDate?: string;
    dueDate?: string;
    total: number;
    subtotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    notes?: string;
    paymentMethod?: string;
    items?: {
      itemName: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxRate?: number;
      total?: number;
    }[];
  }): Promise<PurchaseInvoice> => {
    const response = await api.post<ApiResponse<PurchaseInvoice>>('/hotel/purchase-invoices', payload);
    return response.data.data;
  },

  // Purchase Returns
  getPurchaseReturns: async (): Promise<PurchaseReturn[]> => {
    try {
      const response = await api.get<ApiResponse<PurchaseReturn[]>>('/hotel/purchase-returns');
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend getPurchaseReturns failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.purchaseReturns as unknown as PurchaseReturn[]) || [];
  },

  createPurchaseReturn: async (payload: {
    branchId?: number;
    supplierId: number;
    purchaseInvoiceId?: number;
    purchaseOrderId?: number;
    returnNumber?: string;
    returnDate?: string;
    status?: string;
    totalAmount?: number;
    taxAmount?: number;
    reason?: string;
    items?: {
      itemName: string;
      unit?: string;
      quantity: number;
      unitPrice: number;
      totalPrice?: number;
      reason?: string;
    }[];
  }): Promise<PurchaseReturn> => {
    const response = await api.post<ApiResponse<PurchaseReturn>>('/hotel/purchase-returns', payload);
    return response.data.data;
  },

  // Supplier Payments
  getSupplierPayments: async (): Promise<SupplierPayment[]> => {
    try {
      const response = await api.get<ApiResponse<SupplierPayment[]>>('/hotel/supplier-payments');
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend getSupplierPayments failed, using fallback database bundle', err);
    }
    return (purchaseDataBundle.supplierPayments as unknown as SupplierPayment[]) || [];
  },

  recordSupplierPayment: async (payload: {
    supplierId: number;
    purchaseInvoiceId: number;
    amount: number;
    paymentMethod: string;
    transactionReference?: string;
    paymentDate?: string;
  }): Promise<SupplierPayment> => {
    const rawMethod = String(payload.paymentMethod || 'BANK_TRANSFER').trim().toUpperCase().replace(/[-\s]+/g, '_');
    const paymentMethod = rawMethod === 'BANK' || rawMethod === 'BANKTRANSFER' || rawMethod === 'CHEQUE' || rawMethod === 'CHECK'
      ? 'BANK_TRANSFER'
      : rawMethod === 'CREDIT_CARD' || rawMethod === 'DEBIT_CARD'
        ? 'CARD'
        : rawMethod === 'ONLINE'
          ? 'UPI'
          : ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].includes(rawMethod) ? rawMethod : 'BANK_TRANSFER';
    const body = {
      supplierId: Number(payload.supplierId),
      purchaseInvoiceId: Number(payload.purchaseInvoiceId),
      amount: Number(payload.amount) || 0,
      paymentMethod,
      transactionReference: payload.transactionReference || `SP-${Date.now()}`,
      paymentDate: payload.paymentDate || new Date().toISOString().split('T')[0],
    };
    const response = await api.post<ApiResponse<SupplierPayment>>('/hotel/supplier-payments', body);
    return response.data.data;
  },
};

export default purchaseService;
