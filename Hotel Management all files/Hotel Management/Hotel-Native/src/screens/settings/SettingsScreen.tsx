import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, G, Circle, Path, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavbar } from '../../components/AppNavbar';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, AppLanguage } from '../../context/LanguageContext';
import { useBranch } from '../../context/BranchContext';
import {
  downloadAndSharePdf,
  downloadAndShareCsv,
  buildExpenseReportHtml,
  buildGstTaxReportHtml,
  buildPurchaseReportHtml,
} from '../../utils/reportExporter';
import {
  Building2,
  FileText,
  Bell,
  SlidersHorizontal,
  Shield,
  BarChart3,
  Receipt,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Save,
  Globe,
  Clock,
  Check,
  X,
  CreditCard,
  Plus,
  Trash2,
  Database,
  Printer,
  Zap,
  Search,
  Eye,
  Edit2,
  Download,
  Share2,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Calendar,
  Crown,
  CheckCircle,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react-native';
import { localizeGuestName } from '../../locales/nameLocalization';

export type SettingsTabKey =
  | 'profile'
  | 'billing'
  | 'notifications'
  | 'system'
  | 'licence'
  | 'reports'
  | 'gst-reports';

interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  quantity?: string;
  date: string;
  branchCode: string;
  paymentMode: string;
  description?: string;
}

export interface PurchaseReportItem {
  inv: string;
  po: string;
  date: string;
  rawDate: string;
  sup: string;
  gstin: string;
  phone: string;
  address: string;
  cat: string;
  supply: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totTax: number;
  tot: number;
  status: 'Paid' | 'Due';
  mode: string;
  items: Array<{ name: string; qty: string; rate: number; gst: string; tot: number }>;
}

export const PURCHASE_REPORT_DATA: PurchaseReportItem[] = [
  {
    inv: 'INV-678711',
    po: 'PO-1791192640785',
    date: 'Mon, 5 Oct 2026',
    rawDate: '2026-10-05',
    sup: 'Namdev Provisions',
    gstin: '27AABCS1234F1Z5',
    phone: '9822334455',
    address: 'APMC Market Yard, Gultekdi, Pune',
    cat: 'Groceries / Sugar & Rice',
    supply: 'Intra-State',
    taxable: 33000.0,
    cgst: 825.0,
    sgst: 825.0,
    igst: 0.0,
    totTax: 1650.0,
    tot: 34650.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Sugar', qty: '60 Kg', rate: 100, gst: '5%', tot: 6000 },
      { name: 'Rice (Kolam)', qty: '70 Kg', rate: 100, gst: '5%', tot: 7000 },
      { name: 'Basmati Rice', qty: '100 Kg', rate: 100, gst: '5%', tot: 10000 },
      { name: 'Gemini Sunflower Oil', qty: '20 Kg', rate: 100, gst: '5%', tot: 2000 },
      { name: 'Shegdana (Peanuts)', qty: '80 Kg', rate: 100, gst: '5%', tot: 8000 },
    ],
  },
  {
    inv: 'INV-693355',
    po: 'PO-1791278651409',
    date: 'Tue, 6 Oct 2026',
    rawDate: '2026-10-06',
    sup: 'Vivek Chopade Dairy',
    gstin: '27AABCV8901D1Z8',
    phone: '9890112233',
    address: 'Chopade Dairy Farm, Katraj, Pune',
    cat: 'Dairy / Fresh Milk',
    supply: 'Intra-State',
    taxable: 800.0,
    cgst: 20.0,
    sgst: 20.0,
    igst: 0.0,
    totTax: 40.0,
    tot: 840.0,
    status: 'Paid',
    mode: 'Cash',
    items: [
      { name: 'Full Cream Milk', qty: '10 Ltr', rate: 50, gst: '5%', tot: 500 },
      { name: 'Fresh Malai Paneer', qty: '1 Kg', rate: 300, gst: '5%', tot: 300 },
    ],
  },
  {
    inv: 'INV-651336',
    po: 'PO-1791792440192',
    date: 'Mon, 12 Oct 2026',
    rawDate: '2026-10-12',
    sup: 'Namdev Provisions',
    gstin: '27AABCS1234F1Z5',
    phone: '9822334455',
    address: 'APMC Market Yard, Gultekdi, Pune',
    cat: 'Flour & Pulses',
    supply: 'Intra-State',
    taxable: 17000.0,
    cgst: 425.0,
    sgst: 425.0,
    igst: 0.0,
    totTax: 850.0,
    tot: 17850.0,
    status: 'Due',
    mode: 'UPI',
    items: [
      { name: 'Sharbati Wheat Flour', qty: '150 Kg', rate: 60, gst: '5%', tot: 9000 },
      { name: 'Toor Dal Premium', qty: '50 Kg', rate: 100, gst: '5%', tot: 5000 },
      { name: 'Chana Dal', qty: '30 Kg', rate: 100, gst: '5%', tot: 3000 },
    ],
  },
  {
    inv: 'SUP-INV-20261014221620',
    po: 'PO-1791996379658',
    date: 'Wed, 14 Oct 2026',
    rawDate: '2026-10-14',
    sup: 'Rajesh Patil Farms',
    gstin: '27AABCP5678Q1Z2',
    phone: '9765443322',
    address: 'Wagholi Sabji Mandi, Pune',
    cat: 'Fresh Vegetables',
    supply: 'Intra-State',
    taxable: 6150.0,
    cgst: 153.75,
    sgst: 153.75,
    igst: 0.0,
    totTax: 307.5,
    tot: 6457.5,
    status: 'Due',
    mode: 'Card',
    items: [
      { name: 'Nashik Red Onions', qty: '100 Kg', rate: 30, gst: '5%', tot: 3000 },
      { name: 'Potatoes (Batata)', qty: '80 Kg', rate: 25, gst: '5%', tot: 2000 },
      { name: 'Tomatoes', qty: '30 Kg', rate: 25, gst: '5%', tot: 750 },
      { name: 'Ginger & Green Chillies', qty: '8 Kg', rate: 50, gst: '5%', tot: 400 },
    ],
  },
  {
    inv: 'INV-338003',
    po: 'PO-1792146311677',
    date: 'Fri, 16 Oct 2026',
    rawDate: '2026-10-16',
    sup: 'Dot Dot Spices',
    gstin: '27AABCD9988K1Z3',
    phone: '9822001144',
    address: 'Raviwar Peth Masala Market, Pune',
    cat: 'Spices & Condiments',
    supply: 'Intra-State',
    taxable: 11500.0,
    cgst: 287.5,
    sgst: 287.5,
    igst: 0.0,
    totTax: 575.0,
    tot: 12075.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Special Shahi Garam Masala', qty: '10 Kg', rate: 450, gst: '5%', tot: 4500 },
      { name: 'Kashmiri Mirchi Powder', qty: '15 Kg', rate: 300, gst: '5%', tot: 4500 },
      { name: 'Turmeric Powder (Haldi)', qty: '10 Kg', rate: 150, gst: '5%', tot: 1500 },
      { name: 'Jeera (Cumin Seeds)', qty: '5 Kg', rate: 200, gst: '5%', tot: 1000 },
    ],
  },
  {
    inv: 'INV-406026',
    po: 'PO-1792408991203',
    date: 'Mon, 19 Oct 2026',
    rawDate: '2026-10-19',
    sup: 'Namdev Provisions',
    gstin: '27AABCS1234F1Z5',
    phone: '9822334455',
    address: 'APMC Market Yard, Gultekdi, Pune',
    cat: 'Cleaning Supplies',
    supply: 'Intra-State',
    taxable: 500.0,
    cgst: 12.5,
    sgst: 12.5,
    igst: 0.0,
    totTax: 25.0,
    tot: 525.0,
    status: 'Paid',
    mode: 'Cash',
    items: [
      { name: 'Commercial Dishwash Liquid', qty: '5 Ltr', rate: 70, gst: '5%', tot: 350 },
      { name: 'Kitchen Surface Sanitizer', qty: '3 Ltr', rate: 50, gst: '5%', tot: 150 },
    ],
  },
  {
    inv: 'INV-548336',
    po: 'PO-1792837719201',
    date: 'Sat, 24 Oct 2026',
    rawDate: '2026-10-24',
    sup: 'Rajesh Patil Farms',
    gstin: '27AABCP5678Q1Z2',
    phone: '9765443322',
    address: 'Wagholi Sabji Mandi, Pune',
    cat: 'Poultry & Fresh Produce',
    supply: 'Intra-State',
    taxable: 25000.0,
    cgst: 625.0,
    sgst: 625.0,
    igst: 0.0,
    totTax: 1250.0,
    tot: 26250.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Fresh Tender Chicken', qty: '80 Kg', rate: 220, gst: '5%', tot: 17600 },
      { name: 'Fresh Mutton Cuts', qty: '10 Kg', rate: 650, gst: '5%', tot: 6500 },
      { name: 'Exotic Salad Greens', qty: '15 Kg', rate: 60, gst: '5%', tot: 900 },
    ],
  },
  {
    inv: 'INV-025015',
    po: 'PO-1792839101112',
    date: 'Sat, 24 Oct 2026',
    rawDate: '2026-10-24',
    sup: 'Pavan Chaudhari',
    gstin: '27AABCC3344M1Z1',
    phone: '9850667788',
    address: 'Chaudhari Beverage Agency, Swargate, Pune',
    cat: 'Beverages & Soft Drinks',
    supply: 'Intra-State',
    taxable: 200.0,
    cgst: 5.0,
    sgst: 5.0,
    igst: 0.0,
    totTax: 10.0,
    tot: 210.0,
    status: 'Paid',
    mode: 'Cash',
    items: [
      { name: 'Packaged Mineral Water (1 Ltr x 12)', qty: '5 Crates', rate: 30, gst: '5%', tot: 150 },
      { name: 'Soda Bottles (500ml x 24)', qty: '1 Crate', rate: 50, gst: '5%', tot: 50 },
    ],
  },
  {
    inv: 'PI-1792839760266',
    po: 'PO-1792839760266',
    date: 'Sat, 24 Oct 2026',
    rawDate: '2026-10-24',
    sup: 'Namdev Provisions',
    gstin: '27AABCS1234F1Z5',
    phone: '9822334455',
    address: 'APMC Market Yard, Gultekdi, Pune',
    cat: 'Bakery & Breads',
    supply: 'Intra-State',
    taxable: 600.0,
    cgst: 15.0,
    sgst: 15.0,
    igst: 0.0,
    totTax: 30.0,
    tot: 630.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Fresh Burger Buns (Pack of 6)', qty: '20 Pkts', rate: 15, gst: '5%', tot: 300 },
      { name: 'Ladi Pav (Pack of 12)', qty: '20 Pkts', rate: 15, gst: '5%', tot: 300 },
    ],
  },
];

export const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktopLayout = width >= 860;

  const { user, logout } = useAuth();
  const { language, setLanguage, t, formatDate, formatTime, toDevanagari, translateStatus } = useLanguage();
  const { activeBranch } = useBranch();

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('gst-reports'); // default to GST reports per user focus

  // Banner & License State
  const [daysRemaining, setDaysRemaining] = useState<number>(28);
  const [activePlanName, setActivePlanName] = useState<string>('Trial');
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [lastSavedMessage, setLastSavedMessage] = useState<string>('');

  // 1. Hotel Profile Form State
  const [hotelName, setHotelName] = useState<string>('Royal Palace Hotel');
  const [ownerName, setOwnerName] = useState<string>('Rahul Patil');
  const [email, setEmail] = useState<string>('admin@royalpalace.com');
  const [mobile, setMobile] = useState<string>('9876543210');
  const [alternateMobile, setAlternateMobile] = useState<string>('');
  const [city, setCity] = useState<string>('Pune');
  const [state, setState] = useState<string>('Maharashtra');
  const [pincode, setPincode] = useState<string>('411004');
  const [address, setAddress] = useState<string>('Hotel Premises, MG Road, Pune');
  const [currency, setCurrency] = useState<string>('INR');

  // 2. Billing Settings State (Screenshot 2: 3 toggles)
  const [enableTax, setEnableTax] = useState<boolean>(true);
  const [enableDiscount, setEnableDiscount] = useState<boolean>(true);
  const [enableRoundOff, setEnableRoundOff] = useState<boolean>(true);

  // 3. Notification Settings State (Screenshot 1: 6 toggles)
  const [notifPaymentReceived, setNotifPaymentReceived] = useState<boolean>(true);
  const [notifPaymentFailed, setNotifPaymentFailed] = useState<boolean>(true);
  const [notifLowInventory, setNotifLowInventory] = useState<boolean>(true);
  const [notifMaintenanceAlert, setNotifMaintenanceAlert] = useState<boolean>(true);
  const [notifEmail, setNotifEmail] = useState<boolean>(true);
  const [notifSms, setNotifSms] = useState<boolean>(false);

  // 4. System Preferences State (Screenshot 3: 4 dropdowns + toggles)
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<string>('12-hour');
  const [systemLang, setSystemLang] = useState<string>('English');
  const [backupFrequency, setBackupFrequency] = useState<string>('Daily');
  const [automaticBackup, setAutomaticBackup] = useState<boolean>(true);
  const [overviewSectionsVisible, setOverviewSectionsVisible] = useState<boolean>(true);

  // Dropdown Picker Modals
  const [pickerModalType, setPickerModalType] = useState<string | null>(null);

  // Date Range Filter State for GST Reports (Screenshots 1 to 5)
  const [gstDateFrom, setGstDateFrom] = useState<string>('01-10-2026');
  const [gstDateTo, setGstDateTo] = useState<string>('25-10-2026');
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [activeDatePickingField, setActiveDatePickingField] = useState<'from' | 'to'>('from');

  // 5. Reports & KPI State
  const [reportSubTab, setReportSubTab] = useState<
    'expenses' | 'reports' | 'charts' | 'gst-scale' | 'purchase'
  >('expenses');
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Initial Expenses matching Screenshot 4
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'EXP-1',
      name: 'Electricity',
      category: 'Electricity',
      amount: 15000,
      date: '6 Oct 2026',
      branchCode: 'BR001',
      paymentMode: 'Cash',
      description: 'Main kitchen electricity power charges',
    },
    {
      id: 'EXP-2',
      name: 'travelling',
      category: 'Transportation',
      amount: 500,
      date: '7 Oct 2026',
      branchCode: 'BR002',
      paymentMode: 'Cash',
      description: 'Staff delivery cab expense',
    },
    {
      id: 'EXP-3',
      name: 'Pune Kitchen Groceries',
      category: 'Food / Raw Material',
      amount: 4500,
      date: '7 Oct 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Vegetables, spices and dairy stock',
    },
  ]);

  // Add Expense Form Inputs (Screenshot 1 matching)
  const [expName, setExpName] = useState<string>('');
  const [expCategory, setExpCategory] = useState<string>('Select category');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expQuantity, setExpQuantity] = useState<string>('');
  const [expDate, setExpDate] = useState<string>('26 Oct 2026');
  const [expBranch, setExpBranch] = useState<string>('Main Branch (MB-1)');
  const [expMode, setExpMode] = useState<string>('Select Payment Mode');
  const [expDescription, setExpDescription] = useState<string>('');

  // Dropdown Pickers for Add Expense Modal
  const [showExpCatPicker, setShowExpCatPicker] = useState<boolean>(false);
  const [showExpBranchPicker, setShowExpBranchPicker] = useState<boolean>(false);
  const [showExpModePicker, setShowExpModePicker] = useState<boolean>(false);
  const [showExpDatePicker, setShowExpDatePicker] = useState<boolean>(false);

  // Sub-report inside Report & KPI -> Reports (Screenshot 2)
  const [kpiSelectedReport, setKpiSelectedReport] = useState<
    'sales' | 'expense' | 'order' | 'menu' | 'branch'
  >('branch');
  const [kpiReportDateFilter, setKpiReportDateFilter] = useState<'today' | 'week' | 'month'>('month');

  // 6. GST Settings & Reports State (Screenshots 1 to 5)
  const [gstSubTab, setGstSubTab] = useState<
    | 'gst-settings'
    | 'sales-report'
    | 'purchase-report'
    | 'gstr-1'
    | 'gstr-2'
    | 'gstr-3b'
    | 'hsn-summary'
  >('sales-report'); // Default to Sales Report (Screenshot 1)

  // 12 GST Configuration Fields
  const [gstEnabled, setGstEnabled] = useState<string>('true');
  const [gstin, setGstin] = useState<string>('27AAAAA1111A1');
  const [businessState, setBusinessState] = useState<string>('Maharashtra');
  const [registrationType, setRegistrationType] = useState<string>('Regular');
  const [foodSlabRate, setFoodSlabRate] = useState<string>('5%');
  const [cgstRate, setCgstRate] = useState<string>('2.5');
  const [sgstRate, setSgstRate] = useState<string>('2.5');
  const [igstRate, setIgstRate] = useState<string>('5');
  const [hsnSac, setHsnSac] = useState<string>('8863');
  const [taxInclusiveExclusive, setTaxInclusiveExclusive] = useState<string>('Inclusive');
  const [returnPeriod, setReturnPeriod] = useState<string>('Monthly');
  const [financialYear, setFinancialYear] = useState<string>('2024-25');

  // Purchase Report Interactive States
  const [viewingPurchaseInvoice, setViewingPurchaseInvoice] = useState<PurchaseReportItem | null>(null);
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<'ALL' | 'PAID' | 'DUE'>('ALL');
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState<string>('');

  const filteredPurchaseInvoices = useMemo(() => {
    return PURCHASE_REPORT_DATA.filter((p) => {
      if (purchaseStatusFilter !== 'ALL' && p.status.toUpperCase() !== purchaseStatusFilter) {
        return false;
      }
      if (purchaseSearchQuery.trim()) {
        const q = purchaseSearchQuery.toLowerCase();
        const matchInv = p.inv.toLowerCase().includes(q);
        const matchSup = p.sup.toLowerCase().includes(q);
        const matchCat = p.cat.toLowerCase().includes(q);
        const matchGst = p.gstin.toLowerCase().includes(q);
        if (!matchInv && !matchSup && !matchCat && !matchGst) return false;
      }
      return true;
    });
  }, [purchaseStatusFilter, purchaseSearchQuery]);

  // Load Saved Settings on Mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const savedNotifs = await AsyncStorage.getItem('@hotel_notification_settings');
        if (savedNotifs) {
          const n = JSON.parse(savedNotifs);
          if (n.paymentReceived !== undefined) setNotifPaymentReceived(n.paymentReceived);
          if (n.paymentFailed !== undefined) setNotifPaymentFailed(n.paymentFailed);
          if (n.lowInventory !== undefined) setNotifLowInventory(n.lowInventory);
          if (n.maintenanceAlert !== undefined) setNotifMaintenanceAlert(n.maintenanceAlert);
          if (n.email !== undefined) setNotifEmail(n.email);
          if (n.sms !== undefined) setNotifSms(n.sms);
        }

        const savedBilling = await AsyncStorage.getItem('@hotel_billing_settings');
        if (savedBilling) {
          const b = JSON.parse(savedBilling);
          if (b.enableTax !== undefined) setEnableTax(b.enableTax);
          if (b.enableDiscount !== undefined) setEnableDiscount(b.enableDiscount);
          if (b.enableRoundOff !== undefined) setEnableRoundOff(b.enableRoundOff);
        }

        const savedSystem = await AsyncStorage.getItem('@hotel_system_settings');
        if (savedSystem) {
          const s = JSON.parse(savedSystem);
          if (s.dateFormat) setDateFormat(s.dateFormat);
          if (s.timeFormat) setTimeFormat(s.timeFormat);
          if (s.backupFrequency) setBackupFrequency(s.backupFrequency);
          if (s.automaticBackup !== undefined) setAutomaticBackup(s.automaticBackup);
          if (s.overviewSectionsVisible !== undefined)
            setOverviewSectionsVisible(s.overviewSectionsVisible);
        }

        const savedGst = await AsyncStorage.getItem('@hotel_gst_settings');
        if (savedGst) {
          const g = JSON.parse(savedGst);
          if (g.gstEnabled) setGstEnabled(g.gstEnabled);
          if (g.gstin) setGstin(g.gstin);
          if (g.businessState) setBusinessState(g.businessState);
          if (g.registrationType) setRegistrationType(g.registrationType);
          if (g.foodSlabRate) setFoodSlabRate(g.foodSlabRate);
          if (g.cgstRate) setCgstRate(g.cgstRate);
          if (g.sgstRate) setSgstRate(g.sgstRate);
          if (g.igstRate) setIgstRate(g.igstRate);
          if (g.hsnSac) setHsnSac(g.hsnSac);
          if (g.taxInclusiveExclusive) setTaxInclusiveExclusive(g.taxInclusiveExclusive);
          if (g.returnPeriod) setReturnPeriod(g.returnPeriod);
          if (g.financialYear) setFinancialYear(g.financialYear);
        }

        const savedPlan = await AsyncStorage.getItem('@hotel_license_plan');
        if (savedPlan) {
          const p = JSON.parse(savedPlan);
          if (p.planName) setActivePlanName(p.planName);
          if (p.daysRemaining !== undefined) setDaysRemaining(p.daysRemaining);
        }

        const savedExp = await AsyncStorage.getItem('@hotel_expenses_list');
        if (savedExp) {
          const parsed = JSON.parse(savedExp);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExpenses(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };
    loadSaved();
  }, []);

  // Translators for dummy/mocked data displayed in Settings
  const translateItemName = (name: string): string => {
    if (language === 'en') return name;
    const n = (name || '').trim();
    const dict: Record<string, { mr: string; hi: string }> = {
      'Sugar': { mr: 'साखर', hi: 'चीनी' },
      'Rice (Kolam)': { mr: 'कोलम तांदूळ', hi: 'कोलम चावल' },
      'Basmati Rice': { mr: 'बासमती तांदूळ', hi: 'बासमती चावल' },
      'Gemini Sunflower Oil': { mr: 'जेमिनी सूर्यफूल तेल', hi: 'जेमिनी सूरजमुखी तेल' },
      'Shegdana (Peanuts)': { mr: 'शेंगदाणे', hi: 'मूंगफली' },
      'Full Cream Milk': { mr: 'ताजे म्हशीचे दूध', hi: 'फुल क्रीम दूध' },
      'Fresh Malai Paneer': { mr: 'ताजे मलाई पनीर', hi: 'ताजा मलाई पनीर' },
      'Sharbati Wheat Flour': { mr: 'शरबती गव्हाचे पीठ', hi: 'शरबती गेहूं का आटा' },
      'Toor Dal Premium': { mr: 'प्रीमियम तूर डाळ', hi: 'प्रीमियम तूर दाल' },
      'Chana Dal': { mr: 'चना डाळ', hi: 'चना दाल' },
      'Nashik Red Onions': { mr: 'नाशिक लाल कांदे', hi: 'नासिक लाल प्याज' },
      'Potatoes (Batata)': { mr: 'बटाटे', hi: 'आलू' },
      'Tomatoes': { mr: 'टोमॅटो', hi: 'टमाटर' },
      'Ginger & Green Chillies': { mr: 'आले आणि हिरवी मिरची', hi: 'अदरक और हरी मिर्च' },
      'Special Shahi Garam Masala': { mr: 'शाही गरम मसाला', hi: 'शाही गरम मसाला' },
      'Kashmiri Mirchi Powder': { mr: 'काश्मिरी मिरची पावडर', hi: 'कश्मीरी मिर्च पाउडर' },
      'Turmeric Powder (Haldi)': { mr: 'हळद पावडर', hi: 'हल्दी पाउडर' },
      'Jeera (Cumin Seeds)': { mr: 'जिरे', hi: 'जीरा' },
      'Commercial Dishwash Liquid': { mr: 'डिशवॉश लिक्विड', hi: 'डिशवॉश लिक्विड' },
      'Kitchen Surface Sanitizer': { mr: 'किचन सॅनिटायझर', hi: 'किचन सैनिटाइजर' },
      'Fresh Tender Chicken': { mr: 'ताजे चिकन', hi: 'ताजा चिकन' },
      'Fresh Mutton Cuts': { mr: 'ताजे मटन', hi: 'ताजा मटन' },
      'Exotic Salad Greens': { mr: 'ताजा कोशिंबीर / सॅलड', hi: 'ताजा सलाद पत्ता' },
      'Packaged Mineral Water (1 Ltr x 12)': { mr: 'मिनरल वॉटर बॉटल्स', hi: 'मिनरल वाटर बोतल' },
      'Soda Bottles (500ml x 24)': { mr: 'सोडा बॉटल्स', hi: 'सोडा बोतल' },
      'Fresh Burger Buns (Pack of 6)': { mr: 'बर्गर बन्स', hi: 'बर्गर बन' },
      'Ladi Pav (Pack of 12)': { mr: 'लादी पाव', hi: 'लादी पाव' },
      'Veg Spring Rolls': { mr: 'व्हेज स्प्रिंग रोल्स', hi: 'वेज स्प्रिंग रोल्स' },
      'Paneer Butter Masala': { mr: 'पनीर बटर मसाला', hi: 'पनीर बटर मसाला' },
      'Chicken Biryani (Dum)': { mr: 'चिकन बिर्याणी (दम)', hi: 'चिकन बिरयानी (दम)' },
      'Dal Tadka Special': { mr: 'दाल तडका स्पेशल', hi: 'दाल तड़का स्पेशल' },
      'Tandoori Butter Roti': { mr: 'तंदुरी बटर रोटी', hi: 'तंदूरी बटर रोटी' },
      'Cold Drinks & Beverages': { mr: 'कोल्ड ड्रिंक्स आणि शीतपेये', hi: 'कोल्ड ड्रिंक्स और पेय' },
    };
    return dict[n]?.[language] || n;
  };

  const translateSupplierName = (name: string): string => {
    if (language === 'en') return name;
    const n = (name || '').trim();
    const dict: Record<string, { mr: string; hi: string }> = {
      'Namdev Provisions': { mr: 'नामदेव प्रोव्हिजन्स', hi: 'नामदेव प्रोविजन्स' },
      'Namdev': { mr: 'नामदेव', hi: 'नामदेव' },
      'Vivek Chopade Dairy': { mr: 'विवेक चोपडे डेअरी', hi: 'विवेक चोपड़े डेयरी' },
      'Vivek Chopade': { mr: 'विवेक चोपडे', hi: 'विवेक चोपड़े' },
      'Rajesh Patil Farms': { mr: 'राजेश पाटील फार्म्स', hi: 'राजेश पाटिल फार्म्स' },
      'Rajesh Patil': { mr: 'राजेश पाटील', hi: 'राजेश पाटिल' },
      'Dot Dot Spices': { mr: 'डॉट डॉट मसाले', hi: 'डॉट डॉट मसाले' },
      'Dot Dot': { mr: 'डॉट डॉट', hi: 'डॉट डॉट' },
      'Pavan Chaudhari': { mr: 'पवन चौधरी', hi: 'पवन चौधरी' },
    };
    return dict[n]?.[language] || n;
  };

  const translateCustomerName = (name: string): string => {
    if (!name) return '';
    if (language === 'en') return name;
    const clean = name.trim();
    const custMap: Record<string, { mr: string; hi: string }> = {
      'prasad ghongte': { mr: 'प्रसाद घोंगटे', hi: 'प्रसाद घोंगटे' },
      'sachin tendulkar': { mr: 'सचिन तेंडुलकर', hi: 'सचिन तेंदुलकर' },
      'namdev': { mr: 'नामदेव', hi: 'नामदेव' },
      'prajwal': { mr: 'प्रज्वल', hi: 'प्रज्वल' },
      'guest': { mr: 'अतिथी', hi: 'अतिथि' },
      'shubham chaudhari': { mr: 'शुभम चौधरी', hi: 'शुभम चौधरी' },
      'pavan chaudhari': { mr: 'पवन चौधरी', hi: 'पवन चौधरी' },
      'vivek chopade': { mr: 'विवेक चोपडे', hi: 'विवेक चोपड़े' },
      'rajesh patil': { mr: 'राजेश पाटील', hi: 'राजेश पाटिल' },
      'dot dot': { mr: 'डॉट डॉट', hi: 'डॉट डॉट' },
    };
    const key = clean.toLowerCase();
    if (custMap[key]) return custMap[key][language];
    const loc = localizeGuestName(clean);
    return loc || clean;
  };

  const translateDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    if (language === 'en') return dateStr;

    let res = dateStr;
    const days: Record<string, { mr: string; hi: string }> = {
      Sunday: { mr: 'रविवार', hi: 'रविवार' },
      Monday: { mr: 'सोमवार', hi: 'सोमवार' },
      Tuesday: { mr: 'मंगळवार', hi: 'मंगलवार' },
      Wednesday: { mr: 'बुधवार', hi: 'बुधवार' },
      Thursday: { mr: 'गुरुवार', hi: 'गुरुवार' },
      Friday: { mr: 'शुक्रवार', hi: 'शुक्रवार' },
      Saturday: { mr: 'शनिवार', hi: 'शनिवार' },
      Sun: { mr: 'रवि', hi: 'रवि' },
      Mon: { mr: 'सोम', hi: 'सोम' },
      Tue: { mr: 'मंगळ', hi: 'मंगल' },
      Wed: { mr: 'बुध', hi: 'बुध' },
      Thu: { mr: 'गुरु', hi: 'गुरु' },
      Fri: { mr: 'शुक्र', hi: 'शुक्र' },
      Sat: { mr: 'शनि', hi: 'शनि' },
    };

    const months: Record<string, { mr: string; hi: string }> = {
      January: { mr: 'जानेवारी', hi: 'जनवरी' },
      February: { mr: 'फेब्रुवारी', hi: 'फरवरी' },
      March: { mr: 'मार्च', hi: 'मार्च' },
      April: { mr: 'एप्रिल', hi: 'अप्रैल' },
      May: { mr: 'मे', hi: 'मई' },
      June: { mr: 'जून', hi: 'जून' },
      July: { mr: 'जुलै', hi: 'जुलाई' },
      August: { mr: 'ऑगस्ट', hi: 'अगस्त' },
      September: { mr: 'सप्टेंबर', hi: 'सितंबर' },
      October: { mr: 'ऑक्टोबर', hi: 'अक्टूबर' },
      November: { mr: 'नोव्हेंबर', hi: 'नवंबर' },
      December: { mr: 'डिसेंबर', hi: 'दिसंबर' },
      Jan: { mr: 'जाने', hi: 'जन' },
      Feb: { mr: 'फेब्रु', hi: 'फर' },
      Mar: { mr: 'मार्च', hi: 'मार्च' },
      Apr: { mr: 'एप्रि', hi: 'अप्रैल' },
      Jun: { mr: 'जून', hi: 'जून' },
      Jul: { mr: 'जुलै', hi: 'जुलाई' },
      Aug: { mr: 'ऑग', hi: 'अग' },
      Sep: { mr: 'सप्टें', hi: 'सितं' },
      Oct: { mr: 'ऑक्टो', hi: 'अक्टू' },
      Nov: { mr: 'नोव्हे', hi: 'नव' },
      Dec: { mr: 'डिसें', hi: 'दिस' },
    };

    for (const [k, v] of Object.entries(days)) {
      res = res.replace(new RegExp(`\\b${k}\\b`, 'g'), v[language]);
    }
    for (const [k, v] of Object.entries(months)) {
      res = res.replace(new RegExp(`\\b${k}\\b`, 'g'), v[language]);
    }
    return toDevanagari(res);
  };

  const translateCategoryName = (cat: string): string => {
    if (language === 'en') return cat;
    const c = (cat || '').trim();
    const dict: Record<string, { mr: string; hi: string }> = {
      'Groceries / Sugar & Rice': { mr: 'किराणा / साखर व तांदूळ', hi: 'किराना / चीनी व चावल' },
      'Dairy / Fresh Milk': { mr: 'डेअरी / ताजे दूध', hi: 'डेयरी / ताजा दूध' },
      'Flour & Pulses': { mr: 'पीठ आणि डाळी', hi: 'आटा और दालें' },
      'Fresh Vegetables': { mr: 'ताज्या भाज्या', hi: 'ताजी सब्जियां' },
      'Spices & Condiments': { mr: 'मसाले आणि जिन्नस', hi: 'मसाले और सामग्री' },
      'Cleaning Supplies': { mr: 'स्वच्छता साहित्य', hi: 'सफाई सामग्री' },
      'Poultry & Fresh Produce': { mr: 'पोल्ट्री आणि ताजी उत्पादने', hi: 'पोल्ट्री और ताजे उत्पाद' },
      'Beverages & Soft Drinks': { mr: 'पेये आणि शीतपेये', hi: 'पेय और शीतल पेय' },
      'Bakery & Breads': { mr: 'बेकरी आणि पाव/ब्रेड', hi: 'बेकरी और ब्रेड' },
      'Electricity': { mr: 'वीज बिल', hi: 'बिजली बिल' },
      'Transportation': { mr: 'वाहतूक खर्च', hi: 'परिवहन खर्च' },
      'Food / Raw Material': { mr: 'अन्न / कच्चा माल', hi: 'खाद्य / कच्चा माल' },
      'Repairs & Maintenance': { mr: 'दुरुस्ती आणि देखभाल', hi: 'मरम्मत और रखरखाव' },
      'Staff Welfare': { mr: 'कर्मचारी कल्याण', hi: 'कर्मचारी कल्याण' },
      'Rent': { mr: 'भाडे', hi: 'किराया' },
      'Marketing': { mr: 'मार्केटिंग व जाहिरात', hi: 'मार्केटिंग व विज्ञापन' },
      'Other': { mr: 'इतर खर्च', hi: 'अन्य खर्च' },
      'Electricity & Utilities': { mr: 'वीज आणि उपयुक्तता', hi: 'बिजली और उपयोगिताएं' },
      'Cleaning & Maintenance': { mr: 'स्वच्छता आणि देखभाल', hi: 'सफाई और रखरखाव' },
      'Transportation & Cab': { mr: 'वाहतूक आणि कॅब', hi: 'परिवहन और कैब' },
      'Gas Cylinder Refill': { mr: 'गॅस सिलिंडर रिफिल', hi: 'गैस सिलेंडर रीफिल' },
      'Kitchen Groceries / Raw Material': { mr: 'किचन किराणा / कच्चा माल', hi: 'रसोई किराना / कच्चा माल' },
      'Gas Cylinders': { mr: 'गॅस सिलिंडर', hi: 'गैस सिलेंडर' },
      'Staff Delivery Cab / Travelling': { mr: 'कर्मचारी प्रवास व कॅब', hi: 'कर्मचारी यात्रा व कैब' },
      'General': { mr: 'सर्वसाधारण', hi: 'सामान्य' },
      'Main Course': { mr: 'मेन कोर्स', hi: 'मेन कोर्स' },
      'Rice & Biryani': { mr: 'भात आणि बिर्याणी', hi: 'चावल और बिरयानी' },
      'Dal & Lentils': { mr: 'डाळी आणि उसळ', hi: 'दालें और दाल' },
      'Breads': { mr: 'रोटी आणि नान', hi: 'रोटी और नान' },
      'Beverages': { mr: 'शीतपेये व सरबत', hi: 'पेय और शरबत' },
    };
    return dict[c]?.[language] || c;
  };

  const translateExpenseName = (name: string): string => {
    if (language === 'en') return name;
    const n = (name || '').trim();
    const dict: Record<string, { mr: string; hi: string }> = {
      'Electricity': { mr: 'वीज बिल', hi: 'बिजली बिल' },
      'travelling': { mr: 'प्रवास खर्च', hi: 'यात्रा खर्च' },
      'Travelling': { mr: 'प्रवास खर्च', hi: 'यात्रा खर्च' },
      'Pune Kitchen Groceries': { mr: 'पुणे किचन किराणा सामान', hi: 'पुणे किचन किराना सामान' },
    };
    return dict[n]?.[language] || n;
  };

  // Save Notifications
  const handleSaveNotifications = async () => {
    try {
      const data = {
        paymentReceived: notifPaymentReceived,
        paymentFailed: notifPaymentFailed,
        lowInventory: notifLowInventory,
        maintenanceAlert: notifMaintenanceAlert,
        email: notifEmail,
        sms: notifSms,
      };
      await AsyncStorage.setItem('@hotel_notification_settings', JSON.stringify(data));
      setLastSavedMessage('Just now');
      Alert.alert(t('saved', 'Settings Saved'), t('settingsSaved', 'Notification settings updated successfully.'));
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save notifications.'));
    }
  };

  const handleResetNotifications = () => {
    setNotifPaymentReceived(true);
    setNotifPaymentFailed(true);
    setNotifLowInventory(true);
    setNotifMaintenanceAlert(true);
    setNotifEmail(true);
    setNotifSms(false);
    Alert.alert(t('reset', 'Reset'), t('resetToDefaults', 'Notification settings reset to defaults.'));
  };

  // Save Billing
  const handleSaveBilling = async () => {
    try {
      const data = {
        enableTax,
        enableDiscount,
        enableRoundOff,
      };
      await AsyncStorage.setItem('@hotel_billing_settings', JSON.stringify(data));
      setLastSavedMessage('Just now');
      Alert.alert(t('saved', 'Settings Saved'), t('settingsSaved', 'Billing settings updated successfully.'));
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save billing settings.'));
    }
  };

  const handleResetBilling = () => {
    setEnableTax(true);
    setEnableDiscount(true);
    setEnableRoundOff(true);
    Alert.alert(t('reset', 'Reset'), t('resetToDefaults', 'Billing settings reset to defaults.'));
  };

  // Save System
  const handleSaveSystem = async () => {
    try {
      const data = {
        dateFormat,
        timeFormat,
        backupFrequency,
        automaticBackup,
        overviewSectionsVisible,
      };
      await AsyncStorage.setItem('@hotel_system_settings', JSON.stringify(data));
      setLastSavedMessage('Just now');
      Alert.alert(t('saved', 'Settings Saved'), t('settingsSaved', 'System preferences saved and synced.'));
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save system settings.'));
    }
  };

  const handleResetSystem = () => {
    setDateFormat('DD/MM/YYYY');
    setTimeFormat('12-hour');
    setBackupFrequency('Daily');
    setAutomaticBackup(true);
    setOverviewSectionsVisible(true);
    Alert.alert(t('reset', 'Reset'), t('resetToDefaults', 'System preferences reset to defaults.'));
  };

  // Save GST
  const handleSaveGst = async () => {
    try {
      const data = {
        gstEnabled,
        gstin,
        businessState,
        registrationType,
        foodSlabRate,
        cgstRate,
        sgstRate,
        igstRate,
        hsnSac,
        taxInclusiveExclusive,
        returnPeriod,
        financialYear,
      };
      await AsyncStorage.setItem('@hotel_gst_settings', JSON.stringify(data));
      setLastSavedMessage('Just now');
      Alert.alert(t('gstSaved', 'GST Configuration Saved'), t('gstSavedDesc', 'GST settings and tax slabs updated successfully.'));
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save GST configuration.'));
    }
  };

  // Renew License Handler
  const handleRenewLicense = async () => {
    setDaysRemaining(28);
    const planData = { planName: activePlanName, daysRemaining: 28 };
    await AsyncStorage.setItem('@hotel_license_plan', JSON.stringify(planData));
    Alert.alert(t('licenseRenewed', 'License Renewed'), t('licenseRenewedDesc', '28 days validity renewed successfully.'));
  };

  // Activate Plan
  const handleActivatePlan = async (plan: string) => {
    setActivePlanName(plan);
    setDaysRemaining(365);
    const planData = { planName: plan, daysRemaining: 365 };
    await AsyncStorage.setItem('@hotel_license_plan', JSON.stringify(planData));
    setShowUpgradeModal(false);
    Alert.alert(t('planActivated', 'Plan Activated'), `${plan} ${t('planActivatedDesc', 'activated for 365 days! All features unlocked.')}`);
  };

  // Add / Edit Expense Handlers (Screenshot 1 matching)
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpName('');
    setExpCategory('Select category');
    setExpAmount('');
    setExpQuantity('');
    setExpDate('26 Oct 2026');
    setExpBranch('Main Branch (MB-1)');
    setExpMode('Select Payment Mode');
    setExpDescription('');
    setShowAddExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expName.trim() || !expAmount.trim()) {
      Alert.alert(t('validationError', 'Validation Error'), t('enterAmount', 'Please enter expense name and amount.'));
      return;
    }

    const numAmount = parseFloat(expAmount) || 0;
    const finalCat = expCategory === 'Select category' ? 'Food / Raw Material' : expCategory;
    const finalMode = expMode === 'Select Payment Mode' ? 'Cash' : expMode;
    let updated: ExpenseItem[];

    if (editingExpense) {
      updated = expenses.map((e) =>
        e.id === editingExpense.id
          ? {
              ...e,
              name: expName,
              category: finalCat,
              amount: numAmount,
              quantity: expQuantity || '1',
              date: expDate,
              branchCode: expBranch,
              paymentMode: finalMode,
              description: expDescription,
            }
          : e
      );
    } else {
      const newItem: ExpenseItem = {
        id: `EXP-${Date.now().toString().slice(-4)}`,
        name: expName,
        category: finalCat,
        amount: numAmount,
        quantity: expQuantity || '1',
        date: expDate,
        branchCode: expBranch,
        paymentMode: finalMode,
        description: expDescription,
      };
      updated = [newItem, ...expenses];
    }

    setExpenses(updated);
    setShowAddExpenseModal(false);
    try {
      await AsyncStorage.setItem('@hotel_expenses_list', JSON.stringify(updated));
    } catch {
      // ignore
    }
    Alert.alert(t('expenseSaved', 'Expense Saved'), t('expenseSavedDesc', 'Expense details recorded successfully.'));
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert(t('deleteExpense', 'Delete Expense'), t('confirmDeleteExpense', 'Are you sure you want to remove this expense record?'), [
      { text: t('cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('delete', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          const filtered = expenses.filter((e) => e.id !== id);
          setExpenses(filtered);
          try {
            await AsyncStorage.setItem('@hotel_expenses_list', JSON.stringify(filtered));
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return expenses;
    const q = expenseSearch.toLowerCase();
    return expenses.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.branchCode.toLowerCase().includes(q) ||
        e.paymentMode.toLowerCase().includes(q)
    );
  }, [expenses, expenseSearch]);

  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  // Dynamic Settings Navigation Label & Description Getters (100% reactive to language)
  const getNavItemLabel = (key: SettingsTabKey): string => {
    switch (key) {
      case 'profile': return t('hotelProfile', 'Hotel Profile');
      case 'billing': return t('billing', 'Billing');
      case 'notifications': return t('notifications', 'Notifications');
      case 'system': return t('systemPreferences', 'System Preferences');
      case 'licence': return t('licenceAndSubscription', 'Licence & Subscription');
      case 'reports': return t('reportAndKpi', 'Report & KPI');
      case 'gst-reports': return t('gstSettingsAndReports', 'GST Settings & Reports');
    }
  };

  const getNavItemDesc = (key: SettingsTabKey): string => {
    switch (key) {
      case 'profile': return t('businessInformation', 'Business Information');
      case 'billing': return t('invoicePreferences', 'Invoice preferences');
      case 'notifications': return t('alertsAndNotifications', 'Alerts & notifications');
      case 'system': return t('systemAndBackup', 'System & backup');
      case 'licence': return t('enterpriseLicenceTrial', 'Enterprise licence & 28-day trial');
      case 'reports': return t('businessAnalyticsReports', 'Business analytics & reports');
      case 'gst-reports': return t('gstConfigTaxReturnReports', 'GST configuration & tax return reports');
    }
  };

  const filteredNavItems = useMemo(() => {
    const rawItems: {
      key: SettingsTabKey;
      label: string;
      desc: string;
      icon: any;
    }[] = [
      { key: 'profile', label: getNavItemLabel('profile'), desc: getNavItemDesc('profile'), icon: Building2 },
      { key: 'billing', label: getNavItemLabel('billing'), desc: getNavItemDesc('billing'), icon: Receipt },
      { key: 'notifications', label: getNavItemLabel('notifications'), desc: getNavItemDesc('notifications'), icon: Bell },
      { key: 'system', label: getNavItemLabel('system'), desc: getNavItemDesc('system'), icon: SlidersHorizontal },
      { key: 'licence', label: getNavItemLabel('licence'), desc: getNavItemDesc('licence'), icon: Shield },
      { key: 'reports', label: getNavItemLabel('reports'), desc: getNavItemDesc('reports'), icon: BarChart3 },
      { key: 'gst-reports', label: getNavItemLabel('gst-reports'), desc: getNavItemDesc('gst-reports'), icon: FileText },
    ];
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase();
    return rawItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    );
  }, [searchQuery, language]);

  // Dropdown Picker Modal
  const renderDropdownPickerModal = () => {
    if (!pickerModalType) return null;

    let title = '';
    let options: string[] = [];
    let currentVal = '';
    let onSelect: (val: string) => void = () => {};

    if (pickerModalType === 'dateFormat') {
      title = 'Select Date Format';
      options = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
      currentVal = dateFormat;
      onSelect = (v) => setDateFormat(v);
    } else if (pickerModalType === 'timeFormat') {
      title = 'Select Time Format';
      options = ['12-hour', '24-hour'];
      currentVal = timeFormat;
      onSelect = (v) => setTimeFormat(v);
    } else if (pickerModalType === 'language') {
      title = 'Select Language';
      options = ['English', 'मराठी', 'हिंदी'];
      currentVal =
        language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English';
      onSelect = (v) => {
        if (v === 'मराठी') setLanguage('mr');
        else if (v === 'हिंदी') setLanguage('hi');
        else setLanguage('en');
        setSystemLang(v);
      };
    } else if (pickerModalType === 'backupFrequency') {
      title = 'Select Backup Frequency';
      options = ['Daily', 'Weekly', 'Monthly'];
      currentVal = backupFrequency;
      onSelect = (v) => setBackupFrequency(v);
    } else if (pickerModalType === 'gstEnabled') {
      title = 'GST Enabled';
      options = ['true', 'false'];
      currentVal = gstEnabled;
      onSelect = (v) => setGstEnabled(v);
    } else if (pickerModalType === 'businessState') {
      title = 'Business State';
      options = ['Maharashtra', 'Delhi', 'Karnataka', 'Gujarat', 'Goa', 'Madhya Pradesh'];
      currentVal = businessState;
      onSelect = (v) => setBusinessState(v);
    } else if (pickerModalType === 'registrationType') {
      title = 'Registration Type';
      options = ['Regular', 'Composition'];
      currentVal = registrationType;
      onSelect = (v) => setRegistrationType(v);
    } else if (pickerModalType === 'foodSlabRate') {
      title = 'Default Food Slab Rate';
      options = ['5%', '12%', '18%', '28%', '0%'];
      currentVal = foodSlabRate;
      onSelect = (v) => {
        setFoodSlabRate(v);
        const rateNum = parseFloat(v);
        if (!isNaN(rateNum)) {
          setCgstRate((rateNum / 2).toFixed(1));
          setSgstRate((rateNum / 2).toFixed(1));
          setIgstRate(rateNum.toString());
        }
      };
    } else if (pickerModalType === 'taxInclusiveExclusive') {
      title = 'Tax Inclusive / Exclusive';
      options = ['Inclusive', 'Exclusive'];
      currentVal = taxInclusiveExclusive;
      onSelect = (v) => setTaxInclusiveExclusive(v);
    } else if (pickerModalType === 'returnPeriod') {
      title = 'Return Period';
      options = ['Monthly', 'Quarterly'];
      currentVal = returnPeriod;
      onSelect = (v) => setReturnPeriod(v);
    } else if (pickerModalType === 'financialYear') {
      title = 'Financial Year';
      options = ['2024-25', '2025-26', '2026-27'];
      currentVal = financialYear;
      onSelect = (v) => setFinancialYear(v);
    }

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setPickerModalType(null)}>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalType(null)}
        >
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setPickerModalType(null)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {options.map((opt) => {
                const isSelected = opt === currentVal;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      onSelect(opt);
                      setPickerModalType(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {isSelected && <Check size={16} color="#8F351D" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.rootContainer}>
      {/* Universal Top AppNavbar per user requirement: "sagli kde navbar disayla pahije" */}
      <AppNavbar navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================================
            HEADER: HOTEL MANAGEMENT / SETTINGS
        =================================================== */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.breadcrumbText}>
              {t('hotelManagement', 'HOTEL MANAGEMENT')} / {t('settings', 'SETTINGS')}
            </Text>
            <Text style={styles.pageTitle}>{t('settings', 'Settings')}</Text>
            <Text style={styles.pageSubtitle}>
              {t(
                'manageSettingsSubtitle',
                'Manage your hotel profile, billing, GST configuration and system preferences.'
              )}
            </Text>
          </View>
          <View style={styles.secureBadge}>
            <CheckCircle2 size={13} color="#8F351D" />
            <Text style={styles.secureBadgeText}>✓ Secure Settings</Text>
          </View>
        </View>

        {/* ===================================================
            SEARCH TOOLBAR: "Search settings..." + "All settings ready"
        =================================================== */}
        <View style={styles.searchToolbar}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchSettings', 'Search settings...')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.readyPill}>
            <Text style={styles.readyPillText}>
              {lastSavedMessage ? `Saved ${lastSavedMessage}` : t('allSettingsReady', 'All settings ready')}
            </Text>
          </View>
        </View>

        {/* ===================================================
            HERO CARD: LICENSED ENTERPRISE VERSION BANNER
        =================================================== */}
        <View style={styles.licenseHeroCard}>
          <View style={styles.heroLeftSection}>
            <View style={styles.shieldIconBox}>
              <Shield size={26} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroVersionTitle}>
                  {t('licensedEnterpriseVersion', 'Licensed Enterprise Version')}
                </Text>
                <View style={styles.heroActiveBadge}>
                  <Text style={styles.heroActiveBadgeText}>⚡ Active</Text>
                </View>
              </View>
              <Text style={styles.heroSubtitle}>
                {t(
                  'fullFeaturesEnabled',
                  'Full unlimited features enabled. All trial restrictions removed.'
                )}
              </Text>
            </View>
          </View>

          <View style={styles.heroRightSection}>
            <View style={styles.heroMetaCol}>
              <Text style={styles.heroMetaLabel}>{t('planName', 'PLAN NAME')}</Text>
              <Text style={[styles.heroMetaVal, { color: '#16A34A' }]}>{activePlanName}</Text>
            </View>

            <View style={styles.heroMetaCol}>
              <Text style={styles.heroMetaLabel}>{t('validity', 'VALIDITY')}</Text>
              <Text style={styles.heroMetaVal}>{toDevanagari(daysRemaining)} {t('daysRemaining', 'Days Remaining')}</Text>
            </View>

            <View style={styles.heroMetaCol}>
              <Text style={styles.heroMetaLabel}>{t('licenseStatus', 'LICENSE STATUS')}</Text>
              <Text style={[styles.heroMetaVal, { color: '#16A34A' }]}>{t('active', 'Active')}</Text>
            </View>

            <View style={styles.heroButtonsWrap}>
              <TouchableOpacity
                style={styles.renewBtn}
                onPress={handleRenewLicense}
                activeOpacity={0.85}
              >
                <RotateCcw size={13} color="#FFFFFF" />
                <Text style={styles.renewBtnText}>{t('renew', 'Renew License')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => setShowUpgradeModal(true)}
                activeOpacity={0.85}
              >
                <Sparkles size={13} color="#FFFFFF" />
                <Text style={styles.upgradeBtnText}>{t('upgradePlan', 'Upgrade Plan')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===================================================
            2-COLUMN SETTINGS LAYOUT
        =================================================== */}
        <View
          style={[
            styles.settingsLayout,
            isDesktopLayout ? styles.settingsLayoutDesktop : styles.settingsLayoutMobile,
          ]}
        >
          {/* LEFT SUB-SIDEBAR (7 Items) */}
          <View style={[styles.subSidebar, !isDesktopLayout && styles.subSidebarMobile]}>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.subNavItem, isSelected && styles.subNavItemActive]}
                  onPress={() => setActiveTab(item.key)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.subNavIconBox,
                      isSelected && styles.subNavIconBoxActive,
                    ]}
                  >
                    <Icon size={16} color={isSelected ? '#FFFFFF' : '#8B786D'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.subNavTitle,
                        isSelected && styles.subNavTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {getNavItemLabel(item.key)}
                    </Text>
                    <Text
                      style={[
                        styles.subNavDesc,
                        isSelected && styles.subNavDescActive,
                      ]}
                      numberOfLines={1}
                    >
                      {getNavItemDesc(item.key)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* RIGHT CONTENT AREA */}
          <View style={styles.contentArea}>
            {/* ----------------------------------------------------
                1. GST SETTINGS & REPORTS TAB (Screenshots 1 to 5)
            ---------------------------------------------------- */}
            {activeTab === 'gst-reports' && (
              <View style={styles.settingsCard}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('gstSettingsAndReports', 'GST Settings & Reports')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('gstConfigTaxReturnReports', 'GST configuration, saved sales and purchase records, and return summaries')}
                    </Text>
                  </View>

                  <View style={styles.gstHeaderActions}>
                    <TouchableOpacity
                      style={styles.exportCsvBtn}
                      onPress={async () => {
                        const csvHeaders = 'Invoice,Date,Customer,Subtotal,Discount,CGST,SGST,IGST,TotalGST,Total,Status\n';
                        const csvRows = [
                          'INV-1792044802371,26 Oct 2026,Prasad Ghongte,1630,0,40.75,40.75,0,81.50,1711.50,Paid',
                          'INV-1792044802370,26 Oct 2026,Prasad Ghongte,1630,0,40.75,40.75,0,81.50,1711.50,Paid',
                          'INV-1792044802369,26 Oct 2026,Prasad Ghongte,1630,0,40.75,40.75,0,81.50,1711.50,Paid',
                          'INV-1792044802368,24 Oct 2026,Sachin Tendulkar,360,0,9.00,9.00,0,18.00,378.00,Paid',
                          'INV-1792044802367,24 Oct 2026,Namdev,1140,0,28.50,28.50,0,57.00,1197.00,Paid',
                          'INV-1792044802365,24 Oct 2026,Prajwal,1040,0,26.00,26.00,0,52.00,1092.00,Paid',
                          'INV-1792044802364,24 Oct 2026,Prasad Ghongte,1630,0,40.75,40.75,0,81.50,1711.50,Paid',
                          'INV-1792044802363,24 Oct 2026,Guest,440,0,11.00,11.00,0,22.00,462.00,Paid',
                          'INV-1792044802361,24 Oct 2026,Shubham Chaudhari,760,0,19.00,19.00,0,38.00,798.00,Paid',
                        ].join('\n');
                        await downloadAndShareCsv(`GST_Sales_Report_${Date.now()}.csv`, csvHeaders + csvRows);
                      }}
                    >
                      <Download size={13} color="#059669" />
                      <Text style={styles.exportCsvBtnText}>{t('exportCsv', 'Export CSV')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.printPdfBtn}
                      onPress={async () => {
                        const html = buildGstTaxReportHtml({
                          hotelName: hotelName || 'Royal Palace Hotel',
                          branchName: activeBranch?.name || 'Main Branch',
                          totalTurnover: 108135.00,
                          totalTax: 4429.02,
                          cgst: 2214.51,
                          sgst: 2214.51,
                          invoices: [
                            { inv: 'INV-1792044802371', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                            { inv: 'INV-1792044802370', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                            { inv: 'INV-1792044802369', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                            { inv: 'INV-1792044802368', date: '24 Oct 2026', cust: 'Sachin Tendulkar', sub: 360, cgst: 9.00, sgst: 9.00, tgst: 18.00, tot: 378.00, status: 'Paid' },
                            { inv: 'INV-1792044802367', date: '24 Oct 2026', cust: 'Namdev', sub: 1140, cgst: 28.50, sgst: 28.50, tgst: 57.00, tot: 1197.00, status: 'Paid' },
                            { inv: 'INV-1792044802365', date: '24 Oct 2026', cust: 'Prajwal', sub: 1040, cgst: 26.00, sgst: 26.00, tgst: 52.00, tot: 1092.00, status: 'Paid' },
                            { inv: 'INV-1792044802364', date: '24 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                          ],
                        });
                        await downloadAndSharePdf('GST_Tax_Report', html);
                      }}
                    >
                      <Printer size={13} color="#FFFFFF" />
                      <Text style={styles.printPdfBtnText}>{t('printPdf', 'Print / PDF')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sub-tabs Row (Screenshots 1 to 5) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gstSubTabsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'gst-settings' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('gst-settings')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'gst-settings' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('gstSettings', 'GST Settings')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'sales-report' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('sales-report')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'sales-report' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('salesReport', 'Sales Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'purchase-report' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('purchase-report')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'purchase-report' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('purchaseReport', 'Purchase Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'gstr-1' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('gstr-1')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'gstr-1' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('gstr1Report', 'GSTR-1 Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'gstr-2' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('gstr-2')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'gstr-2' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('gstr2Report', 'GSTR-2 Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'gstr-3b' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('gstr-3b')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'gstr-3b' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('gstr3bReport', 'GSTR-3B Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gstSubTabPill,
                      gstSubTab === 'hsn-summary' && styles.gstSubTabPillActive,
                    ]}
                    onPress={() => setGstSubTab('hsn-summary')}
                  >
                    <Text
                      style={[
                        styles.gstSubTabPillText,
                        gstSubTab === 'hsn-summary' && styles.gstSubTabPillTextActive,
                      ]}
                    >
                      {t('hsnSummaryReport', 'HSN Summary Report')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Date Filter Bar matching Screenshots 1 to 5 */}
                {gstSubTab !== 'gst-settings' && (
                  <View style={styles.dateFilterContainer}>
                    <View style={styles.dateFilterRow}>
                      <Text style={styles.dateFilterLabel}>{t('from', 'From:')}</Text>
                      <TouchableOpacity
                        style={styles.dateFilterPill}
                        onPress={() => {
                          setActiveDatePickingField('from');
                          setShowDatePickerModal(true);
                        }}
                      >
                        <Text style={styles.dateFilterVal}>{toDevanagari(gstDateFrom)}</Text>
                      </TouchableOpacity>

                      <Text style={styles.dateFilterLabel}>{t('to', 'to')}</Text>
                      <TouchableOpacity
                        style={styles.dateFilterPill}
                        onPress={() => {
                          setActiveDatePickingField('to');
                          setShowDatePickerModal(true);
                        }}
                      >
                        <Text style={styles.dateFilterVal}>{toDevanagari(gstDateTo)}</Text>
                        <Calendar size={13} color="#6B7280" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* SUB-TAB 1: GST SETTINGS (12 fields grid) */}
                {gstSubTab === 'gst-settings' && (
                  <View style={styles.gstSettingsCardWrapper}>
                    <Text style={styles.gstCardHeading}>{t('gstSettings', 'GST Settings')}</Text>
                    <Text style={styles.gstCardSubHeading}>
                      {t('configureGstDefaults', 'Configure business GST defaults used for reporting.')}
                    </Text>

                    <View style={styles.gstFieldsGrid}>
                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('gstEnabled', 'GST Enabled')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('gstEnabled')}
                        >
                          <Text style={styles.selectInputText}>{gstEnabled === 'Enabled' ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('gstin', 'GSTIN')}</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 27AAAAA1111A1"
                          value={gstin}
                          onChangeText={setGstin}
                          autoCapitalize="characters"
                        />
                        <Text style={styles.gstHint}>{t('maskedGstinFormat', 'Masked format: 27XXXXXXXXXX1Z5')}</Text>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('businessState', 'Business State')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('businessState')}
                        >
                          <Text style={styles.selectInputText}>{toDevanagari(businessState)}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('registrationType', 'Registration Type')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('registrationType')}
                        >
                          <Text style={styles.selectInputText}>{registrationType === 'Regular' ? t('regular', 'Regular') : registrationType}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('foodSlabRate', 'Food Slab / Default GST Rate')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('foodSlabRate')}
                        >
                          <Text style={styles.selectInputText}>{language === 'mr' ? '५% (रेस्टॉरंट सेवा)' : language === 'hi' ? '५% (रेस्तरां सेवाएं)' : foodSlabRate}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('cgstRate', 'CGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          value={cgstRate}
                          onChangeText={setCgstRate}
                        />
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('sgstRate', 'SGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          value={sgstRate}
                          onChangeText={setSgstRate}
                        />
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('igstRate', 'IGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          value={igstRate}
                          onChangeText={setIgstRate}
                        />
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('hsnSac', 'HSN / SAC')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="number-pad"
                          value={hsnSac}
                          onChangeText={setHsnSac}
                        />
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('taxInclusiveExclusive', 'Tax Inclusive / Exclusive')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('taxInclusiveExclusive')}
                        >
                          <Text style={styles.selectInputText}>{taxInclusiveExclusive === 'Tax Exclusive' ? t('taxExclusive', 'Tax Exclusive') : t('taxInclusive', 'Tax Inclusive')}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('returnPeriod', 'Return Period')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('returnPeriod')}
                        >
                          <Text style={styles.selectInputText}>{returnPeriod === 'Monthly' ? t('monthly', 'Monthly') : returnPeriod}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.gstFieldCol}>
                        <Text style={styles.fieldLabel}>{t('financialYear', 'Financial Year')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('financialYear')}
                        >
                          <Text style={styles.selectInputText}>{toDevanagari(financialYear)}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', marginTop: 18 }}>
                      <TouchableOpacity
                        style={styles.saveGstButton}
                        onPress={handleSaveGst}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.saveGstButtonText}>{t('saveGstSettings', 'Save GST Settings')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* SUB-TAB 2: SALES REPORT (Screenshot 1 Match) */}
                {gstSubTab === 'sales-report' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('salesReport', 'Sales Report')}</Text>

                    {/* 6 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,08,135.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('cgst', 'CGST')}</Text>
                          <Text style={styles.statRatePill}>{toDevanagari('2.5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,214.51')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('sgst', 'SGST')}</Text>
                          <Text style={styles.statRatePill}>{toDevanagari('2.5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,214.51')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.statRatePill, { color: '#0284C7' }]}>{toDevanagari('5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalGst', 'TOTAL GST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('4,429.02')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('invoiceTotal', 'INVOICE TOTAL')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,12,519.02')}</Text>
                      </View>
                    </ScrollView>

                    {/* Full 11-column Sales Report Table matching Screenshot 1 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 170 }]}>{t('invoiceNumber', 'Invoice #')}</Text>
                          <Text style={[styles.rth, { width: 130 }]}>{t('date', 'Date')}</Text>
                          <Text style={[styles.rth, { width: 150 }]}>{t('customerUpper', 'CUSTOMER')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('subtotal', 'Subtotal')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('discount', 'Discount')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('cgst', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('sgst', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'right' }]}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('totalGst', 'Total GST')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                        </View>

                        {[
                          { inv: 'INV-1792044802371', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, disc: 0, cgst: 40.75, sgst: 40.75, igst: 0, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802370', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, disc: 0, cgst: 40.75, sgst: 40.75, igst: 0, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802369', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, disc: 0, cgst: 40.75, sgst: 40.75, igst: 0, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802368', date: 'Sat, 24 Oct 2026', cust: 'Sachin Tendulkar', sub: 360, disc: 0, cgst: 9.00, sgst: 9.00, igst: 0, tgst: 18.00, tot: 378.00, status: 'Paid' },
                          { inv: 'INV-1792044802367', date: 'Sat, 24 Oct 2026', cust: 'Namdev', sub: 1140, disc: 0, cgst: 28.50, sgst: 28.50, igst: 0, tgst: 57.00, tot: 1197.00, status: 'Paid' },
                          { inv: 'INV-1792044802365', date: 'Sat, 24 Oct 2026', cust: 'Prajwal', sub: 1040, disc: 0, cgst: 26.00, sgst: 26.00, igst: 0, tgst: 52.00, tot: 1092.00, status: 'Paid' },
                          { inv: 'INV-1792044802364', date: 'Sat, 24 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, disc: 0, cgst: 40.75, sgst: 40.75, igst: 0, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802363', date: 'Sat, 24 Oct 2026', cust: 'Guest', sub: 440, disc: 0, cgst: 11.00, sgst: 11.00, igst: 0, tgst: 22.00, tot: 462.00, status: 'Paid' },
                          { inv: 'INV-1792044802361', date: 'Sat, 24 Oct 2026', cust: 'Shubham Chaudhari', sub: 760, disc: 0, cgst: 19.00, sgst: 19.00, igst: 0, tgst: 38.00, tot: 798.00, status: 'Paid' },
                        ].map((row, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.rtd, { width: 170, fontWeight: '700', color: '#1F2937' }]}>{row.inv}</Text>
                            <Text style={[styles.rtd, { width: 130, color: '#6B7280' }]}>{translateDateString(row.date)}</Text>
                            <Text style={[styles.rtd, { width: 150, color: '#374151', fontWeight: '600' }]}>{translateCustomerName(row.cust)}</Text>
                            <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(row.sub.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.disc.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.cgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.sgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 80, textAlign: 'right' }]}>₹ {toDevanagari(row.igst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(row.tgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>₹ {toDevanagari(row.tot.toFixed(2))}</Text>
                            <View style={[styles.rtd, { width: 80, alignItems: 'center' }]}>
                              <View style={styles.paidBadge}>
                                <Text style={styles.paidBadgeText}>{row.status === 'Paid' ? t('paid', 'Paid') : t('due', 'Due')}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* SUB-TAB 3: GSTR-1 REPORT (Screenshot 2 Match) */}
                {gstSubTab === 'gstr-1' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('gstr1Report', 'GSTR-1 Report')}</Text>

                    {/* B2B / B2C Invoices Summary Pills */}
                    <View style={styles.b2bBadgeRow}>
                      <View style={styles.b2bBadge}>
                        <Text style={styles.b2bBadgeText}>B2B: {toDevanagari(0)} (₹ {toDevanagari('0.00')})</Text>
                      </View>
                      <View style={[styles.b2bBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                        <Text style={[styles.b2bBadgeText, { color: '#15803D' }]}>B2C: {toDevanagari(90)} (₹ {toDevanagari('1,08,135.00')})</Text>
                      </View>
                    </View>

                    {/* 6 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,08,135.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('centralTaxCgst', 'CENTRAL TAX (CGST)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,214.51')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('stateTaxSgst', 'STATE TAX (SGST)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,214.51')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('integratedTaxIgst', 'INTEGRATED TAX (IGST)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalTax', 'TOTAL TAX')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('4,429.02')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('invoiceTotal', 'INVOICE TOTAL')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,12,519.02')}</Text>
                      </View>
                    </ScrollView>

                    {/* GSTR-1 Table matching Screenshot 2 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 170 }]}>{t('invoiceNumber', 'Invoice #')}</Text>
                          <Text style={[styles.rth, { width: 130 }]}>{t('date', 'Date')}</Text>
                          <Text style={[styles.rth, { width: 140 }]}>{t('customerUpper', 'CUSTOMER')}</Text>
                          <Text style={[styles.rth, { width: 120 }]}>{t('gstin', 'GSTIN')}</Text>
                          <Text style={[styles.rth, { width: 110 }]}>{t('supplyType', 'Supply Type')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('taxableValue', 'Taxable Value')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('cgst', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('sgst', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'right' }]}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('totalTax', 'Total Tax')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                        </View>

                        {[
                          { inv: 'INV-1792044802371', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1630.00, cgst: 40.75, sgst: 40.75, igst: 0, totTax: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802370', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1630.00, cgst: 40.75, sgst: 40.75, igst: 0, totTax: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802369', date: 'Mon, 26 Oct 2026', cust: 'Prasad Ghongte', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1630.00, cgst: 40.75, sgst: 40.75, igst: 0, totTax: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802368', date: 'Sat, 24 Oct 2026', cust: 'Sachin Tendulkar', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 360.00, cgst: 9.00, sgst: 9.00, igst: 0, totTax: 18.00, tot: 378.00, status: 'Paid' },
                          { inv: 'INV-1792044802367', date: 'Sat, 24 Oct 2026', cust: 'Namdev', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1140.00, cgst: 28.50, sgst: 28.50, igst: 0, totTax: 57.00, tot: 1197.00, status: 'Paid' },
                          { inv: 'INV-1792044802365', date: 'Sat, 24 Oct 2026', cust: 'Prajwal', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1040.00, cgst: 26.00, sgst: 26.00, igst: 0, totTax: 52.00, tot: 1092.00, status: 'Paid' },
                          { inv: 'INV-1792044802364', date: 'Sat, 24 Oct 2026', cust: 'Prasad Ghongte', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 1630.00, cgst: 40.75, sgst: 40.75, igst: 0, totTax: 81.50, tot: 1711.50, status: 'Paid' },
                          { inv: 'INV-1792044802363', date: 'Sat, 24 Oct 2026', cust: 'Guest', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 440.00, cgst: 11.00, sgst: 11.00, igst: 0, totTax: 22.00, tot: 462.00, status: 'Paid' },
                          { inv: 'INV-1792044802361', date: 'Sat, 24 Oct 2026', cust: 'Shubham Chaudhari', gstin: 'B2C (Consumer)', supply: 'Intra-State', taxable: 760.00, cgst: 19.00, sgst: 19.00, igst: 0, totTax: 38.00, tot: 798.00, status: 'Paid' },
                        ].map((row, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.rtd, { width: 170, fontWeight: '700', color: '#1F2937' }]}>{row.inv}</Text>
                            <Text style={[styles.rtd, { width: 130, color: '#6B7280' }]}>{translateDateString(row.date)}</Text>
                            <Text style={[styles.rtd, { width: 140, color: '#374151', fontWeight: '600' }]}>{translateCustomerName(row.cust)}</Text>
                            <Text style={[styles.rtd, { width: 120, color: '#6B7280' }]}>{row.gstin === 'B2C (Consumer)' ? (language === 'mr' ? 'B2C (ग्राहक)' : language === 'hi' ? 'B2C (उपभोक्ता)' : 'B2C (Consumer)') : row.gstin}</Text>
                            <Text style={[styles.rtd, { width: 110, color: '#4B5563' }]}>{row.supply === 'Intra-State' ? (language === 'mr' ? 'राज्यांतर्गत' : language === 'hi' ? 'राज्य के भीतर' : 'Intra-State') : row.supply}</Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(row.taxable.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.cgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.sgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 80, textAlign: 'right' }]}>₹ {toDevanagari(row.igst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.totTax.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>₹ {toDevanagari(row.tot.toFixed(2))}</Text>
                            <View style={[styles.rtd, { width: 80, alignItems: 'center' }]}>
                              <View style={styles.paidBadge}>
                                <Text style={styles.paidBadgeText}>{row.status === 'Paid' ? t('paid', 'Paid') : t('due', 'Due')}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* SUB-TAB 4: GSTR-2 REPORT (Screenshot 3 Match) */}
                {gstSubTab === 'gstr-2' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('gstr2Report', 'GSTR-2 Report')}</Text>

                    {/* 6 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,14,005.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('cgst', 'CGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,354.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('sgst', 'SGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,354.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('igst', 'IGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalTax', 'TOTAL TAX')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('4,708.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('purchaseTotal', 'PURCHASE TOTAL')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,18,713.00')}</Text>
                      </View>
                    </ScrollView>

                    {/* Full 13-column GSTR-2 Table matching Screenshot 3 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 170 }]}>{t('invoiceNumber', 'Invoice #')}</Text>
                          <Text style={[styles.rth, { width: 130 }]}>{t('date', 'Date')}</Text>
                          <Text style={[styles.rth, { width: 140 }]}>{t('supplier', 'Supplier')}</Text>
                          <Text style={[styles.rth, { width: 90 }]}>{t('gstin', 'GSTIN')}</Text>
                          <Text style={[styles.rth, { width: 100 }]}>{t('supplyType', 'Supply Type')}</Text>
                          <Text style={[styles.rth, { width: 90 }]}>{t('category', 'Category')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('taxableValue', 'Taxable Value')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('cgst', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('sgst', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'right' }]}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('totalTax', 'Total Tax')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                        </View>

                        {[
                          { inv: 'INV-878711', date: 'Mon, 5 Oct 2026', sup: 'Namdev', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 33000.00, cgst: 825.00, sgst: 825.00, igst: 0, totTax: 1650.00, tot: 34650.00, status: 'Paid' },
                          { inv: 'INV-693395', date: 'Tue, 6 Oct 2026', sup: 'Vivek Chopade', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 800.00, cgst: 20.00, sgst: 20.00, igst: 0, totTax: 40.00, tot: 840.00, status: 'Paid' },
                          { inv: 'INV-651336', date: 'Mon, 12 Oct 2026', sup: 'Namdev', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 17000.00, cgst: 425.00, sgst: 425.00, igst: 0, totTax: 850.00, tot: 17850.00, status: 'Due' },
                          { inv: 'SUP-INV-20261014221620', date: 'Wed, 14 Oct 2026', sup: 'Rajesh Patil', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 6150.00, cgst: 154.00, sgst: 154.00, igst: 0, totTax: 308.00, tot: 6458.00, status: 'Due' },
                          { inv: 'INV-338003', date: 'Fri, 16 Oct 2026', sup: 'Dot Dot', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 11500.00, cgst: 287.50, sgst: 287.50, igst: 0, totTax: 575.00, tot: 12075.00, status: 'Paid' },
                          { inv: 'INV-406026', date: 'Mon, 19 Oct 2026', sup: 'Namdev', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 500.00, cgst: 12.50, sgst: 12.50, igst: 0, totTax: 25.00, tot: 525.00, status: 'Paid' },
                          { inv: 'INV-548336', date: 'Sat, 24 Oct 2026', sup: 'Rajesh Patil', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 25000.00, cgst: 625.00, sgst: 625.00, igst: 0, totTax: 1250.00, tot: 26250.00, status: 'Paid' },
                          { inv: 'INV-025015', date: 'Sat, 24 Oct 2026', sup: 'Pavan Chaudhari', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 200.00, cgst: 5.00, sgst: 5.00, igst: 0, totTax: 10.00, tot: 210.00, status: 'Paid' },
                          { inv: 'PI-1792839760266', date: 'Sat, 24 Oct 2026', sup: 'Namdev', gstin: '-', supply: 'Intra-State', cat: 'General', taxable: 600.00, cgst: 0.00, sgst: 0.00, igst: 0, totTax: 0.00, tot: 630.00, status: 'Paid' },
                        ].map((row, idx) => (
                          <View key={idx} style={styles.reportTableRow}>
                            <Text style={[styles.rtd, { width: 170, fontWeight: '700', color: '#1F2937' }]}>{row.inv}</Text>
                            <Text style={[styles.rtd, { width: 130, color: '#6B7280' }]}>{translateDateString(row.date)}</Text>
                            <Text style={[styles.rtd, { width: 140, color: '#374151', fontWeight: '600' }]}>{translateSupplierName(row.sup)}</Text>
                            <Text style={[styles.rtd, { width: 90, color: '#6B7280' }]}>{row.gstin}</Text>
                            <Text style={[styles.rtd, { width: 100, color: '#4B5563' }]}>{row.supply === 'Intra-State' ? (language === 'mr' ? 'राज्यांतर्गत' : language === 'hi' ? 'राज्य के भीतर' : 'Intra-State') : row.supply}</Text>
                            <Text style={[styles.rtd, { width: 90, color: '#6B7280' }]}>{translateCategoryName(row.cat)}</Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(row.taxable.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.cgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.sgst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 80, textAlign: 'right' }]}>₹ {toDevanagari(row.igst.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right' }]}>₹ {toDevanagari(row.totTax.toFixed(2))}</Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>₹ {toDevanagari(row.tot.toFixed(2))}</Text>
                            <View style={[styles.rtd, { width: 80, alignItems: 'center' }]}>
                              <View style={[styles.paidBadge, row.status === 'Due' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                <Text style={[styles.paidBadgeText, row.status === 'Due' && { color: '#DC2626' }]}>{row.status === 'Paid' ? t('paid', 'Paid') : t('due', 'Due')}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* SUB-TAB 5: GSTR-3B REPORT (Screenshot 4 Match) */}
                {gstSubTab === 'gstr-3b' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('gstr3bReport', 'GSTR-3B Report')}</Text>

                    {/* 6 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('outputGstSales', 'OUTPUT GST (SALES)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('4,429.02')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('inputGstPurchases', 'INPUT GST / ITC (PURCHASES)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('4,708.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('cgst', 'CGST')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('sgst', 'SGST')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('igst', 'IGST')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('netTaxLiability', 'NET TAX LIABILITY')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>
                    </ScrollView>

                    {/* GSTR-3B Summary Table matching Screenshot 4 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={[styles.reportTable, { minWidth: 800 }]}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 280 }]}>{t('supplyDetails', 'Supply Details')}</Text>
                          <Text style={[styles.rth, { width: 140, textAlign: 'right' }]}>{t('taxableValue', 'Taxable Amount')} (₹)</Text>
                          <Text style={[styles.rth, { width: 140, textAlign: 'right' }]}>{t('integratedTaxIgst', 'Integrated Tax (IGST)')}</Text>
                          <Text style={[styles.rth, { width: 130, textAlign: 'right' }]}>{t('centralTaxCgst', 'Central Tax (CGST)')}</Text>
                          <Text style={[styles.rth, { width: 130, textAlign: 'right' }]}>{t('stateTaxSgst', 'State Tax (SGST)')}</Text>
                          <Text style={[styles.rth, { width: 120, textAlign: 'right' }]}>{t('totalTax', 'Total Tax')}</Text>
                        </View>

                        {/* Row 3.1 */}
                        <View style={styles.reportTableRow}>
                          <Text style={[styles.rtd, { width: 280, fontWeight: '700', color: '#1F2937' }]}>
                            {t('outwardTaxableSupplies', '3.1 Outward Taxable Supplies (Sales)')}
                          </Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('1,08,135.00')}</Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('2,214.51')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('2,214.51')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('4,429.02')}</Text>
                        </View>

                        {/* Row 4 */}
                        <View style={styles.reportTableRow}>
                          <Text style={[styles.rtd, { width: 280, fontWeight: '700', color: '#1F2937' }]}>
                            {t('eligibleItcCredit', '4. Eligible Input Tax Credit (ITC - Purchases)')}
                          </Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('1,14,005.00')}</Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('2,354.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('2,354.00')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('4,708.00')}</Text>
                        </View>

                        {/* Row 5: Highlighted light orange */}
                        <View style={[styles.reportTableRow, { backgroundColor: '#FFF7ED' }]}>
                          <Text style={[styles.rtd, { width: 280, fontWeight: '800', color: '#C2410C' }]}>
                            {t('netTaxLiabilityPayable', '5. Net Tax Liability (Payable)')}
                          </Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right', color: '#C2410C' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right', color: '#C2410C' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right', color: '#C2410C' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right', color: '#C2410C' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '900', color: '#C2410C' }]}>₹ {toDevanagari('0.00')}</Text>
                        </View>

                        {/* Row 6: Highlighted light green */}
                        <View style={[styles.reportTableRow, { backgroundColor: '#F0FDF4' }]}>
                          <Text style={[styles.rtd, { width: 280, fontWeight: '800', color: '#15803D' }]}>
                            {t('itcBalanceCarriedForward', '6. ITC Balance Carried Forward to Next Period')}
                          </Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right', color: '#15803D' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 140, textAlign: 'right', color: '#15803D' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right', color: '#15803D' }]}>₹ {toDevanagari('139.49')}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right', color: '#15803D' }]}>₹ {toDevanagari('139.49')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '900', color: '#15803D' }]}>₹ {toDevanagari('278.98')}</Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* SUB-TAB 6: HSN SUMMARY REPORT (Screenshot 5 Match) */}
                {gstSubTab === 'hsn-summary' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('hsnSummaryReport', 'HSN Summary Report')}</Text>

                    {/* 5 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,08,135.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('cgst', 'CGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,703.38')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('sgst', 'SGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,703.37')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('igst', 'IGST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalGst', 'TOTAL GST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('5,406.75')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('total', 'TOTAL VALUE')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,13,541.75')}</Text>
                      </View>
                    </ScrollView>

                    {/* HSN Summary Table matching Screenshot 5 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={[styles.reportTable, { minWidth: 800 }]}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 120 }]}>{t('hsnSac', 'HSN / SAC')}</Text>
                          <Text style={[styles.rth, { width: 180 }]}>{t('description', 'Description')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('qty', 'Qty')}</Text>
                          <Text style={[styles.rth, { width: 130, textAlign: 'right' }]}>{t('taxableValue', 'Taxable Value')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('cgst', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('sgst', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'right' }]}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('totalTax', 'Total Tax')}</Text>
                          <Text style={[styles.rth, { width: 120, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                        </View>

                        {/* HSN Row 1: Veg Spring Rolls */}
                        <View style={styles.reportTableRow}>
                          <Text style={[styles.rtd, { width: 120, fontWeight: '700', color: '#1F2937' }]}>{toDevanagari('9963')}</Text>
                          <Text style={[styles.rtd, { width: 180, color: '#374151' }]}>{translateItemName('Veg Spring Rolls')}</Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'center' }]}>{toDevanagari(524)}</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('1,08,135.00')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari('2,703.38')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari('2,703.37')}</Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari('5,406.75')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('1,13,541.75')}</Text>
                        </View>

                        {/* TOTAL (1) Row */}
                        <View style={[styles.reportTableRow, { backgroundColor: '#F9FAFB' }]}>
                          <Text style={[styles.rtd, { width: 120, fontWeight: '800', color: '#111827' }]}>{t('total', 'TOTAL')} ({toDevanagari(1)})</Text>
                          <Text style={[styles.rtd, { width: 180, color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'center', color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 130, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('1,08,135.00')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('2,703.38')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('2,703.37')}</Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('0.00')}</Text>
                          <Text style={[styles.rtd, { width: 100, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari('5,406.75')}</Text>
                          <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '900', color: '#111827' }]}>₹ {toDevanagari('1,13,541.75')}</Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* SUB-TAB 7: PURCHASE REPORT */}
                {gstSubTab === 'purchase-report' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.reportSectionHeading}>{t('purchaseReport', 'Purchase Report (Inward Supplies)')}</Text>

                    {/* Return Filing Summary Box matching Screenshot 1 */}
                    <View style={styles.filingSummaryBox}>
                      <Text style={styles.filingSummaryTitle}>{t('purchaseReport', 'Purchase Report')} - {t('returnFilingSummary', 'Return Filing Summary')}</Text>
                      <View style={styles.filingSummaryMeta}>
                        <Text style={styles.filingSummaryMetaText}>
                          {t('period', 'Period')}: {t('monthly', 'Monthly')} ({toDevanagari(financialYear)}) | {t('state', 'State')}: {businessState === 'Maharashtra (27)' ? (language === 'mr' ? 'महाराष्ट्र (२७)' : language === 'hi' ? 'महाराष्ट्र (२७)' : 'Maharashtra (27)') : businessState} | {t('activeGstin', 'Active GSTIN')}: {toDevanagari(gstin)}
                        </Text>
                        <Text style={styles.filingSummarySuccessText}>
                          {t('gstReconciliationSuccess', '✓ All sales & purchase records reconciled and GSTR-3B tax payment eligible.')}
                        </Text>
                      </View>
                    </View>

                    {/* 6 Metric Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxablePurchases', 'TAXABLE PURCHASES')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,14,005.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('inputCgst', 'INPUT CGST')}</Text>
                          <Text style={styles.statRatePill}>{toDevanagari('2.5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,354.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('inputSgst', 'INPUT SGST')}</Text>
                          <Text style={styles.statRatePill}>{toDevanagari('2.5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('2,354.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <View style={styles.statLabelRow}>
                          <Text style={styles.gstStatLabel}>{t('inputIgst', 'INPUT IGST')}</Text>
                          <Text style={[styles.statRatePill, { color: '#0284C7' }]}>{toDevanagari('5')}%</Text>
                        </View>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>₹ {toDevanagari('0.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalInputGst', 'TOTAL INPUT GST (ITC)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>₹ {toDevanagari('4,708.00')}</Text>
                      </View>

                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('purchaseTotal', 'PURCHASE TOTAL')}</Text>
                        <Text style={styles.gstStatVal}>₹ {toDevanagari('1,18,713.00')}</Text>
                      </View>
                    </ScrollView>

                    {/* Filter & Search Bar */}
                    <View style={styles.purchaseFilterBar}>
                      <View style={styles.purchaseSearchBox}>
                        <Search size={14} color="#64748B" />
                        <TextInput
                          style={styles.purchaseSearchInput}
                          placeholder={t('searchInvoicePlaceholder', 'Search invoice, supplier, items...')}
                          placeholderTextColor="#94A3B8"
                          value={purchaseSearchQuery}
                          onChangeText={setPurchaseSearchQuery}
                        />
                        {purchaseSearchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setPurchaseSearchQuery('')}>
                            <X size={14} color="#64748B" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.filterPillRow}>
                        {(['ALL', 'PAID', 'DUE'] as const).map((st) => (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.filterPill,
                              purchaseStatusFilter === st && styles.filterPillActive,
                            ]}
                            onPress={() => setPurchaseStatusFilter(st)}
                          >
                            <Text
                              style={[
                                styles.filterPillText,
                                purchaseStatusFilter === st && styles.filterPillTextActive,
                              ]}
                            >
                              {st === 'ALL' ? `${t('all', 'All')} (${toDevanagari(9)})` : st === 'PAID' ? `${t('paid', 'Paid')} (${toDevanagari(7)})` : `${t('due', 'Due')} (${toDevanagari(2)})`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Full 11-column Purchase Report Data Table */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 170 }]}>{t('invoiceNumber', 'Invoice #')}</Text>
                          <Text style={[styles.rth, { width: 130 }]}>{t('date', 'Date')}</Text>
                          <Text style={[styles.rth, { width: 150 }]}>{t('supplier', 'Supplier')}</Text>
                          <Text style={[styles.rth, { width: 130 }]}>{t('gstin', 'GSTIN')}</Text>
                          <Text style={[styles.rth, { width: 140 }]}>{t('category', 'Category / Items')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('subtotal', 'Subtotal')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('cgst', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'right' }]}>{t('sgst', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'right' }]}>{t('igst', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 95, textAlign: 'right' }]}>{t('totalTax', 'Total Tax')}</Text>
                          <Text style={[styles.rth, { width: 115, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                          <Text style={[styles.rth, { width: 75, textAlign: 'center' }]}>{t('actionUpper', 'ACTION')}</Text>
                        </View>

                        {filteredPurchaseInvoices.map((row, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.reportTableRow}
                            onPress={() => setViewingPurchaseInvoice(row)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.rtd, { width: 170, fontWeight: '700', color: '#1F2937' }]}>
                              {row.inv}
                            </Text>
                            <Text style={[styles.rtd, { width: 130, color: '#6B7280' }]}>{translateDateString(row.date)}</Text>
                            <Text style={[styles.rtd, { width: 150, color: '#374151', fontWeight: '600' }]}>
                              {translateSupplierName(row.sup)}
                            </Text>
                            <Text style={[styles.rtd, { width: 130, color: '#0F766E', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10.5 }]}>
                              {row.gstin}
                            </Text>
                            <Text style={[styles.rtd, { width: 140, color: '#4B5563' }]} numberOfLines={1}>
                              {translateCategoryName(row.cat)}
                            </Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right' }]}>
                              ₹ {toDevanagari(row.taxable.toFixed(2))}
                            </Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right', color: '#16A34A', fontWeight: '600' }]}>
                              ₹ {toDevanagari(row.cgst.toFixed(2))}
                            </Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'right', color: '#16A34A', fontWeight: '600' }]}>
                              ₹ {toDevanagari(row.sgst.toFixed(2))}
                            </Text>
                            <Text style={[styles.rtd, { width: 80, textAlign: 'right', color: '#94A3B8' }]}>
                              ₹ {toDevanagari(row.igst.toFixed(2))}
                            </Text>
                            <Text style={[styles.rtd, { width: 95, textAlign: 'right', color: '#16A34A', fontWeight: '700' }]}>
                              ₹ {toDevanagari(row.totTax.toFixed(2))}
                            </Text>
                            <Text style={[styles.rtd, { width: 115, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>
                              ₹ {toDevanagari(row.tot.toFixed(2))}
                            </Text>
                            <View style={[styles.rtd, { width: 80, alignItems: 'center' }]}>
                              <View
                                style={[
                                  styles.paidBadge,
                                  row.status === 'Due' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.paidBadgeText,
                                    row.status === 'Due' && { color: '#DC2626' },
                                  ]}
                                >
                                  {row.status === 'Paid' ? t('paid', 'Paid') : t('due', 'Due')}
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.rtd, { width: 75, alignItems: 'center' }]}>
                              <TouchableOpacity
                                style={styles.viewInvBtn}
                                onPress={() => setViewingPurchaseInvoice(row)}
                              >
                                <Text style={styles.viewInvBtnText}>{t('view', 'View')}</Text>
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        ))}

                        {/* Grand Totals Row */}
                        <View style={[styles.reportTableRow, { backgroundColor: '#F9FAFB', borderTopWidth: 1.5, borderTopColor: '#CBD5E1' }]}>
                          <Text style={[styles.rtd, { width: 170, fontWeight: '800', color: '#111827' }]}>
                            {t('total', 'TOTAL')} ({toDevanagari(filteredPurchaseInvoices.length)})
                          </Text>
                          <Text style={[styles.rtd, { width: 130, color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 150, color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 130, color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 140, color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 110, textAlign: 'right', fontWeight: '800' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.taxable, 0).toFixed(2))}
                          </Text>
                          <Text style={[styles.rtd, { width: 90, textAlign: 'right', fontWeight: '800', color: '#16A34A' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.cgst, 0).toFixed(2))}
                          </Text>
                          <Text style={[styles.rtd, { width: 90, textAlign: 'right', fontWeight: '800', color: '#16A34A' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.sgst, 0).toFixed(2))}
                          </Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'right', fontWeight: '800' }]}>
                            ₹ {toDevanagari('0.00')}
                          </Text>
                          <Text style={[styles.rtd, { width: 95, textAlign: 'right', fontWeight: '900', color: '#16A34A' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.totTax, 0).toFixed(2))}
                          </Text>
                          <Text style={[styles.rtd, { width: 115, textAlign: 'right', fontWeight: '900', color: '#111827' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.tot, 0).toFixed(2))}
                          </Text>
                          <Text style={[styles.rtd, { width: 80, textAlign: 'center', color: '#9CA3AF' }]}>-</Text>
                          <Text style={[styles.rtd, { width: 75, textAlign: 'center', color: '#9CA3AF' }]}>-</Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* ----------------------------------------------------
                2. REPORT & KPI TAB (with Charts per user req)
            ---------------------------------------------------- */}
            {activeTab === 'reports' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('reportAndKpi', 'Reports & KPI Overview')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('businessAnalyticsReports', 'Revenue, sales, orders, and expense analytics')}
                    </Text>
                  </View>
                </View>

                {/* Expenses & Reports Sub-header */}
                <View style={styles.subReportBanner}>
                  <View>
                    <View style={styles.hotelFinanceBadge}>
                      <Text style={styles.hotelFinanceBadgeText}>{t('hotelFinance', 'HOTEL FINANCE')}</Text>
                    </View>
                    <Text style={styles.subReportTitle}>{t('expensesAndReports', 'Expenses & Reports')}</Text>
                    <Text style={styles.subReportSubtitle}>
                      {t('manageHotelExpenses', 'Manage your hotel expenses and view business insights')}
                    </Text>
                  </View>

                  <View style={styles.subReportActionButtons}>
                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      onPress={() => Alert.alert('Import Template', 'CSV template format:\nName,Category,Amount,Date,BranchCode,PaymentMode,Description')}
                    >
                      <Download size={13} color="#4B5563" />
                      <Text style={styles.outlineActionBtnText}>{t('import', 'Import')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      onPress={async () => {
                        const csvHeader = 'Name,Category,Amount,Date,BranchCode,PaymentMode,Description\n';
                        const csvRows = expenses.map(e => `"${e.name}","${e.category}",${e.amount},"${e.date}","${e.branchCode}","${e.paymentMode}","${e.description || ''}"`).join('\n');
                        await downloadAndShareCsv(`Hotel_Expenses_${Date.now()}.csv`, csvHeader + csvRows);
                      }}
                    >
                      <FileSpreadsheet size={13} color="#4B5563" />
                      <Text style={styles.outlineActionBtnText}>{t('export', 'Export')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      onPress={async () => {
                        const totalExp = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                        const html = buildExpenseReportHtml({
                          hotelName: hotelName || 'Royal Palace Hotel',
                          branchName: activeBranch?.name || 'Main Branch',
                          totalExpenses: totalExp,
                          expenses: expenses,
                        });
                        await downloadAndSharePdf('Hotel_Expense_Report', html);
                      }}
                    >
                      <Printer size={13} color="#4B5563" />
                      <Text style={styles.outlineActionBtnText}>{t('pdf', 'PDF')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 7 KPI Stat Cards (Matching Screenshot 2) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.kpiCardsRow}
                >
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('totalSales', 'TOTAL SALES')}</Text>
                    <Text style={styles.kpiCardVal}>₹ {toDevanagari('1,01,141.52')}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('totalExpenses', 'TOTAL EXPENSES')}</Text>
                    <Text style={styles.kpiCardVal}>₹ {toDevanagari('30,000.00')}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('netAmount', 'NET AMOUNT')}</Text>
                    <Text style={[styles.kpiCardVal, { color: '#DC2626' }]}>₹ -{toDevanagari('74,829.48')}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('profit', 'PROFIT')}</Text>
                    <Text style={[styles.kpiCardVal, { color: '#16A34A' }]}>₹ {toDevanagari('0.00')}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('loss', 'LOSS')}</Text>
                    <Text style={[styles.kpiCardVal, { color: '#DC2626' }]}>₹ {toDevanagari('74,829.48')}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('totalBills', 'TOTAL BILLS')}</Text>
                    <Text style={styles.kpiCardVal}>{toDevanagari(90)}</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiCardLabel}>{t('totalOrders', 'TOTAL ORDERS')}</Text>
                    <Text style={styles.kpiCardVal}>{toDevanagari(89)}</Text>
                  </View>
                </ScrollView>

                {/* Sub-tabs Row (5 Sub-tabs with Icons matching Screenshot 2) */}
                <View style={styles.subTabsStrip}>
                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      reportSubTab === 'expenses' && styles.subTabPillActive,
                    ]}
                    onPress={() => setReportSubTab('expenses')}
                  >
                    <Receipt
                      size={14}
                      color={reportSubTab === 'expenses' ? '#FFFFFF' : '#4B5563'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        reportSubTab === 'expenses' && styles.subTabPillTextActive,
                      ]}
                    >
                      {t('expenses', 'Expenses')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      reportSubTab === 'reports' && styles.subTabPillActive,
                    ]}
                    onPress={() => setReportSubTab('reports')}
                  >
                    <BarChart3
                      size={14}
                      color={reportSubTab === 'reports' ? '#FFFFFF' : '#4B5563'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        reportSubTab === 'reports' && styles.subTabPillTextActive,
                      ]}
                    >
                      {t('reports', 'Reports')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      reportSubTab === 'charts' && styles.subTabPillActive,
                    ]}
                    onPress={() => setReportSubTab('charts')}
                  >
                    <TrendingUp
                      size={14}
                      color={reportSubTab === 'charts' ? '#FFFFFF' : '#4B5563'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        reportSubTab === 'charts' && styles.subTabPillTextActive,
                      ]}
                    >
                      {t('charts', 'Charts')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      reportSubTab === 'gst-scale' && styles.subTabPillActive,
                    ]}
                    onPress={() => setReportSubTab('gst-scale')}
                  >
                    <FileSpreadsheet
                      size={14}
                      color={reportSubTab === 'gst-scale' ? '#FFFFFF' : '#4B5563'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        reportSubTab === 'gst-scale' && styles.subTabPillTextActive,
                      ]}
                    >
                      {t('scaleSummaryGst', 'Scale Summary GST Report')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      reportSubTab === 'purchase' && styles.subTabPillActive,
                    ]}
                    onPress={() => setReportSubTab('purchase')}
                  >
                    <ShoppingCart
                      size={14}
                      color={reportSubTab === 'purchase' ? '#FFFFFF' : '#4B5563'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        reportSubTab === 'purchase' && styles.subTabPillTextActive,
                      ]}
                    >
                      {t('purchase', 'Purchase')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* EXPENSES SUB-TAB */}
                {reportSubTab === 'expenses' && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.expenseSectionHeader}>
                      <View>
                        <Text style={styles.expenseListTitle}>{t('expenseList', 'Expense List')}</Text>
                        <Text style={styles.expenseListSubtitle}>
                          {t('viewManageExpenses', 'View and manage all hotel expenses')}
                        </Text>
                      </View>

                      <View style={styles.expenseActionRow}>
                        <View style={styles.expenseSearchWrap}>
                          <Search size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.expenseSearchInput}
                            placeholder={t('searchExpenses', 'Search expenses...')}
                            placeholderTextColor="#9CA3AF"
                            value={expenseSearch}
                            onChangeText={setExpenseSearch}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.addExpenseBtn}
                          onPress={handleOpenAddExpense}
                          activeOpacity={0.85}
                        >
                          <Plus size={14} color="#FFFFFF" />
                          <Text style={styles.addExpenseBtnText}>{t('addExpense', '+ Add Expense')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.expenseTable}>
                        <View style={styles.expenseTableHeader}>
                          <Text style={[styles.thCell, { width: 180 }]}>{t('expenseName', 'EXPENSE NAME')}</Text>
                          <Text style={[styles.thCell, { width: 140 }]}>{t('category', 'CATEGORY')}</Text>
                          <Text style={[styles.thCell, { width: 120 }]}>{t('amount', 'AMOUNT')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('date', 'DATE')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('branchCode', 'BRANCH CODE')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('paymentMode', 'PAYMENT MODE')}</Text>
                          <Text style={[styles.thCell, { width: 100, textAlign: 'center' }]}>{t('actionUpper', 'ACTION')}</Text>
                        </View>

                        {filteredExpenses.map((item) => (
                          <View key={item.id} style={styles.expenseTableRow}>
                            <View style={[styles.tdCell, { width: 180, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <Receipt size={14} color="#78716C" />
                              <Text style={styles.tdTextBold} numberOfLines={1}>
                                {translateExpenseName(item.name)}
                              </Text>
                            </View>

                            <View style={[styles.tdCell, { width: 140 }]}>
                              <View style={styles.categoryPill}>
                                <Text style={styles.categoryPillText} numberOfLines={1}>
                                  {translateCategoryName(item.category)}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.tdCell, { width: 120 }]}>
                              <Text style={styles.tdAmount}>
                                ₹ {toDevanagari(item.amount.toLocaleString('en-IN'))}.00
                              </Text>
                            </View>

                            <View style={[styles.tdCell, { width: 110 }]}>
                              <Text style={styles.tdDate}>{toDevanagari(item.date)}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 110 }]}>
                              <Text style={styles.tdBranch}>{toDevanagari(item.branchCode)}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <CreditCard size={12} color="#78716C" />
                              <Text style={styles.tdText}>{t(item.paymentMode.toLowerCase(), item.paymentMode)}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 100, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    translateExpenseName(item.name),
                                    `${t('category', 'Category')}: ${translateCategoryName(item.category)}\n${t('amount', 'Amount')}: ₹ ${toDevanagari(item.amount)}\n${t('date', 'Date')}: ${toDevanagari(item.date)}\n${t('branch', 'Branch')}: ${toDevanagari(item.branchCode)}\n${t('paymentMode', 'Payment')}: ${t(item.paymentMode.toLowerCase(), item.paymentMode)}`
                                  );
                                }}
                              >
                                <Eye size={14} color="#6B7280" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  setEditingExpense(item);
                                  setExpName(item.name);
                                  setExpCategory(item.category);
                                  setExpAmount(item.amount.toString());
                                  setExpDate(item.date);
                                  setExpBranch(item.branchCode);
                                  setExpMode(item.paymentMode);
                                  setShowAddExpenseModal(true);
                                }}
                              >
                                <Edit2 size={14} color="#EA580C" />
                              </TouchableOpacity>

                              <TouchableOpacity onPress={() => handleDeleteExpense(item.id)}>
                                <Trash2 size={14} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* CHARTS SUB-TAB: Interactive SVG Visual Charts */}
                {reportSubTab === 'charts' && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionSubHeading}>{t('charts', 'Revenue, Expenses & Profitability Charts')}</Text>

                    {/* Chart 1: Revenue vs Expense Bar Comparison */}
                    <View style={styles.chartCard}>
                      <Text style={styles.chartTitle}>{t('salesOverview', 'Revenue vs Expenses vs Profit')}</Text>
                      <View style={{ height: 180, justifyContent: 'flex-end', paddingTop: 10 }}>
                        <Svg width="100%" height="160" viewBox="0 0 320 160">
                          {/* Grid lines */}
                          <Path d="M 30 20 L 300 20 M 30 60 L 300 60 M 30 100 L 300 100 M 30 140 L 300 140" stroke="#E5E7EB" strokeWidth="1" />

                          {/* Bars */}
                          {/* Sales: ₹ 1,01,299 */}
                          <Rect x="50" y="25" width="45" height="115" fill="#16A34A" rx="4" />
                          <SvgText x="72" y="18" fill="#16A34A" fontSize="9" fontWeight="bold" textAnchor="middle">₹ {toDevanagari('1.01L')}</SvgText>

                          {/* Expenses: ₹ 30,000 */}
                          <Rect x="135" y="105" width="45" height="35" fill="#EF4444" rx="4" />
                          <SvgText x="157" y="98" fill="#EF4444" fontSize="9" fontWeight="bold" textAnchor="middle">₹ {toDevanagari('30K')}</SvgText>

                          {/* Net Profit: ₹ 71,299 */}
                          <Rect x="220" y="60" width="45" height="80" fill="#EA580C" rx="4" />
                          <SvgText x="242" y="53" fill="#EA580C" fontSize="9" fontWeight="bold" textAnchor="middle">₹ {toDevanagari('71.3K')}</SvgText>
                        </Svg>
                      </View>

                      <View style={styles.chartLegendRow}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                          <Text style={styles.legendText}>{t('totalSales', 'Total Sales')} (₹ {toDevanagari('1,01,299')})</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                          <Text style={styles.legendText}>{t('totalExpenses', 'Expenses')} (₹ {toDevanagari('30,000')})</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                          <Text style={styles.legendText}>{t('profit', 'Net Profit')} (₹ {toDevanagari('71,299')})</Text>
                        </View>
                      </View>
                    </View>

                    {/* Chart 2: Expense Breakdown by Category */}
                    <View style={[styles.chartCard, { marginTop: 14 }]}>
                      <Text style={styles.chartTitle}>{t('expenseSummary', 'Expense Category Distribution')}</Text>
                      <View style={{ gap: 10, marginTop: 12 }}>
                        {[
                          { cat: 'Electricity & Utilities', amt: '₹ 15,000.00', pct: 50, color: '#F59E0B' },
                          { cat: 'Kitchen Groceries / Raw Material', amt: '₹ 4,500.00', pct: 15, color: '#10B981' },
                          { cat: 'Cleaning & Maintenance', amt: '₹ 2,200.00', pct: 8, color: '#6366F1' },
                          { cat: 'Gas Cylinders', amt: '₹ 1,800.00', pct: 6, color: '#EC4899' },
                          { cat: 'Staff Delivery Cab / Travelling', amt: '₹ 500.00', pct: 2, color: '#06B6D4' },
                        ].map((item, idx) => (
                          <View key={idx}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#374151' }}>{translateCategoryName(item.cat)}</Text>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#111827' }}>{toDevanagari(item.amt)} ({toDevanagari(item.pct)}%)</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                              <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: 4 }} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* REPORTS SUB-TAB (Matching Screenshot 2) */}
                {reportSubTab === 'reports' && (
                  <View style={styles.kpiReportsContainer}>
                    {/* Left Reports Sub-Sidebar (Screenshot 2) */}
                    <View style={styles.kpiReportsSidebar}>
                      <Text style={styles.kpiReportsSidebarTitle}>{t('reports', 'Reports')}</Text>

                      <TouchableOpacity
                        style={[
                          styles.kpiReportItem,
                          kpiSelectedReport === 'sales' && styles.kpiReportItemActive,
                        ]}
                        onPress={() => setKpiSelectedReport('sales')}
                        activeOpacity={0.8}
                      >
                        <TrendingUp
                          size={15}
                          color={kpiSelectedReport === 'sales' ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.kpiReportItemText,
                            kpiSelectedReport === 'sales' && styles.kpiReportItemTextActive,
                          ]}
                        >
                          {t('salesReport', 'Sales Report')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.kpiReportItem,
                          kpiSelectedReport === 'expense' && styles.kpiReportItemActive,
                        ]}
                        onPress={() => setKpiSelectedReport('expense')}
                        activeOpacity={0.8}
                      >
                        <Receipt
                          size={15}
                          color={kpiSelectedReport === 'expense' ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.kpiReportItemText,
                            kpiSelectedReport === 'expense' && styles.kpiReportItemTextActive,
                          ]}
                        >
                          {t('expenseSummary', 'Expense Report')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.kpiReportItem,
                          kpiSelectedReport === 'order' && styles.kpiReportItemActive,
                        ]}
                        onPress={() => setKpiSelectedReport('order')}
                        activeOpacity={0.8}
                      >
                        <ShoppingCart
                          size={15}
                          color={kpiSelectedReport === 'order' ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.kpiReportItemText,
                            kpiSelectedReport === 'order' && styles.kpiReportItemTextActive,
                          ]}
                        >
                          {t('order', 'Order Report')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.kpiReportItem,
                          kpiSelectedReport === 'menu' && styles.kpiReportItemActive,
                        ]}
                        onPress={() => setKpiSelectedReport('menu')}
                        activeOpacity={0.8}
                      >
                        <UtensilsCrossed
                          size={15}
                          color={kpiSelectedReport === 'menu' ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.kpiReportItemText,
                            kpiSelectedReport === 'menu' && styles.kpiReportItemTextActive,
                          ]}
                        >
                          {t('menu', 'Menu Report')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.kpiReportItem,
                          kpiSelectedReport === 'branch' && styles.kpiReportItemActive,
                        ]}
                        onPress={() => setKpiSelectedReport('branch')}
                        activeOpacity={0.8}
                      >
                        <Building2
                          size={15}
                          color={kpiSelectedReport === 'branch' ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.kpiReportItemText,
                            kpiSelectedReport === 'branch' && styles.kpiReportItemTextActive,
                          ]}
                        >
                          {t('branches', 'Branch Report')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right Report Content Area */}
                    <View style={styles.kpiReportContentBox}>
                      {/* BRANCH REPORT (Screenshot 2 Match) */}
                      {kpiSelectedReport === 'branch' && (
                        <View>
                          <View style={styles.kpiReportHeaderRow}>
                            <Text style={styles.kpiReportMainTitle}>{t('branchReport', 'Branch Report')}</Text>
                            <View style={styles.kpiDatePillGroup}>
                              <TouchableOpacity
                                style={[
                                  styles.kpiDatePill,
                                  kpiReportDateFilter === 'today' && styles.kpiDatePillActive,
                                ]}
                                onPress={() => setKpiReportDateFilter('today')}
                              >
                                <Text
                                  style={[
                                    styles.kpiDatePillText,
                                    kpiReportDateFilter === 'today' && styles.kpiDatePillTextActive,
                                  ]}
                                >
                                  {t('today', 'Today')}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.kpiDatePill,
                                  kpiReportDateFilter === 'week' && styles.kpiDatePillActive,
                                ]}
                                onPress={() => setKpiReportDateFilter('week')}
                              >
                                <Text
                                  style={[
                                    styles.kpiDatePillText,
                                    kpiReportDateFilter === 'week' && styles.kpiDatePillTextActive,
                                  ]}
                                >
                                  {t('thisWeek', 'This Week')}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.kpiDatePill,
                                  kpiReportDateFilter === 'month' && styles.kpiDatePillActive,
                                ]}
                                onPress={() => setKpiReportDateFilter('month')}
                              >
                                <Text
                                  style={[
                                    styles.kpiDatePillText,
                                    kpiReportDateFilter === 'month' && styles.kpiDatePillTextActive,
                                  ]}
                                >
                                  {t('thisMonth', 'This Month')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.kpiReportSubRow}>
                            <Text style={styles.kpiReportSubText}>{t('branchPerformance', 'Branch performance')}</Text>
                            <Text style={styles.kpiReportSnapshotText}>
                              {t('snapshot', 'Snapshot')} • {kpiReportDateFilter === 'today' ? t('today', 'Today') : kpiReportDateFilter === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.kpiTableWrap}>
                              <View style={styles.kpiTableHeader}>
                                <Text style={[styles.kpiTh, { width: 180 }]}>{t('branchCol', 'BRANCH')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('totalSalesCol', 'TOTAL SALES')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('totalExpensesCol', 'TOTAL EXPENSES')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('netAmountCol', 'NET AMOUNT')}</Text>
                              </View>

                              <View style={styles.kpiTableRow}>
                                <Text style={[styles.kpiTd, { width: 180, fontWeight: '700', color: '#111827' }]}>
                                  {t('mainBranch', 'Main Branch')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, fontWeight: '700', color: '#111827' }]}>
                                  {toDevanagari('₹ 1,01,141.52')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#374151' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, fontWeight: '800', color: '#16A34A' }]}>
                                  {toDevanagari('₹ 1,01,141.52')}
                                </Text>
                              </View>

                              <View style={styles.kpiTableRow}>
                                <Text style={[styles.kpiTd, { width: 180, fontWeight: '600', color: '#4B5563' }]}>
                                  {t('cityCenter', 'City Center')} (MB-2)
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                              </View>

                              <View style={styles.kpiTableRow}>
                                <Text style={[styles.kpiTd, { width: 180, fontWeight: '600', color: '#4B5563' }]}>
                                  {t('highwayDining', 'Highway Dining')} (MB-3)
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                                <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>
                                  {toDevanagari('₹ 0.00')}
                                </Text>
                              </View>
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* SALES REPORT */}
                      {kpiSelectedReport === 'sales' && (
                        <View>
                          <View style={styles.kpiReportHeaderRow}>
                            <Text style={styles.kpiReportMainTitle}>{t('salesReport', 'Sales Report')}</Text>
                            <View style={styles.kpiDatePillGroup}>
                              {['today', 'week', 'month'].map((p) => (
                                <TouchableOpacity
                                  key={p}
                                  style={[
                                    styles.kpiDatePill,
                                    kpiReportDateFilter === p && styles.kpiDatePillActive,
                                  ]}
                                  onPress={() => setKpiReportDateFilter(p as any)}
                                >
                                  <Text
                                    style={[
                                      styles.kpiDatePillText,
                                      kpiReportDateFilter === p && styles.kpiDatePillTextActive,
                                    ]}
                                  >
                                    {p === 'today' ? t('today', 'Today') : p === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.kpiReportSubRow}>
                            <Text style={styles.kpiReportSubText}>{t('dailySalesReconciliation', 'Daily sales & revenue reconciliation')}</Text>
                            <Text style={styles.kpiReportSnapshotText}>
                              {t('total', 'Total')}: {toDevanagari('₹ 1,01,141.52')} ({toDevanagari(89)} {t('orders', 'Orders')})
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.kpiTableWrap}>
                              <View style={styles.kpiTableHeader}>
                                <Text style={[styles.kpiTh, { width: 150 }]}>{t('periodCol', 'PERIOD')}</Text>
                                <Text style={[styles.kpiTh, { width: 90 }]}>{t('ordersCol', 'ORDERS')}</Text>
                                <Text style={[styles.kpiTh, { width: 120 }]}>{t('cashCol', 'CASH')}</Text>
                                <Text style={[styles.kpiTh, { width: 130 }]}>{t('upiOnlineCol', 'UPI / ONLINE')}</Text>
                                <Text style={[styles.kpiTh, { width: 130 }]}>{t('grossSalesCol', 'GROSS SALES')}</Text>
                                <Text style={[styles.kpiTh, { width: 100 }]}>{t('gstCol', 'GST (5%)')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('netTotalCol', 'NET TOTAL')}</Text>
                              </View>

                              {[
                                { p: `${t('today', 'Today')} (${toDevanagari(26)} ${t('october', 'Oct')} ${toDevanagari(2026)})`, ord: 28, cash: 12400, upi: 18250, gross: 30650, gst: 1532.50, tot: 32182.50 },
                                { p: `${t('yesterday', 'Yesterday')} (${toDevanagari(25)} ${t('october', 'Oct')} ${toDevanagari(2026)})`, ord: 36, cash: 15700, upi: 22950, gross: 38650, gst: 1932.50, tot: 40582.50 },
                                { p: t('past7Days', 'Past 7 Days'), ord: 64, cash: 28100, upi: 41200, gross: 69300, gst: 3465.00, tot: 72765.00 },
                                { p: t('totalThisMonth', 'Total This Month'), ord: 89, cash: 45200, upi: 55941.52, gross: 101141.52, gst: 4429.02, tot: 105570.54 },
                              ].map((row, idx) => (
                                <View key={idx} style={styles.kpiTableRow}>
                                  <Text style={[styles.kpiTd, { width: 150, fontWeight: '700', color: '#111827' }]}>
                                    {row.p}
                                  </Text>
                                  <Text style={[styles.kpiTd, { width: 90, color: '#374151' }]}>{toDevanagari(row.ord)}</Text>
                                  <Text style={[styles.kpiTd, { width: 120, color: '#15803D' }]}>{toDevanagari('₹ ' + row.cash.toLocaleString('en-IN'))}</Text>
                                  <Text style={[styles.kpiTd, { width: 130, color: '#2563EB' }]}>{toDevanagari('₹ ' + row.upi.toLocaleString('en-IN'))}</Text>
                                  <Text style={[styles.kpiTd, { width: 130, fontWeight: '700' }]}>{toDevanagari('₹ ' + row.gross.toLocaleString('en-IN'))}</Text>
                                  <Text style={[styles.kpiTd, { width: 100, color: '#D97706' }]}>{toDevanagari('₹ ' + row.gst.toLocaleString('en-IN'))}</Text>
                                  <Text style={[styles.kpiTd, { width: 140, fontWeight: '800', color: '#111827' }]}>{toDevanagari('₹ ' + row.tot.toLocaleString('en-IN'))}</Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* EXPENSE REPORT */}
                      {kpiSelectedReport === 'expense' && (
                        <View>
                          <View style={styles.kpiReportHeaderRow}>
                            <Text style={styles.kpiReportMainTitle}>{t('expenseReport', 'Expense Report')}</Text>
                            <View style={styles.kpiDatePillGroup}>
                              {['today', 'week', 'month'].map((p) => (
                                <TouchableOpacity
                                  key={p}
                                  style={[
                                    styles.kpiDatePill,
                                    kpiReportDateFilter === p && styles.kpiDatePillActive,
                                  ]}
                                  onPress={() => setKpiReportDateFilter(p as any)}
                                >
                                  <Text
                                    style={[
                                      styles.kpiDatePillText,
                                      kpiReportDateFilter === p && styles.kpiDatePillTextActive,
                                    ]}
                                  >
                                    {p === 'today' ? t('today', 'Today') : p === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.kpiReportSubRow}>
                            <Text style={styles.kpiReportSubText}>{t('hotelOperationalExpensesSummary', 'Hotel operational expenses summary')}</Text>
                            <Text style={styles.kpiReportSnapshotText}>
                              {t('totalExpenses', 'Total Expenses')}: {toDevanagari('₹ 30,000.00')}
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.kpiTableWrap}>
                              <View style={styles.kpiTableHeader}>
                                <Text style={[styles.kpiTh, { width: 180 }]}>{t('categoryCol', 'CATEGORY')}</Text>
                                <Text style={[styles.kpiTh, { width: 90 }]}>{t('itemsCol', 'ITEMS')}</Text>
                                <Text style={[styles.kpiTh, { width: 130 }]}>{t('paymentModesCol', 'PAYMENT MODES')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('totalAmountCol', 'TOTAL AMOUNT')}</Text>
                                <Text style={[styles.kpiTh, { width: 110 }]}>{t('shareCol', 'SHARE (%)')}</Text>
                              </View>

                              {[
                                { cat: 'Electricity & Utilities', count: 1, mode: 'Cash', amt: 15000, pct: '50.0%' },
                                { cat: 'Food / Raw Material', count: 3, mode: 'UPI / Cash', amt: 9500, pct: '31.7%' },
                                { cat: 'Cleaning & Maintenance', count: 1, mode: 'UPI', amt: 3200, pct: '10.7%' },
                                { cat: 'Transportation & Cab', count: 1, mode: 'Cash', amt: 1800, pct: '6.0%' },
                                { cat: 'Gas Cylinder Refill', count: 1, mode: 'Cash', amt: 500, pct: '1.6%' },
                              ].map((row, idx) => (
                                <View key={idx} style={styles.kpiTableRow}>
                                  <Text style={[styles.kpiTd, { width: 180, fontWeight: '700', color: '#111827' }]}>
                                    {translateCategoryName(row.cat)}
                                  </Text>
                                  <Text style={[styles.kpiTd, { width: 90, color: '#374151' }]}>{toDevanagari(row.count)}</Text>
                                  <Text style={[styles.kpiTd, { width: 130, color: '#4B5563' }]}>{row.mode === 'Cash' ? t('cash', 'Cash') : row.mode === 'UPI' ? t('upi', 'UPI') : (language === 'mr' ? 'यूपीआय / रोख' : language === 'hi' ? 'यूपीआई / नकद' : 'UPI / Cash')}</Text>
                                  <Text style={[styles.kpiTd, { width: 140, fontWeight: '700', color: '#DC2626' }]}>
                                    {toDevanagari('₹ ' + row.amt.toLocaleString('en-IN') + '.00')}
                                  </Text>
                                  <Text style={[styles.kpiTd, { width: 110, fontWeight: '800', color: '#4B5563' }]}>
                                    {toDevanagari(row.pct)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* ORDER REPORT */}
                      {kpiSelectedReport === 'order' && (
                        <View>
                          <View style={styles.kpiReportHeaderRow}>
                            <Text style={styles.kpiReportMainTitle}>{t('orderReport', 'Order Report')}</Text>
                            <View style={styles.kpiDatePillGroup}>
                              {['today', 'week', 'month'].map((p) => (
                                <TouchableOpacity
                                  key={p}
                                  style={[
                                    styles.kpiDatePill,
                                    kpiReportDateFilter === p && styles.kpiDatePillActive,
                                  ]}
                                  onPress={() => setKpiReportDateFilter(p as any)}
                                >
                                  <Text
                                    style={[
                                      styles.kpiDatePillText,
                                      kpiReportDateFilter === p && styles.kpiDatePillTextActive,
                                    ]}
                                  >
                                    {p === 'today' ? t('today', 'Today') : p === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.kpiReportSubRow}>
                            <Text style={styles.kpiReportSubText}>{t('orderChannelsFulfillmentSummary', 'Order channels fulfillment summary')}</Text>
                            <Text style={styles.kpiReportSnapshotText}>
                              {t('totalOrders', 'Total Orders')}: {toDevanagari(89)} | {t('bills', 'Bills')}: {toDevanagari(90)}
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.kpiTableWrap}>
                              <View style={styles.kpiTableHeader}>
                                <Text style={[styles.kpiTh, { width: 180 }]}>{t('channelTypeCol', 'CHANNEL / TYPE')}</Text>
                                <Text style={[styles.kpiTh, { width: 110 }]}>{t('totalOrders', 'TOTAL ORDERS')}</Text>
                                <Text style={[styles.kpiTh, { width: 110 }]}>{t('completedCol', 'COMPLETED')}</Text>
                                <Text style={[styles.kpiTh, { width: 130 }]}>{t('avgBillValueCol', 'AVG BILL VALUE')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('revenueCol', 'REVENUE')}</Text>
                              </View>

                              {[
                                { channel: t('dineInTables', 'Dine-In Tables'), ord: 52, comp: 52, avg: 1180, rev: 61360 },
                                { channel: t('takeawayCounters', 'Takeaway Counters'), ord: 24, comp: 24, avg: 890, rev: 21360 },
                                { channel: t('deliveryPartners', 'Delivery Partners (Zomato/Swiggy)'), ord: 13, comp: 13, avg: 1417, rev: 18421.52 },
                              ].map((row, idx) => (
                                <View key={idx} style={styles.kpiTableRow}>
                                  <Text style={[styles.kpiTd, { width: 180, fontWeight: '700', color: '#111827' }]}>
                                    {row.channel}
                                  </Text>
                                  <Text style={[styles.kpiTd, { width: 110, color: '#374151' }]}>{toDevanagari(row.ord)}</Text>
                                  <Text style={[styles.kpiTd, { width: 110, color: '#16A34A', fontWeight: '700' }]}>{toDevanagari(row.comp)}</Text>
                                  <Text style={[styles.kpiTd, { width: 130, color: '#4B5563' }]}>{toDevanagari('₹ ' + row.avg.toLocaleString('en-IN'))}</Text>
                                  <Text style={[styles.kpiTd, { width: 140, fontWeight: '800', color: '#111827' }]}>
                                    {toDevanagari('₹ ' + row.rev.toLocaleString('en-IN'))}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* MENU REPORT */}
                      {kpiSelectedReport === 'menu' && (
                        <View>
                          <View style={styles.kpiReportHeaderRow}>
                            <Text style={styles.kpiReportMainTitle}>{t('menuReport', 'Menu Report')}</Text>
                            <View style={styles.kpiDatePillGroup}>
                              {['today', 'week', 'month'].map((p) => (
                                <TouchableOpacity
                                  key={p}
                                  style={[
                                    styles.kpiDatePill,
                                    kpiReportDateFilter === p && styles.kpiDatePillActive,
                                  ]}
                                  onPress={() => setKpiReportDateFilter(p as any)}
                                >
                                  <Text
                                    style={[
                                      styles.kpiDatePillText,
                                      kpiReportDateFilter === p && styles.kpiDatePillTextActive,
                                    ]}
                                  >
                                    {p === 'today' ? t('today', 'Today') : p === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={styles.kpiReportSubRow}>
                            <Text style={styles.kpiReportSubText}>{t('topSellingDishesRevenue', 'Top selling dishes & menu category revenue')}</Text>
                            <Text style={styles.kpiReportSnapshotText}>
                              {t('top5KitchenDishes', 'Top 5 Kitchen Dishes')}
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.kpiTableWrap}>
                              <View style={styles.kpiTableHeader}>
                                <Text style={[styles.kpiTh, { width: 190 }]}>{t('itemNameCol', 'ITEM NAME')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('categoryCol', 'CATEGORY')}</Text>
                                <Text style={[styles.kpiTh, { width: 90 }]}>{t('qtySoldCol', 'QTY SOLD')}</Text>
                                <Text style={[styles.kpiTh, { width: 100 }]}>{t('rateCol', 'RATE')}</Text>
                                <Text style={[styles.kpiTh, { width: 140 }]}>{t('totalRevenueCol', 'TOTAL REVENUE')}</Text>
                              </View>

                              {[
                                { item: 'Paneer Butter Masala', cat: 'Main Course', qty: 142, rate: 240, rev: 34080 },
                                { item: 'Chicken Biryani (Dum)', cat: 'Rice & Biryani', qty: 118, rate: 280, rev: 33040 },
                                { item: 'Dal Tadka Special', cat: 'Dal & Lentils', qty: 96, rate: 160, rev: 15360 },
                                { item: 'Tandoori Butter Roti', cat: 'Breads', qty: 480, rate: 25, rev: 12000 },
                                { item: 'Cold Drinks & Beverages', cat: 'Beverages', qty: 110, rate: 60, rev: 6661.52 },
                              ].map((row, idx) => (
                                <View key={idx} style={styles.kpiTableRow}>
                                  <Text style={[styles.kpiTd, { width: 190, fontWeight: '700', color: '#111827' }]}>
                                    {translateItemName(row.item)}
                                  </Text>
                                  <Text style={[styles.kpiTd, { width: 140, color: '#6B7280' }]}>{translateCategoryName(row.cat)}</Text>
                                  <Text style={[styles.kpiTd, { width: 90, fontWeight: '700', color: '#EA580C' }]}>{toDevanagari(row.qty)}</Text>
                                  <Text style={[styles.kpiTd, { width: 100, color: '#374151' }]}>{toDevanagari('₹ ' + row.rate)}</Text>
                                  <Text style={[styles.kpiTd, { width: 140, fontWeight: '800', color: '#111827' }]}>
                                    {toDevanagari('₹ ' + row.rev.toLocaleString('en-IN'))}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* SCALE SUMMARY GST REPORT SUB-TAB */}
                {reportSubTab === 'gst-scale' && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.reportHeaderActionsRow}>
                      <View>
                        <Text style={styles.reportSectionHeading}>{t('scaleSummaryGst', 'Scale Summary GST Report')}</Text>
                        <Text style={styles.subReportSubtitle}>
                          {t('gstScaleSubtitle', 'Government GST scale classification, turnover and tax liability breakdown')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.exportCsvBtn}
                          onPress={async () => {
                            const csv = 'GST Rate Slab,Taxable Value,CGST,SGST,IGST,Total Tax,Gross Amount\n' +
                              '5% GST Slabs,101141.52,2528.54,2528.54,0.00,5057.08,106198.60\n' +
                              '12% GST Slabs,6993.48,419.61,419.61,0.00,839.22,7832.70\n' +
                              '18% GST Slabs,0.00,0.00,0.00,0.00,0.00,0.00\n';
                            await downloadAndShareCsv(`Scale_Summary_GST_${Date.now()}.csv`, csv);
                          }}
                        >
                          <Download size={13} color="#059669" />
                          <Text style={styles.exportCsvBtnText}>{t('exportCsv', 'Export CSV')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.printPdfBtn}
                          onPress={async () => {
                            const html = buildGstTaxReportHtml({
                              hotelName: hotelName || 'Royal Palace Hotel',
                              branchName: activeBranch?.name || 'Main Branch',
                              totalTurnover: 108135.00,
                              totalTax: 5896.30,
                              cgst: 2948.15,
                              sgst: 2948.15,
                              invoices: [
                                { inv: 'INV-1792044802371', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                                { inv: 'INV-1792044802370', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                                { inv: 'INV-1792044802369', date: '26 Oct 2026', cust: 'Prasad Ghongte', sub: 1630, cgst: 40.75, sgst: 40.75, tgst: 81.50, tot: 1711.50, status: 'Paid' },
                                { inv: 'INV-1792044802368', date: '24 Oct 2026', cust: 'Sachin Tendulkar', sub: 360, cgst: 9.00, sgst: 9.00, tgst: 18.00, tot: 378.00, status: 'Paid' },
                              ],
                            });
                            await downloadAndSharePdf('Scale_Summary_GST_Report', html);
                          }}
                        >
                          <Printer size={13} color="#FFFFFF" />
                          <Text style={styles.printPdfBtnText}>{t('printPdf', 'Print / PDF')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 6 Summary Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>{toDevanagari('₹ 1,08,135.00')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('outputCgst', 'OUTPUT CGST (2.5%)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 2,214.51')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('outputSgst', 'OUTPUT SGST (2.5%)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 2,214.51')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('outputIgst', 'OUTPUT IGST (5%)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#0284C7' }]}>{toDevanagari('₹ 0.00')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalOutputGst', 'TOTAL OUTPUT GST')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 4,429.02')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('netTaxPayable', 'NET TAX PAYABLE')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#DC2626' }]}>{toDevanagari('₹ 1,006.52')}</Text>
                      </View>
                    </ScrollView>

                    {/* Scale Summary Rate Table */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 110 }]}>{t('slabRateCol', 'SLAB RATE')}</Text>
                          <Text style={[styles.rth, { width: 220 }]}>{t('descriptionCol', 'DESCRIPTION')}</Text>
                          <Text style={[styles.rth, { width: 140, textAlign: 'right' }]}>{t('taxableTurnoverCol', 'TAXABLE TURNOVER')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('cgstCol', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('sgstCol', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('igstCol', 'IGST')}</Text>
                          <Text style={[styles.rth, { width: 120, textAlign: 'right' }]}>{t('totalTaxCol', 'TOTAL TAX')}</Text>
                          <Text style={[styles.rth, { width: 90, textAlign: 'center' }]}>{t('invoicesCol', 'INVOICES')}</Text>
                        </View>

                        {[
                          { slab: '5% Slab', desc: 'Restaurant Dining & Food Services', turnover: 88580.40, cgst: 2214.51, sgst: 2214.51, igst: 0, tax: 4429.02, invs: 78 },
                          { slab: '12% Slab', desc: 'Packaged Drinks & Sweets', turnover: 12000.00, cgst: 720.00, sgst: 720.00, igst: 0, tax: 1440.00, invs: 8 },
                          { slab: '18% Slab', desc: 'Banquet Hall & Event Catering', turnover: 7554.60, cgst: 679.91, sgst: 679.91, igst: 0, tax: 1359.82, invs: 4 },
                          { slab: 'Total', desc: 'Consolidated All Active Business Slabs', turnover: 108135.00, cgst: 3614.42, sgst: 3614.42, igst: 0, tax: 7228.84, invs: 90 },
                        ].map((row, idx) => (
                          <View key={idx} style={[styles.reportTableRow, row.slab === 'Total' && { backgroundColor: '#F9FAFB', borderTopWidth: 2, borderTopColor: '#E5E7EB' }]}>
                            <Text style={[styles.rtd, { width: 110, fontWeight: '800', color: row.slab === 'Total' ? '#111827' : '#C2410C' }]}>
                              {row.slab === 'Total' ? t('total', 'Total') : toDevanagari(row.slab.replace('Slab', language === 'mr' ? 'स्लॅब' : language === 'hi' ? 'स्लैब' : 'Slab'))}
                            </Text>
                            <Text style={[styles.rtd, { width: 220, color: '#374151', fontWeight: row.slab === 'Total' ? '700' : '500' }]}>
                              {row.desc === 'Restaurant Dining & Food Services' ? t('restaurantDiningDesc', 'Restaurant Dining & Food Services') :
                               row.desc === 'Packaged Drinks & Sweets' ? t('packagedDrinksDesc', 'Packaged Drinks & Sweets') :
                               row.desc === 'Banquet Hall & Event Catering' ? t('banquetHallDesc', 'Banquet Hall & Event Catering') :
                               row.desc === 'Consolidated All Active Business Slabs' ? t('consolidatedSlabsDesc', 'Consolidated All Active Business Slabs') :
                               t(row.desc, row.desc)}
                            </Text>
                            <Text style={[styles.rtd, { width: 140, textAlign: 'right', fontWeight: '700' }]}>
                              {toDevanagari('₹ ' + row.turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', color: '#16A34A' }]}>
                              {toDevanagari('₹ ' + row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', color: '#16A34A' }]}>
                              {toDevanagari('₹ ' + row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 100, textAlign: 'right', color: '#0284C7' }]}>
                              {toDevanagari('₹ ' + row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 120, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>
                              {toDevanagari('₹ ' + row.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 90, textAlign: 'center', fontWeight: '700' }]}>
                              {toDevanagari(row.invs)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* PURCHASE REPORT SUB-TAB */}
                {reportSubTab === 'purchase' && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.reportHeaderActionsRow}>
                      <View>
                        <Text style={styles.reportSectionHeading}>{t('purchaseReport', 'Purchase Report')}</Text>
                        <Text style={styles.subReportSubtitle}>
                          {t('purchaseReportSubtitle', 'Raw materials, kitchen procurement invoices and input tax credits (ITC)')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.exportCsvBtn}
                          onPress={async () => {
                            const header = 'Invoice,PO,Date,Supplier,GSTIN,Category,Taxable,CGST,SGST,TotalTax,Total,Status\n';
                            const rows = PURCHASE_REPORT_DATA.map(p =>
                              `"${p.inv}","${p.po}","${p.date}","${p.sup}","${p.gstin}","${p.cat}",${p.taxable},${p.cgst},${p.sgst},${p.totTax},${p.tot},"${p.status}"`
                            ).join('\n');
                            await downloadAndShareCsv(`Purchase_Invoices_Report_${Date.now()}.csv`, header + rows);
                          }}
                        >
                          <Download size={13} color="#059669" />
                          <Text style={styles.exportCsvBtnText}>{t('exportCsv', 'Export CSV')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.printPdfBtn}
                          onPress={async () => {
                            const html = buildPurchaseReportHtml({
                              hotelName: hotelName || 'Royal Palace Hotel',
                              branchName: activeBranch?.name || 'Main Branch',
                              totalPurchases: 105582.50,
                              invoices: PURCHASE_REPORT_DATA,
                            });
                            await downloadAndSharePdf('Purchase_Invoices_Report', html);
                          }}
                        >
                          <Printer size={13} color="#FFFFFF" />
                          <Text style={styles.printPdfBtnText}>{t('printPdf', 'Print / PDF')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 6 Purchase Stat Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstStatsRow}>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalPurchases', 'TOTAL PURCHASES')}</Text>
                        <Text style={styles.gstStatVal}>{toDevanagari('₹ 1,05,582.50')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('taxableValue', 'TAXABLE VALUE')}</Text>
                        <Text style={styles.gstStatVal}>{toDevanagari('₹ 1,00,550.00')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('inputCgst', 'INPUT CGST (2.5%)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 2,516.25')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('inputSgst', 'INPUT SGST (2.5%)')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 2,516.25')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('totalItcCredit', 'TOTAL ITC CREDIT')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#16A34A' }]}>{toDevanagari('₹ 5,032.50')}</Text>
                      </View>
                      <View style={styles.gstStatCard}>
                        <Text style={styles.gstStatLabel}>{t('paidDueBills', 'PAID / DUE BILLS')}</Text>
                        <Text style={[styles.gstStatVal, { color: '#2563EB' }]}>{toDevanagari(7)} {t('paid', 'Paid')} / {toDevanagari(2)} {t('due', 'Due')}</Text>
                      </View>
                    </ScrollView>

                    {/* Search & Status Filter Bar */}
                    <View style={styles.purchaseFilterBar}>
                      <View style={styles.purchaseSearchBox}>
                        <Search size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.purchaseSearchInput}
                          placeholder={t('searchPurchasePlaceholder', 'Search invoice #, supplier or category...')}
                          placeholderTextColor="#9CA3AF"
                          value={purchaseSearchQuery}
                          onChangeText={setPurchaseSearchQuery}
                        />
                      </View>

                      <View style={styles.statusPillsRow}>
                        {(['ALL', 'PAID', 'DUE'] as const).map((st) => (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.statusFilterPill,
                              purchaseStatusFilter === st && styles.statusFilterPillActive,
                            ]}
                            onPress={() => setPurchaseStatusFilter(st)}
                          >
                            <Text
                              style={[
                                styles.statusFilterPillText,
                                purchaseStatusFilter === st && styles.statusFilterPillTextActive,
                              ]}
                            >
                              {st === 'ALL' ? `${t('all', 'All')} (${toDevanagari(9)})` : st === 'PAID' ? `${t('paid', 'Paid')} (${toDevanagari(7)})` : `${t('due', 'Due')} (${toDevanagari(2)})`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* 11-column Purchase Report Table with clickable rows */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                      <View style={styles.reportTable}>
                        <View style={styles.reportTableHeader}>
                          <Text style={[styles.rth, { width: 140 }]}>{t('invoiceNumber', 'Invoice #')}</Text>
                          <Text style={[styles.rth, { width: 140 }]}>{t('poNumber', 'PO Number')}</Text>
                          <Text style={[styles.rth, { width: 120 }]}>{t('date', 'Date')}</Text>
                          <Text style={[styles.rth, { width: 160 }]}>{t('supplier', 'Supplier')}</Text>
                          <Text style={[styles.rth, { width: 140 }]}>{t('category', 'Category')}</Text>
                          <Text style={[styles.rth, { width: 100, textAlign: 'right' }]}>{t('taxable', 'Taxable')}</Text>
                          <Text style={[styles.rth, { width: 85, textAlign: 'right' }]}>{t('cgstCol', 'CGST')}</Text>
                          <Text style={[styles.rth, { width: 85, textAlign: 'right' }]}>{t('sgstCol', 'SGST')}</Text>
                          <Text style={[styles.rth, { width: 95, textAlign: 'right' }]}>{t('totalGst', 'Total GST')}</Text>
                          <Text style={[styles.rth, { width: 110, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
                          <Text style={[styles.rth, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                        </View>

                        {filteredPurchaseInvoices.map((row, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.reportTableRow}
                            onPress={() => setViewingPurchaseInvoice(row)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.rtd, { width: 140, fontWeight: '700', color: '#1D4ED8' }]}>
                              {row.inv}
                            </Text>
                            <Text style={[styles.rtd, { width: 140, color: '#4B5563' }]}>
                              {toDevanagari(row.po)}
                            </Text>
                            <Text style={[styles.rtd, { width: 120, color: '#6B7280' }]}>
                              {translateDateString(row.date)}
                            </Text>
                            <Text style={[styles.rtd, { width: 160, color: '#1F2937', fontWeight: '600' }]}>
                              {translateSupplierName(row.sup)}
                            </Text>
                            <Text style={[styles.rtd, { width: 140, color: '#4B5563' }]}>
                              {translateCategoryName(row.cat)}
                            </Text>
                            <Text style={[styles.rtd, { width: 100, textAlign: 'right' }]}>
                              {toDevanagari('₹ ' + row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 85, textAlign: 'right', color: '#16A34A' }]}>
                              {toDevanagari('₹ ' + row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 85, textAlign: 'right', color: '#16A34A' }]}>
                              {toDevanagari('₹ ' + row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 95, textAlign: 'right', color: '#16A34A' }]}>
                              {toDevanagari('₹ ' + row.totTax.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <Text style={[styles.rtd, { width: 110, textAlign: 'right', fontWeight: '800', color: '#111827' }]}>
                              {toDevanagari('₹ ' + row.tot.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                            </Text>
                            <View style={[styles.rtd, { width: 80, alignItems: 'center' }]}>
                              <View
                                style={[
                                  styles.paidBadge,
                                  row.status === 'Due' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.paidBadgeText,
                                    row.status === 'Due' && { color: '#DC2626' },
                                  ]}
                                >
                                  {translateStatus(row.status)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* ----------------------------------------------------
                3. LICENCE & SUBSCRIPTION TAB (Fully Working)
            ---------------------------------------------------- */}
            {/* ----------------------------------------------------
                3. LICENCE & SUBSCRIPTION TAB (Fully Working)
            ---------------------------------------------------- */}
            {activeTab === 'licence' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('licenceAndSubscription', 'Licence & Subscription')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('enterpriseLicenceTrial', 'Enterprise subscription management, feature unlocks, and plan renewals.')}
                    </Text>
                  </View>
                  <View style={styles.systemBadge}>
                    <Text style={styles.systemBadgeText}>LICENCE</Text>
                  </View>
                </View>

                {/* Current Active Plan Status Card */}
                <View style={styles.activePlanCard}>
                  <View style={styles.activePlanHeader}>
                    <View style={styles.activePlanIconBox}>
                      <Shield size={22} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.activePlanName}>{activePlanName} Enterprise License</Text>
                        <View style={styles.heroActiveBadge}>
                          <Text style={styles.heroActiveBadgeText}>{t('active', 'Active')}</Text>
                        </View>
                      </View>
                      <Text style={styles.activePlanSub}>
                        {toDevanagari(daysRemaining)} {t('daysRemaining', 'Days remaining')}. Unlimited branches, thermal printing & GST reports active.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activePlanActions}>
                    <TouchableOpacity
                      style={styles.renewBtn}
                      onPress={handleRenewLicense}
                    >
                      <RotateCcw size={14} color="#FFFFFF" />
                      <Text style={styles.renewBtnText}>{t('renewLicense28Days', 'Renew 28-Day License')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.upgradeBtn}
                      onPress={() => setShowUpgradeModal(true)}
                    >
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.upgradeBtnText}>{t('upgradePlan', 'Upgrade Plan')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3 Tier Plan Comparison Cards */}
                <Text style={[styles.sectionSubHeading, { marginTop: 20 }]}>{t('availableSubscriptionPlans', 'Available Subscription Plans')}</Text>
                <View style={styles.plansGrid}>
                  {/* Plan 1: Free Trial */}
                  <View style={styles.planCard}>
                    <Text style={styles.planBadgeText}>STARTER</Text>
                    <Text style={styles.planCardTitle}>{t('starterFreeTrialTitle', '28-Day Free Trial')}</Text>
                    <Text style={styles.planPriceText}>₹ {toDevanagari(0)} <Text style={styles.planPeriodText}>/ {toDevanagari(28)} {t('daysLower', 'days')}</Text></Text>
                    <Text style={styles.planDescText}>Basic hotel billing, KOT printing, and single counter support.</Text>

                    <TouchableOpacity
                      style={[styles.planBtn, activePlanName === 'Trial' && styles.planBtnCurrent]}
                      onPress={() => handleActivatePlan('Trial')}
                      disabled={activePlanName === 'Trial'}
                    >
                      <Text style={[styles.planBtnText, activePlanName === 'Trial' && styles.planBtnTextCurrent]}>
                        {activePlanName === 'Trial' ? t('currentPlan', 'Current Plan') : 'Select Starter'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Plan 2: Pro Annual */}
                  <View style={styles.planCard}>
                    <Text style={[styles.planBadgeText, { color: '#0284C7' }]}>POPULAR</Text>
                    <Text style={styles.planCardTitle}>{t('proEdition', 'Pro Edition')}</Text>
                    <Text style={styles.planPriceText}>₹ {toDevanagari('7,999')} <Text style={styles.planPeriodText}>/ year</Text></Text>
                    <Text style={styles.planDescText}>Multi-counter billing, 80mm thermal receipt printing, and WhatsApp receipts.</Text>

                    <TouchableOpacity
                      style={[styles.planBtn, activePlanName === 'Pro' ? styles.planBtnCurrent : { backgroundColor: '#0284C7' }]}
                      onPress={() => handleActivatePlan('Pro')}
                    >
                      <Text style={[styles.planBtnText, activePlanName === 'Pro' && styles.planBtnTextCurrent]}>
                        {activePlanName === 'Pro' ? t('currentPlan', 'Current Plan') : t('upgradeToPro', 'Upgrade to Pro')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Plan 3: Enterprise Suite */}
                  <View style={[styles.planCard, { borderColor: '#FED7AA', backgroundColor: '#FFFDF9' }]}>
                    <Text style={[styles.planBadgeText, { color: '#EA580C' }]}>RECOMMENDED</Text>
                    <Text style={styles.planCardTitle}>{t('enterpriseSuite', 'Enterprise Suite')}</Text>
                    <Text style={styles.planPriceText}>₹ {toDevanagari('14,999')} <Text style={styles.planPeriodText}>/ year</Text></Text>
                    <Text style={styles.planDescText}>Unlimited branches, GSTR-1/2/3B compliance, multi-user role security & cloud sync.</Text>

                    <TouchableOpacity
                      style={[styles.planBtn, activePlanName === 'Enterprise' ? styles.planBtnCurrent : { backgroundColor: '#EA580C' }]}
                      onPress={() => handleActivatePlan('Enterprise')}
                    >
                      <Text style={[styles.planBtnText, activePlanName === 'Enterprise' && styles.planBtnTextCurrent]}>
                        {activePlanName === 'Enterprise' ? t('currentPlan', 'Current Plan') : t('activateEnterprise', 'Activate Enterprise')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ----------------------------------------------------
                4. NOTIFICATIONS TAB (Screenshot 1 Match)
            ---------------------------------------------------- */}
            {activeTab === 'notifications' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('notifications', 'Notification Settings')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('alertsAndNotifications', 'Control alerts and notifications for important hotel activities.')}
                    </Text>
                  </View>
                  <View style={styles.alertsBadge}>
                    <Text style={styles.alertsBadgeText}>ALERTS</Text>
                  </View>
                </View>

                <View style={styles.toggleList}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('paymentReceived', 'Payment Received')}</Text>
                      <Text style={styles.toggleSub}>{t('paymentReceivedDesc', 'Receive notification when a payment is received.')}</Text>
                    </View>
                    <Switch
                      value={notifPaymentReceived}
                      onValueChange={setNotifPaymentReceived}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('paymentFailed', 'Payment Failed')}</Text>
                      <Text style={styles.toggleSub}>{t('paymentFailedDesc', 'Receive alert when a payment fails.')}</Text>
                    </View>
                    <Switch
                      value={notifPaymentFailed}
                      onValueChange={setNotifPaymentFailed}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('lowInventoryAlert', 'Low Inventory')}</Text>
                      <Text style={styles.toggleSub}>{t('lowInventoryAlertDesc', 'Receive alert when Inventory reaches a low level.')}</Text>
                    </View>
                    <Switch
                      value={notifLowInventory}
                      onValueChange={setNotifLowInventory}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('maintenanceAlert', 'Maintenance Alert')}</Text>
                      <Text style={styles.toggleSub}>{t('maintenanceAlertDesc', 'Receive alerts related to system maintenance.')}</Text>
                    </View>
                    <Switch
                      value={notifMaintenanceAlert}
                      onValueChange={setNotifMaintenanceAlert}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('emailNotifications', 'Email Notifications')}</Text>
                      <Text style={styles.toggleSub}>{t('emailNotificationsDesc', 'Receive daily sales reports via email.')}</Text>
                    </View>
                    <Switch
                      value={notifEmail}
                      onValueChange={setNotifEmail}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('smsAlerts', 'SMS Notifications')}</Text>
                      <Text style={styles.toggleSub}>{t('smsAlertsDesc', 'Receive urgent security and billing alerts via SMS.')}</Text>
                    </View>
                    <Switch
                      value={notifSms}
                      onValueChange={setNotifSms}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetNotifications}
                  >
                    <Text style={styles.resetButtonText}>{t('resetSection', 'Reset Section')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveNotifications}
                  >
                    <Text style={styles.saveButtonText}>{t('saveChanges', 'Save Changes')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ----------------------------------------------------
                5. BILLING TAB (Screenshot 2 Match)
            ---------------------------------------------------- */}
            {activeTab === 'billing' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('billing', 'Billing Settings')}</Text>
                    <Text style={styles.cardSubtitle}>{t('invoicePreferences', 'Manage invoice preferences.')}</Text>
                  </View>
                  <View style={styles.billingBadge}>
                    <Text style={styles.billingBadgeText}>{t('billing', 'Billing')}</Text>
                  </View>
                </View>

                <View style={styles.toggleList}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('taxCalculation', 'Enable Tax')}</Text>
                      <Text style={styles.toggleSub}>{t('taxCalculationDesc', 'Apply tax automatically to Invoices.')}</Text>
                    </View>
                    <Switch
                      value={enableTax}
                      onValueChange={setEnableTax}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('discountApplication', 'Enable Discount')}</Text>
                      <Text style={styles.toggleSub}>{t('discountApplicationDesc', 'Allow discounts while creating invoices.')}</Text>
                    </View>
                    <Switch
                      value={enableDiscount}
                      onValueChange={setEnableDiscount}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('roundOffAmount', 'Enable Round Off')}</Text>
                      <Text style={styles.toggleSub}>{t('roundOffAmountDesc', 'Round invoice totals automatically.')}</Text>
                    </View>
                    <Switch
                      value={enableRoundOff}
                      onValueChange={setEnableRoundOff}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetBilling}
                  >
                    <Text style={styles.resetButtonText}>{t('resetSection', 'Reset Section')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveBilling}
                  >
                    <Text style={styles.saveButtonText}>{t('saveChanges', 'Save Changes')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ----------------------------------------------------
                6. SYSTEM PREFERENCES TAB (Screenshot 3 Match)
            ---------------------------------------------------- */}
            {activeTab === 'system' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('systemPreferences', 'System Preferences')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('systemAndBackup', 'Manage regional preferences and automatic backup.')}
                    </Text>
                  </View>
                  <View style={styles.systemBadge}>
                    <Text style={styles.systemBadgeText}>SYSTEM</Text>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('dateFormat', 'Date Format')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setPickerModalType('dateFormat')}
                    >
                      <Text style={styles.selectInputText}>{dateFormat}</Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('timeFormat', 'Time Format')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setPickerModalType('timeFormat')}
                    >
                      <Text style={styles.selectInputText}>{timeFormat}</Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('language', 'Language')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setPickerModalType('language')}
                    >
                      <Text style={styles.selectInputText}>
                        {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
                      </Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('backupFrequency', 'Backup Frequency')}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setPickerModalType('backupFrequency')}
                    >
                      <Text style={styles.selectInputText}>{backupFrequency}</Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.toggleRow, { marginTop: 16, borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={styles.toggleLabel}>{t('automaticBackup', 'Automatic Backup')}</Text>
                    <Text style={styles.toggleSub}>{t('automaticBackupDesc', 'Automatically create secure system backups.')}</Text>
                  </View>
                  <Switch
                    value={automaticBackup}
                    onValueChange={setAutomaticBackup}
                    trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.backupPanel}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.backupTitle}>{t('dataManagement', 'Data Management')}</Text>
                    <Text style={styles.backupDesc}>{t('automaticBackupDesc', 'Create a secure backup of your system data.')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.createBackupBtn}
                    onPress={() => Alert.alert(t('backupCreated', 'Backup Created'), t('backupCreatedDesc', 'System data backup created successfully.'))}
                  >
                    <Text style={styles.createBackupBtnText}>{t('createBackup', 'Create Backup')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.systemStatusGrid}>
                  <View style={styles.statusMiniCard}>
                    <Text style={styles.statusLabel}>{t('systemStatus', 'System Status')}</Text>
                    <View style={styles.statusValRow}>
                      <View style={styles.greenDot} />
                      <Text style={styles.statusVal}>{t('operational', 'Operational')}</Text>
                    </View>
                  </View>

                  <View style={styles.statusMiniCard}>
                    <Text style={styles.statusLabel}>{t('backup', 'BACKUP')}</Text>
                    <Text style={styles.statusVal}>{backupFrequency}</Text>
                  </View>

                  <View style={styles.statusMiniCard}>
                    <Text style={styles.statusLabel}>{t('timeFormat', 'Time Format')}</Text>
                    <Text style={styles.statusVal}>{timeFormat}</Text>
                  </View>
                </View>

                <View style={styles.visibilityCard}>
                  <View style={styles.visibilityHeader}>
                    <Text style={styles.visibilityTitle}>{t('dashboardSectionVisibility', 'Dashboard Section Visibility')}</Text>
                    <View style={styles.liveSyncBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.liveSyncText}>{t('syncActive', 'Sync Active')}</Text>
                    </View>
                  </View>
                  <Text style={styles.visibilityDesc}>
                    Configure which overview panels are displayed on the main Hotel Overview Dashboard. Changes sync across the application and persist in SQL Server.
                  </Text>

                  <View style={[styles.toggleRow, { borderBottomWidth: 0, marginTop: 8 }]}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>
                        Sales & Payment Overview Sections (Today's Sales, Sales Overview, Payment Summary)
                      </Text>
                      <Text style={styles.toggleSub}>
                        Controls the visibility of Today's Sales top card, Sales Overview chart, and Payment Summary donut chart together. Synchronized with Dashboard Customize View.
                      </Text>
                    </View>
                    <Switch
                      value={overviewSectionsVisible}
                      onValueChange={setOverviewSectionsVisible}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetSystem}
                  >
                    <Text style={styles.resetButtonText}>{t('resetSection', 'Reset Section')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveSystem}
                  >
                    <Text style={styles.saveButtonText}>{t('saveChanges', 'Save Changes')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ----------------------------------------------------
                7. HOTEL PROFILE TAB
            ---------------------------------------------------- */}
            {activeTab === 'profile' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('hotelProfile', 'Hotel Profile')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('hotelProfileDesc', "Manage your hotel's business contact and branding information.")}
                    </Text>
                  </View>
                  <View style={styles.alertsBadge}>
                    <Text style={styles.alertsBadgeText}>PROFILE</Text>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('hotelName', 'Hotel Name')} *</Text>
                    <TextInput style={styles.textInput} value={hotelName} onChangeText={setHotelName} />
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('ownerName', 'Owner Name')} *</Text>
                    <TextInput style={styles.textInput} value={ownerName} onChangeText={setOwnerName} />
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('emailAddress', 'Email Address')} *</Text>
                    <TextInput style={styles.textInput} value={email} onChangeText={setEmail} />
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('mobileNumber', 'Mobile Number')} *</Text>
                    <TextInput style={styles.textInput} value={mobile} onChangeText={setMobile} />
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('city', 'City')} *</Text>
                    <TextInput style={styles.textInput} value={city} onChangeText={setCity} />
                  </View>

                  <View style={styles.formFieldCol}>
                    <Text style={styles.fieldLabel}>{t('state', 'State')} *</Text>
                    <TextInput style={styles.textInput} value={state} onChangeText={setState} />
                  </View>

                  <View style={[styles.formFieldCol, { width: '100%' }]}>
                    <Text style={styles.fieldLabel}>{t('address', 'Address')} *</Text>
                    <TextInput style={styles.textInput} value={address} onChangeText={setAddress} />
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => Alert.alert(t('save', 'Saved'), t('hotelProfileUpdated', 'Hotel profile updated successfully.'))}
                  >
                    <Text style={styles.saveButtonText}>{t('saveChanges', 'Save Changes')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Dropdown Select Modal */}
      {renderDropdownPickerModal()}

      {/* Date Picker Modal for GST Date Range */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePickerModal(false)}
        >
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                Select {activeDatePickingField === 'from' ? 'From Date' : 'To Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {['01-10-2026', '05-10-2026', '10-10-2026', '15-10-2026', '20-10-2026', '24-10-2026', '25-10-2026', '26-10-2026'].map((dt) => (
                <TouchableOpacity
                  key={dt}
                  style={[
                    styles.pickerItem,
                    (activeDatePickingField === 'from' ? gstDateFrom : gstDateTo) === dt && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    if (activeDatePickingField === 'from') setGstDateFrom(dt);
                    else setGstDateTo(dt);
                    setShowDatePickerModal(false);
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#374151' }}>{dt}</Text>
                  {(activeDatePickingField === 'from' ? gstDateFrom : gstDateTo) === dt && (
                    <Check size={16} color="#8F351D" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add / Edit Expense Modal (Screenshot 1 Exact Match) */}
      <Modal
        visible={showAddExpenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddExpenseModal(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.expenseModalCard}>
            {/* Modal Header matching Screenshot 1 */}
            <View style={styles.expModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expModalTitle}>{t('addExpense', 'Add Expense')}</Text>
                <Text style={styles.expModalSubtitle}>{t('enterExpenseDetails', 'Enter new hotel expense details')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddExpenseModal(false)}
                style={styles.expModalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.expFormGrid}>
                {/* Row 1: Expense Name * | Category * */}
                <View style={styles.expFormRow}>
                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('expenseName', 'Expense Name')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.expInput}
                      placeholder={t('enterExpenseName', 'Enter expense name')}
                      placeholderTextColor="#9CA3AF"
                      value={expName}
                      onChangeText={setExpName}
                    />
                  </View>

                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('category', 'Category')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.expSelectBox}
                      onPress={() => setShowExpCatPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.expSelectVal,
                          expCategory === 'Select category' && { color: '#9CA3AF' },
                        ]}
                      >
                        {expCategory === 'Select category' ? t('selectCategory', 'Select category') : t(expCategory, expCategory)}
                      </Text>
                      <ChevronDown size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Row 2: Amount * | Quantity * */}
                <View style={styles.expFormRow}>
                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('amount', 'Amount')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.expInput}
                      placeholder={t('enterAmount', 'Enter amount')}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={expAmount}
                      onChangeText={setExpAmount}
                    />
                  </View>

                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('quantity', 'Quantity')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.expInput}
                      placeholder={t('enterQuantity', 'Enter quantity')}
                      placeholderTextColor="#9CA3AF"
                      value={expQuantity}
                      onChangeText={setExpQuantity}
                    />
                  </View>
                </View>

                {/* Row 3: Date * | Branch Code * */}
                <View style={styles.expFormRow}>
                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('date', 'Date')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.expSelectBox}
                      onPress={() => setShowExpDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} color="#6B7280" />
                        <Text style={styles.expSelectVal}>{toDevanagari(expDate)}</Text>
                      </View>
                      <Calendar size={13} color="#C2410C" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('branchCode', 'Branch Code')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.expSelectBox}
                      onPress={() => setShowExpBranchPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.expSelectVal}>{t(expBranch, expBranch)}</Text>
                      <ChevronDown size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Row 4: Payment Mode * */}
                <View style={styles.expFormRow}>
                  <View style={styles.expFieldCol}>
                    <Text style={styles.expLabel}>
                      {t('paymentMode', 'Payment Mode')} <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.expSelectBox}
                      onPress={() => setShowExpModePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.expSelectVal,
                          expMode === 'Select Payment Mode' && { color: '#9CA3AF' },
                        ]}
                      >
                        {expMode === 'Select Payment Mode' ? t('selectPaymentMode', 'Select Payment Mode') : t(expMode, expMode)}
                      </Text>
                      <ChevronDown size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.expFieldCol} />
                </View>

                {/* Row 5: Description (Textarea) */}
                <View style={{ marginTop: 2 }}>
                  <Text style={styles.expLabel}>{t('description', 'Description')}</Text>
                  <TextInput
                    style={styles.expTextarea}
                    placeholder={t('enterExpenseDescription', 'Enter expense description...')}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={expDescription}
                    onChangeText={setExpDescription}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions matching Screenshot 1 */}
            <View style={styles.expModalActionsRow}>
              <TouchableOpacity
                style={styles.expCancelBtn}
                onPress={() => setShowAddExpenseModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.expCancelBtnText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.expSubmitBtn}
                onPress={handleSaveExpense}
                activeOpacity={0.85}
              >
                <Text style={styles.expSubmitBtnText}>{t('addExpense', 'Add Expense')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown Picker */}
      <Modal visible={showExpCatPicker} transparent animationType="fade" onRequestClose={() => setShowExpCatPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowExpCatPicker(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('selectCategory', 'Select Category')}</Text>
              <TouchableOpacity onPress={() => setShowExpCatPicker(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {[
                'Food / Raw Material',
                'Utilities',
                'Maintenance',
                'Staff Salary',
                'Electricity',
                'Transportation',
                'Marketing',
                'Miscellaneous',
              ].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerItem, expCategory === c && styles.pickerItemActive]}
                  onPress={() => {
                    setExpCategory(c);
                    setShowExpCatPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, expCategory === c && { fontWeight: '700', color: '#8F351D' }]}>
                    {t(c, c)}
                  </Text>
                  {expCategory === c && <Check size={16} color="#8F351D" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Branch Dropdown Picker */}
      <Modal visible={showExpBranchPicker} transparent animationType="fade" onRequestClose={() => setShowExpBranchPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowExpBranchPicker(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('selectBranchCode', 'Select Branch Code')}</Text>
              <TouchableOpacity onPress={() => setShowExpBranchPicker(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 220 }}>
              {['Main Branch (MB-1)', 'City Center (MB-2)', 'Highway Dining (MB-3)'].map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.pickerItem, expBranch === b && styles.pickerItemActive]}
                  onPress={() => {
                    setExpBranch(b);
                    setShowExpBranchPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, expBranch === b && { fontWeight: '700', color: '#8F351D' }]}>
                    {t(b, b)}
                  </Text>
                  {expBranch === b && <Check size={16} color="#8F351D" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Mode Picker */}
      <Modal visible={showExpModePicker} transparent animationType="fade" onRequestClose={() => setShowExpModePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowExpModePicker(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('selectPaymentMode', 'Select Payment Mode')}</Text>
              <TouchableOpacity onPress={() => setShowExpModePicker(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 220 }}>
              {['Cash', 'UPI', 'Card', 'Net Banking'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerItem, expMode === m && styles.pickerItemActive]}
                  onPress={() => {
                    setExpMode(m);
                    setShowExpModePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, expMode === m && { fontWeight: '700', color: '#8F351D' }]}>
                    {t(m, m)}
                  </Text>
                  {expMode === m && <Check size={16} color="#8F351D" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Expense Date Picker */}
      <Modal visible={showExpDatePicker} transparent animationType="fade" onRequestClose={() => setShowExpDatePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowExpDatePicker(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('selectDate', 'Select Date')}</Text>
              <TouchableOpacity onPress={() => setShowExpDatePicker(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              {['26 Oct 2026', '25 Oct 2026', '24 Oct 2026', '20 Oct 2026', '15 Oct 2026', '10 Oct 2026', '05 Oct 2026', '01 Oct 2026'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.pickerItem, expDate === d && styles.pickerItemActive]}
                  onPress={() => {
                    setExpDate(d);
                    setShowExpDatePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, expDate === d && { fontWeight: '700', color: '#8F351D' }]}>
                    {toDevanagari(d)}
                  </Text>
                  {expDate === d && <Check size={16} color="#8F351D" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Plan Upgrade Modal (Showing 3 Subscription Plans with Active Plan Highlighted) */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.upgradeModalCardWide}>
            <View style={styles.pickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Crown size={20} color="#EA580C" />
                <Text style={styles.pickerTitle}>{t('subscriptionPlans', 'Subscription Plans')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#6B7280', marginVertical: 6 }}>
              {t('subscriptionPlansSub', 'Select a plan for your hotel. Currently active plan is highlighted below.')}
            </Text>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalPlansGrid}>
                {/* Plan 1: Starter / Trial */}
                <View
                  style={[
                    styles.modalPlanCard,
                    activePlanName === 'Trial' && styles.modalPlanCardActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.planBadgeText}>{t('starter', 'STARTER')}</Text>
                    {activePlanName === 'Trial' && (
                      <View style={styles.activePlanBadgeTag}>
                        <CheckCircle size={11} color="#15803D" />
                        <Text style={styles.activePlanBadgeTagText}>{t('activePlanTag', 'ACTIVE PLAN')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planCardTitle}>{toDevanagari(28)}-{t('dayFreeTrial', 'Day Free Trial')}</Text>
                  <Text style={styles.planPriceText}>
                    {toDevanagari('₹ 0')} <Text style={styles.planPeriodText}>/ {toDevanagari(28)} {t('days', 'days')}</Text>
                  </Text>
                  <Text style={styles.planDescText}>
                    {t('starterPlanDesc', 'Basic hotel billing, KOT printing, and single counter support.')}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.planBtn,
                      activePlanName === 'Trial' && styles.planBtnCurrent,
                    ]}
                    onPress={() => handleActivatePlan('Trial')}
                    disabled={activePlanName === 'Trial'}
                  >
                    <Text
                      style={[
                        styles.planBtnText,
                        activePlanName === 'Trial' && styles.planBtnTextCurrent,
                      ]}
                    >
                      {activePlanName === 'Trial' ? t('currentPlan', 'Current Plan') : t('selectStarter', 'Select Starter')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Plan 2: Pro Edition */}
                <View
                  style={[
                    styles.modalPlanCard,
                    activePlanName === 'Pro' && styles.modalPlanCardActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.planBadgeText, { color: '#0284C7' }]}>{t('popular', 'POPULAR')}</Text>
                    {activePlanName === 'Pro' && (
                      <View style={styles.activePlanBadgeTag}>
                        <CheckCircle size={11} color="#15803D" />
                        <Text style={styles.activePlanBadgeTagText}>{t('activePlanTag', 'ACTIVE PLAN')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planCardTitle}>{t('proEdition', 'Pro Edition')}</Text>
                  <Text style={styles.planPriceText}>
                    {toDevanagari('₹ 7,999')} <Text style={styles.planPeriodText}>/ {t('year', 'year')}</Text>
                  </Text>
                  <Text style={styles.planDescText}>
                    {t('proPlanDesc', 'Multi-counter billing, 80mm thermal receipt printing, and WhatsApp receipts.')}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.planBtn,
                      activePlanName === 'Pro'
                        ? styles.planBtnCurrent
                        : { backgroundColor: '#0284C7' },
                    ]}
                    onPress={() => handleActivatePlan('Pro')}
                    disabled={activePlanName === 'Pro'}
                  >
                    <Text
                      style={[
                        styles.planBtnText,
                        activePlanName === 'Pro' && styles.planBtnTextCurrent,
                      ]}
                    >
                      {activePlanName === 'Pro' ? t('currentPlan', 'Current Plan') : t('upgradeToPro', 'Upgrade to Pro')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Plan 3: Enterprise Suite */}
                <View
                  style={[
                    styles.modalPlanCard,
                    activePlanName === 'Enterprise' && styles.modalPlanCardActive,
                    { backgroundColor: activePlanName === 'Enterprise' ? '#FFFBEB' : '#FFFDF9' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.planBadgeText, { color: '#EA580C' }]}>{t('recommended', 'RECOMMENDED')}</Text>
                    {activePlanName === 'Enterprise' && (
                      <View style={styles.activePlanBadgeTag}>
                        <CheckCircle size={11} color="#15803D" />
                        <Text style={styles.activePlanBadgeTagText}>{t('activePlanTag', 'ACTIVE PLAN')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planCardTitle}>{t('enterpriseSuite', 'Enterprise Suite')}</Text>
                  <Text style={styles.planPriceText}>
                    {toDevanagari('₹ 14,999')} <Text style={styles.planPeriodText}>/ {t('year', 'year')}</Text>
                  </Text>
                  <Text style={styles.planDescText}>
                    {t('enterprisePlanDesc', 'Unlimited branches, GSTR-1/2/3B compliance, multi-user role security & cloud sync.')}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.planBtn,
                      activePlanName === 'Enterprise'
                        ? styles.planBtnCurrent
                        : { backgroundColor: '#EA580C' },
                    ]}
                    onPress={() => handleActivatePlan('Enterprise')}
                    disabled={activePlanName === 'Enterprise'}
                  >
                    <Text
                      style={[
                        styles.planBtnText,
                        activePlanName === 'Enterprise' && styles.planBtnTextCurrent,
                      ]}
                    >
                      {activePlanName === 'Enterprise' ? t('currentPlan', 'Current Plan') : t('activateEnterprise', 'Activate Enterprise')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Purchase Invoice Details Modal */}
      <Modal
        visible={!!viewingPurchaseInvoice}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPurchaseInvoice(null)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.invModalCard}>
            <View style={styles.pickerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invModalTitle}>
                  {t('purchaseInvoiceHash', 'Purchase Invoice #')}{viewingPurchaseInvoice?.inv}
                </Text>
                <Text style={styles.invModalSubtitle}>
                  {translateSupplierName(viewingPurchaseInvoice?.sup || '')} • {translateDateString(viewingPurchaseInvoice?.date || '')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setViewingPurchaseInvoice(null)}
                style={{ padding: 4 }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Supplier & GST Info Card */}
              <View style={styles.invSupplierCard}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={styles.invMetaLabel}>{t('supplierDetails', 'SUPPLIER DETAILS')}</Text>
                  <Text style={styles.invMetaVal}>{translateSupplierName(viewingPurchaseInvoice?.sup || '')}</Text>
                  <Text style={styles.invMetaSub}>{t('phone', 'Phone')}: {toDevanagari(viewingPurchaseInvoice?.phone || '')}</Text>
                  <Text style={styles.invMetaSub}>{t('address', 'Address')}: {viewingPurchaseInvoice?.address}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={styles.invMetaLabel}>{t('gstAndInvoiceDetails', 'GST & INVOICE DETAILS')}</Text>
                  <Text style={styles.invMetaVal}>GSTIN: {viewingPurchaseInvoice?.gstin}</Text>
                  <Text style={styles.invMetaSub}>{t('poRef', 'PO Ref')}: {toDevanagari(viewingPurchaseInvoice?.po || '')}</Text>
                  <Text style={styles.invMetaSub}>{t('paymentMode', 'Payment Mode')}: {viewingPurchaseInvoice?.mode ? (viewingPurchaseInvoice.mode === 'Cash' ? t('cash', 'Cash') : viewingPurchaseInvoice.mode === 'UPI' ? t('upi', 'UPI') : viewingPurchaseInvoice.mode === 'Card' ? (language === 'mr' ? 'कार्ड' : language === 'hi' ? 'कार्ड' : 'Card') : t(viewingPurchaseInvoice.mode, viewingPurchaseInvoice.mode)) : ''}</Text>
                  <View style={{ marginTop: 4 }}>
                    <View
                      style={[
                        styles.paidBadge,
                        viewingPurchaseInvoice?.status === 'Due' && {
                          backgroundColor: '#FEF2F2',
                          borderColor: '#FECACA',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paidBadgeText,
                          viewingPurchaseInvoice?.status === 'Due' && { color: '#DC2626' },
                        ]}
                      >
                        {t('status', 'Status')}: {translateStatus(viewingPurchaseInvoice?.status || '')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Items List Table */}
              <Text style={[styles.invMetaLabel, { marginTop: 14, marginBottom: 6 }]}>
                {t('purchasedItemsTaxBreakdown', 'PURCHASED ITEMS & TAX BREAKDOWN')}
              </Text>
              <View style={styles.invItemsTable}>
                <View style={styles.invItemsHeader}>
                  <Text style={[styles.iTh, { flex: 2 }]}>{t('itemDescription', 'Item Description')}</Text>
                  <Text style={[styles.iTh, { flex: 1, textAlign: 'center' }]}>{t('qty', 'Qty')}</Text>
                  <Text style={[styles.iTh, { flex: 1, textAlign: 'right' }]}>{t('rate', 'Rate')}</Text>
                  <Text style={[styles.iTh, { flex: 1, textAlign: 'right' }]}>{t('gst', 'GST')}</Text>
                  <Text style={[styles.iTh, { flex: 1, textAlign: 'right' }]}>{t('total', 'Total')}</Text>
                </View>

                {viewingPurchaseInvoice?.items?.map((it, i) => (
                  <View key={i} style={styles.invItemRow}>
                    <Text style={[styles.iTd, { flex: 2, fontWeight: '600' }]}>{translateItemName(it.name)}</Text>
                    <Text style={[styles.iTd, { flex: 1, textAlign: 'center' }]}>{toDevanagari(it.qty)}</Text>
                    <Text style={[styles.iTd, { flex: 1, textAlign: 'right' }]}>{toDevanagari('₹ ' + it.rate)}</Text>
                    <Text style={[styles.iTd, { flex: 1, textAlign: 'right', color: '#16A34A' }]}>{toDevanagari(it.gst)}</Text>
                    <Text style={[styles.iTd, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                      {toDevanagari('₹ ' + it.tot.toLocaleString('en-IN'))}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Summary Financials */}
              <View style={styles.invFinancialSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('taxableSubtotal', 'Taxable Subtotal:')}</Text>
                  <Text style={styles.summaryVal}>
                    {toDevanagari('₹ ' + (viewingPurchaseInvoice?.taxable || 0).toLocaleString('en-IN'))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('inputCgst', 'Input CGST (2.5%):')}</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A' }]}>
                    {toDevanagari('₹ ' + (viewingPurchaseInvoice?.cgst || 0).toLocaleString('en-IN'))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('inputSgst', 'Input SGST (2.5%):')}</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A' }]}>
                    {toDevanagari('₹ ' + (viewingPurchaseInvoice?.sgst || 0).toLocaleString('en-IN'))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('totalInputTaxItc', 'Total Input Tax (ITC):')}</Text>
                  <Text style={[styles.summaryVal, { color: '#16A34A', fontWeight: '700' }]}>
                    {toDevanagari('₹ ' + (viewingPurchaseInvoice?.totTax || 0).toLocaleString('en-IN'))}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: '800', color: '#0F172A', fontSize: 14 }]}>
                    {t('grandTotalAmount', 'Grand Total Amount:')}
                  </Text>
                  <Text style={[styles.summaryVal, { fontWeight: '900', color: '#0F172A', fontSize: 16 }]}>
                    {toDevanagari('₹ ' + (viewingPurchaseInvoice?.tot || 0).toLocaleString('en-IN'))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.invModalActions}>
              <TouchableOpacity
                style={styles.invPrintBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.print();
                  } else {
                    Alert.alert(t('printReceipt', 'Print Purchase Invoice'), `${t('invoiceNumber', 'Invoice')} #${viewingPurchaseInvoice?.inv}`);
                  }
                }}
              >
                <Printer size={14} color="#FFFFFF" />
                <Text style={styles.invPrintBtnText}>{t('printExportPdf', 'Print / Export PDF')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.invCloseBtn}
                onPress={() => setViewingPurchaseInvoice(null)}
              >
                <Text style={styles.invCloseBtnText}>{t('close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF8F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  breadcrumbText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9D7D6E',
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#302722',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#95877E',
    marginTop: 3,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F7EBE5',
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F351D',
  },
  searchToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#302722',
    paddingVertical: 4,
  },
  readyPill: {
    backgroundColor: '#FBF2EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8F351D',
  },
  licenseHeroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 260,
    flex: 1,
  },
  shieldIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroVersionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  heroActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  heroActiveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: '#4B5563',
    marginTop: 2,
  },
  heroRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  heroMetaCol: {
    justifyContent: 'center',
  },
  heroMetaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroMetaVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  heroButtonsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  settingsLayout: {
    width: '100%',
  },
  settingsLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  settingsLayoutMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  subSidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 12,
    padding: 6,
    gap: 4,
  },
  subSidebarMobile: {
    width: '100%',
  },
  subNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
    gap: 8,
  },
  subNavItemActive: {
    backgroundColor: '#F7EAE4',
  },
  subNavIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F4F0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subNavIconBoxActive: {
    backgroundColor: '#8F351D',
  },
  subNavTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E4038',
  },
  subNavTitleActive: {
    color: '#8F351D',
  },
  subNavDesc: {
    fontSize: 10,
    color: '#A1938B',
    marginTop: 1,
  },
  subNavDescActive: {
    color: '#8F351D',
    opacity: 0.8,
  },
  contentArea: {
    flex: 1,
    minWidth: 0,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 13,
    padding: 18,
    shadowColor: '#462B1C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#302722',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#96877F',
    marginTop: 3,
  },
  alertsBadge: {
    backgroundColor: '#FBF2EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertsBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9A4930',
    letterSpacing: 0.5,
  },
  billingBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  billingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  systemBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  toggleList: {
    gap: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE7',
  },
  toggleLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#453731',
  },
  toggleSub: {
    fontSize: 11,
    color: '#9B8D85',
    marginTop: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE7',
  },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F4F0ED',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#8F351D',
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formFieldCol: {
    width: '48%',
    minWidth: 200,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#443731',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectInputText: {
    fontSize: 12.5,
    color: '#1F2937',
    fontWeight: '600',
  },
  backupPanel: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF8F4',
    borderWidth: 1,
    borderColor: '#F0DCD2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  backupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#73331F',
  },
  backupDesc: {
    fontSize: 11,
    color: '#9B8D85',
    marginTop: 2,
  },
  createBackupBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C4B8',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createBackupBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#453731',
  },
  systemStatusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  statusMiniCard: {
    flex: 1,
    minWidth: 120,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    backgroundColor: '#FFFFFF',
  },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9B8D85',
    textTransform: 'uppercase',
  },
  statusValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statusVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4E4038',
    marginTop: 4,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  visibilityCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE5DF',
    backgroundColor: '#FAFAF9',
  },
  visibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visibilityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveSyncText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  visibilityDesc: {
    fontSize: 11,
    color: '#78716C',
    lineHeight: 16,
    marginBottom: 6,
  },
  subReportBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE7',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  hotelFinanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 4,
  },
  hotelFinanceBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#C2410C',
  },
  subReportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  subReportSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  subReportActionButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  outlineActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  kpiCardsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  kpiCard: {
    backgroundColor: '#FAF8F6',
    borderWidth: 1,
    borderColor: '#EFEAE6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 115,
  },
  kpiCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 0.5,
  },
  kpiCardVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 4,
  },
  subTabsStrip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE7',
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  subTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
  },
  subTabPillActive: {
    backgroundColor: '#8F351D',
  },
  subTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
  },
  expenseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  expenseListTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  expenseListSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  expenseActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    width: 150,
  },
  expenseSearchInput: {
    flex: 1,
    fontSize: 11,
    color: '#1F2937',
    padding: 0,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C2410C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  expenseTable: {
    minWidth: 850,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  expenseTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  expenseTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tdCell: {
    paddingRight: 8,
  },
  tdTextBold: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  tdText: {
    fontSize: 11,
    color: '#4B5563',
  },
  tdAmount: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#111827',
  },
  tdDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  tdBranch: {
    fontSize: 11,
    color: '#4B5563',
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  sectionSubHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  simpleReportCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
  },
  reportSummaryText: {
    fontSize: 12,
    color: '#374151',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  // GST Settings & Reports Styles (Screenshots 1 to 5)
  gstHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
  },
  exportCsvBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  printPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1F2937',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  printPdfBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gstSubTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE7',
    paddingBottom: 8,
  },
  gstSubTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
  },
  gstSubTabPillActive: {
    backgroundColor: '#1E293B',
  },
  gstSubTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  gstSubTabPillTextActive: {
    color: '#FFFFFF',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateFilterLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  dateFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dateFilterVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  reportSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 10,
  },
  b2bBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  b2bBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  b2bBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  gstStatsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 6,
  },
  gstStatCard: {
    backgroundColor: '#FAF8F6',
    borderWidth: 1,
    borderColor: '#EFEAE6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 135,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRatePill: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  gstStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 0.5,
  },
  gstStatVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 4,
  },
  reportTable: {
    minWidth: 1100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  reportTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  rth: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  reportTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  rtd: {
    fontSize: 11,
    color: '#4B5563',
    paddingRight: 8,
  },
  paidBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  gstSettingsCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE5DF',
    borderRadius: 10,
    padding: 14,
  },
  gstCardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  gstCardSubHeading: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  gstFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gstFieldCol: {
    width: '31%',
    minWidth: 160,
  },
  gstHint: {
    fontSize: 9.5,
    color: '#059669',
    marginTop: 3,
  },
  saveGstButton: {
    backgroundColor: '#C2410C',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  saveGstButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Licence & Subscription Styles
  activePlanCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activePlanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  activePlanSub: {
    fontSize: 11.5,
    color: '#15803D',
    marginTop: 2,
  },
  activePlanActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  plansGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  planCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  planBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  planPriceText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 6,
  },
  planPeriodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  planDescText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    minHeight: 48,
  },
  planBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 12,
  },
  planBtnCurrent: {
    backgroundColor: '#F3F4F6',
  },
  planBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  planBtnTextCurrent: {
    color: '#6B7280',
  },
  // Pickers & Modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  pickerItemActive: {
    backgroundColor: '#FDF4F0',
  },
  pickerItemText: {
    fontSize: 13,
    color: '#374151',
  },
  pickerItemTextActive: {
    fontWeight: '800',
    color: '#8F351D',
  },
  expenseModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  upgradeModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  upgradePriceCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 14,
  },
  filingSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  filingSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filingSummaryMeta: {
    gap: 4,
  },
  filingSummaryMetaText: {
    fontSize: 11.5,
    color: '#475569',
  },
  filingSummarySuccessText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  purchaseFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  purchaseSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    minWidth: 220,
    flex: 1,
  },
  purchaseSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
  },
  filterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  viewInvBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  viewInvBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Invoice Details Modal
  invModalCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  invModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  invModalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  invSupplierCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  invMetaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  invMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  invMetaSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  invItemsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  invItemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iTh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  invItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iTd: {
    fontSize: 11.5,
    color: '#334155',
  },
  invFinancialSummary: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  invModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  invPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invPrintBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  invCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Add Expense Modal Styles (Screenshot 1 matching)
  expModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  expModalSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  expModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expFormGrid: {
    gap: 12,
  },
  expFormRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expFieldCol: {
    flex: 1,
  },
  expLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
  },
  reqStar: {
    color: '#EF4444',
  },
  expInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  expSelectBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  expSelectVal: {
    fontSize: 12.5,
    color: '#111827',
    fontWeight: '500',
  },
  expTextarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 68,
  },
  expModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  expCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  expSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#C2410C',
  },
  expSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 3-Plan Upgrade Modal Styles
  upgradeModalCardWide: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  modalPlansGrid: {
    gap: 10,
  },
  modalPlanCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  modalPlanCardActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  activePlanBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  activePlanBadgeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },

  // KPI Reports Navigation Styles (Screenshot 2 matching)
  kpiReportsContainer: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  kpiReportsSidebar: {
    width: 190,
    minWidth: 160,
    backgroundColor: '#FAFAF9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 8,
    gap: 4,
  },
  kpiReportsSidebarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 6,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
  },
  kpiReportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  kpiReportItemActive: {
    backgroundColor: '#C2410C',
  },
  kpiReportItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  kpiReportItemTextActive: {
    color: '#FFFFFF',
  },
  kpiReportContentBox: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  kpiReportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiReportMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  kpiDatePillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  kpiDatePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  kpiDatePillActive: {
    backgroundColor: '#C2410C',
  },
  kpiDatePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  kpiDatePillTextActive: {
    color: '#FFFFFF',
  },
  kpiReportSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  kpiReportSubText: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  kpiReportSnapshotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  kpiTableWrap: {
    minWidth: 600,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  kpiTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  kpiTh: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  kpiTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  kpiTd: {
    fontSize: 12,
    color: '#374151',
  },

  // Report Header Actions & Filter styles
  reportHeaderActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  statusFilterPillActive: {
    backgroundColor: '#C2410C',
  },
  statusFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusFilterPillTextActive: {
    color: '#FFFFFF',
  },
});
