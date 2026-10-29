export type BranchId = 'b1' | 'b2' | 'b3' | string;

export interface BranchBillRequest {
  id: string;
  table: string;
  amount: string;
  time: string;
  status: 'Pending' | 'Completed';
  waiter?: string;
  itemCount?: number;
}

export interface BranchTableConfig {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLED' | 'RESERVED';
  activeBillAmount?: number;
  seatedTime?: string;
}

export interface BranchStats {
  todaySales: string;
  todaySalesNum: number;
  todayOrders: number;
  occupiedTables: number;
  totalTables: number;
  availableTables: number;
  staffOnDuty: number;
  totalStaff: number;
  netGst: string;
  pendingSettlement: string;
  averageBillValue: string;
  cashCollection: string;
  upiCollection: string;
  cardCollection: string;
}

export interface BranchConfig {
  id: BranchId;
  code: string;
  name: string;
  nameMr: string;
  nameHi: string;
  type: string;
  typeMr: string;
  typeHi: string;
  address: string;
  addressMr: string;
  addressHi: string;
  phone: string;
  gstin: string;
  manager: string;
  managerPhone: string;
  isActive: boolean;
  color: string;
  stats: BranchStats;
  billRequests: BranchBillRequest[];
  tables: BranchTableConfig[];
  parentBranchId?: number | string | null;
  parentBranchName?: string | null;
}

