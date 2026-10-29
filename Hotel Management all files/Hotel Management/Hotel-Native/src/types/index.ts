export type IndustryType = 'HOTEL' | 'CAFE' | 'MESS';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  branchId?: string | number;
}

export interface Business {
  id: string | number;
  name: string;
  industry: IndustryType;
  address?: string;
  phone?: string;
  gstin?: string;
  currency?: string;
}

export interface TableItem {
  id: string | number;
  tableNumber: string;
  name?: string;
  section: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLED' | 'RESERVED';
  currentOrderId?: string | number;
  activeBillAmount?: number;
  activeItemsCount?: number;
  waiterName?: string;
  seatedAt?: string;
}

export interface MenuItem {
  id: string | number;
  name: string;
  category: string;
  price: number;
  taxRate: number; // e.g. 5, 12, 18
  hsnSacCode?: string;
  available: boolean;
  image?: string;
}

export interface OrderItem {
  id?: string | number;
  menuItemId: string | number;
  name: string;
  quantity: number;
  price: number;
  taxRate: number;
  notes?: string;
}

export interface Order {
  id: string | number;
  orderNumber: string;
  tableId?: string | number;
  tableName?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: 'PLACED' | 'KOT_PRINTED' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  roundOff: number;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  createdAt: string;
}

export interface RoomItem {
  id: string | number;
  roomNumber: string;
  type: 'STANDARD' | 'DELUXE' | 'SUITE' | 'EXECUTIVE';
  floor: number;
  pricePerNight: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
  currentGuestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface KPIStats {
  totalSales: number;
  totalExpenses: number;
  netAmount: number;
  taxAmount: number;
  amountReceived: number;
  pendingAmount: number;
  netFlow: number;
  totalOrders: number;
  activeTables: number;
  occupiedRooms: number;
}

export interface BillingSettingsState {
  taxEnabled: boolean;
  discountEnabled: boolean;
  roundOffEnabled: boolean;
  defaultTaxRate: number;
  currency: string;
  footerNote: string;
}
