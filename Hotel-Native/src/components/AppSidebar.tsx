import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import {
  LayoutDashboard,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  CreditCard,
  ShoppingCart,
  Users,
  Building2,
  Settings,
  Sparkles,
  Crown,
  ChevronRight,
  Shield,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { toDevanagari } from '../locales/translations';
import { ReceiptRupee } from './ReceiptRupeeIcon';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenewPlanModal } from './RenewPlanModal';

export interface AppSidebarProps {
  activeRouteName: string;
  onNavigate: (routeName: string) => void;
  onCloseDrawer?: () => void;
  isDrawer?: boolean;
}

const isItemActive = (itemName: string, currentRoute?: string): boolean => {
  if (!currentRoute) return itemName === 'Dashboard';
  const r = currentRoute.trim().toLowerCase();
  const it = itemName.trim().toLowerCase();

  if (it === 'dashboard') {
    return r === 'dashboard' || r === 'overview' || r === 'hoteloverview' || r === 'mainapp';
  }
  if (it === 'kot') {
    return r === 'kot';
  }
  if (it === 'billing') {
    return r === 'billing' || r === 'hotelbilling' || r.includes('bill') || r.includes('invoice');
  }
  if (it === 'tables') {
    return r === 'tables' || r === 'tableskot' || r.includes('table');
  }
  if (it === 'payments') {
    return r === 'payments' || r.includes('pay');
  }
  if (it === 'purchase') {
    return r === 'purchase' || r.includes('purch');
  }
  if (it === 'staff') {
    return r === 'staff';
  }
  if (it === 'settingstab' || it === 'settings') {
    return r === 'settingstab' || r === 'settings' || r.includes('setting') || r.includes('printer');
  }
  return r === it;
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeRouteName,
  onNavigate,
  onCloseDrawer,
  isDrawer = false,
}) => {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { business } = useAuth();
  const { activeBranch } = useBranch();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 9 Modules matching Vite Sidebar
  const NAV_ITEMS = [
    {
      name: 'Dashboard',
      label: t('hotelOverview', 'Hotel Overview'),
      icon: LayoutDashboard,
    },
    {
      name: 'KOT',
      label: t('kot', 'KOT'),
      icon: ChefHat,
    },
    {
      name: 'Billing',
      label: t('billingAndInvoices', 'Billing / Invoices'),
      icon: ReceiptRupee,
    },
    {
      name: 'Tables',
      label: t('tables', 'Tables'),
      icon: UtensilsCrossed,
    },
    {
      name: 'Payments',
      label: t('payments', 'Payments'),
      icon: CreditCard,
    },
    {
      name: 'Purchase',
      label: t('purchase', 'Purchase'),
      icon: ShoppingCart,
    },
    {
      name: 'Staff',
      label: t('staff', 'Staff'),
      icon: Users,
    },
    {
      name: 'SettingsTab',
      label: t('settings', 'Settings'),
      icon: Settings,
    },
  ];

  const handleItemPress = (routeName: string) => {
    onNavigate(routeName);
    if (onCloseDrawer) {
      onCloseDrawer();
    }
  };

  return (
    <View style={[styles.sidebarContainer, isDrawer && styles.drawerContainer]}>
      {/* Brand Header */}
      <View
        style={[
          styles.brandHeader,
          isDrawer && {
            paddingTop: Math.max(Platform.OS === 'ios' ? 52 : (Platform.OS === 'android' ? 24 : 14), insets.top + 8),
            paddingBottom: 16,
          },
        ]}
      >
        <View style={styles.brandLeft}>
          <View style={styles.brandIconBox}>
            <Building2 size={20} color="#FED7AA" />
          </View>
          <View>
            <Text style={styles.brandTitle}>{t('brandName', 'AJALKAR')}</Text>
            <Text style={styles.brandSubtitle}>
              {t('hotelManagement', 'HOTEL MANAGEMENT')}
            </Text>
          </View>
        </View>

        {isDrawer && onCloseDrawer && (
          <TouchableOpacity
            style={styles.closeDrawerBtn}
            onPress={onCloseDrawer}
            activeOpacity={0.7}
          >
            <X size={20} color="#E7D8CD" />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation List */}
      <ScrollView
        style={styles.navScrollView}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Owner Admin Panel Portal Button (Matching Screenshot 2) */}
        <TouchableOpacity
          style={[
            styles.ownerAdminBtn,
            (activeRouteName?.toLowerCase().includes('owner')) && styles.ownerAdminBtnActive,
          ]}
          onPress={() => handleItemPress('OwnerAdmin')}
          activeOpacity={0.8}
        >
          <View style={styles.ownerAdminIconBox}>
            <Building2
              size={17}
              color={(activeRouteName?.toLowerCase().includes('owner')) ? '#FFFFFF' : '#F97316'}
            />
          </View>
          <Text
            style={[
              styles.ownerAdminBtnText,
              (activeRouteName?.toLowerCase().includes('owner')) && styles.ownerAdminBtnTextActive,
            ]}
          >
            {t('ownerAdminPanel', 'Owner Admin Panel')}
          </Text>
        </TouchableOpacity>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.name, activeRouteName);

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleItemPress(item.name)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
                <Icon size={18} color={isActive ? '#FFFFFF' : '#C7B6A9'} />
              </View>
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activePillIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Trial Card matching Vite */}
      <View
        style={[
          styles.trialCardWrapper,
          isDrawer && {
            paddingBottom: Math.max(Platform.OS === 'ios' ? 28 : 12, insets.bottom + 8),
          },
        ]}
      >
        <View style={styles.trialCard}>
          <View style={styles.trialHeaderRow}>
            <Crown size={14} color="#FBBF24" />
            <Text style={styles.trialTitle}>
              {t('trialBannerTitle', '28 Days Free Trial')}
            </Text>
          </View>
          <Text style={styles.trialDaysLeft}>
            {t('trialDaysLeft', 'Trial: 18 Days Left')}
          </Text>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeBtnText}>
              {t('upgradePlan', 'Upgrade Plan')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plan Upgrade & Renew Modal (AjalkarBill 3-Step Selection, UPI QR, and Verification) */}
      <RenewPlanModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        hotelName={business?.name || 'Royal Palace Hotel'}
      />
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  sidebarContainer: {
    width: 240,
    backgroundColor: isDark ? '#090D16' : '#1E0C04',
    borderRightWidth: 1,
    borderRightColor: isDark ? '#1E293B' : '#381A0B',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
  },
  drawerContainer: {
    width: 280,
    maxWidth: '85%',
    backgroundColor: isDark ? '#090D16' : '#1E0C04',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#7C2D12',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FED7AA',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  closeDrawerBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navScrollView: {
    flex: 1,
  },
  navScrollContent: {
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 10,
    gap: 4,
  },
  ownerAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  ownerAdminBtnActive: {
    backgroundColor: '#C2410C',
    borderColor: '#EA580C',
  },
  ownerAdminIconBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAdminBtnText: {
    color: '#FED7AA',
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.2,
  },
  ownerAdminBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#C2410C', // Vibrant terracotta orange matching screenshot 2
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  navIconBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBoxActive: {},
  navLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#D4C4B8',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activePillIndicator: {
    width: 4,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 'auto',
  },
  trialCardWrapper: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  trialCard: {
    backgroundColor: '#2A1308',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  trialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trialTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FDE68A',
  },
  trialDaysLeft: {
    fontSize: 10.5,
    color: '#A8998D',
    marginTop: 3,
    marginBottom: 8,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 7,
    borderRadius: 8,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  // Upgrade Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: isDark ? '#161F36' : '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: isDark ? '#2A364F' : '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#F8FAFC' : '#1C1917',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: isDark ? '#94A3B8' : '#57534E',
    lineHeight: 18,
    marginBottom: 16,
  },
  planCardHighlight: {
    backgroundColor: isDark ? '#261A0E' : '#FFF7ED',
    borderWidth: 1.5,
    borderColor: isDark ? '#B45309' : '#FDBA74',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planBadge: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#FDBA74' : '#7C2D12',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
    marginVertical: 6,
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#78716C',
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  planFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#CBD5E1' : '#292524',
  },
  modalActionBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
