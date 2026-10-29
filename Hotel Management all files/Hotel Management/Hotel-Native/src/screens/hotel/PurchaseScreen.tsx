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
  Linking,
  Platform,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Share,
  Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  downloadAndSharePdf,
  downloadAndShareCsv,
  shareTextToWhatsApp,
  buildPurchaseReceiptHtml,
  buildPurchaseReportHtml,
} from '../../utils/reportExporter';
import Svg, { G, Circle, Path, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import { MONTHS, DAYS_OF_WEEK_SHORT } from '../../locales/translations';
import { useBranch } from '../../context/BranchContext';
import {
  purchaseStore,
  PurchaseOrder,
  Supplier,
  GoodsReceipt,
  PurchaseInvoice,
  PurchaseReturn,
  SupplierPayment,
  validateGstin,
  numberToWordsIndian,
  formatPoReceiptForWhatsApp,
} from '../../api/purchaseService';
import {
  ShoppingCart,
  PackageCheck,
  FileText,
  Users,
  BarChart3,
  RotateCcw,
  CreditCard,
  Receipt,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  X,
  Printer,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  DollarSign,
  Send,
  Eye,
  Check,
  Camera,
  Image as ImageIcon,
  Save,
  Pencil,
  Download,
  Share2,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STANDARD_RESTAURANT_ITEMS = [
  { name: 'Fresh Malai Paneer', unit: 'Kg', defaultRate: 360, tax: 5 },
  { name: 'Amul Salted Butter Blocks', unit: 'Kg', defaultRate: 520, tax: 5 },
  { name: 'Basmati Rice Premium (Daawat/Kohinoor)', unit: 'Kg', defaultRate: 110, tax: 5 },
  { name: 'Refined Sunflower Oil 15L Tin', unit: 'Tin', defaultRate: 1850, tax: 5 },
  { name: 'Fresh Vegetables Assorted Kitchen Basket', unit: 'Kg', defaultRate: 45, tax: 0 },
  { name: 'Whole Wheat Atta (Aashirvaad 50Kg)', unit: 'Bag', defaultRate: 1950, tax: 5 },
  { name: 'Fresh Full Cream Milk', unit: 'Ltr', defaultRate: 64, tax: 0 },
  { name: 'Special Garam Masala & Spices Mix', unit: 'Kg', defaultRate: 480, tax: 12 },
  { name: 'Fresh Chicken Curry Cut', unit: 'Kg', defaultRate: 220, tax: 0 },
  { name: 'Onion & Potato Farm Sacks (50Kg)', unit: 'Bag', defaultRate: 1200, tax: 0 },
  { name: 'Ginger Garlic Fresh Kitchen Paste 5Kg', unit: 'Jar', defaultRate: 350, tax: 12 },
  { name: 'Tomato Puree Cans (3.1Kg)', unit: 'Can', defaultRate: 290, tax: 12 },
  { name: 'Fresh Green Chillies & Coriander', unit: 'Kg', defaultRate: 80, tax: 0 },
  { name: 'Cashew Nuts / Kaju Tukda', unit: 'Kg', defaultRate: 750, tax: 5 },
  { name: 'Heavy Whipping Dairy Cream 1L', unit: 'Pk', defaultRate: 210, tax: 5 },
];

type PurchaseTab =
  | 'dashboard'
  | 'supplier'
  | 'po'
  | 'grn'
  | 'invoice'
  | 'return'
  | 'payment'
  | 'record-payment'
  | 'reports';

export const PurchaseScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const { language, t, formatDate, toDevanagari } = useLanguage();
  const { activeBranch, getBranchName, activeBranchNumId } = useBranch();

  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<PurchaseTab>('dashboard');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Core Data from reactive purchaseStore
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  // Inter-tab Transfer State
  const [activePoForGrn, setActivePoForGrn] = useState<PurchaseOrder | null>(null);
  const [activeGrnForInvoice, setActiveGrnForInvoice] = useState<GoodsReceipt | null>(null);
  const [activeInvoiceForReturn, setActiveInvoiceForReturn] = useState<PurchaseInvoice | null>(null);
  const [viewingReceiptPo, setViewingReceiptPo] = useState<PurchaseOrder | null>(null);
  const [quickPayData, setQuickPayData] = useState<{
    poNumber?: string;
    invoiceNumber?: string;
    supplierId?: number | string;
    supplierName?: string;
    amount: number;
  } | null>(null);

  // Date Filter Range
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('2026-10-23');
  const [endDate, setEndDate] = useState<string>('2026-10-23');

  // Load data function
  const reloadData = useCallback(() => {
    setSuppliers(purchaseStore.getSuppliers());
    setPurchaseOrders(purchaseStore.getPurchaseOrders());
    setGoodsReceipts(purchaseStore.getGoodsReceipts());
    setPurchaseInvoices(purchaseStore.getPurchaseInvoices());
    setPurchaseReturns(purchaseStore.getPurchaseReturns());
    setSupplierPayments(purchaseStore.getSupplierPayments());
  }, []);

  useEffect(() => {
    reloadData();
    purchaseStore.syncWithBackend().then(reloadData).catch(() => {});
    const unsub = purchaseStore.subscribe(reloadData);
    return unsub;
  }, [reloadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await purchaseStore.syncWithBackend();
    reloadData();
    setRefreshing(false);
  };

  // Status translator
  const translateStatus = (status: string): string => {
    const s = (status || '').toUpperCase();
    if (s === 'RECEIVED') return language === 'mr' ? 'स्वीकारले' : language === 'hi' ? 'प्राप्त' : 'Received';
    if (s === 'COMPLETED') return language === 'mr' ? 'पूर्ण' : language === 'hi' ? 'पूर्ण' : 'Completed';
    if (s === 'ORDERED') return language === 'mr' ? 'मागविले' : language === 'hi' ? 'ऑर्डर किया' : 'Ordered';
    if (s === 'PARTIALLY_RECEIVED') return language === 'mr' ? 'अंशतः प्राप्त' : language === 'hi' ? 'आंशिक प्राप्त' : 'Partially Received';
    if (s === 'PAID') return language === 'mr' ? 'भरलेले' : language === 'hi' ? 'भुगतान किया' : 'Paid';
    if (s === 'UNPAID') return language === 'mr' ? 'बाकी' : language === 'hi' ? 'बकाया' : 'Unpaid';
    if (s === 'CANCELLED') return language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancelled';
    return status;
  };

  const formatCurrency = (val: number | string | undefined): string => {
    const n = Number(val) || 0;
    const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `₹ ${toDevanagari(formatted)}`;
  };

  const translateSupplierName = (name?: string): string => {
    if (!name || language === 'en') return name || '';
    const n = name.trim();
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
      'Balaji Traders': { mr: 'बालाजी ट्रेडर्स', hi: 'बालाजी ट्रेडर्स' },
    };
    return dict[n]?.[language] || n;
  };

  const translateItemName = (name?: string): string => {
    if (!name || language === 'en') return name || '';
    const n = name.trim();
    const dict: Record<string, { mr: string; hi: string }> = {
      'Fresh Malai Paneer': { mr: 'ताजे मलाई पनीर', hi: 'ताजा मलाई पनीर' },
      'Paneer': { mr: 'पनीर', hi: 'पनीर' },
      'Amul Salted Butter Blocks': { mr: 'अमुल सॉल्टेड बटर', hi: 'अमुल बटर' },
      'Butter': { mr: 'बटर', hi: 'बटर' },
      'Basmati Rice Premium (Daawat/Kohinoor)': { mr: 'प्रीमियम बासमती तांदूळ', hi: 'प्रीमियम बासमती चावल' },
      'Basmati Rice': { mr: 'बासमती तांदूळ', hi: 'बासमती चावल' },
      'Rice (Kolam Premium)': { mr: 'कोलम तांदूळ (प्रीमियम)', hi: 'कोलम चावल (प्रीमियम)' },
      'Rice': { mr: 'तांदूळ', hi: 'चावल' },
      'Refined Sunflower Oil 15L Tin': { mr: 'रिफाईंड सूर्यफूल तेल १५ लि. डबा', hi: 'रिफाइंड सूरजमुखी तेल १५ ली. टिन' },
      'Gemini Sunflower Oil': { mr: 'जेमिनी सूर्यफूल तेल', hi: 'जेमिनी सूरजमुखी तेल' },
      'Oil': { mr: 'सूर्यफूल तेल', hi: 'सूरजमुखी तेल' },
      'Fresh Vegetables Assorted Kitchen Basket': { mr: 'ताज्या स्वयंपाकघर भाज्या', hi: 'ताजी रसोई सब्जियां' },
      'Vegetables': { mr: 'भाज्या', hi: 'सब्जियां' },
      'Whole Wheat Atta (Aashirvaad 50Kg)': { mr: 'गव्हाचे पीठ (आशीर्वाद ५० किलो)', hi: 'गेहूं का आटा (आशीर्वाद ५० किलो)' },
      'Atta': { mr: 'गव्हाचे पीठ (आटा)', hi: 'गेहूं का आटा' },
      'Fresh Full Cream Milk': { mr: 'ताजे म्हशीचे दूध', hi: 'ताजा फुल क्रीम दूध' },
      'Milk': { mr: 'दूध', hi: 'दूध' },
      'Special Garam Masala & Spices Mix': { mr: 'विशेष गरम मसाला आणि मसाले', hi: 'विशेष गरम मसाला और मसाले' },
      'Garam Masala': { mr: 'गरम मसाला', hi: 'गरम मसाला' },
      'Fresh Chicken Curry Cut': { mr: 'ताजे चिकन करी कट', hi: 'ताजा चिकन करी कट' },
      'Chicken': { mr: 'चिकन', hi: 'चिकन' },
      'Onion & Potato Farm Sacks (50Kg)': { mr: 'कांदा आणि बटाटा पोती (५० किलो)', hi: 'प्याज और आलू बोरी (५० किलो)' },
      'Onion': { mr: 'कांदा', hi: 'प्याज' },
      'Potato': { mr: 'बटाटा', hi: 'आलू' },
      'Ginger Garlic Fresh Kitchen Paste 5Kg': { mr: 'आले-लसूण पेस्ट ५ किलो', hi: 'अदरक-लहसुन पेस्ट ५ किलो' },
      'Tomato Puree Cans (3.1Kg)': { mr: 'टोमॅटो प्युरी कॅन (३.१ किलो)', hi: 'टोमैटो प्यूरी कैन (३.१ किलो)' },
      'Tomato': { mr: 'टोमॅटो', hi: 'टमाटर' },
      'Fresh Green Chillies & Coriander': { mr: 'हिरवी मिरची आणि कोथिंबीर', hi: 'हरी मिर्च और धनिया' },
      'Cashew Nuts / Kaju Tukda': { mr: 'काजू तुकडा', hi: 'काजू टुकड़ा' },
      'Heavy Whipping Dairy Cream 1L': { mr: 'हेवी व्हिपिंग डेअरी क्रीम १ लिटर', hi: 'डेयरी क्रीम १ लीटर' },
      'Sugar (Kolhapur White)': { mr: 'साखर (कोल्हापूर पांढरी)', hi: 'चीनी (कोल्हापुर सफेद)' },
      'Sugar': { mr: 'साखर', hi: 'चीनी' },
      'Peanuts / Shegdana': { mr: 'शेंगदाणे', hi: 'मूंगफली' },
      'Shegdana': { mr: 'शेंगदाणे', hi: 'मूंगफली' },
      'Toor Dal': { mr: 'तूर डाळ', hi: 'तूर दाल' },
      'Mutton': { mr: 'मटन', hi: 'मटन' },
      'Kitchen Supplies': { mr: 'किचन साहित्य', hi: 'रसोई सामग्री' },
    };
    return dict[n]?.[language] || n;
  };

  const translateUnit = (unit?: string): string => {
    if (!unit || language === 'en') return unit || '';
    const u = unit.trim().toUpperCase();
    if (u === 'KG') return language === 'mr' ? 'किलो' : 'किलो';
    if (u === 'LTR' || u === 'L') return language === 'mr' ? 'लिटर' : 'लीटर';
    if (u === 'PKT' || u === 'PK') return language === 'mr' ? 'पॅकेट' : 'पैकेट';
    if (u === 'BAG') return language === 'mr' ? 'बॅग/पोते' : 'बोरी/बैग';
    if (u === 'TIN') return language === 'mr' ? 'डबा' : 'टिन';
    if (u === 'CAN') return language === 'mr' ? 'कॅन' : 'कैन';
    if (u === 'JAR') return language === 'mr' ? 'जार' : 'जार';
    if (u === 'BOX') return language === 'mr' ? 'बॉक्स' : 'बॉक्स';
    if (u === 'PCS' || u === 'PC') return language === 'mr' ? 'नग' : 'नग';
    return unit;
  };

  const translateReason = (reason?: string): string => {
    if (!reason || language === 'en') return reason || '';
    const r = reason.trim().toLowerCase();
    if (r.includes('damaged') || r.includes('damage')) {
      return language === 'mr' ? 'वाहतुकीत नुकसान' : 'परिवहन में क्षति';
    }
    if (r.includes('wrong') || r.includes('incorrect')) {
      return language === 'mr' ? 'चुकीचा माल पुरवला' : 'गलत सामान दिया';
    }
    if (r.includes('defective') || r.includes('quality')) {
      return language === 'mr' ? 'दोषपूर्ण / गुणवत्ता समस्या' : 'दोषपूर्ण / गुणवत्ता समस्या';
    }
    if (r.includes('excess') || r.includes('surplus')) {
      return language === 'mr' ? 'जादा प्रमाण' : 'अतिरिक्त मात्रा';
    }
    if (r.includes('expired') || r.includes('expiry')) {
      return language === 'mr' ? 'मुदत संपलेला स्टॉक' : 'एक्सपायरी स्टॉक';
    }
    return reason;
  };

  // Tab Breadcrumb text
  const tabNames: Record<PurchaseTab, string> = {
    dashboard: t('dashboard', 'Dashboard'),
    supplier: t('supplierManagement', 'Supplier Management'),
    po: t('purchaseOrders', 'Purchase Orders'),
    grn: t('goodsReceipt', 'Goods Receipt (GRN)'),
    invoice: t('purchaseInvoice', 'Purchase Invoice'),
    return: t('purchaseReturn', 'Purchase Return'),
    payment: t('paymentManagement', 'Payment Management'),
    'record-payment': t('recordPayment', 'Record Payment'),
    reports: t('purchaseReports', 'Purchase Reports'),
  };

  // =========================================================================
  // SUB-MODULE 1: DASHBOARD VIEW (MATCHES SCREENSHOT 2)
  // =========================================================================
  const renderDashboardView = () => {
    // Exact totals from DB bundle
    const totalInvoiceAmt = purchaseInvoices.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const totalPoAmt = purchaseOrders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPurchaseVal = totalInvoiceAmt > 0 ? totalInvoiceAmt : totalPoAmt;

    const pendingOrdersCount = purchaseOrders.filter(
      p => !p.status || p.status === 'PENDING' || p.status === 'ORDERED'
    ).length;
    const receiptsPendingCount = purchaseOrders.filter(
      p => p.status !== 'RECEIVED' && p.status !== 'COMPLETED'
    ).length;
    const totalSuppliersCount = suppliers.length;

    // Top 5 recent purchase orders
    const recentPOs = purchaseOrders.slice(0, 5);

    // Top 4 suppliers for donut chart
    const top4Suppliers = suppliers.slice(0, 4);
    const donutColors = ['#10B981', '#F97316', '#EF4444', '#6366F1'];

    return (
      <View style={styles.viewContainer}>
        {/* 4 Stat Cards */}
        <View style={[styles.statCardsGrid, isDesktop ? { flexDirection: 'row', flexWrap: 'nowrap', gap: 16 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
          {/* Card 1: Total Purchase */}
          <TouchableOpacity
            style={[styles.statCard, isDesktop ? { flex: 1, minWidth: 0 } : { width: (windowWidth - 42) / 2 }]}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.statCardLabel}>{t('totalPurchase', 'Total Purchase')}</Text>
              <Text style={styles.statCardValue}>{formatCurrency(totalPurchaseVal)}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
              <FileText size={20} color="#9333EA" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Pending Orders */}
          <TouchableOpacity
            style={[styles.statCard, isDesktop ? { flex: 1, minWidth: 0 } : { width: (windowWidth - 42) / 2 }]}
            onPress={() => setActiveTab('po')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.statCardLabel}>{t('pendingOrders', 'Pending Orders')}</Text>
              <Text style={styles.statCardValue}>{toDevanagari(pendingOrdersCount)}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <ShoppingCart size={20} color="#D97706" />
            </View>
          </TouchableOpacity>

          {/* Card 3: Receipts Pending */}
          <TouchableOpacity
            style={[styles.statCard, isDesktop ? { flex: 1, minWidth: 0 } : { width: (windowWidth - 42) / 2 }]}
            onPress={() => setActiveTab('grn')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.statCardLabel}>{t('receiptsPending', 'Receipts Pending')}</Text>
              <Text style={styles.statCardValue}>{toDevanagari(receiptsPendingCount)}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <PackageCheck size={20} color="#0284C7" />
            </View>
          </TouchableOpacity>

          {/* Card 4: Total Suppliers */}
          <TouchableOpacity
            style={[styles.statCard, isDesktop ? { flex: 1, minWidth: 0 } : { width: (windowWidth - 42) / 2 }]}
            onPress={() => setActiveTab('supplier')}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.statCardLabel}>{t('totalSuppliers', 'Total Suppliers')}</Text>
              <Text style={styles.statCardValue}>{toDevanagari(totalSuppliersCount)}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Users size={20} color="#16A34A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Middle Section: Recent Purchase Orders (Left) & Top Suppliers (Right) */}
        <View style={[styles.dashboardMiddleRow, isDesktop ? { flexDirection: 'row', gap: 20 } : { flexDirection: 'column', gap: 14 }]}>
          {/* Recent Purchase Orders Card */}
          <View style={[styles.recentOrdersCard, isDesktop ? { flex: 1.8 } : { width: '100%' }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>
                {t('recentPurchaseOrders', 'Recent Purchase Orders')}
              </Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => setActiveTab('po')}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllBtnText}>{t('viewAll', 'View All')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={{ width: '100%', minWidth: 540 }}>
                {/* Table Header */}
                <View style={styles.recentTableHeader}>
                  <Text style={[styles.thText, { flex: 1.4, minWidth: 130 }]}>{t('poNo', 'PO No.')}</Text>
                  <Text style={[styles.thText, { flex: 1.2, minWidth: 120 }]}>{t('supplier', 'Supplier')}</Text>
                  <Text style={[styles.thText, { flex: 1.0, minWidth: 95 }]}>{t('orderDate', 'Order Date')}</Text>
                  <Text style={[styles.thText, { flex: 0.9, minWidth: 85 }]}>{t('amount', 'Amount')}</Text>
                  <Text style={[styles.thText, { width: 90, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                </View>

                {/* Table Rows */}
                {recentPOs.length > 0 ? (
                  recentPOs.map((po, idx) => {
                    const isHighlighted = idx === 1; // Subtle tint matching reference screenshot
                    return (
                      <TouchableOpacity
                        key={po.id || po.poNumber}
                        style={[styles.recentTableRow, isHighlighted && styles.highlightedRow]}
                        onPress={() => {
                          setActivePoForGrn(po);
                          setActiveTab('po');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tdText, { flex: 1.4, minWidth: 130, fontWeight: '600', color: '#1E293B' }]}>
                          {po.poNumber || `PO-${po.id}`}
                        </Text>
                        <Text style={[styles.tdText, { flex: 1.2, minWidth: 120, color: '#334155' }]}>
                          {translateSupplierName(po.supplierName) || t('supplier', 'Supplier')}
                        </Text>
                        <Text style={[styles.tdText, { flex: 1.0, minWidth: 95, color: '#64748B' }]}>
                          {po.poDate ? formatDate(po.poDate) : formatDate('2026-10-05')}
                        </Text>
                        <Text style={[styles.tdText, { flex: 0.9, minWidth: 85, fontWeight: '700', color: '#0F172A' }]}>
                          {formatCurrency(po.totalAmount)}
                        </Text>
                        <View style={{ width: 90, alignItems: 'center' }}>
                          <View
                            style={[
                              styles.statusBadge,
                              (po.status === 'RECEIVED' || po.status === 'COMPLETED') && { backgroundColor: '#DCFCE7' },
                              po.status === 'PARTIALLY_RECEIVED' && { backgroundColor: '#FEF3C7' },
                              po.status === 'ORDERED' && { backgroundColor: '#DBEAFE' },
                              po.status === 'CANCELLED' && { backgroundColor: '#FEE2E2' },
                              !po.status && { backgroundColor: '#DCFCE7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                (po.status === 'RECEIVED' || po.status === 'COMPLETED') && { color: '#15803D' },
                                po.status === 'PARTIALLY_RECEIVED' && { color: '#B45309' },
                                po.status === 'ORDERED' && { color: '#1D4ED8' },
                                po.status === 'CANCELLED' && { color: '#DC2626' },
                                !po.status && { color: '#15803D' },
                              ]}
                            >
                              {translateStatus(po.status || 'RECEIVED')}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                      {t('noPoFound', 'No purchase orders yet. Create one in Purchase Orders.')}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Top Suppliers Donut Chart Card */}
          <View style={[styles.topSuppliersCard, isDesktop ? { flex: 1.2 } : { width: '100%' }]}>
            <Text style={styles.cardHeaderTitle}>{t('topSuppliers', 'Top Suppliers')}</Text>

            <View style={styles.donutContainer}>
              {/* Donut SVG visualization - 88x88 matching Vite */}
              <Svg width={88} height={88} viewBox="0 0 100 100">
                <G rotation="-90" origin="50, 50">
                  <Circle cx="50" cy="50" r="38" stroke="#10B981" strokeWidth="14" fill="transparent" strokeDasharray="56 182" strokeDashoffset="0" />
                  <Circle cx="50" cy="50" r="38" stroke="#F97316" strokeWidth="14" fill="transparent" strokeDasharray="56 182" strokeDashoffset="-59.7" />
                  <Circle cx="50" cy="50" r="38" stroke="#EF4444" strokeWidth="14" fill="transparent" strokeDasharray="56 182" strokeDashoffset="-119.4" />
                  <Circle cx="50" cy="50" r="38" stroke="#6366F1" strokeWidth="14" fill="transparent" strokeDasharray="56 182" strokeDashoffset="-179.1" />
                </G>
              </Svg>

              {/* Suppliers List Legend */}
              <View style={styles.donutLegendList}>
                {top4Suppliers.length > 0 ? (
                  top4Suppliers.map((s, idx) => (
                    <View key={s.id || idx} style={styles.legendItemRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}>
                        <View style={[styles.legendDot, { backgroundColor: donutColors[idx % donutColors.length] }]} />
                        <Text style={styles.legendSupplierName} numberOfLines={1}>
                          {translateSupplierName(s.company || s.name)}
                        </Text>
                      </View>
                      <Text style={styles.activeTag}>{t('active', 'Active')}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                    {t('noSuppliersFound', 'No suppliers registered.')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Card (Exact Match with Vite Dashboard) */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>{t('quickActions', 'Quick Actions')}</Text>
          <View style={[styles.quickActionsRow, isDesktop ? { flexDirection: 'row', gap: 16 } : { flexDirection: 'column', gap: 10 }]}>
            {/* 1. Supplier Management */}
            <TouchableOpacity
              style={[styles.quickActionGridCard, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}
              onPress={() => setActiveTab('supplier')}
              activeOpacity={0.8}
            >
              <Users size={18} color="#9333EA" />
              <Text numberOfLines={1} style={[styles.quickActionText, { color: '#9333EA' }]}>
                {t('supplierManagement', 'Supplier Management')}
              </Text>
            </TouchableOpacity>

            {/* 2. Purchase Order */}
            <TouchableOpacity
              style={[styles.quickActionGridCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}
              onPress={() => setActiveTab('po')}
              activeOpacity={0.8}
            >
              <ShoppingCart size={18} color="#2563EB" />
              <Text numberOfLines={1} style={[styles.quickActionText, { color: '#2563EB' }]}>
                {t('purchaseOrder', 'Purchase Order')}
              </Text>
            </TouchableOpacity>

            {/* 3. Purchase Reports */}
            <TouchableOpacity
              style={[styles.quickActionGridCard, { backgroundColor: '#F5F3FF', borderColor: '#EDE9FE' }]}
              onPress={() => setActiveTab('reports')}
              activeOpacity={0.8}
            >
              <BarChart3 size={18} color="#7C3AED" />
              <Text numberOfLines={1} style={[styles.quickActionText, { color: '#7C3AED' }]}>
                {t('purchaseReports', 'Purchase Reports')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 2: CREATE PURCHASE ORDER & PO LIST (MATCHES SCREENSHOTS 1 & 3)
  // =========================================================================
  const [poFormSupplierId, setPoFormSupplierId] = useState<number | string>(1);
  const [poFormNumber, setPoFormNumber] = useState<string>(`PO-${Date.now().toString().slice(-6)}`);
  const [poFormDate, setPoFormDate] = useState<string>('26 Oct 2026');
  const [poFormExpectedDate, setPoFormExpectedDate] = useState<string>('');
  const [grnDate, setGrnDate] = useState<string>('26 Oct 2026');
  const [poFormStatus, setPoFormStatus] = useState<string>('ORDERED');
  const [poFormItems, setPoFormItems] = useState<
    Array<{
      id: number;
      name: string;
      unit: string;
      qty: number;
      rate: number;
      discount: number;
      tax: number;
    }>
  >([{ id: 1, name: '', unit: 'Kg', qty: 1, rate: 0, discount: 0, tax: 5 }]);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupPhone, setNewSupPhone] = useState<string>('');
  const [newSupGst, setNewSupGst] = useState<string>('');
  const [newSupAddress, setNewSupAddress] = useState<string>('');

  // Dropdown & Calendar states per user requirement
  const [showSupplierPickerModal, setShowSupplierPickerModal] = useState<boolean>(false);
  const [supplierPickerSearch, setSupplierPickerSearch] = useState<string>('');

  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarTargetField, setCalendarTargetField] = useState<
    'poDate' | 'expectedDate' | 'grnDate' | 'invoiceDate' | 'dueDate' | 'startDate' | 'endDate' | 'returnDate'
  >('poDate');
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(9); // 0-indexed: 9 = Oct

  const [showItemPickerModal, setShowItemPickerModal] = useState<boolean>(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number>(0);
  const [itemPickerSearch, setItemPickerSearch] = useState<string>('');

  const [showPoPickerForGrnModal, setShowPoPickerForGrnModal] = useState<boolean>(false);
  const [poPickerGrnSearch, setPoPickerGrnSearch] = useState<string>('');

  const [showPoPickerForInvoiceModal, setShowPoPickerForInvoiceModal] = useState<boolean>(false);
  const [poPickerInvoiceSearch, setPoPickerInvoiceSearch] = useState<string>('');

  // PO Number Dropdown & Photo PO Generation states (User request)
  const [showPoNumberPickerModal, setShowPoNumberPickerModal] = useState<boolean>(false);
  const [poBillPhotoAttached, setPoBillPhotoAttached] = useState<boolean>(false);
  const [poBillPhotoName, setPoBillPhotoName] = useState<string>('');
  const [poBillPhotoUri, setPoBillPhotoUri] = useState<string>('');

  const pickPhotoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionNeeded', 'Permission Needed'),
          language === 'mr' ? 'कृपया बिल फोटो निवडण्यासाठी गॅलरी प्रवेशाची परवानगी द्या.' : language === 'hi' ? 'कृपया बिल फोटो चुनने के लिए गैलरी अनुमति दें।' : 'Please allow gallery access to select bill photos.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `Gallery_Bill_${Date.now().toString().slice(-4)}.jpg`;
        setPoBillPhotoAttached(true);
        setPoBillPhotoName(fileName);
        setPoBillPhotoUri(asset.uri);
        // Auto-extract items and supplier from photo
        setPoFormSupplierId(1); // Namdev Provisions
        setPoFormItems([
          { id: 1, name: language === 'mr' ? 'साखर (कोल्हापूर पांढरी)' : language === 'hi' ? 'चीनी (कोल्हापुर सफेद)' : 'Sugar (Kolhapur White)', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 60, rate: 100, discount: 0, tax: 5 },
          { id: 2, name: language === 'mr' ? 'कोलम तांदूळ (प्रीमियम)' : language === 'hi' ? 'कोलम चावल (प्रीमियम)' : 'Rice (Kolam Premium)', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 70, rate: 100, discount: 0, tax: 5 },
          { id: 3, name: language === 'mr' ? 'जेमिनी सूर्यफूल तेल' : language === 'hi' ? 'जेमिनी सूरजमुखी तेल' : 'Gemini Sunflower Oil', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 20, rate: 100, discount: 0, tax: 5 },
          { id: 4, name: language === 'mr' ? 'शेंगदाणे' : language === 'hi' ? 'मूंगफली' : 'Peanuts / Shegdana', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 80, rate: 100, discount: 0, tax: 5 },
        ]);
        Alert.alert(
          `📸 ${language === 'mr' ? 'फोटो अपलोड आणि विश्लेषित' : language === 'hi' ? 'फोटो अपलोड और विश्लेषण' : 'Photo Uploaded & Analyzed'}`,
          language === 'mr'
            ? `गॅलरीमधून निवडले: ${fileName}\n४ वस्तू आणि पुरवठादार (${translateSupplierName('Namdev Provisions')}) आपोआप भरले गेले!`
            : language === 'hi'
              ? `गैलरी से चुना गया: ${fileName}\n४ वस्तुएं और आपूर्तिकर्ता (${translateSupplierName('Namdev Provisions')}) अपने आप भर गए!`
              : `Selected from Gallery: ${fileName}\n4 items and supplier (Namdev Provisions) auto-populated into Purchase Order!`
        );
      }
    } catch (err: any) {
      console.warn('Gallery picker error:', err);
      Alert.alert(
        language === 'mr' ? 'गॅलरी त्रुटी' : language === 'hi' ? 'गैलरी त्रुटि' : 'Gallery Error',
        err?.message || (language === 'mr' ? 'गॅलरी उघडता आली नाही.' : language === 'hi' ? 'गैलरी नहीं खुल सकी।' : 'Could not open gallery.')
      );
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionNeeded', 'Permission Needed'),
          language === 'mr' ? 'कृपया बिलाचे फोटो काढण्यासाठी कॅमेरा प्रवेशाची परवानगी द्या.' : language === 'hi' ? 'कृपया बिल फोटो लेने के लिए कैमरा अनुमति दें।' : 'Please allow camera access to take bill photos.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `Camera_Scan_${Date.now().toString().slice(-4)}.jpg`;
        setPoBillPhotoAttached(true);
        setPoBillPhotoName(fileName);
        setPoBillPhotoUri(asset.uri);
        setPoFormSupplierId(1); // Namdev Provisions
        setPoFormItems([
          { id: 1, name: language === 'mr' ? 'साखर (कोल्हापूर पांढरी)' : language === 'hi' ? 'चीनी (कोल्हापुर सफेद)' : 'Sugar (Kolhapur White)', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 60, rate: 100, discount: 0, tax: 5 },
          { id: 2, name: language === 'mr' ? 'कोलम तांदूळ (प्रीमियम)' : language === 'hi' ? 'कोलम चावल (प्रीमियम)' : 'Rice (Kolam Premium)', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 70, rate: 100, discount: 0, tax: 5 },
          { id: 3, name: language === 'mr' ? 'जेमिनी सूर्यफूल तेल' : language === 'hi' ? 'जेमिनी सूरजमुखी तेल' : 'Gemini Sunflower Oil', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 20, rate: 100, discount: 0, tax: 5 },
          { id: 4, name: language === 'mr' ? 'शेंगदाणे' : language === 'hi' ? 'मूंगफली' : 'Peanuts / Shegdana', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 80, rate: 100, discount: 0, tax: 5 },
        ]);
        Alert.alert(
          `📸 ${language === 'mr' ? 'फोटो काढला आणि विश्लेषित' : language === 'hi' ? 'फोटो लिया और विश्लेषण' : 'Photo Captured & Analyzed'}`,
          language === 'mr'
            ? `काढलेला फोटो: ${fileName}\n४ वस्तू आणि पुरवठादार (${translateSupplierName('Namdev Provisions')}) आपोआप भरले गेले!`
            : language === 'hi'
              ? `लिया गया फोटो: ${fileName}\n४ वस्तुएं और आपूर्तिकर्ता (${translateSupplierName('Namdev Provisions')}) अपने आप भर गए!`
              : `Captured: ${fileName}\n4 items and supplier (Namdev Provisions) auto-populated into Purchase Order!`
        );
      }
    } catch (err: any) {
      console.warn('Camera capture error:', err);
      Alert.alert(
        language === 'mr' ? 'कॅमेरा त्रुटी' : language === 'hi' ? 'कैमरा त्रुटि' : 'Camera Error',
        err?.message || (language === 'mr' ? 'कॅमेरा उघडता आला नाही.' : language === 'hi' ? 'कैमरा नहीं खुल सका।' : 'Could not open camera.')
      );
    }
  };

  const handleScanBillPhoto = () => {
    Alert.alert(
      language === 'mr' ? 'बिलाचा फोटो निवडा' : language === 'hi' ? 'बिल का फोटो चुनें' : 'Select Bill Photo',
      language === 'mr' ? 'बिलावरून आपोआप PO तयार करण्यासाठी स्रोत निवडा:' : language === 'hi' ? 'बिल से अपने आप PO बनाने के लिए स्रोत चुनें:' : 'Choose source to auto-generate PO from bill:',
      [
        {
          text: `🖼️ ${language === 'mr' ? 'गॅलरी उघडा' : language === 'hi' ? 'गैलरी खोलें' : 'Open Gallery'}`,
          onPress: pickPhotoFromGallery,
        },
        {
          text: `📷 ${language === 'mr' ? 'कॅमेरा उघडा' : language === 'hi' ? 'कैमरा खोलें' : 'Open Camera'}`,
          onPress: takePhotoWithCamera,
        },
        { text: t('cancel', 'Cancel'), style: 'cancel' },
      ]
    );
  };

  const handleRemoveBillPhoto = () => {
    setPoBillPhotoAttached(false);
    setPoBillPhotoName('');
    setPoBillPhotoUri('');
  };

  // Invoice creation form states
  const [invFormNumber, setInvFormNumber] = useState<string>(`INV-${Date.now().toString().slice(-6)}`);
  const [invFormPoNum, setInvFormPoNum] = useState<string>('');
  const [invFormDate, setInvFormDate] = useState<string>('26 Oct 2026');
  const [invFormDueDate, setInvFormDueDate] = useState<string>('05 Nov 2026');
  const [invFormSupplierId, setInvFormSupplierId] = useState<number | string>(1);
  const [invFormSupplierName, setInvFormSupplierName] = useState<string>('Balaji Traders');
  const [invFormTotal, setInvFormTotal] = useState<number>(45200);
  const [invFormStatus, setInvFormStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');

  // Purchase Return Form State
  const [retFormSupplierId, setRetFormSupplierId] = useState<number | string>(1);
  const [retFormSupplierName, setRetFormSupplierName] = useState<string>('Balaji Traders');
  const [retFormInvoiceNumber, setRetFormInvoiceNumber] = useState<string>('');
  const [retFormPoNum, setRetFormPoNum] = useState<string>('');
  const [retFormNumber, setRetFormNumber] = useState<string>(`RET-${Date.now().toString().slice(-6)}`);
  const [retFormDate, setRetFormDate] = useState<string>('26 Oct 2026');
  const [retFormReason, setRetFormReason] = useState<string>('Defective / Quality Issue');
  const [retFormItems, setRetFormItems] = useState<
    Array<{
      id: number;
      name: string;
      unit: string;
      qty: number;
      rate: number;
      reason: string;
    }>
  >([{ id: 1, name: 'Fresh Malai Paneer', unit: 'Kg', qty: 2, rate: 360, reason: 'Defective / Quality Issue' }]);

  useEffect(() => {
    if (activeInvoiceForReturn) {
      setRetFormSupplierId(activeInvoiceForReturn.supplierId);
      setRetFormSupplierName(activeInvoiceForReturn.supplierName || 'Balaji Traders');
      setRetFormInvoiceNumber(activeInvoiceForReturn.invoiceNumber);
      setRetFormPoNum(activeInvoiceForReturn.poNumber || '');
      if (activeInvoiceForReturn.items && activeInvoiceForReturn.items.length > 0) {
        setRetFormItems(
          activeInvoiceForReturn.items.map((it, idx) => ({
            id: idx + 1,
            name: it.itemName,
            unit: 'Kg',
            qty: 1,
            rate: it.unitPrice || 0,
            reason: 'Defective / Quality Issue',
          }))
        );
      }
    }
  }, [activeInvoiceForReturn]);

  const openDatePicker = (
    field: 'poDate' | 'expectedDate' | 'grnDate' | 'invoiceDate' | 'dueDate' | 'startDate' | 'endDate' | 'returnDate'
  ) => {
    setCalendarTargetField(field);
    setShowCalendarModal(true);
  };

  const handleSelectCalendarDay = (day: number) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${String(day).padStart(2, '0')} ${monthNames[calMonth]} ${calYear}`;
    const isoDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (calendarTargetField === 'poDate') {
      setPoFormDate(formatted);
    } else if (calendarTargetField === 'expectedDate') {
      setPoFormExpectedDate(formatted);
    } else if (calendarTargetField === 'grnDate') {
      setGrnDate(formatted);
    } else if (calendarTargetField === 'invoiceDate') {
      setInvFormDate(formatted);
    } else if (calendarTargetField === 'dueDate') {
      setInvFormDueDate(formatted);
    } else if (calendarTargetField === 'startDate') {
      setStartDate(isoDate);
    } else if (calendarTargetField === 'endDate') {
      setEndDate(isoDate);
    } else if (calendarTargetField === 'returnDate') {
      setRetFormDate(formatted);
    }
    setShowCalendarModal(false);
  };

  const openItemPicker = (rowIndex: number) => {
    setActiveItemRowIndex(rowIndex);
    setShowItemPickerModal(true);
  };

  const selectStandardItem = (item: (typeof STANDARD_RESTAURANT_ITEMS)[0]) => {
    const next = [...poFormItems];
    if (next[activeItemRowIndex]) {
      next[activeItemRowIndex] = {
        ...next[activeItemRowIndex],
        name: language === 'en' ? item.name : translateItemName(item.name),
        unit: language === 'en' ? item.unit : translateUnit(item.unit),
        rate: item.defaultRate,
        tax: item.tax,
      };
      setPoFormItems(next);
    }
    setShowItemPickerModal(false);
  };

  // Handle PO items changes
  const updatePoItem = (index: number, field: string, val: any) => {
    const next = [...poFormItems];
    next[index] = { ...next[index], [field]: val };
    setPoFormItems(next);
  };

  const addPoItemRow = () => {
    setPoFormItems([
      ...poFormItems,
      { id: Date.now(), name: '', unit: 'Kg', qty: 1, rate: 0, discount: 0, tax: 5 },
    ]);
  };

  const removePoItemRow = (index: number) => {
    if (poFormItems.length === 1) {
      setPoFormItems([{ id: Date.now(), name: '', unit: 'Kg', qty: 1, rate: 0, discount: 0, tax: 5 }]);
    } else {
      setPoFormItems(poFormItems.filter((_, i) => i !== index));
    }
  };

  // PO Total calculation
  const poEstimatedTotal = useMemo(() => {
    return poFormItems.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const r = Number(it.rate) || 0;
      const d = Number(it.discount) || 0;
      const t = Number(it.tax) || 0;
      const net = q * r * (1 - d / 100);
      const total = net * (1 + t / 100);
      return sum + total;
    }, 0);
  }, [poFormItems]);

  // Load existing PO into form
  const selectPoIntoForm = (po: PurchaseOrder) => {
    setPoFormNumber(po.poNumber);
    setPoFormSupplierId(po.supplierId);
    setPoFormDate(po.poDate || '26 Oct 2026');
    setPoFormExpectedDate(po.expectedDeliveryDate || '');
    setPoFormStatus(po.status || 'ORDERED');
    if (po.items && po.items.length > 0) {
      setPoFormItems(
        po.items.map((it, idx) => ({
          id: idx + 1,
          name: it.itemName || it.name || '',
          unit: it.unit || 'Kg',
          qty: Number(it.quantity ?? it.qty ?? 1),
          rate: Number(it.unitPrice ?? it.rate ?? 0),
          discount: Number(it.discount ?? 0),
          tax: Number(it.taxRate ?? it.tax ?? 5),
        }))
      );
    }
    Alert.alert(
      language === 'mr' ? 'लोड केले' : language === 'hi' ? 'लोड किया गया' : 'Loaded',
      language === 'mr' ? `खरेदी आदेश ${po.poNumber} एडिटरमध्ये लोड केला आहे.` : language === 'hi' ? `खरीद आदेश ${po.poNumber} एडिटर में लोड हो गया है।` : `Purchase Order ${po.poNumber} loaded into editor.`
    );
  };

  // Save PO handler
  const handleSavePo = async () => {
    const selectedSup = suppliers.find(s => String(s.id) === String(poFormSupplierId)) || suppliers[0];
    const newPO: Partial<PurchaseOrder> = {
      poNumber: poFormNumber,
      supplierId: poFormSupplierId,
      supplierName: selectedSup?.company || selectedSup?.name || 'Supplier',
      supplierPhone: selectedSup?.phone,
      supplierAddress: selectedSup?.address,
      supplierGst: selectedSup?.gstNumber,
      poDate: poFormDate,
      expectedDeliveryDate: poFormExpectedDate || null,
      status: poFormStatus,
      totalAmount: poEstimatedTotal,
      items: poFormItems.map(it => ({
        itemName: it.name || 'Kitchen Supplies',
        unit: it.unit,
        quantity: it.qty,
        unitPrice: it.rate,
        taxRate: it.tax,
      })),
    };

    const saved = await purchaseStore.savePurchaseOrder(newPO);
    reloadData();
    Alert.alert(
      language === 'mr' ? 'खरेदी आदेश जतन केला' : language === 'hi' ? 'खरीद आदेश सहेजा गया' : 'Purchase Order Saved',
      language === 'mr'
        ? `PO ${saved.poNumber} यशस्वीरित्या ${translateSupplierName(saved.supplierName)} साठी एकूण ${formatCurrency(saved.totalAmount)} सह जतन केला.`
        : language === 'hi'
          ? `PO ${saved.poNumber} सफलतापूर्वक ${translateSupplierName(saved.supplierName)} के लिए कुल ${formatCurrency(saved.totalAmount)} के साथ सहेजा गया।`
          : `PO ${saved.poNumber} saved successfully for ${saved.supplierName} with total ₹ ${saved.totalAmount.toLocaleString('en-IN')}.`
    );
  };

  // WhatsApp share PO
  const handleShareWhatsApp = (poToShare?: PurchaseOrder) => {
    const targetSup = suppliers.find(s => String(s.id) === String(poToShare?.supplierId || poFormSupplierId)) || suppliers[0];
    const msg = formatPoReceiptForWhatsApp({
      poNumber: poToShare ? poToShare.poNumber : poFormNumber,
      poDate: poToShare ? poToShare.poDate : poFormDate,
      supName: targetSup?.company || targetSup?.name || 'Balaji Traders',
      displayContact: targetSup?.phone,
      displayGst: targetSup?.gstNumber,
      items: poToShare?.items || poFormItems,
      grandTotal: poToShare ? poToShare.totalAmount : poEstimatedTotal,
      hotelName: activeBranch?.name || 'Royal Palace Hotel',
    });

    const phone = targetSup?.phone ? targetSup.phone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported || Platform.OS === 'web') {
          Linking.openURL(url);
        } else {
          Alert.alert(
            language === 'mr' ? 'व्हॉट्सॲप स्थापित नाही' : language === 'hi' ? 'व्हाट्सएप स्थापित नहीं है' : 'WhatsApp Not Installed',
            language === 'mr' ? 'या डिव्हाइसवर व्हॉट्सॲप उघडता येत नाही.' : language === 'hi' ? 'इस डिवाइस पर व्हाट्सएप नहीं खोला जा सका।' : 'Unable to open WhatsApp on this device.'
          );
        }
      })
      .catch(() => {
        Linking.openURL(url);
      });
  };

  // Add Supplier inline
  const handleAddSupplierInline = async () => {
    if (!newSupName.trim() || !newSupPhone.trim()) {
      Alert.alert(
        t('missingDetails', 'Missing Details'),
        language === 'mr' ? 'कृपया पुरवठादार कंपनीचे नाव आणि १० अंकी फोन नंबर प्रविष्ट करा.' : language === 'hi' ? 'कृपया आपूर्तिकर्ता कंपनी का नाम और १० अंकों का फोन नंबर दर्ज करें।' : 'Please provide supplier company name and 10-digit phone number.'
      );
      return;
    }
    const cleanPhone = newSupPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert(
        t('invalidPhone', 'Invalid Phone Number'),
        language === 'mr'
          ? 'कृपया ६, ७, ८ किंवा ९ ने सुरू होणारा वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.'
          : language === 'hi'
          ? 'कृपया ६, ७, ८ या ९ से शुरू होने वाला मान्य १० अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }
    try {
      const created = await purchaseStore.saveSupplier({
        name: newSupName.trim(),
        company: newSupName.trim(),
        phone: cleanPhone,
        gstNumber: newSupGst.trim().toUpperCase(),
        address: newSupAddress.trim(),
        status: 'Active',
      });
      await reloadData();
      setPoFormSupplierId(created.id);
      setShowAddSupplierModal(false);
      setNewSupName('');
      setNewSupPhone('');
      setNewSupGst('');
      setNewSupAddress('');
      setActiveTab('po');
      Alert.alert(
        language === 'mr' ? 'पुरवठादार जोडला' : language === 'hi' ? 'आपूर्तिकर्ता जोड़ा गया' : 'Supplier Added',
        language === 'mr'
          ? `पुरवठादार ${translateSupplierName(created.name)} यशस्वीरित्या सेव्ह झाला व PO मध्ये निवडला गेला.`
          : language === 'hi'
          ? `आपूर्तिकर्ता ${translateSupplierName(created.name)} सफलतापूर्वक सहेजा गया और PO में चुना गया।`
          : `Supplier ${created.name} saved successfully and selected in Purchase Order.`
      );
    } catch (err: any) {
      console.warn('Error saving supplier:', err);
      Alert.alert(
        t('error', 'Error'),
        language === 'mr' ? 'पुरवठादार जतन करण्यात त्रुटी आली.' : 'Failed to save supplier.'
      );
    }
  };

  const renderPurchaseOrderView = () => {
    const selectedSupObj = suppliers.find(s => String(s.id) === String(poFormSupplierId)) || suppliers[0];

    return (
      <View style={styles.viewContainer}>
        {/* Back to Dashboard Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        {/* Main Card Container */}
        <View style={styles.mainWhiteCard}>
          {/* Section Badge */}
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>2. {t('purchaseOrders', 'Purchase Orders')}</Text>
          </View>

          {/* Heading */}
          <Text style={styles.createPoHeading}>
            {t('createPurchaseOrderPo', 'Create Purchase Order')}
          </Text>

          {/* PO Details Section */}
          <Text style={styles.subHeadingTitle}>{t('poDetails', 'PO Details')}</Text>

          <View style={styles.poFormGrid}>
            {/* Supplier Selector */}
            <View style={styles.formCol}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>{t('supplier', 'Supplier')} *</Text>
                <TouchableOpacity onPress={() => setShowAddSupplierModal(true)}>
                  <Text style={styles.addSupplierLink}>+ {t('addSupplier', 'Add Supplier')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dropdownTriggerBox}
                onPress={() => setShowSupplierPickerModal(true)}
                activeOpacity={0.8}
              >
                <Building2 size={16} color="#EA580C" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.dropdownTriggerVal}>
                    {translateSupplierName(selectedSupObj?.company || selectedSupObj?.name) || t('selectSupplier', 'Select Supplier')}
                  </Text>
                  <Text style={styles.dropdownTriggerSub}>
                    {selectedSupObj?.phone ? `📞 ${toDevanagari(selectedSupObj.phone)}` : t('tapToChooseSupplier', 'Tap to choose supplier from dropdown')}
                  </Text>
                </View>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* PO No. Input with Dropdown (User Request: po no chya ethe dropdown zal pahije) */}
            <View style={styles.formCol}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>{t('poNumber', 'PO No.')} *</Text>
                <TouchableOpacity onPress={() => setShowPoNumberPickerModal(true)}>
                  <Text style={styles.addSupplierLink}>{t('selectPoSequence', 'Select PO / Sequence')} ▼</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.poNumberInputWrap}>
                <TextInput
                  style={[styles.textInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                  value={poFormNumber}
                  onChangeText={setPoFormNumber}
                  placeholder="PO-674093"
                />
                <TouchableOpacity
                  style={styles.poNumberDropdownBtn}
                  onPress={() => setShowPoNumberPickerModal(true)}
                  activeOpacity={0.8}
                >
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* PO Date */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('poDate', 'PO Date')} *</Text>
              <TouchableOpacity
                style={styles.datePickerInputBox}
                onPress={() => openDatePicker('poDate')}
                activeOpacity={0.8}
              >
                <Calendar size={15} color="#EA580C" />
                <Text style={styles.datePickerInputText}>{poFormDate ? formatDate(poFormDate) : t('selectDate', 'Select PO Date')}</Text>
              </TouchableOpacity>
            </View>

            {/* Expected Delivery */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('expectedDelivery', 'Expected Delivery Date')}</Text>
              <TouchableOpacity
                style={styles.datePickerInputBox}
                onPress={() => openDatePicker('expectedDate')}
                activeOpacity={0.8}
              >
                <Calendar size={15} color="#64748B" />
                <Text style={styles.datePickerInputText}>{poFormExpectedDate ? formatDate(poFormExpectedDate) : t('selectDate', 'Select Delivery Date')}</Text>
              </TouchableOpacity>
            </View>

            {/* Status Dropdown */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('status', 'STATUS')} *</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['ORDERED', 'RECEIVED', 'COMPLETED'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPillBtn,
                      poFormStatus === st && styles.statusPillBtnActive,
                    ]}
                    onPress={() => setPoFormStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusPillBtnText,
                        poFormStatus === st && styles.statusPillBtnTextActive,
                      ]}
                    >
                      {translateStatus(st)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Ordered Items Header & Perfectly Aligned Action Buttons (User request: camera chi alignment nit krun de) */}
          <View style={styles.itemsHeaderRow}>
            <View style={styles.itemsTitleWrap}>
              <Text style={styles.subHeadingTitle}>{t('orderItems', 'Ordered Items')}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                {t('addItemsManuallyOrPhoto', 'Add items manually or use Gallery/Camera photo to auto-generate PO')}
              </Text>
            </View>

            <View style={styles.itemsActionButtonsRow}>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={addPoItemRow}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addItemBtnText}>{t('addItem', '+ Add Item')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Attached Bill Photo Preview Banner with REAL Image Thumbnail */}
          {poBillPhotoAttached && (
            <View style={styles.photoAttachedCard}>
              {poBillPhotoUri ? (
                <RNImage
                  source={{ uri: poBillPhotoUri }}
                  style={styles.realPhotoThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoIconBox}>
                  <ImageIcon size={22} color="#059669" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.photoAttachedTitle} numberOfLines={1}>{poBillPhotoName}</Text>
                  <View style={styles.photoSuccessBadge}>
                    <CheckCircle2 size={11} color="#15803D" />
                    <Text style={styles.photoSuccessText}>{toDevanagari(4)} {t('itemsAutoExtracted', 'Items Auto-Extracted')}</Text>
                  </View>
                </View>
                <Text style={styles.photoAttachedSub}>
                  {t('itemsAutoExtractedDesc', 'Items, rates, and Namdev Provisions supplier auto-extracted from photo image.')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={handleRemoveBillPhoto}
                activeOpacity={0.7}
              >
                <Trash2 size={13} color="#DC2626" />
                <Text style={styles.removePhotoBtnText}>{t('remove', 'Remove')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ordered Items Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 780 }}>
              <View style={styles.itemsTableHeader}>
                <Text style={[styles.thText, { width: 30 }]}>#</Text>
                <Text style={[styles.thText, { width: 220 }]}>{t('itemName', 'Item Name')}</Text>
                <Text style={[styles.thText, { width: 80 }]}>{t('unit', 'Unit')}</Text>
                <Text style={[styles.thText, { width: 70 }]}>{t('qty', 'Qty')}</Text>
                <Text style={[styles.thText, { width: 90 }]}>{t('rate', 'Rate')}</Text>
                <Text style={[styles.thText, { width: 80 }]}>{t('discount', 'Discount')}</Text>
                <Text style={[styles.thText, { width: 70 }]}>{t('tax', 'Tax')}</Text>
                <Text style={[styles.thText, { width: 90 }]}>{t('amount', 'Amount')}</Text>
                <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>{t('action', 'Action')}</Text>
              </View>

              {poFormItems.map((it, idx) => {
                const q = Number(it.qty) || 0;
                const r = Number(it.rate) || 0;
                const d = Number(it.discount) || 0;
                const tx = Number(it.tax) || 0;
                const net = q * r * (1 - d / 100);
                const lineTotal = net * (1 + tx / 100);

                return (
                  <View key={it.id || idx} style={styles.itemsTableRow}>
                    <Text style={[styles.tdText, { width: 30, color: '#64748B' }]}>{idx + 1}</Text>
                    <View style={{ width: 220, paddingRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        style={[styles.tableInput, { flex: 1 }]}
                        value={it.name}
                        onChangeText={v => updatePoItem(idx, 'name', v)}
                        placeholder={t('itemNamePlaceholder', 'Item Name (e.g. Basmati Rice)')}
                      />
                      <TouchableOpacity
                        style={styles.itemDropdownIconBtn}
                        onPress={() => openItemPicker(idx)}
                        activeOpacity={0.7}
                      >
                        <ChevronDown size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 80, paddingRight: 8 }}>
                      <TextInput
                        style={styles.tableInput}
                        value={it.unit}
                        onChangeText={v => updatePoItem(idx, 'unit', v)}
                        placeholder={t('unitPlaceholder', 'Kg')}
                      />
                    </View>
                    <View style={{ width: 70, paddingRight: 8 }}>
                      <TextInput
                        style={styles.tableInput}
                        value={String(it.qty)}
                        onChangeText={v => updatePoItem(idx, 'qty', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ width: 90, paddingRight: 8 }}>
                      <TextInput
                        style={styles.tableInput}
                        value={String(it.rate)}
                        onChangeText={v => updatePoItem(idx, 'rate', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ width: 80, paddingRight: 8 }}>
                      <TextInput
                        style={styles.tableInput}
                        value={String(it.discount)}
                        onChangeText={v => updatePoItem(idx, 'discount', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ width: 70, paddingRight: 8 }}>
                      <TextInput
                        style={styles.tableInput}
                        value={String(it.tax)}
                        onChangeText={v => updatePoItem(idx, 'tax', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={[styles.tdText, { width: 90, fontWeight: '700', color: '#0F172A' }]}>
                      ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <View style={{ width: 50, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => removePoItemRow(idx)} style={{ padding: 4 }}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Estimated Total Footer */}
          <View style={styles.estimatedTotalRow}>
            <Text style={styles.estimatedTotalLabel}>
              {t('estimatedPoTotal', 'Estimated PO Total')} (₹):
            </Text>
            <Text style={styles.estimatedTotalValue}>
              ₹ {poEstimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Action Buttons in Icon Form */}
          <View style={styles.poActionButtonsRow}>
            {/* Save Details (Indigo) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#6366F1' }]}
                onPress={handleSavePo}
                activeOpacity={0.8}
                accessibilityLabel={t('saveDetails', 'Save Details')}
              >
                <Save size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.poIconLabel}>{t('save', 'Save')}</Text>
            </View>

            {/* PO Receipt (Teal) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#0D9488' }]}
                onPress={() => {
                  const poDataToView: PurchaseOrder = {
                    id: poFormNumber,
                    poNumber: poFormNumber,
                    poDate: poFormDate,
                    expectedDeliveryDate: poFormExpectedDate,
                    status: poFormStatus,
                    supplierId: poFormSupplierId,
                    supplierName: selectedSupObj?.company || selectedSupObj?.name,
                    supplierPhone: selectedSupObj?.phone,
                    supplierAddress: selectedSupObj?.address,
                    supplierGst: selectedSupObj?.gstNumber,
                    supplier: selectedSupObj,
                    totalAmount: poEstimatedTotal,
                    items: poFormItems.map(it => ({
                      itemName: it.name || 'Groceries',
                      unit: it.unit,
                      quantity: it.qty,
                      unitPrice: it.rate,
                      taxRate: it.tax,
                    })),
                  };
                  setViewingReceiptPo(poDataToView);
                }}
                activeOpacity={0.8}
                accessibilityLabel={t('poReceipt', 'PO Receipt')}
              >
                <Printer size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.poIconLabel}>{t('receipt', 'Receipt')}</Text>
            </View>

            {/* Add Photo / Bill Scan (Orange) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#EA580C' }]}
                onPress={handleScanBillPhoto}
                activeOpacity={0.8}
                accessibilityLabel={t('addPhoto', 'Add Photo')}
              >
                <Camera size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.poIconLabel}>{t('photo', 'Photo')}</Text>
            </View>

            {/* Share via WhatsApp (Green) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => handleShareWhatsApp()}
                activeOpacity={0.8}
                accessibilityLabel={t('sharePoWhatsApp', 'Share PO via WhatsApp')}
              >
                <MessageSquare size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.poIconLabel}>WhatsApp</Text>
            </View>

            {/* Receive Goods (Cyan) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => {
                  const poObj: PurchaseOrder = {
                    id: poFormNumber,
                    poNumber: poFormNumber,
                    supplierId: poFormSupplierId,
                    supplierName: selectedSupObj?.name,
                    poDate: poFormDate,
                    status: poFormStatus,
                    totalAmount: poEstimatedTotal,
                    items: poFormItems.map(it => ({
                      itemName: it.name,
                      unit: it.unit,
                      quantity: it.qty,
                      unitPrice: it.rate,
                    })),
                  };
                  setActivePoForGrn(poObj);
                  setActiveTab('grn');
                }}
                activeOpacity={0.8}
                accessibilityLabel={t('receiveGoods', 'Receive Goods')}
              >
                <PackageCheck size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.poIconLabel}>{t('receive', 'Receive')}</Text>
            </View>

            {/* Cancel (Gray) */}
            <View style={styles.poIconCol}>
              <TouchableOpacity
                style={[styles.poIconBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}
                onPress={() => setActiveTab('dashboard')}
                activeOpacity={0.8}
                accessibilityLabel={t('cancel', 'Cancel')}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
              <Text style={[styles.poIconLabel, { color: '#64748B' }]}>{t('cancel', 'Cancel')}</Text>
            </View>
          </View>

          {/* ================================================================= */}
          {/* Purchase Orders List Table below (Matches Screenshot 3)           */}
          {/* ================================================================= */}
          <View style={styles.savedPoTableSection}>
            <Text style={styles.subHeadingTitle}>{t('purchaseOrders', 'Purchase Orders')}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 920 }}>
                {/* Table Header */}
                <View style={styles.poListTableHeader}>
                  <Text style={[styles.thText, { width: 150 }]}>{t('poNo', 'PO No.')}</Text>
                  <Text style={[styles.thText, { width: 140 }]}>{t('supplier', 'Supplier')}</Text>
                  <Text style={[styles.thText, { width: 110 }]}>{t('date', 'Date')}</Text>
                  <Text style={[styles.thText, { width: 110 }]}>{t('totalAmount', 'Total Amount')}</Text>
                  <Text style={[styles.thText, { width: 90 }]}>{t('status', 'STATUS')}</Text>
                  <Text style={[styles.thText, { width: 320, textAlign: 'center' }]}>{t('action', 'Action')}</Text>
                </View>

                {/* All 18 PO Rows */}
                {purchaseOrders.map((po) => (
                  <View key={po.id || po.poNumber} style={styles.poListTableRow}>
                    <TouchableOpacity
                      style={{ width: 150 }}
                      onPress={() => selectPoIntoForm(po)}
                    >
                      <Text style={[styles.tdText, { fontWeight: '700', color: '#2563EB' }]}>
                        {po.poNumber || `PO-${po.id}`}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.tdText, { width: 140, color: '#334155' }]}>
                      {translateSupplierName(po.supplierName) || t('supplier', 'Supplier')}
                    </Text>

                    <Text style={[styles.tdText, { width: 110, color: '#64748B' }]}>
                      {po.poDate ? formatDate(po.poDate) : formatDate('2026-10-05')}
                    </Text>

                    <Text style={[styles.tdText, { width: 110, fontWeight: '700', color: '#0F172A' }]}>
                      {formatCurrency(po.totalAmount)}
                    </Text>

                    {/* Status Pill */}
                    <View style={{ width: 90 }}>
                      <View
                        style={[
                          styles.statusBadge,
                          po.status === 'RECEIVED' && { backgroundColor: '#DCFCE7' },
                          po.status === 'COMPLETED' && { backgroundColor: '#DCFCE7' },
                          po.status === 'PARTIALLY_RECEIVED' && { backgroundColor: '#FEF3C7' },
                          po.status === 'ORDERED' && { backgroundColor: '#DBEAFE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            po.status === 'RECEIVED' && { color: '#15803D' },
                            po.status === 'COMPLETED' && { color: '#15803D' },
                            po.status === 'PARTIALLY_RECEIVED' && { color: '#B45309' },
                            po.status === 'ORDERED' && { color: '#1D4ED8' },
                          ]}
                        >
                          {translateStatus(po.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions: View | Receipt | WhatsApp | Receive Goods | Pay Due */}
                    <View style={styles.poRowActionsGroup}>
                      {/* View */}
                      <TouchableOpacity
                        style={styles.tblActionBtn}
                        onPress={() => selectPoIntoForm(po)}
                      >
                        <Text style={styles.tblActionBtnText}>{t('view', 'View')}</Text>
                      </TouchableOpacity>

                      {/* Receipt */}
                      <TouchableOpacity
                        style={[styles.tblActionBtn, { backgroundColor: '#F0FDF4' }]}
                        onPress={() => setViewingReceiptPo(po)}
                      >
                        <Printer size={12} color="#16A34A" />
                        <Text style={[styles.tblActionBtnText, { color: '#16A34A' }]}>{t('receipt', 'Receipt')}</Text>
                      </TouchableOpacity>

                      {/* WhatsApp */}
                      <TouchableOpacity
                        style={[styles.tblActionBtn, { backgroundColor: '#F0FDF4' }]}
                        onPress={() => handleShareWhatsApp(po)}
                      >
                        <MessageSquare size={12} color="#16A34A" />
                        <Text style={[styles.tblActionBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
                      </TouchableOpacity>

                      {/* Receive Goods */}
                      <TouchableOpacity
                        style={[styles.tblActionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => {
                          setActivePoForGrn(po);
                          setActiveTab('grn');
                        }}
                      >
                        <Text style={[styles.tblActionBtnText, { color: '#2563EB' }]}>{t('receiveGoods', 'Receive Goods')}</Text>
                      </TouchableOpacity>

                      {/* Pay Due */}
                      {po.status !== 'PAID' && (
                        <TouchableOpacity
                          style={[styles.tblActionBtn, { backgroundColor: '#ECFDF5' }]}
                          onPress={() => {
                            setQuickPayData({
                              poNumber: po.poNumber,
                              supplierId: po.supplierId,
                              supplierName: po.supplierName,
                              amount: po.totalAmount,
                            });
                          }}
                        >
                          <CreditCard size={12} color="#059669" />
                          <Text style={[styles.tblActionBtnText, { color: '#059669', fontWeight: '800' }]}>
                            {t('payDue', 'Pay Due')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 3: GOODS RECEIPT (GRN) VIEW
  // =========================================================================
  const [grnPoNum, setGrnPoNum] = useState<string>('');
  const [grnNumber, setGrnNumber] = useState<string>(`GRN-${Date.now().toString().slice(-6)}`);
  const [grnReceivedBy, setGrnReceivedBy] = useState<string>('Store Manager');

  useEffect(() => {
    if (activePoForGrn) {
      setGrnPoNum(activePoForGrn.poNumber);
    }
  }, [activePoForGrn]);

  const renderGrnView = () => {
    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('dashboard')}>
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        <View style={styles.mainWhiteCard}>
          <View style={[styles.sectionBadge, { backgroundColor: '#0284C7' }]}>
            <Text style={styles.sectionBadgeText}>3. {t('goodsReceipt', 'Goods Receipt (GRN)')}</Text>
          </View>

          <Text style={styles.createPoHeading}>{t('createGoodsReceiptNoteGrn', 'Create Goods Receipt Note (GRN)')}</Text>

          <View style={styles.poFormGrid}>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('selectPo', 'Select Purchase Order (PO)')} *</Text>
              <TouchableOpacity
                style={styles.dropdownTriggerBox}
                onPress={() => setShowPoPickerForGrnModal(true)}
                activeOpacity={0.8}
              >
                <FileText size={16} color="#0284C7" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.dropdownTriggerVal}>
                    {grnPoNum || t('tapToSelectPo', 'Tap to Select Purchase Order (PO)')}
                  </Text>
                  <Text style={styles.dropdownTriggerSub}>
                    {activePoForGrn ? `${translateSupplierName(activePoForGrn.supplierName)} • ${t('total', 'Total')}: ${formatCurrency(activePoForGrn.totalAmount)}` : t('pickPoFromDropdown', 'Pick existing PO from dropdown')}
                  </Text>
                </View>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('grnNumber', 'GRN Number')}</Text>
              <TextInput
                style={styles.textInput}
                value={grnNumber}
                onChangeText={setGrnNumber}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('receivedBy', 'Received By')}</Text>
              <TextInput
                style={styles.textInput}
                value={grnReceivedBy}
                onChangeText={setGrnReceivedBy}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
              onPress={async () => {
                const matchPo = purchaseOrders.find(p => p.poNumber === grnPoNum) || activePoForGrn;
                const newGrn: Partial<GoodsReceipt> = {
                  grnNumber,
                  purchaseOrderId: matchPo?.id,
                  poNumber: grnPoNum || matchPo?.poNumber,
                  supplierId: matchPo?.supplierId || 1,
                  supplierName: matchPo?.supplierName || 'Supplier',
                  receivedBy: grnReceivedBy,
                  status: 'RECEIVED',
                  items: (matchPo?.items || []).map(it => ({
                    itemName: it.itemName,
                    unit: it.unit,
                    orderedQty: it.quantity,
                    receivedQty: it.quantity,
                    acceptedQty: it.quantity,
                    rejectedQty: 0,
                  })),
                };
                const saved = await purchaseStore.saveGoodsReceipt(newGrn);
                reloadData();
                Alert.alert(
                  language === 'mr' ? 'GRN तयार केले' : language === 'hi' ? 'GRN बनाया गया' : 'GRN Created',
                  language === 'mr' ? `माल पावती ${saved.grnNumber} यशस्वीरित्या जतन केली.` : language === 'hi' ? `माल रसीद ${saved.grnNumber} सफलतापूर्वक सहेजी गई।` : `Goods Receipt ${saved.grnNumber} saved successfully.`
                );
              }}
            >
              <Text style={styles.actionBtnText}>{t('saveGrn', 'Save GRN')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
              onPress={() => {
                const matchPo = purchaseOrders.find(p => p.poNumber === grnPoNum) || activePoForGrn;
                const matchGrn = goodsReceipts.find(g => g.poNumber === grnPoNum);
                setActiveGrnForInvoice(matchGrn || null);
                setActiveTab('invoice');
              }}
            >
              <Text style={styles.actionBtnText}>{t('generateInvoice', 'Generate Invoice')} →</Text>
            </TouchableOpacity>
          </View>

          {/* Saved GRNs Table */}
          <View style={styles.savedPoTableSection}>
            <Text style={styles.subHeadingTitle}>{t('savedGoodsReceipts', 'Saved Goods Receipts')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 700 }}>
                <View style={styles.poListTableHeader}>
                  <Text style={[styles.thText, { width: 140 }]}>{t('grnNo', 'GRN No.')}</Text>
                  <Text style={[styles.thText, { width: 140 }]}>{t('poNo', 'PO No.')}</Text>
                  <Text style={[styles.thText, { width: 140 }]}>{t('supplier', 'Supplier')}</Text>
                  <Text style={[styles.thText, { width: 100 }]}>{t('date', 'Date')}</Text>
                  <Text style={[styles.thText, { width: 100 }]}>{t('status', 'STATUS')}</Text>
                  <Text style={[styles.thText, { width: 80, textAlign: 'center' }]}>{t('action', 'Action')}</Text>
                </View>

                {goodsReceipts.map(g => (
                  <View key={g.id || g.grnNumber} style={styles.poListTableRow}>
                    <Text style={[styles.tdText, { width: 140, fontWeight: '700', color: '#0284C7' }]}>
                      {g.grnNumber}
                    </Text>
                    <Text style={[styles.tdText, { width: 140, color: '#334155' }]}>{g.poNumber}</Text>
                    <Text style={[styles.tdText, { width: 140, color: '#334155' }]}>{translateSupplierName(g.supplierName)}</Text>
                    <Text style={[styles.tdText, { width: 100, color: '#64748B' }]}>{g.grnDate ? formatDate(g.grnDate) : ''}</Text>
                    <View style={{ width: 100 }}>
                      <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>{translateStatus(g.status)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.tblActionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => {
                        setActiveGrnForInvoice(g);
                        setActiveTab('invoice');
                      }}
                    >
                      <Text style={[styles.tblActionBtnText, { color: '#2563EB' }]}>{t('invoice', 'Invoice')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 4: PURCHASE INVOICE VIEW
  // =========================================================================
  const renderInvoiceView = () => {
    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('dashboard')}>
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        <View style={styles.mainWhiteCard}>
          <View style={[styles.sectionBadge, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.sectionBadgeText}>4. {t('purchaseInvoice', 'Purchase Invoices')}</Text>
          </View>

          <Text style={styles.createPoHeading}>{t('purchaseInvoices', 'Purchase Invoices')}</Text>

          {/* Create Purchase Invoice Section with Dropdown & Calendar */}
          <View style={styles.createInvoiceCardSection}>
            <Text style={styles.subHeadingTitle}>{t('createPurchaseInvoice', '+ Create Purchase Invoice')}</Text>
            <View style={styles.poFormGrid}>
              {/* Select PO / GRN Dropdown */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('selectRefPoGrn', 'Select Reference PO / GRN')} *</Text>
                <TouchableOpacity
                  style={styles.dropdownTriggerBox}
                  onPress={() => setShowPoPickerForInvoiceModal(true)}
                  activeOpacity={0.8}
                >
                  <Receipt size={16} color="#7C3AED" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.dropdownTriggerVal}>
                      {invFormPoNum || t('tapToSelectPoGrn', 'Tap to Select PO / GRN')}
                    </Text>
                    <Text style={styles.dropdownTriggerSub}>
                      {invFormSupplierName ? `${invFormSupplierName} • ${formatCurrency(invFormTotal)}` : t('pickPoGrnToAutofill', 'Pick PO/GRN to auto-fill details')}
                    </Text>
                  </View>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Invoice Number */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('invoiceNumber', 'Invoice Number')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={invFormNumber}
                  onChangeText={setInvFormNumber}
                  placeholder="INV-109283"
                />
              </View>

              {/* Invoice Date with Calendar */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('invoiceDate', 'Invoice Date')} *</Text>
                <TouchableOpacity
                  style={styles.datePickerInputBox}
                  onPress={() => openDatePicker('invoiceDate')}
                  activeOpacity={0.8}
                >
                  <Calendar size={15} color="#7C3AED" />
                  <Text style={styles.datePickerInputText}>{invFormDate ? formatDate(invFormDate) : t('selectDate', 'Select Invoice Date')}</Text>
                </TouchableOpacity>
              </View>

              {/* Due Date with Calendar */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('dueDate', 'Due Date')} *</Text>
                <TouchableOpacity
                  style={styles.datePickerInputBox}
                  onPress={() => openDatePicker('dueDate')}
                  activeOpacity={0.8}
                >
                  <Calendar size={15} color="#64748B" />
                  <Text style={styles.datePickerInputText}>{invFormDueDate ? formatDate(invFormDueDate) : t('selectDate', 'Select Due Date')}</Text>
                </TouchableOpacity>
              </View>

              {/* Total Amount */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('totalAmount', 'Total Amount')} (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(invFormTotal)}
                  onChangeText={v => setInvFormTotal(Number(v) || 0)}
                  keyboardType="numeric"
                />
              </View>

              {/* Payment Status */}
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>{t('paymentStatus', 'Payment Status')}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['UNPAID', 'PAID'] as const).map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusPillBtn,
                        invFormStatus === st && styles.statusPillBtnActive,
                      ]}
                      onPress={() => setInvFormStatus(st)}
                    >
                      <Text
                        style={[
                          styles.statusPillBtnText,
                          invFormStatus === st && styles.statusPillBtnTextActive,
                        ]}
                      >
                        {translateStatus(st)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#7C3AED', marginTop: 12 }]}
              onPress={async () => {
                await purchaseStore.savePurchaseInvoice({
                  invoiceNumber: invFormNumber,
                  poNumber: invFormPoNum || undefined,
                  supplierId: invFormSupplierId,
                  supplierName: invFormSupplierName,
                  invoiceDate: invFormDate,
                  dueDate: invFormDueDate,
                  total: invFormTotal,
                  paidAmount: invFormStatus === 'PAID' ? invFormTotal : 0,
                  dueAmount: invFormStatus === 'PAID' ? 0 : invFormTotal,
                  paymentStatus: invFormStatus,
                  status: invFormStatus,
                });
                reloadData();
                setInvFormNumber(`INV-${Date.now().toString().slice(-6)}`);
                Alert.alert(
                  language === 'mr' ? 'चालन जतन केले' : language === 'hi' ? 'चालान सहेजा गया' : 'Invoice Saved',
                  language === 'mr' ? `खरेदी चालन ${invFormNumber} यशस्वीरित्या जतन केले.` : language === 'hi' ? `खरीद चालान ${invFormNumber} सफलतापूर्वक सहेजा गया।` : `Purchase Invoice ${invFormNumber} saved successfully.`
                );
              }}
            >
              <Text style={styles.actionBtnText}>{t('savePurchaseInvoice', 'Save Purchase Invoice')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subHeadingTitle, { marginTop: 20 }]}>{t('savedInvoicesTable', 'Saved Invoices Table')}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 840 }}>
              <View style={styles.poListTableHeader}>
                <Text style={[styles.thText, { width: 140 }]}>{t('invoiceNo', 'Invoice No.')}</Text>
                <Text style={[styles.thText, { width: 140 }]}>{t('poNumber', 'PO Number')}</Text>
                <Text style={[styles.thText, { width: 140 }]}>{t('supplier', 'Supplier')}</Text>
                <Text style={[styles.thText, { width: 100 }]}>{t('date', 'Date')}</Text>
                <Text style={[styles.thText, { width: 110 }]}>{t('total', 'Total')} (₹)</Text>
                <Text style={[styles.thText, { width: 90 }]}>{t('status', 'STATUS')}</Text>
                <Text style={[styles.thText, { width: 120, textAlign: 'center' }]}>{t('action', 'Action')}</Text>
              </View>

              {purchaseInvoices.map(inv => (
                <View key={inv.id || inv.invoiceNumber} style={styles.poListTableRow}>
                  <Text style={[styles.tdText, { width: 140, fontWeight: '700', color: '#7C3AED' }]}>
                    {inv.invoiceNumber}
                  </Text>
                  <Text style={[styles.tdText, { width: 140, color: '#334155' }]}>{inv.poNumber || '-'}</Text>
                  <Text style={[styles.tdText, { width: 140, color: '#334155' }]}>{translateSupplierName(inv.supplierName)}</Text>
                  <Text style={[styles.tdText, { width: 100, color: '#64748B' }]}>{inv.invoiceDate ? formatDate(inv.invoiceDate) : ''}</Text>
                  <Text style={[styles.tdText, { width: 110, fontWeight: '700', color: '#0F172A' }]}>
                    {formatCurrency(inv.total)}
                  </Text>
                  <View style={{ width: 90 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        inv.paymentStatus === 'PAID' && { backgroundColor: '#DCFCE7' },
                        inv.paymentStatus !== 'PAID' && { backgroundColor: '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          inv.paymentStatus === 'PAID' && { color: '#15803D' },
                          inv.paymentStatus !== 'PAID' && { color: '#B45309' },
                        ]}
                      >
                        {translateStatus(inv.paymentStatus || 'UNPAID')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 120, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    <TouchableOpacity
                      style={[styles.tblActionBtn, { backgroundColor: '#ECFDF5' }]}
                      onPress={() => {
                        setQuickPayData({
                          invoiceNumber: inv.invoiceNumber,
                          poNumber: inv.poNumber,
                          supplierId: inv.supplierId,
                          supplierName: inv.supplierName,
                          amount: inv.dueAmount || inv.total,
                        });
                      }}
                    >
                      <Text style={[styles.tblActionBtnText, { color: '#059669', fontWeight: '800' }]}>{t('pay', 'Pay')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tblActionBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => {
                        setActiveInvoiceForReturn(inv);
                        setActiveTab('return');
                      }}
                    >
                      <Text style={[styles.tblActionBtnText, { color: '#DC2626' }]}>{t('return', 'Return')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 5: SUPPLIER MANAGEMENT VIEW
  // =========================================================================
  const [supplierSearch, setSupplierSearch] = useState<string>('');

  const filteredSuppliers = suppliers.filter(
    s =>
      (s.name && s.name.toLowerCase().includes(supplierSearch.toLowerCase())) ||
      (s.company && s.company.toLowerCase().includes(supplierSearch.toLowerCase())) ||
      (s.phone && s.phone.includes(supplierSearch))
  );

  const renderSupplierView = () => {
    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('dashboard')}>
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        <View style={styles.mainWhiteCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.sectionBadge, { backgroundColor: '#9333EA' }]}>
              <Text style={styles.sectionBadgeText}>1. {t('supplierManagement', 'Supplier Management')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#9333EA' }]}
              onPress={() => setShowAddSupplierModal(true)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>{t('addSupplier', '+ Add Supplier')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarBox}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchBarInput}
              placeholder={t('searchSupplierPlaceholder', 'Search by supplier name, company or phone...')}
              value={supplierSearch}
              onChangeText={setSupplierSearch}
            />
          </View>

          {/* Suppliers Cards Grid */}
          <View style={styles.suppliersGrid}>
            {filteredSuppliers.map((sup, idx) => (
              <View key={sup.id || idx} style={styles.supplierCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.supCardTitle}>{translateSupplierName(sup.company || sup.name)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>{translateStatus(sup.status)}</Text>
                  </View>
                </View>
                <Text style={styles.supCardSub}>{t('contact', 'Contact')}: {translateSupplierName(sup.contact || sup.name)}</Text>
                <Text style={styles.supCardSub}>{t('phone', 'Phone')}: {toDevanagari(sup.phone)}</Text>
                {sup.gstNumber ? <Text style={styles.supCardSub}>GSTIN: {sup.gstNumber}</Text> : null}
                {sup.address ? <Text style={styles.supCardSub}>{t('address', 'Address')}: {sup.address}</Text> : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.tblActionBtn, { flex: 1, backgroundColor: '#EFF6FF' }]}
                    onPress={() => {
                      setPoFormSupplierId(sup.id);
                      setActiveTab('po');
                    }}
                  >
                    <Text style={[styles.tblActionBtnText, { color: '#2563EB', textAlign: 'center' }]}>
                      {t('createPo', '+ Create PO')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 6: PURCHASE REPORTS VIEW
  // =========================================================================
  const renderReportsView = () => {
    const totalSpent = purchaseOrders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPaid = supplierPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalDue = Math.max(0, totalSpent - totalPaid);

    const handleDownloadPdfReport = async () => {
      try {
        const invoices = purchaseOrders.map((po, idx) => {
          const tot = Number(po.totalAmount) || 0;
          const tax = Math.round((tot * 0.05 / 1.05) * 100) / 100;
          const taxable = tot - tax;
          const supName = po.supplierName || suppliers.find(s => String(s.id) === String(po.supplierId))?.name || 'Balaji Traders';
          return {
            invNumber: po.poNumber || `PO-${po.id || idx + 1}`,
            poNumber: po.poNumber || `PO-${po.id || idx + 1}`,
            date: po.poDate ? formatDate(po.poDate) : '2026-10-26',
            supplier: supName,
            gstin: po.supplierGst || '27AABCS1234F1Z5',
            taxable,
            tax,
            total: tot,
            status: po.status || 'COMPLETED',
          };
        });

        const html = buildPurchaseReportHtml({
          hotelName: 'Royal Palace Hotel',
          branchName: activeBranch?.name || 'Royal Palace Hotel',
          totalPurchases: totalSpent,
          totalOrders: purchaseOrders.length,
          invoices,
        });

        await downloadAndSharePdf(`Purchase_Report_${Date.now().toString().slice(-6)}`, html);
      } catch (e: any) {
        console.warn('PDF export error:', e);
        Alert.alert(t('error', 'Error'), 'PDF generation failed: ' + (e?.message || ''));
      }
    };

    const handleExportCsvReport = async () => {
      try {
        const headers = ['PO / Inv #', 'Date', 'Supplier', 'Taxable (INR)', 'GST 5% (INR)', 'Total (INR)', 'Status'];
        const rows = purchaseOrders.map((po, idx) => {
          const tot = Number(po.totalAmount) || 0;
          const tax = Math.round((tot * 0.05 / 1.05) * 100) / 100;
          const taxable = tot - tax;
          const supName = po.supplierName || suppliers.find(s => String(s.id) === String(po.supplierId))?.name || 'Balaji Traders';
          return [
            po.poNumber || `PO-${po.id || idx + 1}`,
            po.poDate || '2026-10-26',
            supName,
            taxable.toFixed(2),
            tax.toFixed(2),
            tot.toFixed(2),
            po.status || 'COMPLETED',
          ];
        });
        const csvData = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        await downloadAndShareCsv('purchase_report', csvData);
      } catch (e: any) {
        console.warn('CSV export error:', e);
        Alert.alert(t('error', 'Error'), 'CSV export failed: ' + (e?.message || ''));
      }
    };

    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('dashboard')}>
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        <View style={styles.mainWhiteCard}>
          <View style={[styles.sectionBadge, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.sectionBadgeText}>7. {t('purchaseReports', 'Purchase Reports')}</Text>
          </View>

          {/* Reports Header Row with Actions */}
          <View style={styles.reportsHeaderRow}>
            <Text style={styles.createPoHeading}>{t('purchaseSummaryFinancials', 'Purchase Summary & Financials')}</Text>
            <View style={styles.reportsBtnGroup}>
              <TouchableOpacity
                style={[styles.reportExportBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleDownloadPdfReport}
                activeOpacity={0.8}
              >
                <Download size={13} color="#FFFFFF" />
                <Text style={styles.reportExportBtnText}>{t('downloadPdf', 'Download PDF')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportExportBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleExportCsvReport}
                activeOpacity={0.8}
              >
                <FileText size={13} color="#FFFFFF" />
                <Text style={styles.reportExportBtnText}>{t('exportCsv', 'Export CSV')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportExportBtn, { backgroundColor: '#1E3A8A' }]}
                onPress={handleDownloadPdfReport}
                activeOpacity={0.8}
              >
                <Printer size={13} color="#FFFFFF" />
                <Text style={styles.reportExportBtnText}>{t('printReport', 'Print')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3 Metric Cards */}
          <View style={styles.statCardsGrid}>
            <View style={styles.statCard}>
              <View>
                <Text style={styles.statCardLabel}>{t('totalPurchaseVolume', 'Total Purchase Volume')}</Text>
                <Text style={styles.statCardValue}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                <FileText size={22} color="#9333EA" />
              </View>
            </View>

            <View style={styles.statCard}>
              <View>
                <Text style={styles.statCardLabel}>{t('totalAmountPaid', 'Total Amount Paid')}</Text>
                <Text style={[styles.statCardValue, { color: '#16A34A' }]}>{formatCurrency(totalPaid)}</Text>
              </View>
              <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle2 size={22} color="#16A34A" />
              </View>
            </View>

            <View style={styles.statCard}>
              <View>
                <Text style={styles.statCardLabel}>{t('outstandingDues', 'Outstanding Dues')}</Text>
                <Text style={[styles.statCardValue, { color: '#EA580C' }]}>{formatCurrency(totalDue)}</Text>
              </View>
              <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
                <CreditCard size={22} color="#EA580C" />
              </View>
            </View>
          </View>

          {/* Supplier Breakdown Table */}
          <View style={styles.savedPoTableSection}>
            <Text style={styles.subHeadingTitle}>{t('supplierBreakdown', 'Supplier Breakdown')}</Text>
            {suppliers.map(s => {
              const supOrders = purchaseOrders.filter(p => String(p.supplierId) === String(s.id));
              const supTotal = supOrders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
              return (
                <View key={s.id} style={styles.reportRow}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', width: 200 }}>
                    {s.company || s.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{toDevanagari(supOrders.length)} {t('orders', 'Orders')}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    {formatCurrency(supTotal)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Full Purchase Invoices & Tax Register Table */}
          <View style={[styles.savedPoTableSection, { marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={styles.subHeadingTitle}>{t('purchaseInvoicesTaxBreakdown', 'Purchase Invoices Register & Tax Breakdown')}</Text>
              </View>
              <View style={[styles.paidBadge, { paddingHorizontal: 10, paddingVertical: 4 }]}>
                <Text style={styles.paidBadgeText}>{toDevanagari(purchaseOrders.length)} {t('totalRecords', 'Total Records')}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 800 }}>
                {/* Table Header */}
                <View style={[styles.tableHeader, { backgroundColor: '#F1F5F9', borderBottomWidth: 1.5, borderBottomColor: '#CBD5E1' }]}>
                  <Text style={[styles.th, { width: 140 }]}>{t('poInvNumber', 'PO / Inv #')}</Text>
                  <Text style={[styles.th, { width: 110 }]}>{t('date', 'Date')}</Text>
                  <Text style={[styles.th, { width: 150 }]}>{t('supplier', 'Supplier')}</Text>
                  <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>{t('taxable', 'Taxable')}</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'right', color: '#16A34A' }]}>GST ({toDevanagari(5)}%)</Text>
                  <Text style={[styles.th, { width: 110, textAlign: 'right' }]}>{t('total', 'Total')} (₹)</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                  <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>{t('action', 'Action')}</Text>
                </View>

                {/* Table Body */}
                {purchaseOrders.map((po, idx) => {
                  const tot = Number(po.totalAmount) || 0;
                  const tax = Math.round((tot * 0.05 / 1.05) * 100) / 100;
                  const taxable = tot - tax;
                  const supName = po.supplierName || suppliers.find(s => String(s.id) === String(po.supplierId))?.name || 'Vendor';

                  return (
                    <View key={po.id || idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.td, { width: 140, fontWeight: '700', color: '#0F172A' }]}>
                        {po.poNumber || `PO-${po.id}`}
                      </Text>
                      <Text style={[styles.td, { width: 110, color: '#64748B' }]}>{po.poDate ? formatDate(po.poDate) : formatDate('2026-10-26')}</Text>
                      <Text style={[styles.td, { width: 150, fontWeight: '600', color: '#334155' }]}>{translateSupplierName(supName)}</Text>
                      <Text style={[styles.td, { width: 100, textAlign: 'right' }]}>
                        {formatCurrency(taxable)}
                      </Text>
                      <Text style={[styles.td, { width: 90, textAlign: 'right', color: '#16A34A', fontWeight: '600' }]}>
                        {formatCurrency(tax)}
                      </Text>
                      <Text style={[styles.td, { width: 110, textAlign: 'right', fontWeight: '800', color: '#0F172A' }]}>
                        {formatCurrency(tot)}
                      </Text>
                      <View style={[styles.td, { width: 90, alignItems: 'center' }]}>
                        <View style={[
                          styles.paidBadge,
                          po.status === 'COMPLETED' ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' } : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }
                        ]}>
                          <Text style={[
                            styles.paidBadgeText,
                            po.status === 'COMPLETED' ? { color: '#15803D' } : { color: '#2563EB' }
                          ]}>
                            {translateStatus(po.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.td, { width: 80, alignItems: 'center' }]}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                          onPress={() => setViewingReceiptPo(po)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>{t('view', 'View')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Grand Totals Footer Row */}
                <View style={[styles.tableRow, { backgroundColor: '#F1F5F9', borderTopWidth: 1.5, borderTopColor: '#CBD5E1' }]}>
                  <Text style={[styles.td, { width: 140, fontWeight: '800', color: '#0F172A' }]}>
                    {t('total', 'TOTAL')} ({toDevanagari(purchaseOrders.length)})
                  </Text>
                  <Text style={[styles.td, { width: 110, color: '#94A3AF' }]}>-</Text>
                  <Text style={[styles.td, { width: 150, color: '#94A3AF' }]}>-</Text>
                  <Text style={[styles.td, { width: 100, textAlign: 'right', fontWeight: '800' }]}>
                    {formatCurrency(totalSpent * (1 - 0.05 / 1.05))}
                  </Text>
                  <Text style={[styles.td, { width: 90, textAlign: 'right', fontWeight: '800', color: '#16A34A' }]}>
                    {formatCurrency(totalSpent * (0.05 / 1.05))}
                  </Text>
                  <Text style={[styles.td, { width: 110, textAlign: 'right', fontWeight: '900', color: '#0F172A' }]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                  <Text style={[styles.td, { width: 90, textAlign: 'center', color: '#94A3AF' }]}>-</Text>
                  <Text style={[styles.td, { width: 80, textAlign: 'center', color: '#94A3AF' }]}>-</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SUB-MODULE 5: PURCHASE RETURN VIEW
  // =========================================================================
  const renderPurchaseReturnView = () => {
    const retTotalAmount = retFormItems.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);

    const handleSavePurchaseReturn = async () => {
      const selectedSup = suppliers.find(s => String(s.id) === String(retFormSupplierId));
      const saved = await purchaseStore.savePurchaseReturn({
        returnNumber: retFormNumber,
        returnDate: retFormDate,
        supplierId: retFormSupplierId,
        supplierName: selectedSup?.company || selectedSup?.name || retFormSupplierName || 'Supplier',
        invoiceNumber: retFormInvoiceNumber || undefined,
        purchaseInvoiceId: activeInvoiceForReturn?.id,
        poNumber: retFormPoNum || undefined,
        reason: retFormReason,
        totalAmount: retTotalAmount,
        status: 'RETURNED',
        items: retFormItems.map(it => ({
          itemName: it.name || 'Returned Goods',
          unit: it.unit,
          quantity: it.qty,
          unitPrice: it.rate,
          totalPrice: it.qty * it.rate,
          reason: it.reason || retFormReason,
        })),
      });
      reloadData();
      setRetFormNumber(`RET-${Date.now().toString().slice(-6)}`);
      Alert.alert(
        language === 'mr' ? 'खरेदी परतावा जतन केला' : language === 'hi' ? 'खरीद वापसी सहेजी गई' : 'Purchase Return Saved',
        language === 'mr' ? `परतावा ${saved.returnNumber} एकूण ${formatCurrency(saved.totalAmount)} सह यशस्वीरित्या नोंदवला.` : language === 'hi' ? `वापसी ${saved.returnNumber} कुल ${formatCurrency(saved.totalAmount)} के साथ सफलतापूर्वक दर्ज की गई।` : `Return ${saved.returnNumber} of ${formatCurrency(saved.totalAmount)} recorded successfully.`
      );
    };

    return (
      <View style={styles.viewContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('dashboard')}>
          <ArrowLeft size={16} color="#334155" />
          <Text style={styles.backBtnText}>{t('backToDashboard', 'Back to Dashboard')}</Text>
        </TouchableOpacity>

        {/* Return Details Form */}
        <View style={styles.mainWhiteCard}>
          <View style={[styles.sectionBadge, { backgroundColor: '#DC2626' }]}>
            <Text style={styles.sectionBadgeText}>5. {t('purchaseReturnVendorDebitNotes', 'Purchase Return & Vendor Debit Notes')}</Text>
          </View>

          <Text style={styles.createPoHeading}>{t('createPurchaseReturn', 'Create Purchase Return')}</Text>

          <View style={styles.poFormGrid}>
            {/* Supplier Selection */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('supplier', 'Supplier')} *</Text>
              <TouchableOpacity
                style={styles.dropdownTriggerBox}
                onPress={() => setShowSupplierPickerModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTriggerVal}>
                    {suppliers.find(s => String(s.id) === String(retFormSupplierId))?.name || retFormSupplierName || t('selectSupplier', 'Select Supplier')}
                  </Text>
                  <Text style={styles.dropdownTriggerSub}>{t('tapToChangeSupplier', 'Tap to change supplier')}</Text>
                </View>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Return Number */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('returnNumber', 'Return Number')} *</Text>
              <TextInput
                style={styles.textInput}
                value={retFormNumber}
                onChangeText={setRetFormNumber}
              />
            </View>

            {/* Invoice Ref Number */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('refInvoiceNo', 'Reference Invoice No.')}</Text>
              <TextInput
                style={styles.textInput}
                value={retFormInvoiceNumber}
                onChangeText={setRetFormInvoiceNumber}
                placeholder="e.g. INV-109283"
              />
            </View>

            {/* Return Date with Calendar */}
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>{t('returnDate', 'Return Date')} *</Text>
              <TouchableOpacity
                style={styles.datePickerInputBox}
                onPress={() => openDatePicker('returnDate')}
                activeOpacity={0.8}
              >
                <Calendar size={15} color="#DC2626" />
                <Text style={styles.datePickerInputText}>{retFormDate ? formatDate(retFormDate) : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* Reason for Return */}
            <View style={[styles.formCol, { width: '100%' }]}>
              <Text style={styles.formLabel}>{t('reasonForReturn', 'Reason for Return')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[
                  { key: 'Defective / Quality Issue', label: t('defectiveQualityIssue', 'Defective / Quality Issue') },
                  { key: 'Damaged in Transit', label: t('damagedInTransit', 'Damaged in Transit') },
                  { key: 'Excess Quantity', label: t('excessQuantity', 'Excess Quantity') },
                  { key: 'Wrong Item Supplied', label: t('wrongItemSupplied', 'Wrong Item Supplied') },
                  { key: 'Expired Stock', label: t('expiredStock', 'Expired Stock') },
                ].map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[
                      styles.statusPillBtn,
                      retFormReason === r.key && { backgroundColor: '#DC2626', borderColor: '#DC2626' }
                    ]}
                    onPress={() => setRetFormReason(r.key)}
                  >
                    <Text style={[
                      styles.statusPillBtnText,
                      retFormReason === r.key && { color: '#FFFFFF', fontWeight: '800' }
                    ]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Line Items for Return */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.formLabel, { marginBottom: 0 }]}>{t('returnedItemsList', 'Returned Items List')}</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                onPress={() => {
                  setRetFormItems(prev => [
                    ...prev,
                    { id: Date.now(), name: language === 'mr' ? 'नवीन परत केलेली वस्तू' : language === 'hi' ? 'नई वापस की गई वस्तु' : 'New Returned Item', unit: language === 'mr' ? 'किलो' : language === 'hi' ? 'किलो' : 'Kg', qty: 1, rate: 100, reason: retFormReason }
                  ]);
                }}
              >
                <Plus size={14} color="#2563EB" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>{t('addItem', 'Add Item')}</Text>
              </TouchableOpacity>
            </View>

            {retFormItems.map((item, idx) => (
              <View key={item.id || idx} style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 2, height: 38 }]}
                    value={item.name}
                    placeholder={t('itemNamePlaceholder', 'Item name')}
                    onChangeText={txt => {
                      const updated = [...retFormItems];
                      updated[idx].name = txt;
                      setRetFormItems(updated);
                    }}
                  />
                  <TextInput
                    style={[styles.textInput, { width: 55, height: 38, textAlign: 'center' }]}
                    value={String(item.qty)}
                    placeholder={t('qty', 'Qty')}
                    keyboardType="numeric"
                    onChangeText={txt => {
                      const updated = [...retFormItems];
                      updated[idx].qty = Number(txt) || 0;
                      setRetFormItems(updated);
                    }}
                  />
                  <TextInput
                    style={[styles.textInput, { width: 75, height: 38, textAlign: 'right' }]}
                    value={String(item.rate)}
                    placeholder={t('rate', 'Rate')}
                    keyboardType="numeric"
                    onChangeText={txt => {
                      const updated = [...retFormItems];
                      updated[idx].rate = Number(txt) || 0;
                      setRetFormItems(updated);
                    }}
                  />
                  {retFormItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setRetFormItems(retFormItems.filter((_, i) => i !== idx))}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'right' }}>
                  {t('lineTotal', 'Line Total')}: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{formatCurrency(item.qty * item.rate)}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* Total & Submit Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{t('totalReturnDebitAmount', 'Total Return Debit Amount')}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#DC2626' }}>{formatCurrency(retTotalAmount)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleSavePurchaseReturn}
              activeOpacity={0.85}
            >
              <RotateCcw size={15} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>{t('savePurchaseReturn', 'Save Purchase Return')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Purchase Returns & Debit Notes Register */}
        <View style={[styles.savedPoTableSection, { marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.subHeadingTitle}>{t('purchaseReturnsRegister', 'Purchase Returns & Debit Notes Register')}</Text>
            <View style={[styles.paidBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.paidBadgeText, { color: '#DC2626' }]}>{toDevanagari(purchaseReturns.length)} {t('totalReturns', 'Total Returns')}</Text>
            </View>
          </View>

          {purchaseReturns.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
              <RotateCcw size={28} color="#94A3B8" />
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 6 }}>
                {t('noPurchaseReturns', 'No purchase returns recorded yet.')}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 780 }}>
                <View style={styles.poListTableHeader}>
                  <Text style={[styles.thText, { width: 130 }]}>{t('returnNo', 'Return No.')}</Text>
                  <Text style={[styles.thText, { width: 100 }]}>{t('date', 'Date')}</Text>
                  <Text style={[styles.thText, { width: 140 }]}>{t('supplier', 'Supplier')}</Text>
                  <Text style={[styles.thText, { width: 120 }]}>{t('refInvoice', 'Ref Invoice')}</Text>
                  <Text style={[styles.thText, { width: 140 }]}>{t('reason', 'Reason')}</Text>
                  <Text style={[styles.thText, { width: 100, textAlign: 'right' }]}>{t('total', 'Total')} (₹)</Text>
                  <Text style={[styles.thText, { width: 80, textAlign: 'center' }]}>{t('status', 'STATUS')}</Text>
                </View>

                {purchaseReturns.map((ret, idx) => (
                  <View key={ret.id || idx} style={styles.poListTableRow}>
                    <Text style={[styles.tdText, { width: 130, fontWeight: '700', color: '#DC2626' }]}>
                      {ret.returnNumber}
                    </Text>
                    <Text style={[styles.tdText, { width: 100, color: '#64748B' }]}>{ret.returnDate ? formatDate(ret.returnDate) : ''}</Text>
                    <Text style={[styles.tdText, { width: 140, color: '#334155', fontWeight: '600' }]}>
                      {translateSupplierName(ret.supplierName)}
                    </Text>
                    <Text style={[styles.tdText, { width: 120, color: '#64748B' }]}>
                      {ret.invoiceNumber || '-'}
                    </Text>
                    <Text style={[styles.tdText, { width: 140, color: '#64748B' }]} numberOfLines={1}>
                      {translateReason(ret.reason)}
                    </Text>
                    <Text style={[styles.tdText, { width: 100, textAlign: 'right', fontWeight: '800', color: '#DC2626' }]}>
                      {formatCurrency(ret.totalAmount)}
                    </Text>
                    <View style={{ width: 80, alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>{translateStatus(ret.status || 'RETURNED')}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  // =========================================================================
  // MODAL 1: PO RECEIPT MODAL (EXACT MATCH WITH UPLOADED SCREENSHOT)
  // =========================================================================
  const renderReceiptModal = () => {
    if (!viewingReceiptPo) return null;
    const po = viewingReceiptPo;
    const matchSup =
      suppliers.find(s => String(s.id) === String(po.supplierId)) ||
      po.supplier || {
        name: po.supplierName || 'Balaji Traders',
        company: po.supplierName || 'Balaji Traders',
        phone: po.supplierPhone || '6666676769',
        address: po.supplierAddress || '-',
        gstNumber: po.supplierGst || '-',
      };

    const receiptNo = po.poNumber ? po.poNumber.replace(/^PO-?/i, 'PR-') : `PR-${Date.now().toString().slice(-8)}`;
    const supplierRef = po.poNumber || `PO-${Date.now().toString().slice(-8)}`;
    const receiptDate = po.poDate ? formatDate(po.poDate) : '05-10-2026';
    const supName = matchSup.company || matchSup.name || 'Balaji Traders';
    const supPhone = matchSup.phone || '6666676769';
    const supAddress = matchSup.address || '-';
    const supGstin = matchSup.gstNumber || '-';

    const receiptItems = po.items && po.items.length > 0
      ? po.items.map((it: any, idx: number) => {
          const q = Number(it.quantity ?? it.qty ?? 1);
          const r = Number(it.unitPrice ?? it.rate ?? 0);
          return {
            itemName: it.itemName || it.name || 'Raw Material',
            unit: it.unit || 'Kg',
            qty: q,
            rate: r,
            amt: Number(it.amount ?? (q * r)),
            hsn: it.hsn || `1005${30 + idx * 10}`,
          };
        })
      : [
          { itemName: 'Sugar', unit: 'Kg', qty: 60, rate: 100, amt: 6000, hsn: '100530' },
          { itemName: 'Rice', unit: 'Kg', qty: 70, rate: 80, amt: 5600, hsn: '100540' },
          { itemName: 'Basmati Rice', unit: 'Kg', qty: 100, rate: 100, amt: 10000, hsn: '100550' },
          { itemName: 'Gemini sunflower oil', unit: 'Kg', qty: 20, rate: 100, amt: 2000, hsn: '100560' },
          { itemName: 'Shegdana', unit: 'Kg', qty: 80, rate: 90, amt: 7200, hsn: '100570' },
        ];

    const subTotal = receiptItems.reduce((sum, it) => sum + it.amt, 0);
    const cgst = Math.round((subTotal * 0.025) * 100) / 100;
    const sgst = Math.round((subTotal * 0.025) * 100) / 100;
    const totalAmount = subTotal + cgst + sgst;
    const amountInWords = numberToWordsIndian(totalAmount);

    const receiptPayload = {
      receiptNo,
      poNumber: supplierRef,
      date: receiptDate,
      hotelName: 'Royal Palace Hotel',
      hotelSubtitle: 'Good Food | Happy People',
      hotelAddress: 'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028, Maharashtra, India',
      gstin: '27AAKCA1234F1Z5',
      supplierName: supName,
      supplierAddress: supAddress,
      supplierGstin: supGstin,
      supplierContact: supPhone,
      transactionType: 'Purchase Receipt',
      paymentMode: 'Bank Transfer',
      bankName: 'HDFC Bank',
      transactionId: 'NEFT112345678',
      paymentDate: receiptDate,
      items: receiptItems.map(it => ({
        itemName: it.itemName,
        hsn: it.hsn,
        quantity: it.qty,
        unit: it.unit,
        unitPrice: it.rate,
        amount: it.amt,
      })),
      subTotal,
      cgst,
      sgst,
      totalAmount,
      amountInWords,
    };

    const handlePrintReceipt = async () => {
      try {
        const html = buildPurchaseReceiptHtml(receiptPayload);
        await downloadAndSharePdf(`Purchase_Receipt_${receiptNo}`, html);
      } catch (err: any) {
        console.warn('Print receipt error:', err);
        Alert.alert(t('error', 'Error'), 'Failed to print receipt: ' + (err?.message || ''));
      }
    };

    const handleDownloadPdf = async () => {
      try {
        const html = buildPurchaseReceiptHtml(receiptPayload);
        await downloadAndSharePdf(`Purchase_Receipt_${receiptNo}`, html);
      } catch (err: any) {
        console.warn('Download PDF error:', err);
        Alert.alert(t('error', 'Error'), 'Failed to download PDF: ' + (err?.message || ''));
      }
    };

    const handleWhatsAppPdf = async () => {
      try {
        const html = buildPurchaseReceiptHtml(receiptPayload);
        await downloadAndSharePdf(`Purchase_Receipt_${receiptNo}`, html);
        const textMsg = formatPoReceiptForWhatsApp({
          receiptNo,
          poNumber: supplierRef,
          poDate: receiptDate,
          supName: supName,
          displayContact: supPhone,
          displayGst: supGstin,
          items: receiptItems.map(it => ({
            itemName: it.itemName,
            unit: it.unit,
            qty: it.qty,
            rate: it.rate,
            amount: it.amt,
          })),
          grandTotal: totalAmount,
          subTotal,
          hotelName: 'Royal Palace Hotel',
        });
        await shareTextToWhatsApp(textMsg);
      } catch (err: any) {
        console.warn('WhatsApp share error:', err);
        Alert.alert(t('error', 'Error'), 'WhatsApp share error: ' + (err?.message || ''));
      }
    };

    const handleEditDetails = () => {
      setViewingReceiptPo(null);
      setPoFormSupplierId(po.supplierId || 1);
      if (po.items && po.items.length > 0) {
        setPoFormItems(
          po.items.map((it: any, i: number) => ({
            id: Date.now() + i,
            name: it.itemName || it.name || 'Raw Material',
            unit: it.unit || 'Kg',
            qty: Number(it.quantity ?? it.qty ?? 1),
            rate: Number(it.unitPrice ?? it.rate ?? 0),
            discount: 0,
            tax: 5,
          }))
        );
      }
      setActiveTab('po');
    };

    return (
      <Modal visible={!!viewingReceiptPo} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { maxWidth: 840, padding: 16 }]}>
            {/* Top Toolbar (Exact Match with Image) */}
            <View style={styles.receiptTopToolBar}>
              {/* Left Badge + PR Number */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <View style={styles.prBlueBadge}>
                  <Text style={styles.prBlueBadgeText}>PURCHASE RECEIPT</Text>
                </View>
                <View style={styles.prNumberBox}>
                  <Text numberOfLines={1} style={styles.prNumberText}>{receiptNo}</Text>
                </View>
              </View>

              {/* Right Action Buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <TouchableOpacity style={styles.receiptBtnEdit} onPress={handleEditDetails} activeOpacity={0.8}>
                  <Pencil size={13} color="#1E293B" />
                  <Text style={styles.receiptBtnEditText}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.receiptBtnPrint} onPress={handlePrintReceipt} activeOpacity={0.8}>
                  <Printer size={13} color="#FFFFFF" />
                  <Text style={styles.receiptBtnPrintText}>Print Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.receiptBtnDownload} onPress={handleDownloadPdf} activeOpacity={0.8}>
                  <Download size={13} color="#FFFFFF" />
                  <Text style={styles.receiptBtnDownloadText}>Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.receiptBtnWa} onPress={handleWhatsAppPdf} activeOpacity={0.8}>
                  <MessageSquare size={13} color="#FFFFFF" />
                  <Text style={styles.receiptBtnWaText}>WhatsApp (PDF)</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setViewingReceiptPo(null)} style={{ padding: 4 }}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Inner Receipt Sheet */}
            <ScrollView style={{ maxHeight: 580 }} contentContainerStyle={{ paddingVertical: 8 }}>
              <View style={styles.receiptOuterCard}>
                {/* 1. Header Section */}
                <View style={styles.receiptHeaderRow}>
                  {/* Left: Logo & Hotel Info */}
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                        <Path d="M6 17h12" />
                      </Svg>
                      <Text style={styles.receiptHotelName}>Royal Palace Hotel</Text>
                    </View>
                    <Text style={styles.receiptHotelSubtitle}>Good Food | Happy People</Text>
                    <Text style={styles.receiptHotelAddress}>
                      Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028, Maharashtra, India
                    </Text>
                    <Text style={styles.receiptHotelGstin}>GSTIN : 27AAKCA1234F1Z5</Text>
                  </View>

                  {/* Right: Big Navy Badge + Meta Table */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.receiptBigNavyBadge}>
                      <Text style={styles.receiptBigNavyBadgeText}>PURCHASE RECEIPT</Text>
                    </View>
                    <View style={styles.receiptMetaGrid}>
                      <View style={styles.receiptMetaLine}>
                        <Text style={styles.receiptMetaKey}>Receipt No</Text>
                        <Text style={styles.receiptMetaSep}>:</Text>
                        <Text style={styles.receiptMetaValBold}>{receiptNo}</Text>
                      </View>
                      <View style={styles.receiptMetaLine}>
                        <Text style={styles.receiptMetaKey}>Date</Text>
                        <Text style={styles.receiptMetaSep}>:</Text>
                        <Text style={styles.receiptMetaValBold}>{receiptDate}</Text>
                      </View>
                      <View style={styles.receiptMetaLine}>
                        <Text style={styles.receiptMetaKey}>Supplier Ref.</Text>
                        <Text style={styles.receiptMetaSep}>:</Text>
                        <Text style={styles.receiptMetaValBold}>{supplierRef}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 2. Side-by-side Supplier & Transaction Details */}
                <View style={styles.twoBoxesRow}>
                  {/* Left: Supplier Details */}
                  <View style={styles.infoBoxCard}>
                    <View style={styles.infoBoxHeader}>
                      <Text style={styles.infoBoxHeaderText}>Supplier Details</Text>
                    </View>
                    <View style={styles.infoBoxBody}>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Supplier Name</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={[styles.infoLineVal, { fontWeight: '700' }]}>{translateSupplierName(supName)}</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Address</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>{supAddress}</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>GSTIN</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>{supGstin}</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Contact No.</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>{toDevanagari(supPhone)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Transaction Details */}
                  <View style={styles.infoBoxCard}>
                    <View style={styles.infoBoxHeader}>
                      <Text style={styles.infoBoxHeaderText}>Transaction Details</Text>
                    </View>
                    <View style={styles.infoBoxBody}>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Transaction Type</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>Purchase Receipt</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Payment Mode</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>Bank Transfer</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Bank Name</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>HDFC Bank</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Transaction ID</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>NEFT112345678</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLineKey}>Payment Date</Text>
                        <Text style={styles.infoLineSep}>:</Text>
                        <Text style={styles.infoLineVal}>{receiptDate}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 3. Items Table */}
                <View style={styles.receiptTable}>
                  {/* Blue Table Header */}
                  <View style={styles.receiptTableHead}>
                    <Text style={[styles.rthCol, { width: 44, textAlign: 'center' }]}>Sr. No.</Text>
                    <Text style={[styles.rthCol, { flex: 1, textAlign: 'left' }]}>Item Description</Text>
                    <Text style={[styles.rthCol, { width: 75, textAlign: 'center' }]}>HSN/SAC</Text>
                    <Text style={[styles.rthCol, { width: 65, textAlign: 'center' }]}>Quantity</Text>
                    <Text style={[styles.rthCol, { width: 55, textAlign: 'center' }]}>Unit</Text>
                    <Text style={[styles.rthCol, { width: 85, textAlign: 'right' }]}>Rate (₹)</Text>
                    <Text style={[styles.rthCol, { width: 95, textAlign: 'right' }]}>Amount (₹)</Text>
                  </View>

                  {/* Rows */}
                  {receiptItems.map((it, idx) => (
                    <View key={idx} style={[styles.receiptTableRowNew, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.rtdCol, { width: 44, textAlign: 'center', color: '#64748B' }]}>{toDevanagari(idx + 1)}</Text>
                      <Text style={[styles.rtdCol, { flex: 1, textAlign: 'left', fontWeight: '600', color: '#1E293B' }]}>
                        {translateItemName(it.itemName)}
                      </Text>
                      <Text style={[styles.rtdCol, { width: 75, textAlign: 'center', color: '#64748B' }]}>{toDevanagari(it.hsn)}</Text>
                      <Text style={[styles.rtdCol, { width: 65, textAlign: 'center', fontWeight: '600' }]}>{toDevanagari(it.qty)}</Text>
                      <Text style={[styles.rtdCol, { width: 55, textAlign: 'center', color: '#64748B' }]}>{translateUnit(it.unit)}</Text>
                      <Text style={[styles.rtdCol, { width: 85, textAlign: 'right' }]}>₹ {toDevanagari(it.rate.toFixed(2))}</Text>
                      <Text style={[styles.rtdCol, { width: 95, textAlign: 'right', fontWeight: '700', color: '#0F172A' }]}>
                        ₹ {toDevanagari(it.amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 4. Bottom Split Section */}
                <View style={styles.receiptBottomSplit}>
                  {/* Left: Amount in Words + Notes */}
                  <View style={{ flex: 1.1, gap: 10 }}>
                    {/* Amount in words */}
                    <View style={styles.infoBoxCard}>
                      <View style={styles.infoBoxHeader}>
                        <Text style={styles.infoBoxHeaderText}>Amount in Words</Text>
                      </View>
                      <View style={styles.infoBoxBody}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                          {amountInWords}
                        </Text>
                      </View>
                    </View>

                    {/* Notes */}
                    <View style={styles.infoBoxCard}>
                      <View style={styles.infoBoxHeader}>
                        <Text style={styles.infoBoxHeaderText}>Notes</Text>
                      </View>
                      <View style={[styles.infoBoxBody, { gap: 4 }]}>
                        <Text style={styles.receiptNoteItem}>• Goods received in good condition.</Text>
                        <Text style={styles.receiptNoteItem}>• Please check the quantity and quality at the time of delivery.</Text>
                        <Text style={styles.receiptNoteItem}>• This is a system generated receipt. No signature required.</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Subtotal, Taxes, Total Amount banner, Signature */}
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <View style={styles.receiptSummaryLine}>
                      <Text style={styles.receiptSummaryLabel}>Sub Total</Text>
                      <Text style={styles.receiptSummaryVal}>
                        ₹ {toDevanagari(subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryLine}>
                      <Text style={styles.receiptSummaryLabel}>CGST ({toDevanagari('2.5')}%)</Text>
                      <Text style={styles.receiptSummaryVal}>
                        ₹ {toDevanagari(cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>
                    <View style={styles.receiptSummaryLine}>
                      <Text style={styles.receiptSummaryLabel}>SGST ({toDevanagari('2.5')}%)</Text>
                      <Text style={styles.receiptSummaryVal}>
                        ₹ {toDevanagari(sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>

                    {/* Total Amount Blue Banner */}
                    <View style={styles.receiptTotalBlueBanner}>
                      <Text style={styles.receiptTotalBlueText}>Total Amount</Text>
                      <Text style={styles.receiptTotalBlueVal}>
                        ₹ {toDevanagari(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </Text>
                    </View>

                    {/* Signature Line */}
                    <View style={{ alignItems: 'flex-end', marginTop: 24 }}>
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#334155', width: 160 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B', marginTop: 4 }}>
                        Authorized Signature
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                        For Royal Palace Hotel
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 2: QUICK ONE-CLICK PAY DUE MODAL
  // =========================================================================
  const [quickPayMode, setQuickPayMode] = useState<string>('UPI');
  const [quickPayRef, setQuickPayRef] = useState<string>('');

  const renderQuickPayModal = () => {
    if (!quickPayData) return null;

    return (
      <Modal visible={!!quickPayData} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.smallModalCard}>
            <View style={styles.receiptTopHeader}>
              <Text style={styles.receiptHeaderTitle}>{t('paySupplierDue', 'Pay Supplier Due')}</Text>
              <TouchableOpacity onPress={() => setQuickPayData(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 12 }}>
              <View>
                <Text style={styles.formLabel}>{t('supplier', 'Supplier')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {translateSupplierName(quickPayData.supplierName) || t('supplier', 'Supplier')}
                </Text>
              </View>

              <View>
                <Text style={styles.formLabel}>{t('referencePoInvoice', 'Reference PO / Invoice')}</Text>
                <Text style={{ fontSize: 13, color: '#334155' }}>
                  {quickPayData.invoiceNumber || quickPayData.poNumber}
                </Text>
              </View>

              <View>
                <Text style={styles.formLabel}>{t('amountToPay', 'Amount to Pay')}</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>
                  {formatCurrency(quickPayData.amount)}
                </Text>
              </View>

              <View>
                <Text style={styles.formLabel}>{t('paymentMode', 'Payment Mode')}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['UPI', 'CASH', 'CARD'].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.statusPillBtn,
                        quickPayMode === m && styles.statusPillBtnActive,
                      ]}
                      onPress={() => setQuickPayMode(m)}
                    >
                      <Text
                        style={[
                          styles.statusPillBtnText,
                          quickPayMode === m && styles.statusPillBtnTextActive,
                        ]}
                      >
                        {t(m.toLowerCase(), m)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.formLabel}>{t('txnRefCheque', 'Transaction Reference / Cheque No.')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={quickPayRef}
                  onChangeText={setQuickPayRef}
                  placeholder="e.g. UPI-9876543210"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#16A34A' }]}
                onPress={async () => {
                  await purchaseStore.recordPayment({
                    supplierId: quickPayData.supplierId,
                    supplierName: quickPayData.supplierName,
                    invoiceNumber: quickPayData.invoiceNumber,
                    poNumber: quickPayData.poNumber,
                    amount: quickPayData.amount,
                    paymentMethod: quickPayMode,
                    transactionReference: quickPayRef || `TXN-${Date.now().toString().slice(-8)}`,
                  });
                  reloadData();
                  setQuickPayData(null);
                  Alert.alert(
                    language === 'mr' ? 'पेमेंट नोंदवले' : language === 'hi' ? 'भुगतान दर्ज किया गया' : 'Payment Recorded',
                    language === 'mr' ? `${formatCurrency(quickPayData.amount)} चे पेमेंट यशस्वीरित्या नोंदवले गेले.` : language === 'hi' ? `${formatCurrency(quickPayData.amount)} का भुगतान सफलतापूर्वक दर्ज किया गया।` : `Payment of ₹ ${quickPayData.amount.toLocaleString('en-IN')} recorded successfully.`
                  );
                }}
              >
                <Text style={styles.actionBtnText}>{t('confirmPayment', 'Confirm Payment')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setQuickPayData(null)}
              >
                <Text style={[styles.actionBtnText, { color: '#475569' }]}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 3: ADD SUPPLIER MODAL
  // =========================================================================
  const renderAddSupplierModal = () => {
    return (
      <Modal visible={showAddSupplierModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.smallModalCard}>
            <View style={styles.receiptTopHeader}>
              <Text style={styles.receiptHeaderTitle}>{t('addNewSupplier', '+ Add New Supplier')}</Text>
              <TouchableOpacity onPress={() => setShowAddSupplierModal(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginVertical: 12 }}>
              <View>
                <Text style={styles.formLabel}>{t('supplierCompanyName', 'Supplier Company Name')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSupName}
                  onChangeText={setNewSupName}
                  placeholder={language === 'mr' ? 'उदा. लक्ष्मी ॲग्रो ट्रेडर्स' : language === 'hi' ? 'उदा. लक्ष्मी एग्रो ट्रेडर्स' : 'e.g. Laxmi Agro Traders'}
                />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('contactPhone10', 'Contact Phone (10 Digits)')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSupPhone}
                  onChangeText={setNewSupPhone}
                  placeholder={toDevanagari('9822334455')}
                  keyboardType="phone-pad"
                />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('gstNumberOptional', 'GST Number (Optional)')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSupGst}
                  onChangeText={setNewSupGst}
                  placeholder="e.g. 27AABCS1234F1Z5"
                  autoCapitalize="characters"
                />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('address', 'Address')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSupAddress}
                  onChangeText={setNewSupAddress}
                  placeholder={language === 'mr' ? 'उदा. मार्केट यार्ड, पुणे' : language === 'hi' ? 'उदा. मार्केट यार्ड, पुणे' : 'e.g. Market Yard, Pune'}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#9333EA' }]}
                onPress={handleAddSupplierInline}
              >
                <Text style={styles.actionBtnText}>{t('saveSupplier', 'Save Supplier')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setShowAddSupplierModal(false)}
              >
                <Text style={[styles.actionBtnText, { color: '#475569' }]}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 4: SUPPLIER DROPDOWN PICKER MODAL
  // =========================================================================
  const renderSupplierPickerModal = () => {
    const filtered = suppliers.filter(
      s =>
        (s.name && s.name.toLowerCase().includes(supplierPickerSearch.toLowerCase())) ||
        (s.company && s.company.toLowerCase().includes(supplierPickerSearch.toLowerCase())) ||
        (s.phone && s.phone.includes(supplierPickerSearch))
    );

    return (
      <Modal visible={showSupplierPickerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { maxHeight: 520 }]}>
            <View style={styles.receiptTopHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#EA580C" />
                <Text style={styles.receiptHeaderTitle}>{t('selectSupplier', 'Select Supplier')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSupplierPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <View style={styles.searchBox}>
                <Search size={15} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchSupplierNameCompany', 'Search supplier name, company, or phone...')}
                  value={supplierPickerSearch}
                  onChangeText={setSupplierPickerSearch}
                />
              </View>
            </View>

            <ScrollView style={{ paddingHorizontal: 14, maxHeight: 360 }}>
              {filtered.map(s => {
                const isSelected = String(poFormSupplierId) === String(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerItemCard, isSelected && styles.pickerItemCardSelected]}
                    onPress={() => {
                      setPoFormSupplierId(s.id);
                      setShowSupplierPickerModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemTitle, isSelected && { color: '#EA580C' }]}>
                        {translateSupplierName(s.company || s.name)}
                      </Text>
                      <Text style={styles.pickerItemSub}>
                        📞 {s.phone ? toDevanagari(s.phone) : 'No phone'}  •  GST: {s.gstNumber || 'N/A'}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#EA580C" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 5: INTERACTIVE CALENDAR DATE PICKER MODAL
  // =========================================================================
  const renderCalendarPickerModal = () => {
    const langKey = (language as 'en' | 'mr' | 'hi') || 'en';
    const currentMonthName = MONTHS[langKey]?.[calMonth] || MONTHS.en[calMonth];
    const dayNamesShort = DAYS_OF_WEEK_SHORT[langKey] || ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();

    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const prevMonth = () => {
      if (calMonth === 0) {
        setCalMonth(11);
        setCalYear(calYear - 1);
      } else {
        setCalMonth(calMonth - 1);
      }
    };

    const nextMonth = () => {
      if (calMonth === 11) {
        setCalMonth(0);
        setCalYear(calYear + 1);
      } else {
        setCalMonth(calMonth + 1);
      }
    };

    return (
      <Modal visible={showCalendarModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModalCard}>
            {/* Header */}
            <View style={styles.calendarModalHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calHeaderMonthYear}>
                {currentMonthName} {toDevanagari(calYear)}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Days of Week */}
            <View style={styles.calDayNamesRow}>
              {dayNamesShort.map((dn, idx) => (
                <Text key={`${dn}-${idx}`} style={styles.calDayNameText}>{dn}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calGrid}>
              {blanks.map(b => (
                <View key={`b-${b}`} style={styles.calDayCellEmpty} />
              ))}
              {days.map(d => (
                <TouchableOpacity
                  key={`d-${d}`}
                  style={styles.calDayCell}
                  onPress={() => handleSelectCalendarDay(d)}
                >
                  <Text style={styles.calDayText}>{toDevanagari(d)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.calCloseBtn}
              onPress={() => setShowCalendarModal(false)}
            >
              <Text style={styles.calCloseBtnText}>{t('close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 6: INVENTORY ITEM DROPDOWN MODAL
  // =========================================================================
  const renderItemPickerModal = () => {
    const filtered = STANDARD_RESTAURANT_ITEMS.filter(
      it => it.name.toLowerCase().includes(itemPickerSearch.toLowerCase())
    );

    return (
      <Modal visible={showItemPickerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { maxHeight: 520 }]}>
            <View style={styles.receiptTopHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={18} color="#EA580C" />
                <Text style={styles.receiptHeaderTitle}>{t('selectItem', 'Select Inventory Item')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowItemPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <View style={styles.searchBox}>
                <Search size={15} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchRestaurantItem', 'Search standard restaurant item...')}
                  value={itemPickerSearch}
                  onChangeText={setItemPickerSearch}
                />
              </View>
            </View>

            <ScrollView style={{ paddingHorizontal: 14, maxHeight: 360 }}>
              {filtered.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.pickerItemCard}
                  onPress={() => selectStandardItem(item)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemTitle}>{translateItemName(item.name)}</Text>
                    <Text style={styles.pickerItemSub}>
                      {t('unit', 'Unit')}: {translateUnit(item.unit)}  •  {t('rate', 'Rate')}: ₹{toDevanagari(item.defaultRate)}  •  GST: {toDevanagari(item.tax)}%
                    </Text>
                  </View>
                  <Plus size={16} color="#EA580C" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 7: PO PICKER DROPDOWN FOR GRN MODAL
  // =========================================================================
  const renderPoPickerForGrnModal = () => {
    const filtered = purchaseOrders.filter(
      po =>
        (po.poNumber && po.poNumber.toLowerCase().includes(poPickerGrnSearch.toLowerCase())) ||
        (po.supplierName && po.supplierName.toLowerCase().includes(poPickerGrnSearch.toLowerCase()))
    );

    return (
      <Modal visible={showPoPickerForGrnModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { maxHeight: 520 }]}>
            <View style={styles.receiptTopHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <PackageCheck size={18} color="#0284C7" />
                <Text style={styles.receiptHeaderTitle}>{t('selectPo', 'Select Purchase Order (PO)')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPoPickerForGrnModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <View style={styles.searchBox}>
                <Search size={15} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchPoOrSupplier', 'Search PO number or supplier...')}
                  value={poPickerGrnSearch}
                  onChangeText={setPoPickerGrnSearch}
                />
              </View>
            </View>

            <ScrollView style={{ paddingHorizontal: 14, maxHeight: 360 }}>
              {filtered.map(po => {
                const isSelected = grnPoNum === po.poNumber;
                return (
                  <TouchableOpacity
                    key={po.id || po.poNumber}
                    style={[styles.pickerItemCard, isSelected && styles.pickerItemCardSelected]}
                    onPress={() => {
                      setGrnPoNum(po.poNumber);
                      setActivePoForGrn(po);
                      setShowPoPickerForGrnModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemTitle, isSelected && { color: '#0284C7' }]}>
                        {po.poNumber} • {translateSupplierName(po.supplierName)}
                      </Text>
                      <Text style={styles.pickerItemSub}>
                        {t('date', 'Date')}: {po.poDate ? formatDate(po.poDate) : ''}  •  {t('total', 'Total')}: {formatCurrency(po.totalAmount)}  •  {t('status', 'STATUS')}: {translateStatus(po.status)}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#0284C7" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 8: PO PICKER DROPDOWN FOR INVOICE MODAL
  // =========================================================================
  const renderPoPickerForInvoiceModal = () => {
    const filtered = purchaseOrders.filter(
      po =>
        (po.poNumber && po.poNumber.toLowerCase().includes(poPickerInvoiceSearch.toLowerCase())) ||
        (po.supplierName && po.supplierName.toLowerCase().includes(poPickerInvoiceSearch.toLowerCase()))
    );

    return (
      <Modal visible={showPoPickerForInvoiceModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { maxHeight: 520 }]}>
            <View style={styles.receiptTopHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color="#7C3AED" />
                <Text style={styles.receiptHeaderTitle}>{t('selectReferencePoForInvoice', 'Select Reference PO for Invoice')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPoPickerForInvoiceModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <View style={styles.searchBox}>
                <Search size={15} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchPoOrSupplier', 'Search PO number or supplier...')}
                  value={poPickerInvoiceSearch}
                  onChangeText={setPoPickerInvoiceSearch}
                />
              </View>
            </View>

            <ScrollView style={{ paddingHorizontal: 14, maxHeight: 360 }}>
              {filtered.map(po => {
                const isSelected = invFormPoNum === po.poNumber;
                return (
                  <TouchableOpacity
                    key={po.id || po.poNumber}
                    style={[styles.pickerItemCard, isSelected && styles.pickerItemCardSelected]}
                    onPress={() => {
                      setInvFormPoNum(po.poNumber);
                      setInvFormSupplierId(po.supplierId);
                      setInvFormSupplierName(po.supplierName || 'Supplier');
                      setInvFormTotal(Number(po.totalAmount) || 0);
                      setShowPoPickerForInvoiceModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemTitle, isSelected && { color: '#7C3AED' }]}>
                        {po.poNumber} • {translateSupplierName(po.supplierName)}
                      </Text>
                      <Text style={styles.pickerItemSub}>
                        {t('date', 'Date')}: {po.poDate ? formatDate(po.poDate) : ''}  •  {t('total', 'Total')}: {formatCurrency(po.totalAmount)}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#7C3AED" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================================
  // MODAL 9: PO NUMBER DROPDOWN MODAL FOR CREATE PO (User Request)
  // =========================================================================
  const renderPoNumberPickerModal = () => {
    const poOptions = [
      { po: `PO-${Date.now().toString().slice(-6)}`, desc: t('autoGenerateNewPo', 'Auto-Generate New Sequential PO') },
      { po: 'PO-1792839760266', desc: `${translateSupplierName('Namdev Provisions')} (${language === 'mr' ? 'बेकरी आणि ब्रेड्स' : language === 'hi' ? 'बेकरी और ब्रेड' : 'Bakery & Breads'})` },
      { po: 'PO-1792408991203', desc: `${translateSupplierName('Namdev Provisions')} (${language === 'mr' ? 'स्वच्छता साहित्य' : language === 'hi' ? 'सफाई का सामान' : 'Cleaning Supplies'})` },
      { po: 'PO-1792146311677', desc: `${translateSupplierName('Dot Dot Spices')} (${language === 'mr' ? 'मसाले' : language === 'hi' ? 'मसाले' : 'Spices & Condiments'})` },
      { po: 'PO-1791996379658', desc: `${translateSupplierName('Rajesh Patil Farms')} (${language === 'mr' ? 'ताज्या भाज्या' : language === 'hi' ? 'ताजी सब्जियां' : 'Fresh Vegetables'})` },
      { po: 'PO-1791792440192', desc: `${translateSupplierName('Namdev Provisions')} (${language === 'mr' ? 'पीठ आणि डाळी' : language === 'hi' ? 'आटा और दालें' : 'Flour & Pulses'})` },
      { po: 'PO-1791278651409', desc: `${translateSupplierName('Vivek Chopade Dairy')} (${language === 'mr' ? 'डेअरी / ताजे दूध' : language === 'hi' ? 'डेयरी / ताजा दूध' : 'Dairy / Fresh Milk'})` },
      { po: 'PO-1791192640785', desc: `${translateSupplierName('Namdev Provisions')} (${language === 'mr' ? 'किराणा / साखर आणि तांदूळ' : language === 'hi' ? 'किराना / चीनी और चावल' : 'Groceries / Sugar & Rice'})` },
    ];

    return (
      <Modal visible={showPoNumberPickerModal} transparent animationType="fade" onRequestClose={() => setShowPoNumberPickerModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPoNumberPickerModal(false)}>
          <View style={[styles.receiptModalCard, { maxHeight: 500 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.receiptTopHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#EA580C" />
                <Text style={styles.receiptHeaderTitle}>{t('poNumberTemplate', 'Select PO Number / Template')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPoNumberPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 14, paddingVertical: 8, maxHeight: 380 }}>
              {poOptions.map((opt, idx) => {
                const isSelected = poFormNumber === opt.po;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.pickerItemCard, isSelected && styles.pickerItemCardSelected]}
                    onPress={() => {
                      setPoFormNumber(opt.po);
                      setShowPoNumberPickerModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemTitle, isSelected && { color: '#EA580C' }]}>
                        {opt.po}
                      </Text>
                      <Text style={styles.pickerItemSub}>{opt.desc}</Text>
                    </View>
                    {isSelected && <CheckCircle2 size={18} color="#EA580C" />}
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
    <View style={styles.container}>
      {/* App Top Navbar with Branch, Language, Subscription Pill */}
      <AppNavbar navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header Row matching Vite exactly: Title + Date Filter Badge */}
        <View style={styles.topHeaderRow}>
          <View>
            <Text style={styles.pageTitle}>{t('purchaseDashboard', 'Purchase Dashboard')}</Text>
            <Text style={styles.breadcrumbText}>
              {t('purchases', 'Purchases')} &gt; {tabNames[activeTab]}
            </Text>
          </View>

          {/* Orange Pill Date Badge matching reference screenshot */}
          <TouchableOpacity
            style={styles.orangeDateBadge}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.orangeDateBadgeText}>
              {startDate} - {endDate}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Sub-navigation Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar}>
          {(['dashboard', 'supplier', 'po', 'grn', 'invoice', 'return', 'reports'] as PurchaseTab[]).map(tabKey => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.subTabItem, activeTab === tabKey && styles.subTabItemActive]}
              onPress={() => setActiveTab(tabKey)}
            >
              <Text style={[styles.subTabItemText, activeTab === tabKey && styles.subTabItemTextActive]}>
                {tabNames[tabKey]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Tab Screen Content */}
        {activeTab === 'dashboard' && renderDashboardView()}
        {activeTab === 'po' && renderPurchaseOrderView()}
        {activeTab === 'grn' && renderGrnView()}
        {activeTab === 'invoice' && renderInvoiceView()}
        {activeTab === 'return' && renderPurchaseReturnView()}
        {activeTab === 'supplier' && renderSupplierView()}
        {activeTab === 'reports' && renderReportsView()}
      </ScrollView>

      {/* Modals */}
      {renderReceiptModal()}
      {renderQuickPayModal()}
      {renderAddSupplierModal()}
      {renderSupplierPickerModal()}
      {renderCalendarPickerModal()}
      {renderItemPickerModal()}
      {renderPoPickerForGrnModal()}
      {renderPoPickerForInvoiceModal()}
      {renderPoNumberPickerModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  orangeDateBadge: {
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  orangeDateBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subTabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 46,
  },
  subTabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  subTabItemActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  subTabItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subTabItemTextActive: {
    color: '#FFFFFF',
  },
  viewContainer: {
    gap: 20,
  },
  // Stat Cards
  statCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dashboard Middle Row
  dashboardMiddleRow: {
    gap: 20,
  },
  recentOrdersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topSuppliersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  viewAllBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  recentTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  recentTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  highlightedRow: {
    backgroundColor: 'rgba(254, 243, 199, 0.35)',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tdText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Donut Section
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  donutLegendList: {
    flex: 1,
    gap: 10,
    marginLeft: 8,
  },
  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendSupplierName: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  activeTag: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  // Quick Actions
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  quickActionsGrid: {
    gap: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionGridCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionsScroll: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 2,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  // Main White Card
  mainWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  createPoHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  subHeadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  // PO Form Grid
  poFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  formCol: {
    flex: 1,
    minWidth: 180,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  addSupplierLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  dropdownPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dropdownPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  dropdownPillText: {
    fontSize: 12,
    color: '#475569',
  },
  dropdownPillTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  statusPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusPillBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusPillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusPillBtnTextActive: {
    color: '#FFFFFF',
  },
  // Items section
  itemsHeaderRow: {
    marginBottom: 12,
  },
  itemsTitleWrap: {
    marginBottom: 8,
  },
  itemsActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addItemBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  itemsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  itemsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: '#0F172A',
  },
  estimatedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 10,
  },
  estimatedTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  estimatedTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  // Action Buttons Strip in Icon Form (Save, Receipt, WhatsApp, Receive, Cancel)
  poActionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  poIconCol: {
    alignItems: 'center',
    gap: 4,
  },
  poIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
  },
  poIconLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Saved PO Table below Create PO
  savedPoTableSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  poListTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  poListTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  poRowActionsGroup: {
    width: 320,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  tblActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  tblActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  // Suppliers view
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  searchBarInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  suppliersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  supplierCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  supCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Reports
  reportsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  reportsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportExportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  // Modal Backdrop & Cards
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiptModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
  },
  smallModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
  },
  receiptTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  receiptHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  hotelReceiptHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hotelReceiptName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  hotelReceiptSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  receiptMetaBox: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptMetaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  receiptMetaSub: {
    fontSize: 11,
    color: '#475569',
  },
  receiptTableContainer: {
    marginVertical: 10,
  },
  receiptTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rTh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rTd: {
    fontSize: 12,
    color: '#334155',
  },
  receiptSummaryBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountInWordsText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 4,
  },
  signatorySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 10,
  },
  signatoryLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  signatoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  receiptModalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 8,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Redesigned Receipt Modal Elements (Matching Uploaded Image)
  receiptTopToolBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  prBlueBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  prBlueBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  prNumberBox: {
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  prNumberText: {
    color: '#1E3A8A',
    fontWeight: '800',
    fontSize: 12,
  },
  receiptBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptBtnEditText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 11,
  },
  receiptBtnPrint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptBtnPrintText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  receiptBtnDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptBtnDownloadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  receiptBtnWa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptBtnWaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  receiptOuterCard: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  receiptHotelName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  receiptHotelSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  receiptHotelAddress: {
    fontSize: 10,
    color: '#475569',
    marginTop: 3,
    lineHeight: 14,
  },
  receiptHotelGstin: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  receiptBigNavyBadge: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  receiptBigNavyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  receiptMetaGrid: {
    marginTop: 6,
    gap: 2,
  },
  receiptMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptMetaKey: {
    width: 76,
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  receiptMetaSep: {
    width: 10,
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
  receiptMetaValBold: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  twoBoxesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  infoBoxCard: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  infoBoxHeader: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  infoBoxHeaderText: {
    color: '#0369A1',
    fontWeight: '800',
    fontSize: 11,
  },
  infoBoxBody: {
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    padding: 8,
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLineKey: {
    width: 100,
    fontSize: 10,
    color: '#475569',
  },
  infoLineSep: {
    width: 10,
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
  infoLineVal: {
    flex: 1,
    fontSize: 10,
    color: '#0F172A',
  },
  receiptTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  receiptTableHead: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  rthCol: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  receiptTableRowNew: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  rtdCol: {
    fontSize: 10,
    color: '#1E293B',
  },
  receiptBottomSplit: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  receiptNoteItem: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  receiptSummaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  receiptSummaryLabel: {
    fontSize: 11,
    color: '#475569',
  },
  receiptSummaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptTotalBlueBanner: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  receiptTotalBlueText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  receiptTotalBlueVal: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  // Dropdown Trigger Boxes
  dropdownTriggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  dropdownTriggerVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownTriggerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  // Date Picker Input Box
  datePickerInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  datePickerInputText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Table item dropdown icon button
  itemDropdownIconBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginLeft: 4,
  },
  // Picker Item Card
  pickerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pickerItemCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  pickerItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  // Calendar Modal Card
  calendarModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#334155',
    lineHeight: 22,
  },
  calHeaderMonthYear: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  calDayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  calDayNameText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  calDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  calCloseBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  calCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  // Create Invoice Card Section
  createInvoiceCardSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    marginTop: 8,
  },
  // Thank you Section in PO receipt
  thankYouSection: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    alignItems: 'center',
  },
  thankYouMsgText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
    textAlign: 'center',
  },
  thankYouSubText: {
    fontSize: 10.5,
    color: '#166534',
    textAlign: 'center',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    paddingRight: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  td: {
    fontSize: 11.5,
    color: '#334155',
    paddingRight: 6,
  },
  paidBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  // PO Number Input & Dropdown styles (User request)
  poNumberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poNumberDropdownBtn: {
    backgroundColor: '#F1F5F9',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add Photo to PO Button & Preview styles (User request)
  scanPhotoPoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  scanPhotoPoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  realPhotoThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  photoAttachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginTop: 10,
    marginBottom: 12,
  },
  photoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAttachedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  photoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoSuccessText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  photoAttachedSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  removePhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});

export default PurchaseScreen;
