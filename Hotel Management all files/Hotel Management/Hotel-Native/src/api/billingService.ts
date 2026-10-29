import apiClient from './client';
import { OrderItem, Order } from '../types';

export interface BillCalculation {
  subtotal: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  discountAmount: number;
  roundOff: number;
  totalAmount: number;
}

export const billingService = {
  calculateBill(
    items: OrderItem[],
    options: {
      enableTax: boolean;
      defaultTaxRate?: number;
      discountPercent?: number;
      enableRoundOff: boolean;
    }
  ): BillCalculation {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate Tax (e.g. 5% GST -> 2.5% CGST + 2.5% SGST)
    let taxAmount = 0;
    if (options.enableTax) {
      taxAmount = items.reduce((sum, item) => {
        const rate = item.taxRate || options.defaultTaxRate || 5;
        return sum + (item.price * item.quantity * (rate / 100));
      }, 0);
    }
    const cgst = Math.round((taxAmount / 2) * 100) / 100;
    const sgst = Math.round((taxAmount / 2) * 100) / 100;

    // Calculate Discount
    const discountPercent = options.discountPercent || 0;
    const discountAmount = Math.round((subtotal * (discountPercent / 100)) * 100) / 100;

    // Raw total before rounding
    const rawTotal = subtotal + taxAmount - discountAmount;
    
    let roundOff = 0;
    let totalAmount = rawTotal;

    if (options.enableRoundOff) {
      totalAmount = Math.round(rawTotal);
      roundOff = Math.round((totalAmount - rawTotal) * 100) / 100;
    } else {
      totalAmount = Math.round(rawTotal * 100) / 100;
    }

    return {
      subtotal,
      taxAmount,
      cgst,
      sgst,
      discountAmount,
      roundOff,
      totalAmount,
    };
  },

  async createInvoice(orderData: Partial<Order>): Promise<Order> {
    try {
      const res = await apiClient.post('/invoices', orderData);
      return res.data?.data || res.data;
    } catch {
      // Offline invoice generation fallback
      const created: Order = {
        id: 'INV-' + Date.now().toString().slice(-6),
        orderNumber: 'INV-' + Math.floor(1000 + Math.random() * 9000),
        tableId: orderData.tableId,
        tableName: orderData.tableName,
        orderType: orderData.orderType || 'DINE_IN',
        status: 'COMPLETED',
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        taxAmount: orderData.taxAmount || 0,
        discountAmount: orderData.discountAmount || 0,
        roundOff: orderData.roundOff || 0,
        totalAmount: orderData.totalAmount || 0,
        paymentStatus: 'PAID',
        paymentMode: orderData.paymentMode || 'CASH',
        createdAt: new Date().toISOString(),
      };
      return created;
    }
  },
};
