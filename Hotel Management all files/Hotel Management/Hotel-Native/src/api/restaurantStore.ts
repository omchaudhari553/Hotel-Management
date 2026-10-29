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

let dynamicMenuItems: MenuItemData[] = [...INITIAL_MENU_ITEMS];
(async () => {
  try {
    const saved = await AsyncStorage.getItem('@hotel_custom_menu_items');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        dynamicMenuItems = [...parsed, ...INITIAL_MENU_ITEMS];
      }
    }
  } catch {}
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

// Empty seed containers - all data strictly fetched from shared SQL Server database
export const BRANCH_KOTS_INITIAL: { [branchId: number]: KOTTicket[] } = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

export const BRANCH_ORDERS_INITIAL: { [branchId: number]: ActiveOrder[] } = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

export const BRANCH_PAYMENTS_INITIAL: { [branchId: number]: PaymentRecord[] } = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

// Active state in memory, partitioned by branchId
let currentBranchId: number = 1;
const branchTablesMap: { [bId: number]: TableItem[] } = { ...BRANCH_TABLES_INITIAL };
const branchOrdersMap: { [bId: number]: ActiveOrder[] } = { ...BRANCH_ORDERS_INITIAL };
const branchKotsMap: { [bId: number]: KOTTicket[] } = { ...BRANCH_KOTS_INITIAL };
const branchPaymentsMap: { [bId: number]: PaymentRecord[] } = { ...BRANCH_PAYMENTS_INITIAL };

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
    }
  },

  getCurrentBranch(): number {
    return currentBranchId;
  },

  // 1. GET TABLES STRICTLY FOR THE ACTIVE BRANCH (Solves 33 tables bug!)
  async getTables(branchId?: number): Promise<TableItem[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/tables', {
        params: { branchId: bId },
      });
      const rawList = res.data?.data || res.data || [];



      if (Array.isArray(rawList)) {
        // Backend filters by branchId, but we also strictly double-filter on client
        const filteredList = rawList.filter((t: any) => !t.branchId || Number(t.branchId) === bId);

        const parsedTables: TableItem[] = filteredList.map((t: any) => {
          const tableNumStr = t.name || `Table ${String(t.id).padStart(2, '0')}`;
          const isOcc = t.status === 'OCCUPIED';
          const isBill = t.status === 'BILLING' || t.status === 'BILL_REQUESTED';

          // Match active order in this branch
          const branchOrders = branchOrdersMap[bId] || [];


          const activeOrd = branchOrders.find(
            (o) => o.status !== 'PAID' && o.tableNumber.toLowerCase() === tableNumStr.toLowerCase()
          );

          return {
            id: String(t.id),
            tableNumber: tableNumStr,
            section: t.area || 'Main Dining',
            capacity: Number(t.capacity) || 4,
            status: (isBill ? 'BILLING' : isOcc ? 'OCCUPIED' : t.status === 'RESERVED' ? 'RESERVED' : 'AVAILABLE') as TableItem['status'],
            guestName: t.guest || activeOrd?.customer || undefined,
            guestCount: Number(t.guestCount) || (isOcc ? 2 : undefined),
            currentOrderId: t.orderId ? String(t.orderId) : activeOrd?.id || undefined,
            activeBillAmount: t.bill ? Number(t.bill) : activeOrd?.total || undefined,
            activeItemsCount: activeOrd?.itemsCount || (isOcc ? 2 : undefined),
            seatedAt: isOcc ? 'Active' : undefined,
            note: t.note || undefined,
            branchId: bId,
            branchName: t.branchName || undefined,
          };
        });

        branchTablesMap[bId] = parsedTables;
        try {
          await AsyncStorage.setItem(`@RESTAURANT_TABLES_B${bId}`, JSON.stringify(parsedTables));
        } catch {}
        return [...parsedTables];


      }
    } catch (err) {
      console.log(`[Store] Backend tables fetch offline for Branch ${bId}, using local branch cache`);
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


  },

  // 2. GET KOTs STRICTLY FOR THE ACTIVE BRANCH (Real-time DB Sync)
  async getKOTs(branchId?: number, forceRefresh: boolean = false): Promise<KOTTicket[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    try {
      const res = await apiClient.get('/hotel/kot', {
        params: { branchId: bId, _t: Date.now() },
        timeout: 5000,
      });
      const rawList = res.data?.data || res.data || [];

      if (Array.isArray(rawList)) {
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

            const billingStatus: KOTTicket['billingStatus'] =
              rawStatus === 'BILLED' || rawStatus === 'COMPLETED' || kot.orderStatus === 'COMPLETED'
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
              orderId: String(kot.orderId || kot.id),
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
            };
          });

        branchKotsMap[bId] = backendKots;
        return [...backendKots];
      }
    } catch (err) {
      console.log(`[Store] Backend KOTs fetch offline for Branch ${bId}, using local branch cache`);
    }

    if (!branchKotsMap[bId]) {
      branchKotsMap[bId] = [];
    }
    return [...(branchKotsMap[bId] || [])];
  },

  // 3. GET ACTIVE ORDERS STRICTLY FOR THE ACTIVE BRANCH
  async getOrders(branchId?: number): Promise<ActiveOrder[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    try {
      let activeHotelOrders: ActiveOrder[] = [];


      let invoiceOrders: ActiveOrder[] = [];
      try {
        await ensureBackendToken();
        const [ordersRes, invRes] = await Promise.all([
          apiClient.get('/hotel/orders', { params: { branchId: bId } }).catch(() => null),
          apiClient.get('/hotel/invoices', { params: { branchId: bId } }).catch(() => null),
        ]);
        const rawOrders = ordersRes?.data?.data || ordersRes?.data || [];
        const rawInvoices = invRes?.data?.data || invRes?.data || [];

        if (Array.isArray(rawOrders)) {
          activeHotelOrders = rawOrders
            .filter((ord: any) => !ord.branchId || Number(ord.branchId) === bId)
            .map((ord: any) => {
              const rawItems: KOTOrderItem[] = (ord.items || []).map((it: any) => ({
                name: it.itemName || it.name || 'Dish',
                quantity: Number(it.quantity || it.qty || 1),
                price: Number(it.unitPrice || it.price || 0),
              }));
              const sub = rawItems.reduce((acc, i) => acc + i.price * i.quantity, 0) || Number(ord.totalAmount) || 0;
              const tax = Math.round(sub * 0.05);
              const tot = Number(ord.totalAmount) || sub + tax;
              const isBillReq = ord.status === 'BILL_REQUESTED';
              const isCompleted = ord.status === 'COMPLETED' || ord.status === 'PAID';

              const tableNum =
                (ord.tableNumber && ord.tableNumber.trim()) ||
                (ord.tableName && ord.tableName.trim()) ||
                (ord.tableId ? `Table ${ord.tableId}` : 'Table 01');

              return {
                id: String(ord.id),
                orderNumber: ord.orderNumber || `#ORD-${ord.id}`,
                date: ord.createdAt
                  ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Today',
                customer: ord.guestName || 'Guest',
                tableNumber: tableNum,
                items: rawItems.length > 0 ? rawItems : [{ name: 'Order Dishes', quantity: 1, price: sub }],
                itemsCount: rawItems.length || 1,
                subtotal: sub,
                cgst: Math.round(tax / 2),
                sgst: Math.round(tax / 2),
                taxAmount: tax,
                discountAmount: Number(ord.discount) || 0,
                total: tot,
                status: (isCompleted ? 'PAID' : isBillReq ? 'BILL GENERATED' : 'Active Orders') as ActiveOrder['status'],
                branchId: bId,
              };
            });
        }


        if (Array.isArray(rawInvoices)) {
          invoiceOrders = rawInvoices
            .filter((inv: any) => !inv.branchId || Number(inv.branchId) === bId)
            .map((inv: any) => {
              const rawItems: KOTOrderItem[] = (inv.items || []).map((it: any) => ({
                name: it.itemName || it.description || it.name || 'Dish',
                quantity: Number(it.quantity || it.qty || 1),
                price: Number(it.unitPrice || it.price || 0),
              }));
              const sub = Number(inv.subtotal || inv.taxableAmount || 0);
              const tax = Number(inv.taxAmount || (inv.cgst || 0) + (inv.sgst || 0));
              const tot = Number(inv.grandTotal || inv.total || sub + tax);
              const stat: ActiveOrder['status'] =
                inv.status === 'PAID'
                  ? 'PAID'
                  : inv.status === 'UNPAID' || inv.status === 'PARTIAL'
                  ? 'BILL GENERATED'
                  : 'Active Orders';

              return {
                id: String(inv.orderId || inv.id),
                orderNumber: inv.invoiceNumber || inv.orderNumber || `#ORD-${inv.id}`,
                date: inv.invoiceDate || (inv.createdAt ? String(inv.createdAt).split('T')[0] : 'Today'),
                customer: (inv.customerName && inv.customerName.trim()) || (inv.guestName && inv.guestName.trim()) || 'Guest',
                tableNumber: (inv.tableNumber && inv.tableNumber.trim()) || (inv.tableId ? `Table ${inv.tableId}` : 'Table 01'),
                items: rawItems.length > 0 ? rawItems : [{ name: 'Ordered Item', quantity: 1, price: sub || tot }],
                itemsCount: rawItems.length || 1,
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
              };
            });
        }
      } catch {}

      const combined = [...activeHotelOrders];


      for (const invOrd of invoiceOrders) {
        const existingIdx = combined.findIndex((o) => o.id === invOrd.id || (invOrd.invoiceNumber && o.invoiceNumber === invOrd.invoiceNumber));
        if (existingIdx >= 0) {
          if (invOrd.status === 'PAID') {
            combined[existingIdx] = invOrd;
          }
        } else {
          combined.push(invOrd);
        }
      }

      if (combined.length > 0) {
        branchOrdersMap[bId] = combined;
        return [...combined];


      }
    } catch (err) {
      console.log(`[Store] Backend orders fetch offline for Branch ${bId}, using local branch cache`);
    }

    if (!branchOrdersMap[bId]) {
      branchOrdersMap[bId] = BRANCH_ORDERS_INITIAL[bId] || [];


    }
    return [...(branchOrdersMap[bId] || [])];


  },

  getMenuItems(): MenuItemData[] {
    if (!hasLoadedBackendMenu) {
      hasLoadedBackendMenu = true;
      restaurantStore.loadMenuItemsFromBackend().catch(() => {});
    }
    return dynamicMenuItems;
  },

  async loadMenuItemsFromBackend(): Promise<MenuItemData[]> {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/menu-items');
      const itemsList = res.data?.data;
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
            name: m.name,
            category: cat,
            price: Number(m.price) || 100,
            taxRate: 5,
          };
        });
        // Merge with initial, avoiding duplicate names
        const existingNames = new Set(backendItems.map(b => b.name.toLowerCase()));
        const unseeded = dynamicMenuItems.filter(i => !existingNames.has(i.name.toLowerCase()));
        dynamicMenuItems = [...backendItems, ...unseeded];
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
              }).catch(() => {});
            }
          } catch {}
        })();
      }
    } catch {}
    return dynamicMenuItems;
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

    dynamicMenuItems = [newItem, ...dynamicMenuItems.filter(m => m.id !== newItem.id && m.name.toLowerCase() !== newItem.name.toLowerCase())];
    notifyListeners();

    try {
      const saved = await AsyncStorage.getItem('@hotel_custom_menu_items');
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem('@hotel_custom_menu_items', JSON.stringify(list));
    } catch {}

    return newItem;
  },

  // 4. START A NEW ORDER (Saves to backend for specific branchId)
  async startOrder(
    tableNumber: string,
    customerName: string,
    items: KOTOrderItem[],
    guestCount: number = 2,
    branchId?: number
  ): Promise<{ order: ActiveOrder; kot: KOTTicket }> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    const rawSubtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const tax = Math.round(rawSubtotal * 0.05);
    const total = rawSubtotal + tax;

    const currentBranchTables = branchTablesMap[bId] || [];


    const tableObj = currentBranchTables.find((t) => t.tableNumber.toLowerCase() === tableNumber.toLowerCase());
    let backendTableId: number | null = null;
    if (tableObj && tableObj.id) {
      const num = Number(tableObj.id.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0) backendTableId = num;
    }

    let createdOrderId = String(Math.floor(90 + Math.random() * 900));
    let createdOrderNumber = `#ORD-${Date.now()}`;
    let createdKotNumber = `KOT-${Date.now()}`;

    // 1. Post to /hotel/orders with branchId
    try {
      await ensureBackendToken();
      const orderRes = await apiClient.post('/hotel/orders', {
        branchId: bId,
        tableId: backendTableId || 1,
        guestName: customerName.trim() || 'Guest',
        guestCount: Number(guestCount) || 2,
        discount: 0,
        taxRate: 5,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      });
      if (orderRes.data?.data?.id) {
        createdOrderId = String(orderRes.data.data.id);
        if (orderRes.data.data.orderNumber) {
          createdOrderNumber = orderRes.data.data.orderNumber.startsWith('#')
            ? orderRes.data.data.orderNumber
            : `#${orderRes.data.data.orderNumber}`;
        }
      }
    } catch (e) {
      console.warn('Backend order creation sync warning:', e);
    }

    // 2. Post to /hotel/kot with branchId
    try {
      const targetOrdNum = Number(createdOrderId);
      const kotRes = await apiClient.post('/hotel/kot', {
        branchId: bId,
        orderId: !isNaN(targetOrdNum) ? targetOrdNum : null,
        instructions: `Table No: ${tableNumber} - ${customerName.trim() || 'Guest'}`,
      });
      if (kotRes.data?.data?.kotNumber) {
        createdKotNumber = kotRes.data.data.kotNumber;
      }
    } catch {}

    // 3. Mark table occupied
    if (backendTableId) {
      apiClient.patch(`/hotel/tables/${backendTableId}/status`, { status: 'OCCUPIED' }).catch(() => {});
    }

    const newOrder: ActiveOrder = {
      id: createdOrderId,
      orderNumber: createdOrderNumber,
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: customerName.trim() || 'Guest',
      tableNumber,
      items,
      itemsCount: items.length,
      subtotal: rawSubtotal,
      cgst: Math.round(tax / 2),
      sgst: Math.round(tax / 2),
      taxAmount: tax,
      discountAmount: 0,
      total,
      status: 'Active Orders',
      branchId: bId,
    };

    const newKot: KOTTicket = {
      id: `#${createdKotNumber}`,
      orderId: createdOrderId,
      tableNumber,
      guestName: customerName.trim() || 'Guest',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items,
      totalQty: items.reduce((acc, i) => acc + i.quantity, 0),
      kitchenStatus: 'New / Sent',
      billingStatus: 'Not Billed',
      note: `Table No: ${tableNumber} - ${customerName.trim() || 'Guest'}`,
      branchId: bId,
    };

    // Update branch local maps
    branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
      t.tableNumber.toLowerCase() === tableNumber.toLowerCase()
        ? {
            ...t,
            status: 'OCCUPIED' as const,
            guestName: customerName.trim() || 'Guest',
            guestCount,
            currentOrderId: createdOrderId,
            activeBillAmount: total,
            activeItemsCount: items.length,
            seatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : t
    );

    branchOrdersMap[bId] = [newOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== createdOrderId)];


    branchKotsMap[bId] = [newKot, ...(branchKotsMap[bId] || []).filter((k) => k.id !== newKot.id)];



    notifyListeners();
    setTimeout(() => {
      restaurantStore.getTables(bId).catch(() => {});
      restaurantStore.getOrders(bId).catch(() => {});
      restaurantStore.getKOTs(bId).catch(() => {});
    }, 150);
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
        apiClient.patch(`/hotel/kot/${rawNum}/status`, { status: backendStatus }).catch(() => {});
      }
    }

    notifyListeners();
    return updatedKot;
  },

  // 6. MARK ORDER FOR BILLING
  async markOrderForBilling(orderId: string, branchId?: number): Promise<void> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;
    let targetTable: string = '';

    branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) => {
      if (o.id === orderId) {
        targetTable = o.tableNumber;
        return { ...o, status: 'BILL GENERATED' as const };
      }
      return o;
    });

    if (targetTable) {
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase() === targetTable.toLowerCase()
          ? { ...t, status: 'BILLING' as const }
          : t
      );
    }

    const numOrderId = Number(orderId);
    if (!isNaN(numOrderId) && numOrderId < 1000000000) {
      apiClient.patch(`/hotel/orders/${numOrderId}/status`, { status: 'BILL_REQUESTED' }).catch(() => {});
    }

    notifyListeners();
  },

  // 7. FINALIZE BILL & PAY (Writes to backend for specific branchId)
  async finalizeBillAndPay(
    orderId: string,
    paymentMode: 'CASH' | 'UPI' | 'CARD',
    discountAmount: number = 0,
    branchId?: number
  ): Promise<{ invoiceNumber: string; paidOrder: ActiveOrder; paymentRecord: PaymentRecord }> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    let invoiceNumber = `INV-${Date.now()}`;
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

    branchOrdersMap[bId] = (branchOrdersMap[bId] || []).map((o) => {
      if (o.id === orderId) {
        targetTable = o.tableNumber;
        const newTotal = Math.max(0, o.total - discountAmount);
        updatedOrder = {
          ...o,
          status: 'PAID' as const,
          discountAmount,
          total: newTotal,
          paymentMode,
          invoiceNumber,
        };
        return updatedOrder;
      }
      return o;
    });

    if (!updatedOrder) {
      const found = (branchOrdersMap[bId] || [])[0];


      targetTable = found?.tableNumber || 'Table 01';
      const newTotal = Math.max(0, (found?.total || 1470) - discountAmount);
      updatedOrder = {
        ...found,
        status: 'PAID' as const,
        discountAmount,
        total: newTotal,
        paymentMode,
        invoiceNumber,
      };
    }

    // 1. Assign clean, formatted invoice number immediately
    const shortTs = Date.now().toString().slice(-6);
    invoiceNumber = `INV-${now.getFullYear()}-${shortTs}`;
    updatedOrder.invoiceNumber = invoiceNumber;

    // 2. Mark table AVAILABLE immediately in local branch map
    const tableObj = (branchTablesMap[bId] || []).find((t) => t.tableNumber.toLowerCase() === targetTable.toLowerCase());
    const tblNum = tableObj && tableObj.id ? Number(tableObj.id.replace(/\D/g, '')) : null;

    if (targetTable) {
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase() === targetTable.toLowerCase()
          ? {
              ...t,
              status: 'AVAILABLE' as const,
              guestName: undefined,
              guestCount: undefined,
              currentOrderId: undefined,
              activeBillAmount: undefined,
              activeItemsCount: undefined,
              seatedAt: undefined,
            }
          : t
      );
    }

    // 3. Record payment immediately in local branch map
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

    // Persist immediately to AsyncStorage for instant recovery
    AsyncStorage.setItem(`@RESTAURANT_ORDERS_B${bId}`, JSON.stringify(branchOrdersMap[bId])).catch(() => {});
    AsyncStorage.setItem(`@RESTAURANT_TABLES_B${bId}`, JSON.stringify(branchTablesMap[bId])).catch(() => {});
    AsyncStorage.setItem(`@RESTAURANT_PAYMENTS_B${bId}`, JSON.stringify(branchPaymentsMap[bId])).catch(() => {});

    // Notify listeners so UI updates in <10ms!
    notifyListeners();

    // 4. Background concurrent persistence to Spring Boot + SQL Server
    const targetOrderIdNum = Number(orderId);
    const validOrderId = !isNaN(targetOrderIdNum) && targetOrderIdNum < 1000000000 ? targetOrderIdNum : null;

    (async () => {
      try {
        await ensureBackendToken();
        const invRes = await apiClient.post('/hotel/invoices', {
          branchId: bId,
          orderId: validOrderId,
          dueDate: isoDate,
          discountAmount,
          cgstRate: 2.5,
          sgstRate: 2.5,
          igstRate: 0,
          invoiceNumber,
          items: (updatedOrder.items || []).map((it) => ({
            description: it.name,
            quantity: it.quantity,
            unitPrice: it.price,
            taxRate: 5,
          })),
          notes: `Native Invoice for ${targetTable} - Branch ${bId}`,
        }, { timeout: 4000 });

        const backendInvoiceId = invRes.data?.data?.id;
        if (backendInvoiceId) {
          apiClient.post('/hotel/payments', {
            branchId: bId,
            invoiceId: backendInvoiceId,
            amount: updatedOrder.total,
            paymentMethod: paymentMode,
            transactionRef: refNo,
            paymentDate: isoDate,
            notes: `Payment for ${targetTable} (Branch ${bId})`,
          }, { timeout: 4000 }).catch(() => {});
        }
      } catch (invErr) {
        console.warn('Backend invoice background persistence notice:', invErr);
      }

      if (validOrderId) {
        apiClient.patch(`/hotel/orders/${validOrderId}/status`, { status: 'COMPLETED' }, { timeout: 3000 }).catch(() => {});
      }
      if (tblNum && !isNaN(tblNum) && tblNum > 0) {
        apiClient.patch(`/hotel/tables/${tblNum}/status`, { status: 'AVAILABLE' }, { timeout: 3000 }).catch(() => {});
      }
    })();

    return { invoiceNumber, paidOrder: updatedOrder, paymentRecord: newPaymentRecord };
  },

  // 8. GET PAYMENTS STRICTLY FOR ACTIVE BRANCH
  async getPayments(branchId?: number): Promise<PaymentRecord[]> {
    const bId = branchId !== undefined && !isNaN(Number(branchId)) ? Number(branchId) : currentBranchId;

    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/payments', { params: { branchId: bId } });
      const rawList = res.data?.data || res.data || [];


      if (Array.isArray(rawList)) {
        const backendRecords: PaymentRecord[] = rawList
          .filter((p: any) => !p.branchId || Number(p.branchId) === bId)
          .map((p: any) => ({
            id: `backend-${p.id}`,
            billId: p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : `INV-${p.id}`),
            orderId: p.orderId ? String(p.orderId) : undefined,
            tableName: (p.tableName && p.tableName.trim()) || (p.tableNumber && p.tableNumber.trim()) || (p.tableId ? `Table ${p.tableId}` : 'Dining Table'),
            customerName: (p.customerName && p.customerName.trim()) || 'Guest',
            amount: Number(p.amount) || 0,
            mode: (p.paymentMethod === 'CARD' ? 'CARD' : p.paymentMethod === 'CASH' ? 'CASH' : 'UPI') as 'UPI' | 'CASH' | 'CARD',
            time: p.paymentDate ? `${p.paymentDate}` : 'Today',
            date: p.paymentDate || 'Today',
            status: 'SETTLED' as const,
            referenceNo: p.transactionRef || undefined,
            branchId: bId,
          }));

        const currentLocal = branchPaymentsMap[bId] || BRANCH_PAYMENTS_INITIAL[bId] || [];


        const localOnly = currentLocal.filter((lp) => !backendRecords.some((bp) => bp.billId === lp.billId));
        const combined = [...localOnly, ...backendRecords];


        branchPaymentsMap[bId] = combined;
        return [...combined];


      }
    } catch (err) {
      console.log(`[Store] Backend payments fetch offline for Branch ${bId}, using local branch cache`);
    }

    if (!branchPaymentsMap[bId]) {
      branchPaymentsMap[bId] = BRANCH_PAYMENTS_INITIAL[bId] || [];


    }
    return [...(branchPaymentsMap[bId] || [])];


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

  // 10. GET ORDER BY ID OR TABLE
  async getOrderByIdOrTable(orderId?: string, tableName?: string): Promise<ActiveOrder | null> {
    const allOrders = Object.values(branchOrdersMap).flat();
    if (orderId) {
      const byId = allOrders.find((o) => o.id === orderId);
      if (byId) return byId;
    }
    if (tableName) {
      const byTable = allOrders.find(
        (o) => o.tableNumber.toLowerCase() === tableName.toLowerCase() && o.status !== 'PAID'
      );
      if (byTable) return byTable;
    }
    return null;
  },

  // 11. UPDATE ORDER ITEMS IN BILL
  async updateOrderItems(orderId: string, items: KOTOrderItem[]): Promise<ActiveOrder | null> {
    for (const bId of Object.keys(branchOrdersMap)) {
      const numId = Number(bId);
      const orders = branchOrdersMap[numId] || [];

      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        const current = orders[idx];

        const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const taxAmount = Math.round(subtotal * 0.05);
        const cgst = Number((taxAmount / 2).toFixed(2));
        const sgst = Number((taxAmount / 2).toFixed(2));
        const total = Math.max(0, subtotal + taxAmount - current.discountAmount);
        const updated: ActiveOrder = {
          ...current,
          items: [...items],
          itemsCount: items.reduce((sum, it) => sum + it.quantity, 0),
          subtotal,
          taxAmount,
          cgst,
          sgst,
          total,
        };
        orders[idx] = updated;
        branchOrdersMap[numId] = [...orders];

        notifyListeners();

        // Also sync update with backend database if orderId is numeric
        const numOrderId = Number(orderId);
        if (!isNaN(numOrderId) && numOrderId < 1000000000) {
          (async () => {
            try {
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
            } catch (e) {
              console.warn('Backend updateOrderItems sync warning:', e);
            }
          })();
        }

        return updated;
      }
    }
    return null;
  },

  // 12. CREATE QUICK WALK-IN BILL (Saves to backend database with real order ID)
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

    const currentBranchTables = branchTablesMap[bId] || [];
    const tableObj = currentBranchTables.find((t) => t.tableNumber.toLowerCase() === (tableName || 'Table 01').toLowerCase());
    let backendTableId: number | null = null;
    if (tableObj && tableObj.id) {
      const num = Number(tableObj.id.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0) backendTableId = num;
    }

    let createdOrderId = `ord-${Date.now()}`;
    let createdOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    try {
      await ensureBackendToken();
      const orderRes = await apiClient.post('/hotel/orders', {
        branchId: bId,
        tableId: backendTableId || 1,
        guestName: (guestName && guestName.trim()) || 'Walk-in Guest',
        guestCount: 2,
        discount: 0,
        taxRate: 5,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      });

      if (orderRes.data?.data?.id) {
        createdOrderId = String(orderRes.data.data.id);
        if (orderRes.data.data.orderNumber) {
          createdOrderNumber = orderRes.data.data.orderNumber.startsWith('#')
            ? orderRes.data.data.orderNumber
            : `#${orderRes.data.data.orderNumber}`;
        }
      }

      // Create KOT in backend
      const targetOrdNum = Number(createdOrderId);
      if (!isNaN(targetOrdNum)) {
        apiClient.post('/hotel/kot', {
          branchId: bId,
          orderId: targetOrdNum,
          instructions: `Quick Bill: ${tableName || 'Table 01'} - ${guestName || 'Walk-in Guest'}`,
        }).catch(() => {});
      }

      // Mark table occupied in backend
      if (backendTableId) {
        apiClient.patch(`/hotel/tables/${backendTableId}/status`, { status: 'OCCUPIED' }).catch(() => {});
      }
    } catch (e) {
      console.warn('Backend quick bill creation warning, using local fallback:', e);
    }

    const newOrder: ActiveOrder = {
      id: createdOrderId,
      orderNumber: createdOrderNumber,
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: guestName || 'Walk-in Guest',
      tableNumber: tableName || 'Table 01',
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
    };

    branchOrdersMap[bId] = [newOrder, ...(branchOrdersMap[bId] || []).filter((o) => o.id !== createdOrderId)];

    if (tableName) {
      branchTablesMap[bId] = (branchTablesMap[bId] || []).map((t) =>
        t.tableNumber.toLowerCase() === tableName.toLowerCase()
          ? {
              ...t,
              status: 'OCCUPIED' as const,
              guestName: guestName || 'Walk-in Guest',
              guestCount: 2,
              currentOrderId: createdOrderId,
              activeBillAmount: total,
              activeItemsCount: items.length,
              seatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : t
      );
    }

    notifyListeners();
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

// Auto-sync with backend database immediately on load in parallel
(async () => {
  try {
    await ensureBackendToken();
    await Promise.all([
      restaurantStore.getTables(1),
      restaurantStore.getOrders(1),
      restaurantStore.getKOTs(1),
      restaurantStore.getPayments(1),
    ]);
  } catch {}
})();
