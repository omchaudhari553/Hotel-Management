import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Header } from '../../components/Header';
import { AppNavbar } from '../../components/AppNavbar';
import { useBranch } from '../../context/BranchContext';
import { useLanguage } from '../../context/LanguageContext';
import apiClient from '../../api/client';
import { BranchConfig } from '../../branches';
import {
  Building2,
  CheckCircle2,
  Store,
  IndianRupee,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Settings as SettingsIcon,
  X,
  Phone,
  MapPin,
  User,
  Check,
  TrendingUp,
  Receipt,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react-native';

export const BranchesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { branches, activeBranchId, switchBranch, activeBranch, refreshBranches } = useBranch();
  const { language, t, toDevanagari } = useLanguage();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [branchTypeFilter, setBranchTypeFilter] = useState<'ALL' | 'MAIN' | 'SUB'>('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchConfig | null>(null);

  // Local state for dynamically added/edited branches
  const [localBranches, setLocalBranches] = useState<BranchConfig[]>(branches);

  // Update local branches when context branches change
  React.useEffect(() => {
    setLocalBranches(branches);
  }, [branches]);

  // Form State for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formIsSubBranch, setFormIsSubBranch] = useState<boolean>(false);
  const [formParentId, setFormParentId] = useState<string>('1');
  const [formManager, setFormManager] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formGstin, setFormGstin] = useState<string>('27AABCR1234F1Z5');

  // Stats calculation
  const totalBranches = localBranches.length;
  const activeCount = localBranches.filter((b) => b.isActive !== false).length;
  const subBranchCount = localBranches.filter((b) => Boolean(b.parentBranchId)).length;
  const totalTodayRevenue = localBranches.reduce((acc, b) => {
    const raw = Number(b.stats?.todaySalesNum || 0);
    return acc + raw;
  }, 0);

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    return localBranches.filter((b) => {
      // Type filter
      if (branchTypeFilter === 'MAIN' && b.parentBranchId) return false;
      if (branchTypeFilter === 'SUB' && !b.parentBranchId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCode = b.code.toLowerCase().includes(q);
        const matchManager = (b.manager || '').toLowerCase().includes(q);
        const matchCity = (b.address || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchManager && !matchCity) return false;
      }
      return true;
    });
  }, [localBranches, branchTypeFilter, searchQuery]);

  // Localization helpers for branch data
  const getBranchName = (b?: BranchConfig | null) => {
    if (!b) return '';
    if (language === 'mr') return b.nameMr || b.name;
    if (language === 'hi') return b.nameHi || b.name;
    return b.name;
  };

  const getBranchType = (b?: BranchConfig | null) => {
    if (!b) return '';
    if (language === 'mr') return b.typeMr || b.type;
    if (language === 'hi') return b.typeHi || b.type;
    return b.type;
  };

  const getBranchAddress = (b?: BranchConfig | null) => {
    if (!b) return '';
    if (language === 'mr') return b.addressMr || b.address;
    if (language === 'hi') return b.addressHi || b.address;
    return b.address;
  };

  const getManagerName = (mgr?: string) => {
    if (!mgr) return language === 'mr' ? 'राहुल पाटील' : language === 'hi' ? 'राहुल पाटिल' : 'Rahul Patil';
    const m = mgr.trim();
    if (m === 'Rahul Patil') return language === 'mr' ? 'राहुल पाटील' : language === 'hi' ? 'राहुल पाटिल' : 'Rahul Patil';
    if (m === 'Kavita') return language === 'mr' ? 'कविता' : language === 'hi' ? 'कविता' : 'Kavita';
    if (m === 'Omkar') return language === 'mr' ? 'ओंकार' : language === 'hi' ? 'ओंकार' : 'Omkar';
    if (m === 'Kalyani') return language === 'mr' ? 'कल्याणी' : language === 'hi' ? 'कल्याणी' : 'Kalyani';
    if (m === 'Siddhi') return language === 'mr' ? 'सिद्धी' : language === 'hi' ? 'सिद्धि' : 'Siddhi';
    if (m === 'Sneha Kulkarni') return language === 'mr' ? 'स्नेहा कुलकर्णी' : language === 'hi' ? 'स्नेहा कुलकर्णी' : 'Sneha Kulkarni';
    if (m === 'Manager') return language === 'mr' ? 'व्यवस्थापक' : language === 'hi' ? 'प्रबंधक' : 'Manager';
    return m;
  };

  const getParentBranchName = (b: BranchConfig) => {
    if (!b.parentBranchId) return `— (${t('root', 'Root')})`;
    const parent = localBranches.find((p) => p.id === b.parentBranchId);
    if (parent) return getBranchName(parent);
    return b.parentBranchName || `— (${t('root', 'Root')})`;
  };

  // Switch Branch Action
  const handleSelectBranch = async (branch: BranchConfig) => {
    await switchBranch(branch.id);
    Alert.alert(
      t('switchBranch', 'Branch Switched'),
      `${t('connectedBranch', 'Active system branch is now:')} ${getBranchName(branch)} (${toDevanagari(branch.code)})`
    );
  };

  // Open Add Branch Modal
  const openAddBranchModal = () => {
    const nextNum = localBranches.length + 1;
    setFormName('');
    setFormCode(`BR-00${nextNum}`);
    setFormIsSubBranch(false);
    setFormParentId('1');
    setFormManager('');
    setFormPhone('');
    setFormAddress('');
    setFormGstin('27AABCR1234F1Z5');
    setShowAddModal(true);
  };

  // Submit Add Branch
  const handleSaveNewBranch = async () => {
    if (!formName.trim()) {
      Alert.alert(t('validationError', 'Validation Error'), t('enterBranchName', 'Please enter branch name.'));
      return;
    }
    if (!formCode.trim()) {
      Alert.alert(t('validationError', 'Validation Error'), t('enterBranchCode', 'Please enter branch code.'));
      return;
    }

    const parentBranch = formIsSubBranch
      ? localBranches.find((b) => b.id === formParentId)
      : null;

    const newBranch: BranchConfig = {
      id: String(Date.now()),
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      nameMr: formName.trim(),
      nameHi: formName.trim(),
      type: formIsSubBranch ? 'Sub-Branch Outlet' : 'Main Property & Dining',
      typeMr: formIsSubBranch ? 'उप-शाखा' : 'मुख्य शाखा',
      typeHi: formIsSubBranch ? 'उप-शाखा' : 'मुख्य शाखा',
      address: formAddress.trim() || 'Maharashtra, India',
      addressMr: formAddress.trim() || 'महाराष्ट्र, भारत',
      addressHi: formAddress.trim() || 'महाराष्ट्र, भारत',
      phone: formPhone.trim() || '9876543210',
      gstin: formGstin.trim() || '27AABCR1234F1Z5',
      manager: formManager.trim() || 'Manager',
      managerPhone: formPhone.trim() || '9876543210',
      isActive: false,
      color: formIsSubBranch ? '#059669' : '#C2410C',
      parentBranchId: formIsSubBranch ? formParentId : null,
      parentBranchName: parentBranch ? parentBranch.name : null,
      stats: {
        todaySales: '₹ 0.00',
        todaySalesNum: 0,
        todayOrders: 0,
        occupiedTables: 0,
        totalTables: 4,
        availableTables: 4,
        staffOnDuty: 0,
        totalStaff: 0,
        netGst: '₹ 0.00',
        pendingSettlement: '₹ 0.00',
        averageBillValue: '₹ 0.00',
        cashCollection: '₹ 0.00',
        upiCollection: '₹ 0.00',
        cardCollection: '₹ 0.00',
      },
      billRequests: [],
      tables: [],
    };

    setLocalBranches((prev) => [...prev, newBranch]);
    setShowAddModal(false);

    // Persist to Spring Boot backend & SQL Server 2022
    try {
      const resp = await apiClient.post('/hotel/branches', {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        parentBranchId: formIsSubBranch ? Number(formParentId) : null,
        managerName: formManager.trim() || 'Manager',
        contactPhone: formPhone.trim() || '9876543210',
        address: formAddress.trim() || 'Maharashtra, India',
        operatingHours: '9 AM - 10 PM',
        status: 'ACTIVE',
      });
      if (resp.data?.data?.id) {
        newBranch.id = String(resp.data.data.id);
      }
      if (refreshBranches) {
        await refreshBranches();
      }
    } catch (e) {
      console.warn('Backend branch creation error:', e);
    }

    Alert.alert(t('branchAdded', 'Branch Added'), `${t('branchCreatedSuccess', 'Branch created successfully:')} "${newBranch.name}"`);
  };

  // Open Edit Modal
  const openEditModal = (branch: BranchConfig) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormCode(branch.code);
    setFormIsSubBranch(Boolean(branch.parentBranchId));
    setFormParentId(String(branch.parentBranchId || '1'));
    setFormManager(branch.manager || '');
    setFormPhone(branch.phone || '');
    setFormAddress(branch.address || '');
    setFormGstin(branch.gstin || '');
    setShowEditModal(true);
  };

  // Save Edit Branch
  const handleSaveEditedBranch = async () => {
    if (!selectedBranch) return;
    const parentBranch = formIsSubBranch
      ? localBranches.find((b) => b.id === formParentId)
      : null;

    setLocalBranches((prev) =>
      prev.map((b) =>
        b.id === selectedBranch.id
          ? {
            ...b,
            name: formName.trim() || b.name,
            code: formCode.trim().toUpperCase() || b.code,
            manager: formManager.trim() || b.manager,
            phone: formPhone.trim() || b.phone,
            address: formAddress.trim() || b.address,
            gstin: formGstin.trim() || b.gstin,
            parentBranchId: formIsSubBranch ? formParentId : null,
            parentBranchName: parentBranch ? parentBranch.name : null,
          }
          : b
      )
    );
    setShowEditModal(false);

    // Persist to Spring Boot backend & SQL Server 2022
    try {
      const numId = Number(selectedBranch.id);
      if (!isNaN(numId)) {
        await apiClient.put(`/hotel/branches/${numId}`, {
          name: formName.trim() || selectedBranch.name,
          code: formCode.trim().toUpperCase() || selectedBranch.code,
          parentBranchId: formIsSubBranch ? Number(formParentId) : null,
          managerName: formManager.trim() || selectedBranch.manager,
          contactPhone: formPhone.trim() || selectedBranch.phone,
          address: formAddress.trim() || selectedBranch.address,
        });
        if (refreshBranches) {
          await refreshBranches();
        }
      }
    } catch (e) {
      console.warn('Backend branch update error:', e);
    }

    Alert.alert(t('branchUpdated', 'Branch Updated'), t('branchDetailsUpdated', 'Branch details updated successfully.'));
  };

  // Delete Branch Action
  const handleDeleteBranch = (branch: BranchConfig) => {
    if (branch.id === activeBranchId) {
      Alert.alert(t('cannotDeleteActive', 'Cannot Delete Active Branch'), t('switchBeforeDelete', 'Please switch to another branch before deleting this active branch.'));
      return;
    }
    Alert.alert(
      t('deleteBranch', 'Delete Branch'),
      `${t('confirmDeleteBranch', 'Are you sure you want to delete')} "${getBranchName(branch)}" (${toDevanagari(branch.code)})?`,
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setLocalBranches((prev) => prev.filter((b) => b.id !== branch.id));
            try {
              const numId = Number(branch.id);
              if (!isNaN(numId)) {
                await apiClient.delete(`/hotel/branches/${numId}`);
                if (refreshBranches) {
                  await refreshBranches();
                }
              }
            } catch (e) {
              console.warn('Backend branch deletion error:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header
          title={t('branchDirectory', 'Branch Directory')}
          subtitle={t('manageBranchesDesc', 'Manage hotel branches, locations, and facilities')}
        />

        {/* ===================================================
            TOP SEARCH BAR & + ADD BRANCH ACTION (Screenshot 2 Match)
        =================================================== */}
        <View style={styles.topControlCard}>
          <View style={styles.searchWrap}>
            <Search size={16} color="#78716C" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchBranches', 'Search branches...')}
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

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['ALL', 'MAIN', 'SUB'] as const).map((ft) => (
              <TouchableOpacity
                key={ft}
                style={[styles.filterPill, branchTypeFilter === ft && styles.filterPillActive]}
                onPress={() => setBranchTypeFilter(ft)}
              >
                <Text style={[styles.filterPillText, branchTypeFilter === ft && styles.filterPillTextActive]}>
                  {ft === 'ALL'
                    ? t('allBranches', 'All Branches')
                    : ft === 'MAIN'
                      ? t('mainBranches', 'Main Branches')
                      : t('subBranches', 'Sub-Branches')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Branch Button */}
          <TouchableOpacity
            style={styles.addBranchBtn}
            onPress={openAddBranchModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBranchBtnText}>{t('addBranch', '+ Add Branch')}</Text>
          </TouchableOpacity>
        </View>

        {/* ===================================================
            CURRENT ACTIVE SYSTEM BRANCH BANNER (Screenshot 2 Match)
        =================================================== */}
        <View style={styles.activeBranchHeroBanner}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconBox}>
              <Building2 size={24} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPreLabel}>
                {t('currentActiveBranchBanner', 'CURRENT ACTIVE SYSTEM BRANCH')}
              </Text>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>{getBranchName(activeBranch) || t('mainBranch', 'Main Branch')}</Text>
                <Text style={styles.heroCode}>({toDevanagari(activeBranch?.code || 'MB-1')})</Text>
                <View style={styles.heroTypeTag}>
                  <Text style={styles.heroTypeTagText}>
                    [{activeBranch?.parentBranchId ? t('subBranch', 'Sub-Branch') : t('mainBranch', 'Main Branch')}]
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.heroSubNotice}>
            {t('activeBranchNotice', 'All modules (Dashboard, Tables, KOT, Billing, Payments, Reports) reflect this branch.')}
          </Text>
        </View>

        {/* ===================================================
            4 STATISTIC CARDS ROW (Screenshot 2 Match)
        =================================================== */}
        <View style={styles.statsCardsRow}>
          {/* Card 1: Total Branches */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardTitle}>{t('totalBranches', 'Total Branches')}</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#FFEDD5' }]}>
                <Building2 size={16} color="#EA580C" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{toDevanagari(totalBranches)}</Text>
          </View>

          {/* Card 2: Active Branches */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardTitle}>{t('activeBranches', 'Active Branches')}</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle2 size={16} color="#16A34A" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{toDevanagari(activeCount)}</Text>
          </View>

          {/* Card 3: Total Sub-Branches */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardTitle}>{t('totalSubBranches', 'Total Sub-Branches')}</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Store size={16} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{toDevanagari(subBranchCount)}</Text>
          </View>

          {/* Card 4: Today's Revenue */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardTitle}>{t('todayRevenue', "Today's Revenue")}</Text>
              <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
                <IndianRupee size={16} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: '#16A34A' }]}>
              ₹ {toDevanagari(totalTodayRevenue.toFixed(2))}
            </Text>
          </View>
        </View>

        {/* ===================================================
            BRANCH DIRECTORY LIST / CARDS (Responsive Native Mobile)
        =================================================== */}
        <View style={styles.directoryContainer}>
          <View style={styles.directoryHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Building2 size={16} color="#FFFFFF" />
              <Text style={styles.directoryHeaderTitle}>{t('branchDirectoryUpper', 'BRANCH DIRECTORY')}</Text>
            </View>
            <Text style={styles.directoryHeaderCount}>
              {toDevanagari(filteredBranches.length)} {t('branchesLower', 'branches')}
            </Text>
          </View>

          {filteredBranches.map((item) => {
            const isSelected = item.id === activeBranchId;
            const isSub = Boolean(item.parentBranchId);

            return (
              <View
                key={item.id}
                style={[styles.branchCard, isSelected && styles.branchCardActive]}
              >
                {/* Top Badge & Status Row */}
                <View style={styles.branchCardTopRow}>
                  <View style={styles.branchCardBadgeGroup}>
                    <View
                      style={[
                        styles.branchCategoryPill,
                        isSub ? styles.subPill : styles.mainPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.branchCategoryPillText,
                          isSub ? styles.subPillText : styles.mainPillText,
                        ]}
                      >
                        {isSub ? `↳ ${t('subBranchUpper', 'SUB-BRANCH')}` : t('mainBranchUpper', 'MAIN BRANCH')}
                      </Text>
                    </View>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{toDevanagari(item.code)}</Text>
                    </View>
                  </View>

                  <View style={styles.statusActivePill}>
                    <Text style={styles.statusActiveText}>{t('active', 'Active')}</Text>
                  </View>
                </View>

                {/* Branch Name & Address */}
                <View style={styles.branchCardMainInfo}>
                  <Text style={styles.branchCardName}>{getBranchName(item)}</Text>
                  <View style={styles.branchCardAddressRow}>
                    <MapPin size={12} color="#6B7280" style={{ marginTop: 2 }} />
                    <Text style={styles.branchCardAddress}>{getBranchAddress(item)}</Text>
                  </View>
                </View>

                {/* Meta Info: Parent & Manager */}
                <View style={styles.branchCardMetaGrid}>
                  <View style={styles.branchCardMetaItem}>
                    <Text style={styles.branchMetaLabel}>{t('parentBranch', 'PARENT BRANCH')}</Text>
                    <Text style={styles.branchMetaValue} numberOfLines={1}>
                      {getParentBranchName(item)}
                    </Text>
                  </View>

                  <View style={styles.branchCardMetaItem}>
                    <Text style={styles.branchMetaLabel}>{t('managerAndContact', 'MANAGER & CONTACT')}</Text>
                    <View style={styles.managerRow}>
                      <User size={11} color="#4B5563" />
                      <Text style={styles.managerNameText} numberOfLines={1}>
                        {getManagerName(item.manager)}
                      </Text>
                    </View>
                    <View style={[styles.managerRow, { marginTop: 2 }]}>
                      <Phone size={10} color="#64748B" />
                      <Text style={styles.managerContactText}>{toDevanagari(item.phone || '9876543210')}</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.branchCardDivider} />

                {/* Action Bottom Row: Select / Active + 4 Tool Icons */}
                <View style={styles.branchCardActionsRow}>
                  {isSelected ? (
                    <View style={styles.activeIndicatorBtn}>
                      <Check size={13} color="#15803D" />
                      <Text style={styles.activeIndicatorText}>{t('activeBranchUpper', 'ACTIVE BRANCH')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.selectBranchBtn}
                      onPress={() => handleSelectBranch(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectBranchBtnText}>{t('selectBranch', 'Select Branch')}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.toolIconsWrap}>
                    {/* View Details */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setSelectedBranch(item);
                        setShowViewModal(true);
                      }}
                      accessibilityLabel={t('view', 'View Details')}
                    >
                      <Eye size={15} color="#475569" />
                    </TouchableOpacity>

                    {/* Edit Branch */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEditModal(item)}
                      accessibilityLabel={t('edit', 'Edit Branch')}
                    >
                      <Edit size={15} color="#2563EB" />
                    </TouchableOpacity>

                    {/* Branch Report / Analytics */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setSelectedBranch(item);
                        setShowReportModal(true);
                      }}
                      accessibilityLabel={t('reports', 'Branch Reports')}
                    >
                      <BarChart3 size={15} color="#059669" />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDeleteBranch(item)}
                      accessibilityLabel={t('delete', 'Delete Branch')}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          {filteredBranches.length === 0 && (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Building2 size={36} color="#D6D3D1" />
              <Text style={{ marginTop: 8, color: '#78716C', fontSize: 13, fontWeight: '600' }}>
                {t('noBranchesFound', 'No branches found matching your search.')}
              </Text>
            </View>
          )}

          {/* Pagination Footer */}
          <View style={styles.paginationRow}>
            <Text style={styles.paginationText}>
              {t('showing', 'Showing')} {toDevanagari(1)} {t('to', 'to')} {toDevanagari(filteredBranches.length)} {t('of', 'of')} {toDevanagari(localBranches.length)} {t('branchesLower', 'branches')}
            </Text>
            <View style={styles.pagerPills}>
              <Text style={styles.pagerDisabled}>&lt; {t('previous', 'Previous')}</Text>
              <View style={styles.pagerActivePill}>
                <Text style={styles.pagerActivePillText}>{toDevanagari(1)}</Text>
              </View>
              <Text style={styles.pagerDisabled}>{t('next', 'Next')} &gt;</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===================================================
          MODAL: ADD NEW BRANCH (Full Working Form)
      =================================================== */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#EA580C" />
                <Text style={styles.modalTitle}>{t('addNewBranch', 'Add New Hotel Branch')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>{t('branchName', 'Branch Name')} *</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('branchNamePlaceholder', 'e.g. Pune City Center Branch')}
                value={formName}
                onChangeText={setFormName}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('branchCode', 'Branch Code')} *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={t('branchCodePlaceholder', 'e.g. PUN003')}
                    value={formCode}
                    onChangeText={setFormCode}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('gstin', 'GSTIN')} (15 Chars)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="27AABCR1234F1Z5"
                    value={formGstin}
                    onChangeText={setFormGstin}
                  />
                </View>
              </View>

              {/* Sub-Branch Toggle */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.formLabel}>{t('branchHierarchyType', 'Branch Hierarchy Type')}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.typeChoiceBtn, !formIsSubBranch && styles.typeChoiceActive]}
                    onPress={() => setFormIsSubBranch(false)}
                  >
                    <Text style={[styles.typeChoiceText, !formIsSubBranch && styles.typeChoiceTextActive]}>
                      {t('mainBranch', 'Main Branch')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChoiceBtn, formIsSubBranch && styles.typeChoiceActive]}
                    onPress={() => setFormIsSubBranch(true)}
                  >
                    <Text style={[styles.typeChoiceText, formIsSubBranch && styles.typeChoiceTextActive]}>
                      {t('subBranch', 'Sub-Branch')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formIsSubBranch && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.formLabel}>{t('selectParentBranch', 'Select Parent Branch')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {localBranches
                      .filter((b) => !b.parentBranchId)
                      .map((pb) => (
                        <TouchableOpacity
                          key={pb.id}
                          style={[styles.parentPill, formParentId === pb.id && styles.parentPillActive]}
                          onPress={() => setFormParentId(pb.id)}
                        >
                          <Text style={[styles.parentPillText, formParentId === pb.id && styles.parentPillTextActive]}>
                            {getBranchName(pb)} ({toDevanagari(pb.code)})
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('managerName', 'Manager Name')}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={t('managerNamePlaceholder', 'e.g. Ramesh Kulkarni')}
                    value={formManager}
                    onChangeText={setFormManager}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('contactPhone', 'Contact Phone')} *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={t('phonePlaceholder', '10-digit number')}
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { marginTop: 10 }]}>{t('branchAddress', 'Branch Address')}</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder={t('addressPlaceholder', 'Complete street address, city, pincode')}
                multiline
                value={formAddress}
                onChangeText={setFormAddress}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveNewBranch}
              >
                <Text style={styles.modalSaveText}>{t('createBranch', 'Create Branch')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: EDIT BRANCH
      =================================================== */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Edit size={20} color="#2563EB" />
                <Text style={styles.modalTitle}>{t('editBranchDetails', 'Edit Branch Details')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>{t('branchName', 'Branch Name')} *</Text>
              <TextInput style={styles.formInput} value={formName} onChangeText={setFormName} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('branchCode', 'Branch Code')}</Text>
                  <TextInput style={styles.formInput} value={formCode} onChangeText={setFormCode} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('gstin', 'GSTIN')}</Text>
                  <TextInput style={styles.formInput} value={formGstin} onChangeText={setFormGstin} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('manager', 'Manager')}</Text>
                  <TextInput style={styles.formInput} value={formManager} onChangeText={setFormManager} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>{t('contactPhone', 'Contact Phone')}</Text>
                  <TextInput style={styles.formInput} value={formPhone} onChangeText={setFormPhone} />
                </View>
              </View>

              <Text style={[styles.formLabel, { marginTop: 10 }]}>{t('address', 'Address')}</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                value={formAddress}
                onChangeText={setFormAddress}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>{t('cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#2563EB' }]}
                onPress={handleSaveEditedBranch}
              >
                <Text style={styles.modalSaveText}>{t('saveChanges', 'Save Changes')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: BRANCH REPORT / ANALYTICS
      =================================================== */}
      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={20} color="#059669" />
                <View>
                  <Text style={styles.modalTitle}>{getBranchName(selectedBranch)} {t('report', 'Report')}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {t('code', 'Code')}: {toDevanagari(selectedBranch?.code)} • {getBranchAddress(selectedBranch)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Report Stats Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <View style={styles.reportBox}>
                  <Text style={styles.reportBoxLabel}>{t('todayRevenue', "Today's Revenue")}</Text>
                  <Text style={[styles.reportBoxVal, { color: '#059669' }]}>
                    {toDevanagari(selectedBranch?.stats?.todaySales || '₹ 0.00')}
                  </Text>
                </View>

                <View style={styles.reportBox}>
                  <Text style={styles.reportBoxLabel}>{t('totalOrders', 'Total Orders')}</Text>
                  <Text style={styles.reportBoxVal}>{toDevanagari(selectedBranch?.stats?.todayOrders || 0)}</Text>
                </View>

                <View style={styles.reportBox}>
                  <Text style={styles.reportBoxLabel}>{t('activeTables', 'Active Tables')}</Text>
                  <Text style={styles.reportBoxVal}>
                    {toDevanagari(selectedBranch?.stats?.occupiedTables || 0)} / {toDevanagari(selectedBranch?.stats?.totalTables || 4)}
                  </Text>
                </View>

                <View style={styles.reportBox}>
                  <Text style={styles.reportBoxLabel}>{t('staffOnDuty', 'Staff On Duty')}</Text>
                  <Text style={styles.reportBoxVal}>{toDevanagari(selectedBranch?.stats?.staffOnDuty || 0)}</Text>
                </View>
              </View>

              {/* Collections breakdown */}
              <View style={styles.reportBreakdownCard}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginBottom: 8 }}>
                  {t('collectionsBreakdown', 'Collections Breakdown')}
                </Text>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowKey}>{t('upiCollections', 'UPI Collection')}</Text>
                  <Text style={styles.reportRowVal}>{toDevanagari(selectedBranch?.stats?.upiCollection || '₹ 0.00')}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowKey}>{t('cashCollections', 'Cash Collection')}</Text>
                  <Text style={styles.reportRowVal}>{toDevanagari(selectedBranch?.stats?.cashCollection || '₹ 0.00')}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportRowKey}>{t('netGstTaxCollected', 'Net GST Tax Collected')}</Text>
                  <Text style={styles.reportRowVal}>{toDevanagari(selectedBranch?.stats?.netGst || '₹ 0.00')}</Text>
                </View>
                <View style={[styles.reportRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.reportRowKey}>{t('avgOrderValue', 'Avg Order Value')}</Text>
                  <Text style={styles.reportRowVal}>{toDevanagari(selectedBranch?.stats?.averageBillValue || '₹ 0.00')}</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { marginTop: 14, backgroundColor: '#059669' }]}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.modalSaveText}>{t('closeReport', 'Close Report')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          MODAL: VIEW DETAILS
      =================================================== */}
      <Modal visible={showViewModal} transparent animationType="fade" onRequestClose={() => setShowViewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Eye size={20} color="#64748B" />
                <Text style={styles.modalTitle}>{getBranchName(selectedBranch)}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10, gap: 8 }}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('branchCode', 'Branch Code')}:</Text>
                <Text style={styles.detailVal}>{toDevanagari(selectedBranch?.code)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('branchType', 'Branch Type')}:</Text>
                <Text style={styles.detailVal}>{selectedBranch?.parentBranchId ? t('subBranch', 'Sub-Branch') : t('mainBranch', 'Main Branch')}</Text>
              </View>
              {selectedBranch?.parentBranchName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>{t('parentBranch', 'Parent Branch')}:</Text>
                  <Text style={styles.detailVal}>{selectedBranch ? getParentBranchName(selectedBranch) : ''}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('manager', 'Manager')}:</Text>
                <Text style={styles.detailVal}>{selectedBranch ? getManagerName(selectedBranch?.manager) : ''}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('phone', 'Phone')}:</Text>
                <Text style={styles.detailVal}>{toDevanagari(selectedBranch?.phone)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('address', 'Address')}:</Text>
                <Text style={styles.detailVal}>{selectedBranch ? getBranchAddress(selectedBranch) : ''}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{t('gstin', 'GSTIN')}:</Text>
                <Text style={styles.detailVal}>{selectedBranch?.gstin}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setShowViewModal(false)}>
              <Text style={styles.modalSaveText}>{t('close', 'Close')}</Text>
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
    backgroundColor: '#FAF8F6',
  },
  content: {
    padding: 16,
  },

  /* Top Control Card */
  topControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchWrap: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#1F2937',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#7C2D12',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  addBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBranchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Active Hero Banner */
  activeBranchHeroBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPreLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.6,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
  },
  heroCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  heroTypeTag: {
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroTypeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  heroSubNotice: {
    fontSize: 11,
    color: '#047857',
    maxWidth: 340,
    lineHeight: 16,
  },

  /* 4 Stat Cards */
  statsCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    padding: 12,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 6,
  },

  /* Directory Cards Container */
  directoryContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    overflow: 'hidden',
  },
  directoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#4A1D0B', // Rich dark brown header bar matching Vite
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  directoryHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  directoryHeaderCount: {
    color: '#FED7AA',
    fontSize: 11,
    fontWeight: '700',
  },

  branchCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  branchCardActive: {
    backgroundColor: '#FFFDF0',
    borderLeftWidth: 4,
    borderLeftColor: '#CA8A04',
  },
  branchCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchCardBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  branchCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  mainPill: { backgroundColor: '#F3F4F6' },
  subPill: { backgroundColor: '#FFEDD5' },
  branchCategoryPillText: { fontSize: 9, fontWeight: '900' },
  mainPillText: { color: '#4B5563' },
  subPillText: { color: '#EA580C' },
  codeBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: { fontSize: 10, fontWeight: '700', color: '#374151' },
  statusActivePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  statusActiveText: { fontSize: 10.5, fontWeight: '800', color: '#16A34A' },
  branchCardMainInfo: {
    marginBottom: 10,
  },
  branchCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  branchCardAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 3,
  },
  branchCardAddress: {
    fontSize: 11.5,
    color: '#6B7280',
    flex: 1,
    lineHeight: 16,
  },
  branchCardMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    gap: 12,
    marginBottom: 10,
  },
  branchCardMetaItem: {
    flex: 1,
  },
  branchMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  branchMetaValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  managerNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  managerContactText: {
    fontSize: 10,
    color: '#64748B',
  },
  branchCardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  branchCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  activeIndicatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  activeIndicatorText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  selectBranchBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  selectBranchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  toolIconsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Pagination */
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  paginationText: {
    fontSize: 11,
    color: '#6B7280',
  },
  pagerPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pagerDisabled: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  pagerActivePill: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerActivePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 480,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: '#1F2937',
  },
  typeChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  typeChoiceActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  typeChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  typeChoiceTextActive: {
    color: '#EA580C',
  },
  parentPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  parentPillActive: {
    backgroundColor: '#EA580C',
  },
  parentPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  parentPillTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EA580C',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Report styles */
  reportBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
  },
  reportBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  reportBoxVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
  },
  reportBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reportRowKey: {
    fontSize: 11,
    color: '#4B5563',
  },
  reportRowVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },

  /* Details row */
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailKey: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  detailVal: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },
});
