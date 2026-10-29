import React, { useState } from 'react';
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

export interface AppSidebarProps {
  activeRouteName: string;
  onNavigate: (routeName: string) => void;
  onCloseDrawer?: () => void;
  isDrawer?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeRouteName,
  onNavigate,
  onCloseDrawer,
  isDrawer = false,
}) => {
  const { t, language } = useLanguage();
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
      name: 'Branches',
      label: t('branches', 'Branches'),
      icon: Building2,
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
      <View style={styles.brandHeader}>
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
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeRouteName === item.name ||
            (item.name === 'SettingsTab' &&
              (activeRouteName === 'Settings' || activeRouteName === 'SettingsTab'));

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
      <View style={styles.trialCardWrapper}>
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
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.upgradeBtnText}>
              {t('upgradePlan', 'Upgrade Plan')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plan Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Shield size={22} color="#EA580C" />
                <Text style={styles.modalTitle}>
                  {t('upgradeToEnterprise', 'Upgrade to Enterprise')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowUpgradeModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {t(
                'upgradeDesc',
                'Unlock unlimited branches, multi-counter GST billing, 80mm thermal receipt printing, and comprehensive live reports.'
              )}
            </Text>

            <View style={styles.planCardHighlight}>
              <Text style={styles.planBadge}>{language === 'mr' ? 'शिफारस केलेले' : language === 'hi' ? 'अनुशंसित' : 'RECOMMENDED'}</Text>
              <Text style={styles.planName}>{language === 'mr' ? 'एंटरप्राइझ वार्षिक योजना' : language === 'hi' ? 'एंटरप्राइज वार्षिक योजना' : 'Enterprise Annual Plan'}</Text>
              <Text style={styles.planPrice}>
                ₹ {toDevanagari('14,999')} <Text style={styles.planPeriod}>/ {language === 'mr' ? 'वर्ष' : language === 'hi' ? 'वर्ष' : 'year'}</Text>
              </Text>
              <View style={styles.planFeatureRow}>
                <CheckCircle2 size={15} color="#16A34A" />
                <Text style={styles.planFeatureText}>{language === 'mr' ? 'सर्व ९ हॉटेल मॉड्युल्स समाविष्ट' : language === 'hi' ? 'सभी ९ होटल मॉड्यूल शामिल' : 'All 9 Hotel Modules Included'}</Text>
              </View>
              <View style={styles.planFeatureRow}>
                <CheckCircle2 size={15} color="#16A34A" />
                <Text style={styles.planFeatureText}>{language === 'mr' ? 'मल्टी-शाखा क्लाउड सिंक' : language === 'hi' ? 'मल्टी-ब्रांच क्लाउड सिंक' : 'Multi-Branch Cloud Sync'}</Text>
              </View>
              <View style={styles.planFeatureRow}>
                <CheckCircle2 size={15} color="#16A34A" />
                <Text style={styles.planFeatureText}>{language === 'mr' ? '८० मिमी थर्मल बिल आणि KOT प्रिंट' : language === 'hi' ? '८० मिमी थर्मल बिल और KOT प्रिंट' : '80mm Thermal Bill & KOT Print'}</Text>
              </View>
              <View style={styles.planFeatureRow}>
                <CheckCircle2 size={15} color="#16A34A" />
                <Text style={styles.planFeatureText}>{language === 'mr' ? 'जीएसटी GSTR-1, 2, 3B ऑडिट अहवाल' : language === 'hi' ? 'जीएसटी GSTR-1, 2, 3B ऑडिट रिपोर्ट' : 'GST GSTR-1, 2, 3B Audit Reports'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setShowUpgradeModal(false);
                Alert.alert('Plan Upgraded', 'Enterprise plan activated successfully!');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalActionBtnText}>
                {t('activateEnterprise', 'Activate Enterprise License')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 240,
    backgroundColor: '#1E0C04', // Dark mahogany matching Vite screenshots
    borderRightWidth: 1,
    borderRightColor: '#381A0B',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
  },
  drawerContainer: {
    width: 280,
    maxWidth: '85%',
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
    backgroundColor: '#8F351D', // Matching Vite active nav item
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#FED7AA',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
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
    color: '#1C1917',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#57534E',
    lineHeight: 18,
    marginBottom: 16,
  },
  planCardHighlight: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
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
    color: '#7C2D12',
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
    color: '#78716C',
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
    color: '#292524',
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
