import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Colors } from '../../theme/colors';
import {
  Receipt,
  ShoppingBag,
  Grid,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Bell,
  Globe,
  Calendar,
  Wallet,
  CreditCard,
  Building2,
  UtensilsCrossed,
  ChefHat,
  Users,
  ShoppingCart,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Tag,
  Trash2,
  LayoutDashboard,
  RotateCcw,
  BarChart3,
} from 'lucide-react-native';

import {
  restaurantStore,
  TableItem,
  ActiveOrder,
  PaymentRecord,
} from '../../api/restaurantStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BillRequest {
  id: string;
  table: string;
  amount: string;
  time: string;
  status: 'Pending' | 'Completed';
}

const BILL_REQUESTS_DATA: BillRequest[] = [
  { id: 'b1', table: 'Table 03', amount: '₹ 0', time: '22 Oct 2026 02:51 PM', status: 'Pending' },
  { id: 'b2', table: 'Table 06', amount: '₹ 2,499', time: '19 Oct 2026 11:52 AM', status: 'Pending' },
  { id: 'b3', table: 'Table TB-TBL-8881', amount: '₹ 2,205', time: '17 Oct 2026 03:50 PM', status: 'Pending' },
  { id: 'b4', table: 'Table 04', amount: '₹ 1,281', time: '16 Oct 2026 01:00 PM', status: 'Pending' },
];

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import { useBranch } from '../../context/BranchContext';
import {
  OfferItem,
  INITIAL_OFFERS,
  getSavedOffers,
  saveOffersToStorage,
} from '../../api/offersService';
import {
  translateNotifTitle,
  translateNotifDesc,
  translateNotifTime,
} from '../../utils/notificationLocalization';
export type { OfferItem };

export const HotelDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { language, t, formatDate, toDevanagari, formatNumber, localizeGuestName, formatTableName } = useLanguage();
  const { activeBranch, getBranchName, activeBranchNumId } = useBranch();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOverviewOn, setIsOverviewOn] = useState<boolean>(true);

  // Live operational data for active branch
  const [branchTables, setBranchTables] = useState<TableItem[]>([]);
  const [branchOrders, setBranchOrders] = useState<ActiveOrder[]>([]);
  const [branchPayments, setBranchPayments] = useState<PaymentRecord[]>([]);
  const [dateFilterActive, setDateFilterActive] = useState<boolean>(true);
  const [dateRangeStr, setDateRangeStr] = useState<string>('2026-10-01 to 2026-10-23');

  // Subscription / Plan State (Screenshot 2)
  const [planType, setPlanType] = useState<'TRIAL' | 'PRO' | 'ENTERPRISE'>('TRIAL');
  const [planTitle, setPlanTitle] = useState<string>('28 Days Free Trial');
  const [daysLeft, setDaysLeft] = useState<number>(21);
  const [validityDate, setValidityDate] = useState<string>('14 Nov 2028');

  // Modals state
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [planModalTab, setPlanModalTab] = useState<'PLANS' | 'OFFERS'>('PLANS');
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [offersViewMode, setOffersViewMode] = useState<'LIST' | 'ADD'>('LIST');
  const [showAddOfferModal, setShowAddOfferModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);

  const [selectedBranch, setSelectedBranch] = useState<string>('Main Branch');
  const [currentLang, setCurrentLang] = useState<string>('English');


  // Offers State (Screenshot 1 & Persistent Storage)
  const [offers, setOffers] = useState<OfferItem[]>(INITIAL_OFFERS);
  const [offerSuccessToast, setOfferSuccessToast] = useState<string>('');

  // Add Offer Form State (Pre-filled smart defaults for instant creation)
  const [newOfferName, setNewOfferName] = useState<string>('Festive Special Offer');
  const [newOfferCode, setNewOfferCode] = useState<string>('FEST2026');
  const [newOfferType, setNewOfferType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newOfferVal, setNewOfferVal] = useState<string>('20');
  const [newOfferCategory, setNewOfferCategory] = useState<string>('All Menu Items');
  const [newOfferDesc, setNewOfferDesc] = useState<string>('20% special discount on all food orders.');
  const [newOfferFrom, setNewOfferFrom] = useState<string>('2026-10-19');
  const [newOfferTo, setNewOfferTo] = useState<string>('2026-11-19');

  // Load saved offers on mount
  useEffect(() => {
    const loadSavedOffers = async () => {
      const data = await getSavedOffers();
      if (data && data.length > 0) {
        setOffers(data);
      }
    };
    loadSavedOffers();
  }, []);

  // Operational branch data loader (isolates data strictly by activeBranchNumId)
  const loadBranchOperationalData = useCallback(async () => {
    try {
      const [tList, oList, pList] = await Promise.all([
        restaurantStore.getTables(activeBranchNumId),
        restaurantStore.getOrders(activeBranchNumId),
        restaurantStore.getPayments(activeBranchNumId),
      ]);
      setBranchTables(tList);
      setBranchOrders(oList);
      setBranchPayments(pList);
    } catch (e) {
      console.warn('Error loading branch operational data:', e);
    }
  }, [activeBranchNumId]);

  useEffect(() => {
    loadBranchOperationalData();
    const unsubStore = restaurantStore.subscribe(() => {
      loadBranchOperationalData();
    });
    const unsubFocus = navigation?.addListener?.('focus', () => {
      loadBranchOperationalData();
    });
    return () => {
      unsubStore();
      unsubFocus?.();
    };
  }, [loadBranchOperationalData, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      getSavedOffers().then((data) => {
        if (data && data.length > 0) setOffers(data);
      }),
      loadBranchOperationalData(),
    ]);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // Dynamic calculations for the currently active branch:
  const liveTotalTables = branchTables.length > 0 ? branchTables.length : activeBranch.stats.totalTables;
  const liveOccupiedTables = branchTables.length > 0
    ? branchTables.filter((t) => t.status === 'OCCUPIED' || t.status === 'BILLING').length
    : activeBranch.stats.occupiedTables;
  const liveAvailableTables = Math.max(0, liveTotalTables - liveOccupiedTables);

  const isMainBranch = activeBranchNumId === 1;

  // Dynamic calculations from live branch orders & payments:
  const liveSalesTotalNum = useMemo(() => {
    const paidSum = branchPayments.reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0);
    if (paidSum > 0) return paidSum;
    const orderSum = branchOrders
      .filter((o: ActiveOrder) => o.status === 'PAID' || o.status === 'BILL GENERATED')
      .reduce((acc: number, o: ActiveOrder) => acc + (Number(o.total) || 0), 0);
    if (orderSum > 0) return orderSum;
    return isMainBranch && dateFilterActive ? 83858.52 : (Number(activeBranch?.stats?.todaySalesNum) || 0);
  }, [branchPayments, branchOrders, isMainBranch, dateFilterActive, activeBranch?.stats?.todaySalesNum]);

  const liveOrdersCount = useMemo(() => {
    if (branchOrders.length > 0) return branchOrders.length;
    return isMainBranch && dateFilterActive ? 73 : (activeBranch?.stats?.todayOrders || 0);
  }, [branchOrders, isMainBranch, dateFilterActive, activeBranch?.stats?.todayOrders]);

  const rawTotalSales = `₹ ${liveSalesTotalNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalSalesDisplay = toDevanagari(rawTotalSales);

  const rawTotalOrders = liveOrdersCount;
  const totalOrdersDisplay = toDevanagari(rawTotalOrders);

  const salesCardLabel = dateFilterActive
    ? `${toDevanagari(dateRangeStr)} ${t('sales', 'Sales')}`
    : t('todaySales', "Today's Sales");

  const ordersCardLabel = dateFilterActive
    ? `${toDevanagari(dateRangeStr)} ${t('orders', 'Orders')}`
    : t('todayOrders', "Today's Orders");

  const availableRatioText = toDevanagari(`${liveAvailableTables} / ${liveTotalTables}`);
  const availablePercentText = toDevanagari(`${liveTotalTables > 0 ? Math.round((liveAvailableTables / liveTotalTables) * 100) : 0}%`);
  const occupiedRatioText = toDevanagari(`${liveOccupiedTables} / ${liveTotalTables}`);
  const occupiedPercentText = toDevanagari(`${liveTotalTables > 0 ? Math.round((liveOccupiedTables / liveTotalTables) * 100) : 0}%`);
  // Dynamic Payment Breakdown calculated from branchPayments:
  const livePaymentBreakdown = useMemo(() => {
    let cash = 0, upi = 0, card = 0, total = 0;
    branchPayments.forEach((p: PaymentRecord) => {
      const amt = Number(p.amount) || 0;
      total += amt;
      const m = String(p.mode || '').toUpperCase();
      if (m === 'CASH') cash += amt;
      else if (m === 'CARD') card += amt;
      else upi += amt;
    });

    const formatCurr = (n: number) => {
      return `₹ ${n.toLocaleString('en-IN', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    };

    if (total === 0) {
      const fbCash = isMainBranch ? 17345 : 0;
      const fbUpi = isMainBranch ? 62252 : 0;
      const fbCard = isMainBranch ? 190 : 0;
      const fbTotal = fbCash + fbUpi + fbCard;
      const cPct = fbTotal > 0 ? Math.round((fbCash / fbTotal) * 100) : 0;
      const uPct = fbTotal > 0 ? Math.round((fbUpi / fbTotal) * 100) : 0;
      const kPct = fbTotal > 0 ? Math.round((fbCard / fbTotal) * 100) : 0;
      return {
        total: fbTotal > 0 ? formatCurr(fbTotal) : (activeBranch?.stats?.todaySales || '₹ 0'),
        cash: `${formatCurr(fbCash)} (${cPct}%)`,
        upi: `${formatCurr(fbUpi)} (${uPct}%)`,
        card: `${formatCurr(fbCard)} (${kPct}%)`,
        cashAmount: formatCurr(fbCash),
        upiAmount: formatCurr(fbUpi),
        cardAmount: formatCurr(fbCard),
        cashPct: cPct,
        upiPct: uPct,
        cardPct: kPct,
        rawTotal: fbTotal || (isMainBranch ? 79787 : 0),
        rawCash: fbCash,
        rawUpi: fbUpi,
        rawCard: fbCard,
      };
    }

    const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
    const upiPct = total > 0 ? Math.round((upi / total) * 100) : 0;
    const cardPct = total > 0 ? Math.round((card / total) * 100) : 0;

    return {
      total: formatCurr(total),
      cash: `${formatCurr(cash)} (${cashPct}%)`,
      upi: `${formatCurr(upi)} (${upiPct}%)`,
      card: `${formatCurr(card)} (${cardPct}%)`,
      cashAmount: formatCurr(cash),
      upiAmount: formatCurr(upi),
      cardAmount: formatCurr(card),
      cashPct,
      upiPct,
      cardPct,
      rawTotal: total,
      rawCash: cash,
      rawUpi: upi,
      rawCard: card,
    };
  }, [branchPayments, isMainBranch, activeBranch?.stats]);

  const paymentTotalDisplay = toDevanagari(livePaymentBreakdown.total);
  const paymentCashDisplay = toDevanagari(livePaymentBreakdown.cash);
  const paymentUpiDisplay = toDevanagari(livePaymentBreakdown.upi);
  const paymentCardDisplay = toDevanagari(livePaymentBreakdown.card);

  const paymentCashAmount = toDevanagari(livePaymentBreakdown.cashAmount);
  const paymentCashPct = toDevanagari(livePaymentBreakdown.cashPct.toString());
  const paymentUpiAmount = toDevanagari(livePaymentBreakdown.upiAmount);
  const paymentUpiPct = toDevanagari(livePaymentBreakdown.upiPct.toString());
  const paymentCardAmount = toDevanagari(livePaymentBreakdown.cardAmount);
  const paymentCardPct = toDevanagari(livePaymentBreakdown.cardPct.toString());

  // Dynamic proportional Donut Chart segments for Payment Summary:
  const paymentDonutSegments = useMemo(() => {
    const { rawTotal, rawCash, rawUpi, rawCard } = livePaymentBreakdown;
    const r = 48;
    const circumference = 2 * Math.PI * r; // ~301.59
    if (rawTotal <= 0) return { segments: [], circumference, r };

    const modes = [
      { key: 'UPI', amount: rawUpi, color: '#2563EB' },
      { key: 'Cash', amount: rawCash, color: '#16A34A' },
      { key: 'Card', amount: rawCard, color: '#7C3AED' },
    ].filter((m) => m.amount > 0);

    const activeCount = modes.length;
    const gapAngle = activeCount > 1 ? 4 : 0;

    let accumulatedAngle = 0;
    const segments = modes.map((m) => {
      const ratio = m.amount / rawTotal;
      const totalDegrees = ratio * 360;
      const visibleDegrees = Math.max(1, totalDegrees - gapAngle);
      const arcLength = (visibleDegrees / 360) * circumference;
      const rotation = -90 + accumulatedAngle + (gapAngle / 2);
      accumulatedAngle += totalDegrees;

      return {
        key: m.key,
        color: m.color,
        strokeDasharray: `${arcLength.toFixed(1)} ${circumference.toFixed(1)}`,
        rotation,
      };
    });

    return { segments, circumference, r };
  }, [livePaymentBreakdown]);

  // Live Bill Requests derived from live orders and occupied tables:
  const liveBillRequests = useMemo<BillRequest[]>(() => {
    const list: BillRequest[] = [];
    branchOrders
      .filter((o: ActiveOrder) => o.status !== 'PAID')
      .forEach((o: ActiveOrder) => {
        list.push({
          id: o.id,
          table: o.tableNumber.startsWith('Table') ? o.tableNumber : `Table ${o.tableNumber}`,
          amount: `₹ ${(o.total || 0).toLocaleString('en-IN')}`,
          time: o.date ? o.date : 'Just now',
          status: 'Pending',
        });
      });
    branchTables
      .filter((t: TableItem) => (t.status === 'OCCUPIED' || t.status === 'BILLING') && !list.some((b) => b.table.includes(t.tableNumber)))
      .forEach((t: TableItem) => {
        list.push({
          id: `tbl-${t.id}`,
          table: t.tableNumber.startsWith('Table') ? t.tableNumber : `Table ${t.tableNumber}`,
          amount: `₹ ${(t.activeBillAmount || 0).toLocaleString('en-IN')}`,
          time: 'Active',
          status: 'Pending',
        });
      });
    if (list.length > 0) return list;
    return (activeBranch?.billRequests || BILL_REQUESTS_DATA) as BillRequest[];
  }, [branchOrders, branchTables, activeBranch?.billRequests]);

  // Toggle Offer Active / Inactive
  const handleToggleOfferStatus = async (id: string) => {
    const updated = offers.map((off) =>
      off.id === id
        ? { ...off, status: (off.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as ('ACTIVE' | 'INACTIVE') }
        : off
    );
    setOffers(updated);
    await saveOffersToStorage(updated);
  };

  // Delete Offer
  const handleDeleteOffer = (id: string) => {
    Alert.alert(
      language === 'mr' ? 'ऑफर हटवा' : language === 'hi' ? 'ऑफ़र हटाएं' : 'Delete Offer',
      language === 'mr'
        ? 'तुम्हाला ही ऑफर हटवायची आहे का?'
        : language === 'hi'
        ? 'क्या आप वाकई इस ऑफ़र को हटाना चाहते हैं?'
        : 'Are you sure you want to remove this promotion?',
      [
        {
          text: language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'mr' ? 'हटवा' : language === 'hi' ? 'हटाएं' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = offers.filter((o) => o.id !== id);
            setOffers(updated);
            await saveOffersToStorage(updated);
            setOfferSuccessToast(
              language === 'mr' ? 'ऑफर हटवली!' : language === 'hi' ? 'ऑफ़र हटा दी गई!' : 'Offer removed!'
            );
            setTimeout(() => setOfferSuccessToast(''), 3000);
          },
        },
      ]
    );
  };

  // Create New Offer
  const handleCreateNewOffer = async () => {
    if (!newOfferName.trim() || !newOfferCode.trim() || !newOfferVal.trim()) {
      Alert.alert(
        language === 'mr' ? 'माहिती अपूर्ण' : language === 'hi' ? 'विवरण अधूरा है' : 'Missing Details',
        language === 'mr'
          ? 'कृपया ऑफरचे नाव, कोड आणि सवलत मूल्य भरा.'
          : language === 'hi'
          ? 'कृपया ऑफ़र का नाम, कोड और छूट मूल्य भरें।'
          : 'Please fill in Offer Name, Code and Discount Value.'
      );
      return;
    }
    const val = parseFloat(newOfferVal) || 0;
    const created: OfferItem = {
      id: 'off-' + Date.now(),
      name: newOfferName.trim(),
      code: newOfferCode.trim().toUpperCase(),
      desc: newOfferDesc.trim() || `${val}${newOfferType === 'PERCENTAGE' ? '%' : '₹'} discount offer.`,
      discountType: newOfferType,
      discountValue: val,
      validFrom: newOfferFrom.trim() || '2026-10-19',
      validTo: newOfferTo.trim() || '2026-11-19',
      status: 'ACTIVE',
      isCustom: true,
    };

    const updated = [created, ...offers];
    setOffers(updated);
    await saveOffersToStorage(updated);

    // Switch back to LIST view to show the new offer immediately
    setOffersViewMode('LIST');
    setShowAddOfferModal(false);
    setShowOfferModal(true);

    // Set fresh defaults for next offer
    setNewOfferName('Special Discount');
    setNewOfferCode('SAVE' + Math.floor(10 + Math.random() * 90));
    setNewOfferDesc('');

    setOfferSuccessToast(
      language === 'mr'
        ? `"${created.name}" ऑफर तयार झाली!`
        : language === 'hi'
        ? `"${created.name}" ऑफ़र बनाई गई!`
        : `"${created.name}" offer created!`
    );
    setTimeout(() => setOfferSuccessToast(''), 3500);

    Alert.alert(
      language === 'mr' ? 'यशस्वी!' : language === 'hi' ? 'सफल!' : 'Success!',
      language === 'mr'
        ? `नवीन ऑफर "${created.name}" (कोड: ${created.code}) तयार झाली असून ग्राहकांसाठी सक्रिय झाली आहे!`
        : language === 'hi'
        ? `नया ऑफ़र "${created.name}" (कोड: ${created.code}) सफलतापूर्वक बनाया गया और अब सक्रिय है!`
        : `New offer "${created.name}" (Code: ${created.code}) created successfully and is now active!`,
      [{ text: language === 'mr' ? 'ऑफर पहा' : language === 'hi' ? 'ऑफ़र देखें' : 'View Offers' }]
    );
  };

  // Plan Activation Handlers
  const handleActivateStarter = () => {
    setPlanType('TRIAL');
    setPlanTitle('28 Days Free Trial');
    setDaysLeft(28);
    setValidityDate('24 Nov 2026');
    setShowPlanModal(false);
    Alert.alert('Subscription Selected', 'Starter (28-Day Free Trial) selected!');
  };

  const handleActivatePro = () => {
    setPlanType('PRO');
    setPlanTitle('Pro Edition');
    setDaysLeft(365);
    setValidityDate('19 Oct 2027');
    setShowPlanModal(false);
    Alert.alert('Subscription Activated', 'Pro Edition (Annual) activated successfully for 1 Year!');
  };

  const handleActivateEnterprise = () => {
    setPlanType('ENTERPRISE');
    setPlanTitle('Enterprise Suite');
    setDaysLeft(365);
    setValidityDate('19 Oct 2027');
    setShowPlanModal(false);
    Alert.alert('Subscription Activated', 'Enterprise Suite (Annual) activated successfully for 1 Year!');
  };

  const branches = [
    { name: 'Main Branch', location: 'Royal Palace Hotel - Pune', sales: '₹ 58,716.26', tables: '12/16' },
    { name: 'City Center Outlet', location: 'Ajalkar Express - Camp', sales: '₹ 32,450.00', tables: '8/10' },
    { name: 'Highway Dining', location: 'Ajalkar Dhaba - Expressway', sales: '₹ 64,120.00', tables: '18/24' },
  ];

  const notifications = [
    { id: '1', title: 'New Bill Request', desc: 'Table 06 requested final bill (₹ 2,499)', time: '2m ago' },
    { id: '2', title: 'KOT Sent', desc: 'Order #KOT-104 dispatched to kitchen for Table 02', time: '5m ago' },
    { id: '3', title: 'Low Inventory Alert', desc: 'Paneer & Butter stock below reorder level (2 kg left)', time: '15m ago' },
    { id: '4', title: 'Payment Received', desc: 'UPI payment of ₹ 1,450 received via PhonePe', time: '25m ago' },
    { id: '5', title: 'Table Cleaned', desc: 'Table 05 sanitized and ready for seating', time: '35m ago' },
  ];

  const activeOffersCount = offers.filter((o) => o.status === 'ACTIVE').length;

  // Localized strings for Festive Offers Card reacting to selected language (en, mr, hi):
  const festiveCardTitle = useMemo(() => {
    if (language === 'mr') return 'नवरात्री विशेष सवलत';
    if (language === 'hi') return 'नवरात्रि विशेष छूट';
    return 'Navratri Festive Special';
  }, [language]);

  const festiveCardDesc = useMemo(() => {
    const countStr = toDevanagari(activeOffersCount);
    if (language === 'mr') return `ग्राहकांसाठी ${countStr} सक्रिय ऑफर्स आणि सवलती उपलब्ध`;
    if (language === 'hi') return `ग्राहकों के लिए ${countStr} सक्रिय ऑफर्स और छूट उपलब्ध`;
    return `${activeOffersCount} active promotions available for customers`;
  }, [language, activeOffersCount, toDevanagari]);

  const viewOffersBtnText = useMemo(() => {
    if (language === 'mr') return 'ऑफर्स पहा →';
    if (language === 'hi') return 'ऑफर्स देखें →';
    return 'View Offers →';
  }, [language]);

  const getLocalizedOfferTitle = useCallback((name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('navratri')) {
      if (language === 'mr') return 'नवरात्री विशेष सवलत';
      if (language === 'hi') return 'नवरात्रि विशेष छूट';
      return 'Navratri Festive Special';
    }
    if (lower.includes('weekend') || lower.includes('family')) {
      if (language === 'mr') return 'वीकेंड फॅमिली फीस्ट';
      if (language === 'hi') return 'वीकेंड फैमिली दावत';
      return 'Weekend Family Feast';
    }
    if (lower.includes('first order') || lower.includes('welcome')) {
      if (language === 'mr') return 'पहिल्या ऑर्डरवर विशेष सवलत';
      if (language === 'hi') return 'पहले ऑर्डर पर विशेष छूट';
      return 'First Order Special';
    }
    return name;
  }, [language]);

  const getLocalizedOfferDesc = useCallback((desc: string) => {
    const lower = (desc || '').toLowerCase();
    if (lower.includes('navratri') || lower.includes('20%')) {
      if (language === 'mr') return 'सर्व डायन-इन आणि पार्सल ऑर्डर्सवर २०% विशेष सवलत.';
      if (language === 'hi') return 'सभी डाइन-इन और पार्सल ऑर्डर पर २०% विशेष छूट.';
      return '20% discount offer on all dine-in and parcel orders.';
    }
    if (lower.includes('family') || lower.includes('10%')) {
      if (language === 'mr') return '₹९९९ वरील सर्व फॅमिली टेबल बिलावर १०% थेट सवलत.';
      if (language === 'hi') return '₹९९९ से अधिक के सभी फैमिली टेबल बिल पर १०% छूट.';
      return 'Flat 10% discount on all family table bills above ₹999.';
    }
    if (lower.includes('first') || lower.includes('100')) {
      if (language === 'mr') return '₹४९९ वरील पहिल्या डिलिव्हरी ऑर्डरवर ₹१०० थेट सवलत.';
      if (language === 'hi') return '₹४९९ से अधिक के पहले डिलीवरी ऑर्डर पर ₹१०० सीधी छूट.';
      return 'Get ₹100 flat discount on first online delivery order above ₹499.';
    }
    return desc;
  }, [language]);

  return (
    <View style={styles.container}>
      {/* ===================================================
          MASTER APP NAVBAR (Responsive Two-Line Layout)
          ("jr thithe jaga purt nel tr eka khali ek asa don line madhe thev")
      =================================================== */}
      <AppNavbar
        navigation={navigation}
        onOpenPlanModal={() => setShowPlanModal(true)}
      />

      {/* ===================================================
          MAIN SCROLLABLE CONTENT
      =================================================== */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EA580C']} />}
      >
        {/* Title Row with Welcome Message and Eye Toggle */}
        <View style={styles.dashboardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardHeading}>{t('overview', 'Dashboard')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.eyeToggleBtn, isOverviewOn && styles.eyeToggleBtnActive]}
            onPress={() => setIsOverviewOn(!isOverviewOn)}
            activeOpacity={0.8}
          >
            {isOverviewOn ? <Eye size={18} color="#EA580C" /> : <EyeOff size={18} color="#94A3B8" />}
          </TouchableOpacity>
        </View>

        {/* Success Toast for Offers */}
        {offerSuccessToast ? (
          <View style={styles.toastCard}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.toastText}>{offerSuccessToast}</Text>
          </View>
        ) : null}

        {/* ===================================================
            28 DAYS FREE TRIAL CARD (Screenshot Style)
        =================================================== */}
        <View style={styles.trialCard}>
          <View style={styles.trialCardLeft}>
            <View style={styles.shieldIconWrap}>
              <ShieldCheck size={22} color="#EA580C" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.trialTitleRow}>
                <Text style={styles.trialTitle}>
                  {planType === 'TRIAL'
                    ? t('freeTrial28Days', '28 Days Free Trial')
                    : planType === 'PRO'
                    ? t('proEdition', 'Pro Edition')
                    : t('enterpriseSuite', 'Enterprise Suite')}
                </Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>● {t('active', 'Active')}</Text>
                </View>
              </View>
              <Text style={styles.trialValidityText}>
                <Text style={{ fontWeight: '700', color: '#44403C' }}>
                  {toDevanagari(daysLeft)} {t('daysLeft', 'Days Left')}
                </Text> • {t('validity', 'VALIDITY')}: {formatDate('2026-10-16', { showDayOfWeek: false })} {t('to', 'to')} {formatDate('2028-11-14', { showDayOfWeek: false })}
              </Text>
            </View>
          </View>

          <View style={styles.trialCardButtons}>
            <TouchableOpacity
              style={styles.managePlanBtn}
              onPress={() => setShowPlanModal(true)}
              activeOpacity={0.85}
            >
              <Sparkles size={13} color="#2563EB" />
              <Text style={styles.managePlanText}>{t('managePlan', 'Manage Plan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.upgradePlanBtn}
              onPress={() => {
                setPlanModalTab('PLANS');
                setShowPlanModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradePlanText}>{t('upgradePlan', 'Upgrade Plan')}</Text>
              <ChevronRight size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>



        {/* ===================================================
            TOP 4 STATISTIC CARDS (Connected to Active Branch)
        =================================================== */}
        {isOverviewOn && (
          <View style={styles.topCardsGrid}>
            {/* Card 1: Today's / Date Filter Sales */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => navigation.navigate('Billing')}
              activeOpacity={0.9}
            >
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F5F4' }]}>
                  <Receipt size={20} color="#1C1917" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.kpiLabel} numberOfLines={1}>{salesCardLabel}</Text>
                  <Text style={styles.kpiValueMain}>{totalSalesDisplay}</Text>
                </View>
              </View>
              <View style={styles.kpiFooterRow}>
                <Text style={styles.kpiFooterLeft}>{t('revenue', 'Revenue')}</Text>
                <Text style={styles.kpiFooterActive}>● {t('active', 'Active')}</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Today's / Date Filter Orders */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => navigation.navigate('Tables')}
              activeOpacity={0.9}
            >
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <ShoppingBag size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.kpiLabel} numberOfLines={1}>{ordersCardLabel}</Text>
                  <Text style={styles.kpiValueMain}>{totalOrdersDisplay}</Text>
                </View>
              </View>
              <View style={styles.kpiFooterRow}>
                <Text style={styles.kpiFooterLeft}>{t('databaseOrders', 'Database Orders')}</Text>
                <Text style={styles.kpiFooterActive}>● {t('active', 'Active')}</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: Available Tables */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => navigation.navigate('Tables')}
              activeOpacity={0.9}
            >
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconCircle, { backgroundColor: '#EAF8EF' }]}>
                  <Grid size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.kpiLabel}>{t('availableTables', 'Available Tables')}</Text>
                  <Text style={[styles.kpiValueMain, { color: '#16A34A' }]}>
                    {availableRatioText}
                  </Text>
                </View>
              </View>
              <View style={styles.kpiFooterRow}>
                <Text style={[styles.kpiFooterLeft, { color: '#16A34A', fontWeight: '700' }]}>
                  {availablePercentText} {t('available', 'Available')}
                </Text>
                <Text style={[styles.kpiFooterActive, { color: '#16A34A' }]}>{t('ready', 'Ready')}</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: Occupied Tables */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => navigation.navigate('Tables')}
              activeOpacity={0.9}
            >
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconCircle, { backgroundColor: '#FEEFEF' }]}>
                  <Grid size={20} color="#E3342F" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.kpiLabel}>{t('occupiedTables', 'Occupied Tables')}</Text>
                  <Text style={[styles.kpiValueMain, { color: '#E3342F' }]}>
                    {occupiedRatioText}
                  </Text>
                </View>
              </View>
              <View style={styles.kpiFooterRow}>
                <Text style={[styles.kpiFooterLeft, { color: '#E3342F', fontWeight: '700' }]}>
                  {occupiedPercentText} {t('occupied', 'Occupied')}
                </Text>
                <Text style={[styles.kpiFooterActive, { color: '#E3342F' }]}>{t('diningNow', 'Dining Now')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================
            SECTION 1: SALES OVERVIEW (TODAY) with Native SVG Line Chart
        =================================================== */}
        {isOverviewOn && (
          <View style={styles.sectionCard}>
            <View>
              <Text style={styles.sectionCardTitle}>
                {t('salesOverview', 'SALES OVERVIEW (TODAY)')} - {getBranchName(language)}
              </Text>
              <Text style={styles.sectionCardSubtitle}>{t('totalSales', 'Total Sales')}</Text>
              <Text style={styles.salesHighlightAmount}>{totalSalesDisplay}</Text>
            </View>

            {/* Native SVG Area & Curved Line Chart */}
            <View style={styles.chartContainer}>
              <Svg width={Math.min(SCREEN_WIDTH - 64, 480)} height={160} viewBox="0 0 320 160">
                <Defs>
                  <LinearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FB923C" stopOpacity="0.45" />
                    <Stop offset="1" stopColor="#FB923C" stopOpacity="0.03" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal Guide Lines */}
                <Line x1="32" y1="20" x2="310" y2="20" stroke="#F5F5F4" strokeDasharray="3, 3" />
                <Line x1="32" y1="55" x2="310" y2="55" stroke="#F5F5F4" strokeDasharray="3, 3" />
                <Line x1="32" y1="90" x2="310" y2="90" stroke="#F5F5F4" strokeDasharray="3, 3" />
                <Line x1="32" y1="125" x2="310" y2="125" stroke="#E7E5E4" strokeWidth="1" />

                {/* Y-Axis Labels */}
                <SvgText x="26" y="24" fontSize="9" fill="#A8A29E" textAnchor="end" fontWeight="600">₹6k</SvgText>
                <SvgText x="26" y="59" fontSize="9" fill="#A8A29E" textAnchor="end" fontWeight="600">₹4k</SvgText>
                <SvgText x="26" y="94" fontSize="9" fill="#A8A29E" textAnchor="end" fontWeight="600">₹2k</SvgText>
                <SvgText x="26" y="129" fontSize="9" fill="#A8A29E" textAnchor="end" fontWeight="600">₹0</SvgText>

                {/* Area Gradient Fill */}
                <Path
                  d="M 35 125 C 80 115, 120 75, 160 50 C 200 30, 240 22, 305 15 L 305 125 Z"
                  fill="url(#salesGrad)"
                />

                {/* Orange Curved Line */}
                <Path
                  d="M 35 125 C 80 115, 120 75, 160 50 C 200 30, 240 22, 305 15"
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Data Points on Line */}
                <Circle cx="35" cy="125" r="3.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2.5" />
                <Circle cx="100" cy="95" r="4" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2.5" />
                <Circle cx="160" cy="50" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />
                <Circle cx="225" cy="30" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />
                <Circle cx="305" cy="15" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />

                {/* X-Axis Time Labels */}
                <SvgText x="35" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">6 AM</SvgText>
                <SvgText x="90" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">9 AM</SvgText>
                <SvgText x="145" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">12 PM</SvgText>
                <SvgText x="200" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">3 PM</SvgText>
                <SvgText x="255" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">6 PM</SvgText>
                <SvgText x="305" y="148" fontSize="9" fill="#78716C" textAnchor="middle" fontWeight="600">9 PM</SvgText>
              </Svg>
            </View>

            {/* 3 Summary Badges */}
            <View style={styles.metricsTripleRow}>
              <View style={styles.metricsBadgeCard}>
                <Text style={styles.metricsBadgeLabel}>{t('avgBillValue', 'Average Bill Value')}</Text>
                <Text style={styles.metricsBadgeValue}>{toDevanagari('₹ 995')}</Text>
              </View>

              <View style={styles.metricsBadgeCard}>
                <Text style={styles.metricsBadgeLabel}>{t('totalCustomers', 'Total Customers')}</Text>
                <Text style={styles.metricsBadgeValue}>{toDevanagari(5)}</Text>
              </View>

              <View style={styles.metricsBadgeCard}>
                <Text style={styles.metricsBadgeLabel}>{t('totalDiscounts', 'Total Discounts')}</Text>
                <Text style={styles.metricsBadgeValue}>{toDevanagari('₹ 157')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ===================================================
            SECTION 2: BILL REQUESTS (Screenshot Style)
        =================================================== */}
        {isOverviewOn && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={styles.sectionCardTitle}>{t('billRequests', 'BILL REQUESTS')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Billing')}>
                <Text style={styles.viewAllOrangeText}>{t('viewAll', 'View All →')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.billRequestsList}>
              {liveBillRequests.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.billRequestItem}
                  onPress={() => navigation.navigate('Billing', { tableNumber: item.table })}
                  activeOpacity={0.85}
                >
                  <View style={styles.billReceiptIconWrap}>
                    <ReceiptRupee size={16} color="#E3342F" strokeWidth={2.2} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.billTableName}>{formatTableName(item.table)}</Text>
                    <Text style={styles.billAmountText}>
                      {t('amount', 'Amount')}: <Text style={{ color: '#1C1917', fontWeight: '700' }}>{toDevanagari(item.amount)}</Text>
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.pendingPill}>
                      <Text style={styles.pendingPillText}>{t('pending', 'Pending')}</Text>
                    </View>
                    <Text style={styles.billTimeText}>{toDevanagari(item.time)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ===================================================
            SECTION 3: PAYMENT SUMMARY (TODAY) with Donut Chart
        =================================================== */}
        {isOverviewOn && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={styles.sectionCardTitle}>{t('paymentSummary', 'PAYMENT SUMMARY (TODAY)')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
                <Text style={styles.viewAllOrangeText}>{t('viewPayments', 'View Payments →')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSummaryBody}>
              {/* SVG Donut Chart */}
              <View style={styles.donutWrap}>
                <Svg width={128} height={128} viewBox="0 0 128 128">
                  {/* Background Ring */}
                  <Circle cx="64" cy="64" r="48" stroke="#F1F5F9" strokeWidth="11" fill="none" />

                  {/* Dynamic Proportional Segments */}
                  {paymentDonutSegments.segments.map((seg) => (
                    <Circle
                      key={seg.key}
                      cx="64"
                      cy="64"
                      r="48"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(${seg.rotation} 64 64)`}
                    />
                  ))}
                </Svg>
                <View style={styles.donutCenterContent} pointerEvents="none">
                  <Text style={styles.donutTotalLabel}>{t('total', 'TOTAL')}</Text>
                  <Text
                    style={[
                      styles.donutTotalNumber,
                      paymentTotalDisplay.length > 13
                        ? { fontSize: 10, letterSpacing: -0.3 }
                        : paymentTotalDisplay.length > 10
                        ? { fontSize: 11 }
                        : { fontSize: 12.5 },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    {paymentTotalDisplay}
                  </Text>
                </View>
              </View>

              {/* Payment Method Breakdown List */}
              <View style={styles.breakdownList}>
                {/* Cash */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelGroup}>
                    <View style={[styles.dotMarker, { backgroundColor: '#16A34A' }]} />
                    <Text style={styles.breakdownName}>{t('cash', 'Cash')}</Text>
                  </View>
                  <View style={styles.breakdownValues}>
                    <Text style={styles.breakdownAmount}>{paymentCashAmount}</Text>
                    <Text style={styles.breakdownPercent}> ({paymentCashPct}%)</Text>
                  </View>
                </View>

                {/* UPI */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelGroup}>
                    <View style={[styles.dotMarker, { backgroundColor: '#2563EB' }]} />
                    <Text style={styles.breakdownName}>{t('upi', 'UPI')}</Text>
                  </View>
                  <View style={styles.breakdownValues}>
                    <Text style={styles.breakdownAmount}>{paymentUpiAmount}</Text>
                    <Text style={styles.breakdownPercent}> ({paymentUpiPct}%)</Text>
                  </View>
                </View>

                {/* Card */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelGroup}>
                    <View style={[styles.dotMarker, { backgroundColor: '#7C3AED' }]} />
                    <Text style={styles.breakdownName}>{t('card', 'Card')}</Text>
                  </View>
                  <View style={styles.breakdownValues}>
                    <Text style={styles.breakdownAmount}>{paymentCardAmount}</Text>
                    <Text style={styles.breakdownPercent}> ({paymentCardPct}%)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Total Collection Footer Card */}
            <View style={styles.totalCollectionStrip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Wallet size={16} color="#D97706" />
                <Text style={styles.totalCollectionLabel}>{t('totalCollection', 'Total Collection')}</Text>
              </View>
              <Text style={styles.totalCollectionNumber}>{paymentTotalDisplay}</Text>
            </View>
          </View>
        )}

        {/* ===================================================
            FESTIVE PROMOTIONAL BANNER (Multi-Language)
        =================================================== */}
        <View style={styles.festiveBannerCard}>
          <View style={styles.festiveBannerLeft}>
            <View style={styles.festiveIconWrap}>
              <Sparkles size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.festiveTitle}>{festiveCardTitle}</Text>
              <Text style={styles.festiveDesc}>{festiveCardDesc}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={styles.viewOffersBtn}
              onPress={() => {
                setOffersViewMode('LIST');
                setShowOfferModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.viewOffersText}>{viewOffersBtnText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ===================================================
          MODAL 1: LICENCE & SUBSCRIPTION (MANAGE PLAN)
          Matching Screenshot 2 + Active Offers Integration
      =================================================== */}
      <Modal visible={showPlanModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#EA580C" />
                <Text style={styles.subModalTitle}>Licence & Subscription</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowPlanModal(false)}
              >
                <X size={16} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Current Status Box (Screenshot 2) */}
              <View style={styles.currentStatusBox}>
                <View style={styles.currentStatusHeader}>
                  <Text style={styles.currentStatusLabel}>{t('currentStatus', 'Current Status')}</Text>
                  <View style={styles.currentStatusActivePill}>
                    <Text style={styles.currentStatusActiveText}>{t('active', 'Active')}</Text>
                  </View>
                </View>

                <Text style={styles.currentStatusTitle}>
                  {planType === 'TRIAL'
                    ? t('freeTrial28Days', '28 Days Free Trial')
                    : planType === 'PRO'
                    ? t('proEdition', 'Pro Edition')
                    : t('enterpriseSuite', 'Enterprise Suite')}
                </Text>
                <Text style={styles.currentStatusSubtitle}>
                  {t('daysRemaining', 'Days Remaining')}: <Text style={{ fontWeight: '700', color: '#1C1917' }}>{toDevanagari(daysLeft)} {t('daysLower', 'days')}</Text> • {t('validTill', 'Valid till')}: <Text style={{ fontWeight: '700', color: '#1C1917' }}>{formatDate('2028-11-14', { showDayOfWeek: false })}</Text>
                </Text>
              </View>

              {/* All 3 Available Subscription Plans */}
              {/* Plan 1: Starter / 28-Day Free Trial */}
              <View style={styles.planOptionCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.planOptionTitle}>{t('starterFreeTrial', 'Starter (Free Trial)')}</Text>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>STARTER</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A', marginTop: 1 }}>{toDevanagari('₹ 0')} <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>/ {toDevanagari(28)} {t('daysLower', 'days')}</Text></Text>
                  <Text style={styles.planOptionDesc}>{t('starterPlanDesc', 'Basic hotel billing, KOT printing, and single counter support.')}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.activateProBtn, planType === 'TRIAL' ? { backgroundColor: '#E2E8F0' } : { backgroundColor: '#10B981' }]}
                  onPress={handleActivateStarter}
                  disabled={planType === 'TRIAL'}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.activateProBtnText, planType === 'TRIAL' && { color: '#64748B' }]}>
                    {planType === 'TRIAL' ? t('currentPlan', 'Current Plan') : t('select', 'Select')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Plan 2: Pro Edition (Annual) */}
              <View style={styles.planOptionCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.planOptionTitle}>{t('proEdition', 'Pro Edition (Annual)')}</Text>
                    <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#0284C7' }}>POPULAR</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7', marginTop: 1 }}>{toDevanagari('₹ 7,999')} <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>/ {t('year', 'year')}</Text></Text>
                  <Text style={styles.planOptionDesc}>{t('proPlanDesc', 'Multi-counter billing, 80mm thermal receipt printing, and WhatsApp receipts.')}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.activateProBtn, planType === 'PRO' && { backgroundColor: '#E2E8F0' }]}
                  onPress={handleActivatePro}
                  disabled={planType === 'PRO'}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.activateProBtnText, planType === 'PRO' && { color: '#64748B' }]}>
                    {planType === 'PRO' ? t('currentPlan', 'Current Plan') : t('activatePro', 'Activate Pro')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Plan 3: Enterprise Suite (Annual) */}
              <View style={[styles.planOptionCard, styles.planOptionCardEnterprise]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.planOptionTitle, { color: '#EA580C' }]}>{t('enterpriseSuite', 'Enterprise Suite (Annual)')}</Text>
                    <View style={{ backgroundColor: '#FFEDD5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#EA580C' }}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#EA580C', marginTop: 1 }}>{toDevanagari('₹ 14,999')} <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>/ {t('year', 'year')}</Text></Text>
                  <Text style={styles.planOptionDesc}>{t('enterprisePlanDesc', 'All Modules, Multi-Branch, GSTR-1/2/3B compliance & Financial Reports.')}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.activateEnterpriseBtn, planType === 'ENTERPRISE' && { backgroundColor: '#E2E8F0' }]}
                  onPress={handleActivateEnterprise}
                  disabled={planType === 'ENTERPRISE'}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.activateEnterpriseBtnText, planType === 'ENTERPRISE' && { color: '#64748B' }]}>
                    {planType === 'ENTERPRISE' ? t('currentPlan', 'Current Plan') : t('activateEnterprise', 'Activate Enterprise')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Modal Bottom Close */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.subModalCloseBtn}
                  onPress={() => setShowPlanModal(false)}
                >
                  <Text style={styles.subModalCloseBtnText}>{t('close', 'Close')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL 2: ACTIVE OFFERS & PROMOTIONS (VIEW OFFERS)
          Matching Screenshot 1 + Add Offers Form
      =================================================== */}
      <Modal visible={showOfferModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            {/* Modal Header */}
            <View style={styles.offersModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.tagIconWrap}>
                  <Tag size={20} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offersModalTitle} numberOfLines={1}>
                    {language === 'mr' ? 'सक्रिय ऑफर्स आणि सवलती' : language === 'hi' ? 'सक्रिय ऑफर्स और छूट' : 'Active Offers & Promotions'}
                  </Text>
                  <Text style={styles.offersModalSubtitle} numberOfLines={1}>
                    {language === 'mr'
                      ? `विशेष सवलती आणि कूपन्स • ${toDevanagari(activeOffersCount)} सक्रिय`
                      : language === 'hi'
                      ? `विशेष छूट और कूपन • ${toDevanagari(activeOffersCount)} सक्रिय`
                      : `Special Discounts & Coupons • ${toDevanagari(activeOffersCount)} Active`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowOfferModal(false)}
              >
                <X size={16} color="#78716C" />
              </TouchableOpacity>
            </View>

            {/* Segmented Switcher Tabs: [📋 View Offers (3)] | [➕ Add New Offer] */}
            <View style={styles.modalSegmentedTabs}>
              <TouchableOpacity
                style={[styles.modalSegmentedTab, offersViewMode === 'LIST' && styles.modalSegmentedTabActive]}
                onPress={() => setOffersViewMode('LIST')}
                activeOpacity={0.85}
              >
                <Tag size={14} color={offersViewMode === 'LIST' ? '#EA580C' : '#64748B'} />
                <Text style={[styles.modalSegmentedTabText, offersViewMode === 'LIST' && styles.modalSegmentedTabTextActive]}>
                  {language === 'mr'
                    ? `ऑफर्स पहा (${toDevanagari(offers.length)})`
                    : language === 'hi'
                    ? `ऑफर्स देखें (${toDevanagari(offers.length)})`
                    : `View Offers (${toDevanagari(offers.length)})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSegmentedTab, offersViewMode === 'ADD' && styles.modalSegmentedTabActive]}
                onPress={() => setOffersViewMode('ADD')}
                activeOpacity={0.85}
              >
                <Plus size={14} color={offersViewMode === 'ADD' ? '#EA580C' : '#64748B'} />
                <Text style={[styles.modalSegmentedTabText, offersViewMode === 'ADD' && styles.modalSegmentedTabTextActive]}>
                  {language === 'mr' ? 'ऑफर जोडा' : language === 'hi' ? 'ऑफर जोड़ें' : 'Add Offer'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* In-Modal Success Alert if newly created */}
            {offerSuccessToast ? (
              <View style={styles.toastCard}>
                <CheckCircle2 size={15} color="#15803D" />
                <Text style={styles.toastText}>{offerSuccessToast}</Text>
              </View>
            ) : null}

            {offersViewMode === 'LIST' ? (
              <>
                {/* Hero Add Offer Banner at the very top of the offers list */}
                <TouchableOpacity
                  style={styles.heroAddOfferBanner}
                  onPress={() => setOffersViewMode('ADD')}
                  activeOpacity={0.85}
                >
                  <View style={styles.heroAddOfferIconCircle}>
                    <Plus size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroAddOfferTitle}>
                      {language === 'mr'
                        ? '+ नवीन ऑफर किंवा सवलत जोडा'
                        : language === 'hi'
                        ? '+ नया ऑफर या छूट जोड़ें'
                        : '+ Create New Offer / Discount'}
                    </Text>
                    <Text style={styles.heroAddOfferSub}>
                      {language === 'mr'
                        ? 'ग्राहकांसाठी प्रोमो कूपन कोड आणि डिस्काउंट तयार करा'
                        : language === 'hi'
                        ? 'ग्राहकों के लिए प्रोमो कूपन कोड और डिस्काउंट बनाएं'
                        : 'Create promo coupon codes and discounts for customers'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#EA580C" />
                </TouchableOpacity>

                {/* Offers List (Matching Screenshot 1) */}
                <ScrollView
                  style={{ maxHeight: 360 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={{ gap: 12, paddingVertical: 4 }}>
                    {offers.map((off) => {
                      const isActive = off.status === 'ACTIVE';
                      const discountLabel = off.discountType === 'PERCENTAGE'
                        ? `${off.discountValue}% OFF`
                        : `₹${off.discountValue} OFF`;

                      return (
                        <View
                          key={off.id}
                          style={[
                            styles.offerCardMain,
                            isActive ? styles.offerCardMainActive : styles.offerCardMainInactive,
                          ]}
                        >
                          {/* Top Row: Pill Tag, Big Orange Value, Deactivate/Activate & Trash */}
                          <View style={styles.offerCardTopRow}>
                            <View style={[styles.offerTagBadge, !isActive && { backgroundColor: '#78716C' }]}>
                              <Text style={styles.offerTagBadgeText}>{discountLabel}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.offerBigValText, !isActive && { color: '#78716C' }]}>
                                {discountLabel}
                              </Text>

                              {/* Deactivate / Activate Button */}
                              <TouchableOpacity
                                style={styles.deactivateBtn}
                                onPress={() => handleToggleOfferStatus(off.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.deactivateBtnText, !isActive && { color: '#15803D' }]}>
                                  {isActive
                                    ? (language === 'mr' ? 'निष्क्रिय करा' : language === 'hi' ? 'निष्क्रिय करें' : 'Deactivate')
                                    : (language === 'mr' ? 'सक्रिय करा' : language === 'hi' ? 'सक्रिय करें' : 'Activate')}
                                </Text>
                              </TouchableOpacity>

                              {/* Delete Trash Button */}
                              <TouchableOpacity
                                style={styles.trashBtn}
                                onPress={() => handleDeleteOffer(off.id)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={13} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Offer Title & Description (Multi-Language) */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.offerCardTitle}>{getLocalizedOfferTitle(off.name)}</Text>
                            {off.isCustom && (
                              <View style={styles.newCustomBadge}>
                                <Text style={styles.newCustomBadgeText}>
                                  {language === 'mr' ? 'नवीन' : language === 'hi' ? 'नया' : 'NEW'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.offerCardDesc}>{getLocalizedOfferDesc(off.desc)}</Text>

                          {/* Bottom Row: Code Pill & Validity Dates */}
                          <View style={styles.offerCardBottomRow}>
                            <View style={styles.codePill}>
                              <Text style={styles.codePillText}>
                                {language === 'mr' ? 'कोड: ' : language === 'hi' ? 'कोड: ' : 'Code: '}
                                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '800' }}>{off.code}</Text>
                              </Text>
                            </View>

                            <Text style={styles.validDatesText}>
                              {language === 'mr' ? 'वैध: ' : language === 'hi' ? 'वैध: ' : 'Valid: '}
                              {toDevanagari(off.validFrom)} {language === 'mr' ? 'ते' : language === 'hi' ? 'से' : 'to'} {toDevanagari(off.validTo)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Bottom Row: Close Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.subModalCloseBtn}
                    onPress={() => setShowOfferModal(false)}
                  >
                    <Text style={styles.subModalCloseBtnText}>
                      {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ADD NEW OFFER FORM (INLINE INSIDE MODAL) */
              <ScrollView
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1C1917' }}>
                    {language === 'mr' ? 'नवीन ऑफर तयार करा' : language === 'hi' ? 'नया ऑफर बनाएं' : 'Create New Offer'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#78716C' }}>
                    {language === 'mr' ? 'ऑफरची माहिती भरा आणि सेव्ह करा' : language === 'hi' ? 'ऑफर का विवरण भरें और सहेजें' : 'Fill in offer details and save'}
                  </Text>
                </View>

                {/* Offer Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {language === 'mr' ? 'ऑफरचे नाव *' : language === 'hi' ? 'ऑफर का नाम *' : 'Offer Name *'}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={language === 'mr' ? 'उदा. Diwali Special 20% Off' : language === 'hi' ? 'उदा. Diwali Special 20% Off' : 'e.g. Diwali Special 20% Off'}
                    placeholderTextColor="#94A3B8"
                    value={newOfferName}
                    onChangeText={setNewOfferName}
                  />
                </View>

                {/* Promo Code */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {language === 'mr' ? 'प्रोमो कूपन कोड *' : language === 'hi' ? 'प्रोमो कूपन कोड *' : 'Promo Coupon Code *'}
                  </Text>
                  <TextInput
                    style={[styles.formInput, { textTransform: 'uppercase', fontWeight: '700' }]}
                    placeholder={language === 'mr' ? 'उदा. FEST2026' : language === 'hi' ? 'उदा. FEST2026' : 'e.g. FEST2026'}
                    placeholderTextColor="#94A3B8"
                    value={newOfferCode}
                    onChangeText={setNewOfferCode}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Discount Type & Value Row */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>
                      {language === 'mr' ? 'सवलत प्रकार *' : language === 'hi' ? 'छूट प्रकार *' : 'Discount Type *'}
                    </Text>
                    <View style={styles.typeSelectorRow}>
                      <TouchableOpacity
                        style={[styles.typeBtn, newOfferType === 'PERCENTAGE' && styles.typeBtnActive]}
                        onPress={() => setNewOfferType('PERCENTAGE')}
                      >
                        <Text style={[styles.typeBtnText, newOfferType === 'PERCENTAGE' && styles.typeBtnTextActive]}>
                          % Off
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeBtn, newOfferType === 'FIXED' && styles.typeBtnActive]}
                        onPress={() => setNewOfferType('FIXED')}
                      >
                        <Text style={[styles.typeBtnText, newOfferType === 'FIXED' && styles.typeBtnTextActive]}>
                          ₹ Flat
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>
                      {language === 'mr'
                        ? `सवलत मूल्य * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`
                        : language === 'hi'
                        ? `छूट मूल्य * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`
                        : `Discount Value * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={newOfferType === 'PERCENTAGE' ? '20' : '150'}
                      placeholderTextColor="#94A3B8"
                      value={newOfferVal}
                      onChangeText={setNewOfferVal}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Applicable Category */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {language === 'mr' ? 'लागू विभाग' : language === 'hi' ? 'लागू श्रेणी' : 'Applicable Category'}
                  </Text>
                  <View style={styles.categorySelectorRow}>
                    {[
                      { id: 'All Menu Items', en: 'All Menu Items', mr: 'सर्व मेनू आयटम्स', hi: 'सभी मेनू' },
                      { id: 'Dine-In', en: 'Dine-In', mr: 'डाइन-इन', hi: 'डाइन-इन' },
                      { id: 'Online Delivery', en: 'Online Delivery', mr: 'ऑनलाइन डिलिव्हरी', hi: 'ऑनलाइन डिलीवरी' },
                      { id: 'Beverages', en: 'Beverages', mr: 'पेये', hi: 'पेय पदार्थ' },
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryPillBtn, newOfferCategory === cat.id && styles.categoryPillBtnActive]}
                        onPress={() => setNewOfferCategory(cat.id)}
                      >
                        <Text style={[styles.categoryPillText, newOfferCategory === cat.id && styles.categoryPillTextActive]}>
                          {language === 'mr' ? cat.mr : language === 'hi' ? cat.hi : cat.en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {language === 'mr' ? 'वर्णन' : language === 'hi' ? 'विवरण' : 'Description'}
                  </Text>
                  <TextInput
                    style={[styles.formInput, { height: 50 }]}
                    placeholder={
                      language === 'mr'
                        ? 'उदा. सर्व जेवणाच्या बिलावर 20% विशेष सवलत.'
                        : language === 'hi'
                        ? 'उदा. सभी भोजन बिलों पर 20% विशेष छूट।'
                        : 'e.g. 20% special discount on all food orders.'
                    }
                    placeholderTextColor="#94A3B8"
                    value={newOfferDesc}
                    onChangeText={setNewOfferDesc}
                    multiline
                  />
                </View>

                {/* Validity Dates */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>
                      {language === 'mr' ? 'सुरुवात तारीख' : language === 'hi' ? 'प्रारंभ तिथि' : 'Start Date'}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={newOfferFrom}
                      onChangeText={setNewOfferFrom}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>
                      {language === 'mr' ? 'समाप्ती तारीख' : language === 'hi' ? 'समाप्ति तिथि' : 'End Date'}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={newOfferTo}
                      onChangeText={setNewOfferTo}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.subModalCloseBtn, { flex: 1, alignItems: 'center' }]}
                    onPress={() => setOffersViewMode('LIST')}
                  >
                    <Text style={styles.subModalCloseBtnText}>
                      {language === 'mr' ? 'मागे जा' : language === 'hi' ? 'वापस जाएं' : 'Back'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveOfferSubmitBtn, { flex: 2 }]}
                    onPress={handleCreateNewOffer}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveOfferSubmitBtnText}>
                      {language === 'mr' ? '💾 सेव्ह करा' : language === 'hi' ? '💾 सहेजें' : '💾 Save & Publish'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================================================
          MODAL 3: DIRECT ADD OFFER FALLBACK
      =================================================== */}
      <Modal visible={showAddOfferModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Plus size={20} color="#EA580C" />
                <Text style={styles.subModalTitle}>
                  {language === 'mr' ? 'नवीन ऑफर तयार करा' : language === 'hi' ? 'नया ऑफ़र बनाएं' : 'Create New Offer'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setShowAddOfferModal(false);
                  setShowOfferModal(true);
                  setOffersViewMode('LIST');
                }}
              >
                <X size={16} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {language === 'mr' ? 'ऑफरचे नाव *' : language === 'hi' ? 'ऑफ़र का नाम *' : 'Offer Name *'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={language === 'mr' ? 'उदा. Navratri Festive Special' : language === 'hi' ? 'उदा. Navratri Festive Special' : 'e.g. Navratri Festive Special'}
                  placeholderTextColor="#94A3B8"
                  value={newOfferName}
                  onChangeText={setNewOfferName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {language === 'mr' ? 'प्रोमो कूपन कोड *' : language === 'hi' ? 'प्रोमो कूपन कोड *' : 'Promo Coupon Code *'}
                </Text>
                <TextInput
                  style={[styles.formInput, { textTransform: 'uppercase' }]}
                  placeholder={language === 'mr' ? 'उदा. NAV2026' : language === 'hi' ? 'उदा. NAV2026' : 'e.g. NAV2026'}
                  placeholderTextColor="#94A3B8"
                  value={newOfferCode}
                  onChangeText={setNewOfferCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>
                    {language === 'mr' ? 'सवलत प्रकार *' : language === 'hi' ? 'छूट प्रकार *' : 'Discount Type *'}
                  </Text>
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, newOfferType === 'PERCENTAGE' && styles.typeBtnActive]}
                      onPress={() => setNewOfferType('PERCENTAGE')}
                    >
                      <Text style={[styles.typeBtnText, newOfferType === 'PERCENTAGE' && styles.typeBtnTextActive]}>
                        % Off
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, newOfferType === 'FIXED' && styles.typeBtnActive]}
                      onPress={() => setNewOfferType('FIXED')}
                    >
                      <Text style={[styles.typeBtnText, newOfferType === 'FIXED' && styles.typeBtnTextActive]}>
                        ₹ Flat
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>
                    {language === 'mr'
                      ? `सवलत मूल्य * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`
                      : language === 'hi'
                      ? `छूट मूल्य * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`
                      : `Discount Value * (${newOfferType === 'PERCENTAGE' ? '%' : '₹'})`}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="20"
                    placeholderTextColor="#94A3B8"
                    value={newOfferVal}
                    onChangeText={setNewOfferVal}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveOfferSubmitBtn}
                onPress={handleCreateNewOffer}
                activeOpacity={0.85}
              >
                <Text style={styles.saveOfferSubmitBtnText}>
                  {language === 'mr' ? '💾 सेव्ह करा' : language === 'hi' ? '💾 सहेजें' : '💾 Save & Publish Offer'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL 4: NOTIFICATIONS (9+ ALERTS)
      =================================================== */}
      <Modal visible={showNotificationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="#EA580C" />
                <Text style={styles.subModalTitle}>{t('restaurantAlerts', 'Restaurant Alerts')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowNotificationModal(false)}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {notifications.map((n) => (
                <View key={n.id} style={styles.notifItem}>
                  <View style={styles.notifDot} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.notifTitle}>{translateNotifTitle(n.title, language)}</Text>
                      <Text style={styles.notifTime}>{translateNotifTime(n.time, language)}</Text>
                    </View>
                    <Text style={styles.notifDesc}>{translateNotifDesc(n.desc, language)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity
                style={styles.subModalCloseBtn}
                onPress={() => setShowNotificationModal(false)}
              >
                <Text style={styles.subModalCloseBtnText}>{t('close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL 5: BRANCH SWITCHER
      =================================================== */}
      <Modal visible={showBranchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#EA580C" />
                <Text style={styles.subModalTitle}>Select Active Branch</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowBranchModal(false)}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {branches.map((b, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.branchSelectCard, selectedBranch === b.name && styles.branchSelectCardActive]}
                onPress={() => {
                  setSelectedBranch(b.name);
                  setShowBranchModal(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.branchSelectName}>{b.name}</Text>
                  <Text style={styles.branchSelectLocation}>{b.location}</Text>
                  <Text style={styles.branchSelectStats}>Today: {b.sales} • Tables: {b.tables}</Text>
                </View>
                {selectedBranch === b.name && <CheckCircle2 size={18} color="#EA580C" />}
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity
                style={styles.subModalCloseBtn}
                onPress={() => setShowBranchModal(false)}
              >
                <Text style={styles.subModalCloseBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },

  /* Brand Top Header */
  topBrandBar: {
    backgroundColor: '#431407', // Deep brand terracotta/brown
    paddingTop: Platform.OS === 'android' ? 36 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  topBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#FED7AA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBrandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  profileTextWrap: {
    maxWidth: 80,
  },
  profileHotelName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profileRole: {
    color: '#FED7AA',
    fontSize: 9,
  },

  /* Sub Header Ribbon */
  subHeaderRibbon: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE1',
    paddingVertical: 8,
  },
  ribbonScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ribbonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  ribbonPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  trialRibbonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  trialRibbonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  renewBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  renewBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Scrollable Content */
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Dashboard Header */
  dashboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dashboardHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  boldUsername: {
    fontWeight: '700',
    color: '#1C1917',
  },
  eyeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeToggleBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },

  /* Toast */
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },

  /* Trial Card */
  trialCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#EA580C',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  trialCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  trialValidityText: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  trialCardButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  managePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  managePlanText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  upgradePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#EA580C',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  upgradePlanText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Top 4 KPI Cards */
  topCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#57534E',
  },
  kpiValueMain: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  kpiFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FAFAF9',
  },
  kpiFooterLeft: {
    fontSize: 10,
    color: '#78716C',
  },
  kpiFooterActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },

  /* Section Cards */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: 0.4,
  },
  sectionCardSubtitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  salesHighlightAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  chartContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  metricsTripleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricsBadgeCard: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  metricsBadgeLabel: {
    fontSize: 9,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
  },
  metricsBadgeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginTop: 2,
  },

  /* Bill Requests */
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllOrangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  billRequestsList: {
    gap: 8,
  },
  billRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#F5F5F4',
    borderRadius: 10,
    padding: 10,
  },
  billReceiptIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTableName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  billAmountText: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pendingPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  billTimeText: {
    fontSize: 9,
    color: '#A8A29E',
    marginTop: 3,
  },

  /* Payment Summary Donut & Breakdown */
  paymentSummaryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  donutWrap: {
    width: 128,
    height: 128,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  donutCenterContent: {
    position: 'absolute',
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotalLabel: {
    fontSize: 9,
    color: '#78716C',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  donutTotalNumber: {
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  breakdownList: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dotMarker: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  breakdownName: {
    fontSize: 12,
    color: '#44403C',
    fontWeight: '600',
  },
  breakdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  breakdownPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  totalCollectionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  totalCollectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  totalCollectionNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
  },

  /* Festive Banner */
  festiveBannerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  festiveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  festiveIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  festiveTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  festiveDesc: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 1,
  },
  viewOffersBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewOffersText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
  },

  /* Operations & Modules Grid */
  modulesSection: {
    marginTop: 6,
    marginBottom: 10,
  },
  modulesHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleItemBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EBE1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moduleItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  moduleItemDesc: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },

  /* Modals Base */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalCloseBtn: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subModalCloseBtnText: {
    color: '#44403C',
    fontWeight: '700',
    fontSize: 12,
  },

  /* Plan Modal Tabs (Licence vs Offers) */
  planModalTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  planModalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planModalTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  planModalTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  planModalTabTextActive: {
    color: '#EA580C',
  },
  planUpgradeCallout: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planUpgradeCalloutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planUpgradeCalloutText: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '600',
    flex: 1,
  },
  planUpgradeCalloutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  planUpgradeCalloutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  categorySelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  categoryPillBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  categoryPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryAddOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryAddOfferBtnText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '700',
  },

  /* =========================================
     MODAL 1: LICENCE & SUBSCRIPTION STYLES (Screenshot 2)
  ========================================= */
  currentStatusBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStatusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
  },
  currentStatusActivePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentStatusActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  currentStatusTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA580C',
    marginTop: 6,
  },
  currentStatusSubtitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 4,
  },
  planOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  planOptionCardEnterprise: {
    backgroundColor: '#FFFDFC',
    borderColor: '#FED7AA',
  },
  planOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  planOptionDesc: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
    lineHeight: 14,
  },
  activateProBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  activateProBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  activateEnterpriseBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  activateEnterpriseBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* =========================================
     MODAL 2: OFFERS MODAL STYLES (Screenshot 1)
  ========================================= */
  offersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  tagIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  offersModalSubtitle: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 1,
  },
  addOffersHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addOffersHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Offer Card In Modal (Screenshot 1) */
  offerCardMain: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  offerCardMainActive: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FED7AA',
  },
  offerCardMainInactive: {
    backgroundColor: '#FAFAF9',
    borderColor: '#E7E5E4',
    opacity: 0.65,
  },
  offerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  offerTagBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  offerTagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerBigValText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
  },
  deactivateBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deactivateBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  trashBtn: {
    backgroundColor: '#FEE2E2',
    padding: 4,
    borderRadius: 5,
  },
  offerCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 2,
  },
  offerCardDesc: {
    fontSize: 11,
    color: '#57534E',
    marginTop: 2,
  },
  offerCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEEAD8',
  },
  codePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  validDatesText: {
    fontSize: 9,
    color: '#78716C',
  },

  /* =========================================
     MODAL 3: CREATE NEW OFFER FORM STYLES
  ========================================= */
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  saveOfferSubmitBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveOfferSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  directAddOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  directAddOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalSegmentedTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  modalSegmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSegmentedTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  modalSegmentedTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  modalSegmentedTabTextActive: {
    color: '#EA580C',
  },
  heroAddOfferBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroAddOfferIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAddOfferTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
  },
  heroAddOfferSub: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 1,
  },
  newCustomBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newCustomBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },

  /* Notifications */
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    marginTop: 4,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  notifTime: {
    fontSize: 9,
    color: '#94A3B8',
  },
  notifDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Branch Select */
  branchSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  branchSelectCardActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  branchSelectName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  branchSelectLocation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  branchSelectStats: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
    marginTop: 3,
  },

  /* Active Date Filter Banner (Web Dashboard Screenshot Match) */
  activeDateFilterBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 240,
  },
  calendarIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dateFilterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  dateBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateFilterDesc: {
    fontSize: 11,
    color: '#7C2D12',
    marginTop: 2,
  },
  showTodayBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'center',
  },
  showTodayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
