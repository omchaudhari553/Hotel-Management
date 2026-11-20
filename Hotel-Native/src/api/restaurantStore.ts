import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ensureBackendToken } from './client';

export interface TableItem {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLING' | 'RESERVED' | 'CLEANING';
  guestName?: string;
  guestCount?: number;
  currentOrderId?: string;
  activeBillAmount?: number;
  activeItemsCount?: number;
  waiterName?: string;
  seatedAt?: string;
  note?: string;
  branchId?: number;
  branchName?: string;
  cleaningRemainingSeconds?: number;
}

export interface KOTOrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface KOTTicket {
  id: string;
  orderId: string;
  tableNumber: string;
  guestName: string;
  time: string;
  date: string;
  items: KOTOrderItem[];


  totalQty: number;
  kitchenStatus: 'New / Sent' | 'Preparing' | 'Ready' | 'Served';
  billingStatus: 'Not Billed' | 'Paid';
  invoiceNumber?: string;
  note?: string;
  branchId?: number;
  createdAtMs?: number;
}

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  tableNumber: string;
  items: KOTOrderItem[];


  itemsCount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: 'Active Orders' | 'BILL GENERATED' | 'PAID';
  paymentMode?: 'CASH' | 'UPI' | 'CARD';
  invoiceNumber?: string;
  branchId?: number;
  createdAtMs?: number;
}

export interface MenuItemData {
  id: string;
  name: string;
  category: 'Starters' | 'Main Course' | 'Breads' | 'Rice' | 'Dessert' | 'Beverages';
  price: number;
  taxRate: number;
}

export interface PaymentRecord {
  id: string;
  billId: string;
  orderId?: string;
  tableName: string;
  customerName?: string;
  amount: number;
  mode: 'UPI' | 'CASH' | 'CARD';
  time: string;
  date?: string;
  status: 'SETTLED' | 'PENDING';
  referenceNo?: string;
  itemsSummary?: string;
  branchId?: number;
}

export const INITIAL_MENU_ITEMS: MenuItemData[] = [
  { id: 'm1', name: 'Veg Spring Rolls', category: 'Starters', price: 180, taxRate: 5 },
  { id: 'm2', name: 'Paneer Tikka', category: 'Starters', price: 260, taxRate: 5 },
  { id: 'm3', name: 'Chicken Tikka', category: 'Starters', price: 320, taxRate: 5 },
  { id: 'm4', name: 'French Fries', category: 'Starters', price: 140, taxRate: 5 },
  { id: 'm5', name: 'Masala Papad', category: 'Starters', price: 60, taxRate: 5 },
  { id: 'm6', name: 'Paneer Butter Masala', category: 'Main Course', price: 290, taxRate: 5 },
  { id: 'm7', name: 'Butter Chicken', category: 'Main Course', price: 380, taxRate: 5 },
  { id: 'm8', name: 'Veg Kolhapuri', category: 'Main Course', price: 240, taxRate: 5 },
  { id: 'm9', name: 'Dal Tadka', category: 'Main Course', price: 190, taxRate: 5 },
  { id: 'm10', name: 'Butter Naan', category: 'Breads', price: 45, taxRate: 5 },
  { id: 'm11', name: 'Tandoori Roti', category: 'Breads', price: 25, taxRate: 5 },
  { id: 'm12', name: 'Butter Roti', category: 'Breads', price: 30, taxRate: 5 },
  { id: 'm13', name: 'Jeera Rice', category: 'Rice', price: 160, taxRate: 5 },
  { id: 'm14', name: 'Chicken Biryani Special', category: 'Rice', price: 340, taxRate: 5 },
  { id: 'm15', name: 'Gulab Jamun (2 pcs)', category: 'Dessert', price: 70, taxRate: 5 },
  { id: 'm16', name: 'Chocolate Sizzling Brownie', category: 'Dessert', price: 160, taxRate: 5 },
  { id: 'm17', name: 'Mineral Water (Packaged)', category: 'Beverages', price: 20, taxRate: 18 },
  { id: 'm18', name: 'Solkadhi / Chaas', category: 'Beverages', price: 40, taxRate: 5 },
  { id: 'm19', name: 'Test Burger', category: 'Starters', price: 150, taxRate: 5 },
];

export function deduplicateMenuItems(items: MenuItemData[]): MenuItemData[] {
  if (!Array.isArray(items)) return [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const unique: MenuItemData[] = [];

  for (const item of items) {
    if (!item || !item.name) continue;
    const cleanName = item.name.trim().toLowerCase();
    const cleanId = String(item.id || '').trim();

    if (seenNames.has(cleanName)) continue;
    if (cleanId && seenIds.has(cleanId)) continue;

    seenNames.add(cleanName);
    if (cleanId) seenIds.add(cleanId);
    unique.push({
      ...item,
      name: item.name.trim(),
    });
  }
  return unique;
}

let dynamicMenuItems: MenuItemData[] = deduplicateMenuItems(INITIAL_MENU_ITEMS);
(async () => {
  try {
    const saved = await AsyncStorage.getItem('@hotel_custom_menu_items');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        dynamicMenuItems = deduplicateMenuItems([...parsed, ...dynamicMenuItems]);
      }
    }
  } catch { }
})();



// Seeded Tables per branch (matching database records)
export const BRANCH_TABLES_INITIAL: { [branchId: number]: TableItem[] } = {
  // Branch 1: Main Branch (16 tables)
  1: [
    { id: '1', tableNumber: 'Table 01', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '2', tableNumber: 'Table 02', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '3', tableNumber: 'Table 03', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '4', tableNumber: 'Table 04', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '5', tableNumber: 'Table 05', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '6', tableNumber: 'Table 06', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '7', tableNumber: 'Table 07', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '8', tableNumber: 'Table 08', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '11', tableNumber: 'Table 09', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '12', tableNumber: 'TB-TBL-8881', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '14', tableNumber: 'Table 11', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '24', tableNumber: 'Table 12', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '29', tableNumber: 'Table 13', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '30', tableNumber: 'Table 14', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 1 },
    { id: '32', tableNumber: 'Table 15', section: 'Terrace', capacity: 6, status: 'AVAILABLE', branchId: 1 },
    { id: '33', tableNumber: 'Table 16', section: 'Private Dining', capacity: 8, status: 'AVAILABLE', branchId: 1 },
  ],
  // Branch 2: Nashik Branch (6 tables)
  2: [
    { id: '13', tableNumber: 'NSK-TBL-01', section: 'Rooftop', capacity: 4, status: 'AVAILABLE', branchId: 2 },
    { id: '16', tableNumber: 'Table 02', section: 'Terrace', capacity: 4, status: 'AVAILABLE', branchId: 2 },
    { id: '25', tableNumber: 'Table 03', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 2 },
    { id: '26', tableNumber: 'Table 04', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 2 },
    { id: '27', tableNumber: 'Table 05', section: 'Terrace', capacity: 4, status: 'AVAILABLE', branchId: 2 },
    { id: '28', tableNumber: 'Table 06', section: 'Private Dining', capacity: 6, status: 'AVAILABLE', branchId: 2 },
  ],
  // Branch 3: Karvenagar Branch (4 tables)
  3: [
    { id: '34', tableNumber: 'Table 01', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 3 },
    { id: '35', tableNumber: 'Table 02', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 3 },
    { id: '36', tableNumber: 'Table 03', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 3 },
    { id: '37', tableNumber: 'Table 04', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 3 },
  ],
  // Branch 4: Trimbakeshwar (0 tables)
  4: [],
  // Branch 5: Mumbai Branch (7 tables)
  5: [
    { id: '17', tableNumber: 'Table 01', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '18', tableNumber: 'Table 02', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '19', tableNumber: 'Table 03', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '20', tableNumber: 'Table 04', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '21', tableNumber: 'Table 05', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '22', tableNumber: 'Table 06', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
    { id: '23', tableNumber: 'Table 07', section: 'Main Dining', capacity: 4, status: 'AVAILABLE', branchId: 5 },
  ],
};

// Seeded KOTs for Branch 1
export const BRANCH_KOTS_INITIAL: { [branchId: number]: KOTTicket[] } = {
  1: [], 2: [], 3: [], 4: [], 5: []
};

// Seeded Orders for Branch 1
export const BRANCH_ORDERS_INITIAL: { [branchId: number]: ActiveOrder[] } = {
  1: [], 2: [], 3: [], 4: [], 5: []
};

// Seeded Payments
export const BRANCH_PAYMENTS_INITIAL: { [branchId: number]: PaymentRecord[] } = {
  1: [], 2: [], 3: [], 4: [], 5: []
};

// Active state in memory, partitioned by branchId
let currentBranchId: number = 1;
const branchTablesMap: { [bId: number]: TableItem[] } = { ...BRANCH_TABLES_INITIAL };
const branchOrdersMap: { [bId: number]: ActiveOrder[] } = { ...BRANCH_ORDERS_INITIAL };
const branchKotsMap: { [bId: number]: KOTTicket[] } = { ...BRANCH_KOTS_INITIAL };
const branchPaymentsMap: { [bId: number]: PaymentRecord[] } = { ...BRANCH_PAYMENTS_INITIAL };

// In-flight GET deduplication per branch (eliminates overlapping duplicate network traffic)
const inflightTablesReq: { [bId: number]: Promise<TableItem[]> | undefined } = {};
const inflightKotsReq: { [bId: number]: Promise<KOTTicket[]> | undefined } = {};
const inflightOrdersReq: { [bId: number]: Promise<ActiveOrder[]> | undefined } = {};
const inflightPaymentsReq: { [bId: number]: Promise<PaymentRecord[]> | undefined } = {};

// Optimistic mutation & temp-to-real ID reconciliation maps
const orderIdAliasMap: Record<string, string> = {};
const pendingOrderCreations = new Map<string, Promise<string | null>>();
const pendingOrderUpdates = new Map<string, Promise<void>>();
const optimisticTableGuard: Record<number, Record<string, { status: TableItem['status']; expiresAt: number }>> = {};
const optimisticPaidOrders: Record<number, Record<string, { order: ActiveOrder; expiresAt: number }>> = {};
const optimisticPendingKots: Record<number, Record<string, { kot: KOTTicket; expiresAt: number }>> = {};
const optimisticLocalOrders: Record<number, Record<string, ActiveOrder>> = {};
const localOrderTableOverrideMap: Record<string, string> = {};
const settledOrderIds: Record<number, Set<string>> = {};

const resolveOrderId = (id: string): string => orderIdAliasMap[id] || id;

const markOrderSettledInSession = (bId: number, ...ids: (string | undefined)[]) => {
  if (!settledOrderIds[bId]) settledOrderIds[bId] = new Set<string>();
  ids.forEach((raw) => {
    if (!raw) return;
    settledOrderIds[bId].add(raw);
    settledOrderIds[bId].add(resolveOrderId(raw));
  });
};

const isOrderSettledInSession = (bId: number, ...ids: (string | undefined)[]): boolean => {
  const set = settledOrderIds[bId];
  if (!set || set.size === 0) return false;
  return ids.some((raw) => !!raw && (set.has(raw) || set.has(resolveOrderId(raw))));
};

const normalizeOrderItemsList = (
  items: any,
  fallbackSubtotal?: number,
  fallbackTotal?: number,
  fallbackCount?: number
): KOTOrderItem[] => {
  const arr: KOTOrderItem[] = Array.isArray(items)
    ? items.map((it: any) => ({
        name: String(it?.name || it?.itemName || it?.description || 'Dish').trim(),
        quantity: Math.max(1, Number(it?.quantity ?? it?.qty ?? 1) || 1),
        price: Number(it?.price ?? it?.unitPrice ?? 0) || 0,
        ...(it?.notes ? { notes: String(it.notes) } : {}),
      }))
    : [];

  const targetTotal = Number(fallbackTotal) || 0;
  const targetSub = Number(fallbackSubtotal) > 0
    ? Number(fallbackSubtotal)
    : targetTotal > 0
      ? Math.round(targetTotal / 1.05)
      : 0;

  if (arr.length === 0) {
    const qty = Math.max(1, Number(fallbackCount) || 1);
    const unitPrice = targetSub > 0 ? Math.round(targetSub / qty) : 0;
    return [{ name: 'Order Dishes', quantity: qty, price: unitPrice }];
  }

  // Deduplicate and merge items with the same dish name
  const itemMap = new Map<string, KOTOrderItem>();
  for (const it of arr) {
    const cleanName = it.name.trim();
    const key = cleanName.toLowerCase();
    if (itemMap.has(key)) {
      const ex = itemMap.get(key)!;
      ex.quantity += it.quantity;
      if (ex.price <= 0 && it.price > 0) ex.price = it.price;
    } else {
      itemMap.set(key, { ...it, name: cleanName });
    }
  }
  const merged = Array.from(itemMap.values());

  const currentSub = merged.reduce((sum, it) => sum + it.price * it.quantity, 0);
  if (currentSub === 0 && targetSub > 0) {
    merged[0] = { ...merged[0], price: Math.round(targetSub / merged[0].quantity) };
  }
  return merged;
};

const normalizeTableKey = (tbl?: string): string =>
  (tbl || '').toLowerCase().replace(/^table\s*/i, '').replace(/^0+/, '').trim();

const parseCreatedMs = (rawDate?: any, fallbackStr?: string): number => {
  if (rawDate) {
    const parsed = new Date(rawDate).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (fallbackStr) {
    const m = String(fallbackStr).match(/(1\d{12})/);
    if (m) return Number(m[1]) || 0;
  }
  return 0;
};

const kotToActiveOrder = (kot: KOTTicket, bId: number, fallbackBillTotal?: number): ActiveOrder => {
  const ordIdStr = resolveOrderId(String(kot.orderId || kot.id));
  const rawItems = normalizeOrderItemsList(kot.items, undefined, fallbackBillTotal, kot.totalQty || 1);
  const subtotal = rawItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const taxAmount = Math.round(subtotal * 0.05);
  const cgst = Number((taxAmount / 2).toFixed(2));
  const sgst = Number((taxAmount / 2).toFixed(2));
  const total = subtotal + taxAmount;
  const orderNumStr =
    kot.orderId && !String(kot.orderId).startsWith('temp-')
      ? (String(kot.orderId).startsWith('#') ? String(kot.orderId) : `#ORD-${kot.orderId}`)
      : (kot.id.startsWith('#') ? kot.id : `#${kot.id}`);

  return {
    id: ordIdStr,
    orderNumber: orderNumStr,
    date: kot.time ? `Today, ${kot.time}` : kot.date || 'Today',
    customer: kot.guestName || 'Guest',
    tableNumber: kot.tableNumber || localOrderTableOverrideMap[ordIdStr] || 'Table 01',
    items: rawItems,
    itemsCount: rawItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || kot.totalQty || 1,
    subtotal,
    cgst,
    sgst,
    taxAmount,
    discountAmount: 0,
    total,
    status: kot.billingStatus === 'Paid' ? 'PAID' : 'Active Orders',
    branchId: bId,
    createdAtMs: kot.createdAtMs || parseCreatedMs(undefined, kot.id) || parseCreatedMs(undefined, kot.orderId) || Date.now(),
  };
};

// Synchronize unbilled KOTs directly into Billing orders so everything in KOT always shows in Billing
const mergeUnbilledKotsIntoOrders = (
  bId: number,
  ordersList: ActiveOrder[],
  kotsList: KOTTicket[]
): ActiveOrder[] => {
  const result = [...ordersList];
  const now = Date.now();
  const paidMap = optimisticPaidOrders[bId] || {};

  const paidOrderIds = new Set<string>();
  result.forEach((o) => {
    if (o.status === 'PAID') {
      paidOrderIds.add(o.id);
      paidOrderIds.add(resolveOrderId(o.id));
    }
  });
  Object.keys(paidMap).forEach((pid) => {
    const entry = paidMap[pid];
    if (entry && now < entry.expiresAt) {
      paidOrderIds.add(pid);
      paidOrderIds.add(resolveOrderId(pid));
    }
  });

  kotsList.forEach((kot) => {
    const kStatus = String((kot as any).kitchenStatus || '').toUpperCase();
    const rawStatus = String((kot as any).status || '').toUpperCase();
    if (kot.billingStatus === 'Paid' || kStatus === 'CANCELLED' || rawStatus === 'CANCELLED' || rawStatus === 'PAID' || rawStatus === 'SETTLED') {
      return;
    }

    const kotRawOrdId = String(kot.orderId || kot.id);
    const kotResolvedId = resolveOrderId(kotRawOrdId);
    if (
      paidOrderIds.has(kotRawOrdId) ||
      paidOrderIds.has(kotResolvedId) ||
      isOrderSettledInSession(bId, kotRawOrdId, kotResolvedId)
    ) {
      return;
    }

    const existingIdx = result.findIndex(
      (o) =>
        o.id === kotRawOrdId ||
        o.id === kotResolvedId ||
        resolveOrderId(o.id) === kotResolvedId
    );

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      const hasPlaceholderItems =
        !existing.items ||
        existing.items.length === 0 ||
        (existing.items.length === 1 && existing.items[0].name === 'Order Dishes' && existing.items[0].price === 0);
      if (hasPlaceholderItems && kot.items && kot.items.length > 0) {
        const syn = kotToActiveOrder(kot, bId);
        result[existingIdx] = {
          ...existing,
          items: syn.items,
          itemsCount: syn.itemsCount,
          subtotal: existing.subtotal || syn.subtotal,
          taxAmount: existing.taxAmount || syn.taxAmount,
          cgst: existing.cgst || syn.cgst,
          sgst: existing.sgst || syn.sgst,
          total: existing.total || syn.total,
        };
      }
      if (!existing.createdAtMs && kot.createdAtMs) {
        result[existingIdx] = { ...result[existingIdx], createdAtMs: kot.createdAtMs };
      }
      return;
    }

    result.unshift(kotToActiveOrder(kot, bId));
  });

  const uniqueResult: ActiveOrder[] = [];
  const seenIds = new Set<string>();
  for (const ord of result) {
    const normId = resolveOrderId(ord.id);
    if (!seenIds.has(normId)) {
      seenIds.add(normId);
      uniqueResult.push({ ...ord, id: normId });
    }
  }
  return uniqueResult;
};

const setTableGuard = (bId: number, tableNumber: string, status: TableItem['status'], ttlMs: number = 12000) => {
  if (!tableNumber) return;
  if (!optimisticTableGuard[bId]) optimisticTableGuard[bId] = {};
  optimisticTableGuard[bId][tableNumber.toLowerCase().trim()] = {
    status,
    expiresAt: Date.now() + ttlMs,
  };
};

const clearTableGuard = (bId: number, tableNumber: string) => {
  if (!tableNumber || !optimisticTableGuard[bId]) return;
  delete optimisticTableGuard[bId][tableNumber.toLowerCase().trim()];
};

// 5-minute cleaning countdown timestamps (ms)
const tableCleaningStartMap: Record<string, number> = {};

export const getTableCleaningRemainingSeconds = (bId: number, tableNumber: string): number => {
  if (!tableNumber) return 0;
  const key = `${bId}_${normalizeTableKey(tableNumber)}`;
  const startTime = tableCleaningStartMap[key];
  if (!startTime) return 0;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, 300 - elapsed);
};

export const setTableCleaningStart = (bId: number, tableNumber: string, ts: number = Date.now()) => {
  if (!tableNumber) return;
  const key = `${bId}_${normalizeTableKey(tableNumber)}`;
  tableCleaningStartMap[key] = ts;
};

export const clearTableCleaningStart = (bId: number, tableNumber: string) => {
  if (!tableNumber) return;
  const key = `${bId}_${normalizeTableKey(tableNumber)}`;
  delete tableCleaningStartMap[key];
};

const predictNextInvoiceNumber = (bId: number): string => {
  let highest = 1000;
  let prefix = 'INV';
  const inspectInv = (raw?: string) => {
    if (!raw) return;
    const cleaned = raw.replace(/^#/, '').trim();
    const m = cleaned.match(/^([A-Za-z]+)-(\d+)$/);
    if (m) {
      const n = parseInt(m[2], 10);
      if (!isNaN(n) && n < 1000000000 && n > highest) {
        highest = n;
        prefix = m[1];
      }
    }
  };
  (branchOrdersMap[bId] || []).forEach((o) => inspectInv(o.invoiceNumber || o.orderNumber));
  (branchPaymentsMap[bId] || []).forEach((p) => inspectInv(p.billId));
  return `${prefix}-${highest + 1}`;
};

// Helper to read and convert Vite LocalStorage data (pending_kots, mess_invoices, mess_payments)
const getViteLocalStorageData = (bId: number) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : typeof window !== 'undefined' ? (window as any) : null;
  if (!g || !g.localStorage || typeof g.localStorage.getItem !== 'function') {
    return { kots: [] as KOTTicket[], orders: [] as ActiveOrder[], payments: [] as PaymentRecord[] };
  }
  try {
    const rawKots = g.localStorage.getItem('pending_kots');
    const rawInvoices = g.localStorage.getItem('mess_invoices');
    const rawPayments = g.localStorage.getItem('mess_payments');

    const viteKots: KOTTicket[] = [];
    if (rawKots) {
      const parsed = JSON.parse(rawKots);
      if (Array.isArray(parsed)) {
        parsed.forEach((k: any) => {
          if (k.branchId && Number(k.branchId) !== bId) return;
          const rawItems: KOTOrderItem[] = (k.items || []).map((it: any) => ({
            name: it.itemName || it.name || 'Dish',
            quantity: Number(it.quantity || it.qty || 1),
            price: Number(it.unitPrice || it.price || 0),
          }));
          const totalQty = rawItems.reduce((acc, i) => acc + i.quantity, 0) || 1;
          const rawStatus = String(k.status || 'PENDING').toUpperCase();
          const kitchenStatus: KOTTicket['kitchenStatus'] =
            rawStatus === 'PREPARING'
              ? 'Preparing'
              : rawStatus === 'READY'
                ? 'Ready'
                : rawStatus === 'SERVED' || rawStatus === 'BILLED'
                  ? 'Served'
                  : 'New / Sent';

          const tableNum =
            (k.tableNumber && String(k.tableNumber).trim()) ||
            (k.tableId ? `Table ${String(k.tableId).padStart(2, '0')}` : 'Table 01');

          viteKots.push({
            id: k.kotNumber ? `#${k.kotNumber}` : `#KOT-${k.id}`,
            orderId: String(k.orderId || k.id),
            tableNumber: tableNum,
            guestName: k.customerName || k.guestName || 'Guest',
            time: k.createdAt ? new Date(k.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
            date: k.createdAt ? new Date(k.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
            items: rawItems.length > 0 ? rawItems : [{ name: 'Order Dishes', quantity: 1, price: 0 }],
            totalQty,
            kitchenStatus,
            billingStatus: rawStatus === 'BILLED' ? 'Paid' : 'Not Billed',
            note: `Table No: ${tableNum} - ${k.customerName || 'Guest'}`,
            branchId: bId,
          });
        });
      }
    }

    const viteOrders: ActiveOrder[] = [];
    if (rawInvoices) {
      const parsedInv = JSON.parse(rawInvoices);
      if (Array.isArray(parsedInv)) {
        parsedInv.forEach((inv: any) => {
          if (inv.branchId && Number(inv.branchId) !== bId) return;
          const rawItems: KOTOrderItem[] = (inv.items || []).map((it: any) => ({
            name: it.itemName || it.name || 'Dish',
            quantity: Number(it.quantity || 1),
            price: Number(it.price || it.unitPrice || 0),
          }));
          const sub = Number(inv.itemTotal || inv.subtotal || inv.taxableAmount || 0);
          const tax = Number(inv.taxAmount || inv.tax || 0);
          const tot = Number(inv.total || inv.grandTotal || sub + tax);
          const stat: ActiveOrder['status'] =
            inv.status === 'PAID' || inv.status === 'COMPLETED'
              ? 'PAID'
              : inv.status === 'UNPAID' || inv.status === 'PARTIAL'
                ? 'BILL GENERATED'
                : 'Active Orders';

          const tableNum =
            (inv.tableNumber && String(inv.tableNumber).trim()) ||
            (inv.tableId ? `Table ${String(inv.tableId).padStart(2, '0')}` : 'Table 01');

          viteOrders.push({
            id: String(inv.orderId || inv.id),
            orderNumber: inv.invoiceNumber || `#INV-${inv.id}`,
            date: inv.date || 'Today',
            customer: inv.customerName || 'Guest',
            tableNumber: tableNum,
            items: rawItems.length > 0 ? rawItems : [{ name: 'Ordered Item', quantity: 1, price: sub || tot }],
            itemsCount: rawItems.length || 1,
            subtotal: sub,
            cgst: Number(inv.cgst || tax / 2),
            sgst: Number(inv.sgst || tax / 2),
            taxAmount: tax,
            discountAmount: Number(inv.discountAmount || 0),
            total: tot,
            status: stat,
            paymentMode: 'UPI',
            invoiceNumber: inv.invoiceNumber,
            branchId: bId,
          });
        });
      }
    }

    const vitePayments: PaymentRecord[] = [];
    if (rawPayments) {
      const parsedPay = JSON.parse(rawPayments);
      if (Array.isArray(parsedPay)) {
        parsedPay.forEach((p: any) => {
          if (p.branchId && Number(p.branchId) !== bId) return;
          vitePayments.push({
            id: `vite-pay-${p.id}`,
            billId: p.invoiceNumber || `INV-${p.invoiceId || p.id}`,
            tableName: p.tableName || (p.tableId ? `Table ${p.tableId}` : 'Dining Table'),
            customerName: p.customerName || 'Guest',
            amount: Number(p.amount) || 0,
            mode: (p.paymentMethod === 'CARD' ? 'CARD' : p.paymentMethod === 'CASH' ? 'CASH' : 'UPI') as 'UPI' | 'CASH' | 'CARD',
            time: p.date || 'Today',
            date: p.date || 'Today',
            status: 'SETTLED',
            branchId: bId,
          });
        });
      }
    }

    return { kots: viteKots, orders: viteOrders, payments: vitePayments };
  } catch (_e) {
    return { kots: [] as KOTTicket[], orders: [] as ActiveOrder[], payments: [] as PaymentRecord[] };
  }
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Listener notification error:', e);
    }
  });
}

let hasLoadedBackendMenu = false;

export const restaurantStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setCurrentBranch(branchId: number) {
    const bId = Number(branchId) || 1;
    if (currentBranchId !== bId) {
      currentBranchId = bId;
      notifyListeners();
      triggerSilentSync(bId).catch(() => { });
    }
  },

  getCurrentBranch(): number {
    return currentBranchId;
  },

  // 1. GET TABLES STRICTLY FOR THE ACTIVE BRANCH (Deduplicated + Optimistic Safe)
  async getTables(branchId?: number): Promise<TableItem[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    if (inflightTablesReq[bId]) {
      return inflightTablesReq[bId]!;
    }

    const reqPromise = (async (): Promise<TableItem[]> => {
      try {
        await ensureBackendToken();
        const res = await apiClient.get('/hotel/tables', {
          params: { branchId: bId },
          timeout: 3500,
        });
        const rawList = res.data?.data || res.data || [];

        if (Array.isArray(rawList)) {
          const filteredList = rawList.filter((t: any) => !t.branchId || Number(t.branchId) === bId);
          const combinedOrders = this.getCachedOrders(bId);
          const prevTables = branchTablesMap[bId] || [];
          const now = Date.now();
          const guards = optimisticTableGuard[bId] || {};

          const parsedTables: TableItem[] = filteredList.map((t: any) => {
            const tableNumStr = t.name || `Table ${String(t.id).padStart(2, '0')}`;
            const tableKey = tableNumStr.toLowerCase().trim();
            const guard = guards[tableKey];
            const prevTable = prevTables.find((pt) => pt.tableNumber.toLowerCase().trim() === tableKey);

            // Match active order in this branch (exclude orders just paid locally or from past days)
            const paidMap = optimisticPaidOrders[bId] || {};
            const nowD = new Date();
            const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
            const activeOrd = combinedOrders.find((o) => {
              const paidEntry = paidMap[o.id] || paidMap[resolveOrderId(o.id)];
              if (paidEntry && now < paidEntry.expiresAt) return false;
              if (o.status === 'PAID') return false;

              return (
                o.tableNumber.toLowerCase().trim() === tableKey ||
                (normalizeTableKey(o.tableNumber) !== '' &&
                  normalizeTableKey(o.tableNumber) === normalizeTableKey(tableNumStr)) ||
                (t.id && (o as any).tableId && String((o as any).tableId) === String(t.id)) ||
                (t.currentOrderId && String(o.id) === String(t.currentOrderId))
              );
            });

            const backendOrderId = t.orderId ? String(t.orderId) : undefined;
            const backendOrderWasPaid =
              Boolean(backendOrderId && paidMap[backendOrderId] && now < paidMap[backendOrderId].expiresAt);

            const hasActiveUnbilledOrder = Boolean(activeOrd && activeOrd.status !== 'PAID');
            const isBackendOccupied = t.status === 'OCCUPIED' || t.status === 'BILLING' || t.status === 'BILL_REQUESTED';
            const isBill =
              !backendOrderWasPaid &&
              (t.status === 'BILLING' || t.status === 'BILL_REQUESTED' || (hasActiveUnbilledOrder && activeOrd?.status === 'BILL GENERATED'));
            const isOcc =
              !backendOrderWasPaid &&
              (isBill || isBackendOccupied || (hasActiveUnbilledOrder && activeOrd !== undefined));

            const parsedStatus: TableItem['status'] = (
              isBill
                ? 'BILLING'
                : isOcc
                  ? 'OCCUPIED'
                  : t.status === 'RESERVED'
                    ? 'RESERVED'
                    : t.status === 'CLEANING'
                      ? 'CLEANING'
                      : 'AVAILABLE'
            ) as TableItem['status'];

            const startKey = `${bId}_${normalizeTableKey(tableNumStr)}`;
            const cleaningStart = tableCleaningStartMap[startKey];
            const hasActiveCleaningSession = !!(cleaningStart && (now - cleaningStart) < 300000);

            let finalStatus: TableItem['status'];
            let remCleaningSeconds: number | undefined = undefined;

            if (hasActiveCleaningSession) {
              finalStatus = 'CLEANING';
              remCleaningSeconds = Math.max(0, 300 - Math.floor((now - cleaningStart) / 1000));
            } else {
              // Ensure stale cleaning records in memory or guard are cleared
              if (cleaningStart) {
                delete tableCleaningStartMap[startKey];
              }
              if (guard && guard.status === 'CLEANING') {
                delete guards[tableKey];
              }

              if (guard && now < guard.expiresAt) {
                if (guard.status === 'AVAILABLE') {
                  finalStatus = 'AVAILABLE';
                } else if ((guard.status === 'OCCUPIED' || guard.status === 'BILLING') && prevTable) {
                  finalStatus = guard.status;
                } else {
                  finalStatus = parsedStatus === 'CLEANING' ? 'AVAILABLE' : parsedStatus;
                }
              } else {
                // If backend returned CLEANING but no active session from bill:
                // Strictly AVAILABLE! (As user requested: "jo paryant bill generate honar nhi to paryant cleaning nhi")
                if (parsedStatus === 'CLEANING') {
                  finalStatus = 'AVAILABLE';
                  const num = Number(String(t.id).replace(/\D/g, ''));
                  if (!isNaN(num) && num > 0) {
                    apiClient.patch(`/hotel/tables/${num}/status`, { status: 'AVAILABLE' }).catch(() => {});
                  }
                } else {
                  finalStatus = parsedStatus;
                }
              }
            }

            return {
              id: String(t.id),
              tableNumber: tableNumStr,
              section: t.area || 'Main Dining',
              capacity: Number(t.capacity) || 4,
              status: finalStatus,
              cleaningRemainingSeconds: remCleaningSeconds,
              guestName: (isOcc && (t.guest || activeOrd?.customer)) || undefined,
              guestCount: Number(t.guestCount) || (isOcc ? 2 : undefined),
              currentOrderId: isOcc ? (backendOrderId ? resolveOrderId(backendOrderId) : activeOrd?.id || undefined) : undefined,
              activeBillAmount: hasActiveUnbilledOrder && activeOrd ? Number(activeOrd.total) || undefined : undefined,
              activeItemsCount: isOcc && activeOrd?.itemsCount ? activeOrd.itemsCount : (isOcc ? 2 : undefined),
              seatedAt: isOcc ? 'Active' : undefined,
              note: t.note || undefined,
              branchId: bId,
              branchName: t.branchName || undefined,
            };
          });

          branchTablesMap[bId] = parsedTables;
          AsyncStorage.setItem(`@RESTAURANT_TABLES_B${bId}`, JSON.stringify(parsedTables)).catch(() => { });
          return [...parsedTables];
        }
      } catch (err) {
        // Silent fallback to local branch cache
      }

      // Fallback: check cached AsyncStorage or branch initial seed
      if (!branchTablesMap[bId] || branchTablesMap[bId].length === 0) {
        try {
          const cached = await AsyncStorage.getItem(`@RESTAURANT_TABLES_B${bId}`);
          if (cached) {
            branchTablesMap[bId] = JSON.parse(cached);
          } else {
            branchTablesMap[bId] = BRANCH_TABLES_INITIAL[bId] || [];
          }
        } catch {
          branchTablesMap[bId] = BRANCH_TABLES_INITIAL[bId] || [];
        }
      }

      return [...(branchTablesMap[bId] || [])];
    })().finally(() => {
      inflightTablesReq[bId] = undefined;
    });

    inflightTablesReq[bId] = reqPromise;
    return reqPromise;
  },

  // Instant Synchronous Cache Getters (0ms UI latency)
  getCachedTables(branchId?: number): TableItem[] {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    return [...(branchTablesMap[bId] || BRANCH_TABLES_INITIAL[bId] || [])];
  },

  getCachedOrders(branchId?: number): ActiveOrder[] {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const base = branchOrdersMap[bId] || BRANCH_ORDERS_INITIAL[bId] || [];
    const { orders: viteOrders, kots: viteKots } = getViteLocalStorageData(bId);
    const localUnsynced = Object.values(optimisticLocalOrders[bId] || {});
    const map = new Map<string, ActiveOrder>();

    base.forEach((o) => map.set(resolveOrderId(o.id), { ...o, id: resolveOrderId(o.id) }));
    localUnsynced.forEach((lo) => {
      const rId = resolveOrderId(lo.id);
      if (!map.has(rId)) {
        map.set(rId, { ...lo, id: rId });
      }
    });
    viteOrders.forEach((vo) => map.set(vo.id, vo));

    const kotsForBranch = [
      ...(branchKotsMap[bId] || []),
      ...Object.values(optimisticPendingKots[bId] || {}).map((e) => e.kot),
      ...viteKots,
    ];
    return mergeUnbilledKotsIntoOrders(bId, Array.from(map.values()), kotsForBranch);
  },

  getCachedKOTs(branchId?: number): KOTTicket[] {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const base = branchKotsMap[bId] || BRANCH_KOTS_INITIAL[bId] || [];
    const { kots: viteKots } = getViteLocalStorageData(bId);
    if (viteKots.length === 0) return [...base];
    const map = new Map<string, KOTTicket>();
    base.forEach((k) => map.set(k.id, k));
    viteKots.forEach((vk) => map.set(vk.id, vk));
    return Array.from(map.values());
  },

  getCachedPayments(branchId?: number): PaymentRecord[] {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const base = branchPaymentsMap[bId] || BRANCH_PAYMENTS_INITIAL[bId] || [];
    const { payments: vitePayments } = getViteLocalStorageData(bId);
    if (vitePayments.length === 0) return [...base];
    const map = new Map<string, PaymentRecord>();
    base.forEach((p) => map.set(p.billId, p));
    vitePayments.forEach((vp) => map.set(vp.billId, vp));
    return Array.from(map.values());
  },

  // 2. GET KOTs STRICTLY FOR THE ACTIVE BRANCH (Deduplicated + Fast 3s timeout)
  async getKOTs(branchId?: number): Promise<KOTTicket[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    if (inflightKotsReq[bId]) {
      return inflightKotsReq[bId]!;
    }

    const reqPromise = (async (): Promise<KOTTicket[]> => {
      try {
        await ensureBackendToken();
        const res = await apiClient.get('/hotel/kot', {
          params: { branchId: bId },
          timeout: 3000,
        });
        const rawList = res.data?.data || res.data || [];

        if (Array.isArray(rawList)) {
          const paidMap = optimisticPaidOrders[bId] || {};
          const now = Date.now();

          const backendKots: KOTTicket[] = rawList
            .filter((kot: any) => !kot.branchId || Number(kot.branchId) === bId)
            .map((kot: any) => {
              const rawItems: KOTOrderItem[] = (kot.items || []).map((it: any) => ({
                name: it.itemName || it.name || it.description || 'Dish',
                quantity: Number(it.quantity || it.qty || 1),
                price: Number(it.unitPrice || it.price || 0),
              }));
              const totalQty = rawItems.reduce((acc, i) => acc + i.quantity, 0);
              const rawStatus = String(kot.status || 'SENT_TO_KITCHEN').toUpperCase();
              const kitchenStatus: KOTTicket['kitchenStatus'] =
                rawStatus === 'PREPARING'
                  ? 'Preparing'
                  : rawStatus === 'READY'
                    ? 'Ready'
                    : rawStatus === 'SERVED' || rawStatus === 'COMPLETED' || rawStatus === 'BILLED'
                      ? 'Served'
                      : 'New / Sent';

              const ordIdStr = resolveOrderId(String(kot.orderId || kot.id));
              const isLocallyPaid = paidMap[ordIdStr] && now < paidMap[ordIdStr].expiresAt;

              const billingStatus: KOTTicket['billingStatus'] =
                isLocallyPaid ||
                rawStatus === 'BILLED' ||
                rawStatus === 'COMPLETED' ||
                kot.orderStatus === 'COMPLETED'
                  ? 'Paid'
                  : 'Not Billed';

              const timeStr = kot.createdAt
                ? new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Today';
              const dateStr = kot.createdAt
                ? new Date(kot.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Today';

              const tableNum =
                (kot.tableNumber && kot.tableNumber.trim()) ||
                (kot.tableName && kot.tableName.trim()) ||
                (kot.tableId ? `Table ${kot.tableId}` : 'Table 01');

              return {
                id: kot.kotNumber ? `#${kot.kotNumber}` : `#KOT-${kot.id}`,
                orderId: ordIdStr,
                tableNumber: tableNum,
                guestName: kot.guestName || kot.customerName || 'Guest',
                time: timeStr,
                date: dateStr,
                items: rawItems.length > 0 ? rawItems : [{ name: 'Order Dishes', quantity: 1, price: Number(kot.totalAmount) || 0 }],
                totalQty: totalQty || 1,
                kitchenStatus,
                billingStatus,
                note: kot.instructions || `Table No: ${tableNum} - ${kot.guestName || 'Guest'}`,
                branchId: bId,
                createdAtMs: parseCreatedMs(kot.createdAt, kot.kotNumber || String(kot.id)) || undefined,
              };
            });

          const { kots: viteKots } = getViteLocalStorageData(bId);
          const map = new Map<string, KOTTicket>();

          // Preserve pending optimistic KOTs not yet returned from backend
          const pendingMap = optimisticPendingKots[bId] || {};
          Object.keys(pendingMap).forEach((kId) => {
            const entry = pendingMap[kId];
            if (entry && now < entry.expiresAt) {
              const resolvedOrdId = resolveOrderId(entry.kot.orderId);
              const alreadyOnBackend = backendKots.some((bk) => bk.orderId === resolvedOrdId || bk.id === entry.kot.id);
              if (alreadyOnBackend) {
                delete pendingMap[kId];
              } else {
                map.set(entry.kot.id, { ...entry.kot, orderId: resolvedOrdId });
              }
            } else {
              delete pendingMap[kId];
            }
          });

          backendKots.forEach((k) => map.set(k.id, k));
          viteKots.forEach((vk) => map.set(vk.id, vk));
          const combined = Array.from(map.values());
          branchKotsMap[bId] = combined;
          return [...combined];
        }
      } catch (err) {
        // Silent fallback to local branch cache
      }

      if (!branchKotsMap[bId]) {
        branchKotsMap[bId] = BRANCH_KOTS_INITIAL[bId] || [];
      }
      return [...(branchKotsMap[bId] || [])];
    })().finally(() => {
      inflightKotsReq[bId] = undefined;
    });

    inflightKotsReq[bId] = reqPromise;
    return reqPromise;
  },

  // 3. GET ACTIVE ORDERS STRICTLY FOR THE ACTIVE BRANCH (Fast Deduplicated Parallel Fetch)
  async getOrders(branchId?: number): Promise<ActiveOrder[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    if (inflightOrdersReq[bId]) {
      return inflightOrdersReq[bId]!;
    }

    const reqPromise = (async (): Promise<ActiveOrder[]> => {
      try {
        try {
          await ensureBackendToken();
        } catch { }

        // Parallelize orders, invoices, and KOTs fetch with snappy 3.5s timeout
        const [ordersRes, invRes, liveKotsRes] = await Promise.allSettled([
          apiClient.get('/hotel/orders', { params: { branchId: bId }, timeout: 3500 }),
          apiClient.get('/hotel/invoices', { params: { branchId: bId }, timeout: 3500 }),
          restaurantStore.getKOTs(bId),
        ]);

        let activeHotelOrders: ActiveOrder[] = [];
        if (ordersRes.status === 'fulfilled') {
          const rawOrders = ordersRes.value.data?.data || ordersRes.value.data || [];
          if (Array.isArray(rawOrders)) {
            activeHotelOrders = rawOrders
              .filter((ord: any) => !ord.branchId || Number(ord.branchId) === bId)
              .map((ord: any) => {
                const itemMap = new Map<string, KOTOrderItem>();
                for (const it of (ord.items || [])) {
                  const name = String(it.itemName || it.name || 'Dish').trim();
                  const qty = Number(it.quantity || it.qty || 1);
                  const price = Number(it.unitPrice || it.price || 0);
                  const key = name.toLowerCase();
                  if (itemMap.has(key)) {
                    const ex = itemMap.get(key)!;
                    ex.quantity += qty;
                    if (ex.price <= 0 && price > 0) ex.price = price;
                  } else {
                    itemMap.set(key, { name, quantity: qty, price });
                  }
                }
                const rawItems: KOTOrderItem[] = Array.from(itemMap.values());
                const sub = rawItems.reduce((acc, i) => acc + i.price * i.quantity, 0) || Number(ord.totalAmount) || 0;
                const tax = Math.round(sub * 0.05);
                const tot = Number(ord.totalAmount) || sub + tax;
                const isBillReq = ord.status === 'BILL_REQUESTED';
                const isCompleted = ord.status === 'PAID' || ord.status === 'COMPLETED' || ord.status === 'SETTLED';
                const ordIdStr = String(ord.id);

                const tableNum =
                  (ord.tableNumber && ord.tableNumber.trim()) ||
                  (ord.tableName && ord.tableName.trim()) ||
                  localOrderTableOverrideMap[ordIdStr] ||
                  (ord.tableId ? `Table ${String(ord.tableId).padStart(2, '0')}` : 'Table 01');

                return {
                  id: ordIdStr,
                  orderNumber: ord.orderNumber || `#ORD-${ord.id}`,
                  date: ord.createdAt
                    ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Today',
                  customer: ord.guestName || 'Guest',
                  tableNumber: tableNum,
                  items: rawItems.length > 0 ? rawItems : [{ name: 'Order Dishes', quantity: 1, price: sub }],
                  itemsCount: rawItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || rawItems.length || 1,
                  subtotal: sub,
                  cgst: Math.round(tax / 2),
                  sgst: Math.round(tax / 2),
                  taxAmount: tax,
                  discountAmount: Number(ord.discount) || 0,
                  total: tot,
                  status: (isCompleted ? 'PAID' : isBillReq ? 'BILL GENERATED' : 'Active Orders') as ActiveOrder['status'],
                  branchId: bId,
                  createdAtMs: parseCreatedMs(ord.createdAt, ord.orderNumber || ordIdStr) || (Number(ord.id) > 0 ? Number(ord.id) : 0),
                };
              });
          }
        }

        let invoiceOrders: ActiveOrder[] = [];
        if (invRes.status === 'fulfilled') {
          const rawInvoices = invRes.value.data?.data || invRes.value.data || [];
          if (Array.isArray(rawInvoices)) {
            invoiceOrders = rawInvoices
              .filter((inv: any) => !inv.branchId || Number(inv.branchId) === bId)
              .map((inv: any) => {
                const invItemMap = new Map<string, KOTOrderItem>();
                for (const it of (inv.items || [])) {
                  const name = String(it.itemName || it.description || it.name || 'Dish').trim();
                  const qty = Number(it.quantity || it.qty || 1);
                  const price = Number(it.unitPrice || it.price || 0);
                  const key = name.toLowerCase();
                  if (invItemMap.has(key)) {
                    const ex = invItemMap.get(key)!;
                    ex.quantity += qty;
                    if (ex.price <= 0 && price > 0) ex.price = price;
                  } else {
                    invItemMap.set(key, { name, quantity: qty, price });
                  }
                }
                const rawItems: KOTOrderItem[] = Array.from(invItemMap.values());
                const sub = Number(inv.subtotal || inv.taxableAmount || 0);
                const tax = Number(inv.taxAmount || (inv.cgst || 0) + (inv.sgst || 0));
                const tot = Number(inv.grandTotal || inv.total || sub + tax);
                const stat: ActiveOrder['status'] =
                  inv.status === 'PAID' || inv.status === 'COMPLETED'
                    ? 'PAID'
                    : inv.status === 'UNPAID' || inv.status === 'PARTIAL'
                      ? 'BILL GENERATED'
                      : 'Active Orders';
                // Avoid colliding standalone invoice PKs (inv.id) with active HotelOrder PKs
                const linkedOrderId = inv.orderId ? resolveOrderId(String(inv.orderId)) : `inv-${inv.id}`;

                return {
                  id: linkedOrderId,
                  orderNumber: inv.invoiceNumber || inv.orderNumber || `#INV-${inv.id}`,
                  date: inv.invoiceDate || (inv.createdAt ? String(inv.createdAt).split('T')[0] : 'Today'),
                  customer: (inv.customerName && inv.customerName.trim()) || (inv.guestName && inv.guestName.trim()) || 'Guest',
                  tableNumber: (inv.tableNumber && inv.tableNumber.trim()) || localOrderTableOverrideMap[linkedOrderId] || (inv.tableId ? `Table ${String(inv.tableId).padStart(2, '0')}` : 'Table 01'),
                  items: rawItems.length > 0 ? rawItems : [{ name: 'Ordered Item', quantity: 1, price: sub || tot }],
                  itemsCount: rawItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || rawItems.length || 1,
                  subtotal: sub,
                  cgst: Number(inv.cgst || tax / 2),
                  sgst: Number(inv.sgst || tax / 2),
                  taxAmount: tax,
                  discountAmount: Number(inv.discountAmount || 0),
                  total: tot,
                  status: stat,
                  paymentMode: inv.paymentMethod || 'UPI',
                  invoiceNumber: inv.invoiceNumber,
                  branchId: bId,
                  createdAtMs: parseCreatedMs(inv.createdAt || inv.invoiceDate, inv.invoiceNumber) || undefined,
                };
              });
          }
        }

        const combined = [...activeHotelOrders];
        for (const invOrd of invoiceOrders) {
          const isStandaloneInv = invOrd.id.startsWith('inv-');
          const existingIdx = combined.findIndex(
            (o) =>
              (!isStandaloneInv && o.id === invOrd.id) ||
              (invOrd.invoiceNumber && o.invoiceNumber === invOrd.invoiceNumber)
          );
          if (existingIdx >= 0) {
            if (invOrd.status === 'PAID') {
              combined[existingIdx] = invOrd;
            }
          } else {
            combined.push(invOrd);
          }
        }

        const { orders: viteOrders, kots: viteKots } = getViteLocalStorageData(bId);
        for (const vo of viteOrders) {
          const existingIdx = combined.findIndex((o) => o.id === vo.id || (vo.invoiceNumber && o.invoiceNumber === vo.invoiceNumber));
          if (existingIdx >= 0) {
            if (vo.status === 'PAID') {
              combined[existingIdx] = vo;
            }
          } else {
            combined.push(vo);
          }
        }

        // Preserve pending/unsynced local optimistic orders so newly placed table orders NEVER vanish from Billing
        const now = Date.now();
        const prevLocal = branchOrdersMap[bId] || [];
        const optLocalMap = optimisticLocalOrders[bId] || {};
        prevLocal.forEach((lo) => {
          const resolvedId = resolveOrderId(lo.id);
          const isPending = pendingOrderCreations.has(lo.id) || pendingOrderCreations.has(resolvedId);
          if (isPending && !combined.some((c) => c.id === lo.id || c.id === resolvedId)) {
            combined.unshift(lo);
          }
        });
        Object.entries(optLocalMap).forEach(([optKey, lo]) => {
          const resolvedId = resolveOrderId(lo.id);
          const matched = combined.find((c) => c.id === lo.id || c.id === resolvedId);
          if (matched) {
            if (!String(resolvedId).startsWith('temp-')) {
              delete optLocalMap[optKey];
            }
          } else if (lo.status !== 'PAID') {
            combined.unshift({ ...lo, id: resolvedId });
          }
        });

        // Merge any unbilled KOTs directly into Billing orders so KOT & Billing stay 100% in sync
        const liveKots: KOTTicket[] =
          liveKotsRes.status === 'fulfilled' && Array.isArray(liveKotsRes.value)
            ? liveKotsRes.value
            : [...(branchKotsMap[bId] || []), ...viteKots];
        const syncedOrders = mergeUnbilledKotsIntoOrders(bId, combined, liveKots);

        const paidMap = optimisticPaidOrders[bId] || {};
        Object.keys(paidMap).forEach((pid) => {
          const entry = paidMap[pid];
          if (!entry || now >= entry.expiresAt) {
            delete paidMap[pid];
            return;
          }
          const resolvedPid = resolveOrderId(pid);
          const idx = syncedOrders.findIndex((o) => o.id === pid || o.id === resolvedPid);
          if (idx >= 0) {
            if (syncedOrders[idx].status !== 'PAID') {
              syncedOrders[idx] = { ...entry.order, id: syncedOrders[idx].id };
            } else {
              delete paidMap[pid];
            }
          } else {
            syncedOrders.unshift(entry.order);
          }
        });

        // Guarantee orders settled in-session remain PAID even after optimistic TTL or offline sync
        for (let i = 0; i < syncedOrders.length; i++) {
          const o = syncedOrders[i];
          if (o.status !== 'PAID' && isOrderSettledInSession(bId, o.id, o.invoiceNumber)) {
            syncedOrders[i] = { ...o, status: 'PAID' };
          }
        }

        const deduplicatedSyncedOrders: ActiveOrder[] = [];
        const seenSynced = new Set<string>();
        for (const o of syncedOrders) {
          const rId = resolveOrderId(o.id);
          if (!seenSynced.has(rId)) {
            seenSynced.add(rId);
            deduplicatedSyncedOrders.push({ ...o, id: rId });
          }
        }

        branchOrdersMap[bId] = deduplicatedSyncedOrders;
        return [...deduplicatedSyncedOrders];
      } catch (err) {
        // Silent fallback to local branch cache
      }

      if (!branchOrdersMap[bId]) {
        branchOrdersMap[bId] = BRANCH_ORDERS_INITIAL[bId] || [];
      }
      return this.getCachedOrders(bId);
    })().finally(() => {
      inflightOrdersReq[bId] = undefined;
    });

    inflightOrdersReq[bId] = reqPromise;
    return reqPromise;
  },

  getMenuItems(): MenuItemData[] {
    if (!hasLoadedBackendMenu) {
      hasLoadedBackendMenu = true;
      restaurantStore.loadMenuItemsFromBackend().catch(() => { });
    }
    return deduplicateMenuItems(dynamicMenuItems);
  },

  async loadMenuItemsFromBackend(): Promise<MenuItemData[]> {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/menu-items');
      const itemsList = res.data?.data || res.data;
      if (Array.isArray(itemsList) && itemsList.length > 0) {
        const backendItems: MenuItemData[] = itemsList.map((m: any) => {
          const c = String(m.category || '').toLowerCase().trim();
          let cat: MenuItemData['category'] = 'Main Course';
          if (c.includes('starter')) cat = 'Starters';
          else if (c.includes('bread') || c.includes('roti') || c.includes('naan')) cat = 'Breads';
          else if (c.includes('rice') || c.includes('biryani')) cat = 'Rice';
          else if (c.includes('dessert') || c.includes('sweet') || c.includes('ice')) cat = 'Dessert';
          else if (c.includes('beverage') || c.includes('drink') || c.includes('tea') || c.includes('coffee')) cat = 'Beverages';

          return {
            id: `backend-${m.id}`,
            name: String(m.name || '').trim(),
            category: cat,
            price: Number(m.price) || 100,
            taxRate: 5,
          };
        });
        const cleanBackend = deduplicateMenuItems(backendItems);
        const existingNames = new Set(cleanBackend.map(b => b.name.toLowerCase()));
        const unseeded = dynamicMenuItems.filter(i => !existingNames.has(i.name.trim().toLowerCase()));
        dynamicMenuItems = deduplicateMenuItems([...cleanBackend, ...unseeded]);
        notifyListeners();
      } else if (Array.isArray(itemsList) && itemsList.length === 0) {
        // Backend DB has 0 menu items; seed INITIAL_MENU_ITEMS into database in background
        (async () => {
          try {
            await ensureBackendToken();
            for (const item of INITIAL_MENU_ITEMS) {
              await apiClient.post('/hotel/menu-items', {
                name: item.name,
                category: item.category,
                price: item.price,
                description: item.name,
                active: true,
              }).catch(() => { });
            }
          } catch { }
        })();
      }
    } catch { }
    return deduplicateMenuItems(dynamicMenuItems);
  },

  async addMenuItem(item: { name: string; category?: string; price: number; description?: string }): Promise<MenuItemData> {
    const newId = `m-${Date.now()}`;
    const c = String(item.category || '').toLowerCase().trim();
    let cat: MenuItemData['category'] = 'Main Course';
    if (c.includes('starter')) cat = 'Starters';
    else if (c.includes('bread') || c.includes('roti') || c.includes('naan')) cat = 'Breads';
    else if (c.includes('rice') || c.includes('biryani')) cat = 'Rice';
    else if (c.includes('dessert') || c.includes('sweet') || c.includes('ice')) cat = 'Dessert';
    else if (c.includes('beverage') || c.includes('drink') || c.includes('tea') || c.includes('coffee')) cat = 'Beverages';

    let newItem: MenuItemData = {
      id: newId,
      name: item.name.trim(),
      category: cat,
      price: Number(item.price) || 0,
      taxRate: 5,
    };

    // Save directly to backend database first
    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/menu-items', {
        name: newItem.name,
        category: newItem.category,
        price: newItem.price,
        description: item.description || '',
        active: true,
      });
      if (res.data?.data?.id) {
        newItem.id = `backend-${res.data.data.id}`;
      }
    } catch (e) {
      console.warn('Backend addMenuItem sync failed, saved locally:', e);
    }

    dynamicMenuItems = deduplicateMenuItems([newItem, ...dynamicMenuItems]);
    notifyListeners();

    try {
      const saved = await AsyncStorage.getItem('@hotel_custom_menu_items');
      const list = saved ? JSON.parse(saved) : [];
      const cleanList = deduplicateMenuItems([newItem, ...list]);
      await AsyncStorage.setItem('@hotel_custom_menu_items', JSON.stringify(cleanList));
    } catch { }

    return newItem;
  },

  resolveOrderId(orderId: string): string {
    return resolveOrderId(orderId);
  },

  // 4. START A NEW ORDER (0ms optimistic return + background DB sync & ID reconciliation)
  async startOrder(
    tableNumber: string,
    customerName: string,
    items: KOTOrderItem[],
    guestCount: number = 2,
    branchId?: number
  ): Promise<{ order: ActiveOrder; kot: KOTTicket }> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    // Deduplicate and merge items by dish name
    const startItemsMap = new Map<string, KOTOrderItem>();
    for (const it of (items || [])) {
      const cleanName = String(it.name || '').trim();
      const key = cleanName.toLowerCase();
      if (startItemsMap.has(key)) {
        const ex = startItemsMap.get(key)!;
        ex.quantity += Number(it.quantity || 1);
        if (ex.price <= 0 && Number(it.price) > 0) ex.price = Number(it.price);
      } else {
        startItemsMap.set(key, { ...it, name: cleanName, quantity: Number(it.quantity || 1), price: Number(it.price || 0) });
      }
    }
    const cleanItems = Array.from(startItemsMap.values());

    const rawSubtotal = cleanItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const tax = Math.round(rawSubtotal * 0.05);
    const total = rawSubtotal + tax;

    const currentBranchTables = branchTablesMap[bId] || [];
    const tableObj = currentBranchTables.find(
      (t) =>
        t.tableNumber.toLowerCase().trim() === tableNumber.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' &&
          normalizeTableKey(t.tableNumber) === normalizeTableKey(tableNumber))
    );
    let backendTableId: number | null = null;
    if (tableObj && tableObj.id && !String(tableObj.id).startsWith('tbl-')) {
      const num = Number(tableObj.id.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0) backendTableId = num;
    }

    const nowTs = Date.now();
    const randSuffix = Math.floor(Math.random() * 1000);
    const tempOrderId = `temp-ord-${nowTs}-${randSuffix}`;
    const tempOrderNumber = `#ORD-${String(nowTs).slice(-6)}`;
    const tempKotNumber = `KOT-${String(nowTs).slice(-6)}`;
    const cleanGuest = customerName.trim() || 'Guest';

    const newOrder: ActiveOrder = {
      id: tempOrderId,
      orderNumber: tempOrderNumber,
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: cleanGuest,
      tableNumber,
      items: [...cleanItems],
      itemsCount: cleanItems.reduce((acc, i) => acc + i.quantity, 0) || cleanItems.length,
      subtotal: rawSubtotal,
      cgst: Math.round(tax / 2),
      sgst: Math.round(tax / 2),
      taxAmount: tax,
      discountAmount: 0,
      total,
      status: 'Active Orders',
      branchId: bId,
      createdAtMs: nowTs,
    };

    const newKot: KOTTicket = {
      id: `#${tempKotNumber}`,
      orderId: tempOrderId,
      tableNumber,
      guestName: cleanGuest,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: [...cleanItems],
      totalQty: cleanItems.reduce((acc, i) => acc + i.quantity, 0),
      kitchenStatus: 'New / Sent',
      billingStatus: 'Not Billed',
      note: `Table No: ${tableNumber} - ${cleanGuest}`,
      branchId: bId,
      createdAtMs: nowTs,
    };

    // Guard table, KOT, and local Billing order against stale background GET snapshots until backend commits
    setTableGuard(bId, tableNumber, 'OCCUPIED', 12000);
    if (!optimisticPendingKots[bId]) optimisticPendingKots[bId] = {};
    optimisticPendingKots[bId][newKot.id] = { kot: newKot, expiresAt: nowTs + 60000 };
    if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
    optimisticLocalOrders[bId][tempOrderId] = newOrder;
    localOrderTableOverrideMap[tempOrderId] = tableNumber;

    // Immediately update branch local maps & notify UI in <2ms
    branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
      t.tableNumber.toLowerCase().trim() === tableNumber.toLowerCase().trim() ||
      (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(tableNumber))
        ? {
            ...t,
            status: 'OCCUPIED' as const,
            guestName: cleanGuest,
            guestCount,
            currentOrderId: tempOrderId,
            activeBillAmount: total,
            activeItemsCount: items.length,
            seatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : t
    );

    branchOrdersMap[bId] = [newOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== tempOrderId)];
    branchKotsMap[bId] = [newKot, ...(branchKotsMap[bId] || []).filter((k) => k.id !== newKot.id)];

    notifyListeners();

    // Sync to backend non-blocking and seamlessly reconcile tempOrderId -> realOrderId
    const syncPromise = (async (): Promise<string | null> => {
      try {
        await ensureBackendToken();
        const latestLocalOrder = (branchOrdersMap[bId] || []).find((o) => o.id === tempOrderId) || newOrder;
        const orderRes = await apiClient.post(
          '/hotel/orders',
          {
            branchId: bId,
            tableId: backendTableId,
            guestName: cleanGuest,
            guestCount: Number(guestCount) || 2,
            discount: latestLocalOrder.discountAmount || 0,
            taxRate: 5,
            items: (latestLocalOrder.items || items).map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.price,
            })),
          },
          { timeout: 6000 }
        );

        const realIdRaw = orderRes.data?.data?.id;
        if (realIdRaw) {
          const realOrderId = String(realIdRaw);
          const realOrderNumber = orderRes.data.data.orderNumber
            ? orderRes.data.data.orderNumber.startsWith('#')
              ? orderRes.data.data.orderNumber
              : `#${orderRes.data.data.orderNumber}`
            : tempOrderNumber;

          orderIdAliasMap[tempOrderId] = realOrderId;
          localOrderTableOverrideMap[realOrderId] = tableNumber;

          // Reconcile IDs in local maps without overwriting optimistic status/item edits or timestamp
          branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) =>
            o.id === tempOrderId ? { ...o, id: realOrderId, orderNumber: realOrderNumber, createdAtMs: o.createdAtMs || nowTs } : o
          );
          if (optimisticLocalOrders[bId]?.[tempOrderId]) {
            const optEntry = optimisticLocalOrders[bId][tempOrderId];
            delete optimisticLocalOrders[bId][tempOrderId];
            optimisticLocalOrders[bId][realOrderId] = { ...optEntry, id: realOrderId, orderNumber: realOrderNumber };
          }
          const currentOrderStatus: ActiveOrder['status'] =
            (branchOrdersMap[bId] || []).find((o) => o.id === realOrderId)?.status || 'Active Orders';

          branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
            t.currentOrderId === tempOrderId ? { ...t, currentOrderId: realOrderId } : t
          );

          branchKotsMap[bId] = (branchKotsMap[bId] || []).map((k) =>
            k.orderId === tempOrderId ? { ...k, orderId: realOrderId } : k
          );

          branchPaymentsMap[bId] = (branchPaymentsMap[bId] || []).map((p) =>
            p.orderId === tempOrderId ? { ...p, orderId: realOrderId } : p
          );

          if (optimisticPaidOrders[bId]?.[tempOrderId]) {
            const paidEntry = optimisticPaidOrders[bId][tempOrderId];
            optimisticPaidOrders[bId][realOrderId] = {
              ...paidEntry,
              order: { ...paidEntry.order, id: realOrderId, orderNumber: realOrderNumber },
            };
          }

          notifyListeners();

          // Only attach KOT instructions / OCCUPIED status if order wasn't already finalized in <1s
          if (currentOrderStatus !== 'PAID') {
            const targetOrdNum = Number(realOrderId);
            const postJobs: Promise<any>[] = [
              apiClient
                .post('/hotel/kot', {
                  branchId: bId,
                  orderId: !isNaN(targetOrdNum) ? targetOrdNum : null,
                  instructions: `Table No: ${tableNumber} - ${cleanGuest}`,
                })
                .then((kotRes) => {
                  const realKotNo = kotRes.data?.data?.kotNumber;
                  if (realKotNo) {
                    const formattedKotId = realKotNo.startsWith('#') ? realKotNo : `#${realKotNo}`;
                    branchKotsMap[bId] = (branchKotsMap[bId] || []).map((k) =>
                      k.id === newKot.id ? { ...k, id: formattedKotId, orderId: realOrderId } : k
                    );
                    if (optimisticPendingKots[bId]?.[newKot.id]) {
                      delete optimisticPendingKots[bId][newKot.id];
                    }
                    notifyListeners();
                  }
                })
                .catch(() => { }),
            ];
            if (backendTableId) {
              postJobs.push(
                apiClient
                  .patch(`/hotel/tables/${backendTableId}/status`, {
                    status: currentOrderStatus === 'BILL GENERATED' ? 'BILLING' : 'OCCUPIED',
                  })
                  .catch(() => { })
              );
            }
            await Promise.allSettled(postJobs);
          }

          return realOrderId;
        }
      } catch (e) {
        console.warn('Backend order creation sync warning:', e);
      }
      return null;
    })().finally(() => {
      pendingOrderCreations.delete(tempOrderId);
    });

    pendingOrderCreations.set(tempOrderId, syncPromise);
    return { order: newOrder, kot: newKot };
  },

  // 5. ADVANCE KITCHEN STATUS
  async advanceKOTStatus(kotId: string, branchId?: number): Promise<KOTTicket | undefined> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    let updatedKot: KOTTicket | undefined;

    branchKotsMap[bId] = (branchKotsMap[bId] || []).map((k) => {
      if (k.id === kotId) {
        let nextStatus: KOTTicket['kitchenStatus'] = 'Preparing';
        if (k.kitchenStatus === 'New / Sent') nextStatus = 'Preparing';
        else if (k.kitchenStatus === 'Preparing') nextStatus = 'Ready';
        else if (k.kitchenStatus === 'Ready') nextStatus = 'Served';
        else nextStatus = 'Served';

        updatedKot = { ...k, kitchenStatus: nextStatus };
        return updatedKot;
      }
      return k;
    });

    if (updatedKot) {
      const rawNum = Number(kotId.replace(/\D/g, ''));
      const backendStatus =
        updatedKot.kitchenStatus === 'Preparing'
          ? 'PREPARING'
          : updatedKot.kitchenStatus === 'Ready'
            ? 'READY'
            : 'SERVED';
      if (!isNaN(rawNum) && rawNum > 0) {
        apiClient.patch(`/hotel/kot/${rawNum}/status`, { status: backendStatus }).catch(() => { });
      }
    }

    notifyListeners();
    return updatedKot;
  },

  // 6. MARK ORDER FOR BILLING (0ms optimistic update + chained backend sync)
  async markOrderForBilling(orderId: string, branchId?: number): Promise<void> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const resolvedId = resolveOrderId(orderId);
    let targetTable: string = '';

    branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) => {
      if (o.id === orderId || o.id === resolvedId) {
        targetTable = o.tableNumber;
        if (o.status === 'PAID') return o;
        return { ...o, status: 'BILL GENERATED' as const };
      }
      return o;
    });
    if (optimisticLocalOrders[bId]) {
      Object.keys(optimisticLocalOrders[bId]).forEach((k) => {
        const lo = optimisticLocalOrders[bId][k];
        if ((lo.id === orderId || lo.id === resolvedId) && lo.status !== 'PAID') {
          targetTable = targetTable || lo.tableNumber;
          optimisticLocalOrders[bId][k] = { ...lo, status: 'BILL GENERATED' as const };
        }
      });
    }

    if (targetTable) {
      setTableGuard(bId, targetTable, 'BILLING', 12000);
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase().trim() === targetTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(targetTable))
          ? { ...t, status: 'BILLING' as const }
          : t
      );
    }

    notifyListeners();

    // Non-blocking backend PATCH (waits for temp order creation if still in flight)
    (async () => {
      try {
        const pending = pendingOrderCreations.get(orderId) || pendingOrderCreations.get(resolvedId);
        const finalId = pending ? (await pending) || resolveOrderId(orderId) : resolveOrderId(orderId);
        const current = (branchOrdersMap[bId] || []).find((o) => o.id === finalId);
        if (current?.status === 'PAID') return;
        const numOrderId = Number(finalId);
        if (!isNaN(numOrderId) && numOrderId < 1000000000) {
          await apiClient.patch(`/hotel/orders/${numOrderId}/status`, { status: 'BILL_REQUESTED' }, { timeout: 4000 });
        }
      } catch { }
    })();
  },

  // 7. FINALIZE BILL & PAY (0ms optimistic completion + ordered background persistence)
  async finalizeBillAndPay(
    orderId: string,
    paymentMode: 'CASH' | 'UPI' | 'CARD',
    discountAmount: number = 0,
    branchId?: number,
    options?: { items?: KOTOrderItem[]; orderSnapshot?: ActiveOrder }
  ): Promise<{ invoiceNumber: string; paidOrder: ActiveOrder; paymentRecord: PaymentRecord }> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const origOrderId = orderId;
    const resolvedId = resolveOrderId(orderId);

    const invoiceNumber = options?.orderSnapshot?.invoiceNumber || predictNextInvoiceNumber(bId);
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];

    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const refNo =
      paymentMode === 'UPI'
        ? `UPI/${Math.floor(100000000 + Math.random() * 900000000)}`
        : paymentMode === 'CARD'
          ? `CARD/${Math.floor(1000 + Math.random() * 9000)}`
          : `CASH/REC-${Math.floor(100 + Math.random() * 900)}`;

    let targetTable = '';
    let updatedOrder!: ActiveOrder;

    // Ensure synthesized KOT / optimistic / edited Step 2 orders settle with exact items & amounts
    const baseAndSynced = this.getCachedOrders(bId);
    const matchedIdx = baseAndSynced.findIndex(
      (o) => o.id === origOrderId || o.id === resolvedId || resolveOrderId(o.id) === resolvedId
    );
    const baseOrder = matchedIdx >= 0 ? baseAndSynced[matchedIdx] : options?.orderSnapshot;

    const buildSettledOrder = (src: ActiveOrder): ActiveOrder => {
      const effectiveItems = normalizeOrderItemsList(
        options?.items && options.items.length > 0 ? options.items : src.items,
        src.subtotal,
        src.total,
        src.itemsCount
      );
      const itemSub = effectiveItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const sub = itemSub > 0 ? itemSub : (Number(src.subtotal) > 0 ? Number(src.subtotal) : (Number(src.total) > 0 ? Math.round(Number(src.total) / 1.05) : 0));
      const tax = itemSub > 0 ? Math.round(sub * 0.05) : (Number(src.taxAmount) || Math.round(sub * 0.05));
      const cgst = Number((tax / 2).toFixed(2));
      const sgst = Number((tax / 2).toFixed(2));
      const rawTotal = sub + tax - discountAmount;
      const newTotal = Math.max(0, rawTotal > 0 ? rawTotal : (Number(src.total) > 0 ? Number(src.total) - discountAmount : 0));
      return {
        ...src,
        id: resolveOrderId(src.id),
        items: effectiveItems,
        itemsCount: effectiveItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || src.itemsCount || 1,
        subtotal: sub,
        cgst,
        sgst,
        taxAmount: tax,
        status: 'PAID' as const,
        discountAmount,
        total: newTotal,
        paymentMode,
        invoiceNumber,
      };
    };

    if (baseOrder) {
      targetTable = baseOrder.tableNumber;
      updatedOrder = buildSettledOrder(baseOrder);
      if (matchedIdx >= 0) {
        branchOrdersMap[bId] = baseAndSynced.map((o, idx) => (idx === matchedIdx ? updatedOrder : o));
      } else {
        branchOrdersMap[bId] = [updatedOrder, ...baseAndSynced];
      }
    } else {
      targetTable = 'Table 01';
      updatedOrder = buildSettledOrder({
        id: resolvedId,
        orderNumber: `#ORD-${String(Date.now()).slice(-6)}`,
        date: `Today, ${timeStr}`,
        customer: 'Guest',
        tableNumber: targetTable,
        items: options?.items && options.items.length > 0 ? options.items : [{ name: 'Order Dishes', quantity: 1, price: 0 }],
        itemsCount: 1,
        subtotal: 0,
        cgst: 0,
        sgst: 0,
        taxAmount: 0,
        discountAmount,
        total: 0,
        status: 'PAID',
        branchId: bId,
      });
      branchOrdersMap[bId] = [updatedOrder, ...baseAndSynced];
    }

    if (optimisticLocalOrders[bId]) {
      delete optimisticLocalOrders[bId][origOrderId];
      delete optimisticLocalOrders[bId][resolvedId];
      delete optimisticLocalOrders[bId][updatedOrder.id];
    }

    // Also mark any pending optimistic KOT for this order as Paid so it never re-appears in Billing
    const pendingKots = optimisticPendingKots[bId];
    if (pendingKots) {
      Object.keys(pendingKots).forEach((kId) => {
        const entry = pendingKots[kId];
        const kOrdId = resolveOrderId(entry.kot.orderId);
        if (
          entry.kot.orderId === origOrderId ||
          entry.kot.orderId === resolvedId ||
          kOrdId === resolvedId ||
          kOrdId === updatedOrder.id
        ) {
          entry.kot = { ...entry.kot, billingStatus: 'Paid', kitchenStatus: 'Served', invoiceNumber };
        }
      });
    }

    markOrderSettledInSession(bId, origOrderId, resolvedId, updatedOrder.id, invoiceNumber);

    // Put table in CLEANING status on payment done with 5-minute background timer to revert to AVAILABLE
    if (targetTable) {
      setTableCleaningStart(bId, targetTable, Date.now());
      setTableGuard(bId, targetTable, 'CLEANING', 300000);
      const matchedTable = (branchTablesMap[bId] || []).find((t) =>
        t.tableNumber.toLowerCase().trim() === targetTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(targetTable))
      );
      const tId = matchedTable ? matchedTable.id : targetTable;
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase().trim() === targetTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(targetTable))
          ? {
              ...t,
              status: 'CLEANING' as const,
              cleaningRemainingSeconds: 300,
              guestName: undefined,
              guestCount: undefined,
              currentOrderId: undefined,
              activeBillAmount: undefined,
              activeItemsCount: undefined,
              seatedAt: undefined,
            }
          : t
      );
      this.updateTableStatus(tId, 'CLEANING', bId).catch(() => {});

      // 5-minute backend timer (300,000 ms) to transition table to AVAILABLE without frontend popup
      setTimeout(() => {
        try {
          clearTableCleaningStart(bId, targetTable);
          branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
            t.tableNumber.toLowerCase().trim() === targetTable.toLowerCase().trim() ||
            (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(targetTable))
              ? {
                  ...t,
                  status: 'AVAILABLE' as const,
                  cleaningRemainingSeconds: undefined,
                }
              : t
          );
          setTableGuard(bId, targetTable, 'AVAILABLE', 30000);
          this.updateTableStatus(tId, 'AVAILABLE', bId).catch(() => {});
          const matchedNum = parseInt(targetTable.replace(/\D/g, ''), 10);
          if (!isNaN(matchedNum) && matchedNum > 0) {
            apiClient.patch(`/hotel/tables/${matchedNum}/status`, { status: 'AVAILABLE' }).catch(() => {});
          }
          notifyListeners();
        } catch (e) {
          console.warn('Error in 5-min table cleaning timer:', e);
        }
      }, 300000);
    }

    // Immediately mark related KOTs as Paid in memory
    branchKotsMap[bId] = (branchKotsMap[bId] || []).map((k) => {
      const kOrd = resolveOrderId(k.orderId);
      return k.orderId === origOrderId || k.orderId === resolvedId || kOrd === resolvedId || kOrd === updatedOrder.id
        ? { ...k, billingStatus: 'Paid' as const, kitchenStatus: 'Served' as const, invoiceNumber }
        : k;
    });

    const newPaymentRecord: PaymentRecord = {
      id: `p-${Date.now()}`,
      billId: invoiceNumber,
      orderId: updatedOrder.id,
      tableName: targetTable,
      customerName: updatedOrder.customer || 'Guest',
      amount: updatedOrder.total,
      mode: paymentMode,
      time: `Today, ${timeStr}`,
      date: dateStr,
      status: 'SETTLED',
      referenceNo: refNo,
      itemsSummary: updatedOrder.items ? updatedOrder.items.map((i) => `${i.name} (x${i.quantity})`).join(', ') : '',
      branchId: bId,
    };

    branchPaymentsMap[bId] = [newPaymentRecord, ...(branchPaymentsMap[bId] || []).filter((p) => p.billId !== invoiceNumber)];
    if (!optimisticPaidOrders[bId]) optimisticPaidOrders[bId] = {};
    const paidGuardEntry = { order: updatedOrder, expiresAt: Date.now() + 60000 };
    optimisticPaidOrders[bId][updatedOrder.id] = paidGuardEntry;
    if (origOrderId !== updatedOrder.id) {
      optimisticPaidOrders[bId][origOrderId] = paidGuardEntry;
    }

    // Notify UI immediately (<2ms) so billing celebration modal, freed table, and payment ledger update at once
    notifyListeners();

    // Persist to backend in proper sequence asynchronously
    const tableObj = (branchTablesMap[bId] || []).find(
      (t) =>
        t.tableNumber.toLowerCase().trim() === targetTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(targetTable))
    );
    const tblNum = tableObj && tableObj.id ? Number(tableObj.id.replace(/\D/g, '')) : NaN;

    (async () => {
      try {
        const pendingCreation = pendingOrderCreations.get(origOrderId) || pendingOrderCreations.get(resolvedId);
        const authoritativeOrderId = pendingCreation
          ? (await pendingCreation) || resolveOrderId(origOrderId)
          : resolveOrderId(origOrderId);

        const pendingUpdate =
          pendingOrderUpdates.get(origOrderId) || pendingOrderUpdates.get(authoritativeOrderId);
        if (pendingUpdate) {
          await pendingUpdate.catch(() => { });
        }

        await ensureBackendToken();

        const isStandaloneInv = String(authoritativeOrderId).startsWith('inv-');
        const standaloneInvId = isStandaloneInv ? Number(String(authoritativeOrderId).replace('inv-', '')) : NaN;
        const targetOrderIdNum = Number(authoritativeOrderId);
        const validOrderId =
          !isStandaloneInv && !isNaN(targetOrderIdNum) && targetOrderIdNum < 1000000000 ? targetOrderIdNum : null;

        // Omit invoiceNumber so backend atomically assigns official DB sequence without GET next-number roundtrip
        let backendInvoiceId: number | undefined =
          !isNaN(standaloneInvId) && standaloneInvId > 0 ? standaloneInvId : undefined;
        let authoritativeInvNumber = invoiceNumber;

        if (!backendInvoiceId) {
          try {
            const invRes = await apiClient.post(
              '/hotel/invoices',
              {
                branchId: bId,
                orderId: validOrderId,
                dueDate: isoDate,
                discountAmount,
                cgstRate: 2.5,
                sgstRate: 2.5,
                igstRate: 0,
                items: (updatedOrder.items || []).map((it) => ({
                  description: it.name,
                  quantity: it.quantity,
                  unitPrice: it.price,
                  taxRate: 5,
                })),
                notes: `Native Invoice for ${targetTable} - Branch ${bId}`,
              },
              { timeout: 6000 }
            );

            if (invRes.data?.data?.id) {
              backendInvoiceId = invRes.data.data.id;
              if (invRes.data.data.invoiceNumber) {
                authoritativeInvNumber = invRes.data.data.invoiceNumber;
              }
              markOrderSettledInSession(bId, authoritativeOrderId, authoritativeInvNumber);
              // Reconcile official invoiceNumber & backend ID in local maps
              branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) =>
                o.id === authoritativeOrderId || o.id === updatedOrder.id
                  ? { ...o, invoiceNumber: authoritativeInvNumber }
                  : o
              );
              branchPaymentsMap[bId] = (branchPaymentsMap[bId] || []).map((p) =>
                p.id === newPaymentRecord.id
                  ? { ...p, id: `backend-${backendInvoiceId}`, billId: authoritativeInvNumber, orderId: authoritativeOrderId }
                  : p
              );
              if (optimisticPaidOrders[bId]?.[authoritativeOrderId]) {
                optimisticPaidOrders[bId][authoritativeOrderId].order.invoiceNumber = authoritativeInvNumber;
              }
              notifyListeners();
            }
          } catch (invErr) {
            console.warn('Backend invoice creation warning:', invErr);
          }
        }

        // Run payment + COMPLETED + table AVAILABLE AFTER createInvoice so createInvoice doesn't re-occupy table
        const postJobs: Promise<any>[] = [];
        if (backendInvoiceId) {
          postJobs.push(
            apiClient
              .post('/hotel/payments', {
                branchId: bId,
                invoiceId: backendInvoiceId,
                amount: updatedOrder.total,
                paymentMethod: paymentMode,
                transactionRef: refNo,
                paymentDate: isoDate,
                notes: `Payment for ${targetTable} (Branch ${bId})`,
              })
              .catch((payErr) => console.warn('Backend payment record warning:', payErr))
          );
        }
        if (validOrderId) {
          postJobs.push(apiClient.patch(`/hotel/orders/${validOrderId}/status`, { status: 'COMPLETED' }).catch(() => { }));
        }
        if (!isNaN(tblNum) && tblNum > 0) {
          postJobs.push(apiClient.patch(`/hotel/tables/${tblNum}/status`, { status: 'CLEANING' }).catch(() => { }));
        }
        await Promise.allSettled(postJobs);

        setTimeout(() => {
          restaurantStore.getTables(bId).catch(() => { });
          restaurantStore.getOrders(bId).catch(() => { });
          restaurantStore.getPayments(bId).catch(() => { });
        }, 250);
      } catch (e) {
        console.warn('Background finalizeBillAndPay sync warning:', e);
      }
    })();

    return { invoiceNumber, paidOrder: updatedOrder, paymentRecord: newPaymentRecord };
  },

  // 8. GET PAYMENTS STRICTLY FOR ACTIVE BRANCH (Deduplicated + Fast 3.5s timeout)
  async getPayments(branchId?: number): Promise<PaymentRecord[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    if (inflightPaymentsReq[bId]) {
      return inflightPaymentsReq[bId]!;
    }

    const reqPromise = (async (): Promise<PaymentRecord[]> => {
      try {
        await ensureBackendToken();
        const res = await apiClient.get('/hotel/payments', { params: { branchId: bId }, timeout: 3500 });
        const rawList = res.data?.data || res.data || [];

        if (Array.isArray(rawList)) {
          const backendRecords: PaymentRecord[] = rawList
            .filter((p: any) => !p.branchId || Number(p.branchId) === bId)
            .map((p: any) => {
              const ordIdStr = p.orderId ? String(p.orderId) : undefined;
              const resolvedOrdId = ordIdStr ? resolveOrderId(ordIdStr) : undefined;
              return {
                id: `backend-${p.id}`,
                billId: p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : `INV-${p.id}`),
                orderId: resolvedOrdId,
                tableName:
                  (p.tableName && p.tableName.trim()) ||
                  (p.tableNumber && p.tableNumber.trim()) ||
                  (resolvedOrdId ? localOrderTableOverrideMap[resolvedOrdId] : undefined) ||
                  (p.tableId ? `Table ${p.tableId}` : 'Dining Table'),
                customerName: (p.customerName && p.customerName.trim()) || 'Guest',
                amount: Number(p.amount) || 0,
                mode: (p.paymentMethod === 'CARD' ? 'CARD' : p.paymentMethod === 'CASH' ? 'CASH' : 'UPI') as 'UPI' | 'CASH' | 'CARD',
                time: p.paymentDate ? `${p.paymentDate}` : 'Today',
                date: p.paymentDate || 'Today',
                status: 'SETTLED' as const,
                referenceNo: p.transactionRef || undefined,
                branchId: bId,
              };
            });

          const currentLocal = branchPaymentsMap[bId] || BRANCH_PAYMENTS_INITIAL[bId] || [];
          const localOnly = currentLocal.filter(
            (lp) =>
              !backendRecords.some(
                (bp) =>
                  bp.billId === lp.billId ||
                  (lp.orderId && bp.orderId && resolveOrderId(lp.orderId) === resolveOrderId(bp.orderId)) ||
                  (lp.referenceNo && bp.referenceNo && lp.referenceNo === bp.referenceNo)
              )
          );
          const combined = [...localOnly, ...backendRecords];
          const { payments: vitePayments } = getViteLocalStorageData(bId);
          for (const vp of vitePayments) {
            if (!combined.some((p) => p.billId === vp.billId)) {
              combined.push(vp);
            }
          }

          branchPaymentsMap[bId] = combined;
          return [...combined];
        }
      } catch (err) {
        // Silent fallback to local branch cache
      }

      if (!branchPaymentsMap[bId]) {
        branchPaymentsMap[bId] = BRANCH_PAYMENTS_INITIAL[bId] || [];
      }
      return this.getCachedPayments(bId);
    })().finally(() => {
      inflightPaymentsReq[bId] = undefined;
    });

    inflightPaymentsReq[bId] = reqPromise;
    return reqPromise;
  },

  // 9. ADD A NEW TABLE TO A SPECIFIC BRANCH (e.g. for Trimbakeshwar or Nashik)
  async addTable(
    tableData: { name: string; capacity?: number; area?: string; note?: string },
    branchId?: number
  ): Promise<TableItem> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    let createdId = `tbl-${Date.now()}`;
    try {
      const res = await apiClient.post('/hotel/tables', {
        branchId: bId,
        name: tableData.name.trim(),
        capacity: tableData.capacity || 4,
        area: tableData.area || 'Main Dining',
        note: tableData.note || '',
      });
      if (res.data?.data?.id) {
        createdId = String(res.data.data.id);
      }
    } catch (err) {
      console.log('[Store] Backend create table offline, created locally');
    }

    const newTable: TableItem = {
      id: createdId,
      tableNumber: tableData.name.trim(),
      section: tableData.area || 'Main Dining',
      capacity: tableData.capacity || 4,
      status: 'AVAILABLE',
      note: tableData.note,
      branchId: bId,
    };

    branchTablesMap[bId] = [...(branchTablesMap[bId] || []), newTable];


    notifyListeners();
    return newTable;
  },

  // 9B. UPDATE TABLE STATUS
  async updateTableStatus(
    tableId: string,
    status: 'AVAILABLE' | 'OCCUPIED' | 'BILLING' | 'RESERVED' | 'CLEANING',
    branchId?: number
  ): Promise<void> {
    const bId = branchId || currentBranchId;
    const current = branchTablesMap[bId] || [];
    branchTablesMap[bId] = current.map((t) => (t.id === tableId ? { ...t, status } : t));

    const num = Number(tableId.replace(/\D/g, ''));
    if (!isNaN(num) && num > 0) {
      apiClient.patch(`/hotel/tables/${num}/status`, { status }).catch(() => { });
    }

    notifyListeners();
  },

  // 9C. MARK TABLE AVAILABLE FROM CLEANING (Immediate reset + Backend PATCH)
  async markTableAvailableFromCleaning(
    tableId: string,
    tableNumber: string,
    branchId?: number
  ): Promise<void> {
    const bId = branchId || currentBranchId;
    clearTableCleaningStart(bId, tableNumber);
    setTableGuard(bId, tableNumber, 'AVAILABLE', 30000);

    const normTarget = normalizeTableKey(tableNumber);
    branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
      t.id === tableId || normalizeTableKey(t.tableNumber) === normTarget
        ? { ...t, status: 'AVAILABLE' as const, cleaningRemainingSeconds: undefined }
        : t
    );

    await this.updateTableStatus(tableId, 'AVAILABLE', bId).catch(() => {});
    const matchedNum = parseInt(tableNumber.replace(/\D/g, ''), 10);
    if (!isNaN(matchedNum) && matchedNum > 0) {
      apiClient.patch(`/hotel/tables/${matchedNum}/status`, { status: 'AVAILABLE' }).catch(() => {});
    }
    notifyListeners();
  },

  getTableCleaningRemainingSeconds(bId: number, tableNumber: string): number {
    return getTableCleaningRemainingSeconds(bId, tableNumber);
  },

  setTableCleaningStart(bId: number, tableNumber: string, ts?: number): void {
    setTableCleaningStart(bId, tableNumber, ts);
  },

  clearTableCleaningStart(bId: number, tableNumber: string): void {
    clearTableCleaningStart(bId, tableNumber);
  },

  // 10. GET ORDER BY ID OR TABLE (with synchronous KOT & Occupied-Table fallback)
  getOrderByIdOrTableSync(
    orderId?: string,
    tableName?: string,
    branchId?: number,
    includePaid: boolean = false
  ): ActiveOrder | null {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const branchOrders = this.getCachedOrders(bId);
    const otherOrders = Object.keys(branchOrdersMap)
      .map(Number)
      .filter((id) => !isNaN(id) && id !== bId)
      .flatMap((id) => this.getCachedOrders(id));
    const allOrders = [...branchOrders, ...otherOrders];

    if (orderId) {
      const resolvedTarget = resolveOrderId(orderId);
      const idMatches = (o: ActiveOrder) =>
        o.id === orderId || o.id === resolvedTarget || resolveOrderId(o.id) === resolvedTarget;
      const unpaidById = allOrders.find((o) => o.status !== 'PAID' && idMatches(o));
      if (unpaidById) return unpaidById;
      if (includePaid) {
        const paidById = allOrders.find(idMatches);
        if (paidById) return paidById;
      }
    }
    if (tableName) {
      const targetLower = tableName.toLowerCase().trim();
      const targetNorm = normalizeTableKey(tableName);
      const tableMatches = (tStr?: string) => {
        const s = (tStr || '').toLowerCase().trim();
        return s === targetLower || (targetNorm !== '' && normalizeTableKey(tStr) === targetNorm);
      };

      const byTable = allOrders.find((o) => o.status !== 'PAID' && tableMatches(o.tableNumber));
      if (byTable) return byTable;

      // Fallback 1: check unbilled KOTs directly (including Vite KOTs & optimistic pending KOTs)
      const { kots: viteKots } = getViteLocalStorageData(bId);
      const kotsForTable = [
        ...(branchKotsMap[bId] || []),
        ...Object.values(optimisticPendingKots[bId] || {}).map((e) => e.kot),
        ...viteKots,
      ];
      const matchedKot = kotsForTable.find(
        (k) => k.billingStatus !== 'Paid' && tableMatches(k.tableNumber)
      );
      const matchedTable = (branchTablesMap[bId] || []).find((t) => tableMatches(t.tableNumber));

      if (matchedKot) {
        const synOrder = kotToActiveOrder(matchedKot, bId, matchedTable?.activeBillAmount);
        if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
        optimisticLocalOrders[bId][synOrder.id] = synOrder;
        branchOrdersMap[bId] = [synOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== synOrder.id)];
        return synOrder;
      }

      // Fallback 2: check active OCCUPIED / BILLING table state
      if (matchedTable && (matchedTable.status === 'OCCUPIED' || matchedTable.status === 'BILLING')) {
        const synId = matchedTable.currentOrderId ? resolveOrderId(matchedTable.currentOrderId) : `tbl-ord-${matchedTable.id}`;
        const rawBill = Number(matchedTable.activeBillAmount) || 0;
        const sub = rawBill > 0 ? Math.round(rawBill / 1.05) : 0;
        const tax = rawBill > 0 ? rawBill - sub : 0;
        const synOrder: ActiveOrder = {
          id: synId,
          orderNumber: `#ORD-${matchedTable.id}`,
          date: matchedTable.seatedAt ? `Today, ${matchedTable.seatedAt}` : 'Today',
          customer: matchedTable.guestName || 'Guest',
          tableNumber: matchedTable.tableNumber,
          items: [{ name: 'Running Table Order', quantity: matchedTable.activeItemsCount || 1, price: sub || rawBill }],
          itemsCount: matchedTable.activeItemsCount || 1,
          subtotal: sub,
          cgst: Number((tax / 2).toFixed(2)),
          sgst: Number((tax / 2).toFixed(2)),
          taxAmount: tax,
          discountAmount: 0,
          total: rawBill,
          status: matchedTable.status === 'BILLING' ? 'BILL GENERATED' : 'Active Orders',
          branchId: bId,
          createdAtMs: Date.now(),
        };
        if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
        optimisticLocalOrders[bId][synOrder.id] = synOrder;
        branchOrdersMap[bId] = [synOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== synOrder.id)];
        return synOrder;
      }

      if (includePaid) {
        const paidByTable = allOrders.find((o) => tableMatches(o.tableNumber));
        if (paidByTable) return paidByTable;
      }
    }
    if (orderId) {
      const resolvedTarget = resolveOrderId(orderId);
      const anyById = allOrders.find(
        (o) => o.id === orderId || o.id === resolvedTarget || resolveOrderId(o.id) === resolvedTarget
      );
      if (anyById) return anyById;
    }
    return null;
  },

  async getOrderByIdOrTable(
    orderId?: string,
    tableName?: string,
    branchId?: number,
    includePaid: boolean = false
  ): Promise<ActiveOrder | null> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const syncMatch = this.getOrderByIdOrTableSync(orderId, tableName, bId, includePaid);
    if (syncMatch) return syncMatch;

    try {
      await Promise.allSettled([
        restaurantStore.getOrders(bId),
        restaurantStore.getKOTs(bId),
        restaurantStore.getTables(bId),
      ]);
      return this.getOrderByIdOrTableSync(orderId, tableName, bId, includePaid);
    } catch { }
    return null;
  },

  // Guarantee a billable ActiveOrder exists synchronously when clicking Bill on any Table
  ensureBillingOrderForTable(table: TableItem, branchId?: number): ActiveOrder {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const existing = this.getOrderByIdOrTableSync(table.currentOrderId, table.tableNumber, bId, false);
    if (existing && existing.status !== 'PAID') {
      const normItems = normalizeOrderItemsList(
        existing.items,
        existing.subtotal || (table.activeBillAmount ? Math.round(table.activeBillAmount / 1.05) : 0),
        existing.total || table.activeBillAmount,
        existing.itemsCount || table.activeItemsCount
      );
      const enriched: ActiveOrder =
        normItems !== existing.items && existing.total === 0 && Number(table.activeBillAmount) > 0
          ? {
              ...existing,
              items: normItems,
              subtotal: Math.round(Number(table.activeBillAmount) / 1.05),
              taxAmount: Number(table.activeBillAmount) - Math.round(Number(table.activeBillAmount) / 1.05),
              total: Number(table.activeBillAmount),
            }
          : existing;
      if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
      optimisticLocalOrders[bId][enriched.id] = enriched;
      branchOrdersMap[bId] = [enriched, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== enriched.id)];
      return enriched;
    }

    const synId = table.currentOrderId
      ? resolveOrderId(table.currentOrderId)
      : `tbl-ord-${table.id}-${Date.now()}`;
    const rawBill = Number(table.activeBillAmount) || 0;
    const sub = rawBill > 0 ? Math.round(rawBill / 1.05) : 0;
    const tax = rawBill > 0 ? rawBill - sub : 0;
    const synOrder: ActiveOrder = {
      id: synId,
      orderNumber: `#ORD-${table.id}`,
      date: table.seatedAt ? `Today, ${table.seatedAt}` : 'Today',
      customer: table.guestName || 'Guest',
      tableNumber: table.tableNumber,
      items: normalizeOrderItemsList([], sub, rawBill, table.activeItemsCount || 1),
      itemsCount: table.activeItemsCount || 1,
      subtotal: sub,
      cgst: Number((tax / 2).toFixed(2)),
      sgst: Number((tax / 2).toFixed(2)),
      taxAmount: tax,
      discountAmount: 0,
      total: rawBill,
      status: table.status === 'BILLING' ? 'BILL GENERATED' : 'Active Orders',
      branchId: bId,
      createdAtMs: Date.now(),
    };
    if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
    optimisticLocalOrders[bId][synOrder.id] = synOrder;
    branchOrdersMap[bId] = [synOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== synOrder.id)];
    notifyListeners();
    return synOrder;
  },

  // Guarantee a billable ActiveOrder exists synchronously when clicking Bill / Pay on any KOT card
  ensureBillingOrderForKot(kot: KOTTicket, branchId?: number): ActiveOrder {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const existing = this.getOrderByIdOrTableSync(kot.orderId, kot.tableNumber, bId, kot.billingStatus === 'Paid');
    if (existing) {
      if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
      if (existing.status !== 'PAID') {
        optimisticLocalOrders[bId][existing.id] = existing;
      }
      branchOrdersMap[bId] = [existing, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== existing.id)];
      return existing;
    }

    const synOrder = kotToActiveOrder(kot, bId);
    if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
    if (synOrder.status !== 'PAID') {
      optimisticLocalOrders[bId][synOrder.id] = synOrder;
    }
    branchOrdersMap[bId] = [synOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== synOrder.id)];
    notifyListeners();
    return synOrder;
  },

  // Fallback builder if Billing opened via route params with table name / amount only (e.g. Dashboard Bill Request)
  ensureBillingOrderForTableName(
    tableName: string,
    guestName?: string,
    billAmount?: number,
    orderId?: string,
    branchId?: number
  ): ActiveOrder {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const existing = this.getOrderByIdOrTableSync(orderId, tableName, bId, false);
    if (existing) return existing;

    const cleanNum = Number(String(billAmount || 0).replace(/[^0-9.]/g, '')) || 0;
    const sub = cleanNum > 0 ? Math.round(cleanNum / 1.05) : 0;
    const tax = cleanNum > 0 ? cleanNum - sub : 0;
    const synId = orderId ? resolveOrderId(orderId) : `bill-${normalizeTableKey(tableName) || 'tbl'}-${Date.now()}`;
    const synOrder: ActiveOrder = {
      id: synId,
      orderNumber: `#ORD-${String(Date.now()).slice(-5)}`,
      date: 'Today',
      customer: guestName || 'Guest',
      tableNumber: tableName || 'Table 01',
      items: normalizeOrderItemsList([], sub, cleanNum, 1),
      itemsCount: 1,
      subtotal: sub,
      cgst: Number((tax / 2).toFixed(2)),
      sgst: Number((tax / 2).toFixed(2)),
      taxAmount: tax,
      discountAmount: 0,
      total: cleanNum,
      status: 'BILL GENERATED',
      branchId: bId,
      createdAtMs: Date.now(),
    };
    if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
    optimisticLocalOrders[bId][synOrder.id] = synOrder;
    branchOrdersMap[bId] = [synOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== synOrder.id)];
    notifyListeners();
    return synOrder;
  },

  // 11. UPDATE ORDER ITEMS IN BILL (0ms optimistic update + temp-ID chained sync)
  async updateOrderItems(orderId: string, items: KOTOrderItem[]): Promise<ActiveOrder | null> {
    const resolvedTarget = resolveOrderId(orderId);
    const branchKeys = Array.from(new Set([String(currentBranchId), ...Object.keys(branchOrdersMap)]));
    for (const bId of branchKeys) {
      const numId = Number(bId);
      if (isNaN(numId)) continue;
      const orders = this.getCachedOrders(numId);

      const idx = orders.findIndex(
        (o) => o.id === orderId || o.id === resolvedTarget || resolveOrderId(o.id) === resolvedTarget
      );
      if (idx >= 0) {
        const current = orders[idx];

        // Deduplicate and merge items by dish name
        const updateItemsMap = new Map<string, KOTOrderItem>();
        for (const it of (items || [])) {
          const cleanName = String(it.name || '').trim();
          const key = cleanName.toLowerCase();
          if (updateItemsMap.has(key)) {
            const ex = updateItemsMap.get(key)!;
            ex.quantity += Number(it.quantity || 1);
            if (ex.price <= 0 && Number(it.price) > 0) ex.price = Number(it.price);
          } else {
            updateItemsMap.set(key, { ...it, name: cleanName, quantity: Number(it.quantity || 1), price: Number(it.price || 0) });
          }
        }
        const cleanItems = Array.from(updateItemsMap.values());

        const subtotal = cleanItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const taxAmount = Math.round(subtotal * 0.05);
        const cgst = Number((taxAmount / 2).toFixed(2));
        const sgst = Number((taxAmount / 2).toFixed(2));
        const total = Math.max(0, subtotal + taxAmount - current.discountAmount);
        const updated: ActiveOrder = {
          ...current,
          items: cleanItems,
          itemsCount: cleanItems.reduce((sum, it) => sum + it.quantity, 0),
          subtotal,
          taxAmount,
          cgst,
          sgst,
          total,
        };
        orders[idx] = updated;
        branchOrdersMap[numId] = [...orders];
        if (optimisticLocalOrders[numId] && (optimisticLocalOrders[numId][orderId] || optimisticLocalOrders[numId][updated.id])) {
          optimisticLocalOrders[numId][updated.id] = updated;
        }

        // Also update table's live active bill amount cleanly
        branchTablesMap[numId] = (branchTablesMap[numId] || []).map((t) =>
          t.currentOrderId === current.id || t.tableNumber.toLowerCase() === current.tableNumber.toLowerCase()
            ? { ...t, activeBillAmount: total, activeItemsCount: updated.itemsCount }
            : t
        );

        notifyListeners();

        // Sync update with backend (awaits pending temp creation if order was just created)
        const updatePromise = (async () => {
          try {
            const pendingCreation = pendingOrderCreations.get(orderId) || pendingOrderCreations.get(current.id);
            const authoritativeId = pendingCreation
              ? (await pendingCreation) || resolveOrderId(current.id)
              : resolveOrderId(current.id);
            const numOrderId = Number(authoritativeId);
            if (!isNaN(numOrderId) && numOrderId < 1000000000) {
              await ensureBackendToken();
              await apiClient.put(`/hotel/orders/${numOrderId}`, {
                branchId: numId,
                guestName: current.customer || 'Guest',
                discount: current.discountAmount || 0,
                taxRate: 5,
                items: items.map((it) => ({
                  name: it.name,
                  quantity: it.quantity,
                  unitPrice: it.price,
                })),
              });
            }
          } catch (e) {
            console.warn('Backend updateOrderItems sync warning:', e);
          }
        })().finally(() => {
          pendingOrderUpdates.delete(orderId);
          pendingOrderUpdates.delete(resolvedTarget);
        });

        pendingOrderUpdates.set(orderId, updatePromise);
        pendingOrderUpdates.set(resolvedTarget, updatePromise);

        return updated;
      }
    }
    return null;
  },

  // 12. CREATE QUICK WALK-IN BILL (0ms optimistic open + background DB persistence & ID reconciliation)
  async createQuickBill(
    tableName: string,
    guestName: string,
    items: KOTOrderItem[],
    branchId?: number
  ): Promise<ActiveOrder> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.05);
    const cgst = Number((taxAmount / 2).toFixed(2));
    const sgst = Number((taxAmount / 2).toFixed(2));
    const total = subtotal + taxAmount;

    const cleanTable = tableName || 'Table 01';
    const cleanGuest = (guestName && guestName.trim()) || 'Walk-in Guest';

    const currentBranchTables = branchTablesMap[bId] || [];
    const tableObj = currentBranchTables.find(
      (t) =>
        t.tableNumber.toLowerCase().trim() === cleanTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' &&
          normalizeTableKey(t.tableNumber) === normalizeTableKey(cleanTable))
    );
    let backendTableId: number | null = null;
    if (tableObj && tableObj.id && !String(tableObj.id).startsWith('tbl-')) {
      const num = Number(tableObj.id.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0) backendTableId = num;
    }

    const nowTs = Date.now();
    const tempOrderId = `temp-qb-${nowTs}-${Math.floor(Math.random() * 1000)}`;
    const tempOrderNumber = `#ORD-${String(nowTs).slice(-6)}`;

    const newOrder: ActiveOrder = {
      id: tempOrderId,
      orderNumber: tempOrderNumber,
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: cleanGuest,
      tableNumber: cleanTable,
      items: [...items],
      itemsCount: items.reduce((sum, it) => sum + it.quantity, 0),
      subtotal,
      cgst,
      sgst,
      taxAmount,
      discountAmount: 0,
      total,
      status: 'Active Orders',
      branchId: bId,
      createdAtMs: nowTs,
    };

    setTableGuard(bId, cleanTable, 'OCCUPIED', 12000);
    if (!optimisticLocalOrders[bId]) optimisticLocalOrders[bId] = {};
    optimisticLocalOrders[bId][tempOrderId] = newOrder;
    localOrderTableOverrideMap[tempOrderId] = cleanTable;
    branchOrdersMap[bId] = [newOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== tempOrderId)];

    if (cleanTable) {
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase().trim() === cleanTable.toLowerCase().trim() ||
        (normalizeTableKey(t.tableNumber) !== '' && normalizeTableKey(t.tableNumber) === normalizeTableKey(cleanTable))
          ? {
              ...t,
              status: 'OCCUPIED' as const,
              guestName: cleanGuest,
              guestCount: 2,
              currentOrderId: tempOrderId,
              activeBillAmount: total,
              activeItemsCount: items.length,
              seatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : t
      );
    }

    notifyListeners();

    const syncPromise = (async (): Promise<string | null> => {
      try {
        await ensureBackendToken();
        const latestLocal = (branchOrdersMap[bId] || []).find((o) => o.id === tempOrderId) || newOrder;
        const orderRes = await apiClient.post(
          '/hotel/orders',
          {
            branchId: bId,
            tableId: backendTableId,
            guestName: cleanGuest,
            guestCount: 2,
            discount: latestLocal.discountAmount || 0,
            taxRate: 5,
            items: (latestLocal.items || items).map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.price,
            })),
          },
          { timeout: 6000 }
        );

        const realIdRaw = orderRes.data?.data?.id;
        if (realIdRaw) {
          const realOrderId = String(realIdRaw);
          const realOrderNumber = orderRes.data.data.orderNumber
            ? orderRes.data.data.orderNumber.startsWith('#')
              ? orderRes.data.data.orderNumber
              : `#${orderRes.data.data.orderNumber}`
            : tempOrderNumber;

          orderIdAliasMap[tempOrderId] = realOrderId;
          localOrderTableOverrideMap[realOrderId] = cleanTable;

          branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) =>
            o.id === tempOrderId ? { ...o, id: realOrderId, orderNumber: realOrderNumber, createdAtMs: o.createdAtMs || nowTs } : o
          );
          if (optimisticLocalOrders[bId]?.[tempOrderId]) {
            const optEntry = optimisticLocalOrders[bId][tempOrderId];
            delete optimisticLocalOrders[bId][tempOrderId];
            optimisticLocalOrders[bId][realOrderId] = { ...optEntry, id: realOrderId, orderNumber: realOrderNumber };
          }
          const currentStatus: ActiveOrder['status'] =
            (branchOrdersMap[bId] || []).find((o) => o.id === realOrderId)?.status || 'Active Orders';

          branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
            t.currentOrderId === tempOrderId ? { ...t, currentOrderId: realOrderId } : t
          );

          branchPaymentsMap[bId] = (branchPaymentsMap[bId] || []).map((p) =>
            p.orderId === tempOrderId ? { ...p, orderId: realOrderId } : p
          );

          if (optimisticPaidOrders[bId]?.[tempOrderId]) {
            const paidEntry = optimisticPaidOrders[bId][tempOrderId];
            optimisticPaidOrders[bId][realOrderId] = {
              ...paidEntry,
              order: { ...paidEntry.order, id: realOrderId, orderNumber: realOrderNumber },
            };
          }

          notifyListeners();

          if (currentStatus !== 'PAID') {
            const targetOrdNum = Number(realOrderId);
            const postJobs: Promise<any>[] = [];
            if (!isNaN(targetOrdNum)) {
              postJobs.push(
                apiClient
                  .post('/hotel/kot', {
                    branchId: bId,
                    orderId: targetOrdNum,
                    instructions: `Quick Bill: ${cleanTable} - ${cleanGuest}`,
                  })
                  .catch(() => { })
              );
            }
            if (backendTableId) {
              postJobs.push(
                apiClient
                  .patch(`/hotel/tables/${backendTableId}/status`, {
                    status: currentStatus === 'BILL GENERATED' ? 'BILLING' : 'OCCUPIED',
                  })
                  .catch(() => { })
              );
            }
            await Promise.allSettled(postJobs);
          }

          return realOrderId;
        }
      } catch (e) {
        console.warn('Backend quick bill creation warning:', e);
      }
      return null;
    })().finally(() => {
      pendingOrderCreations.delete(tempOrderId);
    });

    pendingOrderCreations.set(tempOrderId, syncPromise);
    return newOrder;
  },

  // 13. RECORD MANUAL PAYMENT
  async recordPayment(
    record: {
      tableName: string;
      amount: number;
      mode: 'UPI' | 'CASH' | 'CARD';
      customerName?: string;
      referenceNo?: string;
      branchId?: number;
    },
    branchId?: number
  ): Promise<PaymentRecord> {
    const bId = branchId !== undefined && !isNaN(Number(branchId))
      ? Number(branchId)
      : record.branchId !== undefined && !isNaN(Number(record.branchId))
        ? Number(record.branchId)
        : currentBranchId;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const invoiceNumber = `INV-${Math.floor(1093 + Math.random() * 50)}`;

    const refNo =
      record.referenceNo ||
      (record.mode === 'UPI'
        ? `UPI/${Math.floor(100000000 + Math.random() * 900000000)}`
        : record.mode === 'CARD'
          ? `CARD/${Math.floor(1000 + Math.random() * 9000)}`
          : `CASH/REC-${Math.floor(100 + Math.random() * 900)}`);

    const newRecord: PaymentRecord = {
      id: `p-${Date.now()}`,
      billId: invoiceNumber,
      tableName: record.tableName || 'Table',
      customerName: record.customerName || 'Guest',
      amount: record.amount,
      mode: record.mode,
      time: `Today, ${timeStr}`,
      date: dateStr,
      status: 'SETTLED',
      referenceNo: refNo,
      branchId: bId,
    };

    branchPaymentsMap[bId] = [newRecord, ...(branchPaymentsMap[bId] || [])];


    notifyListeners();

    try {
      await ensureBackendToken();
      let backendInvId: number | undefined;
      const invRes = await apiClient.post('/hotel/invoices', {
        branchId: bId,
        invoiceNumber,
        dueDate: now.toISOString().split('T')[0],
        discountAmount: 0,
        cgstRate: 2.5,
        sgstRate: 2.5,
        igstRate: 0,
        items: [
          {
            description: `Dining Service - ${record.tableName || 'Table'}`,
            quantity: 1,
            unitPrice: record.amount,
            taxRate: 5,
          },
        ],
        notes: `Manual settlement for ${record.tableName} (Branch ${bId})`,
      }).catch(() => null);

      if (invRes?.data?.data?.id) {
        backendInvId = invRes.data.data.id;
        newRecord.id = `backend-${backendInvId}`;
        if (invRes.data.data.invoiceNumber) {
          newRecord.billId = invRes.data.data.invoiceNumber;
        }
      }

      if (backendInvId) {
        await apiClient.post('/hotel/payments', {
          branchId: bId,
          invoiceId: backendInvId,
          amount: record.amount,
          paymentMethod: record.mode,
          transactionRef: refNo,
          paymentDate: now.toISOString().split('T')[0],
          notes: `Manual payment for ${record.tableName} (Branch ${bId})`,
        });
      }
    } catch (e) {
      console.warn('Backend manual payment sync warning:', e);
    }

    return newRecord;
  },
};

// Global Silent Real-Time Background Synchronization (Zero UI obstruction)
let syncIntervalTimer: any = null;
let isSyncInProgress = false;

export const triggerSilentSync = async (targetBranchId?: number) => {
  if (isSyncInProgress) return;
  isSyncInProgress = true;
  try {
    const bId = targetBranchId !== undefined && !isNaN(Number(targetBranchId)) ? Number(targetBranchId) : currentBranchId;
    await ensureBackendToken();
    await Promise.allSettled([
      restaurantStore.getTables(bId),
      restaurantStore.getOrders(bId),
      restaurantStore.getKOTs(bId),
      restaurantStore.getPayments(bId),
      restaurantStore.loadMenuItemsFromBackend(),
    ]);
    notifyListeners();
  } catch {
    // completely silent - no disruption to user
  } finally {
    isSyncInProgress = false;
  }
};

export const startSilentBackgroundSync = () => {
  if (syncIntervalTimer) return;
  triggerSilentSync().catch(() => { });
  syncIntervalTimer = setInterval(() => {
    triggerSilentSync().catch(() => { });
  }, 5000);
};

export const stopSilentBackgroundSync = () => {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }
};

// Start silent background sync immediately on load
startSilentBackgroundSync();
