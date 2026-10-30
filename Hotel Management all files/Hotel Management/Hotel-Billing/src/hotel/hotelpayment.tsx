import { PrintInvoiceModal } from "../components/PrintInvoiceModal";
import { UniversalInvoicePrintData } from "../types/printing";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { paymentService } from "../services/paymentService";
import { LocalizedDatePicker } from "../common/LocalizedDatePicker";
import { billingService } from "../services/billingService";
import { tableService } from "../services/tableService";
import { useBranch } from "../context/BranchContext";
import { TablePagination } from "../common/TablePagination";
import { useLanguage } from "../context/LanguageContext";
import { dialogService } from "../context/DialogContext";
import { formatTableNumber } from "./Tables";
import { getLocalizedMenuItemName, localizeGuestName, SupportedLang } from "../locales/nameLocalization";
import {
  ReceiptIndianRupee,
  Eye,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Search,
  Filter,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Printer,
  Share2,
  ArrowRight,
  Armchair,
  User,
  ShoppingBag,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type TabType = "AWAITING" | "SETTLED";
type PaymentMethodType = "UPI" | "CASH" | "CARD";

interface LiveInvoice {
  id: number;
  invoiceNumber: string;
  orderId?: number;
  orderNumber?: string;
  kotNumber?: string;
  tableId?: number;
  tableNumber?: string;
  tableName?: string;
  guestName?: string;
  customerName?: string;
  customerMobile?: string;
  phone?: string;
  customerPhone?: string;
  items?: Array<{
    id?: number;
    description?: string;
    itemName?: string;
    name?: string;
    quantity?: number;
    qty?: number;
    unitPrice?: number;
    price?: number;
    totalPrice?: number;
  }>;
  subtotal?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  isInterstate?: boolean;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paidAmount?: number;
  dueAmount?: number;
  status: string;
  paymentMethod?: string;
  invoiceDate?: string;
  createdAt?: string;
  notes?: string;
}

interface LivePayment {
  id: number;
  invoiceId?: number;
  invoiceNumber?: string;
  orderId?: number;
  orderNumber?: string;
  kotNumber?: string;
  tableId?: number;
  tableNumber?: string;
  tableName?: string;
  branchId?: number;
  branchName?: string;
  branchCode?: string;
  customerName?: string;
  customerMobile?: string;
  phone?: string;
  customerPhone?: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDate?: string;
  createdAt?: string;
  status: string;
  notes?: string;
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  background: "#FFF9F3",
  card: "#FFFFFF",
  text: "#241C18",
  muted: "#716963",
  accent: "#8B3E16",
  accentLight: "#FFF4ED",
  success: "#15803D",
  successBg: "#DCFCE7",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  border: "#E5DCD5",
};

export const HotelPayment: React.FC = () => {
  const navigate = useNavigate();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<UniversalInvoicePrintData | null>(null);
  const [searchParams] = useSearchParams();
  const { selectedBranchId, selectedBranch } = useBranch();
  const { language, t, translateStatus, formatDate, toDevanagari, formatNumber } = useLanguage();

  // Active Tab: "SETTLED" (Payment History) | "AWAITING" (Bills Awaiting Payment)
  const [activeTab, setActiveTab] = useState<TabType>("SETTLED");

  // Live Data
  const [invoices, setInvoices] = useState<LiveInvoice[]>([]);
  const [payments, setPayments] = useState<LivePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  useEffect(() => {
    const handleNavDate = (e: any) => {
      const { startDate, endDate } = e.detail || {};
      if (startDate) {
        setSelectedDate(startDate);
        setDateRangeEnd(endDate || startDate);
      }
    };
    const s = localStorage.getItem('navbar_start_date');
    const end = localStorage.getItem('navbar_end_date');
    if (s) {
      setSelectedDate(s);
      setDateRangeEnd(end || s);
    }
    window.addEventListener('navbar-date-filter-changed', handleNavDate);
    return () => window.removeEventListener('navbar-date-filter-changed', handleNavDate);
  }, []);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Date range checker for filtering
  const isDateInRange = (dateStr?: string) => {
    if (!selectedDate) return true;
    if (!dateStr) return false;
    const cleanDate = dateStr.split("T")[0];
    const fromDate = selectedDate.split("T")[0];
    const toDate = (dateRangeEnd || selectedDate).split("T")[0];
    if (fromDate && cleanDate < fromDate) return false;
    if (toDate && cleanDate > toDate) return false;
    return true;
  };

  // Modals
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<LiveInvoice | null>(null);
  const [viewDetailsInvoice, setViewDetailsInvoice] = useState<LiveInvoice | null>(null);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<{
    invoice: LiveInvoice;
    amount: number;
    method: string;
    txnRef: string;
    date: string;
  } | null>(null);

  // Payment Form State
  const [payMethod, setPayMethod] = useState<PaymentMethodType>("UPI");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payRef, setPayRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");
  const [payCashReceived, setPayCashReceived] = useState<string>("");
  const [payUpiVerified, setPayUpiVerified] = useState<boolean>(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Load live data from Spring Boot backend
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [invRes, payRes] = await Promise.all([
        billingService.getInvoices(selectedBranchId).catch(() => []),
        paymentService.getPayments(selectedBranchId).catch(() => []),
      ]);

      const rawInvoices = Array.isArray(invRes) ? (invRes as any[]) : [];
      const mappedInvoices: LiveInvoice[] = rawInvoices.map((inv) => {
        const totalTax = Number(inv.taxAmount || 0);
        const isInter = Boolean((inv.igst && Number(inv.igst) > 0) || inv.isInterstate);
        const cgstVal = inv.cgst !== undefined ? Number(inv.cgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
        const sgstVal = inv.sgst !== undefined ? Number(inv.sgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
        const igstVal = inv.igst !== undefined ? Number(inv.igst) : (isInter && totalTax > 0 ? totalTax : 0);
        const taxableVal = inv.taxableAmount !== undefined
          ? Number(inv.taxableAmount)
          : Math.max(0, (Number(inv.subtotal) || Number(inv.grandTotal) || 0) - (Number(inv.discountAmount) || 0));

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
          orderId: inv.orderId,
          orderNumber: inv.orderNumber || (inv.orderId ? `ORD-${inv.orderId}` : "-"),
          tableId: inv.tableId,
          tableNumber: formatTableNumber({ name: inv.tableName, tableNumber: inv.tableNumber, id: inv.tableId }) || "-",
          tableName: formatTableNumber({ name: inv.tableName, tableNumber: inv.tableNumber, id: inv.tableId }) || "-",
          guestName: inv.guestName || inv.customerName || "Walk-in Guest",
          customerName: inv.customerName || inv.guestName || "Walk-in Guest",
          items: inv.items || [],
          subtotal: Number(inv.subtotal) || Number(inv.grandTotal) || 0,
          taxableAmount: taxableVal,
          cgst: cgstVal,
          sgst: sgstVal,
          igst: igstVal,
          cgstRate: inv.cgstRate ? Number(inv.cgstRate) : (!isInter && totalTax > 0 ? 2.5 : 0),
          sgstRate: inv.sgstRate ? Number(inv.sgstRate) : (!isInter && totalTax > 0 ? 2.5 : 0),
          igstRate: inv.igstRate ? Number(inv.igstRate) : (isInter && totalTax > 0 ? 5 : 0),
          isInterstate: isInter,
          taxAmount: totalTax,
          discountAmount: Number(inv.discountAmount) || 0,
          grandTotal: Number(inv.grandTotal) || Number(inv.totalAmount) || 0,
          paidAmount: Number(inv.paidAmount) || 0,
          dueAmount: inv.dueAmount !== undefined ? Number(inv.dueAmount) : Number(inv.grandTotal) - (Number(inv.paidAmount) || 0),
          status: String(inv.status || "UNPAID").toUpperCase(),
          paymentMethod: inv.paymentMethod || "UPI",
          invoiceDate: inv.invoiceDate || inv.createdAt,
          createdAt: inv.createdAt || inv.invoiceDate || new Date().toISOString(),
          notes: inv.notes || "",
        };
      });

      const rawPayments = Array.isArray(payRes) ? payRes : [];
      const mappedPayments: LivePayment[] = rawPayments.map((p: any) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : "-"),
        orderId: p.orderId,
        orderNumber: p.orderNumber || (p.orderId ? `ORD-${p.orderId}` : "-"),
        kotNumber: p.kotNumber || "-",
        tableId: p.tableId || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId) || (p.orderId && Number(inv.orderId) === Number(p.orderId)))?.tableId,
        tableName: formatTableNumber({ name: p.tableName || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableName, tableNumber: p.tableNumber || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableNumber, id: p.tableId || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableId }) || "-",
        tableNumber: formatTableNumber({ name: p.tableName || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableName, tableNumber: p.tableNumber || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableNumber, id: p.tableId || mappedInvoices.find((inv) => Number(inv.id) === Number(p.invoiceId))?.tableId }) || "-",
        branchId: p.branchId,
        branchName: p.branchName || (p.branchId ? `Branch ${p.branchId}` : "-"),
        branchCode: p.branchCode || "",
        customerName: p.customerName || "Walk-in Guest",
        amount: Number(p.amount) || 0,
        paymentMethod: p.paymentMethod || "CASH",
        transactionRef: p.transactionRef || "",
        paymentDate: p.paymentDate || p.createdAt || "",
        createdAt: p.createdAt || p.paymentDate || "",
        status: p.status || "SUCCESS",
        notes: p.notes || "",
      }));
      setInvoices(mappedInvoices);
      setPayments(mappedPayments);

      // Check URL search parameter for pre-selected invoice
      const targetInvoiceId = searchParams.get("invoiceId");
      if (targetInvoiceId) {
        const found = mappedInvoices.find((i) => String(i.id) === String(targetInvoiceId));
        if (found && found.status !== "PAID") {
          setActiveTab("AWAITING");
          setSelectedInvoiceForPayment(found);
          const due = Math.max(0, found.dueAmount ?? found.grandTotal);
          setPayAmount(String(due));
          setPayRef(`TXN-INV-${found.id}`);
        }
      }
    } catch (err) {
      console.error("Failed to load payment data from backend:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranchId, searchParams]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter invoices into Awaiting (unpaid generated bills) and Settled (paid invoices)
  const awaitingInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = inv.status === "PAID" || (inv.dueAmount !== undefined && inv.dueAmount <= 0 && inv.paidAmount && inv.paidAmount >= inv.grandTotal);
      return !isPaid;
    });
  }, [invoices]);

  const settledInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = inv.status === "PAID" || (inv.dueAmount !== undefined && inv.dueAmount <= 0 && inv.paidAmount && inv.paidAmount >= inv.grandTotal);
      return isPaid;
    });
  }, [invoices]);

  // Apply search filtering (all records visible and searchable)
  const displayedAwaiting = useMemo(() => {
    const q = search.toLowerCase().trim();
    return awaitingInvoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
        (inv.tableNumber && inv.tableNumber.toLowerCase().includes(q)) ||
        (inv.guestName && inv.guestName.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [awaitingInvoices, search]);

  const displayedSettled = useMemo(() => {
    const q = search.toLowerCase().trim();
    return settledInvoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
        (inv.tableNumber && inv.tableNumber.toLowerCase().includes(q)) ||
        (inv.guestName && inv.guestName.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [settledInvoices, search]);

  const displayedPayments = useMemo(() => {
    let list = payments;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        String(p.id).includes(q) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.orderNumber && p.orderNumber.toLowerCase().includes(q)) ||
        (p.kotNumber && p.kotNumber.toLowerCase().includes(q)) ||
        (p.tableNumber && p.tableNumber.toLowerCase().includes(q)) ||
        (p.tableName && p.tableName.toLowerCase().includes(q)) ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.branchName && p.branchName.toLowerCase().includes(q)) ||
        (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q))
      );
    }
    return list;
  }, [payments, search]);

  const [awaitingPage, setAwaitingPage] = useState<number>(1);
  const [paymentPage, setPaymentPage] = useState<number>(1);

  // Reset pagination to first page when search, date, branch or tab changes
  useEffect(() => {
    setAwaitingPage(1);
    setPaymentPage(1);
  }, [search, selectedDate, selectedBranchId, activeTab]);

  const paginatedAwaiting = useMemo(() => {
    const start = (awaitingPage - 1) * 10;
    return displayedAwaiting.slice(start, start + 10);
  }, [displayedAwaiting, awaitingPage]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * 10;
    return displayedPayments.slice(start, start + 10);
  }, [displayedPayments, paymentPage]);

  // Statistics
  const stats = useMemo(() => {
    const totalAwaitingAmount = awaitingInvoices.reduce((sum, i) => sum + (i.dueAmount ?? i.grandTotal), 0);
    const totalSettledAmount = payments.length > 0
      ? payments.reduce((sum, p) => sum + p.amount, 0)
      : settledInvoices.reduce((sum, i) => sum + (i.paidAmount ?? i.grandTotal), 0);
    return {
      awaitingCount: awaitingInvoices.length,
      awaitingAmount: totalAwaitingAmount,
      settledCount: payments.length > 0 ? payments.length : settledInvoices.length,
      settledAmount: totalSettledAmount,
      totalBills: invoices.length,
    };
  }, [invoices, awaitingInvoices, settledInvoices, payments]);

  // Open Payment Modal
  const openPayModal = (inv: LiveInvoice) => {
    if (inv.status === "PAID" || (inv.dueAmount !== undefined && inv.dueAmount <= 0)) {
      dialogService.alert({
        title: t("paymentStatus", "Payment Status"),
        message: t("invoiceAlreadyPaid", "This invoice has already been fully paid. Duplicate payment is not allowed."),
        type: "warning",
      });
      return;
    }
    setSelectedInvoiceForPayment(inv);
    const due = Math.max(0, inv.dueAmount !== undefined ? inv.dueAmount : inv.grandTotal);
    setPayAmount(String(due));
    setPayCashReceived(String(due));
    setPayUpiVerified(false);
    setPayMethod("UPI");
    setPayRef(`TXN-INV-${inv.id}`);
    setPayNotes(`Settlement for Table ${inv.tableNumber || inv.tableId} - ${inv.guestName}`);
  };

  // Submit Payment to Backend & SQL Server
  const handleCompletePayment = async () => {
    if (!selectedInvoiceForPayment) return;
    if (submittingPayment) return;

    if (selectedInvoiceForPayment.status === "PAID" || (selectedInvoiceForPayment.dueAmount !== undefined && selectedInvoiceForPayment.dueAmount <= 0)) {
      dialogService.alert({
        title: t("paymentStatus", "Payment Status"),
        message: t("invoiceAlreadyPaid", "This invoice has already been fully paid. Duplicate payment is not allowed."),
        type: "warning",
      });
      setSelectedInvoiceForPayment(null);
      return;
    }

    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      dialogService.alert({
        title: t("invalidAmount", "Invalid Amount"),
        message: t("validPaymentAmount", "Please enter a valid payment amount."),
        type: "warning",
      });
      return;
    }

    if (payMethod === "CASH") {
      const cashGiven = Number(payCashReceived);
      if (isNaN(cashGiven) || cashGiven < amount) {
        dialogService.alert({
          title: t("insufficientCash", "Insufficient Cash"),
          message: t("cashLessThanDue", "Cash received is less than total amount due."),
          type: "warning",
        });
        return;
      }
    } else if (payMethod === "UPI") {
      if (!payRef.trim()) {
        dialogService.alert({
          title: t("missingUtr", "UTR Reference Required"),
          message: t("enterUpiUtr", "Please enter the 12-digit UPI UTR transaction reference number."),
          type: "warning",
        });
        return;
      }
      if (!payUpiVerified) {
        dialogService.alert({
          title: t("upiVerificationRequired", "Verification Required"),
          message: t("verifyCustomerUpi", "Please verify that the customer has completed UPI payment before proceeding."),
          type: "warning",
        });
        return;
      }
    } else if (payMethod === "CARD") {
      if (!payRef.trim()) {
        dialogService.alert({
          title: t("missingCardAuth", "Card Reference Required"),
          message: t("enterCardTerminalAuth", "Please enter the POS Card Terminal Slip / Auth Reference number."),
          type: "warning",
        });
        return;
      }
    }

    try {
      setSubmittingPayment(true);
      const txnRef = payRef.trim() || `TXN-INV-${selectedInvoiceForPayment.id}`;
      await paymentService.recordPayment({
        invoiceId: selectedInvoiceForPayment.id,
        amount,
        paymentMethod: payMethod,
        transactionRef: txnRef,
        paymentDate: new Date().toISOString().split("T")[0],
        notes: payNotes.trim(),
      });

      // Synchronize table status to AVAILABLE immediately
      if (selectedInvoiceForPayment.tableId) {
        localStorage.setItem(`table_cleaning_start_${selectedInvoiceForPayment.tableId}`, String(Date.now()));
        await tableService.updateTableStatus(selectedInvoiceForPayment.tableId, "CLEANING").catch(() => {});
        window.dispatchEvent(
          new CustomEvent("table-status-changed", {
            detail: { tableId: selectedInvoiceForPayment.tableId, status: "CLEANING" },
          })
        );
      }
      window.dispatchEvent(new CustomEvent("payment-completed"));

      // Set Receipt info and close pay modal
      setPaymentSuccessReceipt({
        invoice: selectedInvoiceForPayment,
        amount,
        method: payMethod,
        txnRef: txnRef,
        date: new Date().toLocaleString("en-IN"),
      });

      // Update local invoice state immediately
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === selectedInvoiceForPayment.id
            ? { ...i, status: "PAID", paidAmount: i.grandTotal, dueAmount: 0 }
            : i
        )
      );

      setSelectedInvoiceForPayment(null);
      await loadData(true);
    } catch (err: any) {
      console.error("Failed to record payment in backend:", err);
      dialogService.alert({
        title: t("paymentFailed", "Payment Failed"),
        message: t("failedCompletePayment", "Failed to complete payment: ") + (err?.response?.data?.message || err.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const formatted = Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `₹${language === "mr" || language === "hi" ? toDevanagari(formatted) : formatted}`;
  };

  const MARATHI_MONTHS = ["जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"];
  const HINDI_MONTHS = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितं", "अक्टू", "नवं", "दिसं"];

  const formatDisplayFilterDate = (isoDate: string) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const mIdx = parseInt(m, 10) - 1;
      if (language === "mr") {
        return `${toDevanagari(d)} ${MARATHI_MONTHS[mIdx] || m} ${toDevanagari(y)}`;
      }
      if (language === "hi") {
        return `${toDevanagari(d)} ${HINDI_MONTHS[mIdx] || m} ${toDevanagari(y)}`;
      }
      const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d} ${monthsEn[mIdx] || m} ${y}`;
    }
    return language === "mr" || language === "hi" ? toDevanagari(isoDate) : isoDate;
  };

  const dateFilterPlaceholder = language === "mr" ? "दि-महिना-वर्ष" : language === "hi" ? "दि-माह-वर्ष" : "dd-mm-yyyy";

  const formatTableDateTime = (dateVal?: string | Date) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, "0");
    const monthIdx = d.getMonth();
    const year = d.getFullYear().toString();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, "0");

    if (language === "mr") {
      return `${toDevanagari(day)} ${MARATHI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
    }
    if (language === "hi") {
      return `${toDevanagari(day)} ${HINDI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
    }
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthsEn[monthIdx]} ${year}, ${hoursStr}:${minutes} ${ampm}`;
  };

  const formatTableDate = (dateVal?: string | Date) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, "0");
    const monthIdx = d.getMonth();
    const year = d.getFullYear().toString();

    if (language === "mr") {
      return `${toDevanagari(day)} ${MARATHI_MONTHS[monthIdx]} ${toDevanagari(year)}`;
    }
    if (language === "hi") {
      return `${toDevanagari(day)} ${HINDI_MONTHS[monthIdx]} ${toDevanagari(year)}`;
    }
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthsEn[monthIdx]} ${year}`;
  };

  const formatTableCol = (tableVal?: string, tableId?: number) => {
    if (!tableVal || tableVal.trim() === "" || tableVal.trim().toLowerCase() === "table" || tableVal.trim().toLowerCase() === "table --" || tableVal.trim() === "-") {
      if (tableId) {
        const idPad = String(tableId).padStart(2, "0");
        return language === "mr" || language === "hi" ? `टेबल ${toDevanagari(idPad)}` : `Table ${idPad}`;
      }
      return language === "mr" || language === "hi" ? "टेबल ०१" : "Table 01";
    }
    const digits = tableVal.replace(/[^0-9]/g, "");
    if (digits) {
      if (language === "mr" || language === "hi") {
        return `टेबल ${toDevanagari(digits.padStart(2, "0"))}`;
      }
      return `Table ${digits.padStart(2, "0")}`;
    }
    let str = tableVal;
    if (language === "mr" || language === "hi") {
      str = str.replace(/table\s*/gi, "टेबल ");
      return toDevanagari(str);
    }
    return str.replace(/टेबल\s*/g, "Table ");
  };

  const formatTxnRef = (ref?: string) => {
    if (!ref || ref === "-") return "-";
    return language === "mr" || language === "hi" ? toDevanagari(ref) : ref;
  };

  const formatPaymentMethod = (method?: string) => {
    const m = (method || "UPI").toUpperCase();
    if (m === "CASH") {
      if (language === "mr") return "रोख (Cash)";
      if (language === "hi") return "नकद (Cash)";
      return "Cash";
    }
    if (m === "UPI") {
      if (language === "mr") return "युपीआय (UPI)";
      if (language === "hi") return "यूपीआई (UPI)";
      return "UPI";
    }
    if (m === "CARD") {
      if (language === "mr") return "कार्ड (Card)";
      if (language === "hi") return "कार्ड (Card)";
      return "Card";
    }
    return translateStatus(m);
  };

  const formatOrderCol = (orderNum?: string, orderId?: number | string) => {
    if (orderNum) {
      return language === "mr" || language === "hi" ? toDevanagari(orderNum) : orderNum;
    }
    if (orderId) {
      const raw = `ORD-${orderId}`;
      return language === "mr" || language === "hi" ? toDevanagari(raw) : raw;
    }
    return "-";
  };

  const handleViewInvoice = (pay: LivePayment) => {
    const found = invoices.find(
      (inv) =>
        Number(inv.id) === Number(pay.invoiceId) ||
        (pay.invoiceNumber && inv.invoiceNumber === pay.invoiceNumber) ||
        (pay.orderId && Number(inv.orderId) === Number(pay.orderId))
    );
    if (found) {
      setViewDetailsInvoice(found);
    } else {
      setViewDetailsInvoice({
        id: pay.invoiceId || pay.id,
        invoiceNumber: pay.invoiceNumber || `INV-${pay.invoiceId || pay.id}`,
        orderId: pay.orderId,
        orderNumber: pay.orderNumber,
        tableId: pay.tableId,
        tableNumber: pay.tableNumber || pay.tableName,
        customerName: pay.customerName,
        guestName: pay.customerName,
        grandTotal: pay.amount,
        paidAmount: pay.amount,
        dueAmount: 0,
        status: "PAID",
        paymentMethod: pay.paymentMethod,
        createdAt: pay.paymentDate || pay.createdAt,
        items: [],
      });
    }
  };


  const mapLiveInvoiceToUniversalPrintData = (inv: LiveInvoice): UniversalInvoicePrintData => {
    const hotelName = localStorage.getItem("billing_hotel_name") || "AJALKAR HOTEL & RESTAURANT";
    const hotelAddress = localStorage.getItem("billing_address") || "Hotel Premises, Pune, Maharashtra - 411004";
    const hotelPhone = localStorage.getItem("billing_phone") || "+91 98765 43210";
    const gstin = localStorage.getItem("billing_gstin") || "27AAKCA1234F1Z5";

    const totalTax = Number(inv.taxAmount || 0);
    const subtotal = Number(inv.subtotal || inv.taxableAmount || (inv.grandTotal - totalTax));

    return {
      invoiceNumber: inv.invoiceNumber || String(inv.id),
      invoiceDate: inv.invoiceDate || new Date().toISOString().split('T')[0],
      hotelName,
      hotelAddress,
      hotelPhone,
      gstin,
      customerName: inv.customerName || inv.guestName || "Walk-in Guest",
      customerPhone: inv.customerMobile || inv.phone || inv.customerPhone || "",
      tableName: inv.tableName || inv.tableNumber || "Table",
      orderNumber: inv.orderNumber || (inv.orderId ? `ORD-${inv.orderId}` : inv.kotNumber || ""),
      items: (inv.items || []).map((it, idx) => ({
        id: it.id || idx,
        name: it.itemName || it.description || it.name || `Item ${idx + 1}`,
        quantity: Number(it.quantity || it.qty || 1),
        unitPrice: Number(it.price || it.unitPrice || 0),
        totalPrice: Number(it.totalPrice || ((it.quantity || 1) * (it.price || 0))),
      })),
      subtotal,
      discountAmount: Number(inv.discountAmount || 0),
      taxableAmount: Number(inv.taxableAmount || subtotal),
      cgstRate: Number(inv.cgstRate || 2.5),
      cgstAmount: Number(inv.cgst || totalTax / 2),
      sgstRate: Number(inv.sgstRate || 2.5),
      sgstAmount: Number(inv.sgst || totalTax / 2),
      igstRate: Number(inv.igstRate || 0),
      igstAmount: Number(inv.igst || 0),
      totalTax,
      grandTotal: Number(inv.grandTotal || 0),
      paymentMethod: inv.paymentMethod || "CASH",
      paymentStatus: inv.status || "PAID",
      paidAmount: Number(inv.paidAmount ?? inv.grandTotal),
      outstandingAmount: Number(inv.dueAmount || 0),
      footerMessage: "Thank you for dining with us! Please visit again.",
    };
  };

  const handlePrintInvoice = useCallback((inv: LiveInvoice) => {
    if (!inv) return;
    const printData = mapLiveInvoiceToUniversalPrintData(inv);
    setPrintModalData(printData);
    setIsPrintModalOpen(true);
    return;
    const printWindow = window.open("", "_blank", "width=450,height=700");
    if (!printWindow) {
      window.alert("Please allow pop-ups for this site, then click Print Receipt again.");
      return;
    }

    const hotelName = localStorage.getItem("billing_hotel_name") || "Hotel Management POS";
    const hotelLogo = localStorage.getItem("billing_logo") || localStorage.getItem("business_logo") || "";
    const hotelAddress = localStorage.getItem("billing_address") || "";
    const hotelPhone = localStorage.getItem("billing_phone") || "";
    const gstin = localStorage.getItem("billing_gstin") || "";
    const currentLang: SupportedLang = (language as SupportedLang) || (localStorage.getItem("ajalkar_language") as SupportedLang) || "en";
    const isMr = currentLang === "mr";
    const isHi = currentLang === "hi";
    const isIndic = isMr || isHi;

    const footerMsg = localStorage.getItem("billing_footer") || (
      isMr ? "आमच्या हॉटेला भेट दिल्याबद्दल धन्यवाद! पुन्हा या!" :
      isHi ? "हमारे होटल में आने के लिए धन्यवाद! फिर पधारें!" :
      "Thank you for dining with us! Please visit again."
    );

    const isInter = Boolean(inv.isInterstate || (inv.igst && Number(inv.igst) > 0));
    const totalTax = Number(inv.taxAmount || 0);
    const cgstVal = inv.cgst !== undefined ? Number(inv.cgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
    const sgstVal = inv.sgst !== undefined ? Number(inv.sgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
    const igstVal = inv.igst !== undefined ? Number(inv.igst) : (isInter && totalTax > 0 ? totalTax : 0);
    const cgstRate = inv.cgstRate ?? 2.5;
    const sgstRate = inv.sgstRate ?? 2.5;
    const igstRate = inv.igstRate ?? 5;

    const formatMoney = (n: number) => {
      const formatted = Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return isIndic ? toDevanagari(formatted) : formatted;
    };

    const itemsRows = (inv.items && inv.items.length > 0)
      ? inv.items.map((it: any) => {
          const rawName = it.description || it.itemName || it.name || "Item";
          const localizedName = getLocalizedMenuItemName(rawName, currentLang);
          const qty = Number(it.quantity || it.qty || 1);
          const price = Number(it.unitPrice || it.price || 0);
          const total = qty * price;
          return `
            <tr>
              <td class="col-desc">${localizedName}</td>
              <td class="col-qty">${isIndic ? toDevanagari(qty) : qty}</td>
              <td class="col-rate">&#8377;${formatMoney(price)}</td>
              <td class="col-amt">&#8377;${formatMoney(total)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="4" style="text-align:center; padding: 6px; font-size: 9px; color: #666;">Synchronized with order record</td></tr>`;

    const subtotalVal = (Number(inv.subtotal) || Number(inv.grandTotal) || 0);
    const discountVal = Number(inv.discountAmount || 0);
    const taxableVal = Math.max(0, subtotalVal - discountVal);
    const grandTotalVal = Number(inv.grandTotal || 0);
    const paidVal = Number(inv.paidAmount || inv.grandTotal || 0);
    const dueVal = Number(inv.dueAmount || 0);
    const changeVal = Number(inv.paidAmount || 0) > Number(inv.grandTotal || 0)
      ? (Number(inv.paidAmount) - Number(inv.grandTotal))
      : null;

    const MARATHI_MONTHS = ["जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"];
    const HINDI_MONTHS = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितं", "अक्टू", "नवं", "दिसं"];

    const formatDateVal = (dateVal?: string | Date) => {
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return "-";
      const day = d.getDate().toString().padStart(2, "0");
      const monthIdx = d.getMonth();
      const year = d.getFullYear().toString();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours.toString().padStart(2, "0");

      if (isMr) {
        return `${toDevanagari(day)} ${MARATHI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
      } else if (isHi) {
        return `${toDevanagari(day)} ${HINDI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
      }
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const dateStr = formatDateVal(inv.createdAt || inv.invoiceDate);
    const customerDisplayName = inv.guestName || inv.customerName
      ? localizeGuestName(inv.guestName || inv.customerName, currentLang)
      : (isMr ? "अतिथी" : isHi ? "अतिथि" : "Walk-in Guest");

    const tableDisplayName = inv.tableNumber
      ? (isIndic ? `टेबल ${toDevanagari(inv.tableNumber.replace(/[^0-9]/g, '')) || inv.tableNumber}` : inv.tableNumber)
      : "-";

    const titleText = isMr ? "कर पावती (TAX INVOICE)" : isHi ? "कर रसीद (TAX INVOICE)" : "TAX INVOICE RECEIPT";
    const invoiceNoLabel = isMr ? "इनव्हॉइस क्र." : isHi ? "इनवॉइस नं." : "Invoice No";
    const dateLabel = isMr ? "तारीख आणि वेळ" : isHi ? "दिनांक एवं समय" : "Date & Time";
    const tableLabel = isMr ? "टेबल" : isHi ? "टेबल" : "Table";
    const customerLabel = isMr ? "ग्राहक / अतिथी" : isHi ? "ग्राहक / अतिथि" : "Customer";
    const kotLabel = isMr ? "ऑर्डर / केओटी" : isHi ? "ऑर्डर / केओटी" : "Order / KOT";
    const statusLabel = isMr ? "स्थिती" : isHi ? "स्थिति" : "Status";
    const itemDescLabel = isMr ? "पदार्थाचे नाव/तपशील" : isHi ? "व्यंजन / विवरण" : "Item Description";
    const qtyLabel = isMr ? "प्रमाण" : isHi ? "मात्रा" : "Qty";
    const rateLabel = isMr ? "दर" : isHi ? "दर" : "Rate";
    const amtLabel = isMr ? "रक्कम" : isHi ? "राशि" : "Amount";
    const subtotalLabel = isMr ? "पदार्थ उप-एकूण" : isHi ? "उप-कुल" : "Item Subtotal";
    const discountLabel = isMr ? "सवलत" : isHi ? "छूट" : "Discount";
    const taxableLabel = isMr ? "करपात्र रक्कम" : isHi ? "कर योग्य राशि" : "Taxable Amount";
    const grandTotalLabel = isMr ? "एकूण रक्कम" : isHi ? "कुल राशि" : "Grand Total";
    const paidLabel = isMr ? "भरलेली रक्कम" : isHi ? "प्राप्त राशि" : "Amount Paid";
    const methodLabel = isMr ? "पेमेंट पद्धत" : isHi ? "भुगतान विधि" : "Payment Method";
    const paymentStatusLabel = isMr ? "पेमेंट स्थिती" : isHi ? "भुगतान स्थिति" : "Payment Status";
    const balanceDueLabel = isMr ? "बाकी रक्कम" : isHi ? "बकाया राशि" : "Balance Due";
    const changeLabel = isMr ? "परत केलेली रक्कम" : isHi ? "वापस राशि" : "Change Returned";

    const isPaid = String(inv.status).toLowerCase() === "paid";
    const statusText = isPaid ? (isMr ? "देयके पूर्ण (PAID)" : isHi ? "सफल (PAID)" : "PAID") : (isMr ? "अभरित (UNPAID)" : isHi ? "बकाया (UNPAID)" : "UNPAID");

    const logoHtml = hotelLogo
      ? `<div class="simple-business-logo"><img src="${hotelLogo}" alt="Logo" /></div>`
      : "";

    const receiptHtml = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
  <meta charset="UTF-8" />
  <title>${inv.invoiceNumber} - Receipt</title>
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
      .receipt-container {
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
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nirmala UI", Arial, sans-serif !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow: visible !important;
    }

    body {
      display: block !important;
      margin: 0 auto !important;
    }

    .receipt-container {
      width: 76mm !important;
      max-width: 76mm !important;
      margin: 0 auto !important;
      padding: 2mm 1mm 2mm !important;
      background: #FFFFFF !important;
      box-sizing: border-box !important;
      text-align: left !important;
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
  <div class="receipt-container">
    ${logoHtml}
    <div class="simple-business-name">${hotelName}</div>
    ${hotelAddress ? `<div class="simple-business-sub">${hotelAddress}</div>` : ""}
    ${(hotelPhone || gstin) ? `<div class="simple-business-sub">${hotelPhone ? `Phone: ${hotelPhone}` : ""}${hotelPhone && gstin ? " | " : ""}${gstin ? `GSTIN: ${gstin}` : ""}</div>` : ""}
    <div class="simple-title">${titleText}</div>
    <div class="simple-rule"></div>

    <div class="simple-details">
      <div class="simple-details-row full-width">
        <span class="detail-label">${invoiceNoLabel}:</span>
        <strong class="detail-value text-right">${isIndic ? toDevanagari(inv.invoiceNumber) : inv.invoiceNumber}</strong>
      </div>
      <div class="simple-details-row full-width">
        <span class="detail-label">${dateLabel}:</span>
        <strong class="detail-value text-right">${dateStr}</strong>
      </div>
      <div class="simple-details-row">
        <div class="detail-half">
          <span class="detail-label">${tableLabel}:</span>
          <strong class="detail-value">${tableDisplayName}</strong>
        </div>
        <div class="detail-half right">
          <span class="detail-label">${customerLabel}:</span>
          <strong class="detail-value">${customerDisplayName}</strong>
        </div>
      </div>
      <div class="simple-details-row">
        <div class="detail-half">
          <span class="detail-label">${kotLabel}:</span>
          <strong class="detail-value">${isIndic ? toDevanagari(inv.orderNumber || inv.kotNumber || "-") : (inv.orderNumber || inv.kotNumber || "-")}</strong>
        </div>
        <div class="detail-half right">
          <span class="detail-label">${statusLabel}:</span>
          <strong class="detail-value ${isPaid ? 'status-paid' : 'status-pending'}">${statusText}</strong>
        </div>
      </div>
    </div>

    <table class="simple-table">
      <thead>
        <tr>
          <th class="col-desc">${itemDescLabel}</th>
          <th class="col-qty">${qtyLabel}</th>
          <th class="col-rate">${rateLabel}</th>
          <th class="col-amt">${amtLabel}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="simple-totals">
      <div class="totals-row">
        <span>${subtotalLabel}</span>
        <strong class="tab-num">&#8377;${formatMoney(subtotalVal)}</strong>
      </div>
      ${discountVal > 0 ? `
        <div class="totals-row">
          <span>${discountLabel}:</span>
          <strong class="tab-num">- &#8377;${formatMoney(discountVal)}</strong>
        </div>
        <div class="totals-row">
          <span>${taxableLabel}</span>
          <strong class="tab-num">&#8377;${formatMoney(taxableVal)}</strong>
        </div>
      ` : ""}
      ${totalTax > 0 ? (
        isInter ? `
          <div class="totals-row">
            <span>IGST (${isIndic ? toDevanagari(igstRate) : igstRate}%):</span>
            <strong class="tab-num">+ &#8377;${formatMoney(igstVal)}</strong>
          </div>
        ` : `
          <div class="totals-row">
            <span>CGST (${isIndic ? toDevanagari(cgstRate) : cgstRate}%):</span>
            <strong class="tab-num">+ &#8377;${formatMoney(cgstVal)}</strong>
          </div>
          <div class="totals-row">
            <span>SGST (${isIndic ? toDevanagari(sgstRate) : sgstRate}%):</span>
            <strong class="tab-num">+ &#8377;${formatMoney(sgstVal)}</strong>
          </div>
        `
      ) : ""}
      <div class="simple-grand">
        <span>${grandTotalLabel}</span>
        <strong class="tab-num">&#8377;${formatMoney(grandTotalVal)}</strong>
      </div>
      <div class="totals-row">
        <span>${paidLabel}</span>
        <strong class="tab-num">&#8377;${formatMoney(paidVal)}</strong>
      </div>
      <div class="totals-row">
        <span>${methodLabel}</span>
        <strong class="text-uppercase">${(inv.paymentMethod || "CASH").replace("_", " ")}</strong>
      </div>
      <div class="totals-row">
        <span>${paymentStatusLabel}</span>
        <strong class="text-uppercase ${isPaid ? 'status-paid' : 'status-pending'}">${statusText}</strong>
      </div>
      ${dueVal > 0 ? `
        <div class="totals-row balance-due">
          <span>${balanceDueLabel}:</span>
          <strong class="tab-num">&#8377;${formatMoney(dueVal)}</strong>
        </div>
      ` : ""}
      ${changeVal ? `
        <div class="totals-row change-returned">
          <span>${changeLabel}:</span>
          <strong class="tab-num">&#8377;${formatMoney(changeVal)}</strong>
        </div>
      ` : ""}
    </div>

    <div class="simple-footer">
      ${footerMsg}
    </div>
  </div>
  <script>
    window.onload = function () {
      try {
        var el = document.querySelector(".receipt-container") || document.body;
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
</html>`;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  }, [language, toDevanagari]);

  const handleShareWhatsApp = useCallback(async (inv: LiveInvoice) => {
    if (!inv) return;

    const hotelName = localStorage.getItem("billing_hotel_name") || "Hotel Management POS";
    const hotelLogo = localStorage.getItem("billing_logo") || localStorage.getItem("business_logo") || "";
    const hotelAddress = localStorage.getItem("billing_address") || "";
    const hotelPhone = localStorage.getItem("billing_phone") || "";
    const gstin = localStorage.getItem("billing_gstin") || "";
    const currentLang: SupportedLang = (language as SupportedLang) || (localStorage.getItem("ajalkar_language") as SupportedLang) || "en";
    const isMr = currentLang === "mr";
    const isHi = currentLang === "hi";
    const isIndic = isMr || isHi;

    const footerMsg = localStorage.getItem("billing_footer") || (
      isMr ? "आमच्या हॉटेला भेट दिल्याबद्दल धन्यवाद! पुन्हा या!" :
      isHi ? "हमारे होटल में आने के लिए धन्यवाद! फिर पधारें!" :
      "Thank you for dining with us! Please visit again."
    );

    const isInter = Boolean(inv.isInterstate || (inv.igst && Number(inv.igst) > 0));
    const totalTax = Number(inv.taxAmount || 0);
    const cgstVal = inv.cgst !== undefined ? Number(inv.cgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
    const sgstVal = inv.sgst !== undefined ? Number(inv.sgst) : (!isInter && totalTax > 0 ? totalTax / 2 : 0);
    const igstVal = inv.igst !== undefined ? Number(inv.igst) : (isInter && totalTax > 0 ? totalTax : 0);
    const cgstRate = inv.cgstRate ?? 2.5;
    const sgstRate = inv.sgstRate ?? 2.5;
    const igstRate = inv.igstRate ?? 5;

    const formatMoney = (n: number) => {
      const formatted = Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return isIndic ? toDevanagari(formatted) : formatted;
    };

    const itemsRows = (inv.items && inv.items.length > 0)
      ? inv.items.map((it: any) => {
          const rawName = it.description || it.itemName || it.name || "Item";
          const localizedName = getLocalizedMenuItemName(rawName, currentLang);
          const qty = Number(it.quantity || it.qty || 1);
          const price = Number(it.unitPrice || it.price || 0);
          const total = qty * price;
          return `
            <tr>
              <td style="width:44%; text-align:left; word-break:break-word; font-weight:600; padding:3px 1px; font-size:9.5px; border-bottom:0.5px dotted #e0e0e0;">${localizedName}</td>
              <td style="width:14%; text-align:center; white-space:nowrap; padding:3px 1px; font-size:9.5px; border-bottom:0.5px dotted #e0e0e0;">${isIndic ? toDevanagari(qty) : qty}</td>
              <td style="width:20%; text-align:right; white-space:nowrap; padding:3px 1px; font-size:9.5px; border-bottom:0.5px dotted #e0e0e0;">&#8377;${formatMoney(price)}</td>
              <td style="width:22%; text-align:right; font-weight:700; white-space:nowrap; padding:3px 1px; font-size:9.5px; border-bottom:0.5px dotted #e0e0e0;">&#8377;${formatMoney(total)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="4" style="text-align:center; padding: 6px; font-size: 9px; color: #666;">Synchronized with order record</td></tr>`;

    const subtotalVal = (Number(inv.subtotal) || Number(inv.grandTotal) || 0);
    const discountVal = Number(inv.discountAmount || 0);
    const taxableVal = Math.max(0, subtotalVal - discountVal);
    const grandTotalVal = Number(inv.grandTotal || 0);
    const paidVal = Number(inv.paidAmount || inv.grandTotal || 0);
    const dueVal = Number(inv.dueAmount || 0);
    const changeVal = Number(inv.paidAmount || 0) > Number(inv.grandTotal || 0)
      ? (Number(inv.paidAmount) - Number(inv.grandTotal))
      : null;

    const MARATHI_MONTHS = ["जाने", "फेब्रु", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"];
    const HINDI_MONTHS = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितं", "अक्टू", "नवं", "दिसं"];

    const formatDateVal = (dateVal?: string | Date) => {
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return "-";
      const day = d.getDate().toString().padStart(2, "0");
      const monthIdx = d.getMonth();
      const year = d.getFullYear().toString();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours.toString().padStart(2, "0");

      if (isMr) {
        return `${toDevanagari(day)} ${MARATHI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
      } else if (isHi) {
        return `${toDevanagari(day)} ${HINDI_MONTHS[monthIdx]} ${toDevanagari(year)}, ${toDevanagari(hoursStr)}:${toDevanagari(minutes)} ${ampm}`;
      }
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const dateStr = formatDateVal(inv.createdAt || inv.invoiceDate);
    const customerDisplayName = inv.guestName || inv.customerName
      ? localizeGuestName(inv.guestName || inv.customerName, currentLang)
      : (isMr ? "अतिथी" : isHi ? "अतिथि" : "Walk-in Guest");

    const tableDisplayName = inv.tableNumber
      ? (isIndic ? `टेबल ${toDevanagari(inv.tableNumber.replace(/[^0-9]/g, '')) || inv.tableNumber}` : inv.tableNumber)
      : "-";

    const titleText = isMr ? "कर पावती (TAX INVOICE)" : isHi ? "कर रसीद (TAX INVOICE)" : "TAX INVOICE RECEIPT";
    const invoiceNoLabel = isMr ? "इनव्हॉइस क्र." : isHi ? "इनवॉइस नं." : "Invoice No";
    const dateLabel = isMr ? "तारीख आणि वेळ" : isHi ? "दिनांक एवं समय" : "Date & Time";
    const tableLabel = isMr ? "टेबल" : isHi ? "टेबल" : "Table";
    const customerLabel = isMr ? "ग्राहक / अतिथी" : isHi ? "ग्राहक / अतिथि" : "Customer";
    const kotLabel = isMr ? "ऑर्डर / केओटी" : isHi ? "ऑर्डर / केओटी" : "Order / KOT";
    const statusLabel = isMr ? "स्थिती" : isHi ? "स्थिति" : "Status";
    const itemDescLabel = isMr ? "पदार्थाचे नाव/तपशील" : isHi ? "व्यंजन / विवरण" : "Item Description";
    const qtyLabel = isMr ? "प्रमाण" : isHi ? "मात्रा" : "Qty";
    const rateLabel = isMr ? "दर" : isHi ? "दर" : "Rate";
    const amtLabel = isMr ? "रक्कम" : isHi ? "राशि" : "Amount";
    const subtotalLabel = isMr ? "पदार्थ उप-एकूण" : isHi ? "उप-कुल" : "Item Subtotal";
    const discountLabel = isMr ? "सवलत" : isHi ? "छूट" : "Discount";
    const taxableLabel = isMr ? "करपात्र रक्कम" : isHi ? "कर योग्य राशि" : "Taxable Amount";
    const grandTotalLabel = isMr ? "एकूण रक्कम" : isHi ? "कुल राशि" : "Grand Total";
    const paidLabel = isMr ? "भरलेली रक्कम" : isHi ? "प्राप्त राशि" : "Amount Paid";
    const methodLabel = isMr ? "पेमेंट पद्धत" : isHi ? "भुगतान विधि" : "Payment Method";
    const paymentStatusLabel = isMr ? "पेमेंट स्थिती" : isHi ? "भुगतान स्थिति" : "Payment Status";
    const balanceDueLabel = isMr ? "बाकी रक्कम" : isHi ? "बकाया राशि" : "Balance Due";
    const changeLabel = isMr ? "परत केलेली रक्कम" : isHi ? "वापस राशि" : "Change Returned";

    const isPaid = String(inv.status).toLowerCase() === "paid";
    const statusText = isPaid ? (isMr ? "देयके पूर्ण (PAID)" : isHi ? "सफल (PAID)" : "PAID") : (isMr ? "अभरित (UNPAID)" : isHi ? "बकाया (UNPAID)" : "UNPAID");

    const logoHtml = hotelLogo
      ? `<div style="text-align:center;margin-bottom:4px;"><img src="${hotelLogo}" alt="Logo" style="max-height:48px;max-width:140px;object-fit:contain;display:inline-block;" /></div>`
      : "";

    const containerHtml = `
      <div style="width:76mm;max-width:76mm;margin:0 auto;padding:2mm 1mm;background:#fff;color:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;line-height:1.3;box-sizing:border-box;">
        ${logoHtml}
        <div style="text-align:center;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">${hotelName}</div>
        ${hotelAddress ? `<div style="text-align:center;font-size:9px;color:#222;margin:1px 0;">${hotelAddress}</div>` : ""}
        ${(hotelPhone || gstin) ? `<div style="text-align:center;font-size:9px;color:#222;margin:1px 0;">${hotelPhone ? `Phone: ${hotelPhone}` : ""}${hotelPhone && gstin ? " | " : ""}${gstin ? `GSTIN: ${gstin}` : ""}</div>` : ""}
        <div style="text-align:center;font-size:10.5px;font-weight:800;letter-spacing:1px;margin:4px 0 2px 0;text-transform:uppercase;">${titleText}</div>
        <div style="border-top:1px dashed #000;margin:4px 0;"></div>

        <div style="display:flex;flex-direction:column;gap:2.5px;margin:3px 0 5px 0;background:#fafafa;padding:4px 5px;border-radius:4px;border:1px dashed #666;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;width:100%;font-size:9px;">
            <span style="color:#333;font-weight:600;">${invoiceNoLabel}:</span>
            <strong style="text-align:right;">${isIndic ? toDevanagari(inv.invoiceNumber) : inv.invoiceNumber}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:9px;">
            <span style="color:#333;font-weight:600;">${dateLabel}:</span>
            <strong style="text-align:right;">${dateStr}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:9px;">
            <div style="display:flex;gap:3px;align-items:baseline;">
              <span style="color:#333;font-weight:600;">${tableLabel}:</span>
              <strong>${tableDisplayName}</strong>
            </div>
            <div style="display:flex;gap:3px;align-items:baseline;justify-content:flex-end;">
              <span style="color:#333;font-weight:600;">${customerLabel}:</span>
              <strong>${customerDisplayName}</strong>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:9px;">
            <div style="display:flex;gap:3px;align-items:baseline;">
              <span style="color:#333;font-weight:600;">${kotLabel}:</span>
              <strong>${isIndic ? toDevanagari(inv.kotNumber || inv.orderNumber || "-") : (inv.kotNumber || inv.orderNumber || "-")}</strong>
            </div>
            <div style="display:flex;gap:3px;align-items:baseline;justify-content:flex-end;">
              <span style="color:#333;font-weight:600;">${statusLabel}:</span>
              <strong style="color:${isPaid ? '#047857' : '#b45309'};font-weight:800;">${statusText}</strong>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:4px 0;table-layout:fixed;">
          <thead>
            <tr>
              <th style="border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:800;padding:3px 1px;text-align:left;font-size:9px;color:#000;width:44%;">${itemDescLabel}</th>
              <th style="border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:800;padding:3px 1px;text-align:center;font-size:9px;color:#000;width:14%;">${qtyLabel}</th>
              <th style="border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:800;padding:3px 1px;text-align:right;font-size:9px;color:#000;width:20%;">${rateLabel}</th>
              <th style="border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:800;padding:3px 1px;text-align:right;font-size:9px;color:#000;width:22%;">${amtLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;border-top:1px dashed #000;padding-top:4px;">
          <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
            <span>${subtotalLabel}:</span>
            <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(subtotalVal)}</strong>
          </div>
          ${discountVal > 0 ? `
            <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
              <span>${discountLabel}:</span>
              <strong style="font-variant-numeric:tabular-nums;">- &#8377;${formatMoney(discountVal)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
              <span>${taxableLabel}:</span>
              <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(taxableVal)}</strong>
            </div>
          ` : ""}
          ${totalTax > 0 ? (
            isInter ? `
              <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
                <span>IGST (${isIndic ? toDevanagari(igstRate) : igstRate}%):</span>
                <strong style="font-variant-numeric:tabular-nums;">+ &#8377;${formatMoney(igstVal)}</strong>
              </div>
            ` : `
              <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
                <span>CGST (${isIndic ? toDevanagari(cgstRate) : cgstRate}%):</span>
                <strong style="font-variant-numeric:tabular-nums;">+ &#8377;${formatMoney(cgstVal)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
                <span>SGST (${isIndic ? toDevanagari(sgstRate) : sgstRate}%):</span>
                <strong style="font-variant-numeric:tabular-nums;">+ &#8377;${formatMoney(sgstVal)}</strong>
              </div>
            `
          ) : ""}

          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:4px 0;margin:4px 0;color:#000;">
            <span>${grandTotalLabel}:</span>
            <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(grandTotalVal)}</strong>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
            <span>${paidLabel}:</span>
            <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(paidVal)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
            <span>${methodLabel}:</span>
            <strong style="text-transform:uppercase;">${(inv.paymentMethod || "CASH").replace("_", " ")}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#222;">
            <span>${paymentStatusLabel}:</span>
            <strong style="text-transform:uppercase;color:${isPaid ? '#047857' : '#b45309'};font-weight:800;">${statusText}</strong>
          </div>
          ${dueVal > 0 ? `
            <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#b91c1c;font-weight:700;">
              <span>${balanceDueLabel}:</span>
              <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(dueVal)}</strong>
            </div>
          ` : ""}
          ${changeVal ? `
            <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#047857;font-weight:700;">
              <span>${changeLabel}:</span>
              <strong style="font-variant-numeric:tabular-nums;">&#8377;${formatMoney(changeVal)}</strong>
            </div>
          ` : ""}
        </div>

        <div style="text-align:center;margin-top:6px;padding-top:4px;border-top:1px dashed #000;font-size:9px;color:#222;line-height:1.3;">
          ${footerMsg}
        </div>
      </div>
    `;

    try {
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "80mm";
      tempContainer.style.background = "#ffffff";
      tempContainer.innerHTML = containerHtml;
      document.body.appendChild(tempContainer);

      const targetEl = (tempContainer.firstElementChild as HTMLElement) || tempContainer;
      const hPx = targetEl.scrollHeight || targetEl.offsetHeight;
      const hMm = Math.max(70, Math.ceil((hPx * 25.4) / 96) + 4);

      const opt = {
        margin: 0,
        filename: `${inv.invoiceNumber}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#FFFFFF" },
        jsPDF: { unit: "mm", format: [80, hMm] as [number, number], orientation: "portrait" as const }
      };

      const worker = html2pdf().set(opt).from(targetEl);

      let pdfBlob: Blob | null = null;
      let pdfFile: File | null = null;
      try {
        pdfBlob = await worker.outputPdf("blob");
        if (pdfBlob) {
          pdfFile = new File([pdfBlob], `${inv.invoiceNumber}.pdf`, { type: "application/pdf" });
        }
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }

      const activeHotelName = hotelName || "Hotel Management";
      const activePhone = hotelPhone || "";
      const targetPhone = ((inv.customerMobile || (inv as any).phone || (inv as any).customerPhone || "")).replace(/[^0-9]/g, "");

      const defaultMsg = [
        "Thank you for visiting us. Please visit again!",
        "",
        `*${activeHotelName}*`,
        activePhone ? `${activePhone}` : null
      ].filter(Boolean).join("\n");

      // 1. Mobile native share if supported
      if (pdfFile && typeof navigator !== "undefined" && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: `${inv.invoiceNumber} - Receipt`,
              text: defaultMsg
            });
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") return;
          console.warn("Native share fallback to download + wa.me:", shareErr);
        }
      }

      // 2. Desktop fallback (Save PDF and open WhatsApp Web)
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${inv.invoiceNumber}.pdf`;
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
        message: `बिल पावती PDF (${inv.invoiceNumber}.pdf) डाऊनलोड झाली आहे आणि WhatsApp उघडले आहे! कृपया डाऊनलोड झालेली PDF फाईल WhatsApp चॅटमध्ये पाठवा.`,
        type: "success"
      });
    } catch (e) {
      console.error(e);
      dialogService.alert({
        title: "Share Failed",
        message: "Unable to share bill on WhatsApp.",
        type: "error"
      });
    }
  }, [language, toDevanagari]);

  return (
    <div
      style={{
        padding: "6px 0 24px",
        background: COLORS.background,
        minHeight: "100%",
        fontFamily: "Segoe UI, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: COLORS.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(139, 62, 22, 0.25)",
            }}
          >
            <CreditCard size={25} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "26px",
                  fontWeight: 800,
                  color: COLORS.text,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("paymentHistory", "Payment History")}
              </h1>
              <span
                style={{
                  backgroundColor: "#E5DCD5",
                  color: COLORS.accent,
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "12px",
                }}
              >
                {selectedBranch?.name || t("mainBranch", "Main Branch")}
              </span>
            </div>

            <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: "14px" }}>
              {t("paymentHistoryDesc", "Completed payment records and transaction history synchronized with SQL Server")}
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => loadData()}
            disabled={loading || refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 14px",
              background: "#FFFFFF",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              color: COLORS.text,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            <span>{t("refresh", "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          SUMMARY METRIC CARDS
      ========================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Total Collections */}
        <div
          style={{
            background: "#FFFFFF",
            border: `1.5px solid ${COLORS.success}`,
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.success, textTransform: "uppercase" }}>
              {t("totalCollections", "Total Collections")}
            </span>
            <CheckCircle2 size={18} color={COLORS.success} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.text, marginTop: "8px" }}>
            {formatCurrency(stats.settledAmount)}
          </div>
          <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "4px" }}>
            {language === "mr" || language === "hi" ? toDevanagari(stats.settledCount) : stats.settledCount} {t("completedTransactions", "completed payment transactions")}
          </div>
        </div>

        {/* Completed Transactions Count */}
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.accent, textTransform: "uppercase" }}>
              {t("completedTransactions", "Completed Transactions")}
            </span>
            <CreditCard size={18} color={COLORS.accent} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.text, marginTop: "8px" }}>
            {language === "mr" || language === "hi" ? toDevanagari(stats.settledCount) : stats.settledCount} {t("payments", "Payments")}
          </div>
          <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "4px" }}>
            {t("recordedInDb", "Recorded in SQL Server database")}
          </div>
        </div>

        {/* Total Generated Invoices */}
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>
              {t("totalInvoices", "Total Invoices")}
            </span>
            <ReceiptIndianRupee size={18} color={COLORS.muted} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.text, marginTop: "8px" }}>
            {language === "mr" || language === "hi" ? toDevanagari(stats.totalBills) : stats.totalBills} {t("bills", "Bills")}
          </div>
          <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "4px" }}>
            {t("generatedFromBilling", "Generated from Hotel Billing Module")}
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB NAVIGATION: COMPLETED PAYMENTS vs AWAITING BILLS
      ========================================================= */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: `1px solid ${COLORS.border}`,
          paddingBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("SETTLED")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: activeTab === "SETTLED" ? "none" : `1px solid ${COLORS.border}`,
            background: activeTab === "SETTLED" ? COLORS.accent : "#FFFFFF",
            color: activeTab === "SETTLED" ? "#FFFFFF" : COLORS.text,
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "SETTLED" ? "0 2px 6px rgba(139, 62, 22, 0.25)" : "none",
          }}
        >
          <CreditCard size={16} />
          <span>{t("completedPayments", "Completed Payments")}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "10px",
              background: activeTab === "SETTLED" ? "rgba(255,255,255,0.25)" : "#F5EFE9",
              color: activeTab === "SETTLED" ? "#FFFFFF" : COLORS.accent,
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            {language === "mr" || language === "hi" ? toDevanagari(displayedPayments.length) : displayedPayments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("AWAITING")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            border: activeTab === "AWAITING" ? "none" : `1px solid ${COLORS.border}`,
            background: activeTab === "AWAITING" ? COLORS.accent : "#FFFFFF",
            color: activeTab === "AWAITING" ? "#FFFFFF" : COLORS.text,
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: activeTab === "AWAITING" ? "0 2px 6px rgba(139, 62, 22, 0.25)" : "none",
          }}
        >
          <ReceiptIndianRupee size={16} />
          <span>{t("billsAwaitingPayment", "Bills Awaiting Payment")}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "10px",
              background: activeTab === "AWAITING" ? "rgba(255,255,255,0.25)" : "#FEF3C7",
              color: activeTab === "AWAITING" ? "#FFFFFF" : "#B45309",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            {language === "mr" || language === "hi" ? toDevanagari(displayedAwaiting.length) : displayedAwaiting.length}
          </span>
        </button>
      </div>

      {/* =========================================================
          TOOLBAR: SEARCH & DATE FILTER
      ========================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: COLORS.text }}>
            {activeTab === "SETTLED" ? t("paymentHistoryRecords", "Payment History & Records") : t("billsAwaitingSettlement", "Bills Awaiting Settlement")}
          </h2>
          <span
            style={{
              backgroundColor: activeTab === "SETTLED" ? "#DCFCE7" : "#FEF3C7",
              color: activeTab === "SETTLED" ? COLORS.success : "#B45309",
              borderRadius: "12px",
              padding: "3px 10px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {activeTab === "SETTLED"
              ? `${language === "mr" || language === "hi" ? toDevanagari(displayedPayments.length) : displayedPayments.length} ${t("records", "Records")}`
              : `${language === "mr" || language === "hi" ? toDevanagari(displayedAwaiting.length) : displayedAwaiting.length} ${t("billsDue", "Bills Due")}`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* SEARCH */}
          <div
            style={{
              flex: "1 1 280px",
              maxWidth: "360px",
              background: "#FFFFFF",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <Search size={16} color="#777" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPaymentPlaceholder", "Search payment, invoice, order, table...")}
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                fontSize: "13px",
                color: "#333",
                background: "transparent",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#888", padding: 0 }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          TABLE CONTAINER (SETTLED vs AWAITING)
      ========================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${COLORS.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}>
          {activeTab === "SETTLED" ? (
            /* PAYMENT HISTORY TABLE */
            <div style={{ width: "100%", minWidth: "1050px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 120px 62px 78px 110px 95px 95px 90px 125px 90px 140px",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#FFF9F3",
                  borderBottom: `1px solid ${COLORS.border}`,
                  color: COLORS.accent,
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                <div>{t("paymentId", "Payment ID")}</div>
                <div>{t("invoiceBillNo", "Invoice / Bill #")}</div>
                <div>{t("orderNo", "Order #")}</div>
                <div>{t("tableNo", "Table #")}</div>
                <div>{t("customer", "Customer")}</div>
                <div>{t("txnRef", "Txn Ref")}</div>
                <div style={{ textAlign: "right" }}>{t("amount", "Amount")}</div>
                <div style={{ textAlign: "center" }}>{t("method", "Method")}</div>
                <div>{t("dateTime", "Date / Time")}</div>
                <div style={{ textAlign: "center" }}>{t("status", "Status")}</div>
                <div style={{ textAlign: "center" }}>{t("action", "Action")}</div>
              </div>

              {loading && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: COLORS.muted }}>
                  <RefreshCw size={24} color={COLORS.accent} style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
                  <div>{t("loading", "Loading payment history...")}</div>
                </div>
              )}

              {!loading &&
                paginatedPayments.map((pay, idx) => (
                  <div
                    key={pay.id || idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 120px 62px 78px 110px 95px 95px 90px 125px 90px 140px",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: idx === paginatedPayments.length - 1 ? "none" : "1px solid #EEE7E2",
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FDFAF7",
                      gap: "8px",
                    }}
                  >
                    {/* Payment ID */}
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: COLORS.text }}>
                        #PAY-{language === "mr" || language === "hi" ? toDevanagari(pay.id) : pay.id}
                      </span>
                    </div>

                    {/* Invoice / Bill # */}
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: COLORS.accent }}>
                        #{pay.invoiceNumber ? (language === "mr" || language === "hi" ? toDevanagari(pay.invoiceNumber) : pay.invoiceNumber) : "-"}
                      </span>
                    </div>

                    {/* Order # */}
                    <div>
                      <span style={{ fontSize: "12px", color: COLORS.text, fontWeight: 600 }}>
                        {formatOrderCol(pay.orderNumber, pay.orderId)}
                      </span>
                    </div>

                    {/* Table # */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700, color: "#514A45" }}>
                      <span>{formatTableCol(pay.tableNumber || pay.tableName, pay.tableId)}</span>
                    </div>

                    {/* Customer */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <User size={13} color={COLORS.muted} />
                      <span style={{ fontWeight: 600, fontSize: "13px", color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {localizeGuestName(pay.customerName || t("walkInGuest", "Walk-in Guest"), language as SupportedLang)}
                      </span>
                    </div>

                    {/* Transaction Ref */}
                    <div>
                      <code style={{ fontSize: "11px", color: COLORS.muted, background: "#F5EFE9", padding: "2px 6px", borderRadius: "4px" }}>
                        {formatTxnRef(pay.transactionRef)}
                      </code>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: COLORS.success, whiteSpace: "nowrap" }}>
                      {formatCurrency(pay.amount)}
                    </div>

                    {/* Payment Method */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "#F5EFE9",
                          color: COLORS.accent,
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {formatPaymentMethod(pay.paymentMethod)}
                      </span>
                    </div>

                    {/* Payment Date / Time */}
                    <div style={{ fontSize: "12px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {formatTableDateTime(pay.paymentDate || pay.createdAt)}
                    </div>

                    {/* Payment Status */}
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          background: COLORS.successBg,
                          color: COLORS.success,
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>{translateStatus(pay.status || "SUCCESS")}</span>
                      </span>
                    </div>

                    {/* Action Column: View & Print with Improved CSS */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleViewInvoice(pay)}
                        style={{
                          height: "30px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #2563EB",
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                        title="View Associated Invoice"
                      >
                        <Eye size={13} />
                        <span>{t("view", "View")}</span>
                      </button>
                      <button
                        onClick={() => {
                          const found = invoices.find(
                            (inv) =>
                              Number(inv.id) === Number(pay.invoiceId) ||
                              (pay.invoiceNumber && inv.invoiceNumber === pay.invoiceNumber) ||
                              (pay.orderId && Number(inv.orderId) === Number(pay.orderId))
                          ) || {
                            id: pay.invoiceId || pay.id,
                            invoiceNumber: pay.invoiceNumber || `INV-${pay.invoiceId || pay.id}`,
                            orderId: pay.orderId,
                            orderNumber: pay.orderNumber,
                            tableId: pay.tableId,
                            tableNumber: pay.tableNumber || pay.tableName,
                            customerName: pay.customerName,
                            guestName: pay.customerName,
                            grandTotal: pay.amount,
                            paidAmount: pay.amount,
                            dueAmount: 0,
                            status: "PAID",
                            paymentMethod: pay.paymentMethod,
                            createdAt: pay.paymentDate || pay.createdAt,
                            items: [],
                          };
                          handlePrintInvoice(found);
                        }}
                        style={{
                          height: "30px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #059669",
                          background: "#ECFDF5",
                          color: "#047857",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                        title="Print Invoice / Receipt"
                      >
                        <Printer size={13} />
                        <span>{t("print", "Print")}</span>
                      </button>
                    </div>
                  </div>
                ))}

              {!loading && displayedPayments.length === 0 && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: COLORS.muted }}>
                  <ReceiptIndianRupee size={36} color={COLORS.accent} style={{ marginBottom: "8px", opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, fontSize: "15px", color: COLORS.text }}>
                    {t("noPaymentHistoryFound", "No Payment History Records Found")}
                  </div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    {t("noPaymentHistoryDesc", "Completed payment transactions recorded against invoices will appear here.")}
                  </div>
                </div>
              )}

              <TablePagination
                currentPage={paymentPage}
                totalRecords={displayedPayments.length}
                pageSize={10}
                onPageChange={setPaymentPage}
              />
            </div>
          ) : (
            /* BILLS AWAITING PAYMENT TABLE */
            <div style={{ width: "100%", minWidth: "900px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 68px 78px 120px 100px 90px 90px 80px 145px",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#FFF9F3",
                  borderBottom: `1px solid ${COLORS.border}`,
                  color: COLORS.accent,
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                <div>{t("invoiceNo", "Invoice #")}</div>
                <div>{t("orderNo", "Order #")}</div>
                <div>{t("tableNo", "Table #")}</div>
                <div>{t("customerGuest", "Customer / Guest")}</div>
                <div>{t("billDate", "Bill Date")}</div>
                <div style={{ textAlign: "right" }}>{t("totalBill", "Total Bill")}</div>
                <div style={{ textAlign: "right" }}>{t("dueAmount", "Due Amount")}</div>
                <div style={{ textAlign: "center" }}>{t("status", "Status")}</div>
                <div style={{ textAlign: "center" }}>{t("action", "Action")}</div>
              </div>

              {loading && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: COLORS.muted }}>
                  <RefreshCw size={24} color={COLORS.accent} style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
                  <div>{t("loading", "Loading bills awaiting settlement...")}</div>
                </div>
              )}

              {!loading &&
                paginatedAwaiting.map((inv, idx) => (
                  <div
                    key={inv.id || idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 68px 78px 120px 100px 90px 90px 80px 145px",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: idx === paginatedAwaiting.length - 1 ? "none" : "1px solid #EEE7E2",
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FDFAF7",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: COLORS.accent }}>
                        #{inv.invoiceNumber ? (language === "mr" || language === "hi" ? toDevanagari(inv.invoiceNumber) : inv.invoiceNumber) : "-"}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: "12px", color: COLORS.text, fontWeight: 600 }}>
                        {formatOrderCol(inv.orderNumber, inv.orderId)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700, color: "#514A45" }}>
                      <span>{formatTableCol(inv.tableNumber || inv.tableName, inv.tableId)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <User size={13} color={COLORS.muted} />
                      <span style={{ fontWeight: 600, fontSize: "13px", color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {localizeGuestName(inv.guestName || inv.customerName || t("walkInGuest", "Walk-in Guest"), language as SupportedLang)}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                      {formatTableDate(inv.createdAt)}
                    </div>

                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: "13px", color: COLORS.text, whiteSpace: "nowrap" }}>
                      {formatCurrency(inv.grandTotal)}
                    </div>

                    <div style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: COLORS.danger, whiteSpace: "nowrap" }}>
                      {formatCurrency(inv.dueAmount ?? inv.grandTotal)}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          background: "#FEF3C7",
                          color: "#B45309",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <Clock3 size={12} />
                        <span>{translateStatus("UNPAID")}</span>
                      </span>
                    </div>

                    {/* Action Column: Settle & View with Consistent Styling */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      <button
                        onClick={() => openPayModal(inv)}
                        style={{
                          height: "30px",
                          padding: "0 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: COLORS.accent,
                          color: "#FFFFFF",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 4px rgba(139, 62, 22, 0.2)",
                        }}
                        title="Settle Payment for this Bill"
                      >
                        <CreditCard size={13} />
                        <span>{t("settle", "Settle")}</span>
                      </button>
                      <button
                        onClick={() => setViewDetailsInvoice(inv)}
                        style={{
                          height: "30px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #2563EB",
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                        }}
                        title="View Bill Items & Breakdown"
                      >
                        <Eye size={13} />
                        <span>{t("view", "View")}</span>
                      </button>
                    </div>
                  </div>
                ))}

              {!loading && displayedAwaiting.length === 0 && (
                <div style={{ padding: "50px 20px", textAlign: "center", color: COLORS.muted }}>
                  <CheckCircle2 size={36} color={COLORS.success} style={{ marginBottom: "8px", opacity: 0.6 }} />
                  <div style={{ fontWeight: 700, fontSize: "15px", color: COLORS.text }}>
                    {t("allBillsSettled", "All Bills Have Been Settled!")}
                  </div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    {t("noUnpaidBillsDesc", "There are no unpaid generated invoices pending settlement at this time.")}
                  </div>
                </div>
              )}

              <TablePagination
                currentPage={awaitingPage}
                totalRecords={displayedAwaiting.length}
                pageSize={10}
                onPageChange={setAwaitingPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          PAYMENT SETTLEMENT MODAL
      ========================================================= */}
      {selectedInvoiceForPayment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(35, 23, 16, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setSelectedInvoiceForPayment(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
              width: "min(520px, 100%)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: "24px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #F0ECE7",
                paddingBottom: "14px",
                marginBottom: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: COLORS.accent, textTransform: "uppercase" }}>
                  {t("billSettlementPayment", "Bill Settlement & Payment")}
                </span>
                <h2 style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 800, color: COLORS.text }}>
                  #{selectedInvoiceForPayment.invoiceNumber}
                </h2>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                style={{
                  border: "none",
                  background: "#F5EFE9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Summary Recap */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                backgroundColor: "#FFF9F3",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #F0E3D7",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("tableNo", "TABLE").toUpperCase()}</div>
                <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: 700 }}>
                  {formatTableCol(selectedInvoiceForPayment.tableNumber)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("customerGuest", "GUEST").toUpperCase()}</div>
                <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: 700 }}>
                  {localizeGuestName(selectedInvoiceForPayment.guestName || selectedInvoiceForPayment.customerName || t("walkInGuest", "Walk-in Guest"), language as SupportedLang)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("orderNo", "ORDER #").toUpperCase()}</div>
                <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>
                  {formatOrderCol(selectedInvoiceForPayment.orderNumber, selectedInvoiceForPayment.orderId)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("outstandingDue", "OUTSTANDING DUE")}</div>
                <div style={{ fontSize: "16px", color: COLORS.danger, fontWeight: 800 }}>
                  {formatCurrency(selectedInvoiceForPayment.dueAmount ?? selectedInvoiceForPayment.grandTotal)}
                </div>
              </div>
            </div>

            {/* Items Included */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.accent, marginBottom: "6px", textTransform: "uppercase" }}>
                {t("billItems", "Bill Items")} ({language === "mr" || language === "hi" ? toDevanagari(selectedInvoiceForPayment.items?.length || 0) : (selectedInvoiceForPayment.items?.length || 0)})
              </div>
              <div
                style={{
                  maxHeight: "120px",
                  overflowY: "auto",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  padding: "6px 12px",
                  background: "#FAF7F5",
                }}
              >
                {selectedInvoiceForPayment.items && selectedInvoiceForPayment.items.length > 0 ? (
                  selectedInvoiceForPayment.items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontSize: "12px",
                        borderBottom: i === (selectedInvoiceForPayment.items?.length || 0) - 1 ? "none" : "1px dashed #E5DCD5",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: COLORS.text }}>
                        {getLocalizedMenuItemName(it.description || it.itemName || it.name, language as SupportedLang)} × {language === "mr" || language === "hi" ? toDevanagari(it.quantity || it.qty || 1) : (it.quantity || it.qty || 1)}
                      </span>
                      <span style={{ fontWeight: 700, color: COLORS.accent }}>
                        {formatCurrency((Number(it.unitPrice || it.price) || 0) * (Number(it.quantity || it.qty) || 1))}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: "12px", color: COLORS.muted }}>{t("itemDetailsAttached", "Item details attached to bill")}</div>
                )}
              </div>
            </div>

            {/* Payment Method Selector (UPI, CASH, CARD only - Net Banking removed) */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: COLORS.text, marginBottom: "8px" }}>
                {t("selectPaymentMethod", "Select Payment Method")}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {[
                  { id: "UPI", label: t("upiQr", "UPI / QR Code"), icon: Smartphone },
                  { id: "CASH", label: t("cash", "Cash"), icon: Banknote },
                  { id: "CARD", label: t("card", "Card"), icon: CreditCard },
                ].map((m) => {
                  const isSelected = payMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPayMethod(m.id as PaymentMethodType);
                        if (m.id === "CASH") {
                          setPayRef("COUNTER-CASH");
                          setPayCashReceived(payAmount);
                        } else if (m.id === "CARD") {
                          setPayRef("");
                        } else {
                          setPayRef(`TXN-INV-${selectedInvoiceForPayment.id}`);
                        }
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 6px",
                        borderRadius: "8px",
                        border: `1.5px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                        background: isSelected ? COLORS.accentLight : "#FFFFFF",
                        color: isSelected ? COLORS.accent : COLORS.text,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "12px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <m.icon size={18} color={isSelected ? COLORS.accent : "#666"} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UPI Dynamic QR Code View */}
            {payMethod === "UPI" && (
              <div
                style={{
                  background: "#F5F3FF",
                  border: "1px solid #DDD6FE",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#6D28D9", marginBottom: "8px" }}>
                  {t("scanQrToPay", "Scan UPI QR Code to Pay")} ₹{payAmount}
                </div>
                <div
                  style={{
                    width: "130px",
                    height: "130px",
                    margin: "0 auto 10px",
                    background: "#FFFFFF",
                    padding: "8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <rect width="100" height="100" fill="#FFFFFF" />
                    <rect x="5" y="5" width="26" height="26" fill="#000000" />
                    <rect x="9" y="9" width="18" height="18" fill="#FFFFFF" />
                    <rect x="13" y="13" width="10" height="10" fill="#000000" />
                    <rect x="69" y="5" width="26" height="26" fill="#000000" />
                    <rect x="73" y="9" width="18" height="18" fill="#FFFFFF" />
                    <rect x="77" y="13" width="10" height="10" fill="#000000" />
                    <rect x="5" y="69" width="26" height="26" fill="#000000" />
                    <rect x="9" y="73" width="18" height="18" fill="#FFFFFF" />
                    <rect x="13" y="77" width="10" height="10" fill="#000000" />
                    <rect x="36" y="8" width="5" height="5" fill="#000000" />
                    <rect x="46" y="8" width="5" height="10" fill="#000000" />
                    <rect x="56" y="12" width="5" height="6" fill="#000000" />
                    <rect x="36" y="22" width="10" height="5" fill="#000000" />
                    <rect x="52" y="22" width="10" height="5" fill="#000000" />
                    <rect x="8" y="36" width="5" height="10" fill="#000000" />
                    <rect x="20" y="40" width="8" height="5" fill="#000000" />
                    <rect x="36" y="36" width="28" height="28" fill="#8B3E16" rx="4" />
                    <text x="50" y="54" fontSize="10" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">UPI</text>
                    <rect x="70" y="36" width="10" height="8" fill="#000000" />
                    <rect x="85" y="42" width="8" height="6" fill="#000000" />
                    <rect x="36" y="70" width="10" height="5" fill="#000000" />
                    <rect x="52" y="75" width="15" height="5" fill="#000000" />
                    <rect x="72" y="70" width="18" height="10" fill="#000000" />
                    <rect x="70" y="85" width="8" height="10" fill="#000000" />
                    <rect x="84" y="86" width="10" height="8" fill="#000000" />
                  </svg>
                </div>
                <div style={{ fontSize: "11px", color: "#4B5563", marginBottom: "8px" }}>
                  UPI ID: <b>hotelpos@icici</b> • Invoice #{selectedInvoiceForPayment.invoiceNumber}
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6D28D9", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={payUpiVerified}
                    onChange={(e) => setPayUpiVerified(e.target.checked)}
                    style={{ accentColor: "#6D28D9", cursor: "pointer" }}
                  />
                  <span>{t("customerCompletedUpi", "Customer has completed UPI payment via App")}</span>
                </label>
              </div>
            )}

            {/* CASH Payment Calculator */}
            {payMethod === "CASH" && (
              <div
                style={{
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#065F46", marginBottom: "4px" }}>
                      {t("amountDue", "Amount Due (₹)")}
                    </label>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#047857", padding: "6px 0" }}>
                      ₹{payAmount}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#065F46", marginBottom: "4px" }}>
                      {t("cashReceivedFromCustomer", "Cash Received from Customer (₹)")}
                    </label>
                    <input
                      type="number"
                      value={payCashReceived}
                      onChange={(e) => setPayCashReceived(e.target.value)}
                      placeholder="e.g. 500"
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: "1.5px solid #059669",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#065F46",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed #A7F3D0", fontSize: "13px" }}>
                  <span style={{ color: "#065F46", fontWeight: 600 }}>{t("changeToReturn", "Change to Return:")}</span>
                  <span style={{ fontWeight: 800, color: Number(payCashReceived) >= Number(payAmount) ? "#047857" : "#DC2626" }}>
                    {Number(payCashReceived) >= Number(payAmount)
                      ? `₹${(Number(payCashReceived) - Number(payAmount)).toFixed(2)}`
                      : t("insufficientCashReceived", "Insufficient Cash Received")}
                  </span>
                </div>
              </div>
            )}

            {/* CARD Payment Info */}
            {payMethod === "CARD" && (
              <div
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#1E40AF",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>💳 {t("posTerminalPayment", "POS Terminal Payment")}</div>
                <div>{t("cardTerminalInstructions", "Swipe or tap customer credit/debit card on POS machine. Do not collect sensitive card numbers or CVV. Enter the approval code from the terminal print slip below.")}</div>
              </div>
            )}

            {/* Amount Input */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: COLORS.text, marginBottom: "6px" }}>
                {t("amountToPay", "Amount to Pay (₹)")}
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => {
                  setPayAmount(e.target.value);
                  if (payMethod === "CASH") setPayCashReceived(e.target.value);
                }}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  padding: "0 12px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: COLORS.accent,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Transaction Ref */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: COLORS.text, marginBottom: "6px" }}>
                {payMethod === "UPI"
                  ? t("upiTxnRefLabel", "UPI Transaction Reference (UTR - 12 digits) *")
                  : payMethod === "CARD"
                  ? t("posTerminalRefLabel", "POS Terminal Slip / Auth Reference *")
                  : t("cashReceiptNotesLabel", "Cash Receipt Notes (Optional)")}
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={
                  payMethod === "UPI"
                    ? "e.g. 423456789012"
                    : payMethod === "CARD"
                    ? "e.g. POS-AUTH-98234"
                    : "e.g. Counter Cash Settled"
                }
                style={{
                  width: "100%",
                  height: "38px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  padding: "0 12px",
                  fontSize: "13px",
                  color: COLORS.text,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  background: "#FFFFFF",
                  color: COLORS.muted,
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("cancel", "Cancel")}
              </button>

              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={submittingPayment || selectedInvoiceForPayment.status === "PAID"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: COLORS.success,
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: submittingPayment ? "wait" : "pointer",
                  boxShadow: "0 2px 6px rgba(21, 128, 61, 0.3)",
                }}
              >
                <CheckCircle2 size={16} />
                <span>{submittingPayment ? t("processing", "Processing...") : `${t("completePayment", "Complete Payment")} (${formatCurrency(Number(payAmount) || 0)})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYMENT SUCCESS RECEIPT MODAL
      ========================================================= */}
      {paymentSuccessReceipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(35, 23, 16, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
          onClick={() => setPaymentSuccessReceipt(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 24px 48px rgba(0,0,0,0.22)",
              width: "min(440px, 100%)",
              padding: "28px",
              boxSizing: "border-box",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: COLORS.successBg,
                color: COLORS.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: COLORS.text }}>
              {t("paymentSuccessful", "Payment Successful!")}
            </h2>
            <p style={{ margin: "0 0 20px", color: COLORS.muted, fontSize: "13px" }}>
              {t("paymentSuccessDesc", "Bill settled & table has been marked AVAILABLE in SQL Server")}
            </p>

            <div
              style={{
                background: "#FFF9F3",
                borderRadius: "10px",
                border: "1px solid #F0E3D7",
                padding: "16px",
                textAlign: "left",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: COLORS.muted }}>{t("invoiceNumber", "Invoice Number")}:</span>
                <span style={{ fontWeight: 700, color: COLORS.text }}>#{paymentSuccessReceipt.invoice.invoiceNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: COLORS.muted }}>{t("tableNo", "Table")}:</span>
                <span style={{ fontWeight: 700, color: COLORS.success }}>
                  {formatTableCol(paymentSuccessReceipt.invoice.tableNumber, paymentSuccessReceipt.invoice.tableId)} ({t("cleaning", "Cleaning")})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: COLORS.muted }}>{t("customerGuest", "Guest")}:</span>
                <span style={{ fontWeight: 600, color: COLORS.text }}>{paymentSuccessReceipt.invoice.guestName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: COLORS.muted }}>{t("paymentMethod", "Payment Method")}:</span>
                <span style={{ fontWeight: 700, color: COLORS.accent }}>{translateStatus(paymentSuccessReceipt.method)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E5DCD5", paddingTop: "8px", fontSize: "15px" }}>
                <span style={{ fontWeight: 700, color: COLORS.text }}>{t("amountPaid", "Amount Paid")}:</span>
                <span style={{ fontWeight: 800, color: COLORS.success }}>{formatCurrency(paymentSuccessReceipt.amount)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handlePrintInvoice(paymentSuccessReceipt.invoice)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  background: "#FFFFFF",
                  color: COLORS.text,
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <Printer size={15} />
                <span>{t("printReceipt", "Print Receipt")}</span>
              </button>

              <button
                onClick={() => {
                  setPaymentSuccessReceipt(null);
                  navigate("/hotel/Tables");
                }}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: COLORS.accent,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span>{t("returnToTables", "Return to Tables")}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW INVOICE DETAILS MODAL
      ========================================================= */}
      {viewDetailsInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(35, 23, 16, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setViewDetailsInvoice(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
              width: "min(560px, 100%)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: "24px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #F0ECE7",
                paddingBottom: "14px",
                marginBottom: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: COLORS.accent, textTransform: "uppercase" }}>
                  {t("invoiceDetailsRecord", "Invoice Details & Payment Record")}
                </span>
                <h2 style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 800, color: COLORS.text }}>
                  #{viewDetailsInvoice.invoiceNumber}
                </h2>
              </div>
              <button
                onClick={() => setViewDetailsInvoice(null)}
                style={{
                  border: "none",
                  background: "#F5EFE9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Summary Recap */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                backgroundColor: "#FFF9F3",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #F0E3D7",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("tableNo", "TABLE").toUpperCase()}</div>
                <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: 700 }}>
                  {formatTableCol(viewDetailsInvoice.tableNumber)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("customerGuest", "GUEST").toUpperCase()}</div>
                <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: 700 }}>
                  {localizeGuestName(viewDetailsInvoice.guestName || viewDetailsInvoice.customerName || t("walkInGuest", "Walk-in Guest"), language as SupportedLang)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("orderNo", "ORDER #").toUpperCase()}</div>
                <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>
                  {formatOrderCol(viewDetailsInvoice.orderNumber, viewDetailsInvoice.orderId)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 600 }}>{t("status", "STATUS").toUpperCase()}</div>
                <div style={{ fontSize: "13px", color: COLORS.success, fontWeight: 800 }}>
                  {t("paidSettled", "PAID / SETTLED")}
                </div>
              </div>
            </div>

            {/* Items Included */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.accent, marginBottom: "6px", textTransform: "uppercase" }}>
                {t("billItems", "Bill Items")} ({language === "mr" || language === "hi" ? toDevanagari(viewDetailsInvoice.items?.length || 0) : (viewDetailsInvoice.items?.length || 0)})
              </div>
              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  padding: "6px 12px",
                  background: "#FAF7F5",
                }}
              >
                {viewDetailsInvoice.items && viewDetailsInvoice.items.length > 0 ? (
                  viewDetailsInvoice.items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        fontSize: "12px",
                        borderBottom: i === (viewDetailsInvoice.items?.length || 0) - 1 ? "none" : "1px dashed #E5DCD5",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: COLORS.text }}>
                        {getLocalizedMenuItemName(it.description || it.itemName || it.name, language as SupportedLang)} × {language === "mr" || language === "hi" ? toDevanagari(it.quantity || it.qty || 1) : (it.quantity || it.qty || 1)}
                      </span>
                      <span style={{ fontWeight: 700, color: COLORS.accent }}>
                        {formatCurrency((Number(it.unitPrice || it.price) || 0) * (Number(it.quantity || it.qty) || 1))}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: "12px", color: COLORS.muted }}>{t("itemsSyncedOrder", "Items synchronized with order record")}</div>
                )}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div
              style={{
                background: "#FAF7F5",
                borderRadius: "8px",
                padding: "12px 14px",
                border: `1px solid ${COLORS.border}`,
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: COLORS.muted }}>{t("subtotal", "Subtotal")}:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(viewDetailsInvoice.subtotal ?? viewDetailsInvoice.grandTotal)}</span>
              </div>
              {(() => {
                const totalTax = Number(viewDetailsInvoice.taxAmount || 0);
                if (totalTax <= 0) return null;

                const hasExplicitCgstSgst = (viewDetailsInvoice.cgst !== undefined && viewDetailsInvoice.cgst > 0) ||
                                            (viewDetailsInvoice.sgst !== undefined && viewDetailsInvoice.sgst > 0);
                const hasExplicitIgst = viewDetailsInvoice.igst !== undefined && viewDetailsInvoice.igst > 0;

                if (hasExplicitIgst || viewDetailsInvoice.isInterstate) {
                  const igstVal = viewDetailsInvoice.igst ?? totalTax;
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: COLORS.muted }}>IGST ({viewDetailsInvoice.igstRate ?? 5}%):</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(igstVal)}</span>
                    </div>
                  );
                }

                // Default intra-state: CGST + SGST (never displayed together with IGST)
                const cgstVal = hasExplicitCgstSgst ? Number(viewDetailsInvoice.cgst || 0) : totalTax / 2;
                const sgstVal = hasExplicitCgstSgst ? Number(viewDetailsInvoice.sgst || 0) : totalTax / 2;
                const cgstRate = viewDetailsInvoice.cgstRate ?? 2.5;
                const sgstRate = viewDetailsInvoice.sgstRate ?? 2.5;

                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: COLORS.muted }}>CGST ({cgstRate}%):</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(cgstVal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: COLORS.muted }}>SGST ({sgstRate}%):</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(sgstVal)}</span>
                    </div>
                  </>
                );
              })()}
              {Number(viewDetailsInvoice.discountAmount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: COLORS.muted }}>{t("discount", "Discount")}:</span>
                  <span style={{ fontWeight: 600, color: COLORS.success }}>-{formatCurrency(viewDetailsInvoice.discountAmount || 0)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E5DCD5", paddingTop: "8px", fontSize: "15px" }}>
                <span style={{ fontWeight: 800, color: COLORS.text }}>{t("totalPaid", "Total Paid")}:</span>
                <span style={{ fontWeight: 800, color: COLORS.success }}>{formatCurrency(viewDetailsInvoice.paidAmount || viewDetailsInvoice.grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handlePrintInvoice(viewDetailsInvoice)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  background: "#FFFFFF",
                  color: COLORS.text,
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <Printer size={15} />
                <span>{t("printInvoice", "Print Invoice")}</span>
              </button>

              <button
                onClick={() => setViewDetailsInvoice(null)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: COLORS.accent,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span>{t("close", "Close")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoiceData={printModalData}
      />
    </div>
  );
};

export default HotelPayment;
