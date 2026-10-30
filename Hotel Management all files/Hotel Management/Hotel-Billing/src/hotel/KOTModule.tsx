import { PrintInvoiceModal } from "../components/PrintInvoiceModal";
import { UniversalInvoicePrintData } from "../types/printing";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReceiptIndianRupee,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Armchair,
  Clock3,
  RefreshCw,
  ChefHat,
  CheckCircle2,
  UtensilsCrossed,
  FileEdit,
  User,
  Printer,
  X,
  AlertCircle,
  Eye,
  CreditCard,
  Check,
  ArrowRight,
} from "lucide-react";
import { dialogService } from "../context/DialogContext";
import { kotService, KotItem } from "../services/kotService";
import { orderService, Order } from "../services/orderService";
import { billingService } from "../services/billingService";
import { paymentService } from "../services/paymentService";
import { tableService } from "../services/tableService";
import { Invoice } from "../types";
import { useBranch } from "../context/BranchContext";
import { TablePagination } from "../common/TablePagination";
import { useLanguage } from "../context/LanguageContext";
import { formatTableNumber } from "./Tables";

export const KOTModule = () => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<UniversalInvoicePrintData | null>(null);
  const navigate = useNavigate();
  const { t, translateStatus, formatDate } = useLanguage();
  const { selectedBranch, selectedBranchId } = useBranch();
  const branchId = selectedBranchId || selectedBranch?.id;

  // Search & Status filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [filterAllDates, setFilterAllDates] = useState(false);

  // Start Date & End Date filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Pagination states (10 records per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // KOT Live Data & Loading
  const [kots, setKots] = useState<KotItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKotModal, setSelectedKotModal] = useState<KotItem | null>(null);

  // Two Billing Options Modal State
  const [billingModalKot, setBillingModalKot] = useState<KotItem | null>(null);
  const [billingStep, setBillingStep] = useState<'CHOICE' | 'PAY_NOW' | 'SUCCESS'>('CHOICE');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [isProcessingBill, setIsProcessingBill] = useState(false);
  const [billingSuccessMessage, setBillingSuccessMessage] = useState('');
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState<any>(null);

  // Calendar states (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch KOTs from backend, active table orders, and local storage fallback
  const fetchKots = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const dateParams = (startDate || endDate) ? { startDate, endDate } : undefined;

      const [kotsRes, ordersRes, invoicesRes] = await Promise.all([
        kotService.getKots(branchId, dateParams).catch(async () => {
          return kotService.getKots().catch(() => []);
        }),
        orderService.getOrders(branchId).catch(async () => {
          return orderService.getOrders().catch(() => []);
        }),
        billingService.getInvoices(branchId ? { branchId } : undefined).catch(() => []),
      ]);

      if (Array.isArray(invoicesRes)) {
        setInvoices(invoicesRes);
      }

      let rawKots: KotItem[] = Array.isArray(kotsRes) ? [...kotsRes] : [];
      const ordersList: Order[] = Array.isArray(ordersRes) ? ordersRes : [];

      // Branch isolation: only show orders and KOTs matching selected branch


      // Read local storage pending_kots as resilient instant offline/cache fallback
      let localPending: any[] = [];
      try {
        const stored = localStorage.getItem("pending_kots");
        if (stored) {
          localPending = JSON.parse(stored);
        }
      } catch (_) {}

      const mergedList: KotItem[] = [...rawKots];

      const hasOrder = (ordId?: number, kotNum?: string) => {
        return mergedList.some(
          (k) =>
            (ordId && k.orderId === ordId) ||
            (kotNum && k.kotNumber === kotNum)
        );
      };

      // 1. Incorporate active orders that don't yet have an explicit KOT record
      ordersList.forEach((ord) => {
        if (!hasOrder(ord.id, ord.orderNumber)) {
          const isFinished =
            ord.status === "COMPLETED" ||
            ord.status === "PAID" ||
            ord.status === "CANCELLED";
          if (!isFinished || (ord.items && ord.items.length > 0)) {
            mergedList.push({
              id: ord.id,
              kotNumber: ord.orderNumber || `KOT-${ord.id}`,
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              orderStatus: ord.status,
              guestName: ord.guestName || "Guest",
              customerName: ord.guestName || "Guest",
              guestCount: ord.guestCount || 1,
              tableId: ord.tableId,
              tableName:
                formatTableNumber({ name: ord.tableName, tableNumber: ord.tableNumber, id: ord.tableId }),
              tableNumber:
                formatTableNumber({ name: ord.tableName, tableNumber: ord.tableNumber, id: ord.tableId }),
              branchId: ord.branchId,
              totalAmount: ord.totalAmount,
              discount: ord.discount,
              taxRate: ord.taxRate,
              status: (ord.status === "BILL_REQUESTED"
                ? "BILL_REQUESTED"
                : "PENDING") as any,
              instructions: ord.tableName ? `Order for ${ord.tableName}` : "Order",
              createdAt: ord.createdAt || new Date().toISOString(),
              items: (ord.items || []).map((it, idx) => ({
                id: it.id || idx + 1,
                name: it.name,
                itemName: it.name,
                quantity: it.quantity,
                qty: it.quantity,
                unitPrice: it.unitPrice,
                price: it.unitPrice,
                totalPrice: it.totalPrice || it.unitPrice * it.quantity,
                customization: it.customization || "",
              })),
            });
          }
        }
      });

      // 2. Incorporate localStorage pending_kots if missing
      localPending.forEach((loc) => {
        if (!hasOrder(loc.orderId || loc.id, loc.kotNumber)) {
          mergedList.push({
            id: loc.id || Date.now(),
            kotNumber: loc.kotNumber || `KOT-${loc.id || Date.now()}`,
            orderId: loc.orderId || loc.id,
            guestName: loc.customerName || loc.guestName || "Guest",
            customerName: loc.customerName || loc.guestName || "Guest",
            tableId: loc.tableId,
            tableName:
              formatTableNumber({ name: loc.tableName, tableNumber: loc.tableNumber, id: loc.tableId }),
            tableNumber:
              formatTableNumber({ name: loc.tableName, tableNumber: loc.tableNumber, id: loc.tableId }),
            status: loc.status || "PENDING",
            createdAt: loc.createdAt || new Date().toISOString(),
            items: (loc.items || []).map((it: any, idx: number) => ({
              id: it.id || idx + 1,
              name: it.itemName || it.name || "Item",
              itemName: it.itemName || it.name || "Item",
              quantity: it.quantity || it.qty || 1,
              qty: it.quantity || it.qty || 1,
              unitPrice: it.price || it.unitPrice || 0,
              price: it.price || it.unitPrice || 0,
            })),
          });
        }
      });

      // 3. For any KOT with empty items, fill items from matching order if available
      mergedList.forEach((k) => {
        if ((!k.items || k.items.length === 0) && k.orderId) {
          const matchOrd = ordersList.find((o) => o.id === k.orderId);
          if (matchOrd && matchOrd.items && matchOrd.items.length > 0) {
            k.items = matchOrd.items.map((it, idx) => ({
              id: it.id || idx + 1,
              name: it.name,
              itemName: it.name,
              quantity: it.quantity,
              qty: it.quantity,
              unitPrice: it.unitPrice,
              price: it.unitPrice,
              totalPrice: it.totalPrice || it.unitPrice * it.quantity,
              customization: it.customization || "",
            }));
          }
        }
      });

      setKots(mergedList);
    } catch (err) {
      console.error("Failed to load KOTs from backend:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchKots();
    const handleRefresh = () => fetchKots(true);
    window.addEventListener("kot-updated", handleRefresh);
    window.addEventListener("order-updated", handleRefresh);
    window.addEventListener("table-status-changed", handleRefresh);
    window.addEventListener("payment-completed", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    const interval = setInterval(() => {
      fetchKots(true);
    }, 5000);
    return () => {
      window.removeEventListener("kot-updated", handleRefresh);
      window.removeEventListener("order-updated", handleRefresh);
      window.removeEventListener("table-status-changed", handleRefresh);
      window.removeEventListener("payment-completed", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
      clearInterval(interval);
    };
  }, [fetchKots]);

  // Handle status update
  const handleUpdateStatus = async (kotId: number, nextStatus: string) => {
    try {
      const updated = await kotService.updateKotStatus(kotId, nextStatus).catch(() => null);
      setKots((prev) =>
        prev.map((k) => (k.id === kotId ? { ...k, status: updated?.status || nextStatus } : k))
      );
      if (selectedKotModal && selectedKotModal.id === kotId) {
        setSelectedKotModal((prev) =>
          prev ? { ...prev, status: updated?.status || nextStatus } : null
        );
      }
      try {
        const stored = localStorage.getItem("pending_kots");
        if (stored) {
          const list = JSON.parse(stored);
          const nextList = list.map((item: any) =>
            item.id === kotId || item.orderId === kotId ? { ...item, status: nextStatus } : item
          );
          localStorage.setItem("pending_kots", JSON.stringify(nextList));
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("kot-updated"));
    } catch (err) {
      console.error("Failed to update KOT status:", err);
      setKots((prev) =>
        prev.map((k) => (k.id === kotId ? { ...k, status: nextStatus } : k))
      );
    }
  };

  // Calendar functions
  const monthName = calendarMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const previousMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  const selectDate = (day: number) => {
    const date = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    setSelectedDate(date);
    setFilterAllDates(false);
    setCalendarOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setFilterAllDates(false);
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCalendarOpen(false);
  };

  const formatSelectedDate = selectedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Close calendar when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    };

    if (calendarOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [calendarOpen]);

  // Filter KOTs
  const filteredKots = useMemo(() => {
    const searchValue = search.toLowerCase().trim();
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    const selDay = selectedDate.getDate();

    return kots.filter((kot) => {
      // Search
      const kotNum = (kot.kotNumber || "").toLowerCase();
      const tbl = (kot.tableName || kot.tableNumber || "").toLowerCase();
      const guest = (kot.guestName || kot.customerName || "").toLowerCase();
      const matchesSearch =
        !searchValue ||
        kotNum.includes(searchValue) ||
        tbl.includes(searchValue) ||
        guest.includes(searchValue);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (kot.status === "COMPLETED" || kot.status === "BILLED" || kot.status === "CANCELLED") return false;
        } else if (statusFilter === "COMPLETED") {
          if (kot.status !== "COMPLETED" && kot.status !== "BILLED") return false;
        } else if (kot.status !== statusFilter) {
          return false;
        }
      }

      // Date Filter: If custom range (Start Date / End Date) is set, filter by range
      if (startDate || endDate) {
        if (!kot.createdAt) return false;
        const kDate = new Date(kot.createdAt);
        if (startDate) {
          const s = new Date(startDate + "T00:00:00");
          if (kDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate + "T23:59:59");
          if (kDate > e) return false;
        }
      } else if (!filterAllDates && kot.createdAt) {
        // Active kitchen orders must NOT be hidden by the single-day date filter unless the user explicitly browses to a different past day
        const kDate = new Date(kot.createdAt);
        const matchesDate =
          kDate.getFullYear() === selYear &&
          kDate.getMonth() === selMonth &&
          kDate.getDate() === selDay;

        const isToday =
          selYear === new Date().getFullYear() &&
          selMonth === new Date().getMonth() &&
          selDay === new Date().getDate();

        const isActiveTicket =
          kot.status !== "COMPLETED" &&
          kot.status !== "BILLED" &&
          kot.status !== "CANCELLED";

        // If user is on Today's view, always show all active tickets so kitchen staff never misses an order
        if (!matchesDate) {
          if (!(isToday && isActiveTicket)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [kots, search, statusFilter, filterAllDates, selectedDate, startDate, endDate]);

  // Reset pagination to first page when any search or filter term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDate, endDate, filterAllDates, selectedDate]);

  // Date range handlers with validation (End Date cannot be earlier than Start Date)
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate && val && val > endDate) {
      setDateValidationError("End Date cannot be earlier than Start Date.");
    } else {
      setDateValidationError(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && val < startDate) {
      setDateValidationError("End Date cannot be earlier than Start Date.");
    } else {
      setDateValidationError(null);
    }
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
    setDateValidationError(null);
  };

  // Status Badge Helper: full KOT lifecycle support
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
      case "SENT":
      case "SENT_TO_KITCHEN":
      case "PENDING":
        return {
          label: t("New / Sent", "New / Sent"),
          bg: "#FEF3C7",
          color: "#92400E",
          border: "#FDE68A",
        };
      case "ACCEPTED":
      case "PREPARING":
        return {
          label: t("preparing", "Preparing"),
          bg: "#E0F2FE",
          color: "#0369A1",
          border: "#BAE6FD",
        };
      case "READY":
        return {
          label: t("ready", "Ready"),
          bg: "#D1FAE5",
          color: "#047857",
          border: "#A7F3D0",
        };
      case "SERVED":
        return {
          label: t("served", "Served"),
          bg: "#DCFCE7",
          color: "#15803D",
          border: "#BBF7D0",
        };
      case "BILL_REQUESTED":
      case "BILLING":
        return {
          label: t("billingPending", "Billing Pending"),
          bg: "#FFEDD5",
          color: "#C2410C",
          border: "#FDBA74",
        };
      case "BILLED":
      case "PAID":
      case "COMPLETED":
        return {
          label: t("completedPaid", "Completed / Paid"),
          bg: "#F0FDF4",
          color: "#166534",
          border: "#DCFCE7",
        };
      case "CANCELLED":
        return {
          label: t("cancelled", "Cancelled"),
          bg: "#FEE2E2",
          color: "#991B1B",
          border: "#FECACA",
        };
      default:
        return {
          label: translateStatus(status),
          bg: "#F5F5F4",
          color: "#44403C",
          border: "#E7E5E4",
        };
    }
  };

  // Status Action Helper: lifecycle progression & billing navigation
  const getNextAction = (kot: KotItem) => {
    const isCompleted = kot.status === "COMPLETED" || kot.status === "BILLED" || kot.status === "PAID";
    if (isCompleted) {
      return {
        label: t("viewBill", "View Bill"),
        nextStatus: "BILLING",
        icon: FileEdit,
        bg: "#059669",
        isLink: true,
      };
    }
    return {
      label: t("proceedToBilling", "Proceed to Billing"),
      nextStatus: "BILLING",
      icon: ReceiptIndianRupee,
      bg: "#8B3E16",
      isLink: true,
    };
  };

  // Helper to determine billing info for a KOT
  const getKotBillingInfo = (kot: KotItem) => {
    const invoice = invoices.find(
      (inv) =>
        (kot.orderId && inv.orderId === kot.orderId) ||
        (kot.id && inv.orderId === kot.id) ||
        (kot.kotNumber && inv.notes?.includes(kot.kotNumber)) ||
        (kot.orderNumber && inv.notes?.includes(kot.orderNumber))
    );

    if (invoice) {
      const isPaid = invoice.status === "PAID";
      return {
        invoice,
        status: isPaid ? "PAID" : "UNPAID",
        statusLabel: isPaid ? t("paid", "Paid") : t("unpaid", "Unpaid"),
        totalAmount: Number((invoice as any).totalAmount ?? invoice.grandTotal ?? invoice.total ?? 0),
        invoiceNumber: invoice.invoiceNumber,
        isBilled: true,
        isPaid,
      };
    }

    if (kot.orderStatus === "PAID" || kot.status === "PAID") {
      return {
        invoice: null,
        status: "PAID",
        statusLabel: t("paid", "Paid"),
        totalAmount: Number(kot.totalAmount) || 0,
        invoiceNumber: null,
        isBilled: true,
        isPaid: true,
      };
    }

    return {
      invoice: null,
      status: "NOT_BILLED",
      statusLabel: t("notBilled", "Not Billed"),
      totalAmount: 0,
      invoiceNumber: null,
      isBilled: false,
      isPaid: false,
    };
  };

  // Helper to calculate totals from KOT items
  const calculateKotTotals = (kot: KotItem) => {
    const items = kot.items || [];
    const subtotal = items.reduce((acc, it) => {
      const price = Number(it.unitPrice ?? it.price ?? 0);
      const qty = Number(it.quantity ?? it.qty ?? 1);
      return acc + price * qty;
    }, 0);
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + gst) * 100) / 100;
    return { subtotal, gst, grandTotal };
  };

  // Handle Pay Now (Option A): Creates/reuses invoice, processes payment, frees table
  const handlePayNow = async (kot: KotItem, method: "UPI" | "CASH" | "CARD") => {
    try {
      setIsProcessingBill(true);
      const billingInfo = getKotBillingInfo(kot);
      const totals = calculateKotTotals(kot);

      let targetInvoice = billingInfo.invoice;

      // Create invoice if not already created
      if (!targetInvoice) {
        const itemsPayload = (kot.items || []).map((it) => ({
          description: it.name || it.itemName || "Food Item",
          quantity: Number(it.quantity || it.qty || 1),
          unitPrice: Number(it.unitPrice || it.price || 0),
          taxRate: 5,
        }));

        targetInvoice = await billingService.createInvoice({
          branchId: kot.branchId || branchId,
          orderId: kot.orderId || kot.id,
          cgstRate: 2.5,
          sgstRate: 2.5,
          notes: `KOT #${kot.kotNumber || kot.id} - ${kot.tableName || "Table"}`,
          items: itemsPayload.length > 0 ? itemsPayload : [{
            description: "Food Order",
            quantity: 1,
            unitPrice: totals.subtotal > 0 ? totals.subtotal : 100,
            taxRate: 5,
          }],
        });
      }

      // Record payment
      const invoiceId = targetInvoice.id;
      const paymentAmount = Number((targetInvoice as any).totalAmount ?? targetInvoice.grandTotal ?? targetInvoice.total ?? totals.grandTotal);

      await paymentService.recordPayment({
        invoiceId,
        amount: paymentAmount,
        paymentMethod: method,
        transactionRef: `KOT-PAY-${Date.now()}`,
        notes: `KOT settlement via ${method}`,
      });

      // Update KOT status to COMPLETED
      await kotService.updateKotStatus(kot.id, "COMPLETED").catch(() => null);

      // Free table if assigned
      if (kot.tableId) {
        await tableService.updateTableStatus(kot.tableId, "AVAILABLE").catch(() => null);
      }

      // Refresh invoices and KOTs
      await fetchKots(true);

      // Dispatch global events
      window.dispatchEvent(new CustomEvent("kot-updated"));
      window.dispatchEvent(new CustomEvent("payment-completed"));
      window.dispatchEvent(new CustomEvent("table-status-changed"));
      window.dispatchEvent(new CustomEvent("order-updated"));

      setLastGeneratedInvoice(targetInvoice);
      setBillingSuccessMessage(
        `Payment of ₹${paymentAmount.toLocaleString("en-IN")} via ${method} confirmed! Invoice #${targetInvoice.invoiceNumber || invoiceId} marked PAID. ${
          kot.tableName ? `${kot.tableName} is now Available.` : ""
        }`
      );
      setBillingStep("SUCCESS");
    } catch (err: any) {
      console.error("Failed to process Pay Now:", err);
      dialogService.alert({
        title: "Payment Failed",
        message: err.message || "Please check connection and retry",
        type: "error",
      });
    } finally {
      setIsProcessingBill(false);
    }
  };

  // Handle Pay Later (Option B): Creates/reuses invoice as UNPAID, table remains OCCUPIED
  const handlePayLater = async (kot: KotItem) => {
    try {
      setIsProcessingBill(true);
      const billingInfo = getKotBillingInfo(kot);
      const totals = calculateKotTotals(kot);

      let targetInvoice = billingInfo.invoice;

      // Create invoice if not already created
      if (!targetInvoice) {
        const itemsPayload = (kot.items || []).map((it) => ({
          description: it.name || it.itemName || "Food Item",
          quantity: Number(it.quantity || it.qty || 1),
          unitPrice: Number(it.unitPrice || it.price || 0),
          taxRate: 5,
        }));

        targetInvoice = await billingService.createInvoice({
          branchId: kot.branchId || branchId,
          orderId: kot.orderId || kot.id,
          cgstRate: 2.5,
          sgstRate: 2.5,
          notes: `KOT #${kot.kotNumber || kot.id} - ${kot.tableName || "Table"}`,
          items: itemsPayload.length > 0 ? itemsPayload : [{
            description: "Food Order",
            quantity: 1,
            unitPrice: totals.subtotal > 0 ? totals.subtotal : 100,
            taxRate: 5,
          }],
        });
      }

      // Keep table OCCUPIED; update KOT to BILL_REQUESTED if not completed
      if (kot.status !== "COMPLETED" && kot.status !== "BILLED") {
        await kotService.updateKotStatus(kot.id, "BILL_REQUESTED").catch(() => null);
      }

      // Refresh invoices and KOTs
      await fetchKots(true);

      // Dispatch global events
      window.dispatchEvent(new CustomEvent("kot-updated"));
      window.dispatchEvent(new CustomEvent("order-updated"));

      const invNum = targetInvoice.invoiceNumber || `INV-${targetInvoice.id}`;
      setLastGeneratedInvoice(targetInvoice);
      setBillingSuccessMessage(
        `Bill generated successfully (${invNum}) with Status: UNPAID. Table ${
          kot.tableName || ""
        } remains OCCUPIED until customer settles at counter.`
      );
      setBillingStep("SUCCESS");
    } catch (err: any) {
      console.error("Failed to process Pay Later:", err);
      dialogService.alert({
        title: "Bill Generation Failed",
        message: err.message || "Please check connection and retry",
        type: "error",
      });
    } finally {
      setIsProcessingBill(false);
    }
  };

  // =================================================

  const mapKotToUniversalPrintData = (kot: KotItem, isCustomerBill: boolean = false, existingInvoice?: any): UniversalInvoicePrintData => {
    const billingInfo = getKotBillingInfo(kot);
    const inv = existingInvoice || billingInfo.invoice;
    const totals = calculateKotTotals(kot);

    const hotelName = selectedBranch?.name || localStorage.getItem("billing_hotel_name") || "AJALKAR HOTEL & RESTAURANT";
    const hotelAddress = selectedBranch?.address || localStorage.getItem("billing_address") || "Hotel Premises, Pune, Maharashtra - 411004";
    const hotelPhone = (selectedBranch as any)?.phone || localStorage.getItem("billing_phone") || "+91 98765 43210";
    const gstin = (selectedBranch as any)?.gstin || localStorage.getItem("billing_gstin") || "27AAKCA1234F1Z5";

    const invNumber = inv?.invoiceNumber || (inv?.id ? `INV-${inv.id}` : `KOT-${kot.kotNumber || kot.id}`);
    const orderNum = kot.orderNumber || (kot.orderId ? `ORD-${kot.orderId}` : "-");
    const tableDisplay = kot.tableName || kot.tableNumber || inv?.tableNumber || "Table";
    const guestDisplay = kot.guestName || kot.customerName || inv?.guestName || "Walk-in Guest";

    const items = (inv?.items && inv.items.length > 0) ? inv.items : (kot.items || []);
    const subtotal = (totals as any).subtotal ?? (totals as any).itemTotal ?? inv?.itemTotal ?? 0;
    const totalTax = (totals as any).gst ?? (totals as any).taxAmount ?? inv?.taxAmount ?? 0;
    const grandTotal = totals.grandTotal || inv?.grandTotal || subtotal;

    return {
      invoiceNumber: invNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      hotelName,
      hotelAddress,
      hotelPhone,
      gstin,
      customerName: guestDisplay,
      tableName: tableDisplay,
      orderNumber: orderNum,
      items: items.map((it: any, idx: number) => ({
        id: it.id || idx,
        name: it.itemName || it.name || it.item_name || `Item ${idx + 1}`,
        quantity: Number(it.quantity || it.qty || 1),
        unitPrice: Number(it.price || it.unitPrice || 0),
        totalPrice: Number((it.quantity || 1) * (it.price || 0)),
        notes: it.specialInstructions || it.notes,
      })),
      subtotal,
      taxableAmount: subtotal,
      cgstRate: 2.5,
      cgstAmount: totalTax / 2,
      sgstRate: 2.5,
      sgstAmount: totalTax / 2,
      totalTax,
      grandTotal,
      paymentMethod: inv?.paymentMethod || "CASH",
      paymentStatus: inv?.status || (billingInfo.isPaid ? "PAID" : "UNPAID"),
      footerMessage: isCustomerBill
        ? "Thank you for dining with us! Please visit again."
        : "KOT Order Ticket - Kitchen Copy",
    };
  };

  // 80MM THERMAL KOT TICKET PRINTER (0 BLANK PAGES)
  // =================================================
  const printKotTicket80mm = useCallback((kot: KotItem) => {
    if (!kot) return;
    const printData = mapKotToUniversalPrintData(kot, false);
    setPrintModalData(printData);
    setIsPrintModalOpen(true);
    return;
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      dialogService.alert({
        title: "Pop-up Blocked",
        message: "Please allow pop-ups for this site to print 80mm KOT tickets.",
        type: "warning",
      });
      return;
    }

    const hotelName = selectedBranch?.name || localStorage.getItem("billing_hotel_name") || "Hotel Management POS";
    const hotelAddress = selectedBranch?.address || localStorage.getItem("billing_address") || "";
    const kotNum = kot.kotNumber || `KOT-${kot.id}`;
    const orderNum = kot.orderNumber || (kot.orderId ? `ORD-${kot.orderId}` : "-");
    const tableDisplay = kot.tableName || kot.tableNumber || "Direct / Quick Order";
    const serverName = (kot as any).server || (kot as any).waiterName || (kot as any).staffName || "Counter";
    const guestDisplay = kot.guestName || kot.customerName || "Walk-in Guest";
    const instructions = kot.instructions || "";

    const kotDate = kot.createdAt ? new Date(kot.createdAt) : new Date();
    const dateFormatted = !isNaN(kotDate.getTime())
      ? kotDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "-";
    const timeFormatted = !isNaN(kotDate.getTime())
      ? kotDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "-";

    const items = kot.items || [];
    const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || (it as any).qty || 1), 0);

    const isAutoGeneratedNote = Boolean(
      instructions &&
      (instructions.startsWith("Order ORD-") ||
       instructions.startsWith("Order for ") ||
       instructions === "Order" ||
       instructions.trim() === "")
    );

    const itemsRowsHtml = items.length > 0
      ? items.map((it, idx) => {
          const name = it.name || (it as any).itemName || "Food Item";
          const qty = Number(it.quantity || (it as any).qty || 1);
          const note = (it as any).notes || (it as any).instruction || (it as any).specialInstructions || "";
          return `
            <tr>
              <td class="col-sn">${idx + 1}</td>
              <td class="col-item">
                <div class="item-name">${name}</div>
                ${note ? `<div class="item-note">&#8627; ${note}</div>` : ""}
              </td>
              <td class="col-qty">&#215; ${qty}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="3" style="text-align:center; padding: 8px; font-size: 11px;">No items in ticket</td></tr>`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>KOT_${kotNum}_80mm</title>
  <style>
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #FFFFFF !important;
        color: #000000 !important;
        height: auto !important;
        overflow: visible !important;
      }
      .kot-thermal-receipt {
        width: 74mm !important;
        max-width: 74mm !important;
        margin: 0 auto !important;
        padding: 2mm 1mm 3mm 1mm !important;
      }
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 80mm !important;
      max-width: 80mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      font-size: 11px !important;
      line-height: 1.3 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      height: auto !important;
      overflow: visible !important;
    }
    .kot-thermal-receipt {
      width: 74mm !important;
      max-width: 74mm !important;
      margin: 0 auto !important;
      padding: 2mm 1mm 3mm 1mm !important;
      background: #FFFFFF !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .hotel-name {
      font-size: 15px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      line-height: 1.2 !important;
      margin-bottom: 2px !important;
    }
    .hotel-sub {
      font-size: 9.5px !important;
      color: #222 !important;
      margin-bottom: 4px !important;
    }
    .ticket-badge {
      display: inline-block !important;
      font-size: 11.5px !important;
      font-weight: 900 !important;
      letter-spacing: 0.8px !important;
      border: 1.5px solid #000 !important;
      padding: 2.5px 10px !important;
      margin: 3px auto 4px !important;
      text-transform: uppercase !important;
    }
    .rule-dashed {
      border: none !important;
      border-top: 1.5px dashed #000 !important;
      margin: 4px 0 !important;
      height: 0 !important;
      width: 100% !important;
    }
    .meta-box {
      width: 100% !important;
      margin: 3px 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }
    .meta-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      width: 100% !important;
      padding: 1.5px 0 !important;
      font-size: 11px !important;
    }
    .meta-label {
      color: #333 !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      flex-shrink: 0 !important;
      padding-right: 6px !important;
    }
    .meta-val {
      font-weight: 700 !important;
      color: #000 !important;
      text-align: right !important;
      word-break: break-word !important;
    }
    .table-highlight-row {
      border: 1px solid #000 !important;
      background: #f4f4f4 !important;
      border-radius: 4px !important;
      padding: 3px 6px !important;
      margin: 2px 0 3px 0 !important;
    }
    .table-highlight-row .meta-label {
      font-size: 11.5px !important;
      font-weight: 900 !important;
      color: #000 !important;
    }
    .table-highlight-row .meta-val {
      font-size: 14.5px !important;
      font-weight: 900 !important;
      letter-spacing: 0.5px !important;
    }
    .kot-bold {
      font-weight: 800 !important;
      font-size: 11.5px !important;
    }
    .items-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 4px 0 !important;
      table-layout: fixed !important;
    }
    .items-table th {
      border-top: 1.5px solid #000 !important;
      border-bottom: 1.5px solid #000 !important;
      padding: 3.5px 1px !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
    }
    .col-sn {
      width: 9% !important;
      text-align: left !important;
      font-size: 10.5px !important;
      padding-left: 1px !important;
      font-weight: 700 !important;
    }
    .col-item {
      width: 69% !important;
      text-align: left !important;
      padding-left: 2px !important;
    }
    .col-qty {
      width: 22% !important;
      text-align: right !important;
      padding-right: 2px !important;
      white-space: nowrap !important;
      font-size: 13.5px !important;
      font-weight: 900 !important;
      font-variant-numeric: tabular-nums !important;
    }
    .items-table td {
      padding: 3.5px 1px !important;
      border-bottom: 1px dotted #ccc !important;
      vertical-align: top !important;
      font-size: 11px !important;
    }
    .item-name {
      font-weight: 800 !important;
      font-size: 11.5px !important;
      line-height: 1.25 !important;
      word-break: break-word !important;
    }
    .item-note {
      font-size: 9.5px !important;
      font-style: italic !important;
      color: #333 !important;
      margin-top: 1px !important;
      padding-left: 4px !important;
    }
    .summary-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 4px 1px !important;
      border-top: 1.5px solid #000 !important;
      border-bottom: 1.5px solid #000 !important;
      font-size: 11.5px !important;
      font-weight: 800 !important;
      margin: 5px 0 !important;
    }
    .total-qty-badge {
      font-size: 13.5px !important;
      font-weight: 900 !important;
    }
    .instructions-box {
      border: 1px dashed #000 !important;
      padding: 4px 6px !important;
      margin: 5px 0 !important;
      font-size: 10px !important;
      background: #fafafa !important;
      border-radius: 2px !important;
    }
    .instructions-title {
      font-weight: 900 !important;
      text-transform: uppercase !important;
      margin-bottom: 2px !important;
    }
    .instructions-text {
      font-size: 10px !important;
      line-height: 1.3 !important;
      word-break: break-word !important;
    }
    .footer-note {
      text-align: center !important;
      font-size: 9px !important;
      color: #444 !important;
      margin-top: 6px !important;
      padding-top: 3px !important;
      border-top: 1px dashed #000 !important;
      letter-spacing: 0.3px !important;
    }
  </style>
</head>
<body>
  <div class="kot-thermal-receipt">
    <div class="text-center">
      <div class="hotel-name">${hotelName}</div>
      ${hotelAddress ? `<div class="hotel-sub">${hotelAddress}</div>` : ""}
      <div class="ticket-badge">KITCHEN ORDER TICKET (KOT)</div>
    </div>

    <div class="rule-dashed"></div>

    <div class="meta-box">
      <div class="meta-row table-highlight-row">
        <span class="meta-label">TABLE:</span>
        <span class="meta-val">${tableDisplay}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">KOT NO:</span>
        <span class="meta-val kot-bold">#${kotNum}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">ORDER NO:</span>
        <span class="meta-val">${orderNum}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">DATE &amp; TIME:</span>
        <span class="meta-val">${dateFormatted} &bull; ${timeFormatted}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">WAITER/STAFF:</span>
        <span class="meta-val">${serverName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">GUEST:</span>
        <span class="meta-val">${guestDisplay}</span>
      </div>
    </div>

    <div class="rule-dashed"></div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="col-sn">#</th>
          <th class="col-item">ITEM DESCRIPTION</th>
          <th class="col-qty">QTY</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
    </table>

    <div class="summary-row">
      <span>TOTAL ITEMS: <strong>${items.length}</strong></span>
      <span>TOTAL QTY: <strong class="total-qty-badge">&#215; ${totalQty}</strong></span>
    </div>

    ${(!isAutoGeneratedNote && instructions && instructions.trim()) ? `
      <div class="instructions-box">
        <div class="instructions-title">&#9888; KITCHEN SPECIAL NOTE:</div>
        <div class="instructions-text">${instructions}</div>
      </div>
    ` : ""}

    <div class="footer-note">
      * KOT GENERATED &bull; FOR KITCHEN &amp; PANTRY USE ONLY *
    </div>
  </div>

  <script>
    window.onload = function () {
      try {
        var el = document.querySelector(".kot-thermal-receipt") || document.body;
        var hPx = el.scrollHeight || el.offsetHeight;
        var hMm = Math.ceil((hPx * 25.4) / 96) + 4;
        if (hMm < 50) hMm = 50;
        var dynamicPageStyle = document.createElement("style");
        dynamicPageStyle.innerHTML = "@page { size: 80mm " + hMm + "mm !important; margin: 0mm !important; }";
        document.head.appendChild(dynamicPageStyle);
      } catch (err) {
        console.error("Page size calculation err:", err);
      }
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
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
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, [selectedBranch]);

  // =================================================
  // 80MM THERMAL CUSTOMER BILL / INVOICE PRINTER (0 BLANK PAGES)
  // =================================================
  const printKotBill80mm = useCallback((kot: KotItem, existingInvoice?: any) => {
    if (!kot) return;
    const printData = mapKotToUniversalPrintData(kot, true, existingInvoice);
    setPrintModalData(printData);
    setIsPrintModalOpen(true);
    return;
    const printWindow = window.open("", "_blank", "width=450,height=700");
    if (!printWindow) {
      dialogService.alert({
        title: "Pop-up Blocked",
        message: "Please allow pop-ups for this site to print 80mm receipts.",
        type: "warning",
      });
      return;
    }

    const billingInfo = getKotBillingInfo(kot);
    const inv = existingInvoice || billingInfo.invoice;
    const totals = calculateKotTotals(kot);

    const hotelName = selectedBranch?.name || localStorage.getItem("billing_hotel_name") || "Hotel Management POS";
    const hotelLogo = localStorage.getItem("billing_logo") || localStorage.getItem("business_logo") || "";
    const hotelAddress = selectedBranch?.address || localStorage.getItem("billing_address") || "";
    const hotelPhone = (selectedBranch as any)?.phone || localStorage.getItem("billing_phone") || "";
    const gstin = (selectedBranch as any)?.gstin || localStorage.getItem("billing_gstin") || "";

    const invNumber = inv?.invoiceNumber || (inv?.id ? `INV-${inv.id}` : `EST-${kot.kotNumber || kot.id}`);
    const isPaid = inv ? String(inv.status).toUpperCase() === "PAID" : billingInfo.isPaid;
    const statusText = isPaid ? "PAID" : "UNPAID (PAY LATER)";

    const billDate = inv?.createdAt ? new Date(inv.createdAt) : (kot.createdAt ? new Date(kot.createdAt) : new Date());
    const dateFormatted = !isNaN(billDate.getTime())
      ? billDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "-";
    const timeFormatted = !isNaN(billDate.getTime())
      ? billDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "-";

    const tableDisplay = kot.tableName || kot.tableNumber || inv?.tableNumber || "Direct Order";
    const guestDisplay = kot.guestName || kot.customerName || inv?.guestName || inv?.customerName || "Walk-in Guest";
    const kotNum = kot.kotNumber || `KOT-${kot.id}`;

    const items = (inv?.items && inv.items.length > 0) ? inv.items : (kot.items || []);

    const formatMoney = (n: number) => {
      return Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const itemsRowsHtml = items.length > 0
      ? items.map((it: any) => {
          const name = it.name || it.itemName || it.description || "Item";
          const qty = Number(it.quantity || it.qty || 1);
          const price = Number(it.unitPrice || it.price || 0);
          const total = qty * price;
          return `
            <tr>
              <td class="col-desc">${name}</td>
              <td class="col-qty">${qty}</td>
              <td class="col-rate">&#8377;${formatMoney(price)}</td>
              <td class="col-amt">&#8377;${formatMoney(total)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="4" style="text-align:center; padding: 6px; font-size: 10px;">Order items</td></tr>`;

    const subtotalVal = inv?.subtotal !== undefined ? Number(inv.subtotal) : totals.subtotal;
    const discountVal = Number(inv?.discountAmount || 0);
    const taxableVal = Math.max(0, subtotalVal - discountVal);
    const grandTotalVal = inv?.grandTotal !== undefined ? Number(inv.grandTotal) : (inv?.totalAmount !== undefined ? Number(inv.totalAmount) : totals.grandTotal);
    const cgstVal = inv?.cgst !== undefined ? Number(inv.cgst) : (totals.gst / 2);
    const sgstVal = inv?.sgst !== undefined ? Number(inv.sgst) : (totals.gst / 2);
    const paymentMethod = inv?.paymentMethod || "CASH";

    const footerMsg = localStorage.getItem("billing_footer") || "Thank you for dining with us! Please visit again.";

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bill_${invNumber}_80mm</title>
  <style>
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #FFFFFF !important;
        color: #000000 !important;
        height: auto !important;
        overflow: visible !important;
      }
      .bill-thermal-receipt {
        width: 76mm !important;
        max-width: 76mm !important;
        margin: 0 auto !important;
        padding: 2mm 1mm 3mm 1mm !important;
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
      height: auto !important;
      overflow: visible !important;
    }
    .bill-thermal-receipt {
      width: 76mm !important;
      max-width: 76mm !important;
      margin: 0 auto !important;
      padding: 2mm 1mm 3mm 1mm !important;
      background: #FFFFFF !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .hotel-logo {
      text-align: center !important;
      margin-bottom: 3px !important;
    }
    .hotel-logo img {
      max-height: 44px !important;
      max-width: 120px !important;
      object-fit: contain !important;
    }
    .hotel-name {
      font-size: 15px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      line-height: 1.2 !important;
      margin-bottom: 2px !important;
    }
    .hotel-sub {
      font-size: 9px !important;
      color: #222 !important;
      margin: 1px 0 !important;
      line-height: 1.25 !important;
      word-break: break-word !important;
    }
    .title-badge {
      font-size: 10.5px !important;
      font-weight: 900 !important;
      letter-spacing: 1px !important;
      margin: 4px 0 2px !important;
      padding: 2px 0 !important;
      text-transform: uppercase !important;
    }
    .rule-dashed {
      border: none !important;
      border-top: 1px dashed #000 !important;
      margin: 4px 0 !important;
      height: 0 !important;
    }
    .meta-box {
      border: 1px dashed #555 !important;
      border-radius: 4px !important;
      padding: 4px 5px !important;
      background: #fafafa !important;
      margin: 3px 0 5px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2.5px !important;
      font-size: 9.5px !important;
    }
    .meta-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
    }
    .meta-label {
      color: #333 !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      flex-shrink: 0 !important;
      padding-right: 6px !important;
    }
    .meta-val {
      color: #000 !important;
      font-weight: 700 !important;
      text-align: right !important;
      word-break: break-word !important;
    }
    .status-paid {
      color: #15803d !important;
      font-weight: 800 !important;
    }
    .status-unpaid {
      color: #b45309 !important;
      font-weight: 800 !important;
    }
    .items-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 9.5px !important;
      margin: 4px 0 !important;
      table-layout: fixed !important;
    }
    .items-table th {
      border-top: 1px dashed #000 !important;
      border-bottom: 1px dashed #000 !important;
      padding: 3.5px 1px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      font-size: 8.5px !important;
    }
    .col-desc {
      width: 44% !important;
      text-align: left !important;
      padding-left: 1px !important;
      font-weight: 600 !important;
      word-break: break-word !important;
    }
    .col-qty {
      width: 12% !important;
      text-align: center !important;
      font-variant-numeric: tabular-nums !important;
    }
    .col-rate {
      width: 22% !important;
      text-align: right !important;
      font-variant-numeric: tabular-nums !important;
    }
    .col-amt {
      width: 22% !important;
      text-align: right !important;
      padding-right: 1px !important;
      font-weight: 700 !important;
      font-variant-numeric: tabular-nums !important;
    }
    .items-table td {
      padding: 3px 1px !important;
      border-bottom: 1px dotted #ccc !important;
      vertical-align: top !important;
      font-size: 9px !important;
    }
    .totals-box {
      width: 100% !important;
      margin-top: 4px !important;
      border-top: 1px dashed #000 !important;
      padding-top: 3px !important;
    }
    .totals-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      padding: 1.5px 0 !important;
      font-size: 9.5px !important;
    }
    .grand-total-row {
      border-top: 1.5px solid #000 !important;
      border-bottom: 1.5px solid #000 !important;
      padding: 4px 0 !important;
      margin: 4px 0 !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
    .footer-box {
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
  <div class="bill-thermal-receipt">
    <div class="text-center">
      ${hotelLogo ? `<div class="hotel-logo"><img src="${hotelLogo}" alt="Logo" /></div>` : ""}
      <div class="hotel-name">${hotelName}</div>
      ${hotelAddress ? `<div class="hotel-sub">${hotelAddress}</div>` : ""}
      ${(hotelPhone || gstin) ? `<div class="hotel-sub">${hotelPhone ? `Phone: ${hotelPhone}` : ""}${hotelPhone && gstin ? " | " : ""}${gstin ? `GSTIN: ${gstin}` : ""}</div>` : ""}
      <div class="title-badge">${inv ? "TAX INVOICE" : "ESTIMATE / BILL"}</div>
    </div>

    <div class="rule-dashed"></div>

    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">INVOICE NO:</span>
        <strong class="meta-val">${invNumber}</strong>
      </div>
      <div class="meta-row">
        <span class="meta-label">DATE &amp; TIME:</span>
        <strong class="meta-val">${dateFormatted} &bull; ${timeFormatted}</strong>
      </div>
      <div class="meta-row">
        <span class="meta-label">TABLE:</span>
        <strong class="meta-val" style="font-size: 11px;">${tableDisplay}</strong>
      </div>
      <div class="meta-row">
        <span class="meta-label">GUEST:</span>
        <strong class="meta-val">${guestDisplay}</strong>
      </div>
      <div class="meta-row">
        <span class="meta-label">KOT NO:</span>
        <strong class="meta-val">#${kotNum}</strong>
      </div>
      <div class="meta-row">
        <span class="meta-label">STATUS:</span>
        <strong class="meta-val ${isPaid ? 'status-paid' : 'status-unpaid'}">${statusText}</strong>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="col-desc">ITEM</th>
          <th class="col-qty">QTY</th>
          <th class="col-rate">RATE</th>
          <th class="col-amt">AMT</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal:</span>
        <strong>&#8377;${formatMoney(subtotalVal)}</strong>
      </div>
      ${discountVal > 0 ? `
        <div class="totals-row">
          <span>Discount:</span>
          <strong>- &#8377;${formatMoney(discountVal)}</strong>
        </div>
        <div class="totals-row">
          <span>Taxable Amount:</span>
          <strong>&#8377;${formatMoney(taxableVal)}</strong>
        </div>
      ` : ""}
      <div class="totals-row">
        <span>CGST (2.5%):</span>
        <strong>+ &#8377;${formatMoney(cgstVal)}</strong>
      </div>
      <div class="totals-row">
        <span>SGST (2.5%):</span>
        <strong>+ &#8377;${formatMoney(sgstVal)}</strong>
      </div>
      <div class="grand-total-row">
        <span>GRAND TOTAL:</span>
        <span>&#8377;${formatMoney(grandTotalVal)}</span>
      </div>
      <div class="totals-row">
        <span>Payment Method:</span>
        <strong style="text-transform:uppercase;">${paymentMethod}</strong>
      </div>
      <div class="totals-row">
        <span>Payment Status:</span>
        <strong class="${isPaid ? 'status-paid' : 'status-unpaid'}">${statusText}</strong>
      </div>
    </div>

    <div class="footer-box">
      ${footerMsg}
    </div>
  </div>

  <script>
    window.onload = function () {
      try {
        var el = document.querySelector(".bill-thermal-receipt") || document.body;
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
      }, 250);
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
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, [getKotBillingInfo, calculateKotTotals, selectedBranch]);

  const handlePrintKot = (kot: KotItem) => {
    printKotTicket80mm(kot);
  };

  return (
    <div
      style={{
        padding: "6px 0 24px",
        background: "#FFF9F3",
        minHeight: "100%",
        fontFamily: "Segoe UI, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        {/* LEFT HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              minWidth: "48px",
              borderRadius: "10px",
              background: "#8B3E16",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(139, 62, 22, 0.25)",
            }}
          >
            <ReceiptIndianRupee size={25} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#241C18",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("kotManagement", "KOT Management")}
              </h1>
              <span
                style={{
                  backgroundColor: "#E5DCD5",
                  color: "#5C4A3E",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {filteredKots.length} {t("active", "Active")}
              </span>
            </div>

            <p
              style={{
                margin: "4px 0 0",
                color: "#716963",
                fontSize: "14px",
              }}
            >
              {t("liveKotTracking", "Live Order Tickets (KOT) tracking & seamless billing integration")}
            </p>
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* REFRESH BUTTON */}
          <button
            onClick={() => fetchKots()}
            disabled={loading || refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 14px",
              background: "#FFFFFF",
              border: "1px solid #E5DCD5",
              borderRadius: "8px",
              color: "#5C4A3E",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title={t("refreshKots", "Refresh KOTs")}
          >
            <RefreshCw
              size={15}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>{t("refresh", "Refresh")}</span>
          </button>

          {/* DATE RANGE FILTER: START DATE & END DATE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              border: `1px solid ${dateValidationError ? "#EF4444" : "#E5DCD5"}`,
              borderRadius: "8px",
              padding: "5px 12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              position: "relative",
            }}
          >
            <CalendarDays size={16} color="#8B3E16" style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6B5E55" }}>{t("from", "From")}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                style={{
                  border: "1px solid #E5DCD5",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  color: "#241C18",
                  background: "#FAFAF9",
                  outline: "none",
                }}
                aria-label="Start Date"
                title="Filter records starting from this date"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6B5E55" }}>{t("to", "To")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                style={{
                  border: "1px solid #E5DCD5",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  color: "#241C18",
                  background: "#FAFAF9",
                  outline: "none",
                }}
                aria-label="End Date"
                title="Filter records up to this date"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={clearDateFilters}
                style={{
                  border: "none",
                  background: "#F5EFE9",
                  color: "#8B3E16",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                title="Clear date range filters and restore default results"
              >
                <X size={13} />
                <span>{t("clear", "Clear")}</span>
              </button>
            )}

            {dateValidationError && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#DC2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  zIndex: 10,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                {dateValidationError}
              </div>
            )}
          </div>

          {/* DATE TOGGLE: TODAY / ALL DATES */}
          <button
            onClick={() => setFilterAllDates(!filterAllDates)}
            style={{
              padding: "10px 14px",
              background: filterAllDates ? "#8B3E16" : "#FFFFFF",
              color: filterAllDates ? "#FFFFFF" : "#5C4A3E",
              border: `1px solid ${filterAllDates ? "#8B3E16" : "#E5DCD5"}`,
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {filterAllDates ? t("showingAllDates", "Showing: All Dates") : t("showAllDates", "Show All Dates")}
          </button>

          {/* DATE PICKER */}
          {!filterAllDates && (
            <div ref={calendarRef} style={{ position: "relative" }}>
              <div
                onClick={() => setCalendarOpen(!calendarOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#FFFFFF",
                  border: "1px solid #E5DCD5",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#241C18",
                  fontWeight: 600,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <CalendarDays size={16} color="#8B3E16" />
                <span>{formatSelectedDate}</span>
                <ChevronDown size={14} color="#777" />
              </div>

              {calendarOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "310px",
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E5DCD5",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    padding: "16px",
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      onClick={previousMonth}
                      style={{
                        border: "none",
                        background: "#F5EFE9",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#241C18" }}>
                      {monthName}
                    </span>
                    <button
                      onClick={nextMonth}
                      style={{
                        border: "none",
                        background: "#F5EFE9",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#9C8E85",
                      marginBottom: "8px",
                    }}
                  >
                    <div>Su</div>
                    <div>Mo</div>
                    <div>Tu</div>
                    <div>We</div>
                    <div>Th</div>
                    <div>Fr</div>
                    <div>Sa</div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: "4px",
                    }}
                  >
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === calendarMonth.getMonth() &&
                        selectedDate.getFullYear() === calendarMonth.getFullYear();

                      return (
                        <button
                          key={day}
                          onClick={() => selectDate(day)}
                          style={{
                            border: "none",
                            borderRadius: "6px",
                            padding: "7px 0",
                            background: isSelected ? "#8B3E16" : "transparent",
                            color: isSelected ? "#FFFFFF" : "#241C18",
                            fontWeight: isSelected ? 700 : 500,
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px solid #F0E8E2",
                      textAlign: "right",
                    }}
                  >
                    <button
                      onClick={goToToday}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#8B3E16",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {t("jumpToToday", "Jump to Today")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          FILTER BAR: SEARCH & STATUS TABS
      ================================================= */}
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
        {/* SEARCH BAR */}
        <div
          style={{
            flex: "1 1 320px",
            background: "#FFFFFF",
            border: "1px solid #E5DCD5",
            borderRadius: "9px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: "10px",
            boxSizing: "border-box",
          }}
        >
          <Search size={18} color="#777" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchKotPlaceholder", "Search by KOT number, table, or guest...")}
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "14px",
              color: "#333",
              background: "transparent",
              fontFamily: "Segoe UI, sans-serif",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#999",
                padding: 0,
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* STATUS TABS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "ALL", label: t("allKots", "All KOTs") },
            { id: "ACTIVE", label: t("activeOrders", "Active Orders") },
            { id: "COMPLETED", label: t("billedCompleted", "Billed / Completed") },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${isActive ? "#8B3E16" : "#E5DCD5"}`,
                  background: isActive ? "#8B3E16" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#5C4A3E",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================
          KOT TABLE / LIST
      ================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5DCD5",
          borderRadius: "11px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          width: "100%",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ minWidth: "1200px" }}>
          {/* TABLE HEADER */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "105px 110px 135px minmax(170px, 1fr) 45px 115px 110px 340px",
              alignItems: "center",
              padding: "14px 20px",
              background: "#FFF9F3",
              borderBottom: "1px solid #E5DCD5",
              color: "#7B3515",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              boxSizing: "border-box",
              gap: "12px",
            }}
          >
            <div>{t("kotNo", "KOT No.")}</div>
            <div>{t("table", "Table")}</div>
            <div>{t("guestAndOrder", "Guest & Order")}</div>
            <div>{t("itemsBreakdown", "Items Breakdown")}</div>
            <div style={{ textAlign: "center" }}>{t("qty", "Qty")}</div>
            <div>{t("kitchenStatus", "Kitchen Status")}</div>
            <div>{t("billingStatus", "Billing Status")}</div>
            <div style={{ textAlign: "right" }}>{t("actions", "Actions")}</div>
          </div>

          {/* LOADING INDICATOR */}
          {loading && (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#77706B",
                fontSize: "14px",
              }}
            >
              <RefreshCw
                size={24}
                color="#8B3E16"
                style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }}
              />
              <div>{t("loadingKots", "Loading live Order Tickets (KOT)...")}</div>
            </div>
          )}

          {/* TABLE ROWS (10 records per page) */}
          {!loading &&
            (() => {
              const startIndex = (currentPage - 1) * pageSize;
              const endIndex = Math.min(filteredKots.length, startIndex + pageSize);
              const paginatedKots = filteredKots.slice(startIndex, endIndex);

              return paginatedKots.map((kot, pageIndex) => {
                const totalQty = (kot.items || []).reduce(
                  (acc, it) => acc + (Number(it.quantity || it.qty) || 1),
                  0
                );

                const statusStyle = getStatusBadge(kot.status);
                const nextAction = getNextAction(kot);
                const billingInfo = getKotBillingInfo(kot);

                let billingBadgeStyle = {
                  label: t("notBilled", "Not Billed"),
                  bg: "#F3F4F6",
                  color: "#4B5563",
                  border: "#E5E7EB",
                };

                if (billingInfo.isPaid) {
                  billingBadgeStyle = {
                    label: t("paid", "Paid"),
                    bg: "#ECFDF5",
                    color: "#065F46",
                    border: "#A7F3D0",
                  };
                } else if (billingInfo.isBilled) {
                  billingBadgeStyle = {
                    label: t("unpaid", "Unpaid"),
                    bg: "#FFFBEB",
                    color: "#92400E",
                    border: "#FDE68A",
                  };
                }

                // Format time
                const timeFormatted = kot.createdAt
                  ? new Date(kot.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--";

                return (
                  <div
                    key={kot.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "105px 110px 135px minmax(170px, 1fr) 45px 115px 110px 340px",
                      alignItems: "center",
                      padding: "14px 20px",
                      minHeight: "72px",
                      borderBottom:
                        pageIndex === paginatedKots.length - 1
                          ? "none"
                          : "1px solid #EEE7E2",
                      boxSizing: "border-box",
                      gap: "12px",
                      backgroundColor:
                        pageIndex % 2 === 0 ? "#FFFFFF" : "#FDFAF7",
                    }}
                  >
                {/* KOT NUMBER & TIME */}
                <div>
                  <div
                    style={{
                      color: "#241C18",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    #{kot.kotNumber || `KOT-${kot.id}`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#8C827A",
                      fontSize: "11px",
                      marginTop: "3px",
                    }}
                  >
                    <Clock3 size={12} color="#B4510A" />
                    <span>{timeFormatted}</span>
                  </div>
                </div>

                {/* TABLE NUMBER */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#514A45",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <Armchair size={17} color="#B4510A" />
                  <span>{kot.tableName || kot.tableNumber || `${t("table", "Table")} --`}</span>
                </div>

                {/* GUEST & ORDER */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      color: "#241C18",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <User size={13} color="#716963" />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "130px",
                      }}
                    >
                      {kot.guestName || kot.customerName || t("walkInGuest", "Walk-in Guest")}
                    </span>
                  </div>
                  {kot.orderNumber && (
                    <div
                      style={{
                        color: "#9C8E85",
                        fontSize: "11px",
                        marginTop: "2px",
                      }}
                    >
                      {t("orderNo", "Order")}: {kot.orderNumber}
                    </div>
                  )}
                </div>

                {/* ORDER ITEMS LIST */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    minWidth: 0,
                  }}
                >
                  {(kot.items && kot.items.length > 0) ? (
                    kot.items.map((it, idx) => (
                      <span
                        key={it.id || idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 8px",
                          background: "#FFF9F3",
                          border: "1px solid #F0D5BF",
                          borderRadius: "6px",
                          color: "#4E4038",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                          fontWeight: 500,
                        }}
                      >
                        {it.name || it.itemName} × {it.quantity || it.qty || 1}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#9C8E85", fontSize: "12px" }}>
                      {t("noItemsSpecified", "No items specified")}
                    </span>
                  )}
                  {kot.instructions && (
                    <div
                      style={{
                        width: "100%",
                        fontSize: "11px",
                        color: "#B4510A",
                        fontStyle: "italic",
                        marginTop: "3px",
                      }}
                    >
                      {t("note", "Note")}: {kot.instructions}
                    </div>
                  )}
                </div>

                {/* TOTAL QUANTITY */}
                <div
                  style={{
                    textAlign: "center",
                    color: "#5B1F0B",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  {totalQty}
                </div>

                {/* KITCHEN STATUS BADGE */}
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* BILLING STATUS BADGE */}
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: billingBadgeStyle.bg,
                      color: billingBadgeStyle.color,
                      border: `1px solid ${billingBadgeStyle.border}`,
                    }}
                  >
                    {billingInfo.isPaid && <CheckCircle2 size={11} />}
                    {billingBadgeStyle.label}
                  </span>
                  {billingInfo.invoiceNumber && (
                    <div style={{ fontSize: "10px", color: "#9C8E85", marginTop: "2px" }}>
                      #{billingInfo.invoiceNumber}
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS: Cleanly aligned with 30px consistent height and no wrapping */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "6px",
                    flexWrap: "nowrap",
                    width: "100%",
                  }}
                >
                  {/* KOT LIFECYCLE PROGRESSION BUTTON */}
                  {(kot.status === "PENDING" ||
                    kot.status === "NEW" ||
                    kot.status === "SENT_TO_KITCHEN" ||
                    kot.status === "SENT") && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, "PREPARING")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        height: "30px",
                        padding: "0 9px",
                        borderRadius: "6px",
                        background: "#0284C7",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      title={t("startPreparing", "Start Preparing in Kitchen")}
                    >
                      <ChefHat size={13} />
                      <span>{t("preparing", "Preparing")}</span>
                    </button>
                  )}

                  {(kot.status === "PREPARING" || kot.status === "ACCEPTED") && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, "READY")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        height: "30px",
                        padding: "0 9px",
                        borderRadius: "6px",
                        background: "#059669",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      title={t("markReady", "Mark Food Ready for Service")}
                    >
                      <CheckCircle2 size={13} />
                      <span>{t("ready", "Ready")}</span>
                    </button>
                  )}

                  {kot.status === "READY" && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, "SERVED")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        height: "30px",
                        padding: "0 9px",
                        borderRadius: "6px",
                        background: "#16A34A",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      title={t("markServed", "Mark Served to Customer")}
                    >
                      <UtensilsCrossed size={13} />
                      <span>{t("served", "Served")}</span>
                    </button>
                  )}

                  {/* BILL / PAY BUTTON (Opens Two Billing Options Modal) */}
                  <button
                    onClick={() => {
                      setBillingModalKot(kot);
                      setBillingStep("CHOICE");
                      setBillingSuccessMessage("");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      height: "30px",
                      padding: "0 10px",
                      borderRadius: "6px",
                      background: billingInfo.isPaid ? "#059669" : "#8B3E16",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    title={t("billingAndSettlement", "Generate Bill or Settle Payment")}
                  >
                    <CreditCard size={13} />
                    <span>{billingInfo.isPaid ? t("settled", "Settled") : t("billPay", "Bill / Pay")}</span>
                  </button>

                  {/* EDIT BILL / ORDER BUTTON */}
                  <button
                    onClick={() => {
                      navigate(
                        `/hotelbilling?kotNumber=${encodeURIComponent(
                          kot.kotNumber || ""
                        )}&orderId=${kot.orderId || ""}&tableId=${
                          kot.tableId || ""
                        }&action=edit`
                      );
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      height: "30px",
                      padding: "0 9px",
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      color: "#7B3515",
                      border: "1px solid #D6C2B4",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    title={t("editBill", "Edit Bill in Billing Module")}
                  >
                    <FileEdit size={12} />
                    <span>{t("editBill", "Edit Bill")}</span>
                  </button>

                  {/* PRINT KOT BUTTON (80MM THERMAL) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      printKotTicket80mm(kot);
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      padding: 0,
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      color: "#18181B",
                      border: "1.5px solid #27272A",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title={t("printKotThermal", "Print KOT Ticket (80mm)")}
                  >
                    <Printer size={15} strokeWidth={2.4} color="#18181B" />
                  </button>

                  {/* PRINT BILL BUTTON (80MM THERMAL) */}
                  {billingInfo.isBilled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printKotBill80mm(kot, billingInfo.invoice);
                      }}
                      style={{
                        width: "30px",
                        height: "30px",
                        padding: 0,
                        borderRadius: "6px",
                        background: "#ECFDF5",
                        color: "#059669",
                        border: "1.5px solid #059669",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      title={t("printBillThermal", "Print Bill Receipt (80mm)")}
                    >
                      <ReceiptIndianRupee size={15} strokeWidth={2.4} color="#059669" />
                    </button>
                  )}

                  {/* VIEW DETAILS MODAL BUTTON */}
                  <button
                    onClick={() => setSelectedKotModal(kot)}
                    style={{
                      width: "30px",
                      height: "30px",
                      padding: 0,
                      borderRadius: "6px",
                      background: "#F5EFE9",
                      color: "#4E4038",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title={t("viewDetails", "View KOT Details")}
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            );
          });
        })()}

        {/* NO RESULTS */}
        {!loading && filteredKots.length === 0 && (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              color: "#77706B",
              fontSize: "14px",
            }}
          >
            <AlertCircle
              size={32}
              color="#B4510A"
              style={{ marginBottom: "8px", opacity: 0.6 }}
            />
            <div style={{ fontWeight: 600, color: "#3B2E26" }}>
              {t("noKotsFound", "No Order Tickets (KOT) found.")}
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {search || startDate || endDate
                ? t("tryAdjustingSearch", "Try adjusting your search or date criteria.")
                : t("createKotsFromTables", 'Create KOTs from the "Tables" module to view them here.')}
            </div>
          </div>
        )}

        {/* TABLE PAGINATION */}
        {!loading && filteredKots.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalRecords={filteredKots.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            accentColor="#8B3E16"
          />
        )}
        </div>
      </div>

      {/* =================================================
          TWO BILLING OPTIONS MODAL (OPTION A: PAY NOW / OPTION B: PAY LATER)
      ================================================= */}
      {billingModalKot && (
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
          onClick={() => {
            if (!isProcessingBill) {
              setBillingModalKot(null);
              setBillingStep("CHOICE");
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #E5DCD5",
              boxShadow: "0 24px 50px rgba(0,0,0,0.22)",
              width: "min(560px, 100%)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: "24px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#8B3E16",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ReceiptIndianRupee size={22} />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#241C18",
                    }}
                  >
                    {t("billingAndSettlement", "Billing & Settlement")}
                  </h2>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12.5px",
                      color: "#716963",
                    }}
                  >
                    KOT #{billingModalKot.kotNumber || billingModalKot.id} · {billingModalKot.tableName || billingModalKot.tableNumber || t("table", "Table")} · {billingModalKot.guestName || billingModalKot.customerName || t("walkInGuest", "Guest")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isProcessingBill) {
                    setBillingModalKot(null);
                    setBillingStep("CHOICE");
                  }
                }}
                disabled={isProcessingBill}
                style={{
                  border: "none",
                  background: "#F5EFE9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isProcessingBill ? "not-allowed" : "pointer",
                  color: "#6B5E55",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* SUCCESS STEP */}
            {billingStep === "SUCCESS" ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#ECFDF5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#065F46",
                  }}
                >
                  {t("settlementSuccessful", "Settlement Successful!")}
                </h3>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "13.5px",
                    color: "#374151",
                    lineHeight: 1.5,
                  }}
                >
                  {billingSuccessMessage}
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <button
                    onClick={() => printKotBill80mm(billingModalKot, lastGeneratedInvoice)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 18px",
                      borderRadius: "8px",
                      background: "#059669",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                    }}
                  >
                    <Printer size={15} />
                    <span>{t("printBill80mm", "Print Bill (80mm)")}</span>
                  </button>

                  <button
                    onClick={() => printKotTicket80mm(billingModalKot)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      border: "1.5px solid #27272A",
                      color: "#18181B",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={15} />
                    <span>{t("printKot80mm", "Print KOT (80mm)")}</span>
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    onClick={() => {
                      setBillingModalKot(null);
                      setBillingStep("CHOICE");
                    }}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      background: "#8B3E16",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {t("doneClose", "Done / Close")}
                  </button>
                  <button
                    onClick={() => {
                      setBillingModalKot(null);
                      setBillingStep("CHOICE");
                      navigate(
                        `/hotelbilling?kotNumber=${encodeURIComponent(
                          billingModalKot.kotNumber || ""
                        )}&orderId=${billingModalKot.orderId || ""}&tableId=${
                          billingModalKot.tableId || ""
                        }`
                      );
                    }}
                    style={{
                      padding: "9px 18px",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      border: "1px solid #D6C2B4",
                      color: "#8B3E16",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {t("viewInvoices", "View Invoices")}
                  </button>
                </div>
              </div>
            ) : (
              /* CHOICE & SETTLEMENT VIEW */
              (() => {
                const totals = calculateKotTotals(billingModalKot);
                const billingInfo = getKotBillingInfo(billingModalKot);

                return (
                  <div>
                    {/* ORDER ITEMS & BREAKDOWN CARD */}
                    <div
                      style={{
                        background: "#FFF9F3",
                        border: "1px solid #F0ECE7",
                        borderRadius: "10px",
                        padding: "14px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#8B3E16",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "8px",
                        }}
                      >
                        {t("orderSummary", "Order Summary")}
                      </div>

                      <div
                        style={{
                          maxHeight: "140px",
                          overflowY: "auto",
                          marginBottom: "10px",
                        }}
                      >
                        {(billingModalKot.items || []).map((it, idx) => {
                          const price = Number(it.unitPrice ?? it.price ?? 0);
                          const qty = Number(it.quantity ?? it.qty ?? 1);
                          return (
                            <div
                              key={it.id || idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "12.5px",
                                padding: "4px 0",
                                borderBottom: "1px dashed #EEDDCF",
                                color: "#3B2E26",
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>
                                {it.name || it.itemName || t("items", "Item")} × {qty}
                              </span>
                              <span style={{ fontWeight: 700, color: "#6B5E55" }}>
                                ₹{(price * qty).toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                        {(!billingModalKot.items || billingModalKot.items.length === 0) && (
                          <div style={{ fontSize: "12px", color: "#9C8E85" }}>
                            {t("noItemsSpecified", "No items specified in KOT")}
                          </div>
                        )}
                      </div>

                      {/* FINANCIAL TOTALS */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid #E5DCD5",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", color: "#716963" }}>{t("subtotal", "Subtotal")}</div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#241C18" }}>
                            ₹{totals.subtotal.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#716963" }}>{t("gst", "GST")} (5%)</div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#241C18" }}>
                            ₹{totals.gst.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#FFFFFF",
                            padding: "4px 6px",
                            borderRadius: "6px",
                            border: "1px solid #E5DCD5",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 800, color: "#8B3E16" }}>
                            {t("grandTotal", "Grand Total")}
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#8B3E16" }}>
                            ₹{totals.grandTotal.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* EXISTING INVOICE BANNER */}
                      {billingInfo.isBilled && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "8px 12px",
                            background: billingInfo.isPaid ? "#ECFDF5" : "#FEF3C7",
                            border: `1px solid ${billingInfo.isPaid ? "#A7F3D0" : "#FDE68A"}`,
                            borderRadius: "8px",
                            fontSize: "11.5px",
                            color: billingInfo.isPaid ? "#065F46" : "#92400E",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertCircle size={14} />
                            <span>
                              Existing Invoice #{billingInfo.invoiceNumber || "ID"} ({billingInfo.statusLabel}). Reusing invoice record without creating duplicates.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => printKotBill80mm(billingModalKot, billingInfo.invoice)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#059669",
                              color: "#FFFFFF",
                              border: "none",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Printer size={13} />
                            <span>Print Bill (80mm)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TWO BILLING OPTIONS */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {/* OPTION A: GENERATE BILL & PAY NOW */}
                      <div
                        style={{
                          border: "2px solid #059669",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#F0FDF4",
                          boxShadow: "0 2px 8px rgba(5, 150, 105, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CreditCard size={18} color="#059669" />
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#065F46",
                              }}
                            >
                              {t("optionAPayNow", "Option A: Generate Bill & Pay Now")}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              backgroundColor: "#DCFCE7",
                              color: "#166534",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            {t("freesTableImmediately", "Frees Table Immediately")}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: "12px",
                            color: "#374151",
                            margin: "0 0 12px",
                            lineHeight: 1.4,
                          }}
                        >
                          {t("payNowDesc", "Generates official invoice, records instant payment, and marks table as AVAILABLE.")}
                        </p>

                        {/* PAYMENT METHOD SELECTOR */}
                        <div style={{ marginBottom: "12px" }}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#166534",
                              marginBottom: "6px",
                            }}
                          >
                            {t("selectPaymentMethod", "Select Payment Method:")}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {(["UPI", "CASH", "CARD"] as const).map((method) => {
                              const isSel = selectedPaymentMethod === method;
                              const label = method === "UPI" ? t("upiQr", "UPI / QR") : method === "CASH" ? t("cash", "Cash") : t("card", "Card");
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setSelectedPaymentMethod(method)}
                                  style={{
                                    flex: 1,
                                    padding: "7px 10px",
                                    borderRadius: "7px",
                                    border: isSel ? "2px solid #059669" : "1px solid #CBD5E1",
                                    background: isSel ? "#059669" : "#FFFFFF",
                                    color: isSel ? "#FFFFFF" : "#334155",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {isSel && <Check size={13} />}
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* PAY NOW SUBMIT BUTTON */}
                        <button
                          onClick={() => handlePayNow(billingModalKot, selectedPaymentMethod)}
                          disabled={isProcessingBill || billingInfo.isPaid}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            background: billingInfo.isPaid ? "#9CA3AF" : "#059669",
                            color: "#FFFFFF",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: billingInfo.isPaid || isProcessingBill ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                          }}
                        >
                          {isProcessingBill ? (
                            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          <span>
                            {billingInfo.isPaid
                              ? t("alreadyPaidAndSettled", "Already Paid & Settled")
                              : `${t("payNow", "Pay Now")} (₹${totals.grandTotal.toLocaleString("en-IN")}) & ${t("freesTableImmediately", "Free Table")}`}
                          </span>
                        </button>
                      </div>

                      {/* OPTION B: GENERATE BILL & PAY LATER */}
                      <div
                        style={{
                          border: "1.5px solid #F59E0B",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#FFFBEB",
                          boxShadow: "0 1px 4px rgba(245, 158, 11, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ReceiptIndianRupee size={18} color="#D97706" />
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#92400E",
                              }}
                            >
                              {t("optionBPayLater", "Option B: Generate Bill & Pay Later")}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              backgroundColor: "#FEF3C7",
                              color: "#B45309",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            {t("tableRemainsOccupied", "Table Remains Occupied")}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: "12px",
                            color: "#4B5563",
                            margin: "0 0 12px",
                            lineHeight: 1.4,
                          }}
                        >
                          {t("payLaterDesc", "Creates/reuses invoice as UNPAID. Table stays OCCUPIED until guest settles at the counter or checkout.")}
                        </p>

                        {/* PAY LATER SUBMIT BUTTON */}
                        <button
                          onClick={() => handlePayLater(billingModalKot)}
                          disabled={isProcessingBill || billingInfo.isPaid}
                          style={{
                            width: "100%",
                            padding: "9px 14px",
                            borderRadius: "8px",
                            background: billingInfo.isPaid ? "#E5E7EB" : "#FFFFFF",
                            color: billingInfo.isPaid ? "#9CA3AF" : "#B45309",
                            border: "1.5px solid #F59E0B",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: billingInfo.isPaid || isProcessingBill ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          {isProcessingBill ? (
                            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <ArrowRight size={15} />
                          )}
                          <span>
                            {billingInfo.isBilled
                              ? `Invoice #${billingInfo.invoiceNumber || "ID"} Already Generated (Pay Later)`
                              : t("generateBillOnlyPayLater", "Generate Bill Only (Pay Later)")}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* =================================================
          KOT DETAILS MODAL / TICKET PREVIEW
      ================================================= */}
      {selectedKotModal && (
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
          onClick={() => setSelectedKotModal(null)}
        >
          <div
            className="kot-printable-ticket"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid #E5DCD5",
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
              width: "min(480px, 100%)",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              padding: "24px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
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
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#8B3E16",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t("kitchenOrderTicket", "Kitchen Order Ticket")}
                </span>
                <h2
                  style={{
                    margin: "2px 0 0",
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#241C18",
                  }}
                >
                  #{selectedKotModal.kotNumber || `KOT-${selectedKotModal.id}`}
                </h2>
              </div>
              <button
                className="no-print"
                onClick={() => setSelectedKotModal(null)}
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

            {/* DETAILS GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                backgroundColor: "#FFF9F3",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #F0E3D7",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "#8C827A", fontWeight: 600 }}>
                  {t("table", "TABLE")}
                </div>
                <div style={{ fontSize: "14px", color: "#241C18", fontWeight: 700 }}>
                  {selectedKotModal.tableName || selectedKotModal.tableNumber || `${t("table", "Table")} --`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#8C827A", fontWeight: 600 }}>
                  {t("guest", "GUEST")}
                </div>
                <div style={{ fontSize: "14px", color: "#241C18", fontWeight: 700 }}>
                  {selectedKotModal.guestName || selectedKotModal.customerName || t("walkInGuest", "Walk-in Guest")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#8C827A", fontWeight: 600 }}>
                  {t("orderNo", "ORDER #")}
                </div>
                <div style={{ fontSize: "13px", color: "#241C18", fontWeight: 600 }}>
                  {selectedKotModal.orderNumber || "ORD-Direct"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#8C827A", fontWeight: 600 }}>
                  {t("createdAt", "CREATED AT")}
                </div>
                <div style={{ fontSize: "13px", color: "#241C18", fontWeight: 600 }}>
                  {selectedKotModal.createdAt
                    ? new Date(selectedKotModal.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </div>
              </div>
            </div>

            {/* INSTRUCTIONS */}
            {selectedKotModal.instructions && (
              <div
                style={{
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#92400E",
                  marginBottom: "16px",
                }}
              >
                <strong>{t("specialNote", "Special Note")}:</strong> {selectedKotModal.instructions}
              </div>
            )}

            {/* ITEMS LIST */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#7B3515",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                {t("orderedItems", "Ordered Items")}
              </div>
              <div
                style={{
                  border: "1px solid #E5DCD5",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {(selectedKotModal.items && selectedKotModal.items.length > 0) ? (
                  selectedKotModal.items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderBottom:
                          idx === (selectedKotModal.items?.length || 0) - 1
                            ? "none"
                            : "1px solid #F0ECE7",
                        backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FDFAF7",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#241C18" }}>
                        {it.name || it.itemName}
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "13px",
                          color: "#8B3E16",
                          backgroundColor: "#FFF9F3",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: "1px solid #F0D5BF",
                        }}
                      >
                        × {it.quantity || it.qty || 1}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "14px", color: "#8C827A", fontSize: "13px" }}>
                    {t("noItemsSpecified", "No items found")}
                  </div>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div
              className="no-print"
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {(selectedKotModal.status === "PENDING" ||
                selectedKotModal.status === "NEW" ||
                selectedKotModal.status === "SENT_TO_KITCHEN" ||
                selectedKotModal.status === "SENT") && (
                <button
                  onClick={() => handleUpdateStatus(selectedKotModal.id, "PREPARING")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#0284C7",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <ChefHat size={14} />
                  <span>{t("startPreparing", "Start Preparing")}</span>
                </button>
              )}

              {(selectedKotModal.status === "PREPARING" ||
                selectedKotModal.status === "ACCEPTED") && (
                <button
                  onClick={() => handleUpdateStatus(selectedKotModal.id, "READY")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#059669",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{t("markReady", "Mark Ready")}</span>
                </button>
              )}

              {selectedKotModal.status === "READY" && (
                <button
                  onClick={() => handleUpdateStatus(selectedKotModal.id, "SERVED")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#16A34A",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <UtensilsCrossed size={14} />
                  <span>{t("markServed", "Mark Served")}</span>
                </button>
              )}

              <button
                onClick={() => printKotTicket80mm(selectedKotModal)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFFFF",
                  border: "1.5px solid #27272A",
                  color: "#18181B",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Printer size={15} strokeWidth={2.4} color="#18181B" />
                <span>{t("printTicket", "Print KOT (80mm)")}</span>
              </button>

              <button
                onClick={() => printKotBill80mm(selectedKotModal)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#ECFDF5",
                  border: "1.5px solid #059669",
                  color: "#065F46",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <ReceiptIndianRupee size={15} strokeWidth={2.4} color="#059669" />
                <span>{t("printBill80mm", "Print Bill (80mm)")}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedKotModal(null);
                  navigate(
                    `/hotelbilling?kotNumber=${encodeURIComponent(
                      selectedKotModal.kotNumber || ""
                    )}&orderId=${selectedKotModal.orderId || ""}&tableId=${
                      selectedKotModal.tableId || ""
                    }`
                  );
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#8B3E16",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <FileEdit size={14} />
                <span>{t("goToBillingEditBill", "Go to Billing / Edit Bill")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MEDIA STYLES (ENFORCE 80MM AND PREVENT BLANK PAGES) */}
      <style>{`
        @page {
          size: 80mm auto !important;
          margin: 0mm !important;
        }
        @media print {
          html, body {
            width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .kot-printable-ticket, .kot-printable-ticket * {
            visibility: visible !important;
          }
          .kot-printable-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 auto !important;
            padding: 3mm 2mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoiceData={printModalData}
      />
    </div>
  );
};