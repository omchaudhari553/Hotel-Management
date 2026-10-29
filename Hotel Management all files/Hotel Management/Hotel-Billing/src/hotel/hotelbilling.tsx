import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { UniversalInvoicePrintData } from '../types/printing';

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { billingService } from "../services/billingService";
import { paymentService } from "../services/paymentService";
import { orderService } from "../services/orderService";
import { kotService } from "../services/kotService";
import { tableService } from "../services/tableService";
import { useBranch } from "../context/BranchContext";
import { sanitizeMobileInput } from "../common/phoneUtils";
import html2pdf from "html2pdf.js";
import { settingsService } from "../services/settingsService";
import { TablePagination } from "../common/TablePagination";
import { useLanguage } from "../context/LanguageContext";
import { dialogService } from "../context/DialogContext";
import { formatTableNumber } from "./Tables";
import { getLocalizedMenuItemName, formatTableName } from "../locales/nameLocalization";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  IndianRupee,
  Landmark,
  ReceiptIndianRupee,
  RotateCcw,
  Search,
  Share2,
  Table2,
  Trash2,
  Users,
  Utensils,
  WalletCards,
  Printer,
  Settings2,
  X,
  PlusCircle,
  Upload,
  Minus,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

interface OrderItem {
  id: number;
  itemName: string;
  quantity: number;
  price: number;
}

interface KOT {
  id: number;
  kotNumber: string;
  orderId: number;
  customerId: number;
  customerName: string;
  customerMobile?: string;
  tableId: number;
  tableNumber: string;
  items: OrderItem[];
  status: "PENDING" | "PREPARING" | "READY" | "BILLED";
  createdAt: string;
}

type BillingStatus = "UNPAID" | "PARTIAL" | "PAID";

type PaymentMethod =
  | "UPI"
  | "CASH"
  | "CARD";

interface Invoice {
  id: number;
  invoiceNumber: string;
  orderId?: number;
  kotNumber: string;
  customerId: number;
  customerName: string;
  customerMobile?: string;
  tableId: number;
  tableNumber: string;
  items: OrderItem[];
  itemTotal: number;
  discount: number;
  discountAmount: number;
  discountType?: 'percent' | 'fixed';
  tax: number;
  taxAmount: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  isInterstate?: boolean;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  dueAmount?: number;
  paymentMethod?: PaymentMethod;
  status: BillingStatus;
  createdAt: string;
}

interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: "SUCCESS";
  date: string;
  billingType: "EAT";
}

/* =========================================================
   STORAGE & DEMO DATA
========================================================= */

const KOT_STORAGE_KEY = "pending_kots";
const INVOICE_STORAGE_KEY = "mess_invoices";
const PAYMENT_STORAGE_KEY = "mess_payments";
const INVOICE_SEQUENCE_KEY = "mess_invoice_sequence";
const TEMP_REMOVED_KOTS_KEY = "hotel_billing_temp_removed_kots";

const DEMO_KOTS: KOT[] = [
  {
    id: 1001,
    kotNumber: "KOT-001",
    orderId: 5001,
    customerId: 1,
    customerName: "Rahul Sharma",
    customerMobile: "9876543210",
    tableId: 1,
    tableNumber: "T-01",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 101,
        itemName: "Paneer Butter Masala",
        quantity: 2,
        price: 220,
      },
      {
        id: 102,
        itemName: "Butter Naan",
        quantity: 4,
        price: 40,
      },
      {
        id: 103,
        itemName: "Cold Drink",
        quantity: 2,
        price: 60,
      },
    ],
  },
  {
    id: 1002,
    kotNumber: "KOT-002",
    orderId: 5002,
    customerId: 2,
    customerName: "Priya Patil",
    customerMobile: "9876543211",
    tableId: 2,
    tableNumber: "T-02",
    status: "READY",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 201,
        itemName: "Veg Biryani",
        quantity: 2,
        price: 180,
      },
      {
        id: 202,
        itemName: "Raita",
        quantity: 2,
        price: 50,
      },
    ],
  },
  {
    id: 1003,
    kotNumber: "KOT-003",
    orderId: 5003,
    customerId: 3,
    customerName: "Amit Joshi",
    customerMobile: "9876543212",
    tableId: 3,
    tableNumber: "T-03",
    status: "READY",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 301,
        itemName: "Masala Dosa",
        quantity: 2,
        price: 120,
      },
      {
        id: 302,
        itemName: "Tea",
        quantity: 2,
        price: 30,
      },
    ],
  },
];

const FULL_HOTEL_MENU: OrderItem[] = [
  { id: 10001, itemName: "Paneer Tikka", quantity: 1, price: 280 },
  { id: 10002, itemName: "Chicken Tikka", quantity: 1, price: 340 },
  { id: 10003, itemName: "Veg Spring Rolls", quantity: 1, price: 220 },
  { id: 10004, itemName: "Veg Crispy", quantity: 1, price: 200 },
  { id: 10005, itemName: "Chicken Crispy", quantity: 1, price: 280 },
  { id: 10006, itemName: "Veg Manchurian", quantity: 1, price: 180 },
  { id: 10007, itemName: "Chicken Chilli", quantity: 1, price: 290 },
  { id: 10008, itemName: "Butter Chicken", quantity: 1, price: 420 },
  { id: 10009, itemName: "Paneer Butter Masala", quantity: 1, price: 360 },
  { id: 10010, itemName: "Dal Tadka", quantity: 1, price: 240 },
  { id: 10011, itemName: "Dal Fry", quantity: 1, price: 200 },
  { id: 10012, itemName: "Kadhai Paneer", quantity: 1, price: 320 },
  { id: 10013, itemName: "Kaju Curry", quantity: 1, price: 380 },
  { id: 10014, itemName: "Chicken Masala", quantity: 1, price: 360 },
  { id: 10015, itemName: "Mutton Curry", quantity: 1, price: 450 },
  { id: 10016, itemName: "Mix Veg", quantity: 1, price: 240 },
  { id: 10017, itemName: "Palak Paneer", quantity: 1, price: 280 },
  { id: 10018, itemName: "Butter Naan", quantity: 1, price: 70 },
  { id: 10019, itemName: "Garlic Naan", quantity: 1, price: 90 },
  { id: 10020, itemName: "Tandoori Roti", quantity: 1, price: 45 },
  { id: 10021, itemName: "Butter Roti", quantity: 1, price: 55 },
  { id: 10022, itemName: "Laccha Paratha", quantity: 1, price: 65 },
  { id: 10023, itemName: "Veg Biryani", quantity: 1, price: 320 },
  { id: 10024, itemName: "Chicken Biryani", quantity: 1, price: 390 },
  { id: 10025, itemName: "Steamed Rice", quantity: 1, price: 160 },
  { id: 10026, itemName: "Jeera Rice", quantity: 1, price: 180 },
  { id: 10027, itemName: "Veg Fried Rice", quantity: 1, price: 220 },
  { id: 10028, itemName: "Masala Papad", quantity: 1, price: 90 },
  { id: 10029, itemName: "French Fries", quantity: 1, price: 180 },
  { id: 10030, itemName: "Veg Raita", quantity: 1, price: 70 },
  { id: 10031, itemName: "Masala Dosa", quantity: 1, price: 120 },
  { id: 10032, itemName: "Idli", quantity: 1, price: 80 },
  { id: 10033, itemName: "Vada Pav", quantity: 1, price: 40 },
  { id: 10034, itemName: "Gulab Jamun", quantity: 1, price: 140 },
  { id: 10035, itemName: "Brownie", quantity: 1, price: 180 },
  { id: 10036, itemName: "Cold Drink", quantity: 1, price: 60 },
  { id: 10037, itemName: "Tea", quantity: 1, price: 30 },
  { id: 10038, itemName: "Coffee", quantity: 1, price: 50 },
  { id: 10039, itemName: "Mineral Water", quantity: 1, price: 20 },
  { id: 10040, itemName: "Lassi", quantity: 1, price: 80 },
];

const MENU_ITEMS: OrderItem[] = [
  {
    id: 10001,
    itemName: "Paneer Butter Masala",
    quantity: 1,
    price: 220,
  },
  {
    id: 10002,
    itemName: "Butter Naan",
    quantity: 1,
    price: 40,
  },
  {
    id: 10003,
    itemName: "Cold Drink",
    quantity: 1,
    price: 60,
  },
  {
    id: 10004,
    itemName: "Veg Biryani",
    quantity: 1,
    price: 180,
  },
  {
    id: 10005,
    itemName: "Raita",
    quantity: 1,
    price: 50,
  },
  {
    id: 10006,
    itemName: "Masala Dosa",
    quantity: 1,
    price: 120,
  },
  {
    id: 10007,
    itemName: "Tea",
    quantity: 1,
    price: 30,
  },
  {
    id: 10008,
    itemName: "Coffee",
    quantity: 1,
    price: 50,
  },
  {
    id: 10009,
    itemName: "Idli",
    quantity: 1,
    price: 80,
  },
  {
    id: 10010,
    itemName: "Vada Pav",
    quantity: 1,
    price: 40,
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getKOTs = (): KOT[] => {
  try {
    const raw = localStorage.getItem(KOT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};


const saveKOTs = (kots: KOT[]) => {
  localStorage.setItem(
    KOT_STORAGE_KEY,
    JSON.stringify(kots)
  );
};

const getBillingConfig = () => {
  try {
    const raw = localStorage.getItem("ajalkar_billing_config");
    if (raw) return JSON.parse(raw);
  } catch { }
  return { invoicePrefix: "INV", invoiceStart: "1001" };
};

const nextInvoiceNumber = () => {
  const config = getBillingConfig();
  const prefix = (config.invoicePrefix || "INV").trim();
  const startNum = parseInt(config.invoiceStart || "1001", 10) || 1001;

  let highest = startNum - 1;
  try {
    const list: Invoice[] = JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) || "[]");
    list.forEach(inv => {
      if (inv.invoiceNumber) {
        const clean = inv.invoiceNumber.trim();
        const regex = new RegExp(`^${prefix}[-]?(\\d+)$`, 'i');
        const match = clean.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highest) {
            highest = num;
          }
        }
      }
    });
  } catch { }

  const seqKey = `hotel_invoice_seq_${prefix}`;
  const storedSeq = parseInt(localStorage.getItem(seqKey) || localStorage.getItem(INVOICE_SEQUENCE_KEY) || "0", 10);
  if (storedSeq > highest) {
    highest = storedSeq;
  }

  const nextNum = highest + 1;
  localStorage.setItem(seqKey, String(nextNum));
  localStorage.setItem(INVOICE_SEQUENCE_KEY, String(nextNum));

  return `${prefix}-${nextNum}`;
};

const saveInvoice = async (invoice: Invoice, orderId?: number, branchId?: number): Promise<{ id?: number; invoiceNumber?: string }> => {
  try {
    const isInterstate = Boolean(invoice.isInterstate || (invoice.igst && invoice.igst > 0));
    const taxRate = Number(invoice.tax ?? 5);
    const cgstRate = invoice.cgstRate !== undefined ? invoice.cgstRate : (isInterstate ? 0 : taxRate / 2);
    const sgstRate = invoice.sgstRate !== undefined ? invoice.sgstRate : (isInterstate ? 0 : taxRate / 2);
    const igstRate = invoice.igstRate !== undefined ? invoice.igstRate : (isInterstate ? taxRate : 0);

    const created = await billingService.createInvoice({
      branchId: branchId || 1,
      orderId: orderId || (invoice as any).orderId || null,
      dueDate: new Date().toISOString().split("T")[0],
      discountAmount: invoice.discountAmount || 0,
      cgstRate: cgstRate,
      sgstRate: sgstRate,
      igstRate: igstRate,
      invoiceNumber: invoice.invoiceNumber,
      items: (invoice.items || []).map((it) => ({
        description: it.itemName,
        quantity: it.quantity,
        unitPrice: it.price,
        taxRate: invoice.tax || 5,
      })),
      notes: `Invoice for table ${invoice.tableNumber || invoice.tableId} - ${invoice.customerName}`,
    });

    if (created?.id) {
      invoice.id = created.id;
      if (created.invoiceNumber) invoice.invoiceNumber = created.invoiceNumber;
    }

    const list: Invoice[] = JSON.parse(
      localStorage.getItem(INVOICE_STORAGE_KEY) || "[]"
    );

    const index = list.findIndex(
      (x) => Number(x.id) === Number(invoice.id) || (orderId && Number((x as any).orderId) === Number(orderId))
    );

    if (index >= 0) {
      list[index] = invoice;
    } else {
      list.push(invoice);
    }

    localStorage.setItem(
      INVOICE_STORAGE_KEY,
      JSON.stringify(list)
    );

    return { id: created?.id, invoiceNumber: created?.invoiceNumber };
  } catch (err) {
    console.warn("Failed to sync invoice to backend:", err);
    return {};
  }
};

const savePayment = async (payment: Payment, realInvoiceId?: number, tableId?: number) => {
  const list: Payment[] = JSON.parse(
    localStorage.getItem(PAYMENT_STORAGE_KEY) || "[]"
  );

  if (
    !list.some(
      (x) => Number(x.id) === Number(payment.id)
    )
  ) {
    list.push(payment);

    localStorage.setItem(
      PAYMENT_STORAGE_KEY,
      JSON.stringify(list)
    );
  }

  try {
    const invId = realInvoiceId || (payment.invoiceId && payment.invoiceId < 1000000000 ? payment.invoiceId : undefined);
    if (invId) {
      await paymentService.recordPayment({
        invoiceId: invId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod || "CASH",
        transactionRef: `TXN-INV-${invId}`,
        paymentDate: payment.date || new Date().toISOString().split("T")[0],
        notes: `Payment for ${payment.customerName}`,
      });
      if (tableId) {
        localStorage.setItem(`table_cleaning_start_${tableId}`, String(Date.now()));
        await tableService.updateTableStatus(tableId, "CLEANING").catch(() => { });
        window.dispatchEvent(
          new CustomEvent("table-status-changed", {
            detail: { tableId, status: "CLEANING" },
          })
        );
      }
    }
  } catch (err) {
    console.warn("Failed to sync payment to backend:", err);
  }
};

const toDevanagariNumerals = (input: string | number): string => {
  if (input === null || input === undefined) return "";
  const str = String(input);
  const currentLang = typeof localStorage !== "undefined" ? localStorage.getItem("ajalkar_language") : "en";
  if (currentLang !== "mr" && currentLang !== "hi") {
    return str;
  }
  const devanagariDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return str.replace(/[0-9]/g, (digit) => devanagariDigits[parseInt(digit, 10)]);
};

const money = (n: number) => {
  const formatted = Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currentLang =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ajalkar_language")
      : "en";
  if (currentLang === "mr" || currentLang === "hi") {
    return toDevanagariNumerals(formatted);
  }
  return formatted;
};

const formatTableBadge = (tableStr?: string, currentLang?: string) => {
  if (!tableStr) return "-";
  const lang = (currentLang || (typeof localStorage !== "undefined" ? localStorage.getItem("ajalkar_language") : "en")) as any;
  return formatTableName(tableStr, lang);
};

const dateText = (d: string | Date | number, targetLang?: string) => {
  if (!d) return "";
  const currentLang =
    targetLang ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("ajalkar_language")
      : "en");
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);

    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsMr = ["जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"];
    const monthsHi = ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितं", "अक्टू", "नवंबर", "दिसं"];

    const monthIdx = dateObj.getMonth();
    const dateNum = String(dateObj.getDate()).padStart(2, "0");
    const year = dateObj.getFullYear();

    let monthStr = monthsEn[monthIdx];
    if (currentLang === "mr") monthStr = monthsMr[monthIdx];
    else if (currentLang === "hi") monthStr = monthsHi[monthIdx];

    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();

    let result = `${dateNum} ${monthStr} ${year}, ${timeStr}`;
    if (currentLang === "mr" || currentLang === "hi") {
      result = toDevanagariNumerals(result);
    }
    return result;
  } catch {
    return String(d);
  }
};

const pdfOptions = (no: string, heightMm = 180) => ({
  margin: 0,
  filename: `${no}.pdf`,
  image: {
    type: "jpeg" as const,
    quality: 0.98,
  },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FFFFFF",
  },
  jsPDF: {
    unit: "mm",
    format: [100, heightMm] as [number, number],
    orientation: "portrait" as const,
  },
});

/* =========================================================
   COMPONENT
========================================================= */

export const HotelBilling: React.FC = () => {
  const navigate = useNavigate();
  const { t, translateStatus, formatDate, toDevanagari, formatNumber, language, localizeGuestName } = useLanguage();
  type Step =
    | "pending-kots"
    | "billing-payment"
    | "success";

  const { selectedBranchId } = useBranch();

  const [step, setStep] =
    useState<Step>("pending-kots");

  const [pendingKOTs, setPendingKOTs] =
    useState<KOT[]>([]);
  const [loadingKots, setLoadingKots] = useState(false);
  const [backendMenuItems, setBackendMenuItems] = useState<OrderItem[]>([]);

  const fetchLiveKotsAndOrders = useCallback(async () => {
    try {
      setLoadingKots(true);
      const [ordersRes, kotsRes, invoicesRes, menuRes] = await Promise.all([
        orderService.getOrders(selectedBranchId).catch((err) => { console.warn("Orders fetch failed:", err); return []; }),
        kotService.getKots(selectedBranchId).catch((err) => { console.warn("KOTs fetch failed:", err); return []; }),
        billingService.getInvoices(selectedBranchId).catch((err) => { console.warn("Invoices fetch failed:", err); return []; }),
        api.get('/hotel/menu-items').catch(() => null),
      ]);
      const ordersList = Array.isArray(ordersRes) ? ordersRes : [];
      const kotsList = Array.isArray(kotsRes) ? kotsRes : [];
      const invoicesList = Array.isArray(invoicesRes) ? invoicesRes : [];
      setLiveInvoices(invoicesList);

      if (menuRes?.data?.data && Array.isArray(menuRes.data.data)) {
        const mappedMenu: OrderItem[] = menuRes.data.data.map((m: any) => ({
          id: m.id || 20000 + Math.floor(Math.random() * 10000),
          itemName: m.name,
          quantity: 1,
          price: Number(m.price) || 100,
        }));
        setBackendMenuItems(mappedMenu);
      }

      const backendKOTs: KOT[] = [];

      // Add from real KOTs first
      kotsList.forEach((k) => {
        if (k.status !== "COMPLETED" && k.status !== "CANCELLED") {
          // If already paid, do not display in unbilled KOTs
          const linkedInv = invoicesList.find((i: any) => Number(i.orderId) === Number(k.orderId || k.id));
          if (linkedInv && linkedInv.status === "PAID") {
            return;
          }
          backendKOTs.push({
            id: k.id,
            kotNumber: k.kotNumber || `KOT-${k.id}`,
            orderId: k.orderId || k.id,
            customerId: 1,
            customerName: k.guestName || k.customerName || "Guest",
            tableId: k.tableId || 1,
            tableNumber: formatTableNumber({ name: k.tableName, tableNumber: k.tableNumber, id: k.tableId }),
            items: (k.items || []).map((it: any, idx: number) => ({
              id: it.id || idx + 1,
              itemName: it.name || it.itemName || "Item",
              quantity: it.quantity || it.qty || 1,
              price: it.unitPrice || it.price || 0,
            })),
            status: k.status === "BILL_REQUESTED" || k.status === "READY" ? "READY" : "PENDING",
            createdAt: k.createdAt || new Date().toISOString(),
          });
        }
      });

      // Add any active orders that may not be in KOTs list yet
      const activeOrders = ordersList.filter(
        (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "PAID"
      );
      activeOrders.forEach((o) => {
        const linkedInv = invoicesList.find((i: any) => Number(i.orderId) === Number(o.id));
        if (linkedInv && linkedInv.status === "PAID") {
          return;
        }
        if (!backendKOTs.some((b) => b.orderId === o.id)) {
          backendKOTs.push({
            id: o.id,
            kotNumber: o.orderNumber || `ORD-${o.id}`,
            orderId: o.id,
            customerId: 1,
            customerName: o.guestName || "Guest",
            tableId: o.tableId || 1,
            tableNumber: formatTableNumber({ name: o.tableName, tableNumber: o.tableNumber, id: o.tableId }),
            items: (o.items || []).map((it: any, idx: number) => ({
              id: it.id || idx + 1,
              itemName: it.name || "Item",
              quantity: it.quantity || 1,
              price: it.unitPrice || 0,
            })),
            status: o.status === "BILL_REQUESTED" ? "READY" : "PENDING",
            createdAt: o.createdAt || new Date().toISOString(),
          });
        }
      });

      // Merge with local KOTs so orders placed on tables are NEVER lost
      const localKots = getKOTs();
      const filteredLocalKots: KOT[] = [];
      localKots.forEach((lk) => {
        const linkedInv = invoicesList.find((i: any) => Number(i.orderId) === Number(lk.orderId || lk.id));
        if (linkedInv && (linkedInv.status === "PAID" || linkedInv.status === "COMPLETED")) return;
        const matchOrd = ordersList.find((o: any) => Number(o.id) === Number(lk.orderId || lk.id));
        if (matchOrd && (matchOrd.status === "PAID" || matchOrd.status === "COMPLETED" || matchOrd.status === "CANCELLED")) return;
        filteredLocalKots.push(lk);
        if (!backendKOTs.some((b) => Number(b.orderId || b.id) === Number(lk.orderId || lk.id))) {
          backendKOTs.push(lk);
        }
      });
      // Resave filtered localKots so paid orders don't linger
      saveKOTs(filteredLocalKots);
      const finalKots = backendKOTs;
      setPendingKOTs(finalKots);
    } catch (err) {
      console.warn("Could not load backend orders/kots into billing:", err);
    } finally {
      setLoadingKots(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchLiveKotsAndOrders();
    const handleRefresh = () => fetchLiveKotsAndOrders();
    const handleNavbarDate = (e: any) => {
      const { filter, startDate, endDate } = e.detail || {};
      setNavbarDateFilter({
        filter: filter || "All",
        startDate: startDate || "",
        endDate: endDate || "",
      });
    };
    window.addEventListener("navbar-date-filter-changed", handleNavbarDate as EventListener);
    window.addEventListener("kot-updated", handleRefresh);
    window.addEventListener("order-updated", handleRefresh);
    window.addEventListener("table-status-changed", handleRefresh);
    window.addEventListener("payment-completed", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    const interval = setInterval(handleRefresh, 5000);
    return () => {
      window.removeEventListener("navbar-date-filter-changed", handleNavbarDate as EventListener);
      window.removeEventListener("kot-updated", handleRefresh);
      window.removeEventListener("order-updated", handleRefresh);
      window.removeEventListener("table-status-changed", handleRefresh);
      window.removeEventListener("payment-completed", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
      clearInterval(interval);
    };
  }, [fetchLiveKotsAndOrders]);

  const [selectedKOT, setSelectedKOT] =
    useState<KOT | null>(null);

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [customerMobile, setCustomerMobile] =
    useState("");

  const [customerId, setCustomerId] =
    useState(0);

  const [tableId, setTableId] =
    useState(0);

  const [tableNumber, setTableNumber] =
    useState("");

  const [discount, setDiscount] =
    useState(0);

  const [discountType, setDiscountType] =
    useState<'percent' | 'fixed'>('percent');

  const [tax, setTax] =
    useState(0);

  const [showDiscountControls, setShowDiscountControls] =
    useState(false);

  const [showTaxControls, setShowTaxControls] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("UPI");

  const [paymentAmount, setPaymentAmount] =
    useState(0);

  const [invoice, setInvoice] =
    useState<Invoice | null>(null);

  const [payment, setPayment] =
    useState<Payment | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<UniversalInvoicePrintData | null>(null);
  const [previewInvoiceNumber, setPreviewInvoiceNumber] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [liveInvoices, setLiveInvoices] =
    useState<any[]>([]);

  const [generatingKotId, setGeneratingKotId] = useState<string | number | null>(null);
  const [navbarDateFilter, setNavbarDateFilter] = useState<{ filter: string; startDate: string; endDate: string }>({
    filter: localStorage.getItem("navbar_date_filter") || "All",
    startDate: localStorage.getItem("navbar_start_date") || "",
    endDate: localStorage.getItem("navbar_end_date") || "",
  });

  const isBillingDateInRange = (dateStr?: string) => {
    if (!navbarDateFilter.startDate || navbarDateFilter.filter === "All") return true;
    if (!dateStr) return true;
    const cleanDate = dateStr.split("T")[0];
    const from = navbarDateFilter.startDate.split("T")[0];
    const to = (navbarDateFilter.endDate || navbarDateFilter.startDate).split("T")[0];
    if (from && cleanDate < from) return false;
    if (to && cleanDate > to) return false;
    return true;
  };
  const [isSubmittingBill, setIsSubmittingBill] =
    useState(false);

  const [isSettlingCounter, setIsSettlingCounter] =
    useState(false);

  const [showCounterSettlementModal, setShowCounterSettlementModal] =
    useState(false);
  const [counterPayMethod, setCounterPayMethod] =
    useState<PaymentMethod>("UPI");
  const [counterCashReceived, setCounterCashReceived] =
    useState<string>("");
  const [counterTxnRef, setCounterTxnRef] =
    useState<string>("");
  const [counterCardRef, setCounterCardRef] =
    useState<string>("");
  const [counterUpiVerified, setCounterUpiVerified] =
    useState(false);

  const [existingBillNotice, setExistingBillNotice] =
    useState<string | null>(null);

  const mapBackendInvoiceToLocal = useCallback((bInv: any): Invoice => {
    let resolvedId = bInv.id;
    if ((!resolvedId || resolvedId > 1000000000) && bInv.orderId) {
      const match = liveInvoices.find((li: any) => Number(li.orderId) === Number(bInv.orderId) && Number(li.id) < 1000000000);
      if (match) resolvedId = match.id;
    }

    const isPaid = String(bInv.status).toUpperCase() === "PAID" ||
      (bInv.dueAmount !== undefined && Number(bInv.dueAmount) <= 0 && Number(bInv.paidAmount || 0) > 0);
    const totalTax = Number(bInv.taxAmount || 0);
    const isInterstate = Boolean((bInv.igst && Number(bInv.igst) > 0) || bInv.isInterstate);
    const cgstVal = bInv.cgst !== undefined ? Number(bInv.cgst) : (!isInterstate && totalTax > 0 ? totalTax / 2 : 0);
    const sgstVal = bInv.sgst !== undefined ? Number(bInv.sgst) : (!isInterstate && totalTax > 0 ? totalTax / 2 : 0);
    const igstVal = bInv.igst !== undefined ? Number(bInv.igst) : (isInterstate && totalTax > 0 ? totalTax : 0);
    const taxableAmt = bInv.taxableAmount !== undefined
      ? Number(bInv.taxableAmount)
      : Math.max(0, Number(bInv.subtotal || bInv.grandTotal || 0) - Number(bInv.discountAmount || 0));

    return {
      id: resolvedId,
      invoiceNumber: bInv.invoiceNumber || `INV-${resolvedId}`,
      kotNumber: bInv.kotNumber || "",
      customerId: bInv.customerId || 1,
      customerName: bInv.customerName || bInv.guestName || "Guest",
      customerMobile: bInv.customerMobile || "",
      tableId: bInv.tableId,
      tableNumber: bInv.tableNumber || (bInv.tableId ? `Table ${bInv.tableId}` : ""),
      items: (bInv.items || []).map((it: any, idx: number) => ({
        id: it.id || idx + 1,
        itemName: it.name || it.itemName || it.description || "Item",
        quantity: Number(it.quantity || it.qty || 1),
        price: Number(it.unitPrice || it.price || 0),
      })),
      itemTotal: Number(bInv.subtotal || bInv.grandTotal || 0),
      discount: 0,
      discountAmount: Number(bInv.discountAmount || 0),
      tax: Number(totalTax > 0 ? (bInv.taxRate || 5) : 0),
      taxAmount: totalTax,
      taxableAmount: taxableAmt,
      cgst: cgstVal,
      sgst: sgstVal,
      igst: igstVal,
      cgstRate: !isInterstate && totalTax > 0 ? (Number(bInv.cgstRate) || (Number(bInv.taxRate || 5) / 2)) : 0,
      sgstRate: !isInterstate && totalTax > 0 ? (Number(bInv.sgstRate) || (Number(bInv.taxRate || 5) / 2)) : 0,
      igstRate: isInterstate && totalTax > 0 ? (Number(bInv.igstRate) || Number(bInv.taxRate || 5)) : 0,
      isInterstate: isInterstate,
      grandTotal: Number(bInv.grandTotal || 0),
      paidAmount: isPaid ? Number(bInv.grandTotal || 0) : Number(bInv.paidAmount || 0),
      remainingAmount: isPaid ? 0 : Number(bInv.dueAmount !== undefined ? bInv.dueAmount : bInv.grandTotal - (bInv.paidAmount || 0)),
      paymentMethod: bInv.paymentMethod || "UPI",
      status: isPaid ? "PAID" : (bInv.status || "UNPAID"),
      createdAt: bInv.createdAt || new Date().toISOString(),
    };
  }, [liveInvoices]);

  const openExistingBill = useCallback((existingInv: any, kot?: KOT) => {
    const mapped = mapBackendInvoiceToLocal(existingInv);
    setInvoice(mapped);
    if (kot) {
      setSelectedKOT(kot);
      setTableId(kot.tableId);
      setTableNumber(kot.tableNumber);
      setCustomerName(kot.customerName);
    }
    setExistingBillNotice(`Bill #${mapped.invoiceNumber} has already been generated for this order. Viewing existing invoice.`);
    setStep("success");
  }, [mapBackendInvoiceToLocal]);

  /* =========================================================
     EDIT MODE
  ========================================================= */

  const [editingKOT, setEditingKOT] =
    useState<KOT | null>(null);

  const [originalItemIds, setOriginalItemIds] = useState<number[]>([]);
  const [editItems, setEditItems] =
    useState<OrderItem[]>([]);

  const [showAddItemPopup, setShowAddItemPopup] =
    useState(false);

  const [menuSearch, setMenuSearch] =
    useState("");

  /* =========================================================
     CUSTOMIZATION
  ========================================================= */

  const [showCustomizePopup, setShowCustomizePopup] =
    useState(false);

  const [hotelName, setHotelName] =
    useState(
      () =>
        localStorage.getItem(
          "billing_hotel_name"
        ) || "ANNAPURNA RESTAURANT"
    );

  const [customHotelName, setCustomHotelName] =
    useState(
      () =>
        localStorage.getItem(
          "billing_hotel_name"
        ) || "ANNAPURNA RESTAURANT"
    );

  const [gstin, setGstin] =
    useState(
      () =>
        localStorage.getItem(
          "billing_gstin"
        ) || ""
    );

  const [hotelAddress, setHotelAddress] =
    useState(
      () =>
        localStorage.getItem(
          "billing_address"
        ) || ""
    );

  const [phoneNumber, setPhoneNumber] =
    useState(
      () =>
        localStorage.getItem(
          "billing_phone"
        ) || ""
    );

  const [footerMessage, setFooterMessage] =
    useState(
      () =>
        localStorage.getItem(
          "billing_footer"
        ) ||
        "Thank you for visiting us."
    );

  const [customGstin, setCustomGstin] =
    useState(
      () =>
        localStorage.getItem(
          "billing_gstin"
        ) || ""
    );

  const [customHotelAddress, setCustomHotelAddress] =
    useState(
      () =>
        localStorage.getItem(
          "billing_address"
        ) || ""
    );

  const [customPhoneNumber, setCustomPhoneNumber] =
    useState(
      () =>
        localStorage.getItem(
          "billing_phone"
        ) || ""
    );

  const [customFooterMessage, setCustomFooterMessage] =
    useState(
      () =>
        localStorage.getItem(
          "billing_footer"
        ) ||
        "Thank you for visiting us."
    );

  const [customizeErrors, setCustomizeErrors] =
    useState<Record<string, string>>({});

  const [billLogo, setBillLogo] = useState<string>(
    () => localStorage.getItem("billing_logo") || ""
  );
  const [customBillLogo, setCustomBillLogo] = useState<string>(
    () => localStorage.getItem("billing_logo") || ""
  );
  const [logoError, setLogoError] = useState<string>("");

  const [billingPage, setBillingPage] = useState<number>(1);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [savedGstBusiness, setSavedGstBusiness] = useState<any>(null);
  const [savedTaxGroups, setSavedTaxGroups] = useState<any[]>([]);
  const [savedTaxPricing, setSavedTaxPricing] = useState<any>(null);

  // Reset pagination to first page when search changes
  useEffect(() => {
    setBillingPage(1);
  }, [search]);

  // Load backend saved billing settings, business logo, and GST settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const allSettings = await settingsService.getSettings();
        const billLogoSetting = allSettings.find(
          (s) => s.category === "BILLING" && s.settingKey === "BILL_LOGO"
        );
        const businessLogoSetting = allSettings.find(
          (s) => s.category === "BUSINESS" && s.settingKey === "LOGO"
        );
        const activeLogo =
          billLogoSetting?.settingValue ||
          businessLogoSetting?.settingValue ||
          localStorage.getItem("billing_logo") ||
          localStorage.getItem("business_logo") ||
          "";
        if (activeLogo) {
          setBillLogo(activeLogo);
          setCustomBillLogo(activeLogo);
          localStorage.setItem("billing_logo", activeLogo);
        }
        const hotelNameSetting = allSettings.find(
          (s) => s.category === "BILLING" && s.settingKey === "HOTEL_NAME"
        );
        if (hotelNameSetting?.settingValue) {
          setHotelName(hotelNameSetting.settingValue);
          setCustomHotelName(hotelNameSetting.settingValue);
          localStorage.setItem("billing_hotel_name", hotelNameSetting.settingValue);
        }

        // GST configuration settings
        const gstBizSetting = allSettings.find(
          (s) => s.category === "GST" && s.settingKey === "BUSINESS_GST"
        );
        const taxGroupsSetting = allSettings.find(
          (s) => s.category === "GST" && s.settingKey === "TAX_GROUPS"
        );
        const taxPricingSetting = allSettings.find(
          (s) => s.category === "GST" && s.settingKey === "TAX_PRICING"
        );

        if (gstBizSetting?.settingValue) {
          try { setSavedGstBusiness(JSON.parse(gstBizSetting.settingValue)); } catch { }
        }
        if (taxGroupsSetting?.settingValue) {
          try { setSavedTaxGroups(JSON.parse(taxGroupsSetting.settingValue)); } catch { }
        }
        if (taxPricingSetting?.settingValue) {
          try { setSavedTaxPricing(JSON.parse(taxPricingSetting.settingValue)); } catch { }
        }
      } catch (err) {
        console.warn("Could not load backend billing settings:", err);
      }
    };
    loadSavedSettings();

    const handleBrandingUpdate = () => {
      const savedLogo =
        localStorage.getItem("billing_logo") ||
        localStorage.getItem("business_logo") ||
        "";
      if (savedLogo) {
        setBillLogo(savedLogo);
        setCustomBillLogo(savedLogo);
      }
    };

    const handleGstUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.businessGst) setSavedGstBusiness(e.detail.businessGst);
        if (e.detail.taxGroups) setSavedTaxGroups(e.detail.taxGroups);
        if (e.detail.taxPricing) setSavedTaxPricing(e.detail.taxPricing);
      }
    };

    window.addEventListener("branding-updated", handleBrandingUpdate);
    window.addEventListener("gst-settings-updated", handleGstUpdate);
    return () => {
      window.removeEventListener("branding-updated", handleBrandingUpdate);
      window.removeEventListener("gst-settings-updated", handleGstUpdate);
    };
  }, []);

  /* =========================================================
     CALCULATIONS
  ========================================================= */

  const itemTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
          Number(item.quantity),
        0
      ),
    [items]
  );

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Number((itemTotal * (discount / 100)).toFixed(2));
    } else {
      return Math.min(itemTotal, Math.max(0, Number(discount) || 0));
    }
  }, [itemTotal, discount, discountType]);

  const taxableAmount = useMemo(
    () =>
      Math.max(
        itemTotal - discountAmount,
        0
      ),
    [itemTotal, discountAmount]
  );

  const cgstAmount = useMemo(() => {
    if (isInterstate || tax <= 0) return 0;
    return Number((taxableAmount * ((tax / 2) / 100)).toFixed(2));
  }, [taxableAmount, tax, isInterstate]);

  const sgstAmount = useMemo(() => {
    if (isInterstate || tax <= 0) return 0;
    return Number((taxableAmount * ((tax / 2) / 100)).toFixed(2));
  }, [taxableAmount, tax, isInterstate]);

  const igstAmount = useMemo(() => {
    if (!isInterstate || tax <= 0) return 0;
    return Number((taxableAmount * (tax / 100)).toFixed(2));
  }, [taxableAmount, tax, isInterstate]);

  const taxAmount = useMemo(
    () => (isInterstate ? igstAmount : Number((cgstAmount + sgstAmount).toFixed(2))),
    [isInterstate, igstAmount, cgstAmount, sgstAmount]
  );

  const grandTotal = useMemo(
    () =>
      Number(Math.max(
        taxableAmount + taxAmount,
        0
      ).toFixed(2)),
    [taxableAmount, taxAmount]
  );

  /* Edit KOT auto-recalculations */
  const editSubtotal = useMemo(() => {
    return editItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [editItems]);

  const editPrevItems = useMemo(() => {
    return editItems.filter((item) => originalItemIds.includes(item.id));
  }, [editItems, originalItemIds]);

  const editNewItems = useMemo(() => {
    return editItems.filter((item) => !originalItemIds.includes(item.id));
  }, [editItems, originalItemIds]);

  const editPrevSubtotal = useMemo(() => {
    return editPrevItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [editPrevItems]);

  const editNewSubtotal = useMemo(() => {
    return editNewItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [editNewItems]);

  const editingLinkedInvoice = useMemo(() => {
    if (!editingKOT) return null;
    return (
      liveInvoices.find(
        (inv) => Number(inv.orderId) === Number(editingKOT.orderId)
      ) || null
    );
  }, [editingKOT, liveInvoices]);

  const editDiscountPercent = useMemo(() => {
    if (editingLinkedInvoice && Number(editingLinkedInvoice.grandTotal || 0) > 0) {
      const discAmt = Number(editingLinkedInvoice.discountAmount || 0);
      const sub = Number(editingLinkedInvoice.itemTotal || editingLinkedInvoice.grandTotal || 0);
      if (sub > 0) return Math.round((discAmt / sub) * 100);
    }
    return discount;
  }, [editingLinkedInvoice, discount]);

  const editDiscountAmount = useMemo(() => {
    return editSubtotal * (editDiscountPercent / 100);
  }, [editSubtotal, editDiscountPercent]);

  const editTaxPercent = useMemo(() => {
    if (editingLinkedInvoice && Number(editingLinkedInvoice.taxAmount || 0) > 0) {
      return Number(editingLinkedInvoice.tax || 5);
    }
    return tax > 0 ? tax : 5;
  }, [editingLinkedInvoice, tax]);

  const editTaxAmount = useMemo(() => {
    const taxable = Math.max(0, editSubtotal - editDiscountAmount);
    return taxable * (editTaxPercent / 100);
  }, [editSubtotal, editDiscountAmount, editTaxPercent]);

  const editGrandTotal = useMemo(() => {
    const taxable = Math.max(0, editSubtotal - editDiscountAmount);
    return taxable + editTaxAmount;
  }, [editSubtotal, editDiscountAmount, editTaxAmount]);

  /* =========================================================
     FILTER KOTS & PAGINATION
  ========================================================= */

  const filteredKOTs = useMemo(() => {
    const isFilterActive = navbarDateFilter.filter !== "All" && Boolean(navbarDateFilter.startDate);
    // Exclude any KOT whose linked invoice is already PAID or completed, and apply date filter if active
    const activeUnbilled = pendingKOTs.filter((k) => {
      if (isFilterActive && navbarDateFilter.filter !== "Today" && !isBillingDateInRange(k.createdAt)) return false;
      const linkedInv = liveInvoices.find((i: any) => Number(i.orderId) === Number(k.orderId || k.id));
      if (linkedInv && (linkedInv.status === "PAID" || linkedInv.status === "COMPLETED")) return false;
      return true;
    });

    const q = search.toLowerCase().trim();
    if (!q) return activeUnbilled;

    return activeUnbilled.filter(
      (k) =>
        k.kotNumber.toLowerCase().includes(q) ||
        String(k.orderId).toLowerCase().includes(q) ||
        k.customerName.toLowerCase().includes(q) ||
        k.tableNumber.toLowerCase().includes(q)
    );
  }, [pendingKOTs, liveInvoices, search, navbarDateFilter]);

  const paginatedKOTs = useMemo(() => {
    const start = (billingPage - 1) * 10;
    return filteredKOTs.slice(start, start + 10);
  }, [filteredKOTs, billingPage]);

  /* =========================================================
     ONE-CLICK BILL GENERATION
  ========================================================= */

  const handleOneClickGenerateBill = useCallback(
    async (kot: KOT) => {
      if (isSubmittingBill) return;
      const targetId = kot.id || kot.orderId;
      setGeneratingKotId(targetId);

      // 1. Duplicate check: If an invoice already exists for this order, open it immediately
      const existingInv = liveInvoices.find(
        (inv) => Number(inv.orderId) === Number(kot.orderId)
      );
      if (existingInv) {
        setGeneratingKotId(null);
        openExistingBill(existingInv, kot);
        return;
      }

      try {
        setIsSubmittingBill(true);

        const validItems = (kot.items || []).filter(
          (i) => i.itemName && Number(i.quantity) > 0
        );

        const finalItemTotal = validItems.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0
        );

        const finalDiscountAmount = 0;
        const defaultRate = savedTaxPricing?.defaultTaxGroupId
          ? (savedTaxGroups.find((g: any) => g.id === savedTaxPricing.defaultTaxGroupId)?.gstRate ?? 5)
          : 5;
        const finalTaxRate = defaultRate;
        const finalTaxableAmount = Math.max(0, finalItemTotal - finalDiscountAmount);
        const finalTaxAmount = finalTaxableAmount * (finalTaxRate / 100);
        const finalCgst = finalTaxAmount / 2;
        const finalSgst = finalTaxAmount / 2;
        const finalGrandTotal = Math.max(0, finalTaxableAmount + finalTaxAmount);

        const nextInvNo = nextInvoiceNumber();

        const inv: Invoice = {
          id: Date.now(),
          invoiceNumber: nextInvNo,
          orderId: kot.orderId,
          kotNumber: kot.kotNumber,
          customerId: kot.customerId || 1,
          customerName: kot.customerName || "Guest",
          customerMobile: kot.customerMobile || "",
          tableId: kot.tableId,
          tableNumber: kot.tableNumber,
          items: [...validItems],
          itemTotal: finalItemTotal,
          discount: 0,
          discountAmount: finalDiscountAmount,
          tax: finalTaxRate,
          taxAmount: finalTaxAmount,
          taxableAmount: finalTaxableAmount,
          cgst: finalCgst,
          sgst: finalSgst,
          igst: 0,
          cgstRate: finalTaxRate / 2,
          sgstRate: finalTaxRate / 2,
          igstRate: 0,
          isInterstate: false,
          grandTotal: finalGrandTotal,
          paidAmount: 0,
          remainingAmount: finalGrandTotal,
          paymentMethod: "UPI",
          status: "UNPAID",
          createdAt: new Date().toISOString(),
        };

        const res = await saveInvoice(inv, kot.orderId, selectedBranchId);
        if (res?.id) {
          inv.id = res.id;
          if (res.invoiceNumber) inv.invoiceNumber = res.invoiceNumber;
        }

        // Put table into CLEANING for 5 minutes upon bill generation
        if (kot.tableId) {
          localStorage.setItem(`table_cleaning_start_${kot.tableId}`, String(Date.now()));
          await tableService.updateTableStatus(kot.tableId, "CLEANING").catch((err) => {
            console.warn("Could not update table status to CLEANING:", err);
          });
          window.dispatchEvent(
            new CustomEvent("table-status-changed", {
              detail: { tableId: kot.tableId, status: "CLEANING" },
            })
          );
        }

        const remainingKOTs = pendingKOTs.filter(
          (item) => Number(item.id) !== Number(kot.id) && Number(item.orderId) !== Number(kot.orderId)
        );
        saveKOTs(remainingKOTs);
        setPendingKOTs(remainingKOTs);

        setSelectedKOT(kot);
        setTableId(kot.tableId);
        setTableNumber(kot.tableNumber);
        setCustomerName(kot.customerName);
        setItems(validItems);
        setInvoice(inv);
        setPayment(null);
        setExistingBillNotice(null);

        // Transition immediately to Invoice view / preview
        setStep("success");
        await fetchLiveKotsAndOrders();
      } catch (err: any) {
        dialogService.alert({
          title: "Billing Error",
          message: "Failed to generate bill: " + (err?.response?.data?.message || err.message),
          type: "error",
        });
      } finally {
        setGeneratingKotId(null);
        setIsSubmittingBill(false);
      }
    },
    [
      isSubmittingBill,
      liveInvoices,
      openExistingBill,
      selectedBranchId,
      pendingKOTs,
      fetchLiveKotsAndOrders,
    ]
  );

  /* =========================================================
     SELECT ORDER (MANUAL CUSTOMIZATION FLOW)
  ========================================================= */

  const selectKOT = (kot: KOT) => {
    setSelectedKOT(kot);

    setItems(
      kot.items.map((x) => ({
        ...x,
      }))
    );

    setCustomerId(kot.customerId);

    setCustomerName(
      kot.customerName
    );

    setCustomerMobile(
      kot.customerMobile || ""
    );

    setTableId(kot.tableId);

    setTableNumber(
      kot.tableNumber
    );

    setDiscount(0);
    setTax(0);

    setShowDiscountControls(false);
    setShowTaxControls(false);

    setPaymentMethod("UPI");
    setPaymentAmount(0);

    const current = Number(
      localStorage.getItem(
        INVOICE_SEQUENCE_KEY
      ) || "1000"
    );

    setPreviewInvoiceNumber(
      `INV-${current + 1}`
    );

    setInvoice(null);
    setPayment(null);

    setStep("billing-payment");
  };

  /* Auto-select order if arriving from Tables module via URL search query */
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetOrderId = searchParams.get("orderId");
    const targetKotNumber = searchParams.get("kotNumber");
    const targetTableId = searchParams.get("tableId");
    const targetAction = searchParams.get("action");
    const targetInvoiceId = searchParams.get("invoiceId");

    if (!targetOrderId && !targetKotNumber && !targetTableId && !targetInvoiceId) return;
    if (selectedKOT || editingKOT || isSubmittingBill) return;

    if (targetInvoiceId) {
      let matchInv = liveInvoices.find(
        (i: any) => String(i.id) === String(targetInvoiceId) || (i.invoiceNumber && i.invoiceNumber === targetInvoiceId)
      );
      if (!matchInv) {
        try {
          const locals = JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) || "[]");
          matchInv = locals.find((i: any) => String(i.id) === String(targetInvoiceId) || (i.invoiceNumber && i.invoiceNumber === targetInvoiceId));
        } catch {}
      }
      if (matchInv) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
        openExistingBill(matchInv);
        return;
      }
      // If not yet in liveInvoices, fetch from backend directly
      billingService.getInvoices(selectedBranchId || undefined).then((freshInvs) => {
        const found = (freshInvs || []).find((i: any) => String(i.id) === String(targetInvoiceId) || (i.invoiceNumber && i.invoiceNumber === targetInvoiceId));
        if (found) {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (_) {}
          openExistingBill(found);
        }
      }).catch(() => {});
    }

    // 1. Search in pendingKOTs and local storage
    const allAvailable = [...pendingKOTs, ...getKOTs()];
    let match = allAvailable.find(
      (b) =>
        (targetOrderId && String(b.orderId) === String(targetOrderId)) ||
        (targetKotNumber && b.kotNumber === targetKotNumber) ||
        (targetTableId && String(b.tableId) === String(targetTableId))
    );

    if (match) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) { }

      if (targetAction === "edit") {
        openEditKOT(match);
      } else {
        const existingInv = liveInvoices.find(
          (i: any) => Number(i.orderId) === Number(match!.orderId)
        );
        if (existingInv) {
          openExistingBill(existingInv, match);
        } else {
          handleOneClickGenerateBill(match);
        }
      }
      return;
    }

    // 2. If not found in memory, try fetching order directly by ID from backend
    if (targetOrderId) {
      orderService
        .getOrderById(Number(targetOrderId))
        .then(async (order: any) => {
          if (order && order.id) {
            // First check if an existing invoice already exists for this order
            const backendInvs = await billingService.getInvoices(selectedBranchId || undefined).catch(() => []);
            const existingInv = (backendInvs || []).find((i: any) => Number(i.orderId) === Number(order.id));

            const reconstructedKot: KOT = {
              id: order.id,
              kotNumber: order.orderNumber || `KOT-${order.id}`,
              orderId: order.id,
              customerId: 1,
              customerName: order.guestName || "Guest",
              tableId: order.tableId || (targetTableId ? Number(targetTableId) : 1),
              tableNumber: formatTableNumber({ name: order.tableName, tableNumber: order.tableNumber, id: order.tableId }),
              items: (order.items || []).map((it: any, idx: number) => ({
                id: it.id || idx + 1,
                itemName: it.name || "Item",
                quantity: it.quantity || 1,
                price: it.unitPrice || 0,
              })),
              status: "PENDING",
              createdAt: order.createdAt || new Date().toISOString(),
            };
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (_) { }
            setPendingKOTs((prev) => [reconstructedKot, ...prev.filter(p => p.orderId !== order.id)]);
            if (targetAction === "edit") {
              openEditKOT(reconstructedKot);
            } else if (existingInv) {
              openExistingBill(existingInv, reconstructedKot);
            } else {
              handleOneClickGenerateBill(reconstructedKot);
            }
          }
        })
        .catch(() => { });
    } else if (targetTableId) {
      orderService
        .getOrders(selectedBranchId)
        .then(async (ords) => {
          const matchOrd = (ords || []).find(
            (o) => String(o.tableId) === String(targetTableId) && o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "PAID"
          );
          if (matchOrd && matchOrd.id) {
            const backendInvs = await billingService.getInvoices(selectedBranchId || undefined).catch(() => []);
            const existingInv = (backendInvs || []).find((i: any) => Number(i.orderId) === Number(matchOrd.id));

            const reconstructedKot: KOT = {
              id: matchOrd.id,
              kotNumber: matchOrd.orderNumber || `KOT-${matchOrd.id}`,
              orderId: matchOrd.id,
              customerId: 1,
              customerName: matchOrd.guestName || "Guest",
              tableId: matchOrd.tableId || Number(targetTableId),
              tableNumber: formatTableNumber({ name: matchOrd.tableName, tableNumber: matchOrd.tableNumber, id: matchOrd.tableId }),
              items: (matchOrd.items || []).map((it: any, idx: number) => ({
                id: it.id || idx + 1,
                itemName: it.name || "Item",
                quantity: it.quantity || 1,
                price: it.unitPrice || 0,
              })),
              status: "PENDING",
              createdAt: matchOrd.createdAt || new Date().toISOString(),
            };
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (_) { }
            setPendingKOTs((prev) => [reconstructedKot, ...prev.filter(p => p.orderId !== matchOrd.id)]);
            if (targetAction === "edit") {
              openEditKOT(reconstructedKot);
            } else if (existingInv) {
              openExistingBill(existingInv, reconstructedKot);
            } else {
              handleOneClickGenerateBill(reconstructedKot);
            }
          }
        })
        .catch(() => { });
    }
  }, [pendingKOTs, selectedKOT, editingKOT, isSubmittingBill, liveInvoices, openExistingBill, handleOneClickGenerateBill]);

  /* =========================================================
     DIRECT QUANTITY CHANGE
  ========================================================= */

  const setItemQuantity = (
    id: number,
    value: string
  ) => {
    if (value === "") {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
              ...item,
              quantity: 0,
            }
            : item
        )
      );

      return;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      return;
    }

    const quantity = Math.max(
      0,
      Math.floor(parsed)
    );

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity,
          }
          : item
      )
    );
  };

  /* =========================================================
     EDIT KOT
  ========================================================= */

  const openEditKOT = (kot: KOT) => {
    setEditingKOT(kot);
    setOriginalItemIds((kot.items || []).map((item) => item.id));

    setEditItems(
      kot.items.map((item) => ({
        ...item,
      }))
    );

    setMenuSearch("");
    setShowAddItemPopup(false);
  };

  const closeEditKOT = () => {
    setEditingKOT(null);
    setOriginalItemIds([]);
    setEditItems([]);
    setShowAddItemPopup(false);
    setMenuSearch("");
  };

  const setEditItemQuantity = (
    id: number,
    value: string
  ) => {
    const quantity =
      value === ""
        ? 0
        : Math.max(
          0,
          Number(value)
        );

    setEditItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity,
          }
          : item
      )
    );
  };

  const decreaseEditItemQuantity = (id: number) => {
    setEditItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity: Math.max(1, item.quantity - 1),
          }
          : item
      )
    );
  };

  const increaseEditItemQuantity = (id: number) => {
    setEditItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity: item.quantity + 1,
          }
          : item
      )
    );
  };

  const removeEditItem = (
    id: number
  ) => {
    setEditItems((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const addMenuItem = (
    menuItem: OrderItem
  ) => {
    const newItem: OrderItem = {
      ...menuItem,
      id:
        Date.now() +
        Math.floor(
          Math.random() * 1000
        ),
      quantity: 1,
    };

    setEditItems((current) => {
      const existing =
        current.find(
          (item) =>
            item.itemName ===
            menuItem.itemName
        );

      if (existing) {
        return current.map(
          (item) =>
            item.itemName ===
              menuItem.itemName
              ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
              : item
        );
      }

      return [
        ...current,
        newItem,
      ];
    });

    // NOTE: Keep popup open so the user can select multiple items in a single session!
  };

  const saveEditedKOT = async () => {
    if (!editingKOT) return;

    const validEditItems =
      editItems.filter(
        (item) =>
          item.quantity > 0
      );

    if (
      validEditItems.length === 0
    ) {
      dialogService.alert({
        title: "Validation Error",
        message: "At least one item with quantity greater than 0 is required.",
        type: "warning",
      });

      return;
    }

    const updatedKOT: KOT = {
      ...editingKOT,
      items:
        validEditItems.map(
          (item) => ({
            ...item,
          })
        ),
    };

    if (editingKOT.orderId) {
      try {
        await orderService.updateOrder(editingKOT.orderId, {
          branchId: selectedBranchId || 1,
          tableId: editingKOT.tableId,
          guestName: editingKOT.customerName,
          items: validEditItems.map((it) => ({
            name: it.itemName,
            quantity: it.quantity,
            unitPrice: it.price,
          })),
          discount: editDiscountAmount,
          taxRate: editTaxPercent,
        });
      } catch (err) {
        console.warn("Could not save edited order to backend:", err);
      }
    }

    const updatedList =
      pendingKOTs.map(
        (kot) =>
          kot.id === editingKOT.id
            ? updatedKOT
            : kot
      );

    saveKOTs(updatedList);

    setPendingKOTs(
      updatedList
    );

    if (
      selectedKOT?.id ===
      editingKOT.id
    ) {
      setSelectedKOT(
        updatedKOT
      );

      setItems(
        updatedKOT.items
      );
    }

    // Refresh invoices and KOTs from backend to preserve consistency
    try {
      const [freshInvoices] = await Promise.all([
        billingService.getInvoices(selectedBranchId || undefined).catch(() => []),
      ]);
      if (Array.isArray(freshInvoices) && freshInvoices.length > 0) {
        setLiveInvoices(freshInvoices);
        if (step === "success" && invoice && Number(invoice.orderId) === Number(editingKOT.orderId)) {
          const matchedInv = freshInvoices.find((i: any) => Number(i.orderId) === Number(editingKOT.orderId));
          if (matchedInv) {
            setInvoice(mapBackendInvoiceToLocal(matchedInv));
          }
        }
      }
    } catch (e) {
      console.warn("Error refreshing after edit:", e);
    }

    try {
      localStorage.setItem("pending_kots", JSON.stringify(updatedList));
    } catch (_) { }
    window.dispatchEvent(new CustomEvent("order-updated", { detail: { orderId: editingKOT.orderId } }));
    window.dispatchEvent(new CustomEvent("kot-updated"));
    if (editingKOT.tableId) {
      window.dispatchEvent(new CustomEvent("table-status-changed", { detail: { tableId: editingKOT.tableId } }));
    }
    closeEditKOT();
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setLogoError("Please upload a valid image file (PNG, JPG, JPEG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File size exceeds 2MB limit. Please upload a smaller image.");
      return;
    }

    setLogoError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomBillLogo(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* =========================================================
     MENU SEARCH
  ========================================================= */

  const allMergedMenuItems = useMemo(() => {
    const existingNames = new Set(backendMenuItems.map((b) => b.itemName.toLowerCase().trim()));
    const unseeded = FULL_HOTEL_MENU.filter((f) => !existingNames.has(f.itemName.toLowerCase().trim()));
    return [...backendMenuItems, ...unseeded];
  }, [backendMenuItems]);

  const filteredMenuItems =
    useMemo(() => {
      const q =
        menuSearch
          .toLowerCase()
          .trim();

      if (!q)
        return allMergedMenuItems;

      return allMergedMenuItems.filter(
        (item) =>
          item.itemName
            .toLowerCase()
            .includes(q)
      );
    }, [menuSearch, allMergedMenuItems]);

  /* =========================================================
     COMPLETE BILL
  ========================================================= */

  const completeBill = async () => {
    if (isSubmittingBill) return;

    if (!selectedKOT) {
      dialogService.alert({
        title: "KOT Required",
        message: "KOT not selected.",
        type: "warning",
      });

      return;
    }

    // Reuse existing bill if one already exists for this order
    const existing = liveInvoices.find((i) => Number(i.orderId) === Number(selectedKOT.orderId));
    if (existing) {
      openExistingBill(existing, selectedKOT);
      return;
    }

    const validItems =
      items.filter(
        (item) =>
          Number(item.quantity) >
          0
      );

    if (
      validItems.length === 0
    ) {
      dialogService.alert({
        title: "Validation Error",
        message: "Please enter quantity greater than 0 for at least one item.",
        type: "warning",
      });

      return;
    }

    if (!paymentMethod) {
      dialogService.alert({
        title: "Payment Method Required",
        message: "Please select a payment method.",
        type: "warning",
      });

      return;
    }

    try {
      setIsSubmittingBill(true);

      // Verify backend to prevent parallel duplicate clicks
      const latestInvoices = await billingService.getInvoices(selectedBranchId).catch(() => []);
      const backendExisting = latestInvoices.find((i: any) => Number(i.orderId) === Number(selectedKOT.orderId));
      if (backendExisting) {
        openExistingBill(backendExisting, selectedKOT);
        return;
      }

      const id = Date.now();
      const createdAt = new Date().toISOString();
      const no = nextInvoiceNumber();

      const finalItemTotal =
        validItems.reduce(
          (sum, item) =>
            sum +
            Number(item.price) *
            Number(item.quantity),
          0
        );

      const finalDiscountAmount =
        discountType === 'percent'
          ? Number((finalItemTotal * (discount / 100)).toFixed(2))
          : Math.min(finalItemTotal, Math.max(0, Number(discount) || 0));

      const finalTaxableAmount =
        Math.max(
          finalItemTotal -
          finalDiscountAmount,
          0
        );

      const isInterstateActive = isInterstate;
      const finalCgstRate = isInterstateActive ? 0 : tax / 2;
      const finalSgstRate = isInterstateActive ? 0 : tax / 2;
      const finalIgstRate = isInterstateActive ? tax : 0;

      const finalCgst = isInterstateActive ? 0 : Number((finalTaxableAmount * (finalCgstRate / 100)).toFixed(2));
      const finalSgst = isInterstateActive ? 0 : Number((finalTaxableAmount * (finalSgstRate / 100)).toFixed(2));
      const finalIgst = isInterstateActive ? Number((finalTaxableAmount * (finalIgstRate / 100)).toFixed(2)) : 0;
      const finalTaxAmount = isInterstateActive ? finalIgst : Number((finalCgst + finalSgst).toFixed(2));

      const finalGrandTotal =
        Number(Math.max(
          finalTaxableAmount +
          finalTaxAmount,
          0
        ).toFixed(2));

      const inv: Invoice = {
        id,
        invoiceNumber: no,
        kotNumber:
          selectedKOT.kotNumber,
        customerId,
        customerName,
        customerMobile,
        tableId,
        tableNumber,
        items: [
          ...validItems,
        ],
        itemTotal:
          finalItemTotal,
        discount,
        discountAmount:
          finalDiscountAmount,
        discountType,
        tax,
        taxAmount:
          finalTaxAmount,
        taxableAmount:
          finalTaxableAmount,
        cgst: finalCgst,
        sgst: finalSgst,
        igst: finalIgst,
        cgstRate: isInterstateActive ? 0 : tax / 2,
        sgstRate: isInterstateActive ? 0 : tax / 2,
        igstRate: isInterstateActive ? tax : 0,
        isInterstate: isInterstateActive,
        grandTotal:
          finalGrandTotal,
        paidAmount: 0,
        remainingAmount: finalGrandTotal,
        paymentMethod,
        status: "UNPAID",
        createdAt,
      };

      const res = await saveInvoice(inv, selectedKOT?.orderId, selectedBranchId);
      if (res?.id) {
        inv.id = res.id;
        if (res.invoiceNumber) inv.invoiceNumber = res.invoiceNumber;
      }

      // Put table into CLEANING for 5 minutes upon bill generation
      const targetTableId = tableId || selectedKOT?.tableId;
      if (targetTableId) {
        localStorage.setItem(`table_cleaning_start_${targetTableId}`, String(Date.now()));
        await tableService.updateTableStatus(targetTableId, "CLEANING").catch((err) => {
          console.warn("Could not update table status to CLEANING:", err);
        });
        window.dispatchEvent(
          new CustomEvent("table-status-changed", {
            detail: { tableId: targetTableId, status: "CLEANING" },
          })
        );
      }

      const remainingKOTs = pendingKOTs.filter(
        (k) => Number(k.id) !== Number(selectedKOT.id) && Number(k.orderId) !== Number(selectedKOT.orderId)
      );

      saveKOTs(remainingKOTs);
      setPendingKOTs(remainingKOTs);

      setInvoice(inv);
      setPayment(null);
      setExistingBillNotice(null);

      setStep("success");
      await fetchLiveKotsAndOrders();
    } catch (err: any) {
      dialogService.alert({
        title: "Billing Error",
        message: "Failed to generate bill: " + (err?.response?.data?.message || err.message),
        type: "error",
      });
    } finally {
      setIsSubmittingBill(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const reset = () => {
    setSelectedKOT(null);
    setItems([]);

    setCustomerId(0);
    setCustomerName("");
    setCustomerMobile("");

    setTableId(0);
    setTableNumber("");

    setDiscount(0);
    setTax(0);

    setShowDiscountControls(false);
    setShowTaxControls(false);

    setPaymentMethod("UPI");
    setPaymentAmount(0);

    setInvoice(null);
    setPayment(null);

    setPreviewInvoiceNumber("");

    setSearch("");

    fetchLiveKotsAndOrders();
    setStep("pending-kots");
  };

  /* =========================================================
     BACK
  ========================================================= */

  const back = () => {
    if (
      step ===
      "billing-payment"
    ) {
      setStep(
        "pending-kots"
      );
    }
  };

  /* =========================================================
     CUSTOMIZATION
  ========================================================= */

  const hasInvalidSpacing = (value: string) =>
    /^\s|\s$|\s{2,}/.test(value);

  const getGSTINChecksumCharacter = (gstinWithoutChecksum: string) => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let factor = 1;
    let sum = 0;

    for (const char of gstinWithoutChecksum) {
      const codePoint = chars.indexOf(char);
      if (codePoint < 0) return "";

      const product = codePoint * factor;
      sum += Math.floor(product / 36) + (product % 36);
      factor = factor === 1 ? 2 : 1;
    }

    const checkCodePoint = (36 - (sum % 36)) % 36;
    return chars[checkCodePoint];
  };

  const validateGSTIN = (value: string) => {
    const gst = value.toUpperCase();

    if (!gst) return "";

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9][Z][A-Z0-9]$/.test(gst)) {
      return "Enter a valid 15-character GSTIN: 2-digit state code, valid PAN, entity number, Z, and checksum.";
    }

    const expectedChecksum = getGSTINChecksumCharacter(gst.slice(0, 14));
    if (gst[14] !== expectedChecksum) {
      return "GSTIN checksum is invalid.";
    }

    return "";
  };

  const validateCustomizeField = (
    field: string,
    value: string
  ) => {
    let error = "";

    if (["hotelName", "address", "footer"].includes(field)) {
      if (!value.trim() && field === "hotelName") {
        error = "Hotel / Restaurant Name is required.";
      } else if (hasInvalidSpacing(value)) {
        const label =
          field === "hotelName"
            ? "Hotel / Restaurant Name"
            : field === "address"
              ? "Hotel Address"
              : "Footer Message";
        error = `${label} should not have a space at the beginning or end, and should not contain extra spaces between words.`;
      }
    }

    if (field === "phone" && !/^[6-9]\d{9}$/.test(value)) {
      error = "Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.";
    }

    if (field === "gstin") {
      error = validateGSTIN(value);
    }

    return error;
  };

  const updateCustomizeField = (
    field: string,
    value: string
  ) => {
    const nextValue =
      field === "phone"
        ? sanitizeMobileInput(value)
        : field === "gstin"
          ? value.toUpperCase()
          : value;

    if (field === "hotelName") setCustomHotelName(nextValue);
    if (field === "gstin") setCustomGstin(nextValue);
    if (field === "address") setCustomHotelAddress(nextValue);
    if (field === "phone") setCustomPhoneNumber(nextValue);
    if (field === "footer") setCustomFooterMessage(nextValue);

    setCustomizeErrors((prev) => ({
      ...prev,
      [field]: validateCustomizeField(field, nextValue),
    }));
  };

  const saveHotelCustomization =
    async () => {
      const errors: Record<string, string> = {
        hotelName: validateCustomizeField("hotelName", customHotelName),
        gstin: validateCustomizeField("gstin", customGstin),
        address: validateCustomizeField("address", customHotelAddress),
        phone: validateCustomizeField("phone", customPhoneNumber),
        footer: validateCustomizeField("footer", customFooterMessage),
      };

      setCustomizeErrors(errors);

      if (Object.values(errors).some(Boolean)) {
        return;
      }

      const savedHotelName = customHotelName;
      const savedAddress = customHotelAddress;
      const savedPhone = customPhoneNumber;
      const savedFooter =
        customFooterMessage ||
        "Thank you for visiting us.";
      const savedGstin = customGstin.toUpperCase();
      const savedLogo = customBillLogo;

      localStorage.setItem("billing_hotel_name", savedHotelName);
      localStorage.setItem("billing_gstin", savedGstin);
      localStorage.setItem("billing_address", savedAddress);
      localStorage.setItem("billing_phone", savedPhone);
      localStorage.setItem("billing_footer", savedFooter);
      localStorage.setItem("billing_logo", savedLogo);

      // Persist to backend SQL Server via settingsService
      try {
        await Promise.all([
          settingsService.saveSetting("BILLING", "BILL_LOGO", savedLogo),
          settingsService.saveSetting("BILLING", "HOTEL_NAME", savedHotelName),
          settingsService.saveSetting("BILLING", "GSTIN", savedGstin),
          settingsService.saveSetting("BILLING", "ADDRESS", savedAddress),
          settingsService.saveSetting("BILLING", "PHONE", savedPhone),
          settingsService.saveSetting("BILLING", "FOOTER", savedFooter),
        ]);
      } catch (err) {
        console.warn("Could not save bill customization settings to backend:", err);
      }

      setHotelName(savedHotelName);
      setCustomHotelName(savedHotelName);
      setGstin(savedGstin);
      setHotelAddress(savedAddress);
      setPhoneNumber(savedPhone);
      setFooterMessage(savedFooter);
      setBillLogo(savedLogo);
      setCustomizeErrors({});
      setShowCustomizePopup(false);
    };

  const openCustomize = () => {
    setCustomHotelName(
      hotelName
    );

    setCustomGstin(
      gstin
    );

    setCustomHotelAddress(
      hotelAddress
    );

    setCustomPhoneNumber(
      phoneNumber
    );

    setCustomFooterMessage(
      footerMessage
    );

    setCustomBillLogo(
      billLogo
    );

    setLogoError("");

    setCustomizeErrors({});

    setShowCustomizePopup(
      true
    );
  };

  /* =========================================================
     INVOICE ACTIONS
  ========================================================= */

  const invoiceElement = () =>
    document.getElementById(
      "simple-bill-preview-success"
    );

  const printInvoice = () => {
    if (!invoice) {
      dialogService.alert({
        title: "Invoice Required",
        message: "Generate bill first.",
        type: "warning",
      });
      return;
    }

    const printData: UniversalInvoicePrintData = {
      invoiceNumber: invoice.invoiceNumber || String(invoice.id || 'INV-001'),
      invoiceDate: invoice.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: invoice.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      hotelName: "AJALKAR HOTEL & RESTAURANT",
      hotelAddress: "Hotel Premises, Pune, Maharashtra - 411004",
      hotelPhone: "+91 98765 43210",
      hotelEmail: "hotel@ajalkarpos.com",
      gstin: "27AAKCA1234F1Z5",
      fssai: "11521034000123",
      customerName: invoice.customerName || "Walk-in Guest",
      customerPhone: invoice.customerMobile || "",
      tableName: formatTableName(invoice.tableNumber || "Table", language),
      orderNumber: invoice.orderId ? `ORD-${invoice.orderId}` : (invoice.kotNumber || ""),
      items: (invoice.items || []).map((it, idx) => ({
        id: it.id || idx,
        name: it.itemName || "Dish",
        quantity: it.quantity,
        unitPrice: it.price,
        totalPrice: it.quantity * it.price,
      })),
      subtotal: invoice.itemTotal || 0,
      discountAmount: invoice.discountAmount || 0,
      taxableAmount: invoice.taxableAmount || ((invoice.itemTotal || 0) - (invoice.discountAmount || 0)),
      cgstRate: invoice.cgstRate || 2.5,
      cgstAmount: invoice.cgst || (invoice.taxAmount ? invoice.taxAmount / 2 : 0),
      sgstRate: invoice.sgstRate || 2.5,
      sgstAmount: invoice.sgst || (invoice.taxAmount ? invoice.taxAmount / 2 : 0),
      igstRate: invoice.igstRate || 0,
      igstAmount: invoice.igst || 0,
      totalTax: invoice.taxAmount || 0,
      grandTotal: invoice.grandTotal || 0,
      paymentMethod: invoice.paymentMethod || "CASH",
      paymentStatus: invoice.status || "PAID",
      paidAmount: invoice.paidAmount ?? (invoice.status === "PAID" ? invoice.grandTotal : 0),
      outstandingAmount: invoice.remainingAmount || invoice.dueAmount || 0,
      footerMessage: "Thank you for dining with us! Please visit again.",
      language,
    };

    setPrintModalData(printData);
    setIsPrintModalOpen(true);
  };

  const oldPrintInvoiceLegacy = () => {
    if (!invoice) {
      dialogService.alert({
        title: "Invoice Required",
        message: "Generate bill first.",
        type: "warning",
      });
      return;
    }

    const source = document.getElementById(
      "simple-bill-preview-success"
    );

    if (!source) {
      dialogService.alert({
        title: "Preview Error",
        message: "Invoice preview not found.",
        type: "warning",
      });
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=500,height=800"
    );

    if (!printWindow) {
      dialogService.alert({
        title: "Pop-up Blocked",
        message: "Please allow pop-ups to print the invoice.",
        type: "warning",
      });
      return;
    }

    const invoiceHTML =
      source.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${invoice.invoiceNumber} - Bill Receipt</title>
  <style id="base-print-style">
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }

    @page {
      size: 80mm 297mm;
      margin: 0mm;
    }

    @media print {
      html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
      }
      #simple-bill-preview-success {
        width: 76mm !important;
        max-width: 76mm !important;
        margin: 0 auto !important;
        padding: 2mm 1mm 2mm 1mm !important;
      }
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 80mm !important;
      max-width: 80mm !important;
      background: #fff !important;
      color: #000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nirmala UI", Arial, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
      overflow: visible !important;
    }

    body {
      display: block !important;
      margin: 0 auto !important;
    }

    #simple-bill-preview-success {
      width: 76mm !important;
      max-width: 76mm !important;
      margin: 0 auto !important;
      background: #fff !important;
      color: #000 !important;
      border: none !important;
      padding: 2mm 1mm 2mm 1mm !important;
      text-align: left !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    .simple-business-logo {
      text-align: center !important;
      margin-bottom: 4px !important;
    }

    .simple-business-logo img {
      max-height: 48px !important;
      max-width: 140px !important;
      object-fit: contain !important;
      display: inline-block !important;
    }

    .simple-business-name {
      text-align: center !important;
      font-size: 15px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: .5px !important;
      color: #000 !important;
      line-height: 1.2 !important;
      margin: 0 0 2px 0 !important;
    }

    .simple-business-sub {
      text-align: center !important;
      font-size: 9px !important;
      color: #222 !important;
      margin: 1px 0 !important;
      line-height: 1.25 !important;
      word-break: break-word !important;
    }

    .simple-title {
      text-align: center !important;
      font-size: 10.5px !important;
      font-weight: 800 !important;
      letter-spacing: 1px !important;
      margin: 4px 0 2px 0 !important;
      padding: 2px 0 !important;
      color: #000 !important;
      text-transform: uppercase !important;
    }

    .simple-rule {
      border: none !important;
      border-top: 1px dashed #000 !important;
      margin: 4px 0 !important;
      height: 0 !important;
    }

    .simple-details {
      display: flex !important;
      flex-direction: column !important;
      gap: 2.5px !important;
      margin: 3px 0 5px 0 !important;
      background: #fafafa !important;
      padding: 4px 5px !important;
      border-radius: 4px !important;
      border: 1px dashed #666 !important;
      box-sizing: border-box !important;
      width: 100% !important;
      overflow: visible !important;
    }

    .simple-details-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      width: 100% !important;
      gap: 6px !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
      overflow: visible !important;
    }

    .simple-details-row.full-width {
      display: flex !important;
      justify-content: space-between !important;
      width: 100% !important;
    }

    .detail-half {
      display: flex !important;
      align-items: baseline !important;
      gap: 3px !important;
      min-width: 0 !important;
      flex: 1 1 50% !important;
      overflow: visible !important;
    }

    .detail-half.right {
      justify-content: flex-end !important;
      text-align: right !important;
    }

    .detail-label {
      color: #333 !important;
      font-weight: 600 !important;
      flex-shrink: 0 !important;
      white-space: nowrap !important;
    }

    .detail-value {
      color: #000 !important;
      font-weight: 700 !important;
      overflow: visible !important;
      text-overflow: clip !important;
      word-break: break-word !important;
    }

    .text-right {
      text-align: right !important;
    }

    .status-paid {
      color: #15803d !important;
      font-weight: 800 !important;
    }

    .status-pending {
      color: #b45309 !important;
      font-weight: 800 !important;
    }

    .simple-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 9.5px !important;
      margin: 4px 0 !important;
      table-layout: fixed !important;
      overflow: visible !important;
    }

    .simple-table th {
      border-top: 1px dashed #000 !important;
      border-bottom: 1px dashed #000 !important;
      padding: 3.5px 1px !important;
      font-weight: 800 !important;
      color: #000 !important;
      text-transform: uppercase !important;
      font-size: 8.5px !important;
      line-height: 1.2 !important;
      overflow: visible !important;
    }

    .col-desc {
      width: 44% !important;
      text-align: left !important;
      padding-left: 1px !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      font-weight: 600 !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .col-qty {
      width: 12% !important;
      text-align: center !important;
      white-space: nowrap !important;
      font-variant-numeric: tabular-nums !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .col-rate {
      width: 22% !important;
      text-align: right !important;
      white-space: nowrap !important;
      font-variant-numeric: tabular-nums !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .col-amt {
      width: 22% !important;
      text-align: right !important;
      padding-right: 1px !important;
      white-space: nowrap !important;
      font-variant-numeric: tabular-nums !important;
      font-weight: 700 !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .simple-table td {
      padding: 3px 1px !important;
      border-bottom: 1px dotted #ccc !important;
      vertical-align: top !important;
      line-height: 1.25 !important;
      font-size: 9px !important;
      color: #000 !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .simple-totals {
      width: 100% !important;
      margin: 4px 0 0 0 !important;
      border-top: 1px dashed #000 !important;
      padding-top: 3px !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }

    .totals-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      padding: 1.5px 0 !important;
      font-size: 9.5px !important;
      color: #111 !important;
      line-height: 1.3 !important;
      overflow: visible !important;
    }

    .totals-row span {
      font-weight: 500 !important;
      color: #222 !important;
      overflow: visible !important;
      text-overflow: clip !important;
      padding-right: 4px !important;
    }

    .totals-row strong {
      font-weight: 700 !important;
      color: #000 !important;
      font-variant-numeric: tabular-nums !important;
      white-space: nowrap !important;
      text-align: right !important;
      overflow: visible !important;
      text-overflow: clip !important;
      flex-shrink: 0 !important;
    }

    .tab-num {
      font-variant-numeric: tabular-nums !important;
    }

    .text-uppercase {
      text-transform: uppercase !important;
    }

    .simple-grand {
      border-top: 1.5px solid #000 !important;
      border-bottom: 1.5px solid #000 !important;
      padding: 4px 0 !important;
      margin: 4px 0 !important;
      font-size: 12.5px !important;
      font-weight: 800 !important;
      color: #000 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      overflow: visible !important;
    }

    .simple-grand strong {
      font-size: 13.5px !important;
      font-weight: 900 !important;
      font-variant-numeric: tabular-nums !important;
      flex-shrink: 0 !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .balance-due {
      color: #b91c1c !important;
      font-weight: 700 !important;
    }

    .balance-due strong {
      color: #b91c1c !important;
    }

    .change-returned {
      color: #15803d !important;
      font-weight: 700 !important;
    }

    .change-returned strong {
      color: #15803d !important;
    }

    .simple-footer {
      text-align: center !important;
      border-top: 1px dashed #000 !important;
      margin-top: 8px !important;
      padding-top: 5px !important;
      font-size: 9.5px !important;
      color: #222 !important;
      line-height: 1.3 !important;
    }
  </style>
</head>
<body>
  <div id="simple-bill-preview-success" class="simple-bill">${invoiceHTML}</div>
  <script>
    window.onload = function () {
      try {
        var el = document.getElementById("simple-bill-preview-success") || document.body;
        var hPx = el.scrollHeight || el.offsetHeight;
        var hMm = Math.ceil((hPx * 25.4) / 96) + 4;
        if (hMm < 70) hMm = 70;
        var dynamicPageStyle = document.createElement("style");
        dynamicPageStyle.innerHTML = "@page { size: 80mm " + hMm + "mm !important; margin: 0mm !important; }";
        document.head.appendChild(dynamicPageStyle);
      } catch (err) {
        console.error("Page size calculation err:", err);
      }
      setTimeout(function () {
        window.focus();
        window.print();
      }, 300);
    };
    window.onafterprint = function () {
      setTimeout(function () {
        window.close();
      }, 100);
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const downloadPDF =
    async () => {
      if (!invoice) {
        dialogService.alert({
          title: "Invoice Required",
          message: "Generate bill first.",
          type: "warning",
        });

        return;
      }

      const el =
        invoiceElement();

      if (!el) {
        dialogService.alert({
          title: "Preview Error",
          message: "Invoice preview not found.",
          type: "warning",
        });

        return;
      }

      try {
        const heightMm = Math.max(
          60,
          Math.ceil(
            (el.scrollHeight * 25.4) / 96
          ) + 2
        );

        await html2pdf()
          .set(
            pdfOptions(
              invoice.invoiceNumber,
              heightMm
            )
          )
          .from(el)
          .save();
      } catch (e) {
        console.error(e);

        dialogService.alert({
          title: "Download Failed",
          message: "Unable to download PDF.",
          type: "error",
        });
      }
    };

  const shareWhatsApp = async () => {
    if (!invoice) {
      dialogService.alert({
        title: "Invoice Required",
        message: "Generate bill first.",
        type: "warning",
      });
      return;
    }

    const el = invoiceElement();
    if (!el) {
      dialogService.alert({
        title: "Preview Error",
        message: "Invoice preview not found.",
        type: "warning",
      });
      return;
    }

    try {
      const heightMm = Math.max(
        60,
        Math.ceil((el.scrollHeight * 25.4) / 96) + 2
      );

      const opt = pdfOptions(invoice.invoiceNumber, heightMm);
      const worker = html2pdf().set(opt).from(el);

      let pdfBlob: Blob | null = null;
      let pdfFile: File | null = null;
      try {
        pdfBlob = await worker.outputPdf("blob");
        if (pdfBlob) {
          pdfFile = new File([pdfBlob], `${invoice.invoiceNumber}.pdf`, { type: "application/pdf" });
        }
      } catch (err) {
        console.error("PDF generation error:", err);
      }

      const activeHotelName = hotelName || "Hotel Management";
      const activePhone = phoneNumber || "";
      const targetPhone = (customerMobile || invoice.customerMobile || "").replace(/[^0-9]/g, "");

      const defaultMsg = [
        "Thank you for visiting us. Please visit again!",
        "",
        `*${activeHotelName}*`,
        activePhone ? `${activePhone}` : null
      ].filter(Boolean).join("\n");

      // 1. Mobile native share with PDF file if supported
      if (pdfFile && typeof navigator !== "undefined" && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: `${invoice.invoiceNumber} - Receipt`,
              text: defaultMsg
            });
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") return;
          console.warn("Native share fallback to download + wa.me:", shareErr);
        }
      }

      // 2. Desktop fallback: Download the PDF and open WhatsApp Web with default message
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await worker.save();
      }

      const cleanPhone = targetPhone.length === 10 ? `91${targetPhone}` : targetPhone;
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(defaultMsg)}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      dialogService.alert({
        title: "बिल PDF डाऊनलोड झाले",
        message: `बिल PDF (${invoice.invoiceNumber}.pdf) डाऊनलोड झाले आहे आणि WhatsApp उघडले आहे! कृपया डाऊनलोड झालेली PDF फाईल WhatsApp चॅटमध्ये पाठवा.`,
        type: "success"
      });
    } catch (e) {
      console.error(e);
      dialogService.alert({
        title: "Share Failed",
        message: "Unable to share bill on WhatsApp.",
        type: "error",
      });
    }
  };

  /* =========================================================
     SIMPLE BILL
  ========================================================= */

  const SimpleBillView: React.FC<{
    current: Invoice;
    id: string;
  }> = ({
    current,
    id,
  }) => (
      <div
        id={id}
        className="simple-bill"
      >
        {billLogo && (
          <div className="simple-business-logo">
            <img
              src={billLogo}
              alt="Business Logo"
            />
          </div>
        )}

        <div className="simple-business-name">
          {hotelName}
        </div>

        {hotelAddress && (
          <div className="simple-business-sub">
            {hotelAddress}
          </div>
        )}

        {(phoneNumber ||
          gstin) && (
            <div className="simple-business-sub">
              {phoneNumber &&
                `Phone: ${phoneNumber}`}

              {phoneNumber &&
                gstin &&
                " | "}

              {gstin &&
                `GSTIN: ${gstin}`}
            </div>
          )}

        <div className="simple-title">
          {t("taxInvoiceReceipt", "TAX INVOICE RECEIPT")}
        </div>

        <div className="simple-rule" />

        <div className="simple-details">
          <div className="simple-details-row full-width">
            <span className="detail-label">
              {t("invoiceNo", "Invoice No")}:
            </span>
            <strong className="detail-value text-right">
              {toDevanagari(current.invoiceNumber)}
            </strong>
          </div>

          <div className="simple-details-row full-width">
            <span className="detail-label">
              {t("dateTime", "Date & Time")}:
            </span>
            <strong className="detail-value text-right">
              {dateText(
                current.createdAt
              )}
            </strong>
          </div>

          <div className="simple-details-row">
            <div className="detail-half">
              <span className="detail-label">
                {t("table", "Table")}:
              </span>
              <strong className="detail-value">
                {formatTableBadge(current.tableNumber, language)}
              </strong>
            </div>
            <div className="detail-half right">
              <span className="detail-label">
                {t("customer", "Customer")}:
              </span>
              <strong className="detail-value">
                {localizeGuestName(current.customerName) || "-"}
              </strong>
            </div>
          </div>

          <div className="simple-details-row">
            <div className="detail-half">
              <span className="detail-label">
                {t("kot", "KOT")}:
              </span>
              <strong className="detail-value">
                {toDevanagari(current.kotNumber || "-")}
              </strong>
            </div>
            <div className="detail-half right">
              <span className="detail-label">
                {t("paymentStatus", "Status")}:
              </span>
              <strong className={`detail-value ${current.status?.toLowerCase() === 'paid' ? 'status-paid' : 'status-pending'}`}>
                {translateStatus(current.status || "PAID")}
              </strong>
            </div>
          </div>
        </div>

        <table className="simple-table">
          <thead>
            <tr>
              <th className="col-desc">
                {t("itemDescription", "Item Description")}
              </th>
              <th className="col-qty">{t("qty", "Qty")}</th>
              <th className="col-rate">{t("rate", "Rate")}</th>
              <th className="col-amt">{t("amount", "Amount")}</th>
            </tr>
          </thead>

          <tbody>
            {current.items.map(
              (x, i) => (
                <tr
                  key={`${x.id}-${i}`}
                >
                  <td className="col-desc">
                    {getLocalizedMenuItemName(x.itemName, language)}
                  </td>

                  <td className="col-qty">
                    {toDevanagari(x.quantity)}
                  </td>

                  <td className="col-rate">
                    {money(
                      x.price
                    )}
                  </td>

                  <td className="col-amt">
                    {money(
                      Number(
                        x.price
                      ) *
                      Number(
                        x.quantity
                      )
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <div className="simple-totals">
          <div className="totals-row">
            <span>
              {t("itemSubtotal", "Item Subtotal")}
            </span>

            <strong className="tab-num">
              {money(
                current.itemTotal
              )}
            </strong>
          </div>

          {current.discountAmount >
            0 && (
              <div className="totals-row">
                <span>
                  {t("discount", "Discount")} (
                  {current.discountType === 'fixed' ? `₹${toDevanagari(current.discount)}` : `${toDevanagari(current.discount)}%`}
                  )
                </span>

                <strong className="tab-num">
                  -{" "}
                  {money(
                    current.discountAmount
                  )}
                </strong>
              </div>
            )}

          {current.discountAmount > 0 && (
            <div className="totals-row">
              <span>
                {t("taxableAmount", "Taxable Amount")}
              </span>

              <strong className="tab-num">
                {money(
                  current.taxableAmount || Math.max(0, current.itemTotal - current.discountAmount)
                )}
              </strong>
            </div>
          )}

          {current.taxAmount > 0 && (
            Boolean(current.isInterstate || (current.igst && current.igst > 0)) ? (
              <div className="totals-row">
                <span>
                  IGST ({toDevanagari(current.igstRate !== undefined ? current.igstRate : (current.tax || 5))}%)
                </span>
                <strong className="tab-num">
                  + {money(current.igst !== undefined ? current.igst : current.taxAmount)}
                </strong>
              </div>
            ) : (
              <>
                <div className="totals-row">
                  <span>
                    CGST ({toDevanagari(current.cgstRate !== undefined ? current.cgstRate : Number(((current.tax || 5) / 2).toFixed(2)))}%)
                  </span>
                  <strong className="tab-num">
                    + {money(current.cgst !== undefined ? current.cgst : (current.taxAmount / 2))}
                  </strong>
                </div>
                <div className="totals-row">
                  <span>
                    SGST ({toDevanagari(current.sgstRate !== undefined ? current.sgstRate : Number(((current.tax || 5) / 2).toFixed(2)))}%)
                  </span>
                  <strong className="tab-num">
                    + {money(current.sgst !== undefined ? current.sgst : (current.taxAmount / 2))}
                  </strong>
                </div>
              </>
            )
          )}

          <div className="simple-grand">
            <span>
              {t("grandTotal", "Grand Total")}
            </span>

            <strong className="tab-num">
              {money(
                current.grandTotal
              )}
            </strong>
          </div>

          <div className="totals-row">
            <span>
              {t("amountPaid", "Amount Paid")}
            </span>

            <strong className="tab-num">
              {money(
                current.paidAmount ?? current.grandTotal
              )}
            </strong>
          </div>

          <div className="totals-row">
            <span>
              {t("paymentMethod", "Payment Method")}
            </span>

            <strong className="text-uppercase">
              {t(current.paymentMethod || "CASH", (current.paymentMethod || "CASH").replace("_", " "))}
            </strong>
          </div>

          <div className="totals-row">
            <span>
              {t("paymentStatus", "Payment Status")}
            </span>

            <strong className={`text-uppercase ${current.status?.toLowerCase() === 'paid' ? 'status-paid' : 'status-pending'}`}>
              {translateStatus(current.status || "PAID")}
            </strong>
          </div>

          {current.paidAmount !== undefined && current.paidAmount > 0 && current.paidAmount < current.grandTotal && (
            <div className="totals-row balance-due">
              <span>
                {t("balanceDue", "Balance Due")}
              </span>
              <strong className="tab-num">
                {money(current.grandTotal - current.paidAmount)}
              </strong>
            </div>
          )}

          {current.paidAmount !== undefined && current.paidAmount > current.grandTotal && (
            <div className="totals-row change-returned">
              <span>
                {t("changeReturned", "Change Returned")}
              </span>
              <strong className="tab-num">
                {money(current.paidAmount - current.grandTotal)}
              </strong>
            </div>
          )}
        </div>

        <div className="simple-footer">
          {footerMessage && footerMessage.toLowerCase().includes("thank you")
            ? t("defaultFooterThanks", footerMessage)
            : footerMessage}
        </div>
      </div>
    );

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div className="billing-module">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="billing-header">
        <div>
          <div className="eyebrow">
            <i />
            {t("billingManagement", "BILLING & PAYMENTS")}
          </div>

          <h1>
            {t("billing", "Billing")}
          </h1>

          <p>
            {t("billingDesc", "Create accurate customer bills with a streamlined 3-step checkout flow.")}
          </p>
        </div>

      </header>

      {/* =====================================================
          STEPPER
      ===================================================== */}

      <div className="stepper">
        {[
          t("activeOrders", "Active Table Orders"),
          t("oneClickBilling", "One-Click Billing"),
          t("generatedInvoice", "Generated Invoice"),
        ].map(
          (label, i) => {
            const current =
              step ===
                "pending-kots"
                ? 0
                : step ===
                  "billing-payment"
                  ? 1
                  : 2;

            return (
              <React.Fragment
                key={label}
              >
                <div
                  className={`step ${i <= current
                      ? "active"
                      : ""
                    } ${i === current
                      ? "current"
                      : ""
                    }`}
                >
                  <b>
                    {toDevanagari(`0${i + 1}`)}
                  </b>

                  <span>
                    {label}
                  </span>
                </div>

                {i < 2 && (
                  <em
                    className={
                      i < current
                        ? "done"
                        : ""
                    }
                  />
                )}
              </React.Fragment>
            );
          }
        )}
      </div>

      {/* =====================================================
          STEP 1
      ===================================================== */}

      {step ===
        "pending-kots" && (
          <section className="card">
            <div className="section-head">
              <div>
                <small>
                  {t("step1", "STEP 01")}
                </small>

                <h2>
                  {t("activeOrders", "Active Table Orders")}
                </h2>

                <p>
                  {t("selectOccupiedTableDesc", "Select an occupied table order to generate its bill with one click.")}
                </p>
              </div>

              <div className="count">
                <Utensils
                  size={15}
                />

                {toDevanagari(filteredKOTs.length)}{" "}
                {t("records", "Records")}
              </div>
            </div>

            <div className="search">
              <Search size={18} />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder={t("searchOrderCustomerTable", "Search order, customer or table...")}
              />
            </div>

            {filteredKOTs.length ===
              0 ? (
              <div className="empty">
                <ReceiptIndianRupee
                  size={35}
                />

                <h3>
                  {t("noActiveOrders", "No Active Orders")}
                </h3>

                <p>
                  {t("noActiveOrdersDesc", "There are no occupied-table orders waiting for billing.")}
                </p>
              </div>
            ) : (
              <>
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>{t("orderNo", "ORDER NO")}</th>
                        <th>
                          {t("dateTime", "DATE & TIME")}
                        </th>
                        <th>
                          {t("customer", "CUSTOMER")}
                        </th>
                        <th>
                          {t("table", "TABLE")}
                        </th>
                        <th>
                          {t("items", "ITEMS")}
                        </th>
                        <th>
                          {t("total", "TOTAL")} (₹)
                        </th>
                        <th>
                          {t("status", "STATUS")}
                        </th>
                        <th>
                          {t("actions", "ACTION")}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedKOTs.map(
                        (k) => {
                          const total =
                            k.items.reduce(
                              (
                                sum,
                                item
                              ) =>
                                sum +
                                Number(
                                  item.price
                                ) *
                                Number(
                                  item.quantity
                                ),
                              0
                            );

                          return (
                            <tr
                              key={
                                k.id
                              }
                            >
                              <td>
                                <strong className="record-kot">
                                  {toDevanagari(k.orderId || k.id)}
                                </strong>
                              </td>

                              <td>
                                <span className="record-date">
                                  {dateText(
                                    k.createdAt
                                  )}
                                </span>
                              </td>

                              <td>
                                <div className="record-customer">
                                  <strong>
                                    {localizeGuestName(k.customerName)}
                                  </strong>

                                  {k.customerMobile && (
                                    <small>
                                      {toDevanagari(k.customerMobile)}
                                    </small>
                                  )}
                                </div>
                              </td>

                              <td>
                                <span className="table-badge">
                                  <Table2
                                    size={13}
                                  />

                                  {formatTableBadge(k.tableNumber, language)}
                                </span>
                              </td>

                              <td>
                                <span className="items-count">
                                  {toDevanagari(k.items.length)}{" "}
                                  {k.items.length === 1
                                    ? t("item", "Item")
                                    : t("items", "Items")}
                                </span>
                              </td>

                              <td>
                                <strong>
                                  ₹{money(
                                    total
                                  )}
                                </strong>
                              </td>

                              <td>
                                {(() => {
                                  const linkedInv = liveInvoices.find((inv) => Number(inv.orderId) === Number(k.orderId));
                                  if (linkedInv) {
                                    return (
                                      <span
                                        className="status-badge"
                                        style={{
                                          background: linkedInv.status === "PAID" ? "#DCFCE7" : "#FEF3C7",
                                          color: linkedInv.status === "PAID" ? "#15803D" : "#B45309",
                                          padding: "4px 8px",
                                          borderRadius: "6px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                      >
                                        <CheckCircle2 size={12} />
                                        {linkedInv.status === "PAID" ? t("billPaid", "BILL PAID") : t("billGenerated", "BILL GENERATED")}
                                      </span>
                                    );
                                  }
                                  if (String(k.status || "").toUpperCase() === "READY" || String(k.status || "").toUpperCase() === "BILLED") {
                                    return (
                                      <span className="status-badge requested-bill">
                                        {t("billRequested", "REQUESTED BILL")}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="status-badge send-to-kitchen">
                                      {t("activeOrders", "ACTIVE ORDER")}
                                    </span>
                                  );
                                })()}
                              </td>

                              <td>
                                <div className="record-actions">
                                  <button
                                    className="edit-record-btn"
                                    onClick={() =>
                                      openEditKOT(
                                        k
                                      )
                                    }
                                    title={t("edit", "Edit Order")}
                                  >
                                    <Edit3
                                      size={
                                        14
                                      }
                                    />

                                    {t("edit", "Edit")}
                                  </button>

                                  {(() => {
                                    const linkedInv = liveInvoices.find((inv) => Number(inv.orderId) === Number(k.orderId));
                                    if (linkedInv) {
                                      return (
                                        <button
                                          className="create-record-btn"
                                          style={{ background: "#2563EB", borderColor: "#1D4ED8", color: "#FFFFFF" }}
                                          onClick={() => openExistingBill(linkedInv, k)}
                                          title={`${t("viewBill", "View existing invoice")} ${toDevanagari(linkedInv.invoiceNumber)}`}
                                        >
                                          <Eye size={14} />
                                          {t("viewBill", "View Bill")}
                                        </button>
                                      );
                                    }
                                    return (
                                      <button
                                        className="create-record-btn"
                                        disabled={isSubmittingBill}
                                        onClick={() =>
                                          handleOneClickGenerateBill(
                                            k
                                          )
                                        }
                                      >
                                        <FileText
                                          size={
                                            14
                                          }
                                        />

                                        {(generatingKotId !== null && (generatingKotId === k.id || generatingKotId === k.orderId)) ? t("generating", "Generating...") : t("generateBill", "Generate Bill")}
                                      </button>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={billingPage}
                  totalRecords={filteredKOTs.length}
                  pageSize={10}
                  onPageChange={setBillingPage}
                />
              </>
            )}
          </section>
        )}

      {/* =====================================================
          STEP 2
      ===================================================== */}

      {step ===
        "billing-payment" &&
        selectedKOT && (
          <section className="card">
            <button
              className="back"
              onClick={back}
            >
              <ArrowLeft
                size={16}
              />

              {t("backToKotRecords", "Back to KOT Records")}
            </button>

            <div className="section-head">
              <div>
                <small>
                  {t("step2", "STEP 02")}
                </small>

                <h2>
                  {t("orderSummaryPayment", "Order Summary & Payment")}
                </h2>

                <p>
                  {t("orderSummaryDesc", "Review items, apply discount & tax, and select payment method.")}
                </p>
              </div>

              <div className="ref">
                <span>
                  {t("invoiceNumber", "Invoice #")}
                </span>

                <strong>
                  {
                    previewInvoiceNumber
                  }
                </strong>
              </div>
            </div>

            {(() => {
              const existingInv = liveInvoices.find((i) => Number(i.orderId) === Number(selectedKOT.orderId));
              if (!existingInv) return null;
              return (
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginTop: "16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#1E40AF", fontSize: "13px", fontWeight: 600 }}>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <span>
                      {t("invoiceNumber", "Invoice")} <b>{existingInv.invoiceNumber}</b> {t("invoiceAlreadyGeneratedDesc", "has already been generated for this order. Re-generating will update and reuse the same bill.")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openExistingBill(existingInv, selectedKOT)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: "#2563EB",
                      color: "#FFFFFF",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Eye size={14} />
                    {t("viewExistingBill", "View Existing Bill")}
                  </button>
                </div>
              );
            })()}

            {/* CUSTOMER SUMMARY */}

            <div className="customer-summary">
              <div>
                <Users
                  size={18}
                />

                <span>
                  {t("customer", "Customer")}

                  <strong>
                    {
                      customerName
                    }
                  </strong>

                  <small>
                    {
                      customerMobile
                    }
                  </small>
                </span>
              </div>

              <div>
                <Table2
                  size={18}
                />

                <span>
                  {t("table", "Table")}

                  <strong>
                    {
                      tableNumber
                    }
                  </strong>
                </span>
              </div>

              <div>
                <ReceiptIndianRupee
                  size={18}
                />

                <span>
                  {t("kotNo", "KOT")}

                  <strong>
                    {
                      selectedKOT.kotNumber
                    }
                  </strong>
                </span>
              </div>
            </div>

            <div className="summary-layout">
              {/* =================================================
                  LEFT
              ================================================= */}

              <div className="billing-left-stack">
                {/* ORDER ITEMS */}

                <div className="billing-sub-card">
                  <div className="sub-card-title">
                    {t("orderedItems", "Order Items")}
                  </div>

                  <div className="order-items-scroll-wrap">
                    <div className="order-items-table-head">
                      <span>
                        {t("item", "Item")}
                      </span>

                      <span>
                        {t("qty", "Qty")}
                      </span>

                      <span>
                        {t("rate", "Rate")}
                      </span>

                      <span>
                        {t("amount", "Amount")}
                      </span>

                      <span>
                        {t("action", "Action")}
                      </span>
                    </div>

                    <div className="order-items-list">
                      {items.map(
                        (x) => {
                          const n =
                            x.itemName.toLowerCase();

                          const category =
                            n.includes(
                              "roti"
                            ) ||
                              n.includes(
                                "naan"
                              )
                              ? t("breads", "Breads")
                              : n.includes(
                                "rice"
                              ) ||
                                n.includes(
                                  "biryani"
                                )
                                ? t("rice", "Rice")
                                : n.includes(
                                  "coffee"
                                ) ||
                                  n.includes(
                                    "tea"
                                  ) ||
                                  n.includes(
                                    "drink"
                                  )
                                  ? t("beverages", "Beverages")
                                  : t("mainCourse", "Main Course");

                          return (
                            <div
                              className="reference-order-row"
                              key={
                                x.id
                              }
                            >
                              <div className="reference-item-info">
                                <div className="reference-item-icon">
                                  <Utensils size={16} />
                                </div>

                                <div className="reference-item-text">
                                  <strong>
                                    {
                                      getLocalizedMenuItemName(x.itemName, language)
                                    }
                                  </strong>

                                  <span>
                                    {
                                      t(category, category)
                                    }
                                  </span>
                                </div>
                              </div>

                              {/* =================================================
                                DIRECT QUANTITY INPUT
                            ================================================= */}

                              <div className="direct-qty-wrap">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  inputMode="numeric"
                                  value={
                                    x.quantity ===
                                      0
                                      ? ""
                                      : x.quantity
                                  }
                                  className="direct-quantity-input"
                                  aria-label={`Quantity for ${x.itemName}`}
                                  onChange={(
                                    e
                                  ) => {
                                    setItemQuantity(
                                      x.id,
                                      e
                                        .target
                                        .value
                                    );
                                  }}
                                  onBlur={() => {
                                    setItems(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            item
                                          ) =>
                                            item.id ===
                                              x.id &&
                                              (!item.quantity ||
                                                item.quantity <
                                                1)
                                              ? {
                                                ...item,
                                                quantity: 1,
                                              }
                                              : item
                                        )
                                    );
                                  }}
                                />
                              </div>

                              <div className="reference-rate">
                                {money(
                                  x.price
                                )}
                              </div>

                              <div className="reference-amount">
                                {money(
                                  Number(
                                    x.price
                                  ) *
                                  Number(
                                    x.quantity
                                  )
                                )}
                              </div>

                              <button
                                type="button"
                                className="reference-delete"
                                onClick={() =>
                                  setItems(
                                    (
                                      current
                                    ) =>
                                      current.filter(
                                        (
                                          item
                                        ) =>
                                          item.id !==
                                          x.id
                                      )
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <button
                    className="add-item-link-img"
                    onClick={() => {
                      setEditItems(
                        items.map(
                          (x) => ({
                            ...x,
                          })
                        )
                      );

                      setEditingKOT(
                        selectedKOT
                      );

                      setShowAddItemPopup(
                        true
                      );
                    }}
                  >
                    {t("addMenuItem", "+ Add menu item")}
                  </button>
                </div>

                {/* PAYMENT METHOD */}

                <div className="billing-sub-card">
                  <div className="sub-card-title">
                    {t("paymentMethod", "Payment Method")}
                  </div>

                  <div className="methods-grid-img">
                    {[
                      {
                        value:
                          "UPI" as PaymentMethod,
                        desc:
                          t("upiQr", "UPI / QR Code"),
                        Icon:
                          WalletCards,
                      },
                      {
                        value:
                          "CASH" as PaymentMethod,
                        desc:
                          t("cashPayment", "Cash payment"),
                        Icon:
                          WalletCards,
                      },
                      {
                        value:
                          "CARD" as PaymentMethod,
                        desc:
                          t("cardPayment", "Card payment"),
                        Icon:
                          CreditCard,
                      },
                    ].map(
                      ({
                        value,
                        desc,
                        Icon,
                      }) => (
                        <button
                          key={
                            value
                          }
                          type="button"
                          className={`method-card-img ${paymentMethod ===
                              value
                              ? "selected"
                              : ""
                            }`}
                          onClick={() =>
                            setPaymentMethod(
                              value
                            )
                          }
                        >
                          <i>
                            <Icon
                              size={
                                18
                              }
                            />
                          </i>

                          <span>
                            <strong>
                              {value}
                            </strong>

                            <small>
                              {
                                desc
                              }
                            </small>
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* =================================================
                  RIGHT BILL SUMMARY
              ================================================= */}

              <aside className="billing-right-card">
                <div className="bill-summary-heading">
                  <div>
                    <div className="sub-card-title">
                      {t("billSummary", "Bill Summary")}
                    </div>

                    <p>
                      {t("reviewTotalAdjustments", "Review total and apply adjustments.")}
                    </p>
                  </div>

                  <ReceiptIndianRupee
                    size={20}
                  />
                </div>

                <div className="summary-rows-img">
                  <div className="summary-main-row">
                    <span>
                      {t("itemTotal", "Item Total")}
                    </span>

                    <strong>
                      ₹{money(
                        itemTotal
                      )}
                    </strong>
                  </div>

                  {/* DISCOUNT */}

                  <div className="adjustment-row">
                    <div className="adjustment-label">
                      <span>
                        {t("discount", "Discount")}
                      </span>
                      {discount > 0 && (
                        <small>
                          {discountType === 'fixed' ? `₹${discount}` : `${discount}%`} ·{" "}
                          {money(
                            discountAmount
                          )}
                        </small>
                      )}
                    </div>

                    {discount > 0 ? (
                      <button
                        type="button"
                        className="remove-adjustment-btn"
                        onClick={() => setDiscount(0)}
                      >
                        {t("remove", "Remove")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`add-adjustment-btn ${showDiscountControls ? "active" : ""
                          }`}
                        onClick={() =>
                          setShowDiscountControls((current) => !current)
                        }
                      >
                        {showDiscountControls
                          ? t("close", "Close")
                          : `+ ${t("add", "Add")}`}
                      </button>
                    )}
                  </div>

                  {showDiscountControls && (
                    <div className="adjustment-input-panel">
                      <div
                        className="adjustment-input-header"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{t("discount", "Discount")}</span>
                        <div
                          style={{
                            display: "inline-flex",
                            borderRadius: "4px",
                            overflow: "hidden",
                            border: "1px solid #d1d5db",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountType("percent");
                              if (discount > 100) setDiscount(10);
                            }}
                            style={{
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              backgroundColor:
                                discountType === "percent"
                                  ? "#ea580c"
                                  : "#f3f4f6",
                              color:
                                discountType === "percent"
                                  ? "#ffffff"
                                  : "#374151",
                            }}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType("fixed")}
                            style={{
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              backgroundColor:
                                discountType === "fixed"
                                  ? "#ea580c"
                                  : "#f3f4f6",
                              color:
                                discountType === "fixed"
                                  ? "#ffffff"
                                  : "#374151",
                            }}
                          >
                            ₹
                          </button>
                        </div>
                      </div>

                      <div className="adjustment-input-wrap">
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          max={
                            discountType === "percent" ? 100 : itemTotal
                          }
                          value={discount === 0 ? "" : discount}
                          placeholder={
                            discountType === "percent"
                              ? t("enterDiscountPercent", "Enter discount %")
                              : t("enterDiscountAmount", "Enter discount ₹")
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const maxVal =
                              discountType === "percent" ? 100 : itemTotal;
                            setDiscount(
                              Math.min(maxVal, Math.max(0, val))
                            );
                          }}
                        />

                        <b>{discountType === "percent" ? "%" : "₹"}</b>
                      </div>

                      <div className="adjustment-preview">
                        <span>{t("discountAmount", "Discount amount")}</span>

                        <strong>- {money(discountAmount)}</strong>
                      </div>
                    </div>
                  )}

                  {/* GST */}

                  <div className="adjustment-row">
                    <div className="adjustment-label">
                      <span>
                        {t("gst", "GST")}
                      </span>

                      {tax > 0 && (
                        <small>
                          {tax}% ·{" "}
                          {money(
                            taxAmount
                          )}
                        </small>
                      )}
                    </div>

                    {tax > 0 ? (
                      <button
                        type="button"
                        className="remove-adjustment-btn"
                        onClick={() =>
                          setTax(0)
                        }
                      >
                        {t("remove", "Remove")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`add-adjustment-btn ${showTaxControls
                            ? "active"
                            : ""
                          }`}
                        onClick={() =>
                          setShowTaxControls(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                      >
                        {showTaxControls
                          ? t("close", "Close")
                          : `+ ${t("add", "Add")}`}
                      </button>
                    )}
                  </div>

                  {showTaxControls && (
                    <div className="adjustment-input-panel">
                      <div className="adjustment-input-header">
                        <span>
                          {t("gstPercentage", "GST Percentage & Supply Type")}
                        </span>
                      </div>

                      {/* Supply Type Selector: Intra-State vs Inter-State */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setIsInterstate(false)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: !isInterstate ? 700 : 500,
                            backgroundColor: !isInterstate ? "#8B3E16" : "#F3F4F6",
                            color: !isInterstate ? "#FFFFFF" : "#4B5563",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Intra-State (CGST+SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInterstate(true)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: isInterstate ? 700 : 500,
                            backgroundColor: isInterstate ? "#8B3E16" : "#F3F4F6",
                            color: isInterstate ? "#FFFFFF" : "#4B5563",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Inter-State (IGST)
                        </button>
                      </div>

                      <div className="adjustment-input-wrap">
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          max="100"
                          value={
                            tax === 0
                              ? ""
                              : tax
                          }
                          placeholder={t("enterGst", "Enter GST %")}
                          onChange={(
                            e
                          ) =>
                            setTax(
                              Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    e
                                      .target
                                      .value
                                  ) ||
                                  0
                                )
                              )
                            )
                          }
                        />

                        <b>
                          %
                        </b>
                      </div>

                      {/* Presets */}
                      <div style={{ display: "flex", gap: "4px", margin: "6px 0", flexWrap: "wrap" }}>
                        {[0, 5, 12, 18, 28].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setTax(rate)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              backgroundColor: tax === rate ? "#FFF7ED" : "#F9FAFB",
                              color: tax === rate ? "#8B3E16" : "#4B5563",
                              border: tax === rate ? "1px solid #8B3E16" : "1px solid #E5E7EB",
                              cursor: "pointer",
                              fontWeight: tax === rate ? 700 : 500,
                            }}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>

                      <div className="adjustment-preview" style={{ flexDirection: "column", gap: "2px", alignItems: "stretch" }}>
                        {isInterstate ? (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>IGST ({tax}%):</span>
                            <strong>+ {money(igstAmount)}</strong>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>CGST ({(tax / 2).toFixed(1).replace(/\.0$/, "")}%):</span>
                              <strong>+ {money(cgstAmount)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>SGST ({(tax / 2).toFixed(1).replace(/\.0$/, "")}%):</span>
                              <strong>+ {money(sgstAmount)}</strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="summary-divider" />

                <div className="summary-calculation">
                  {discountAmount >
                    0 && (
                      <div>
                        <span>
                          {t("discount", "Discount")}
                        </span>

                        <strong className="red">
                          -{" "}
                          {money(
                            discountAmount
                          )}
                        </strong>
                      </div>
                    )}

                  {taxAmount > 0 && (
                    isInterstate ? (
                      <div>
                        <span>
                          IGST ({tax}%)
                        </span>
                        <strong>
                          + {money(igstAmount)}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span>
                            CGST ({(tax / 2).toFixed(1).replace(/\.0$/, "")}%)
                          </span>
                          <strong>
                            + {money(cgstAmount)}
                          </strong>
                        </div>
                        <div>
                          <span>
                            SGST ({(tax / 2).toFixed(1).replace(/\.0$/, "")}%)
                          </span>
                          <strong>
                            + {money(sgstAmount)}
                          </strong>
                        </div>
                      </>
                    )
                  )}
                </div>

                <div className="grand-total-dark-box">
                  <span>
                    {t("grandTotal", "Grand Total")}
                  </span>

                  <strong>
                    ₹{money(
                      grandTotal
                    )}
                  </strong>
                </div>

                <button
                  className="generate-btn-img"
                  disabled={isSubmittingBill}
                  onClick={
                    completeBill
                  }
                  style={{
                    opacity: isSubmittingBill ? 0.7 : 1,
                    cursor: isSubmittingBill ? "wait" : "pointer",
                  }}
                >
                  <FileText
                    size={17}
                  />

                  {isSubmittingBill
                    ? t("generatingBill", "Generating Bill...")
                    : liveInvoices.some((i) => Number(i.orderId) === Number(selectedKOT.orderId))
                      ? t("updateViewBill", "Update / View Bill")
                      : t("generateBill", "Generate Bill")}
                </button>

                <div className="checkout-note">
                  <CheckCircle2
                    size={14}
                  />

                  <span>
                    {t("amountRecordedKot", "Amount will be recorded against this KOT.")}
                  </span>
                </div>
              </aside>
            </div>
          </section>
        )}

      {/* =====================================================
          STEP 3
      ===================================================== */}

      {step ===
        "success" &&
        invoice && (
          <section className="card success">
            <div className="success-icon" style={{ background: invoice.status === "PAID" ? "#DCFCE7" : "#FEF3C7", color: invoice.status === "PAID" ? "#15803D" : "#B45309" }}>
              <CheckCircle2
                size={34}
              />
            </div>

            <small>
              {invoice.status === "PAID" ? t("step03Settled", "STEP 03 - SETTLED") : t("step03BillGenerated", "STEP 03 - BILL GENERATED")}
            </small>

            <h2>
              {invoice.status === "PAID" ? t("billSettledSuccessfully", "Bill Settled Successfully") : t("billGeneratedSuccessfully", "Bill Generated Successfully")}
            </h2>

            {existingBillNotice && (
              <div
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  margin: "12px auto 16px",
                  maxWidth: "500px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "#1E40AF",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} color="#2563EB" />
                <span>{existingBillNotice}</span>
              </div>
            )}

            <p>
              {invoice.status === "PAID"
                ? t("billSettledDesc", "The bill has been successfully generated and payment settled.")
                : t("billGeneratedDesc", "The bill has been successfully generated in the database and is awaiting payment in the Payments module.")}
            </p>

            <div className="success-summary">
              <div>
                <span>
                  {t("invoice", "Invoice")}
                </span>

                <b>
                  {toDevanagari(invoice.invoiceNumber)}
                </b>
              </div>

              <div>
                <span>
                  {t("customer", "Customer")}
                </span>

                <b>
                  {localizeGuestName(invoice.customerName)}
                </b>
              </div>

              <div>
                <span>
                  {t("table", "Table")}
                </span>

                <b>
                  {formatTableBadge(invoice.tableNumber, language)}
                </b>
              </div>

              <div>
                <span>
                  {t("totalBill", "Total Bill")}
                </span>

                <b>
                  {money(
                    invoice.grandTotal
                  )}
                </b>
              </div>

              <div>
                <span>
                  {t("paid", "Paid")}
                </span>

                <b className={invoice.status === "PAID" ? "paid" : ""}>
                  {money(
                    invoice.paidAmount || 0
                  )}
                </b>
              </div>

              <div>
                <span>
                  {t("status", "Status")}
                </span>

                <b className={invoice.status === "PAID" ? "paid" : "unpaid"} style={{ color: invoice.status === "PAID" ? "#15803D" : "#B45309" }}>
                  {translateStatus(invoice.status === "PAID" ? "PAID" : "OUTSTANDING")}
                </b>
              </div>
            </div>

            <div className="success-bill-label">
              {t("taxInvoicePreview", "Tax Invoice Preview")}{" "}
              ({t("customize", "Customize")} / {t("share", "Share")} /{" "}
              {t("downloadPdf", "Download PDF")} / {t("print", "Print")})
            </div>

            <SimpleBillView
              id="simple-bill-preview-success"
              current={
                invoice
              }
            />

            <div className="actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "20px" }}>
              {invoice.status !== "PAID" ? (
                <>
                  <button
                    className="primary"
                    style={{ background: "#8B3E16", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={() => navigate(`/hotelpayment?invoiceId=${invoice.id}`)}
                  >
                    <CreditCard size={16} />
                    {t("proceedToPayment", "Proceed to Payment")}
                  </button>

                  <button
                    className="secondary"
                    disabled={isSettlingCounter}
                    style={{
                      background: "#15803D",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: isSettlingCounter ? 0.7 : 1,
                      cursor: isSettlingCounter ? "wait" : "pointer",
                    }}
                    onClick={() => {
                      const due = Math.max(
                        0,
                        invoice.dueAmount !== undefined && invoice.dueAmount !== null
                          ? Number(invoice.dueAmount)
                          : invoice.remainingAmount !== undefined && invoice.remainingAmount !== null
                            ? Number(invoice.remainingAmount)
                            : Number(invoice.grandTotal) - Number(invoice.paidAmount || 0)
                      );
                      const initAmount = due > 0 ? due : Number(invoice.grandTotal);
                      setCounterPayMethod((paymentMethod as PaymentMethod) || "UPI");
                      setCounterCashReceived(String(initAmount));
                      setCounterTxnRef(due > 0 && Number(invoice.paidAmount || 0) > 0 ? `TXN-INV-${invoice.id}-${Date.now()}` : `TXN-INV-${invoice.id}`);
                      setCounterCardRef("");
                      setCounterUpiVerified(false);
                      setShowCounterSettlementModal(true);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {t("settlePayment", "Settle Payment")}
                  </button>
                </>
              ) : (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  background: "#DCFCE7",
                  border: "1px solid #86EFAC",
                  borderRadius: "8px",
                  color: "#15803D",
                  fontWeight: 700,
                  fontSize: "14px",
                }}>
                  <CheckCircle2 size={18} color="#15803D" />
                  {t("settlementSuccessful", "Payment Settled & Completed")} ({translateStatus(invoice.paymentMethod || "PAID")} • ₹{money(invoice.grandTotal)})
                </div>
              )}

              {/* Counter Payment Settlement Modal */}
              {showCounterSettlementModal && invoice && invoice.status !== "PAID" && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "16px",
                  }}
                  onClick={() => !isSettlingCounter && setShowCounterSettlementModal(false)}
                >
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "16px",
                      width: "min(480px, 100%)",
                      padding: "24px",
                      boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
                      border: "1px solid #E5DCD5",
                      boxSizing: "border-box",
                      textAlign: "left",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #F0ECE7", paddingBottom: "12px" }}>
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#8B3E16", textTransform: "uppercase" }}>
                          {t("counterBillSettlement", "Counter Bill Settlement")}
                        </span>
                        <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#241C18" }}>
                          #{invoice.invoiceNumber}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowCounterSettlementModal(false)}
                        disabled={isSettlingCounter}
                        style={{ border: "none", background: "#F5F5F4", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>

                    {(() => {
                      const outstandingDue = Math.max(
                        0,
                        (invoice as any).dueAmount != null
                          ? Number((invoice as any).dueAmount)
                          : (invoice as any).remainingAmount != null
                            ? Number((invoice as any).remainingAmount)
                            : Number(invoice.grandTotal) - Number(invoice.paidAmount || 0)
                      );
                      const settleAmount = outstandingDue > 0 ? outstandingDue : Number(invoice.grandTotal);
                      const hasPartialPayment = Number(invoice.paidAmount || 0) > 0 && outstandingDue < Number(invoice.grandTotal);

                      return (
                        <>
                          {/* Bill Summary */}
                          <div style={{ background: "#FFF9F3", border: "1px solid #F0E3D7", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                              <span style={{ color: "#716963" }}>{t("tableGuest", "Table / Guest")}:</span>
                              <span style={{ fontWeight: 700, color: "#241C18" }}>{invoice.tableNumber} • {invoice.customerName}</span>
                            </div>
                            {hasPartialPayment && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#57534E", marginBottom: "4px" }}>
                                <span>{t("total", "Total")}: ₹{money(invoice.grandTotal)}</span>
                                <span style={{ color: "#15803D", fontWeight: 600 }}>{t("alreadyPaidAndSettled", "Already Paid")}: ₹{money(invoice.paidAmount)}</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", paddingTop: "6px", borderTop: "1px dashed #E5DCD5" }}>
                              <span style={{ fontWeight: 700, color: "#241C18" }}>
                                {hasPartialPayment ? t("remainingBalanceDue", "Remaining Balance Due:") : t("totalAmountDue", "Total Amount Due:")}
                              </span>
                              <span style={{ fontWeight: 800, color: "#8B3E16" }}>₹{money(settleAmount)}</span>
                            </div>
                          </div>

                          {/* Supported Payment Methods (UPI, CASH, CARD only) */}
                          <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#241C18", marginBottom: "8px" }}>
                              {t("paymentMethod", "Payment Method")}
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                              {[
                                { id: "UPI" as PaymentMethod, label: t("upiQr", "UPI / QR Code"), icon: "📱" },
                                { id: "CASH" as PaymentMethod, label: t("cash", "Cash"), icon: "💵" },
                                { id: "CARD" as PaymentMethod, label: t("card", "Card"), icon: "💳" },
                              ].map((m) => {
                                const isSel = counterPayMethod === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setCounterPayMethod(m.id)}
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "10px 6px",
                                      borderRadius: "8px",
                                      border: `1.5px solid ${isSel ? "#8B3E16" : "#E5DCD5"}`,
                                      background: isSel ? "#FFF4ED" : "#FFFFFF",
                                      color: isSel ? "#8B3E16" : "#241C18",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      fontSize: "12px",
                                    }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{m.icon}</span>
                                    <span>{m.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Dynamic Method Form */}
                          {counterPayMethod === "UPI" && (
                            <div style={{ background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                                <div style={{ fontSize: "12px", color: "#57534E", marginBottom: "8px", fontWeight: 600 }}>
                                  {t("scanQrInstructions", "Scan QR with Google Pay, PhonePe, Paytm or BHIM:")}
                                </div>
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`upi://pay?pa=hotel@upi&pn=Hotel+POS&am=${settleAmount}&tr=${counterTxnRef || ('TXN-INV-' + invoice.id)}&cu=INR`)}&size=150x150`}
                                  alt="UPI QR Code"
                                  style={{ width: "130px", height: "130px", borderRadius: "8px", border: "1px solid #D6D3D1", background: "#FFFFFF", padding: "4px" }}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div style={{ fontSize: "11px", color: "#78716C", marginTop: "4px" }}>
                                  {t("payNow", "Pay")} ₹{money(settleAmount)}
                                </div>
                              </div>

                              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#44403C", marginBottom: "4px" }}>
                                {t("upiTxnRef", "UPI Transaction Ref / UTR *")}
                              </label>
                              <input
                                type="text"
                                value={counterTxnRef}
                                onChange={(e) => setCounterTxnRef(e.target.value)}
                                placeholder={t("enterTransactionId", "e.g. 12-digit UTR or Txn Ref")}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #D6D3D1", fontSize: "12px", boxSizing: "border-box" }}
                              />

                              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "#15803D", marginTop: "10px", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={counterUpiVerified}
                                  onChange={(e) => setCounterUpiVerified(e.target.checked)}
                                />
                                <span>{t("paymentVerifiedBank", "Payment verified in bank / merchant account")}</span>
                              </label>
                            </div>
                          )}

                          {counterPayMethod === "CASH" && (
                            <div style={{ background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#44403C", marginBottom: "4px" }}>
                                {t("cashReceivedFromCustomer", "Cash Received from Customer (₹) *")}
                              </label>
                              <input
                                type="number"
                                value={counterCashReceived}
                                onChange={(e) => setCounterCashReceived(e.target.value)}
                                min={settleAmount}
                                placeholder={`${t("enterAmount", "Enter amount")} (${t("due", "Due")}: ₹${money(settleAmount)})`}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #D6D3D1", fontSize: "14px", fontWeight: 700, boxSizing: "border-box" }}
                              />

                              {Number(counterCashReceived) > 0 && (
                                <div style={{ marginTop: "10px", padding: "8px 10px", background: Number(counterCashReceived) >= settleAmount ? "#DCFCE7" : "#FEE2E2", borderRadius: "6px", fontSize: "12px", fontWeight: 700, color: Number(counterCashReceived) >= settleAmount ? "#15803D" : "#B91C1C", display: "flex", justifyContent: "space-between" }}>
                                  <span>{Number(counterCashReceived) >= settleAmount ? t("changeToReturn", "Change to Return:") : t("shortAmount", "Short Amount:")}</span>
                                  <span>₹{Math.abs(Number(counterCashReceived) - settleAmount).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {counterPayMethod === "CARD" && (
                            <div style={{ background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                              <div style={{ fontSize: "11px", color: "#78716C", marginBottom: "8px" }}>
                                {t("cardSwipeInfo", "Swipe or tap customer card on the bank EDC terminal machine. Never enter full card numbers or CVV.")}
                              </div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#44403C", marginBottom: "4px" }}>
                                {t("posSlipAuth", "POS Terminal Slip / Auth Ref # *")}
                              </label>
                              <input
                                type="text"
                                value={counterCardRef}
                                onChange={(e) => setCounterCardRef(e.target.value)}
                                placeholder="e.g. POS-AUTH-94218"
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #D6D3D1", fontSize: "12px", boxSizing: "border-box" }}
                              />
                            </div>
                          )}

                          {/* Settlement Modal Actions */}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                              type="button"
                              disabled={isSettlingCounter}
                              onClick={() => setShowCounterSettlementModal(false)}
                              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #D6D3D1", background: "#FFFFFF", color: "#57534E", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                            >
                              {t("cancel", "Cancel")}
                            </button>

                            <button
                              type="button"
                              disabled={isSettlingCounter || (counterPayMethod === "CASH" && Number(counterCashReceived) < settleAmount)}
                              style={{
                                padding: "8px 20px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#15803D",
                                color: "#FFFFFF",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: isSettlingCounter ? "wait" : "pointer",
                                opacity: isSettlingCounter || (counterPayMethod === "CASH" && Number(counterCashReceived) < settleAmount) ? 0.6 : 1,
                              }}
                              onClick={async () => {
                                if (isSettlingCounter || invoice.status === "PAID") return;

                                if (counterPayMethod === "CASH" && Number(counterCashReceived) < settleAmount) {
                                  dialogService.alert({
                                    title: t("insufficientCash", "Insufficient Cash"),
                                    message: t("cashLessThanDue", "Cash received is less than total amount due."),
                                    type: "warning",
                                  });
                                  return;
                                }

                                if (counterPayMethod === "UPI" && !counterTxnRef.trim()) {
                                  dialogService.alert({
                                    title: t("missingUtr", "UTR Reference Required"),
                                    message: t("provideUpiRef", "Please provide the UPI Transaction Reference or UTR."),
                                    type: "warning",
                                  });
                                  return;
                                }

                                try {
                                  setIsSettlingCounter(true);
                                  let targetInvId = invoice.id;
                                  // Ensure we pass the real backend invoice ID (not a client timestamp > 1000000000)
                                  if (!targetInvId || Number(targetInvId) > 1000000000 || isNaN(Number(targetInvId))) {
                                    try {
                                      const backendInvs = await billingService.getInvoices(selectedBranchId || undefined);
                                      const matched = (backendInvs || []).find(
                                        (b: any) =>
                                          (invoice.orderId && Number(b.orderId) === Number(invoice.orderId)) ||
                                          (invoice.invoiceNumber && b.invoiceNumber === invoice.invoiceNumber) ||
                                          Number(b.id) === Number(invoice.id)
                                      );
                                      if (matched && matched.id) {
                                        targetInvId = matched.id;
                                        invoice.id = matched.id;
                                      } else {
                                        const created = await billingService.createInvoice({
                                          branchId: selectedBranchId || 1,
                                          orderId: invoice.orderId || null,
                                          dueDate: new Date().toISOString().split("T")[0],
                                          discountAmount: invoice.discountAmount || 0,
                                          cgstRate: invoice.cgstRate || 0,
                                          sgstRate: invoice.sgstRate || 0,
                                          igstRate: invoice.igstRate || 0,
                                          invoiceNumber: invoice.invoiceNumber,
                                          items: (invoice.items || []).map((it) => ({
                                            description: it.itemName,
                                            quantity: it.quantity,
                                            unitPrice: it.price,
                                            taxRate: invoice.tax || 5,
                                          })),
                                          notes: `Invoice for table ${invoice.tableNumber || invoice.tableId} - ${invoice.customerName}`,
                                        });
                                        if (created?.id) {
                                          targetInvId = created.id;
                                          invoice.id = created.id;
                                        }
                                      }
                                    } catch (e) {
                                      console.warn("Could not pre-sync invoice ID before payment:", e);
                                    }
                                  }

                                  const finalTxnRef = counterPayMethod === "UPI"
                                    ? counterTxnRef.trim()
                                    : counterPayMethod === "CARD"
                                      ? (counterCardRef.trim() || `CARD-POS-${targetInvId}-${Date.now()}`)
                                      : `CASH-RECV-${targetInvId}-${Date.now()}`;

                                  await paymentService.recordPayment({
                                    invoiceId: targetInvId,
                                    amount: settleAmount,
                                    paymentMethod: counterPayMethod,
                                    transactionRef: finalTxnRef,
                                    paymentDate: new Date().toISOString().split("T")[0],
                                    notes: `Counter settlement via ${counterPayMethod} for Table ${invoice.tableNumber}`,
                                  });

                                  if (invoice.tableId) {
                                    localStorage.setItem(`table_cleaning_start_${invoice.tableId}`, String(Date.now()));
                                    await tableService.updateTableStatus(invoice.tableId, "CLEANING").catch(() => { });
                                    window.dispatchEvent(
                                      new CustomEvent("table-status-changed", {
                                        detail: { tableId: invoice.tableId, status: "CLEANING" },
                                      })
                                    );
                                  }

                                  window.dispatchEvent(new CustomEvent("payment-completed"));
                                  setInvoice({
                                    ...invoice,
                                    status: "PAID",
                                    paidAmount: invoice.grandTotal,
                                    remainingAmount: 0,
                                    dueAmount: 0,
                                    paymentMethod: counterPayMethod,
                                  });
                                  setShowCounterSettlementModal(false);
                                  await fetchLiveKotsAndOrders();
                                  dialogService.alert({
                                    title: t("paymentSettled", "Payment Settled"),
                                    message: `${t("paymentRecordedVia", "Payment recorded via")} ${counterPayMethod}! ${t("invoicePaidTableAvailable", "Invoice is PAID and Table is AVAILABLE.")}`,
                                    type: "success",
                                  });
                                } catch (err: any) {
                                  dialogService.alert({
                                    title: t("paymentFailed", "Payment Failed"),
                                    message: t("failedRecordPayment", "Failed to record payment: ") + (err?.response?.data?.message || err.message),
                                    type: "error",
                                  });
                                } finally {
                                  setIsSettlingCounter(false);
                                }
                              }}
                            >
                              {isSettlingCounter ? t("recording", "Recording...") : `${t("confirmSettle", "Confirm & Settle")} (₹${money(settleAmount)})`}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <button
                className="secondary"
                onClick={
                  openCustomize
                }
              >
                <Settings2
                  size={16}
                />

                {t("customize", "Customize")}
              </button>

              <button
                className="secondary"
                onClick={
                  shareWhatsApp
                }
                title={t("shareOnWhatsApp", "Share on WhatsApp (PDF)")}
              >
                <Share2
                  size={16}
                />

                {t("shareWhatsAppPdf", "WhatsApp (PDF)")}
              </button>

              <button
                className="secondary"
                onClick={
                  downloadPDF
                }
              >
                <Download
                  size={16}
                />

                {t("downloadPdf", "Download PDF")}
              </button>

              <button
                className="secondary"
                onClick={
                  printInvoice
                }
              >
                <Printer
                  size={16}
                />

                {t("print", "Print")}
              </button>

              <button
                className="primary"
                onClick={reset}
              >
                <RotateCcw
                  size={16}
                />

                {t("backToOrders", "Back to Orders")}
              </button>
            </div>
          </section>
        )}

      {/* =====================================================
          EDIT KOT POPUP
      ===================================================== */}

      {editingKOT && (
        <div
          className="popup-overlay"
          onClick={
            closeEditKOT
          }
        >
          <div
            className="edit-kot-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="edit-kot-head">
              <div>
                <small>
                  {t("editKot", "EDIT KOT")}
                </small>

                <h3>
                  {
                    editingKOT.kotNumber
                  }
                </h3>

                <p>
                  {t("editKotDesc", "Add new menu items or update existing quantities.")}
                </p>
              </div>

              <button
                className="popup-close"
                onClick={
                  closeEditKOT
                }
              >
                <X size={17} />
              </button>
            </div>

            <div className="edit-items">
              <div className="edit-items-title">
                <div>
                  <strong>
                    {t("orderItems", "Order Items")}
                  </strong>

                  <span>
                    {
                      editItems.length
                    }{" "}
                    {t("items", "items")}
                  </span>
                </div>

                <button
                  className="add-menu-top"
                  onClick={() =>
                    setShowAddItemPopup(
                      true
                    )
                  }
                >
                  <PlusCircle
                    size={15}
                  />

                  {t("addItem", "Add Item")}
                </button>
              </div>
              {editItems.length === 0 ? (
                <div className="no-edit-items">
                  {t("noItemsAdded", "No items added.")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* 1. PREVIOUSLY ORDERED ITEMS */}
                  <div style={{ border: "1px solid #E5D5C8", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#F5EBE6", borderBottom: "1px solid #E5D5C8", fontWeight: 700, fontSize: "13px", color: "#5C260E" }}>
                      <span>📋 {t("previouslyOrdered", "Previously Ordered Items")} ({editPrevItems.length})</span>
                      <span>{t("subtotal", "Subtotal")}: {money(editPrevSubtotal)}</span>
                    </div>
                    {editPrevItems.length === 0 ? (
                      <div style={{ padding: "10px", textAlign: "center", color: "#888", fontSize: "12px" }}>
                        {t("noPreviousItems", "No previously ordered items.")}
                      </div>
                    ) : (
                      editPrevItems.map((item) => (
                        <div className="edit-item-row" key={item.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #F0E6E0", background: "#FFFFFF" }}>
                          <div className="edit-item-name" style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                            <div className="edit-item-icon" style={{ background: "#F5EBE6", color: "#7B3515", padding: "6px", borderRadius: "6px" }}>
                              <Utensils size={14} />
                            </div>
                            <div>
                              <strong>{getLocalizedMenuItemName(item.itemName, language)}</strong>
                              <small style={{ display: "block", color: "#666" }}>{money(item.price)} {t("each", "each")}</small>
                            </div>
                          </div>
                          <div className="edit-qty-stepper" style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #D6C2B4", borderRadius: "6px", background: "#FFFFFF", overflow: "hidden", margin: "0 12px" }}>
                            <button type="button" onClick={() => decreaseEditItemQuantity(item.id)} disabled={item.quantity <= 1} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: item.quantity <= 1 ? "#F5EBE6" : "#FFF7ED", color: item.quantity <= 1 ? "#A89F91" : "#7B3515", cursor: item.quantity <= 1 ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", padding: 0 }} title="Decrease quantity">-</button>
                            <span style={{ minWidth: "32px", padding: "0 6px", textAlign: "center", fontWeight: 700, color: "#2C1810", fontSize: "13px" }}>{item.quantity}</span>
                            <button type="button" onClick={() => increaseEditItemQuantity(item.id)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "#FFF7ED", color: "#7B3515", cursor: "pointer", fontWeight: "bold", fontSize: "14px", padding: 0 }} title="Increase quantity">+</button>
                          </div>
                          <strong className="edit-item-total" style={{ minWidth: "70px", textAlign: "right", color: "#2C1810", fontSize: "14px" }}>{money(item.price * item.quantity)}</strong>
                          <button className="delete-item" onClick={() => removeEditItem(item.id)} title="Remove item" style={{ marginLeft: "10px", background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px" }}><Trash2 size={15} /></button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 2. NEWLY ADDED ITEMS */}
                  <div style={{ border: "1px solid #BBF7D0", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#ECFDF5", borderBottom: "1px solid #BBF7D0", fontWeight: 700, fontSize: "13px", color: "#065F46" }}>
                      <span>✨ {t("newlyAddedItems", "Newly Added Items")} ({editNewItems.length})</span>
                      <span>{t("subtotal", "Subtotal")}: {money(editNewSubtotal)}</span>
                    </div>
                    {editNewItems.length === 0 ? (
                      <div style={{ padding: "12px", textAlign: "center", color: "#6B7280", fontSize: "12.5px", background: "#F9FAFB" }}>
                        {t("noNewItemsYet", "No new items added yet. Click '+ Add Item' above.")}
                      </div>
                    ) : (
                      editNewItems.map((item) => (
                        <div className="edit-item-row" key={item.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #E5E7EB", background: "#F0FDF4" }}>
                          <div className="edit-item-name" style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                            <div className="edit-item-icon" style={{ background: "#DCFCE7", color: "#16A34A", padding: "6px", borderRadius: "6px" }}>
                              <Utensils size={14} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong>{getLocalizedMenuItemName(item.itemName, language)}</strong>
                                <span style={{ fontSize: "10px", background: "#16A34A", color: "#FFF", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>NEW</span>
                              </div>
                              <small style={{ display: "block", color: "#666" }}>{money(item.price)} {t("each", "each")}</small>
                            </div>
                          </div>
                          <div className="edit-qty-stepper" style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #86EFAC", borderRadius: "6px", background: "#FFFFFF", overflow: "hidden", margin: "0 12px" }}>
                            <button type="button" onClick={() => decreaseEditItemQuantity(item.id)} disabled={item.quantity <= 1} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: item.quantity <= 1 ? "#F5EBE6" : "#F0FDF4", color: item.quantity <= 1 ? "#A89F91" : "#16A34A", cursor: item.quantity <= 1 ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px", padding: 0 }} title="Decrease quantity">-</button>
                            <span style={{ minWidth: "32px", padding: "0 6px", textAlign: "center", fontWeight: 700, color: "#14532D", fontSize: "13px" }}>{item.quantity}</span>
                            <button type="button" onClick={() => increaseEditItemQuantity(item.id)} style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "#DCFCE7", color: "#16A34A", cursor: "pointer", fontWeight: "bold", fontSize: "14px", padding: 0 }} title="Increase quantity">+</button>
                          </div>
                          <strong className="edit-item-total" style={{ minWidth: "70px", textAlign: "right", color: "#14532D", fontSize: "14px" }}>{money(item.price * item.quantity)}</strong>
                          <button className="delete-item" onClick={() => removeEditItem(item.id)} title="Remove item" style={{ marginLeft: "10px", background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px" }}><Trash2 size={15} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="edit-kot-summary" style={{
              padding: "12px 16px",
              background: "#FDF8F5",
              borderRadius: "8px",
              marginTop: "14px",
              border: "1px solid #EAD8CD",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#5C260E" }}>
                <span>📋 {t("previousItemsSubtotal", "Previous Items Subtotal")}</span>
                <strong>{money(editPrevSubtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16A34A" }}>
                <span>✨ {t("newItemsSubtotal", "Newly Added Subtotal")}</span>
                <strong>{money(editNewSubtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                <span>{t("subtotal", "Subtotal")}</span>
                <strong>{money(editSubtotal)}</strong>
              </div>
              {editDiscountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16A34A" }}>
                  <span>{t("discount", "Discount")} ({editDiscountPercent}%)</span>
                  <strong>- {money(editDiscountAmount)}</strong>
                </div>
              )}
              {editTaxAmount > 0 && (
                isInterstate ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                    <span>IGST ({editTaxPercent}%)</span>
                    <strong>+ {money(editTaxAmount)}</strong>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>CGST ({(editTaxPercent / 2).toFixed(1).replace(/\.0$/, "")}%)</span>
                      <strong>+ {money(editTaxAmount / 2)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>SGST ({(editTaxPercent / 2).toFixed(1).replace(/\.0$/, "")}%)</span>
                      <strong>+ {money(editTaxAmount / 2)}</strong>
                    </div>
                  </>
                )
              )}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "15px",
                fontWeight: 800,
                color: "#7B3515",
                borderTop: "1px dashed #D6C2B4",
                paddingTop: "6px",
                marginTop: "2px"
              }}>
                <span>{t("grandTotal", "Grand Total")}</span>
                <span>{money(editGrandTotal)}</span>
              </div>
            </div>

            <div className="customize-actions">
              <button
                className="secondary"
                onClick={
                  closeEditKOT
                }
              >
                {t("cancel", "Cancel")}
              </button>

              <button
                className="primary"
                onClick={
                  saveEditedKOT
                }
              >
                <CheckCircle2
                  size={15}
                />

                {t("saveChanges", "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD MENU ITEM POPUP
      ===================================================== */}

      {showAddItemPopup && (
        <div
          className="popup-overlay add-item-overlay"
          onClick={() =>
            setShowAddItemPopup(
              false
            )
          }
        >
          <div
            className="add-item-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="add-item-head">
              <div>
                <h3>
                  {t("addMenuItem", "Add Menu Item")}
                </h3>

                <p>
                  {t("selectItemsToAdd", "Select multiple items to add to this bill.")}
                </p>
              </div>

              <button
                className="popup-close"
                onClick={() =>
                  setShowAddItemPopup(
                    false
                  )
                }
              >
                <X size={17} />
              </button>
            </div>

            <div className="menu-search">
              <Search
                size={16}
              />

              <input
                value={
                  menuSearch
                }
                onChange={(e) =>
                  setMenuSearch(
                    e.target
                      .value
                  )
                }
                placeholder={t("searchMenuItem", "Search menu item...")}
                autoFocus
              />
            </div>

            <div className="menu-list">
              {filteredMenuItems.map(
                (menuItem) => {
                  const alreadyAdded =
                    editItems.find(
                      (item) =>
                        item.itemName ===
                        menuItem.itemName
                    );

                  return (
                    <button
                      key={
                        menuItem.id
                      }
                      className="menu-option"
                      onClick={() =>
                        addMenuItem(
                          menuItem
                        )
                      }
                      type="button"
                    >
                      <div className="menu-option-icon">
                        <Utensils
                          size={15}
                        />
                      </div>

                      <div style={{ flex: 1, textAlign: "left" }}>
                        <strong>
                          {
                            getLocalizedMenuItemName(menuItem.itemName, language)
                          }
                        </strong>

                        <small style={{ display: "block" }}>
                          {money(
                            menuItem.price
                          )}
                        </small>
                      </div>

                      {alreadyAdded ? (
                        <span className="already-added" style={{ background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
                          {t("added", "Added")} ({alreadyAdded.quantity}) +
                        </span>
                      ) : (
                        <PlusCircle
                          size={17}
                        />
                      )}
                    </button>
                  );
                }
              )}

              {filteredMenuItems.length ===
                0 && (
                  <div className="no-menu">
                    {t("noMenuItemsFound", "No menu items found.")}
                  </div>
                )}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid #EAD8CD", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAF7F5" }}>
              <span style={{ fontSize: "12.5px", color: "#666", fontWeight: 600 }}>
                {editItems.length} {t("itemsInBill", "items in bill")}
              </span>
              <button
                type="button"
                onClick={() => setShowAddItemPopup(false)}
                style={{
                  padding: "7px 18px",
                  borderRadius: "6px",
                  background: "#7B3515",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {t("doneAddingItems", "Done Adding Items")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CUSTOMIZE BILL POPUP
      ===================================================== */}

      {showCustomizePopup && (
        <div
          className="popup-overlay"
          onClick={() =>
            setShowCustomizePopup(
              false
            )
          }
        >
          <div
            className="customize-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
          >
            <div className="customize-head">
              <div className="popup-icon">
                <Settings2
                  size={22}
                />
              </div>

              <div>
                <h3>
                  {t("customizeBill", "Customize Bill")}
                </h3>

                <p>
                  {t("customizeBillDesc", "Customize the business details shown on the simple bill.")}
                </p>
              </div>

              <button
                className="popup-close"
                onClick={() =>
                  setShowCustomizePopup(
                    false
                  )
                }
              >
                <X size={17} />
              </button>
            </div>

            {/* Logo Upload Section */}
            <div style={{ marginBottom: "16px" }}>
              <label className="customize-label" style={{ display: "block", marginBottom: "6px" }}>
                {t("billLogo", "Bill Logo / Business Image")} <span className="customize-optional">({t("optional", "Optional")})</span>
              </label>

              {customBillLogo ? (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "#FAF7F5", borderRadius: "8px", border: "1px solid #EAD8CD" }}>
                  <img
                    src={customBillLogo}
                    alt="Logo Preview"
                    style={{
                      maxHeight: "55px",
                      maxWidth: "110px",
                      objectFit: "contain",
                      background: "#FFFFFF",
                      borderRadius: "6px",
                      padding: "4px",
                      border: "1px solid #D6C2B4",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <label
                      htmlFor="bill-logo-file-input"
                      style={{
                        cursor: "pointer",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#FFFFFF",
                        border: "1px solid #D6C2B4",
                        borderRadius: "6px",
                        color: "#7B3515",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Upload size={13} />
                      {t("replaceLogo", "Replace Logo")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBillLogo("");
                        setLogoError("");
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#FEE2E2",
                        border: "1px solid #FCA5A5",
                        borderRadius: "6px",
                        color: "#DC2626",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Trash2 size={13} />
                      {t("remove", "Remove")}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="bill-logo-file-input"
                    style={{
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 16px",
                      background: "#FFFFFF",
                      border: "1.5px dashed #7B3515",
                      borderRadius: "8px",
                      color: "#7B3515",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <Upload size={16} />
                    {t("uploadLogo", "Upload Logo / Image")}
                  </label>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                    {t("supportedLogoTypes", "Supported: PNG, JPG, JPEG (Max 2MB)")}
                  </div>
                </div>
              )}

              <input
                id="bill-logo-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                style={{ display: "none" }}
                onChange={handleLogoFileChange}
              />

              {logoError && (
                <div className="customize-error" style={{ color: "#DC2626", fontSize: "12px", marginTop: "5px" }}>
                  {logoError}
                </div>
              )}
            </div>

            <label className="customize-label">
              {t("hotelRestaurantName", "Hotel / Restaurant Name")}

              <input
                autoFocus
                value={
                  customHotelName
                }
                onChange={(e) =>
                  updateCustomizeField(
                    "hotelName",
                    e.target.value
                  )
                }
                aria-invalid={!!customizeErrors.hotelName}
                placeholder={t("enterHotelName", "Enter hotel name")}
              />
              {customizeErrors.hotelName && (
                <div className="customize-error">{customizeErrors.hotelName}</div>
              )}
            </label>

            <label className="customize-label">
              {t("gstin", "GSTIN")} <span className="customize-optional">({t("optional", "Optional")})</span>

              <input
                value={
                  customGstin
                }
                onChange={(e) =>
                  updateCustomizeField(
                    "gstin",
                    e.target.value
                  )
                }
                aria-invalid={!!customizeErrors.gstin}
                placeholder={t("enterGstin", "Enter GSTIN")}
              />
              {customizeErrors.gstin && (
                <div className="customize-error">{customizeErrors.gstin}</div>
              )}
            </label>

            <label className="customize-label">
              {t("hotelAddress", "Hotel Address")}

              <input
                value={
                  customHotelAddress
                }
                onChange={(e) =>
                  updateCustomizeField(
                    "address",
                    e.target.value
                  )
                }
                aria-invalid={!!customizeErrors.address}
                placeholder={t("enterHotelAddress", "Enter hotel address")}
              />
              {customizeErrors.address && (
                <div className="customize-error">{customizeErrors.address}</div>
              )}
            </label>

            <label className="customize-label">
              {t("phoneNumber", "Phone Number")}

              <input
                value={
                  customPhoneNumber
                }
                onChange={(e) =>
                  updateCustomizeField(
                    "phone",
                    e.target.value
                  )
                }
                aria-invalid={!!customizeErrors.phone}
                placeholder={t("enterPhoneNumber", "Enter 10-digit phone number")}
                inputMode="numeric"
                maxLength={10}
              />
              {customizeErrors.phone && (
                <div className="customize-error">{customizeErrors.phone}</div>
              )}
            </label>

            <label className="customize-label">
              {t("footerMessage", "Footer Message")}

              <input
                value={
                  customFooterMessage
                }
                onChange={(e) =>
                  updateCustomizeField(
                    "footer",
                    e.target.value
                  )
                }
                aria-invalid={!!customizeErrors.footer}
                placeholder={t("thankYouVisiting", "Thank you for visiting us.")}
              />
              {customizeErrors.footer && (
                <div className="customize-error">{customizeErrors.footer}</div>
              )}
            </label>

            <div className="customize-actions">
              <button
                className="secondary"
                onClick={() =>
                  setShowCustomizePopup(
                    false
                  )
                }
              >
                {t("cancel", "Cancel")}
              </button>

              <button
                className="primary"
                onClick={
                  saveHotelCustomization
                }
              >
                {t("saveCustomization", "Save Customization")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CSS
      ===================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .billing-module {
          width: 100%;
          min-height: 100%;
          padding: 0 0 24px;
          background: #fffaf3;
          color: #21120c;
          font-family: Arial, Helvetica, sans-serif;
        }

        button {
          font-family: inherit;
          cursor: pointer;
        }

        .billing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 19px;
        }

        .eyebrow {
          display: flex;
          gap: 7px;
          align-items: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #a44720;
        }

        .eyebrow i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e96500;
        }

        .billing-header h1 {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 31px;
          margin: 5px 0 0;
        }

        .billing-header p {
          margin: 6px 0 0;
          color: #80594b;
          font-size: 14px;
        }

        .header-icon {
          width: 53px;
          height: 53px;
          border-radius: 13px;
          background: #21120c;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* STEPPER */

        .stepper {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #eadfd4;
          border-radius: 14px;
          padding: 13px 17px;
          margin-bottom: 17px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          color: #a18b7d;
          font-size: 12px;
        }

        .step b {
          width: 28px;
          height: 28px;
          border: 1px solid #ddcec1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .step.active {
          color: #80594b;
        }

        .step.current span {
          color: #21120c;
          font-weight: 800;
        }

        .step.active b {
          background: #fdf0e3;
          border-color: #e96500;
          color: #b74e16;
        }

        .stepper > em {
          height: 1px;
          background: #e7ddd5;
          flex: 1;
          margin: 0 11px;
        }

        .stepper > em.done {
          background: #e7a16d;
        }

        /* CARD */

        .card {
          background: #fff;
          border: 1px solid #eadfd4;
          border-radius: 17px;
          padding: 23px;
          box-shadow: 0 7px 24px rgba(73, 46, 31, .05);
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 18px;
        }

        .section-head h2 {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 24px;
          margin: 4px 0 0;
        }

        .section-head p {
          margin: 5px 0 0;
          color: #80594b;
          font-size: 13px;
        }

        .section-head > div > small {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #a44720;
        }

        .count,
        .ref {
          background: #fffaf3;
          border: 1px solid #ecd9c8;
          border-radius: 9px;
          padding: 9px 12px;
          color: #80594b;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .ref {
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          min-width: 100px;
        }

        .ref span {
          font-size: 9px;
          color: #a18b7d;
        }

        .ref strong {
          color: #21120c;
          font-size: 13px;
        }

        /* SEARCH */

        .search {
          height: 46px;
          max-width: 430px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #dfd4cb;
          border-radius: 9px;
          padding: 0 13px;
          margin-bottom: 17px;
          color: #8a7569;
        }

        .search input {
          width: 100%;
          border: 0;
          outline: 0;
          font-size: 14px;
        }

        /* RECORD TABLE */

        .records-table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid #eee3da;
          border-radius: 12px;
          scrollbar-width: thin;
        }

        .records-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          background: #fff;
        }

        .records-table thead {
          background: #fffaf3;
        }

        .records-table th {
          padding: 12px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .6px;
          color: #9b3d19;
          border-bottom: 1px solid #eadfd4;
          white-space: nowrap;
        }

        .records-table td {
          padding: 12px 12px;
          border-bottom: 1px solid #f0e7df;
          font-size: 13px;
          color: #59473d;
          vertical-align: middle;
        }

        .records-table tbody tr:hover {
          background: #fffaf3;
        }

        .record-kot {
          color: #21120c;
          font-size: 14px;
        }

        .record-date {
          color: #6e5b50;
          font-size: 12px;
          white-space: nowrap;
        }

        .record-customer {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .record-customer strong {
          color: #21120c;
          font-size: 14px;
        }

        .record-customer small {
          color: #92796b;
          font-size: 11px;
        }

        .table-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 6px;
          background: #fff3e7;
          color: #a44720;
          font-size: 12px;
          font-weight: 700;
        }

        .items-count {
          color: #80594b;
          font-size: 12px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .4px;
          white-space: nowrap;
        }

        .status-badge.send-to-kitchen {
          background: #fff3e7;
          color: #a44720;
        }

        .status-badge.requested-bill {
          background: #e8f7ee;
          color: #188943;
        }

        .record-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .edit-record-btn,
        .create-record-btn {
          min-height: 34px;
          border-radius: 8px;
          padding: 6px 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 800;
          white-space: nowrap;
        }

        .edit-record-btn {
          background: #fff;
          border: 1px solid #dfd3c9;
          color: #80594b;
        }

        .edit-record-btn:hover {
          background: #fffaf3;
          border-color: #d7a17a;
        }

        .create-record-btn {
          background: #21120c;
          border: 1px solid #21120c;
          color: #fff;
        }

        .create-record-btn:hover {
          background: #3a241a;
        }

        /* EMPTY */

        .empty {
          text-align: center;
          padding: 55px 20px;
          background: #fffaf3;
          border: 1px dashed #e3d5cb;
          border-radius: 12px;
        }

        .empty h3 {
          font: 19px Georgia, serif;
          margin: 10px 0 5px;
        }

        .empty p {
          font-size: 13px;
          color: #92796b;
          margin: 0 0 14px;
        }

        /* BUTTONS */

        .primary,
        .secondary,
        .outline {
          min-height: 42px;
          border-radius: 10px;
          padding: 10px 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          transition: .18s;
        }

        .primary {
          background: #21120c;
          border: 1px solid #21120c;
          color: #fff;
        }

        .primary:hover {
          background: #3a241a;
        }

        .secondary,
        .outline {
          background: #fff;
          border: 1px solid #dfd3c9;
          color: #3d2b22;
        }

        .outline:hover,
        .secondary:hover {
          background: #fffaf3;
          border-color: #d7a17a;
        }

        .back {
          border: 0;
          background: transparent;
          color: #80594b;
          font-size: 13px;
          font-weight: 800;
          padding: 0;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* CUSTOMER */

        .customer-summary {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }

        .customer-summary > div {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 14px;
          background: #fffaf3;
          border: 1px solid #eee3da;
          border-radius: 11px;
          color: #a44720;
        }

        .customer-summary span {
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: #92796b;
          font-size: 11px;
        }

        .customer-summary strong {
          color: #21120c;
          font-size: 14px;
        }

        .customer-summary small {
          font-size: 10px;
        }

        /* STEP 2 */

        .summary-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(310px, 0.9fr);
          gap: 18px;
          align-items: start;
        }

        .billing-left-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .billing-sub-card {
          background: #fff;
          border: 1px solid #eadfd4;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(73, 46, 31, .04);
        }

        .sub-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #21120c;
          margin-bottom: 14px;
        }

        /* ORDER ITEMS */

        .order-items-scroll-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        .order-items-table-head {
          display: grid;
          grid-template-columns:
            minmax(150px, 1fr)
            65px
            75px
            85px
            40px;
          align-items: center;
          min-height: 40px;
          min-width: 415px;
          padding: 0 12px;
          background: #fffaf3;
          border-bottom: 1px solid #eee3da;
          color: #21120c;
          font-size: 12px;
          font-weight: 700;
        }

        .order-items-table-head span:not(:first-child) {
          text-align: center;
        }

        .order-items-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-width: 415px;
        }

        .reference-order-row {
          display: grid;
          grid-template-columns:
            minmax(150px, 1fr)
            65px
            75px
            85px
            40px;
          align-items: center;
          min-height: 70px;
          min-width: 415px;
          padding: 8px 12px;
          border-bottom: 1px solid #f0e7df;
          background: #fffdfa;
        }

        .reference-item-info {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .reference-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #fff3e7;
          color: #a44720;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .reference-item-text {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .reference-item-text strong {
          color: #21120c;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .reference-item-text span {
          color: #80594b;
          font-size: 11px;
        }

        /* DIRECT QUANTITY INPUT */

        .direct-qty-wrap {
          width: 70px;
          height: 38px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .direct-quantity-input {
          width: 70px;
          height: 38px;
          box-sizing: border-box;
          border: 1px solid #e8ddd4;
          border-radius: 9px;
          background: #fff;
          color: #21120c;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          padding: 0 8px;
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .direct-quantity-input:focus {
          border-color: #e96500;
          box-shadow: 0 0 0 3px rgba(233, 101, 0, .10);
        }

        .direct-quantity-input::-webkit-inner-spin-button,
        .direct-quantity-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .reference-rate,
        .reference-amount {
          text-align: center;
          color: #21120c;
          font-size: 13.5px;
          white-space: nowrap;
        }

        .reference-amount {
          font-weight: 700;
        }

        .reference-delete {
          width: 32px;
          height: 32px;
          margin: auto;
          border: 0;
          border-radius: 8px;
          background: #fff0eb;
          color: #ef3f25;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .reference-delete:hover {
          background: #ffe1d8;
        }

        .add-item-link-img {
          background: none;
          border: 0;
          color: #e96500;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* PAYMENT */

        .methods-grid-img {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .method-card-img {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid #e5dbd2;
          border-radius: 12px;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }

        .method-card-img.selected {
          border-color: #e96500;
          background: #fff6ed;
        }

        .method-card-img i {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #fff3e7;
          color: #a44720;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .method-card-img span {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .method-card-img strong {
          font-size: 13px;
          color: #21120c;
        }

        .method-card-img small {
          color: #92796b;
          font-size: 10px;
        }

        /* BILL SUMMARY */

        .billing-right-card {
          background: #fff;
          border: 1px solid #eadfd4;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 4px 16px rgba(73, 46, 31, .04);
          position: sticky;
          top: 84px;
        }

        .bill-summary-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .bill-summary-heading .sub-card-title {
          margin-bottom: 3px;
        }

        .bill-summary-heading p {
          margin: 0;
          color: #92796b;
          font-size: 11px;
          line-height: 1.5;
        }

        .bill-summary-heading > svg {
          color: #a44720;
          background: #fff3e7;
          border-radius: 8px;
          padding: 6px;
          box-sizing: content-box;
        }

        .summary-rows-img {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: 0;
          font-size: 13px;
        }

        .summary-rows-img > div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-rows-img span {
          color: #80594b;
        }

        .summary-rows-img strong {
          color: #21120c;
          font-weight: 700;
        }

        .summary-main-row {
          padding: 2px 0 14px;
        }

        .summary-main-row strong {
          font-size: 15px;
        }

        .adjustment-row {
          min-height: 45px;
          padding: 11px 0;
          border-top: 1px solid #f0e7df;
        }

        .adjustment-label {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .adjustment-label > span {
          color: #59473d;
          font-weight: 600;
        }

        .adjustment-label small {
          color: #92796b;
          font-size: 10px;
        }

        .add-adjustment-btn,
        .remove-adjustment-btn {
          border: 0;
          background: transparent;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          padding: 5px 7px;
          border-radius: 7px;
        }

        .add-adjustment-btn {
          color: #e96500;
        }

        .add-adjustment-btn:hover,
        .add-adjustment-btn.active {
          background: #fff3e7;
          color: #b74e16;
        }

        .remove-adjustment-btn {
          color: #c44a35;
        }

        .remove-adjustment-btn:hover {
          background: #fff1ef;
        }

        .adjustment-input-panel {
          display: block;
          margin: 2px 0 10px;
          padding: 13px;
          background: #fffaf3;
          border: 1px solid #ecd9c8;
          border-radius: 10px;
        }

        .adjustment-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
        }

        .adjustment-input-header span {
          color: #59473d;
          font-size: 11px;
          font-weight: 800;
        }

        .adjustment-input-wrap {
          height: 40px;
          display: flex;
          align-items: center;
          border: 1px solid #ded3ca;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
        }

        .adjustment-input-wrap:focus-within {
          border-color: #e96500;
          box-shadow: 0 0 0 3px rgba(233, 101, 0, .08);
        }

        .adjustment-input-wrap input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          padding: 0 10px;
          font-size: 12px;
          color: #21120c;
          background: transparent;
        }

        .adjustment-input-wrap b {
          padding: 0 11px;
          color: #80594b;
          font-size: 12px;
        }

        .adjustment-preview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .adjustment-preview span {
          font-size: 10px;
          color: #92796b;
        }

        .adjustment-preview strong {
          font-size: 11px;
          color: #21120c;
        }

        .summary-divider {
          border-top: 1px solid #eadfd4;
          margin: 4px 0 12px;
        }

        .summary-calculation {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 13px;
        }

        .summary-calculation div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-calculation span {
          color: #92796b;
          font-size: 11px;
        }

        .summary-calculation strong {
          font-size: 11px;
        }

        .red {
          color: #c44a35 !important;
        }

        .grand-total-dark-box {
          background: #21120c;
          color: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .grand-total-dark-box span {
          font-size: 10px;
          color: #cbbdb2;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .7px;
        }

        .grand-total-dark-box strong {
          font-size: 25px;
          font-weight: 800;
          color: #fff;
        }

        .generate-btn-img {
          width: 100%;
          min-height: 50px;
          background: #21120c;
          border: 0;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: background .2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .generate-btn-img:hover {
          background: #3a241a;
        }

        .checkout-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 10px;
          color: #92796b;
          font-size: 9px;
          text-align: center;
        }

        .checkout-note svg {
          color: #188943;
          flex-shrink: 0;
        }

        /* SUCCESS */

        .success {
          text-align: center;
          padding-top: 28px;
        }

        .success-icon {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #e7f6ec;
          color: #188943;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }

        .success > small {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #a44720;
        }

        .success h2 {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 26px;
          margin: 6px 0;
        }

        .success > p {
          font-size: 13px;
          color: #80594b;
          margin: 0 auto 20px;
        }

        .success-summary {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 9px;
          text-align: left;
          margin-bottom: 20px;
        }

        .success-summary div {
          padding: 12px;
          border: 1px solid #eee3da;
          background: #fffaf3;
          border-radius: 9px;
          min-width: 0;
        }

        .success-summary span {
          display: block;
          font-size: 10px;
          color: #92796b;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .success-summary b {
          display: block;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .paid {
          color: #188943 !important;
        }

        .success-bill-label {
          text-align: left;
          margin: 4px 0 9px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .7px;
          color: #92796b;
          text-transform: uppercase;
        }

        .actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        /* SIMPLE BILL - 80mm Thermal Receipt Preview & Print */

        .simple-bill {
          width: 74mm;
          max-width: 74mm;
          min-width: 74mm;
          margin: 0 auto;
          background: #fff;
          color: #000;
          border: 1px solid #d7d7d7;
          border-radius: 4px;
          padding: 3mm 2mm;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          text-align: left;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          overflow: visible;
          box-sizing: border-box;
        }

        .simple-business-logo {
          text-align: center;
          margin-bottom: 4px;
        }

        .simple-business-logo img {
          max-height: 48px;
          max-width: 140px;
          object-fit: contain;
          display: inline-block;
        }

        .simple-business-name {
          text-align: center;
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #000;
          line-height: 1.2;
          margin: 0 0 2px 0;
        }

        .simple-business-sub {
          text-align: center;
          font-size: 9px;
          color: #333;
          margin: 1px 0;
          line-height: 1.25;
          word-break: break-word;
        }

        .simple-title {
          text-align: center;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1px;
          margin: 4px 0 2px 0;
          padding: 2px 0;
          color: #000;
          text-transform: uppercase;
        }

        .simple-rule {
          border: none;
          border-top: 1px dashed #000;
          margin: 4px 0;
          height: 0;
        }

        .simple-details {
          display: flex;
          flex-direction: column;
          gap: 2.5px;
          margin: 4px 0 6px 0;
          background: #fafafa;
          padding: 5px 6px;
          border-radius: 4px;
          border: 1px dashed #666;
          box-sizing: border-box;
          width: 100%;
        }

        .simple-details-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          width: 100%;
          gap: 6px;
          font-size: 9px;
          line-height: 1.25;
          overflow: visible;
        }

        .simple-details-row.full-width {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        .detail-half {
          display: flex;
          align-items: baseline;
          gap: 3px;
          min-width: 0;
          flex: 1 1 50%;
          overflow: visible;
        }

        .detail-half.right {
          justify-content: flex-end;
          text-align: right;
        }

        .detail-label {
          color: #333;
          font-weight: 600;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .detail-value {
          color: #000;
          font-weight: 700;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
        }

        .text-right {
          text-align: right;
        }

        .status-paid {
          color: #15803d !important;
          font-weight: 800 !important;
        }

        .status-pending {
          color: #b45309 !important;
          font-weight: 800 !important;
        }

        .simple-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
          margin: 4px 0;
          table-layout: fixed;
        }

        .simple-table th {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 4px 1px;
          font-weight: 800;
          color: #000;
          text-transform: uppercase;
          font-size: 8.5px;
          line-height: 1.2;
        }

        .col-desc {
          width: 48%;
          text-align: left;
          padding-left: 1px;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: normal;
          font-weight: 600;
        }

        .col-qty {
          width: 12%;
          text-align: center;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .col-rate {
          width: 20%;
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .col-amt {
          width: 20%;
          text-align: right;
          padding-right: 1px;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
        }

        .simple-table td {
          padding: 3.5px 1px;
          border-bottom: 1px dotted #ccc;
          vertical-align: top;
          line-height: 1.25;
          font-size: 9px;
          color: #000;
        }

        .simple-totals {
          width: 100%;
          margin: 4px 0 0 0;
          border-top: 1px dashed #000;
          padding-top: 3px;
          box-sizing: border-box;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 1.5px 0;
          font-size: 9.5px;
          color: #111;
          line-height: 1.3;
        }

        .totals-row span {
          font-weight: 500;
          color: #222;
          white-space: nowrap;
        }

        .totals-row strong {
          font-weight: 700;
          color: #000;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          text-align: right;
        }

        .tab-num {
          font-variant-numeric: tabular-nums;
        }

        .text-uppercase {
          text-transform: uppercase;
        }

        .simple-grand {
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 4px 0;
          margin: 4px 0;
          font-size: 12px;
          font-weight: 800;
          color: #000;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .simple-grand strong {
          font-size: 13.5px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .balance-due {
          color: #b91c1c;
          font-weight: 700;
        }

        .balance-due strong {
          color: #b91c1c;
        }

        .change-returned {
          color: #15803d;
          font-weight: 700;
        }

        .change-returned strong {
          color: #15803d;
        }

        .simple-footer {
          text-align: center;
          border-top: 1px dashed #000;
          margin-top: 8px;
          padding-top: 5px;
          font-size: 9px;
          color: #333;
          line-height: 1.3;
        }

        /* POPUPS */

        .popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(33, 18, 12, .42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .popup-close {
          width: 34px;
          height: 34px;
          border: 1px solid #eadfd4;
          border-radius: 9px;
          background: #fff;
          color: #6f5b50;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .edit-kot-popup {
          width: min(720px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: #fffdfa;
          border: 1px solid #eadfd4;
          border-radius: 18px;
          box-shadow: 0 20px 55px rgba(33, 18, 12, .22);
          padding: 24px;
        }

        .edit-kot-head {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee3da;
        }

        .edit-kot-head h3 {
          margin: 5px 0;
        }

        .edit-kot-head p {
          margin: 0;
          color: #80594b;
          font-size: 12px;
        }

        .edit-items {
          margin-top: 16px;
          border: 1px solid #eee3da;
          border-radius: 12px;
          overflow: hidden;
        }

        .edit-items-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 15px;
          background: #fffaf3;
          border-bottom: 1px solid #eee3da;
        }

        .edit-items-title div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .edit-items-title span {
          color: #92796b;
          font-size: 10px;
        }

        .add-menu-top {
          min-height: 34px;
          padding: 7px 11px;
          border: 1px solid #d7a17a;
          border-radius: 8px;
          background: #fff;
          color: #a44720;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
        }

        .edit-item-row {
          display: grid;
          grid-template-columns: 1fr auto 110px 36px;
          align-items: center;
          gap: 14px;
          padding: 12px 15px;
          border-bottom: 1px solid #f0e7df;
        }

        .edit-item-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .edit-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #fff3e7;
          color: #a44720;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .edit-item-name > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .edit-item-name small {
          color: #92796b;
          font-size: 10px;
        }

        .edit-qty {
          display: flex;
          align-items: center;
          width: 70px;
          height: 36px;
          border: 1px solid #e2d7ce;
          border-radius: 8px;
          background: #fff;
          overflow: hidden;
        }

        .edit-qty input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: #3d2b22;
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .edit-qty input::-webkit-inner-spin-button,
        .edit-qty input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .delete-item {
          width: 32px;
          height: 32px;
          border: 1px solid #f0d4d0;
          border-radius: 8px;
          background: #fff;
          color: #c44a35;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-kot-total {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 25px;
          padding: 16px 2px 0;
        }

        /* ADD MENU POPUP */

        .add-item-popup {
          width: min(480px, 100%);
          max-height: 80vh;
          overflow: hidden;
          background: #fffdfa;
          border: 1px solid #eadfd4;
          border-radius: 18px;
          box-shadow: 0 20px 55px rgba(33, 18, 12, .22);
          padding: 20px;
        }

        .add-item-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }

        .add-item-head h3 {
          margin: 0 0 5px;
        }

        .add-item-head p {
          margin: 0;
          color: #80594b;
          font-size: 12px;
        }

        .menu-search {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #ded3ca;
          border-radius: 9px;
          margin-bottom: 12px;
        }

        .menu-search input {
          width: 100%;
          border: 0;
          outline: 0;
          font-size: 12px;
        }

        .menu-list {
          max-height: 55vh;
          overflow-y: auto;
          border: 1px solid #eee3da;
          border-radius: 10px;
        }

        .menu-option {
          width: 100%;
          min-height: 56px;
          padding: 9px 12px;
          display: grid;
          grid-template-columns: 34px 1fr auto;
          align-items: center;
          gap: 10px;
          border: 0;
          border-bottom: 1px solid #f0e7df;
          background: #fff;
          text-align: left;
        }

        .menu-option > div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .menu-option small {
          color: #92796b;
          font-size: 10px;
        }

        .menu-option-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #fff3e7;
          color: #a44720;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .already-added {
          font-size: 9px;
          padding: 5px 8px;
          border-radius: 12px;
          background: #e8f7ee;
          color: #188943;
          font-weight: 800;
        }

        .no-menu,
        .no-edit-items {
          padding: 25px;
          text-align: center;
          color: #92796b;
          font-size: 12px;
        }

        /* CUSTOMIZE */

        .customize-popup {
          width: min(500px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: #fffdfa;
          border: 1px solid #eadfd4;
          border-radius: 18px;
          box-shadow: 0 20px 55px rgba(33, 18, 12, .22);
          padding: 24px;
        }

        .customize-head {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .customize-head > div:nth-child(2) {
          flex: 1;
        }

        .customize-head h3 {
          margin: 0 0 5px;
        }

        .customize-head p {
          margin: 0;
          color: #80594b;
          font-size: 11px;
        }

        .popup-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #fff3e7;
          color: #a44720;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .customize-label {
          display: block;
          margin-top: 20px;
          color: #3d2b22;
          font-size: 12px;
          font-weight: 800;
        }

        .customize-label input {
          display: block;
          width: 100%;
          height: 45px;
          margin-top: 7px;
          border: 1px solid #ded3ca;
          border-radius: 9px;
          outline: 0;
          padding: 0 12px;
          font-size: 13px;
        }

        .customize-label input[aria-invalid="true"] {
          border-color: #dc2626;
          box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.08);
        }

        .customize-error {
          margin-top: 5px;
          color: #dc2626;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.4;
        }

        .customize-optional {
          color: #80594b;
          font-size: 10px;
          font-weight: 600;
        }

        .customize-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 18px;
        }

        /* RESPONSIVE */
        @media (max-width: 1050px) {
          .summary-layout {
            grid-template-columns: 1fr;
          }

          .billing-right-card {
            position: static;
          }

          .success-summary {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 800px) {
          .billing-module {
            padding: 15px;
          }

          .order-items-table-head {
            display: none;
          }

          .reference-order-row {
            grid-template-columns: 1fr auto;
            gap: 10px;
            padding: 12px;
          }

          .reference-item-info {
            grid-column: 1 / -1;
          }

          .reference-rate {
            display: none;
          }

          .reference-amount {
            text-align: right;
          }

          .reference-delete {
            margin: 0;
          }

          .customer-summary {
            grid-template-columns: 1fr 1fr;
          }

          .success-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .edit-item-row {
            grid-template-columns: 1fr auto 36px;
          }

          .edit-item-total {
            display: none;
          }
        }

        @media (max-width: 560px) {
          .customer-summary,
          .success-summary {
            grid-template-columns: 1fr;
          }

          .methods-grid-img {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column;
          }

          .actions button {
            width: 100%;
          }

          .simple-bill {
            width: 74mm;
            max-width: 74mm;
            min-width: 74mm;
            padding: 3mm 2mm;
          }

          .simple-totals {
            width: 100%;
          }

          .stepper {
            overflow-x: auto;
          }

          .step {
            flex-shrink: 0;
          }
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }

          html, body {
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .billing-header,
          .stepper,
          .actions,
          .success-summary,
          .success-bill-label,
          .billing-grid,
          .top-navbar,
          .sidebar,
          .no-print,
          nav,
          header,
          aside,
          button,
          .modal-overlay,
          .popup-overlay {
            display: none !important;
          }

          .billing-module {
            width: 100% !important;
            max-width: 80mm !important;
            min-width: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
          }

          .simple-bill {
            width: 72mm !important;
            max-width: 72mm !important;
            min-width: 72mm !important;
            margin: 0 auto !important;
            padding: 1.5mm 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }

      `}</style>
      {/* Complete Multi-Size Bluetooth & System Print Dialog */}
      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoiceData={printModalData}
      />
    </div>
  );
};

export default HotelBilling;
