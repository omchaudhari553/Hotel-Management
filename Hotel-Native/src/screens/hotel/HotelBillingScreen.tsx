import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  restaurantStore,
  ActiveOrder,
  KOTOrderItem,
  MenuItemData,
} from '../../api/restaurantStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import { useBranch } from '../../context/BranchContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  printCustomerBill,
  printCustomerBill80mm,
  printCustomerBill58mm,
  printCustomerBillA4,
  printCustomerBillDirectBluetooth,
  printCustomerBillWifi,
  printCustomerBillUsb,
  shareCustomerBillPdf,
  PrintFormat,
  BillPrintData,
} from '../../utils/thermalPrinter';
import { UniversalInvoicePrintData } from '../../types/printing';
import { MobilePrintInvoiceModal } from '../../components/MobilePrintInvoiceModal';
import { NativePrinterManager, PrinterConfig } from '../../services/nativePrinterManager';
import { shareTextToWhatsApp } from '../../utils/reportExporter';
import { notificationManager } from '../../utils/notificationManager';
import {
  IndianRupee,
  Receipt,
  Search,
  CheckCircle2,
  Check,
  Clock,
  UtensilsCrossed,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  ExternalLink,
  Share2,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Sparkles,
  Tag,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Building2,
  Wifi,
  Bluetooth,
  Usb,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HotelBillingScreen: React.FC<{ route?: any; navigation?: any }> = ({
  route,
  navigation,
}) => {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const insets = useSafeAreaInsets();
  const {
    t,
    language,
    formatDate,
    formatTime,
    formatNumber,
    toDevanagari,
    translateStatus,
    localizeGuestName,
    formatTableName,
    getLocalizedMenuItemName,
  } = useLanguage();
  const { activeBranch, activeBranchNumId } = useBranch();
  const [orders, setOrders] = useState<ActiveOrder[]>(() =>
    restaurantStore.getCachedOrders(activeBranchNumId)
  );
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  // Step 2 Form States
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [orderItemsList, setOrderItemsList] = useState<KOTOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 3 Invoice
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState<string>('');
  const [finalPaidOrder, setFinalPaidOrder] = useState<ActiveOrder | null>(null);

  // Success Confirmation Pop-up Modal State
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successPaymentData, setSuccessPaymentData] = useState<{
    invoiceNumber: string;
    amount: number;
    tableName: string;
    customer: string;
    paymentMode: 'CASH' | 'UPI' | 'CARD';
    date: string;
    time: string;
    referenceNo?: string;
  } | null>(null);

  // Add Item to Bill Modal
  const [addItemModalVisible, setAddItemModalVisible] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => restaurantStore.getMenuItems());
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [showAddMenuModal, setShowAddMenuModal] = useState<boolean>(false);
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<string>('Main Course');
  const [newDishPrice, setNewDishPrice] = useState<string>('200');

  const handleCreateMenuItem = async () => {
    if (!newDishName.trim()) {
      Alert.alert(t('missingName', 'Missing Name'), t('enterDishName', 'Please enter dish name.'));
      return;
    }
    const priceNum = parseFloat(newDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t('invalidPrice', 'Invalid Price'), t('enterValidPrice', 'Please enter a valid price.'));
      return;
    }
    const created = await restaurantStore.addMenuItem({
      name: newDishName.trim(),
      category: newDishCategory,
      price: priceNum,
    });
    setMenuItems(restaurantStore.getMenuItems());
    setShowAddMenuModal(false);
    setNewDishName('');
    setNewDishPrice('200');
    Alert.alert(t('dishAdded', 'Dish Added'), `${created.name} added to menu.`);
  };

  // Quick Walk-in Bill Modal
  const [quickBillModalVisible, setQuickBillModalVisible] = useState<boolean>(false);
  const [quickTableName, setQuickTableName] = useState<string>('Table 01');
  const [quickGuestName, setQuickGuestName] = useState<string>('Walk-in Guest');

  // Print Format & Modal State (80mm, 58mm, A4)
  const [printFormatModalVisible, setPrintFormatModalVisible] = useState<boolean>(false);
  const [selectedPrintFormat, setSelectedPrintFormat] = useState<PrintFormat>('80mm');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);
  const [printModalVisible, setPrintModalVisible] = useState<boolean>(false);
  const [printModalData, setPrintModalData] = useState<UniversalInvoicePrintData | null>(null);

  // Track if we already handled incoming route params so they don't overwrite manual clicks
  const handledParamKeyRef = useRef<string>('');
  const lastHandledParamsObjRef = useRef<any>(null);
  const routeParamsRef = useRef<any>(route?.params);
  routeParamsRef.current = route?.params;
  const openedFromParamsAtRef = useRef<number>(0);
  const topUnpaidOrderIdRef = useRef<string>('');
  const selectedOrderRef = useRef<ActiveOrder | null>(selectedOrder);
  selectedOrderRef.current = selectedOrder;
  const finalPaidOrderRef = useRef<ActiveOrder | null>(finalPaidOrder);
  finalPaidOrderRef.current = finalPaidOrder;
  const showSuccessModalRef = useRef<boolean>(showSuccessModal);
  showSuccessModalRef.current = showSuccessModal;
  const lastLiveOrdersFetchRef = useRef<number>(0);

  const getOrderSortTs = useCallback((o: ActiveOrder): number => {
    if (o.createdAtMs && o.createdAtMs > 0) return o.createdAtMs;
    const idMatch = String(o.id || '').match(/(1\d{12})/);
    if (idMatch) return Number(idMatch[1]) || 0;
    const ordMatch = String(o.orderNumber || '').match(/(1\d{12})/);
    if (ordMatch) return Number(ordMatch[1]) || 0;
    return 0;
  }, []);

  // 0ms synchronous cache sync (updates list + keeps temp->real IDs & invoiceNumber synced without HTTP traffic)
  const syncFromCache = useCallback(() => {
    const cached = restaurantStore.getCachedOrders(activeBranchNumId) || [];
    setOrders(cached);

    // Ensure Page 1 displays automatically if a brand-new unpaid order just arrived at the top
    const unpaid = cached.filter((o) => o.status !== 'PAID');
    if (unpaid.length > 0) {
      const sortedTop = [...unpaid].sort((a, b) => getOrderSortTs(b) - getOrderSortTs(a))[0];
      if (sortedTop && sortedTop.id !== topUnpaidOrderIdRef.current) {
        topUnpaidOrderIdRef.current = sortedTop.id;
        setCurrentPage(1);
      }
    }

    // Silently keep active Step 2 selectedOrder updated if temp ID reconciled to real ID
    const currSel = selectedOrderRef.current;
    if (currSel) {
      const resolvedSelId = restaurantStore.resolveOrderId(currSel.id);
      if (resolvedSelId !== currSel.id) {
        const reconciled = cached.find((o) => o.id === resolvedSelId);
        if (reconciled) {
          setSelectedOrder((prev) => (prev && prev.id === currSel.id ? { ...prev, id: reconciled.id, orderNumber: reconciled.orderNumber } : prev));
        }
      }
    }

    // Silently reconcile authoritative invoiceNumber on open Success Modal if backend returned it
    const currPaid = finalPaidOrderRef.current;
    if (showSuccessModalRef.current && currPaid) {
      const resolvedPaidId = restaurantStore.resolveOrderId(currPaid.id);
      const matched = cached.find((o) => o.id === currPaid.id || o.id === resolvedPaidId);
      if (matched?.invoiceNumber && matched.invoiceNumber !== currPaid.invoiceNumber) {
        const officialInv = matched.invoiceNumber;
        setGeneratedInvoiceNumber(officialInv);
        setFinalPaidOrder((prev) => (prev ? { ...prev, id: matched.id, invoiceNumber: officialInv } : prev));
        setSuccessPaymentData((prev) => (prev ? { ...prev, invoiceNumber: officialInv } : prev));
      }
    }
  }, [activeBranchNumId, getOrderSortTs]);

  const normalizeBillingItems = useCallback((order: ActiveOrder): KOTOrderItem[] => {
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const normalized: KOTOrderItem[] = rawItems
      .map((item: any) => {
        const qty = Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1);
        const unitPrice =
          Number(item?.price ?? item?.unitPrice ?? 0) ||
          Number(item?.totalPrice ?? item?.total ?? 0) / qty ||
          0;
        const cleanPrice = Math.round(unitPrice * 100) / 100;
        return {
          name: String(item?.name || item?.itemName || item?.description || 'Order Item'),
          quantity: qty,
          price: cleanPrice,
          ...(item?.notes ? { notes: String(item.notes) } : {}),
        };
      })
      .filter((it) => it.quantity > 0);

    const targetSub = Number(order.subtotal) > 0
      ? Number(order.subtotal)
      : (Number(order.total) > 0 ? Math.round(Number(order.total) / 1.05) : 0);
    const sumPrice = normalized.reduce((sum, it) => sum + it.price * it.quantity, 0);

    if (normalized.length === 0 || (sumPrice === 0 && targetSub > 0)) {
      const baseAmt = targetSub > 0 ? targetSub : Math.round((Number(order.total) / 1.05) * 100) / 100;
      return [
        {
          name: `${order.tableNumber || 'Table'} Order Items`,
          quantity: 1,
          price: Math.max(0, baseAmt),
        },
      ];
    }
    return normalized;
  }, []);

  // Synchronous order selection helper (zero click latency)
  const selectOrderImmediately = useCallback(
    (order: ActiveOrder, step: 1 | 2 | 3 = 2) => {
      const itemsCopy = normalizeBillingItems(order);
      const safeOrder: ActiveOrder = {
        ...order,
        items: itemsCopy,
      };
      setSelectedOrder(safeOrder);
      setOrderItemsList(itemsCopy);
      setDiscountInput(safeOrder.discountAmount ? String(safeOrder.discountAmount) : '0');
      setPaymentMode('CASH');
      setCurrentStep(step);
      if (safeOrder.status !== 'PAID' && step !== 3) {
        restaurantStore.markOrderForBilling(safeOrder.id, activeBranchNumId).catch(console.warn);
      }
    },
    [activeBranchNumId, normalizeBillingItems]
  );

  const handleIncomingRouteParams = useCallback(() => {
    const params = routeParamsRef.current;
    if (!params) return false;

    const orderIdParam = params.orderId ? String(params.orderId) : undefined;
    const tableParam = params.tableNumber
      ? String(params.tableNumber)
      : params.table
      ? String(params.table)
      : undefined;
    const stepParam = params.step;
    const navTsParam = params._navTs;
    const paramKey = `${orderIdParam || ''}_${tableParam || ''}_${stepParam || ''}_${navTsParam || ''}`;

    if (
      (orderIdParam || tableParam) &&
      (paramKey !== handledParamKeyRef.current || lastHandledParamsObjRef.current !== params)
    ) {
      handledParamKeyRef.current = paramKey;
      lastHandledParamsObjRef.current = params;
      openedFromParamsAtRef.current = Date.now();
      const targetStep: 1 | 2 | 3 = stepParam ? (stepParam as 1 | 2 | 3) : 2;
      const includePaid = targetStep === 3;
      const syncFound = restaurantStore.getOrderByIdOrTableSync(
        orderIdParam,
        tableParam,
        activeBranchNumId,
        includePaid
      );
      if (syncFound) {
        selectOrderImmediately(syncFound, targetStep);
      } else {
        const rawBillAmt = Number(String(params.billAmount ?? '').replace(/[^0-9.]/g, '')) || 0;
        const ensureAndSelectFallback = () => {
          if (targetStep === 3 || (!tableParam && !orderIdParam)) return;
          const ensured = restaurantStore.ensureBillingOrderForTableName(
            tableParam || 'Table',
            params.guestName ? String(params.guestName) : undefined,
            rawBillAmt,
            orderIdParam,
            activeBranchNumId
          );
          syncFromCache();
          selectOrderImmediately(ensured, targetStep);
        };
        restaurantStore
          .getOrderByIdOrTable(orderIdParam, tableParam, activeBranchNumId, includePaid)
          .then((found) => {
            if (found) {
              selectOrderImmediately(found, targetStep);
            } else {
              ensureAndSelectFallback();
            }
          })
          .catch(ensureAndSelectFallback);
      }
      return true;
    }

    if (params.resetStepTs && lastHandledParamsObjRef.current !== params) {
      lastHandledParamsObjRef.current = params;
      handledParamKeyRef.current = '';
      setSelectedOrder(null);
      setCurrentStep(1);
      setCurrentPage(1);
      return true;
    }

    return false;
  }, [activeBranchNumId, selectOrderImmediately, syncFromCache]);

  const loadData = useCallback(
    async (checkParams: boolean = true) => {
      // 1. Instant sync from memory cache so screen renders in 0ms
      syncFromCache();

      // 2. Check navigation params IMMEDIATELY from memory BEFORE awaiting any network calls!
      if (checkParams) {
        handleIncomingRouteParams();
      }

      // 3. Non-blocking background fetch (deduplicated at store level)
      lastLiveOrdersFetchRef.current = Date.now();
      try {
        const list = await restaurantStore.getOrders(activeBranchNumId);
        if (Array.isArray(list)) {
          setOrders(list);
        }
      } catch { }
    },
    [activeBranchNumId, handleIncomingRouteParams, syncFromCache]
  );

  // Initial Load & Fast 0ms Store Subscription
  useEffect(() => {
    loadData(true);
    restaurantStore.loadMenuItemsFromBackend().then((items) => {
      if (items && items.length > 0) setMenuItems(items);
    }).catch(() => { });

    // Store updates immediately sync from memory cache in 0ms without triggering HTTP storms
    const unsubscribeStore = restaurantStore.subscribe(syncFromCache);
    const unsubscribeFocus = navigation?.addListener?.('focus', () => {
      handleIncomingRouteParams();
      syncFromCache();
      if (Date.now() - lastLiveOrdersFetchRef.current >= 2500) {
        loadData(false);
      }
    });
    const interval = setInterval(() => {
      if (Date.now() - lastLiveOrdersFetchRef.current >= 4500) {
        loadData(false);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId, loadData, syncFromCache, handleIncomingRouteParams]);

  // Re-check when route params change (0ms synchronous resolution first)
  useEffect(() => {
    handleIncomingRouteParams();
  }, [route?.params, handleIncomingRouteParams]);

  // Active records count
  const activeRecordsCount = orders.filter((o) => o.status !== 'PAID').length;

  // Filtered orders: Keep only UNPAID bills in Billing (PAID bills automatically move to Payments), newest first, deduplicated
  const filteredOrders = useMemo(() => {
    const seen = new Set<string>();
    return orders
      .filter((o) => {
        if (!o) return false;
        if (o.status === 'PAID') return false;
        const normalizedId = String(o.id || o.orderNumber || '').trim();
        if (normalizedId && seen.has(normalizedId)) return false;
        if (normalizedId) seen.add(normalizedId);

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = (o.id || '').toLowerCase().includes(q);
          const matchCust = (o.customer || '').toLowerCase().includes(q);
          const matchTable = (o.tableNumber || '').toLowerCase().includes(q);
          if (!matchId && !matchCust && !matchTable) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort newest created orders/KOTs first so new table bills ALWAYS appear at the top of Page 1
        const tsA = getOrderSortTs(a);
        const tsB = getOrderSortTs(b);
        if (tsA !== tsB) return tsB - tsA;

        const parseId = (id: string) => {
          const digits = (id || '').replace(/\D/g, '');
          const n = digits ? parseInt(digits, 10) : 0;
          return n < 1000000000 ? n : 0;
        };
        const idA = parseId(a.id);
        const idB = parseId(b.id);
        if (idA !== idB) return idB - idA;

        return (b.orderNumber || '').localeCompare(a.orderNumber || '');
      });
  }, [orders, searchQuery, getOrderSortTs]);

  // Pagination calculations (memoized)
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  }, [filteredOrders, safePage]);

  // Calculate live numbers in Step 2 based on orderItemsList & discountInput
  const calculatedSubtotal = orderItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculatedTax = Math.round(calculatedSubtotal * 0.05);
  const calculatedCGST = (calculatedTax / 2).toFixed(2);
  const calculatedSGST = (calculatedTax / 2).toFixed(2);
  const rawDiscount = parseFloat(discountInput) || 0;
  const calculatedGrandTotal = Math.max(0, calculatedSubtotal + calculatedTax - rawDiscount);

  // Update item quantity in Step 2 (+ / -)
  const handleUpdateItemQtyInBill = (index: number, delta: number) => {
    const updated = [...orderItemsList];
    const current = updated[index];
    const nextQty = current.quantity + delta;

    if (nextQty <= 0) {
      if (updated.length === 1) {
        Alert.alert(
          language === 'mr' ? 'किमान १ पदार्थ' : language === 'hi' ? 'कम से कम १ वस्तु' : 'Minimum 1 Item',
          language === 'mr' ? 'बिलामध्ये किमान १ पदार्थ असणे आवश्यक आहे.' : language === 'hi' ? 'बिल में कम से कम १ वस्तु होनी चाहिए।' : 'At least 1 item is required in the bill.'
        );
        return;
      }
      updated.splice(index, 1);
    } else {
      updated[index] = { ...current, quantity: nextQty };
    }

    setOrderItemsList(updated);
    if (selectedOrder) {
      restaurantStore.updateOrderItems(selectedOrder.id, updated).catch(console.warn);
    }
  };

  // Add extra item to current bill
  const handleAddDishToBill = (menuItem: MenuItemData) => {
    const existingIndex = orderItemsList.findIndex((i) => i.name.toLowerCase() === menuItem.name.toLowerCase());
    let updated: KOTOrderItem[];

    if (existingIndex >= 0) {
      updated = [...orderItemsList];
      updated[existingIndex].quantity += 1;
    } else {
      updated = [...orderItemsList, { name: menuItem.name, quantity: 1, price: menuItem.price }];
    }

    setOrderItemsList(updated);
    if (selectedOrder) {
      restaurantStore.updateOrderItems(selectedOrder.id, updated).catch(console.warn);
    }
  };

  // Quick discount buttons
  const applyQuickDiscount = (amount: number) => {
    setDiscountInput(String(amount));
  };

  const applyPercentDiscount = (percent: number) => {
    const disc = Math.round((calculatedSubtotal * percent) / 100);
    setDiscountInput(String(disc));
  };

  // Action: Finalize Bill & Pay with Celebratory Confirmation Pop-up
  const handleFinalizeBillAndPay = async () => {
    if (!selectedOrder || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const disc = parseFloat(discountInput) || 0;
      const effectiveItems = orderItemsList.length > 0 && orderItemsList.some((it) => it.price > 0)
        ? orderItemsList
        : normalizeBillingItems(selectedOrder);

      const { invoiceNumber, paidOrder, paymentRecord } = await restaurantStore.finalizeBillAndPay(
        selectedOrder.id,
        paymentMode,
        disc,
        activeBranchNumId,
        { items: effectiveItems, orderSnapshot: selectedOrder }
      );
      setGeneratedInvoiceNumber(invoiceNumber);
      setFinalPaidOrder(paidOrder);
      const paidAmt = Number(paidOrder.total) > 0
        ? paidOrder.total
        : Number(calculatedSubtotal + Number(calculatedTax) - disc) > 0
          ? Number(calculatedSubtotal + Number(calculatedTax) - disc)
          : Number(selectedOrder.total) || 0;

      setSuccessPaymentData({
        invoiceNumber,
        amount: paidAmt,
        tableName: paidOrder.tableNumber || selectedOrder.tableNumber,
        customer: paidOrder.customer || selectedOrder.customer,
        paymentMode,
        date: paymentRecord?.date || 'Today',
        time: paymentRecord?.time || 'Just now',
        referenceNo: paymentRecord?.referenceNo,
      });
      // Emit live notification for navbar
      notificationManager.addNotification({
        title: 'Bill Settled',
        desc: `${paidOrder.tableNumber || selectedOrder.tableNumber} bill of ₹${paidAmt} settled via ${paymentMode}`,
        targetScreen: 'Payments',
        type: 'BILLING',
      });
      // Pop up immediately!
      setShowSuccessModal(true);
    } catch (err) {
      Alert.alert(
        language === 'mr' ? 'त्रुटी' : language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'mr' ? 'पेमेंट पूर्ण करताना त्रुटी आली.' : language === 'hi' ? 'भुगतान पूरा करते समय त्रुटि आई।' : 'Failed to finalize payment.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Modal Actions
  const handleGoToPayments = () => {
    setShowSuccessModal(false);
    setSelectedOrder(null);
    setCurrentStep(1);
    try {
      navigation?.navigate('Payments', { _navTs: Date.now() });
    } catch (e) {
      try {
        navigation?.navigate('MainApp', { screen: 'Payments', params: { _navTs: Date.now() } });
      } catch (e2) {
        console.warn('Navigation to Payments error:', e2);
      }
    }
  };

  // Construct Bill Print Data payload
  const getBillPrintPayload = (overrideInv?: string): BillPrintData => {
    const invNumber = overrideInv || generatedInvoiceNumber || finalPaidOrder?.invoiceNumber || '#INV-101';
    const table = finalPaidOrder?.tableNumber || selectedOrder?.tableNumber || 'Table';
    const items = (finalPaidOrder?.items || orderItemsList || []).map((dish) => ({
      name: dish.name,
      quantity: dish.quantity,
      price: dish.price,
      amount: dish.quantity * dish.price,
    }));
    const subtotal = Number(finalPaidOrder?.subtotal || calculatedSubtotal || 0);
    const cgst = finalPaidOrder?.cgst || calculatedCGST || '0.00';
    const sgst = finalPaidOrder?.sgst || calculatedSGST || '0.00';
    const discount = Number(finalPaidOrder?.discountAmount || rawDiscount || 0);
    const total = Number(finalPaidOrder?.total || calculatedGrandTotal || 0);

    return {
      language,
      invoiceNumber: invNumber,
      hotelName: 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: 'Hotel Premises, Pune, Maharashtra - 411004',
      phone: '+91 98765 43210',
      gstin: '27AAKCA1234F1Z5',
      fssai: '11521034000123',
      tableName: table,
      customerName: finalPaidOrder?.customer || selectedOrder?.customer || 'Walk-in Guest',
      date: finalPaidOrder?.date || new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      paymentMode: finalPaidOrder?.paymentMode || paymentMode,
      items,
      subtotal,
      cgst,
      sgst,
      discount,
      total,
      footerNote:
        language === 'mr'
          ? 'भेट दिल्याबद्दल धन्यवाद! पुन्हा या.'
          : language === 'hi'
            ? 'पधारने के लिए धन्यवाद! फिर आएं।'
            : 'Thank you for dining with us! Visit again.',
    };
  };

  const handleOpenPrintModal = (ord?: ActiveOrder | null, overrideInv?: string) => {
    const targetOrder = ord || finalPaidOrder || selectedOrder;
    const invNumber = overrideInv || targetOrder?.invoiceNumber || generatedInvoiceNumber || '#INV-1027';
    const table = targetOrder?.tableNumber || selectedOrder?.tableNumber || route?.params?.tableNumber || route?.params?.table || 'Table 01';
    const customer = targetOrder?.customer || selectedOrder?.customer || 'Walk-in Guest';
    const dishes = (targetOrder?.items && targetOrder.items.length > 0)
      ? targetOrder.items
      : (orderItemsList && orderItemsList.length > 0)
        ? orderItemsList
        : [{ name: 'Order Dishes', quantity: 1, price: Number(targetOrder?.total || 0) }];

    const sub = Number(targetOrder?.subtotal || calculatedSubtotal || 0);
    const cgstVal = Number(targetOrder?.cgst || calculatedCGST || (sub * 0.025));
    const sgstVal = Number(targetOrder?.sgst || calculatedSGST || (sub * 0.025));
    const disc = Number(targetOrder?.discountAmount || rawDiscount || 0);
    const tot = Number(targetOrder?.total || calculatedGrandTotal || sub + cgstVal + sgstVal - disc);

    const uData: UniversalInvoicePrintData = {
      invoiceNumber: String(invNumber).replace(/^#/, ''),
      invoiceDate: targetOrder?.date ? String(targetOrder.date).split(',')[0] : new Date().toISOString().split('T')[0],
      hotelName: activeBranch?.name ? `AJALKAR HOTEL - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: activeBranch?.address || 'Hotel Premises, Pune, Maharashtra - 411004',
      hotelPhone: activeBranch?.phone || '+91 98765 43210',
      gstin: activeBranch?.gstin || '27AAACA9999P1Z1',
      fssai: '11521034000123',
      customerName: customer,
      tableName: table,
      orderNumber: targetOrder?.orderNumber || (targetOrder?.id ? (String(targetOrder.id).startsWith('temp-ord-') ? `ORD-${String(targetOrder.id).slice(-6)}` : `ORD-${targetOrder.id}`) : ''),
      language: (language as any) || 'en',
      items: dishes.map((dish: any, idx: number) => ({
        id: idx + 1,
        name: dish.name || dish.itemName || 'Dish',
        quantity: Number(dish.quantity || 1),
        unitPrice: Number(dish.price || dish.unitPrice || 0),
        totalPrice: Number(dish.quantity || 1) * Number(dish.price || dish.unitPrice || 0),
        taxRate: 5,
      })),
      subtotal: sub || tot,
      discountAmount: disc,
      taxableAmount: sub - disc,
      cgstRate: 2.5,
      cgstAmount: Number(cgstVal.toFixed(2)),
      sgstRate: 2.5,
      sgstAmount: Number(sgstVal.toFixed(2)),
      totalTax: Number((cgstVal + sgstVal).toFixed(2)),
      grandTotal: tot,
      paymentMethod: targetOrder?.paymentMode || paymentMode || 'UPI',
      paymentStatus: targetOrder?.status === 'PAID' ? 'PAID' : 'UNPAID',
      footerMessage: 'Thank you for dining with Ajalkar! Visit again.',
    };

    setPrintModalData(uData);
    setPrintModalVisible(true);
  };

  const [configuredPrinter, setConfiguredPrinter] = useState<PrinterConfig | null>(null);

  useEffect(() => {
    if (printFormatModalVisible) {
      NativePrinterManager.getDefaultPrinter('RECEIPT')
        .then((p) => {
          if (p) setConfiguredPrinter(p);
        })
        .catch(() => { });
    }
  }, [printFormatModalVisible]);

  const handleWifiPrint = async (format: PrintFormat = selectedPrintFormat) => {
    try {
      setIsPrinting(true);
      const data = getBillPrintPayload();
      const res = await printCustomerBillWifi(data, format, configuredPrinter?.ipAddress, configuredPrinter?.port);
      if (res.success) {
        Alert.alert(
          language === 'mr' ? 'वाय-फाय प्रिंट यशस्वी!' : 'Wi-Fi Print Success',
          res.message || (language === 'mr' ? 'बिल वाय-फाय प्रिंटरवर पाठवले आहे.' : 'Bill printed on Wi-Fi printer.')
        );
        setPrintFormatModalVisible(false);
      } else {
        Alert.alert(
          language === 'mr' ? 'वाय-फाय प्रिंट' : 'Wi-Fi Print',
          `${res.message}\n\n${language === 'mr' ? 'सिस्टिम प्रिंटरद्वारे प्रिंट करायचे का?' : 'Print via System Spooler?'}`,
          [
            { text: language === 'mr' ? 'रद्द करा' : 'Cancel', style: 'cancel' },
            {
              text: language === 'mr' ? 'सिस्टिम प्रिंट' : 'System Print',
              onPress: () => handlePrintWithFormat(format),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Wi-Fi Print Error', err.message || 'Failed to print over Wi-Fi');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDirectBluetoothPrint = async (format: PrintFormat = selectedPrintFormat) => {
    try {
      setIsBluetoothPrinting(true);
      setSelectedPrintFormat(format);
      const data = getBillPrintPayload();
      await printCustomerBillDirectBluetooth(data, format);
      setPrintFormatModalVisible(false);
      setShowSuccessModal(false);
      // Auto-navigate to orders after print
      setTimeout(() => {
        setSelectedOrder(null);
        setCurrentStep(1);
      }, 800);
    } catch (err: any) {
      console.error('Failed to print via Bluetooth:', err);
      Alert.alert(
        language === 'mr' ? 'ब्लूटूथ प्रिंट त्रुटी' : 'Bluetooth Print Error',
        language === 'mr' ? 'ब्लूटूथ प्रिंटरवर पाठवताना त्रुटी आली. कृपया प्रिंटर पेअर असल्याची खात्री करा.' : 'Failed to send to Bluetooth printer.'
      );
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  const handlePrintWithFormat = async (format: PrintFormat = selectedPrintFormat) => {
    try {
      setIsPrinting(true);
      setSelectedPrintFormat(format);
      const data = getBillPrintPayload();
      await printCustomerBill(data, format);
      setPrintFormatModalVisible(false);
      setShowSuccessModal(false);
      // Auto-navigate to orders after print
      setTimeout(() => {
        setSelectedOrder(null);
        setCurrentStep(1);
      }, 800);
    } catch (err: any) {
      console.error('Failed to print bill:', err);
      Alert.alert(
        language === 'mr' ? 'प्रिंट त्रुटी' : language === 'hi' ? 'प्रिंट त्रुटि' : 'Print Error',
        language === 'mr' ? 'बिल प्रिंट करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.' : 'Failed to trigger print.'
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShareBillPdf = async (format: PrintFormat = selectedPrintFormat) => {
    try {
      setIsSharingPdf(true);
      const data = getBillPrintPayload();
      await shareCustomerBillPdf(data, format);
      setPrintFormatModalVisible(false);
    } catch (err: any) {
      console.error('Failed to share bill PDF:', err);
      Alert.alert(
        language === 'mr' ? 'शेअर त्रुटी' : 'Share Error',
        language === 'mr' ? 'बिल PDF शेअर करताना त्रुटी आली.' : 'Failed to share bill PDF.'
      );
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleGoToOrdersFromSuccess = () => {
    setShowSuccessModal(false);
    setSelectedOrder(null);
    setCurrentStep(1);
  };

  const handleViewInvoiceFromSuccess = () => {
    setShowSuccessModal(false);
    setCurrentStep(3);
  };

  const handleGoToTablesFromSuccess = () => {
    setShowSuccessModal(false);
    setCurrentStep(1);
    try {
      navigation?.navigate('Tables');
    } catch (e) {
      try {
        navigation?.navigate('MainApp', { screen: 'Tables' });
      } catch (e2) {
        console.warn('Navigation to Tables error:', e2);
      }
    }
  };

  // Quick Bill submit
  const handleCreateQuickBillSubmit = async () => {
    const defaultItems: KOTOrderItem[] = [
      { name: 'Veg Spring Rolls', quantity: 2, price: 180 },
      { name: 'Dal Tadka', quantity: 2, price: 190 },
      { name: 'Butter Naan', quantity: 4, price: 45 },
    ];
    const newOrder = await restaurantStore.createQuickBill(
      quickTableName,
      quickGuestName.trim() || 'Walk-in Guest',
      defaultItems,
      activeBranchNumId
    );
    setQuickBillModalVisible(false);
    selectOrderImmediately(newOrder, 2);
  };

  const formatDisplayOrderNo = useCallback(
    (order?: ActiveOrder | null): string => {
      if (!order) return '#ORD';
      const raw = String(order.orderNumber || '').trim();
      if (raw && !raw.toLowerCase().startsWith('temp-')) {
        return toDevanagari(raw.startsWith('#') ? raw : `#${raw}`);
      }
      const rawId = String(order.id || '').trim();
      if (rawId.startsWith('temp-ord-')) {
        const digits = rawId.replace(/^temp-ord-/, '').split('-')[0];
        const shortCode = digits ? digits.slice(-6) : rawId.slice(-6);
        return toDevanagari(`#ORD-${shortCode}`);
      }
      return toDevanagari(rawId.startsWith('#') ? rawId : `#${rawId}`);
    },
    [toDevanagari]
  );

  const renderBillingHeader = () => (
    <View style={styles.headerBar}>
      <Text style={styles.screenHeading}>{t('billing', 'Billing')}</Text>

      {/* 3-Step Checkout Flow Stepper (Clickable Stepper) */}
      <View style={styles.stepperWrapper}>
        <View style={styles.stepperContainer}>
          {/* Step 1 */}
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.7}
          >
            <View style={[styles.stepNumberCircle, currentStep === 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumberText, currentStep === 1 && styles.stepNumberActiveText]}>
                {toDevanagari('01')}
              </Text>
            </View>
            <Text style={[styles.stepTitle, currentStep === 1 && styles.stepTitleActive]} numberOfLines={1}>
              {t('orders', 'Orders')}
            </Text>
          </TouchableOpacity>

          <View style={styles.stepDividerLine} />

          {/* Step 2 */}
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}
            onPress={() => {
              if (selectedOrder) {
                setCurrentStep(2);
              } else if (filteredOrders.length > 0) {
                const firstUnpaid = filteredOrders.find((o) => o.status !== 'PAID') || filteredOrders[0];
                selectOrderImmediately(firstUnpaid, 2);
              } else {
                Alert.alert(t('selectOrder', 'Select Order'), t('pleaseSelectTableOrder', 'Please select a table order first.'));
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.stepNumberCircle, currentStep === 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumberText, currentStep === 2 && styles.stepNumberActiveText]}>
                {toDevanagari('02')}
              </Text>
            </View>
            <Text style={[styles.stepTitle, currentStep === 2 && styles.stepTitleActive]} numberOfLines={1}>
              {t('billing', 'Billing')}
            </Text>
          </TouchableOpacity>

          <View style={styles.stepDividerLine} />

          {/* Step 3 */}
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 3 && styles.stepItemActive]}
            onPress={() => {
              if (finalPaidOrder || generatedInvoiceNumber) {
                setCurrentStep(3);
              } else {
                Alert.alert(t('receipt', 'Receipt'), t('completeStep2First', 'Please complete payment in Step 2 first.'));
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.stepNumberCircle, currentStep === 3 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumberText, currentStep === 3 && styles.stepNumberActiveText]}>
                {toDevanagari('03')}
              </Text>
            </View>
            <Text style={[styles.stepTitle, currentStep === 3 && styles.stepTitleActive]} numberOfLines={1}>
              {t('invoice', 'Invoice')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} activeRouteName="Billing" />

      {/* ===================================================
          STEP 1: ACTIVE ORDERS LIST (Screenshot 2)
      =================================================== */}
      {currentStep === 1 && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderBillingHeader()}
          {/* Step 1 Title Banner */}
          <View style={styles.stepHeaderCard}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
              <Text style={styles.stepMiniLabel}>{t('step', 'STEP')} {toDevanagari(1)}</Text>
              <Text style={styles.stepMainHeading} numberOfLines={1}>{t('activeOrders', 'Active Orders')}</Text>
            </View>

            <TouchableOpacity
              style={styles.quickBillHeaderBtn}
              onPress={() => setQuickBillModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.quickBillHeaderText}>{t('fastBill', 'Fast Bill')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box & Records Count */}
          <View style={styles.searchAndCountRow}>
            <View style={styles.searchBox}>
              <Search size={15} color="#78716C" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchOrderCustomerTable', 'Search order, customer or table...')}
                placeholderTextColor="#A8A29E"
                value={searchQuery}
                onChangeText={(text: string) => { setSearchQuery(text); setCurrentPage(1); }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setCurrentPage(1); }}>
                  <X size={14} color="#78716C" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.recordsCountBadge}>
              <Text style={styles.recordsCountText}>{toDevanagari(activeRecordsCount)} {t('records', 'Records')}</Text>
            </View>
          </View>

          {/* Table / Cards of Orders - Paginated (card body & action buttons separated cleanly) */}
          {paginatedOrders.map((order: ActiveOrder, index: number) => {
            const isBillGenerated = order.status === 'BILL GENERATED';
            const isPaid = order.status === 'PAID';
            const openOrderHandler = () => {
              if (isPaid) {
                setSelectedOrder(order);
                setFinalPaidOrder(order);
                setGeneratedInvoiceNumber(order.invoiceNumber || `#INV-${order.id}`);
                setCurrentStep(3);
              } else {
                selectOrderImmediately(order, 2);
              }
            };

            return (
              <View
                key={`order-card-${order.id || 'ord'}-${index}`}
                style={[styles.orderCard, isBillGenerated && styles.orderCardBillGen]}
              >
                <TouchableOpacity onPress={openOrderHandler} activeOpacity={0.75}>
                  {/* Header row: Order No, Date & Table */}
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderNoCol}>
                      <Text style={styles.orderNoLabel}>{t('orderNo', 'ORDER NO')}</Text>
                      <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="middle">
                        {formatDisplayOrderNo(order)}
                      </Text>
                    </View>

                    <View style={styles.tableBadge}>
                      <UtensilsCrossed size={12} color="#9A3412" />
                      <Text style={styles.tableBadgeText} numberOfLines={1}>
                        {formatTableName(order.tableNumber)}
                      </Text>
                    </View>
                  </View>

                  {/* Customer & Date */}
                  <View style={styles.orderMetaRow}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <Text style={styles.metaSubLabel}>{t('customer', 'CUSTOMER')}</Text>
                      <Text style={styles.metaCustomerName} numberOfLines={1}>
                        {localizeGuestName(order.customer)}
                      </Text>
                      <Text style={styles.metaDateText} numberOfLines={1}>
                        {formatDate(order.date, { showDayOfWeek: false })}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Text style={styles.metaSubLabel}>{t('total', 'TOTAL')}</Text>
                      <Text style={styles.metaTotalAmount}>₹ {toDevanagari(order.total.toFixed(2))}</Text>
                      <Text style={styles.metaItemsCount}>{toDevanagari(order.itemsCount)} {t('items', 'Items')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Status & Action */}
                <View style={styles.orderBottomRow}>
                  {/* Status Indicator */}
                  {isPaid ? (
                    <View style={styles.paidPill}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <Text style={styles.paidPillText} numberOfLines={1}>{translateStatus('PAID')}</Text>
                    </View>
                  ) : isBillGenerated ? (
                    <View style={styles.billGenPill}>
                      <Text style={styles.billGenText} numberOfLines={1}>{t('billGenerated', 'BILL GENERATED')}</Text>
                    </View>
                  ) : (
                    <View style={styles.activeOrdersPill}>
                      <Text style={styles.activeOrdersText} numberOfLines={1}>{t('activeOrders', 'Active Orders')}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsBtnGroup}>
                    <TouchableOpacity
                      style={styles.editOrderBtn}
                      onPress={() => selectOrderImmediately(order, 2)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editOrderText} numberOfLines={1}>{t('edit', 'Edit')}</Text>
                    </TouchableOpacity>

                    {isPaid ? (
                      <TouchableOpacity
                        style={styles.viewInvoiceBtn}
                        onPress={() => {
                          setSelectedOrder(order);
                          setFinalPaidOrder(order);
                          setGeneratedInvoiceNumber(order.invoiceNumber || `#INV-${order.id}`);
                          setCurrentStep(3);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.viewInvoiceText} numberOfLines={1}>{t('invoice', 'Invoice')}</Text>
                      </TouchableOpacity>
                    ) : isBillGenerated ? (
                      <TouchableOpacity
                        style={styles.viewBillBtn}
                        onPress={() => selectOrderImmediately(order, 2)}
                        activeOpacity={0.85}
                      >
                        <ReceiptRupee size={13} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.viewBillText} numberOfLines={1}>{t('viewBill', 'View Bill')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.generateBillBtn}
                        onPress={() => selectOrderImmediately(order, 2)}
                        activeOpacity={0.85}
                      >
                        <ReceiptRupee size={13} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.generateBillText} numberOfLines={1}>{t('generateBill', 'Generate Bill')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Empty State when no unpaid bills remain */}
          {paginatedOrders.length === 0 && (
            <View style={styles.emptyBillsCard}>
              <ReceiptRupee size={40} color="#CBD5E1" strokeWidth={1.8} />
              <Text style={styles.emptyBillsTitle}>
                {language === 'mr'
                  ? 'सध्या कोणतेही प्रलंबित बिल नाही'
                  : language === 'hi'
                    ? 'अभी कोई लंबित बिल नहीं है'
                    : 'No Pending Bills'}
              </Text>
              <Text style={styles.emptyBillsSub}>
                {language === 'mr'
                  ? 'पेमेंट झालेली सर्व बिले Payments मॉड्यूलमध्ये पाठवली आहेत.'
                  : language === 'hi'
                    ? 'भुगतान किए गए सभी बिल Payments मॉड्यूल में भेज दिए गए हैं।'
                    : 'All paid bills are moved to the Payments module.'}
              </Text>
              <View style={styles.emptyBillsBtnRow}>
                <TouchableOpacity
                  style={styles.emptyBillsPrimaryBtn}
                  onPress={handleGoToPayments}
                  activeOpacity={0.85}
                >
                  <CreditCard size={15} color="#FFFFFF" />
                  <Text style={styles.emptyBillsPrimaryBtnText}>
                    {language === 'mr' ? 'पेमेंट्स पहा' : language === 'hi' ? 'भुगतान देखें' : 'View Payments'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptyBillsSecondaryBtn}
                  onPress={() => handleGoToTablesFromSuccess()}
                  activeOpacity={0.85}
                >
                  <UtensilsCrossed size={14} color="#EA580C" />
                  <Text style={styles.emptyBillsSecondaryBtnText}>
                    {t('tables', 'Tables')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              {/* Previous Button: < (no box, no text) */}
              <TouchableOpacity
                style={[styles.paginationBtn, safePage <= 1 && styles.paginationBtnDisabled]}
                onPress={() => {
                  if (safePage > 1) setCurrentPage(safePage - 1);
                }}
                disabled={safePage <= 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageNavArrowText, safePage <= 1 && styles.pageNavArrowTextDisabled]}>&lt;</Text>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <View style={styles.paginationPagesRow}>
                  {(() => {
                    const startPg = Math.max(1, Math.min(safePage, totalPages - 1));
                    const visibleBillingPages = totalPages <= 2
                      ? Array.from({ length: totalPages }, (_, i) => i + 1)
                      : [startPg, startPg + 1];
                    return visibleBillingPages.map((pg, pIdx) => {
                      const isCurrent = pg === safePage;
                      return (
                        <TouchableOpacity
                          key={`billing-pg-${pg}-${pIdx}`}
                          style={[styles.pageNumberBtn, isCurrent && styles.pageNumberBtnActive]}
                          onPress={() => setCurrentPage(pg)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pageNumberText, isCurrent && styles.pageNumberTextActive]}>
                            {toDevanagari(pg)}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
                <Text style={styles.paginationTotalText}>
                  {toDevanagari(filteredOrders.length)} {language === 'mr' ? 'एकूण बिले' : language === 'hi' ? 'कुल बिल' : 'Total Bills'}
                </Text>
              </View>

              {/* Next Button: > (no box, no text) */}
              <TouchableOpacity
                style={[styles.paginationBtn, safePage >= totalPages && styles.paginationBtnDisabled]}
                onPress={() => {
                  if (safePage < totalPages) setCurrentPage(safePage + 1);
                }}
                disabled={safePage >= totalPages}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageNavArrowText, safePage >= totalPages && styles.pageNavArrowTextDisabled]}>&gt;</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===================================================
          STEP 2: ONE-CLICK BILLING (Checkout & Live Taxes)
      =================================================== */}
      {currentStep === 2 && selectedOrder && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderBillingHeader()}
          {/* Back button and banner */}
          <View style={styles.step2HeaderCard}>
            <View style={styles.step2HeaderTopRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setCurrentStep(1)}
                activeOpacity={0.8}
              >
                <ArrowLeft size={14} color="#EA580C" />
                <Text style={styles.backStepText}>{t('backToOrders', 'Back to Orders')}</Text>
              </TouchableOpacity>

              <View style={styles.step2Badge}>
                <Text style={styles.step2BadgeText}>{t('step', 'STEP')} {toDevanagari(2)}</Text>
              </View>
            </View>

            <View style={styles.step2BannerContent}>
              <Text style={styles.step2MainHeading}>{t('oneClickBilling', 'One-Click Billing')}</Text>
            </View>
          </View>

          {/* Table & Order Info Card */}
          <View style={styles.billOverviewCard}>
            <View style={[styles.billOverviewRow, { gap: 10 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.overviewLabel}>{t('orderNo', 'ORDER NO')}</Text>
                <Text style={styles.overviewVal} numberOfLines={1} ellipsizeMode="middle">
                  {formatDisplayOrderNo(selectedOrder)}
                </Text>
              </View>
              <View style={[styles.overviewTableBadge, { flexShrink: 0 }]}>
                <UtensilsCrossed size={14} color="#9A3412" />
                <Text style={styles.overviewTableText} numberOfLines={1}>
                  {formatTableName(selectedOrder.tableNumber)}
                </Text>
              </View>
            </View>

            <View style={styles.overviewDivider} />

            <View style={[styles.billOverviewRow, { gap: 10 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.overviewLabel}>{t('customer', 'CUSTOMER')}</Text>
                <Text style={styles.overviewVal} numberOfLines={1}>
                  {localizeGuestName(selectedOrder.customer)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={styles.overviewLabel}>{t('orderDate', 'ORDER DATE')}</Text>
                <Text style={styles.overviewDateVal} numberOfLines={1}>
                  {formatDate(selectedOrder.date, { showDayOfWeek: false })}
                </Text>
              </View>
            </View>
          </View>

          {/* Itemized Dishes List with Live Quantity Adjustment */}
          <View style={styles.itemsCard}>
            <View style={styles.itemsCardHeaderRow}>
              <Text style={[styles.cardSectionTitle, { flex: 1, paddingRight: 8 }]} numberOfLines={1}>
                {t('orderedDishes', 'ORDERED DISHES')} ({toDevanagari(orderItemsList.length)})
              </Text>
              <TouchableOpacity
                style={[styles.addDishSmallBtn, { flexShrink: 0 }]}
                onPress={() => setAddItemModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={13} color="#EA580C" />
                <Text style={styles.addDishSmallText}>{t('addDish', 'Add Dish')}</Text>
              </TouchableOpacity>
            </View>

            {orderItemsList.length === 0 ? (
              <TouchableOpacity
                style={[styles.dishBillRow, { justifyContent: 'center', paddingVertical: 14 }]}
                onPress={() => setAddItemModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dishMeta, { color: '#EA580C', fontWeight: '700' }]}>
                  + {t('addDish', 'Add Dish')}
                </Text>
              </TouchableOpacity>
            ) : orderItemsList.map((item, idx) => (
              <View key={`dish-row-${idx}-${item.name}`} style={styles.dishBillRow}>
                <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                  <Text style={styles.dishName} numberOfLines={2}>{getLocalizedMenuItemName(item.name)}</Text>
                  <Text style={styles.dishMeta}>₹{toDevanagari(item.price)} {t('perItem', 'per item')}</Text>
                </View>

                {/* Qty +/- Controls */}
                <View style={styles.dishQtyBox}>
                  <TouchableOpacity
                    style={styles.dishQtyBtn}
                    onPress={() => handleUpdateItemQtyInBill(idx, -1)}
                    activeOpacity={0.8}
                  >
                    <Minus size={13} color={isDark ? '#FDBA74' : '#9A3412'} />
                  </TouchableOpacity>
                  <Text style={styles.dishQtyNum}>{toDevanagari(item.quantity)}</Text>
                  <TouchableOpacity
                    style={styles.dishQtyBtn}
                    onPress={() => handleUpdateItemQtyInBill(idx, 1)}
                    activeOpacity={0.8}
                  >
                    <Plus size={13} color={isDark ? '#FDBA74' : '#9A3412'} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.dishTotal}>₹{toDevanagari((item.price * item.quantity).toFixed(2))}</Text>
              </View>
            ))}
          </View>

          {/* Tax & Charges Breakdown with Live Recalculation */}
          <View style={styles.calcCard}>
            <Text style={styles.cardSectionTitle}>{t('billSummary', 'BILL SUMMARY')} (GST {toDevanagari(5)}%)</Text>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>{t('subtotal', 'Taxable Amount')}</Text>
              <Text style={styles.calcVal}>₹ {toDevanagari(calculatedSubtotal.toFixed(2))}</Text>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>CGST ({toDevanagari('2.5')}%)</Text>
              <Text style={styles.calcVal}>₹ {toDevanagari(calculatedCGST)}</Text>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>SGST ({toDevanagari('2.5')}%)</Text>
              <Text style={styles.calcVal}>₹ {toDevanagari(calculatedSGST)}</Text>
            </View>

            {/* Quick Discount Pill Buttons */}
            <View style={styles.quickDiscountsWrap}>
              <Text style={styles.quickDiscountTitle}>{t('quickOffersDiscounts', 'QUICK OFFERS & DISCOUNTS:')}</Text>
              <View style={styles.quickDiscountRow}>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyQuickDiscount(50)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    ₹{toDevanagari(50)} {t('off', 'Off')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyQuickDiscount(100)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    ₹{toDevanagari(100)} {t('off', 'Off')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyPercentDiscount(5)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {toDevanagari(5)}% {t('off', 'Off')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyPercentDiscount(10)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                    {toDevanagari(10)}% {t('off', 'Off')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Discount Input */}
            <View style={styles.discountInputRow}>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                <Tag size={15} color="#EA580C" />
                <Text style={styles.discountLabel} numberOfLines={1}>{t('specialDiscount', 'Special Discount (₹)')}</Text>
              </View>
              <TextInput
                style={styles.discountInputBox}
                keyboardType="numeric"
                value={discountInput}
                onChangeText={setDiscountInput}
                placeholder="0"
                placeholderTextColor={isDark ? '#64748B' : '#A8A29E'}
              />
            </View>

            <View style={styles.calcDivider} />

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={[styles.grandTotalLabel, { flex: 1, marginRight: 8 }]}>{t('netPayableAmount', 'Net Payable Amount')}</Text>
              <Text style={styles.grandTotalVal}>₹ {toDevanagari(calculatedGrandTotal.toFixed(2))}</Text>
            </View>
          </View>

          {/* Payment Method Selector (CASH / UPI / CARD) */}
          <View style={styles.paymentMethodCard}>
            <Text style={styles.cardSectionTitle}>{t('selectPaymentMethod', 'SELECT PAYMENT METHOD')}</Text>
            <View style={styles.paymentOptionsRow}>
              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMode === 'CASH' && styles.payOptionActive]}
                onPress={() => setPaymentMode('CASH')}
                activeOpacity={0.8}
              >
                <IndianRupee size={18} color={paymentMode === 'CASH' ? (isDark ? '#FDBA74' : '#9A3412') : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'CASH' && styles.payOptionTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t('cash', 'Cash')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMode === 'UPI' && styles.payOptionActive]}
                onPress={() => setPaymentMode('UPI')}
                activeOpacity={0.8}
              >
                <QrCode size={18} color={paymentMode === 'UPI' ? (isDark ? '#FDBA74' : '#9A3412') : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'UPI' && styles.payOptionTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t('upiQr', 'UPI / QR')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMode === 'CARD' && styles.payOptionActive]}
                onPress={() => setPaymentMode('CARD')}
                activeOpacity={0.8}
              >
                <CreditCard size={18} color={paymentMode === 'CARD' ? (isDark ? '#FDBA74' : '#9A3412') : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'CARD' && styles.payOptionTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t('cardPos', 'Card / POS')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Finalize Bill Action Button (PROMINENT & INSTANT) */}
          <View style={styles.step2Actions}>
            <TouchableOpacity
              style={[styles.finalizePayBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleFinalizeBillAndPay}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.finalizePayText}>{t('savingBill', 'Saving bill...')}</Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text style={styles.finalizePayText}>{t('finalizeBillAndPay', 'Finalize Bill & Pay')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===================================================
          STEP 3: GENERATED INVOICE (Tax Receipt & Clear Table)
      =================================================== */}
      {currentStep === 3 && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderBillingHeader()}
          {/* Success Banner */}
          <View style={styles.invoiceSuccessBanner}>
            <View style={styles.invoiceSuccessIcon}>
              <CheckCircle2 size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.invoiceSuccessTitle}>{t('paymentReceivedSuccessfully', 'Payment Received Successfully!')}</Text>
            <Text style={styles.invoiceSuccessSub}>
              {formatTableName(finalPaidOrder?.tableNumber || selectedOrder?.tableNumber)} {t('tableClearedMarkedAvailable', 'cleared & marked AVAILABLE for next guests.')}
            </Text>
          </View>

          {/* Tax Invoice Document Card */}
          <View style={styles.invoiceReceiptCard}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptHotelName}>{activeBranch?.name?.toUpperCase() || 'AJALKAR HOTEL MANAGEMENT'}</Text>
              <Text style={styles.receiptHotelSub}>Royal Palace Hotel • Pune, Maharashtra</Text>
              <Text style={styles.receiptGst}>GSTIN: {activeBranch?.gstin || '27AABCA1234F1Z9'} • FSSAI: 11521034000123</Text>
            </View>

            <View style={styles.receiptDashedLine} />

            {/* Meta */}
            <View style={[styles.receiptMetaGrid, { gap: 12 }]}>
              <View style={[styles.receiptMetaCol, { minWidth: 0 }]}>
                <Text style={styles.rLabel}>{t('invoiceNumber', 'INVOICE NO:')}</Text>
                <Text style={styles.rVal} numberOfLines={1} ellipsizeMode="middle">
                  {toDevanagari(generatedInvoiceNumber || finalPaidOrder?.invoiceNumber || '#INV-101')}
                </Text>
              </View>
              <View style={[styles.receiptMetaCol, { alignItems: 'flex-end', minWidth: 0 }]}>
                <Text style={styles.rLabel}>{t('dateTime', 'DATE & TIME:')}</Text>
                <Text style={styles.rVal} numberOfLines={1}>
                  {finalPaidOrder?.date ? formatDate(finalPaidOrder.date) : formatDate(new Date())}
                </Text>
              </View>
            </View>

            <View style={[styles.receiptMetaGrid, { gap: 12 }]}>
              <View style={[styles.receiptMetaCol, { minWidth: 0 }]}>
                <Text style={styles.rLabel}>{t('tables', 'TABLE:')}</Text>
                <Text style={styles.rVal} numberOfLines={1}>
                  {formatTableName(finalPaidOrder?.tableNumber || selectedOrder?.tableNumber)}
                </Text>
              </View>
              <View style={[styles.receiptMetaCol, { alignItems: 'flex-end', minWidth: 0 }]}>
                <Text style={styles.rLabel}>{t('paymentMethod', 'PAYMENT MODE:')}</Text>
                <Text style={[styles.rVal, { color: '#16A34A', fontWeight: '800' }]} numberOfLines={1}>
                  {t((finalPaidOrder?.paymentMode || paymentMode).toLowerCase(), finalPaidOrder?.paymentMode || paymentMode)} ({translateStatus('PAID')})
                </Text>
              </View>
            </View>

            <View style={styles.receiptDashedLine} />

            {/* Dishes Items Table */}
            <View style={styles.receiptItemsTable}>
              <View style={styles.receiptTableHead}>
                <Text style={[styles.receiptHeadCell, { flex: 2 }]}>{t('item', 'ITEM')}</Text>
                <Text style={[styles.receiptHeadCell, { flex: 0.8, textAlign: 'center' }]}>{t('qty', 'QTY')}</Text>
                <Text style={[styles.receiptHeadCell, { flex: 1, textAlign: 'right' }]}>{t('rate', 'RATE')}</Text>
                <Text style={[styles.receiptHeadCell, { flex: 1.2, textAlign: 'right' }]}>{t('total', 'TOTAL')}</Text>
              </View>

              {(finalPaidOrder?.items || orderItemsList || []).map((dish, i) => (
                <View key={`receipt-dish-${i}-${dish.name}`} style={styles.receiptTableRow}>
                  <Text style={[styles.receiptTableCell, { flex: 2, fontWeight: '700' }]}>
                    {getLocalizedMenuItemName(dish.name)}
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 0.8, textAlign: 'center' }]}>
                    {toDevanagari(dish.quantity)}
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 1, textAlign: 'right' }]}>
                    ₹{toDevanagari(dish.price)}
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
                    ₹{toDevanagari((dish.price * dish.quantity).toFixed(2))}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.receiptDashedLine} />

            {/* Totals & Tax Breakdown */}
            <View style={styles.receiptTotalRow}>
              <Text style={styles.rTotalLabel}>{t('subtotal', 'Subtotal')}</Text>
              <Text style={styles.rTotalVal}>₹ {toDevanagari((finalPaidOrder?.subtotal || calculatedSubtotal).toFixed(2))}</Text>
            </View>

            <View style={styles.receiptTotalRow}>
              <Text style={styles.rTotalLabel}>CGST ({toDevanagari('2.5')}%)</Text>
              <Text style={styles.rTotalVal}>₹ {toDevanagari(finalPaidOrder?.cgst || calculatedCGST)}</Text>
            </View>

            <View style={styles.receiptTotalRow}>
              <Text style={styles.rTotalLabel}>SGST ({toDevanagari('2.5')}%)</Text>
              <Text style={styles.rTotalVal}>₹ {toDevanagari(finalPaidOrder?.sgst || calculatedSGST)}</Text>
            </View>

            {finalPaidOrder?.discountAmount || rawDiscount ? (
              <View style={styles.receiptTotalRow}>
                <Text style={[styles.rTotalLabel, { color: '#EA580C' }]}>{t('discount', 'Discount')}</Text>
                <Text style={[styles.rTotalVal, { color: '#EA580C' }]}>
                  - ₹ {toDevanagari((finalPaidOrder?.discountAmount || rawDiscount).toFixed(2))}
                </Text>
              </View>
            ) : null}

            <View style={styles.receiptDashedLine} />

            <View style={styles.receiptGrandTotalRow}>
              <Text style={styles.rGrandTotalLabel}>{t('grandTotal', 'GRAND TOTAL')} ({translateStatus('PAID')})</Text>
              <Text style={styles.rGrandTotalVal}>
                ₹ {toDevanagari((finalPaidOrder?.total || calculatedGrandTotal).toFixed(2))}
              </Text>
            </View>

            <Text style={styles.receiptFooterGreeting}>
              {t('thankYouDining', 'Thank you for dining with Ajalkar! Visit Again.')}
            </Text>
          </View>

          {/* Format Selector Bar: 80mm, 58mm, A4 */}
          <View style={styles.formatSelectorBox}>
            <View style={styles.formatSelectorHeaderRow}>
              <Text style={styles.formatSelectorHeading}>
                🖨️ {language === 'mr' ? 'प्रिंट आकार निवडा:' : language === 'hi' ? 'प्रिंट साइज़ चुनें:' : 'Select Print Size:'}
              </Text>
              <View style={styles.activeFormatBadge}>
                <Text style={styles.activeFormatBadgeText}>
                  {selectedPrintFormat === '80mm' ? '80mm (3")' : selectedPrintFormat === '58mm' ? '58mm (2")' : 'A4 GST'}
                </Text>
              </View>
            </View>
            <View style={styles.formatSelectorRow}>
              <TouchableOpacity
                style={[styles.formatChip, selectedPrintFormat === '80mm' && styles.formatChipActive]}
                onPress={() => setSelectedPrintFormat('80mm')}
                activeOpacity={0.8}
              >
                <Text style={[styles.formatChipText, selectedPrintFormat === '80mm' && styles.formatChipTextActive]}>
                  🧾 80mm POS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formatChip, selectedPrintFormat === '58mm' && styles.formatChipActive]}
                onPress={() => setSelectedPrintFormat('58mm')}
                activeOpacity={0.8}
              >
                <Text style={[styles.formatChipText, selectedPrintFormat === '58mm' && styles.formatChipTextActive]}>
                  🧾 58mm Mini
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formatChip, selectedPrintFormat === 'a4' && styles.formatChipActive]}
                onPress={() => setSelectedPrintFormat('a4')}
                activeOpacity={0.8}
              >
                <Text style={[styles.formatChipText, selectedPrintFormat === 'a4' && styles.formatChipTextActive]}>
                  📄 A4 Invoice
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 3 Action Buttons - Aligned 2x2 Grid */}
          <View style={styles.step3ActionsColumn}>
            {/* Row 1: System Print & Bluetooth Print */}
            <View style={styles.step3ButtonGridRow}>
              <TouchableOpacity
                style={[styles.step3ActionCardBtn, styles.systemPrintCardBtn]}
                onPress={() => handleOpenPrintModal()}
                activeOpacity={0.85}
              >
                <Printer size={17} color="#FFFFFF" />
                <Text style={styles.systemPrintCardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {language === 'mr' ? 'सिस्टिम प्रिंट' : 'System Print'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.step3ActionCardBtn, styles.bluetoothCardBtn]}
                onPress={() => handleOpenPrintModal()}
                activeOpacity={0.85}
              >
                <Bluetooth size={17} color="#FFFFFF" />
                <Text style={styles.bluetoothCardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {language === 'mr' ? 'ब्लूटूथ प्रिंट' : 'Bluetooth Print'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Share Bill PDF (With Thank you message) & Go to Orders */}
            <View style={styles.step3ButtonGridRow}>
              <TouchableOpacity
                style={[styles.step3ActionCardBtn, styles.sharePdfCardBtn, isSharingPdf && { opacity: 0.7 }]}
                onPress={() => handleShareBillPdf(selectedPrintFormat)}
                disabled={isSharingPdf}
                activeOpacity={0.85}
              >
                <Share2 size={17} color="#15803D" />
                <Text style={styles.sharePdfCardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {isSharingPdf
                    ? (language === 'mr' ? 'तयार होत आहे...' : 'Generating...')
                    : (language === 'mr' ? 'बिल PDF शेअर' : 'Share Bill PDF')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.step3ActionCardBtn, styles.backToOrdersCardBtn]}
                onPress={() => {
                  setSelectedOrder(null);
                  setCurrentStep(1);
                }}
                activeOpacity={0.85}
              >
                <RotateCcw size={17} color="#9A3412" />
                <Text style={styles.backToOrdersCardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {language === 'mr' ? 'ऑर्डर्सकडे जा' : 'Back to Orders'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.goToPaymentsBtn, { marginTop: 2 }]}
              onPress={handleGoToPayments}
              activeOpacity={0.85}
            >
              <CreditCard size={18} color="#FFFFFF" />
              <Text style={styles.goToPaymentsText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {language === 'mr' ? 'पेमेंट्समध्ये जा (Payments)' : language === 'hi' ? 'पेमेंट्स में जाएं (Payments)' : 'Go to Payments'}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===================================================
          MODAL: ADD FOOD ITEM TO BILL (In Step 2)
      =================================================== */}
      <Modal visible={addItemModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>{t('addDishToBill', 'Add Dish to Bill')}</Text>
                <Text style={styles.modalSub}>{formatTableName(selectedOrder?.tableNumber)} {t('selectItemFromMenu', 'साठी मेनूमधून पदार्थ जोडा')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                  }}
                  onPress={() => setAddItemModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>{t('done', 'Done')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddItemModalVisible(false)} style={{ padding: 4 }}>
                  <X size={20} color="#78716C" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Search Bar & Add Menu Button */}
            <View style={styles.menuSearchAndAddRow}>
              <View style={styles.modalSearchBoxInner}>
                <Search size={15} color="#78716C" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder={t('searchFoodItem', 'Search dish or category...')}
                  placeholderTextColor="#94A3B8"
                  value={menuSearch}
                  onChangeText={setMenuSearch}
                />
                {menuSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setMenuSearch('')}>
                    <X size={14} color="#78716C" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalAddDishBtn}
                onPress={() => setShowAddMenuModal(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.modalAddDishBtnText}>{t('addDish', 'Add Dish')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320, paddingHorizontal: 16 }}>
              {menuItems
                .filter((item) => {
                  const q = menuSearch.trim().toLowerCase();
                  if (!q) return true;
                  const localized = getLocalizedMenuItemName(item.name).toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    (item.category || '').toLowerCase().includes(q) ||
                    localized.includes(q)
                  );
                })
                .map((item, mIdx) => (
                  <View key={`menu-item-${item.id || mIdx}-${item.name}`} style={styles.menuItemPickerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuPickerName}>{getLocalizedMenuItemName(item.name)}</Text>
                      <Text style={styles.menuPickerSub}>₹{toDevanagari(item.price)} • {t(item.category.toLowerCase(), item.category)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addPickerBtn}
                      onPress={() => handleAddDishToBill(item)}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={styles.addPickerText}>{t('add', 'Add')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: FAST BILL / WALK-IN BILL (In Step 1)
      =================================================== */}
      <Modal visible={quickBillModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 380 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('fastBillWalkIn', 'Fast Bill / Walk-in')}</Text>
                <Text style={styles.modalSub}>{t('fastBillSub', 'थेट बिल तयार करण्यासाठी टेबल व नाव निवडा')}</Text>
              </View>
              <TouchableOpacity onPress={() => setQuickBillModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>{t('selectTable', 'Select Table')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['Table 01', 'Table 06', 'Table 10', 'Table 11', 'Table 13', 'Table 15', 'Takeaway'].map((tbl, tIdx) => (
                  <TouchableOpacity
                    key={`tbl-pill-${tbl}-${tIdx}`}
                    style={[styles.tblPill, quickTableName === tbl && styles.tblPillActive]}
                    onPress={() => setQuickTableName(tbl)}
                  >
                    <Text style={[styles.tblPillText, quickTableName === tbl && styles.tblPillTextActive]}>
                      {formatTableName(tbl)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('customerGuestName', 'Customer / Guest Name')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Walk-in Guest / Name"
                value={quickGuestName}
                onChangeText={setQuickGuestName}
              />

              <TouchableOpacity
                style={styles.createQuickBillBtn}
                onPress={handleCreateQuickBillSubmit}
                activeOpacity={0.85}
              >
                <ReceiptRupee size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.createQuickBillText}>{t('createBillAndProceed', 'Create Bill & Proceed')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: PAYMENT SUCCESS & BILL COMPLETED (Pop-up)
      =================================================== */}
      <Modal visible={showSuccessModal} animationType="fade" transparent={true}>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            {/* Top Green Glow Check Icon */}
            <View style={styles.successIconRing}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={46} color="#15803D" />
              </View>
            </View>

            <Text style={styles.successTitle}>
              {language === 'mr' ? 'बिल व पेमेंट यशस्वी!' : language === 'hi' ? 'बिल व भुगतान सफल!' : 'Bill & Payment Successful!'}
            </Text>
            <Text style={styles.successSub}>
              {language === 'mr'
                ? 'बिल पूर्ण झाले असून पेमेंट नोंदवले गेले आहे'
                : language === 'hi'
                  ? 'बिल पूरा हुआ और भुगतान दर्ज किया गया'
                  : 'Bill Completed & Recorded in Payments'}
            </Text>

            {/* Bill Summary Card inside Modal */}
            {successPaymentData && (
              <View style={styles.successDetailsBox}>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'पावती क्र.' : language === 'hi' ? 'चालान सं.' : 'Invoice No.'}
                  </Text>
                  <Text style={styles.successInvoiceVal} numberOfLines={1} ellipsizeMode="middle">
                    {language === 'mr' || language === 'hi' ? toDevanagari(successPaymentData.invoiceNumber) : String(successPaymentData.invoiceNumber)}
                  </Text>
                </View>

                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'टेबल / ग्राहक' : language === 'hi' ? 'टेबल / अतिथि' : 'Table / Guest'}
                  </Text>
                  <Text style={styles.successDetailVal} numberOfLines={1}>
                    {formatTableName(successPaymentData.tableName, language)} • {localizeGuestName(successPaymentData.customer)}
                  </Text>
                </View>

                <View style={styles.successDivider} />

                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'भरलेली एकूण रक्कम' : language === 'hi' ? 'कुल भुगतान राशि' : 'Total Amount Paid'}
                  </Text>
                  <Text style={styles.successAmountVal}>
                    ₹ {language === 'mr' || language === 'hi' ? toDevanagari(successPaymentData.amount.toFixed(2)) : successPaymentData.amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'पेमेंट पद्धत' : language === 'hi' ? 'भुगतान विधि' : 'Payment Method'}
                  </Text>
                  <View style={styles.successModeBadge}>
                    {successPaymentData.paymentMode === 'UPI' && <QrCode size={14} color="#2563EB" />}
                    {successPaymentData.paymentMode === 'CASH' && <Banknote size={14} color="#16A34A" />}
                    {successPaymentData.paymentMode === 'CARD' && <CreditCard size={14} color="#7C3AED" />}
                    <Text style={styles.successModeText}>
                      {successPaymentData.paymentMode === 'UPI'
                        ? 'UPI'
                        : successPaymentData.paymentMode === 'CASH'
                          ? (language === 'mr' ? 'रोख' : language === 'hi' ? 'नकद' : 'Cash')
                          : (language === 'mr' ? 'कार्ड' : language === 'hi' ? 'कार्ड' : 'Card')}
                    </Text>
                  </View>
                </View>

                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'वेळ व स्थिती' : language === 'hi' ? 'समय व स्थिति' : 'Time & Status'}
                  </Text>
                  <View style={styles.settledGreenPill}>
                    <CheckCircle2 size={11} color="#15803D" />
                    <Text style={styles.settledGreenText}>
                      {language === 'mr' ? 'पूर्ण (SETTLED)' : language === 'hi' ? 'पूर्ण (SETTLED)' : 'SETTLED (Completed)'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons as Compact Icons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingVertical: 12,
              paddingHorizontal: 4,
              marginTop: 14,
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}>
              {/* 1. Go to Payments */}
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={handleGoToPayments}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <CreditCard size={19} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>
                  {language === 'mr' ? 'पेमेंट्स' : language === 'hi' ? 'पेमेंट्स' : 'Payments'}
                </Text>
              </TouchableOpacity>

              {/* 2. Print Bill */}
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={() => handleOpenPrintModal()}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Printer size={19} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669', textAlign: 'center' }}>
                  {language === 'mr' ? 'प्रिंट बिल' : language === 'hi' ? 'प्रिंट बिल' : 'Print'}
                </Text>
              </TouchableOpacity>

              {/* 3. Share Bill */}
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={() => handleShareBillPdf(selectedPrintFormat)}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Share2 size={19} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A', textAlign: 'center' }}>
                  {language === 'mr' ? 'शेअर' : language === 'hi' ? 'शेयर' : 'Share'}
                </Text>
              </TouchableOpacity>

              {/* 4. Back */}
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={handleGoToOrdersFromSuccess}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#64748B', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <ArrowLeft size={19} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textAlign: 'center' }}>
                  {language === 'mr' ? 'मागे' : language === 'hi' ? 'वापस' : 'Back'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: ADD NEW MENU ITEM / DISH
      =================================================== */}
      <Modal visible={showAddMenuModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('addNewDish', 'Add New Dish to Menu')}</Text>
                <Text style={styles.modalSub}>{t('enterDishDetails', 'Enter dish details to save to menu & database')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddMenuModal(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>{t('dishName', 'Dish Name')} *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Kaju Curry Special"
                placeholderTextColor="#94A3B8"
                value={newDishName}
                onChangeText={setNewDishName}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>{t('category', 'Category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {['Main Course', 'Starters', 'Breads', 'Rice', 'Dessert', 'Beverages', 'Chinese'].map((cat, cIdx) => (
                  <TouchableOpacity
                    key={`cat-select-${cat}-${cIdx}`}
                    style={[
                      styles.catSelectChip,
                      newDishCategory === cat && styles.catSelectChipActive,
                    ]}
                    onPress={() => setNewDishCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catSelectChipText,
                        newDishCategory === cat && styles.catSelectChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('price', 'Price (₹)')} *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 250"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={newDishPrice}
                onChangeText={setNewDishPrice}
              />

              <TouchableOpacity
                style={styles.saveDishSubmitBtn}
                onPress={handleCreateMenuItem}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.saveDishSubmitText}>{t('saveDishToMenu', 'Save Dish to Menu')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: SELECT PRINT SIZE & FORMAT (80mm, 58mm, A4)
      =================================================== */}
      <Modal visible={printFormatModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.printSizeModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  🖨️ {language === 'mr' ? 'प्रिंट आकार निवडा' : language === 'hi' ? 'प्रिंट साइज़ चुनें' : 'Select Print Size'}
                </Text>
                <Text style={styles.modalSub}>
                  {language === 'mr'
                    ? 'आपल्या प्रिंटरनुसार योग्य आकार निवडा'
                    : language === 'hi'
                      ? 'अपने प्रिंटर अनुसार उपयुक्त साइज़ चुनें'
                      : 'Choose appropriate size for your printer'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPrintFormatModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={styles.printOptionsContainer}>
              {/* Option 1: 80mm Standard POS */}
              <TouchableOpacity
                style={[
                  styles.printOptionItem,
                  selectedPrintFormat === '80mm' && styles.printOptionItemActive,
                ]}
                onPress={() => handlePrintWithFormat('80mm')}
                activeOpacity={0.85}
              >
                <View style={styles.printOptionIconWrap}>
                  <Printer size={22} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.printOptionTitle}>80mm (3-Inch) Thermal POS</Text>
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>
                        {language === 'mr' ? 'लोकप्रिय' : language === 'hi' ? 'लोकप्रिय' : 'Popular'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.printOptionDesc}>
                    {language === 'mr'
                      ? 'हॉटेल काउंटर थर्मल प्रिंटरसाठी (TVS, Epson, NGX, Posiflex)'
                      : language === 'hi'
                        ? 'होटल काउंटर थर्मल प्रिंटर के लिए (TVS, Epson, NGX, Posiflex)'
                        : 'Standard hotel POS counter thermal receipt'}
                  </Text>
                </View>
                <ArrowRight size={18} color="#EA580C" />
              </TouchableOpacity>

              {/* Option 2: 58mm Mini POS */}
              <TouchableOpacity
                style={[
                  styles.printOptionItem,
                  selectedPrintFormat === '58mm' && styles.printOptionItemActive,
                ]}
                onPress={() => handlePrintWithFormat('58mm')}
                activeOpacity={0.85}
              >
                <View style={[styles.printOptionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <ReceiptRupee size={22} color="#16A34A" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.printOptionTitle}>58mm (2-Inch) Mini Bluetooth</Text>
                    <View style={[styles.recommendedBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.recommendedBadgeText, { color: '#15803D' }]}>
                        {language === 'mr' ? 'पोर्टेबल' : language === 'hi' ? 'पोर्टेबल' : 'Portable'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.printOptionDesc}>
                    {language === 'mr'
                      ? 'हॅन्डहेल्ड वायरलेस ब्लूटूथ मिनी प्रिंटरसाठी'
                      : language === 'hi'
                        ? 'हैंडहेल्ड वायरलेस ब्लूटूथ मिनी प्रिंटर के लिए'
                        : 'Compact slip for 2-inch handheld Bluetooth POS'}
                  </Text>
                </View>
                <ArrowRight size={18} color="#16A34A" />
              </TouchableOpacity>

              {/* Option 3: A4 GST Tax Invoice */}
              <TouchableOpacity
                style={[
                  styles.printOptionItem,
                  selectedPrintFormat === 'a4' && styles.printOptionItemActive,
                ]}
                onPress={() => handlePrintWithFormat('a4')}
                activeOpacity={0.85}
              >
                <View style={[styles.printOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.printOptionTitle}>A4 Size (Full GST Tax Invoice)</Text>
                    <View style={[styles.recommendedBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.recommendedBadgeText, { color: '#1E40AF' }]}>
                        {language === 'mr' ? 'अधिकृत' : language === 'hi' ? 'आधिकारिक' : 'Official'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.printOptionDesc}>
                    {language === 'mr'
                      ? 'पूर्ण पान जीएसटी टॅक्स इनव्हॉइस (HSN, CGST, SGST, बँक तपशील)'
                      : language === 'hi'
                        ? 'फुल पेज जीएसटी टैक्स इनवॉइस (HSN, CGST, SGST, बैंक विवरण)'
                        : 'Full-page GST Tax Invoice with HSN breakdown & bank details'}
                  </Text>
                </View>
                <ArrowRight size={18} color="#2563EB" />
              </TouchableOpacity>
            </View>

            {/* Direct Action Buttons Right Inside Modal */}
            <View style={styles.modalDirectActionsWrap}>
              {/* Button 1: Bluetooth / USB Thermal Print */}
              <TouchableOpacity
                style={styles.modalBtDirectBtn}
                onPress={() => handleDirectBluetoothPrint(selectedPrintFormat)}
                activeOpacity={0.85}
              >
                <Bluetooth size={16} color="#FFFFFF" />
                <Text style={styles.modalBtDirectText}>
                  {language === 'mr'
                    ? `📶 ब्लूटूथ / USB प्रिंट (${selectedPrintFormat.toUpperCase()})`
                    : `📶 Bluetooth / USB Thermal (${selectedPrintFormat.toUpperCase()})`}
                </Text>
              </TouchableOpacity>

              {/* Button 2: Wi-Fi Thermal Print (Port 9100) */}
              <TouchableOpacity
                style={styles.modalWifiBtn}
                onPress={() => handleWifiPrint(selectedPrintFormat)}
                activeOpacity={0.85}
              >
                <Wifi size={16} color="#FFFFFF" />
                <Text style={styles.modalWifiText}>
                  {language === 'mr'
                    ? `🌐 वाय-फाय प्रिंटर (${configuredPrinter?.printerName || 'Wi-Fi POS'})`
                    : `🌐 Wi-Fi Thermal Print (${configuredPrinter?.printerName || 'Port 9100'})`}
                </Text>
              </TouchableOpacity>

              {/* Button 3: System Print Spooler / PDF */}
              <TouchableOpacity
                style={styles.modalSystemPrintBtn}
                onPress={() => handlePrintWithFormat(selectedPrintFormat)}
                activeOpacity={0.85}
              >
                <Printer size={16} color="#9A3412" />
                <Text style={styles.modalSystemPrintText}>
                  {language === 'mr' ? '🖨️ सिस्टिम प्रिंटर / PDF सेव्ह करा' : '🖨️ System Spooler / Save PDF'}
                </Text>
              </TouchableOpacity>

              {/* Button 4: Share Bill PDF */}
              <TouchableOpacity
                style={[styles.modalSystemPrintBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                onPress={() => handleShareBillPdf(selectedPrintFormat)}
                activeOpacity={0.85}
              >
                <Share2 size={16} color="#15803D" />
                <Text style={[styles.modalSystemPrintText, { color: '#15803D' }]}>
                  {language === 'mr' ? '📄 बिल PDF शेअर करा' : '📄 Share Bill PDF'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* In-App Bluetooth / Wi-Fi / USB Guidance (Expo Go Compatible) */}
            <View style={styles.btHelperCard}>
              <View style={styles.btHelperHeader}>
                <View style={styles.btHelperIconCircle}>
                  <Printer size={16} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.btHelperTitle}>
                    {language === 'mr'
                      ? 'थर्मल प्रिंटर कसे वापरावे (Expo Go & Android):'
                      : 'Thermal Printer Setup (Expo Go & Android):'}
                  </Text>
                  <Text style={styles.btHelperSub}>
                    {language === 'mr'
                      ? 'ब्लूटूथ, वाय-फाय आणि USB तिन्ही प्रिंटर सहज चालतील:'
                      : 'Bluetooth, Wi-Fi, and USB thermal printers ready to print:'}
                  </Text>
                </View>
              </View>

              <View style={styles.btHelperSteps}>
                <Text style={styles.btHelperStepText}>
                  📶 {language === 'mr' ? 'ब्लूटूथ: Settings > Bluetooth मध्ये प्रिंटर Pair करा (उदा. POS-80, PIN: 0000/1234) आणि "ब्लूटूथ / USB प्रिंट" दाबा.' : 'Bluetooth: Pair printer in Settings > Bluetooth (PIN: 0000/1234) and tap "Bluetooth / USB Thermal".'}
                </Text>
                <Text style={styles.btHelperStepText}>
                  🌐 {language === 'mr' ? 'वाय-फाय: प्रिंटरचा IP Settings मध्ये टाका (Port 9100) आणि "वाय-फाय प्रिंटर" दाबा - थेट प्रिंट निघेल!' : 'Wi-Fi: Set printer IP in Settings (Port 9100) and tap "Wi-Fi Thermal Print" for instant socket print.'}
                </Text>
                <Text style={styles.btHelperStepText}>
                  🔌 {language === 'mr' ? 'USB: OTG केबलने प्रिंटर जोडा आणि "सिस्टिम प्रिंटर" किंवा "ब्लूटूथ / USB" वरून प्रिंट करा.' : 'USB: Connect printer via OTG adapter and print via System Spooler / USB.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.printCloseModalBtn}
              onPress={() => setPrintFormatModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.printCloseModalText}>
                {language === 'mr' ? 'बंद करा (Cancel)' : language === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Universal Print Modal matching Vite */}
      <MobilePrintInvoiceModal
        visible={printModalVisible}
        onClose={() => setPrintModalVisible(false)}
        invoiceData={printModalData}
      />
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#E7E5E4';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#78716C';
  const textMuted = isDark ? '#64748B' : '#A8A29E';
  const dividerColor = isDark ? '#2A364F' : '#F5F5F4';
  const inputBg = isDark ? '#0F172A' : '#F5F5F4';
  const subBg = isDark ? '#1E293B' : '#F8FAFC';

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F19' : '#FAF7F2',
  },
  headerBar: {
    backgroundColor: cardBg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cardBorder,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breadcrumbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
    marginRight: 6,
  },
  breadcrumbText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: textPrimary,
  },
  screenSub: {
    fontSize: 11,
    color: textSecondary,
    marginTop: 2,
  },

  /* Stepper */
  stepperWrapper: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: dividerColor,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    opacity: 0.5,
  },
  stepItemActive: {
    opacity: 1,
  },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: '#EA580C',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
  },
  stepNumberText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: textSecondary,
  },
  stepNumberActiveText: {
    color: '#EA580C',
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
    marginLeft: 5,
    flexShrink: 1,
  },
  stepTitleActive: {
    color: textPrimary,
    fontWeight: '800',
  },
  stepDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: cardBorder,
    marginHorizontal: 6,
    minWidth: 10,
  },

  scrollContent: {
    padding: 14,
  },

  /* Step 1 Styles */
  stepHeaderCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  stepMiniLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.6,
  },
  stepMainHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 1,
  },
  stepSubHeading: {
    fontSize: 10.5,
    color: textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  quickBillHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flexShrink: 0,
  },
  quickBillHeaderText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  searchAndCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: textPrimary,
    marginLeft: 8,
    paddingVertical: 0,
    height: '100%',
  },
  recordsCountBadge: {
    backgroundColor: inputBg,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  recordsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },

  /* Order Card */
  orderCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: cardBorder,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderCardBillGen: {
    borderColor: isDark ? '#D97706' : '#FCD34D',
    backgroundColor: isDark ? '#1E293B' : '#FFFEFA',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  orderNoCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: textMuted,
    letterSpacing: 0.4,
    marginRight: 6,
    flexShrink: 0,
  },
  orderNoText: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: textPrimary,
  },
  tableBadge: {
    flexShrink: 0,
    maxWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.3)' : '#FED7AA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tableBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    marginLeft: 4,
    flexShrink: 1,
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  metaSubLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: textMuted,
    letterSpacing: 0.4,
  },
  metaCustomerName: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
    marginTop: 2,
  },
  metaDateText: {
    fontSize: 10.5,
    color: textSecondary,
    marginTop: 2,
  },
  metaTotalAmount: {
    fontSize: 15.5,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 2,
  },
  metaItemsCount: {
    fontSize: 10.5,
    color: textSecondary,
    marginTop: 2,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
  },
  billGenPill: {
    flexShrink: 1,
    backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(252, 211, 77, 0.35)' : '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  billGenText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: isDark ? '#FCD34D' : '#B45309',
  },
  activeOrdersPill: {
    flexShrink: 1,
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.3)' : '#FED7AA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  activeOrdersText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#FDBA74' : '#EA580C',
  },
  paidPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(21, 128, 61, 0.2)' : '#DCFCE7',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(134, 239, 172, 0.35)' : '#BBF7D0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  paidPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: isDark ? '#86EFAC' : '#15803D',
    marginLeft: 4,
  },
  actionsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  editOrderBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    backgroundColor: subBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOrderText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: textSecondary,
  },
  generateBillBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#EA580C' : '#1C1917',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  generateBillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 5,
  },
  viewBillBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 5,
  },
  viewInvoiceBtn: {
    minHeight: 34,
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewInvoiceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Step 2 Styles */
  step2HeaderCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  step2HeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FED7AA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  backStepText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#FDBA74' : '#EA580C',
  },
  step2Badge: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  step2BadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    letterSpacing: 0.6,
  },
  step2BannerContent: {
    width: '100%',
  },
  step2MainHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: textPrimary,
    marginBottom: 3,
  },
  step2SubHeading: {
    fontSize: 11.5,
    color: textSecondary,
    lineHeight: 16,
  },
  billOverviewCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
    overflow: 'hidden',
  },
  billOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: textMuted,
    letterSpacing: 0.4,
  },
  overviewVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 2,
  },
  overviewDateVal: {
    fontSize: 11.5,
    color: textSecondary,
    marginTop: 2,
  },
  overviewTableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  overviewTableText: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    marginLeft: 5,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: dividerColor,
    marginVertical: 10,
  },

  /* Items Card */
  itemsCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  itemsCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: textSecondary,
    letterSpacing: 0.5,
  },
  addDishSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
  },
  addDishSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#EA580C',
  },
  dishBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  dishName: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
  },
  dishMeta: {
    fontSize: 10.5,
    color: textSecondary,
    marginTop: 1,
  },
  dishQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
    borderRadius: 8,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  dishQtyBtn: {
    padding: 6,
  },
  dishQtyNum: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    marginHorizontal: 6,
  },
  dishTotal: {
    minWidth: 68,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: textPrimary,
    flexShrink: 0,
  },

  /* Calculation Card */
  calcCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calcLabel: {
    fontSize: 12.5,
    color: textSecondary,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
  },
  quickDiscountsWrap: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: dividerColor,
  },
  quickDiscountTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: textMuted,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  quickDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  quickDiscPill: {
    flex: 1,
    minHeight: 32,
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FED7AA',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickDiscText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#C2410C',
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginLeft: 6,
    flexShrink: 1,
  },
  discountInputBox: {
    width: 88,
    height: 38,
    backgroundColor: inputBg,
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: '800',
    color: textPrimary,
    borderWidth: 1,
    borderColor: cardBorder,
    flexShrink: 0,
  },
  calcDivider: {
    height: 1,
    backgroundColor: cardBorder,
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: textPrimary,
  },
  grandTotalVal: {
    fontSize: 19,
    fontWeight: '900',
    color: isDark ? '#FDBA74' : '#9A3412',
    flexShrink: 0,
  },

  /* Payment Method */
  paymentMethodCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  payOptionBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: inputBg,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: cardBorder,
  },
  payOptionActive: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.22)' : '#FFEDD5',
    borderColor: '#EA580C',
  },
  payOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: textSecondary,
    marginLeft: 6,
    flexShrink: 1,
  },
  payOptionTextActive: {
    color: isDark ? '#FDBA74' : '#9A3412',
  },
  step2Actions: {
    marginTop: 4,
  },
  finalizePayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9A3412',
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 3,
  },
  finalizePayText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },

  /* Step 3 Styles */
  invoiceSuccessBanner: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  invoiceSuccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  invoiceSuccessTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  invoiceSuccessSub: {
    fontSize: 11,
    color: '#DCFCE7',
    marginTop: 4,
    textAlign: 'center',
  },
  invoiceReceiptCard: {
    backgroundColor: cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: cardBorder,
    marginBottom: 16,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  receiptHotelName: {
    fontSize: 15,
    fontWeight: '900',
    color: textPrimary,
    letterSpacing: 0.5,
  },
  receiptHotelSub: {
    fontSize: 10.5,
    color: '#78716C',
    marginTop: 2,
  },
  receiptGst: {
    fontSize: 9.5,
    color: '#A8A29E',
    marginTop: 2,
  },
  receiptDashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: cardBorder,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  receiptMetaCol: {
    flex: 1,
  },
  rLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A8A29E',
  },
  rVal: {
    fontSize: 11,
    fontWeight: '700',
    color: textPrimary,
    marginTop: 1,
  },
  receiptItemsTable: {
    marginVertical: 6,
  },
  receiptTableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  receiptHeadCell: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8A29E',
  },
  receiptTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  receiptTableCell: {
    fontSize: 10.5,
    color: textPrimary,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  rTotalLabel: {
    fontSize: 11,
    color: textSecondary,
  },
  rTotalVal: {
    fontSize: 11,
    fontWeight: '700',
    color: textPrimary,
  },
  receiptGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rGrandTotalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: textPrimary,
  },
  rGrandTotalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#15803D',
  },
  receiptFooterGreeting: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#78716C',
    textAlign: 'center',
    marginTop: 12,
  },
  step3ActionsColumn: {
    marginTop: 12,
    gap: 10,
    width: '100%',
  },
  step3ButtonGridRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  step3ActionCardBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 7,
  },
  systemPrintCardBtn: {
    backgroundColor: '#9A3412',
    shadowColor: '#9A3412',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  systemPrintCardText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  bluetoothCardBtn: {
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  bluetoothCardText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  sharePdfCardBtn: {
    backgroundColor: isDark ? 'rgba(21, 128, 61, 0.2)' : '#DCFCE7',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(134, 239, 172, 0.35)' : '#86EFAC',
  },
  sharePdfCardText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: isDark ? '#86EFAC' : '#15803D',
    flexShrink: 1,
  },
  backToOrdersCardBtn: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FDBA74',
  },
  backToOrdersCardText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    flexShrink: 1,
  },
  modalDirectActionsWrap: {
    marginTop: 12,
    gap: 8,
    marginBottom: 8,
  },
  modalBtDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  modalBtDirectText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalWifiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#16A34A',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  modalWifiText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSystemPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    paddingVertical: 11,
    borderRadius: 10,
  },
  modalSystemPrintText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#9A3412',
  },
  step3Actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  printReceiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9A3412',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  printReceiptText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  shareReceiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  shareReceiptText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 4,
  },
  backToTablesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEDD5',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  backToTablesText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#9A3412',
    marginLeft: 4,
  },
  menuSearchAndAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  modalSearchBoxInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  modalAddDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalAddDishBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  catSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  catSelectChipActive: {
    backgroundColor: '#EA580C',
  },
  catSelectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catSelectChipTextActive: {
    color: '#FFFFFF',
  },
  saveDishSubmitBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  saveDishSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: inputBg,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: textPrimary,
  },
  menuItemPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  menuPickerName: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
  },
  menuPickerSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 1,
  },
  addPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addPickerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: textPrimary,
    marginBottom: 6,
  },
  tblPill: {
    backgroundColor: inputBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  tblPillActive: {
    backgroundColor: '#9A3412',
  },
  tblPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  tblPillTextActive: {
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    color: textPrimary,
    borderWidth: 1,
    borderColor: cardBorder,
    marginBottom: 14,
  },
  createQuickBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9A3412',
    paddingVertical: 12,
    borderRadius: 8,
  },
  createQuickBillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  /* Success Confirmation Modal Styles */
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: cardBg,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: subBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  successDetailKey: {
    fontSize: 11.5,
    color: textSecondary,
    fontWeight: '600',
    flexShrink: 0,
  },
  successInvoiceVal: {
    fontSize: 12,
    fontWeight: '800',
    color: textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  successDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  successDivider: {
    height: 1,
    backgroundColor: cardBorder,
    marginVertical: 4,
  },
  successAmountVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
  },
  successModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  successModeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
  },
  settledGreenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  settledGreenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  syncNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    width: '100%',
  },
  syncNoticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  syncNoticeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
    flex: 1,
  },
  successActionButtons: {
    width: '100%',
    marginTop: 16,
    gap: 9,
  },
  goToPaymentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 13,
    shadowColor: '#EA580C',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  goToPaymentsText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalViewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingVertical: 11,
  },
  modalViewInvoiceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  modalBackToTablesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: subBg,
    borderRadius: 10,
    paddingVertical: 9,
  },
  modalBackToTablesText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  // Print Format & Size Styles
  formatSelectorBox: {
    backgroundColor: cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  formatSelectorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  formatSelectorHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: textSecondary,
  },
  activeFormatBadge: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FDBA74',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeFormatBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#EA580C',
  },
  formatSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formatChip: {
    flex: 1,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipActive: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  formatChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  formatChipTextActive: {
    color: isDark ? '#FDBA74' : '#EA580C',
    fontWeight: '800',
  },
  pickFormatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3,
  },
  pickFormatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
  },
  modalDirectPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 13,
    shadowColor: '#EA580C',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    marginTop: 6,
  },
  modalDirectPrintText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  printSizeModalCard: {
    width: '94%',
    maxWidth: 440,
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  printOptionsContainer: {
    gap: 10,
    marginVertical: 14,
  },
  printOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: subBg,
    borderWidth: 1.5,
    borderColor: cardBorder,
    gap: 12,
  },
  printOptionItemActive: {
    borderColor: '#EA580C',
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
  },
  printOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: textPrimary,
  },
  printOptionDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  recommendedBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  /* Bluetooth Helper Styles */
  btHelperCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 10,
    marginBottom: 6,
  },
  btHelperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  btHelperIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btHelperTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  btHelperSub: {
    fontSize: 10.5,
    color: '#3B82F6',
    marginTop: 1,
  },
  btHelperSteps: {
    backgroundColor: cardBg,
    borderRadius: 8,
    padding: 8,
    gap: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  btHelperStepText: {
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 16,
  },
  btHelperPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btHelperPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  printCloseModalBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: inputBg,
    borderRadius: 10,
    marginTop: 4,
  },
  printCloseModalText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: textSecondary,
  },
  /* Pagination Styles */
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cardBg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  paginationBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  paginationBtnDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    opacity: 0.25,
  },
  pageNavArrowText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EA580C',
    lineHeight: 24,
  },
  pageNavArrowTextDisabled: {
    color: '#D6D3D1',
  },
  paginationInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationPagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNumberBtn: {
    minWidth: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: inputBg,
    paddingHorizontal: 6,
  },
  pageNumberBtnActive: {
    backgroundColor: '#EA580C',
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: textSecondary,
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  paginationEllipsis: {
    fontSize: 12,
    color: '#A8A29E',
    paddingHorizontal: 2,
  },
  paginationTotalText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 2,
  },
  emptyBillsCard: {
    backgroundColor: cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cardBorder,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyBillsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyBillsSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBillsBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  emptyBillsPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBillsPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyBillsSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBillsSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  });
};
