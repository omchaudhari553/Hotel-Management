import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  restaurantStore,
  KOTTicket,
  KOTOrderItem,
} from '../../api/restaurantStore';
import { useBranch } from '../../context/BranchContext';
import { printKotTicket80mm } from '../../utils/thermalPrinter';
import { UniversalInvoicePrintData } from '../../types/printing';
import { MobilePrintInvoiceModal } from '../../components/MobilePrintInvoiceModal';
import {
  ChefHat,
  Printer,
  CheckCircle2,
  Search,
  RotateCcw,
  Receipt,
  UtensilsCrossed,
  User,
  Calendar,
  ArrowRight,
  Eye,
  FileText,
  X,
  Building2,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fast equality check to prevent needless re-renders of the list
const areKotsEqual = (a: KOTTicket[], b: KOTTicket[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (
      itemA.id !== itemB.id ||
      itemA.kitchenStatus !== itemB.kitchenStatus ||
      itemA.billingStatus !== itemB.billingStatus ||
      itemA.totalQty !== itemB.totalQty ||
      itemA.tableNumber !== itemB.tableNumber ||
      itemA.items.length !== itemB.items.length
    ) {
      return false;
    }
  }
  return true;
};

// Memoized KOT Card component to prevent re-rendering unaffected cards
const KOTCardItem = React.memo<{
  kot: KOTTicket;
  styles: any;
  toDevanagari: (v: any) => string;
  formatTableName: (t: string) => string;
  localizeGuestName: (g: string) => string;
  getLocalizedMenuItemName: (m: string) => string;
  translateStatus: (s: string) => string;
  t: (k: string, d: string) => string;
  onAdvanceStatus?: (kot: KOTTicket) => void;
  onBillPay: (kot: KOTTicket) => void;
  onOpenPrintModal: (kot: KOTTicket) => void;
  onPreviewKot: (kot: KOTTicket) => void;
  onNavigateBilling: (tableNumber: string, orderId: string, step: number) => void;
}>(({
  kot,
  styles,
  toDevanagari,
  formatTableName,
  localizeGuestName,
  getLocalizedMenuItemName,
  translateStatus,
  t,
  onAdvanceStatus,
  onBillPay,
  onOpenPrintModal,
  onPreviewKot,
  onNavigateBilling,
}) => {
  const isPaid = kot.billingStatus === 'Paid';

  return (
    <View style={styles.kotCard}>
      <TouchableOpacity
        onPress={() => {
          if (!isPaid) {
            onBillPay(kot);
          } else {
            onNavigateBilling(kot.tableNumber, kot.orderId, 3);
          }
        }}
        activeOpacity={0.8}
      >
      {/* Card Header: KOT No & Table */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kotNumberText}>#{toDevanagari(kot.id.replace('#', ''))}</Text>
        </View>

        {/* Table Box */}
        <View style={styles.tableBox}>
          <UtensilsCrossed size={13} color="#C2410C" />
          <Text style={styles.tableBoxText}>{formatTableName(kot.tableNumber)}</Text>
        </View>
      </View>

      {/* Guest Info */}
      <View style={styles.guestRow}>
        <View style={styles.guestIconCircle}>
          <User size={12} color="#57534E" />
        </View>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.guestName}>{localizeGuestName(kot.guestName)}</Text>
        </View>

      </View>

      {/* Items Breakdown Pills (Exact Screenshot 1 Style) */}
      <View style={styles.itemsBreakdownWrap}>
        <Text style={styles.itemsLabel}>{t('itemsBreakdown', 'ITEMS BREAKDOWN:')}</Text>
        <View style={styles.pillsRow}>
          {kot.items.map((item, idx) => (
            <View key={idx} style={styles.dishPill}>
              <Text style={styles.dishPillText}>
                {getLocalizedMenuItemName(item.name)} × {toDevanagari(item.quantity)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats & Status Bar */}
      <View style={styles.statusBarRow}>
        {/* Total Qty */}
        <View style={[styles.statusCol, styles.statusColDivider]}>
          <Text style={styles.colLabel}>{t('qty', 'QTY')}</Text>
          <Text style={styles.qtyVal}>{toDevanagari(kot.totalQty)}</Text>
        </View>

        {/* Billing Status */}
        <View style={styles.statusCol}>
          <Text style={styles.colLabel}>{t('billingStatus', 'BILLING STATUS')}</Text>
          {isPaid ? (
            <View style={styles.paidBadge}>
              <CheckCircle2 size={11} color="#15803D" />
              <Text style={styles.paidBadgeText}>{translateStatus('PAID')}</Text>
            </View>
          ) : (
            <Text style={styles.notBilledText}>{t('notBilled', 'Not Billed')}</Text>
          )}
          {kot.invoiceNumber ? (
            <Text style={styles.invoiceSub}>{toDevanagari(kot.invoiceNumber)}</Text>
          ) : null}
        </View>
      </View>
      </TouchableOpacity>

      {/* Card Bottom Actions Row (Icon Buttons Only - Alignment & Flow Optimized) */}
      <View style={styles.actionsRow}>
        {/* Bill / Pay Icon Button */}
        {!isPaid ? (
          <TouchableOpacity
            style={[styles.roundActionBtn, { backgroundColor: '#9A3412' }]}
            onPress={() => onBillPay(kot)}
            activeOpacity={0.8}
          >
            <ReceiptRupee size={17} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.roundActionBtn, { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' }]}>
            <CheckCircle2 size={17} color="#15803D" />
          </View>
        )}

        {/* Edit Bill / View Action Icon Button */}
        <TouchableOpacity
          style={[styles.roundActionBtn, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
          onPress={() => onBillPay(kot)}
          activeOpacity={0.8}
        >
          <FileText size={16} color="#475569" />
        </TouchableOpacity>

        {/* Print Ticket Icon Button */}
        <TouchableOpacity
          style={[styles.roundActionBtn, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
          onPress={() => onOpenPrintModal(kot)}
          activeOpacity={0.8}
        >
          <Printer size={16} color="#475569" />
        </TouchableOpacity>

        {/* View KOT Ticket Details Icon Button */}
        <TouchableOpacity
          style={[styles.roundActionBtn, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }]}
          onPress={() => onPreviewKot(kot)}
          activeOpacity={0.8}
        >
          <Eye size={16} color="#B45309" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const KOTScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
  const [kots, setKots] = useState<KOTTicket[]>(() =>
    restaurantStore.getCachedKOTs(activeBranchNumId)
  );
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'BILLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewKot, setPreviewKot] = useState<KOTTicket | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [kotPrintModalVisible, setKotPrintModalVisible] = useState<boolean>(false);
  const [kotPrintModalData, setKotPrintModalData] = useState<UniversalInvoicePrintData | null>(null);

  const handleOpenKotPrintModal = useCallback((kot: KOTTicket) => {
    const sub = (kot.items || []).reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = Math.round(sub * 0.05);
    const tot = sub + tax;

    const uData: UniversalInvoicePrintData = {
      invoiceNumber: kot.id,
      kotNumber: kot.id,
      invoiceDate: kot.date || new Date().toISOString().split('T')[0],
      hotelName: activeBranch?.name ? `AJALKAR HOTEL & RESTAURANT - ${activeBranch.name.toUpperCase()}` : 'AJALKAR HOTEL & RESTAURANT',
      hotelAddress: activeBranch?.address || 'Hotel Premises, Pune, Maharashtra - 411004',
      hotelPhone: activeBranch?.phone || '+91 98765 43210',
      gstin: activeBranch?.gstin || '27AAACA9999P1Z1',
      fssai: '11521034000123',
      customerName: kot.guestName || 'Dine-In Guest',
      tableName: kot.tableNumber,
      orderNumber: kot.orderId ? (String(kot.orderId).startsWith('temp-ord-') ? `ORD-${String(kot.orderId).slice(-6)}` : (String(kot.orderId).startsWith('ORD') ? String(kot.orderId) : `ORD-${kot.orderId}`)) : '',
      language: (language as any) || 'en',
      items: (kot.items || []).map((i, idx) => ({
        id: idx + 1,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalPrice: i.price * i.quantity,
        notes: i.notes,
      })),
      subtotal: sub,
      cgstRate: 2.5,
      cgstAmount: Number((tax / 2).toFixed(2)),
      sgstRate: 2.5,
      sgstAmount: Number((tax / 2).toFixed(2)),
      totalTax: tax,
      grandTotal: tot,
      paymentMethod: 'CASH',
      paymentStatus: kot.billingStatus === 'Paid' ? 'PAID' : 'UNPAID',
      footerMessage: 'KOT Order Ticket - Kitchen Copy',
      notes: kot.note,
    };

    setKotPrintModalData(uData);
    setKotPrintModalVisible(true);
  }, [activeBranch]);

  const todayDateStr = useMemo(() => {
    return formatDate(new Date(), { showDayOfWeek: false });
  }, [language, formatDate]);

  const loadData = useCallback(async (isManualRefresh: boolean = false) => {
    let spinnerTimer: any = null;
    if (isManualRefresh) {
      setRefreshing(true);
      spinnerTimer = setTimeout(() => {
        setRefreshing(false);
      }, 2000);
    }
    // 1. Immediately read memory cache (0ms instant load!)
    const cached = restaurantStore.getCachedKOTs(activeBranchNumId);
    if (cached && cached.length > 0) {
      setKots((prev) => (areKotsEqual(prev, cached) ? prev : cached));
      setLoading(false);
    }
    try {
      const list = await restaurantStore.getKOTs(activeBranchNumId);
      if (Array.isArray(list)) {
        setKots((prev) => (areKotsEqual(prev, list) ? prev : list));
      }
    } catch (e) {
      console.warn('Error fetching live KOTs:', e);
    } finally {
      if (spinnerTimer) clearTimeout(spinnerTimer);
      if (isManualRefresh) {
        setRefreshing(false);
      }
      setLoading(false);
    }
  }, [activeBranchNumId]);

  useEffect(() => {
    let lastLiveFetchMs = Date.now();
    loadData(false);
    let debounceTimer: any = null;
    const debouncedRefresh = () => {
      // 0ms instant cache sync (never wait 300ms or trigger duplicate HTTP calls!)
      const cached = restaurantStore.getCachedKOTs(activeBranchNumId);
      if (cached && cached.length > 0) {
        setKots((prev) => (areKotsEqual(prev, cached) ? prev : cached));
        setLoading(false);
      }
      clearTimeout(debounceTimer);
      const now = Date.now();
      if (now - lastLiveFetchMs >= 2500) {
        lastLiveFetchMs = now;
        loadData(false);
      }
    };

    const unsubscribeStore = restaurantStore.subscribe(() => {
      const cached = restaurantStore.getCachedKOTs(activeBranchNumId);
      setKots((prev) => (areKotsEqual(prev, cached) ? prev : cached));
    });

    const unsubscribeFocus = navigation?.addListener?.('focus', debouncedRefresh);

    const interval = setInterval(() => {
      debouncedRefresh();
    }, 12000);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(interval);
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId, loadData]);

  const activeCount = useMemo(() => {
    return kots.filter((k) => k.billingStatus === 'Not Billed' && (k as any).kitchenStatus !== 'Cancelled' && String((k as any).status || '').toUpperCase() !== 'CANCELLED').length;
  }, [kots]);

  // Filter KOTs
  const filteredKOTs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kots.filter((kot) => {
      // 1. Exclude payment settled / paid bills from KOT module
      if (kot.billingStatus === 'Paid' || String((kot as any).status || '').toUpperCase() === 'SETTLED' || String((kot as any).status || '').toUpperCase() === 'PAID') return false;

      // 2. Exclude cancelled KOTs from KOT module
      if ((kot as any).kitchenStatus === 'Cancelled' || String((kot as any).status || '').toUpperCase() === 'CANCELLED') return false;

      if (activeTab === 'ACTIVE' && kot.billingStatus !== 'Not Billed') return false;
      if (activeTab === 'BILLED') return false;
      if (q) {
        const matchId = kot.id.toLowerCase().includes(q);
        const matchTable = kot.tableNumber.toLowerCase().includes(q);
        const matchGuest = kot.guestName.toLowerCase().includes(q);
        if (!matchId && !matchTable && !matchGuest) return false;
      }
      return true;
    });
  }, [kots, activeTab, searchQuery]);

  // Advance Kitchen Status (0ms instant optimistic update!)
  const handleAdvanceStatus = useCallback(async (kot: KOTTicket) => {
    let nextStatus: KOTTicket['kitchenStatus'] = 'Preparing';
    if (kot.kitchenStatus === 'New / Sent') nextStatus = 'Preparing';
    else if (kot.kitchenStatus === 'Preparing') nextStatus = 'Ready';
    else if (kot.kitchenStatus === 'Ready') nextStatus = 'Served';

    // 1. Optimistic instant local update
    setKots((prev) =>
      prev.map((k) => (k.id === kot.id ? { ...k, kitchenStatus: nextStatus } : k))
    );

    // 2. Non-blocking background store & backend sync
    restaurantStore.advanceKOTStatus(kot.id, activeBranchNumId).catch((err) => {
      console.warn('Failed to advance KOT status:', err);
    });
  }, [activeBranchNumId]);

  const navigateToBillingScreen = useCallback((navParams: any) => {
    try {
      navigation.navigate('Billing', navParams);
    } catch (e) {
      try {
        navigation.navigate('MainApp', {
          screen: 'Billing',
          params: navParams,
        });
      } catch (e2) {
        console.warn('Navigation to Billing failed:', e2);
      }
    }
  }, [navigation]);

  // Handle Bill / Pay navigation (instant screen transition)
  const handleBillPay = useCallback((kot: KOTTicket) => {
    const resolvedOrder = restaurantStore.ensureBillingOrderForKot(kot, activeBranchNumId);
    const targetOrderId = restaurantStore.resolveOrderId(resolvedOrder.id);
    if (resolvedOrder.status !== 'PAID') {
      restaurantStore.markOrderForBilling(targetOrderId, activeBranchNumId).catch(() => {});
    }
    navigateToBillingScreen({
      tableNumber: kot.tableNumber,
      orderId: targetOrderId,
      guestName: kot.guestName,
      step: 2,
      resetStepTs: undefined,
      _navTs: Date.now(),
    });
  }, [activeBranchNumId, navigateToBillingScreen]);

  const handleNavigateBilling = useCallback((tableNumber: string, orderId: string, step: number) => {
    const includePaid = step === 3;
    const found = restaurantStore.getOrderByIdOrTableSync(
      orderId,
      tableNumber,
      activeBranchNumId,
      includePaid
    );
    const resolvedId =
      found?.id ||
      (!includePaid
        ? restaurantStore.ensureBillingOrderForTableName(
            tableNumber,
            undefined,
            undefined,
            orderId,
            activeBranchNumId
          ).id
        : restaurantStore.resolveOrderId(orderId));
    navigateToBillingScreen({
      tableNumber,
      orderId: resolvedId,
      step,
      resetStepTs: undefined,
      _navTs: Date.now(),
    });
  }, [activeBranchNumId, navigateToBillingScreen]);

  const renderItem = useCallback(
    ({ item }: { item: KOTTicket }) => (
      <KOTCardItem
        kot={item}
        styles={styles}
        toDevanagari={toDevanagari}
        formatTableName={formatTableName}
        localizeGuestName={localizeGuestName}
        getLocalizedMenuItemName={getLocalizedMenuItemName}
        translateStatus={translateStatus}
        t={t}
        onAdvanceStatus={handleAdvanceStatus}
        onBillPay={handleBillPay}
        onOpenPrintModal={handleOpenKotPrintModal}
        onPreviewKot={setPreviewKot}
        onNavigateBilling={handleNavigateBilling}
      />
    ),
    [
      styles,
      toDevanagari,
      formatTableName,
      localizeGuestName,
      getLocalizedMenuItemName,
      translateStatus,
      t,
      handleAdvanceStatus,
      handleBillPay,
      handleOpenKotPrintModal,
      handleNavigateBilling,
    ]
  );

  const keyExtractor = useCallback((item: KOTTicket) => item.id, []);

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} activeRouteName="KOT" />

      <FlatList
        data={filteredKOTs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <>
            {/* ===================================================
                SCREEN HEADER (Screenshot 1 Exact Style)
            =================================================== */}
            <View style={styles.headerBar}>
              <View style={styles.headerLeftRow}>
                <View style={styles.headerIconBox}>
                  <ReceiptRupee size={18} color="#FFFFFF" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.titleWithBadge}>
                    <Text style={styles.mainTitle}>{t('kotManagement', 'KOT MANAGEMENT')}</Text>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>{toDevanagari(activeCount)} {t('active', 'Active')}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Top Control Bar */}
              <View style={styles.headerControlsRow}>
                <TouchableOpacity
                  style={[styles.refreshBtn, refreshing && { opacity: 0.7, borderColor: '#EA580C' }]}
                  onPress={() => loadData(true)}
                  disabled={refreshing}
                  activeOpacity={0.7}
                >
                  {refreshing ? (
                    <ActivityIndicator size={12} color="#EA580C" style={{ marginRight: 2 }} />
                  ) : (
                    <RotateCcw size={13} color="#57534E" />
                  )}
                  <Text style={[styles.refreshText, refreshing && { color: '#EA580C', fontWeight: '700' }]}>
                    {refreshing ? t('refreshing', 'Refreshing...') : t('refresh', 'Refresh')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.datePill}>
                  <Calendar size={13} color="#EA580C" />
                  <Text style={[styles.datePillText, { color: '#9A3412', fontWeight: '800' }]}>
                    {todayDateStr}
                  </Text>
                </View>
              </View>
            </View>

            {/* ===================================================
                SEARCH
            =================================================== */}
            <View style={styles.filterSection}>
              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Search size={15} color="#78716C" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchKotTableGuest', 'Search by KOT number, table, or guest...')}
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
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyStateBox}>
              <View style={styles.emptyIconCircle}>
                <ChefHat size={32} color="#EA580C" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('noKotOrders', 'No KOT Orders Found')}</Text>
              <Text style={styles.emptyStateDesc}>
                {searchQuery ? t('noMatchingKot', 'No KOT matches your search query.') : t('noActiveKotOrders', 'There are no kitchen orders in this category.')}
              </Text>
              <TouchableOpacity
                style={styles.emptyRefreshBtn}
                onPress={() => {
                  setSearchQuery('');
                  setActiveTab('ALL');
                  loadData(true);
                }}
                activeOpacity={0.85}
              >
                <RotateCcw size={14} color="#FFFFFF" />
                <Text style={styles.emptyRefreshBtnText}>{t('refreshOrders', 'Refresh Orders')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#EA580C']}
            tintColor="#EA580C"
          />
        }
      />

      {/* 80mm KOT Ticket Preview Modal */}
      <Modal visible={!!previewKot} transparent animationType="fade">
        <View style={styles.previewBackdrop}>
          <View style={styles.previewModalCard}>
            {/* Modal Header */}
            <View style={styles.previewModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Printer size={18} color="#EA580C" />
                <Text style={styles.previewHeaderTitle}>{t('kotPrintPreview', '80mm KOT Print Preview')}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewKot(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {previewKot && (
              <ScrollView style={styles.previewSlipBody} contentContainerStyle={{ padding: 16 }}>
                {/* 80mm Thermal Slip Paper */}
                <View style={styles.thermalSlipPaper}>
                  <Text style={styles.thermalHotelName}>{activeBranch?.name || 'AJALKAR HOTEL & RESTAURANT'}</Text>
                  <View style={styles.thermalDashedDivider} />
                  
                  <View style={styles.thermalRow}>
                    <Text style={styles.thermalBoldText}>KOT NO: {previewKot.id}</Text>
                    <Text style={styles.thermalBoldText}>TABLE: {previewKot.tableNumber}</Text>
                  </View>
                  <View style={styles.thermalRow}>
                    <Text style={styles.thermalMutedText}>TIME: {previewKot.time}</Text>
                    <Text style={styles.thermalMutedText}>STATUS: {previewKot.kitchenStatus || previewKot.billingStatus}</Text>
                  </View>
                  {previewKot.guestName ? (
                    <Text style={styles.thermalMutedText}>GUEST: {previewKot.guestName}</Text>
                  ) : null}

                  <View style={styles.thermalDashedDivider} />

                  {/* Items Table */}
                  <View style={styles.thermalTableHeader}>
                    <Text style={[styles.thermalTh, { flex: 2 }]}>ITEM</Text>
                    <Text style={[styles.thermalTh, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                  </View>
                  <View style={styles.thermalDashedDivider} />

                  {previewKot.items.map((it, idx) => (
                    <View key={idx} style={{ marginBottom: 4 }}>
                      <View style={styles.thermalTableRow}>
                        <Text style={[styles.thermalTd, { flex: 2, fontWeight: '700' }]}>{it.name}</Text>
                        <Text style={[styles.thermalTd, { flex: 1, textAlign: 'center', fontWeight: '800' }]}>x {it.quantity}</Text>
                      </View>
                      {it.notes ? (
                        <Text style={styles.thermalNoteText}>• Note: {it.notes}</Text>
                      ) : null}
                    </View>
                  ))}

                  <View style={styles.thermalDashedDivider} />

                  {previewKot.note ? (
                    <View style={{ marginVertical: 6 }}>
                      <Text style={styles.thermalBoldText}>Special Instruction:</Text>
                      <Text style={styles.thermalInstructionText}>{previewKot.note}</Text>
                      <View style={styles.thermalDashedDivider} />
                    </View>
                  ) : null}

                </View>

                {/* Modal Action Buttons */}
                <View style={styles.previewActionsRow}>
                  <TouchableOpacity
                    style={styles.previewPrintBtn}
                    onPress={() => {
                      const targetKot = previewKot;
                      setPreviewKot(null);
                      handleOpenKotPrintModal(targetKot);
                    }}
                    activeOpacity={0.85}
                  >
                    <Printer size={16} color="#FFFFFF" />
                    <Text style={styles.previewPrintBtnText}>{t('printKot', 'Print / Send KOT')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.previewCloseBtn}
                    onPress={() => setPreviewKot(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.previewCloseBtnText}>{t('close', 'Close')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Universal Print Modal matching Vite */}
      <MobilePrintInvoiceModal
        visible={kotPrintModalVisible}
        onClose={() => setKotPrintModalVisible(false)}
        invoiceData={kotPrintModalData}
        isKot={true}
      />
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const textMuted = isDark ? '#64748B' : '#A8A29E';
  const dividerColor = isDark ? '#2A364F' : '#F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const subBg = isDark ? '#1E293B' : '#F8FAFC';

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F19' : '#FAF7F2',
  },
  headerBar: {
    backgroundColor: isDark ? '#161F36' : '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? '#2A364F' : '#E7E5E4',
    marginBottom: 12,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#9A3412',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: textPrimary,
    letterSpacing: 0.3,
  },
  activeBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  subTitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    minHeight: 32,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
    marginLeft: 5,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    minHeight: 32,
  },
  datePillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#44403C',
    marginLeft: 5,
  },
  datePillTextActive: {
    color: '#EA580C',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  dateModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: textPrimary,
  },
  dateOptionsList: {
    gap: 8,
  },
  dateOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cardBorder,
    backgroundColor: cardBg,
  },
  dateOptionItemActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  dateOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
  },
  dateOptionTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  dateCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateCountBadgeActive: {
    backgroundColor: '#FED7AA',
  },
  dateCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dateCountBadgeTextActive: {
    color: '#9A3412',
  },

  /* Search & Filter Section */
  filterSection: {
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: cardBorder,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: textPrimary,
    marginLeft: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: subBg,
    borderRadius: 8,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#9A3412',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Scroll list & KOT Cards */
  scrollList: {
    padding: 10,
  },
  kotCard: {
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
  },
  kotNumberText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  tableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDBA74',
    gap: 4,
  },
  tableBoxText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2410C',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
    gap: 8,
  },
  guestIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: textPrimary,
  },
  orderNumberSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 10.5,
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 160,
    fontWeight: '600',
  },

  /* Items Breakdown Pills */
  itemsBreakdownWrap: {
    paddingVertical: 6,
  },
  itemsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dishPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dishPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9A3412',
  },

  /* Status Bar */
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: subBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusColDivider: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  colLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '800',
    color: textPrimary,
  },
  kitchenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kitchenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  notBilledText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  invoiceSub: {
    fontSize: 8.5,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 1,
  },

  /* Actions Row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roundActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateBox: {
    backgroundColor: cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 260,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  emptyRefreshBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: dividerColor,
    backgroundColor: '#FFF7ED',
  },
  previewHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  previewSlipBody: {
    maxHeight: 520,
  },
  thermalSlipPaper: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  thermalHotelName: {
    fontSize: 14,
    fontWeight: '800',
    color: textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thermalSlipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginVertical: 4,
  },
  thermalDashedDivider: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  thermalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  thermalBoldText: {
    fontSize: 12,
    fontWeight: '800',
    color: textPrimary,
  },
  thermalMutedText: {
    fontSize: 11,
    color: '#64748B',
  },
  thermalTableHeader: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  thermalTh: {
    fontSize: 11,
    fontWeight: '800',
    color: textPrimary,
  },
  thermalTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thermalTd: {
    fontSize: 12,
    color: textPrimary,
  },
  thermalNoteText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    color: '#D97706',
    marginLeft: 6,
  },
  thermalInstructionText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  thermalFooterText: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  previewPrintBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewPrintBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  });
};
