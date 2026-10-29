import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavbar } from '../../components/AppNavbar';
import { useLanguage } from '../../context/LanguageContext';
import {
  restaurantStore,
  TableItem,
  MenuItemData,
  KOTOrderItem,
} from '../../api/restaurantStore';
import {
  Users,
  UtensilsCrossed,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Receipt,
  Clock,
  Search,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react-native';

import { useBranch } from '../../context/BranchContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const TablesKOTScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
  const { activeBranchNumId, activeBranch, getBranchName } = useBranch();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Start Order / Table Details Modal
  const [orderModalVisible, setOrderModalVisible] = useState<boolean>(false);
  const [activeTable, setActiveTable] = useState<TableItem | null>(null);
  const [customerName, setCustomerName] = useState<string>('Guest');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: number }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Details Modal
  const [viewDetailsModal, setViewDetailsModal] = useState<boolean>(false);
  const [viewingTable, setViewingTable] = useState<TableItem | null>(null);

  // Add Table Modal State
  const [addTableModalVisible, setAddTableModalVisible] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableCapacity, setNewTableCapacity] = useState<string>('4');
  const [newTableArea, setNewTableArea] = useState<string>('Main Dining');
  const [newTableNote, setNewTableNote] = useState<string>('');
  const [isAddingTable, setIsAddingTable] = useState<boolean>(false);

  // Subscribe to central restaurantStore for reactive updates
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
  }, [navigation, activeBranchNumId]);

  const loadData = async () => {
    const [tList, mList] = await Promise.all([
      restaurantStore.getTables(activeBranchNumId),
      restaurantStore.loadMenuItemsFromBackend().catch(() => restaurantStore.getMenuItems()),
    ]);
    setTables(tList);
    setMenuItems(mList);
  };


  // KPI Metrics calculation
  const totalCount = tables.length;
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const reservedCount = tables.filter((t) => t.status === 'RESERVED').length;
  const billingCount = tables.filter((t) => t.status === 'BILLING').length;
  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 4), 0);
  const occupiedSeats = tables
    .filter((t) => t.status === 'OCCUPIED' || t.status === 'BILLING')
    .reduce((acc, t) => acc + (t.guestCount || t.capacity || 2), 0);
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 44;

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    if (selectedFilter === 'Available' && t.status !== 'AVAILABLE') return false;
    if (selectedFilter === 'Occupied' && t.status !== 'OCCUPIED') return false;
    if (selectedFilter === 'Reserved' && t.status !== 'RESERVED') return false;
    if (selectedFilter === 'Billing' && t.status !== 'BILLING') return false;
    if (selectedFilter === 'Cleaning' && t.status !== 'CLEANING') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = t.tableNumber.toLowerCase().includes(q);
      const matchGuest = t.guestName?.toLowerCase().includes(q);
      if (!matchNum && !matchGuest) return false;
    }
    return true;
  });

  // Handle Start Order
  const handleOpenOrderModal = (table: TableItem) => {
    setActiveTable(table);
    setCustomerName(table.guestName || 'Guest');
    setGuestCount(table.guestCount || 2);
    setSelectedItems({});
    setSelectedCategory('All');
    setMenuSearch('');
    setOrderModalVisible(true);
  };

  // Handle direct Generate Bill from table
  const handleGenerateBillFromTable = async (table: TableItem) => {
    let orderId = table.currentOrderId;
    if (!orderId) {
      const found = await restaurantStore.getOrderByIdOrTable(undefined, table.tableNumber);
      orderId = found?.id;
    }
    if (orderId) {
      await restaurantStore.markOrderForBilling(orderId);
    }
    try {
      navigation.navigate('Billing', {
        tableNumber: table.tableNumber,
        orderId,
        step: 2,
      });
    } catch (e) {
      try {
        navigation.navigate('MainApp', {
          screen: 'Billing',
          params: {
            tableNumber: table.tableNumber,
            orderId,
            step: 2,
          },
        });
      } catch (e2) {
        console.warn('Navigation to Billing failed:', e2);
      }
    }
  };

  const handleUpdateItemQty = (id: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handlePunchKOT = async () => {
    if (!activeTable) return;
    const itemsList: KOTOrderItem[] = Object.entries(selectedItems).map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return {
        name: item?.name || 'Item',
        quantity: qty,
        price: item?.price || 0,
      };
    });

    if (itemsList.length === 0) {
      Alert.alert(
        language === 'mr' ? 'निवड करा' : language === 'hi' ? 'चयन करें' : 'Select Items',
        language === 'mr'
          ? 'कृपया Kitchen Order Ticket (KOT) साठी किमान १ पदार्थ निवडा.'
          : language === 'hi'
          ? 'कृपया Kitchen Order Ticket (KOT) के लिए कम से कम १ वस्तु चुनें।'
          : 'Please select at least 1 item for Kitchen Order Ticket (KOT).'
      );
      return;
    }

    try {
      const { order, kot } = await restaurantStore.startOrder(
        activeTable.tableNumber,
        customerName.trim() || 'Guest',
        itemsList,
        guestCount,
        activeBranchNumId
      );

      setOrderModalVisible(false);
      Alert.alert(
        language === 'mr'
          ? 'KOT पाठवली!'
          : language === 'hi'
          ? 'KOT भेजी गई!'
          : 'KOT Dispatched!',
        language === 'mr'
          ? `${formatTableName(activeTable.tableNumber, 'mr')} साठी KOT (${kot.id}) किचनमध्ये पाठवली व ऑर्डर (${order.id}) तयार झाली!`
          : language === 'hi'
          ? `${formatTableName(activeTable.tableNumber, 'hi')} के लिए KOT (${kot.id}) किचन में भेजी गई और ऑर्डर (${order.id}) तैयार हुआ!`
          : `KOT (${kot.id}) sent to kitchen for ${formatTableName(activeTable.tableNumber, 'en')} and Order (${order.id}) created!`,
        [
          {
            text: language === 'mr' ? 'टेबल्स पहा' : language === 'hi' ? 'टेबल्स देखें' : 'View Tables',
            style: 'cancel',
          },
          {
            text: language === 'mr' ? 'KOT Kitchen पहा' : language === 'hi' ? 'KOT Kitchen देखें' : 'View KOT Kitchen',
            onPress: () => navigation.navigate('KOT'),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        language === 'mr' ? 'त्रुटी' : language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'mr' ? 'ऑर्डर सुरू करताना त्रुटी आली.' : language === 'hi' ? 'ऑर्डर शुरू करने में त्रुटि हुई।' : 'Error starting order.'
      );
    }
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert(
        language === 'mr' ? 'माहिती आवश्यक' : language === 'hi' ? 'जानकारी आवश्यक' : 'Missing Info',
        language === 'mr'
          ? 'कृपया टेबल क्रमांक किंवा नाव टाका (उदा. Table 05 किंवा T-01).'
          : language === 'hi'
          ? 'कृपया टेबल संख्या या नाम दर्ज करें (उदा. Table 05 या T-01)।'
          : 'Please enter table number or name (e.g. Table 05 or T-01).'
      );
      return;
    }
    setIsAddingTable(true);
    try {
      await restaurantStore.addTable(
        {
          name: newTableName.trim(),
          capacity: Number(newTableCapacity) || 4,
          area: newTableArea,
          note: newTableNote.trim(),
        },
        activeBranchNumId
      );
      setAddTableModalVisible(false);
      setNewTableName('');
      setNewTableNote('');
      await loadData();
      Alert.alert(t('success', 'Success'), `${t('newTable', 'New table')} ${newTableName.trim()} ${t('isNowActive', 'is now active in')} ${getBranchName()}!`);
    } catch (e) {
      Alert.alert(t('error', 'Error'), t('tableCreateError', 'Error creating table.'));
    } finally {
      setIsAddingTable(false);
    }
  };

  // Categories list for menu
  const categories = ['All', 'Starters', 'Main Course', 'Breads', 'Rice', 'Dessert', 'Beverages'];

  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (menuSearch.trim()) {
      return item.name.toLowerCase().includes(menuSearch.toLowerCase());
    }
    return true;
  });

  const orderTotalAmount = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const orderTotalQty = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================================
            SCREEN HEADER (Matching Web Screenshot 3)
        =================================================== */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.superTitle}>{t('restaurantFloorManagement', 'RESTAURANT FLOOR MANAGEMENT')}</Text>
            <Text style={styles.mainTitle}>{t('tables', 'Tables')}</Text>
            <View style={styles.liveFloorRow}>
              <Text style={styles.liveFloorText}>
                {getBranchName()}  •  {toDevanagari(totalCount)} {t('tables', 'tables')}  •  {toDevanagari(totalSeats)} {t('seats', 'Seats')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addTableBtn}
            onPress={() => setAddTableModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addTableText}>{t('addTable', 'Add Table')}</Text>
          </TouchableOpacity>
        </View>
        {/* ===================================================
            6 METRIC STAT CARDS (Screenshot 3 - All Clickable!)
        =================================================== */}
        <View style={styles.kpiRow}>
          {/* 1. Total Tables */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'All' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('All')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#78716C' }]} />
              <Text style={styles.kpiLabel}>{t('totalTables', 'Total Tables')}</Text>
            </View>
            <Text style={styles.kpiNumber}>{toDevanagari(totalCount)}</Text>
            <Text style={styles.kpiSub}>{t('allFloorTables', 'All floor tables')}</Text>
          </TouchableOpacity>

          {/* 2. Available */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'Available' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('Available')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.kpiLabel}>{t('available', 'Available')}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>{toDevanagari(availableCount)}</Text>
            <Text style={styles.kpiSub}>{t('readyForGuests', 'Ready for guests')}</Text>
          </TouchableOpacity>

          {/* 3. Occupied */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'Occupied' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('Occupied')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#EA580C' }]} />
              <Text style={styles.kpiLabel}>{t('occupied', 'Occupied')}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: '#EA580C' }]}>{toDevanagari(occupiedCount)}</Text>
            <Text style={styles.kpiSub}>{t('guestsDining', 'Guests dining')}</Text>
          </TouchableOpacity>

          {/* 4. Reserved */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'Reserved' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('Reserved')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#9333EA' }]} />
              <Text style={styles.kpiLabel}>{t('reserved', 'Reserved')}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: '#9333EA' }]}>{toDevanagari(reservedCount)}</Text>
            <Text style={styles.kpiSub}>{t('upcomingBookings', 'Upcoming bookings')}</Text>
          </TouchableOpacity>

          {/* 5. Billed */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedFilter === 'Billing' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('Billing')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.kpiLabel}>{t('billed', 'Billed')}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: '#D97706' }]}>{toDevanagari(billingCount)}</Text>
            <Text style={styles.kpiSub}>{t('paymentPending', 'Payment pending')}</Text>
          </TouchableOpacity>

          {/* 6. Occupancy */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => setSelectedFilter('Occupied')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.kpiLabel}>{t('occupancy', 'Occupancy')}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: '#2563EB' }]}>{toDevanagari(occupancyPercent)}%</Text>
            <Text style={styles.kpiSub}>{t('currentFloorOccupancy', 'Current floor occupancy')}</Text>
          </TouchableOpacity>
        </View>

        {/* ===================================================
            FILTER PILLS & SEARCH (Screenshot 3)
        =================================================== */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsScroll}>
            {[
              { id: 'All', label: `${t('all', 'All')} ${toDevanagari(totalCount)}` },
              { id: 'Available', label: `${translateStatus('AVAILABLE')} ${toDevanagari(availableCount)}` },
              { id: 'Occupied', label: `${translateStatus('OCCUPIED')} ${toDevanagari(occupiedCount)}` },
              { id: 'Reserved', label: `${translateStatus('RESERVED')} ${toDevanagari(reservedCount)}` },
              { id: 'Billing', label: `${translateStatus('BILLED')} ${toDevanagari(billingCount)}` },
              { id: 'Cleaning', label: `${translateStatus('CLEANING')} ${toDevanagari(0)}` },
            ].map((tab) => {
              const active = selectedFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedFilter(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Table */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color="#78716C" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchTableOrGuest', 'Search table or guest...')}
                placeholderTextColor="#A8A29E"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={15} color="#78716C" />
                </TouchableOpacity>
              )}
            </View>

            {selectedFilter !== 'All' && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => setSelectedFilter('All')}
                activeOpacity={0.8}
              >
                <RotateCcw size={14} color="#78716C" />
                <Text style={styles.resetText}>{t('reset', 'Reset')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Floor Tables Title and Legend */}
        <View style={styles.floorHeadingRow}>
          <View>
            <Text style={styles.floorTitle}>{t('floorTables', 'Floor tables')}</Text>
          </View>
          <Text style={styles.showingText}>{t('showing', 'Showing')} {toDevanagari(filteredTables.length)} {t('of', 'of')} {toDevanagari(totalCount)}</Text>
        </View>

        {/* Status Legend Bar */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>{translateStatus('AVAILABLE')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
            <Text style={styles.legendText}>{translateStatus('OCCUPIED')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9333EA' }]} />
            <Text style={styles.legendText}>{translateStatus('RESERVED')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>{translateStatus('BILLED')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>{translateStatus('CLEANING')}</Text>
          </View>
        </View>

        {/* ===================================================
            TABLE CARDS GRID (ENTIRE CARD IS CLICKABLE!)
        =================================================== */}
        <View style={styles.tablesGrid}>
          {filteredTables.map((table) => {
            const isAvailable = table.status === 'AVAILABLE';
            const isBilling = table.status === 'BILLING';
            const isOccupied = table.status === 'OCCUPIED';

            let statusBg = '#DCFCE7';
            let statusColor = '#16A34A';
            let statusText = translateStatus('AVAILABLE');
            let cardBorder = '#E7E5E4';

            if (isBilling) {
              statusBg = '#FEF3C7';
              statusColor = '#D97706';
              statusText = translateStatus('BILLED');
              cardBorder = '#FCD34D';
            } else if (isOccupied) {
              statusBg = '#FFEDD5';
              statusColor = '#EA580C';
              statusText = translateStatus('OCCUPIED');
              cardBorder = '#FDBA74';
            } else if (table.status === 'RESERVED') {
              statusBg = '#F3E8FF';
              statusColor = '#9333EA';
              statusText = translateStatus('RESERVED');
              cardBorder = '#D8B4FE';
            }

            return (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.tableCard,
                  { borderColor: cardBorder },
                  isBilling && styles.tableCardBilling,
                  isOccupied && styles.tableCardOccupied,
                ]}
                onPress={() => {
                  if (isAvailable) {
                    handleOpenOrderModal(table);
                  } else if (isBilling) {
                    navigation.navigate('Billing', {
                      tableNumber: table.tableNumber,
                      orderId: table.currentOrderId,
                      step: 2,
                    });
                  } else if (isOccupied) {
                    handleGenerateBillFromTable(table);
                  }
                }}
                activeOpacity={0.8}
              >
                {/* Table Header: Name and Status Badge */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.tableCardTitle}>{formatTableName(table.tableNumber)}</Text>
                    <Text style={styles.tableCardSection}>{t(table.section.toLowerCase(), table.section)}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {statusText}
                    </Text>
                  </View>
                </View>

                {/* Table Visual Diagram: Illustrated Table with Seats */}
                <View style={styles.tableVisualWrap}>
                  <View style={styles.tableIllustration}>
                    {/* Top Chairs */}
                    <View style={styles.chairsTopRow}>
                      <View style={styles.chairPill} />
                      {table.capacity > 4 && <View style={styles.chairPill} />}
                      <View style={styles.chairPill} />
                    </View>

                    {/* Table Center with Capacity */}
                    <View
                      style={[
                        styles.tableTopBox,
                        isOccupied && styles.tableTopOccupied,
                        isBilling && styles.tableTopBilling,
                      ]}
                    >
                      <Text style={styles.tableCapacityNum}>{toDevanagari(table.capacity)}</Text>
                      {table.activeBillAmount ? (
                        <Text style={styles.tableAmountText}>₹{toDevanagari(table.activeBillAmount)}</Text>
                      ) : null}
                    </View>

                    {/* Bottom Chairs */}
                    <View style={styles.chairsBottomRow}>
                      <View style={styles.chairPill} />
                      {table.capacity > 4 && <View style={styles.chairPill} />}
                      <View style={styles.chairPill} />
                    </View>
                  </View>
                </View>

                {/* Card Meta: Capacity and Section */}
                <View style={styles.cardMetaRow}>
                  <View>
                    <Text style={styles.cardMetaLabel}>{t('capacitySeats', 'CAPACITY (SEATS)')}</Text>
                    <Text style={styles.cardMetaValue}>{toDevanagari(table.capacity)} {t('seats', 'Seats')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardMetaLabel}>{t('section', 'SECTION')}</Text>
                    <Text style={styles.cardMetaValue}>{t(table.section.toLowerCase(), table.section)}</Text>
                  </View>
                </View>

                {/* Guest dining indicator if occupied */}
                {!isAvailable && (
                  <View style={styles.guestInfoRow}>
                    <View style={styles.guestAvatar}>
                      <Text style={styles.guestAvatarText}>
                        {(table.guestName || 'GU').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.guestSubLabel}>{t('currentGuest', 'Current guest')}</Text>
                      <Text style={styles.guestNameText} numberOfLines={1}>
                        {localizeGuestName(table.guestName)}
                      </Text>
                    </View>
                    <Text style={styles.guestCountBadge}>{toDevanagari(table.guestCount || 2)} {t('guests', 'guests')}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewActionBtn}
                    onPress={() => {
                      setViewingTable(table);
                      setViewDetailsModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewActionText}>{t('view', 'View')}</Text>
                  </TouchableOpacity>

                  {isAvailable && (
                    <TouchableOpacity
                      style={styles.startOrderBtn}
                      onPress={() => handleOpenOrderModal(table)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startOrderText}>{t('startOrder', 'Start Order')}</Text>
                    </TouchableOpacity>
                  )}

                  {isBilling && (
                    <TouchableOpacity
                      style={styles.proceedPaymentBtn}
                      onPress={() => {
                        navigation.navigate('Billing', {
                          tableNumber: table.tableNumber,
                          orderId: table.currentOrderId,
                          step: 2,
                        });
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.proceedPaymentText}>{t('proceedToPayment', 'Proceed to Payment')}</Text>
                    </TouchableOpacity>
                  )}

                  {isOccupied && (
                    <View style={styles.occupiedActionRow}>
                      <TouchableOpacity
                        style={styles.addKotSmallBtn}
                        onPress={() => handleOpenOrderModal(table)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.addKotSmallText}>+ {t('kot', 'KOT')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.generateBillDirectBtn}
                        onPress={() => handleGenerateBillFromTable(table)}
                        activeOpacity={0.85}
                      >
                        <Receipt size={12} color="#FFFFFF" />
                        <Text style={styles.generateBillDirectText}>{t('bill', 'Bill')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredTables.length === 0 && (
          <View style={styles.emptyTableBox}>
            <UtensilsCrossed size={42} color="#D6D3D1" />
            <Text style={styles.emptyTableTitle}>कोणतेही टेबल उपलब्ध नाही (No Tables)</Text>
            <Text style={styles.emptyTableSub}>
              {getBranchName()} शाखेत सध्या कोणतेही टेबल उपलब्ध नाही.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setAddTableModalVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>नवीन टेबल जोडा (Add Table)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===================================================
          ADD TABLE MODAL (Multi-Branch Floor Setup)
      =================================================== */}
      <Modal visible={addTableModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>नवीन टेबल जोडा (Add Table)</Text>
                <Text style={styles.modalSub}>
                  {getBranchName()} शाखेसाठी नवीन टेबल तयार करा
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddTableModalVisible(false)}
              >
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.inputMiniLabel}>टेबल क्रमांक किंवा नाव * (e.g. Table 05 किंवा T-01)</Text>
              <TextInput
                style={styles.miniInput}
                placeholder="उदा. Table 05 किंवा T-01"
                value={newTableName}
                onChangeText={setNewTableName}
              />

              <View style={{ height: 12 }} />
              <Text style={styles.inputMiniLabel}>बैठक क्षमता / Seats (e.g. 2, 4, 6, 8)</Text>
              <TextInput
                style={styles.miniInput}
                placeholder="4"
                keyboardType="numeric"
                value={newTableCapacity}
                onChangeText={setNewTableCapacity}
              />

              <View style={{ height: 12 }} />
              <Text style={styles.inputMiniLabel}>सेक्शन / विभाग (Section)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {['Main Dining', 'AC Hall', 'Rooftop', 'Terrace', 'Garden', 'Private Dining'].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.sectionChip,
                      newTableArea === sec && styles.sectionChipActive,
                    ]}
                    onPress={() => setNewTableArea(sec)}
                  >
                    <Text style={[styles.sectionChipText, newTableArea === sec && styles.sectionChipTextActive]}>
                      {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 12 }} />
              <Text style={styles.inputMiniLabel}>टीप / Note (पर्यायी)</Text>
              <TextInput
                style={styles.miniInput}
                placeholder="उदा. खिडकी जवळ"
                value={newTableNote}
                onChangeText={setNewTableNote}
              />

              <View style={{ height: 20 }} />
              <TouchableOpacity
                style={styles.saveNewTableBtn}
                onPress={handleAddTable}
                disabled={isAddingTable}
                activeOpacity={0.85}
              >
                <Text style={styles.saveNewTableText}>
                  {isAddingTable ? 'जतन करत आहे...' : 'टेबल तयार करा (Save Table)'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          START ORDER MODAL (Interactive Menu Ordering)
      =================================================== */}
      <Modal visible={orderModalVisible} animationType="slide" transparent={true}>

        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {activeTable?.status === 'OCCUPIED' ? t('addItemsTo', 'Add Items to') : t('startOrderFor', 'Start Order for')}{' '}
                  {formatTableName(activeTable?.tableNumber)}
                </Text>
                <Text style={styles.modalSub}>
                  {t('selectMenuDishesKOT', 'Select menu dishes to punch Kitchen Order Ticket (KOT)')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setOrderModalVisible(false)}
              >
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            {/* Customer & Guest Count Bar */}
            <View style={styles.customerFormRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputMiniLabel}>{t('guestName', 'Guest Name')}</Text>
                <TextInput
                  style={styles.miniInput}
                  placeholder="e.g. Ramesh Patil / Guest"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>

              <View style={{ width: 110, marginLeft: 12 }}>
                <Text style={styles.inputMiniLabel}>{t('guestsCount', 'Guests Count')}</Text>
                <View style={styles.qtySpinRow}>
                  <TouchableOpacity
                    style={styles.spinBtn}
                    onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                  >
                    <Minus size={14} color="#78716C" />
                  </TouchableOpacity>
                  <Text style={styles.spinNum}>{toDevanagari(guestCount)}</Text>
                  <TouchableOpacity
                    style={styles.spinBtn}
                    onPress={() => setGuestCount(guestCount + 1)}
                  >
                    <Plus size={14} color="#78716C" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Menu Search */}
            <View style={styles.menuSearchBox}>
              <Search size={15} color="#78716C" />
              <TextInput
                style={styles.menuSearchInput}
                placeholder={t('searchFoodItem', 'Search food item (e.g. Paneer, Roti)...')}
                value={menuSearch}
                onChangeText={setMenuSearch}
              />
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[styles.catText, selectedCategory === cat && styles.catTextActive]}
                  >
                    {cat === 'All' ? t('all', 'All') : t(cat.toLowerCase(), cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Menu Items List */}
            <ScrollView style={styles.menuListScroll}>
              {filteredMenuItems.map((item) => {
                const qty = selectedItems[item.id] || 0;
                return (
                  <View key={item.id} style={styles.menuItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemName}>{getLocalizedMenuItemName(item.name)}</Text>
                      <Text style={styles.menuItemPrice}>₹{toDevanagari(item.price)} • {t(item.category.toLowerCase(), item.category)}</Text>
                    </View>

                    {qty === 0 ? (
                      <TouchableOpacity
                        style={styles.addDishBtn}
                        onPress={() => handleUpdateItemQty(item.id, 1)}
                      >
                        <Plus size={14} color="#EA580C" />
                        <Text style={styles.addDishText}>{t('add', 'ADD')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyControlRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleUpdateItemQty(item.id, -1)}
                        >
                          <Minus size={14} color="#EA580C" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{toDevanagari(qty)}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleUpdateItemQty(item.id, 1)}
                        >
                          <Plus size={14} color="#EA580C" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer Summary & Punch KOT */}
            <View style={styles.modalFooter}>
              <View>
                <Text style={styles.orderSummaryQty}>{toDevanagari(orderTotalQty)} {t('itemsSelected', 'Items selected')}</Text>
                <Text style={styles.orderSummaryTotal}>{t('total', 'Total')}: ₹{toDevanagari(orderTotalAmount)}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.punchKotBtn,
                  orderTotalQty === 0 && { backgroundColor: '#CBD5E1' },
                ]}
                onPress={handlePunchKOT}
                disabled={orderTotalQty === 0}
              >
                <UtensilsCrossed size={16} color="#FFFFFF" />
                <Text style={styles.punchKotText}>{t('punchKotKitchen', 'Punch KOT & Seat Table')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          VIEW DETAILS MODAL
      =================================================== */}
      <Modal visible={viewDetailsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{viewingTable?.tableNumber} तपशील</Text>
                <Text style={styles.modalSub}>{viewingTable?.section} • {viewingTable?.capacity} Chairs</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setViewDetailsModal(false)}
              >
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailVal, { fontWeight: '800' }]}>{viewingTable?.status}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Guest Name:</Text>
                <Text style={styles.detailVal}>{viewingTable?.guestName || 'None'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Guests Count:</Text>
                <Text style={styles.detailVal}>{viewingTable?.guestCount || 0} Persons</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Order ID:</Text>
                <Text style={styles.detailVal}>#{viewingTable?.currentOrderId || 'None'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Active Amount:</Text>
                <Text style={[styles.detailVal, { color: '#EA580C', fontWeight: '800' }]}>
                  {viewingTable?.activeBillAmount ? `₹${viewingTable.activeBillAmount}` : '₹0'}
                </Text>
              </View>
            </View>

            <View style={{ padding: 16 }}>
              <TouchableOpacity
                style={styles.closeModalSimpleBtn}
                onPress={() => setViewDetailsModal(false)}
              >
                <Text style={styles.closeModalSimpleText}>Close</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1917',
  },
  subTitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  liveFloorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  greenLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveFloorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#44403C',
  },
  addTableBtn: {
    backgroundColor: '#9A3412',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
  },
  addTableText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  scrollContent: {
    padding: 16,
  },

  /* 6 KPI Cards */
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
  },
  kpiCardActiveBorder: {
    borderColor: '#9A3412',
    backgroundColor: '#FFFBF5',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1917',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#78716C',
  },

  /* Filter Section */
  filterSection: {
    marginBottom: 16,
  },
  filterTabsScroll: {
    marginBottom: 10,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  filterPillActive: {
    backgroundColor: '#9A3412',
    borderColor: '#9A3412',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534E',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1C1917',
    marginLeft: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#57534E',
    marginLeft: 4,
  },

  /* Floor Heading */
  floorHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  floorSubtitle: {
    fontSize: 11,
    color: '#78716C',
  },
  showingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginVertical: 2,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#57534E',
  },

  /* Tables Grid */
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 9,
    marginBottom: 10,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tableCardBilling: {
    backgroundColor: '#FFFEFA',
  },
  tableCardOccupied: {
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  tableCardSection: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Table Visual Diagram */
  tableVisualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  tableIllustration: {
    alignItems: 'center',
    width: 96,
  },
  chairsTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 2,
  },
  chairsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 2,
  },
  chairPill: {
    width: 18,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D6D3D1',
    marginHorizontal: 3,
  },
  tableTopBox: {
    width: 76,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D6D3D1',
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableTopOccupied: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  tableTopBilling: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  tableCapacityNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#44403C',
  },
  tableAmountText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 1,
  },

  /* Card Meta */
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    marginBottom: 5,
  },
  cardMetaLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 0.3,
  },
  cardMetaValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#44403C',
    marginTop: 1,
  },

  /* Guest Info */
  guestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFBF7',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F5EFE6',
  },
  guestAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guestSubLabel: {
    fontSize: 8,
    color: '#78716C',
  },
  guestNameText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1917',
  },
  guestCountBadge: {
    fontSize: 8.5,
    color: '#78716C',
    fontWeight: '600',
  },

  /* Card Action Buttons */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  viewActionBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
  },
  viewActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#57534E',
  },
  startOrderBtn: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#9A3412',
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOrderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proceedPaymentBtn: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#78350F',
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedPaymentText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  occupiedActionRow: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 5,
  },
  addKotSmallBtn: {
    flex: 1,
    backgroundColor: '#FFEDD5',
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  addKotSmallText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C2410C',
  },
  generateBillDirectBtn: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#9A3412',
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBillDirectText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 3,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalCloseBtn: {
    padding: 4,
  },
  customerFormRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  inputMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  qtySpinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  spinBtn: {
    padding: 6,
  },
  spinNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  menuSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  menuSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#1C1917',
  },
  catScroll: {
    marginHorizontal: 16,
    marginTop: 10,
    maxHeight: 38,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F4',
    marginRight: 6,
  },
  catPillActive: {
    backgroundColor: '#9A3412',
  },
  catText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  menuListScroll: {
    maxHeight: 280,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  menuItemPrice: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  addDishText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    marginLeft: 4,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
    marginHorizontal: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  orderSummaryQty: {
    fontSize: 11,
    color: '#78716C',
  },
  orderSummaryTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  punchKotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  punchKotText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  detailLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  detailVal: {
    fontSize: 12,
    color: '#1C1917',
  },
  closeModalSimpleBtn: {
    backgroundColor: '#F5F5F4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalSimpleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534E',
  },
  emptyTableBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderStyle: 'dashed',
    padding: 36,
    marginHorizontal: 16,
    marginTop: 20,
  },
  emptyTableTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#44403C',
    marginTop: 12,
  },
  emptyTableSub: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C2410C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  sectionChip: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  sectionChipActive: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
  },
  sectionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  sectionChipTextActive: {
    color: '#C2410C',
  },
  saveNewTableBtn: {
    backgroundColor: '#C2410C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveNewTableText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

