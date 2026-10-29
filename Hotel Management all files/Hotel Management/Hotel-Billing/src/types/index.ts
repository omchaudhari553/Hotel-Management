export * from './api';

export interface User {
  id: number;
  businessId: number;
  businessName: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  active: boolean;
  roles: string[];
}

export interface Industry {
  id: number;
  code: 'HOTEL' | 'MESS' | 'CAFE' | string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

export interface Business {
  id: number;
  name: string;
  code: string;
  industryType?: 'HOTEL' | 'MESS' | 'CAFE' | string;
  planId?: string;
  ownerName?: string;
  status?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  currency?: string;
  taxNumber?: string;
  active: boolean;
  enabledIndustries?: Industry[];
}

export interface IndustryContext {
  business: Business;
  selectedIndustry: Industry;
  availableModules: string[];
  dashboardRoute: string;
  message: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  tokenType: string;
  user: User;
  business: Business;
}

/* --- Hotel Types --- */
export interface HotelRoom {
  id: number;
  businessId: number;
  roomNumber: string;
  roomType: string;
  floor: string;
  basePricePerNight: number;
  maxOccupancy: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING' | string;
  amenities: string;
}

export interface HotelGuest {
  id: number;
  businessId: number;
  fullName: string;
  email: string;
  phone: string;
  idProofType: string;
  idProofNumber: string;
  address: string;
}

export interface HotelServiceItem {
  id: number;
  businessId: number;
  bookingId: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serviceTime: string;
  status: string;
}

export interface HotelBooking {
  id: number;
  businessId: number;
  roomId: number;
  roomNumber: string;
  roomType: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  totalNights: number;
  totalAmount: number;
  bookingStatus: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | string;
  notes?: string;
  services: HotelServiceItem[];
}

/* --- Mess Types --- */
export interface MessPlan {
  id: number;
  businessId: number;
  planName: string;
  planType: 'MONTHLY' | 'DAILY' | 'TIFFIN_ONLY' | string;
  mealsIncluded: string;
  price: number;
  validityDays: number;
  totalMealsCount: number;
  description: string;
  active: boolean;
}

export interface MessCustomer {
  id: number;
  businessId: number;
  planId: number;
  planName: string;
  fullName: string;
  phone: string;
  email: string;
  joinDate: string;
  endDate: string;
  remainingMeals: number;
  tiffinEnabled: boolean;
  deliveryAddress?: string;
  tiffinSlot?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | string;
}

export interface MessMenu {
  id: number;
  businessId: number;
  dayOfWeek: string;
  mealTime: 'BREAKFAST' | 'LUNCH' | 'DINNER' | string;
  itemsDescription: string;
  special: boolean;
}

export interface MessAttendance {
  id: number;
  businessId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  attendanceDate: string;
  mealTime: string;
  status: 'PRESENT' | 'ABSENT' | 'PACKED_TIFFIN' | string;
  createdAt: string;
}

export interface MessOrder {
  id: number;
  businessId: number;
  customerId?: number;
  customerName: string;
  orderType: string;
  deliveryStatus: string;
  totalAmount: number;
  deliveryAddress?: string;
  orderDate: string;
}

/* --- Cafe Types --- */
export interface CafeTable {
  id: number;
  businessId: number;
  tableNumber: string;
  name?: string;
  seatingCapacity: number;
  capacity?: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILLED' | string;
  section: string;
  area?: string;
}

export interface CafeMenuItem {
  id: number;
  businessId?: number;
  categoryName?: string;
  category?: string;
  itemName?: string;
  name?: string;
  description: string;
  price: number;
  vegetarian?: boolean;
  preparationTimeMins?: number;
  available: boolean;
  imageUrl?: string;
  image?: string;
}

export interface CafeOrderItem {
  id: number;
  menuItemId?: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface CafeOrder {
  id: number;
  businessId: number;
  tableId?: number;
  tableNumber?: string;
  orderNumber: string;
  orderType: string;
  status: 'PENDING' | 'PREPARING' | 'SERVED' | 'COMPLETED' | 'CANCELLED' | string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  items: CafeOrderItem[];
  createdAt: string;
}

/* --- Shared Core Types --- */
export interface Customer {
  id: number;
  businessId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number;
  loyaltyPoints: number;
}

export interface Supplier {
  id: number;
  businessId: number;
  name: string;
  company: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  status?: string;
  branchId?: number;
}

export interface Product {
  id: number;
  businessId: number;
  category: string;
  name: string;
  sku: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  active: boolean;
  isLowStock?: boolean;
}

export interface StockMovement {
  id: number;
  businessId: number;
  productId: number;
  productName: string;
  productUnit: string;
  movementType: string;
  quantity: number;
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalPrice: number;
}

export interface Invoice {
  id: number;
  businessId: number;
  industryId?: number;
  industryCode?: string;
  industryName?: string;
  customerId?: number;
  customerName: string;
  guestName?: string;
  invoiceNumber: string;
  subtotal: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  total?: number;
  dueAmount?: number;
  orderId?: number;
  tableNumber?: string;
  tableName?: string;
  invoiceDate?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED' | string;
  paymentMode: string;
  dueDate: string;
  notes?: string;
  items: InvoiceItem[];
  createdAt: string;
}

export interface Payment {
  id: number;
  businessId: number;
  invoiceId?: number;
  invoiceNumber?: string;
  customerId?: number;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDate: string;
  status: string;
  notes?: string;
}

export interface IndustryRevenue {
  industryCode: string;
  industryName: string;
  revenue: number;
  invoiceCount: number;
  percentage: number;
}

export interface TaxFinancialSummary {
  grossRevenue: number;
  totalDiscounts: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercentage: number;
}

export interface PlanRevenueItem {
  planId: number;
  planName: string;
  planType: string;
  subscriberCount: number;
  monthlyPrice: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

export interface DailyAttendanceStat {
  dayOfWeek: string;
  lunchAttendance: number;
  dinnerAttendance: number;
  tiffinDispatches: number;
  totalMeals: number;
}

export interface MessReport {
  totalSubscriptionRevenue: number;
  activeMembers: number;
  mealsServedToday: number;
  totalMealsServedMonth: number;
  tiffinDispatchesCount: number;
  activeTiffinMembers: number;
  attendanceRatePercentage: number;
  totalExpenses: number;
  netProfit: number;
  taxSummary: TaxFinancialSummary;
  planRevenueBreakdown: PlanRevenueItem[];
  attendanceByDay: DailyAttendanceStat[];
}

export interface RoomTypeReportItem {
  roomType: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  basePrice: number;
  revenueGenerated: number;
}

export interface HotelReport {
  totalRoomRevenue: number;
  occupancyRatePercentage: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  guestDiningRevenue: number;
  totalExpenses: number;
  netProfit: number;
  taxSummary: TaxFinancialSummary;
  roomTypeBreakdown: RoomTypeReportItem[];
}

export interface TopSellingCafeItem {
  itemId: number;
  itemName: string;
  category: string;
  unitsSold: number;
  unitPrice: number;
  totalRevenue: number;
  marginPercentage: number;
}

export interface CafeReport {
  totalPosSales: number;
  totalOrdersProcessed: number;
  dineInTableOrders: number;
  takeawayCounterOrders: number;
  averageOrderValue: number;
  inventoryConsumptionCost: number;
  totalExpenses: number;
  netProfit: number;
  taxSummary: TaxFinancialSummary;
  topSellingItems: TopSellingCafeItem[];
}

export interface IndustryReportWrapper {
  industryType: 'HOTEL' | 'MESS' | 'CAFE' | string;
  businessName: string;
  messReport?: MessReport;
  hotelReport?: HotelReport;
  cafeReport?: CafeReport;
}

export interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  activeCustomers: number;
  lowStockProductsCount: number;

  totalHotelRooms: number;
  occupiedHotelRooms: number;
  todayHotelBookings: number;
  hotelOccupancyRate: number;

  activeMessSubscribers: number;
  todayMessMealsServed: number;
  todayTiffinsDispatched: number;

  totalCafeTables: number;
  occupiedCafeTables: number;
  todayCafeOrders: number;
  todayCafeSales: number;

  revenueByIndustry: IndustryRevenue[];
}

