import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  printCustomerBill,
  printCustomerBill80mm,
  printCustomerBill58mm,
  printCustomerBillA4,
  PrintFormat,
  BillPrintData,
} from '../../utils/thermalPrinter';
import { shareTextToWhatsApp } from '../../utils/reportExporter';
import { notificationManager } from '../../utils/notificationManager';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
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
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HotelBillingScreen: React.FC<{ route?: any; navigation?: any }> = ({
  route,
  navigation,
}) => {
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
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);

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
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
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

  // Track if we already handled incoming route params so they don't overwrite manual clicks
  const handledParamKeyRef = useRef<string>('');

  // Initial Load & Subscription
  useEffect(() => {
    loadData();
    restaurantStore.loadMenuItemsFromBackend().then((items) => {
      if (items && items.length > 0) setMenuItems(items);
    }).catch(() => {
      setMenuItems(restaurantStore.getMenuItems());
    });
    const unsubscribeStore = restaurantStore.subscribe(() => {
      loadData(false);
      setMenuItems(restaurantStore.getMenuItems());
    });
    const unsubscribeFocus = navigation?.addListener?.('focus', () => {
      loadData(false);
      setMenuItems(restaurantStore.getMenuItems());
    });
    return () => {
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId]);

  const loadData = async (checkParams: boolean = true) => {
    const list = await restaurantStore.getOrders(activeBranchNumId);
    setOrders(list);

    if (checkParams && route?.params) {
      const orderIdParam = route?.params?.orderId;
      const tableParam = route?.params?.tableNumber;
      const stepParam = route?.params?.step;
      const paramKey = `${orderIdParam || ''}_${tableParam || ''}_${stepParam || ''}`;

      if (paramKey !== handledParamKeyRef.current && (orderIdParam || tableParam)) {
        handledParamKeyRef.current = paramKey;
        const found = await restaurantStore.getOrderByIdOrTable(orderIdParam, tableParam);
        if (found) {
          selectOrderImmediately(found, stepParam ? (stepParam as 1 | 2 | 3) : 2);
        }
      }
    }
  };

  // Re-check when route params change (e.g. user clicked Proceed to Payment from Tables)
  useEffect(() => {
    if (route?.params) {
      const orderIdParam = route.params.orderId;
      const tableParam = route.params.tableNumber;
      const stepParam = route.params.step;
      const paramKey = `${orderIdParam || ''}_${tableParam || ''}_${stepParam || ''}`;

      if (paramKey && paramKey !== handledParamKeyRef.current) {
        handledParamKeyRef.current = paramKey;
        restaurantStore.getOrderByIdOrTable(orderIdParam, tableParam).then((found: ActiveOrder | null) => {
          if (found) {
            selectOrderImmediately(found, stepParam ? (stepParam as 1 | 2 | 3) : 2);
          }
        });
      }
    }
  }, [route?.params]);

  // Synchronous order selection helper (zero click latency)
  const selectOrderImmediately = (order: ActiveOrder, step: 1 | 2 | 3 = 2) => {
    setSelectedOrder(order);
    setOrderItemsList([...order.items]);
    setDiscountInput(order.discountAmount ? String(order.discountAmount) : '0');
    setPaymentMode('CASH');
    setCurrentStep(step);
    restaurantStore.markOrderForBilling(order.id).catch(console.warn);
  };

  // Active records count
  const activeRecordsCount = orders.filter((o) => o.status !== 'PAID').length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = o.customer.toLowerCase().includes(q);
      const matchTable = o.tableNumber.toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchTable) return false;
    }
    return true;
  });

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
    setAddItemModalVisible(false);
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
      const { invoiceNumber, paidOrder, paymentRecord } = await restaurantStore.finalizeBillAndPay(
        selectedOrder.id,
        paymentMode,
        disc,
        activeBranchNumId
      );
      setGeneratedInvoiceNumber(invoiceNumber);
      setFinalPaidOrder(paidOrder);
      setSuccessPaymentData({
        invoiceNumber,
        amount: paidOrder.total,
        tableName: paidOrder.tableNumber,
        customer: paidOrder.customer,
        paymentMode,
        date: paymentRecord?.date || 'Today',
        time: paymentRecord?.time || 'Just now',
        referenceNo: paymentRecord?.referenceNo,
      });
      // Emit live notification for navbar
      notificationManager.addNotification({
        title: 'Bill Settled',
        desc: `${paidOrder.tableNumber} bill of ₹${paidOrder.total} settled via ${paymentMode}`,
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
    setCurrentStep(1);
    try {
      navigation?.navigate('Payments');
    } catch (e) {
      try {
        navigation?.navigate('MainApp', { screen: 'Payments' });
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
      hotelName: activeBranch?.name || 'Hotel Management',
      hotelAddress: activeBranch?.address || 'Shop No. 12, Shree Complex, Pune - 411028',
      phone: activeBranch?.phone || '+91 98765 43210',
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

  const handlePrintWithFormat = async (format: PrintFormat = selectedPrintFormat) => {
    try {
      setIsPrinting(true);
      setSelectedPrintFormat(format);
      const data = getBillPrintPayload();
      await printCustomerBill(data, format);
      setPrintFormatModalVisible(false);
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

  const renderBillingHeader = () => (
    <View style={styles.headerBar}>
      <View style={styles.breadcrumbRow}>
        <View style={styles.breadcrumbDot} />
        <Text style={styles.breadcrumbText}>{t('billing', 'Billing')} / {t('invoices', 'Invoices')}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, gap: 5 }}>
          <Building2 size={12} color="#EA580C" />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#9A3412' }}>{activeBranch.name}</Text>
        </View>
      </View>

      <Text style={styles.screenHeading}>{t('billing', 'Billing')}</Text>

      {/* 3-Step Checkout Flow Stepper (Clickable Stepper) */}
      <View style={styles.stepperWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepperContainer}
        >
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
            <Text style={[styles.stepTitle, currentStep === 1 && styles.stepTitleActive]}>
              {t('activeOrders', 'Active Orders')}
            </Text>
          </TouchableOpacity>

          <View style={styles.stepDividerLine} />

          {/* Step 2 */}
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}
            onPress={() => {
              if (selectedOrder) {
                setCurrentStep(2);
              } else if (orders.length > 0) {
                selectOrderImmediately(orders[0], 2);
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
            <Text style={[styles.stepTitle, currentStep === 2 && styles.stepTitleActive]}>
              {t('oneClickBilling', 'One-Click Billing')}
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
            <Text style={[styles.stepTitle, currentStep === 3 && styles.stepTitleActive]}>
              {t('generatedInvoice', 'Generated Invoice')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

      {/* ===================================================
          STEP 1: ACTIVE ORDERS LIST (Screenshot 2)
      =================================================== */}
      {currentStep === 1 && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderBillingHeader()}
          {/* Step 1 Title Banner */}
          <View style={styles.stepHeaderCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepMiniLabel}>{t('step', 'STEP')} {toDevanagari(1)}</Text>
              <Text style={styles.stepMainHeading}>{t('activeOrders', 'Active Orders')}</Text>
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
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color="#78716C" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.recordsCountBadge}>
              <Text style={styles.recordsCountText}>{toDevanagari(activeRecordsCount)} {t('records', 'Records')}</Text>
            </View>
          </View>

          {/* Table / Cards of Orders (ENTIRE CARD IS CLICKABLE!) */}
          {filteredOrders.map((order) => {
            const isBillGenerated = order.status === 'BILL GENERATED';
            const isPaid = order.status === 'PAID';

            return (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, isBillGenerated && styles.orderCardBillGen]}
                onPress={() => {
                  if (isPaid) {
                    setSelectedOrder(order);
                    setFinalPaidOrder(order);
                    setGeneratedInvoiceNumber(order.invoiceNumber || `#INV-${order.id}`);
                    setCurrentStep(3);
                  } else {
                    selectOrderImmediately(order, 2);
                  }
                }}
                activeOpacity={0.75}
              >
                {/* Header row: Order No, Date & Table */}
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderNoCol}>
                    <Text style={styles.orderNoLabel}>{t('orderNo', 'ORDER NO')}</Text>
                    <Text style={styles.orderNoText}>#{toDevanagari(order.id)}</Text>
                  </View>

                  <View style={styles.tableBadge}>
                    <UtensilsCrossed size={12} color="#9A3412" />
                    <Text style={styles.tableBadgeText}>{formatTableName(order.tableNumber)}</Text>
                  </View>
                </View>

                {/* Customer & Date */}
                <View style={styles.orderMetaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaSubLabel}>{t('customer', 'CUSTOMER')}</Text>
                    <Text style={styles.metaCustomerName}>{localizeGuestName(order.customer)}</Text>
                    <Text style={styles.metaDateText}>{formatDate(order.date, { showDayOfWeek: false })}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaSubLabel}>{t('total', 'TOTAL')}</Text>
                    <Text style={styles.metaTotalAmount}>₹ {toDevanagari(order.total.toFixed(2))}</Text>
                    <Text style={styles.metaItemsCount}>{toDevanagari(order.itemsCount)} {t('items', 'Items')}</Text>
                  </View>
                </View>

                {/* Status & Action */}
                <View style={styles.orderBottomRow}>
                  {/* Status Indicator */}
                  {isPaid ? (
                    <View style={styles.paidPill}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <Text style={styles.paidPillText}>{translateStatus('PAID')}</Text>
                    </View>
                  ) : isBillGenerated ? (
                    <View style={styles.billGenPill}>
                      <Text style={styles.billGenText}>{t('billGenerated', 'BILL GENERATED')}</Text>
                    </View>
                  ) : (
                    <View style={styles.activeOrdersPill}>
                      <Text style={styles.activeOrdersText}>{t('activeOrders', 'Active Orders')}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsBtnGroup}>
                    <TouchableOpacity
                      style={styles.editOrderBtn}
                      onPress={() => selectOrderImmediately(order, 2)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editOrderText}>{t('edit', 'Edit')}</Text>
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
                        <Text style={styles.viewInvoiceText}>{t('invoice', 'Invoice')}</Text>
                      </TouchableOpacity>
                    ) : isBillGenerated ? (
                      <TouchableOpacity
                        style={styles.viewBillBtn}
                        onPress={() => selectOrderImmediately(order, 2)}
                        activeOpacity={0.85}
                      >
                        <Receipt size={13} color="#FFFFFF" />
                        <Text style={styles.viewBillText}>{t('viewBill', 'View Bill')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.generateBillBtn}
                        onPress={() => selectOrderImmediately(order, 2)}
                        activeOpacity={0.85}
                      >
                        <Receipt size={13} color="#FFFFFF" />
                        <Text style={styles.generateBillText}>{t('generateBill', 'Generate Bill')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

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
          <View style={styles.stepHeaderCard}>
            <TouchableOpacity
              style={styles.backStepBtn}
              onPress={() => setCurrentStep(1)}
              activeOpacity={0.8}
            >
              <ArrowLeft size={16} color="#78716C" />
              <Text style={styles.backStepText}>{t('backToOrders', 'Back to Orders')}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.stepMiniLabel}>{t('step', 'STEP')} {toDevanagari(2)}</Text>
              <Text style={styles.stepMainHeading}>{t('oneClickBilling', 'One-Click Billing')}</Text>
              <Text style={styles.stepSubHeading}>
                {t('billingStep2Sub', 'Review ordered dishes, apply GST / Discounts, and finalize customer payment.')}
              </Text>
            </View>
          </View>

          {/* Table & Order Info Card */}
          <View style={styles.billOverviewCard}>
            <View style={styles.billOverviewRow}>
              <View>
                <Text style={styles.overviewLabel}>{t('orderNo', 'ORDER NO')}</Text>
                <Text style={styles.overviewVal}>#{toDevanagari(selectedOrder.id)}</Text>
              </View>
              <View style={styles.overviewTableBadge}>
                <UtensilsCrossed size={14} color="#9A3412" />
                <Text style={styles.overviewTableText}>{formatTableName(selectedOrder.tableNumber)}</Text>
              </View>
            </View>

            <View style={styles.overviewDivider} />

            <View style={styles.billOverviewRow}>
              <View>
                <Text style={styles.overviewLabel}>{t('customer', 'CUSTOMER')}</Text>
                <Text style={styles.overviewVal}>{localizeGuestName(selectedOrder.customer)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.overviewLabel}>{t('orderDate', 'ORDER DATE')}</Text>
                <Text style={styles.overviewDateVal}>{formatDate(selectedOrder.date, { showDayOfWeek: false })}</Text>
              </View>
            </View>
          </View>

          {/* Itemized Dishes List with Live Quantity Adjustment */}
          <View style={styles.itemsCard}>
            <View style={styles.itemsCardHeaderRow}>
              <Text style={styles.cardSectionTitle}>{t('orderedDishes', 'ORDERED DISHES')} ({toDevanagari(orderItemsList.length)})</Text>
              <TouchableOpacity
                style={styles.addDishSmallBtn}
                onPress={() => setAddItemModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={13} color="#EA580C" />
                <Text style={styles.addDishSmallText}>+ {t('addDish', 'Add Dish')}</Text>
              </TouchableOpacity>
            </View>

            {orderItemsList.map((item, idx) => (
              <View key={idx} style={styles.dishBillRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.dishName}>{getLocalizedMenuItemName(item.name)}</Text>
                  <Text style={styles.dishMeta}>₹{toDevanagari(item.price)} {t('perItem', 'per item')}</Text>
                </View>

                {/* Qty +/- Controls */}
                <View style={styles.dishQtyBox}>
                  <TouchableOpacity
                    style={styles.dishQtyBtn}
                    onPress={() => handleUpdateItemQtyInBill(idx, -1)}
                    activeOpacity={0.8}
                  >
                    <Minus size={13} color="#9A3412" />
                  </TouchableOpacity>
                  <Text style={styles.dishQtyNum}>{toDevanagari(item.quantity)}</Text>
                  <TouchableOpacity
                    style={styles.dishQtyBtn}
                    onPress={() => handleUpdateItemQtyInBill(idx, 1)}
                    activeOpacity={0.8}
                  >
                    <Plus size={13} color="#9A3412" />
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
              <Text style={styles.calcLabel}>{t('subtotal', 'Item Subtotal')}</Text>
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
                  <Text style={styles.quickDiscText}>₹{toDevanagari(50)} {t('off', 'Off')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyQuickDiscount(100)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText}>₹{toDevanagari(100)} {t('off', 'Off')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyPercentDiscount(5)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText}>{toDevanagari(5)}% {t('off', 'Off')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDiscPill}
                  onPress={() => applyPercentDiscount(10)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDiscText}>{toDevanagari(10)}% {t('off', 'Off')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Discount Input */}
            <View style={styles.discountInputRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Tag size={15} color="#EA580C" />
                <Text style={styles.discountLabel}>{t('specialDiscount', 'Special Discount (₹)')}</Text>
              </View>
              <TextInput
                style={styles.discountInputBox}
                keyboardType="numeric"
                value={discountInput}
                onChangeText={setDiscountInput}
                placeholder="0"
              />
            </View>

            <View style={styles.calcDivider} />

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{t('netPayableAmount', 'Net Payable Amount')}</Text>
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
                <Banknote size={20} color={paymentMode === 'CASH' ? '#9A3412' : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'CASH' && styles.payOptionTextActive]}>
                  {t('cash', 'Cash')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMode === 'UPI' && styles.payOptionActive]}
                onPress={() => setPaymentMode('UPI')}
                activeOpacity={0.8}
              >
                <QrCode size={20} color={paymentMode === 'UPI' ? '#9A3412' : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'UPI' && styles.payOptionTextActive]}>
                  {t('upiQr', 'UPI / QR')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMode === 'CARD' && styles.payOptionActive]}
                onPress={() => setPaymentMode('CARD')}
                activeOpacity={0.8}
              >
                <CreditCard size={20} color={paymentMode === 'CARD' ? '#9A3412' : '#78716C'} />
                <Text style={[styles.payOptionText, paymentMode === 'CARD' && styles.payOptionTextActive]}>
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
            <View style={styles.receiptMetaGrid}>
              <View style={styles.receiptMetaCol}>
                <Text style={styles.rLabel}>{t('invoiceNumber', 'INVOICE NO:')}</Text>
                <Text style={styles.rVal}>{toDevanagari(generatedInvoiceNumber || finalPaidOrder?.invoiceNumber || '#INV-101')}</Text>
              </View>
              <View style={[styles.receiptMetaCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.rLabel}>{t('dateTime', 'DATE & TIME:')}</Text>
                <Text style={styles.rVal}>{finalPaidOrder?.date ? formatDate(finalPaidOrder.date) : formatDate(new Date())}</Text>
              </View>
            </View>

            <View style={styles.receiptMetaGrid}>
              <View style={styles.receiptMetaCol}>
                <Text style={styles.rLabel}>{t('tables', 'TABLE:')}</Text>
                <Text style={styles.rVal}>{formatTableName(finalPaidOrder?.tableNumber || selectedOrder?.tableNumber)}</Text>
              </View>
              <View style={[styles.receiptMetaCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.rLabel}>{t('paymentMethod', 'PAYMENT MODE:')}</Text>
                <Text style={[styles.rVal, { color: '#16A34A', fontWeight: '800' }]}>
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
                <View key={i} style={styles.receiptTableRow}>
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

          {/* Step 3 Action Buttons */}
          <View style={styles.step3Actions}>
            <TouchableOpacity
              style={[styles.printReceiptBtn, isPrinting && { opacity: 0.7 }]}
              onPress={() => handlePrintWithFormat(selectedPrintFormat)}
              disabled={isPrinting}
              activeOpacity={0.85}
            >
              <Printer size={16} color="#FFFFFF" />
              <Text style={styles.printReceiptText}>
                {isPrinting
                  ? (language === 'mr' ? 'प्रिंट...' : language === 'hi' ? 'प्रिंट...' : 'Printing...')
                  : `${t('print', 'Print')} (${selectedPrintFormat.toUpperCase()})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickFormatBtn}
              onPress={() => setPrintFormatModalVisible(true)}
              activeOpacity={0.85}
            >
              <FileText size={14} color="#9A3412" />
              <Text style={styles.pickFormatText}>
                {language === 'mr' ? 'आकार' : language === 'hi' ? 'साइज़' : 'Sizes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareReceiptBtn}
              onPress={async () => {
                const invNumber = generatedInvoiceNumber || finalPaidOrder?.invoiceNumber || '#INV-101';
                const table = finalPaidOrder?.tableNumber || selectedOrder?.tableNumber || 'Table';
                const total = Number(finalPaidOrder?.total || calculatedGrandTotal || 0);
                const items = (finalPaidOrder?.items || orderItemsList || [])
                  .map((d) => `• ${d.name} x ${d.quantity} = ₹${d.price * d.quantity}`)
                  .join('\n');

                const msg = `🏨 *Royal Palace Hotel*\n🧾 *TAX INVOICE*: ${invNumber}\n🪑 *${table}* | *Guest*: ${finalPaidOrder?.customer || selectedOrder?.customer || 'Guest'}\n--------------------------------\n${items}\n--------------------------------\n*Total Amount: ₹${total.toLocaleString('en-IN')}*\nPayment Mode: ${finalPaidOrder?.paymentMode || paymentMode}\n_Thank you for visiting!_`;

                await shareTextToWhatsApp(msg);
              }}
              activeOpacity={0.85}
            >
              <Share2 size={15} color="#15803D" />
              <Text style={styles.shareReceiptText}>{t('shareWhatsApp', 'WhatsApp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToTablesBtn}
              onPress={() => navigation.navigate('Tables')}
              activeOpacity={0.85}
            >
              <UtensilsCrossed size={15} color="#9A3412" />
              <Text style={styles.backToTablesText}>{t('goToFloorTables', 'Floor')}</Text>
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
              <View>
                <Text style={styles.modalTitle}>{t('addDishToBill', 'Add Dish to Bill')}</Text>
                <Text style={styles.modalSub}>{formatTableName(selectedOrder?.tableNumber)} {t('selectItemFromMenu', 'साठी मेनूमधून पदार्थ जोडा')}</Text>
              </View>
              <TouchableOpacity onPress={() => setAddItemModalVisible(false)}>
                <X size={20} color="#78716C" />
              </TouchableOpacity>
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
                <Text style={styles.modalAddDishBtnText}>+ {t('addDish', 'Add Dish')}</Text>
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
                .map((item) => (
                  <View key={item.id} style={styles.menuItemPickerRow}>
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
                {['Table 01', 'Table 06', 'Table 10', 'Table 11', 'Table 13', 'Table 15', 'Takeaway'].map((tbl) => (
                  <TouchableOpacity
                    key={tbl}
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
                <Receipt size={16} color="#FFFFFF" />
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
                  <Text style={styles.successInvoiceVal}>
                    {language === 'mr' || language === 'hi' ? toDevanagari(successPaymentData.invoiceNumber) : String(successPaymentData.invoiceNumber)}
                  </Text>
                </View>

                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>
                    {language === 'mr' ? 'टेबल / ग्राहक' : language === 'hi' ? 'टेबल / अतिथि' : 'Table / Guest'}
                  </Text>
                  <Text style={styles.successDetailVal}>
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

            {/* Auto-Sync note */}
            <View style={styles.syncNoticeRow}>
              <View style={styles.syncNoticeDot} />
              <Text style={styles.syncNoticeText}>
                {language === 'mr'
                  ? 'हे पेमेंट आपोआप Payments मॉड्यूलमध्ये जोडले गेले आहे!'
                  : language === 'hi'
                  ? 'यह भुगतान स्वचालित रूप से Payments मॉड्यूल में जोड़ दिया गया है!'
                  : 'This payment is automatically synced to the Payments module!'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.successActionButtons}>
              {/* Primary button: Go to Payments (Direct user requirement) */}
              <TouchableOpacity
                style={styles.goToPaymentsBtn}
                onPress={handleGoToPayments}
                activeOpacity={0.85}
              >
                <CreditCard size={18} color="#FFFFFF" />
                <Text style={styles.goToPaymentsText}>
                  {language === 'mr' ? 'पेमेंट्समध्ये पहा' : language === 'hi' ? 'भुगतान में देखें' : 'View in Payments'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Direct Print Button with 80mm / 58mm / A4 Format Selection */}
              <TouchableOpacity
                style={styles.modalDirectPrintBtn}
                onPress={() => setPrintFormatModalVisible(true)}
                activeOpacity={0.85}
              >
                <Printer size={18} color="#FFFFFF" />
                <Text style={styles.modalDirectPrintText}>
                  {language === 'mr'
                    ? '🖨️ बिल प्रिंट करा (80mm / 58mm / A4)'
                    : language === 'hi'
                    ? '🖨️ बिल प्रिंट करें (80mm / 58mm / A4)'
                    : '🖨️ Print Bill (80mm / 58mm / A4)'}
                </Text>
              </TouchableOpacity>

              {/* View Tax Invoice / Receipt */}
              <TouchableOpacity
                style={styles.modalViewInvoiceBtn}
                onPress={handleViewInvoiceFromSuccess}
                activeOpacity={0.8}
              >
                <Receipt size={16} color="#EA580C" />
                <Text style={styles.modalViewInvoiceText}>
                  {language === 'mr' ? 'जीएसटी बिल पहा / प्रिंट' : language === 'hi' ? 'जीएसटी बिल देखें / प्रिंट' : 'View GST Invoice / Print'}
                </Text>
              </TouchableOpacity>

              {/* Back to Tables */}
              <TouchableOpacity
                style={styles.modalBackToTablesBtn}
                onPress={handleGoToTablesFromSuccess}
                activeOpacity={0.7}
              >
                <UtensilsCrossed size={14} color="#78716C" />
                <Text style={styles.modalBackToTablesText}>
                  {language === 'mr' ? 'टेबल्सकडे जा' : language === 'hi' ? 'टेबल्स पर जाएं' : 'Go to Tables'}
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
                <Text style={styles.modalTitle}>+ {t('addNewDish', 'Add New Dish to Menu')}</Text>
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
                {['Main Course', 'Starters', 'Breads', 'Rice', 'Dessert', 'Beverages', 'Chinese'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
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
                  <Receipt size={22} color="#16A34A" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    marginBottom: 12,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1917',
  },
  screenSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },

  /* Stepper */
  stepperWrapper: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#78716C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFEDD5',
  },
  stepNumberText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#78716C',
  },
  stepNumberActiveText: {
    color: '#EA580C',
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 5,
  },
  stepTitleActive: {
    color: '#1C1917',
  },
  stepDividerLine: {
    width: 14,
    height: 1,
    backgroundColor: '#E7E5E4',
    marginHorizontal: 6,
  },

  scrollContent: {
    padding: 16,
  },

  /* Step 1 Styles */
  stepHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepMiniLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.6,
  },
  stepMainHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 1,
  },
  stepSubHeading: {
    fontSize: 10.5,
    color: '#78716C',
    marginTop: 2,
    maxWidth: 240,
  },
  quickBillHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  quickBillHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  searchAndCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1C1917',
    marginLeft: 8,
  },
  recordsCountBadge: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  recordsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
  },

  /* Order Card */
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardBillGen: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFEFA',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  orderNoCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.4,
    marginRight: 6,
  },
  orderNoText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tableBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
    marginLeft: 4,
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  metaSubLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.4,
  },
  metaCustomerName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
    marginTop: 2,
  },
  metaDateText: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  metaTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 2,
  },
  metaItemsCount: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  billGenPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  billGenText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
  },
  activeOrdersPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeOrdersText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paidPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 4,
  },
  actionsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editOrderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  editOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
  },
  generateBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1917',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  generateBillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  viewBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewBillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  viewInvoiceBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewInvoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Step 2 Styles */
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backStepText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 4,
  },
  billOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  billOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.4,
  },
  overviewVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 2,
  },
  overviewDateVal: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  overviewTableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overviewTableText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
    marginLeft: 5,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: '#F5F5F4',
    marginVertical: 10,
  },

  /* Items Card */
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  itemsCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#57534E',
    letterSpacing: 0.5,
  },
  addDishSmallBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFEDD5',
  },
  addDishSmallText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  dishBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  dishName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  dishMeta: {
    fontSize: 10.5,
    color: '#78716C',
    marginTop: 1,
  },
  dishQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 2,
    marginRight: 10,
  },
  dishQtyBtn: {
    padding: 6,
  },
  dishQtyNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
    marginHorizontal: 6,
  },
  dishTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },

  /* Calculation Card */
  calcCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  calcLabel: {
    fontSize: 12,
    color: '#57534E',
  },
  calcVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
  },
  quickDiscountsWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  quickDiscountTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  quickDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickDiscPill: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  quickDiscText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C2410C',
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginLeft: 6,
  },
  discountInputBox: {
    width: 84,
    height: 36,
    backgroundColor: '#F5F5F4',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#E7E5E4',
    marginVertical: 10,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  grandTotalVal: {
    fontSize: 19,
    fontWeight: '900',
    color: '#9A3412',
  },

  /* Payment Method */
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  payOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F4',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
  },
  payOptionActive: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
  },
  payOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 6,
  },
  payOptionTextActive: {
    color: '#9A3412',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    marginBottom: 16,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  receiptHotelName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
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
    borderColor: '#E7E5E4',
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
    color: '#1C1917',
    marginTop: 1,
  },
  receiptItemsTable: {
    marginVertical: 6,
  },
  receiptTableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
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
    borderBottomColor: '#FAFAF9',
  },
  receiptTableCell: {
    fontSize: 10.5,
    color: '#1C1917',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  rTotalLabel: {
    fontSize: 11,
    color: '#57534E',
  },
  rTotalVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
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
    color: '#1C1917',
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
    backgroundColor: '#F5F5F4',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F5F5F4',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  modalSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#1C1917',
  },
  menuItemPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  menuPickerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
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
    color: '#44403C',
    marginBottom: 6,
  },
  tblPill: {
    backgroundColor: '#F5F5F4',
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
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#E7E5E4',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailKey: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  successInvoiceVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  successDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  successDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#475569',
  },
  activeFormatBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeFormatBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  formatSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  formatChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  formatChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  formatChipTextActive: {
    color: '#EA580C',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  printOptionItemActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  printOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  printOptionDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
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
  printCloseModalBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginTop: 4,
  },
  printCloseModalText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
});
