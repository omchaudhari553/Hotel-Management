import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  restaurantStore,
  PaymentRecord,
  ActiveOrder,
} from '../../api/restaurantStore';
import apiClient from '../../api/client';
import { useBranch } from '../../context/BranchContext';
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  Search,
  X,
  Printer,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Filter,
  ChevronDown,
  Smartphone,
} from 'lucide-react-native';
import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import { UniversalInvoicePrintData } from '../../types/printing';
import { MobilePrintInvoiceModal } from '../../components/MobilePrintInvoiceModal';
import { downloadAndSharePdf, downloadAndShareCsv } from '../../utils/reportExporter';

const MARATHI_MONTHS = ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'];
const HINDI_MONTHS = ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितं', 'अक्तू', 'नवं', 'दिसं'];
const ENGLISH_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTableDateTime(dateVal?: string | Date, lang: string = 'en', toDevanagariFn?: (v: any) => string): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = d.getDate().toString().padStart(2, '0');
  const monthIdx = d.getMonth();
  const year = d.getFullYear().toString();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours.toString().padStart(2, '0');

  const td = toDevanagariFn || ((v: any) => String(v));

  if (lang === 'mr') {
    return `${td(day)} ${MARATHI_MONTHS[monthIdx]} ${td(year)}, ${td(hoursStr)}:${td(minutes)} ${ampm}`;
  }
  if (lang === 'hi') {
    return `${td(day)} ${HINDI_MONTHS[monthIdx]} ${td(year)}, ${td(hoursStr)}:${td(minutes)} ${ampm}`;
  }
  return `${day} ${ENGLISH_MONTHS[monthIdx]} ${year}, ${hoursStr}:${minutes} ${ampm}`;
}

function formatTimeString(dateVal?: string | Date | number): string {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string' && (dateVal.includes('am') || dateVal.includes('pm') || dateVal.includes('AM') || dateVal.includes('PM'))) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export interface LivePayment {
  id: number | string;
  invoiceId?: number | string;
  invoiceNumber?: string;
  orderId?: string | number;
  orderNumber?: string;
  tableId?: string | number;
  tableName?: string;
  tableNumber?: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDate?: string;
  createdAt?: string;
  status?: string;
  notes?: string;
  itemsSummary?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export interface LiveInvoice {
  id: number | string;
  invoiceNumber: string;
  orderId?: string | number;
  orderNumber?: string;
  tableId?: string | number;
  tableName?: string;
  tableNumber?: string;
  customerName?: string;
  guestName?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  itemsSummary?: string;
  subtotal: number;
  taxAmount: number;
  cgst?: number;
  sgst?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt?: string;
  invoiceDate?: string;
  notes?: string;
}

export interface UnifiedBillItem {
  id: string | number;
  invoiceId?: string | number;
  invoiceNumber: string;
  orderId?: string | number;
  orderNumber: string;
  tableNumber: string;
  tableName: string;
  customerName: string;
  amount: number;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string;
  status: 'PAID' | 'PENDING' | 'DUE';
  dateStr: string;
  timeStr: string;
  transactionRef?: string;
  rawInvoice?: LiveInvoice;
  rawPayment?: LivePayment;
  rawOrder?: ActiveOrder;
  items?: Array<{ name: string; quantity: number; price: number }>;
  itemsSummary?: string;
}

export type DateFilterType = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'All';
export type StatusFilterType = 'ALL' | 'PAID' | 'PENDING';

export const PaymentsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const {
    t,
    language,
    formatNumber,
    toDevanagari,
    translateStatus,
    localizeGuestName,
    formatTableName,
  } = useLanguage();
  const { activeBranch, activeBranchNumId } = useBranch();

  const formatCurrency = useCallback((val?: number | string) => {
    const num = Number(val || 0);
    return `₹ ${toDevanagari(num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;
  }, [toDevanagari]);

  // Data state
  const [invoices, setInvoices] = useState<LiveInvoice[]>([]);
  const [payments, setPayments] = useState<LivePayment[]>([]);
  const [activeStoreOrders, setActiveStoreOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('Today');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [dateFilterModalVisible, setDateFilterModalVisible] = useState(false);
  const [statusFilterModalVisible, setStatusFilterModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Modals state
  const [paymentPrintModalVisible, setPaymentPrintModalVisible] = useState<boolean>(false);
  const [paymentPrintModalData, setPaymentPrintModalData] = useState<UniversalInvoicePrintData | null>(null);

  // View Details Modal state
  const [viewDetailModalVisible, setViewDetailModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    invoiceNumber: string;
    orderNumber: string;
    tableName: string;
    customerName: string;
    dateTime: string;
    paymentMethod: string;
    transactionRef: string;
    status: string;
    amount: number;
    subtotal?: number;
    taxAmount?: number;
    dueAmount?: number;
    items?: Array<{ name: string; quantity: number; price: number }>;
    itemsSummary?: string;
    rawPayment?: LivePayment;
    rawInvoice?: LiveInvoice;
    rawOrder?: ActiveOrder;
  } | null>(null);

  // Settle Payment Modal state
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settleInvoice, setSettleInvoice] = useState<LiveInvoice | null>(null);
  const [settleMethod, setSettleMethod] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleRef, setSettleRef] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Load data matching backend, store payments AND active store orders
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);

    try {
      const bId = activeBranchNumId;
      const [invRes, payRes, storePayments, storeOrders] = await Promise.allSettled([
        apiClient.get('/hotel/invoices', { params: { branchId: bId }, timeout: 4000 }),
        apiClient.get('/hotel/payments', { params: { branchId: bId }, timeout: 4000 }),
        restaurantStore.getPayments(bId),
        restaurantStore.getOrders(bId),
      ]);

      // Collect all orders from store (synced + cached)
      const cachedOrders = restaurantStore.getCachedOrders(bId) || [];
      const orderMap = new Map<string, ActiveOrder>();

      if (storeOrders.status === 'fulfilled' && Array.isArray(storeOrders.value)) {
        storeOrders.value.forEach((o) => {
          if (o && o.id) orderMap.set(String(o.id), o);
        });
      }
      cachedOrders.forEach((co) => {
        if (co && co.id && !orderMap.has(String(co.id))) {
          orderMap.set(String(co.id), co);
        }
      });
      const allOrdersList = Array.from(orderMap.values());
      setActiveStoreOrders(allOrdersList);

      // 1. Process Invoices from backend
      let rawInvoices: any[] = [];
      if (invRes.status === 'fulfilled') {
        rawInvoices = invRes.value.data?.data || invRes.value.data || [];
      }
      const mappedInvoices: LiveInvoice[] = Array.isArray(rawInvoices)
        ? rawInvoices.map((inv: any) => {
            const tot = Number(inv.grandTotal) || Number(inv.totalAmount) || 0;
            const paid = Number(inv.paidAmount) || 0;
            const due = inv.dueAmount !== undefined ? Number(inv.dueAmount) : Math.max(0, tot - paid);
            return {
              id: inv.id,
              invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
              orderId: inv.orderId,
              orderNumber: inv.orderNumber || (inv.orderId ? `ORD-${inv.orderId}` : '-'),
              tableId: inv.tableId,
              tableName: inv.tableName || inv.tableNumber || (inv.tableId ? `Table ${inv.tableId}` : 'Table 01'),
              tableNumber: inv.tableNumber || inv.tableName || (inv.tableId ? `Table ${inv.tableId}` : 'Table 01'),
              customerName: inv.customerName || inv.guestName || 'Walk-in Guest',
              guestName: inv.guestName || inv.customerName || 'Walk-in Guest',
              items: inv.items || [],
              subtotal: Number(inv.subtotal) || Math.round(tot / 1.05),
              taxAmount: Number(inv.taxAmount) || (tot - Math.round(tot / 1.05)),
              cgst: inv.cgst ? Number(inv.cgst) : undefined,
              sgst: inv.sgst ? Number(inv.sgst) : undefined,
              grandTotal: tot,
              paidAmount: paid,
              dueAmount: due,
              status: String(inv.status || (due <= 0 ? 'PAID' : 'UNPAID')).toUpperCase(),
              paymentMethod: inv.paymentMethod || 'UPI',
              createdAt: inv.createdAt || inv.invoiceDate || new Date().toISOString(),
              invoiceDate: inv.invoiceDate || (inv.createdAt ? String(inv.createdAt).split('T')[0] : 'Today'),
              notes: inv.notes || '',
            };
          })
        : [];

      // 2. Process Payments from backend
      let rawPayments: any[] = [];
      if (payRes.status === 'fulfilled') {
        rawPayments = payRes.value.data?.data || payRes.value.data || [];
      }
      const mappedPayments: LivePayment[] = [];
      if (Array.isArray(rawPayments) && rawPayments.length > 0) {
        rawPayments.forEach((p: any) => {
          const inv = mappedInvoices.find(
            (i) => Number(i.id) === Number(p.invoiceId) || (p.invoiceNumber && i.invoiceNumber === p.invoiceNumber)
          );
          mappedPayments.push({
            id: p.id,
            invoiceId: p.invoiceId,
            invoiceNumber: p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : inv ? inv.invoiceNumber : '-'),
            orderId: p.orderId || (inv ? inv.orderId : undefined),
            orderNumber: p.orderNumber || (p.orderId ? `ORD-${p.orderId}` : inv ? inv.orderNumber : '-'),
            tableId: p.tableId || (inv ? inv.tableId : undefined),
            tableName: p.tableName || p.tableNumber || (inv ? inv.tableName : 'Dining Table'),
            tableNumber: p.tableNumber || p.tableName || (inv ? inv.tableNumber : 'Dining Table'),
            customerName: p.customerName || (inv ? inv.customerName : 'Walk-in Guest'),
            amount: Number(p.amount) || 0,
            paymentMethod: p.paymentMethod || 'CASH',
            transactionRef: p.transactionRef || '',
            paymentDate: p.paymentDate || p.createdAt || '',
            createdAt: p.createdAt || p.paymentDate || '',
            status: p.status || 'SUCCESS',
            items: inv?.items,
          });
        });
      }

      // Merge store payments if backend payments returned empty or missing
      if (storePayments.status === 'fulfilled' && Array.isArray(storePayments.value)) {
        storePayments.value.forEach((sp) => {
          const already = mappedPayments.some(
            (mp) =>
              String(mp.id) === String(sp.id) ||
              (sp.billId && (mp.invoiceNumber === sp.billId || mp.invoiceNumber === `#${sp.billId}`))
          );
          if (!already) {
            mappedPayments.push({
              id: sp.id,
              invoiceId: sp.billId,
              invoiceNumber: sp.billId.startsWith('#') ? sp.billId.slice(1) : sp.billId,
              orderId: sp.orderId,
              orderNumber: sp.orderId
                ? String(sp.orderId).startsWith('ORD')
                  ? String(sp.orderId)
                  : `ORD-${sp.orderId}`
                : '-',
              tableName: sp.tableName || 'Table',
              tableNumber: sp.tableName || 'Table',
              customerName: sp.customerName || 'Walk-in Guest',
              amount: Number(sp.amount) || 0,
              paymentMethod: sp.mode || 'UPI',
              transactionRef: sp.referenceNo || '',
              paymentDate: sp.date || sp.time || '',
              createdAt: sp.time || sp.date || '',
              status: sp.status === 'SETTLED' ? 'SUCCESS' : sp.status || 'SUCCESS',
              itemsSummary: sp.itemsSummary,
            });
          }
        });
      }

      setInvoices(mappedInvoices);
      setPayments(mappedPayments);
    } catch (err) {
      console.warn('Error loading payments in PaymentsScreen:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeBranchNumId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Construct Unified Bills list (Invoices + Store Orders + Payments)
  const unifiedBillItems = useMemo(() => {
    const list: UnifiedBillItem[] = [];
    const processedKeys = new Set<string>();

    // 1. Process all Backend Invoices
    invoices.forEach((inv) => {
      const invIdKey = String(inv.id);
      const invNumKey = String(inv.invoiceNumber);
      const ordNumKey = String(inv.orderNumber || '');
      processedKeys.add(invIdKey);
      if (invNumKey) processedKeys.add(invNumKey);
      if (ordNumKey) processedKeys.add(ordNumKey);

      // Find matching payment if recorded
      const matchingPay = payments.find(
        (p) =>
          (p.invoiceId && String(p.invoiceId) === invIdKey) ||
          (p.invoiceNumber && p.invoiceNumber === invNumKey) ||
          (inv.orderNumber && p.orderNumber && inv.orderNumber === p.orderNumber)
      );

      // Also check if order in store is paid
      const matchingStoreOrder = activeStoreOrders.find(
        (o) => String(o.id) === String(inv.orderId) || o.orderNumber === inv.orderNumber
      );

      const isPaid = inv.status === 'PAID' || !!matchingPay || matchingStoreOrder?.status === 'PAID';
      const amount = Number(matchingPay?.amount ?? inv.grandTotal ?? matchingStoreOrder?.total ?? 0);
      const subtotal = Number(inv.subtotal) || Math.round(amount / 1.05);
      const taxAmount = Number(inv.taxAmount) || Math.max(0, amount - subtotal);
      const paymentMethod = (matchingPay?.paymentMethod || matchingStoreOrder?.paymentMode || inv.paymentMethod || 'UPI').toUpperCase();

      let orderNum = inv.orderNumber || (inv.orderId ? `ORD-${inv.orderId}` : '-');
      if (orderNum.startsWith('#')) orderNum = orderNum.slice(1);

      let invoiceNum = inv.invoiceNumber || `INV-${inv.id}`;
      if (invoiceNum.startsWith('#')) invoiceNum = invoiceNum.slice(1);

      list.push({
        id: `inv-${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: invoiceNum,
        orderId: inv.orderId,
        orderNumber: orderNum,
        tableNumber: inv.tableNumber || inv.tableName || 'Table 01',
        tableName: inv.tableName || inv.tableNumber || 'Table 01',
        customerName: inv.customerName || inv.guestName || 'Walk-in Guest',
        amount,
        subtotal,
        taxAmount,
        paymentMethod,
        status: isPaid ? 'PAID' : 'PENDING',
        dateStr: matchingPay?.paymentDate || inv.createdAt || inv.invoiceDate || new Date().toISOString(),
        timeStr: formatTimeString(matchingPay?.paymentDate || matchingPay?.createdAt || inv.createdAt),
        transactionRef: matchingPay?.transactionRef || `INV-${inv.id}`,
        rawInvoice: inv,
        rawPayment: matchingPay,
        rawOrder: matchingStoreOrder,
        items: inv.items || matchingPay?.items,
        itemsSummary: inv.itemsSummary || matchingPay?.itemsSummary,
      });
    });

    // 2. Process Active Store Orders (Billed or Pending in Billing module)
    activeStoreOrders.forEach((so) => {
      const orderIdStr = String(so.id);
      const orderNumStr = String(so.orderNumber || '');
      const invNumStr = String(so.invoiceNumber || '');

      if (
        processedKeys.has(orderIdStr) ||
        (orderNumStr && processedKeys.has(orderNumStr)) ||
        (invNumStr && processedKeys.has(invNumStr))
      ) {
        return; // Already included with backend invoice
      }

      processedKeys.add(orderIdStr);
      if (orderNumStr) processedKeys.add(orderNumStr);
      if (invNumStr) processedKeys.add(invNumStr);

      const isPaid = so.status === 'PAID';
      const tot = Number(so.total) || Number(so.subtotal) || 0;
      const sub = Number(so.subtotal) || Math.round(tot / 1.05);
      const tax = Number(so.taxAmount) || Math.max(0, tot - sub);
      const meth = (so.paymentMode || 'CASH').toUpperCase();

      let orderNum = so.orderNumber || `ORD-${so.id.slice(-6).toUpperCase()}`;
      if (orderNum.startsWith('#')) orderNum = orderNum.slice(1);

      let invoiceNum = so.invoiceNumber || `INV-${so.id.slice(-6).toUpperCase()}`;
      if (invoiceNum.startsWith('#')) invoiceNum = invoiceNum.slice(1);

      const synthesizedInvoice: LiveInvoice = {
        id: so.id,
        invoiceNumber: invoiceNum,
        orderId: so.id,
        orderNumber: orderNum,
        tableNumber: so.tableNumber || 'Table 01',
        tableName: so.tableNumber || 'Table 01',
        customerName: so.customer || 'Walk-in Guest',
        guestName: so.customer || 'Walk-in Guest',
        items: (so.items || []).map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
        subtotal: sub,
        taxAmount: tax,
        cgst: so.cgst,
        sgst: so.sgst,
        grandTotal: tot,
        paidAmount: isPaid ? tot : 0,
        dueAmount: isPaid ? 0 : tot,
        status: isPaid ? 'PAID' : 'UNPAID',
        paymentMethod: meth,
        createdAt: so.date || new Date().toISOString(),
        invoiceDate: so.date || 'Today',
      };

      list.push({
        id: `store-ord-${so.id}`,
        invoiceId: so.id,
        invoiceNumber: invoiceNum,
        orderId: so.id,
        orderNumber: orderNum,
        tableNumber: so.tableNumber || 'Table 01',
        tableName: so.tableNumber || 'Table 01',
        customerName: so.customer || 'Walk-in Guest',
        amount: tot,
        subtotal: sub,
        taxAmount: tax,
        paymentMethod: meth,
        status: isPaid ? 'PAID' : 'PENDING',
        dateStr: so.date || new Date().toISOString(),
        timeStr: formatTimeString(so.date || so.createdAtMs),
        transactionRef: `ORD-${so.id.slice(-6)}`,
        rawInvoice: synthesizedInvoice,
        rawOrder: so,
        items: (so.items || []).map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
      });
    });

    // 3. Process Payments that were not linked above
    payments.forEach((p) => {
      const pInvId = p.invoiceId ? String(p.invoiceId) : '';
      const pInvNum = p.invoiceNumber ? String(p.invoiceNumber) : '';
      const pOrdNum = p.orderNumber ? String(p.orderNumber) : '';

      if (
        (pInvId && processedKeys.has(pInvId)) ||
        (pInvNum && processedKeys.has(pInvNum)) ||
        (pOrdNum && processedKeys.has(pOrdNum))
      ) {
        return; // Already accounted for
      }

      const amount = Number(p.amount) || 0;
      const subtotal = Math.round(amount / 1.05);
      const taxAmount = Math.max(0, amount - subtotal);

      let orderNum = p.orderNumber || (p.orderId ? `ORD-${p.orderId}` : '-');
      if (orderNum.startsWith('#')) orderNum = orderNum.slice(1);

      let invoiceNum = p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : `PAY-${p.id}`);
      if (invoiceNum.startsWith('#')) invoiceNum = invoiceNum.slice(1);

      list.push({
        id: `pay-${p.id}`,
        invoiceId: p.invoiceId,
        invoiceNumber: invoiceNum,
        orderId: p.orderId,
        orderNumber: orderNum,
        tableNumber: p.tableNumber || p.tableName || 'Table 01',
        tableName: p.tableName || p.tableNumber || 'Table 01',
        customerName: p.customerName || 'Walk-in Guest',
        amount,
        subtotal,
        taxAmount,
        paymentMethod: (p.paymentMethod || 'UPI').toUpperCase(),
        status: 'PAID',
        dateStr: p.paymentDate || p.createdAt || new Date().toISOString(),
        timeStr: formatTimeString(p.paymentDate || p.createdAt),
        transactionRef: p.transactionRef || `TXN-${p.id}`,
        rawPayment: p,
        items: p.items,
        itemsSummary: p.itemsSummary,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => {
      const tA = new Date(a.dateStr).getTime() || 0;
      const tB = new Date(b.dateStr).getTime() || 0;
      return tB - tA;
    });
  }, [invoices, activeStoreOrders, payments]);

  // Date Filtering helper
  const matchesDateFilter = useCallback((dateStr: string, filter: DateFilterType) => {
    if (filter === 'All') return true;
    if (!dateStr || dateStr === 'Today') return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (filter === 'Today') {
      return isSameDay(d, now);
    }
    if (filter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return isSameDay(d, yesterday);
    }
    if (filter === 'This Week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (filter === 'This Month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  }, []);

  // Filtered by date
  const dateFilteredItems = useMemo(() => {
    return unifiedBillItems.filter((it) => matchesDateFilter(it.dateStr, dateFilter));
  }, [unifiedBillItems, dateFilter, matchesDateFilter]);

  // KPI Statistics matching screenshot
  const kpiStats = useMemo(() => {
    let collected = 0;
    let cash = 0;
    let upi = 0;
    let pending = 0;

    dateFilteredItems.forEach((it) => {
      if (it.status === 'PAID') {
        collected += it.amount;
        const meth = it.paymentMethod.toUpperCase();
        if (meth === 'CASH') {
          cash += it.amount;
        } else if (meth === 'UPI') {
          upi += it.amount;
        }
      } else {
        pending += 1;
      }
    });

    return { collected, cash, upi, pending };
  }, [dateFilteredItems]);

  // Filtered by status and search query
  const displayedItems = useMemo(() => {
    let list = dateFilteredItems;

    if (statusFilter === 'PAID') {
      list = list.filter((it) => it.status === 'PAID');
    } else if (statusFilter === 'PENDING') {
      list = list.filter((it) => it.status === 'PENDING');
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        const inv = it.invoiceNumber.toLowerCase();
        const ord = it.orderNumber.toLowerCase();
        const tbl = (it.tableName || it.tableNumber || '').toLowerCase();
        const cust = (it.customerName || '').toLowerCase();
        const meth = (it.paymentMethod || '').toLowerCase();
        const txn = (it.transactionRef || '').toLowerCase();
        return (
          inv.includes(q) ||
          ord.includes(q) ||
          tbl.includes(q) ||
          cust.includes(q) ||
          meth.includes(q) ||
          txn.includes(q)
        );
      });
    }

    return list;
  }, [dateFilteredItems, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedItems.slice(start, start + itemsPerPage);
  }, [displayedItems, currentPage]);

  // Action: Print Receipt
  const handlePrintPayment = (pay: LivePayment) => {
    const tot = Number(pay.amount || 0);
    const sub = Math.round(tot / 1.05);
    const taxHalf = Number(((tot - sub) / 2).toFixed(2));
    const rawSummary =
      pay.itemsSummary ||
      (pay.items && pay.items.length > 0
        ? pay.items.map((i) => `${i.name} x${i.quantity}`).join(', ')
        : 'Dining Order Items');
    const parts = rawSummary.split(',').filter(Boolean);
    const eachPrice = Math.round(sub / Math.max(1, parts.length));

    const uData: UniversalInvoicePrintData = {
      invoiceNumber: pay.invoiceNumber || `PAY-${pay.id}`,
      invoiceDate: pay.paymentDate ? String(pay.paymentDate).split('T')[0] : new Date().toISOString().split('T')[0],
      hotelName: activeBranch?.name ? `AJALKAR HOTEL - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: activeBranch?.address || 'Hotel Premises, Pune, Maharashtra - 411004',
      hotelPhone: activeBranch?.phone || '+91 98765 43210',
      gstin: activeBranch?.gstin || '27AAACA9999P1Z1',
      fssai: '11521034000123',
      customerName: pay.customerName || 'Walk-in Guest',
      tableName: pay.tableName || pay.tableNumber || 'Dining Table',
      orderNumber: pay.orderNumber ? String(pay.orderNumber) : pay.orderId ? `ORD-${pay.orderId}` : '',
      language: (language as any) || 'en',
      transactionRef: pay.transactionRef || `TXN-${pay.id}`,
      items:
        pay.items && pay.items.length > 0
          ? pay.items.map((it, idx) => ({
              id: idx + 1,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.price,
              totalPrice: it.price * it.quantity,
            }))
          : parts.map((name, idx) => ({
              id: idx + 1,
              name: name.trim(),
              quantity: 1,
              unitPrice: eachPrice,
              totalPrice: eachPrice,
            })),
      subtotal: sub,
      cgstRate: 2.5,
      cgstAmount: taxHalf,
      sgstRate: 2.5,
      sgstAmount: taxHalf,
      totalTax: Number((taxHalf * 2).toFixed(2)),
      grandTotal: tot,
      paymentMethod: pay.paymentMethod || 'UPI',
      paymentStatus: 'PAID',
      footerMessage: 'Thank you for your patronage! Visit again.',
    };

    setPaymentPrintModalData(uData);
    setPaymentPrintModalVisible(true);
  };

  const handlePrintInvoice = (inv: LiveInvoice) => {
    const tot = Number(inv.grandTotal || 0);
    const sub = Number(inv.subtotal) || Math.round(tot / 1.05);
    const totalTax = Number(inv.taxAmount) || tot - sub;
    const taxHalf = Number((totalTax / 2).toFixed(2));

    const uData: UniversalInvoicePrintData = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate:
        inv.invoiceDate ||
        (inv.createdAt ? String(inv.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]),
      hotelName: activeBranch?.name ? `AJALKAR HOTEL - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: activeBranch?.address || 'Hotel Premises, Pune, Maharashtra - 411004',
      hotelPhone: activeBranch?.phone || '+91 98765 43210',
      gstin: activeBranch?.gstin || '27AAACA9999P1Z1',
      fssai: '11521034000123',
      customerName: inv.customerName || inv.guestName || 'Walk-in Guest',
      tableName: inv.tableName || inv.tableNumber || 'Dining Table',
      orderNumber: inv.orderNumber ? String(inv.orderNumber) : inv.orderId ? `ORD-${inv.orderId}` : '',
      language: (language as any) || 'en',
      items:
        inv.items && inv.items.length > 0
          ? inv.items.map((it, idx) => ({
              id: idx + 1,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.price,
              totalPrice: it.price * it.quantity,
            }))
          : [{ id: 1, name: 'Dining Order Items', quantity: 1, unitPrice: sub, totalPrice: sub }],
      subtotal: sub,
      cgstRate: 2.5,
      cgstAmount: taxHalf,
      sgstRate: 2.5,
      sgstAmount: taxHalf,
      totalTax: totalTax,
      grandTotal: tot,
      paymentMethod: inv.paymentMethod || 'UPI',
      paymentStatus: inv.status === 'PAID' ? 'PAID' : 'DUE',
      footerMessage: 'Thank you for your patronage! Visit again.',
    };

    setPaymentPrintModalData(uData);
    setPaymentPrintModalVisible(true);
  };

  // Action: View Detail Modal
  const handleViewPayment = (p: LivePayment) => {
    setSelectedDetail({
      title: t('paymentReceipt', 'Payment Receipt'),
      invoiceNumber: p.invoiceNumber || '-',
      orderNumber: p.orderNumber || (p.orderId ? `ORD-${p.orderId}` : '-'),
      tableName: p.tableName || p.tableNumber || 'Dining Table',
      customerName: p.customerName || 'Walk-in Guest',
      dateTime: formatTableDateTime(p.paymentDate || p.createdAt, language, toDevanagari),
      paymentMethod: p.paymentMethod || 'UPI',
      transactionRef: p.transactionRef || `TXN-${p.id}`,
      status: p.status || 'SUCCESS',
      amount: p.amount,
      subtotal: Math.round(p.amount / 1.05),
      taxAmount: Number((p.amount - Math.round(p.amount / 1.05)).toFixed(2)),
      items: p.items,
      itemsSummary: p.itemsSummary,
      rawPayment: p,
    });
    setViewDetailModalVisible(true);
  };

  const handleViewInvoice = (inv: LiveInvoice) => {
    setSelectedDetail({
      title: t('invoiceDetails', 'Invoice Details'),
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber || (inv.orderId ? `ORD-${inv.orderId}` : '-'),
      tableName: inv.tableName || inv.tableNumber || 'Dining Table',
      customerName: inv.customerName || inv.guestName || 'Walk-in Guest',
      dateTime: formatTableDateTime(inv.invoiceDate || inv.createdAt, language, toDevanagari),
      paymentMethod: inv.paymentMethod || 'UPI',
      transactionRef: `INV-${inv.id}`,
      status: inv.status,
      amount: inv.grandTotal,
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      dueAmount: inv.dueAmount,
      items: inv.items,
      itemsSummary: inv.itemsSummary,
      rawInvoice: inv,
    });
    setViewDetailModalVisible(true);
  };

  // Card click / Action Receipt click
  const handleActionReceipt = (item: UnifiedBillItem) => {
    if (item.status === 'PENDING') {
      if (item.rawInvoice) {
        openSettleModal(item.rawInvoice);
      } else {
        Alert.alert(t('billPending', 'Bill Pending'), t('settleBillPrompt', 'This bill is awaiting payment settlement.'));
      }
      return;
    }

    if (item.rawPayment) {
      handlePrintPayment(item.rawPayment);
      return;
    }

    if (item.rawInvoice) {
      handlePrintInvoice(item.rawInvoice);
      return;
    }

    // Direct fallback
    const tot = item.amount;
    const sub = item.subtotal;
    const taxHalf = Number((item.taxAmount / 2).toFixed(2));
    const uData: UniversalInvoicePrintData = {
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.dateStr ? item.dateStr.split('T')[0] : new Date().toISOString().split('T')[0],
      hotelName: activeBranch?.name ? `AJALKAR HOTEL - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: activeBranch?.address || 'Hotel Premises, Pune, Maharashtra - 411004',
      hotelPhone: activeBranch?.phone || '+91 98765 43210',
      gstin: activeBranch?.gstin || '27AAACA9999P1Z1',
      fssai: '11521034000123',
      customerName: item.customerName,
      tableName: item.tableName || item.tableNumber,
      orderNumber: item.orderNumber,
      language: (language as any) || 'en',
      transactionRef: item.transactionRef || `TXN-${item.id}`,
      items:
        item.items && item.items.length > 0
          ? item.items.map((it, idx) => ({
              id: idx + 1,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.price,
              totalPrice: it.price * it.quantity,
            }))
          : [{ id: 1, name: 'Dining Order Items', quantity: 1, unitPrice: sub, totalPrice: sub }],
      subtotal: sub,
      cgstRate: 2.5,
      cgstAmount: taxHalf,
      sgstRate: 2.5,
      sgstAmount: taxHalf,
      totalTax: item.taxAmount,
      grandTotal: tot,
      paymentMethod: item.paymentMethod,
      paymentStatus: 'PAID',
      footerMessage: 'Thank you for your patronage! Visit again.',
    };
    setPaymentPrintModalData(uData);
    setPaymentPrintModalVisible(true);
  };

  const handleCardPress = (item: UnifiedBillItem) => {
    if (item.rawPayment) {
      handleViewPayment(item.rawPayment);
      return;
    }
    if (item.rawInvoice) {
      handleViewInvoice(item.rawInvoice);
      return;
    }
    setSelectedDetail({
      title: item.status === 'PAID' ? t('paymentReceipt', 'Payment Receipt') : t('invoiceDetails', 'Invoice Details'),
      invoiceNumber: item.invoiceNumber,
      orderNumber: item.orderNumber,
      tableName: item.tableName || item.tableNumber,
      customerName: item.customerName,
      dateTime: formatTableDateTime(item.dateStr, language, toDevanagari),
      paymentMethod: item.paymentMethod,
      transactionRef: item.transactionRef || '-',
      status: item.status,
      amount: item.amount,
      subtotal: item.subtotal,
      taxAmount: item.taxAmount,
      items: item.items,
      itemsSummary: item.itemsSummary,
    });
    setViewDetailModalVisible(true);
  };

  // Action handlers: Settle
  const openSettleModal = (inv: LiveInvoice) => {
    setSettleInvoice(inv);
    const due = Math.max(0, inv.dueAmount !== undefined ? inv.dueAmount : inv.grandTotal);
    setSettleAmount(String(due));
    setCashReceived(String(due));
    setSettleMethod('UPI');
    setSettleRef(`TXN-INV-${inv.id}`);
    setSettleModalVisible(true);
  };

  const handleConfirmSettle = async () => {
    if (!settleInvoice) return;
    const num = parseFloat(settleAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(t('invalidAmount', 'Invalid Amount'), t('enterValidAmount', 'Please enter a valid payment amount.'));
      return;
    }

    setSubmittingSettle(true);
    try {
      const txnRef = settleRef.trim() || `TXN-INV-${settleInvoice.id}`;
      // 1. Post to backend
      try {
        await apiClient.post('/hotel/payments', {
          invoiceId: settleInvoice.id,
          amount: num,
          paymentMethod: settleMethod,
          transactionRef: txnRef,
          paymentDate: new Date().toISOString().split('T')[0],
          notes: `Settlement for Table ${settleInvoice.tableName || settleInvoice.tableNumber} - ${settleInvoice.customerName}`,
        });
      } catch (apiErr) {
        console.warn('Backend payment record fallback to store:', apiErr);
      }

      // 2. Finalize in restaurantStore so active order becomes PAID
      try {
        const orderIdToSettle = String(settleInvoice.orderId || settleInvoice.id);
        await restaurantStore.finalizeBillAndPay(
          orderIdToSettle,
          settleMethod,
          0,
          activeBranchNumId
        );
      } catch (storeErr) {
        // Fallback to local store recordPayment
        await restaurantStore.recordPayment({
          tableName: settleInvoice.tableName || settleInvoice.tableNumber || 'Table 01',
          customerName: settleInvoice.customerName || settleInvoice.guestName || 'Guest',
          amount: num,
          mode: settleMethod,
          branchId: activeBranchNumId,
        });
      }

      setSettleModalVisible(false);
      setSettleInvoice(null);
      await loadData(true);
      Alert.alert(
        t('success', 'Success'),
        `₹ ${toDevanagari(num)} ${t('paymentRecorded', 'payment settled and recorded successfully')} (${settleMethod})!`
      );
    } catch (e) {
      Alert.alert(t('error', 'Error'), t('paymentSaveError', 'Error recording payment.'));
    } finally {
      setSubmittingSettle(false);
    }
  };

  // Action: Export Report
  const handleExportReport = async () => {
    try {
      const dateTag = dateFilter.replace(/\s+/g, '_');
      const reportTitle = `Billing_Payments_${dateTag}_${new Date().toISOString().split('T')[0]}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <title>Billing & Payments Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1C1917; }
            .header { text-align: center; border-bottom: 2px solid #8B3E16; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #8B3E16; margin: 0; }
            .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
            .stats-grid { display: flex; gap: 12px; margin-bottom: 20px; }
            .stat-card { flex: 1; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; background: #F8FAFC; text-align: center; }
            .stat-label { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; }
            .stat-val { font-size: 17px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
            th { background: #F1F5F9; color: #475569; padding: 8px 10px; text-align: left; border-bottom: 2px solid #CBD5E1; }
            td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
            .paid { color: #16A34A; font-weight: bold; }
            .pending { color: #B45309; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${activeBranch?.name ? `AJALKAR HOTEL - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT'}</div>
            <div class="subtitle">Billing & Payments Report • Filter: ${dateFilter} • Generated: ${new Date().toLocaleString()}</div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Collected</div>
              <div class="stat-val" style="color: #1C1917;">₹${kpiStats.collected.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Cash</div>
              <div class="stat-val" style="color: #16A34A;">₹${kpiStats.cash.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">UPI</div>
              <div class="stat-val" style="color: #2563EB;">₹${kpiStats.upi.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Pending</div>
              <div class="stat-val" style="color: #B45309;">${kpiStats.pending}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order #</th>
                <th>Table</th>
                <th>Customer</th>
                <th>Time</th>
                <th>Mode</th>
                <th>Status</th>
                <th class="text-right">GST</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${displayedItems.map((it) => `
                <tr>
                  <td><b>#${it.invoiceNumber}</b></td>
                  <td>${it.orderNumber}</td>
                  <td>${it.tableName || it.tableNumber}</td>
                  <td>${it.customerName}</td>
                  <td>${it.timeStr}</td>
                  <td>${it.paymentMethod}</td>
                  <td class="${it.status === 'PAID' ? 'paid' : 'pending'}">${it.status}</td>
                  <td class="text-right">₹${it.taxAmount}</td>
                  <td class="text-right"><b>₹${it.amount.toLocaleString('en-IN')}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      Alert.alert(
        t('exportReport', 'Export Report'),
        t('chooseExportFormat', 'Choose report format:'),
        [
          {
            text: 'PDF Report',
            onPress: async () => {
              await downloadAndSharePdf(reportTitle, html);
            },
          },
          {
            text: 'CSV Excel',
            onPress: async () => {
              const csvRows = [
                ['Invoice No', 'Order No', 'Table', 'Customer', 'Date/Time', 'Payment Mode', 'Status', 'GST', 'Amount'].join(','),
                ...displayedItems.map((it) =>
                  [
                    `"${it.invoiceNumber}"`,
                    `"${it.orderNumber}"`,
                    `"${it.tableName || it.tableNumber}"`,
                    `"${it.customerName}"`,
                    `"${it.dateStr || it.timeStr}"`,
                    `"${it.paymentMethod}"`,
                    `"${it.status}"`,
                    it.taxAmount,
                    it.amount,
                  ].join(',')
                ),
              ].join('\n');
              await downloadAndShareCsv(reportTitle, csvRows);
            },
          },
          { text: t('cancel', 'Cancel'), style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('error', 'Error'), err?.message || 'Could not export report.');
    }
  };

  const getDateFilterLabel = (filter: DateFilterType) => {
    switch (filter) {
      case 'Today':
        return t('today', 'Today');
      case 'Yesterday':
        return t('yesterday', 'Yesterday');
      case 'This Week':
        return t('thisWeek', 'This Week');
      case 'This Month':
        return t('thisMonth', 'This Month');
      case 'All':
        return t('allTime', 'All Time');
      default:
        return filter;
    }
  };

  const getStatusFilterLabel = (filter: StatusFilterType) => {
    switch (filter) {
      case 'ALL':
        return t('allBills', 'All Bills');
      case 'PAID':
        return t('paid', 'Paid');
      case 'PENDING':
        return t('pending', 'Pending');
      default:
        return filter;
    }
  };

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} activeRouteName="Payments" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#8B3E16']} />}
      >
        {/* =========================================================
            HEADER ROW:
            PAYMENT HISTORY               [ 📥 ]  [ 🔄 ]
            (No 3-line hamburger menu box; only Download & Refresh)
        ========================================================= */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitleText}>
            {t('paymentHistory', 'PAYMENT HISTORY')}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleExportReport}
              activeOpacity={0.8}
            >
              <Download size={18} color={isDark ? '#F8FAFC' : '#78350F'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => loadData(false)}
              disabled={isLoading || refreshing}
              activeOpacity={0.8}
            >
              <RotateCw size={18} color={isDark ? '#F8FAFC' : '#78350F'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* =========================================================
            4 KPI SUMMARY CARDS ROW:
            [ Collected ]  [ Cash ]  [ UPI ]  [ Pending ]
            (Uniform height, centered text, scaled numbers)
        ========================================================= */}
        <View style={styles.kpiContainer}>
          {/* Card 1: Collected */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel} numberOfLines={1}>{t('collected', 'Collected')}</Text>
            <Text
              style={styles.kpiValCollected}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              ₹{toDevanagari(kpiStats.collected.toLocaleString('en-IN'))}
            </Text>
          </View>

          {/* Card 2: Cash */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel} numberOfLines={1}>{t('cash', 'Cash')}</Text>
            <Text
              style={styles.kpiValCash}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              ₹{toDevanagari(kpiStats.cash.toLocaleString('en-IN'))}
            </Text>
          </View>

          {/* Card 3: UPI */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel} numberOfLines={1}>{t('upi', 'UPI')}</Text>
            <Text
              style={styles.kpiValUpi}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              ₹{toDevanagari(kpiStats.upi.toLocaleString('en-IN'))}
            </Text>
          </View>

          {/* Card 4: Pending */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel} numberOfLines={1}>{t('pending', 'Pending')}</Text>
            <Text
              style={styles.kpiValPending}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {toDevanagari(kpiStats.pending)}
            </Text>
          </View>
        </View>

        {/* =========================================================
            FILTER ROW:
            [ DATE FILTER: Today v ]  [ STATUS: All Bills v ]
        ========================================================= */}
        <View style={styles.filterRow}>
          {/* Date Filter Pill */}
          <TouchableOpacity
            style={styles.filterPill}
            onPress={() => setDateFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Clock size={16} color={isDark ? '#94A3B8' : '#78716C'} />
            <View style={styles.filterPillContent}>
              <Text style={styles.filterPillCaption}>{t('dateFilter', 'DATE FILTER')}</Text>
              <Text style={styles.filterPillVal}>{getDateFilterLabel(dateFilter)}</Text>
            </View>
            <ChevronDown size={14} color="#78716C" />
          </TouchableOpacity>

          {/* Status Filter Pill */}
          <TouchableOpacity
            style={styles.filterPill}
            onPress={() => setStatusFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Filter size={16} color={isDark ? '#94A3B8' : '#78716C'} />
            <View style={styles.filterPillContent}>
              <Text style={styles.filterPillCaption}>{t('status', 'STATUS')}</Text>
              <Text style={styles.filterPillVal}>{getStatusFilterLabel(statusFilter)}</Text>
            </View>
            <ChevronDown size={14} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPaymentPlaceholder', 'Search bill, order, table, guest...')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setCurrentPage(1);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* =========================================================
            BILLS & PAYMENTS CARDS LIST
        ========================================================= */}
        {isLoading && (
          <View style={styles.emptyStateBox}>
            <ActivityIndicator size="small" color="#8B3E16" />
            <Text style={styles.emptyStateSub}>{t('loadingPayments', 'Loading payments & bills...')}</Text>
          </View>
        )}

        {!isLoading && displayedItems.length === 0 && (
          <View style={styles.emptyStateBox}>
            <ReceiptRupee size={36} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>{t('noPaymentHistoryFound', 'No Billing Records Found')}</Text>
            <Text style={styles.emptyStateSub}>
              {t('noPaymentHistoryDesc', 'Completed and pending bill records for this filter will appear here.')}
            </Text>
          </View>
        )}

        {!isLoading &&
          paginatedItems.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={styles.billCard}
              activeOpacity={0.9}
              onPress={() => handleCardPress(item)}
            >
              {/* Row 1: Invoice # + Status Badge (Left) and Total Amount (Right) */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardInvoiceNumber}>{item.invoiceNumber}</Text>
                  <View
                    style={[
                      styles.cardStatusBadge,
                      item.status === 'PAID' ? styles.statusBadgePaid : styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardStatusBadgeText,
                        item.status === 'PAID' ? styles.statusBadgeTextPaid : styles.statusBadgeTextPending,
                      ]}
                    >
                      {item.status === 'PAID' ? t('paid', 'PAID') : t('pending', 'PENDING')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardAmountText}>
                  ₹{toDevanagari(item.amount.toLocaleString('en-IN'))}
                </Text>
              </View>

              {/* Row 2: Order • Table • Time (Left) and Incl. GST (Right) */}
              <View style={styles.cardSubRow}>
                <Text style={styles.cardSubText} numberOfLines={1} ellipsizeMode="tail">
                  {`Order: ${item.orderNumber} • ${formatTableName(item.tableName || item.tableNumber)} • ${item.timeStr}`}
                </Text>
                <Text style={styles.cardGstText}>
                  {t('inclGst', 'Incl. GST')}: ₹{toDevanagari(item.taxAmount)}
                </Text>
              </View>

              {/* Row 3: Action Button (Left) and Payment Mode / Settle Badge (Right) */}
              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.viewReceiptBtn}
                  onPress={() => handleActionReceipt(item)}
                  activeOpacity={0.8}
                >
                  <Printer size={14} color="#78350F" />
                  <Text style={styles.viewReceiptBtnText}>
                    {item.status === 'PAID' ? t('viewReceipt', 'View Receipt') : t('settleBill', 'Settle Bill')}
                  </Text>
                </TouchableOpacity>

                {item.status === 'PAID' ? (
                  <View
                    style={[
                      styles.paymentModeBadge,
                      item.paymentMethod.toUpperCase() === 'CASH'
                        ? styles.paymentModeBadgeCash
                        : item.paymentMethod.toUpperCase() === 'CARD'
                        ? styles.paymentModeBadgeCard
                        : styles.paymentModeBadgeUpi,
                    ]}
                  >
                    {item.paymentMethod.toUpperCase() === 'CASH' ? (
                      <Banknote size={14} color="#059669" />
                    ) : item.paymentMethod.toUpperCase() === 'CARD' ? (
                      <CreditCard size={14} color="#2563EB" />
                    ) : (
                      <Smartphone size={14} color="#059669" />
                    )}
                    <Text
                      style={[
                        styles.paymentModeText,
                        item.paymentMethod.toUpperCase() === 'CASH'
                          ? styles.paymentModeTextCash
                          : item.paymentMethod.toUpperCase() === 'CARD'
                          ? styles.paymentModeTextCard
                          : styles.paymentModeTextUpi,
                      ]}
                    >
                      {item.paymentMethod.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pendingModeBadge}
                    onPress={() => item.rawInvoice && openSettleModal(item.rawInvoice)}
                    activeOpacity={0.8}
                  >
                    <Clock size={13} color="#B45309" />
                    <Text style={styles.pendingModeText}>{t('unpaid', 'UNPAID')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} color={currentPage === 1 ? '#94A3B8' : '#334155'} />
              <Text style={[styles.pageBtnText, currentPage === 1 && { color: '#94A3B8' }]}>{t('prev', 'Prev')}</Text>
            </TouchableOpacity>

            <Text style={styles.pageInfoText}>
              {toDevanagari(currentPage)} / {toDevanagari(totalPages)} ({toDevanagari(displayedItems.length)} {t('records', 'Records')})
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <Text style={[styles.pageBtnText, currentPage === totalPages && { color: '#94A3B8' }]}>{t('next', 'Next')}</Text>
              <ChevronRight size={16} color={currentPage === totalPages ? '#94A3B8' : '#334155'} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* =========================================================
          DATE FILTER MODAL
      ========================================================= */}
      <Modal visible={dateFilterModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDateFilterModalVisible(false)}
        >
          <View style={styles.filterPickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t('selectDateFilter', 'Select Date Filter')}</Text>
              <TouchableOpacity onPress={() => setDateFilterModalVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {(['Today', 'Yesterday', 'This Week', 'This Month', 'All'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.pickerOptionRow, dateFilter === opt && styles.pickerOptionRowActive]}
                onPress={() => {
                  setDateFilter(opt);
                  setCurrentPage(1);
                  setDateFilterModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerOptionText, dateFilter === opt && styles.pickerOptionTextActive]}>
                  {getDateFilterLabel(opt)}
                </Text>
                {dateFilter === opt ? <Check size={16} color="#8B3E16" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================
          STATUS FILTER MODAL
      ========================================================= */}
      <Modal visible={statusFilterModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusFilterModalVisible(false)}
        >
          <View style={styles.filterPickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{t('selectStatus', 'Select Status')}</Text>
              <TouchableOpacity onPress={() => setStatusFilterModalVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {(['ALL', 'PAID', 'PENDING'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.pickerOptionRow, statusFilter === opt && styles.pickerOptionRowActive]}
                onPress={() => {
                  setStatusFilter(opt);
                  setCurrentPage(1);
                  setStatusFilterModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerOptionText, statusFilter === opt && styles.pickerOptionTextActive]}>
                  {getStatusFilterLabel(opt)}
                </Text>
                {statusFilter === opt ? <Check size={16} color="#8B3E16" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================
          VIEW DETAILS MODAL
      ========================================================= */}
      <Modal visible={viewDetailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <Text style={styles.modalTitle}>{selectedDetail?.title || t('paymentReceipt', 'Payment Receipt')}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewDetailModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDetail && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                {/* Top Amount Banner */}
                <View style={styles.receiptAmountBanner}>
                  <Text style={styles.receiptAmountLabel}>{t('amount', 'Amount')}</Text>
                  <Text style={styles.receiptAmountVal}>{formatCurrency(selectedDetail.amount)}</Text>
                  <View style={styles.receiptStatusPill}>
                    <CheckCircle2 size={12} color="#15803D" />
                    <Text style={styles.receiptStatusText}>
                      {translateStatus(selectedDetail.status || 'SUCCESS')}
                    </Text>
                  </View>
                </View>

                {/* Details Breakdown */}
                <View style={styles.receiptDetailsBox}>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('invoiceNo', 'Invoice No.')}</Text>
                    <Text style={styles.receiptDetailValBold}>#{toDevanagari(selectedDetail.invoiceNumber)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('orderNo', 'Order No.')}</Text>
                    <Text style={styles.receiptDetailVal}>{toDevanagari(selectedDetail.orderNumber)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('table', 'Table')}</Text>
                    <Text style={styles.receiptDetailVal}>{formatTableName(selectedDetail.tableName)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('customer', 'Customer')}</Text>
                    <Text style={styles.receiptDetailVal}>{localizeGuestName(selectedDetail.customerName)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('mode', 'Payment Mode')}</Text>
                    <Text style={styles.receiptDetailValBold}>{selectedDetail.paymentMethod}</Text>
                  </View>
                  {selectedDetail.transactionRef ? (
                    <View style={styles.receiptDetailRow}>
                      <Text style={styles.receiptDetailKey}>{t('txnRef', 'Txn Ref')}</Text>
                      <Text style={styles.receiptDetailVal}>{toDevanagari(selectedDetail.transactionRef)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('dateTime', 'Date & Time')}</Text>
                    <Text style={styles.receiptDetailVal}>{selectedDetail.dateTime}</Text>
                  </View>
                  {selectedDetail.subtotal ? (
                    <View style={styles.receiptDetailRow}>
                      <Text style={styles.receiptDetailKey}>{t('subtotal', 'Subtotal')}</Text>
                      <Text style={styles.receiptDetailVal}>{formatCurrency(selectedDetail.subtotal)}</Text>
                    </View>
                  ) : null}
                  {selectedDetail.taxAmount ? (
                    <View style={styles.receiptDetailRow}>
                      <Text style={styles.receiptDetailKey}>{t('taxGst', 'Tax (GST 5%)')}</Text>
                      <Text style={styles.receiptDetailVal}>{formatCurrency(selectedDetail.taxAmount)}</Text>
                    </View>
                  ) : null}
                </View>

                {selectedDetail.itemsSummary ? (
                  <View style={styles.itemsSummaryBox}>
                    <Text style={styles.itemsSummaryTitle}>{t('dishesOrdered', 'Dishes Ordered')}:</Text>
                    <Text style={styles.itemsSummaryContent}>{selectedDetail.itemsSummary}</Text>
                  </View>
                ) : null}

                {/* Action Buttons in Modal */}
                <View style={styles.receiptActionsRow}>
                  <TouchableOpacity
                    style={styles.receiptPrintBtn}
                    onPress={() => {
                      setViewDetailModalVisible(false);
                      if (selectedDetail.rawPayment) {
                        handlePrintPayment(selectedDetail.rawPayment);
                      } else if (selectedDetail.rawInvoice) {
                        handlePrintInvoice(selectedDetail.rawInvoice);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Printer size={16} color="#FFFFFF" />
                    <Text style={styles.receiptPrintText}>{t('printReceipt', 'Print Receipt')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.receiptCloseBtn}
                    onPress={() => setViewDetailModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.receiptCloseText}>{t('close', 'Close')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================================================
          SETTLE PAYMENT MODAL (FOR BILLS AWAITING SETTLEMENT)
      ========================================================= */}
      <Modal visible={settleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CreditCard size={20} color="#8B3E16" />
                <Text style={styles.modalTitle}>{t('settleBillPayment', 'Settle Bill Payment')}</Text>
              </View>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {settleInvoice && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* Summary Info */}
                <View style={styles.settleSummaryBox}>
                  <View style={styles.settleInfoRow}>
                    <Text style={styles.settleInfoLabel}>{t('invoiceNo', 'Invoice #')}:</Text>
                    <Text style={styles.settleInfoValue}>#{toDevanagari(settleInvoice.invoiceNumber)}</Text>
                  </View>
                  <View style={styles.settleInfoRow}>
                    <Text style={styles.settleInfoLabel}>{t('table', 'Table')}:</Text>
                    <Text style={styles.settleInfoValue}>{formatTableName(settleInvoice.tableName || settleInvoice.tableNumber)}</Text>
                  </View>
                  <View style={styles.settleInfoRow}>
                    <Text style={styles.settleInfoLabel}>{t('customer', 'Customer')}:</Text>
                    <Text style={styles.settleInfoValue}>{localizeGuestName(settleInvoice.customerName || settleInvoice.guestName || 'Guest')}</Text>
                  </View>
                  <View style={[styles.settleInfoRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#FED7AA' }]}>
                    <Text style={styles.settleDueLabel}>{t('amountDue', 'Amount Due')}:</Text>
                    <Text style={styles.settleDueValue}>{formatCurrency(settleInvoice.dueAmount ?? settleInvoice.grandTotal)}</Text>
                  </View>
                </View>

                {/* Amount Input */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.inputLabel}>{t('paymentAmount', 'Payment Amount')} (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={settleAmount}
                    onChangeText={setSettleAmount}
                    keyboardType="numeric"
                    placeholder="e.g. 1323"
                  />
                </View>

                {/* Mode Selector */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.inputLabel}>{t('paymentMethod', 'Payment Method')}</Text>
                  <View style={styles.modalModeSelector}>
                    {(['UPI', 'CASH', 'CARD'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.modalModeBtn, settleMethod === m && styles.modalModeBtnActive]}
                        onPress={() => setSettleMethod(m)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalModeText, settleMethod === m && styles.modalModeTextActive]}>
                          {m === 'CASH' ? t('cash', 'Cash') : m === 'CARD' ? t('card', 'Card') : 'UPI'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* UPI specific UTR reference */}
                {settleMethod === 'UPI' && (
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.inputLabel}>UPI UTR / Reference No.</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={settleRef}
                      onChangeText={setSettleRef}
                      placeholder="e.g. 331204859123 or TXN-123"
                    />
                  </View>
                )}

                {/* Cash specific received */}
                {settleMethod === 'CASH' && (
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.inputLabel}>{t('cashReceived', 'Cash Received from Guest')} (₹)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={cashReceived}
                      onChangeText={setCashReceived}
                      keyboardType="numeric"
                      placeholder="e.g. 1500"
                    />
                    {Number(cashReceived) > Number(settleAmount) && (
                      <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '700', marginTop: 4 }}>
                        {t('returnChange', 'Change to Return')}: ₹ {toDevanagari(Number(cashReceived) - Number(settleAmount))}
                      </Text>
                    )}
                  </View>
                )}

                {/* Card terminal auth */}
                {settleMethod === 'CARD' && (
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.inputLabel}>POS Terminal Slip / Auth Ref</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={settleRef}
                      onChangeText={setSettleRef}
                      placeholder="e.g. POS-AUTH-9923"
                    />
                  </View>
                )}

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submittingSettle && { opacity: 0.6 }]}
                  onPress={handleConfirmSettle}
                  disabled={submittingSettle}
                  activeOpacity={0.85}
                >
                  {submittingSettle ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.modalSubmitText}>
                        {t('confirmAndSettle', 'Confirm & Settle Payment')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Universal Print Modal */}
      <MobilePrintInvoiceModal
        visible={paymentPrintModalVisible}
        onClose={() => setPaymentPrintModalVisible(false)}
        invoiceData={paymentPrintModalData}
      />
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#EAE4DC';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#78716C';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F19' : '#FBF9F5',
    },
    content: {
      padding: 14,
      paddingBottom: 40,
    },

    /* Top Header Row (No 3-line box; only Title on left and Actions on right) */
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      marginTop: 2,
    },
    headerTitleText: {
      fontSize: 20,
      fontWeight: '800',
      color: textPrimary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#FDF4ED',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#F7E7D9',
      justifyContent: 'center',
      alignItems: 'center',
    },

    /* 4 KPI Summary Cards Row (Uniform height & centered text) */
    kpiContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: isDark ? '#1E293B' : '#FDFBF9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#F2EDE7',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 58,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: textSecondary,
      marginBottom: 3,
      textAlign: 'center',
    },
    kpiValCollected: {
      fontSize: 15,
      fontWeight: '800',
      color: textPrimary,
      textAlign: 'center',
    },
    kpiValCash: {
      fontSize: 15,
      fontWeight: '800',
      color: '#16A34A',
      textAlign: 'center',
    },
    kpiValUpi: {
      fontSize: 15,
      fontWeight: '800',
      color: '#2563EB',
      textAlign: 'center',
    },
    kpiValPending: {
      fontSize: 15,
      fontWeight: '800',
      color: '#B45309',
      textAlign: 'center',
    },

    /* Filter Row */
    filterRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    filterPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#EAE4DC',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 8,
    },
    filterPillContent: {
      flex: 1,
    },
    filterPillCaption: {
      fontSize: 9.5,
      fontWeight: '700',
      color: textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    filterPillVal: {
      fontSize: 13,
      fontWeight: '700',
      color: textPrimary,
      marginTop: 1,
    },

    /* Search Bar */
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#EAE4DC',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
      marginBottom: 14,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
      color: textPrimary,
      paddingVertical: 0,
    },

    /* Bill Card Matching Screenshot */
    billCard: {
      backgroundColor: cardBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#2D3748' : '#F0EAE3',
      padding: 13,
      marginBottom: 11,
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 4,
      elevation: 1.5,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardInvoiceNumber: {
      fontSize: 15.5,
      fontWeight: '800',
      color: textPrimary,
    },
    cardStatusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusBadgePaid: {
      backgroundColor: '#DCFCE7',
    },
    statusBadgePending: {
      backgroundColor: '#FEF3C7',
    },
    cardStatusBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
    },
    statusBadgeTextPaid: {
      color: '#16A34A',
    },
    statusBadgeTextPending: {
      color: '#B45309',
    },
    cardAmountText: {
      fontSize: 18,
      fontWeight: '800',
      color: textPrimary,
    },

    /* Row 2: Sub-info */
    cardSubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardSubText: {
      fontSize: 12,
      color: textSecondary,
      flex: 1,
      marginRight: 8,
    },
    cardGstText: {
      fontSize: 12,
      fontWeight: '500',
      color: textSecondary,
    },

    /* Row 3: Action Buttons */
    cardActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#2D3748' : '#F7F3EE',
    },
    viewReceiptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#292524' : '#FDF4ED',
      borderWidth: 1,
      borderColor: isDark ? '#44403C' : '#FCE7D6',
      borderRadius: 18,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    viewReceiptBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#78350F',
    },

    paymentModeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 7,
      paddingVertical: 4.5,
      paddingHorizontal: 9,
    },
    paymentModeBadgeUpi: {
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    paymentModeBadgeCash: {
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    paymentModeBadgeCard: {
      backgroundColor: '#EFF6FF',
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    paymentModeText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    paymentModeTextUpi: {
      color: '#059669',
    },
    paymentModeTextCash: {
      color: '#059669',
    },
    paymentModeTextCard: {
      color: '#2563EB',
    },

    pendingModeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: 7,
      paddingVertical: 4.5,
      paddingHorizontal: 9,
    },
    pendingModeText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#B45309',
    },

    /* Empty Box */
    emptyStateBox: {
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptyStateTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: textPrimary,
      marginTop: 4,
    },
    emptyStateSub: {
      fontSize: 12,
      color: textSecondary,
      textAlign: 'center',
    },

    /* Pagination */
    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      marginTop: 8,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
    },
    pageBtnDisabled: {
      opacity: 0.45,
    },
    pageBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: textPrimary,
    },
    pageInfoText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: textSecondary,
    },

    /* Filter Picker Modals */
    filterPickerModal: {
      backgroundColor: cardBg,
      borderRadius: 14,
      width: '85%',
      maxWidth: 340,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 5,
    },
    pickerModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: cardBorder,
    },
    pickerModalTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: textPrimary,
    },
    pickerOptionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    pickerOptionRowActive: {
      backgroundColor: isDark ? '#1E293B' : '#FDF4ED',
    },
    pickerOptionText: {
      fontSize: 13.5,
      color: textPrimary,
      fontWeight: '500',
    },
    pickerOptionTextActive: {
      fontWeight: '800',
      color: '#8B3E16',
    },

    /* Modal Overlay & Card */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: cardBg,
      borderRadius: 14,
      width: '100%',
      maxWidth: 480,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: cardBorder,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: textPrimary,
    },

    /* Receipt Details in Modal */
    receiptAmountBanner: {
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    receiptAmountLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: textSecondary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    receiptAmountVal: {
      fontSize: 24,
      fontWeight: '800',
      color: '#16A34A',
      marginBottom: 5,
    },
    receiptStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#DCFCE7',
      paddingVertical: 2.5,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    receiptStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#15803D',
    },
    receiptDetailsBox: {
      gap: 7,
      marginBottom: 12,
    },
    receiptDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    receiptDetailKey: {
      fontSize: 12,
      color: textSecondary,
    },
    receiptDetailVal: {
      fontSize: 12,
      color: textPrimary,
      fontWeight: '500',
    },
    receiptDetailValBold: {
      fontSize: 12,
      color: textPrimary,
      fontWeight: '800',
    },
    itemsSummaryBox: {
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      padding: 9,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    itemsSummaryTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: textSecondary,
      marginBottom: 4,
    },
    itemsSummaryContent: {
      fontSize: 12,
      color: textPrimary,
      lineHeight: 18,
    },
    receiptActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    receiptPrintBtn: {
      flex: 1,
      backgroundColor: '#8B3E16',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    receiptPrintText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    receiptCloseBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    receiptCloseText: {
      color: textPrimary,
      fontSize: 12.5,
      fontWeight: '600',
    },

    /* Settle Modal */
    settleSummaryBox: {
      backgroundColor: isDark ? '#1E293B' : '#FFF9F3',
      borderWidth: 1,
      borderColor: '#FED7AA',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      gap: 5,
    },
    settleInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settleInfoLabel: {
      fontSize: 12,
      color: textSecondary,
    },
    settleInfoValue: {
      fontSize: 12,
      fontWeight: '700',
      color: textPrimary,
    },
    settleDueLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#8B3E16',
    },
    settleDueValue: {
      fontSize: 15,
      fontWeight: '800',
      color: '#DC2626',
    },
    modalInputGroup: {
      marginBottom: 11,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 5,
    },
    modalInput: {
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: textPrimary,
    },
    modalModeSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    modalModeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: cardBorder,
    },
    modalModeBtnActive: {
      backgroundColor: '#8B3E16',
      borderColor: '#8B3E16',
    },
    modalModeText: {
      fontSize: 12,
      fontWeight: '700',
      color: textPrimary,
    },
    modalModeTextActive: {
      color: '#FFFFFF',
    },
    modalSubmitBtn: {
      backgroundColor: '#8B3E16',
      borderRadius: 8,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 6,
      shadowColor: '#8B3E16',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    modalSubmitText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
};
