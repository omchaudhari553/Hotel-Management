import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Header } from '../../components/Header';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import {
  restaurantStore,
  PaymentRecord,
} from '../../api/restaurantStore';
import { useBranch } from '../../context/BranchContext';
import {
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  FileText,
  Printer,
  Share2,
  RefreshCw,
  Receipt,
  User,
  UtensilsCrossed,
  Building2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { printCustomerBill, PrintFormat } from '../../utils/thermalPrinter';

export const PaymentsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
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
  } = useLanguage();
  const { activeBranch, activeBranchNumId } = useBranch();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UPI' | 'CASH' | 'CARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<PaymentRecord | null>(null);
  const [paymentPrintFormat, setPaymentPrintFormat] = useState<PrintFormat>('80mm');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  const itemsPerPage = 8;

  // New Manual Payment state
  const [newTable, setNewTable] = useState<string>('Table 05');
  const [newCustomer, setNewCustomer] = useState<string>('Guest');
  const [newAmount, setNewAmount] = useState<string>('850');
  const [newMode, setNewMode] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');

  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load payments from reactive store
  const loadPayments = async () => {
    try {
      const list = await restaurantStore.getPayments(activeBranchNumId);
      setPayments(list);
    } catch (err) {
      console.warn('Error loading payments:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
  };

  useEffect(() => {
    loadPayments();
    // Real-time reactive subscription: whenever a bill is paid in Billing, this updates immediately!
    const unsubscribeStore = restaurantStore.subscribe(() => {
      loadPayments();
    });
    const unsubscribeFocus = navigation?.addListener?.('focus', () => {
      loadPayments();
    });
    return () => {
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId]);

  // Date-wise sorted and filtered payments
  const filteredPayments = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-IN');
    const q = searchQuery.trim().toLowerCase();

    const list = payments.filter((p) => {
      const matchesMode = selectedFilter === 'ALL' || p.mode === selectedFilter;
      const matchesSearch =
        !q ||
        p.billId.toLowerCase().includes(q) ||
        p.tableName.toLowerCase().includes(q) ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(q));

      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = Boolean((p.date && p.date.includes(todayStr)) || (p.time && p.time.includes('m ago')));
      }
      return matchesMode && matchesSearch && matchesDate;
    });

    return list;
  }, [payments, selectedFilter, searchQuery, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const upiCollected = payments.filter((p) => p.mode === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = payments.filter((p) => p.mode === 'CASH').reduce((sum, p) => sum + p.amount, 0);
  const cardCollected = payments.filter((p) => p.mode === 'CARD').reduce((sum, p) => sum + p.amount, 0);

  const handleRecordPayment = async () => {
    const num = parseFloat(newAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(t('invalidAmount', 'Invalid Amount'), t('enterValidAmount', 'Please enter a valid amount.'));
      return;
    }
    try {
      await restaurantStore.recordPayment({
        tableName: newTable.trim() || 'Table 01',
        customerName: newCustomer.trim() || 'Guest',
        amount: num,
        mode: newMode,
        branchId: activeBranchNumId,
      });
      await loadPayments();
      setShowAddModal(false);
      setNewAmount('');
      Alert.alert(t('success', 'Success'), `₹ ${toDevanagari(num)} ${t('paymentRecorded', 'payment recorded successfully')} (${newMode})!`);
    } catch (e) {
      Alert.alert(t('error', 'Error'), t('paymentSaveError', 'Error saving payment.'));
    }
  };

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EA580C']} />}
      >
        <Header
          title={t('paymentsCollections', 'Payment & Collections')}
          subtitle={t('paymentsSubtitle', 'UPI QR, Cash, Card & Ledger Settlement')}
        />

        {/* Settlement Overview Header Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Text style={styles.totalLabel}>{t('totalCollectionToday', 'TOTAL COLLECTION (TODAY)')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2, gap: 3 }}>
                  <Building2 size={11} color="#EA580C" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#9A3412' }}>{activeBranch.name}</Text>
                </View>
              </View>
              <Text style={styles.totalAmount}>₹ {toDevanagari(totalCollected.toLocaleString('en-IN'))}</Text>
              <View style={styles.syncBadge}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>
                  {t('synchronized', 'Synchronized')} ({toDevanagari(payments.length)} {t('transactions', 'Transactions')})
                </Text>
              </View>
            </View>
            <View style={styles.walletCircle}>
              <Wallet size={24} color="#EA580C" />
            </View>
          </View>

          {/* Mode Breakdown Strip */}
          <View style={styles.modesRow}>
            <TouchableOpacity
              style={[styles.modePill, selectedFilter === 'UPI' && styles.modePillActive]}
              onPress={() => setSelectedFilter(selectedFilter === 'UPI' ? 'ALL' : 'UPI')}
              activeOpacity={0.8}
            >
              <View style={[styles.modeDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.modePillLabel}>UPI: ₹ {toDevanagari(upiCollected.toLocaleString('en-IN'))}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modePill, selectedFilter === 'CASH' && styles.modePillActive]}
              onPress={() => setSelectedFilter(selectedFilter === 'CASH' ? 'ALL' : 'CASH')}
              activeOpacity={0.8}
            >
              <View style={[styles.modeDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.modePillLabel}>{t('cash', 'Cash')}: ₹ {toDevanagari(cashCollected.toLocaleString('en-IN'))}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modePill, selectedFilter === 'CARD' && styles.modePillActive]}
              onPress={() => setSelectedFilter(selectedFilter === 'CARD' ? 'ALL' : 'CARD')}
              activeOpacity={0.8}
            >
              <View style={[styles.modeDot, { backgroundColor: '#7C3AED' }]} />
              <Text style={styles.modePillLabel}>{t('card', 'Card')}: ₹ {toDevanagari(cardCollected.toLocaleString('en-IN'))}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Mode Filters */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPaymentPlaceholder', 'Search by Bill ID, Table, Customer...')}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.recordPaymentBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.recordPaymentText}>{t('record', 'Record')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
          {(['ALL', 'UPI', 'CASH', 'CARD'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>
                {filter === 'ALL'
                  ? t('allPayments', 'All Payments')
                  : filter === 'CASH'
                  ? t('cash', 'Cash')
                  : filter === 'CARD'
                  ? t('card', 'Card')
                  : 'UPI'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeaderRow}>
            <Text style={styles.transactionsHeader}>
              {t('transactionHistory', 'TRANSACTION HISTORY')} ({toDevanagari(filteredPayments.length)})
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadPayments}>
              <RefreshCw size={13} color="#9A3412" />
              <Text style={styles.refreshText}>{t('refresh', 'Refresh')}</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#EA580C" />
              <Text style={styles.loadingText}>{t('loadingPayments', 'Loading payment records...')}</Text>
            </View>
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Receipt size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{t('noPaymentsFound', 'No payments found')}</Text>
              <Text style={styles.emptySub}>{t('noPaymentsMatchingFilter', 'No payments matching current filter.')}</Text>
            </View>
          ) : (
            <>
              {paginatedPayments.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.transactionCard}
                  onPress={() => setSelectedPaymentDetail(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.transactionIconBox}>
                    {item.mode === 'UPI' && <QrCode size={20} color="#2563EB" />}
                    {item.mode === 'CASH' && <Banknote size={20} color="#16A34A" />}
                    {item.mode === 'CARD' && <CreditCard size={20} color="#7C3AED" />}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemTitle}>{formatTableName(item.tableName)}</Text>
                        {Boolean(item.customerName && item.customerName !== 'Guest') ? (
                          <Text style={styles.itemCustomer}>({localizeGuestName(item.customerName)})</Text>
                        ) : null}
                      </View>
                      <Text style={styles.itemAmount}>₹ {toDevanagari(item.amount.toLocaleString('en-IN'))}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={styles.itemSub}>
                        {toDevanagari(item.billId)} • {item.mode === 'CASH' ? t('cash', 'Cash') : item.mode === 'CARD' ? t('card', 'Card') : 'UPI'}
                      </Text>
                      <View style={styles.settledBadge}>
                        <CheckCircle2 size={11} color="#15803D" />
                        <Text style={styles.settledText}>{translateStatus(item.status)}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={styles.itemTime}>
                        {toDevanagari(item.time)} {item.referenceNo ? `• ${toDevanagari(item.referenceNo)}` : ''}
                      </Text>
                      <Text style={styles.viewReceiptLink}>{t('viewReceipt', 'View Receipt')} ›</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} color={currentPage === 1 ? '#94A3B8' : '#334155'} />
                    <Text style={[styles.pageBtnText, currentPage === 1 && { color: '#94A3B8' }]}>{t('prev', 'Prev')}</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageInfoText}>
                    {toDevanagari(currentPage)} / {toDevanagari(totalPages)} ({toDevanagari(filteredPayments.length)} {t('records', 'Records')})
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <Text style={[styles.pageBtnText, currentPage === totalPages && { color: '#94A3B8' }]}>{t('next', 'Next')}</Text>
                    <ChevronRight size={16} color={currentPage === totalPages ? '#94A3B8' : '#334155'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ===================================================
          TRANSACTION DETAIL / RECEIPT MODAL
      =================================================== */}
      <Modal visible={!!selectedPaymentDetail} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <Text style={styles.modalTitle}>{t('paymentReceipt', 'Payment Receipt')}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPaymentDetail(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPaymentDetail && (
              <View style={styles.receiptContainer}>
                {/* Top Amount Banner */}
                <View style={styles.receiptAmountBanner}>
                  <Text style={styles.receiptAmountLabel}>{t('amountPaid', 'Amount Paid')}</Text>
                  <Text style={styles.receiptAmountVal}>
                    ₹ {toDevanagari(selectedPaymentDetail.amount.toLocaleString('en-IN'))}
                  </Text>
                  <View style={styles.receiptStatusPill}>
                    <CheckCircle2 size={12} color="#15803D" />
                    <Text style={styles.receiptStatusText}>
                      {translateStatus(selectedPaymentDetail.status || 'SETTLED')}
                    </Text>
                  </View>
                </View>

                {/* Details list */}
                <View style={styles.receiptDetailsBox}>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('invoiceNo', 'Invoice No.')}</Text>
                    <Text style={styles.receiptDetailValBold}>{toDevanagari(selectedPaymentDetail.billId)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('table', 'Table')}</Text>
                    <Text style={styles.receiptDetailVal}>{formatTableName(selectedPaymentDetail.tableName)}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('customer', 'Customer')}</Text>
                    <Text style={styles.receiptDetailVal}>{localizeGuestName(selectedPaymentDetail.customerName || 'Guest')}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('mode', 'Mode')}</Text>
                    <Text style={styles.receiptDetailValBold}>
                      {selectedPaymentDetail.mode === 'CASH'
                        ? t('cash', 'Cash')
                        : selectedPaymentDetail.mode === 'CARD'
                        ? t('card', 'Card')
                        : 'UPI'}
                    </Text>
                  </View>
                  {selectedPaymentDetail.referenceNo ? (
                    <View style={styles.receiptDetailRow}>
                      <Text style={styles.receiptDetailKey}>Reference / UTR</Text>
                      <Text style={styles.receiptDetailVal}>{toDevanagari(selectedPaymentDetail.referenceNo)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailKey}>{t('dateTime', 'Date & Time')}</Text>
                    <Text style={styles.receiptDetailVal}>{toDevanagari(selectedPaymentDetail.time)}</Text>
                  </View>
                </View>

                {selectedPaymentDetail.itemsSummary ? (
                  <View style={styles.itemsSummaryBox}>
                    <Text style={styles.itemsSummaryTitle}>{t('dishesOrdered', 'Dishes Ordered')}:</Text>
                    <Text style={styles.itemsSummaryContent}>{selectedPaymentDetail.itemsSummary}</Text>
                  </View>
                ) : null}

                {/* Print Format Selector (80mm, 58mm, A4) */}
                <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>
                    {language === 'mr' ? 'प्रिंट आकार निवडा (Format):' : language === 'hi' ? 'प्रिंट साइज़ चुनें (Format):' : 'Select Print Size:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: paymentPrintFormat === '80mm' ? '#FFF7ED' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: paymentPrintFormat === '80mm' ? '#EA580C' : '#CBD5E1',
                      }}
                      onPress={() => setPaymentPrintFormat('80mm')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: paymentPrintFormat === '80mm' ? '#EA580C' : '#64748B' }}>
                        🧾 80mm POS
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: paymentPrintFormat === '58mm' ? '#FFF7ED' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: paymentPrintFormat === '58mm' ? '#EA580C' : '#CBD5E1',
                      }}
                      onPress={() => setPaymentPrintFormat('58mm')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: paymentPrintFormat === '58mm' ? '#EA580C' : '#64748B' }}>
                        🧾 58mm Mini
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: paymentPrintFormat === 'a4' ? '#FFF7ED' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: paymentPrintFormat === 'a4' ? '#EA580C' : '#CBD5E1',
                      }}
                      onPress={() => setPaymentPrintFormat('a4')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: paymentPrintFormat === 'a4' ? '#EA580C' : '#64748B' }}>
                        📄 A4 Invoice
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.receiptActionsRow}>
                  <TouchableOpacity
                    style={[styles.receiptPrintBtn, { backgroundColor: '#EA580C' }]}
                    onPress={() => {
                      if (!selectedPaymentDetail) return;
                      const tot = selectedPaymentDetail.amount || 0;
                      const sub = Math.round(tot / 1.05);
                      const taxHalf = ((tot - sub) / 2).toFixed(2);
                      const rawSummary = selectedPaymentDetail.itemsSummary || 'Dining Order Items';
                      const parts = rawSummary.split(',').filter(Boolean);
                      const eachPrice = Math.round(sub / Math.max(1, parts.length));

                      printCustomerBill({
                        language,
                        invoiceNumber: selectedPaymentDetail.billId,
                        hotelName: activeBranch?.name || 'Royal Palace Hotel',
                        hotelAddress: activeBranch?.address || 'Shop No. 12, Shree Complex, Pune - 411028',
                        gstin: '27AAKCA1234F1Z5',
                        fssai: '11521034000123',
                        tableName: selectedPaymentDetail.tableName,
                        customerName: selectedPaymentDetail.customerName || 'Guest',
                        date: selectedPaymentDetail.date || new Date().toLocaleDateString('en-IN'),
                        time: selectedPaymentDetail.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        paymentMode: selectedPaymentDetail.mode,
                        items: parts.map((name) => ({
                          name: name.trim(),
                          quantity: 1,
                          price: eachPrice,
                          amount: eachPrice,
                        })),
                        subtotal: sub,
                        cgst: taxHalf,
                        sgst: taxHalf,
                        discount: 0,
                        total: tot,
                        footerNote: 'Thank you for dining at Royal Palace Hotel! Visit Again.',
                      }, paymentPrintFormat);
                    }}
                    activeOpacity={0.8}
                  >
                    <Printer size={16} color="#FFFFFF" />
                    <Text style={[styles.receiptPrintText, { color: '#FFFFFF' }]}>
                      {`${t('print', 'Print Bill')} (${paymentPrintFormat.toUpperCase()})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.receiptCloseBtn}
                    onPress={() => setSelectedPaymentDetail(null)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.receiptCloseText}>{t('close', 'Close')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================
          RECORD MANUAL PAYMENT MODAL
      =================================================== */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('recordManualPayment', 'Record Manual Payment')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('tableOrderId', 'Table / Order ID')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newTable}
                onChangeText={setNewTable}
                placeholder="e.g. Table 05"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('customerName', 'Customer Name')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer}
                onChangeText={setNewCustomer}
                placeholder="e.g. Rahul Sharma"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('amount', 'Amount')} (₹)</Text>
              <TextInput
                style={styles.modalInput}
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
                placeholder="e.g. 850"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.inputLabel}>{t('paymentMethod', 'Payment Method')}</Text>
              <View style={styles.modalModeSelector}>
                {(['UPI', 'CASH', 'CARD'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modalModeBtn, newMode === m && styles.modalModeBtnActive]}
                    onPress={() => setNewMode(m)}
                  >
                    <Text style={[styles.modalModeText, newMode === m && styles.modalModeTextActive]}>
                      {m === 'CASH' ? t('cash', 'Cash') : m === 'CARD' ? t('card', 'Card') : 'UPI'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRecordPayment}>
              <Text style={styles.modalSubmitText}>{t('saveSyncPayment', 'Save & Sync Payment')}</Text>
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
    backgroundColor: '#FBF9F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#EA580C',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 4,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  syncText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  walletCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    flexWrap: 'wrap',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  modePillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  recordPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  recordPaymentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterPillsScroll: {
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transactionsSection: {
    gap: 10,
  },
  transactionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9A3412',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  transactionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  itemCustomer: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#16A34A',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settledText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  itemTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  viewReceiptLink: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  receiptContainer: {
    gap: 12,
  },
  receiptAmountBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  receiptAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  receiptAmountVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2,
  },
  receiptStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  receiptStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  receiptDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDetailKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  receiptDetailVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  receiptDetailValBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  itemsSummaryBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 10,
  },
  itemsSummaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    marginBottom: 2,
  },
  itemsSummaryContent: {
    fontSize: 11,
    color: '#7C2D12',
    lineHeight: 16,
  },
  receiptActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  receiptPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 11,
  },
  receiptPrintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  receiptCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingVertical: 11,
  },
  receiptCloseText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
  },
  modalModeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modalModeBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalModeBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  modalModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalModeTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pageBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pageInfoText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
});
