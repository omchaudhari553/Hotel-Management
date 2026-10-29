import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ensureBackendToken } from './client';
import { purchaseDataBundle } from './purchaseDataBundle';

export interface PurchaseOrderItem {
  id?: number | string;
  name?: string;
  itemName: string;
  unit: string;
  quantity: number;
  qty?: number;
  unitPrice: number;
  rate?: number;
  discount?: number;
  discountPercent?: number;
  taxRate?: number;
  tax?: number;
  total?: number;
}

export interface PurchaseOrder {
  id: number | string;
  branchId?: number;
  branchName?: string;
  branchCode?: string;
  supplierId: number | string;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierGst?: string;
  supplier?: Supplier;
  poNumber: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  status: 'ORDERED' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'DRAFT' | 'PAID' | string;
  total?: number;
  totalAmount: number;
  subtotal?: number;
  taxTotal?: number;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt?: string;
}

export interface Supplier {
  id: number | string;
  name: string;
  company?: string;
  contact?: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  status: 'Active' | 'Inactive' | 'ACTIVE' | 'INACTIVE';
  balanceDue?: number;
  totalPurchases?: number;
}

export interface GoodsReceiptItem {
  id?: number | string;
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
  id: number | string;
  branchId?: number;
  supplierId: number | string;
  supplierName?: string;
  purchaseOrderId?: number | string;
  poNumber?: string;
  grnNumber: string;
  grnDate: string;
  receivedBy?: string;
  status: 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'INSPECTED' | 'COMPLETED' | string;
  totalOrderedQty?: number;
  totalReceivedQty?: number;
  totalAcceptedQty?: number;
  totalRejectedQty?: number;
  notes?: string;
  items: GoodsReceiptItem[];
  createdAt?: string;
}

export interface PurchaseInvoiceItem {
  id?: number | string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
  total: number;
}

export interface PurchaseInvoice {
  id: number | string;
  supplierId: number | string;
  supplierName?: string;
  purchaseOrderId?: number | string;
  poNumber?: string;
  goodsReceiptId?: number | string;
  grnNumber?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | string;
  status?: string;
  notes?: string;
  paymentMethod?: string;
  items: PurchaseInvoiceItem[];
  createdAt?: string;
}

export interface PurchaseReturnItem {
  id?: number | string;
  itemName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: number | string;
  branchId?: number;
  supplierId: number | string;
  supplierName?: string;
  purchaseInvoiceId?: number | string;
  invoiceNumber?: string;
  purchaseOrderId?: number | string;
  poNumber?: string;
  returnNumber: string;
  returnDate: string;
  status: 'RETURNED' | 'REFUNDED' | 'PENDING' | string;
  totalAmount: number;
  taxAmount?: number;
  reason?: string;
  items: PurchaseReturnItem[];
  createdAt?: string;
}

export interface SupplierPayment {
  id: number | string;
  supplierId: number | string;
  supplierName?: string;
  purchaseInvoiceId?: number | string;
  invoiceNumber?: string;
  poNumber?: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | string;
  transactionReference?: string;
  paymentDate: string;
  status?: string;
  notes?: string;
}

// Validation & Utilities
export function validateGstin(gstin: string): { isValid: boolean; message: string } {
  if (!gstin) return { isValid: false, message: 'GSTIN is required' };
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length !== 15) {
    return { isValid: false, message: 'GSTIN must be exactly 15 alphanumeric characters' };
  }
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(cleaned)) {
    return { isValid: false, message: 'Invalid GSTIN format (e.g. 27AABCS1234F1Z5)' };
  }
  return { isValid: true, message: 'Valid GSTIN' };
}

export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (intVal: number): string => {
    let str = '';
    if (intVal >= 10000000) {
      str += inWords(Math.floor(intVal / 10000000)) + 'Crore ';
      intVal %= 10000000;
    }
    if (intVal >= 100000) {
      str += inWords(Math.floor(intVal / 100000)) + 'Lakh ';
      intVal %= 100000;
    }
    if (intVal >= 1000) {
      str += inWords(Math.floor(intVal / 1000)) + 'Thousand ';
      intVal %= 1000;
    }
    if (intVal >= 100) {
      str += inWords(Math.floor(intVal / 100)) + 'Hundred ';
      intVal %= 100;
    }
    if (intVal > 0) {
      if (intVal < 20) {
        str += a[intVal];
      } else {
        str += b[Math.floor(intVal / 10)] + (intVal % 10 !== 0 ? ' ' + a[intVal % 10] : ' ');
      }
    }
    return str;
  };

  return `${inWords(n).trim()} Rupees Only`;
}

export const normalizeToIsoDate = (raw?: string | null): string => {
  if (!raw) return new Date().toISOString().split('T')[0];
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmMatch) {
    const d = dmMatch[1].padStart(2, '0');
    const m = dmMatch[2].padStart(2, '0');
    const y = dmMatch[3];
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().split('T')[0];
};

export function formatPoReceiptForWhatsApp(data: {
  receiptNo?: string;
  poNumber: string;
  poDate: string;
  supName: string;
  displayContact?: string;
  displayGst?: string;
  items: Array<{ itemName?: string; name?: string; unit?: string; quantity?: number; qty?: number; unitPrice?: number; rate?: number }>;
  grandTotal: number;
  subTotal?: number;
  hotelName?: string;
}): string {
  const hotel = data.hotelName || 'Royal Palace Hotel';
  const lines: string[] = [];
  lines.push(`🏨 *${hotel}*`);
  lines.push(`📋 *PURCHASE RECEIPT*`);
  lines.push(`--------------------------------`);
  if (data.receiptNo) lines.push(`*Receipt No:* ${data.receiptNo}`);
  lines.push(`*PO Number:* ${data.poNumber}`);
  lines.push(`*Date:* ${data.poDate}`);
  lines.push(`*Supplier:* ${data.supName}`);
  if (data.displayContact) lines.push(`*Contact:* ${data.displayContact}`);
  if (data.displayGst) lines.push(`*GSTIN:* ${data.displayGst}`);
  lines.push(`--------------------------------`);
  lines.push(`*ORDERED ITEMS:*`);

  data.items.forEach((it, idx) => {
    const name = it.itemName || it.name || 'Item';
    const q = it.quantity ?? it.qty ?? 1;
    const unit = it.unit || 'Kg';
    const rate = it.unitPrice ?? it.rate ?? 0;
    const amt = q * rate;
    lines.push(`${idx + 1}. ${name} - ${q} ${unit} @ ₹${rate} = ₹${amt.toLocaleString('en-IN')}`);
  });

  lines.push(`--------------------------------`);
  lines.push(`*GRAND TOTAL:* ₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`--------------------------------`);
  lines.push(`*Goods received in good condition.*`);
  lines.push(`*Thank you for your business!*`);
  lines.push(`_Generated via Ajalkar POS Hotel Management System_`);
  return lines.join('\n');
}

// Reactive Store Keys
const STORAGE_KEY = '@ajalkar_purchase_data_bundle_v1';

class PurchaseStore {
  private suppliers: Supplier[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private goodsReceipts: GoodsReceipt[] = [];
  private purchaseInvoices: PurchaseInvoice[] = [];
  private purchaseReturns: PurchaseReturn[] = [];
  private supplierPayments: SupplierPayment[] = [];
  private listeners: Array<() => void> = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.suppliers = parsed.suppliers || [];
        this.purchaseOrders = parsed.purchaseOrders || [];
        this.goodsReceipts = parsed.goodsReceipts || [];
        this.purchaseInvoices = parsed.purchaseInvoices || [];
        this.purchaseReturns = parsed.purchaseReturns || [];
        this.supplierPayments = parsed.supplierPayments || [];
      } else {
        this.loadDefaultBundle();
      }
    } catch {
      this.loadDefaultBundle();
    }
    this.isInitialized = true;
    this.notify();

    // In background, sync with backend database if accessible
    this.syncWithBackend();
  }

  private loadDefaultBundle() {
    this.suppliers = (purchaseDataBundle.suppliers as unknown as Supplier[]) || [];
    this.purchaseOrders = (purchaseDataBundle.purchaseOrders as unknown as PurchaseOrder[]) || [];
    this.goodsReceipts = (purchaseDataBundle.goodsReceipts as unknown as GoodsReceipt[]) || [];
    this.purchaseInvoices = (purchaseDataBundle.purchaseInvoices as unknown as PurchaseInvoice[]) || [];
    this.purchaseReturns = (purchaseDataBundle.purchaseReturns as unknown as PurchaseReturn[]) || [];
    this.supplierPayments = (purchaseDataBundle.supplierPayments as unknown as SupplierPayment[]) || [];
    this.persist();
  }

  private async persist() {
    try {
      const payload = {
        suppliers: this.suppliers,
        purchaseOrders: this.purchaseOrders,
        goodsReceipts: this.goodsReceipts,
        purchaseInvoices: this.purchaseInvoices,
        purchaseReturns: this.purchaseReturns,
        supplierPayments: this.supplierPayments,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to persist purchase store', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch {}
    });
  }

  public async syncWithBackend(): Promise<void> {
    try {
      await ensureBackendToken();
      const [supRes, poRes, grnRes, invRes, retRes, payRes] = await Promise.allSettled([
        apiClient.get('/hotel/suppliers', { params: { businessId: 1 } }),
        apiClient.get('/hotel/purchase-orders'),
        apiClient.get('/hotel/goods-receipts'),
        apiClient.get('/hotel/purchase-invoices'),
        apiClient.get('/hotel/purchase-returns'),
        apiClient.get('/hotel/supplier-payments'),
      ]);

      let changed = false;
      if (supRes.status === 'fulfilled' && supRes.value.data?.data?.length > 0) {
        this.suppliers = supRes.value.data.data;
        changed = true;
      }
      if (poRes.status === 'fulfilled' && poRes.value.data?.data?.length > 0) {
        this.purchaseOrders = poRes.value.data.data;
        changed = true;
      }
      if (grnRes.status === 'fulfilled' && grnRes.value.data?.data?.length > 0) {
        this.goodsReceipts = grnRes.value.data.data;
        changed = true;
      }
      if (invRes.status === 'fulfilled' && invRes.value.data?.data?.length > 0) {
        this.purchaseInvoices = invRes.value.data.data;
        changed = true;
      }
      if (retRes.status === 'fulfilled' && retRes.value.data?.data?.length > 0) {
        this.purchaseReturns = retRes.value.data.data;
        changed = true;
      }
      if (payRes.status === 'fulfilled' && payRes.value.data?.data?.length > 0) {
        this.supplierPayments = payRes.value.data.data;
        changed = true;
      }

      if (changed) {
        await this.persist();
        this.notify();
      }
    } catch (e) {
      console.warn('Backend purchase sync failed, running with offline bundle', e);
    }
  }

  // Getters
  public getSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders];
  }

  public getGoodsReceipts(): GoodsReceipt[] {
    return [...this.goodsReceipts];
  }

  public getPurchaseInvoices(): PurchaseInvoice[] {
    return [...this.purchaseInvoices];
  }

  public getPurchaseReturns(): PurchaseReturn[] {
    return [...this.purchaseReturns];
  }

  public getSupplierPayments(): SupplierPayment[] {
    return [...this.supplierPayments];
  }

  // Supplier Operations
  public async saveSupplier(sup: Partial<Supplier>): Promise<Supplier> {
    let saved: Supplier;
    const nowId = sup.id || Date.now();
    const existingIdx = this.suppliers.findIndex(s => String(s.id) === String(nowId));

    if (existingIdx >= 0) {
      saved = { ...this.suppliers[existingIdx], ...sup, id: nowId } as Supplier;
      this.suppliers[existingIdx] = saved;
    } else {
      saved = {
        id: nowId,
        name: sup.name || sup.company || 'Supplier',
        company: sup.company || sup.name || 'Supplier Company',
        contact: sup.contact || sup.name || '',
        phone: sup.phone || '',
        email: sup.email || '',
        address: sup.address || '',
        gstNumber: sup.gstNumber ? sup.gstNumber.toUpperCase() : '',
        status: sup.status || 'Active',
      };
      this.suppliers = [saved, ...this.suppliers];
    }

    await this.persist();
    this.notify();

    // Try backend persistence
    try {
      await ensureBackendToken();
      let cleanPhone = (saved.phone || '').replace(/\D/g, '');
      if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        cleanPhone = '9876543210';
      }

      const supPayload = {
        name: saved.contact || saved.name,
        company: saved.company || saved.name,
        phone: cleanPhone,
        email: saved.email || `${(saved.company || saved.name || 'supplier').toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        address: saved.address || 'Pune, Maharashtra',
        gstNumber: saved.gstNumber || '27AABCS1234F1Z5',
        status: 'ACTIVE',
        branchId: 1,
      };

      if (existingIdx >= 0 && typeof saved.id === 'number') {
        await apiClient.put(`/hotel/suppliers/${nowId}`, supPayload);
      } else {
        const res = await apiClient.post('/hotel/suppliers', supPayload);
        if (res.data?.data?.id) {
          saved.id = res.data.data.id;
          if (existingIdx >= 0) {
            this.suppliers[existingIdx] = saved;
          } else {
            this.suppliers[0] = saved;
          }
          await this.persist();
          this.notify();
        }
      }
    } catch (e) {
      console.warn('Backend saveSupplier sync warning:', e);
    }

    return saved;
  }

  public async deleteSupplier(id: number | string): Promise<void> {
    this.suppliers = this.suppliers.filter(s => String(s.id) !== String(id));
    await this.persist();
    this.notify();
    try {
      await ensureBackendToken();
      await apiClient.delete(`/hotel/suppliers/${id}`);
    } catch {}
  }

  // Purchase Order Operations
  public async savePurchaseOrder(po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const id = po.id || Date.now();
    const trimmedPoNo = (po.poNumber || `PO-${Date.now().toString().slice(-6)}`).trim();
    const existingIdx = this.purchaseOrders.findIndex(
      p => String(p.id) === String(id) || p.poNumber === trimmedPoNo
    );

    const items: PurchaseOrderItem[] = (po.items || []).map((it, idx) => ({
      id: it.id || idx + 1,
      itemName: it.itemName || it.name || 'Item',
      name: it.itemName || it.name || 'Item',
      unit: it.unit || 'Kg',
      quantity: Number(it.quantity ?? it.qty ?? 1),
      qty: Number(it.quantity ?? it.qty ?? 1),
      unitPrice: Number(it.unitPrice ?? it.rate ?? 0),
      rate: Number(it.unitPrice ?? it.rate ?? 0),
      discount: Number(it.discount ?? it.discountPercent ?? 0),
      taxRate: Number(it.taxRate ?? it.tax ?? 5),
      tax: Number(it.taxRate ?? it.tax ?? 5),
      total: (Number(it.quantity ?? it.qty ?? 1) * Number(it.unitPrice ?? it.rate ?? 0)) * (1 - (Number(it.discount ?? 0) / 100)) * (1 + (Number(it.taxRate ?? it.tax ?? 5) / 100)),
    }));

    const totalAmt = items.reduce((sum, it) => sum + (it.total || 0), 0);

    const saved: PurchaseOrder = {
      id: po.id || id,
      branchId: po.branchId || 1,
      supplierId: po.supplierId || 1,
      supplierName: po.supplierName || 'Supplier',
      supplierPhone: po.supplierPhone,
      supplierAddress: po.supplierAddress,
      supplierGst: po.supplierGst,
      supplier: po.supplier,
      poNumber: trimmedPoNo,
      poDate: po.poDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: po.expectedDeliveryDate || null,
      status: po.status || 'ORDERED',
      totalAmount: po.totalAmount !== undefined ? po.totalAmount : totalAmt,
      total: po.totalAmount !== undefined ? po.totalAmount : totalAmt,
      notes: po.notes || '',
      items,
      createdAt: po.createdAt || new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.purchaseOrders[existingIdx] = saved;
    } else {
      this.purchaseOrders = [saved, ...this.purchaseOrders];
    }

    await this.persist();
    this.notify();

    // Try backend persistence
    try {
      await ensureBackendToken();
      const body = {
        branchId: 1,
        supplierId: Number(saved.supplierId) || 1,
        poNumber: saved.poNumber,
        poDate: normalizeToIsoDate(saved.poDate),
        expectedDeliveryDate: normalizeToIsoDate(saved.expectedDeliveryDate || saved.poDate),
        status: saved.status || 'ORDERED',
        notes: saved.notes || '',
        items: saved.items.map(it => ({
          itemName: it.itemName,
          unit: it.unit || 'Kg',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 100,
          taxRate: Number(it.taxRate) || 5,
        })),
      };

      if (existingIdx >= 0 && typeof saved.id === 'number') {
        await apiClient.put(`/hotel/purchase-orders/${saved.id}`, body);
      } else {
        const res = await apiClient.post('/hotel/purchase-orders', body);
        if (res.data?.data?.id) {
          saved.id = res.data.data.id;
          if (res.data.data.poNumber) {
            saved.poNumber = res.data.data.poNumber;
          }
          if (existingIdx >= 0) {
            this.purchaseOrders[existingIdx] = saved;
          } else {
            this.purchaseOrders[0] = saved;
          }
          await this.persist();
          this.notify();
        }
      }
    } catch (e) {
      console.warn('Saved PO locally, backend sync warning:', e);
    }

    return saved;
  }

  public async deletePurchaseOrder(id: number | string): Promise<void> {
    this.purchaseOrders = this.purchaseOrders.filter(p => String(p.id) !== String(id));
    await this.persist();
    this.notify();
    try {
      await ensureBackendToken();
      await apiClient.delete(`/hotel/purchase-orders/${id}`);
    } catch {}
  }

  // Goods Receipt (GRN) Operations
  public async saveGoodsReceipt(grn: Partial<GoodsReceipt>): Promise<GoodsReceipt> {
    const id = grn.id || Date.now();
    const grnNumber = grn.grnNumber || `GRN-${Date.now().toString().slice(-6)}`;
    const saved: GoodsReceipt = {
      id,
      branchId: grn.branchId || 1,
      supplierId: grn.supplierId || 1,
      supplierName: grn.supplierName || 'Supplier',
      purchaseOrderId: grn.purchaseOrderId,
      poNumber: grn.poNumber,
      grnNumber,
      grnDate: grn.grnDate || new Date().toISOString().split('T')[0],
      receivedBy: grn.receivedBy || 'Store Manager',
      status: grn.status || 'RECEIVED',
      notes: grn.notes || '',
      items: grn.items || [],
      totalOrderedQty: (grn.items || []).reduce((s, it) => s + (it.orderedQty || 0), 0),
      totalReceivedQty: (grn.items || []).reduce((s, it) => s + (it.receivedQty || 0), 0),
      totalAcceptedQty: (grn.items || []).reduce((s, it) => s + (it.acceptedQty || 0), 0),
      totalRejectedQty: (grn.items || []).reduce((s, it) => s + (it.rejectedQty || 0), 0),
      createdAt: new Date().toISOString(),
    };

    const existingIdx = this.goodsReceipts.findIndex(g => String(g.id) === String(id) || g.grnNumber === grnNumber);
    if (existingIdx >= 0) {
      this.goodsReceipts[existingIdx] = saved;
    } else {
      this.goodsReceipts = [saved, ...this.goodsReceipts];
    }

    // Update PO status to RECEIVED or COMPLETED
    if (saved.purchaseOrderId || saved.poNumber) {
      const matchPo = this.purchaseOrders.find(
        p => (saved.purchaseOrderId && String(p.id) === String(saved.purchaseOrderId)) ||
             (saved.poNumber && p.poNumber === saved.poNumber)
      );
      if (matchPo) {
        matchPo.status = 'RECEIVED';
      }
    }

    await this.persist();
    this.notify();

    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/goods-receipts', {
        branchId: 1,
        supplierId: Number(saved.supplierId),
        purchaseOrderId: Number(saved.purchaseOrderId) || undefined,
        grnNumber: saved.grnNumber,
        grnDate: normalizeToIsoDate(saved.grnDate),
        receivedBy: saved.receivedBy,
        status: saved.status,
        notes: saved.notes,
        items: saved.items,
      });
      if (res.data?.data?.id) {
        saved.id = res.data.data.id;
        if (res.data.data.grnNumber) saved.grnNumber = res.data.data.grnNumber;
        await this.persist();
        this.notify();
      }
    } catch (e) {
      console.warn('Backend saveGoodsReceipt warning:', e);
    }

    return saved;
  }

  // Purchase Invoice Operations
  public async savePurchaseInvoice(inv: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
    const id = inv.id || Date.now();
    const invoiceNumber = inv.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const saved: PurchaseInvoice = {
      id,
      supplierId: inv.supplierId || 1,
      supplierName: inv.supplierName || 'Supplier',
      purchaseOrderId: inv.purchaseOrderId,
      poNumber: inv.poNumber,
      goodsReceiptId: inv.goodsReceiptId,
      grnNumber: inv.grnNumber,
      invoiceNumber,
      invoiceDate: inv.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: inv.dueDate || '',
      subtotal: inv.subtotal || 0,
      taxAmount: inv.taxAmount || 0,
      discountAmount: inv.discountAmount || 0,
      total: inv.total || 0,
      paidAmount: inv.paidAmount || 0,
      dueAmount: inv.dueAmount !== undefined ? inv.dueAmount : (inv.total || 0) - (inv.paidAmount || 0),
      paymentStatus: inv.paymentStatus || (inv.paidAmount && inv.paidAmount >= (inv.total || 0) ? 'PAID' : 'UNPAID'),
      status: inv.status || 'UNPAID',
      notes: inv.notes || '',
      paymentMethod: inv.paymentMethod || 'BANK_TRANSFER',
      items: inv.items || [],
      createdAt: new Date().toISOString(),
    };

    const existingIdx = this.purchaseInvoices.findIndex(i => String(i.id) === String(id) || i.invoiceNumber === invoiceNumber);
    if (existingIdx >= 0) {
      this.purchaseInvoices[existingIdx] = saved;
    } else {
      this.purchaseInvoices = [saved, ...this.purchaseInvoices];
    }

    await this.persist();
    this.notify();

    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/purchase-invoices', {
        supplierId: Number(saved.supplierId),
        purchaseOrderId: Number(saved.purchaseOrderId) || undefined,
        goodsReceiptId: Number(saved.goodsReceiptId) || undefined,
        invoiceNumber: saved.invoiceNumber,
        invoiceDate: normalizeToIsoDate(saved.invoiceDate),
        dueDate: saved.dueDate ? normalizeToIsoDate(saved.dueDate) : undefined,
        total: saved.total,
        subtotal: saved.subtotal,
        taxAmount: saved.taxAmount,
        discountAmount: saved.discountAmount,
        notes: saved.notes,
        paymentMethod: saved.paymentMethod,
        items: saved.items,
      });
      if (res.data?.data?.id) {
        saved.id = res.data.data.id;
        if (res.data.data.invoiceNumber) saved.invoiceNumber = res.data.data.invoiceNumber;
        await this.persist();
        this.notify();
      }
    } catch (e) {
      console.warn('Backend savePurchaseInvoice warning:', e);
    }

    return saved;
  }

  // Purchase Return Operations
  public async savePurchaseReturn(ret: Partial<PurchaseReturn>): Promise<PurchaseReturn> {
    const id = ret.id || Date.now();
    const returnNumber = ret.returnNumber || `RET-${Date.now().toString().slice(-6)}`;
    const saved: PurchaseReturn = {
      id,
      branchId: 1,
      supplierId: ret.supplierId || 1,
      supplierName: ret.supplierName || 'Supplier',
      purchaseInvoiceId: ret.purchaseInvoiceId,
      invoiceNumber: ret.invoiceNumber,
      purchaseOrderId: ret.purchaseOrderId,
      poNumber: ret.poNumber,
      returnNumber,
      returnDate: ret.returnDate || new Date().toISOString().split('T')[0],
      status: ret.status || 'RETURNED',
      totalAmount: ret.totalAmount || 0,
      taxAmount: ret.taxAmount || 0,
      reason: ret.reason || 'Defective / Excess',
      items: ret.items || [],
      createdAt: new Date().toISOString(),
    };

    this.purchaseReturns = [saved, ...this.purchaseReturns];
    await this.persist();
    this.notify();

    try {
      await ensureBackendToken();
      await apiClient.post('/hotel/purchase-returns', {
        branchId: 1,
        supplierId: Number(saved.supplierId),
        purchaseInvoiceId: Number(saved.purchaseInvoiceId) || undefined,
        returnNumber: saved.returnNumber,
        returnDate: normalizeToIsoDate(saved.returnDate),
        status: saved.status,
        totalAmount: saved.totalAmount,
        taxAmount: saved.taxAmount,
        reason: saved.reason,
        items: saved.items,
      });
    } catch {}

    return saved;
  }

  // Record Supplier Payment
  public async recordPayment(pay: Partial<SupplierPayment>): Promise<SupplierPayment> {
    const id = pay.id || Date.now();
    const saved: SupplierPayment = {
      id,
      supplierId: pay.supplierId || 1,
      supplierName: pay.supplierName || 'Supplier',
      purchaseInvoiceId: pay.purchaseInvoiceId,
      invoiceNumber: pay.invoiceNumber,
      poNumber: pay.poNumber,
      amount: Number(pay.amount) || 0,
      paymentMethod: pay.paymentMethod || 'BANK_TRANSFER',
      transactionReference: pay.transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      paymentDate: normalizeToIsoDate(pay.paymentDate || new Date().toISOString().split('T')[0]),
      status: 'SUCCESS',
      notes: pay.notes || '',
    };

    this.supplierPayments = [saved, ...this.supplierPayments];

    // Settle related invoice if any
    if (saved.purchaseInvoiceId || saved.invoiceNumber) {
      const matchInv = this.purchaseInvoices.find(
        i => (saved.purchaseInvoiceId && String(i.id) === String(saved.purchaseInvoiceId)) ||
             (saved.invoiceNumber && i.invoiceNumber === saved.invoiceNumber)
      );
      if (matchInv) {
        matchInv.paidAmount = (matchInv.paidAmount || 0) + saved.amount;
        matchInv.dueAmount = Math.max(0, (matchInv.total || 0) - matchInv.paidAmount);
        matchInv.paymentStatus = matchInv.dueAmount === 0 ? 'PAID' : 'PARTIAL';
        matchInv.status = matchInv.paymentStatus;
      }
    }

    // Settle related PO if any
    if (saved.poNumber) {
      const matchPo = this.purchaseOrders.find(p => p.poNumber === saved.poNumber);
      if (matchPo) {
        matchPo.status = 'COMPLETED';
      }
    }

    await this.persist();
    this.notify();

    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/supplier-payments', {
        supplierId: Number(saved.supplierId),
        purchaseInvoiceId: Number(saved.purchaseInvoiceId) || 1,
        amount: saved.amount,
        paymentMethod: saved.paymentMethod,
        transactionReference: saved.transactionReference,
        paymentDate: saved.paymentDate,
      });
      if (res.data?.data?.id) {
        saved.id = res.data.data.id;
        await this.persist();
        this.notify();
      }
    } catch (e) {
      console.warn('Backend recordPayment warning:', e);
    }

    return saved;
  }
}

export const purchaseStore = new PurchaseStore();
export default purchaseStore;
