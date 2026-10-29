export type PaperSize = '58mm' | '80mm' | 'A4';
export type PrintMethod = 'browser' | 'bluetooth' | 'pdf';

export interface PrintInvoiceItem {
  id?: string | number;
  name: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalPrice: number;
  notes?: string;
}

export interface UniversalInvoicePrintData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  hotelName: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  hotelLogo?: string;
  gstin?: string;
  fssai?: string;

  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;

  tableName?: string;
  orderNumber?: string;
  kotNumber?: string;
  serverName?: string;

  items: PrintInvoiceItem[];

  subtotal: number;
  discountAmount?: number;
  taxableAmount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalTax?: number;
  roundOff?: number;
  grandTotal: number;

  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL' | string;
  paidAmount?: number;
  outstandingAmount?: number;
  transactionRef?: string;

  footerMessage?: string;
  termsAndConditions?: string[];
  notes?: string;
  language?: 'en' | 'mr' | 'hi';
}

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
  rawDevice?: any;
}

export type BluetoothState = 'disconnected' | 'connecting' | 'connected' | 'error';

