

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LocalizedDatePicker } from "../common/LocalizedDatePicker";
import { expenseService } from "../services/expenseService";
import { billingService } from "../services/billingService";
import { orderService } from "../services/orderService";
import { purchaseService, PurchaseOrder, PurchaseInvoice, PurchaseReturn } from "../services/purchaseService";
import { reportService } from "../services/reportService";
import { paymentService } from "../services/paymentService";
import { Invoice, Payment } from "../types";
import { useBranch } from "../context/BranchContext";
import { useLanguage, localizeGuestName } from "../context/LanguageContext";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Wallet,
  BarChart3,
  Receipt,
  ShoppingCart,
  Utensils,
  Users,
  Building2,
  TrendingUp,
  CalendarDays,
  CreditCard,
  Upload,
  Download,
  FileText,
  PieChart,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";

type Expense = {
  id: number;
  name: string;
  category: string;
  amount: number;
  quantity?: number;
  date: string;
  paymentMode: string;
  description: string;
  branchCode: string;
};

type ReportType =
  | "sales"
  | "expense"
  | "order"
  | "menu"
  | "branch";

type ReportPeriod = "today" | "this-week" | "this-month";

const initialExpenses: Expense[] = [
  {
    id: 1,
    name: "Vegetables Purchase",
    category: "Food / Raw Material",
    amount: 4500,
    date: "2026-09-01",
    paymentMode: "Cash",
    description: "Fresh vegetables purchased for kitchen.",
    branchCode: "BR001",
  },
  {
    id: 2,
    name: "Electricity Bill",
    category: "Electricity",
    amount: 8500,
    date: "2026-09-02",
    paymentMode: "Bank Transfer",
    description: "Monthly electricity bill.",
    branchCode: "BR001",
  },
  {
    id: 3,
    name: "Cleaning Materials",
    category: "Cleaning",
    amount: 2200,
    date: "2026-09-03",
    paymentMode: "UPI",
    description: "Cleaning supplies purchased.",
    branchCode: "BR002",
  },
  {
    id: 4,
    name: "Gas Cylinder",
    category: "Gas",
    amount: 1800,
    date: "2026-09-04",
    paymentMode: "Cash",
    description: "Kitchen gas cylinder.",
    branchCode: "BR003",
  },
];

const expenseReportDataByPeriod: Record<ReportPeriod, Expense[]> = {
  today: [
    {
      id: 101,
      name: "Kitchen Supplies",
      category: "Food / Raw Material",
      amount: 3200,
      date: "2026-09-21",
      paymentMode: "Cash",
      description: "Today kitchen supplies expense.",
      branchCode: "BR001",
    },
    {
      id: 102,
      name: "Cleaning Materials",
      category: "Cleaning",
      amount: 1800,
      date: "2026-09-21",
      paymentMode: "UPI",
      description: "Today cleaning materials expense.",
      branchCode: "BR002",
    },
  ],
  "this-week": [
    {
      id: 201,
      name: "Vegetables Purchase",
      category: "Food / Raw Material",
      amount: 4500,
      date: "2026-09-15",
      paymentMode: "Cash",
      description: "Weekly vegetable purchase.",
      branchCode: "BR001",
    },
    {
      id: 202,
      name: "Electricity Bill",
      category: "Electricity",
      amount: 8500,
      date: "2026-09-17",
      paymentMode: "Bank Transfer",
      description: "Weekly electricity expense.",
      branchCode: "BR001",
    },
    {
      id: 203,
      name: "Cleaning Materials",
      category: "Cleaning",
      amount: 2200,
      date: "2026-09-19",
      paymentMode: "UPI",
      description: "Weekly cleaning supplies expense.",
      branchCode: "BR002",
    },
  ],
  "this-month": initialExpenses,
};

const defaultExpenseCategories = [
  "Food / Raw Material",
  "Electricity",
  "Water",
  "Gas",
  "Maintenance",
  "Cleaning",
  "Transportation",
  "Staff Related",
  "Other",
];

const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer"];

const salesData = [
  { date: "2026-09-01", sales: 32500, bills: 48 },
  { date: "2026-09-02", sales: 41800, bills: 61 },
  { date: "2026-09-03", sales: 38900, bills: 55 },
  { date: "2026-09-04", sales: 45200, bills: 67 },
];

const salesDataByPeriod: Record<ReportPeriod, typeof salesData> = {
  today: [
    { date: "2026-09-21", sales: 48600, bills: 72 },
  ],
  "this-week": [
    { date: "2026-09-15", sales: 39200, bills: 58 },
    { date: "2026-09-16", sales: 42800, bills: 63 },
    { date: "2026-09-17", sales: 45100, bills: 66 },
    { date: "2026-09-18", sales: 47600, bills: 70 },
    { date: "2026-09-19", sales: 51200, bills: 75 },
    { date: "2026-09-20", sales: 53800, bills: 79 },
    { date: "2026-09-21", sales: 48600, bills: 72 },
  ],
  "this-month": salesData,
};

const orderData = [
  { date: "2026-09-01", total: 82, dineIn: 52, delivery: 30, takeaway: 30 },
  { date: "2026-09-02", total: 96, dineIn: 61, delivery: 35, takeaway: 35 },
  { date: "2026-09-03", total: 89, dineIn: 54, delivery: 35, takeaway: 35 },
  { date: "2026-09-04", total: 105, dineIn: 67, delivery: 38, takeaway: 38 },
];

const orderDataByPeriod: Record<ReportPeriod, typeof orderData> = {
  today: [
    { date: "2026-09-21", total: 72, dineIn: 44, delivery: 28, takeaway: 28 },
  ],
  "this-week": [
    { date: "2026-09-15", total: 58, dineIn: 35, delivery: 23, takeaway: 23 },
    { date: "2026-09-16", total: 63, dineIn: 39, delivery: 24, takeaway: 24 },
    { date: "2026-09-17", total: 66, dineIn: 41, delivery: 25, takeaway: 25 },
    { date: "2026-09-18", total: 70, dineIn: 43, delivery: 27, takeaway: 27 },
    { date: "2026-09-19", total: 75, dineIn: 46, delivery: 29, takeaway: 29 },
    { date: "2026-09-20", total: 79, dineIn: 49, delivery: 30, takeaway: 30 },
    { date: "2026-09-21", total: 72, dineIn: 44, delivery: 28, takeaway: 28 },
  ],
  "this-month": orderData,
};

const menuData = [
  { item: "Paneer Tikka", category: "Starters", orders: 85, sales: 12750 },
  { item: "Veg Thali", category: "Main Course", orders: 72, sales: 10800 },
  { item: "Chicken Biryani", category: "Main Course", orders: 65, sales: 13000 },
  { item: "Masala Dosa", category: "South Indian", orders: 58, sales: 6960 },
];

const menuDataByPeriod: Record<ReportPeriod, typeof menuData> = {
  today: [
    { item: "Paneer Tikka", category: "Starters", orders: 12, sales: 1800 },
    { item: "Veg Thali", category: "Main Course", orders: 10, sales: 1500 },
    { item: "Chicken Biryani", category: "Main Course", orders: 8, sales: 1600 },
    { item: "Masala Dosa", category: "South Indian", orders: 7, sales: 840 },
  ],
  "this-week": [
    { item: "Paneer Tikka", category: "Starters", orders: 48, sales: 7200 },
    { item: "Veg Thali", category: "Main Course", orders: 41, sales: 6150 },
    { item: "Chicken Biryani", category: "Main Course", orders: 36, sales: 7200 },
    { item: "Masala Dosa", category: "South Indian", orders: 32, sales: 3840 },
  ],
  "this-month": menuData,
};

const staffData = [
  { name: "Rahul Patil", attendance: "Present", days: 26 },
  { name: "Sneha Sharma", attendance: "Present", days: 25 },
  { name: "Amit More", attendance: "Absent", days: 22 },
  { name: "Pooja Joshi", attendance: "Present", days: 27 },
];

const getStaffAttendanceForPeriod = (period: ReportPeriod) => {
  if (period === "today") {
    return staffData.map((item) => ({
      ...item,
      days: item.attendance === "Present" ? 1 : 0,
    }));
  }

  if (period === "this-week") {
    return staffData.map((item) => {
      const weeklyDays = Math.min(
        6,
        Math.max(0, Math.round((item.days / 26) * 6))
      );

      return {
        ...item,
        days: weeklyDays,
      };
    });
  }

  if (period === "this-month") {
    return staffData.map((item) => ({
      ...item,
      days: item.days,
    }));
  }

  return staffData;
};

const branchData = [
  { branch: "Main Branch", sales: 185000, expenses: 42000 },
  { branch: "City Branch", sales: 142000, expenses: 35000 },
  { branch: "Highway Branch", sales: 98000, expenses: 28000 },
];

const branchDataByPeriod: Record<ReportPeriod, typeof branchData> = {
  today: [
    { branch: "Main Branch", sales: 18500, expenses: 4200 },
    { branch: "City Branch", sales: 14200, expenses: 3500 },
    { branch: "Highway Branch", sales: 9800, expenses: 2800 },
  ],
  "this-week": [
    { branch: "Main Branch", sales: 74200, expenses: 16800 },
    { branch: "City Branch", sales: 56800, expenses: 14000 },
    { branch: "Highway Branch", sales: 39200, expenses: 11200 },
  ],
  "this-month": branchData,
};

const reportTitles: Record<ReportType, string> = {
  sales: "Sales Report",
  expense: "Expense Report",
  order: "Order Report",
  menu: "Menu Report",
  branch: "Branch Report",
};

const chartColors = [
  "#A0522D",
  "#D97706",
  "#4F8A65",
  "#6B7FD7",
  "#8B5CF6",
  "#0F766E",
  "#B45309",
  "#BE5A83",
  "#64748B",
];

const periodLabels: Record<ReportPeriod, string> = {
  today: "Today",
  "this-week": "This Week",
  "this-month": "This Month",
};

export default function ExpensesReports() {
  const { t, translateStatus, currentLanguage, formatDate: formatContextDate, toDevanagari, formatNumber, localizeGuestName } = useLanguage();
  const { selectedBranchId, selectedBranch, branches } = useBranch();
  const [activeSection, setActiveSection] = useState<
    "expenses" | "reports" | "charts" | "gst-report" | "purchase"
  >("expenses");

  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [reportPeriod, setReportPeriod] =
    useState<ReportPeriod>("today");
  const [staffChartPeriod, setStaffChartPeriod] =
    useState<ReportPeriod>("this-week");
  const [selectedReportDate, setSelectedReportDate] = useState("");

  // Dedicated GST Reports State
  const [gstReportTab, setGstReportTab] = useState<"sales-summary" | "rate-wise" | "invoice-wise" | "purchase-gst">("sales-summary");
  const [gstPeriod, setGstPeriod] = useState<"today" | "this-week" | "this-month" | "all">("all");
  const [gstBranchId, setGstBranchId] = useState<string>("all");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [backendOrders, setBackendOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [backendPayments, setBackendPayments] = useState<Payment[]>([]);

  // Configurable Report & KPI Display Settings (Requirement 6)
  const [reportDisplaySettings, setReportDisplaySettings] = useState<{
    totalSalesKpi: boolean;
    totalExpensesKpi: boolean;
    netAmountKpi: boolean;
    profitKpi: boolean;
    lossKpi: boolean;
    totalBillsKpi: boolean;
    totalOrdersKpi: boolean;
  }>(() => {
    try {
      const cached = localStorage.getItem('report_kpi_display_config');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      totalSalesKpi: true,
      totalExpensesKpi: true,
      netAmountKpi: true,
      profitKpi: true,
      lossKpi: true,
      totalBillsKpi: true,
      totalOrdersKpi: true,
    };
  });

  const [showKpiCustomize, setShowKpiCustomize] = useState(false);

  const handleToggleKpiSection = (key: string, val: boolean) => {
    const updated = { ...reportDisplaySettings, [key]: val };
    setReportDisplaySettings(updated);
    try {
      localStorage.setItem('report_kpi_display_config', JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    Promise.allSettled([
      expenseService.getExpenses(selectedBranchId),
      billingService.getInvoices(selectedBranchId),
      orderService.getOrders(selectedBranchId),
      purchaseService.getPurchaseOrders(selectedBranchId),
      purchaseService.getPurchaseInvoices(),
      purchaseService.getPurchaseReturns(),
      paymentService.getPayments(selectedBranchId),
    ]).then(([expRes, invRes, ordRes, poRes, piRes, prRes, payRes]) => {
      if (expRes.status === 'fulfilled' && expRes.value) {
        setExpenses(expRes.value.map((e: any) => ({
          id: e.id,
          name: e.name,
          category: e.category || 'Food / Raw Material',
          amount: Number(e.amount || 0),
          date: e.date || new Date().toISOString().split('T')[0],
          paymentMode: e.paymentMode || 'Cash',
          description: e.description || '',
          branchCode: e.branchCode || selectedBranch?.code || 'BR001',
        })));
      } else {
        setExpenses([]);
      }
      if (invRes.status === 'fulfilled' && invRes.value) setInvoices(invRes.value);
      else setInvoices([]);
      if (ordRes.status === 'fulfilled' && ordRes.value) setBackendOrders(ordRes.value);
      else setBackendOrders([]);
      if (poRes.status === 'fulfilled' && poRes.value) setPurchaseOrders(poRes.value);
      else setPurchaseOrders([]);
      if (piRes.status === 'fulfilled' && piRes.value) setPurchaseInvoices(piRes.value);
      if (prRes.status === 'fulfilled' && prRes.value) setPurchaseReturns(prRes.value);
      if (payRes.status === 'fulfilled' && payRes.value) setBackendPayments(payRes.value);
      else setBackendPayments([]);
    }).catch(err => console.warn('Failed to fetch report data', err));
  }, [selectedBranchId, selectedBranch]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(defaultExpenseCategories);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [appAlert, setAppAlert] = useState<{
    title: string;
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  // Automatically close popup after 3 seconds.
  useEffect(() => {
    if (!appAlert) return;

    const timer = window.setTimeout(() => {
      setAppAlert(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [appAlert]);
  const [showReportDetails, setShowReportDetails] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    name: "",
    category: "",
    amount: "",
    quantity: "",
    date: "",
    paymentMode: "",
    description: "",
    branchCode: "",
  });

  const [validationErrors, setValidationErrors] = useState({
    name: "",
    category: "",
    amount: "",
    quantity: "",
    date: "",
    branchCode: "",
    paymentMode: "",
  });

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const expenseDateInputRef = useRef<HTMLInputElement | null>(null);
  const reportDateInputRef = useRef<HTMLInputElement | null>(null);

  const todayString = new Date().toISOString().split("T")[0];

  const totalSales = useMemo(
    () => invoices.reduce((sum, item) => sum + (Number(item.total ?? item.grandTotal) || 0), 0),
    [invoices]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

  const purchaseData: Array<{
    id: number;
    date: string;
    supplier: string;
    taxableAmount: number;
    gst: number;
    total: number;
  }> = useMemo(() => {
    const invoiceRows = purchaseInvoices.map((inv) => {
      const total = Number(inv.total ?? (inv as any).grandTotal ?? (inv as any).totalAmount) || 0;
      const gst = Number(inv.taxAmount) || 0;
      const taxable = Number(inv.subtotal) || Math.max(0, total - gst);
      const d = inv.invoiceDate ? String(inv.invoiceDate).split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : todayString);
      return {
        id: inv.id,
        date: d,
        supplier: inv.supplierName || 'Supplier',
        taxableAmount: taxable,
        gst,
        total,
        purchaseOrderId: inv.purchaseOrderId,
      };
    });
    const linkedPoIds = new Set(invoiceRows.map((row: any) => row.purchaseOrderId).filter(Boolean));
    const poRows = purchaseOrders
      .filter((po) => !linkedPoIds.has(po.id))
      .map((po) => {
        const total = Number(po.totalAmount ?? (po as any).total) || 0;
        const gst = (po.items || []).reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * (Number(it.taxRate) || 0) / 100), 0);
        const d = po.poDate ? String(po.poDate).split('T')[0] : (po.createdAt ? po.createdAt.split('T')[0] : todayString);
        return {
          id: po.id,
          date: d,
          supplier: po.supplierName || 'Supplier',
          taxableAmount: Math.max(0, total - gst),
          gst,
          total,
        };
      });
    return [...invoiceRows, ...poRows];
  }, [purchaseInvoices, purchaseOrders, todayString]);

  const totalPurchase = useMemo(
    () => purchaseData.reduce((sum, item) => sum + item.total, 0),
    [purchaseData]
  );



  // Comprehensive GST Calculations & Reports Data
  const {
    filteredGstInvoices,
    filteredGstPurchases,
    gstSalesSummary,
    gstRateWiseReport,
    gstInvoiceWiseReport,
    gstPurchaseReport,
    gstReportData,
  } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayStr = monday.toISOString().split("T")[0];
    const firstOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const matchesDate = (dateStr?: string) => {
      if (!dateStr || gstPeriod === "all") return true;
      const d = String(dateStr).split("T")[0];
      if (gstPeriod === "today") return d === todayStr;
      if (gstPeriod === "this-week") return d >= mondayStr;
      if (gstPeriod === "this-month") return d >= firstOfMonthStr;
      return true;
    };

    const matchesBranch = (bId?: any, bCode?: any) => {
      if (gstBranchId === "all") return true;
      return String(bId) === String(gstBranchId) || String(bCode) === String(gstBranchId);
    };

    // Filter Sales Invoices (exclude cancelled/voided)
    const validInvoices = invoices.filter((inv: any) => {
      const st = String(inv.status || "").toUpperCase();
      if (st === "CANCELLED" || st === "VOID") return false;
      if (!matchesDate(inv.invoiceDate || inv.createdAt)) return false;
      if (!matchesBranch(inv.branchId, inv.branchCode)) return false;
      return true;
    });

    // 1. Sales Summary Aggregation
    let totalSales = 0;
    let taxableSales = 0;
    let exemptNilSales = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const invoiceWiseList = validInvoices.map((inv: any) => {
      const gTotal = Number(inv.grandTotal ?? inv.totalAmount ?? inv.total ?? 0);
      let tAmount = Number(inv.taxableAmount);
      let cg = Number(inv.cgst || 0);
      let sg = Number(inv.sgst || 0);
      let ig = Number(inv.igst || 0);
      let tax = Number(inv.taxAmount || 0);

      if (!tAmount && tAmount !== 0) {
        const sub = Number(inv.subtotal || 0);
        const disc = Number(inv.discountAmount || 0);
        tAmount = Math.max(sub - disc, 0);
      }

      if (cg === 0 && sg === 0 && ig === 0 && tax > 0) {
        cg = tax / 2;
        sg = tax / 2;
      }

      const totalTax = cg + sg + ig;

      totalSales += gTotal;
      taxableSales += tAmount;
      totalCgst += cg;
      totalSgst += sg;
      totalIgst += ig;

      if (totalTax === 0) {
        exemptNilSales += tAmount;
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
        invoiceDate: String(inv.invoiceDate || inv.createdAt || todayStr).split("T")[0],
        branchName: inv.branchName || inv.branchCode || "Main Branch",
        customerName: inv.customerName || inv.guestName || "Walk-in Guest",
        taxableAmount: tAmount,
        cgst: cg,
        sgst: sg,
        igst: ig,
        totalTax,
        grandTotal: gTotal,
        status: String(inv.status || "PAID").toUpperCase(),
      };
    });

    const totalGST = totalCgst + totalSgst + totalIgst;

    const salesSummary = {
      totalSales,
      taxableSales,
      exemptNilSales,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax: totalGST,
      invoiceCount: validInvoices.length,
    };

    // 2. Rate-wise Aggregation
    // Slabs: 0% (Nil / Exempt), 5% (Restaurant Services), 12% (Accommodation), 18% (Luxury / Banquets), 28% (Special Goods)
    const rateSlabs = [
      { name: "GST 0% (Nil Rated / Exempt)", rate: 0, category: "Nil Rated / Exempt", taxable: 0, cgst: 0, sgst: 0, igst: 0 },
      { name: "GST 5% (Restaurant Services)", rate: 5, category: "Standard Services", taxable: 0, cgst: 0, sgst: 0, igst: 0 },
      { name: "GST 12% (Hotel Room Tariff)", rate: 12, category: "Hotel Accommodation", taxable: 0, cgst: 0, sgst: 0, igst: 0 },
      { name: "GST 18% (Luxury / Banquets)", rate: 18, category: "Luxury Accommodation / Catering", taxable: 0, cgst: 0, sgst: 0, igst: 0 },
      { name: "GST 28% (Special Supplies)", rate: 28, category: "Special Supplies", taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    ];

    validInvoices.forEach((inv: any) => {
      let tAmount = Number(inv.taxableAmount);
      if (!tAmount && tAmount !== 0) {
        tAmount = Math.max(Number(inv.subtotal || 0) - Number(inv.discountAmount || 0), 0);
      }
      const cg = Number(inv.cgst || 0);
      const sg = Number(inv.sgst || 0);
      const ig = Number(inv.igst || 0);
      const tax = Number(inv.taxAmount || (cg + sg + ig));

      // Derive approximate rate
      let detectedRate = 5;
      if (tAmount > 0 && tax > 0) {
        const calculatedRate = (tax / tAmount) * 100;
        if (calculatedRate <= 1) detectedRate = 0;
        else if (calculatedRate <= 8) detectedRate = 5;
        else if (calculatedRate <= 15) detectedRate = 12;
        else if (calculatedRate <= 22) detectedRate = 18;
        else detectedRate = 28;
      } else if (tax === 0) {
        detectedRate = 0;
      }

      const slab = rateSlabs.find(s => s.rate === detectedRate) || rateSlabs[1];
      slab.taxable += tAmount;
      slab.cgst += cg > 0 ? cg : (tax > 0 && ig === 0 ? tax / 2 : 0);
      slab.sgst += sg > 0 ? sg : (tax > 0 && ig === 0 ? tax / 2 : 0);
      slab.igst += ig;
    });

    const rateWiseList = rateSlabs.map(s => ({
      ...s,
      totalTax: s.cgst + s.sgst + s.igst,
    }));

    // 3. Purchase GST & Input Tax Credit (ITC) Aggregation
    const validPurchases = purchaseInvoices.filter((p: any) => {
      const st = String(p.status || "").toUpperCase();
      if (st === "CANCELLED") return false;
      if (!matchesDate(p.invoiceDate || p.createdAt)) return false;
      return true;
    });

    let totalPurchaseVal = 0;
    let totalPurchaseTaxable = 0;
    let totalPurchaseGst = 0;
    let totalEligibleItc = 0;
    let totalIneligibleItc = 0;

    const purchaseList = validPurchases.map((p: any) => {
      const tot = Number(p.total || 0);
      const tax = Number(p.taxAmount || 0);
      const taxable = Number(p.subtotal || Math.max(tot - tax, 0));

      // Statutory ITC Rule: Food & Beverages ingredients for restaurant under 5% scheme are ineligible (Sec 17(5))
      // Supplies, machinery, equipment, packaging, and non-food expenses are eligible.
      const isFoodPurchase = p.items?.some((it: any) =>
        /food|vegetable|meat|chicken|paneer|rice|oil|dairy|beverage|ingredient/i.test(it.itemName || "")
      ) ?? false;

      const isEligible = !isFoodPurchase;
      const eligibleAmount = isEligible ? tax : 0;
      const ineligibleAmount = isEligible ? 0 : tax;

      totalPurchaseVal += tot;
      totalPurchaseTaxable += taxable;
      totalPurchaseGst += tax;
      totalEligibleItc += eligibleAmount;
      totalIneligibleItc += ineligibleAmount;

      return {
        id: p.id,
        supplierName: p.supplierName || `Supplier #${p.supplierId || "1"}`,
        invoiceNumber: p.invoiceNumber || `PINV-${p.id}`,
        invoiceDate: String(p.invoiceDate || p.createdAt || todayStr).split("T")[0],
        taxableAmount: taxable,
        gstAmount: tax,
        eligibleItc: eligibleAmount,
        ineligibleItc: ineligibleAmount,
        isEligible,
        status: String(p.status || p.paymentStatus || "PAID").toUpperCase(),
      };
    });

    const purchaseSummary = {
      totalPurchaseVal,
      totalPurchaseTaxable,
      totalPurchaseGst,
      totalEligibleItc,
      totalIneligibleItc,
      purchaseCount: validPurchases.length,
      purchaseList,
    };

    return {
      filteredGstInvoices: validInvoices,
      filteredGstPurchases: validPurchases,
      gstSalesSummary: salesSummary,
      gstRateWiseReport: rateWiseList,
      gstInvoiceWiseReport: invoiceWiseList,
      gstPurchaseReport: purchaseSummary,
      gstReportData: {
        totalSales,
        taxableAmount: taxableSales,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalGST,
        grandTotal: totalSales,
      },
    };
  }, [invoices, purchaseInvoices, gstPeriod, gstBranchId]);

  const exportGstSummaryCSV = (tab: string) => {
    let rows: (string | number)[][] = [];
    let filename = `gst-report-${tab}.csv`;

    if (tab === "sales-summary") {
      rows = [
        ["GST SALES SUMMARY REPORT"],
        ["Period Filter", periodLabels[reportPeriod] || gstPeriod],
        ["Total Invoices Count", gstSalesSummary.invoiceCount],
        [],
        ["Metric", "Amount (INR)"],
        ["Total Gross Sales", gstSalesSummary.totalSales.toFixed(2)],
        ["Net Taxable Sales", gstSalesSummary.taxableSales.toFixed(2)],
        ["Nil Rated / Exempt Sales", gstSalesSummary.exemptNilSales.toFixed(2)],
        ["Total CGST", gstSalesSummary.totalCgst.toFixed(2)],
        ["Total SGST", gstSalesSummary.totalSgst.toFixed(2)],
        ["Total IGST", gstSalesSummary.totalIgst.toFixed(2)],
        ["Total GST Liability", gstSalesSummary.totalTax.toFixed(2)],
      ];
    } else if (tab === "rate-wise") {
      rows = [
        ["GST RATE-WISE REPORT"],
        ["Tax Group / Slab", "Rate (%)", "Category", "Taxable Amount", "CGST", "SGST", "IGST", "Total GST"],
        ...gstRateWiseReport.map(r => [
          t(r.name, r.name),
          `${r.rate}%`,
          t(r.category, r.category),
          r.taxable.toFixed(2),
          r.cgst.toFixed(2),
          r.sgst.toFixed(2),
          r.igst.toFixed(2),
          r.totalTax.toFixed(2),
        ]),
        [
          t('total', "TOTAL"),
          "-",
          "-",
          gstSalesSummary.taxableSales.toFixed(2),
          gstSalesSummary.totalCgst.toFixed(2),
          gstSalesSummary.totalSgst.toFixed(2),
          gstSalesSummary.totalIgst.toFixed(2),
          gstSalesSummary.totalTax.toFixed(2),
        ]
      ];
    } else if (tab === "invoice-wise") {
      rows = [
        [t('invoiceWiseTaxBreakdown', "INVOICE-WISE GST REPORT")],
        [t('invoiceNo', "Invoice Number"), t('date', "Date"), t('branch', "Branch"), t('customer', "Customer"), t('taxableAmount', "Taxable Amount"), t('cgstAmount', "CGST"), t('sgstAmount', "SGST"), t('igstAmount', "IGST"), t('totalTax', "Total Tax"), t('grandTotal', "Invoice Total"), t('status', "Status")],
        ...gstInvoiceWiseReport.map(i => [
          i.invoiceNumber,
          i.invoiceDate,
          t(i.branchName, i.branchName),
          localizeGuestName ? localizeGuestName(i.customerName) : t(i.customerName, i.customerName),
          i.taxableAmount.toFixed(2),
          i.cgst.toFixed(2),
          i.sgst.toFixed(2),
          i.igst.toFixed(2),
          i.totalTax.toFixed(2),
          i.grandTotal.toFixed(2),
          translateStatus(i.status),
        ]),
        [
          t('total', "TOTAL"),
          "-",
          "-",
          "-",
          gstSalesSummary.taxableSales.toFixed(2),
          gstSalesSummary.totalCgst.toFixed(2),
          gstSalesSummary.totalSgst.toFixed(2),
          gstSalesSummary.totalIgst.toFixed(2),
          gstSalesSummary.totalTax.toFixed(2),
          gstSalesSummary.totalSales.toFixed(2),
          "-",
        ]
      ];
    } else if (tab === "purchase-gst") {
      rows = [
        [t('purchaseInvoicesItcLedger', "PURCHASE GST & INPUT TAX CREDIT (ITC) REPORT")],
        [t('supplier', "Supplier"), t('purchaseInvNo', "Invoice Number"), t('date', "Date"), t('taxableAmount', "Taxable Amount"), t('gstAmount', "GST Amount"), t('eligibleItcRs', "Eligible ITC"), t('ineligibleItcRs', "Ineligible ITC"), t('status', "Status")],
        ...gstPurchaseReport.purchaseList.map(p => [
          t(p.supplierName, p.supplierName),
          p.invoiceNumber,
          p.invoiceDate,
          p.taxableAmount.toFixed(2),
          p.gstAmount.toFixed(2),
          p.eligibleItc.toFixed(2),
          p.ineligibleItc.toFixed(2),
          translateStatus(p.status),
        ]),
        [
          "TOTAL",
          "-",
          "-",
          gstPurchaseReport.totalPurchaseTaxable.toFixed(2),
          gstPurchaseReport.totalPurchaseGst.toFixed(2),
          gstPurchaseReport.totalEligibleItc.toFixed(2),
          gstPurchaseReport.totalIneligibleItc.toFixed(2),
          "-",
        ]
      ];
    }

    const csvContent = rows
      .map(row => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };



  const filteredExpenses = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return expenses;

    return expenses.filter(
      (expense) =>
        expense.name.toLowerCase().includes(value) ||
        expense.category.toLowerCase().includes(value) ||
        expense.paymentMode.toLowerCase().includes(value)
    );
  }, [expenses, search]);

  const getPeriodDateRange = (period: ReportPeriod) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${date}`;

    if (period === "today") {
      return { startStr: todayStr, endStr: todayStr };
    }

    if (period === "this-week") {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const monYear = monday.getFullYear();
      const monMonth = String(monday.getMonth() + 1).padStart(2, "0");
      const monDate = String(monday.getDate()).padStart(2, "0");
      return {
        startStr: `${monYear}-${monMonth}-${monDate}`,
        endStr: todayStr,
      };
    }

    // this-month
    return {
      startStr: `${year}-${month}-01`,
      endStr: todayStr,
    };
  };

  const isDateInPeriod = (dateString: string, period: ReportPeriod = reportPeriod) => {
    if (!dateString) return false;
    const d = String(dateString).split("T")[0].split(" ")[0].replace(/\//g, "-");
    const { startStr, endStr } = getPeriodDateRange(period);
    return d >= startStr && d <= endStr;
  };

  const filteredSalesData = useMemo(() => {
    if (invoices && invoices.length > 0) {
      const map = new Map<string, { date: string; sales: number; bills: number }>();
      invoices.forEach((inv) => {
        const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || todayString);
        if (isDateInPeriod(d, reportPeriod)) {
          const curr = map.get(d) || { date: d, sales: 0, bills: 0 };
          curr.sales += Number(inv.total ?? inv.grandTotal) || 0;
          curr.bills += 1;
          map.set(d, curr);
        }
      });
      const result = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      return result;
    }
    return [];
  }, [invoices, reportPeriod, todayString]);

  // Purchase Summary follows the same Today / This Week / This Month
  // period selected in the Reports module.
  const filteredPurchaseData = useMemo(
    () =>
      purchaseData.filter((item) =>
        isDateInPeriod(item.date, reportPeriod)
      ),
    [purchaseData, reportPeriod]
  );

  const reportPurchaseTotal = useMemo(
    () =>
      filteredPurchaseData.reduce(
        (sum, item) => sum + item.total,
        0
      ),
    [filteredPurchaseData]
  );

  const reportPurchaseTaxableTotal = useMemo(
    () =>
      filteredPurchaseData.reduce(
        (sum, item) => sum + item.taxableAmount,
        0
      ),
    [filteredPurchaseData]
  );

  const reportPurchaseGSTTotal = useMemo(
    () =>
      filteredPurchaseData.reduce(
        (sum, item) => sum + item.gst,
        0
      ),
    [filteredPurchaseData]
  );

  const filteredOrderData = useMemo(() => {
    if (backendOrders && backendOrders.length > 0) {
      const map = new Map<string, { date: string; total: number; dineIn: number; delivery: number; takeaway: number }>();
      backendOrders.forEach((o) => {
        const d = o.createdAt ? o.createdAt.split('T')[0] : todayString;
        if (isDateInPeriod(d, reportPeriod)) {
          const curr = map.get(d) || { date: d, total: 0, dineIn: 0, delivery: 0, takeaway: 0 };
          curr.total += 1;
          if (o.tableId != null) curr.dineIn += 1;
          else curr.delivery += 1;
          map.set(d, curr);
        }
      });
      const result = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      return result;
    }
    return [];
  }, [backendOrders, reportPeriod, todayString]);

  const filteredReportExpenses = useMemo(
    () => {
      return expenses.filter((item) =>
        isDateInPeriod(item.date, reportPeriod)
      );
    },
    [expenses, reportPeriod]
  );

  const reportExpenseTotal = useMemo(
    () =>
      filteredReportExpenses.reduce(
        (sum, item) => sum + item.amount,
        0
      ),
    [filteredReportExpenses]
  );

  const reportSalesTotal = useMemo(
    () =>
      filteredSalesData.reduce(
        (sum, item) => sum + item.sales,
        0
      ),
    [filteredSalesData]
  );

  const reportOrderTotal = useMemo(
    () =>
      filteredOrderData.reduce(
        (sum, item) => sum + item.total,
        0
      ),
    [filteredOrderData]
  );

  const profitOrLoss = reportSalesTotal - reportPurchaseTotal - reportExpenseTotal;
  const profitAmount = Math.max(profitOrLoss, 0);
  const lossAmount = Math.max(-profitOrLoss, 0);
  const netAmount = profitOrLoss;

  const filteredMenuData = useMemo(() => {
    if (backendOrders && backendOrders.length > 0) {
      const itemMap = new Map<string, { item: string; category: string; orders: number; sales: number }>();
      backendOrders.forEach((o) => {
        const d = o.createdAt ? o.createdAt.split('T')[0] : todayString;
        if (isDateInPeriod(d, reportPeriod)) {
          (o.items || []).forEach((it: any) => {
            const name = it.name || 'Item';
            const existing = itemMap.get(name) || { item: name, category: 'Food', orders: 0, sales: 0 };
            existing.orders += Number(it.quantity) || 1;
            existing.sales += (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0);
            itemMap.set(name, existing);
          });
        }
      });
      const result = Array.from(itemMap.values()).sort((a, b) => b.sales - a.sales);
      return result;
    }
    return [];
  }, [backendOrders, reportPeriod, todayString]);

  const filteredBranchData = useMemo(() => {
    const map = new Map<string, { branch: string; sales: number; expenses: number }>();
    invoices.forEach((inv: any) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : inv.invoiceDate;
      if (!d || !isDateInPeriod(d, reportPeriod)) return;
      const name = inv.branchName || 'Branch';
      const row = map.get(name) || { branch: name, sales: 0, expenses: 0 };
      row.sales += Number(inv.total ?? inv.grandTotal) || 0;
      map.set(name, row);
    });
    if (map.size === 0) return [];
    return Array.from(map.values());
  }, [invoices, reportPeriod, todayString]);

  const reportMenuOrderTotal = useMemo(
    () =>
      filteredMenuData.reduce((sum, item) => sum + item.orders, 0),
    [filteredMenuData]
  );

  const reportMenuSalesTotal = useMemo(
    () =>
      filteredMenuData.reduce((sum, item) => sum + item.sales, 0),
    [filteredMenuData]
  );

  const categoryReport = useMemo(() => {
    return expenseCategories
      .map((category) => {
        const items = filteredReportExpenses.filter(
          (item) => item.category === category
        );

        return {
          category,
          count: items.length,
          amount: items.reduce(
            (sum, item) => sum + item.amount,
            0
          ),
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredReportExpenses]);

  const monthWiseReport = useMemo(() => {
    const map: Record<
      string,
      { month: string; count: number; amount: number }
    > = {};

    filteredReportExpenses.forEach((item) => {
      const monthKey = item.date.slice(0, 7);

      if (!map[monthKey]) {
        const date = new Date(`${monthKey}-01T00:00:00`);
        map[monthKey] = {
          month: date.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          }),
          count: 0,
          amount: 0,
        };
      }

      map[monthKey].count += 1;
      map[monthKey].amount += item.amount;
    });

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, value]) => value);
  }, [filteredReportExpenses]);

  const dateWiseReport = useMemo(() => {
    if (!selectedReportDate) return [];

    const selectedDateExpenses = expenses.filter(
      (item) => item.date === selectedReportDate
    );

    return [
      {
        date: selectedReportDate,
        count: selectedDateExpenses.length,
        amount: selectedDateExpenses.reduce(
          (sum, item) => sum + item.amount,
          0
        ),
      },
    ];
  }, [expenses, selectedReportDate]);

  const chartCategoryData = useMemo(
    () =>
      categoryReport.map((item) => ({
        ...item,
        percent:
          reportExpenseTotal > 0
            ? (item.amount / reportExpenseTotal) * 100
            : 0,
      })),
    [categoryReport, reportExpenseTotal]
  );

  const chartTrendData = useMemo(() => {
    const map: Record<string, number> = {};

    filteredReportExpenses.forEach((item) => {
      map[item.date] = (map[item.date] || 0) + item.amount;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [filteredReportExpenses]);

  const salesExpenseTrend = useMemo(() => {
    const dates = Array.from(
      new Set([
        ...filteredSalesData.map((item) => item.date),
        ...filteredReportExpenses.map((item) => item.date),
      ])
    ).sort();

    return dates.map((date) => ({
      date,
      sales:
        filteredSalesData.find((item) => item.date === date)?.sales || 0,
      expenses:
        filteredReportExpenses
          .filter((item) => item.date === date)
          .reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [filteredSalesData, filteredReportExpenses]);

  const topExpenses = useMemo(
    () =>
      [...filteredReportExpenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [filteredReportExpenses]
  );

  const expenseCategoryChart = useMemo(
    () =>
      expenseCategories
        .map((category) => {
          const amount = expenses
            .filter((item) => item.category === category)
            .reduce((sum, item) => sum + item.amount, 0);

          return { category, amount };
        })
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [expenses]
  );

  const dailyExpenseChart = useMemo(() => {
    const dates = Array.from(new Set(expenses.map((item) => item.date))).sort();

    return dates.map((date) => ({
      date,
      expense: expenses
        .filter((item) => item.date === date)
        .reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [expenses]);

  const maxExpenseCategory = Math.max(
    ...expenseCategoryChart.map((item) => item.amount),
    1
  );

  const maxDailyExpense = Math.max(
    ...dailyExpenseChart.map((item) => item.expense),
    1
  );

  const maxSalesExpense = Math.max(
    ...salesExpenseTrend.flatMap((item) => [
      item.sales,
      item.expenses,
    ]),
    1
  );



  const chartGradient = useMemo(() => {
    if (!chartCategoryData.length) {
      return "#eee8e2";
    }

    let current = 0;

    const segments = chartCategoryData.map((item, index) => {
      const start = current;
      current += item.percent;

      return `${chartColors[index % chartColors.length]} ${start}% ${current}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [chartCategoryData]);

  const openAddExpense = () => {
    setEditingExpense(null);

    setExpenseForm({
      name: "",
      category: "",
      amount: "",
      quantity: "",
      date: todayString,
      paymentMode: "",
      description: "",
      branchCode: selectedBranch?.code || (branches && branches[0] ? branches[0].code : ""),
    });

    setValidationErrors({
      name: "",
      category: "",
      amount: "",
      quantity: "",
      date: "",
      branchCode: "",
      paymentMode: "",

    });

    setShowExpenseModal(true);
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);

    setExpenseForm({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      quantity: String(expense.quantity ?? 1),
      date: expense.date,
      paymentMode: expense.paymentMode,
      description: expense.description,
      branchCode: expense.branchCode || "",
    });

    setValidationErrors({
      name: "",
      category: "",
      amount: "",
      quantity: "",
      date: "",
      branchCode: "",
      paymentMode: "",
    });

    setShowExpenseModal(true);
  };

  const handleQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value && !/^\d*$/.test(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        quantity: "Quantity must contain numbers only.",
      }));
      return;
    }

    setValidationErrors((prev) => ({
      ...prev,
      quantity: "",
    }));

    setExpenseForm((prev) => ({
      ...prev,
      quantity: value,
    }));
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    const amountRegex = /^\d+(\.\d+)?$/;

    let nameError = "";
    let categoryError = "";
    let amountError = "";
    let quantityError = "";
    let dateError = "";
    let branchCodeError = "";
    let paymentModeError = "";

    if (!expenseForm.name.trim()) {
      nameError = "Please fill the expense name.";
      hasError = true;
    } else if (!nameRegex.test(expenseForm.name)) {
      nameError =
        "Expense name must contain only letters and spaces.";
      hasError = true;
    }

    if (!expenseForm.amount.trim()) {
      amountError = "Please fill the amount.";
      hasError = true;
    } else if (!amountRegex.test(expenseForm.amount.trim())) {
      amountError = "Amount must contain numbers only.";
      hasError = true;
    } else if (Number(expenseForm.amount) <= 0) {
      amountError = "Amount must be greater than 0.";
      hasError = true;
    }

    if (!expenseForm.quantity.trim()) {
      quantityError = "Please fill the quantity.";
      hasError = true;
    } else if (!/^\d+$/.test(expenseForm.quantity.trim())) {
      quantityError = "Quantity must contain numbers only.";
      hasError = true;
    } else if (Number(expenseForm.quantity) <= 0) {
      quantityError = "Quantity must be greater than 0.";
      hasError = true;
    }

    if (!expenseForm.date.trim()) {
      dateError = "Please select the date.";
      hasError = true;
    }

    if (!expenseForm.branchCode.trim()) {
      branchCodeError = "Please select the branch code.";
      hasError = true;
    }

    if (!expenseForm.paymentMode.trim()) {
      paymentModeError = "Please select the payment mode.";
      hasError = true;
    }

    setValidationErrors({
      name: nameError,
      category: categoryError,
      amount: amountError,
      quantity: quantityError,
      date: dateError,
      branchCode: branchCodeError,
      paymentMode: paymentModeError,
    });

    if (!expenseForm.category) {
      categoryError = "Please select the category.";
      hasError = true;
    }

    setValidationErrors((prev) => ({
      ...prev,
      category: categoryError,
    }));

    if (hasError) return;

    const amount = Number(expenseForm.amount);

    if (editingExpense) {
      try {
        const matchedBranch = branches.find((b) => b.code === expenseForm.branchCode) || selectedBranch;
        if (editingExpense.id && editingExpense.id < 1000000000) {
          await expenseService.updateExpense(editingExpense.id, {
            name: expenseForm.name.trim(),
            category: expenseForm.category,
            amount,
            date: expenseForm.date,
            paymentMode: expenseForm.paymentMode,
            description: expenseForm.description,
            branchCode: expenseForm.branchCode,
            branchId: matchedBranch?.id || selectedBranchId,
          });
        }
        setExpenses((prev) =>
          prev.map((item) =>
            item.id === editingExpense.id
              ? {
                  ...item,
                  name: expenseForm.name.trim(),
                  category: expenseForm.category,
                  amount,
                  quantity: Number(expenseForm.quantity),
                  date: expenseForm.date,
                  paymentMode: expenseForm.paymentMode,
                  description: expenseForm.description,
                  branchCode: expenseForm.branchCode,
                }
              : item
          )
        );

        setAppAlert({
          title: "Expense Updated",
          message: "Expense has been updated successfully.",
          type: "success",
        });
      } catch (err: any) {
        console.error("Failed to update expense", err);
        setAppAlert({
          title: "Error",
          message: err?.response?.data?.message || "Failed to update expense",
          type: "error",
        });
        return;
      }
    } else {
      try {
        const matchedBranch = branches.find((b) => b.code === expenseForm.branchCode) || selectedBranch;
        const created = await expenseService.createExpense({
          name: expenseForm.name.trim(),
          category: expenseForm.category,
          amount,
          date: expenseForm.date,
          paymentMode: expenseForm.paymentMode,
          description: expenseForm.description,
          branchCode: expenseForm.branchCode,
          branchId: matchedBranch?.id || selectedBranchId,
        });

        const newExpense: Expense = {
          id: created?.id || Date.now(),
          name: created?.name || expenseForm.name.trim(),
          category: created?.category || expenseForm.category,
          amount: Number(created?.amount || amount),
          quantity: Number(expenseForm.quantity),
          date: created?.date || expenseForm.date,
          paymentMode: created?.paymentMode || expenseForm.paymentMode,
          description: created?.description || expenseForm.description,
          branchCode: created?.branchCode || expenseForm.branchCode,
        };

        setExpenses((prev) => [newExpense, ...prev]);

        setAppAlert({
          title: "Expense Added",
          message: "Expense has been added successfully.",
          type: "success",
        });
      } catch (err: any) {
        console.error("Failed to add expense", err);
        setAppAlert({
          title: "Error",
          message: err?.response?.data?.message || "Failed to add expense",
          type: "error",
        });
        return;
      }
    }

    setShowExpenseModal(false);
  };

  const deleteExpense = async (id: number) => {
    try {
      if (id && id < 1000000000) {
        await expenseService.deleteExpense(id);
      }
      setExpenses((prev) =>
        prev.filter((item) => item.id !== id)
      );
      setExpenseToDelete(null);

      setAppAlert({
        title: "Expense Deleted",
        message: "Expense has been deleted successfully.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Failed to delete expense", err);
      setAppAlert({
        title: "Error",
        message: err?.response?.data?.message || "Failed to delete expense",
        type: "error",
      });
    }
  };

  const openDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const viewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailsModal(true);
  };

  const formatAmount = (amount: number) =>
    formatNumber(amount, { asCurrency: true });

  const formatDate = (date: string) => {
    if (!date) return "";
    try {
      return formatContextDate(date.includes("T") ? date : `${date}T00:00:00`, { showDayOfWeek: false });
    } catch {
      return date;
    }
  };

  const formatMonthYear = (monthStr: string) => {
    if (!monthStr) return "";
    try {
      const parts = monthStr.split(" ");
      if (parts.length === 2) {
        const monthEng = parts[0];
        const year = parts[1];
        const monthTranslated = t(monthEng, monthEng);
        return `${monthTranslated} ${toDevanagari(year)}`;
      }
      return t(monthStr, monthStr);
    } catch {
      return monthStr;
    }
  };

  const escapeCSV = (value: string | number) => {
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };

  const exportPurchaseData = () => {
    const periodLabel = periodLabels[reportPeriod] || reportPeriod;
    const rows = [
      [
        t('date', "Date"),
        t('supplier', "Supplier"),
        t('taxableAmount', "Taxable Amount (Rs)"),
        t('gst', "GST (Rs)"),
        t('total', "Total Amount (Rs)"),
      ],
      ...filteredPurchaseData.map((item) => [
        item.date,
        item.supplier,
        item.taxableAmount.toFixed(2),
        item.gst.toFixed(2),
        item.total.toFixed(2),
      ]),
      [
        t('total', "TOTAL"),
        `${filteredPurchaseData.length} records`,
        reportPurchaseTaxableTotal.toFixed(2),
        reportPurchaseGSTTotal.toFixed(2),
        reportPurchaseTotal.toFixed(2),
      ],
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase-summary-${reportPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportExpenses = () => {
    if (activeSection === "purchase") {
      exportPurchaseData();
      return;
    }
    if (activeSection === "gst-report") {
      exportGstSummaryCSV(gstReportTab);
      return;
    }

    const rows = [
      [
        t('expenseName', "Expense Name"),
        t('category', "Category"),
        t('amount', "Amount"),
        t('date', "Date"),
        t('paymentMode', "Payment Mode"),
        t('branchCode', "Branch Code"),
        t('description', "Description"),
      ],
      ...filteredExpenses.map((item) => [
        t(item.name, item.name),
        t(item.category, item.category),
        item.amount,
        item.date,
        t(item.paymentMode, item.paymentMode),
        item.branchCode || "",
        item.description,
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotel-expenses.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        field += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === "," && !quoted) {
        row.push(field.trim());
        field = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i++;
        row.push(field.trim());

        if (row.some((value) => value !== "")) {
          rows.push(row);
        }

        row = [];
        field = "";
        continue;
      }

      field += char;
    }

    row.push(field.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }

    return rows;
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const fileName = file.name.toLowerCase().trim();
    const blockedExcelExtensions = [".xls", ".xlsx", ".xlsm", ".xlsb"];

    // Explicitly block Excel files, including macro-enabled workbooks.
    if (blockedExcelExtensions.some((extension) => fileName.endsWith(extension))) {
      setAppAlert({ title: "Invalid File", message: "Excel files (.xls, .xlsx, .xlsm, .xlsb) are not allowed. Please upload a CSV file only.", type: "error" });
      e.target.value = "";
      return;
    }

    // Allow CSV files only. All other file types are rejected.
    if (!fileName.endsWith(".csv")) {
      setAppAlert({ title: "Invalid File", message: "Please import a CSV file only.", type: "error" });
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setAppAlert({ title: "Import Error", message: "CSV file does not contain expense data.", type: "error" });
        e.target.value = "";
        return;
      }

      const headers = rows[0].map((header) =>
        header.toLowerCase().trim()
      );

      const requiredHeaders = [
        "expense name",
        "category",
        "amount",
        "date",
        "payment mode",
        "branch code",
        "description",
      ];

      const validHeaders = requiredHeaders.every((header) =>
        headers.includes(header)
      );

      if (!validHeaders) {
        setAppAlert({ title: "Invalid CSV Format", message: "Please export the expense CSV first and use the same columns.", type: "error" });
        e.target.value = "";
        return;
      }

      const indexOf = (header: string) =>
        headers.indexOf(header);

      const imported: Expense[] = [];

      rows.slice(1).forEach((row, index) => {
        const name = row[indexOf("expense name")]?.trim() || "";
        const category =
          row[indexOf("category")]?.trim() || "";
        const amountText =
          row[indexOf("amount")]?.trim() || "";
        const date = row[indexOf("date")]?.trim() || "";
        const paymentMode =
          row[indexOf("payment mode")]?.trim() || "";
        const branchCode =
          row[indexOf("branch code")]?.trim() || "";
        const description =
          row[indexOf("description")]?.trim() || "";

        const validName = /^[A-Za-z ]+$/.test(name);
        const validAmount =
          /^\d+(\.\d+)?$/.test(amountText) &&
          Number(amountText) > 0;
        const validDate =
          /^\d{4}-\d{2}-\d{2}$/.test(date) &&
          !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
        const validCategory =
          expenseCategories.includes(category);
        const validPayment =
          paymentModes.includes(paymentMode);

        if (
          validName &&
          validAmount &&
          validDate &&
          validCategory &&
          validPayment
        ) {
          imported.push({
            id: Date.now() + index,
            name,
            category,
            amount: Number(amountText),
            date,
            paymentMode,
            branchCode: branchCode || "BR001",
            description,
          });
        }
      });

      if (!imported.length) {
        setAppAlert({ title: "Import Error", message: "No valid expense rows found in the CSV file.", type: "error" });
        e.target.value = "";
        return;
      }

      setExpenses((prev) => [...imported, ...prev]);

      setAppAlert({ title: "Import Successful", message: `${imported.length} expense record(s) imported successfully.`, type: "success" });
    } catch {
      setAppAlert({ title: "Import Error", message: "Unable to read the CSV file.", type: "error" });
    }

    e.target.value = "";
  };

  const downloadPDF = () => {
    const reportRows: string[] = [];

    if (activeSection === "expenses") {
      reportRows.push(t('expenseList', "Expense List"));
      filteredExpenses.forEach((item) => {
        reportRows.push(
          `${t(item.name, item.name)} | ${t(item.category, item.category)} | ${formatAmount(
            item.amount
          )} | ${formatDate(item.date)} | ${item.branchCode ? toDevanagari(item.branchCode) : "—"} | ${t(item.paymentMode, item.paymentMode)}`
        );
      });
    }

    if (activeSection === "reports") {
      reportRows.push(t(reportTitles[activeReport], reportTitles[activeReport]));

      if (activeReport === "sales") {
        filteredSalesData.forEach((item) => {
          reportRows.push(
            `${formatDate(item.date)} | ${t('totalBills', 'Bills')}: ${
              toDevanagari(item.bills)
            } | ${t('totalSales', 'Sales')}: ${formatAmount(item.sales)}`
          );
        });
      }

      if (activeReport === "expense") {
        categoryReport.forEach((item) => {
          reportRows.push(
            `${t(item.category, item.category)} | ${toDevanagari(item.count)} ${t('expenses', 'expenses')} | ${formatAmount(
              item.amount
            )}`
          );
        });

        if (reportPeriod === "this-month") {
          reportRows.push(t('monthWiseExpenseReport', "Month-wise Expense Report"));

          monthWiseReport.forEach((item) => {
            reportRows.push(
              `${formatMonthYear(item.month)} | ${toDevanagari(item.count)} ${t('expenses', 'expenses')} | ${formatAmount(
                item.amount
              )}`
            );
          });
        }
      }

      if (activeReport === "order") {
        filteredOrderData.forEach((item) => {
          reportRows.push(
            `${formatDate(item.date)} | ${t('total', 'Total')}: ${
              toDevanagari(item.total)
            } | ${t('dineIn', 'Dine-in')}: ${toDevanagari(item.dineIn)} | ${t('takeaway', 'Delivery')}: ${
              toDevanagari(item.delivery)
            }`
          );
        });
      }

      if (activeReport === "menu") {
        filteredMenuData.forEach((item) => {
          reportRows.push(
            `${t(item.item, item.item)} | ${t(item.category, item.category)} | ${t('orders', 'Orders')}: ${
              toDevanagari(item.orders)
            } | ${t('totalSales', 'Sales')}: ${formatAmount(item.sales)}`
          );
        });
      }


      if (activeReport === "branch") {
        filteredBranchData.forEach((item) => {
          reportRows.push(
            `${t(item.branch, item.branch)} | ${t('totalSales', 'Sales')}: ${formatAmount(
              item.sales
            )} | ${t('totalExpenses', 'Expenses')}: ${formatAmount(
              item.expenses
            )} | ${t('netAmount', 'Net')}: ${formatAmount(
              item.sales - item.expenses
            )}`
          );
        });
      }
    }

    if (activeSection === "charts") {
      reportRows.push(
        `${t('businessAnalytics', 'Charts Summary')} - ${t(periodLabels[reportPeriod], periodLabels[reportPeriod])}`
      );
      chartCategoryData.forEach((item) => {
        reportRows.push(
          `${t(item.category, item.category)} | ${formatAmount(
            item.amount
          )} | ${toDevanagari(item.percent.toFixed(1))}%`
        );
      });

      reportRows.push(t('topExpenses', "Top Expenses"));

      topExpenses.forEach((item) => {
        reportRows.push(
          `${t(item.name, item.name)} | ${formatAmount(item.amount)}`
        );
      });
    }

    if (activeSection === "purchase") {
      reportRows.push(
        `${t('purchaseReport', 'Purchase Summary Report')} - ${t(periodLabels[reportPeriod], periodLabels[reportPeriod])}`
      );
      reportRows.push(
        `${t('date', 'Date')} | ${t('supplier', 'Supplier')} | ${t('taxableAmount', 'Taxable Amount')} | ${t('gst', 'GST')} | ${t('total', 'Total Amount')}`
      );
      filteredPurchaseData.forEach((item) => {
        reportRows.push(
          `${formatDate(item.date)} | ${t(item.supplier, item.supplier)} | ${formatAmount(
            item.taxableAmount
          )} | ${formatAmount(item.gst)} | ${formatAmount(item.total)}`
        );
      });
      reportRows.push(
        `${t('total', 'TOTAL')} | ${toDevanagari(filteredPurchaseData.length)} ${t('records', 'Records')} | ${formatAmount(
          reportPurchaseTaxableTotal
        )} | ${formatAmount(reportPurchaseGSTTotal)} | ${formatAmount(reportPurchaseTotal)}`
      );
    }

    if (activeSection === "gst-report") {
      if (gstReportTab === "sales-summary") {
        reportRows.push(
          `${t('gstSalesSummary', 'GST Sales Summary Report')} - ${t(periodLabels[reportPeriod] || gstPeriod, periodLabels[reportPeriod] || gstPeriod)}`
        );
        reportRows.push(`${t('metric', 'Metric / Tax Component')} | ${t('amount', 'Amount (₹)')}`);
        reportRows.push(`${t('totalGrossSales', 'Total Gross Sales')} | ${formatAmount(gstSalesSummary.totalSales)}`);
        reportRows.push(`${t('netTaxableSales', 'Net Taxable Sales')} | ${formatAmount(gstSalesSummary.taxableSales)}`);
        reportRows.push(`${t('nilExemptSales', 'Nil / Exempt Sales')} | ${formatAmount(gstSalesSummary.exemptNilSales)}`);
        reportRows.push(`${t('totalCgst', 'Total CGST')} | ${formatAmount(gstSalesSummary.totalCgst)}`);
        reportRows.push(`${t('totalSgst', 'Total SGST')} | ${formatAmount(gstSalesSummary.totalSgst)}`);
        reportRows.push(`${t('totalIgst', 'Total IGST')} | ${formatAmount(gstSalesSummary.totalIgst)}`);
        reportRows.push(`${t('totalTaxLiability', 'Total GST Tax Liability')} | ${formatAmount(gstSalesSummary.totalTax)}`);
        reportRows.push(`${t('totalInvoices', 'Total Invoices Count')} | ${toDevanagari(gstSalesSummary.invoiceCount)}`);
      } else if (gstReportTab === "rate-wise") {
        reportRows.push(
          `${t('gstRateWiseReport', 'GST Rate-Wise Report')} - ${t(periodLabels[reportPeriod] || gstPeriod, periodLabels[reportPeriod] || gstPeriod)}`
        );
        reportRows.push(
          `${t('taxGroup', 'Tax Group')} | ${t('rate', 'Rate (%)')} | ${t('taxableAmount', 'Taxable Amount')} | ${t('cgst', 'CGST')} | ${t('sgst', 'SGST')} | ${t('totalTax', 'Total GST')}`
        );
        gstRateWiseReport.forEach((r) => {
          reportRows.push(
            `${t(r.name, r.name)} | ${r.rate}% | ${formatAmount(r.taxable)} | ${formatAmount(r.cgst)} | ${formatAmount(r.sgst)} | ${formatAmount(r.totalTax)}`
          );
        });
        reportRows.push(
          `${t('total', 'TOTAL')} | - | ${formatAmount(gstSalesSummary.taxableSales)} | ${formatAmount(gstSalesSummary.totalCgst)} | ${formatAmount(gstSalesSummary.totalSgst)} | ${formatAmount(gstSalesSummary.totalTax)}`
        );
      } else if (gstReportTab === "invoice-wise") {
        reportRows.push(
          `${t('invoiceWiseGstReport', 'Invoice-Wise GST Report')} - ${t(periodLabels[reportPeriod] || gstPeriod, periodLabels[reportPeriod] || gstPeriod)}`
        );
        reportRows.push(
          `${t('invoiceNo', 'Invoice No')} | ${t('date', 'Date')} | ${t('customer', 'Customer')} | ${t('taxableAmount', 'Taxable')} | ${t('totalTax', 'Tax')} | ${t('grandTotal', 'Total')}`
        );
        gstInvoiceWiseReport.forEach((inv) => {
          reportRows.push(
            `${inv.invoiceNumber} | ${inv.invoiceDate} | ${t(inv.customerName, inv.customerName)} | ${formatAmount(inv.taxableAmount)} | ${formatAmount(inv.totalTax)} | ${formatAmount(inv.grandTotal)}`
          );
        });
        reportRows.push(
          `${t('total', 'TOTAL')} | ${toDevanagari(gstInvoiceWiseReport.length)} ${t('invoices', 'Invoices')} | - | ${formatAmount(gstSalesSummary.taxableSales)} | ${formatAmount(gstSalesSummary.totalTax)} | ${formatAmount(gstSalesSummary.totalSales)}`
        );
      } else if (gstReportTab === "purchase-gst") {
        reportRows.push(
          `${t('purchaseGstReport', 'Purchase GST Report')} - ${t(periodLabels[reportPeriod] || gstPeriod, periodLabels[reportPeriod] || gstPeriod)}`
        );
        reportRows.push(
          `${t('invoiceNo', 'Invoice No')} | ${t('supplier', 'Supplier')} | ${t('taxableAmount', 'Taxable')} | ${t('totalTax', 'Tax')} | ${t('grandTotal', 'Total')}`
        );
        (((gstPurchaseReport as any)?.purchaseList || (gstPurchaseReport as any)?.invoices || [])).forEach((pInv: any) => {
          reportRows.push(
            `${pInv.invoiceNumber || pInv.billNumber || 'PI'} | ${t(pInv.supplierName, pInv.supplierName || 'Supplier')} | ${formatAmount(pInv.taxableAmount || 0)} | ${formatAmount(pInv.taxAmount || 0)} | ${formatAmount(pInv.totalAmount || 0)}`
          );
        });
      }
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!printWindow) {
      setAppAlert({ title: "PDF Export", message: "Please allow pop-ups to generate the PDF.", type: "error" });
      return;
    }

    const rowsHtml = reportRows
      .map((row, index) =>
        index === 0 || row === "Month-wise Expense Report" || row === "Top Expenses"
          ? `<tr><th colspan="5">${row}</th></tr>`
          : `<tr>${row
              .split(" | ")
              .map((cell) => `<td>${cell}</td>`)
              .join("")}</tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hotel Report</title>
          <style>

          
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #2d2119;
            }
            h1 {
              margin-bottom: 5px;
              color: #6f3d20;
            }
            p {
              color: #4b5563;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #e6ddd5;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background: #f5ece4;
              color: #6f3d20;
            }
            .footer {
              margin-top: 30px;
              color: #4b5563;
              font-size: 12px;
            }



            

            /* =========================================================
   INVENTORY STYLE UI - REPORTS & EXPENSES
   UI ONLY - EXISTING FUNCTIONALITY UNCHANGED
   ========================================================= */

.er-page {
  width: 100% !important;
  min-height: 100vh !important;
  padding: 22px 24px 30px !important;

  background:
    radial-gradient(
      circle at 92% 0%,
      rgba(194, 111, 42, 0.035),
      transparent 25%
    ),
    #fbfaf7 !important;

  color: #2d2119 !important;
  font-family: Inter, Arial, sans-serif !important;
}

.er-shell {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}

/* ================= HEADER ================= */

.er-header {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 20px !important;
  margin-bottom: 18px !important;
}

.er-eyebrow {
  display: none !important;
}

.er-header h1 {
  margin: 0 0 6px !important;
  font-size: 26px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  color: #211b17 !important;
  letter-spacing: -0.5px !important;
}

.er-header p {
  margin: 0 !important;
  color: #4b5563 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

/* ================= HEADER BUTTONS ================= */

.er-header-actions {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
}

.er-header-actions .er-btn,
.er-btn.secondary {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 14px !important;

  border-radius: 9px !important;
  border: 1px solid #ddd5ce !important;

  background: #ffffff !important;
  color: #59483e !important;

  font-size: 12px !important;
  font-weight: 700 !important;

  box-shadow: none !important;
}

.er-header-actions .er-btn:hover,
.er-btn.secondary:hover {
  background: #fff8f2 !important;
  border-color: #cba98e !important;
  color: #8f4b24 !important;
  transform: none !important;
  box-shadow: none !important;
}

.er-btn.primary {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 16px !important;

  border-radius: 9px !important;

  background: linear-gradient(
    135deg,
    #9d4d1d,
    #b85d18
  ) !important;

  border: 1px solid #a95316 !important;
  color: #ffffff !important;

  font-size: 12px !important;
  font-weight: 800 !important;

  box-shadow: 0 5px 12px rgba(156, 76, 27, 0.16) !important;
}

.er-btn.primary:hover {
  background: linear-gradient(
    135deg,
    #8f4318,
    #a95016
  ) !important;

  border-color: #8f4318 !important;
  color: #ffffff !important;
  transform: translateY(-1px) !important;
}

/* PDF button */

.er-btn.dark {
  height: 38px !important;
  min-height: 38px !important;

  background: #ffffff !important;
  border: 1px solid #ddd5ce !important;

  color: #59483e !important;

  box-shadow: none !important;
}

.er-btn.dark:hover {
  background: #fff8f2 !important;
  color: #8f4b24 !important;
  border-color: #cba98e !important;
}

/* ================= KPI CARDS ================= */

.er-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 12px !important;
  margin-bottom: 18px !important;
}

.er-kpi-card {
  min-height: 82px !important;

  background: #ffffff !important;
  border: 1px solid #e5ddd6 !important;
  border-radius: 11px !important;

  padding: 13px 14px !important;

  box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035) !important;

  animation: none !important;
}

.er-kpi-card::after {
  display: none !important;
}

.er-kpi-icon {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  border-radius: 9px !important;
}

.er-kpi-card span {
  margin-bottom: 3px !important;
  color: #374151 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
}

.er-kpi-card strong {
  color: #211b17 !important;
  font-size: 17px !important;
  font-weight: 800 !important;
}

.er-kpi-meta {
  margin-top: 2px !important;
  color: #5a9a70 !important;
  font-size: 9px !important;
}

/* ================= MAIN TABS ================= */

.er-main-tabs {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;

  margin-bottom: 12px !important;
  padding: 0 !important;

  border: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

.er-main-tabs button {
  min-height: 35px !important;

  padding: 0 14px !important;

  border: 1px solid #ddd5ce !important;
  border-radius: 7px !important;

  background: #ffffff !important;
  color: #596575 !important;

  font-size: 11px !important;
  font-weight: 800 !important;

  box-shadow: none !important;
}

.er-main-tabs button:hover {
  background: #fff7ef !important;
  border-color: #cda27f !important;
  color: #8f4b24 !important;
}

.er-main-tabs button.active {
  background: #17085c !important;
  border-color: #17085c !important;
  color: #ffffff !important;

  box-shadow: none !important;
}

/* ================= CONTENT CARD ================= */

.er-content-card,
.er-report-content,
.er-chart-card {
  background: #ffffff !important;

  border: 1px solid #e5ddd6 !important;
  border-radius: 11px !important;

  box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035) !important;
}

/* ================= EXPENSE SECTION HEADER ================= */

.er-section-header {
  min-height: 72px !important;

  padding: 15px 18px !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;

  border-bottom: 1px solid #eee7e1 !important;
}

.er-section-header h2 {
  margin: 0 0 4px !important;

  color: #211b17 !important;

  font-size: 16px !important;
  font-weight: 800 !important;
}

.er-section-header p {
  margin: 0 !important;

  color: #4b5563 !important;

  font-size: 11px !important;
}

/* ================= SEARCH ================= */

.er-section-actions {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
}

.er-search {
  position: relative !important;
  width: 285px !important;
  height: 38px !important;

  padding: 0 11px !important;

  border: 1px solid #ddd5ce !important;
  border-radius: 9px !important;

  background: #ffffff !important;

  color: #374151 !important;

  box-shadow: none !important;
}

.er-search:focus-within {
  border-color: #bd7443 !important;

  box-shadow:
    0 0 0 3px rgba(189, 116, 67, 0.08) !important;
}

.er-search input {
  background: transparent !important;
  color: #403933 !important;

  font-size: 11px !important;
}

.er-search input::placeholder {
  color: #4b5563 !important;
}

.er-search-validation-error {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  color: #dc2626;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
  z-index: 5;
}


/* ================= TABLE ================= */

.er-table-wrapper,
.er-report-table-card {
  width: 100% !important;
  overflow-x: auto !important;
  background: #ffffff !important;
}

.er-table {
  width: 100% !important;
  min-width: 700px !important;

  background: #ffffff !important;

  border-collapse: collapse !important;
}

.er-table th {
  height: 40px !important;

  padding: 0 15px !important;

  background: #fcfaf7 !important;

  color: #984d25 !important;

  text-align: left !important;

  font-size: 10px !important;
  font-weight: 800 !important;

  letter-spacing: 0.35px !important;

  border-bottom: 1px solid #eee6df !important;

  white-space: nowrap !important;
}

.er-table td {
  height: 52px !important;

  padding: 10px 15px !important;

  background: #ffffff !important;

  color: #374151 !important;

  font-size: 11px !important;

  border-bottom: 1px solid #f0ebe6 !important;
}

.er-table tbody tr {
  background: #ffffff !important;
  transition: background 0.15s ease !important;
}

.er-table tbody tr:hover {
  background: #fffaf5 !important;
}

.er-table tbody tr:hover td {
  background: #fffaf5 !important;
}

/* ================= EXPENSE NAME ================= */

.er-name-cell {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;

  color: #292524 !important;

  font-size: 11px !important;
  font-weight: 700 !important;
}

.er-name-cell span {
  color: #292524 !important;
}

.er-small-icon {
  width: 29px !important;
  height: 29px !important;
  min-width: 29px !important;

  border-radius: 7px !important;

  background: #fff3e8 !important;
  border: 1px solid #f2dfcf !important;

  color: #a75a2b !important;
}

/* ================= CATEGORY ================= */

.er-category-badge {
  padding: 5px 8px !important;

  border-radius: 6px !important;

  background: #f7f2ed !important;
  border: 1px solid #e8ded5 !important;

  color: #4b3f36 !important;

  font-size: 9px !important;
  font-weight: 800 !important;
}

/* ================= PAYMENT ================= */

.er-payment-badge {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;

  color: #374151 !important;

  font-size: 10px !important;
  font-weight: 700 !important;
}

/* ================= AMOUNT ================= */

.er-amount {
  color: #292524 !important;
  font-weight: 800 !important;
}

/* Expense List: Amount must align exactly like Branch Code */
.er-expense-list-table th:nth-child(3),
.er-expense-list-table td:nth-child(3) {
  text-align: left !important;
  vertical-align: middle !important;
  white-space: nowrap !important;
  padding: 10px 15px !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  box-sizing: border-box !important;
}

.er-expense-list-table th:nth-child(3),
.er-expense-list-table td:nth-child(3) {
  /* Same left edge/padding as the Branch Code column */
  text-indent: 0 !important;
}

.er-expense-list-table td:nth-child(3).er-amount {
  text-align: left !important;
  padding-left: 15px !important;
  padding-right: 15px !important;
  font-variant-numeric: tabular-nums !important;
}

/* ================= ACTION ICONS ================= */

.er-actions {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

.er-action {
  width: 28px !important;
  height: 28px !important;

  border-radius: 6px !important;

  border: 1px solid transparent !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  box-shadow: none !important;
}

.er-action.view {
  background: #f0f5fb !important;
  color: #5578a7 !important;
  border-color: #dbe7f3 !important;
}

.er-action.edit {
  background: #fff5e9 !important;
  color: #bd6d29 !important;
  border-color: #f3dfc8 !important;
}

.er-action.delete {
  background: #fff0ee !important;
  color: #c85b52 !important;
  border-color: #f1d6d2 !important;
}

.er-action.view:hover,
.er-action.edit:hover,
.er-action.delete:hover {
  transform: none !important;
  filter: brightness(0.97) !important;
}

/* ================= TABLE FOOTER ================= */

.er-table tfoot td {
  height: 42px !important;

  padding: 10px 15px !important;

  background: #fcfaf7 !important;

  color: #374151 !important;

  font-size: 10px !important;
  font-weight: 800 !important;

  border-top: 1px solid #eee6df !important;
}

/* ================= REPORT LAYOUT ================= */

.er-report-layout {
  display: grid !important;

  grid-template-columns: 195px minmax(0, 1fr) !important;

  gap: 12px !important;

  align-items: start !important;
}

/* ================= REPORT MENU ================= */

.er-report-menu {
  background: #ffffff !important;

  border: 1px solid #e5ddd6 !important;
  border-radius: 11px !important;

  padding: 10px !important;

  box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035) !important;
}

.er-report-menu h3 {
  margin: 4px 8px 9px !important;

  color: #211b17 !important;

  font-size: 13px !important;
  font-weight: 800 !important;
}

.er-report-menu button {
  width: 100% !important;

  min-height: 36px !important;

  margin-bottom: 3px !important;

  padding: 0 9px !important;

  border: none !important;
  border-left: 2px solid transparent !important;

  border-radius: 6px !important;

  background: transparent !important;

  color: #374151 !important;

  font-size: 10px !important;
  font-weight: 800 !important;

  display: flex !important;
  align-items: center !important;
  gap: 8px !important;

  text-align: left !important;
}

.er-report-menu button:hover {
  background: #fff6ee !important;
  color: #984d25 !important;
}

.er-report-menu button.active {
  background: #fff0e4 !important;

  color: #984d25 !important;

  border-left: 2px solid #a95316 !important;
}

/* ================= REPORT CONTENT ================= */

.er-report-content {
  overflow: hidden !important;

  background: #ffffff !important;
}

.er-report-title {
  min-height: 70px !important;

  padding: 14px 18px !important;

  background: #ffffff !important;

  border-bottom: 1px solid #eee7e1 !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.er-report-title h2 {
  margin: 0 0 4px !important;

  color: #211b17 !important;

  font-size: 16px !important;
  font-weight: 800 !important;
}

.er-report-title p {
  margin: 0 !important;

  color: #4b5563 !important;

  font-size: 10px !important;
}

/* ================= REPORT DATE FILTER ================= */

.er-date-filter {
  min-width: 155px !important;
  height: 36px !important;

  padding: 0 10px !important;

  display: flex !important;
  align-items: center !important;
  gap: 7px !important;

  background: #ffffff !important;

  border: 1px solid #ddd5ce !important;

  border-radius: 8px !important;

  color: #374151 !important;
}

.er-date-filter select {
  width: 100% !important;
  height: 100% !important;

  background: transparent !important;

  border: none !important;
  outline: none !important;

  color: #514943 !important;

  font-size: 10px !important;
  font-weight: 700 !important;
}

.er-date-filter select option {
  background: #ffffff !important;
  color: #403933 !important;
}

/* ================= INNER REPORT CARD ================= */

.er-inner-report-heading {
  min-height: 62px !important;

  padding: 13px 16px !important;

  background: #ffffff !important;

  border-bottom: 1px solid #eee7e1 !important;
}

.er-inner-report-heading h3 {
  margin: 0 0 3px !important;

  color: #29231f !important;

  font-size: 13px !important;
  font-weight: 800 !important;
}

.er-inner-report-heading p {
  margin: 0 !important;

  color: #4b5563 !important;

  font-size: 10px !important;
}

.er-inner-report-heading > strong {
  color: #a45625 !important;

  font-size: 13px !important;
}

/* ================= REPORT FILTER NOTE ================= */

.er-static-filter-note {
  padding: 9px 14px !important;

  background: #fcfaf7 !important;

  border-bottom: 1px solid #eee7e1 !important;

  color: #374151 !important;

  font-size: 10px !important;
}

.er-static-filter-note strong {
  color: #a45625 !important;
}

/* ================= STATUS ================= */

.er-status.present {
  background: #eaf6ed !important;
  color: #43845a !important;

  border: 1px solid #d7eadc !important;
}

.er-status.absent {
  background: #fff0ee !important;
  color: #c85b52 !important;

  border: 1px solid #f1d8d4 !important;
}

/* ================= CHARTS TOOLBAR ================= */

.er-charts-toolbar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;

  gap: 15px !important;

  margin-bottom: 12px !important;

  padding: 13px 16px !important;

  background: #ffffff !important;

  border: 1px solid #e5ddd6 !important;
  border-radius: 11px !important;

  box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035) !important;
}

.er-charts-toolbar strong {
  color: #211b17 !important;

  font-size: 14px !important;
  font-weight: 800 !important;
}

.er-charts-toolbar span {
  color: #4b5563 !important;

  font-size: 10px !important;
}

/* ================= CHART PERIOD BUTTONS ================= */

.er-chart-periods,
.er-report-periods.er-chart-periods {
  display: flex !important;

  gap: 4px !important;

  padding: 4px !important;

  background: #f7f3ef !important;

  border: 1px solid #e4dbd3 !important;

  border-radius: 8px !important;
}

.er-chart-periods button,
.er-report-periods.er-chart-periods button {
  min-height: 29px !important;

  padding: 0 10px !important;

  border: none !important;

  border-radius: 6px !important;

  background: transparent !important;

  color: #374151 !important;

  font-size: 9px !important;
  font-weight: 800 !important;
}

.er-chart-periods button:hover,
.er-report-periods.er-chart-periods button:hover {
  background: #ffffff !important;
  color: #8f4b24 !important;
}

.er-chart-periods button.active,
.er-report-periods.er-chart-periods button.active {
  background: #984d25 !important;

  color: #ffffff !important;

  box-shadow: none !important;
}

/* ================= CHART CARDS ================= */

.er-chart-card {
  background: #ffffff !important;

  border: 1px solid #e5ddd6 !important;

  color: #403933 !important;

  box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035) !important;

  animation: none !important;
}

.er-chart-card::before {
  display: none !important;
}

.er-chart-header h3 {
  color: #29231f !important;

  font-size: 13px !important;
  font-weight: 800 !important;
}

.er-chart-header p {
  color: #4b5563 !important;

  font-size: 9px !important;
}

.er-chart-value {
  color: #a45625 !important;

  font-size: 11px !important;
}

/* ================= CHART LINES / BACKGROUNDS ================= */

.er-chart-divider {
  background: #eee7e1 !important;
}

.er-trend {
  border-bottom: 1px solid #eee7e1 !important;
}

.er-trend-label,
.er-column-label {
  color: #7f8589 !important;
}

.er-trend-value {
  color: #655f5a !important;
}

.er-donut::after {
  background: #ffffff !important;

  box-shadow: 0 0 0 1px #e5ddd6 !important;
}

.er-donut-center strong {
  color: #302923 !important;
}

.er-donut-center span {
  color: #4b5563 !important;
}

.er-legend-item {
  color: #706d69 !important;
}

.er-legend-item strong {
  color: #4c4641 !important;
}

.er-chart-legend span {
  color: #706d69 !important;
}

.er-bar-track {
  background: #eee8e2 !important;
}

.er-bar-label {
  color: #6b6763 !important;
}

.er-bar-value {
  color: #4c4641 !important;
}

.er-top-expense {
  background: #ffffff !important;

  border: 1px solid #e7ded7 !important;
}

.er-top-rank {
  background: #fff1e5 !important;
  color: #a45625 !important;
}

.er-top-expense-name {
  color: #5a5551 !important;
}

.er-top-expense-amount {
  color: #4c4641 !important;
}

.er-chart-empty {
  background: #fcfaf7 !important;

  border: 1px dashed #ded5cd !important;

  color: #85807a !important;
}

/* ================= MODALS ================= */

.er-modal {
  background: #ffffff !important;

  border: 1px solid #e5ddd6 !important;

  border-radius: 12px !important;

  box-shadow: 0 20px 60px rgba(50, 34, 23, 0.18) !important;
}

.er-modal-header {
  background: #ffffff !important;

  border-bottom: 1px solid #eee7e1 !important;
}

.er-modal-header h2 {
  color: #29231f !important;
}

.er-modal-header p {
  color: #788397 !important;
}

.er-close-btn {
  background: #f5f1ed !important;

  color: #6e6964 !important;
}

.er-close-btn:hover {
  background: #eee7e1 !important;

  color: #29231f !important;
}

.er-modal input,
.er-modal select,
.er-modal textarea {
  background: #ffffff !important;

  color: #403933 !important;

  border: 1px solid #ddd5ce !important;
}

.er-modal input::placeholder,
.er-modal textarea::placeholder {
  color: #9a9691 !important;
}

.er-modal select option {
  background: #ffffff !important;

  color: #403933 !important;
}

.er-modal label {
  color: #514943 !important;
}

.er-modal .er-modal-footer {
  background: #fcfaf7 !important;

  border-top: 1px solid #eee7e1 !important;
}

.er-modal .er-cancel-btn {
  background: #ffffff !important;

  color: #5c554f !important;

  border: 1px solid #ddd5ce !important;
}

/* ================= RESPONSIVE ================= */

@media (max-width: 1180px) {
  .er-kpi-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media (max-width: 900px) {
  .er-page {
    padding: 18px !important;
  }

  .er-header {
    flex-direction: column !important;
  }

  .er-header-actions {
    width: 100% !important;
    justify-content: flex-start !important;
  }

  .er-kpi-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .er-report-layout {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 650px) {
  .er-page {
    padding: 12px !important;
  }

  .er-header h1 {
    font-size: 22px !important;
  }

  .er-header-actions {
    width: 100% !important;
  }

  .er-header-actions .er-btn {
    flex: 1 !important;
  }

  .er-kpi-grid {
    grid-template-columns: 1fr !important;
  }

  .er-section-header,
  .er-report-title,
  .er-charts-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .er-section-actions {
    width: 100% !important;
    flex-direction: row !important;
  }

  .er-search {
    width: 100% !important;
  }

  .er-report-menu {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .er-report-menu h3 {
    grid-column: 1 / -1 !important;
  }

  .er-chart-periods {
    width: 100% !important;
  }

  .er-chart-periods button {
    flex: 1 !important;
  }
}



          
/* =========================================================
   FINAL READABILITY FIX
   ONLY: Menu Report, Top Expenses & Expense Snapshot text
   Existing logic, layout and functionality unchanged.
   ========================================================= */

.er-chart-card h3,
.er-chart-card p,
.er-chart-card span,
.er-chart-card strong,
.er-chart-card .er-bar-label,
.er-chart-card .er-bar-value,
.er-chart-card .er-top-expense-name,
.er-chart-card .er-top-expense-amount,
.er-chart-card .er-chart-value,
.er-chart-card .er-column-label,
.er-chart-card .er-chart-empty,
.er-chart-card .er-attendance-row,
.er-chart-card .er-status {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
  opacity: 1 !important;
}

/* Menu Report */
.er-chart-card.wide .er-chart-header h3,
.er-chart-card.wide .er-chart-header p,
.er-chart-card.wide .er-bar-label,
.er-chart-card.wide .er-bar-value {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
}

/* Top Expenses */
.er-top-expenses .er-top-expense-name,
.er-top-expenses .er-top-expense-amount,
.er-top-expenses .er-top-rank {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
  opacity: 1 !important;
}

/* Expense Snapshot */
.er-chart-card.full .er-chart-header h3,
.er-chart-card.full .er-chart-header p,
.er-chart-card.full .er-chart-value,
.er-chart-card.full .er-bar-label,
.er-chart-card.full .er-bar-value {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
  opacity: 1 !important;
}



</style>
        </head>
        <body>
          <h1>${activeSection === "purchase" ? t('purchaseReport', 'Purchase Summary Report') : activeSection === "charts" ? t('businessAnalytics', 'Charts Summary') : activeSection === "gst-report" ? t('gstReport', 'GST Report & Sales Summary') : t('expensesAndReports', 'Expenses & Reports')}</h1>
          <p>${periodLabels[reportPeriod] || gstPeriod} • Hotel Management${activeSection === "purchase" ? ` • ${t('totalPurchase', 'Total Purchase')}: ${formatAmount(reportPurchaseTotal)}` : activeSection === "gst-report" ? ` • ${t('totalSales', 'Total Sales')}: ${formatAmount(gstSalesSummary.totalSales)} • ${t('totalTax', 'Total Tax')}: ${formatAmount(gstSalesSummary.totalTax)}` : ''}</p>
          <table>${rowsHtml}</table>
          <div class="footer">
            ${activeSection === "purchase" ? "Generated from Hotel Purchase Management Module." : activeSection === "gst-report" ? "Generated from Hotel GST & Financial Reports Module." : "Generated from Hotel Expenses & Reports module."}
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\s+/g, " ").replace(/^ /, "");

    if (value && !/^[A-Za-z ]*$/.test(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        name: "Only letters and spaces are allowed.",
      }));
      return;
    }

    setValidationErrors((prev) => ({
      ...prev,
      name: "",
    }));

    setExpenseForm((prev) => ({
      ...prev,
      name: value,
    }));
  };

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value && !/^\d*\.?\d*$/.test(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        amount: "Only positive numbers are allowed.",
      }));
      return;
    }

    setValidationErrors((prev) => ({
      ...prev,
      amount: "",
    }));

    setExpenseForm((prev) => ({
      ...prev,
      amount: value.replace(/^-/, ""),
    }));
  };

  const openExpenseDatePicker = () => {
    const input = expenseDateInputRef.current;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Fall back to focusing/clicking the native date input.
    }

    input.focus();
    input.click();
  };

  const handleCategoryNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value && !/^[A-Za-z ]*$/.test(value)) {
      setCategoryError("Category name must contain only letters and spaces.");
      return;
    }

    if (value.startsWith(" ")) {
      setCategoryError("Category name cannot start with a space.");
      return;
    }

    if (value.includes("  ")) {
      setCategoryError("Only single spaces are allowed between words.");
      return;
    }

    setCategoryError("");
    setNewCategoryName(value);
  };

  const handleAddCategory = () => {
    const category = newCategoryName;

    if (!category) {
      setCategoryError("Category name is required.");
      return;
    }

    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(category)) {
      setCategoryError(
        "Category name must contain only letters with single spaces between words."
      );
      return;
    }

    if (expenseCategories.some((item) => item.toLowerCase() === category.toLowerCase())) {
      setCategoryError("This expense category already exists.");
      return;
    }

    setExpenseCategories((prev) => [...prev, category]);
    setExpenseForm((prev) => ({ ...prev, category }));
    setNewCategoryName("");
    setCategoryError("");
    setShowCategoryModal(false);
    setAppAlert({
      title: "Category Added",
      message: `${category} was added successfully.`,
      type: "success",
    });
  };

  const openReportDetails = () => {
    setShowReportDetails(true);
  };

  const renderReport = () => {
    if (activeReport === "sales") {
      return (
        <div className="er-report-table-card">
          <style>{`
            .er-sales-report-table th:nth-child(3),
            .er-sales-report-table td:nth-child(3) {
              text-align: left !important;
            }
          `}</style>
          <table className="er-table er-sales-report-table">
            <thead>
              <tr>
                <th>{t('date', 'Date')}</th>
                <th>{t('totalBills', 'Total Bills')}</th>
                <th>{t('totalSales', 'Total Sales')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="er-empty">
                    {t('noSalesFound', 'No sales data found for')} {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}.
                  </td>
                </tr>
              ) : (
                filteredSalesData.map((item) => (
                  <tr key={item.date}>
                    <td>{formatDate(item.date)}</td>
                    <td>{toDevanagari(item.bills)}</td>
                    <td className="er-amount">
                      {formatAmount(item.sales)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{t('totalSales', 'Total Sales')}</td>
                <td>{formatAmount(reportSalesTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    if (activeReport === "expense") {
      return (
        <div className="er-expense-report-stack">
          <div className="er-report-table-card">
            <style>{`
              .er-expense-category-report th:nth-child(2),
              .er-expense-category-report td:nth-child(2),
              .er-expense-category-report th:nth-child(3),
              .er-expense-category-report td:nth-child(3) {
                text-align: left !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
              }

/* Final targeted readability fix for Menu Report, Top Expenses and Expense Snapshot */
.er-menu-report-card,
.er-top-expenses-card,
.er-expense-snapshot-card {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
}

.er-menu-report-card .er-chart-header h3,
.er-top-expenses-card .er-chart-header h3,
.er-expense-snapshot-card .er-chart-header h3 {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
  opacity: 1 !important;
}

.er-menu-report-card .er-chart-header p,
.er-top-expenses-card .er-chart-header p,
.er-expense-snapshot-card .er-chart-header p {
  color: #514840 !important;
  -webkit-text-fill-color: #514840 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  line-height: 1.45 !important;
  opacity: 1 !important;
}

.er-menu-report-card .er-bar-label,
.er-menu-report-card .er-bar-value,
.er-top-expenses-card .er-top-rank,
.er-top-expenses-card .er-top-expense-name,
.er-top-expenses-card .er-top-expense-amount,
.er-expense-snapshot-card .er-chart-value,
.er-expense-snapshot-card .er-bar-label,
.er-expense-snapshot-card .er-bar-value {
  color: #211b17 !important;
  -webkit-text-fill-color: #211b17 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1.45 !important;
  opacity: 1 !important;
}

.er-menu-report-card .er-bar-value,
.er-top-expenses-card .er-top-expense-amount,
.er-expense-snapshot-card .er-bar-value,
.er-expense-snapshot-card .er-chart-value {
  font-weight: 700 !important;
}
            `}</style>
            <div className="er-inner-report-heading">
              <div>
                <h3>{t('expenseByCategory', 'Expense by Category')}</h3>
                <p>
                  {t('categoryWiseExpenseSummary', 'Category-wise expense summary for')}{" "}
                  {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}.
                </p>
              </div>
              <strong>{formatAmount(reportExpenseTotal)}</strong>
            </div>

            <table className="er-table er-expense-category-report">
              <thead>
                <tr>
                  <th>{t('category', 'Category')}</th>
                  <th>{t('numberOfExpenses', 'Number of Expenses')}</th>
                  <th>{t('totalAmount', 'Total Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {categoryReport.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="er-empty">
                      {t('noExpensesFound', 'No expense data found for')} {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}.
                    </td>
                  </tr>
                ) : (
                  categoryReport.map((item) => (
                    <tr key={item.category}>
                      <td>{t(item.category, item.category)}</td>
                      <td>{toDevanagari(item.count)}</td>
                      <td className="er-amount">
                        {formatAmount(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>{t('totalExpenses', 'Total Expenses')}</td>
                  <td>{formatAmount(reportExpenseTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {reportPeriod === "this-month" && (
            <div className="er-report-table-card">
              <div className="er-inner-report-heading">
                <div>
                  <h3>
                    {selectedReportDate
                      ? t('dateWiseExpenseReport', 'Date-wise Expense Report')
                      : t('monthWiseExpenseReport', 'Month-wise Expense Report')}
                  </h3>
                  <p>
                    {selectedReportDate
                      ? t('expenseBreakupDate', 'Expense breakup for the selected date.')
                      : t('expenseBreakupMonth', 'Monthly expense breakup based on the selected date range.')}
                  </p>
                </div>

              </div>

              <table className="er-table">
                <thead>
                  <tr>
                    <th>{selectedReportDate ? t('date', 'Date') : t('month', 'Month')}</th>
                    <th>{t('numberOfExpenses', 'Number of Expenses')}</th>
                    <th>{t('totalAmount', 'Total Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReportDate ? (
                    dateWiseReport.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="er-empty">
                          {t('noExpenseDataAvailable', 'No expense data available for')}{" "}
                          {formatDate(selectedReportDate)}.
                        </td>
                      </tr>
                    ) : (
                      dateWiseReport.map((item) => (
                        <tr key={item.date}>
                          <td>{formatDate(item.date)}</td>
                          <td>{toDevanagari(item.count)}</td>
                          <td className="er-amount">
                            {formatAmount(item.amount)}
                          </td>
                        </tr>
                      ))
                    )
                  ) : monthWiseReport.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="er-empty">
                        {t('noMonthlyExpenseData', 'No monthly expense data available.')}
                      </td>
                    </tr>
                  ) : (
                    monthWiseReport.map((item) => (
                      <tr key={item.month}>
                        <td>{formatMonthYear(item.month)}</td>
                        <td>{toDevanagari(item.count)}</td>
                        <td className="er-amount">
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activeReport === "order") {
      return (
        <div className="er-report-table-card">
          <table className="er-table">
            <thead>
              <tr>
                <th>{t('date', 'Date')}</th>
                <th>{t('totalOrders', 'Total Orders')}</th>
                <th>{t('dineIn', 'Dine-in')}</th>
                <th>{t('takeaway', 'Takeaway')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrderData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="er-empty">
                    {t('noOrderDataFound', 'No order data found for')} {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}.
                  </td>
                </tr>
              ) : (
                filteredOrderData.map((item) => (
                  <tr key={item.date}>
                    <td>{formatDate(item.date)}</td>
                    <td>{toDevanagari(item.total)}</td>
                    <td>{toDevanagari(item.dineIn)}</td>
                    <td>{toDevanagari(item.takeaway ?? item.delivery)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={1}>{t('totalOrders', 'Total Orders')}</td>
                <td colSpan={3}>{toDevanagari(reportOrderTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    if (activeReport === "menu") {
      return (
        <div className="er-report-table-card">
          <div className="er-static-filter-note">
            <span>{t('menuPerformance', 'Menu performance')}</span>
            <strong>
              {t('snapshot', 'Snapshot')} • {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}
            </strong>
          </div>

          <style>{`
            .er-menu-report-table th:nth-child(4),
            .er-menu-report-table td:nth-child(4) {
              text-align: left !important;
            }
          `}</style>

          <table className="er-table er-menu-report-table">
            <thead>
              <tr>
                <th>{t('menuItem', 'Menu Item')}</th>
                <th>{t('category', 'Category')}</th>
                <th>{t('totalOrders', 'Total Orders')}</th>
                <th>{t('totalSales', 'Total Sales')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMenuData.map((item) => (
                <tr key={item.item}>
                  <td>{t(item.item, item.item)}</td>
                  <td>{t(item.category, item.category)}</td>
                  <td>{toDevanagari(item.orders)}</td>
                  <td className="er-amount">
                    {formatAmount(item.sales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }


    return (
      <div className="er-report-table-card">
        <div className="er-static-filter-note">
          <span>{t('branchPerformance', 'Branch performance')}</span>
          <strong>
            {t('snapshot', 'Snapshot')} • {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}
          </strong>
        </div>

        <style>{`
          .er-branch-report-table th:nth-child(2),
          .er-branch-report-table td:nth-child(2),
          .er-branch-report-table th:nth-child(3),
          .er-branch-report-table td:nth-child(3) {
            text-align: left !important;
          }
        `}</style>

        <table className="er-table er-branch-report-table">
          <thead>
            <tr>
              <th>{t('branch', 'Branch')}</th>
              <th>{t('totalSales', 'Total Sales')}</th>
              <th>{t('totalExpenses', 'Total Expenses')}</th>
              <th>{t('netAmount', 'Net Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBranchData.map((item) => (
              <tr key={item.branch}>
                <td>{t(item.branch, item.branch)}</td>
                <td className="er-amount" style={{ textAlign: "left" }}>
                  {formatAmount(item.sales)}
                </td>
                <td className="er-amount" style={{ textAlign: "left" }}>
                  {formatAmount(item.expenses)}
                </td>
                <td className="er-net">
                  {formatAmount(item.sales - item.expenses)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="er-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .er-page {
          width: 100%;
          min-height: 100vh;
          padding: 0 0 24px;
          background:
            radial-gradient(circle at 90% 0%, rgba(183, 125, 75, 0.08), transparent 28%),
            #f8f5f1;
          color: #2d2119;
          font-family: Inter, Arial, sans-serif;
        }

        .er-shell {
          max-width: 100%;
          margin: 0 auto;
        }

        .er-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .er-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f1e4d7;
          color: #8a4b25;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .7px;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .er-header h1 {
          margin: 0 0 6px;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 800;
          color: #2b1d15;
          letter-spacing: -.6px;
        }

        .er-header p {
          margin: 0;
          color: #8a7a6f;
          font-size: 13px;
        }

        .er-header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .er-date-filter {
          height: 42px;
          min-width: 170px;
          padding: 0 12px;
          border: 1px solid #dfd2c8;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fffdfb;
          color: #765f50;
        }

        .er-date-filter select {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #4d382c;
          font-size: 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .er-btn {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #dfd2c8;
          background: #fffdfb;
          color: #5e4638;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          transition: .2s ease;
        }

        .er-btn:hover {
          transform: translateY(-1px);
          border-color: #c9b19e;
          box-shadow: 0 8px 20px rgba(84, 54, 36, .08);
        }

        .er-btn.primary {
          background: #8f4b24;
          border-color: #8f4b24;
          color: #fff;
        }

        .er-btn.primary:hover {
          background: #743a1b;
          border-color: #743a1b;
        }

        .er-btn.dark {
          background: #2e2119;
          border-color: #2e2119;
          color: #fff;
        }

        .er-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 13px;
          margin-bottom: 20px;
        }

        .er-kpi-card {
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,.92);
          border: 1px solid #eadfd7;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 7px 22px rgba(76, 50, 34, .055);
          animation: erFadeUp .45s ease both;
        }

        .er-kpi-card:nth-child(2) { animation-delay: .04s; }
        .er-kpi-card:nth-child(3) { animation-delay: .08s; }
        .er-kpi-card:nth-child(4) { animation-delay: .12s; }
        .er-kpi-card:nth-child(5) { animation-delay: .16s; }

        .er-kpi-card::after {
          content: "";
          position: absolute;
          width: 70px;
          height: 70px;
          right: -25px;
          top: -25px;
          border-radius: 50%;
          background: rgba(176, 110, 63, .05);
        }

        .er-kpi-icon {
          width: 43px;
          height: 43px;
          min-width: 43px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sales-icon {
          background: #e8f4eb;
          color: #4f8a65;
        }

        .expense-icon {
          background: #fae9e4;
          color: #c04b38;
        }

        .net-icon {
          background: #ececfb;
          color: #6873c9;
        }

        .bill-icon {
          background: #f9ead9;
          color: #c56b20;
        }

        .order-icon {
          background: #eee8f9;
          color: #7b5abf;
        }

        .er-kpi-card span {
          display: block;
          margin-bottom: 5px;
          color: #8c7d73;
          font-size: 11px;
          font-weight: 700;
        }

        .er-kpi-card strong {
          display: block;
          color: #241912;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -.3px;
        }

        .er-kpi-meta {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: #4f8a65;
          font-weight: 800;
        }

        .er-main-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 15px;
          padding: 4px 7px;
          border-bottom: 1px solid #dfd2c8;
          background: transparent;
        }

        .er-main-tabs button {
          border: none;
          background: transparent;
          color: #806f63;
          padding: 10px 16px;
          border-radius: 9px 9px 0 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          transition: .2s ease;
        }

        .er-main-tabs button:hover {
          color: #8f4b24;
          background: #f5ece4;
        }

        .er-main-tabs button.active {
          background: #fffdfb;
          color: #8f4b24;
          box-shadow: 0 -2px 0 #8f4b24 inset;
        }

        .er-content-card,
        .er-report-content,
        .er-chart-card {
          background: rgba(255,255,255,.95);
          border: 1px solid #eadfd7;
          border-radius: 14px;
          box-shadow: 0 7px 22px rgba(76, 50, 34, .055);
        }

        .er-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 17px 19px;
          border-bottom: 1px solid #eee5df;
        }

        .er-section-header h2,
        .er-report-title h2 {
          margin: 0 0 5px;
          font-size: 17px;
          color: #2e2018;
        }

        .er-section-header p,
        .er-report-title p {
          margin: 0;
          font-size: 12px;
          color: #927f72;
        }

        .er-section-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .er-search {
          width: 260px;
          height: 38px;
          border: 1px solid #dfd2c8;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          color: #a49387;
          background: #fffdfb;
        }

        .er-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #3d2d23;
          font-size: 12px;
        }

        .er-table-wrapper,
        .er-report-table-card {
          width: 100%;
          overflow-x: auto;
        }

        .er-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        .er-table th {
          background: #fbf8f5;
          color: #927f72;
          text-align: left;
          padding: 11px 15px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .4px;
          border-bottom: 1px solid #eee5df;
          white-space: nowrap;
        }

        .er-table td {
          padding: 13px 15px;
          border-bottom: 1px solid #f1ebe6;
          color: #5d4a3e;
          font-size: 12px;
          vertical-align: middle;
        }

        .er-table tbody tr {
          transition: .18s ease;
        }

        .er-table tbody tr:hover {
          background: #fffaf6;
        }

        .er-table tfoot td {
          background: #fbf8f5;
          font-weight: 800;
          color: #2d2119;
        }

        .er-name-cell {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 800;
          color: #32231b;
        }

        .er-small-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #f5e9de;
          color: #9a532c;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .er-category-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 6px;
          background: #f4ebe4;
          color: #79563f;
          font-size: 10px;
          font-weight: 800;
        }

        .er-payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #5c6b61;
          font-size: 11px;
          font-weight: 700;
        }

        .er-amount {
          color: #2f2119 !important;
          font-weight: 800 !important;
        }

        .er-net {
          color: #4f8a65 !important;
          font-weight: 800 !important;
        }

        .er-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .er-action {
          width: 29px;
          height: 29px;
          border: none;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: .2s ease;
        }

        .er-action:hover {
          transform: translateY(-1px);
        }

        .er-action.view {
          background: #edf3fb;
          color: #5578a7;
        }

        .er-action.edit {
          background: #fdf0df;
          color: #c26d22;
        }

        .er-action.delete {
          background: #fae8e6;
          color: #c74d45;
        }

        .er-empty {
          text-align: center !important;
          padding: 35px !important;
          color: #aa9a90 !important;
        }

        .er-report-layout {
          display: grid;
          grid-template-columns: 205px minmax(0, 1fr);
          gap: 15px;
          align-items: start;
        }

        .er-report-menu {
          background: rgba(255,255,255,.95);
          border: 1px solid #eadfd7;
          border-radius: 14px;
          padding: 12px;
          box-shadow: 0 7px 22px rgba(76, 50, 34, .055);
        }

        .er-report-menu h3 {
          margin: 4px 8px 10px;
          font-size: 14px;
          color: #32231b;
        }

        .er-report-menu button {
          width: 100%;
          border: none;
          background: transparent;
          color: #806f63;
          padding: 10px 9px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 3px;
          transition: .2s ease;
        }

        .er-report-menu button:hover {
          background: #f8efe8;
          color: #8f4b24;
        }

        .er-report-menu button.active {
          background: #f2e5da;
          color: #8f4b24;
        }

        .er-report-content {
          overflow: hidden;
        }

        .er-report-title {
          padding: 17px 19px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #eee5df;
        }

        .er-expense-report-stack {
          display: grid;
          gap: 13px;
        }

        .er-inner-report-heading {
          padding: 16px 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #eee5df;
          color: #8f4b24;
        }

        .er-inner-report-heading h3 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #32231b;
        }

        .er-inner-report-heading p {
          margin: 0;
          font-size: 11px;
          color: #927f72;
        }

        .er-static-filter-note {
          padding: 11px 15px;
          background: #fbf7f3;
          border-bottom: 1px solid #eee5df;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #806f63;
          font-size: 11px;
        }

        .er-static-filter-note strong {
          color: #8f4b24;
        }

        .er-status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
        }

        .er-status.present {
          background: #e4f3e8;
          color: #3f8057;
        }

        .er-status.absent {
          background: #f9e4e2;
          color: #bd4d45;
        }

        /* ================= CHARTS ================= */

        .er-charts-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 16px;
          padding: 14px 16px;
          border: 1px solid #2c3338;
          background: #151a1d;
          border-radius: 14px;
          box-shadow: 0 10px 28px rgba(24, 19, 15, .08);
        }

        .er-charts-toolbar strong {
          color: #f8f5f1;
          font-size: 14px;
          font-weight: 800;
        }

        .er-charts-toolbar span {
          display: block;
          margin-top: 4px;
          color: #8e999f;
          font-size: 10px;
        }

        .er-chart-periods {
          display: flex;
          gap: 5px;
          padding: 4px;
          border-radius: 10px;
          background: #20272b;
          border: 1px solid #30383d;
        }

        .er-chart-periods button {
          border: none;
          background: transparent;
          color: #8f999e;
          padding: 7px 11px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s ease;
        }

        .er-chart-periods button:hover {
          color: #fff;
          background: #293136;
        }

        .er-chart-periods button.active {
          background: #a95316;
          color: #fff;
          box-shadow: 0 4px 12px rgba(169, 83, 22, .28);
        }

        .er-charts-container {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 13px;
        }

        .er-chart-card {
          grid-column: span 3;
          min-width: 0;
          padding: 17px;
          border: 1px solid #30373b;
          border-radius: 15px;
          background: linear-gradient(145deg, #171c1f 0%, #111518 100%);
          color: #fff;
          box-shadow: 0 14px 32px rgba(18, 14, 11, .12);
          overflow: hidden;
          animation: erFadeUp .45s ease both;
          position: relative;
        }

        .er-chart-card::before {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          right: -60px;
          top: -60px;
          border-radius: 50%;
          background: rgba(214, 112, 39, .08);
          pointer-events: none;
        }

        /* Image-like 6-card layout: 6 / 3 / 3 + 6 / 3 / 3 */
        .er-charts-container > .er-chart-card:nth-child(1),
        .er-charts-container > .er-chart-card:nth-child(4) {
          grid-column: span 6;
        }

        .er-charts-container > .er-chart-card:nth-child(2),
        .er-charts-container > .er-chart-card:nth-child(3),
        .er-charts-container > .er-chart-card:nth-child(5),
        .er-charts-container > .er-chart-card:nth-child(6) {
          grid-column: span 3;
        }

        .er-chart-card.wide,
        .er-chart-card.full {
          grid-column: span 6;
        }

        .er-charts-container > .er-chart-card:nth-child(5),
        .er-charts-container > .er-chart-card:nth-child(6) {
          grid-column: span 3;
        }

        .er-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }

        .er-chart-header h3 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #f8f5f1;
          font-weight: 800;
        }

        .er-chart-header p {
          margin: 0;
          color: #7f8a90;
          font-size: 10px;
        }

        .er-chart-value {
          color: #ffb52e;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .er-chart-header > svg,
        .er-chart-header > .lucide {
          color: #aeb7bc;
        }

        .er-chart-divider {
          height: 1px;
          background: #2b3236;
          margin: 0 0 12px;
        }

        .er-trend {
          height: 205px;
          display: flex;
          align-items: flex-end;
          gap: 9px;
          padding: 10px 4px 0;
          border-bottom: 1px solid #30373b;
        }

        .er-trend-column {
          flex: 1;
          min-width: 14px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 5px;
        }

        .er-trend-bar {
          width: 100%;
          max-width: 32px;
          border-radius: 7px 7px 2px 2px;
          background: linear-gradient(180deg, #ffd047 0%, #f5822d 52%, #ed4f3c 100%);
          min-height: 4px;
          animation: erGrowVertical .75s ease both;
          transform-origin: bottom;
          box-shadow: 0 0 14px rgba(247, 139, 34, .14);
        }

        .er-trend-label {
          font-size: 9px;
          color: #68737a;
          white-space: nowrap;
        }

        .er-trend-value {
          font-size: 8px;
          color: #c6cdd1;
          font-weight: 700;
        }

        .er-donut-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 205px;
        }

        .er-donut {
          width: 135px;
          height: 135px;
          min-width: 135px;
          border-radius: 50%;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 8px 22px rgba(0,0,0,.18);
          animation: erRotateIn .7s ease both;
        }

        .er-donut::after {
          content: "";
          position: absolute;
          inset: 29px;
          background: #151a1d;
          border-radius: 50%;
          box-shadow: 0 0 0 1px #30373b;
        }

        .er-donut-center {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .er-donut-center strong {
          color: #f8f5f1;
          font-size: 16px;
        }

        .er-donut-center span {
          color: #7f8a90;
          font-size: 9px;
          margin-top: 2px;
        }

        .er-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .er-legend-item {
          display: grid;
          grid-template-columns: 8px minmax(0, 1fr) auto;
          gap: 6px;
          align-items: center;
          color: #9ca5aa;
          font-size: 9px;
        }

        .er-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .er-legend-item strong {
          color: #e8ecee;
          font-size: 9px;
        }

        .er-chart-legend {
          display: flex;
          gap: 13px;
          margin-bottom: 9px;
          flex-wrap: wrap;
        }

        .er-chart-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #89949a;
          font-size: 10px;
          font-weight: 700;
        }

        .er-mini-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .er-mini-dot.sales {
          background: #ffc83d;
        }

        .er-mini-dot.expense {
          background: #ff4c3f;
        }

        .er-dual-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          height: 205px;
          padding: 12px 4px 0;
          border-bottom: 1px solid #30373b;
        }

        .er-dual-column {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 3px;
          position: relative;
        }

        .er-column {
          width: 10px;
          max-width: 42%;
          border-radius: 5px 5px 2px 2px;
          transition: height .35s ease;
          animation: erGrowVertical .65s ease both;
          transform-origin: bottom;
        }

        .er-column.sales {
          background: linear-gradient(180deg, #ffd34a, #f39b18);
        }

        .er-column.expense {
          background: linear-gradient(180deg, #ff5a46, #d93635);
        }

        .er-column-label {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 7px;
          color: #68737a;
          white-space: nowrap;
        }

        .er-bar-chart {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .er-bar-row {
          display: grid;
          grid-template-columns: 110px minmax(0, 1fr) 68px;
          align-items: center;
          gap: 9px;
        }

        .er-bar-label {
          color: #a7b0b5;
          font-size: 9px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .er-bar-track {
          height: 8px;
          background: #2b3236;
          border-radius: 999px;
          overflow: hidden;
        }

        .er-bar-fill {
          height: 100%;
          border-radius: 999px;
          min-width: 4px;
          animation: erGrow .7s ease both;
          transform-origin: left center;
        }

        .er-bar-fill.expense {
          background: linear-gradient(90deg, #ffca3a, #f45b3c);
        }

        .er-bar-fill.sales {
          background: linear-gradient(90deg, #6dc58a, #b0df63);
        }

        .er-bar-fill.order {
          background: linear-gradient(90deg, #8c82e8, #b5aef2);
        }

        .er-bar-value {
          text-align: right;
          color: #e6eaec;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .er-top-expenses {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .er-top-expense {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          padding: 8px;
          border: 1px solid #2d3539;
          border-radius: 9px;
          background: #1b2124;
        }

        .er-top-expense-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .er-top-rank {
          width: 25px;
          height: 25px;
          min-width: 25px;
          border-radius: 7px;
          background: #34251b;
          color: #ffb52e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
        }

        .er-top-expense-name {
          color: #c4cbd0;
          font-size: 9px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .er-top-expense-amount {
          color: #f3f5f6;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .er-chart-empty {
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #737f85;
          font-size: 10px;
          text-align: center;
          border: 1px dashed #30383d;
          border-radius: 10px;
          background: #151a1d;
        }



        /* ================= EXPENSES + REPORTS DARK UI ================= */

        .er-page {
          background:
            radial-gradient(circle at 88% 0%, rgba(184, 84, 20, .16), transparent 26%),
            radial-gradient(circle at 8% 20%, rgba(102, 70, 34, .10), transparent 25%),
            #0d1113;
          color: #f2eee9;
        }

        .er-eyebrow {
          background: rgba(181, 82, 22, .16);
          color: #f0a35f;
          border: 1px solid rgba(225, 112, 37, .20);
        }

        .er-header h1 {
          color: #f4f0eb !important;
        }

        .er-header p {
          color: #9b9b98 !important;
        }

        .er-header-actions .er-btn,
        .er-btn.secondary {
          background: #171c1f;
          border: 1px solid #2c3337;
          color: #d7d3ce;
        }

        .er-header-actions .er-btn:hover,
        .er-btn.secondary:hover {
          background: #20262a;
          border-color: #41494e;
          color: #ffffff;
        }

        .er-btn.primary {
          background: linear-gradient(135deg, #a94f14, #c86a20);
          border-color: #c86a20;
          color: #ffffff;
          box-shadow: 0 7px 18px rgba(180, 76, 16, .18);
        }

        .er-btn.primary:hover {
          background: linear-gradient(135deg, #bd5b18, #d87828);
        }

        .er-kpi-grid {
          margin-bottom: 18px;
        }

        .er-kpi-card {
          background: linear-gradient(145deg, #171c1f 0%, #111518 100%);
          border: 1px solid #2a3034;
          box-shadow: 0 10px 28px rgba(0, 0, 0, .22);
        }

        .er-kpi-card::after {
          background: rgba(218, 104, 34, .06);
        }

        .er-kpi-icon.sales-icon {
          background: rgba(73, 139, 98, .14);
          color: #77bd8d;
        }

        .er-kpi-icon.expense-icon {
          background: rgba(195, 77, 57, .14);
          color: #e17b67;
        }

        .er-kpi-icon.net-icon {
          background: rgba(104, 115, 201, .14);
          color: #9ba3ee;
        }

        .er-kpi-icon.bill-icon {
          background: rgba(197, 107, 32, .14);
          color: #e59a55;
        }

        .er-kpi-icon.order-icon {
          background: rgba(123, 90, 191, .14);
          color: #b29be8;
        }

        .er-kpi-card span {
          color: #92989a;
        }

        .er-kpi-card strong {
          color: #f3eee8;
        }

        .er-kpi-meta {
          color: #71b889;
        }

        .er-main-tabs {
          border-bottom: 1px solid #2a3034;
          background: #101416;
          border-radius: 11px 11px 0 0;
          padding: 5px;
        }

        .er-main-tabs button {
          color: #8f9698;
          border-radius: 8px;
        }

        .er-main-tabs button:hover {
          color: #f0a15b;
          background: #1b2023;
        }

        .er-main-tabs button.active {
          background: #242a2e;
          color: #f1a05a;
          box-shadow: 0 -2px 0 #d56b22 inset;
        }

        .er-content-card,
        .er-report-content {
          background: linear-gradient(145deg, #171c1f 0%, #111518 100%);
          border: 1px solid #2a3034;
          box-shadow: 0 10px 28px rgba(0, 0, 0, .22);
        }

        .er-section-header,
        .er-report-title {
          border-bottom: 1px solid #292f33;
        }

        .er-section-header h2,
        .er-report-title h2 {
          color: #f0ece7;
        }

        .er-section-header p,
        .er-report-title p {
          color: #8e9698;
        }

        .er-section-actions {
          gap: 9px;
        }

        .er-search {
          background: #0f1416;
          border: 1px solid #30373b;
          color: #747d80;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.015);
        }

        .er-search:focus-within {
          border-color: #a95316;
          box-shadow: 0 0 0 3px rgba(169, 83, 22, .12);
        }

        .er-search input {
          color: #e7e2dc;
        }

        .er-search input::placeholder {
          color: #6f777a;
        }

        .er-table-wrapper,
        .er-report-table-card {
          background: #111518;
        }

        .er-table {
          background: #111518;
        }

        .er-table th {
          background: #181d20;
          color: #8f9799;
          border-bottom: 1px solid #2b3135;
        }

        .er-table td {
          color: #c7c3be;
          border-bottom: 1px solid #242a2d;
        }

        .er-table tbody tr:hover {
          background: #191f22;
        }

        .er-table tfoot td {
          background: #181d20;
          color: #eee9e3;
          border-top: 1px solid #2b3135;
        }

        .er-name-cell {
          color: #eee9e3;
        }

        .er-small-icon {
          background: rgba(169, 83, 22, .15);
          color: #e79851;
          border: 1px solid rgba(210, 102, 31, .12);
        }

        .er-category-badge {
          background: #22282b;
          color: #d09a70;
          border: 1px solid #30373a;
        }

        .er-payment-badge {
          color: #aeb4b5;
        }

        .er-amount {
          color: #f0a05b !important;
        }

        .er-net {
          color: #77bd8d !important;
        }

        .er-action.view {
          background: rgba(85, 120, 167, .15);
          color: #86a9d4;
        }

        .er-action.edit {
          background: rgba(194, 109, 34, .15);
          color: #e5a15e;
        }

        .er-action.delete {
          background: rgba(199, 77, 69, .15);
          color: #e47b72;
        }

        .er-action.view:hover,
        .er-action.edit:hover,
        .er-action.delete:hover {
          filter: brightness(1.15);
        }

        .er-empty {
          color: #4b5563f82 !important;
        }

        /* Reports left navigation */

        .er-report-layout {
          gap: 15px;
        }

        .er-report-menu {
          background: linear-gradient(145deg, #171c1f 0%, #111518 100%);
          border: 1px solid #2a3034;
          box-shadow: 0 10px 28px rgba(0, 0, 0, .22);
        }

        .er-report-menu h3 {
          color: #f0ece7;
        }

        .er-report-menu button {
          color: #92999b;
        }

        .er-report-menu button:hover {
          background: #1d2326;
          color: #f0a15b;
        }

        .er-report-menu button.active {
          background: linear-gradient(90deg, rgba(169, 83, 22, .20), rgba(169, 83, 22, .06));
          color: #f0a15b;
          border-left: 2px solid #d56b22;
        }

        .er-report-content {
          overflow: hidden;
        }

        .er-date-filter {
          background: #0f1416 !important;
          border: 1px solid #30373b !important;
          color: #b6bbbc !important;
          border-radius: 9px;
        }

        .er-date-filter select {
          background: transparent !important;
          color: #ddd8d2 !important;
          border: none !important;
          outline: none !important;
        }

        .er-date-filter select option {
          background: #171c1f;
          color: #e8e3dd;
        }

        .er-inner-report-heading {
          border-bottom: 1px solid #292f33;
          color: #e99a55;
          background: #151a1d;
        }

        .er-inner-report-heading h3 {
          color: #eee9e3;
        }

        .er-inner-report-heading p {
          color: #858d90;
        }

        .er-static-filter-note {
          background: #151a1d;
          border-bottom: 1px solid #292f33;
          color: #92999b;
        }

        .er-static-filter-note strong {
          color: #e89a55;
        }

        .er-status.present {
          background: rgba(63, 128, 87, .16);
          color: #79c38f;
          border: 1px solid rgba(96, 178, 119, .12);
        }

        .er-status.absent {
          background: rgba(189, 77, 69, .15);
          color: #e78178;
          border: 1px solid rgba(215, 98, 90, .12);
        }

        /* Keep Expenses and Reports visually aligned with the Charts dashboard */

        .er-content-card,
        .er-report-menu,
        .er-report-content,
        .er-report-table-card {
          border-radius: 15px;
        }

        .er-table-wrapper {
          border-radius: 0 0 15px 15px;
        }

        /* ================= MODALS ================= */

        .er-modal-overlay {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          background: rgba(45, 33, 25, .56);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 99999;
          animation: erOverlay .2s ease both;
        }

        .er-modal {
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 24px 70px rgba(35, 22, 14, .25);
          overflow: hidden;
          animation: erModal .25s ease both;
        }

        .er-details-modal {
          max-width: 600px;
        }

        .er-modal-header {
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          border-bottom: 1px solid #eee5df;
          background: #fffdfb;
        }

        .er-modal-header h2 {
          margin: 0 0 5px;
          color: #2e2018;
          font-size: 18px;
        }

        .er-modal-header p {
          margin: 0;
          color: #927f72;
          font-size: 12px;
        }

        .er-close-btn {
          width: 33px;
          height: 33px;
          border: none;
          background: #f3ece7;
          color: #7c6b60;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .er-close-btn:hover {
          background: #e9ddd4;
          color: #3b2b22;
        }

        .er-modal form {
          max-height: calc(90vh - 78px);
          overflow-y: auto;
        }

        .er-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          padding: 20px;
        }

        .er-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .er-form-group.full {
          grid-column: 1 / -1;
        }

        .er-form-group label {
          color: #4c382c;
          font-size: 12px;
          font-weight: 800;
        }

        .er-form-group label span {
          color: #c04b38;
        }

        .er-form-group input,
        .er-form-group select,
        .er-form-group textarea {
          width: 100%;
          border: 1px solid #dfd2c8;
          border-radius: 9px;
          padding: 10px 11px;
          outline: none;
          background: #fffdfb;
          color: #3a2b22;
          font-size: 12px;
          font-family: inherit;
        }

        .er-form-group input,
        .er-form-group select {
          height: 40px;
        }

        .er-form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .er-form-group input:focus,
        .er-form-group select:focus,
        .er-form-group textarea:focus {
          border-color: #b66b3c;
          box-shadow: 0 0 0 3px rgba(182, 107, 60, .09);
        }

        .er-form-group input.input-error {
          border-color: #c04b38;
        }

        .er-validation-error {
          color: #c04b38;
          font-size: 10px;
          margin-top: -2px;
          font-weight: 700;
        }

        .er-modal-footer {
          padding: 13px 20px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          border-top: 1px solid #eee5df;
          background: #fbf8f5;
        }

        .er-cancel-btn {
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid #dfd2c8;
          background: white;
          color: #5b483c;
          border-radius: 9px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .er-details-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 13px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .er-details-grid > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 12px;
          background: #fbf7f3;
          border: 1px solid #eee5df;
          border-radius: 9px;
        }

        .er-details-grid > div.full {
          grid-column: 1 / -1;
        }

        .er-details-grid span {
          color: #917f73;
          font-size: 10px;
          font-weight: 700;
        }

        .er-details-grid strong {
          color: #39291f;
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        @keyframes erFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes erGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @keyframes erGrowVertical {
          from { transform: scaleY(0); opacity: .2; }
          to { transform: scaleY(1); opacity: 1; }
        }

        @keyframes erRotateIn {
          from { opacity: 0; transform: rotate(-30deg) scale(.82); }
          to { opacity: 1; transform: rotate(0) scale(1); }
        }

        @keyframes erOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes erModal {
          from { opacity: 0; transform: scale(.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 1180px) {
          .er-kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .er-chart-card,
          .er-chart-card.wide {
            grid-column: span 6;
          }
        }

        @media (max-width: 900px) {
          .er-page {
            padding: 20px;
          }

          .er-header {
            flex-direction: column;
          }

          .er-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .er-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .er-report-layout {
            grid-template-columns: 1fr;
          }

          .er-report-menu {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
          }

          .er-report-menu h3 {
            grid-column: 1 / -1;
          }

          .er-chart-card,
          .er-chart-card.wide {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 650px) {
          .er-page {
            padding: 12px;
          }

          .er-header h1 {
            font-size: 25px;
          }

          .er-header-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .er-date-filter {
            grid-column: 1 / -1;
            width: 100%;
          }

          .er-btn {
            width: 100%;
          }

          .er-kpi-grid {
            grid-template-columns: 1fr;
          }

          .er-main-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .er-main-tabs button {
            flex: 1;
            justify-content: center;
            white-space: nowrap;
          }

          .er-section-header,
          .er-report-title,
          .er-charts-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .er-section-actions {
            flex-direction: column;
          }

          .er-search {
            width: 100%;
          }

          .er-form-grid {
            grid-template-columns: 1fr;
          }

          .er-form-group.full {
            grid-column: auto;
          }

          .er-details-grid {
            grid-template-columns: 1fr;
          }

          .er-details-grid > div.full {
            grid-column: auto;
          }

          .er-report-menu {
            grid-template-columns: 1fr;
          }

          .er-report-menu h3 {
            grid-column: auto;
          }

          .er-donut-wrap {
            flex-direction: column;
          }

          .er-chart-periods {
            width: 100%;
          }

          .er-chart-periods button {
            flex: 1;
          }

          .er-bar-row {
            grid-template-columns: 90px minmax(0, 1fr) 65px;
          }

          .er-modal-overlay {
            padding: 10px;
          }

          .er-modal {
            max-height: 95vh;
          }
        }

        /* ================= FINAL DARK TEXT VISIBILITY FIX ================= */

        /* Reports Today / This Week / This Month buttons - same as Charts */
        .er-report-periods.er-chart-periods {
          display: flex !important;
          align-items: center !important;
          gap: 5px !important;
          padding: 4px !important;
          background: #20272b !important;
          border: 1px solid #30383d !important;
          border-radius: 10px !important;
        }

        .er-report-periods.er-chart-periods button {
          border: none !important;
          background: transparent !important;
          color: #d7dde0 !important;
          padding: 7px 11px !important;
          border-radius: 7px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .er-report-periods.er-chart-periods button:hover {
          background: #293136 !important;
          color: #ffffff !important;
        }

        .er-report-periods.er-chart-periods button.active {
          background: #a95316 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(169, 83, 22, .28) !important;
        }

        /* Dark popup text visibility */
        .er-modal {
          background: #171c1f !important;
          color: #f2eee9 !important;
          border: 1px solid #2c3337 !important;
        }

        .er-modal-header {
          background: #151a1d !important;
          border-bottom: 1px solid #2c3337 !important;
        }

        .er-modal-header h2 {
          color: #f4f0eb !important;
        }

        .er-modal-header p {
          color: #9ba2a4 !important;
        }

        .er-close-btn {
          background: #242a2e !important;
          color: #d7dde0 !important;
        }

        .er-close-btn:hover {
          background: #30383d !important;
          color: #ffffff !important;
        }

        .er-modal label,
        .er-modal span,
        .er-modal div,
        .er-modal p {
          color: #cbd0d1;
        }

        .er-modal input,
        .er-modal select,
        .er-modal textarea {
          background: #0f1416 !important;
          color: #eeeeeb !important;
          border-color: #30383d !important;
        }

        .er-modal input::placeholder,
        .er-modal textarea::placeholder {
          color: #747d80 !important;
        }

        .er-modal select option {
          background: #171c1f !important;
          color: #eeeeeb !important;
        }

        .er-modal .er-modal-footer {
          background: #151a1d !important;
          border-top: 1px solid #2c3337 !important;
        }

        .er-modal .er-cancel-btn {
          background: #20262a !important;
          color: #d8ddde !important;
          border: 1px solid #343c40 !important;
        }

        .er-modal .er-cancel-btn:hover {
          background: #2b3236 !important;
          color: #ffffff !important;
        }

        .er-modal .er-btn.primary {
          color: #ffffff !important;
        }

        /* Expense Details values */
        .er-details-modal strong,
        .er-details-modal h3,
        .er-details-modal h4 {
          color: #f0ece7 !important;
        }

        .er-details-modal .full span,
        .er-details-modal .er-detail-item span {
          color: #8f989a !important;
        }

        /* Delete popup */
        .er-delete-modal,
        .er-delete-modal h2,
        .er-delete-modal p,
        .er-delete-modal strong {
          text-shadow: none !important;
        }

        .er-delete-modal h2 {
          color: #f2eee9 !important;
        }

        .er-delete-modal p {
          color: #a5abad !important;
        }

        .er-delete-modal strong {
          color: #e9a064 !important;
        }

        .er-delete-footer .er-cancel-btn {
          color: #d9dede !important;
        }

        .er-delete-confirm-btn {
          color: #ed8a80 !important;
        }

        .er-delete-confirm-btn:hover {
          color: #ffffff !important;
        }



        /* ================= EXPENSE VIEW / EDIT DARK THEME ================= */

        /* View Expense modal */
        .er-details-modal {
          background: #171c1f !important;
          border: 1px solid #30383d !important;
          border-radius: 16px !important;
          box-shadow: 0 28px 80px rgba(0, 0, 0, .55) !important;
        }

        .er-details-modal .er-modal-header {
          background: #151a1d !important;
          border-bottom: 1px solid #30383d !important;
        }

        .er-details-modal .er-modal-header h2 {
          color: #f4f0eb !important;
        }

        .er-details-modal .er-modal-header p {
          color: #9ba4a8 !important;
        }

        .er-details-modal .er-details-grid {
          background: #171c1f !important;
        }

        .er-details-modal .er-details-grid > div {
          background: #0f1416 !important;
          border: 1px solid #30383d !important;
          border-radius: 10px !important;
        }

        .er-details-modal .er-details-grid span {
          color: #8f999e !important;
          font-size: 10px !important;
          font-weight: 700 !important;
        }

        .er-details-modal .er-details-grid strong {
          color: #f0ece7 !important;
          font-size: 13px !important;
          font-weight: 700 !important;
        }

        .er-details-modal .er-modal-footer {
          background: #151a1d !important;
          border-top: 1px solid #30383d !important;
        }

        /* Add / Edit Expense form */
        .er-modal:not(.er-details-modal) {
          background: #171c1f !important;
          border: 1px solid #30383d !important;
          box-shadow: 0 28px 80px rgba(0, 0, 0, .55) !important;
        }

        .er-modal:not(.er-details-modal) .er-modal-header {
          background: #151a1d !important;
          border-bottom: 1px solid #30383d !important;
        }

        .er-modal:not(.er-details-modal) .er-modal-header h2 {
          color: #f4f0eb !important;
        }

        .er-modal:not(.er-details-modal) .er-modal-header p {
          color: #9ba4a8 !important;
        }

        .er-modal:not(.er-details-modal) .er-form-grid {
          background: #171c1f !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group label {
          color: #cbd0d1 !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group label span {
          color: #ef8176 !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group input,
        .er-modal:not(.er-details-modal) .er-form-group select,
        .er-modal:not(.er-details-modal) .er-form-group textarea {
          background: #0f1416 !important;
          color: #eeeeeb !important;
          border: 1px solid #30383d !important;
          caret-color: #eeeeeb !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group input:focus,
        .er-modal:not(.er-details-modal) .er-form-group select:focus,
        .er-modal:not(.er-details-modal) .er-form-group textarea:focus {
          border-color: #a95316 !important;
          box-shadow: 0 0 0 3px rgba(169, 83, 22, .16) !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group input::placeholder,
        .er-modal:not(.er-details-modal) .er-form-group textarea::placeholder {
          color: #747d80 !important;
          opacity: 1 !important;
        }

        .er-modal:not(.er-details-modal) .er-form-group select option {
          background: #171c1f !important;
          color: #eeeeeb !important;
        }

        /* Native date input controls */
        .er-modal:not(.er-details-modal) input[type="date"] {
          color-scheme: dark !important;
        }

        .er-modal:not(.er-details-modal) input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(.75);
          cursor: pointer;
        }

        /* Validation messages remain readable */
        .er-modal .er-validation-error {
          color: #ef8176 !important;
        }

        /* Buttons */
        .er-modal .er-cancel-btn {
          background: #20262a !important;
          color: #d8ddde !important;
          border: 1px solid #343c40 !important;
        }

        .er-modal .er-cancel-btn:hover {
          background: #2b3236 !important;
          color: #ffffff !important;
          border-color: #465055 !important;
        }

        .er-modal .er-btn.primary {
          background: #a95316 !important;
          border-color: #a95316 !important;
          color: #ffffff !important;
          box-shadow: 0 5px 16px rgba(169, 83, 22, .22) !important;
        }

        .er-modal .er-btn.primary:hover {
          background: #c2631c !important;
          border-color: #c2631c !important;
        }

        /* ================= ALL DARK UI TEXT VISIBILITY FIX ================= */

        /* Expenses area - make every normal text clearly visible */
        .er-content-card h1,
        .er-content-card h2,
        .er-content-card h3,
        .er-content-card h4,
        .er-content-card h5,
        .er-content-card h6,
        .er-content-card p,
        .er-content-card span,
        .er-content-card td,
        .er-content-card th,
        .er-content-card label,
        .er-content-card button {
          color: #d7dde0 !important;
        }

        .er-content-card h2 {
          color: #f0ece7 !important;
        }

        .er-content-card p {
          color: #8f999e !important;
        }

        .er-content-card th {
          color: #9fa8ad !important;
        }

        .er-content-card td {
          color: #d1d6d8 !important;
        }

        .er-content-card .er-name-cell,
        .er-content-card .er-name-cell span {
          color: #f0ece7 !important;
        }

        .er-content-card .er-category-badge {
          color: #d09a70 !important;
        }

        .er-content-card .er-payment-badge {
          color: #aeb8bc !important;
        }

        .er-content-card .er-amount {
          color: #f0a05b !important;
        }

        .er-content-card .er-empty {
          color: #4b5563f82 !important;
        }

        .er-content-card tfoot td {
          color: #eee9e3 !important;
        }

        .er-content-card .er-search,
        .er-content-card .er-search svg {
          color: #9aa4a8 !important;
        }

        .er-content-card .er-search input {
          color: #eeeeeb !important;
        }

        .er-content-card .er-search input::placeholder {
          color: #737d81 !important;
        }

        /* Reports area - all headings, descriptions, table text and labels */
        .er-report-layout h1,
        .er-report-layout h2,
        .er-report-layout h3,
        .er-report-layout h4,
        .er-report-layout h5,
        .er-report-layout h6,
        .er-report-layout p,
        .er-report-layout span,
        .er-report-layout td,
        .er-report-layout th,
        .er-report-layout label,
        .er-report-layout button {
          color: #211b17 !important;
        }

        .er-report-menu h3,
        .er-report-title h2,
        .er-inner-report-heading h3 {
          color: #211b17 !important;
        }

        .er-report-menu button {
          color: #374151 !important;
        }

        .er-report-menu button:hover {
          color: #f0a15b !important;
        }

        .er-report-menu button.active {
          color: #f0a15b !important;
        }

        .er-report-title p,
        .er-inner-report-heading p {
          color: #4b5563 !important;
        }

        .er-report-table-card .er-table th {
          color: #211b17 !important;
        }

        .er-report-table-card .er-table td {
          color: #211b17 !important;
        }

        .er-report-table-card .er-table tfoot td {
          color: #211b17 !important;
        }

        .er-report-table-card .er-amount {
          color: #f0a05b !important;
        }

        .er-report-table-card .er-net {
          color: #79c38f !important;
        }

        .er-inner-report-heading > strong {
          color: #f0a05b !important;
        }

        .er-static-filter-note {
          color: #374151 !important;
        }

        .er-static-filter-note span {
          color: #374151 !important;
        }

        .er-static-filter-note strong {
          color: #f0a15b !important;
        }

        .er-report-table-card .er-empty {
          color: #374151 !important;
        }

        /* Reports period control: same readable text treatment as Charts */
        .er-date-filter,
        .er-date-filter svg {
          color: #aeb7bc !important;
        }

        .er-date-filter select {
          color: #eeeeeb !important;
        }

        .er-date-filter select option {
          color: #eeeeeb !important;
          background: #171c1f !important;
        }

        /* Main Expenses / Reports / Charts tabs */
        .er-main-tabs button {
          color: #aeb7bc !important;
        }

        .er-main-tabs button:hover {
          color: #ffffff !important;
        }

        .er-main-tabs button.active {
          color: #f0a15b !important;
        }

        /* Header and KPI text */
        .er-header h1 {
          color: #f4f0eb !important;
        }

        .er-header p {
          color: #9b9b98 !important;
        }

        .er-kpi-card span {
          color: #92989a !important;
        }

        .er-kpi-card strong {
          color: #f3eee8 !important;
        }

        .er-kpi-meta {
          color: #71b889 !important;
        }

        /* Preserve existing semantic action colors */
        .er-action.view {
          color: #86a9d4 !important;
        }

        .er-action.edit {
          color: #e5a15e !important;
        }

        .er-action.delete {
          color: #e47b72 !important;
        }

        .er-status.present {
          color: #79c38f !important;
        }

        .er-status.absent {
          color: #e78178 !important;
        }

        /* Preserve Charts text/colors */
        .er-chart-card h1,
        .er-chart-card h2,
        .er-chart-card h3,
        .er-chart-card h4,
        .er-chart-card p,
        .er-chart-card span,
        .er-chart-card strong,
        .er-chart-card div {
          color: inherit;
        }

        /* =========================================================
           AJALKAR LIGHT BROWN / ORANGE THEME
           COLOR THEME ONLY - NO LAYOUT / LOGIC CHANGES
           ========================================================= */

        .er-page {
          background: #fbf8f4 !important;
          color: #2d2119 !important;
        }

        .er-eyebrow {
          background: #fff1e7 !important;
          color: #b65318 !important;
          border-color: #efd4c0 !important;
        }

        .er-header h1 {
          color: #241c17 !important;
        }

        .er-header p {
          color: #4b556316c !important;
        }

        .er-header-actions .er-btn,
        .er-btn.secondary {
          background: #ffffff !important;
          border-color: #dfd5cd !important;
          color: #5e5149 !important;
        }

        .er-header-actions .er-btn:hover,
        .er-btn.secondary:hover {
          background: #fff7f0 !important;
          border-color: #d6b395 !important;
          color: #9f4e20 !important;
        }

        .er-btn.primary {
          background: #bd570d !important;
          border-color: #bd570d !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(189, 87, 13, .14) !important;
        }

        .er-btn.primary:hover {
          background: #a94c09 !important;
          border-color: #a94c09 !important;
        }

        .er-kpi-card {
          background: #ffffff !important;
          border-color: #e7ded7 !important;
          box-shadow: 0 3px 12px rgba(73, 51, 36, .05) !important;
        }

        .er-kpi-card::after {
          background: rgba(189, 87, 13, .035) !important;
        }

        .er-kpi-icon.sales-icon {
          background: #eef7f0 !important;
          color: #4e9362 !important;
        }

        .er-kpi-icon.expense-icon {
          background: #fff1e7 !important;
          color: #b75b22 !important;
        }

        .er-kpi-icon.net-icon {
          background: #f0eefb !important;
          color: #6956a8 !important;
        }

        .er-kpi-icon.bill-icon {
          background: #eef4fb !important;
          color: #547eae !important;
        }

        .er-kpi-icon.order-icon {
          background: #f8f1e7 !important;
          color: #a77843 !important;
        }

        .er-kpi-card span {
          color: #4b556316c !important;
        }

        .er-kpi-card strong {
          color: #28211c !important;
        }

        .er-kpi-meta {
          color: #5d9b70 !important;
        }

        .er-main-tabs {
          background: transparent !important;
          border-color: #eadfd6 !important;
        }

        .er-main-tabs button {
          background: #ffffff !important;
          color: #625952 !important;
          border-color: #ded4cc !important;
        }

        .er-main-tabs button:hover {
          background: #fff7f0 !important;
          color: #a04e1d !important;
        }

        .er-main-tabs button.active {
          background: #bd570d !important;
          color: #ffffff !important;
          border-color: #bd570d !important;
          box-shadow: 0 3px 8px rgba(189, 87, 13, .16) !important;
        }

        .er-content-card,
        .er-report-content {
          background: #ffffff !important;
          border-color: #e7ded7 !important;
          box-shadow: 0 3px 12px rgba(73, 51, 36, .05) !important;
        }

        .er-section-header,
        .er-report-title {
          background: #ffffff !important;
          border-bottom-color: #eee6df !important;
        }

        .er-section-header h2,
        .er-report-title h2 {
          color: #29221d !important;
        }

        .er-section-header p,
        .er-report-title p {
          color: #7b756f !important;
        }

        .er-search {
          background: #ffffff !important;
          border-color: #ddd4cc !important;
          color: #a05a2a !important;
          box-shadow: none !important;
        }

        .er-search:focus-within {
          border-color: #bd6a30 !important;
          box-shadow: 0 0 0 3px rgba(189, 106, 48, .08) !important;
        }

        .er-search input {
          color: #403832 !important;
        }

        .er-search input::placeholder {
          color: #99938e !important;
        }

        .er-table-wrapper,
        .er-report-table-card,
        .er-table {
          background: #ffffff !important;
        }

        .er-table th {
          background: #fcfaf7 !important;
          color: #a04f25 !important;
          border-bottom-color: #ebe2da !important;
        }

        .er-table td {
          color: #57514c !important;
          border-bottom-color: #f0ebe7 !important;
        }

        .er-table tbody tr:hover,
        .er-table tbody tr:hover td {
          background: #fffaf6 !important;
        }

        .er-table tfoot td {
          background: #fcfaf7 !important;
          color: #625952 !important;
          border-top-color: #eee5dd !important;
        }

        .er-name-cell {
          color: #443d38 !important;
        }

        .er-small-icon {
          background: #fff3e9 !important;
          color: #ad5a28 !important;
          border-color: #f1ddce !important;
        }

        .er-category-badge {
          background: #f8f3ee !important;
          color: #806d5e !important;
          border-color: #e8ddd4 !important;
        }

        .er-payment-badge {
          color: #6e716f !important;
        }

        .er-amount {
          color: #9b4c20 !important;
        }

        .er-net {
          color: #4e9362 !important;
        }

        .er-action.view {
          background: #f0f5fb !important;
          color: #527ba9 !important;
        }

        .er-action.edit {
          background: #fff5e9 !important;
          color: #bd6d29 !important;
        }

        .er-action.delete {
          background: #fff0ee !important;
          color: #c65b53 !important;
        }

        .er-empty,
        .er-chart-empty {
          color: #8a837d !important;
        }

        .er-report-menu {
          background: #ffffff !important;
          border-color: #e7ded7 !important;
          box-shadow: 0 3px 12px rgba(73, 51, 36, .05) !important;
        }

        .er-report-menu h3 {
          color: #29221d !important;
        }

        .er-report-menu button {
          color: #6c6965 !important;
        }

        .er-report-menu button:hover {
          background: #fff7ef !important;
          color: #9d4e20 !important;
        }

        .er-report-menu button.active {
          background: #fff0e4 !important;
          color: #a04e1d !important;
          border-left-color: #bd570d !important;
        }

        .er-date-filter,
        .er-report-periods.er-chart-periods,
        .er-chart-periods {
          background: #f8f4f0 !important;
          border-color: #e5dcd4 !important;
          color: #374151 !important;
        }

        .er-date-filter select,
        .er-report-periods.er-chart-periods button,
        .er-chart-periods button {
          color: #374151 !important;
          background: transparent !important;
        }

        .er-date-filter select option {
          background: #ffffff !important;
          color: #403832 !important;
        }

        .er-report-periods.er-chart-periods button:hover,
        .er-chart-periods button:hover {
          background: #ffffff !important;
          color: #9f4e20 !important;
        }

        .er-report-periods.er-chart-periods button.active,
        .er-chart-periods button.active {
          background: #bd570d !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }

        .er-inner-report-heading,
        .er-static-filter-note {
          background: #fcfaf7 !important;
          border-bottom-color: #eee6df !important;
          color: #7b756f !important;
        }

        .er-inner-report-heading h3 {
          color: #29221d !important;
        }

        .er-inner-report-heading p {
          color: #7b756f !important;
        }

        .er-inner-report-heading > strong,
        .er-static-filter-note strong {
          color: #a04f20 !important;
        }

        .er-status.present {
          background: #e5f7eb !important;
          color: #16814a !important;
          border-color: #c8ecd6 !important;
        }

        .er-status.absent {
          background: #fff0ee !important;
          color: #c65b53 !important;
          border-color: #f0d7d3 !important;
        }

        /* Charts: colors only, preserve the existing chart layout */
        .er-chart-card {
          background: #ffffff !important;
          border-color: #e7ded7 !important;
          box-shadow: 0 3px 12px rgba(73, 51, 36, .05) !important;
        }

        .er-chart-card::before {
          background: #bd570d !important;
        }

        .er-chart-header {
          background: #ffffff !important;
          border-bottom-color: #eee6df !important;
        }

        .er-chart-header h3 {
          color: #29221d !important;
        }

        .er-chart-header p {
          color: #7b756f !important;
        }

        .er-chart-value {
          color: #a04f20 !important;
        }

        .er-chart-divider,
        .er-bar-track {
          background: #f1ece7 !important;
        }

        .er-bar-label,
        .er-column-label,
        .er-trend-label,
        .er-trend-value {
          color: #6e6761 !important;
        }

        .er-bar-value {
          color: #9b4c20 !important;
        }

        .er-donut-center {
          background: #ffffff !important;
          color: #29221d !important;
        }

        .er-legend-item,
        .er-top-expense-name {
          color: #4f4842 !important;
        }

        .er-top-expense-amount,
        .er-top-rank {
          color: #9b4c20 !important;
        }

        .er-top-expense {
          background: #fcfaf7 !important;
          border-color: #eee6df !important;
        }

        .er-charts-toolbar {
          background: #ffffff !important;
          border-color: #e7ded7 !important;
          box-shadow: 0 3px 12px rgba(73, 51, 36, .05) !important;
        }

        .er-charts-toolbar strong {
          color: #29221d !important;
        }

        .er-charts-toolbar span {
          color: #7b756f !important;
        }

        /* Modals: light theme only */
        .er-modal-overlay {
          background: rgba(45, 33, 25, .38) !important;
        }

        .er-modal,
        .er-details-modal,
        .er-modal:not(.er-details-modal) {
          background: #ffffff !important;
          color: #403832 !important;
          border-color: #e6ddd5 !important;
          box-shadow: 0 20px 60px rgba(42, 28, 19, .20) !important;
        }

        .er-modal-header,
        .er-details-modal .er-modal-header,
        .er-modal:not(.er-details-modal) .er-modal-header {
          background: #ffffff !important;
          border-bottom-color: #eee6df !important;
        }

        .er-modal-header h2,
        .er-details-modal .er-modal-header h2,
        .er-modal:not(.er-details-modal) .er-modal-header h2 {
          color: #29221d !important;
        }

        .er-modal-header p,
        .er-details-modal .er-modal-header p,
        .er-modal:not(.er-details-modal) .er-modal-header p {
          color: #7b756f !important;
        }

        .er-close-btn {
          background: #f6f2ee !important;
          color: #6d6762 !important;
        }

        .er-close-btn:hover {
          background: #eee7e0 !important;
          color: #29221d !important;
        }

        .er-modal label,
        .er-modal span,
        .er-modal div,
        .er-modal p,
        .er-modal:not(.er-details-modal) .er-form-group label {
          color: #514943 !important;
        }

        .er-modal input,
        .er-modal select,
        .er-modal textarea,
        .er-modal:not(.er-details-modal) .er-form-group input,
        .er-modal:not(.er-details-modal) .er-form-group select,
        .er-modal:not(.er-details-modal) .er-form-group textarea {
          background: #ffffff !important;
          color: #403832 !important;
          border-color: #ddd4cc !important;
          caret-color: #403832 !important;
        }

        .er-modal input::placeholder,
        .er-modal textarea::placeholder,
        .er-modal:not(.er-details-modal) .er-form-group input::placeholder,
        .er-modal:not(.er-details-modal) .er-form-group textarea::placeholder {
          color: #99938e !important;
        }

        .er-modal select option,
        .er-modal:not(.er-details-modal) .er-form-group select option {
          background: #ffffff !important;
          color: #403832 !important;
        }

        .er-modal .er-modal-footer,
        .er-details-modal .er-modal-footer {
          background: #fcfaf7 !important;
          border-top-color: #eee6df !important;
        }

        .er-modal .er-cancel-btn,
        .er-cancel-btn {
          background: #ffffff !important;
          color: #5d554f !important;
          border-color: #ddd4cc !important;
        }

        .er-modal .er-cancel-btn:hover,
        .er-cancel-btn:hover {
          background: #fff7f0 !important;
          color: #9f4e20 !important;
        }

        .er-modal .er-btn.primary {
          background: #bd570d !important;
          border-color: #bd570d !important;
          color: #ffffff !important;
        }

        .er-validation-error {
          color: #c04b38 !important;
        }

        .er-details-modal .er-details-grid {
          background: #ffffff !important;
        }

        .er-details-modal .er-details-grid > div {
          background: #fcfaf7 !important;
          border-color: #eee5df !important;
        }

        .er-details-modal .er-details-grid span {
          color: #917f73 !important;
        }

        .er-details-modal .er-details-grid strong,
        .er-details-modal strong,
        .er-details-modal h3,
        .er-details-modal h4 {
          color: #39291f !important;
        }

        .er-delete-modal h2 {
          color: #39291f !important;
        }

        .er-delete-modal p {
          color: #4b556316c !important;
        }

        .er-delete-modal strong {
          color: #a04f20 !important;
        }

        .er-delete-confirm-btn {
          color: #c65b53 !important;
        }

        /* =========================================================
           FINAL UI MATCH - HIGH CONTRAST EXPENSES / REPORTS / CHARTS
           UI ONLY - NO TS/JS/HTML LOGIC CHANGED
           ========================================================= */

        /* Main page text */
        .er-page,
        .er-page * {
          box-sizing: border-box;
        }

        .er-page {
          color: #4a433d !important;
        }

        .er-page h1,
        .er-page h2,
        .er-page h3,
        .er-page h4,
        .er-page strong {
          color: #2f2924 !important;
        }

        .er-page p {
          color: #746e68 !important;
        }

        /* Header / normal buttons */
        .er-header-actions .er-btn,
        .er-btn.secondary,
        .er-btn.dark {
          color: #5b544e !important;
          background: #ffffff !important;
          border-color: #dfd5cc !important;
        }

        .er-header-actions .er-btn:hover,
        .er-btn.secondary:hover,
        .er-btn.dark:hover {
          color: #9b4e22 !important;
          background: #fff8f2 !important;
        }

        /* Keep primary orange buttons with white text */
        .er-btn.primary {
          color: #ffffff !important;
        }

        /* KPI cards */
        .er-kpi-card span,
        .er-kpi-label {
          color: #756f69 !important;
        }

        .er-kpi-card strong,
        .er-kpi-value {
          color: #302a25 !important;
        }

        /* Tabs - EXACT warm orange active state */
        .er-main-tabs button {
          color: #5b544e !important;
          background: #ffffff !important;
          border-color: #ded5cd !important;
        }

        .er-main-tabs button:hover {
          color: #9b4e22 !important;
          background: #fff7ef !important;
          border-color: #d4b39a !important;
        }

        .er-main-tabs button.active {
          background: #bd570d !important;
          border-color: #bd570d !important;
          color: #ffffff !important;
        }

        /* Expense card heading */
        .er-section-header h2 {
          color: #302a25 !important;
        }

        .er-section-header p {
          color: #756f69 !important;
        }

        /* Search */
        .er-search,
        .er-search input {
          color: #403a35 !important;
        }

        .er-search input::placeholder {
          color: #928b85 !important;
          opacity: 1 !important;
        }

        /* Table - remove washed-out / white text */
        .er-table th {
          color: #7f4d2e !important;
          background: #fcfaf7 !important;
        }

        .er-table td {
          color: #4e4843 !important;
          background: #ffffff !important;
        }

        .er-table td *,
        .er-table tbody td {
          color: #4e4843 !important;
        }

        .er-table .er-name-cell,
        .er-table .er-name-cell span {
          color: #3f3934 !important;
          font-weight: 700 !important;
        }

        .er-table .er-category-badge {
          color: #8b5b3d !important;
          background: #f7f2ed !important;
        }

        .er-table .er-amount {
          color: #c45f20 !important;
          font-weight: 800 !important;
        }

        .er-table .er-payment-badge,
        .er-table .er-payment-badge * {
          color: #6b706f !important;
        }

        .er-table tfoot td {
          color: #514a45 !important;
        }

        /* Keep footer total highlighted */
        .er-table tfoot td strong,
        .er-table tfoot .er-amount {
          color: #9d4e20 !important;
        }

        /* Action buttons */
        .er-action.view {
          color: #5578a7 !important;
        }

        .er-action.edit {
          color: #bd6d29 !important;
        }

        .er-action.delete {
          color: #c85b52 !important;
        }

        /* Reports */
        .er-report-menu h3 {
          color: #302a25 !important;
        }

        .er-report-menu button {
          color: #625b55 !important;
        }

        .er-report-menu button.active {
          color: #ffffff !important;
          background: #bd570d !important;
          border-color: #bd570d !important;
        }

        .er-report-content,
        .er-report-content * {
          color: inherit;
        }

        .er-report-content h2,
        .er-report-content h3,
        .er-report-content strong {
          color: #302a25 !important;
        }

        .er-report-content p,
        .er-report-content span {
          color: #716a64 !important;
        }

        /* Charts - readable text */
        .er-chart-card {
          color: #514a45 !important;
          background: #ffffff !important;
        }

        /* Remove the unwanted corner decoration */
        .er-chart-card::before {
          display: none !important;
          content: none !important;
        }

        .er-chart-card h3,
        .er-chart-header h3 {
          color: #332b25 !important;
        }

        .er-chart-card p,
        .er-chart-header p {
          color: #817a74 !important;
        }

        .er-chart-value {
          color: #9d4e20 !important;
        }

        .er-chart-header svg {
          color: #374151 !important;
        }

        .er-chart-divider {
          background: #eee8e2 !important;
        }

        .er-bar-label,
        .er-column-label,
        .er-trend-label {
          color: #6f6862 !important;
        }

        .er-trend-value {
          color: #5f5852 !important;
        }

        .er-bar-value {
          color: #8f4b24 !important;
        }

        .er-donut-center {
          background: #ffffff !important;
          color: #332b25 !important;
        }

        .er-donut-center span {
          color: #374151 !important;
        }

        .er-legend-item {
          color: #625b55 !important;
        }

        .er-legend-item strong {
          color: #443d38 !important;
        }

        .er-top-expense-name {
          color: #514a45 !important;
        }

        .er-top-expense-amount {
          color: #8f4b24 !important;
        }

        .er-top-rank {
          color: #9d4e20 !important;
        }

        .er-top-expense {
          background: #fcfaf7 !important;
          border-color: #eee6df !important;
        }

        .er-empty-chart {
          color: #374151 !important;
        }

        /* Chart period controls */
        .er-charts-toolbar {
          background: #ffffff !important;
        }

        .er-charts-toolbar strong {
          color: #332b25 !important;
        }

        .er-charts-toolbar span {
          color: #374151 !important;
        }

        .er-charts-toolbar button {
          color: #68615b !important;
          background: #ffffff !important;
          border-color: #ded6cf !important;
        }

        .er-charts-toolbar button:hover {
          color: #9d4e20 !important;
        }

        .er-charts-toolbar button.active {
          color: #ffffff !important;
          background: #bd570d !important;
          border-color: #bd570d !important;
        }

        /* Modal text stays readable */
        .er-modal,
        .er-details-modal {
          color: #403832 !important;
        }

        .er-modal label,
        .er-modal p,
        .er-modal span {
          color: #514943 !important;
        }

        .er-modal input,
        .er-modal select,
        .er-modal textarea {
          color: #403832 !important;
        }

/* ===== CLEAN UI FIX: SEARCH + EXPENSE FORM ===== */
.er-search input,
.er-search input[type="text"],
.er-content-card .er-search input,
.er-content-card .er-search input[type="text"] {
  background: #ffffff !important;
  color: #2f2925 !important;
  -webkit-text-fill-color: #2f2925 !important;
  caret-color: #2f2925 !important;
  opacity: 1 !important;
}

.er-search input::placeholder,
.er-content-card .er-search input::placeholder {
  color: #8b817a !important;
  -webkit-text-fill-color: #8b817a !important;
  opacity: 1 !important;
}

/* Edit / Add Expense form: same clean light appearance as View */
.er-modal:not(.er-details-modal) {
  background: #ffffff !important;
  color: #2f2925 !important;
  border: 1px solid #e6dfd8 !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 60px rgba(45, 34, 26, 0.18) !important;
}

.er-modal:not(.er-details-modal) .er-modal-header {
  background: #ffffff !important;
  color: #2f2925 !important;
  border-bottom: 1px solid #eee8e2 !important;
}

.er-modal:not(.er-details-modal) .er-modal-header h2 {
  color: #29231f !important;
}

.er-modal:not(.er-details-modal) .er-modal-header p {
  color: #7b716a !important;
}

.er-modal:not(.er-details-modal) .er-form-grid {
  background: #ffffff !important;
}

.er-modal:not(.er-details-modal) .er-form-group label {
  color: #4f4741 !important;
}

.er-modal:not(.er-details-modal) .er-form-group input,
.er-modal:not(.er-details-modal) .er-form-group select,
.er-modal:not(.er-details-modal) .er-form-group textarea {
  background: #ffffff !important;
  color: #2f2925 !important;
  -webkit-text-fill-color: #2f2925 !important;
  border: 1px solid #dcd4cc !important;
  caret-color: #2f2925 !important;
  opacity: 1 !important;
}

.er-modal:not(.er-details-modal) .er-form-group input:focus,
.er-modal:not(.er-details-modal) .er-form-group select:focus,
.er-modal:not(.er-details-modal) .er-form-group textarea:focus {
  background: #ffffff !important;
  color: #2f2925 !important;
  -webkit-text-fill-color: #2f2925 !important;
  border-color: #bd7443 !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(189, 116, 67, 0.10) !important;
}

.er-modal:not(.er-details-modal) .er-form-group input::placeholder,
.er-modal:not(.er-details-modal) .er-form-group textarea::placeholder {
  color: #978e87 !important;
  -webkit-text-fill-color: #978e87 !important;
  opacity: 1 !important;
}

.er-modal:not(.er-details-modal) .er-form-group select option {
  background: #ffffff !important;
  color: #2f2925 !important;
}

.er-modal:not(.er-details-modal) input[type="date"] {
  background: #ffffff !important;
  color: #2f2925 !important;
  -webkit-text-fill-color: #2f2925 !important;
  color-scheme: light !important;
}

.er-modal:not(.er-details-modal) .er-modal-footer {
  background: #fcfaf8 !important;
  border-top: 1px solid #eee8e2 !important;
}

.er-modal:not(.er-details-modal) .er-cancel-btn {
  background: #ffffff !important;
  color: #5a514b !important;
  -webkit-text-fill-color: #5a514b !important;
  border: 1px solid #dcd4cc !important;
}

.er-modal:not(.er-details-modal) .er-btn.primary {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

/* ================= ADDED PROFIT / LOSS / GST / PURCHASE UI ================= */

.profit-icon {
  background: #eef7f0 !important;
  color: #4e9362 !important;
}

.loss-icon {
  background: #fff0ee !important;
  color: #c65b53 !important;
}

.er-kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.er-gst-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.er-gst-card {
  min-height: 82px;
  padding: 14px;
  border: 1px solid #e7ded7;
  border-radius: 11px;
  background: #fcfaf7;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.er-gst-card span {
  color: #4b556316c;
  font-size: 10px;
  font-weight: 800;
}

.er-gst-card strong {
  color: #9d4e20;
  font-size: 17px;
  font-weight: 800;
}

.er-gst-card-wide {
  grid-column: span 2;
}

.er-purchase-empty {
  margin: 0 16px 16px;
}

.er-delete-content {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.er-delete-content strong {
  color: #302a25 !important;
  font-size: 14px;
  font-weight: 800;
}

.er-delete-content span {
  color: #4b556316c !important;
  font-size: 11px;
  font-weight: 700;
}

.er-delete-footer {
  justify-content: flex-end;
}

.er-delete-confirm-btn {
  background: #fff0ee !important;
  border: 1px solid #f0d7d3 !important;
  color: #c65b53 !important;
  box-shadow: none !important;
}

.er-delete-confirm-btn:hover {
  background: #c65b53 !important;
  border-color: #c65b53 !important;
  color: #ffffff !important;
  transform: translateY(-1px);
}

@media (max-width: 1180px) {
  .er-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .er-gst-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .er-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 650px) {
  .er-kpi-grid {
    grid-template-columns: 1fr !important;
  }
  .er-gst-summary {
    grid-template-columns: 1fr;
  }

  .er-gst-card-wide {
    grid-column: auto;
  }
}

/* =========================================================
   FINAL REQUESTED UI FIXES
   UI ONLY - EXISTING FUNCTIONALITY UNCHANGED
   ========================================================= */

/* 1. Action/KPI cards - remove icon space completely */
.er-kpi-card {
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
}

.er-kpi-card > div:first-child:not(.er-kpi-meta) {
  margin-left: 0 !important;
}

/* 2. Reports tab - readable dark form/control text */
.er-report-content input,
.er-report-content select,
.er-report-content textarea,
.er-report-content label,
.er-report-content .er-form-group,
.er-report-content .er-form-group label,
.er-report-content .er-form-group span {
  color: #302a25 !important;
  -webkit-text-fill-color: #302a25 !important;
}

.er-report-content input,
.er-report-content select,
.er-report-content textarea {
  background: #ffffff !important;
  border-color: #ddd4cc !important;
  caret-color: #302a25 !important;
}

.er-report-content input::placeholder,
.er-report-content textarea::placeholder {
  color: #8a8179 !important;
  -webkit-text-fill-color: #8a8179 !important;
  opacity: 1 !important;
}

.er-report-content select option {
  background: #ffffff !important;
  color: #302a25 !important;
}

/* 3A. Chart inner/empty areas - remove black boxes */
.er-chart-empty,
.er-trend,
.er-dual-chart,
.er-bar-chart,
.er-top-expenses,
.er-donut-wrap {
  background: #ffffff !important;
  color: #302a25 !important;
  border-color: #e7ded7 !important;
  box-shadow: none !important;
}

.er-chart-empty {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eee6df !important;
  border-radius: 10px !important;
  color: #5f5750 !important;
  -webkit-text-fill-color: #5f5750 !important;
  background: #ffffff !important;
}

.er-trend,
.er-dual-chart,
.er-bar-chart,
.er-top-expenses {
  border-radius: 10px;
}

/* 3. All chart cards - simple light boxes + dark readable text */
.er-chart-card,
.er-chart-card.wide,
.er-chart-card.full {
  background: #ffffff !important;
  border: 1px solid #e7ded7 !important;
  color: #302a25 !important;
  box-shadow: none !important;
}

.er-chart-card::before {
  display: none !important;
}

.er-chart-card h1,
.er-chart-card h2,
.er-chart-card h3,
.er-chart-card h4,
.er-chart-card h5,
.er-chart-card h6,
.er-chart-card p,
.er-chart-card span,
.er-chart-card strong,
.er-chart-card div,
.er-chart-header h3,
.er-chart-header p,
.er-chart-value,
.er-trend-label,
.er-trend-value,
.er-column-label,
.er-bar-label,
.er-bar-value,
.er-legend-item,
.er-legend-item strong,
.er-chart-legend span,
.er-top-expense-name,
.er-top-expense-amount {
  color: #302a25 !important;
}

.er-chart-divider,
.er-trend {
  border-color: #e7ded7 !important;
}

.er-bar-track {
  background: #eee8e2 !important;
}

.er-chart-periods,
.er-report-periods.er-chart-periods {
  background: #f8f4f0 !important;
  border: 1px solid #e5dcd4 !important;
}

.er-chart-periods button,
.er-report-periods.er-chart-periods button {
  background: transparent !important;
  color: #5b544e !important;
}

.er-chart-periods button:hover,
.er-report-periods.er-chart-periods button:hover {
  background: #ffffff !important;
  color: #9b4e22 !important;
}

.er-chart-periods button.active,
.er-report-periods.er-chart-periods button.active {
  background: #bd570d !important;
  color: #ffffff !important;
}

/* 4. Reports/Purchase content - simple light box + dark text */
.er-report-layout .er-report-content {
  background: #ffffff !important;
  color: #302a25 !important;
  border-color: #e7ded7 !important;
  box-shadow: none !important;
}

.er-report-layout .er-report-content h1,
.er-report-layout .er-report-content h2,
.er-report-layout .er-report-content h3,
.er-report-layout .er-report-content h4,
.er-report-layout .er-report-content p,
.er-report-layout .er-report-content span,
.er-report-layout .er-report-content strong,
.er-report-layout .er-report-content td,
.er-report-layout .er-report-content th {
  color: #302a25 !important;
}

.er-report-layout .er-report-content .er-report-title,
.er-report-layout .er-report-content .er-inner-report-heading,
.er-report-layout .er-report-content .er-static-filter-note {
  background: #ffffff !important;
  color: #302a25 !important;
}

.er-report-layout .er-report-content .er-report-title p,
.er-report-layout .er-report-content .er-inner-report-heading p {
  color: #756f69 !important;
}

/* Purchase tab cards/table - no black box */
.er-report-layout .er-gst-card,
.er-report-layout .er-report-table-card,
.er-report-layout .er-purchase-empty {
  background: #ffffff !important;
  color: #302a25 !important;
  border-color: #e7ded7 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
}

.er-report-layout .er-gst-card span {
  color: #645c55 !important;
}

.er-report-layout .er-gst-card strong {
  color: #211b17 !important;
}

/* Dedicated GST Tax Table styling - Clean, high contrast Hotel light theme */
.er-report-layout .er-gst-table {
  width: 100% !important;
  border-collapse: collapse !important;
  background: #ffffff !important;
}

.er-report-layout .er-gst-table th {
  background: #fff9f3 !important;
  color: #8b3e16 !important;
  border-bottom: 2px solid #e5dcd5 !important;
  font-weight: 700 !important;
  padding: 10px 12px !important;
  font-size: 12px !important;
}

.er-report-layout .er-gst-table td {
  padding: 12px !important;
  border-bottom: 1px solid #f0ece7 !important;
  color: #211b17 !important;
  font-size: 13px !important;
}

.er-report-layout .er-gst-table tr:hover td {
  background-color: #faf7f4 !important;
}

.er-report-layout .er-gst-table tr.er-gst-total-row,
.er-report-layout .er-gst-table tr.er-gst-total-row td {
  background-color: #fff4ed !important;
  color: #8b3e16 !important;
  font-weight: 800 !important;
  border-top: 2px solid #e5dcd5 !important;
}

        /* Requested professional standard sizing and controls */
        .er-page,
        .er-page button,
        .er-page input,
        .er-page select,
        .er-page textarea {
          font-size: 13px;
        }

        .er-page h1 { font-size: 24px !important; }
        .er-page h2 { font-size: 14px !important; }
        .er-page h3 { font-size: 13px !important; }

        .er-table th,
        .er-report-menu h3,
        .er-section-header h2,
        .er-report-title h2,
        .er-inner-report-heading h3 {
          font-size: 12px !important;
        }

        .er-table td,
        .er-form-group input,
        .er-form-group select,
        .er-form-group textarea,
        .er-form-group label {
          font-size: 13px !important;
        }

        .er-amount {
          text-align: right !important;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .er-category-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .er-category-input-row select {
          flex: 1;
          min-width: 0;
        }

        .er-add-category-btn {
          height: 38px;
          padding: 0 10px;
          border: 1px solid #ddd5ce;
          border-radius: 8px;
          background: #fff;
          color: #984d25;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .er-date-input-wrap {
          position: relative;
          width: 100%;
          height: 38px;
          border: 1px solid #dcd4cc;
          border-radius: 8px;
          background: #fff;
          box-sizing: border-box;
          overflow: hidden;
        }

        .er-date-input-wrap:focus-within {
          border-color: #bd7443;
          box-shadow: 0 0 0 3px rgba(189, 116, 67, 0.10);
        }

        .er-modal:not(.er-details-modal) .er-date-input-wrap input {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          box-sizing: border-box !important;
          border: none !important;
          outline: none !important;
          padding: 0 40px 0 10px !important;
          margin: 0 !important;
          background: transparent !important;
          cursor: pointer;
          box-shadow: none !important;
        }

        .er-date-calendar-btn {
          position: absolute;
          top: 50%;
          right: 7px;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          padding: 0;
          border: none;
          background: transparent;
          color: #8f4b24;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2;
        }

        .er-date-calendar-btn:hover {
          color: #c85a0a;
        }

        .er-modal:not(.er-details-modal) .er-date-input-wrap input::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          cursor: pointer;
          position: absolute;
          right: 0;
          top: 0;
          width: 34px;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        .er-report-title-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .er-view-details-btn {
          height: 34px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #ddd5ce;
          border-radius: 8px;
          background: #fff;
          color: #984d25;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .er-order-summary-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .er-order-summary-card {
          padding: 13px 15px;
          background: #fff;
          border: 1px solid #e5ddd6;
          border-radius: 11px;
          box-shadow: 0 2px 8px rgba(73, 51, 36, 0.035);
        }

        .er-order-summary-card span {
          display: block;
          color: #4b5563;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .er-order-summary-card strong {
          color: #29231f;
          font-size: 18px;
          font-weight: 800;
        }

        .er-mini-table {
          min-width: 0 !important;
        }

        .er-mini-table th,
        .er-mini-table td {
          padding: 9px 11px !important;
          height: auto !important;
        }

        .er-attendance-snapshot {
          padding: 10px 14px 14px;
        }

        .er-attendance-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid #f0ebe6;
          font-size: 12px;
        }

        .er-attendance-row:last-child {
          border-bottom: 0;
        }

        .er-small-modal {
          width: min(520px, calc(100vw - 30px)) !important;
        }

        .er-category-modal-field,
        .er-report-details-list {
          padding: 16px 18px;
        }

        .er-report-details-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .er-report-details-list > div {
          padding: 11px;
          border: 1px solid #eee7e1;
          border-radius: 8px;
          background: #fcfaf7;
        }

        .er-report-details-list span {
          display: block;
          color: #4b5563;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .er-report-details-list strong {
          color: #29231f;
          font-size: 12px;
        }

        .er-alert-modal {
          width: min(430px, calc(100vw - 30px)) !important;
          padding: 18px !important;
          display: grid;
          grid-template-columns: 38px 1fr auto;
          gap: 12px;
          align-items: start;
        }

        .er-alert-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff0e4;
          color: #984d25;
          font-weight: 900;
        }

        .er-alert-content h2 {
          margin: 2px 0 4px !important;
          font-size: 14px !important;
        }

        .er-alert-content p {
          margin: 0;
          color: #6f6a65;
          font-size: 12px;
          line-height: 1.5;
        }

        .er-alert-modal .er-modal-footer {
          grid-column: 1 / -1;
          padding: 10px 0 0 !important;
          border-top: 1px solid #eee7e1;
        }

        .er-simple-success-popup {
          min-width: 300px;
          max-width: calc(100vw - 30px);
          padding: 22px 28px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .er-simple-success-icon {
          width: 30px;
          height: 30px;
          min-width: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #22c55e;
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
        }

        .er-simple-success-popup p {
          margin: 0;
          color: #222222;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
        }

        .er-alert-overlay {
          z-index: 10000 !important;
        }

        @media (max-width: 800px) {
          .er-order-summary-row {
            grid-template-columns: 1fr;
          }

          .er-report-details-list {
            grid-template-columns: 1fr;
          }

          .er-category-input-row {
            align-items: stretch;
            flex-direction: column;
          }

          .er-add-category-btn {
            justify-content: center;
          }
        }




.er-search { position: relative !important; }
.er-search-validation-error { display:block !important; width:100% !important; margin-top:5px !important; color:#dc2626 !important; background:transparent !important; border:none !important; box-shadow:none !important; font-size:11px !important; line-height:14px !important; font-weight:500 !important; padding:0 !important; position:absolute !important; left:0 !important; top:calc(100% + 4px) !important; z-index:999 !important; }

/* FINAL FIX: Amount must align exactly like Branch Code */
.er-expense-list-table th:nth-child(3),
.er-expense-list-table td:nth-child(3),
.er-expense-list-table td:nth-child(3).er-amount {
  text-align: left !important;
  padding-left: 15px !important;
  padding-right: 15px !important;
  margin: 0 !important;
  text-indent: 0 !important;
  vertical-align: middle !important;
}

.er-expense-list-table td:nth-child(5) {
  text-align: left !important;
  padding-left: 15px !important;
  padding-right: 15px !important;
}
/* ================= REFERENCE IMAGE TEXT SIZE ONLY ================= */
/* Font-size changes only. No layout, data, colors, spacing, or functionality changes. */
.er-page,
.er-page button,
.er-page input,
.er-page textarea,
.er-page select {
  font-size: 14px !important;
}

.er-page p,
.er-page label,
.er-page small,
.er-page span,
.er-page li,
.er-page td,
.er-page input,
.er-page textarea,
.er-page select {
  font-size: 13px !important;
}

.er-page h1 {
  font-size: 24px !important;
}

.er-page h2,
.er-page .er-section-header h2,
.er-page .er-report-title h2 {
  font-size: 18px !important;
}

.er-page h3,
.er-page .er-report-menu h3,
.er-page .er-inner-report-heading h3 {
  font-size: 16px !important;
}

.er-page .er-main-tabs button,
.er-page .er-report-menu button,
.er-page .er-chart-periods button,
.er-page .er-report-periods button,
.er-page .er-btn,
.er-page .er-cancel-btn {
  font-size: 13px !important;
}

.er-page .er-kpi-card span {
  font-size: 12px !important;
}

.er-page .er-kpi-card strong {
  font-size: 24px !important;
}

.er-page .er-kpi-meta {
  font-size: 11px !important;
}

.er-page .er-table th {
  font-size: 12px !important;
}

.er-page .er-table td {
  font-size: 13px !important;
}

.er-page .er-category-badge,
.er-page .er-payment-badge {
  font-size: 12px !important;
}

.er-page .er-chart-card h3,
.er-page .er-chart-header h3,
.er-page .er-chart-title,
.er-page .er-chart-label {
  font-size: 15px !important;
}

.er-page .er-chart-card p,
.er-page .er-chart-header p,
.er-page .er-chart-subtitle {
  font-size: 12px !important;
}

.er-page .er-report-title p,
.er-page .er-section-header p,
.er-page .er-inner-report-heading p {
  font-size: 12px !important;
}

/* ================= DARK, READABLE REPORT TEXT ================= */
/* Only improves readability of muted/grey text; existing layout and functionality stay unchanged. */
.er-page p,
.er-page small,
.er-page label,
.er-page .er-kpi-card span,
.er-page .er-section-header p,
.er-page .er-report-title p,
.er-page .er-inner-report-heading p,
.er-page .er-static-filter-note,
.er-page .er-report-menu button:not(.active),
.er-page .er-table td,
.er-page .er-category-badge,
.er-page .er-payment-badge,
.er-page .er-amount,
.er-page .er-charts-toolbar span,
.er-page .er-chart-periods button:not(.active),
.er-page .er-report-periods.er-chart-periods button:not(.active),
.er-page .er-search,
.er-page .er-date-filter {
  color: #29231f !important;
}

.er-page input::placeholder,
.er-page textarea::placeholder {
  color: #514943 !important;
  opacity: 1 !important;
}

/* ONLY the requested Expense by Category legend spacing */
/* Expense by Category - spacing/alignment only */
.er-donut-wrap {
  gap: 12px !important;
  padding: 0 !important;
  margin: 0 !important;
  align-items: center !important;
}

.er-legend {
  gap: 7px !important;
  padding: 0 !important;
  margin: 0 !important;
  min-width: 0 !important;
}

.er-legend-item {
  position: relative !important;
  display: grid !important;
  grid-template-columns: 8px minmax(0, 1fr) !important;
  gap: 6px !important;
  align-items: center !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 58px 0 0 !important;
  box-sizing: border-box !important;
  line-height: 1.25 !important;
}

.er-legend-item > span:not(.er-legend-dot) {
  min-width: 0 !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
}

.er-legend-item strong {
  position: absolute !important;
  right: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 54px !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: right !important;
  white-space: nowrap !important;
  font-size: 8px !important;
  line-height: 1.2 !important;
}

.er-legend-dot {
  width: 8px !important;
  height: 8px !important;
  min-width: 8px !important;
  margin: 0 !important;
}

.er-legend-item:nth-child(1),
.er-legend-item:nth-child(3) {
  margin-bottom: 8px !important;
}

/* ONLY: make Expense Trend smaller and give Expense by Category more room */
.er-charts-container > .er-chart-card:nth-child(1) {
  grid-column: span 5 !important;
}

.er-charts-container > .er-chart-card:nth-child(2) {
  grid-column: span 4 !important;
}

            /* =========================================================
               REQUESTED UI-ONLY FIXES
               ========================================================= */

            /* Reports menu: only the main Reports heading is bold. */
            .er-report-menu h3 {
              font-weight: 800 !important;
            }

            .er-report-menu button,
            .er-report-menu button.active {
              font-weight: 400 !important;
            }

            /* Action/KPI cards: consistent alignment, clean typography and responsive layout */
            .er-shell {
              container-type: inline-size !important;
              container-name: erShell !important;
              width: 100% !important;
              max-width: 100% !important;
            }

            .er-kpi-grid {
              display: grid !important;
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
              gap: 12px !important;
              align-items: stretch !important;
              width: 100% !important;
              margin-bottom: 20px !important;
            }

            /* Container-aware layouts */
            @container erShell (min-width: 1180px) {
              .er-kpi-grid {
                grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
              }
            }

            @container erShell (min-width: 720px) and (max-width: 1179px) {
              .er-kpi-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }

            @container erShell (min-width: 460px) and (max-width: 719px) {
              .er-kpi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }

            @container erShell (max-width: 459px) {
              .er-kpi-grid {
                grid-template-columns: 1fr !important;
              }
            }

            /* Viewport fallback media queries */
            @media (min-width: 1440px) {
              .er-kpi-grid {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
              }
            }

            @media (max-width: 1439px) and (min-width: 960px) {
              .er-kpi-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }

            @media (max-width: 959px) and (min-width: 600px) {
              .er-kpi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }

            @media (max-width: 599px) {
              .er-kpi-grid {
                grid-template-columns: 1fr !important;
              }
            }

            .er-kpi-card {
              min-height: 94px !important;
              height: 100% !important;
              background: #ffffff !important;
              border: 1px solid #e7ded7 !important;
              border-radius: 12px !important;
              padding: 12px 14px !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: stretch !important;
              box-shadow: 0 2px 8px rgba(73, 51, 36, 0.04) !important;
              box-sizing: border-box !important;
              min-width: 0 !important;
              overflow: hidden !important;
              transition: transform 0.15s ease, box-shadow 0.15s ease !important;
            }

            .er-kpi-card:hover {
              transform: translateY(-2px) !important;
              box-shadow: 0 4px 14px rgba(73, 51, 36, 0.08) !important;
            }

            .er-kpi-card > div {
              width: 100% !important;
              min-width: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
              justify-content: space-between !important;
              height: 100% !important;
            }

            .er-page .er-kpi-card span,
            .er-kpi-card span {
              display: block !important;
              color: #64748b !important;
              font-size: 11px !important;
              font-weight: 700 !important;
              letter-spacing: 0.3px !important;
              text-transform: uppercase !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              line-height: 1.3 !important;
              margin: 0 !important;
            }

            .er-page .er-kpi-card strong,
            .er-kpi-card strong {
              display: block !important;
              color: #1e293b !important;
              font-size: 1.15rem !important;
              font-weight: 800 !important;
              line-height: 1.25 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              letter-spacing: -0.3px !important;
              margin: 2px 0 3px !important;
            }

            .er-page .er-kpi-meta,
            .er-kpi-meta {
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              color: #16a34a !important;
              font-size: 10.5px !important;
              font-weight: 600 !important;
              line-height: 1.25 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              min-height: 18px !important;
              margin: 0 !important;
            }

            /* Main Tabs Bar: perfect alignment, uniform heights, zero text wrapping */
            .er-main-tabs {
              display: flex !important;
              align-items: center !important;
              flex-wrap: wrap !important;
              gap: 8px !important;
              margin-bottom: 16px !important;
              padding: 0 !important;
              border: none !important;
              background: transparent !important;
            }

            .er-page .er-main-tabs button,
            .er-main-tabs button {
              min-height: 38px !important;
              height: 38px !important;
              padding: 0 16px !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 7px !important;
              white-space: nowrap !important;
              border: 1px solid #ddd5ce !important;
              border-radius: 8px !important;
              background: #ffffff !important;
              color: #524741 !important;
              font-size: 12px !important;
              font-weight: 700 !important;
              cursor: pointer !important;
              transition: all 0.15s ease !important;
              flex-shrink: 0 !important;
              box-sizing: border-box !important;
              box-shadow: none !important;
            }

            .er-page .er-main-tabs button:hover,
            .er-main-tabs button:hover {
              background: #fff7ef !important;
              border-color: #cda27f !important;
              color: #8f4b24 !important;
            }

            .er-page .er-main-tabs button.active,
            .er-main-tabs button.active {
              background: #8f351d !important;
              border-color: #8f351d !important;
              color: #ffffff !important;
              box-shadow: 0 2px 6px rgba(143, 53, 29, 0.25) !important;
            }

            /* Embedded into Settings container tuning */
            .settings-content .er-page {
              min-height: auto !important;
              background: transparent !important;
              padding: 0 !important;
            }

            `}
</style>






      <div className="er-shell">
        <div className="er-header">
          <div>
            <div className="er-eyebrow">
              <BarChart3 size={12} />
              {t('hotelFinance', 'Hotel Finance')}
            </div>

            <h1>{t('expensesAndReports', 'Expenses & Reports')}</h1>

            <p>
              {t('manageExpensesSubtitle', 'Manage your hotel expenses and view business insights')}
            </p>
          </div>

          <div className="er-header-actions">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleImport}
            />

            <button
              className="er-btn"
              onClick={handleImportClick}
            >
              <Upload size={15} />
              {t('import', 'Import')}
            </button>

            <button
              className="er-btn"
              onClick={exportExpenses}
            >
              <Download size={15} />
              {t('export', 'Export')}
            </button>

            <button
              className="er-btn dark"
              onClick={downloadPDF}
            >
              <FileText size={15} />
              PDF
            </button>

            {/* KPI Customization Dropdown Button */}
            <div style={{ position: 'relative' }}>
              <button
                className="er-btn"
                onClick={() => setShowKpiCustomize(!showKpiCustomize)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: showKpiCustomize ? '#F1F5F9' : undefined,
                  fontWeight: 700,
                }}
              >
                <SlidersHorizontal size={15} />
                {t('customizeView', 'Customize View')}
              </button>

              {showKpiCustomize && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '260px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                    padding: '16px',
                    zIndex: 100,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917' }}>
                      {t('kpiCardsVisibility', 'KPI Cards Visibility')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('totalSales', 'Total Sales')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.totalSalesKpi !== false}
                        onChange={(e) => handleToggleKpiSection('totalSalesKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('totalExpenses', 'Total Expenses')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.totalExpensesKpi !== false}
                        onChange={(e) => handleToggleKpiSection('totalExpensesKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('netAmount', 'Net Amount')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.netAmountKpi !== false}
                        onChange={(e) => handleToggleKpiSection('netAmountKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('profit', 'Profit')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.profitKpi !== false}
                        onChange={(e) => handleToggleKpiSection('profitKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('loss', 'Loss')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.lossKpi !== false}
                        onChange={(e) => handleToggleKpiSection('lossKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('totalBills', 'Total Bills')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.totalBillsKpi !== false}
                        onChange={(e) => handleToggleKpiSection('totalBillsKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <span>{t('totalOrders', 'Total Orders')}</span>
                      <input
                        type="checkbox"
                        checked={reportDisplaySettings.totalOrdersKpi !== false}
                        onChange={(e) => handleToggleKpiSection('totalOrdersKpi', e.target.checked)}
                        style={{ accentColor: '#8B3E16', width: '16px', height: '16px' }}
                      />
                    </label>
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setShowKpiCustomize(false)}
                      style={{
                        background: '#8B3E16',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {t('done', 'Done')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="er-kpi-grid">
          {reportDisplaySettings.totalSalesKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('totalSales', 'Total Sales')}</span>
                <strong>{formatAmount(totalSales)}</strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.totalExpensesKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('totalExpenses', 'Total Expenses')}</span>
                <strong>{formatAmount(totalExpenses)}</strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.netAmountKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('netAmount', 'Net Amount')}</span>
                <strong>{formatAmount(netAmount)}</strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.profitKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('profit', 'Profit')}</span>
                <strong>{formatAmount(profitAmount)}</strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.lossKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('loss', 'Loss')}</span>
                <strong>{formatAmount(lossAmount)}</strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.totalBillsKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('totalBills', 'Total Bills')}</span>
                <strong>
                  {toDevanagari(invoices.length)}
                </strong>
              </div>
            </div>
          )}

          {reportDisplaySettings.totalOrdersKpi !== false && (
            <div className="er-kpi-card">
              <div>
                <span>{t('totalOrders', 'Total Orders')}</span>
                <strong>
                  {toDevanagari(backendOrders.length)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="er-main-tabs">
          <button
            className={
              activeSection === "expenses" ? "active" : ""
            }
            onClick={() => setActiveSection("expenses")}
          >
            <Wallet size={16} />
            {t('expenses', 'Expenses')}
          </button>

          <button
            className={
              activeSection === "reports" ? "active" : ""
            }
            onClick={() => setActiveSection("reports")}
          >
            <BarChart3 size={16} />
            {t('reports', 'Reports')}
          </button>

          <button
            className={
              activeSection === "charts" ? "active" : ""
            }
            onClick={() => setActiveSection("charts")}
          >
            <TrendingUp size={16} />
            {t('charts', 'Charts')}
          </button>

          <button
            className={
              activeSection === "gst-report" ? "active" : ""
            }
            onClick={() => setActiveSection("gst-report")}
          >
            <Receipt size={16} />
            {t('scaleSummaryGstReport', 'Scale Summary GST Report')}
          </button>

          <button
            className={
              activeSection === "purchase" ? "active" : ""
            }
            onClick={() => setActiveSection("purchase")}
          >
            <ShoppingCart size={16} />
            {t('purchase', 'Purchase')}
          </button>
        </div>

        {activeSection === "expenses" && (
          <div className="er-content-card">
            <div className="er-section-header">
              <div>
                <h2>{t('expenseList', 'Expense List')}</h2>
                <p>
                  {t('viewManageExpenses', 'View and manage all hotel expenses')}
                </p>
              </div>

              <div className="er-section-actions">
                <div className="er-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder={t('searchExpenses', 'Search expenses...')}
                    value={search}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const value = rawValue.replace(/\s+/g, " ").replace(/^ /, "");
                      if (value && !/^[A-Za-z ]*$/.test(value)) {
                        setSearchError("Only letters and single spaces are allowed.");
                        return;
                      }
                      setSearchError("");
                      setSearch(value);
                    }}
                    onBlur={() => setSearch((prev) => prev.trim())}
                  />
                  {searchError && (
                    <div className="er-search-validation-error">{searchError}</div>
                  )}
                </div>

                <button
                  className="er-btn primary"
                  onClick={openAddExpense}
                >
                  <Plus size={15} />
                  {t('addExpense', '+ Add Expense')}
                </button>
              </div>
            </div>

            <div className="er-table-wrapper">
              <table className="er-table er-expense-list-table">
                <thead>
                  <tr>
                    <th>{t('expenseName', 'Expense Name')}</th>
                    <th>{t('category', 'Category')}</th>
                    <th>{t('amount', 'Amount')}</th>
                    <th>{t('date', 'Date')}</th>
                    <th>{t('branchCode', 'Branch Code')}</th>
                    <th>{t('paymentMode', 'Payment Mode')}</th>
                    <th>{t('action', 'Actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="er-empty">
                        {t('noExpensesFound', 'No expenses found')}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>
                          <div className="er-name-cell">
                            <div className="er-small-icon">
                              <Receipt size={15} />
                            </div>
                            <span>{t(expense.name, expense.name)}</span>
                          </div>
                        </td>

                        <td>
                          <span className="er-category-badge">
                            {t(expense.category, expense.category)}
                          </span>
                        </td>

                        <td className="er-amount">
                          {formatAmount(expense.amount)}
                        </td>

                        <td>{formatDate(expense.date)}</td>

                        <td>{expense.branchCode ? toDevanagari(expense.branchCode) : "—"}</td>

                        <td>
                          <span className="er-payment-badge">
                            <CreditCard size={13} />
                            {t(expense.paymentMode, expense.paymentMode)}
                          </span>
                        </td>

                        <td>
                          <div className="er-actions">
                            <button
                              className="er-action view"
                              title={t('view', 'View')}
                              onClick={() =>
                                viewExpense(expense)
                              }
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              className="er-action edit"
                              title={t('edit', 'Edit')}
                              onClick={() =>
                                openEditExpense(expense)
                              }
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              className="er-action delete"
                              title={t('delete', 'Delete')}
                              onClick={() =>
                                deleteExpense(expense.id)
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      {t('showing', 'Showing')} {toDevanagari(filteredExpenses.length)} {t('expenses', 'expenses')}
                    </td>
                    <td colSpan={5}>
                      {t('total', 'Total')}:{" "}
                      {formatAmount(
                        filteredExpenses.reduce(
                          (sum, item) =>
                            sum + item.amount,
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeSection === "reports" && (
          <div className="er-report-layout">
            <div className="er-report-menu">
              <h3>{t('reports', 'Reports')}</h3>

              <button
                className={
                  activeReport === "sales" ? "active" : ""
                }
                onClick={() => setActiveReport("sales")}
              >
                <TrendingUp size={15} />
                {t('salesReport', 'Sales Report')}
              </button>

              <button
                className={
                  activeReport === "expense" ? "active" : ""
                }
                onClick={() => setActiveReport("expense")}
              >
                <Wallet size={15} />
                {t('expenseReport', 'Expense Report')}
              </button>

              <button
                className={
                  activeReport === "order" ? "active" : ""
                }
                onClick={() => setActiveReport("order")}
              >
                <ShoppingCart size={15} />
                {t('orderReport', 'Order Report')}
              </button>

              <button
                className={
                  activeReport === "menu" ? "active" : ""
                }
                onClick={() => setActiveReport("menu")}
              >
                <Utensils size={15} />
                {t('menuReport', 'Menu Report')}
              </button>


              <button
                className={
                  activeReport === "branch" ? "active" : ""
                }
                onClick={() => setActiveReport("branch")}
              >
                <Building2 size={15} />
                {t('branchReport', 'Branch Report')}
              </button>
            </div>

            <div className="er-report-content">
              <div className="er-report-title">
                <div>
                  <h2>{t(reportTitles[activeReport], reportTitles[activeReport])}</h2>

                </div>

                <div className="er-report-title-actions">
                  <div className="er-report-periods er-chart-periods">
                  {(
                    Object.keys(periodLabels) as ReportPeriod[]
                  ).map((period) => (
                    <button
                      key={period}
                      type="button"
                      className={
                        reportPeriod === period ? "active" : ""
                      }
                      onClick={() => setReportPeriod(period)}
                    >
                      {t(periodLabels[period], periodLabels[period])}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {renderReport()}
            </div>
          </div>
        )}

        {activeSection === "charts" && (
          <>
            <div className="er-charts-toolbar">
              <div>
                <strong>{t('businessAnalytics', 'Business Analytics')}</strong>
                <span>
                  {t('liveChartsSubtitle', 'Live charts generated from your expense and report data')}
                </span>
              </div>

              <div className="er-chart-periods">
                {(
                  Object.keys(periodLabels) as ReportPeriod[]
                ).map((period) => (
                  <button
                    key={period}
                    className={
                      reportPeriod === period ? "active" : ""
                    }
                    onClick={() => {
                      setReportPeriod(period);
                      setStaffChartPeriod(period);
                    }}
                  >
                    {t(periodLabels[period], periodLabels[period])}
                  </button>
                ))}
              </div>
            </div>

            <div className="er-order-summary-row">
              <div className="er-order-summary-card">
                <span>{t('orders', 'Orders')}</span>
                <strong>{toDevanagari(reportOrderTotal)}</strong>
              </div>
              <div className="er-order-summary-card">
                <span>{t('dining', 'Dining')}</span>
                <strong>{toDevanagari(filteredOrderData.reduce((sum, item) => sum + item.dineIn, 0))}</strong>
              </div>
              <div className="er-order-summary-card">
                <span>{t('takeaway', 'Takeaway')}</span>
                <strong>{toDevanagari(filteredOrderData.reduce((sum, item) => sum + (item.takeaway ?? item.delivery), 0))}</strong>
              </div>
            </div>

            <div className="er-charts-container">
              <div className="er-chart-card wide">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('expenseTrend', 'Expense Trend')}</h3>
                    <p>
                      {t('dailyExpenseMovement', 'Daily expense movement')} •{" "}
                      {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}
                    </p>
                  </div>

                  <div className="er-chart-value">
                    {formatAmount(reportExpenseTotal)}
                  </div>
                </div>

                {chartTrendData.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noExpenseDataAvailablePeriod', 'No expense data available for this period.')}
                  </div>
                ) : (
                  <div className="er-trend">
                    {chartTrendData.map((item) => (
                      <div
                        className="er-trend-column"
                        key={item.date}
                      >
                        <div className="er-trend-value">
                          {formatAmount(item.amount)}
                        </div>
                        <div
                          className="er-trend-bar"
                          style={{
                            height: `${Math.max(
                              (item.amount /
                                Math.max(
                                  ...chartTrendData.map(
                                    (x) => x.amount
                                  ),
                                  1
                                )) *
                                145,
                              5
                            )}px`,
                          }}
                        />
                        <div className="er-trend-label">
                          {formatDate(item.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="er-chart-card">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('expenseByCategory', 'Expense by Category')}</h3>
                    <p>
                      {t('distributionForSelectedPeriod', 'Distribution for selected period')}
                    </p>
                  </div>

                  <PieChart
                    size={17}
                    color="#8f4b24"
                  />
                </div>

                {chartCategoryData.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noCategoryDataAvailable', 'No category data available.')}
                  </div>
                ) : (
                  <div className="er-donut-wrap">
                    <div
                      className="er-donut"
                      style={{
                        background: chartGradient,
                        cursor: chartCategoryData.length ? "pointer" : "default",
                      }}
                      title={t('expenseByCategory', 'Expense by Category')}
                    >
                      <div className="er-donut-center">
                        <strong>
                          {formatAmount(reportExpenseTotal)}
                        </strong>
                        <span>{t('total', 'Total')}</span>
                      </div>
                    </div>

                    <div className="er-legend">
                      {chartCategoryData
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            className="er-legend-item"
                            key={item.category}
                          >
                            <span
                              className="er-legend-dot"
                              style={{
                                background:
                                  chartColors[
                                    index %
                                      chartColors.length
                                  ],
                              }}
                            />
                            <span>
                              {t(item.category, item.category)}
                            </span>
                            <strong>
                              {formatAmount(item.amount)} · {toDevanagari(item.percent.toFixed(1))}%
                            </strong>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="er-chart-card">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('salesVsExpenses', 'Sales vs Expenses')}</h3>
                    <p>
                      {t('dailyComparison', 'Daily comparison')} •{" "}
                      {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}
                    </p>
                  </div>
                </div>

                <div className="er-chart-legend">
                  <span>
                    <i className="er-mini-dot sales" />
                    {t('sales', 'Sales')}
                  </span>
                  <span>
                    <i className="er-mini-dot expense" />
                    {t('expenses', 'Expenses')}
                  </span>
                </div>

                {salesExpenseTrend.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noComparisonDataAvailable', 'No comparison data available.')}
                  </div>
                ) : (
                  <div className="er-dual-chart">
                    {salesExpenseTrend.map((item) => (
                      <div
                        className="er-dual-column"
                        key={item.date}
                      >
                        <div
                          className="er-column sales"
                          style={{
                            height: `${Math.max(
                              (item.sales /
                                maxSalesExpense) *
                                155,
                              3
                            )}px`,
                          }}
                        />
                        <div
                          className="er-column expense"
                          style={{
                            height: `${Math.max(
                              (item.expenses /
                                maxSalesExpense) *
                                155,
                              3
                            )}px`,
                          }}
                        />
                        <div className="er-column-label">
                          {formatDate(item.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="er-chart-card wide er-menu-report-card">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('menuReport', 'Menu Report')}</h3>
                    <p>{t('menuPerformance', 'Menu performance')} • {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}</p>
                  </div>
                </div>

                {filteredMenuData.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noMenuDataAvailable', 'No menu data available.')}
                  </div>
                ) : (
                  <div className="er-bar-chart">
                    {filteredMenuData.map((item) => (
                      <div className="er-bar-row" key={item.item}>
                        <div className="er-bar-label">
                          {t(item.item, item.item)}
                        </div>

                        <div className="er-bar-track">
                          <div
                            className="er-bar-fill"
                            style={{
                              width: `${Math.max(
                                (item.orders /
                                  Math.max(...filteredMenuData.map((x) => x.orders), 1)) *
                                  100,
                                2
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="er-bar-value">
                          {toDevanagari(item.orders)} {t('orders', 'orders')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="er-chart-card er-top-expenses-card">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('topExpenses', 'Top Expenses')}</h3>
                    <p>
                      {t('highestIndividualExpenses', 'Highest individual expenses')}
                    </p>
                  </div>
                </div>

                {topExpenses.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noExpensesAvailable', 'No expenses available.')}
                  </div>
                ) : (
                  <div className="er-top-expenses">
                    {topExpenses.map((item, index) => (
                      <div
                        className="er-top-expense"
                        key={item.id}
                      >
                        <div className="er-top-expense-left">
                          <div className="er-top-rank">
                            {toDevanagari(index + 1)}
                          </div>

                          <div className="er-top-expense-name">
                            {t(item.name, item.name)}
                          </div>
                        </div>

                        <div className="er-top-expense-amount">
                          {formatAmount(item.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div className="er-chart-card full er-expense-snapshot-card">
                <div className="er-chart-header">
                  <div>
                    <h3>{t('expenseSnapshot', 'Expense Snapshot')}</h3>
                    <p>
                      {t('quickVisualComparisonDailyExpenseRecords', 'Quick visual comparison of daily expense records')}
                    </p>
                  </div>

                  <div className="er-chart-value">
                    {toDevanagari(dailyExpenseChart.length)} {t('days', 'days')}
                  </div>
                </div>

                {dailyExpenseChart.length === 0 ? (
                  <div className="er-chart-empty">
                    {t('noExpenseDataAvailable', 'No expense data available.')}
                  </div>
                ) : (
                  <div className="er-bar-chart">
                    {dailyExpenseChart.map((item) => (
                      <div
                        className="er-bar-row"
                        key={item.date}
                      >
                        <div className="er-bar-label">
                          {formatDate(item.date)}
                        </div>

                        <div className="er-bar-track">
                          <div
                            className="er-bar-fill expense"
                            style={{
                              width: `${
                                (item.expense /
                                  maxDailyExpense) *
                                100
                              }%`,
                            }}
                          />
                        </div>

                        <div className="er-bar-value">
                          {formatAmount(item.expense)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "gst-report" && (
          <div className="er-report-layout">
            <div className="er-report-menu">
              <h3>{t('gstTaxReports', 'GST Tax Reports')}</h3>
              <button
                className={gstReportTab === "sales-summary" ? "active" : ""}
                type="button"
                onClick={() => setGstReportTab("sales-summary")}
              >
                <Receipt size={15} />
                A. {t('gstSalesSummary', 'GST Sales Summary')}
              </button>
              <button
                className={gstReportTab === "rate-wise" ? "active" : ""}
                type="button"
                onClick={() => setGstReportTab("rate-wise")}
              >
                <BarChart3 size={15} />
                B. {t('gstRateWiseReport', 'GST Rate-wise Report')}
              </button>
              <button
                className={gstReportTab === "invoice-wise" ? "active" : ""}
                type="button"
                onClick={() => setGstReportTab("invoice-wise")}
              >
                <FileText size={15} />
                C. {t('invoiceWiseGstReport', 'Invoice-wise GST Report')}
              </button>
              <button
                className={gstReportTab === "purchase-gst" ? "active" : ""}
                type="button"
                onClick={() => setGstReportTab("purchase-gst")}
              >
                <ShoppingCart size={15} />
                D. {t('purchaseGstItc', 'Purchase GST (ITC)')}
              </button>
            </div>

            <div className="er-report-content">
              {/* Header with Title and Filters */}
              <div className="er-report-title" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2>
                    {gstReportTab === "sales-summary" && t('gstSalesSummary', 'GST Sales Summary')}
                    {gstReportTab === "rate-wise" && t('gstRateWiseTaxReport', 'GST Rate-wise Tax Report')}
                    {gstReportTab === "invoice-wise" && t('invoiceWiseGstReport', 'Invoice-wise GST Report')}
                    {gstReportTab === "purchase-gst" && t('purchaseGstItcTitle', 'Purchase GST & Input Tax Credit (ITC)')}
                  </h2>
                  <p>
                    {gstReportTab === "sales-summary" && t('salesSummarySub', 'Consolidated GST summary from verified SQL Server billing records')}
                    {gstReportTab === "rate-wise" && t('rateWiseSub', 'Itemized tax distribution across applicable GST rate slabs')}
                    {gstReportTab === "invoice-wise" && t('invoiceWiseSub', 'Detailed transaction-level tax breakdown per tax invoice')}
                    {gstReportTab === "purchase-gst" && t('purchaseGstSub', 'Input Tax Credit reconciliation distinguishing eligible vs blocked ITC (Sec 17(5))')}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Branch Filter */}
                  <select
                    value={gstBranchId}
                    onChange={(e) => setGstBranchId(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5DCD5',
                      color: '#211B17',
                    }}
                  >
                    <option value="all">{t('allBranches', 'All Branches')}</option>
                    {branches.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.name} ({b.code})</option>
                    ))}
                  </select>

                  {/* Date Range Filter */}
                  <select
                    value={gstPeriod}
                    onChange={(e) => setGstPeriod(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5DCD5',
                      color: '#211B17',
                    }}
                  >
                    <option value="today">{t('today', 'Today')}</option>
                    <option value="this-week">{t('thisWeek', 'This Week')}</option>
                    <option value="this-month">{t('thisMonth', 'This Month')}</option>
                    <option value="all">{t('allTime', 'All Time')}</option>
                  </select>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={() => exportGstSummaryCSV(gstReportTab)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#15803D',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* TAB A: GST SALES SUMMARY */}
              {gstReportTab === "sales-summary" && (
                <>
                  <div className="er-gst-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <div className="er-gst-card"><span>{t('totalGrossSales', 'Total Gross Sales')}</span><strong>{formatAmount(gstSalesSummary.totalSales)}</strong></div>
                    <div className="er-gst-card"><span>{t('netTaxableSales', 'Net Taxable Sales')}</span><strong>{formatAmount(gstSalesSummary.taxableSales)}</strong></div>
                    <div className="er-gst-card"><span>{t('nilExemptSales', 'Nil / Exempt Sales')}</span><strong>{formatAmount(gstSalesSummary.exemptNilSales)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalCgst', 'Total CGST')}</span><strong>{formatAmount(gstSalesSummary.totalCgst)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalSgst', 'Total SGST')}</span><strong>{formatAmount(gstSalesSummary.totalSgst)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalIgst', 'Total IGST')}</span><strong>{formatAmount(gstSalesSummary.totalIgst)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalTaxLiability', 'Total Tax Liability')}</span><strong style={{ color: '#0284C7' }}>{formatAmount(gstSalesSummary.totalTax)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalInvoices', 'Total Invoices')}</span><strong>{toDevanagari(gstSalesSummary.invoiceCount)}</strong></div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5DCD5', padding: '18px', boxShadow: '0 2px 8px rgba(73, 51, 36, 0.04)' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#8B3E16' }}>
                      {t('salesTaxSummaryStatement', 'Sales Tax Summary Statement')}
                    </h3>
                    <table className="er-gst-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FFF9F3', borderBottom: '2px solid #E5DCD5', color: '#8B3E16' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('supplyClassification', 'Supply Classification')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('invoiceCount', 'Invoice Count')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxableTurnover', 'Taxable Turnover (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('centralGst', 'Central GST (CGST)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('stateGst', 'State GST (SGST)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('integratedGst', 'Integrated GST (IGST)')}</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#8B3E16' }}>{t('totalTax', 'Total GST (₹)')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{t('intraStateTaxableSupplies', 'Intra-State Taxable Supplies (CGST + SGST)')}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{toDevanagari(gstInvoiceWiseReport.filter(i => i.cgst > 0 || i.sgst > 0).length)}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(gstSalesSummary.taxableSales - gstSalesSummary.exemptNilSales)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 600 }}>{formatAmount(gstSalesSummary.totalCgst)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 600 }}>{formatAmount(gstSalesSummary.totalSgst)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#15803D' }}>{formatAmount(gstSalesSummary.totalCgst + gstSalesSummary.totalSgst)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17', backgroundColor: '#FDFAF7' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{t('interStateTaxableSupplies', 'Inter-State Taxable Supplies (IGST)')}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{toDevanagari(gstInvoiceWiseReport.filter(i => i.igst > 0).length)}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', color: '#0284C7', fontWeight: 600 }}>{formatAmount(gstSalesSummary.totalIgst)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>{formatAmount(gstSalesSummary.totalIgst)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{t('nilRatedExemptedSupplies', 'Nil-Rated / Exempted Supplies')}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{toDevanagari(gstInvoiceWiseReport.filter(i => i.totalTax === 0).length)}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(gstSalesSummary.exemptNilSales)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', color: '#8C827A' }}>{formatAmount(0)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#8C827A' }}>{formatAmount(0)}</td>
                        </tr>
                        <tr className="er-gst-total-row" style={{ backgroundColor: '#FFF4ED', fontWeight: 800, color: '#8B3E16', borderTop: '2px solid #E5DCD5' }}>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{t('netTotal', 'NET TOTAL')}</td>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{toDevanagari(gstSalesSummary.invoiceCount)}</td>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.taxableSales)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalCgst)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalSgst)}</td>
                          <td style={{ padding: '12px', color: '#0284C7', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalIgst)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalTax)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* TAB B: GST RATE-WISE REPORT */}
              {gstReportTab === "rate-wise" && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5DCD5', padding: '18px', boxShadow: '0 2px 8px rgba(73, 51, 36, 0.04)', overflowX: 'auto' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#8B3E16' }}>
                    {t('gstRateWiseTaxDistribution', 'GST Rate-wise Tax Distribution')}
                  </h3>
                  <table className="er-gst-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FFF9F3', borderBottom: '2px solid #E5DCD5', color: '#8B3E16' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxGroupSlab', 'Tax Group / Slab')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('gstRate', 'GST Rate')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxCategory', 'Tax Category')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxableAmount', 'Taxable Amount (₹)')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('cgstAmount', 'CGST Amount (₹)')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('sgstAmount', 'SGST Amount (₹)')}</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('igstAmount', 'IGST Amount (₹)')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#8B3E16' }}>{t('totalTax', 'Total Tax (₹)')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstRateWiseReport.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{t(row.name, row.name)}</td>
                          <td style={{ padding: '12px', color: '#0284C7', fontWeight: 700 }}>{toDevanagari(row.rate)}%</td>
                          <td style={{ padding: '12px', color: '#5C544E' }}>{t(row.category, row.category)}</td>
                          <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(row.taxable)}</td>
                          <td style={{ padding: '12px', color: '#15803D' }}>{formatAmount(row.cgst)}</td>
                          <td style={{ padding: '12px', color: '#15803D' }}>{formatAmount(row.sgst)}</td>
                          <td style={{ padding: '12px', color: '#0284C7' }}>{formatAmount(row.igst)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#8B3E16' }}>
                            {formatAmount(row.totalTax)}
                          </td>
                        </tr>
                      ))}
                      <tr className="er-gst-total-row" style={{ backgroundColor: '#FFF4ED', fontWeight: 800, color: '#8B3E16', borderTop: '2px solid #E5DCD5' }}>
                        <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{t('total', 'TOTAL')}</td>
                        <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                        <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                        <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.taxableSales)}</td>
                        <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalCgst)}</td>
                        <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalSgst)}</td>
                        <td style={{ padding: '12px', color: '#0284C7', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalIgst)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB C: INVOICE-WISE GST REPORT */}
              {gstReportTab === "invoice-wise" && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5DCD5', padding: '18px', boxShadow: '0 2px 8px rgba(73, 51, 36, 0.04)', overflowX: 'auto' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#8B3E16' }}>
                    {t('invoiceWiseTaxBreakdown', 'Invoice-wise Tax Breakdown')}
                  </h3>
                  {gstInvoiceWiseReport.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: '#756F69' }}>
                      {t('noTaxInvoicesFound', 'No tax invoices found for the selected period and branch filter.')}
                    </div>
                  ) : (
                    <table className="er-gst-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FFF9F3', borderBottom: '2px solid #E5DCD5', color: '#8B3E16' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('invoiceNo', 'Invoice #')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('date', 'Date')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('branch', 'Branch')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('customer', 'Customer')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxableAmount', 'Taxable (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('cgstAmount', 'CGST (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('sgstAmount', 'SGST (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('igstAmount', 'IGST (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('totalTax', 'GST Total (₹)')}</th>
                          <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('grandTotal', 'Grand Total (₹)')}</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#8B3E16' }}>{t('status', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstInvoiceWiseReport.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17' }}>
                            <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#8B3E16' }}>
                              {inv.invoiceNumber}
                            </td>
                            <td style={{ padding: '12px', color: '#5C544E' }}>{formatDate(inv.invoiceDate)}</td>
                            <td style={{ padding: '12px', color: '#211B17' }}>{t(inv.branchName, inv.branchName)}</td>
                            <td style={{ padding: '12px', color: '#211B17' }}>{localizeGuestName ? localizeGuestName(inv.customerName) : t(inv.customerName, inv.customerName)}</td>
                            <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(inv.taxableAmount)}</td>
                            <td style={{ padding: '12px', color: '#15803D' }}>{formatAmount(inv.cgst)}</td>
                            <td style={{ padding: '12px', color: '#15803D' }}>{formatAmount(inv.sgst)}</td>
                            <td style={{ padding: '12px', color: '#0284C7' }}>{formatAmount(inv.igst)}</td>
                            <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{formatAmount(inv.totalTax)}</td>
                            <td style={{ padding: '12px', fontWeight: 700, color: '#15803D' }}>{formatAmount(inv.grandTotal)}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span
                                style={{
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor:
                                    inv.status === 'PAID' ? '#DCFCE7' :
                                    inv.status === 'PARTIAL' ? '#FEF3C7' :
                                    '#FEE2E2',
                                  color:
                                    inv.status === 'PAID' ? '#15803D' :
                                    inv.status === 'PARTIAL' ? '#D97706' :
                                    '#DC2626',
                                  border:
                                    inv.status === 'PAID' ? '1px solid #86EFAC' :
                                    inv.status === 'PARTIAL' ? '1px solid #FDE68A' :
                                    '1px solid #FCA5A5',
                                }}
                              >
                                {translateStatus(inv.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="er-gst-total-row" style={{ backgroundColor: '#FFF4ED', fontWeight: 800, color: '#8B3E16', borderTop: '2px solid #E5DCD5' }}>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{t('total', 'TOTAL')} ({toDevanagari(gstInvoiceWiseReport.length)})</td>
                          <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                          <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                          <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.taxableSales)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalCgst)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalSgst)}</td>
                          <td style={{ padding: '12px', color: '#0284C7', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalIgst)}</td>
                          <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalTax)}</td>
                          <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstSalesSummary.totalSales)}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#8B3E16' }}>-</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB D: PURCHASE GST & INPUT TAX CREDIT (ITC) REPORT */}
              {gstReportTab === "purchase-gst" && (
                <>
                  <div className="er-gst-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div className="er-gst-card"><span>{t('totalPurchases', 'Total Purchases')}</span><strong>{formatAmount(gstPurchaseReport.totalPurchaseVal)}</strong></div>
                    <div className="er-gst-card"><span>{t('taxablePurchaseAmount', 'Taxable Purchase Amount')}</span><strong>{formatAmount(gstPurchaseReport.totalPurchaseTaxable)}</strong></div>
                    <div className="er-gst-card"><span>{t('totalPurchaseGst', 'Total Purchase GST')}</span><strong>{formatAmount(gstPurchaseReport.totalPurchaseGst)}</strong></div>
                    <div className="er-gst-card"><span style={{ color: '#15803D', fontWeight: 600 }}>{t('eligibleItc', 'Eligible ITC')}</span><strong style={{ color: '#15803D' }}>{formatAmount(gstPurchaseReport.totalEligibleItc)}</strong></div>
                    <div className="er-gst-card"><span style={{ color: '#DC2626', fontWeight: 600 }}>{t('ineligibleItc', 'Ineligible ITC (Sec 17(5))')}</span><strong style={{ color: '#DC2626' }}>{formatAmount(gstPurchaseReport.totalIneligibleItc)}</strong></div>
                  </div>

                  <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '14px 18px', fontSize: '13px', color: '#1E40AF', marginBottom: '16px', lineHeight: 1.5 }}>
                    ⚖️ <strong>{t('itcGuidanceLabel', 'ITC Eligibility Guidance:')}</strong> {t('itcGuidanceText', 'Pursuant to Section 17(5) of the CGST Act, Input Tax Credit on food and beverage supplies used in standalone restaurants (taxed at 5% without ITC) cannot be claimed. Capital goods, operational machinery, packaging, and facility utilities remain eligible for ITC.')}
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5DCD5', padding: '18px', boxShadow: '0 2px 8px rgba(73, 51, 36, 0.04)', overflowX: 'auto' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#8B3E16' }}>
                      {t('purchaseInvoicesItcLedger', 'Purchase Invoices & ITC Ledger')}
                    </h3>
                    {gstPurchaseReport.purchaseList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '36px 0', color: '#756F69' }}>
                        {t('noPurchaseInvoicesFound', 'No purchase invoices found for the selected period.')}
                      </div>
                    ) : (
                      <table className="er-gst-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FFF9F3', borderBottom: '2px solid #E5DCD5', color: '#8B3E16' }}>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('supplier', 'Supplier')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('purchaseInvNo', 'Purchase Inv #')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('date', 'Date')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('taxableAmount', 'Taxable Amount (₹)')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('gstAmount', 'GST Amount (₹)')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('eligibleItcRs', 'Eligible ITC (₹)')}</th>
                            <th style={{ padding: '10px 12px', fontWeight: 700, color: '#8B3E16' }}>{t('ineligibleItcRs', 'Ineligible ITC (₹)')}</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#8B3E16' }}>{t('status', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstPurchaseReport.purchaseList.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F0ECE7', color: '#211B17' }}>
                              <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{t(p.supplierName, p.supplierName)}</td>
                              <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#8B3E16' }}>{p.invoiceNumber}</td>
                              <td style={{ padding: '12px', color: '#5C544E' }}>{formatDate(p.invoiceDate)}</td>
                              <td style={{ padding: '12px', color: '#211B17' }}>{formatAmount(p.taxableAmount)}</td>
                              <td style={{ padding: '12px', fontWeight: 600, color: '#211B17' }}>{formatAmount(p.gstAmount)}</td>
                              <td style={{ padding: '12px', color: '#15803D', fontWeight: 600 }}>
                                {formatAmount(p.eligibleItc)}
                              </td>
                              <td style={{ padding: '12px', color: '#DC2626', fontWeight: 600 }}>
                                {formatAmount(p.ineligibleItc)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: p.status === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                                    color: p.status === 'PAID' ? '#15803D' : '#D97706',
                                    border: p.status === 'PAID' ? '1px solid #86EFAC' : '1px solid #FDE68A',
                                  }}
                                >
                                  {translateStatus(p.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="er-gst-total-row" style={{ backgroundColor: '#FFF4ED', fontWeight: 800, color: '#8B3E16', borderTop: '2px solid #E5DCD5' }}>
                            <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{t('total', 'TOTAL')} ({toDevanagari(gstPurchaseReport.purchaseList.length)})</td>
                            <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                            <td style={{ padding: '12px', color: '#8B3E16' }}>-</td>
                            <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstPurchaseReport.totalPurchaseTaxable)}</td>
                            <td style={{ padding: '12px', color: '#8B3E16', fontWeight: 800 }}>{formatAmount(gstPurchaseReport.totalPurchaseGst)}</td>
                            <td style={{ padding: '12px', color: '#15803D', fontWeight: 800 }}>{formatAmount(gstPurchaseReport.totalEligibleItc)}</td>
                            <td style={{ padding: '12px', color: '#DC2626', fontWeight: 800 }}>{formatAmount(gstPurchaseReport.totalIneligibleItc)}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#8B3E16' }}>-</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeSection === "purchase" && (
          <div className="er-report-layout">
            <div className="er-report-menu">
              <h3>{t('purchase', 'Purchase')}</h3>
              <button className="active" type="button">
                <ShoppingCart size={15} />
                {t('purchaseSummary', 'Purchase Summary')}
              </button>
            </div>

            <div className="er-report-content">
              <div className="er-report-title">
                <div>
                  <h2>{t('purchaseReport', 'Purchase Report')}</h2>
                  <p>{t('purchaseSummaryFor', 'Purchase summary for')} {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="er-chart-periods">
                    {(Object.keys(periodLabels) as ReportPeriod[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        className={reportPeriod === period ? "active" : ""}
                        onClick={() => setReportPeriod(period)}
                      >
                        {t(periodLabels[period], periodLabels[period])}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="er-btn"
                    onClick={exportPurchaseData}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #dcd3cb', color: '#6f3d20' }}
                  >
                    <Download size={14} />
                    {t('export', 'Export')}
                  </button>

                  <button
                    type="button"
                    className="er-btn dark"
                    onClick={downloadPDF}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <FileText size={14} />
                    PDF
                  </button>
                </div>
              </div>

              <div className="er-gst-summary">
                <div className="er-gst-card"><span>{t('totalPurchase', 'Total Purchase')}</span><strong>{formatAmount(reportPurchaseTotal)}</strong></div>
                <div className="er-gst-card"><span>{t('purchaseCount', 'Purchase Count')}</span><strong>{toDevanagari(filteredPurchaseData.length)}</strong></div>
                <div className="er-gst-card"><span>{t('taxablePurchase', 'Taxable Purchase')}</span><strong>{formatAmount(reportPurchaseTaxableTotal)}</strong></div>
                <div className="er-gst-card"><span>{t('purchaseGst', 'Purchase GST')}</span><strong>{formatAmount(reportPurchaseGSTTotal)}</strong></div>
                <div className="er-gst-card er-gst-card-wide"><span>{t('grandPurchaseTotal', 'Grand Purchase Total')}</span><strong>{formatAmount(reportPurchaseTotal)}</strong></div>
              </div>

              {filteredPurchaseData.length === 0 ? (
                <div className="er-chart-empty er-purchase-empty">
                  {t('noPurchaseDataFound', 'No purchase data found for')} {t(periodLabels[reportPeriod], periodLabels[reportPeriod])}.
                </div>
              ) : (
                <div className="er-report-table-card">
                  <style>{`
                    .er-purchase-report-table th:nth-child(3),
                    .er-purchase-report-table td:nth-child(3),
                    .er-purchase-report-table th:nth-child(5),
                    .er-purchase-report-table td:nth-child(5) {
                      text-align: left !important;
                    }
                  `}



</style>
                  <table className="er-table er-purchase-report-table">
                    <thead>
                      <tr>
                        <th>{t('date', 'Date')}</th>
                        <th>{t('supplier', 'Supplier')}</th>
                        <th>{t('taxableAmount', 'Taxable Amount')}</th>
                        <th>{t('gst', 'GST')}</th>
                        <th>{t('total', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchaseData.map((item) => (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td>{t(item.supplier, item.supplier)}</td>
                          <td className="er-amount">{formatAmount(item.taxableAmount)}</td>
                          <td>{formatAmount(item.gst)}</td>
                          <td className="er-amount">{formatAmount(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {showExpenseModal && (
          <div className="er-modal-overlay">
            <div className="er-modal">
              <div className="er-modal-header">
                <div>
                  <h2>
                    {editingExpense
                      ? t('editExpense', 'Edit Expense')
                      : t('addExpenseBtn', 'Add Expense')}
                  </h2>

                  <p>
                    {editingExpense
                      ? t('updateExpenseDetails', 'Update expense details')
                      : t('enterNewHotelExpenseDetails', 'Enter new hotel expense details')}
                  </p>
                </div>

                <button
                  className="er-close-btn"
                  onClick={() =>
                    setShowExpenseModal(false)
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit}>
                <div className="er-form-grid">
                  <div className="er-form-group">
                    <label>
                      {t('expenseName', 'Expense Name')} <span>*</span>
                    </label>

                    <input
                      type="text"
                      placeholder={t('enterExpenseName', 'Enter expense name')}
                      value={expenseForm.name}
                      className={
                        validationErrors.name
                          ? "input-error"
                          : ""
                      }
                      onChange={handleNameChange}
                      onBlur={() =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          name: prev.name.trim(),
                        }))
                      }
                    />

                    {validationErrors.name && (
                      <div className="er-validation-error">
                        {validationErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('category', 'Category')} <span>*</span>
                    </label>

                    <div className="er-category-input-row">
                      <select
                        value={expenseForm.category}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "__add_category__") {
                            setNewCategoryName("");
                            setCategoryError("");
                            setShowCategoryModal(true);
                            return;
                          }

                          setExpenseForm((prev) => ({
                            ...prev,
                            category: value,
                          }));
                          setValidationErrors((prev) => ({
                            ...prev,
                            category: "",
                          }));
                        }}
                      >
                        <option value="">
                          {t('selectCategory', 'Select category')}
                        </option>

                        <option value="__add_category__">
                          {t('addCategoryOption', '+ Add Category')}
                        </option>

                        {expenseCategories.map((category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {t(category, category)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {validationErrors.category && (
                      <div className="er-validation-error">
                        {validationErrors.category}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('amount', 'Amount')} <span>*</span>
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={t('enterAmount', 'Enter amount')}
                      value={expenseForm.amount}
                      className={
                        validationErrors.amount
                          ? "input-error"
                          : ""
                      }
                      onChange={handleAmountChange}
                    />

                    {validationErrors.amount && (
                      <div className="er-validation-error">
                        {validationErrors.amount}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('quantity', 'Quantity')} <span>*</span>
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t('enterQuantity', 'Enter quantity')}
                      value={expenseForm.quantity}
                      className={
                        validationErrors.quantity
                          ? "input-error"
                          : ""
                      }
                      onChange={handleQuantityChange}
                    />

                    {validationErrors.quantity && (
                      <div className="er-validation-error">
                        {validationErrors.quantity}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('date', 'Date')} <span>*</span>
                    </label>

                    <div className="er-date-input-wrap">
                      <LocalizedDatePicker
                        value={expenseForm.date}
                        onChange={(dStr) => {
                          setExpenseForm((prev) => ({
                            ...prev,
                            date: dStr,
                          }));
                          setValidationErrors((prev) => ({
                            ...prev,
                            date: "",
                          }));
                        }}
                      />
                      <button
                        type="button"
                        className="er-date-calendar-btn"
                        aria-label="Open date calendar"
                        onClick={openExpenseDatePicker}
                      >
                        <CalendarDays size={15} />
                      </button>
                    </div>

                    {validationErrors.date && (
                      <div className="er-validation-error">
                        {validationErrors.date}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('branchCode', 'Branch Code')} <span>*</span>
                    </label>
                    <select
                      value={expenseForm.branchCode}
                      className={
                        validationErrors.branchCode
                          ? "input-error"
                          : ""
                      }
                      onChange={(e) => {
                        setExpenseForm((prev) => ({
                          ...prev,
                          branchCode: e.target.value,
                        }));
                        setValidationErrors((prev) => ({
                          ...prev,
                          branchCode: "",
                        }));
                      }}
                    >
                      <option value="">{t('selectBranchCode', 'Select branch code')}</option>
                      {branches && branches.length > 0 ? (
                        branches.map((b) => (
                          <option key={b.id} value={b.code}>
                            {t(b.name, b.name)} ({toDevanagari(b.code)})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="BR001">{toDevanagari("BR001")}</option>
                          <option value="BR002">{toDevanagari("BR002")}</option>
                          <option value="BR003">{toDevanagari("BR003")}</option>
                        </>
                      )}
                    </select>

                    {validationErrors.branchCode && (
                      <div className="er-validation-error">
                        {validationErrors.branchCode}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group">
                    <label>
                      {t('paymentMode', 'Payment Mode')} <span>*</span>
                    </label>

                    <select
                      value={expenseForm.paymentMode}
                      className={
                        validationErrors.paymentMode
                          ? "input-error"
                          : ""
                      }
                      onChange={(e) => {
                        setExpenseForm((prev) => ({
                          ...prev,
                          paymentMode: e.target.value,
                        }));
                        setValidationErrors((prev) => ({
                          ...prev,
                          paymentMode: "",
                        }));
                      }}
                    >
                      <option value="">
                        {t('selectPaymentMode', 'Select payment mode')}
                      </option>

                      {paymentModes.map((mode) => (
                        <option
                          key={mode}
                          value={mode}
                        >
                          {t(mode, mode)}
                        </option>
                      ))}
                    </select>

                    {validationErrors.paymentMode && (
                      <div className="er-validation-error">
                        {validationErrors.paymentMode}
                      </div>
                    )}
                  </div>

                  <div className="er-form-group full">
                    <label>{t('description', 'Description')}</label>

                    <textarea
                      rows={3}
                      placeholder={t('enterExpenseDescription', 'Enter expense description...')}
                      value={expenseForm.description}
                      onChange={(e) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          description: e.target.value.replace(/\s+/g, " ").replace(/^ /, ""),
                        }))
                      }
                      onBlur={() =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          description: prev.description.trim(),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="er-modal-footer">
                  <button
                    type="button"
                    className="er-cancel-btn"
                    onClick={() =>
                      setShowExpenseModal(false)
                    }
                  >
                    {t('cancel', 'Cancel')}
                  </button>

                  <button
                    type="submit"
                    className="er-btn primary"
                  >
                    {editingExpense
                      ? t('updateExpense', 'Update Expense')
                      : t('addExpenseBtn', 'Add Expense')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="er-modal-overlay">
            <div className="er-modal er-small-modal">
              <div className="er-modal-header">
                <div>
                  <h2>{t('addCategory', 'Add Category')}</h2>
                  <p>{t('addNewExpenseCategory', 'Add a new expense category')}</p>
                </div>

                <button
                  type="button"
                  className="er-close-btn"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryError("");
                    setNewCategoryName("");
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="er-category-modal-field">
                <div className="er-form-group">
                  <label>
                    {t('categoryName', 'Category Name')} <span>*</span>
                  </label>

                  <input
                    type="text"
                    placeholder={t('enterCategoryName', 'Enter category name')}
                    value={newCategoryName}
                    onChange={handleCategoryNameChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    autoFocus
                  />

                  {categoryError && (
                    <div className="er-validation-error">
                      {categoryError}
                    </div>
                  )}
                </div>
              </div>

              <div className="er-modal-footer">
                <button
                  type="button"
                  className="er-cancel-btn"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setCategoryError("");
                    setNewCategoryName("");
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>

                <button
                  type="button"
                  className="er-btn primary"
                  onClick={handleAddCategory}
                >
                  {t('addCategoryBtn', 'Add Category')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDetailsModal && selectedExpense && (
          <div className="er-modal-overlay">
            <div className="er-modal er-details-modal">
              <div className="er-modal-header">
                <div>
                  <h2>{t('expenseDetails', 'Expense Details')}</h2>

                  <p>
                    {t('completeInfoExpense', 'Complete information about this expense')}
                  </p>
                </div>

                <button
                  className="er-close-btn"
                  onClick={() =>
                    setShowDetailsModal(false)
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <div className="er-details-grid">
                <div>
                  <span>{t('expenseName', 'Expense Name')}</span>
                  <strong>
                    {t(selectedExpense.name, selectedExpense.name)}
                  </strong>
                </div>

                <div>
                  <span>{t('category', 'Category')}</span>
                  <strong>
                    {t(selectedExpense.category, selectedExpense.category)}
                  </strong>
                </div>

                <div>
                  <span>{t('amount', 'Amount')}</span>
                  <strong>
                    {formatAmount(
                      selectedExpense.amount
                    )}
                  </strong>
                </div>

                <div>
                  <span>{t('date', 'Date')}</span>
                  <strong>
                    {formatDate(selectedExpense.date)}
                  </strong>
                </div>

                <div>
                  <span>{t('branchCode', 'Branch Code')}</span>
                  <strong>{selectedExpense.branchCode ? toDevanagari(selectedExpense.branchCode) : "—"}</strong>
                </div>

                <div>
                  <span>{t('paymentMode', 'Payment Mode')}</span>
                  <strong>
                    {t(selectedExpense.paymentMode, selectedExpense.paymentMode)}
                  </strong>
                </div>

                <div className="full">
                  <span>{t('description', 'Description')}</span>
                  <strong>
                    {selectedExpense.description ? t(selectedExpense.description, selectedExpense.description) : t('noDescriptionAvailable', 'No description available')}
                  </strong>
                </div>
              </div>

              <div className="er-modal-footer">
                <button
                  className="er-cancel-btn"
                  onClick={() =>
                    setShowDetailsModal(false)
                  }
                >
                  {t('close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {appAlert && (
          <div className="er-modal-overlay er-alert-overlay" onClick={() => setAppAlert(null)}>
            {appAlert.type === "success" ? (
              <div
                className="er-simple-success-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="er-simple-success-icon">✓</div>
                <p>{appAlert.message}</p>
              </div>
            ) : (
              <div
                className={`er-modal er-alert-modal ${appAlert.type || "info"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="er-alert-icon">
                  {appAlert.type === "error" ? "!" : "i"}
                </div>
                <div className="er-alert-content">
                  <h2>{appAlert.title}</h2>
                  <p>{appAlert.message}</p>
                </div>
                <button
                  className="er-close-btn"
                  type="button"
                  onClick={() => setAppAlert(null)}
                >
                  <X size={18} />
                </button>
                <div className="er-modal-footer">
                  <button
                    type="button"
                    className="er-btn primary"
                    onClick={() => setAppAlert(null)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
