import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import {
  restaurantStore,
  KOTTicket,
  KOTOrderItem,
} from '../../api/restaurantStore';
import { useBranch } from '../../context/BranchContext';
import { printKotTicket80mm } from '../../utils/thermalPrinter';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle2,
  Search,
  RotateCcw,
  Receipt,
  UtensilsCrossed,
  User,
  Calendar,
  Flame,
  ArrowRight,
  Eye,
  FileText,
  X,
  Building2,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const KOTScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
  const [kots, setKots] = useState<KOTTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'BILLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewKot, setPreviewKot] = useState<KOTTicket | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const todayDateStr = useMemo(() => {
    return formatDate(new Date(), { showDayOfWeek: false });
  }, [language]);

  const loadData = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const list = await restaurantStore.getKOTs(activeBranchNumId, true);
      setKots(list);
    } catch (e) {
      console.warn('Error fetching live KOTs:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeBranchNumId]);

  useEffect(() => {
    loadData();
    const unsubscribeStore = restaurantStore.subscribe(() => {
      loadData();
    });
    const unsubscribeFocus = navigation?.addListener?.('focus', () => {
      loadData();
    });
    return () => {
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId, loadData]);

  const activeCount = kots.filter((k) => k.billingStatus === 'Not Billed').length;

  // Filter KOTs
  const filteredKOTs = kots.filter((kot) => {
    if (activeTab === 'ACTIVE' && kot.billingStatus !== 'Not Billed') return false;
    if (activeTab === 'BILLED' && kot.billingStatus !== 'Paid') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = kot.id.toLowerCase().includes(q);
      const matchTable = kot.tableNumber.toLowerCase().includes(q);
      const matchGuest = kot.guestName.toLowerCase().includes(q);
      if (!matchId && !matchTable && !matchGuest) return false;
    }
    return true;
  });

  // Advance Kitchen Status (New/Sent -> Preparing -> Ready -> Served)
  const handleAdvanceStatus = async (kot: KOTTicket) => {
    const updated = await restaurantStore.advanceKOTStatus(kot.id);
    if (updated) {
      Alert.alert(
        language === 'mr' ? 'किचन स्टेटस बदलले' : language === 'hi' ? 'किचन स्थिति अपडेट' : 'Status Updated',
        language === 'mr'
          ? `${formatTableName(kot.tableNumber, 'mr')} साठी KOT स्टेटस "${updated.kitchenStatus}" झाले आहे.`
          : language === 'hi'
          ? `${formatTableName(kot.tableNumber, 'hi')} के लिए KOT स्थिति "${updated.kitchenStatus}" हो गई है।`
          : `KOT status for ${formatTableName(kot.tableNumber, 'en')} updated to "${updated.kitchenStatus}".`
      );
    }
  };

  // Handle Bill / Pay navigation
  const handleBillPay = async (kot: KOTTicket) => {
    let targetOrderId = kot.orderId;
    const order = await restaurantStore.getOrderByIdOrTable(kot.orderId, kot.tableNumber);
    if (order) {
      targetOrderId = order.id;
      await restaurantStore.markOrderForBilling(order.id);
    }
    try {
      navigation.navigate('Billing', {
        tableNumber: kot.tableNumber,
        orderId: targetOrderId,
        step: 2,
      });
    } catch (e) {
      try {
        navigation.navigate('MainApp', {
          screen: 'Billing',
          params: {
            tableNumber: kot.tableNumber,
            orderId: targetOrderId,
            step: 2,
          },
        });
      } catch (e2) {
        console.warn('Navigation to Billing failed:', e2);
      }
    }
  };

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#EA580C']}
            tintColor="#EA580C"
          />
        }
      >
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
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, gap: 4 }}>
              <Building2 size={12} color="#EA580C" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9A3412' }}>{activeBranch.name}</Text>
            </View>

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
            SEARCH & FILTER TABS (Screenshot 1)
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

          {/* Tabs: All KOTs, Active Orders, Billed / Completed */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ALL')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'ALL' && styles.tabBtnTextActive]}>
                {t('allKots', 'All KOTs')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ACTIVE')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
                {t('activeOrders', 'Active Orders')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'BILLED' && styles.tabBtnActive]}
              onPress={() => setActiveTab('BILLED')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'BILLED' && styles.tabBtnTextActive]}>
                {t('billedCompleted', 'Billed / Completed')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===================================================
            KOT TICKETS LIST (ENTIRE CARD IS CLICKABLE!)
        =================================================== */}
        {filteredKOTs.map((kot) => {
          const isPaid = kot.billingStatus === 'Paid';

          return (
            <TouchableOpacity
              key={kot.id}
              style={styles.kotCard}
              onPress={() => {
                if (!isPaid) {
                  handleBillPay(kot);
                } else {
                  navigation.navigate('Billing', {
                    tableNumber: kot.tableNumber,
                    orderId: kot.orderId,
                    step: 3,
                  });
                }
              }}
              activeOpacity={0.8}
            >
              {/* Card Header: KOT No, Time & Table */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kotNumberText}>#{toDevanagari(kot.id.replace('#', ''))}</Text>
                  <View style={styles.timeRow}>
                    <Clock size={11} color="#78716C" />
                    <Text style={styles.timeText}>{toDevanagari(kot.time)}</Text>
                  </View>
                </View>

                {/* Table Box */}
                <View style={styles.tableBox}>
                  <UtensilsCrossed size={13} color="#C2410C" />
                  <Text style={styles.tableBoxText}>{formatTableName(kot.tableNumber)}</Text>
                </View>
              </View>

              {/* Guest & Order Info */}
              <View style={styles.guestRow}>
                <View style={styles.guestIconCircle}>
                  <User size={12} color="#57534E" />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.guestName}>{localizeGuestName(kot.guestName)}</Text>
                  <Text style={styles.orderNumberSub}>#ORD-{toDevanagari(kot.orderId)}</Text>
                </View>
                {kot.note ? (
                  <Text style={styles.noteText} numberOfLines={1}>{kot.note}</Text>
                ) : null}
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
                <View style={styles.statusCol}>
                  <Text style={styles.colLabel}>{t('qty', 'QTY')}</Text>
                  <Text style={styles.qtyVal}>{toDevanagari(kot.totalQty)}</Text>
                </View>

                {/* Kitchen Status */}
                <View style={styles.statusCol}>
                  <Text style={styles.colLabel}>{t('kitchenStatus', 'KITCHEN STATUS')}</Text>
                  <View
                    style={[
                      styles.kitchenBadge,
                      kot.kitchenStatus === 'Served' && { backgroundColor: '#DCFCE7' },
                      kot.kitchenStatus === 'Preparing' && { backgroundColor: '#E0E7FF' },
                      kot.kitchenStatus === 'Ready' && { backgroundColor: '#CCFBF1' },
                      kot.kitchenStatus === 'New / Sent' && { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.kitchenBadgeText,
                        kot.kitchenStatus === 'Served' && { color: '#16A34A' },
                        kot.kitchenStatus === 'Preparing' && { color: '#4F46E5' },
                        kot.kitchenStatus === 'Ready' && { color: '#0D9488' },
                        kot.kitchenStatus === 'New / Sent' && { color: '#D97706' },
                      ]}
                    >
                      {translateStatus(kot.kitchenStatus)}
                    </Text>
                  </View>
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

              {/* Card Bottom Actions Row (Screenshot 1 Buttons) */}
              <View style={styles.actionsRow}>
                {/* Advance Kitchen Status Button */}
                {kot.kitchenStatus === 'New / Sent' && (
                  <TouchableOpacity
                    style={[styles.advanceBtn, { backgroundColor: '#2563EB' }]}
                    onPress={() => handleAdvanceStatus(kot)}
                    activeOpacity={0.85}
                  >
                    <Flame size={13} color="#FFFFFF" />
                    <Text style={styles.advanceBtnText}>{translateStatus('PREPARING')}</Text>
                  </TouchableOpacity>
                )}

                {kot.kitchenStatus === 'Preparing' && (
                  <TouchableOpacity
                    style={[styles.advanceBtn, { backgroundColor: '#0D9488' }]}
                    onPress={() => handleAdvanceStatus(kot)}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 size={13} color="#FFFFFF" />
                    <Text style={styles.advanceBtnText}>{translateStatus('READY')}</Text>
                  </TouchableOpacity>
                )}

                {kot.kitchenStatus === 'Ready' && (
                  <TouchableOpacity
                    style={[styles.advanceBtn, { backgroundColor: '#16A34A' }]}
                    onPress={() => handleAdvanceStatus(kot)}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 size={13} color="#FFFFFF" />
                    <Text style={styles.advanceBtnText}>{translateStatus('SERVED')}</Text>
                  </TouchableOpacity>
                )}

                {/* Bill / Pay or Settled Button */}
                {!isPaid ? (
                  <TouchableOpacity
                    style={styles.billPayBtn}
                    onPress={() => handleBillPay(kot)}
                    activeOpacity={0.85}
                  >
                    <Receipt size={13} color="#FFFFFF" />
                    <Text style={styles.billPayText}>{t('billPay', 'Bill / Pay')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.settledBtn}>
                    <CheckCircle2 size={13} color="#FFFFFF" />
                    <Text style={styles.settledText}>{t('settled', 'Settled')}</Text>
                  </View>
                )}

                {/* Edit Bill / View Action */}
                <TouchableOpacity
                  style={styles.editBillBtn}
                  onPress={() => handleBillPay(kot)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBillText}>{t('editBill', 'Edit Bill')}</Text>
                </TouchableOpacity>

                {/* Print Ticket (Preview first, then print!) */}
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => setPreviewKot(kot)}
                  activeOpacity={0.8}
                >
                  <Printer size={15} color="#57534E" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

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
                  <Text style={styles.thermalSlipTitle}>*** KITCHEN ORDER TICKET (KOT) ***</Text>
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

                  <Text style={styles.thermalFooterText}>[80mm Kitchen Thermal Slip • Ajalkar POS]</Text>
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.previewActionsRow}>
                  <TouchableOpacity
                    style={styles.previewPrintBtn}
                    onPress={() => {
                      printKotTicket80mm({
                        kotNumber: previewKot.id,
                        orderNumber: previewKot.orderId,
                        tableName: previewKot.tableNumber,
                        guestName: previewKot.guestName || 'Dine-In Guest',
                        serverName: 'Kitchen Counter',
                        date: previewKot.time,
                        time: previewKot.time,
                        items: previewKot.items.map((i) => ({
                          name: i.name,
                          quantity: i.quantity,
                          price: i.price,
                          notes: i.notes,
                        })),
                        instructions: previewKot.note,
                      });
                      setPreviewKot(null);
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
    marginBottom: 10,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#9A3412',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: 0.5,
  },
  activeBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 10,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
    marginLeft: 5,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F5F5F4',
  },
  dateModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
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
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dateOptionItemActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  dateOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1C1917',
    marginLeft: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E7E5E4',
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
    color: '#57534E',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Scroll list & KOT Cards */
  scrollList: {
    padding: 16,
  },
  kotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  kotNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#78716C',
    marginLeft: 4,
  },
  tableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  tableBoxText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
    marginLeft: 5,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  guestIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  orderNumberSub: {
    fontSize: 9.5,
    color: '#78716C',
  },
  noteText: {
    fontSize: 9.5,
    color: '#A8A29E',
    fontStyle: 'italic',
    maxWidth: 140,
  },

  /* Items Breakdown Pills */
  itemsBreakdownWrap: {
    paddingVertical: 10,
  },
  itemsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dishPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  dishPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },

  /* Status Bar */
  statusBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statusCol: {
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  qtyVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  kitchenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  kitchenBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 3,
  },
  notBilledText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  invoiceSub: {
    fontSize: 8,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 1,
  },

  /* Actions Row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 6,
  },
  advanceBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  billPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 6,
  },
  billPayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  settledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 6,
  },
  settledText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  editBillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  editBillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#57534E',
  },
  iconActionBtn: {
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
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
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  thermalHotelName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#0F172A',
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
    color: '#334155',
  },
  thermalTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thermalTd: {
    fontSize: 12,
    color: '#0F172A',
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
