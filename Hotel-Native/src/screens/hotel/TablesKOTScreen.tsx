import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { ReceiptRupee } from '../../components/ReceiptRupeeIcon';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
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
  Clock,
  Search,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  ChefHat,
} from 'lucide-react-native';

import { useBranch } from '../../context/BranchContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const TablesKOTScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
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
  const { activeBranchNumId, activeBranch, getBranchName } = useBranch();
  const [tables, setTables] = useState<TableItem[]>(() =>
    restaurantStore.getCachedTables(activeBranchNumId)
  );
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() =>
    restaurantStore.getMenuItems()
  );
  const [selectedFilter, setSelectedFilter] = useState<string>(() => route?.params?.filter || 'All');

  useEffect(() => {
    if (route?.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route?.params?.filter]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Start Order / Table Details Modal
  const [orderModalVisible, setOrderModalVisible] = useState<boolean>(false);
  const [activeTable, setActiveTable] = useState<TableItem | null>(null);
  const [customerName, setCustomerName] = useState<string>('Guest');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: number }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Add Menu Item Modal State
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState<boolean>(false);
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<string>('Main Course');
  const [newDishPrice, setNewDishPrice] = useState<string>('');

  // Details Modal
  const [viewDetailsModal, setViewDetailsModal] = useState<boolean>(false);
  const [viewingTable, setViewingTable] = useState<TableItem | null>(null);

  // KOT Dispatched Quick Actions Modal
  const [kotSuccessInfo, setKotSuccessInfo] = useState<{
    kotNumber: string;
    orderNumber: string;
    orderId: string;
    tableNumber: string;
    itemsCount: number;
  } | null>(null);

  // Add Table Modal State
  const [addTableModalVisible, setAddTableModalVisible] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableCapacity, setNewTableCapacity] = useState<string>('4');
  const [newTableArea, setNewTableArea] = useState<string>('Main Dining');
  const [newTableNote, setNewTableNote] = useState<string>('');
  const [isAddingTable, setIsAddingTable] = useState<boolean>(false);

  // Fast equality check to avoid re-renders when data didn't change
  const areTablesEqual = useCallback((a: TableItem[], b: TableItem[]): boolean => {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].id !== b[i].id ||
        a[i].status !== b[i].status ||
        a[i].cleaningRemainingSeconds !== b[i].cleaningRemainingSeconds ||
        a[i].guestName !== b[i].guestName ||
        a[i].activeBillAmount !== b[i].activeBillAmount ||
        a[i].tableNumber !== b[i].tableNumber
      ) {
        return false;
      }
    }
    return true;
  }, []);

  const loadData = useCallback(async () => {
    // 1. Immediately read memory cache (0ms instant load)
    const cached = restaurantStore.getCachedTables(activeBranchNumId);
    if (cached && cached.length > 0) {
      setTables((prev) => (areTablesEqual(prev, cached) ? prev : cached));
    }
    try {
      const tList = await restaurantStore.getTables(activeBranchNumId);
      if (Array.isArray(tList)) {
        setTables((prev) => (areTablesEqual(prev, tList) ? prev : tList));
      }
    } catch {
      // Offline fallback silent
    }
  }, [activeBranchNumId, areTablesEqual]);

  // Load menu items once on mount in background
  useEffect(() => {
    restaurantStore
      .loadMenuItemsFromBackend()
      .then((mList) => {
        if (Array.isArray(mList) && mList.length > 0) {
          setMenuItems(restaurantStore.getMenuItems());
        }
      })
      .catch(() => {});
  }, []);

  // Subscribe to central restaurantStore for reactive updates
  useEffect(() => {
    loadData();
    let debounceTimer: any = null;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData();
      }, 300);
    };

    const unsubscribeStore = restaurantStore.subscribe(() => {
      const cached = restaurantStore.getCachedTables(activeBranchNumId);
      setTables((prev) => (areTablesEqual(prev, cached) ? prev : cached));
    });

    const unsubscribeFocus = navigation?.addListener?.('focus', debouncedRefresh);

    return () => {
      clearTimeout(debounceTimer);
      unsubscribeStore();
      unsubscribeFocus?.();
    };
  }, [navigation, activeBranchNumId, loadData, areTablesEqual]);

  // 1-second interval to update live countdown on any CLEANING table
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const hasCleaning = tables.some((t) => t.status === 'CLEANING');
    if (!hasCleaning) return;

    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [tables]);

  // Clean side-effect outside of render to auto-release cleaning tables when timer reaches 0
  useEffect(() => {
    tables.forEach((t) => {
      if (t.status === 'CLEANING') {
        const rem = restaurantStore.getTableCleaningRemainingSeconds(activeBranchNumId, t.tableNumber);
        if (rem <= 0) {
          restaurantStore.markTableAvailableFromCleaning(t.id, t.tableNumber, activeBranchNumId).catch(() => {});
        }
      }
    });
  }, [nowSec, tables, activeBranchNumId]);

  // KPI Metrics calculation (Single pass memoized)
  const {
    totalCount,
    availableCount,
    occupiedCount,
    reservedCount,
    billingCount,
    cleaningCount,
    totalSeats,
    occupiedSeats,
    occupancyPercent,
  } = useMemo(() => {
    const total = tables.length;
    let avail = 0;
    let occ = 0;
    let res = 0;
    let bill = 0;
    let clean = 0;
    let seats = 0;
    let occSeats = 0;
    for (let i = 0; i < total; i++) {
      const t = tables[i];
      const cap = t.capacity || 4;
      seats += cap;
      if (t.status === 'AVAILABLE') avail++;
      else if (t.status === 'OCCUPIED') {
        occ++;
        occSeats += t.guestCount || cap || 2;
      } else if (t.status === 'RESERVED') res++;
      else if (t.status === 'BILLING') {
        bill++;
        occSeats += t.guestCount || cap || 2;
      } else if (t.status === 'CLEANING') {
        clean++;
      }
    }
    const occPct = seats > 0 ? Math.round((occSeats / seats) * 100) : 44;
    return {
      totalCount: total,
      availableCount: avail,
      occupiedCount: occ,
      reservedCount: res,
      billingCount: bill,
      cleaningCount: clean,
      totalSeats: seats,
      occupiedSeats: occSeats,
      occupancyPercent: occPct,
    };
  }, [tables]);

  // Filtered Tables (Memoized)
  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tables.filter((t) => {
      if (selectedFilter === 'Available' && t.status !== 'AVAILABLE') return false;
      if (selectedFilter === 'Occupied' && t.status !== 'OCCUPIED') return false;
      if (selectedFilter === 'Reserved' && t.status !== 'RESERVED') return false;
      if (selectedFilter === 'Billing' && t.status !== 'BILLING') return false;
      if (selectedFilter === 'Cleaning' && t.status !== 'CLEANING') return false;
      if (q) {
        const matchNum = t.tableNumber.toLowerCase().includes(q);
        const matchGuest = t.guestName?.toLowerCase().includes(q);
        if (!matchNum && !matchGuest) return false;
      }
      return true;
    });
  }, [tables, selectedFilter, searchQuery]);

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

  // Handle direct Generate Bill from table (0ms instant navigation + non-blocking sync)
  const handleGenerateBillFromTable = async (table: TableItem) => {
    const resolvedOrder = restaurantStore.ensureBillingOrderForTable(table, activeBranchNumId);
    const orderId = restaurantStore.resolveOrderId(resolvedOrder.id);
    if (resolvedOrder.status !== 'PAID') {
      restaurantStore.markOrderForBilling(orderId, activeBranchNumId).catch(() => {});
    }
    const navParams = {
      tableNumber: table.tableNumber,
      orderId,
      guestName: table.guestName,
      billAmount: table.activeBillAmount,
      step: 2 as const,
      resetStepTs: undefined,
      _navTs: Date.now(),
    };
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
    const itemsMap = new Map<string, KOTOrderItem>();
    Object.entries(selectedItems).forEach(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      const name = String(item?.name || 'Item').trim();
      const price = item?.price || 0;
      const key = name.toLowerCase();
      if (itemsMap.has(key)) {
        const ex = itemsMap.get(key)!;
        ex.quantity += qty;
        if (ex.price <= 0 && price > 0) ex.price = price;
      } else {
        itemsMap.set(key, { name, quantity: qty, price });
      }
    });
    const itemsList: KOTOrderItem[] = Array.from(itemsMap.values());

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
      const rawOrderNo = String(order.orderNumber || '').trim();
      const dispOrderNo =
        rawOrderNo && !rawOrderNo.toLowerCase().startsWith('temp-')
          ? rawOrderNo.startsWith('#')
            ? rawOrderNo
            : `#${rawOrderNo}`
          : String(order.id || '').startsWith('temp-ord-')
          ? `#ORD-${String(order.id).replace(/^temp-ord-/, '').split('-')[0].slice(-6)}`
          : `#${order.id}`;
      const dispKotNo = String(kot.id || '').startsWith('#') ? kot.id : `#${kot.id}`;
      setKotSuccessInfo({
        kotNumber: dispKotNo,
        orderNumber: dispOrderNo,
        orderId: order.id,
        tableNumber: activeTable.tableNumber,
        itemsCount: itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0),
      });
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
      Alert.alert(t('success', 'Success'), `${t('newTable', 'New table')} ${newTableName.trim()} ${t('isNowActive', 'is now active')}!`);
    } catch (e) {
      Alert.alert(t('error', 'Error'), t('tableCreateError', 'Error creating table.'));
    } finally {
      setIsAddingTable(false);
    }
  };

  // Categories list for menu (dynamically includes all existing menu categories)
  const categories = useMemo(
    () => {
      const defaultCats = ['All', 'Starters', 'Main Course', 'Breads', 'Rice', 'Dessert', 'Beverages'];
      const dynamicCats = (menuItems || []).map((m) => m?.category).filter(Boolean);
      return Array.from(new Set([...defaultCats, ...dynamicCats]));
    },
    [menuItems]
  );

  // Create new menu item manually with category & price
  const handleAddNewMenuItem = async () => {
    if (!newDishName.trim()) {
      Alert.alert(t('missingName', 'Missing Name'), t('enterItemName', 'Please enter item name.'));
      return;
    }
    const priceNum = parseFloat(newDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t('invalidPrice', 'Invalid Price'), t('enterValidPrice', 'Please enter a valid price.'));
      return;
    }

    try {
      const created = await restaurantStore.addMenuItem({
        name: newDishName.trim(),
        category: newDishCategory || 'Main Course',
        price: priceNum,
      });

      const updatedMenu = restaurantStore.getMenuItems();
      setMenuItems(updatedMenu);

      if (created?.id) {
        setSelectedItems((prev) => ({
          ...prev,
          [created.id]: (prev[created.id] || 0) + 1,
        }));
      }

      setShowAddMenuItemModal(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishCategory('Main Course');
      Alert.alert(t('dishAdded', 'Dish Added'), `${created.name} added to menu!`);
    } catch {
      Alert.alert(t('error', 'Error'), 'Failed to add menu item.');
    }
  };

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: MenuItemData[] = [];

    for (const item of (menuItems || [])) {
      if (!item || !item.name) continue;
      const cleanName = item.name.trim().toLowerCase();
      const cleanId = String(item.id || '').trim();
      if (seenNames.has(cleanName) || (cleanId && seenIds.has(cleanId))) continue;
      seenNames.add(cleanName);
      if (cleanId) seenIds.add(cleanId);
      deduplicated.push({
        ...item,
        name: item.name.trim(),
      });
    }

    return deduplicated.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (q) {
        const localized = getLocalizedMenuItemName(item.name).toLowerCase();
        return item.name.toLowerCase().includes(q) || localized.includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, menuSearch]);

  const { orderTotalAmount, orderTotalQty } = useMemo(() => {
    let amt = 0;
    let qty = 0;
    const entries = Object.entries(selectedItems);
    for (let i = 0; i < entries.length; i++) {
      const [id, count] = entries[i];
      const item = menuItems.find((m) => m.id === id);
      amt += (item?.price || 0) * count;
      qty += count;
    }
    return { orderTotalAmount: amt, orderTotalQty: qty };
  }, [selectedItems, menuItems]);

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} activeRouteName="Tables" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================================================
            SCREEN HEADER (Clean & Simple)
        =================================================== */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>{t('tables', 'Tables')}</Text>
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
            ACTION METRIC CARDS (4 on Row 1, 3 on Row 2)
        =================================================== */}
        <View style={styles.kpiRow4}>
          {/* 1. Total Tables */}
          <TouchableOpacity
            style={[styles.kpiCard4, selectedFilter === 'All' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter('All')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#78716C' }]} />
              <Text style={styles.kpiLabel4} numberOfLines={1}>{t('totalTables', 'Total')}</Text>
            </View>
            <Text style={styles.kpiNumber4}>{toDevanagari(totalCount)}</Text>
          </TouchableOpacity>

          {/* 2. Available */}
          <TouchableOpacity
            style={[styles.kpiCard4, selectedFilter === 'Available' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter(selectedFilter === 'Available' ? 'All' : 'Available')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.kpiLabel4} numberOfLines={1}>{t('available', 'Available')}</Text>
            </View>
            <Text style={[styles.kpiNumber4, { color: '#16A34A' }]}>{toDevanagari(availableCount)}</Text>
          </TouchableOpacity>

          {/* 3. Occupied */}
          <TouchableOpacity
            style={[styles.kpiCard4, selectedFilter === 'Occupied' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter(selectedFilter === 'Occupied' ? 'All' : 'Occupied')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#EA580C' }]} />
              <Text style={styles.kpiLabel4} numberOfLines={1}>{t('occupied', 'Occupied')}</Text>
            </View>
            <Text style={[styles.kpiNumber4, { color: '#EA580C' }]}>{toDevanagari(occupiedCount)}</Text>
          </TouchableOpacity>

          {/* 4. Cleaning */}
          <TouchableOpacity
            style={[styles.kpiCard4, selectedFilter === 'Cleaning' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter(selectedFilter === 'Cleaning' ? 'All' : 'Cleaning')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#94461B' }]} />
              <Text style={styles.kpiLabel4} numberOfLines={1}>{t('cleaning', 'Cleaning')}</Text>
            </View>
            <Text style={[styles.kpiNumber4, { color: '#94461B' }]}>{toDevanagari(cleaningCount)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiRow3}>
          {/* 5. Reserved */}
          <TouchableOpacity
            style={[styles.kpiCard3, selectedFilter === 'Reserved' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter(selectedFilter === 'Reserved' ? 'All' : 'Reserved')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#9333EA' }]} />
              <Text style={styles.kpiLabel3} numberOfLines={1}>{t('reserved', 'Reserved')}</Text>
            </View>
            <Text style={[styles.kpiNumber3, { color: '#9333EA' }]}>{toDevanagari(reservedCount)}</Text>
          </TouchableOpacity>

          {/* 6. Billed */}
          <TouchableOpacity
            style={[styles.kpiCard3, selectedFilter === 'Billing' && styles.kpiCardActiveBorder]}
            onPress={() => setSelectedFilter(selectedFilter === 'Billing' ? 'All' : 'Billing')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.kpiLabel3} numberOfLines={1}>{t('billed', 'Billed')}</Text>
            </View>
            <Text style={[styles.kpiNumber3, { color: '#D97706' }]}>{toDevanagari(billingCount)}</Text>
          </TouchableOpacity>

          {/* 7. Occupancy */}
          <TouchableOpacity
            style={styles.kpiCard3}
            onPress={() => setSelectedFilter(selectedFilter === 'Occupied' ? 'All' : 'Occupied')}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.kpiLabel3} numberOfLines={1}>{t('occupancy', 'Occupancy')}</Text>
            </View>
            <Text style={[styles.kpiNumber3, { color: '#2563EB' }]}>{toDevanagari(occupancyPercent)}%</Text>
          </TouchableOpacity>
        </View>

        {/* Floor Tables Title */}
        <View style={styles.floorHeadingRow}>
          <View>
            <Text style={styles.floorTitle}>{t('floorTables', 'Floor tables')}</Text>
          </View>
          <Text style={styles.showingText}>{t('showing', 'Showing')} {toDevanagari(filteredTables.length)} {t('of', 'of')} {toDevanagari(totalCount)}</Text>
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
            } else if (table.status === 'CLEANING') {
              const rem = restaurantStore.getTableCleaningRemainingSeconds(activeBranchNumId, table.tableNumber);
              const mm = Math.floor(rem / 60);
              const ss = rem % 60;
              const timeStr = ` (${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')})`;
              statusBg = '#E0F2FE';
              statusColor = '#0284C7';
              statusText = `${translateStatus('CLEANING')}${timeStr}`;
              cardBorder = '#38BDF8';
            }

            return (
              <View
                key={table.id}
                style={[
                  styles.tableCard,
                  { borderColor: cardBorder },
                  isBilling && styles.tableCardBilling,
                  isOccupied && styles.tableCardOccupied,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (isAvailable) {
                      handleOpenOrderModal(table);
                    } else if (isBilling || isOccupied) {
                      handleGenerateBillFromTable(table);
                    } else {
                      setViewingTable(table);
                      setViewDetailsModal(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                {/* Table Header: Name, Section and Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.tableCardTitle}>{formatTableName(table.tableNumber)}</Text>
                    <Text style={styles.tableCardSection} numberOfLines={1}>{table.section || 'Main Dining'}</Text>
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

                {/* Table Capacity & Section Meta Row */}
                <View style={styles.cardMetaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMetaLabel}>{t('capacityCaps', 'CAPACITY (SEATS)')}</Text>
                    <Text style={styles.cardMetaValue}>{toDevanagari(table.capacity || 4)} {t('seats', 'Seats')}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cardMetaLabel}>{t('sectionCaps', 'SECTION')}</Text>
                    <Text style={styles.cardMetaValue} numberOfLines={1}>{table.section || 'Main Dining'}</Text>
                  </View>
                </View>
                </TouchableOpacity>

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

                  {table.status === 'CLEANING' && (
                    <TouchableOpacity
                      style={[styles.startOrderBtn, { backgroundColor: '#94461B' }]}
                      onPress={async () => {
                        await restaurantStore.markTableAvailableFromCleaning(table.id, table.tableNumber, activeBranchNumId);
                        await loadData();
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startOrderText}>{t('markAvailable', 'Mark Available')}</Text>
                    </TouchableOpacity>
                  )}

                  {isBilling && (
                    <TouchableOpacity
                      style={styles.proceedPaymentBtn}
                      onPress={() => handleGenerateBillFromTable(table)}
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
                        <ReceiptRupee size={12} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.generateBillDirectText}>{t('bill', 'Bill')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {filteredTables.length === 0 && (
          <View style={styles.emptyTableBox}>
            <UtensilsCrossed size={42} color="#D6D3D1" />
            <Text style={styles.emptyTableTitle}>
              {language === 'mr' ? 'कोणतेही टेबल उपलब्ध नाही' : language === 'hi' ? 'कोई टेबल उपलब्ध नहीं है' : 'No Tables Available'}
            </Text>
            <Text style={styles.emptyTableSub}>
              {language === 'mr' ? 'सध्या कोणतेही टेबल उपलब्ध नाही.' : language === 'hi' ? 'वर्तमान में कोई टेबल उपलब्ध नहीं है।' : 'No tables available currently.'}
            </Text>
            {totalCount === 0 && selectedFilter === 'All' && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setAddTableModalVisible(true)}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>
                  {language === 'mr' ? 'नवीन टेबल जोडा' : language === 'hi' ? 'नया टेबल जोड़ें' : 'Add Table'}
                </Text>
              </TouchableOpacity>
            )}
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
                <Text style={styles.modalTitle}>
                  {language === 'mr' ? 'नवीन टेबल जोडा' : language === 'hi' ? 'नया टेबल जोड़ें' : 'Add New Table'}
                </Text>
                <Text style={styles.modalSub}>
                  {language === 'mr' ? 'रेस्टॉरंटसाठी नवीन टेबल तयार करा' : language === 'hi' ? 'रेस्टोरेंट के लिए नया टेबल बनाएं' : 'Create a new table for the restaurant'}
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
              <Text style={styles.inputMiniLabel}>
                {language === 'mr'
                  ? 'टेबल क्रमांक किंवा नाव * (उदा. Table 05 किंवा T-01)'
                  : language === 'hi'
                  ? 'टेबल संख्या या नाम * (उदा. Table 05 या T-01)'
                  : 'Table Number or Name * (e.g. Table 05 or T-01)'}
              </Text>
              <TextInput
                style={styles.miniInput}
                placeholder={
                  language === 'mr'
                    ? 'उदा. Table 05 किंवा T-01'
                    : language === 'hi'
                    ? 'उदा. Table 05 या T-01'
                    : 'e.g. Table 05 or T-01'
                }
                value={newTableName}
                onChangeText={setNewTableName}
              />

              <View style={{ height: 12 }} />
              <Text style={styles.inputMiniLabel}>
                {language === 'mr'
                  ? 'बैठक क्षमता (उदा. 2, 4, 6, 8)'
                  : language === 'hi'
                  ? 'बैठक क्षमता (उदा. 2, 4, 6, 8)'
                  : 'Seats / Capacity (e.g. 2, 4, 6, 8)'}
              </Text>
              <TextInput
                style={styles.miniInput}
                placeholder="4"
                keyboardType="numeric"
                value={newTableCapacity}
                onChangeText={setNewTableCapacity}
              />

              <View style={{ height: 12 }} />
              <Text style={styles.inputMiniLabel}>
                {language === 'mr' ? 'सेक्शन / विभाग' : language === 'hi' ? 'सेक्शन / विभाग' : 'Section / Area'}
              </Text>
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
              <Text style={styles.inputMiniLabel}>
                {language === 'mr' ? 'टीप (पर्यायी)' : language === 'hi' ? 'टिप्पणी (वैकल्पिक)' : 'Note (Optional)'}
              </Text>
              <TextInput
                style={styles.miniInput}
                placeholder={
                  language === 'mr'
                    ? 'उदा. खिडकी जवळ'
                    : language === 'hi'
                    ? 'उदा. खिड़की के पास'
                    : 'e.g. Near window'
                }
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
                  {isAddingTable
                    ? (language === 'mr' ? 'जतन करत आहे...' : language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...')
                    : (language === 'mr' ? 'टेबल तयार करा' : language === 'hi' ? 'टेबल बनाएं' : 'Save Table')}
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

            {/* Menu Search Bar & Add Menu Item Button */}
            <View style={styles.menuSearchAndAddRow}>
              <View style={styles.menuSearchBoxInner}>
                <Search size={15} color="#78716C" />
                <TextInput
                  style={styles.menuSearchInput}
                  placeholder={t('searchFoodItem', 'Search food item (e.g. Paneer, Roti)...')}
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
                style={styles.addMenuItemBtn}
                onPress={() => setShowAddMenuItemModal(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addMenuItemBtnText}>{t('addMenuItem', '+ Add Item')}</Text>
              </TouchableOpacity>
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
          ADD MENU ITEM MODAL (Direct Table Menu Punching)
      =================================================== */}
      <Modal visible={showAddMenuItemModal} animationType="fade" transparent={true}>
        <View style={styles.viewModalOverlay}>
          <View style={styles.addMenuModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>{t('menuUpper', 'MENU')}</Text>
                <Text style={styles.modalTitle}>{t('addMenuItem', 'Add Menu Item')}</Text>
                <Text style={styles.modalSub}>{t('addMenuItemDesc', 'Add a new item and its price manually.')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAddMenuItemModal(false)}
              >
                <X size={20} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              {/* Item Name */}
              <Text style={styles.inputLabel}>{t('itemName', 'Item Name')} *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('enterItemName', 'Enter item name')}
                placeholderTextColor="#94A3B8"
                value={newDishName}
                onChangeText={setNewDishName}
              />

              {/* Category */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>{t('category', 'Category')} *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['Main Course', 'Starters', 'Breads', 'Rice', 'Dessert', 'Beverages', 'Chinese', 'Snacks', 'Soups'].map((cat) => (
                  <TouchableOpacity
                    key={`new-dish-cat-${cat}`}
                    style={[
                      styles.categoryOptionPill,
                      newDishCategory === cat && styles.categoryOptionPillActive,
                    ]}
                    onPress={() => setNewDishCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        newDishCategory === cat && styles.categoryOptionTextActive,
                      ]}
                    >
                      {t(cat.toLowerCase(), cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Price */}
              <Text style={styles.inputLabel}>{t('price', 'Price')} (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('enterPrice', 'Enter price')}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={newDishPrice}
                onChangeText={setNewDishPrice}
              />

              {/* Action Buttons: Cancel and Save */}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAddMenuItemModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>{t('cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    (!newDishName.trim() || !newDishPrice || Number(newDishPrice) <= 0) && { opacity: 0.6 }
                  ]}
                  onPress={handleAddNewMenuItem}
                  disabled={!newDishName.trim() || !newDishPrice || Number(newDishPrice) <= 0}
                >
                  <Text style={styles.modalSaveBtnText}>{t('saveMenuItem', 'Save Menu Item')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          VIEW DETAILS MODAL (Matching User Uploaded Image 1:1)
      =================================================== */}
      <Modal visible={viewDetailsModal} animationType="fade" transparent={true}>
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContainer}>
            {/* Header: TABLE DETAILS, Table Name, Status Pill & Close */}
            <View style={styles.viewModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.viewModalDetailsSub}>TABLE DETAILS</Text>
                <Text style={styles.viewModalTableTitle}>
                  {formatTableName(viewingTable?.tableNumber)}
                </Text>
                <Text style={styles.viewModalStatusDesc}>
                  {viewingTable?.status === 'AVAILABLE'
                    ? 'Ready for new guests'
                    : viewingTable?.status === 'OCCUPIED'
                    ? 'Guests dining and ordering'
                    : viewingTable?.status === 'BILLING'
                    ? 'Bill generated • Awaiting payment'
                    : 'Reserved for upcoming guests'}
                </Text>
              </View>

              <View style={styles.viewModalTopRight}>
                <View
                  style={[
                    styles.viewModalStatusBadge,
                    viewingTable?.status === 'AVAILABLE'
                      ? { backgroundColor: '#DCFCE7' }
                      : viewingTable?.status === 'OCCUPIED'
                      ? { backgroundColor: '#FEE2E2' }
                      : viewingTable?.status === 'BILLING'
                      ? { backgroundColor: '#FEF3C7' }
                      : viewingTable?.status === 'CLEANING'
                      ? { backgroundColor: '#CCFBF1' }
                      : { backgroundColor: '#F3E8FF' },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewModalStatusBadgeText,
                      viewingTable?.status === 'AVAILABLE'
                        ? { color: '#15803D' }
                        : viewingTable?.status === 'OCCUPIED'
                        ? { color: '#DC2626' }
                        : viewingTable?.status === 'BILLING'
                        ? { color: '#B45309' }
                        : viewingTable?.status === 'CLEANING'
                        ? { color: '#0F766E' }
                        : { color: '#7E22CE' },
                    ]}
                  >
                    {viewingTable?.status ? translateStatus(viewingTable.status) : translateStatus('AVAILABLE')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewModalCloseBtn}
                  onPress={() => setViewDetailsModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#78716C" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 2-Column Grid of 8 Rounded Outline Cards */}
            <View style={styles.viewModalGrid}>
              {/* Card 1: TABLES */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>TABLES</Text>
                <Text style={styles.viewGridCardValue}>
                  {formatTableName(viewingTable?.tableNumber)}
                </Text>
              </View>

              {/* Card 2: CAPACITY (SEATS) */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>CAPACITY (SEATS)</Text>
                <Text style={styles.viewGridCardValue}>
                  {viewingTable?.capacity || 4} Seats
                </Text>
              </View>

              {/* Card 3: SECTION */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>SECTION</Text>
                <Text style={styles.viewGridCardValue}>
                  {viewingTable?.section || 'Main Dining'}
                </Text>
              </View>

              {/* Card 4: GUEST COUNT */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>GUEST COUNT</Text>
                <Text style={styles.viewGridCardValue}>
                  {viewingTable?.guestCount ? `${viewingTable.guestCount} Guests` : '—'}
                </Text>
              </View>

              {/* Card 5: CUSTOMER / GUEST */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>CUSTOMER / GUEST</Text>
                <Text style={styles.viewGridCardValue} numberOfLines={1}>
                  {viewingTable?.guestName || 'No guest'}
                </Text>
              </View>

              {/* Card 6: SEATED AT */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>SEATED AT</Text>
                <Text style={styles.viewGridCardValue}>
                  {viewingTable?.status === 'OCCUPIED' || viewingTable?.status === 'BILLING'
                    ? 'Active'
                    : '—'}
                </Text>
              </View>

              {/* Card 7: CURRENT BILL */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>CURRENT BILL</Text>
                <Text
                  style={[
                    styles.viewGridCardValue,
                    viewingTable?.activeBillAmount ? { color: '#B45309' } : null,
                  ]}
                >
                  {viewingTable?.activeBillAmount
                    ? `₹ ${(viewingTable.activeBillAmount).toLocaleString('en-IN')}`
                    : '—'}
                </Text>
              </View>

              {/* Card 8: ORDER NO */}
              <View style={styles.viewGridCard}>
                <Text style={styles.viewGridCardLabel}>ORDER NO</Text>
                <Text style={styles.viewGridCardValue} numberOfLines={1}>
                  {viewingTable?.currentOrderId
                    ? `#${viewingTable.currentOrderId}`
                    : 'No active order'}
                </Text>
              </View>
            </View>

            {/* Separator Line */}
            <View style={styles.viewModalDivider} />

            {/* Bottom Action Buttons */}
            <View style={styles.viewModalActionsColumn}>
              {/* If Table is Cleaning: Option to Mark Available */}
              {viewingTable?.status === 'CLEANING' && (
                <TouchableOpacity
                  style={[styles.viewStartOrderBtn, { backgroundColor: '#0D9488', marginBottom: 10 }]}
                  onPress={async () => {
                    if (!viewingTable) return;
                    setViewDetailsModal(false);
                    await restaurantStore.updateTableStatus(viewingTable.id, 'AVAILABLE', activeBranchNumId);
                    await loadData();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.viewStartOrderText, { color: '#FFFFFF', fontWeight: '800' }]}>
                    {language === 'mr' ? 'सफाई पूर्ण (Available करा)' : 'Mark Cleaning Done (Set Available)'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Row 1: Start Order & Reserve Table */}
              <View style={styles.viewModalActionsRow}>
                <TouchableOpacity
                  style={styles.viewStartOrderBtn}
                  onPress={() => {
                    setViewDetailsModal(false);
                    if (viewingTable) {
                      if (viewingTable.status === 'OCCUPIED' || viewingTable.status === 'BILLING') {
                        handleGenerateBillFromTable(viewingTable);
                      } else {
                        handleOpenOrderModal(viewingTable);
                      }
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewStartOrderText}>
                    {viewingTable?.status === 'OCCUPIED' || viewingTable?.status === 'BILLING'
                      ? 'View Bill / Orders'
                      : 'Start Order'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewOutlineActionBtn}
                  onPress={async () => {
                    if (!viewingTable) return;
                    const newStatus = viewingTable.status === 'RESERVED' ? 'AVAILABLE' : 'RESERVED';
                    await restaurantStore.updateTableStatus(viewingTable.id, newStatus, activeBranchNumId);
                    setViewingTable({ ...viewingTable, status: newStatus });
                    await loadData();
                    Alert.alert(
                      t('tableUpdated', 'Table Updated'),
                      `${formatTableName(viewingTable.tableNumber)} is now ${newStatus}`
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewOutlineActionText}>
                    {viewingTable?.status === 'RESERVED' ? 'Free Table' : 'Reserve Table'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Edit Table & Delete Table */}
              <View style={styles.viewModalActionsRow}>
                <TouchableOpacity
                  style={styles.viewOutlineActionBtn}
                  onPress={() => {
                    setViewDetailsModal(false);
                    if (viewingTable) {
                      setNewTableName(viewingTable.tableNumber);
                      setNewTableCapacity(String(viewingTable.capacity || 4));
                      setNewTableArea(viewingTable.section || 'Main Dining');
                      setAddTableModalVisible(true);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewOutlineActionText}>Edit Table</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewOutlineActionBtn, { borderColor: '#FECACA' }]}
                  onPress={() => {
                    if (!viewingTable) return;
                    Alert.alert(
                      language === 'mr' ? 'टेबल हटवा?' : 'Delete Table?',
                      `${formatTableName(viewingTable.tableNumber)} ${language === 'mr' ? 'कायमचे हटवायचे आहे का?' : 'will be removed from tables list.'}`,
                      [
                        { text: language === 'mr' ? 'रद्द' : 'Cancel', style: 'cancel' },
                        {
                          text: language === 'mr' ? 'हटवा' : 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            setViewDetailsModal(false);
                            await restaurantStore.updateTableStatus(viewingTable.id, 'CLEANING', activeBranchNumId);
                            await loadData();
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.viewOutlineActionText, { color: '#DC2626' }]}>
                    Delete Table
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: KOT DISPATCHED QUICK ICON ACTIONS
      =================================================== */}
      <Modal
        visible={!!kotSuccessInfo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setKotSuccessInfo(null)}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.kotSuccessModalCard}>
            <TouchableOpacity
              style={styles.kotSuccessCloseBtn}
              onPress={() => setKotSuccessInfo(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.75}
            >
              <X size={18} color={isDark ? '#94A3B8' : '#78716C'} />
            </TouchableOpacity>

            <View style={styles.kotSuccessIconRing}>
              <View style={styles.kotSuccessIconCircle}>
                <CheckCircle2 size={32} color="#15803D" />
              </View>
            </View>

            <Text style={styles.kotSuccessTitle}>
              {language === 'mr'
                ? 'KOT पाठवली!'
                : language === 'hi'
                ? 'KOT भेजी गई!'
                : 'KOT Dispatched!'}
            </Text>

            {kotSuccessInfo && (
              <>
                <View style={styles.kotSuccessInfoPill}>
                  <Text style={styles.kotSuccessInfoText} numberOfLines={1}>
                    {formatTableName(kotSuccessInfo.tableNumber, language)} • {kotSuccessInfo.kotNumber} • {toDevanagari(kotSuccessInfo.orderNumber)}
                  </Text>
                </View>

                <Text style={styles.kotSuccessSub}>
                  {language === 'mr'
                    ? 'किचनमध्ये ऑर्डर पाठवली आहे. पुढे कुठे जायचे ते निवडा:'
                    : language === 'hi'
                    ? 'ऑर्डर किचन में भेजा गया है। आगे चुनें:'
                    : 'Sent to kitchen & added to billing. Choose next view:'}
                </Text>

                {/* 3 Icon Action Tiles: KOT Kitchen, Billing, Tables */}
                <View style={styles.kotQuickIconsRow}>
                  <TouchableOpacity
                    style={[styles.kotQuickIconBtn, styles.kotQuickBtnKitchen]}
                    onPress={() => {
                      setKotSuccessInfo(null);
                      navigation.navigate('KOT');
                    }}
                    activeOpacity={0.82}
                  >
                    <View
                      style={[
                        styles.kotQuickIconCircle,
                        { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.25)' : '#FFEDD5' },
                      ]}
                    >
                      <ChefHat size={22} color={isDark ? '#FDBA74' : '#EA580C'} />
                    </View>
                    <Text
                      style={[styles.kotQuickIconLabel, { color: isDark ? '#FDBA74' : '#9A3412' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {language === 'mr' ? 'KOT किचन' : language === 'hi' ? 'KOT किचन' : 'KOT Kitchen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kotQuickIconBtn, styles.kotQuickBtnBilling]}
                    onPress={() => {
                      setKotSuccessInfo(null);
                      navigation.navigate('Billing', {
                        resetStepTs: Date.now(),
                        orderId: undefined,
                        tableNumber: undefined,
                        step: 1,
                      });
                    }}
                    activeOpacity={0.82}
                  >
                    <View
                      style={[
                        styles.kotQuickIconCircle,
                        { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.25)' : '#DBEAFE' },
                      ]}
                    >
                      <ReceiptRupee
                        size={22}
                        color={isDark ? '#93C5FD' : '#2563EB'}
                        strokeWidth={2.2}
                      />
                    </View>
                    <Text
                      style={[styles.kotQuickIconLabel, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t('billing', 'Billing')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kotQuickIconBtn, styles.kotQuickBtnTables]}
                    onPress={() => setKotSuccessInfo(null)}
                    activeOpacity={0.82}
                  >
                    <View
                      style={[
                        styles.kotQuickIconCircle,
                        { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.25)' : '#DCFCE7' },
                      ]}
                    >
                      <UtensilsCrossed size={21} color={isDark ? '#86EFAC' : '#15803D'} />
                    </View>
                    <Text
                      style={[styles.kotQuickIconLabel, { color: isDark ? '#86EFAC' : '#15803D' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t('tables', 'Tables')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: isDark ? '#161F36' : '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cardBorder,
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
    color: textPrimary,
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

  /* Action Metric Cards (4 on Row 1, 3 on Row 2) */
  kpiRow4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  kpiCard4: {
    flex: 1,
    backgroundColor: cardBg,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: cardBorder,
  },
  kpiLabel4: {
    fontSize: 9.5,
    fontWeight: '700',
    color: isDark ? '#E2E8F0' : '#44403C',
    flexShrink: 1,
  },
  kpiNumber4: {
    fontSize: 15,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 2,
  },
  kpiRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 6,
  },
  kpiCard3: {
    flex: 1,
    backgroundColor: cardBg,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: cardBorder,
  },
  kpiLabel3: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#E2E8F0' : '#44403C',
    flexShrink: 1,
  },
  kpiNumber3: {
    fontSize: 16,
    fontWeight: '800',
    color: textPrimary,
    marginTop: 2,
  },
  kpiCardActiveBorder: {
    borderColor: '#9A3412',
    backgroundColor: isDark ? '#1C1917' : '#FFFBF5',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },

  /* Filter Section */
  filterSection: {
    marginBottom: 16,
  },
  filterTabsScroll: {
    marginBottom: 10,
  },
  filterPill: {
    backgroundColor: cardBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  filterPillActive: {
    backgroundColor: '#9A3412',
    borderColor: '#9A3412',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: textSecondary,
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
    backgroundColor: cardBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: textPrimary,
    marginLeft: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
    color: textSecondary,
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
    color: textPrimary,
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
    backgroundColor: cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
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
    color: textSecondary,
  },

  /* Tables Grid */
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: cardBg,
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
    backgroundColor: isDark ? '#1E293B' : '#FFFEFA',
  },
  tableCardOccupied: {
    backgroundColor: cardBg,
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
    color: textPrimary,
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
    backgroundColor: inputBg,
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
    color: textPrimary,
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
    borderColor: cardBorder,
    backgroundColor: cardBg,
  },
  viewActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSecondary,
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
    backgroundColor: cardBg,
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
    backgroundColor: inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: textPrimary,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  qtySpinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: inputBg,
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  spinBtn: {
    padding: 6,
  },
  spinNum: {
    fontSize: 13,
    fontWeight: '800',
    color: textPrimary,
  },
  menuSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: inputBg,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  menuSearchAndAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  menuSearchBoxInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  addMenuItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9A3412',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addMenuItemBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addMenuModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  modalKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#EA580C',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: textPrimary,
  },
  categoryOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: inputBg,
    borderWidth: 1,
    borderColor: cardBorder,
    marginRight: 8,
  },
  categoryOptionPillActive: {
    backgroundColor: '#9A3412',
    borderColor: '#9A3412',
  },
  categoryOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: inputBg,
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#9A3412',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: textPrimary,
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
    backgroundColor: inputBg,
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
    borderBottomColor: dividerColor,
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
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
    color: textPrimary,
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
    borderBottomColor: dividerColor,
  },
  detailLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  detailVal: {
    fontSize: 12,
    color: textPrimary,
  },
  closeModalSimpleBtn: {
    backgroundColor: inputBg,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalSimpleText: {
    fontSize: 12,
    fontWeight: '700',
    color: textSecondary,
  },
  emptyTableBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cardBorder,
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
    backgroundColor: inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cardBorder,
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
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewModalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: cardBg,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  viewModalDetailsSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C5036',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  viewModalTableTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: textPrimary,
    marginBottom: 2,
  },
  viewModalStatusDesc: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '500',
  },
  viewModalTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewModalStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  viewGridCard: {
    width: '48.2%',
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor: '#F1ECE8',
    borderRadius: 12,
    padding: 12,
  },
  viewGridCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  viewGridCardValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: textPrimary,
  },
  viewModalDivider: {
    height: 1,
    backgroundColor: '#F1ECE8',
    marginVertical: 14,
  },
  viewModalActionsColumn: {
    gap: 10,
  },
  viewModalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewStartOrderBtn: {
    flex: 1,
    backgroundColor: '#6C3B2A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewStartOrderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewOutlineActionBtn: {
    flex: 1,
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor: cardBorder,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOutlineActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: textPrimary,
  },
  kotSuccessModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cardBorder,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  kotSuccessCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotSuccessIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kotSuccessIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(22, 163, 74, 0.25)' : '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotSuccessTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: textPrimary,
    textAlign: 'center',
  },
  kotSuccessInfoPill: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    maxWidth: '100%',
  },
  kotSuccessInfoText: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#9A3412',
    textAlign: 'center',
  },
  kotSuccessSub: {
    fontSize: 12,
    color: textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    lineHeight: 17,
  },
  kotQuickIconsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  kotQuickIconBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  kotQuickBtnKitchen: {
    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.14)' : '#FFF7ED',
    borderColor: isDark ? 'rgba(253, 186, 116, 0.35)' : '#FED7AA',
  },
  kotQuickBtnBilling: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.14)' : '#EFF6FF',
    borderColor: isDark ? 'rgba(147, 197, 253, 0.35)' : '#BFDBFE',
  },
  kotQuickBtnTables: {
    backgroundColor: isDark ? 'rgba(22, 163, 74, 0.14)' : '#F0FDF4',
    borderColor: isDark ? 'rgba(134, 239, 172, 0.35)' : '#BBF7D0',
  },
  kotQuickIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kotQuickIconLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  });
};