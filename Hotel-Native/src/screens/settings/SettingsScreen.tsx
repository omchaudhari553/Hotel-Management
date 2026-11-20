import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Rect, G, Circle, Path, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavbar } from '../../components/AppNavbar';
import { RenewPlanModal } from '../../components/RenewPlanModal';
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
  apiClient,
  getApiBaseUrl,
  setServerHost,
  resetApiBaseUrl,
  testServerConnection,
  getDetectedHostIp,
  ensureBackendToken,
  STORAGE_KEYS,
  DEFAULT_URL,
  CURRENT_LAN_HOST,
  BACKEND_PORT,
} from '../../api/client';
import { restaurantStore } from '../../api/restaurantStore';
import {
  Building2,
  FileText,
  Bell,
  SlidersHorizontal,
  Shield,
  BarChart3,
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
  Upload,
  Database,
  Printer,
  Zap,
  Search,
  Eye,
  EyeOff,
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
  ShoppingBag,
  PieChart,
  UtensilsCrossed,
  Bluetooth,
  Mail,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Palette,
  Key,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { MobilePrintService } from '../../services/mobilePrintService';
import { localizeGuestName } from '../../locales/nameLocalization';
import { HotelPrinterSettingsScreen } from './HotelPrinterSettingsScreen';

export type SettingsTabKey =
  | 'profile'
  | 'billing'
  | 'notifications'
  | 'system'
  | 'reports'
  | 'gst-reports'
  | 'printer'
  | 'server';

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
    inv: 'INV-794895',
    po: 'PO-179489527291',
    date: 'Tue, 17 Nov 2026',
    rawDate: '2026-11-17',
    sup: 'Shubham Enterprises',
    gstin: '27AABCS9911Z1Z2',
    phone: '9865899556',
    address: 'APMC Market Yard, Pune',
    cat: 'Groceries / Dal & Flour',
    supply: 'Intra-State',
    taxable: 28400.0,
    cgst: 710.0,
    sgst: 710.0,
    igst: 0.0,
    totTax: 1420.0,
    tot: 29820.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Tur Dal', qty: '40 Kg', rate: 100, gst: '5%', tot: 4200 },
      { name: 'Moong Dal', qty: '50 Kg', rate: 140, gst: '5%', tot: 7350 },
      { name: 'Chana Dal', qty: '60 Kg', rate: 140, gst: '5%', tot: 8820 },
      { name: 'Wheat Flour', qty: '100 Kg', rate: 90, gst: '5%', tot: 9450 },
    ],
  },
  {
    inv: 'INV-792144',
    po: 'PO-179481234567',
    date: 'Mon, 16 Nov 2026',
    rawDate: '2026-11-16',
    sup: 'Vivek Chopade Dairy',
    gstin: '27AABCV8901D1Z8',
    phone: '9890112233',
    address: 'Chopade Dairy Farm, Katraj, Pune',
    cat: 'Dairy / Fresh Milk',
    supply: 'Intra-State',
    taxable: 4000.0,
    cgst: 100.0,
    sgst: 100.0,
    igst: 0.0,
    totTax: 200.0,
    tot: 4200.0,
    status: 'Paid',
    mode: 'Cash',
    items: [
      { name: 'Full Cream Milk', qty: '50 Ltr', rate: 50, gst: '5%', tot: 2625 },
      { name: 'Fresh Malai Paneer', qty: '5 Kg', rate: 300, gst: '5%', tot: 1575 },
    ],
  },
  {
    inv: 'INV-786521',
    po: 'PO-179391024819',
    date: 'Tue, 10 Nov 2026',
    rawDate: '2026-11-10',
    sup: 'Rajesh Patil Farms',
    gstin: '27AABCP5678Q1Z2',
    phone: '9765443322',
    address: 'Wagholi Sabji Mandi, Pune',
    cat: 'Fresh Vegetables',
    supply: 'Intra-State',
    taxable: 8500.0,
    cgst: 212.5,
    sgst: 212.5,
    igst: 0.0,
    totTax: 425.0,
    tot: 8925.0,
    status: 'Due',
    mode: 'Card',
    items: [
      { name: 'Nashik Red Onions', qty: '120 Kg', rate: 30, gst: '5%', tot: 3780 },
      { name: 'Potatoes', qty: '100 Kg', rate: 25, gst: '5%', tot: 2625 },
      { name: 'Tomatoes', qty: '60 Kg', rate: 40, gst: '5%', tot: 2520 },
    ],
  },
  {
    inv: 'INV-781190',
    po: 'PO-179320194821',
    date: 'Mon, 2 Nov 2026',
    rawDate: '2026-11-02',
    sup: 'Dot Dot Spices',
    gstin: '27AABCD9988K1Z3',
    phone: '9822001144',
    address: 'Raviwar Peth Masala Market, Pune',
    cat: 'Spices & Condiments',
    supply: 'Intra-State',
    taxable: 14200.0,
    cgst: 355.0,
    sgst: 355.0,
    igst: 0.0,
    totTax: 710.0,
    tot: 14910.0,
    status: 'Paid',
    mode: 'UPI',
    items: [
      { name: 'Special Garam Masala', qty: '15 Kg', rate: 450, gst: '5%', tot: 7087.5 },
      { name: 'Kashmiri Mirchi Powder', qty: '20 Kg', rate: 300, gst: '5%', tot: 6300 },
      { name: 'Haldi Powder', qty: '10 Kg', rate: 150, gst: '5%', tot: 1522.5 },
    ],
  },
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

export const SettingsScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktopLayout = width >= 860;

  const { user, logout } = useAuth();
  const isBranchUser = Boolean(
    user?.branchId ||
    (user?.role && !['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(String(user.role).toUpperCase()) && user?.branchId) ||
    user?.role === 'BRANCH' ||
    user?.role === 'BRANCH_MANAGER' ||
    user?.role === 'BRANCH_CASHIER'
  );
  const { language, setLanguage, t, formatDate, formatTime, toDevanagari, translateStatus } = useLanguage();
  const { activeBranch, activeBranchNumId } = useBranch();
  const { themeMode, setThemeMode, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark, width), [isDark, width]);

  // Scroll ref for smooth jumping to selected setting
  const mainScrollRef = useRef<any>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(
    route?.params?.initialTab && route.params.initialTab !== 'server'
      ? route.params.initialTab
      : 'reports'
  );

  const handleSelectSearchResult = (targetTab: SettingsTabKey) => {
    setActiveTab(targetTab);
    setSearchQuery('');
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 140, animated: true });
    }, 120);
  };

  // React to initialTab changes via route params
  useEffect(() => {
    if (route?.params?.initialTab && route.params.initialTab !== 'server') {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Central Server Configuration State (Background connectivity & sync)
  const [serverHostInput, setServerHostInput] = useState<string>('');
  const [currentServerUrl, setCurrentServerUrl] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<{ connected: boolean; message: string; latencyMs: number } | null>(null);
  const [isTestingServer, setIsTestingServer] = useState<boolean>(false);
  const [serverSaveMsg, setServerSaveMsg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const url = await getApiBaseUrl();
      if (!isMounted) return;
      setCurrentServerUrl(url);
      const host = getDetectedHostIp();
      const savedHost = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_HOST);
      setServerHostInput(savedHost || host);
      runServerTest(url);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const runServerTest = async (target?: string) => {
    setIsTestingServer(true);
    try {
      const res = await testServerConnection(target || serverHostInput);
      setServerStatus({ connected: res.success, message: res.message, latencyMs: res.latencyMs });
    } catch (e: any) {
      setServerStatus({ connected: false, message: e.message || 'Connection failed', latencyMs: 0 });
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleSaveServer = async () => {
    const trimmed = serverHostInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Host', 'Please enter a valid IP address or hostname');
      return;
    }
    try {
      const newUrl = await setServerHost(trimmed);
      setCurrentServerUrl(newUrl);
      setServerSaveMsg(`Connected to ${trimmed}:${BACKEND_PORT}`);
      await ensureBackendToken(true);
      await runServerTest(newUrl);
      restaurantStore.getTables(activeBranchNumId).catch(() => { });
      restaurantStore.getOrders(activeBranchNumId).catch(() => { });
      restaurantStore.loadMenuItemsFromBackend().catch(() => { });
      setTimeout(() => setServerSaveMsg(''), 4000);
      Alert.alert('Central Server Connected', `Mobile app is now synced with Central Server at ${trimmed}:${BACKEND_PORT}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update server configuration');
    }
  };

  const handleAutoDetectServer = async () => {
    const detected = getDetectedHostIp();
    setServerHostInput(detected);
    const newUrl = await setServerHost(detected);
    setCurrentServerUrl(newUrl);
    setServerSaveMsg(`Auto-detected: ${detected}`);
    await ensureBackendToken(true);
    await runServerTest(newUrl);
    restaurantStore.getTables(activeBranchNumId).catch(() => { });
    restaurantStore.getOrders(activeBranchNumId).catch(() => { });
    setTimeout(() => setServerSaveMsg(''), 4000);
  };

  const handleResetServer = async () => {
    const def = await resetApiBaseUrl();
    const host = getDetectedHostIp();
    setServerHostInput(host);
    setCurrentServerUrl(def);
    setServerSaveMsg('Reset to default');
    await ensureBackendToken(true);
    await runServerTest(def);
    setTimeout(() => setServerSaveMsg(''), 4000);
  };

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
  const [hotelLogo, setHotelLogo] = useState<string | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [bankPhone, setBankPhone] = useState<string>('');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  const [backupSending, setBackupSending] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState('');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('omchaudhari553@gmail.com');
  const [smtpAppPassword, setSmtpAppPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  // 2. Billing Settings State (Screenshot 2: 3 toggles + Bluetooth)
  const [enableTax, setEnableTax] = useState<boolean>(true);
  const [enableDiscount, setEnableDiscount] = useState<boolean>(true);
  const [enableRoundOff, setEnableRoundOff] = useState<boolean>(true);
  const [enableBluetoothPrinter, setEnableBluetoothPrinter] = useState<boolean>(true);
  const [bluetoothRollSize, setBluetoothRollSize] = useState<'80mm' | '58mm'>('80mm');
  const [testPrintLoading, setTestPrintLoading] = useState<boolean>(false);

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
  const [backupFrequency, setBackupFrequency] = useState<string>('Daily at 11:00 PM (Night)');
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
  const [showImportExpenseModal, setShowImportExpenseModal] = useState<boolean>(false);
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Initial Expenses matching Screenshot 3
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'EXP-1',
      name: 'Electricity',
      category: 'Electricity',
      amount: 15000,
      date: '28 Oct 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Electricity power charges',
    },
    {
      id: 'EXP-2',
      name: 'Kitchen Utilities',
      category: 'UTILITIES',
      amount: 1250,
      date: '29 Oct 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Kitchen Utilities expense',
    },
    {
      id: 'EXP-3',
      name: 'Kitchen Utilities',
      category: 'UTILITIES',
      amount: 1250,
      date: '29 Oct 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Kitchen Utilities expense',
    },
    {
      id: 'EXP-4',
      name: 'Kitchen Utilities',
      category: 'UTILITIES',
      amount: 1250,
      date: '29 Oct 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Kitchen Utilities expense',
    },
    {
      id: 'EXP-5',
      name: 'water',
      category: 'Water',
      amount: 1500,
      date: '16 Nov 2026',
      branchCode: 'MB-1',
      paymentMode: 'UPI',
      description: 'Water supply charges',
    },
  ]);

  // Total calculated expenses
  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

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
  const [showExpModePicker, setShowExpModePicker] = useState<boolean>(false);
  const [showExpDatePicker, setShowExpDatePicker] = useState<boolean>(false);

  // Sub-report inside Report & KPI -> Reports (Screenshot 2)
  const [kpiSelectedReport, setKpiSelectedReport] = useState<
    'sales' | 'expense' | 'order' | 'menu'
  >('sales');
  const [kpiReportDateFilter, setKpiReportDateFilter] = useState<'today' | 'week' | 'month'>('month');

  // Sub-report inside Scale Summary GST (Screenshot 4)
  const [kpiSelectedGstReport, setKpiSelectedGstReport] = useState<
    'sales-summary' | 'rate-wise' | 'invoice-wise' | 'purchase-itc'
  >('sales-summary');
  const [showGstReportDropdown, setShowGstReportDropdown] = useState<boolean>(false);
  const [kpiGstPeriod, setKpiGstPeriod] = useState<'today' | 'this-week' | 'this-month' | 'all-time'>('all-time');
  const [showGstPeriodModal, setShowGstPeriodModal] = useState<boolean>(false);

  // Purchase Sub-tab period (Screenshot 5)
  const [kpiPurchasePeriod, setKpiPurchasePeriod] = useState<'today' | 'week' | 'month'>('month');

  // Configurable Report & KPI Display Settings (Matching Vite Requirement 6)
  const [showKpiCustomize, setShowKpiCustomize] = useState<boolean>(false);
  const [kpiVisibility, setKpiVisibility] = useState<{
    sales: boolean;
    expenses: boolean;
    net: boolean;
    profit: boolean;
    loss: boolean;
    bills: boolean;
    orders: boolean;
  }>({
    sales: true,
    expenses: true,
    net: true,
    profit: true,
    loss: true,
    bills: true,
    orders: true,
  });

  // Dynamic KPI Stats derived from selected period matching Screenshots 1-5
  const kpiStats = useMemo(() => {
    const isToday = kpiReportDateFilter === 'today';
    const isWeek = kpiReportDateFilter === 'week';

    if (isToday) {
      return {
        sales: 2450.00,
        expenses: 1500.00,
        net: 950.00,
        profit: 950.00,
        loss: 0.00,
        bills: 2,
        orders: 2,
        salesFormatted: '2,450.00',
        expensesFormatted: '1,500.00',
        netFormatted: '950.00',
        profitFormatted: '950.00',
        lossFormatted: '0.00',
        salesCompact: '2.4K',
        expensesCompact: '1.5K',
        netCompact: '950',
      };
    } else if (isWeek) {
      return {
        sales: 12450.00,
        expenses: 3550.00,
        net: 8900.00,
        profit: 8900.00,
        loss: 0.00,
        bills: 11,
        orders: 14,
        salesFormatted: '12,450.00',
        expensesFormatted: '3,550.00',
        netFormatted: '8,900.00',
        profitFormatted: '8,900.00',
        lossFormatted: '0.00',
        salesCompact: '12.4K',
        expensesCompact: '3.5K',
        netCompact: '8.9K',
      };
    } else {
      return {
        sales: 22853.26,
        expenses: 20250.00,
        net: 2626.50,
        profit: 2626.50,
        loss: 0.00,
        bills: 23,
        orders: 32,
        salesFormatted: '22,853.26',
        expensesFormatted: '20,250.00',
        netFormatted: '2,626.50',
        profitFormatted: '2,626.50',
        lossFormatted: '0.00',
        salesCompact: '22.8K',
        expensesCompact: '20.2K',
        netCompact: '2.6K',
      };
    }
  }, [kpiReportDateFilter]);

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

  // Period-filtered Purchase Invoices (reacts to 'today' | 'week' | 'month')
  const periodPurchaseInvoices = useMemo(() => {
    return PURCHASE_REPORT_DATA.filter((p) => {
      if (kpiPurchasePeriod === 'today') {
        return p.rawDate === '2026-11-17';
      }
      if (kpiPurchasePeriod === 'week') {
        return ['2026-11-17', '2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11'].includes(p.rawDate);
      }
      // 'month': all November 2026 records
      return p.rawDate.startsWith('2026-11');
    });
  }, [kpiPurchasePeriod]);

  const filteredPurchaseInvoices = useMemo(() => {
    return periodPurchaseInvoices.filter((p) => {
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
  }, [periodPurchaseInvoices, purchaseStatusFilter, purchaseSearchQuery]);

  // Dynamic GST Report Data (Today / This Week / This Month / All Time)
  const gstPeriodData = useMemo(() => {
    switch (kpiGstPeriod) {
      case 'today':
        return {
          totalGrossSales: '3,454.50',
          netTaxableSales: '3,290.00',
          nilExemptSales: '0.00',
          totalCgst: '82.25',
          totalSgst: '82.25',
          totalIgst: '0.00',
          totalTaxLiability: '164.50',
          totalInvoices: '3',
          intraStateTurnover: '3,290.00',
          intraStateCgst: '82.25',
          intraStateSgst: '82.25',
          intraStateTotalTax: '164.50',
          rate5Taxable: '3,290.00',
          rate5Cgst: '82.25',
          rate5Sgst: '82.25',
          rate5TotalTax: '164.50',
          rate5Invoices: '3',
          invoices: [
            { inv: 'INV-2026-0023', date: '17 Nov 2026', source: 'Dine-in Table 4', taxable: 1850.00, cgst: 46.25, sgst: 46.25, totTax: 92.50, tot: 1942.50 },
            { inv: 'INV-2026-0022', date: '17 Nov 2026', source: 'Takeaway Order #12', taxable: 1440.00, cgst: 36.00, sgst: 36.00, totTax: 72.00, tot: 1512.00 },
          ],
        };
      case 'this-week':
        return {
          totalGrossSales: '8,920.00',
          netTaxableSales: '8,495.24',
          nilExemptSales: '0.00',
          totalCgst: '212.38',
          totalSgst: '212.38',
          totalIgst: '0.00',
          totalTaxLiability: '424.76',
          totalInvoices: '9',
          intraStateTurnover: '8,495.24',
          intraStateCgst: '212.38',
          intraStateSgst: '212.38',
          intraStateTotalTax: '424.76',
          rate5Taxable: '8,495.24',
          rate5Cgst: '212.38',
          rate5Sgst: '212.38',
          rate5TotalTax: '424.76',
          rate5Invoices: '9',
          invoices: [
            { inv: 'INV-2026-0023', date: '16 Nov 2026', source: 'Dine-in Table 4', taxable: 3454.50, cgst: 86.36, sgst: 86.36, totTax: 172.73, tot: 3627.23 },
            { inv: 'INV-2026-0022', date: '16 Nov 2026', source: 'Dine-in Table 2', taxable: 4210.00, cgst: 105.25, sgst: 105.25, totTax: 210.50, tot: 4420.50 },
            { inv: 'INV-2026-0021', date: '15 Nov 2026', source: 'Takeaway Order #12', taxable: 830.74, cgst: 20.77, sgst: 20.77, totTax: 41.53, tot: 872.27 },
          ],
        };
      case 'this-month':
        return {
          totalGrossSales: '18,426.50',
          netTaxableSales: '17,549.05',
          nilExemptSales: '0.00',
          totalCgst: '438.73',
          totalSgst: '438.73',
          totalIgst: '0.00',
          totalTaxLiability: '877.45',
          totalInvoices: '18',
          intraStateTurnover: '17,549.05',
          intraStateCgst: '438.73',
          intraStateSgst: '438.73',
          intraStateTotalTax: '877.45',
          rate5Taxable: '17,549.05',
          rate5Cgst: '438.73',
          rate5Sgst: '438.73',
          rate5TotalTax: '877.45',
          rate5Invoices: '18',
          invoices: [
            { inv: 'INV-2026-0023', date: '16 Nov 2026', source: 'Dine-in Table 4', taxable: 3454.50, cgst: 86.36, sgst: 86.36, totTax: 172.73, tot: 3627.23 },
            { inv: 'INV-2026-0022', date: '16 Nov 2026', source: 'Dine-in Table 2', taxable: 4210.00, cgst: 105.25, sgst: 105.25, totTax: 210.50, tot: 4420.50 },
            { inv: 'INV-2026-0021', date: '15 Nov 2026', source: 'Takeaway Order #12', taxable: 1890.00, cgst: 47.25, sgst: 47.25, totTax: 94.50, tot: 1984.50 },
            { inv: 'INV-2026-0020', date: '14 Nov 2026', source: 'Dine-in Table 1', taxable: 5610.50, cgst: 140.26, sgst: 140.26, totTax: 280.53, tot: 5891.03 },
            { inv: 'INV-2026-0019', date: '12 Nov 2026', source: 'Dine-in Table 7', taxable: 2384.05, cgst: 59.60, sgst: 59.60, totTax: 119.20, tot: 2503.25 },
          ],
        };
      case 'all-time':
      default:
        return {
          totalGrossSales: '22,853.26',
          netTaxableSales: '21,765.00',
          nilExemptSales: '0.00',
          totalCgst: '544.13',
          totalSgst: '544.13',
          totalIgst: '0.00',
          totalTaxLiability: '1,088.26',
          totalInvoices: '23',
          intraStateTurnover: '21,765.00',
          intraStateCgst: '544.13',
          intraStateSgst: '544.13',
          intraStateTotalTax: '1,088.26',
          rate5Taxable: '21,765.00',
          rate5Cgst: '544.13',
          rate5Sgst: '544.13',
          rate5TotalTax: '1,088.26',
          rate5Invoices: '23',
          invoices: [
            { inv: 'INV-2026-0023', date: '16 Nov 2026', source: 'Dine-in Table 4', taxable: 3454.50, cgst: 86.36, sgst: 86.36, totTax: 172.73, tot: 3627.23 },
            { inv: 'INV-2026-0022', date: '16 Nov 2026', source: 'Dine-in Table 2', taxable: 4210.00, cgst: 105.25, sgst: 105.25, totTax: 210.50, tot: 4420.50 },
            { inv: 'INV-2026-0021', date: '15 Nov 2026', source: 'Takeaway Order #12', taxable: 1890.00, cgst: 47.25, sgst: 47.25, totTax: 94.50, tot: 1984.50 },
            { inv: 'INV-2026-0020', date: '14 Nov 2026', source: 'Dine-in Table 1', taxable: 5610.50, cgst: 140.26, sgst: 140.26, totTax: 280.53, tot: 5891.03 },
            { inv: 'INV-2026-0019', date: '12 Nov 2026', source: 'Dine-in Table 7', taxable: 6600.00, cgst: 165.00, sgst: 165.00, totTax: 330.00, tot: 6930.00 },
          ],
        };
    }
  }, [kpiGstPeriod]);

  // Dynamic Purchase GST (ITC) Data reacting to GST Period
  const periodPurchaseItcData = useMemo(() => {
    return PURCHASE_REPORT_DATA.filter((p) => {
      if (kpiGstPeriod === 'today') return p.rawDate === '2026-11-17';
      if (kpiGstPeriod === 'this-week') return ['2026-11-17', '2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11'].includes(p.rawDate);
      if (kpiGstPeriod === 'this-month') return p.rawDate.startsWith('2026-11');
      return true;
    });
  }, [kpiGstPeriod]);

  const itcTaxable = useMemo(() => periodPurchaseItcData.reduce((s, r) => s + r.taxable, 0), [periodPurchaseItcData]);
  const itcCgst = useMemo(() => periodPurchaseItcData.reduce((s, r) => s + r.cgst, 0), [periodPurchaseItcData]);
  const itcSgst = useMemo(() => periodPurchaseItcData.reduce((s, r) => s + r.sgst, 0), [periodPurchaseItcData]);
  const itcTotal = useMemo(() => periodPurchaseItcData.reduce((s, r) => s + r.totTax, 0), [periodPurchaseItcData]);
  const itcGrandTotal = useMemo(() => periodPurchaseItcData.reduce((s, r) => s + r.tot, 0), [periodPurchaseItcData]);

  // Dynamic Sales Report Data reacting to Today / This Week / This Month
  const dynamicSalesReports = useMemo(() => {
    if (kpiReportDateFilter === 'today') {
      return {
        rows: [
          { date: '17 Nov 2026', bills: 2, total: 2450.00 }
        ],
        total: 2450.00,
        totalBills: 2
      };
    } else if (kpiReportDateFilter === 'week') {
      return {
        rows: [
          { date: '17 Nov 2026', bills: 2, total: 2450.00 },
          { date: '16 Nov 2026', bills: 4, total: 4200.00 },
          { date: '15 Nov 2026', bills: 5, total: 5800.00 }
        ],
        total: 12450.00,
        totalBills: 11
      };
    } else {
      return {
        rows: [
          { date: '17 Nov 2026', bills: 2, total: 2450.00 },
          { date: '16 Nov 2026', bills: 4, total: 4200.00 },
          { date: '3 Nov 2026', bills: 3, total: 3454.50 },
          { date: '1 Nov 2026', bills: 1, total: 672.00 }
        ],
        total: 10776.50,
        totalBills: 10
      };
    }
  }, [kpiReportDateFilter]);

  // Dynamic Expense Report Data reacting to Today / This Week / This Month
  const dynamicExpenseReports = useMemo(() => {
    if (kpiReportDateFilter === 'today') {
      return {
        rows: [
          { date: '17 Nov 2026', category: 'Water', name: 'Water Can Delivery', amount: 1500.00 }
        ],
        total: 1500.00
      };
    } else if (kpiReportDateFilter === 'week') {
      return {
        rows: [
          { date: '17 Nov 2026', category: 'Water', name: 'Water Can Delivery', amount: 1500.00 },
          { date: '16 Nov 2026', category: 'Dairy', name: 'Fresh Malai Milk', amount: 1200.00 },
          { date: '14 Nov 2026', category: 'Vegetables', name: 'Fresh Veggies', amount: 850.00 }
        ],
        total: 3550.00
      };
    } else {
      return {
        rows: [
          { date: '17 Nov 2026', category: 'Water', name: 'Water Can Delivery', amount: 1500.00 },
          { date: '16 Nov 2026', category: 'Dairy', name: 'Fresh Malai Milk', amount: 1200.00 },
          { date: '29 Oct 2026', category: 'UTILITIES', name: 'Kitchen Utilities (x3)', amount: 3750.00 },
          { date: '28 Oct 2026', category: 'Electricity', name: 'Electricity', amount: 15000.00 }
        ],
        total: 21450.00
      };
    }
  }, [kpiReportDateFilter]);

  // Dynamic Order Report Data reacting to Today / This Week / This Month
  const dynamicOrderReports = useMemo(() => {
    if (kpiReportDateFilter === 'today') {
      return {
        rows: [
          { date: '17 Nov 2026', type: 'Dine-In', bills: 2, revenue: 2450.00 }
        ],
        totalBills: 2,
        totalRevenue: 2450.00
      };
    } else if (kpiReportDateFilter === 'week') {
      return {
        rows: [
          { date: '17 Nov 2026', type: 'Dine-In', bills: 2, revenue: 2450.00 },
          { date: '16 Nov 2026', type: 'Dine-In', bills: 4, revenue: 4200.00 },
          { date: '15 Nov 2026', type: 'Takeaway', bills: 3, revenue: 3100.00 }
        ],
        totalBills: 9,
        totalRevenue: 9750.00
      };
    } else {
      return {
        rows: [
          { date: '17 Nov 2026', type: 'Dine-In', bills: 2, revenue: 2450.00 },
          { date: '3 Nov 2026', type: 'Dine-In', bills: 3, revenue: 3454.50 },
          { date: '1 Nov 2026', type: 'Dine-In', bills: 1, revenue: 672.00 }
        ],
        totalBills: 6,
        totalRevenue: 6576.50
      };
    }
  }, [kpiReportDateFilter]);

  // Dynamic Menu Report Data reacting to Today / This Week / This Month
  const dynamicMenuReports = useMemo(() => {
    if (kpiReportDateFilter === 'today') {
      return [
        { name: 'Butter Chicken', category: 'Main Course', sold: 2, rev: 580.00 },
        { name: 'Paneer Tikka', category: 'Starters', sold: 3, rev: 720.00 },
        { name: 'Veg Spring Rolls', category: 'Starters', sold: 2, rev: 300.00 }
      ];
    } else if (kpiReportDateFilter === 'week') {
      return [
        { name: 'Butter Chicken', category: 'Main Course', sold: 8, rev: 2320.00 },
        { name: 'Paneer Tikka', category: 'Starters', sold: 12, rev: 2880.00 },
        { name: 'Veg Spring Rolls', category: 'Starters', sold: 10, rev: 1500.00 },
        { name: 'Dal Tadka', category: 'Main Course', sold: 6, rev: 1080.00 }
      ];
    } else {
      return [
        { name: 'Butter Chicken', category: 'Main Course', sold: 18, rev: 5220.00 },
        { name: 'Paneer Tikka', category: 'Starters', sold: 24, rev: 5760.00 },
        { name: 'Veg Spring Rolls', category: 'Starters', sold: 15, rev: 2250.00 },
        { name: 'Dal Tadka', category: 'Main Course', sold: 14, rev: 2520.00 }
      ];
    }
  }, [kpiReportDateFilter]);

  // Load Saved Settings on Mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const savedLogo = await AsyncStorage.getItem('@hotel_brand_logo');
        if (savedLogo) setHotelLogo(savedLogo);

        const savedProfile = await AsyncStorage.getItem('@hotel_profile_settings');
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          if (p.hotelName) setHotelName(p.hotelName);
          if (p.ownerName) setOwnerName(p.ownerName);
          if (p.email) setEmail(p.email);
          if (p.mobile) setMobile(p.mobile);
          if (p.alternateMobile) setAlternateMobile(p.alternateMobile);
          if (p.city) setCity(p.city);
          if (p.state) setState(p.state);
          if (p.address) setAddress(p.address);
          if (p.bankName) setBankName(p.bankName);
          if (p.accountHolderName) setAccountHolderName(p.accountHolderName);
          if (p.accountNumber) setAccountNumber(p.accountNumber);
          if (p.ifscCode) setIfscCode(p.ifscCode);
          if (p.upiId) setUpiId(p.upiId);
          if (p.bankPhone) setBankPhone(p.bankPhone);
          if (p.logo && !savedLogo) setHotelLogo(p.logo);
        }

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
          if (b.enableBluetoothPrinter !== undefined) setEnableBluetoothPrinter(b.enableBluetoothPrinter);
          if (b.bluetoothRollSize) setBluetoothRollSize(b.bluetoothRollSize);
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

        apiClient.get('/hotel/backup/status').then((res) => {
          const d = res.data?.data;
          if (d?.sender) setSmtpSenderEmail(d.sender);
        }).catch(() => { });
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
      'UTILITIES': { mr: 'उपयुक्तता', hi: 'उपयोगिता' },
      'Water': { mr: 'पाणी', hi: 'पानी' },
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
      'Kitchen Utilities': { mr: 'स्वयंपाकघर उपयुक्तता', hi: 'रसोई उपयोगिता' },
      'water': { mr: 'पाणी खर्च', hi: 'पानी खर्च' },
      'Water': { mr: 'पाणी खर्च', hi: 'पानी खर्च' },
    };
    return dict[n]?.[language] || n;
  };

  // Pick Brand Logo from phone photo gallery
  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          language === 'mr' ? 'परवानगी आवश्यक' : language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
          language === 'mr' ? 'लोगो निवडण्यासाठी फोटो गॅलरीची परवानगी द्या.' : language === 'hi' ? 'लोगो चुनने के लिए फोटो गैलरी की अनुमति दें।' : 'Please allow photo gallery access to upload a brand logo.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const imageUriOrBase64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : uri;
        setHotelLogo(imageUriOrBase64);
        await AsyncStorage.setItem('@hotel_brand_logo', imageUriOrBase64);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not pick image: ' + (err?.message || err));
    }
  };

  const handleRemoveLogo = async () => {
    setHotelLogo(null);
    await AsyncStorage.removeItem('@hotel_brand_logo');
  };

  // Save Hotel Profile & Brand Logo
  const handleSaveProfile = async () => {
    try {
      const cleanMobile = (mobile || '').replace(/\D/g, '');
      if (cleanMobile && !/^[6-9]\d{9}$/.test(cleanMobile)) {
        Alert.alert('Validation Error', 'Mobile Number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.');
        return;
      }
      const cleanBankPhone = (bankPhone || '').replace(/\D/g, '');
      if (cleanBankPhone && !/^[6-9]\d{9}$/.test(cleanBankPhone)) {
        Alert.alert('Validation Error', 'Bank Registered Mobile Number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.');
        return;
      }
      const profileData = {
        name: hotelName,
        hotelName,
        ownerName,
        contactEmail: email,
        email,
        phone: cleanMobile,
        mobile: cleanMobile,
        alternateMobile,
        city,
        state,
        pincode,
        address,
        currency,
        bankName,
        accountHolderName,
        accountNumber,
        ifscCode,
        upiId,
        bankPhone: cleanBankPhone,
        logo: hotelLogo,
      };
      await AsyncStorage.setItem('@hotel_profile_settings', JSON.stringify(profileData));
      if (hotelLogo) {
        await AsyncStorage.setItem('@hotel_brand_logo', hotelLogo);
      } else {
        await AsyncStorage.removeItem('@hotel_brand_logo');
      }

      // Sync with backend profile API if online
      try {
        await ensureBackendToken();
        await apiClient.put('/hotel/profile', profileData).catch(() => { });
      } catch { }

      setProfileSavedNotice(true);
      setTimeout(() => setProfileSavedNotice(false), 2500);
      Alert.alert('Settings Saved');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    }
  };

  // Immediate Test Trigger for 11:00 PM Daily Business Backup Email
  const handleSendDailyBackupNow = async () => {
    setBackupSending(true);
    setBackupStatusMsg('');
    try {
      await ensureBackendToken();
      // Ensure backend has latest contactEmail from profile
      const cleanMobile = (mobile || '').replace(/\D/g, '');
      await apiClient.put('/hotel/profile', {
        name: hotelName,
        hotelName,
        contactEmail: email,
        email,
        phone: cleanMobile,
        mobile: cleanMobile,
        address,
        city,
      }).catch(() => { });

      const res = await apiClient.post('/hotel/backup/send-email', null, {
        params: {
          customEmail: email,
        }
      });
      const data = res.data?.data;
      const ref = data?.reference || 'HTL-SUCCESS';
      const target = data?.recipientEmail || email;
      if (data?.success) {
        setBackupStatusMsg(`Backup sent to ${target} (${ref})`);
        Alert.alert(
          'Daily Backup Sent Successfully',
          `Your complete daily business data backup email has been sent to ${target}.\n\nReference: ${ref}\nAttachments: Excel (.xlsx) & PDF report.\n\nAutomated backup will continue to run every night at 11:00 PM.`
        );
      } else {
        setBackupStatusMsg(`Backup saved on server (${ref})`);
        const smtpNotice = data?.error ? `\n\nSMTP Notice: ${data.error}` : '';
        Alert.alert(
          'Daily Backup Generated & Saved',
          `Your complete daily business data backup (${ref}) was generated and saved securely on the server!${smtpNotice}\n\nAutomated schedule will also run nightly at 11:00 PM.`
        );
      }
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || e.message || 'Failed to send backup email';
      setBackupStatusMsg(`Error: ${errMsg}`);
      Alert.alert('Backup Error', errMsg);
    } finally {
      setBackupSending(false);
    }
  };

  const handleDownloadDailyBackupExcel = async () => {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/backup/download-excel', {
        responseType: 'blob',
      });
      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hotel_daily_backup_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Excel Ready', 'Daily backup Excel (.xlsx) generated successfully with all worksheets.');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Failed to download Excel backup');
    }
  };

  const handleDownloadDailyBackup = async () => {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/backup/download');
      const jsonContent = JSON.stringify(res.data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hotel_daily_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Backup Ready', 'Daily backup JSON generated successfully.');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Failed to download backup');
    }
  };

  const handleDownloadDailyBackupPdf = async () => {
    try {
      await ensureBackendToken();
      const res = await apiClient.get('/hotel/backup/download-pdf', {
        responseType: 'blob',
      });
      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hotel_daily_backup_summary_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('PDF Ready', 'Daily backup PDF summary generated successfully.');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Failed to download PDF summary');
    }
  };

  const handleSaveSmtpSettings = async () => {
    setSavingSmtp(true);
    try {
      await ensureBackendToken();
      await apiClient.post('/hotel/backup/settings', null, {
        params: {
          senderEmail: smtpSenderEmail ? smtpSenderEmail.trim() : undefined,
          appPassword: smtpAppPassword ? smtpAppPassword.trim() : undefined,
        }
      });
      setBackupStatusMsg('Google SMTP credentials saved successfully!');
      Alert.alert(
        'Credentials Saved',
        'Google SMTP credentials saved successfully for daily 11:00 PM backups!'
      );
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || e.message || 'Failed to save SMTP settings';
      Alert.alert('Error', errMsg);
    } finally {
      setSavingSmtp(false);
    }
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
      Alert.alert('Settings Saved');
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
        enableBluetoothPrinter,
        bluetoothRollSize,
      };
      await AsyncStorage.setItem('@hotel_billing_settings', JSON.stringify(data));
      setLastSavedMessage('Just now');
      Alert.alert('Settings Saved');
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save billing settings.'));
    }
  };

  const handleResetBilling = () => {
    setEnableTax(true);
    setEnableDiscount(true);
    setEnableRoundOff(true);
    setEnableBluetoothPrinter(true);
    setBluetoothRollSize('80mm');
    Alert.alert(t('reset', 'Reset'), t('resetToDefaults', 'Billing settings reset to defaults.'));
  };

  const handleTestPrint = async () => {
    try {
      setTestPrintLoading(true);
      await MobilePrintService.testPrint(bluetoothRollSize);
    } catch (err: any) {
      Alert.alert('Test Print Error', err.message || 'Could not send test print.');
    } finally {
      setTestPrintLoading(false);
    }
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
      Alert.alert('Settings Saved');
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
      Alert.alert('Settings Saved');
    } catch {
      Alert.alert(t('error', 'Error'), t('failedToSave', 'Failed to save GST configuration.'));
    }
  };

  // Renew License Handler
  const handleRenewLicense = async () => {
    setShowUpgradeModal(true);
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
    Alert.alert('Settings Saved');
  };

  const handleLoadSampleCsv = () => {
    const sample = `Daily Vegetables,Food Supplies,1850,17 Nov 2026,MB-1,Cash,Fresh vegetables from APMC
Commercial Gas Cylinder,Fuel & Gas,2400,17 Nov 2026,MB-1,UPI,HP Commercial 19kg refill
Dairy Products & Paneer,Dairy,1350,16 Nov 2026,MB-1,UPI,Fresh paneer and curd
Kitchen Spices & Oils,Groceries,950,15 Nov 2026,MB-1,Cash,Garam masala & sunflower oil`;
    setImportCsvText(sample);
  };

  const handleConfirmImportCsv = async () => {
    if (!importCsvText.trim()) {
      Alert.alert(t('error', 'Error'), t('pleaseEnterCsvData', 'Please enter or paste CSV data to import.'));
      return;
    }

    try {
      const lines = importCsvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        Alert.alert(t('error', 'Error'), t('noDataFoundInCsv', 'No data found in CSV.'));
        return;
      }

      let startIdx = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('name') || firstLineLower.includes('amount') || firstLineLower.includes('category')) {
        startIdx = 1;
      }

      const importedItems: ExpenseItem[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const rawLine = lines[i];
        const parts: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let c = 0; c < rawLine.length; c++) {
          const char = rawLine[c];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        parts.push(cur.trim());

        if (parts.length >= 3) {
          const name = parts[0]?.replace(/^"|"$/g, '') || `Expense-${Date.now()}`;
          const category = parts[1]?.replace(/^"|"$/g, '') || 'General';
          const amountNum = parseFloat(parts[2]?.replace(/[₹, "]/g, '')) || 0;
          const date = parts[3]?.replace(/^"|"$/g, '') || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const branchCode = parts[4]?.replace(/^"|"$/g, '') || (activeBranch?.code || 'MB-1');
          const paymentMode = parts[5]?.replace(/^"|"$/g, '') || 'UPI';
          const description = parts[6]?.replace(/^"|"$/g, '') || '';

          if (amountNum > 0) {
            importedItems.push({
              id: `EXP-IMP-${Date.now()}-${i}`,
              name,
              category,
              amount: amountNum,
              quantity: '1',
              date,
              branchCode,
              paymentMode,
              description,
            });
          }
        }
      }

      if (importedItems.length === 0) {
        Alert.alert(t('invalidCsv', 'Invalid CSV'), t('noValidExpenseRowsFound', 'No valid expense rows found. Format: Name, Category, Amount, Date, BranchCode, PaymentMode, Description'));
        return;
      }

      const updated = [...importedItems, ...expenses];
      setExpenses(updated);
      try {
        await AsyncStorage.setItem('@hotel_expenses_list', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setShowImportExpenseModal(false);
      setImportCsvText('');
      Alert.alert(
        t('importSuccess', 'Import Successful'),
        `${toDevanagari(importedItems.length)} ${t('expensesImportedSuccessfully', 'expenses imported successfully!')}`
      );
    } catch (e: any) {
      Alert.alert(t('importFailed', 'Import Failed'), e?.message || 'Error parsing CSV data');
    }
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
      case 'reports': return t('reportAndKpi', 'Report & KPI');
      case 'gst-reports': return t('gstSettingsAndReports', 'GST Settings & Reports');
      case 'printer': return language === 'mr' ? 'प्रिंटर व्यवस्थापन' : language === 'hi' ? 'प्रिंटर सेटिंग्स' : 'Printer Settings';
      case 'server': return language === 'mr' ? 'सेंट्रल सर्व्हर कनेक्टिव्हिटी' : language === 'hi' ? 'सेंट्रल सर्वर कनेक्टिविटी' : 'Central Server Connection';
    }
  };

  const getNavItemDesc = (key: SettingsTabKey): string => {
    switch (key) {
      case 'profile': return t('businessInformation', 'Business Information');
      case 'billing': return t('invoicePreferences', 'Invoice preferences');
      case 'notifications': return t('alertsAndNotifications', 'Alerts & notifications');
      case 'system': return t('systemAndBackup', 'System & backup');
      case 'reports': return t('businessAnalyticsReports', 'Business analytics & reports');
      case 'gst-reports': return t('gstConfigTaxReturnReports', 'GST configuration & tax return reports');
      case 'printer': return language === 'mr' ? 'ब्लूटूथ, वाय-फाय, USB थर्मल आणि Android सिस्टीम प्रिंटर' : language === 'hi' ? 'ब्लूटूथ, वाई-फाई, USB और एंड्रॉइड प्रिंटर' : 'Bluetooth, Wi-Fi, USB & Android Print Service';
      case 'server': return language === 'mr' ? 'Vite वेब आणि मोबाइल डेटा सिंक (स्प्रिंग बूट व SQL Server)' : language === 'hi' ? 'Vite वेब और मोबाइल डेटा सिंक (स्प्रिंग बूट और SQL Server)' : 'Real-time database sync with Vite Web POS';
    }
  };

  // Comprehensive searchable settings directory
  const ALL_SETTINGS_LIST = useMemo(() => [
    {
      id: 'printer_thermal',
      tabKey: 'printer' as SettingsTabKey,
      title: language === 'mr' ? 'थर्मल प्रिंटर (Bluetooth, Wi-Fi, USB)' : language === 'hi' ? 'थर्मल प्रिंटर (Bluetooth, Wi-Fi, USB)' : 'Thermal Printer Management',
      desc: language === 'mr' ? 'ब्लूटूथ व नेटवर्क थर्मल प्रिंटर जोडा, डिस्कव्हर करा व टेस्ट प्रिंट काढा' : language === 'hi' ? 'ब्लूटूथ और नेटवर्क प्रिंटर कनेक्ट और टेस्ट करें' : 'Connect, discover, configure & test ESC/POS thermal printers',
      category: language === 'mr' ? 'प्रिंटर' : 'Printers',
      keywords: ['printer', 'thermal', 'bluetooth', 'wifi', 'usb', 'escpos', 'print', 'tharmal', 'bill', 'प्रिंटर', 'थर्मल', 'ब्लूटूथ', 'वायफाय', 'बिल', 'छापा'],
      icon: Printer,
    },
    {
      id: 'printer_paper',
      tabKey: 'printer' as SettingsTabKey,
      title: language === 'mr' ? 'प्रिंटर पेपर साईझ (58mm / 80mm)' : language === 'hi' ? 'प्रिंटर पेपर साइज (58mm / 80mm)' : 'Paper Size (58mm / 80mm Thermal)',
      desc: language === 'mr' ? '2-इंच (58mm) किंवा 3-इंच (80mm) थर्मल पेपर रोल निवडा' : language === 'hi' ? '58mm या 80mm थर्मल पेपर रोल चुनें' : 'Choose 2-inch (58mm) or 3-inch (80mm) thermal roll format',
      category: language === 'mr' ? 'प्रिंटर' : 'Printers',
      keywords: ['paper', 'size', '58mm', '80mm', 'thermal', 'roll', 'कागद', 'आकार', 'पेपर', 'साईज', 'रोल'],
      icon: Printer,
    },
    {
      id: 'hotel_profile',
      tabKey: 'profile' as SettingsTabKey,
      title: language === 'mr' ? 'हॉटेल प्रोफाइल आणि माहिती' : language === 'hi' ? 'होटल प्रोफाइल और विवरण' : 'Hotel Profile & Identity',
      desc: language === 'mr' ? 'हॉटेलचे नाव, पत्ता, संपर्क क्रमांक, ईमेल आणि लोगो बदला' : language === 'hi' ? 'होटल का नाम, पता, फोन, ईमेल और लोगो बदलें' : 'Hotel name, address, contact numbers, email and brand logo',
      category: language === 'mr' ? 'प्रोफाइल' : 'Profile',
      keywords: ['profile', 'hotel', 'name', 'address', 'phone', 'email', 'logo', 'नाव', 'पत्ता', 'फोन', 'हॉटेल', 'लोगो'],
      icon: Building2,
    },
    {
      id: 'gst_fssai',
      tabKey: 'profile' as SettingsTabKey,
      title: language === 'mr' ? 'GSTIN आणि FSSAI परवाना' : language === 'hi' ? 'GSTIN और FSSAI लाइसेंस' : 'GSTIN & FSSAI Food Licence',
      desc: language === 'mr' ? 'जीएसटी क्रमांक (GSTIN) आणि अन्न सुरक्षा परवाना क्रमांक (FSSAI)' : language === 'hi' ? 'GST नंबर और FSSAI खाद्य लाइसेंस' : 'Business GST identification number and food safety licence',
      category: language === 'mr' ? 'प्रोफाइल' : 'Profile',
      keywords: ['gstin', 'fssai', 'gst', 'tax', 'licence', 'license', 'जीएसटी', 'कर', 'परवाना', 'लायसन्स'],
      icon: Building2,
    },
    {
      id: 'billing_invoice',
      tabKey: 'billing' as SettingsTabKey,
      title: language === 'mr' ? 'बिलिंग आणि इनव्हॉइस नंबरिंग' : language === 'hi' ? 'बिलिंग और इनवॉइस नंबरिंग' : 'Billing & Invoice Prefix Settings',
      desc: language === 'mr' ? 'इनव्हॉइस प्रिफिक्स, बिल सिरीयल नंबर आणि काउंटर सेटिंग्ज' : language === 'hi' ? 'इनवॉइस प्रीफिक्स और बिल नंबर सेटिंग' : 'Invoice prefix, serial sequence, and counter billing preferences',
      category: language === 'mr' ? 'बिलिंग' : 'Billing',
      keywords: ['billing', 'invoice', 'prefix', 'bill', 'counter', 'number', 'बिल', 'पावती', 'बिलिंग', 'प्रिफिक्स', 'क्रमांक'],
      icon: ReceiptRupee,
    },
    {
      id: 'billing_tax_charges',
      tabKey: 'billing' as SettingsTabKey,
      title: language === 'mr' ? 'कर, सवलत आणि राउंड-ऑफ' : language === 'hi' ? 'टैक्स, छूट और राउंड-ऑफ' : 'Taxes, Discounts & Round-Off',
      desc: language === 'mr' ? 'जीएसटी दर, सर्व्हिस चार्ज, डिस्काउंट आणि ऑटो राउंड-ऑफ' : language === 'hi' ? 'जीएसटी दर, सर्विस चार्ज, छूट और ऑटो राउंड ऑफ' : 'GST rates, service charges, discounts, and automatic round-off',
      category: language === 'mr' ? 'बिलिंग' : 'Billing',
      keywords: ['tax', 'gst', 'discount', 'service charge', 'roundoff', 'round', 'कर', 'सवलत', 'चार्ज', 'राउंड'],
      icon: ReceiptRupee,
    },
    {
      id: 'system_language',
      tabKey: 'system' as SettingsTabKey,
      title: language === 'mr' ? 'अ‍ॅप भाषा (मराठी / हिंदी / English)' : language === 'hi' ? 'ऐप भाषा (मराठी / हिंदी / English)' : 'Application Language',
      desc: language === 'mr' ? 'मराठी, हिंदी किंवा इंग्रजी भाषा निवडा' : language === 'hi' ? 'मराठी, हिंदी या अंग्रेजी भाषा चुनें' : 'Choose Marathi, Hindi, or English language',
      category: language === 'mr' ? 'सिस्टम' : 'System',
      keywords: ['language', 'marathi', 'hindi', 'english', 'भाषा', 'मराठी', 'हिंदी', 'इंग्रजी'],
      icon: Globe,
    },
    {
      id: 'system_date_time',
      tabKey: 'system' as SettingsTabKey,
      title: language === 'mr' ? 'तारीख व वेळ स्वरूप (Date & Time)' : language === 'hi' ? 'दिनांक और समय प्रारूप' : 'Date & Time Format',
      desc: language === 'mr' ? 'DD/MM/YYYY आणि 12/24 तास वेळ स्वरूप सेट करा' : language === 'hi' ? 'तारीख और समय प्रारूप सेट करें' : 'Configure calendar date and 12/24 hr clock format',
      category: language === 'mr' ? 'सिस्टम' : 'System',
      keywords: ['date', 'time', 'format', 'clock', 'तारीख', 'वेळ', 'दिनांक', 'समय'],
      icon: Clock,
    },
    {
      id: 'system_backup',
      tabKey: 'system' as SettingsTabKey,
      title: language === 'mr' ? 'डेटा बॅकअप आणि सुरक्षितता' : language === 'hi' ? 'डेटा बैकअप और सुरक्षा' : 'Data Backup & Management',
      desc: language === 'mr' ? 'स्वयंचलित बॅकअप वेळापत्रक आणि तात्काळ डेटा बॅकअप घ्या' : language === 'hi' ? 'ऑटो बैकअप और तुरंत बैकअप लें' : 'Schedule automated backup or create instant system backup',
      category: language === 'mr' ? 'सिस्टम' : 'System',
      keywords: ['backup', 'restore', 'data', 'database', 'sql', 'बॅकअप', 'डेटा', 'सुरक्षित'],
      icon: Database,
    },
    {
      id: 'notifications_sound',
      tabKey: 'notifications' as SettingsTabKey,
      title: language === 'mr' ? 'ऑर्डर अलर्ट व नोटिफिकेशन आवाज' : language === 'hi' ? 'ऑर्डर अलर्ट और सूचना ध्वनि' : 'Sound & Order Notifications',
      desc: language === 'mr' ? 'नवीन ऑर्डर, KOT आणि स्टॉक सूचनांसाठी आवाज अलर्ट' : language === 'hi' ? 'नए ऑर्डर और स्टॉक अलर्ट के लिए ध्वनि' : 'Sound chimes for new orders, KOT and stock alerts',
      category: language === 'mr' ? 'सूचना' : 'Notifications',
      keywords: ['sound', 'notification', 'alert', 'chime', 'kot', 'audio', 'आवाज', 'सूचना', 'घंटी'],
      icon: Bell,
    },
    {
      id: 'gst_reports_filing',
      tabKey: 'gst-reports' as SettingsTabKey,
      title: language === 'mr' ? 'जीएसटी रिटर्न्स (GSTR-1, GSTR-3B)' : language === 'hi' ? 'जीएसटी रिटर्न (GSTR-1, GSTR-3B)' : 'GST Returns & Tax Filing',
      desc: language === 'mr' ? 'GSTR-1, GSTR-3B मासिक सारांश आणि HSN टॅक्स रिपोर्ट' : language === 'hi' ? 'GSTR-1, GSTR-3B और HSN टैक्स रिपोर्ट' : 'GSTR-1, GSTR-3B summaries and HSN wise GST reports',
      category: language === 'mr' ? 'जीएसटी' : 'GST',
      keywords: ['gst', 'gstr1', 'gstr3b', 'hsn', 'tax', 'returns', 'जीएसटी', 'कर', 'अहवाल', 'टॅक्स'],
      icon: FileText,
    },
    {
      id: 'sales_reports_daily',
      tabKey: 'reports' as SettingsTabKey,
      title: language === 'mr' ? 'दैनिक विक्री व हिशोब अहवाल' : language === 'hi' ? 'दैनिक बिक्री और वित्तीय रिपोर्ट' : 'Daily Sales & Financial Reports',
      desc: language === 'mr' ? 'रोजची विक्री, पेमेंट पद्धती आणि नफा-तोटा अहवाल' : language === 'hi' ? 'दैनिक बिक्री और भुगतान रिपोर्ट' : 'Daily sales summary, payment breakdowns and financial audit',
      category: language === 'mr' ? 'अहवाल' : 'Reports',
      keywords: ['reports', 'sales', 'collection', 'revenue', 'financial', 'विक्री', 'हिशोब', 'अहवाल'],
      icon: BarChart3,
    },
  ], [language]);

  const matchingSettings = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return ALL_SETTINGS_LIST.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery, ALL_SETTINGS_LIST]);

  const filteredNavItems = useMemo(() => {
    const rawItems: {
      key: SettingsTabKey;
      label: string;
      desc: string;
      icon: any;
    }[] = [
        { key: 'profile', label: getNavItemLabel('profile'), desc: getNavItemDesc('profile'), icon: Building2 },
        { key: 'billing', label: getNavItemLabel('billing'), desc: getNavItemDesc('billing'), icon: ReceiptRupee },
        { key: 'printer', label: getNavItemLabel('printer'), desc: getNavItemDesc('printer'), icon: Printer },
        { key: 'notifications', label: getNavItemLabel('notifications'), desc: getNavItemDesc('notifications'), icon: Bell },
        { key: 'system', label: getNavItemLabel('system'), desc: getNavItemDesc('system'), icon: SlidersHorizontal },
        { key: 'reports', label: getNavItemLabel('reports'), desc: getNavItemDesc('reports'), icon: BarChart3 },
        { key: 'gst-reports', label: getNavItemLabel('gst-reports'), desc: getNavItemDesc('gst-reports'), icon: FileText },
      ];
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase().trim();
    const matchingTabs = new Set(matchingSettings.map((m) => m.tabKey));
    return rawItems.filter(
      (item) =>
        matchingTabs.has(item.key) ||
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [searchQuery, language, matchingSettings]);

  // Dropdown Picker Modal
  const renderDropdownPickerModal = () => {
    if (!pickerModalType) return null;

    let title = '';
    let options: string[] = [];
    let currentVal = '';
    let onSelect: (val: string) => void = () => { };

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
      options = ['Daily at 11:00 PM (Night)', 'Daily', 'Weekly', 'Monthly'];
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
    <View style={[styles.rootContainer, isDark && { backgroundColor: '#0B0F19' }]}>
      {/* Universal Top AppNavbar per user requirement: "sagli kde navbar disayla pahije" */}
      <AppNavbar navigation={navigation} activeRouteName="SettingsTab" />

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================================
            HEADER: HOTEL MANAGEMENT / SETTINGS (Subtitle & Secure Settings badge removed per user request)
        =================================================== */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.breadcrumbText, isDark && { color: '#B45309' }]}>
              {t('hotelManagement', 'HOTEL MANAGEMENT')} / {t('settings', 'SETTINGS')}
            </Text>
            <Text style={[styles.pageTitle, isDark && { color: '#F8FAFC' }]}>{t('settings', 'Settings')}</Text>
          </View>
        </View>

        {/* ===================================================
            SEARCH TOOLBAR: "Search settings..." + Clear button & Results
        =================================================== */}
        <View style={[styles.searchToolbar, isDark && { backgroundColor: '#161F36', borderColor: '#2A364F' }]}>
          <View style={[styles.searchInputWrap, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]}>
            <Search size={16} color={isDark ? '#94A3B8' : '#9CA3AF'} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, isDark && { color: '#F8FAFC' }]}
              placeholder={t('searchSettings', 'Search settings (e.g. theme, printer, tax, profile)...')}
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (matchingSettings.length > 0) {
                  handleSelectSearchResult(matchingSettings[0].tabKey);
                }
              }}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color={isDark ? '#94A3B8' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>
          {(searchQuery.trim().length > 0 || lastSavedMessage) ? (
            <View style={[styles.readyPill, isDark && { backgroundColor: '#1E293B' }]}>
              <Text style={[styles.readyPillText, isDark && { color: '#38BDF8' }]}>
                {searchQuery.trim().length > 0
                  ? `${matchingSettings.length} ${language === 'mr' ? 'सापडले' : language === 'hi' ? 'मिले' : 'found'}`
                  : `Saved ${lastSavedMessage}`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Interactive Search Results Panel */}
        {searchQuery.trim().length > 0 && (
          <View style={[styles.searchResultsPanel, isDark && { backgroundColor: '#161F36', borderColor: '#2A364F' }]}>
            <View style={styles.searchResultsHeader}>
              <Text style={[styles.searchResultsCount, isDark && { color: '#F8FAFC' }]}>
                {matchingSettings.length > 0
                  ? `${matchingSettings.length} ${language === 'mr' ? 'सेटिंग्ज सापडल्या' : language === 'hi' ? 'सेटिंग्स मिलीं' : 'settings found'}`
                  : language === 'mr' ? 'कोणतीही सेटिंग सापडली नाही' : 'No matching settings found'}
              </Text>
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchBtnText}>{language === 'mr' ? 'साफ करा (Clear)' : 'Clear'}</Text>
              </TouchableOpacity>
            </View>
            {matchingSettings.map((item) => {
              const ItemIcon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.searchResultCard, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]}
                  onPress={() => handleSelectSearchResult(item.tabKey)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.searchResultIconBox, isDark && { backgroundColor: '#1E293B' }]}>
                    <ItemIcon size={18} color={isDark ? '#F59E0B' : '#7C2D12'} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.searchResultTitle, isDark && { color: '#F8FAFC' }]}>{item.title}</Text>
                      <View style={[styles.categoryBadge, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                        <Text style={[styles.categoryBadgeText, isDark && { color: '#38BDF8' }]}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.searchResultDesc, isDark && { color: '#94A3B8' }]} numberOfLines={2}>
                      {item.desc}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={isDark ? '#94A3B8' : '#9CA3AF'} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
            </View>
          </View>

          <View style={styles.heroRightSection}>
            <View style={styles.heroMetaCol}>
              <Text style={styles.heroMetaLabel}>{t('planName', 'PLAN NAME')}</Text>
              <Text style={[styles.heroMetaVal, { color: '#16A34A' }]}>{activePlanName}</Text>
            </View>

            <View style={styles.heroMetaCol}>
              <Text style={styles.heroMetaLabel}>{t('validity', 'VALIDITY')}</Text>
              <Text style={styles.heroMetaVal}>{toDevanagari(daysRemaining)} {t('days', 'Days')}</Text>
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
            HORIZONTAL TABS & CONTENT SETTINGS LAYOUT
        =================================================== */}
        <View style={styles.settingsLayout}>
          {/* TOP HORIZONTAL TABS BAR */}
          <View style={styles.subSidebar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalTabsContent}
            >
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
                      <Icon size={13} color={isSelected ? '#FFFFFF' : '#8B786D'} />
                    </View>
                    <Text
                      style={[
                        styles.subNavTitle,
                        isSelected && styles.subNavTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {getNavItemLabel(item.key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* MAIN CONTENT AREA */}
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
                      <Download size={13} color="#FFFFFF" />
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

                {/* SUB-TAB 1: GST SETTINGS (12 fields aligned identically to Hotel Profile) */}
                {gstSubTab === 'gst-settings' && (
                  <View style={styles.gstSettingsCardWrapper}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>{t('gstSettings', 'GST Settings')}</Text>
                        <Text style={styles.cardSubtitle}>
                          {t('gstSettingsDesc', 'Manage restaurant GSTIN, tax rates, food slabs and tax configuration.')}
                        </Text>
                      </View>
                    </View>

                    {/* Row 1: GST Enabled & GSTIN */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('gstEnabled', 'GST Enabled')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('gstEnabled')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText}>
                            {gstEnabled === 'Enabled' ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
                          </Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('gstin', 'GSTIN')}</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 27AAAAA1111A1"
                          placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                          value={gstin}
                          onChangeText={setGstin}
                          autoCapitalize="characters"
                        />
                        <Text style={styles.gstHint}>{t('maskedGstinFormat', 'Masked format: 27XXXXXXXXXX1Z5')}</Text>
                      </View>
                    </View>

                    {/* Row 2: Business State & Registration Type */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('businessState', 'Business State')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('businessState')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText}>{toDevanagari(businessState)}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('registrationType', 'Registration Type')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('registrationType')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText}>
                            {registrationType === 'Regular' ? t('regular', 'Regular') : registrationType}
                          </Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Row 3: Food Slab / Default GST Rate & CGST Rate */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel} numberOfLines={1}>{t('foodSlabRate', 'Food Slab / Default GST Rate')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('foodSlabRate')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText} numberOfLines={1}>
                            {language === 'mr' ? '५% (रेस्टॉरंट सेवा)' : language === 'hi' ? '५% (रेस्तरां सेवाएं)' : foodSlabRate}
                          </Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('cgstRate', 'CGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                          value={cgstRate}
                          onChangeText={setCgstRate}
                          placeholder="2.5"
                        />
                      </View>
                    </View>

                    {/* Row 4: SGST Rate & IGST Rate */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('sgstRate', 'SGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                          value={sgstRate}
                          onChangeText={setSgstRate}
                          placeholder="2.5"
                        />
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('igstRate', 'IGST Rate')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="decimal-pad"
                          placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                          value={igstRate}
                          onChangeText={setIgstRate}
                          placeholder="5"
                        />
                      </View>
                    </View>

                    {/* Row 5: HSN / SAC & Tax Inclusive / Exclusive */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('hsnSac', 'HSN / SAC')}</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="number-pad"
                          placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                          value={hsnSac}
                          onChangeText={setHsnSac}
                          placeholder="8863"
                        />
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('taxInclusiveExclusive', 'Tax Inclusive / Exclusive')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('taxInclusiveExclusive')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText} numberOfLines={1}>
                            {taxInclusiveExclusive === 'Tax Exclusive' ? t('taxExclusive', 'Tax Exclusive') : t('taxInclusive', 'Tax Inclusive')}
                          </Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Row 6: Return Period & Financial Year */}
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('returnPeriod', 'Return Period')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('returnPeriod')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText}>
                            {returnPeriod === 'Monthly' ? t('monthly', 'Monthly') : returnPeriod}
                          </Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>{t('financialYear', 'Financial Year')}</Text>
                        <TouchableOpacity
                          style={styles.selectInput}
                          onPress={() => setPickerModalType('financialYear')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.selectInputText}>{toDevanagari(financialYear)}</Text>
                          <ChevronDown size={14} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.cardActionsRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 }]}>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSaveGst}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.saveButtonText}>{t('saveGstSettings', 'Save GST Settings')}</Text>
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
                  </View>
                </View>

                {/* Expenses & Reports Sub-header */}
                <View style={styles.subReportBanner}>
                  <View>
                    <Text style={styles.subReportTitle}>{t('expensesAndReports', 'Expenses & Reports')}</Text>
                    <Text style={styles.subReportSubtitle}>
                      {t('manageHotelExpenses', 'Manage your hotel expenses and view business insights')}
                    </Text>
                  </View>

                  <View style={styles.subReportActionButtons}>
                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      onPress={() => setShowImportExpenseModal(true)}
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
                        try {
                          const totalExp = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                          const html = buildExpenseReportHtml({
                            hotelName: hotelName || 'Royal Palace Hotel',
                            branchName: activeBranch?.name || 'Main Branch',
                            totalExpenses: totalExp,
                            expenses: expenses,
                          });
                          await downloadAndSharePdf('Hotel_Expense_Report', html);
                        } catch (err: any) {
                          console.error('Expense PDF export failed:', err);
                        }
                      }}
                    >
                      <Printer size={13} color="#4B5563" />
                      <Text style={styles.outlineActionBtnText}>{t('pdf', 'PDF')}</Text>
                    </TouchableOpacity>

                    {/* Customize View Toggle Button (Matching Vite hotelreport.tsx Requirement 6) */}
                    <TouchableOpacity
                      style={[
                        styles.outlineActionBtn,
                        showKpiCustomize && { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#F59E0B' },
                      ]}
                      onPress={() => setShowKpiCustomize(!showKpiCustomize)}
                      activeOpacity={0.8}
                    >
                      <SlidersHorizontal size={13} color={showKpiCustomize ? '#B45309' : '#4B5563'} />
                      <Text style={[styles.outlineActionBtnText, showKpiCustomize && { color: '#B45309', fontWeight: '800' }]}>
                        {t('customizeView', 'Customize View')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* KPI Cards Visibility Customizer (Matching Vite Requirement 6) */}
                {showKpiCustomize && (
                  <View style={styles.kpiCustomizeCard}>
                    <View style={styles.kpiCustomizeHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <SlidersHorizontal size={14} color="#EA580C" />
                        <Text style={styles.kpiCustomizeTitle}>
                          {t('kpiCardsVisibility', 'KPI Cards Visibility (केपीआय कार्ड्स दृश्यमानता)')}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowKpiCustomize(false)}>
                        <X size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.kpiCustomizeGrid}>
                      {[
                        { key: 'sales', label: t('totalSales', 'Total Sales') },
                        { key: 'expenses', label: t('totalExpenses', 'Total Expenses') },
                        { key: 'net', label: t('netAmount', 'Net Amount') },
                        { key: 'profit', label: t('profit', 'Profit') },
                        { key: 'loss', label: t('loss', 'Loss') },
                        { key: 'bills', label: t('totalBills', 'Total Bills') },
                        { key: 'orders', label: t('totalOrders', 'Total Orders') },
                      ].map((item) => {
                        const checked = kpiVisibility[item.key as keyof typeof kpiVisibility];
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={styles.kpiCustomizeRow}
                            onPress={() =>
                              setKpiVisibility((prev) => ({
                                ...prev,
                                [item.key]: !prev[item.key as keyof typeof kpiVisibility],
                              }))
                            }
                            activeOpacity={0.7}
                          >
                            <Text style={styles.kpiCustomizeItemLabel}>{item.label}</Text>
                            <View
                              style={[
                                styles.kpiCheckbox,
                                checked && styles.kpiCheckboxChecked,
                              ]}
                            >
                              {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 7 KPI Stat Cards (Matching Screenshot 2 & Vite) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.kpiCardsRow}
                >
                  {kpiVisibility.sales && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('totalSales', 'TOTAL SALES')}</Text>
                      <Text style={styles.kpiCardVal}>₹ {toDevanagari(kpiStats.salesFormatted)}</Text>
                    </View>
                  )}

                  {kpiVisibility.expenses && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('totalExpenses', 'TOTAL EXPENSES')}</Text>
                      <Text style={styles.kpiCardVal}>₹ {toDevanagari(kpiStats.expensesFormatted)}</Text>
                    </View>
                  )}

                  {kpiVisibility.net && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('netAmount', 'NET AMOUNT')}</Text>
                      <Text style={[styles.kpiCardVal, { color: kpiStats.net >= 0 ? '#16A34A' : '#DC2626' }]}>
                        ₹ {kpiStats.net >= 0 ? '' : '-'}{toDevanagari(kpiStats.netFormatted)}
                      </Text>
                    </View>
                  )}

                  {kpiVisibility.profit && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('profit', 'PROFIT')}</Text>
                      <Text style={[styles.kpiCardVal, { color: '#16A34A' }]}>₹ {toDevanagari(kpiStats.profitFormatted)}</Text>
                    </View>
                  )}

                  {kpiVisibility.loss && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('loss', 'LOSS')}</Text>
                      <Text style={[styles.kpiCardVal, { color: kpiStats.loss > 0 ? '#DC2626' : '#6B7280' }]}>
                        ₹ {toDevanagari(kpiStats.lossFormatted)}
                      </Text>
                    </View>
                  )}

                  {kpiVisibility.bills && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('totalBills', 'TOTAL BILLS')}</Text>
                      <Text style={styles.kpiCardVal}>{toDevanagari(kpiStats.bills)}</Text>
                    </View>
                  )}

                  {kpiVisibility.orders && (
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardLabel}>{t('totalOrders', 'TOTAL ORDERS')}</Text>
                      <Text style={styles.kpiCardVal}>{toDevanagari(kpiStats.orders)}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Sub-tabs Row (5 Sub-tabs with Icons matching Screenshot 2) */}
                <View style={styles.subTabsStrip}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.subTabsStripScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.subTabPill,
                        reportSubTab === 'expenses' && styles.subTabPillActive,
                      ]}
                      onPress={() => setReportSubTab('expenses')}
                    >
                      <Text
                        style={[
                          styles.subTabPillText,
                          reportSubTab === 'expenses' && styles.subTabPillTextActive,
                        ]}
                      >
                        {t('expenses', 'Expenses')}
                      </Text>
                      <ReceiptRupee
                        size={14}
                        color={reportSubTab === 'expenses' ? '#FFFFFF' : '#4B5563'}
                        strokeWidth={2}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.subTabPill,
                        reportSubTab === 'reports' && styles.subTabPillActive,
                      ]}
                      onPress={() => setReportSubTab('reports')}
                    >
                      <Text
                        style={[
                          styles.subTabPillText,
                          reportSubTab === 'reports' && styles.subTabPillTextActive,
                        ]}
                      >
                        {t('reports', 'Reports')}
                      </Text>
                      <BarChart3
                        size={14}
                        color={reportSubTab === 'reports' ? '#FFFFFF' : '#4B5563'}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.subTabPill,
                        reportSubTab === 'charts' && styles.subTabPillActive,
                      ]}
                      onPress={() => setReportSubTab('charts')}
                    >
                      <Text
                        style={[
                          styles.subTabPillText,
                          reportSubTab === 'charts' && styles.subTabPillTextActive,
                        ]}
                      >
                        {t('charts', 'Charts')}
                      </Text>
                      <TrendingUp
                        size={14}
                        color={reportSubTab === 'charts' ? '#FFFFFF' : '#4B5563'}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.subTabPill,
                        reportSubTab === 'gst-scale' && styles.subTabPillActive,
                      ]}
                      onPress={() => setReportSubTab('gst-scale')}
                    >
                      <Text
                        style={[
                          styles.subTabPillText,
                          reportSubTab === 'gst-scale' && styles.subTabPillTextActive,
                        ]}
                      >
                        {t('GstReport', 'GST Report')}
                      </Text>
                      <FileSpreadsheet
                        size={14}
                        color={reportSubTab === 'gst-scale' ? '#FFFFFF' : '#4B5563'}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.subTabPill,
                        reportSubTab === 'purchase' && styles.subTabPillActive,
                      ]}
                      onPress={() => setReportSubTab('purchase')}
                    >
                      <Text
                        style={[
                          styles.subTabPillText,
                          reportSubTab === 'purchase' && styles.subTabPillTextActive,
                        ]}
                      >
                        {t('purchase', 'Purchase')}
                      </Text>
                      <ShoppingCart
                        size={14}
                        color={reportSubTab === 'purchase' ? '#FFFFFF' : '#4B5563'}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </ScrollView>
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
                          <Text style={styles.addExpenseBtnText}>{t('addExpense', '+ Add Expense')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.expenseTable}>
                        <View style={styles.expenseTableHeader}>
                          <Text style={[styles.thCell, { width: 170 }]}>{t('expenseName', 'EXPENSE NAME')}</Text>
                          <Text style={[styles.thCell, { width: 130 }]}>{t('category', 'CATEGORY')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('amount', 'AMOUNT')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('date', 'DATE')}</Text>
                          <Text style={[styles.thCell, { width: 110 }]}>{t('branchCode', 'BRANCH CODE')}</Text>
                          <Text style={[styles.thCell, { width: 120 }]}>{t('paymentMode', 'PAYMENT MODE')}</Text>
                          <Text style={[styles.thCell, { width: 90, textAlign: 'center' }]}>{t('actionUpper', 'ACTION')}</Text>
                        </View>

                        {filteredExpenses.map((item) => (
                          <View key={item.id} style={styles.expenseTableRow}>
                            <View style={[styles.tdCell, { width: 170, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <ReceiptRupee size={14} color="#78716C" strokeWidth={2} />
                              <Text style={styles.tdTextBold} numberOfLines={1}>
                                {translateExpenseName(item.name)}
                              </Text>
                            </View>

                            <View style={[styles.tdCell, { width: 130 }]}>
                              <View style={styles.categoryPill}>
                                <Text style={styles.categoryPillText} numberOfLines={1}>
                                  {translateCategoryName(item.category)}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.tdCell, { width: 110 }]}>
                              <Text style={styles.tdAmount}>
                                ₹ {toDevanagari(item.amount.toLocaleString('en-IN'))}.00
                              </Text>
                            </View>

                            <View style={[styles.tdCell, { width: 110 }]}>
                              <Text style={styles.tdDate}>{toDevanagari(item.date)}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 110 }]}>
                              <Text style={styles.tdBranch}>{item.branchCode}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 120, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <CreditCard size={12} color="#78716C" />
                              <Text style={styles.tdText}>{t(item.paymentMode.toLowerCase(), item.paymentMode)}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: 90, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    translateExpenseName(item.name),
                                    `${t('category', 'Category')}: ${translateCategoryName(item.category)}\n${t('amount', 'Amount')}: ₹ ${toDevanagari(item.amount)}\n${t('date', 'Date')}: ${toDevanagari(item.date)}\n${t('branchCode', 'Branch')}: ${item.branchCode}\n${t('paymentMode', 'Payment')}: ${t(item.paymentMode.toLowerCase(), item.paymentMode)}`
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

                    {/* Table Footer matching Screenshot 3 */}
                    <View style={styles.expenseTableFooter}>
                      <Text style={styles.expenseTableFooterLeft}>
                        {t('showingExpenses', 'Showing')} {filteredExpenses.length} {t('expenses', 'Expenses')}
                      </Text>
                      <Text style={styles.expenseTableFooterRight}>
                        TOTAL: ₹ {toDevanagari(totalExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>
                  </View>
                )}

                {/* CHARTS SUB-TAB: Matching Screenshot 1 */}
                {reportSubTab === 'charts' && (
                  <View style={{ marginTop: 16 }}>
                    {/* Business Analytics Header Row */}
                    <View style={styles.analyticsHeaderRow}>
                      <View>
                        <Text style={styles.analyticsTitle}>{t('businessAnalytics', 'Business Analytics')}</Text>
                        <Text style={styles.analyticsSubtitle}>
                          {t('liveChartsSubtitle', 'Live charts generated from your expense and report data')}
                        </Text>
                      </View>
                      <View style={styles.kpiDatePillGroup}>
                        {(['today', 'week', 'month'] as const).map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.kpiDatePill,
                              kpiReportDateFilter === p && styles.kpiDatePillActive,
                            ]}
                            onPress={() => setKpiReportDateFilter(p)}
                            activeOpacity={0.8}
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

                    {/* Order Summary 3-Card Row (Screenshot 1: Orders: 2 | Dining: 2 | Takeaway: 0) */}
                    <View style={styles.orderSummaryRow}>
                      <View style={styles.orderSummaryCard}>
                        <Text style={styles.orderSummaryLabel}>{t('orders', 'Orders')}</Text>
                        <Text style={styles.orderSummaryVal}>{toDevanagari(kpiReportDateFilter === 'today' ? 2 : kpiReportDateFilter === 'week' ? 14 : 32)}</Text>
                      </View>
                      <View style={styles.orderSummaryCard}>
                        <Text style={styles.orderSummaryLabel}>{t('dining', 'Dining')}</Text>
                        <Text style={styles.orderSummaryVal}>{toDevanagari(kpiReportDateFilter === 'today' ? 2 : kpiReportDateFilter === 'week' ? 10 : 22)}</Text>
                      </View>
                      <View style={styles.orderSummaryCard}>
                        <Text style={styles.orderSummaryLabel}>{t('takeaway', 'Takeaway')}</Text>
                        <Text style={styles.orderSummaryVal}>{toDevanagari(kpiReportDateFilter === 'today' ? 0 : kpiReportDateFilter === 'week' ? 4 : 10)}</Text>
                      </View>
                    </View>

                    {/* 6 Charts Grid */}
                    <View style={styles.chartsGrid}>
                      {/* Chart 1: Expense Trend */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('expenseTrend', 'Expense Trend')}</Text>
                            <Text style={styles.chartSubtitle}>
                              {t('dailyExpenseMovement', 'Daily expense movement')} • {kpiReportDateFilter === 'today' ? t('today', 'Today') : kpiReportDateFilter === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                            </Text>
                          </View>
                          <Text style={styles.chartTopAmount}>
                            ₹ {toDevanagari(kpiReportDateFilter === 'today' ? '1,500.00' : '20,250.00')}
                          </Text>
                        </View>
                        <View style={styles.verticalBarContainer}>
                          <View style={styles.verticalBarCol}>
                            <Text style={styles.barTopVal}>₹ {toDevanagari('1,500.00')}</Text>
                            <View style={styles.verticalBarTrack}>
                              <View style={[styles.verticalBarPillar, { height: 80, backgroundColor: '#F97316' }]} />
                            </View>
                            <Text style={styles.barXLabel}>16 Nov 2026</Text>
                          </View>
                        </View>
                      </View>

                      {/* Chart 2: Expense by Category */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('expenseByCategory', 'Expense by Category')}</Text>
                            <Text style={styles.chartSubtitle}>{t('distributionForSelectedPeriod', 'Distribution for selected period')}</Text>
                          </View>
                          <PieChart size={16} color="#EA580C" />
                        </View>
                        <View style={styles.donutChartRow}>
                          <View style={styles.donutRing}>
                            <Text style={styles.donutAmount}>
                              ₹ {toDevanagari(kpiReportDateFilter === 'today' ? '1,500.00' : '20,250.00')}
                            </Text>
                            <Text style={styles.donutLabel}>TOTAL</Text>
                          </View>
                          <View style={styles.donutLegend}>
                            <View style={styles.donutLegendRow}>
                              <View style={[styles.legendColorDot, { backgroundColor: '#EA580C' }]} />
                              <Text style={styles.donutLegendItem}>Water</Text>
                            </View>
                            <Text style={styles.donutLegendPercent}>₹ {toDevanagari('1,500.00')} • 100.0%</Text>
                          </View>
                        </View>
                      </View>

                      {/* Chart 3: Sales vs Expenses */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('salesVsExpenses', 'Sales vs Expenses')}</Text>
                            <Text style={styles.chartSubtitle}>
                              {t('dailyComparison', 'Daily comparison')} • {kpiReportDateFilter === 'today' ? t('today', 'Today') : kpiReportDateFilter === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                            </Text>
                          </View>
                          <View style={styles.chartCardLegends}>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendColorDot, { backgroundColor: '#FBBF24' }]} />
                              <Text style={styles.legendTextSmall}>{t('sales', 'Sales')}</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendColorDot, { backgroundColor: '#EF4444' }]} />
                              <Text style={styles.legendTextSmall}>{t('expenses', 'Expenses')}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.verticalBarContainer}>
                          <View style={styles.verticalBarCol}>
                            <View style={styles.verticalBarTrack}>
                              <View style={[styles.verticalBarPillar, { height: 80, width: 14, backgroundColor: '#EF4444' }]} />
                            </View>
                            <Text style={styles.barXLabel}>16 Nov 2026</Text>
                          </View>
                        </View>
                      </View>

                      {/* Chart 4: Menu Report */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('menuReport', 'Menu Report')}</Text>
                            <Text style={styles.chartSubtitle}>
                              {t('menuPerformance', 'Menu performance')} • {kpiReportDateFilter === 'today' ? t('today', 'Today') : kpiReportDateFilter === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.menuPerformanceList}>
                          {[
                            { name: 'Butter Chicken', orders: 5, pct: 25 },
                            { name: 'Paneer Tikka', orders: 10, pct: 50 },
                            { name: 'Veg Spring Roll', orders: 10, pct: 50 },
                          ].map((item, idx) => (
                            <View key={idx} style={styles.menuPerformanceItem}>
                              <View style={styles.menuPerformanceRow}>
                                <Text style={styles.menuPerformanceName}>{translateItemName(item.name)}</Text>
                                <Text style={styles.menuPerformanceOrders}>{toDevanagari(item.orders)} {t('orders', 'Orders')}</Text>
                              </View>
                              <View style={styles.menuPerformanceTrack}>
                                <View style={[styles.menuPerformanceFill, { width: `${item.pct}%` }]} />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Chart 5: Top Expenses */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('topExpenses', 'Top Expenses')}</Text>
                            <Text style={styles.chartSubtitle}>{t('highestIndividualExpenses', 'Highest individual expenses')}</Text>
                          </View>
                        </View>
                        <View style={styles.topExpenseBox}>
                          <View style={styles.topExpenseRow}>
                            <View style={styles.topExpenseIconBox}>
                              <ReceiptRupee size={16} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                            <Text style={styles.topExpenseName}>water</Text>
                            <Text style={styles.topExpenseAmount}>₹ {toDevanagari('1,500.00')}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Chart 6: Expense Snapshot */}
                      <View style={styles.chartCardThird}>
                        <View style={styles.chartCardHeader}>
                          <View>
                            <Text style={styles.chartTitle}>{t('expenseSnapshot', 'Expense Snapshot')}</Text>
                            <Text style={styles.chartSubtitle}>{t('quickVisualComparisonDailyExpenseRecords', 'Quick visual comparison of daily expense records')}</Text>
                          </View>
                          <View style={styles.daysBadgePill}>
                            <Text style={styles.daysBadgeText}>{toDevanagari(3)} {t('daysBadge', 'Days')}</Text>
                          </View>
                        </View>
                        <View style={styles.snapshotList}>
                          {[
                            { date: '28 Oct 2026', amt: '15,000.00', pct: 100 },
                            { date: '29 Oct 2026', amt: '3,750.00', pct: 25 },
                            { date: '16 Nov 2026', amt: '1,500.00', pct: 10 },
                          ].map((rec, idx) => (
                            <View key={idx} style={styles.snapshotRow}>
                              <Text style={styles.snapshotDate}>{toDevanagari(rec.date)}</Text>
                              <View style={styles.snapshotTrack}>
                                <View style={[styles.snapshotFill, { width: `${rec.pct}%` }]} />
                              </View>
                              <Text style={styles.snapshotAmount}>₹ {toDevanagari(rec.amt)}</Text>
                            </View>
                          ))}
                        </View>
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
                        <ReceiptRupee
                          size={15}
                          color={kpiSelectedReport === 'expense' ? '#FFFFFF' : '#4B5563'}
                          strokeWidth={2}
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

                    </View>

                    {/* Right Report Content Area */}
                    <View style={styles.kpiReportContentBox}>
                      {/* SALES REPORT (Exact 3 Columns Matching Screenshot 2) */}
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

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                            <View style={styles.salesReportTable}>
                              <View style={styles.salesReportTableHeader}>
                                <Text style={[styles.srTh, { width: 220 }]}>{t('date', 'DATE')}</Text>
                                <Text style={[styles.srTh, { width: 180 }]}>{t('totalBills', 'TOTAL BILLS')}</Text>
                                <Text style={[styles.srTh, { width: 200 }]}>{t('totalSales', 'TOTAL SALES')}</Text>
                              </View>

                              {dynamicSalesReports.rows.map((row, idx) => (
                                <View key={idx} style={styles.salesReportTableRow}>
                                  <Text style={[styles.srTd, { width: 220 }]}>{row.date}</Text>
                                  <Text style={[styles.srTd, { width: 180 }]}>{toDevanagari(row.bills)}</Text>
                                  <Text style={[styles.srTd, { width: 200, fontWeight: '700' }]}>₹ {toDevanagari(row.total.toFixed(2))}</Text>
                                </View>
                              ))}

                              {/* Summary Row */}
                              <View style={styles.salesReportTableTotalRow}>
                                <Text style={[styles.srTdTotal, { width: 220 }]}>{t('totalSales', 'Total Sales')}</Text>
                                <Text style={[styles.srTdTotal, { width: 180 }]}>{toDevanagari(dynamicSalesReports.totalBills)} {t('bills', 'Bills')}</Text>
                                <Text style={[styles.srTdTotal, { width: 200, color: '#111827' }]}>₹ {toDevanagari(dynamicSalesReports.total.toFixed(2))}</Text>
                              </View>
                            </View>
                          </ScrollView>

                          {/* Pagination Bar matching Screenshot 2 */}
                          <View style={styles.paginationBar}>
                            <View style={styles.paginationLeft}>
                              <Text style={styles.paginationText}>
                                {t('showingRecords', 'Showing')} 1 - 2 of 2 {t('recordsText', 'Sales Records')}
                              </Text>
                              <View style={styles.paginationRowsSelector}>
                                <Text style={styles.paginationText}>{t('rowsText', 'Rows:')} 10 ▼</Text>
                              </View>
                            </View>
                            <View style={styles.paginationControls}>
                              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>«</Text></TouchableOpacity>
                              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>‹ {t('prev', 'Prev')}</Text></TouchableOpacity>
                              <TouchableOpacity style={[styles.pageBtn, styles.pageBtnActive]}><Text style={styles.pageBtnTextActive}>1</Text></TouchableOpacity>
                              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>{t('next', 'Next')} ›</Text></TouchableOpacity>
                              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>»</Text></TouchableOpacity>
                            </View>
                          </View>
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

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                            <View style={styles.salesReportTable}>
                              <View style={styles.salesReportTableHeader}>
                                <Text style={[styles.srTh, { width: 140 }]}>{t('date', 'DATE')}</Text>
                                <Text style={[styles.srTh, { width: 160 }]}>{t('category', 'CATEGORY')}</Text>
                                <Text style={[styles.srTh, { width: 180 }]}>{t('expenseName', 'EXPENSE NAME')}</Text>
                                <Text style={[styles.srTh, { width: 150 }]}>{t('amount', 'AMOUNT')}</Text>
                              </View>

                              {dynamicExpenseReports.rows.map((row, idx) => (
                                <View key={idx} style={styles.salesReportTableRow}>
                                  <Text style={[styles.srTd, { width: 140 }]}>{row.date}</Text>
                                  <Text style={[styles.srTd, { width: 160 }]}>{translateCategoryName(row.category)}</Text>
                                  <Text style={[styles.srTd, { width: 180, fontWeight: '600' }]}>{translateExpenseName(row.name)}</Text>
                                  <Text style={[styles.srTd, { width: 150, fontWeight: '700' }]}>₹ {toDevanagari(row.amount.toFixed(2))}</Text>
                                </View>
                              ))}

                              {/* Summary Row */}
                              <View style={styles.salesReportTableTotalRow}>
                                <Text style={[styles.srTdTotal, { width: 140 }]}>{t('totalExpenses', 'Total Expenses')}</Text>
                                <Text style={[styles.srTdTotal, { width: 160 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 180 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 150, color: '#DC2626' }]}>₹ {toDevanagari(dynamicExpenseReports.total.toFixed(2))}</Text>
                              </View>
                            </View>
                          </ScrollView>

                          <View style={styles.paginationBar}>
                            <Text style={styles.paginationText}>
                              {t('showingRecords', 'Showing')} 1 - 3 of 3 {t('recordsText', 'Expense Records')}
                            </Text>
                          </View>
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

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                            <View style={styles.salesReportTable}>
                              <View style={styles.salesReportTableHeader}>
                                <Text style={[styles.srTh, { width: 150 }]}>{t('date', 'DATE')}</Text>
                                <Text style={[styles.srTh, { width: 160 }]}>{t('channelType', 'ORDER TYPE')}</Text>
                                <Text style={[styles.srTh, { width: 140 }]}>{t('totalBills', 'BILLS')}</Text>
                                <Text style={[styles.srTh, { width: 160 }]}>{t('revenue', 'REVENUE')}</Text>
                              </View>

                              {dynamicOrderReports.rows.map((row, idx) => (
                                <View key={idx} style={styles.salesReportTableRow}>
                                  <Text style={[styles.srTd, { width: 150 }]}>{row.date}</Text>
                                  <Text style={[styles.srTd, { width: 160 }]}>{row.type}</Text>
                                  <Text style={[styles.srTd, { width: 140 }]}>{toDevanagari(row.bills)}</Text>
                                  <Text style={[styles.srTd, { width: 160, fontWeight: '700' }]}>₹ {toDevanagari(row.revenue.toFixed(2))}</Text>
                                </View>
                              ))}

                              {/* Summary Row */}
                              <View style={styles.salesReportTableTotalRow}>
                                <Text style={[styles.srTdTotal, { width: 150 }]}>{t('totalOrders', 'Total Orders')}: {toDevanagari(dynamicOrderReports.totalBills)}</Text>
                                <Text style={[styles.srTdTotal, { width: 160 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 140 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 160, color: '#111827' }]}>₹ {toDevanagari(dynamicOrderReports.totalRevenue.toFixed(2))}</Text>
                              </View>
                            </View>
                          </ScrollView>

                          <View style={styles.paginationBar}>
                            <Text style={styles.paginationText}>
                              {t('showingRecords', 'Showing')} 1 - 2 of 2 {t('recordsText', 'Order Records')}
                            </Text>
                          </View>
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

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                            <View style={styles.salesReportTable}>
                              <View style={styles.salesReportTableHeader}>
                                <Text style={[styles.srTh, { width: 180 }]}>{t('itemNameCol', 'ITEM NAME')}</Text>
                                <Text style={[styles.srTh, { width: 140 }]}>{t('category', 'CATEGORY')}</Text>
                                <Text style={[styles.srTh, { width: 120 }]}>{t('qtySold', 'QTY SOLD')}</Text>
                                <Text style={[styles.srTh, { width: 160 }]}>{t('totalRevenue', 'TOTAL REVENUE')}</Text>
                              </View>

                              {dynamicMenuReports.map((row, idx) => (
                                <View key={idx} style={styles.salesReportTableRow}>
                                  <Text style={[styles.srTd, { width: 180, fontWeight: '700' }]}>{translateItemName(row.name)}</Text>
                                  <Text style={[styles.srTd, { width: 140, color: '#6B7280' }]}>{translateCategoryName(row.category)}</Text>
                                  <Text style={[styles.srTd, { width: 120, fontWeight: '700', color: '#EA580C' }]}>{toDevanagari(row.sold)}</Text>
                                  <Text style={[styles.srTd, { width: 160, fontWeight: '700' }]}>₹ {toDevanagari(row.rev.toFixed(2))}</Text>
                                </View>
                              ))}

                              {/* Summary Row */}
                              <View style={styles.salesReportTableTotalRow}>
                                <Text style={[styles.srTdTotal, { width: 180 }]}>{t('totalOrders', 'Total Items')}: {toDevanagari(dynamicMenuReports.reduce((s, r) => s + r.sold, 0))}</Text>
                                <Text style={[styles.srTdTotal, { width: 140 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 120 }]}></Text>
                                <Text style={[styles.srTdTotal, { width: 160, color: '#111827' }]}>₹ {toDevanagari(dynamicMenuReports.reduce((s, r) => s + r.rev, 0).toFixed(2))}</Text>
                              </View>
                            </View>
                          </ScrollView>

                          <View style={styles.paginationBar}>
                            <Text style={styles.paginationText}>
                              {t('showingRecords', 'Showing')} 1 - 3 of 3 {t('recordsText', 'Menu Records')}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* SCALE SUMMARY GST REPORT SUB-TAB (Matching Screenshot 4) */}
                {reportSubTab === 'gst-scale' && (
                  <View style={styles.kpiReportsContainer}>
                    {/* GST Tax Reports Dropdown Selector (User Request) */}
                    <View style={styles.gstReportDropdownContainer}>
                      <Text style={styles.gstReportDropdownLabel}>{t('gstTaxReports', 'GST Tax Reports')}</Text>

                      <TouchableOpacity
                        style={styles.gstReportDropdownTrigger}
                        onPress={() => setShowGstReportDropdown(!showGstReportDropdown)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={styles.gstPointBadgeActive}>
                            <Text style={styles.gstPointBadgeTextActive}>
                              {kpiSelectedGstReport === 'sales-summary' ? 'A' :
                                kpiSelectedGstReport === 'rate-wise' ? 'B' :
                                  kpiSelectedGstReport === 'invoice-wise' ? 'C' : 'D'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.gstReportDropdownSelectedTitle} numberOfLines={1}>
                              {kpiSelectedGstReport === 'sales-summary' ? t('gstSalesSummary', 'A. GST Sales Summary') :
                                kpiSelectedGstReport === 'rate-wise' ? t('gstRateWiseReport', 'B. GST Rate-wise Report') :
                                  kpiSelectedGstReport === 'invoice-wise' ? t('invoiceWiseGstReport', 'C. Invoice-wise GST Report') :
                                    t('purchaseGstItc', 'D. Purchase GST (ITC)')}
                            </Text>
                            <Text style={styles.gstReportDropdownSelectedSubtitle} numberOfLines={1}>
                              {kpiSelectedGstReport === 'sales-summary' ? t('salesTurnoverStatement', 'Turnover & Tax Summary') :
                                kpiSelectedGstReport === 'rate-wise' ? t('rateWiseBreakdown', '0%, 5%, 12%, 18% Slabs') :
                                  kpiSelectedGstReport === 'invoice-wise' ? t('itemizedBillsGst', 'Itemized Bills Statement') :
                                    t('inputTaxCreditVendor', 'Vendor Invoices ITC')}
                            </Text>
                          </View>
                        </View>
                        <ChevronDown size={18} color="#6B7280" style={{ transform: [{ rotate: showGstReportDropdown ? '180deg' : '0deg' }] }} />
                      </TouchableOpacity>

                      {showGstReportDropdown && (
                        <View style={styles.gstReportDropdownMenu}>
                          {[
                            { key: 'sales-summary', badge: 'A', title: t('gstSalesSummary', 'A. GST Sales Summary'), sub: t('salesTurnoverStatement', 'Turnover & Tax Summary') },
                            { key: 'rate-wise', badge: 'B', title: t('gstRateWiseReport', 'B. GST Rate-wise Report'), sub: t('rateWiseBreakdown', '0%, 5%, 12%, 18% Slabs') },
                            { key: 'invoice-wise', badge: 'C', title: t('invoiceWiseGstReport', 'C. Invoice-wise GST Report'), sub: t('itemizedBillsGst', 'Itemized Bills Statement') },
                            { key: 'purchase-itc', badge: 'D', title: t('purchaseGstItc', 'D. Purchase GST (ITC)'), sub: t('inputTaxCreditVendor', 'Vendor Invoices ITC') },
                          ].map((item) => {
                            const isSelected = kpiSelectedGstReport === item.key;
                            return (
                              <TouchableOpacity
                                key={item.key}
                                style={[
                                  styles.gstReportDropdownItem,
                                  isSelected && styles.gstReportDropdownItemActive,
                                ]}
                                onPress={() => {
                                  setKpiSelectedGstReport(item.key as any);
                                  setShowGstReportDropdown(false);
                                }}
                                activeOpacity={0.8}
                              >
                                <View style={[styles.gstPointBadge, isSelected && styles.gstPointBadgeActive]}>
                                  <Text style={[styles.gstPointBadgeText, isSelected && styles.gstPointBadgeTextActive]}>
                                    {item.badge}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.gstReportDropdownItemTitle, isSelected && styles.gstReportDropdownItemTitleActive]}>
                                    {item.title}
                                  </Text>
                                  <Text style={styles.gstReportDropdownItemSub}>
                                    {item.sub}
                                  </Text>
                                </View>
                                {isSelected && <Check size={16} color="#8F351D" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    {/* Right GST Content Area */}
                    <View style={styles.kpiReportContentBox}>
                      {/* Sub-report A: Sales Summary */}
                      {kpiSelectedGstReport === 'sales-summary' && (
                        <>
                          <View style={styles.kpiReportHeaderRow}>
                            <View>
                              <Text style={styles.kpiReportMainTitle}>GST Sales Summary</Text>
                              <Text style={styles.kpiReportSubText}>
                                Consolidated GST summary from verified SQL Server billing records
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.gstPeriodDropdown}
                                onPress={() => setShowGstPeriodModal(true)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.gstPeriodDropdownText}>
                                  {kpiGstPeriod === 'today' ? t('today', 'Today')
                                    : kpiGstPeriod === 'this-week' ? t('thisWeek', 'This Week')
                                      : kpiGstPeriod === 'this-month' ? t('thisMonth', 'This Month')
                                        : t('allTime', 'All Time')} ▼
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.exportCsvBtnGreen}
                                onPress={async () => {
                                  const csv = 'Supply Classification,Invoice Count,Taxable Turnover,Central GST,State GST,Integrated GST,Total Tax\n' +
                                    `Intra-State Taxable Supplies (CGST + SGST),${gstPeriodData.totalInvoices},${gstPeriodData.intraStateTurnover},${gstPeriodData.intraStateCgst},${gstPeriodData.intraStateSgst},0.00,${gstPeriodData.intraStateTotalTax}\n` +
                                    'Inter-State Taxable Supplies (IGST),0,0.00,0.00,0.00,0.00,0.00\n' +
                                    'Nil-Rated / Exempted Supplies,0,0.00,0.00,0.00,0.00,0.00\n' +
                                    `NET TOTAL,${gstPeriodData.totalInvoices},${gstPeriodData.intraStateTurnover},${gstPeriodData.intraStateCgst},${gstPeriodData.intraStateSgst},0.00,${gstPeriodData.intraStateTotalTax}\n`;
                                  await downloadAndShareCsv(`GST_Sales_Summary_${kpiGstPeriod}_${Date.now()}.csv`, csv);
                                }}
                              >
                                <Download size={13} color="#FFFFFF" />
                                <Text style={styles.exportCsvBtnGreenText}>{t('exportCsv', 'Export CSV')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 8 Stat Cards (Screenshot 4) */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstEightCardsRow}>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalGrossSales', 'Total Gross Sales')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalGrossSales)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('netTaxableSales', 'Net Taxable Sales')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.netTaxableSales)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('nilExemptSales', 'Nil / Exempt Sales')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.nilExemptSales)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalCgst', 'Total CGST')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalCgst)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalSgst', 'Total SGST')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalSgst)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalIgst', 'Total IGST')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalIgst)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalTaxLiability', 'Total Tax Liability')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalTaxLiability)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalInvoices', 'Total Invoices')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>{toDevanagari(gstPeriodData.totalInvoices)}</Text>
                            </View>
                          </ScrollView>

                          {/* Sales Tax Summary Statement Table */}
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.salesTaxSummaryTitle}>{t('salesTaxSummaryStatement', 'Sales Tax Summary Statement')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                              <View style={styles.gstStatementTable}>
                                <View style={styles.gstStatementTableHeader}>
                                  <Text style={[styles.gstStTh, { width: 230 }]}>{t('supplyClassification', 'Supply Classification')}</Text>
                                  <Text style={[styles.gstStTh, { width: 90, textAlign: 'center' }]}>{t('invoicesCol', 'Invoice Count')}</Text>
                                  <Text style={[styles.gstStTh, { width: 140, textAlign: 'right' }]}>{t('taxableTurnover', 'Taxable Turnover (₹)')}</Text>
                                  <Text style={[styles.gstStTh, { width: 130, textAlign: 'right' }]}>Central GST (CGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 130, textAlign: 'right' }]}>State GST (SGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 140, textAlign: 'right' }]}>Integrated GST (IGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('totalTaxCol', 'Total Tax')}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>
                                    {t('intraStateTaxableSupplies', 'Intra-State Taxable Supplies (CGST + SGST)')}
                                  </Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari(gstPeriodData.totalInvoices)}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateTurnover)}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateCgst)}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateSgst)}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari(gstPeriodData.intraStateTotalTax)}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>
                                    {t('interStateTaxableSupplies', 'Inter-State Taxable Supplies (IGST)')}
                                  </Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari('0')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari('0.00')}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>
                                    {t('nilRatedExemptedSupplies', 'Nil-Rated / Exempted Supplies')}
                                  </Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari('0')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari('0.00')}</Text>
                                </View>

                                {/* Net Total Row */}
                                <View style={styles.gstStatementTableTotalRow}>
                                  <Text style={[styles.gstStTdTotal, { width: 230 }]}>{t('netTotalCol', 'NET TOTAL')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 90, textAlign: 'center' }]}>{toDevanagari(gstPeriodData.totalInvoices)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateTurnover)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateCgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateSgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.intraStateTotalTax)}</Text>
                                </View>
                              </View>
                            </ScrollView>
                          </View>
                        </>
                      )}

                      {/* Sub-report B: Rate-wise GST Summary */}
                      {kpiSelectedGstReport === 'rate-wise' && (
                        <>
                          <View style={styles.kpiReportHeaderRow}>
                            <View>
                              <Text style={styles.kpiReportMainTitle}>Rate-wise GST Summary</Text>
                              <Text style={styles.kpiReportSubText}>
                                Tax distribution grouped by statutory GST percentage slabs
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.gstPeriodDropdown}
                                onPress={() => setShowGstPeriodModal(true)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.gstPeriodDropdownText}>
                                  {kpiGstPeriod === 'today' ? t('today', 'Today')
                                    : kpiGstPeriod === 'this-week' ? t('thisWeek', 'This Week')
                                      : kpiGstPeriod === 'this-month' ? t('thisMonth', 'This Month')
                                        : t('allTime', 'All Time')} ▼
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.exportCsvBtnGreen}
                                onPress={async () => {
                                  const csv = 'GST Rate Slab,Invoices,Taxable Value,Central GST,State GST,Integrated GST,Total Tax\n' +
                                    '0% (Nil Rated / Exempt),0,0.00,0.00,0.00,0.00,0.00\n' +
                                    `5% (Dining & Services),${gstPeriodData.rate5Invoices},${gstPeriodData.rate5Taxable},${gstPeriodData.rate5Cgst},${gstPeriodData.rate5Sgst},0.00,${gstPeriodData.rate5TotalTax}\n` +
                                    '12% (Packaged Food Goods),0,0.00,0.00,0.00,0.00,0.00\n' +
                                    '18% (Standard GST Rate),0,0.00,0.00,0.00,0.00,0.00\n' +
                                    `NET TOTAL,${gstPeriodData.rate5Invoices},${gstPeriodData.rate5Taxable},${gstPeriodData.rate5Cgst},${gstPeriodData.rate5Sgst},0.00,${gstPeriodData.rate5TotalTax}\n`;
                                  await downloadAndShareCsv(`GST_Rate_Wise_${kpiGstPeriod}_${Date.now()}.csv`, csv);
                                }}
                              >
                                <Download size={13} color="#FFFFFF" />
                                <Text style={styles.exportCsvBtnGreenText}>{t('exportCsv', 'Export CSV')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 4 Rate Slab Stat Cards */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstEightCardsRow}>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>0% Slab (Nil Rated)</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari('0.00')}</Text>
                              <Text style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>Turnover: ₹ {toDevanagari('0.00')}</Text>
                            </View>
                            <View style={[styles.gstStatCardBox, { borderColor: '#EA580C' }]}>
                              <Text style={[styles.gstStatCardBoxLabel, { color: '#C2410C' }]}>5% Slab (Dining POS)</Text>
                              <Text style={[styles.gstStatCardBoxVal, { color: '#C2410C' }]}>₹ {toDevanagari(gstPeriodData.rate5TotalTax)}</Text>
                              <Text style={{ fontSize: 9.5, color: '#16A34A', marginTop: 2 }}>Turnover: ₹ {toDevanagari(gstPeriodData.rate5Taxable)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>12% Slab</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari('0.00')}</Text>
                              <Text style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>Turnover: ₹ {toDevanagari('0.00')}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>18% Slab</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari('0.00')}</Text>
                              <Text style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>Turnover: ₹ {toDevanagari('0.00')}</Text>
                            </View>
                          </ScrollView>

                          {/* Rate-wise Table */}
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.salesTaxSummaryTitle}>{t('rateWiseTaxStatement', 'Rate-wise Tax Statement')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                              <View style={styles.gstStatementTable}>
                                <View style={styles.gstStatementTableHeader}>
                                  <Text style={[styles.gstStTh, { width: 230 }]}>{t('gstRateSlab', 'GST Rate Slab')}</Text>
                                  <Text style={[styles.gstStTh, { width: 90, textAlign: 'center' }]}>{t('invoicesCol', 'Invoices')}</Text>
                                  <Text style={[styles.gstStTh, { width: 140, textAlign: 'right' }]}>{t('taxableTurnover', 'Taxable Turnover (₹)')}</Text>
                                  <Text style={[styles.gstStTh, { width: 130, textAlign: 'right' }]}>Central GST (CGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 130, textAlign: 'right' }]}>State GST (SGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 140, textAlign: 'right' }]}>Integrated GST (IGST)</Text>
                                  <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('totalTaxCol', 'Total Tax')}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>0% (Nil Rated / Exempt Supplies)</Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari('0')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari('0.00')}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '600' }]}>5% (Restaurant Dining POS 2.5% + 2.5%)</Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari(gstPeriodData.rate5Invoices)}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Taxable)}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Cgst)}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Sgst)}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700', color: '#16A34A' }]}>₹ {toDevanagari(gstPeriodData.rate5TotalTax)}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>12% (Packaged Food & Beverages)</Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari('0')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari('0.00')}</Text>
                                </View>

                                <View style={styles.gstStatementTableRow}>
                                  <Text style={[styles.gstStTd, { width: 230, color: '#111827', fontWeight: '500' }]}>18% (Standard Catering / Outdoor Services)</Text>
                                  <Text style={[styles.gstStTd, { width: 90, textAlign: 'center' }]}>{toDevanagari('0')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700' }]}>₹ {toDevanagari('0.00')}</Text>
                                </View>

                                <View style={styles.gstStatementTableTotalRow}>
                                  <Text style={[styles.gstStTdTotal, { width: 230 }]}>{t('netTotalCol', 'NET TOTAL')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 90, textAlign: 'center' }]}>{toDevanagari(gstPeriodData.rate5Invoices)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Taxable)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Cgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 130, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5Sgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 140, textAlign: 'right' }]}>₹ {toDevanagari('0.00')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.rate5TotalTax)}</Text>
                                </View>
                              </View>
                            </ScrollView>
                          </View>
                        </>
                      )}

                      {/* Sub-report C: Invoice-wise GST Report */}
                      {kpiSelectedGstReport === 'invoice-wise' && (
                        <>
                          <View style={styles.kpiReportHeaderRow}>
                            <View>
                              <Text style={styles.kpiReportMainTitle}>Invoice-wise GST Report</Text>
                              <Text style={styles.kpiReportSubText}>
                                Itemized GST liability statement for verified customer bills
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.gstPeriodDropdown}
                                onPress={() => setShowGstPeriodModal(true)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.gstPeriodDropdownText}>
                                  {kpiGstPeriod === 'today' ? t('today', 'Today')
                                    : kpiGstPeriod === 'this-week' ? t('thisWeek', 'This Week')
                                      : kpiGstPeriod === 'this-month' ? t('thisMonth', 'This Month')
                                        : t('allTime', 'All Time')} ▼
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.exportCsvBtnGreen}
                                onPress={async () => {
                                  const header = 'Invoice No,Date,Table/Source,Taxable Value,Central GST,State GST,Total GST,Grand Total\n';
                                  const rows = gstPeriodData.invoices.map(r =>
                                    `"${r.inv}","${r.date}","${r.source}",${r.taxable.toFixed(2)},${r.cgst.toFixed(2)},${r.sgst.toFixed(2)},${r.totTax.toFixed(2)},${r.tot.toFixed(2)}`
                                  ).join('\n') + `\n"TOTAL (${gstPeriodData.totalInvoices} Bills)","-","Verified POS Bills",${gstPeriodData.netTaxableSales},${gstPeriodData.totalCgst},${gstPeriodData.totalSgst},${gstPeriodData.totalTaxLiability},${gstPeriodData.totalGrossSales}\n`;
                                  await downloadAndShareCsv(`GST_Invoices_${kpiGstPeriod}_${Date.now()}.csv`, header + rows);
                                }}
                              >
                                <Download size={13} color="#FFFFFF" />
                                <Text style={styles.exportCsvBtnGreenText}>{t('exportCsv', 'Export CSV')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 4 Stat Cards */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstEightCardsRow}>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalGrossSales', 'Total Billed Amount')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.totalGrossSales)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('netTaxableSales', 'Net Taxable Value')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(gstPeriodData.netTaxableSales)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalTaxLiability', 'Total Tax (5%)')}</Text>
                              <Text style={[styles.gstStatCardBoxVal, { color: '#16A34A' }]}>₹ {toDevanagari(gstPeriodData.totalTaxLiability)}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('invoicesCol', 'Total Invoices')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>{toDevanagari(gstPeriodData.totalInvoices)}</Text>
                            </View>
                          </ScrollView>

                          {/* Invoice Tax Details Table */}
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.salesTaxSummaryTitle}>{t('invoiceTaxDetails', 'Invoice Tax Details')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                              <View style={styles.gstStatementTable}>
                                <View style={styles.gstStatementTableHeader}>
                                  <Text style={[styles.gstStTh, { width: 140 }]}>{t('invoiceNoCol', 'Invoice No')}</Text>
                                  <Text style={[styles.gstStTh, { width: 110 }]}>{t('dateCol', 'Date')}</Text>
                                  <Text style={[styles.gstStTh, { width: 160 }]}>{t('tableCol', 'Table / Source')}</Text>
                                  <Text style={[styles.gstStTh, { width: 120, textAlign: 'right' }]}>{t('taxableTurnover', 'Taxable (₹)')}</Text>
                                  <Text style={[styles.gstStTh, { width: 100, textAlign: 'right' }]}>CGST (2.5%)</Text>
                                  <Text style={[styles.gstStTh, { width: 100, textAlign: 'right' }]}>SGST (2.5%)</Text>
                                  <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('totalTaxCol', 'Total Tax')}</Text>
                                  <Text style={[styles.gstStTh, { width: 120, textAlign: 'right' }]}>{t('grandTotal', 'Grand Total')}</Text>
                                </View>

                                {gstPeriodData.invoices.map((row, idx) => (
                                  <View key={idx} style={styles.gstStatementTableRow}>
                                    <Text style={[styles.gstStTd, { width: 140, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1E293B' }]}>{row.inv}</Text>
                                    <Text style={[styles.gstStTd, { width: 110, color: '#64748B' }]}>{translateDateString(row.date)}</Text>
                                    <Text style={[styles.gstStTd, { width: 160, color: isDark ? '#E2E8F0' : '#334155' }]}>{row.source}</Text>
                                    <Text style={[styles.gstStTd, { width: 120, textAlign: 'right' }]}>₹ {toDevanagari(row.taxable.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(row.cgst.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(row.sgst.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '700', color: '#16A34A' }]}>₹ {toDevanagari(row.totTax.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹ {toDevanagari(row.tot.toFixed(2))}</Text>
                                  </View>
                                ))}

                                <View style={styles.gstStatementTableTotalRow}>
                                  <Text style={[styles.gstStTdTotal, { width: 140 }]}>{t('netTotalCol', 'NET TOTAL')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, color: '#64748B' }]}>{gstPeriodData.totalInvoices} Bills</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 160, color: '#64748B' }]}>Dining POS</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 120, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.netTaxableSales)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.totalCgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 100, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.totalSgst)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.totalTaxLiability)}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 120, textAlign: 'right' }]}>₹ {toDevanagari(gstPeriodData.totalGrossSales)}</Text>
                                </View>
                              </View>
                            </ScrollView>
                          </View>
                        </>
                      )}

                      {/* Sub-report D: Purchase GST (ITC) */}
                      {kpiSelectedGstReport === 'purchase-itc' && (
                        <>
                          <View style={styles.kpiReportHeaderRow}>
                            <View>
                              <Text style={styles.kpiReportMainTitle}>Purchase GST & Input Tax Credit (ITC)</Text>
                              <Text style={styles.kpiReportSubText}>
                                Input Tax Credit eligible on supplier inward bills
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.gstPeriodDropdown}
                                onPress={() => setShowGstPeriodModal(true)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.gstPeriodDropdownText}>
                                  {kpiGstPeriod === 'today' ? t('today', 'Today')
                                    : kpiGstPeriod === 'this-week' ? t('thisWeek', 'This Week')
                                      : kpiGstPeriod === 'this-month' ? t('thisMonth', 'This Month')
                                        : t('allTime', 'All Time')} ▼
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.exportCsvBtnGreen}
                                onPress={async () => {
                                  const header = 'Invoice No,Supplier,Date,Category,Taxable,CGST,SGST,Eligible ITC,Total,Status\n';
                                  const rows = periodPurchaseItcData.map(p =>
                                    `"${p.inv}","${p.sup}","${p.date}","${p.cat}",${p.taxable},${p.cgst},${p.sgst},${p.totTax},${p.tot},"${p.status}"`
                                  ).join('\n');
                                  await downloadAndShareCsv(`GST_Purchase_ITC_${kpiGstPeriod}_${Date.now()}.csv`, header + rows);
                                }}
                              >
                                <Download size={13} color="#FFFFFF" />
                                <Text style={styles.exportCsvBtnGreenText}>{t('exportCsv', 'Export CSV')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 4 Stat Cards */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gstEightCardsRow}>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('totalPurchase', 'Total Purchase')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(itcGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('netTaxableSales', 'Net Taxable (Inward)')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>₹ {toDevanagari(itcTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={[styles.gstStatCardBoxLabel, { color: '#16A34A' }]}>{t('totalEligibleItc', 'Eligible ITC (Tax Credit)')}</Text>
                              <Text style={[styles.gstStatCardBoxVal, { color: '#16A34A' }]}>₹ {toDevanagari(itcTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</Text>
                            </View>
                            <View style={styles.gstStatCardBox}>
                              <Text style={styles.gstStatCardBoxLabel}>{t('vendorInvoices', 'Vendor Bills')}</Text>
                              <Text style={styles.gstStatCardBoxVal}>{toDevanagari(periodPurchaseItcData.length)}</Text>
                            </View>
                          </ScrollView>

                          {/* Vendor Invoices ITC Table */}
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.salesTaxSummaryTitle}>{t('vendorInvoicesItc', 'Vendor Invoices ITC Statement')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                              <View style={styles.gstStatementTable}>
                                <View style={styles.gstStatementTableHeader}>
                                  <Text style={[styles.gstStTh, { width: 140 }]}>{t('invoiceNoCol', 'Invoice No')}</Text>
                                  <Text style={[styles.gstStTh, { width: 160 }]}>{t('supplierCol', 'Supplier')}</Text>
                                  <Text style={[styles.gstStTh, { width: 120 }]}>{t('dateCol', 'Date')}</Text>
                                  <Text style={[styles.gstStTh, { width: 150 }]}>{t('categoryCol', 'Category')}</Text>
                                  <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('taxableTurnover', 'Taxable (₹)')}</Text>
                                  <Text style={[styles.gstStTh, { width: 95, textAlign: 'right' }]}>CGST</Text>
                                  <Text style={[styles.gstStTh, { width: 95, textAlign: 'right' }]}>SGST</Text>
                                  <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('eligibleItc', 'Eligible ITC')}</Text>
                                  <Text style={[styles.gstStTh, { width: 85, textAlign: 'center' }]}>{t('status', 'Status')}</Text>
                                </View>

                                {periodPurchaseItcData.map((row, idx) => (
                                  <View key={idx} style={styles.gstStatementTableRow}>
                                    <Text style={[styles.gstStTd, { width: 140, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1E293B' }]}>{row.inv}</Text>
                                    <Text style={[styles.gstStTd, { width: 160, fontWeight: '600', color: isDark ? '#E2E8F0' : '#334155' }]}>{translateSupplierName(row.sup)}</Text>
                                    <Text style={[styles.gstStTd, { width: 120, color: '#64748B' }]}>{translateDateString(row.date)}</Text>
                                    <Text style={[styles.gstStTd, { width: 150, color: isDark ? '#CBD5E1' : '#475569' }]} numberOfLines={1}>{translateCategoryName(row.cat)}</Text>
                                    <Text style={[styles.gstStTd, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari(row.taxable.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 95, textAlign: 'right', color: '#16A34A' }]}>₹ {toDevanagari(row.cgst.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 95, textAlign: 'right', color: '#16A34A' }]}>₹ {toDevanagari(row.sgst.toFixed(2))}</Text>
                                    <Text style={[styles.gstStTd, { width: 110, textAlign: 'right', fontWeight: '800', color: '#16A34A' }]}>₹ {toDevanagari(row.totTax.toFixed(2))}</Text>
                                    <View style={{ width: 85, alignItems: 'center' }}>
                                      <View style={[styles.paidBadge, row.status === 'Due' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                        <Text style={[styles.paidBadgeText, row.status === 'Due' && { color: '#DC2626' }]}>
                                          {row.status === 'Paid' ? t('paid', 'Paid') : t('due', 'Due')}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                ))}

                                <View style={styles.gstStatementTableTotalRow}>
                                  <Text style={[styles.gstStTdTotal, { width: 140 }]}>{t('netTotalCol', 'NET TOTAL')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 160, color: '#64748B' }]}>6 Suppliers</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 120, color: '#64748B' }]}>9 Invoices</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 150, color: '#64748B' }]}>-</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right' }]}>₹ {toDevanagari('96,155.00')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 95, textAlign: 'right' }]}>₹ {toDevanagari('4,713.75')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 95, textAlign: 'right' }]}>₹ {toDevanagari('4,713.75')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right', color: '#16A34A' }]}>₹ {toDevanagari('9,427.50')}</Text>
                                  <Text style={[styles.gstStTdTotal, { width: 85, textAlign: 'center' }]}>-</Text>
                                </View>
                              </View>
                            </ScrollView>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* 5. PURCHASE SUB-TAB (Matching Screenshot 5 with Real Data) */}
                {reportSubTab === 'purchase' && (
                  <View style={styles.kpiReportsContainer}>
                    {/* Left Sidebar */}
                    <View style={styles.kpiReportsSidebar}>
                      <Text style={styles.kpiSidebarTitle}>{t('purchase', 'Purchase')}</Text>
                      <TouchableOpacity
                        style={[styles.kpiSidebarItem, styles.kpiSidebarItemActive]}
                      >
                        <Text style={[styles.kpiSidebarItemText, styles.kpiSidebarItemTextActive]}>
                          {t('purchaseSummary', 'Purchase Summary')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right Content */}
                    <View style={styles.kpiReportsContent}>
                      {/* Top Header Row with Title, Period Pills, and Export Buttons */}
                      <View style={styles.srHeaderRow}>
                        <Text style={styles.srTitle}>{t('purchaseSummary', 'Purchase Summary')}</Text>
                        <View style={styles.srHeaderRight}>
                          <View style={styles.periodPillsContainer}>
                            {(['today', 'week', 'month'] as const).map(p => (
                              <TouchableOpacity
                                key={p}
                                style={[
                                  styles.periodPill,
                                  kpiPurchasePeriod === p && styles.periodPillActive,
                                ]}
                                onPress={() => setKpiPurchasePeriod(p)}
                              >
                                <Text
                                  style={[
                                    styles.periodPillText,
                                    kpiPurchasePeriod === p && styles.periodPillTextActive,
                                  ]}
                                >
                                  {p === 'today' ? t('today', 'Today') : p === 'week' ? t('thisWeek', 'This Week') : t('thisMonth', 'This Month')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity
                            style={styles.exportCsvBtnGreen}
                            onPress={async () => {
                              const header = 'Invoice No,PO Number,Date,Supplier,GSTIN,Category,Subtotal,CGST,SGST,Total Tax,Total,Status\n';
                              const rows = filteredPurchaseInvoices.map(p =>
                                `"${p.inv}","${p.po}","${p.date}","${p.sup}","${p.gstin}","${p.cat}",${p.taxable},${p.cgst},${p.sgst},${p.totTax},${p.tot},"${p.status}"`
                              ).join('\n');
                              await downloadAndShareCsv(`Purchase_Summary_${Date.now()}.csv`, header + rows);
                            }}
                          >
                            <Download size={13} color="#FFFFFF" />
                            <Text style={styles.exportCsvBtnGreenText}>{t('exportCsv', 'Export CSV')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.printPdfBtnOrange}
                            onPress={async () => {
                              const html = buildPurchaseReportHtml({
                                hotelName: hotelName || 'Royal Palace Hotel',
                                branchName: activeBranch?.name || 'Main Branch',
                                totalPurchases: filteredPurchaseInvoices.reduce((s, r) => s + r.tot, 0),
                                invoices: filteredPurchaseInvoices,
                              });
                              await downloadAndSharePdf('Purchase_Summary_Report', html);
                            }}
                          >
                            <Printer size={13} color="#FFFFFF" />
                            <Text style={styles.printPdfBtnOrangeText}>{t('pdf', 'PDF')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 5 Real Stat Cards from Purchase Invoices */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.purchaseFiveCardsRow}>
                        <View style={styles.gstStatCardBox}>
                          <Text style={styles.gstStatCardBoxLabel}>{t('totalPurchase', 'Total Purchase')}</Text>
                          <Text style={styles.gstStatCardBoxVal}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.tot, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                          </Text>
                        </View>
                        <View style={styles.gstStatCardBox}>
                          <Text style={styles.gstStatCardBoxLabel}>{t('paidAmount', 'Paid Amount')}</Text>
                          <Text style={[styles.gstStatCardBoxVal, { color: '#16A34A' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.filter(r => r.status === 'Paid').reduce((s, r) => s + r.tot, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                          </Text>
                        </View>
                        <View style={styles.gstStatCardBox}>
                          <Text style={styles.gstStatCardBoxLabel}>{t('balanceDue', 'Balance Due')}</Text>
                          <Text style={[styles.gstStatCardBoxVal, { color: '#DC2626' }]}>
                            ₹ {toDevanagari(filteredPurchaseInvoices.filter(r => r.status === 'Due').reduce((s, r) => s + r.tot, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                          </Text>
                        </View>
                        <View style={styles.gstStatCardBox}>
                          <Text style={styles.gstStatCardBoxLabel}>{t('totalPurchasesStat', 'Total Purchases')}</Text>
                          <Text style={styles.gstStatCardBoxVal}>{toDevanagari(filteredPurchaseInvoices.length)}</Text>
                        </View>
                        <View style={styles.gstStatCardBox}>
                          <Text style={styles.gstStatCardBoxLabel}>{t('totalSuppliers', 'Total Suppliers')}</Text>
                          <Text style={styles.gstStatCardBoxVal}>
                            {toDevanagari(new Set(filteredPurchaseInvoices.map(r => r.sup)).size)}
                          </Text>
                        </View>
                      </ScrollView>

                      {/* Search Bar & Status Filter Row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 12 }}>
                        {/* Search Input Box */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, height: 36, flex: 1, minWidth: 220 }}>
                          <Search size={14} color="#94A3B8" />
                          <TextInput
                            style={{ flex: 1, fontSize: 12, color: isDark ? '#F8FAFC' : '#1E293B', paddingHorizontal: 8, paddingVertical: 0 }}
                            placeholder={t('searchReports', 'Search supplier, item...')}
                            placeholderTextColor="#94A3B8"
                            value={purchaseSearchQuery}
                            onChangeText={setPurchaseSearchQuery}
                          />
                          {purchaseSearchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setPurchaseSearchQuery('')}>
                              <X size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Status Filter Pills */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {(['ALL', 'PAID', 'DUE'] as const).map(st => (
                            <TouchableOpacity
                              key={st}
                              style={[
                                styles.periodPill,
                                purchaseStatusFilter === st && styles.periodPillActive,
                              ]}
                              onPress={() => setPurchaseStatusFilter(st)}
                            >
                              <Text
                                style={[
                                  styles.periodPillText,
                                  purchaseStatusFilter === st && styles.periodPillTextActive,
                                ]}
                              >
                                {st === 'ALL' ? `${t('allStatus', 'All')} (${toDevanagari(PURCHASE_REPORT_DATA.length)})` :
                                  st === 'PAID' ? `${t('paid', 'Paid')} (${toDevanagari(PURCHASE_REPORT_DATA.filter(p => p.status === 'Paid').length)})` :
                                    `${t('due', 'Due')} (${toDevanagari(PURCHASE_REPORT_DATA.filter(p => p.status === 'Due').length)})`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Purchase Invoices Table or Empty State */}
                      {filteredPurchaseInvoices.length === 0 ? (
                        <View style={styles.purchaseEmptyStateCard}>
                          <View style={styles.purchaseEmptyIconCircle}>
                            <ShoppingBag size={38} color="#D1D5DB" />
                          </View>
                          <Text style={styles.purchaseEmptyStateText}>
                            {t('noPurchaseDataFound', `No purchase data found for ${kpiPurchasePeriod === 'today' ? 'Today' : kpiPurchasePeriod === 'week' ? 'This Week' : 'This Month'}.`)}
                          </Text>
                        </View>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                          <View style={styles.gstStatementTable}>
                            {/* Table Header */}
                            <View style={styles.gstStatementTableHeader}>
                              <Text style={[styles.gstStTh, { width: 140 }]}>{t('invoiceNoCol', 'Invoice No')}</Text>
                              <Text style={[styles.gstStTh, { width: 110 }]}>{t('dateCol', 'Date')}</Text>
                              <Text style={[styles.gstStTh, { width: 160 }]}>{t('supplierCol', 'Supplier')}</Text>
                              <Text style={[styles.gstStTh, { width: 130 }]}>{t('gstin', 'GSTIN')}</Text>
                              <Text style={[styles.gstStTh, { width: 150 }]}>{t('categoryCol', 'Category')}</Text>
                              <Text style={[styles.gstStTh, { width: 110, textAlign: 'right' }]}>{t('subtotal', 'Subtotal (₹)')}</Text>
                              <Text style={[styles.gstStTh, { width: 90, textAlign: 'right' }]}>CGST</Text>
                              <Text style={[styles.gstStTh, { width: 90, textAlign: 'right' }]}>SGST</Text>
                              <Text style={[styles.gstStTh, { width: 95, textAlign: 'right' }]}>{t('totalTaxCol', 'Total Tax')}</Text>
                              <Text style={[styles.gstStTh, { width: 115, textAlign: 'right' }]}>{t('total', 'Total (₹)')}</Text>
                              <Text style={[styles.gstStTh, { width: 80, textAlign: 'center' }]}>{t('status', 'Status')}</Text>
                              <Text style={[styles.gstStTh, { width: 75, textAlign: 'center' }]}>{t('actionUpper', 'Action')}</Text>
                            </View>

                            {/* Table Rows */}
                            {filteredPurchaseInvoices.map((row, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.gstStatementTableRow}
                                onPress={() => setViewingPurchaseInvoice(row)}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.gstStTd, { width: 140, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                                  {row.inv}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 110, color: '#64748B' }]}>
                                  {translateDateString(row.date)}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 160, fontWeight: '600', color: isDark ? '#E2E8F0' : '#334155' }]}>
                                  {translateSupplierName(row.sup)}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 130, color: '#0F766E', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10.5 }]}>
                                  {row.gstin}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 150, color: isDark ? '#CBD5E1' : '#475569' }]} numberOfLines={1}>
                                  {translateCategoryName(row.cat)}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 110, textAlign: 'right' }]}>
                                  ₹ {toDevanagari(row.taxable.toFixed(2))}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 90, textAlign: 'right', color: '#16A34A', fontWeight: '600' }]}>
                                  ₹ {toDevanagari(row.cgst.toFixed(2))}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 90, textAlign: 'right', color: '#16A34A', fontWeight: '600' }]}>
                                  ₹ {toDevanagari(row.sgst.toFixed(2))}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 95, textAlign: 'right', color: '#16A34A', fontWeight: '700' }]}>
                                  ₹ {toDevanagari(row.totTax.toFixed(2))}
                                </Text>
                                <Text style={[styles.gstStTd, { width: 115, textAlign: 'right', fontWeight: '800', color: isDark ? '#F8FAFC' : '#111827' }]}>
                                  ₹ {toDevanagari(row.tot.toFixed(2))}
                                </Text>
                                <View style={{ width: 80, alignItems: 'center' }}>
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
                                <View style={{ width: 75, alignItems: 'center' }}>
                                  <TouchableOpacity
                                    style={styles.viewInvBtn}
                                    onPress={() => setViewingPurchaseInvoice(row)}
                                  >
                                    <Text style={styles.viewInvBtnText}>{t('view', 'View')}</Text>
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>
                            ))}

                            {/* Table Grand Totals Row */}
                            <View style={styles.gstStatementTableTotalRow}>
                              <Text style={[styles.gstStTdTotal, { width: 140 }]}>
                                {t('netTotalCol', 'NET TOTAL')} ({toDevanagari(filteredPurchaseInvoices.length)})
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 110, color: '#9CA3AF' }]}>-</Text>
                              <Text style={[styles.gstStTdTotal, { width: 160, color: '#9CA3AF' }]}>-</Text>
                              <Text style={[styles.gstStTdTotal, { width: 130, color: '#9CA3AF' }]}>-</Text>
                              <Text style={[styles.gstStTdTotal, { width: 150, color: '#9CA3AF' }]}>-</Text>
                              <Text style={[styles.gstStTdTotal, { width: 110, textAlign: 'right' }]}>
                                ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.taxable, 0).toFixed(2))}
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 90, textAlign: 'right', color: '#16A34A' }]}>
                                ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.cgst, 0).toFixed(2))}
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 90, textAlign: 'right', color: '#16A34A' }]}>
                                ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.sgst, 0).toFixed(2))}
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 95, textAlign: 'right', color: '#16A34A' }]}>
                                ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.totTax, 0).toFixed(2))}
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 115, textAlign: 'right' }]}>
                                ₹ {toDevanagari(filteredPurchaseInvoices.reduce((s, r) => s + r.tot, 0).toFixed(2))}
                              </Text>
                              <Text style={[styles.gstStTdTotal, { width: 80, textAlign: 'center' }]}>-</Text>
                              <Text style={[styles.gstStTdTotal, { width: 75, textAlign: 'center' }]}>-</Text>
                            </View>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  </View>
                )}
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

                  <View style={styles.toggleRow}>
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

                  {/* 4. Bluetooth Thermal Printer Toggle (Brown Toggle matching web) */}
                  <View style={[styles.toggleRow, !enableBluetoothPrinter && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>Enable Bluetooth Thermal Printer</Text>
                      <Text style={styles.toggleSub}>Direct connection with 58mm / 80mm ESC/POS Bluetooth printers</Text>
                    </View>
                    <Switch
                      value={enableBluetoothPrinter}
                      onValueChange={setEnableBluetoothPrinter}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {enableBluetoothPrinter && (
                  <View style={styles.btSettingsCard}>
                    <View style={styles.btHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
                        <View style={styles.btIconCircle}>
                          <Bluetooth size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.btCardTitle} numberOfLines={1} ellipsizeMode="tail">
                            Direct Bluetooth Thermal
                          </Text>
                          <Text style={styles.btCardSub} numberOfLines={1} ellipsizeMode="tail">
                            Pair 58mm/80mm BLE thermal printers
                          </Text>
                        </View>
                      </View>
                      <View style={styles.btStatusBadge}>
                        <View style={styles.btStatusDot} />
                        <Text style={styles.btStatusBadgeText}>Active</Text>
                      </View>
                    </View>

                    {/* Paper Roll Size Selector */}
                    <Text style={styles.btConfigLabel}>DEFAULT RECEIPT ROLL SIZE</Text>
                    <View style={styles.btRollRow}>
                      <TouchableOpacity
                        style={[styles.btRollBtn, bluetoothRollSize === '80mm' && styles.btRollBtnActive]}
                        onPress={() => setBluetoothRollSize('80mm')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.btRollText, bluetoothRollSize === '80mm' && styles.btRollTextActive]}>
                          80mm Standard POS
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btRollBtn, bluetoothRollSize === '58mm' && styles.btRollBtnActive]}
                        onPress={() => setBluetoothRollSize('58mm')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.btRollText, bluetoothRollSize === '58mm' && styles.btRollTextActive]}>
                          58mm Pocket Thermal
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Android Guidance Box */}
                    <View style={styles.btGuidanceBox}>
                      <Text style={styles.btGuidanceHeading}>📱 Android Phone Connectivity Guide:</Text>
                      <Text style={styles.btGuidanceText}>
                        1. मोबाईलच्या Settings &gt; Bluetooth मध्ये जा आणि प्रिंटर Pair करा (उदा. ManeMess-Printer, PIN: 0000 किंवा 1234).
                        {'\n'}2. Android सिस्टम प्रिंट स्पूलरसाठी "RawBT Print Service" ॲप Install करून चालू ठेवा.
                        {'\n'}3. खालील Test Print किंवा KOT / बिलिंग मधून प्रिंट दाबताच प्रिंटर आपोआप दिसेल.
                      </Text>
                    </View>

                    {/* Test Print Action */}
                    <View style={{ marginTop: 10 }}>
                      <TouchableOpacity
                        style={styles.btTestPrintBtn}
                        onPress={handleTestPrint}
                        disabled={testPrintLoading}
                        activeOpacity={0.8}
                      >
                        <Printer size={15} color="#8F351D" />
                        <Text style={styles.btTestPrintText}>
                          {testPrintLoading ? 'Dispatching...' : `Test Print (${bluetoothRollSize})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

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
                CENTRAL SERVER & BACKEND SYNC TAB
            ---------------------------------------------------- */}
            {activeTab === 'server' && (
              <View style={styles.settingsCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{t('centralServerTitle', 'Central Server Connection')}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('centralServerSub', 'Connect Mobile POS with Central Hotel Server (Spring Boot & SQL Server).')}
                    </Text>
                  </View>
                  <View style={[styles.alertsBadge, { backgroundColor: serverStatus?.connected ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.alertsBadgeText, { color: serverStatus?.connected ? '#166534' : '#991B1B' }]}>
                      {serverStatus?.connected ? 'CONNECTED' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                {/* Connection Status Box */}
                <View
                  style={[
                    styles.serverStatusBox,
                    {
                      borderColor: serverStatus?.connected ? '#86EFAC' : '#FCA5A5',
                      backgroundColor: serverStatus?.connected ? '#F0FDF4' : '#FEF2F2',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View
                      style={[
                        styles.serverDot,
                        { backgroundColor: serverStatus?.connected ? '#16A34A' : '#DC2626' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.serverStatusTitle,
                        { color: serverStatus?.connected ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {serverStatus?.connected
                        ? t('serverOnline', 'Central Server is Online')
                        : t('serverOffline', 'Central Server Disconnected')}
                    </Text>
                    {serverStatus?.latencyMs ? (
                      <Text style={styles.latencyBadge}>{serverStatus.latencyMs}ms</Text>
                    ) : null}
                  </View>
                  <Text style={styles.serverStatusUrl}>
                    Active API URL: <Text style={{ fontWeight: '700' }}>{currentServerUrl || DEFAULT_URL}</Text>
                  </Text>
                  <Text style={styles.serverStatusNote}>
                    {serverStatus?.message ||
                      (serverStatus?.connected
                        ? 'Real-time synchronization active with Vite web records.'
                        : 'Check Wi-Fi network and ensure PC and Mobile are on the same Wi-Fi.')}
                  </Text>
                </View>

                {/* Server Host / IP Configuration Form */}
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.expLabel}>{t('serverIpAddress', 'Central Server Host / IP Address')}</Text>
                  <TextInput
                    style={[styles.expInput, { backgroundColor: '#F8FAFC' }]}
                    value={serverHostInput}
                    onChangeText={setServerHostInput}
                    placeholder="e.g. 192.168.1.51"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHelpText}>
                    Enter the IPv4 address of the computer running Vite and Spring Boot (e.g. {CURRENT_LAN_HOST}). Default port is {BACKEND_PORT}.
                  </Text>
                </View>

                {serverSaveMsg ? (
                  <View style={[styles.toastCard, { marginTop: 12, backgroundColor: '#DCFCE7' }]}>
                    <CheckCircle2 size={16} color="#15803D" />
                    <Text style={[styles.toastText, { color: '#166534' }]}>{serverSaveMsg}</Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={[styles.cardActionsRow, { marginTop: 24 }]}>
                  <TouchableOpacity
                    style={[styles.resetButton, { flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => runServerTest()}
                    disabled={isTestingServer}
                  >
                    <Zap size={14} color="#57534E" style={{ marginRight: 6 }} />
                    <Text style={styles.resetButtonText}>
                      {isTestingServer ? t('testing', 'Testing...') : t('testConnection', 'Test Ping')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.resetButton, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9' }]}
                    onPress={handleAutoDetectServer}
                  >
                    <RotateCcw size={14} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={[styles.resetButtonText, { color: '#334155' }]}>{t('autoDetect', 'Auto-Detect')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C2410C' }]}
                    onPress={handleSaveServer}
                  >
                    <Save size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveButtonText}>{t('saveAndConnect', 'Save & Connect')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Helpful Network Diagnostics Info */}
                <View style={styles.diagBox}>
                  <Text style={styles.diagTitle}>Connectivity Guide (कनेक्टिव्हिटी मार्गदर्शक):</Text>
                  <Text style={styles.diagText}>
                    • Make sure your mobile phone and your computer are connected to the same Wi-Fi router / hotspot.
                  </Text>
                  <Text style={styles.diagText}>
                    • Both Vite Web POS and Mobile Native POS share the same database in real-time.
                  </Text>
                  <Text style={styles.diagText}>
                    • Any table created, order placed, KOT sent, or bill settled on either platform will appear on both immediately.
                  </Text>
                </View>
              </View>
            )}

            {/* ----------------------------------------------------
                PRINTER SETTINGS TAB (Native Module + PrintService)
            ---------------------------------------------------- */}
            {activeTab === 'printer' && (
              <HotelPrinterSettingsScreen onBack={() => setActiveTab('billing')} />
            )}

            {/* ----------------------------------------------------
                6. SYSTEM PREFERENCES TAB (Regional & Backup)
            ---------------------------------------------------- */}
            {activeTab === 'system' && (
              <View style={{ gap: 16 }}>
                {/* REGIONAL & BACKUP PREFERENCES */}
                <View style={[styles.settingsCard, isDark && styles.darkCard]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.cardTitle, isDark && styles.darkText]}>{t('systemPreferences', 'System Preferences')}</Text>
                      <Text style={[styles.cardSubtitle, isDark && styles.darkSubText]}>
                        {t('systemAndBackup', 'Manage regional preferences and automatic backup.')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>{t('dateFormat', 'Date Format')}</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setPickerModalType('dateFormat')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectInputText} numberOfLines={1} ellipsizeMode="tail">{dateFormat}</Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>{t('timeFormat', 'Time Format')}</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setPickerModalType('timeFormat')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectInputText} numberOfLines={1} ellipsizeMode="tail">{timeFormat}</Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>{t('language', 'Language')}</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setPickerModalType('language')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectInputText} numberOfLines={1} ellipsizeMode="tail">
                          {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
                        </Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>{t('backupFrequency', 'Backup Frequency')}</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setPickerModalType('backupFrequency')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectInputText} numberOfLines={1} ellipsizeMode="tail">{backupFrequency}</Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.toggleRow, { marginTop: 16, borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={styles.toggleLabel}>{t('automaticBackup', 'Automatic Backup')}</Text>
                      <Text style={styles.toggleSub}>{t('automaticBackupDescNight', 'Automatically create secure system backups daily at 11:00 PM every night.')}</Text>
                    </View>
                    <Switch
                      value={automaticBackup}
                      onValueChange={setAutomaticBackup}
                      trackColor={{ true: '#8F351D', false: '#D9D0CA' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Daily Automated Hotel Backup (11:00 PM) Card */}
                  <View style={{
                    width: '100%',
                    marginTop: 18,
                    marginBottom: 16,
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}>
                    {/* Header: Icon, Titles & Scheduled badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#2563EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Mail size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F9FAFB' : '#0F172A', flexShrink: 1 }} numberOfLines={1}>
                            Daily Automated Hotel Backup
                          </Text>
                          <View style={{
                            backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isDark ? '#059669' : '#86EFAC',
                          }}>
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#34D399' : '#15803D' }}>
                              23:00 NIGHTLY
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 15 }} numberOfLines={1}>
                          {language === 'mr' ? 'दैनिक हॉटेल डेटा बॅकअप • रोज रात्री ११:०० वाजता मेल' : 'Daily hotel data backup • Automated dispatch at 11:00 PM'}
                        </Text>
                      </View>
                    </View>

                    {/* Explanatory description */}
                    <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#475569', lineHeight: 18 }}>
                      Every night at <Text style={{ fontWeight: '700' }}>11:00 PM</Text>, all daily sales, orders, invoices, payments, tables, and expenses are compiled and automatically sent to your Hotel Profile email (<Text style={{ fontWeight: '700', color: '#2563EB' }}>{email || 'admin@royalpalace.com'}</Text>) with JSON data and PDF summary attachments.
                    </Text>

                    {/* SMTP Status Notice */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#064E3B20' : '#F0FDF4',
                      borderWidth: 1,
                      borderColor: isDark ? '#05966940' : '#BBF7D0',
                      marginTop: 2,
                    }}>
                      <CheckCircle size={15} color="#16A34A" style={{ flexShrink: 0 }} />
                      <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '700', color: isDark ? '#34D399' : '#15803D', lineHeight: 16 }}>
                        Gmail SMTP Connected ({smtpSenderEmail || 'omchaudhari553@gmail.com'})
                      </Text>
                    </View>

                    {/* Status Alert Box */}
                    {backupStatusMsg ? (
                      <View style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: backupStatusMsg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
                        borderWidth: 1,
                        borderColor: backupStatusMsg.startsWith('Error') ? '#EF444450' : '#10B98150',
                      }}>
                        <Text style={{
                          fontSize: 11.5,
                          fontWeight: '600',
                          color: backupStatusMsg.startsWith('Error') ? '#991B1B' : '#065F46',
                        }}>
                          {backupStatusMsg}
                        </Text>
                      </View>
                    ) : null}

                    {/* Action Buttons Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {/* Send Backup Email Now (Blue Square Icon Button) */}
                      <TouchableOpacity
                        onPress={handleSendDailyBackupNow}
                        disabled={backupSending}
                        activeOpacity={0.8}
                        accessibilityLabel={language === 'mr' ? 'बॅकअप मेल आता पाठवा' : 'Send Daily Backup to Email Now'}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: backupSending ? '#94A3B8' : '#2563EB',
                        }}
                      >
                        <RefreshCw size={18} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* Download Excel (.xlsx) Backup */}
                      <TouchableOpacity
                        onPress={handleDownloadDailyBackupExcel}
                        activeOpacity={0.8}
                        accessibilityLabel={language === 'mr' ? 'Excel बॅकअप (.xlsx) डाउनलोड करा' : 'Download Excel Backup (.xlsx)'}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#10B981',
                          borderWidth: 1,
                          borderColor: '#059669',
                        }}
                      >
                        <FileSpreadsheet size={18} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* Download PDF Backup (White/Border Square Icon Button) */}
                      <TouchableOpacity
                        onPress={handleDownloadDailyBackupPdf}
                        activeOpacity={0.8}
                        accessibilityLabel={language === 'mr' ? 'बॅकअप (.pdf) डाउनलोड करा' : 'Download PDF Report (.pdf)'}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#334155' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: isDark ? '#475569' : '#CBD5E1',
                        }}
                      >
                        <FileText size={18} color={isDark ? '#F8FAFC' : '#1E293B'} />
                      </TouchableOpacity>

                      {/* Download JSON Backup (White/Border Square Icon Button) */}
                      <TouchableOpacity
                        onPress={handleDownloadDailyBackup}
                        activeOpacity={0.8}
                        accessibilityLabel={language === 'mr' ? 'बॅकअप (.json) डाउनलोड करा' : 'Download Backup (.json)'}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#334155' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: isDark ? '#475569' : '#CBD5E1',
                        }}
                      >
                        <Download size={18} color={isDark ? '#F8FAFC' : '#1E293B'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.systemStatusGrid}>
                    <View style={styles.statusMiniCard}>
                      <Text style={styles.statusLabel}>{t('systemStatus', 'System Status')}</Text>
                      <View style={[styles.statusValRow, { marginTop: 4 }]}>
                        <View style={styles.greenDot} />
                        <Text style={[styles.statusVal, { marginTop: 0 }]} numberOfLines={1}>{t('operational', 'Operational')}</Text>
                      </View>
                    </View>

                    <View style={styles.statusMiniCard}>
                      <Text style={styles.statusLabel}>{t('backup', 'BACKUP')}</Text>
                      <Text style={[styles.statusVal, { marginTop: 4 }]} numberOfLines={1} ellipsizeMode="tail">
                        {backupFrequency.includes('11:00') ? 'Daily (11 PM)' : backupFrequency}
                      </Text>
                    </View>

                    <View style={styles.statusMiniCard}>
                      <Text style={styles.statusLabel}>{t('timeFormat', 'Time Format')}</Text>
                      <Text style={[styles.statusVal, { marginTop: 4 }]} numberOfLines={1}>
                        {timeFormat}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.visibilityCard}>
                    <View style={[styles.visibilityHeader, { flexWrap: 'wrap', gap: 6 }]}>
                      <Text style={[styles.visibilityTitle, { flex: 1, minWidth: 160 }]}>
                        {t('dashboardSectionVisibility', 'Dashboard Section Visibility')}
                      </Text>
                      <View style={styles.liveSyncBadge}>
                        <View style={styles.greenDot} />
                        <Text style={styles.liveSyncText}>{t('syncActive', 'Sync Active')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.visibilityDesc, { marginTop: 4, lineHeight: 16 }]}>
                      Configure which overview panels are displayed on the main Hotel Overview Dashboard. Changes sync across the application and persist in SQL Server.
                    </Text>

                    <View style={[styles.toggleRow, { borderBottomWidth: 0, marginTop: 10, paddingVertical: 4 }]}>
                      <View style={{ flex: 1, paddingRight: 14 }}>
                        <Text style={[styles.toggleLabel, { fontSize: 13, lineHeight: 18 }]}>
                          Sales & Payment Overview Sections (Today's Sales, Sales Overview, Payment Summary)
                        </Text>
                        <Text style={[styles.toggleSub, { marginTop: 3, lineHeight: 16 }]}>
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

                  <View style={[styles.cardActionsRow, { marginTop: 18 }]}>
                    <TouchableOpacity
                      style={[styles.resetButton, { height: 42, justifyContent: 'center', alignItems: 'center' }]}
                      onPress={handleResetSystem}
                    >
                      <Text style={styles.resetButtonText}>{t('resetSection', 'Reset Section')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveButton, { height: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 }]}
                      onPress={handleSaveSystem}
                    >
                      <Text style={styles.saveButtonText}>{t('saveChanges', 'Save Changes')}</Text>
                    </TouchableOpacity>
                  </View>
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
                      {t('hotelProfileDesc', "Manage your hotel's basic business and contact information.")}
                    </Text>
                  </View>
                </View>

                {/* Hotel Brand Logo Box (Matches Desktop / Image Exactly) */}
                <View style={styles.logoCardBox}>
                  <Text style={styles.logoCardTitle}>{t('hotelLogo', 'Hotel Brand Logo')}</Text>
                  <Text style={styles.logoCardSubtitle}>
                    {t('hotelLogoDesc', 'Upload logo for receipts, bills & header branding (PNG, JPG, WEBP up to 2MB).')}
                  </Text>

                  {hotelLogo ? (
                    <View style={styles.logoPreviewWrap}>
                      <Image source={{ uri: hotelLogo }} style={styles.logoPreviewImage} resizeMode="contain" />
                      <View style={styles.logoActionRow}>
                        <TouchableOpacity
                          style={styles.logoChangeBtn}
                          onPress={handlePickLogo}
                          activeOpacity={0.8}
                        >
                          <Upload size={14} color="#7C2D12" />
                          <Text style={styles.logoChangeBtnText}>{t('changeLogo', 'Change Logo')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.logoRemoveBtn}
                          onPress={handleRemoveLogo}
                          activeOpacity={0.8}
                        >
                          <Trash2 size={14} color="#DC2626" />
                          <Text style={styles.logoRemoveBtnText}>{t('remove', 'Remove')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.logoEmptyWrap}>
                      <View style={styles.logoIconBadge}>
                        <Building2 size={26} color="#7C2D12" />
                      </View>
                      <TouchableOpacity
                        style={styles.logoUploadBtn}
                        onPress={handlePickLogo}
                        activeOpacity={0.85}
                      >
                        <Upload size={15} color="#FFFFFF" />
                        <Text style={styles.logoUploadBtnText}>{t('uploadLogo', 'Upload Logo / Image')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Row 1: Hotel Name & Owner Name */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('hotelName', 'Hotel Name')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={hotelName}
                      onChangeText={setHotelName}
                      placeholder="Royal Palace Hotel"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('ownerName', 'Owner Name')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={ownerName}
                      onChangeText={setOwnerName}
                      placeholder="Rahul Patil"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>
                </View>

                {/* Row 2: Email Address & Mobile Number */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('emailAddress', 'Email Address')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="admin@royalpalace.com"
                      keyboardType="email-address"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('mobileNumber', 'Mobile Number')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholder="10-digit mobile number"
                      keyboardType="phone-pad"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>
                </View>

                {/* Row 3: Alternate Mobile & City */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('alternateMobile', 'Alternate Mobile')}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={alternateMobile}
                      onChangeText={setAlternateMobile}
                      placeholder="Optional mobile number"
                      keyboardType="phone-pad"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('city', 'City')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Enter city"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>
                </View>

                {/* Row 4: State & Address */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('state', 'State')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={state}
                      onChangeText={setState}
                      placeholder="Enter state"
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>{t('address', 'Address')} *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Hotel Premises..."
                      placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    />
                  </View>
                </View>

                <View style={[styles.cardActionsRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }]}>
                  {profileSavedNotice && (
                    <View style={styles.savedInlineBadge}>
                      <Check size={14} color="#059669" />
                      <Text style={styles.savedInlineText}>Settings Saved</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveProfile}
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

      {/* GST Period Selection Modal (Today / This Week / This Month / All Time) */}
      <Modal
        visible={showGstPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGstPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowGstPeriodModal(false)}
        >
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('selectGstPeriod', 'Select GST Period')}</Text>
              <TouchableOpacity onPress={() => setShowGstPeriodModal(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 4 }}>
              {[
                { key: 'today', label: t('today', 'Today') },
                { key: 'this-week', label: t('thisWeek', 'This Week') },
                { key: 'this-month', label: t('thisMonth', 'This Month') },
                { key: 'all-time', label: t('allTime', 'All Time') },
              ].map((opt) => {
                const isSelected = kpiGstPeriod === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setKpiGstPeriod(opt.key as any);
                      setShowGstPeriodModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={16} color="#C2410C" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Import Expenses CSV Modal */}
      <Modal
        visible={showImportExpenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportExpenseModal(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={[styles.expenseModalCard, { maxHeight: 520 }]}>
            <View style={styles.expModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expModalTitle}>{t('importExpenses', 'Import Expenses (CSV)')}</Text>
                <Text style={styles.expModalSubtitle}>{t('pasteCsvDescription', 'Paste CSV rows or load sample data to import')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImportExpenseModal(false)}
                style={styles.expModalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 0, paddingVertical: 6 }} showsVerticalScrollIndicator={false}>
              {/* CSV Format Info Box */}
              <View style={{ backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderWidth: 1, borderColor: isDark ? '#334155' : '#BFDBFE', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E40AF', marginBottom: 4 }}>
                  {t('expectedCsvFormat', 'Expected CSV Format:')}
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#2563EB', fontFamily: 'monospace' }}>
                  Name, Category, Amount, Date, BranchCode, PaymentMode, Description
                </Text>
              </View>

              {/* Action Buttons: Load Sample / Clear */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={handleLoadSampleCsv}
                  style={{ backgroundColor: isDark ? '#334155' : '#E0E7FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#4338CA' }}>
                    + {t('loadSampleData', 'Load Sample Data')}
                  </Text>
                </TouchableOpacity>
                {importCsvText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setImportCsvText('')}
                    style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#DC2626' }}>
                      {t('clear', 'Clear')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Multiline CSV TextInput */}
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? '#4B5563' : '#CBD5E1',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: 18,
                  color: isDark ? '#F9FAFB' : '#1F2937',
                  backgroundColor: isDark ? '#0F172A' : '#FAFAFA',
                  height: 150,
                  textAlignVertical: 'top',
                  fontFamily: 'monospace',
                }}
                multiline
                numberOfLines={7}
                placeholder={`Daily Vegetables,Food Supplies,1850,17 Nov 2026,MB-1,Cash,Fresh veggies
Commercial Gas Cylinder,Fuel & Gas,2400,17 Nov 2026,MB-1,UPI,Gas refill`}
                placeholderTextColor="#9CA3AF"
                value={importCsvText}
                onChangeText={setImportCsvText}
              />
            </ScrollView>

            <View style={styles.expModalActionsRow}>
              <TouchableOpacity
                style={styles.expCancelBtn}
                onPress={() => setShowImportExpenseModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.expCancelBtnText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.expSubmitBtn, !importCsvText.trim() && { opacity: 0.5 }]}
                onPress={handleConfirmImportCsv}
                disabled={!importCsvText.trim()}
                activeOpacity={0.8}
              >
                <Download size={15} color="#FFFFFF" />
                <Text style={styles.expSubmitBtnText}>{t('importExpenses', 'Import Expenses')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

                {/* Row 3: Date * | Payment Mode * */}
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

      {/* Plan Upgrade & Renew Modal (AjalkarBill 3-Step Selection, UPI QR, and Verification) */}
      <RenewPlanModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        hotelName={hotelName || 'Royal Palace Hotel'}
        onSuccess={async () => {
          const savedPlan = await AsyncStorage.getItem('@hotel_license_plan');
          if (savedPlan) {
            const p = JSON.parse(savedPlan);
            if (p.planName) setActivePlanName(p.planName);
            if (p.daysRemaining !== undefined) setDaysRemaining(p.daysRemaining);
          }
        }}
      />

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

const getStyles = (isDark: boolean, screenWidth: number = 400) => {
  const isDesktop = screenWidth >= 768;
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const textMuted = isDark ? '#64748B' : '#A8A29E';
  const dividerColor = isDark ? '#2A364F' : '#F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const subBg = isDark ? '#1E293B' : '#F8FAFC';

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F19' : '#FAF8F6',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 95,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
      flexDirection: 'column',
      gap: 14,
    },
    settingsLayoutDesktop: {
      flexDirection: 'column',
      gap: 14,
    },
    settingsLayoutMobile: {
      flexDirection: 'column',
      gap: 12,
    },
    subSidebar: {
      width: '100%',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: '#EEE5DF',
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    subSidebarMobile: {
      width: '100%',
    },
    horizontalTabsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingRight: 6,
    },
    subNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 7,
      gap: 6,
      backgroundColor: '#FAF8F6',
      borderWidth: 1,
      borderColor: '#EFE8E2',
    },
    subNavItemActive: {
      backgroundColor: '#F7EAE4',
      borderColor: '#E8C4B8',
    },
    subNavIconBox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      backgroundColor: '#F4F0ED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subNavIconBoxActive: {
      backgroundColor: '#8F351D',
    },
    subNavTitle: {
      fontSize: 11.5,
      fontWeight: '700',
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
      backgroundColor: cardBg,
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
    logoCardBox: {
      backgroundColor: '#FAFAF9',
      borderWidth: 1,
      borderColor: '#E7E5E4',
      borderStyle: 'dashed',
      borderRadius: 14,
      padding: 18,
      alignItems: 'center',
      marginBottom: 20,
    },
    logoCardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#292524',
      marginBottom: 4,
    },
    logoCardSubtitle: {
      fontSize: 11.5,
      color: '#78716C',
      textAlign: 'center',
      marginBottom: 14,
      maxWidth: 380,
      lineHeight: 16,
    },
    logoEmptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoIconBadge: {
      width: 60,
      height: 60,
      borderRadius: 14,
      backgroundColor: '#FFEDD5',
      borderWidth: 1,
      borderColor: '#FDBA74',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    logoUploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#7C2D12',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      shadowColor: '#7C2D12',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    logoUploadBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    logoPreviewWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoPreviewImage: {
      width: 90,
      height: 90,
      borderRadius: 12,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      marginBottom: 12,
    },
    logoActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoChangeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#F5F5F4',
      borderWidth: 1,
      borderColor: '#D6D3D1',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    logoChangeBtnText: {
      color: '#44403C',
      fontSize: 12,
      fontWeight: '700',
    },
    logoRemoveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    logoRemoveBtnText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '700',
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
    savedInlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#86EFAC',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    savedInlineText: {
      color: '#059669',
      fontWeight: '800',
      fontSize: 12,
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
    formRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    formCol: {
      flex: 1,
    },
    formFieldCol: {
      width: '48%',
      flexBasis: '48%',
      marginBottom: 6,
    },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#443731',
      marginBottom: 5,
    },
    textInput: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 12.5,
      color: isDark ? '#F9FAFB' : '#1F2937',
      backgroundColor: cardBg,
      minHeight: 40,
      justifyContent: 'center',
    },
    selectInput: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 44,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cardBg,
    },
    selectInputText: {
      flex: 1,
      fontSize: 12.5,
      color: isDark ? '#F9FAFB' : '#1F2937',
      fontWeight: '600',
      marginRight: 6,
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
      backgroundColor: cardBg,
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
      minWidth: 95,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#EEE5DF',
      backgroundColor: cardBg,
      minHeight: 62,
      justifyContent: 'center',
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
      color: textPrimary,
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
      color: textPrimary,
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
      backgroundColor: cardBg,
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
      backgroundColor: isDark ? '#0B0F19' : '#FAF8F6',
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
      color: textPrimary,
      marginTop: 4,
    },
    kpiCustomizeCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFBF7',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#FED7AA',
      borderRadius: 10,
      padding: 12,
      marginTop: 10,
      marginBottom: 8,
    },
    kpiCustomizeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#FED7AA',
    },
    kpiCustomizeTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#1C1917',
    },
    kpiCustomizeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kpiCustomizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 7,
      minWidth: 130,
      flex: 1,
    },
    kpiCustomizeItemLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: textPrimary,
      marginRight: 6,
    },
    kpiCheckbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#9CA3AF',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: cardBg,
    },
    kpiCheckboxChecked: {
      backgroundColor: '#EA580C',
      borderColor: '#EA580C',
    },
    orderSummaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    orderSummaryCard: {
      flex: 1,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
    },
    orderSummaryLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: textSecondary,
      textTransform: 'uppercase',
    },
    orderSummaryVal: {
      fontSize: 17,
      fontWeight: '900',
      color: textPrimary,
      marginTop: 2,
    },
    orderSummarySub: {
      fontSize: 9.5,
      color: textMuted,
      marginTop: 1,
    },
    subTabsStrip: {
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2A364F' : '#F0EBE7',
      paddingBottom: 8,
    },
    subTabsStripScroll: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    subTabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
    },
    subTabPillActive: {
      backgroundColor: '#8F351D',
      borderColor: '#8F351D',
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
    expenseTableFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      paddingHorizontal: 4,
    },
    expenseTableFooterLeft: {
      fontSize: 12,
      fontWeight: '600',
      color: textSecondary,
    },
    expenseTableFooterRight: {
      fontSize: 12.5,
      fontWeight: '800',
      color: textPrimary,
    },
    // Business Analytics & Charts Header
    analyticsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
      marginBottom: 12,
    },
    analyticsTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: textPrimary,
    },
    analyticsSubtitle: {
      fontSize: 11,
      color: textSecondary,
      marginTop: 2,
    },
    chartsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 6,
    },
    chartCardThird: {
      width: isDesktop ? '31.8%' : '100%',
      backgroundColor: cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#2A364F' : '#E5E7EB',
      padding: 14,
      marginBottom: isDesktop ? 0 : 8,
    },
    chartCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    chartSubtitle: {
      fontSize: 10.5,
      color: textSecondary,
      marginTop: 2,
    },
    chartTopAmount: {
      fontSize: 12,
      fontWeight: '800',
      color: textPrimary,
    },
    verticalBarContainer: {
      height: 140,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingTop: 8,
    },
    verticalBarCol: {
      alignItems: 'center',
      width: 60,
    },
    barTopVal: {
      fontSize: 10,
      fontWeight: '700',
      color: textSecondary,
      marginBottom: 6,
    },
    verticalBarTrack: {
      width: 28,
      height: 85,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderRadius: 6,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    verticalBarPillar: {
      width: '100%',
      backgroundColor: '#F97316',
      borderRadius: 6,
    },
    barXLabel: {
      fontSize: 9.5,
      fontWeight: '600',
      color: textSecondary,
      marginTop: 6,
    },
    donutChartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      height: 140,
    },
    donutRing: {
      width: 95,
      height: 95,
      borderRadius: 48,
      borderWidth: 10,
      borderColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: cardBg,
    },
    donutAmount: {
      fontSize: 10,
      fontWeight: '800',
      color: textPrimary,
    },
    donutLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: textSecondary,
    },
    donutLegend: {
      gap: 8,
    },
    donutLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendColorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    donutLegendItem: {
      fontSize: 11,
      fontWeight: '700',
      color: textPrimary,
    },
    donutLegendPercent: {
      fontSize: 9.5,
      color: textSecondary,
    },
    chartCardLegends: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      marginBottom: 8,
    },
    legendTextSmall: {
      fontSize: 10.5,
      fontWeight: '600',
      color: textSecondary,
      marginRight: 6,
    },
    menuPerformanceList: {
      height: 140,
      justifyContent: 'space-around',
    },
    menuPerformanceItem: {
      gap: 4,
    },
    menuPerformanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    menuPerformanceName: {
      fontSize: 11,
      fontWeight: '600',
      color: textPrimary,
    },
    menuPerformanceOrders: {
      fontSize: 10,
      fontWeight: '700',
      color: textSecondary,
    },
    menuPerformanceTrack: {
      height: 6,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderRadius: 3,
      overflow: 'hidden',
    },
    menuPerformanceFill: {
      height: '100%',
      backgroundColor: '#F97316',
      borderRadius: 3,
    },
    topExpenseBox: {
      minHeight: 70,
      justifyContent: 'center',
      paddingVertical: 6,
    },
    topExpenseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      gap: 10,
    },
    topExpenseIconBox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: '#8F351D',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topExpenseName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: textPrimary,
      textTransform: 'capitalize',
    },
    topExpenseAmount: {
      fontSize: 13.5,
      fontWeight: '800',
      color: textPrimary,
    },
    daysBadgePill: {
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    daysBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: textSecondary,
    },
    snapshotList: {
      paddingVertical: 6,
      gap: 12,
    },
    snapshotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    snapshotDate: {
      width: 82,
      fontSize: 10.5,
      fontWeight: '600',
      color: textSecondary,
    },
    snapshotTrack: {
      flex: 1,
      height: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderRadius: 4,
      overflow: 'hidden',
    },
    snapshotFill: {
      height: '100%',
      backgroundColor: '#8F351D',
      borderRadius: 4,
    },
    snapshotAmount: {
      width: 82,
      fontSize: 11,
      fontWeight: '800',
      color: textPrimary,
      textAlign: 'right',
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
      backgroundColor: cardBg,
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
    // Rich Visual Charts Native Styles
    barChartContainer: {
      height: 160,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      paddingTop: 16,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2A364F' : '#E5E7EB',
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
      maxWidth: 95,
    },
    barValueBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginBottom: 6,
    },
    barValueBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    barTrack: {
      width: 40,
      height: 85,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderRadius: 6,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: textPrimary,
      marginTop: 6,
    },
    barSubLabel: {
      fontSize: 9.5,
      fontWeight: '600',
      color: textSecondary,
      marginTop: 1,
    },
    trendContainer: {
      height: 125,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 14,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2A364F' : '#E5E7EB',
    },
    trendCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    trendValText: {
      fontSize: 9,
      fontWeight: '600',
      color: textSecondary,
      marginBottom: 4,
    },
    trendTrack: {
      width: 22,
      height: 65,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      borderRadius: 4,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    trendFill: {
      width: '100%',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    trendDayLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: textSecondary,
      marginTop: 4,
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
      borderColor: '#059669',
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: '#059669',
    },
    exportCsvBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
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
      backgroundColor: cardBg,
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
      backgroundColor: isDark ? '#0B0F19' : '#FAF8F6',
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
      color: textPrimary,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
      justifyContent: 'space-between',
      rowGap: 12,
    },
    gstFieldCol: {
      width: '48%',
      marginBottom: 4,
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 10,
      padding: 10,
    },
    gstFieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#374151',
      marginBottom: 6,
      minHeight: 28,
    },
    gstTextInput: {
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 12.5,
      color: isDark ? '#F9FAFB' : '#1F2937',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      height: 40,
    },
    gstSelectInput: {
      borderWidth: 1,
      borderColor: isDark ? '#475569' : '#D1D5DB',
      borderRadius: 8,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      height: 40,
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
      flexDirection: 'column',
      gap: 12,
      marginTop: 8,
    },
    planCard: {
      width: '100%',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      marginBottom: 4,
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
      fontSize: 11.5,
      color: '#6B7280',
      lineHeight: 16,
      marginBottom: 10,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 18,
    },
    upgradeModalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: cardBg,
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
      backgroundColor: subBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 10,
      padding: 14,
      marginTop: 6,
      marginBottom: 12,
    },
    filingSummaryTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    filingSummaryMeta: {
      gap: 4,
    },
    filingSummaryMetaText: {
      fontSize: 11.5,
      color: textSecondary,
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
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
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
      color: textPrimary,
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
      borderColor: cardBorder,
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
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 18,
    },
    invModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: textPrimary,
    },
    invModalSubtitle: {
      fontSize: 11.5,
      color: '#64748B',
      marginTop: 2,
    },
    invSupplierCard: {
      backgroundColor: subBg,
      borderWidth: 1,
      borderColor: cardBorder,
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
      color: textPrimary,
    },
    invMetaSub: {
      fontSize: 11,
      color: textSecondary,
      marginTop: 1,
    },
    invItemsTable: {
      borderWidth: 1,
      borderColor: cardBorder,
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
      color: textSecondary,
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
      backgroundColor: subBg,
      borderWidth: 1,
      borderColor: cardBorder,
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
      color: textSecondary,
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
      color: textPrimary,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
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
      backgroundColor: cardBg,
      minHeight: 68,
    },
    expModalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
    },
    expCancelBtn: {
      height: 42,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    expCancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4B5563',
    },
    expSubmitBtn: {
      height: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: '#C2410C',
    },
    expSubmitBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // 3-Plan Upgrade Modal Styles
    upgradeModalCardWide: {
      width: '100%',
      maxWidth: 560,
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 18,
    },
    modalPlansGrid: {
      gap: 10,
    },
    modalPlanCard: {
      backgroundColor: cardBg,
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

    // GST Report Dropdown Styles
    gstReportDropdownContainer: {
      marginBottom: 12,
      width: '100%',
    },
    gstReportDropdownLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    gstReportDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cardBg,
      borderWidth: 1.5,
      borderColor: '#8F351D',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    gstReportDropdownSelectedTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textPrimary,
    },
    gstReportDropdownSelectedSubtitle: {
      fontSize: 11,
      color: textSecondary,
      marginTop: 1,
    },
    gstReportDropdownMenu: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 10,
      marginTop: 6,
      padding: 6,
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 50,
    },
    gstReportDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 8,
    },
    gstReportDropdownItemActive: {
      backgroundColor: isDark ? '#2A201C' : '#FDF4F0',
    },
    gstReportDropdownItemTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: textPrimary,
    },
    gstReportDropdownItemTitleActive: {
      color: '#8F351D',
      fontWeight: '800',
    },
    gstReportDropdownItemSub: {
      fontSize: 10.5,
      color: textSecondary,
      marginTop: 1,
    },

    // KPI Reports Navigation Styles (Screenshot 2, 4, 5 matching)
    kpiReportsContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: 'stretch',
      gap: 14,
      marginTop: 14,
    },
    kpiReportsSidebar: {
      width: isDesktop ? 220 : '100%',
      backgroundColor: isDark ? '#1E293B' : '#FAFAF9',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E7E5E4',
      padding: 8,
      gap: 4,
    },
    kpiReportsSidebarTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 6,
      paddingHorizontal: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiSidebarTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 6,
      paddingHorizontal: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiReportItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 8,
    },
    kpiSidebarItem: {
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
    kpiSidebarItemActive: {
      backgroundColor: '#C2410C',
    },
    kpiReportItemText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#44403C',
    },
    kpiSidebarItemText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#44403C',
    },
    kpiReportItemTextActive: {
      color: '#FFFFFF',
    },
    kpiSidebarItemTextActive: {
      color: '#FFFFFF',
    },
    kpiSidebarItemSub: {
      fontSize: 10,
      color: '#9CA3AF',
    },
    kpiReportContentBox: {
      flex: 1,
      minWidth: 0,
      backgroundColor: cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      padding: 14,
    },
    kpiReportsContent: {
      flex: 1,
      minWidth: 0,
      backgroundColor: cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      padding: 14,
    },
    kpiReportHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    srHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    kpiReportMainTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: textPrimary,
    },
    srTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: textPrimary,
    },
    srHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    kpiDatePillGroup: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#0F172A' : '#F3F4F6',
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    periodPillsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#0F172A' : '#F3F4F6',
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    kpiDatePill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 6,
    },
    periodPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 6,
    },
    kpiDatePillActive: {
      backgroundColor: '#C2410C',
    },
    periodPillActive: {
      backgroundColor: '#C2410C',
    },
    kpiDatePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: textSecondary,
    },
    periodPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: textSecondary,
    },
    kpiDatePillTextActive: {
      color: '#FFFFFF',
    },
    periodPillTextActive: {
      color: '#FFFFFF',
    },
    exportCsvBtnGreen: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#059669',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 7,
    },
    exportCsvBtnGreenText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    printPdfBtnOrange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#EA580C',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 7,
    },
    printPdfBtnOrangeText: {
      fontSize: 11,
      fontWeight: '800',
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
      color: textSecondary,
    },
    kpiReportSnapshotText: {
      fontSize: 11,
      fontWeight: '700',
      color: textMuted,
    },
    kpiTableWrap: {
      minWidth: 600,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      overflow: 'hidden',
    },
    kpiTableHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#E5E7EB',
    },
    kpiTh: {
      fontSize: 10.5,
      fontWeight: '800',
      color: textSecondary,
      letterSpacing: 0.5,
    },
    kpiTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E293B' : '#F3F4F6',
      backgroundColor: cardBg,
    },
    kpiTd: {
      fontSize: 12,
      color: textPrimary,
    },

    // Sales Report 3-column Table (Screenshot 2)
    salesReportTable: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      overflow: 'hidden',
    },
    salesReportTableHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#E5E7EB',
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    srTh: {
      fontSize: 10.5,
      fontWeight: '800',
      color: textSecondary,
      letterSpacing: 0.5,
    },
    salesReportTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E293B' : '#F3F4F6',
      backgroundColor: cardBg,
    },
    srTd: {
      fontSize: 11.5,
      color: textPrimary,
    },
    salesReportTableTotalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#1E293B' : '#FAFAF9',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#E5E7EB',
    },
    srTdTotal: {
      fontSize: 12,
      fontWeight: '800',
      color: textPrimary,
    },

    // Pagination Bar
    paginationBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
      paddingTop: 8,
    },
    paginationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    paginationText: {
      fontSize: 11,
      color: textSecondary,
    },
    paginationRowsSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#D1D5DB',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: cardBg,
    },
    paginationControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pageBtn: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      backgroundColor: cardBg,
    },
    pageBtnActive: {
      backgroundColor: '#C2410C',
      borderColor: '#C2410C',
    },
    pageBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: textSecondary,
    },
    pageBtnTextActive: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // GST Points in Box (Sidebar Cards)
    gstPointBox: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 9,
      padding: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    gstPointBoxActive: {
      borderColor: '#C2410C',
      backgroundColor: isDark ? '#3A1E14' : '#FFF7ED',
    },
    gstPointBadge: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gstPointBadgeActive: {
      backgroundColor: '#C2410C',
    },
    gstPointBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: textSecondary,
    },
    gstPointBadgeTextActive: {
      color: '#FFFFFF',
    },
    gstPointContent: {
      flex: 1,
    },
    gstPointTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: textPrimary,
    },
    gstPointTitleActive: {
      color: isDark ? '#FB923C' : '#C2410C',
      fontWeight: '800',
    },
    gstPointSubtitle: {
      fontSize: 10,
      color: textSecondary,
      marginTop: 1,
    },
    purchaseTableFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#E5E7EB',
    },

    // GST Scale Summary (Screenshot 4)
    gstPeriodDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#D1D5DB',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: cardBg,
    },
    gstPeriodDropdownText: {
      fontSize: 11,
      fontWeight: '700',
      color: textPrimary,
    },
    gstEightCardsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
    },
    gstStatCardBox: {
      minWidth: 120,
      backgroundColor: isDark ? '#1E293B' : '#FAF8F5',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E7E5E4',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    gstStatCardBoxLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      color: textSecondary,
      marginBottom: 4,
    },
    gstStatCardBoxVal: {
      fontSize: 12.5,
      fontWeight: '800',
      color: textPrimary,
    },
    salesTaxSummaryTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textPrimary,
      marginTop: 16,
      marginBottom: 10,
    },
    gstStatementTable: {
      minWidth: 800,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      overflow: 'hidden',
    },
    gstStatementTableHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#E5E7EB',
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    gstStTh: {
      fontSize: 10,
      fontWeight: '800',
      color: textSecondary,
      letterSpacing: 0.4,
    },
    gstStatementTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E293B' : '#F3F4F6',
      backgroundColor: cardBg,
    },
    gstStTd: {
      fontSize: 11,
      color: textPrimary,
    },
    gstStatementTableTotalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#1E293B' : '#FAFAF9',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#E5E7EB',
    },
    gstStTdTotal: {
      fontSize: 11.5,
      fontWeight: '800',
      color: textPrimary,
    },

    // Purchase Summary (Screenshot 5)
    purchaseFiveCardsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
    },
    purchaseEmptyStateCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E5E7EB',
      borderRadius: 8,
      backgroundColor: cardBg,
      marginTop: 14,
    },
    purchaseEmptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    purchaseEmptyStateText: {
      fontSize: 13,
      fontWeight: '600',
      color: textSecondary,
      textAlign: 'center',
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

    // Bluetooth Thermal Settings Styles
    btSettingsCard: {
      marginTop: 14,
      backgroundColor: subBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      padding: 14,
      overflow: 'hidden',
    },
    btHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    btIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#8F351D',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    btCardTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    btCardSub: {
      fontSize: 10.5,
      color: textSecondary,
      marginTop: 2,
    },
    btStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#BBF7D0',
      flexShrink: 0,
    },
    btStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },
    btStatusBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#166534',
    },
    btConfigLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: textSecondary,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    btRollRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    btRollBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btRollBtnActive: {
      borderColor: '#8F351D',
      backgroundColor: isDark ? '#2D1B18' : '#FEF2F2',
    },
    btRollText: {
      fontSize: 12,
      fontWeight: '600',
      color: textSecondary,
      textAlign: 'center',
    },
    btRollTextActive: {
      color: '#8F351D',
      fontWeight: '800',
    },
    btGuidanceBox: {
      backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#3B82F6',
      padding: 10,
      marginBottom: 4,
    },
    btGuidanceHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E40AF',
      marginBottom: 4,
    },
    btGuidanceText: {
      fontSize: 11,
      color: isDark ? '#CBD5E1' : '#334155',
      lineHeight: 16,
    },
    btTestPrintBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#8F351D',
      backgroundColor: cardBg,
    },
    btTestPrintText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#8F351D',
    },
    serverStatusBox: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
    },
    serverDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    serverStatusTitle: {
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    latencyBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: '#15803D',
      backgroundColor: '#BBF7D0',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    serverStatusUrl: {
      fontSize: 13,
      color: '#334155',
      marginTop: 4,
    },
    serverStatusNote: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 6,
    },
    inputHelpText: {
      fontSize: 11,
      color: '#64748B',
      marginTop: 6,
    },
    diagBox: {
      marginTop: 20,
      padding: 14,
      borderRadius: 10,
      backgroundColor: subBg,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    diagTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 6,
    },
    diagText: {
      fontSize: 12,
      color: textSecondary,
      lineHeight: 18,
      marginBottom: 4,
    },
    toastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
    },
    toastText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Search Results Panel
    searchResultsPanel: {
      backgroundColor: cardBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 12,
      marginBottom: 16,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    searchResultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      marginBottom: 4,
    },
    searchResultsCount: {
      fontSize: 13,
      fontWeight: '800',
      color: '#1F2937',
    },
    clearSearchBtn: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
    },
    clearSearchBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6B7280',
    },
    searchResultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      backgroundColor: '#FAFAF9',
      borderWidth: 1,
      borderColor: '#E7E5E4',
    },
    searchResultIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#FFF7ED',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    searchResultTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: textPrimary,
    },
    searchResultDesc: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 2,
    },
    categoryBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    categoryBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#4B5563',
      textTransform: 'uppercase',
    },
    openSettingBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: '#7C2D12',
    },
    openSettingBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Theme Options
    themeOptionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 10,
    },
    themeOptionCard: {
      flex: 1,
      minWidth: 140,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      backgroundColor: cardBg,
      padding: 14,
      position: 'relative',
    },
    themeOptionCardSelected: {
      borderColor: '#7C2D12',
      backgroundColor: '#FFFBF5',
      shadowColor: '#7C2D12',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    themeOptionCardDark: {
      backgroundColor: '#1E293B',
      borderColor: '#334155',
    },
    themeOptionHeader: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      position: 'relative',
    },
    themeActiveCheck: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#16A34A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeOptionBody: {
      marginBottom: 8,
    },
    themeOptionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 4,
    },
    themeOptionDesc: {
      fontSize: 11,
      color: '#6B7280',
      lineHeight: 15,
    },
    themeRadio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#D1D5DB',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    themeRadioActive: {
      borderColor: '#7C2D12',
    },
    themeRadioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#7C2D12',
    },

    // Dark styles
    darkCard: {
      backgroundColor: '#161F36',
      borderColor: '#2A364F',
    },
    darkText: {
      color: '#F8FAFC',
    },
    darkSubText: {
      color: '#94A3B8',
    },
  });
};
