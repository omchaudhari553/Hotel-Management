import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  Globe,
  Calendar,
  Sparkles,
  Bell,
  ChevronDown,
  Check,
  CheckCircle2,
  UtensilsCrossed,
  X,
  RefreshCw,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Trash2,
  Menu,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme/colors';
import { useLanguage, AppLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { BranchConfig } from '../branches';
import { AppSidebar } from './AppSidebar';
import { toDevanagari } from '../locales/translations';
import { notificationManager } from '../utils/notificationManager';
import {
  translateNotifTitle,
  translateNotifDesc,
  translateNotifTime,
  getOpenScreenActionText,
} from '../utils/notificationLocalization';

interface AppNavbarProps {
  onOpenPlanModal?: () => void;
  navigation?: any;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onOpenPlanModal, navigation }) => {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t, formatDate, formatTime } = useLanguage();
  const { branches, activeBranchId, activeBranch, switchBranch, getBranchName } = useBranch();

  // Modals state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);

  // Live updating current date & time
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    // Update live clock and date every 30 seconds
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Notifications state with persistence & actions
  interface NotificationItem {
    id: string;
    title: string;
    desc: string;
    time: string;
    read: boolean;
    targetScreen?: string;
  }

  const DEFAULT_NOTIFS: NotificationItem[] = [
    { id: '1', title: 'New Bill Request', desc: 'Table 06 requested final bill (₹ 2,499)', time: '2m ago', read: false, targetScreen: 'Billing' },
    { id: '2', title: 'KOT Dispatched', desc: 'Order #KOT-104 dispatched to kitchen for Table 02', time: '5m ago', read: false, targetScreen: 'KOT' },
    { id: '3', title: 'Low Inventory Alert', desc: 'Paneer & Butter stock below reorder level (2 kg left)', time: '15m ago', read: false, targetScreen: 'Purchase' },
    { id: '4', title: 'Payment Received', desc: 'UPI payment of ₹ 1,450 received via PhonePe', time: '25m ago', read: true, targetScreen: 'Payments' },
    { id: '5', title: 'Table Cleaned', desc: 'Table 05 sanitized and ready for seating', time: '35m ago', read: true, targetScreen: 'Tables' },
  ];

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifTab, setNotifTab] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    const unsub = notificationManager.subscribe((items) => {
      setNotifications(items as any);
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllNotificationsRead = async () => {
    await notificationManager.markAllAsRead();
  };

  const handleClearAllNotifications = async () => {
    await notificationManager.clearAll();
  };

  const handleDeleteNotification = async (id: string) => {
    await notificationManager.deleteNotification(id);
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    await notificationManager.markAsRead(item.id);
    setShowNotificationModal(false);
    if (item.targetScreen && navigation) {
      try {
        navigation.navigate(item.targetScreen);
      } catch {
        try {
          navigation.navigate('MainApp', { screen: item.targetScreen });
        } catch (err) {
          console.warn('Navigation failed', err);
        }
      }
    }
  };

  const handleBranchSelect = async (branch: BranchConfig) => {
    await switchBranch(branch.id);
    setShowBranchModal(false);
  };

  const handleLanguageSelect = async (lang: AppLanguage) => {
    await setLanguage(lang);
    setShowLangModal(false);
  };

  const getLanguageLabel = (lang: AppLanguage) => {
    switch (lang) {
      case 'mr':
        return 'मराठी';
      case 'hi':
        return 'हिंदी';
      default:
        return 'English';
    }
  };

  const localizedDateStr = formatDate(currentDateTime, { showDayOfWeek: true, shortFormat: true });
  const localizedTimeStr = formatTime(currentDateTime);

  return (
    <View style={[styles.navbarContainer, { paddingTop: Math.max(Platform.OS === 'android' ? 24 : (Platform.OS === 'ios' ? 44 : 8), insets.top + 4) }]}>
      {/* ===================================================
          LINE 1: MAIN BRAND & TOP ACTIONS BAR
      =================================================== */}
      <View style={styles.topRow}>
        {/* Brand Left */}
        <View style={styles.brandBox}>
          {useWindowDimensions().width < 800 && (
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => setShowSidebarDrawer(true)}
              activeOpacity={0.7}
              accessibilityLabel="Open Navigation Sidebar"
            >
              <Menu size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.brandBadge}>
            <UtensilsCrossed size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle} numberOfLines={1}>AJALKAR POS</Text>
            </View>
            <Text style={styles.brandSubtitle} numberOfLines={1} ellipsizeMode="tail">
              HOTEL MANAGEMENT • {activeBranch?.name || 'Royal Palace Hotel'}
            </Text>
          </View>
        </View>

        {/* Actions Right (Branch Icon, Lang Icon, Bell & R Avatar ONLY) */}
        <View style={styles.topActionsRight}>
          {/* Main Branch Icon Selector */}
          <TouchableOpacity
            style={styles.navSquareBtn}
            onPress={() => setShowBranchModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Switch Branch"
          >
            <Building2 size={16} color="#FFFFFF" />
            <View style={styles.navMiniBadge}>
              <Text style={styles.navMiniBadgeText}>
                {activeBranchId === 'main' ? 'M' : activeBranchId === 'highway' ? 'H' : 'C'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Language Icon Selector */}
          <TouchableOpacity
            style={styles.navSquareBtn}
            onPress={() => setShowLangModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Change Language"
          >
            <Globe size={16} color="#FFFFFF" />
            <View style={[styles.navMiniBadge, { backgroundColor: '#0D9488' }]}>
              <Text style={styles.navMiniBadgeText}>
                {language === 'mr' ? 'म' : language === 'hi' ? 'हि' : 'EN'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.navSquareBtn}
            onPress={() => setShowNotificationModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
          >
            <Bell size={16} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile - 'R' Icon Button ONLY */}
          <TouchableOpacity
            style={styles.avatarOnlyBtn}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="User Profile"
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>R</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================================================
          LINE 2: SLEEK COMPACT RIBBON (Single-Line, No Overlap)
      =================================================== */}
      <View style={styles.compactRibbon}>
        <View style={styles.ribbonDateBox}>
          <Calendar size={11} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.compactDateText}>{localizedDateStr}</Text>
          <View style={styles.clockDot} />
          <Clock size={10} color="#64748B" style={{ marginRight: 3 }} />
          <Text style={styles.compactTimeText}>{localizedTimeStr}</Text>
        </View>

        <TouchableOpacity
          style={styles.compactTrialBox}
          onPress={() => {
            if (onOpenPlanModal) onOpenPlanModal();
          }}
          activeOpacity={0.8}
        >
          <Sparkles size={11} color="#D97706" style={{ marginRight: 3 }} />
          <Text style={styles.compactTrialText}>{t('freeTrial', 'Trial')} • 25 {t('daysLeftLower', 'days')}</Text>
          <View style={styles.compactRenewBadge}>
            <Text style={styles.compactRenewText}>{t('renew', 'Renew')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ===================================================
          MODAL 1: BRANCH SELECTOR MODAL
      =================================================== */}
      <Modal visible={showBranchModal} transparent animationType="fade" onRequestClose={() => setShowBranchModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBranchModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#EA580C" />
                <Text style={styles.modalTitle}>{t('selectBranch', 'Select Branch')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {t('connectedBranch', 'Switch active branch to view live orders, tables & sales.')}
            </Text>

            <ScrollView style={{ maxHeight: 340 }}>
              {branches.map((b) => {
                const isSelected = b.id === activeBranchId;
                const branchDisplayName =
                  language === 'mr' ? b.nameMr : language === 'hi' ? b.nameHi : b.name;
                const branchDisplayType =
                  language === 'mr' ? b.typeMr : language === 'hi' ? b.typeHi : b.type;

                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.branchCardItem, isSelected && styles.branchCardItemSelected]}
                    onPress={() => handleBranchSelect(b)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.branchItemHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.branchItemName, isSelected && styles.branchItemNameSelected]}>
                            {branchDisplayName}
                          </Text>
                          {isSelected && (
                            <View style={styles.activeCheckTag}>
                              <CheckCircle2 size={12} color="#15803D" />
                              <Text style={styles.activeCheckText}>{t('active', 'Active')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.branchItemType}>{branchDisplayType}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedCircle}>
                          <Check size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>

                    {/* Quick Stats in Branch Modal */}
                    <View style={styles.branchItemStatsRow}>
                      <View style={styles.branchItemStat}>
                        <Text style={styles.branchItemStatLabel}>{t('todaySales', 'Sales')}:</Text>
                        <Text style={styles.branchItemStatVal}>{b.stats.todaySales}</Text>
                      </View>
                      <View style={styles.branchItemStat}>
                        <Text style={styles.branchItemStatLabel}>{t('tables', 'Tables')}:</Text>
                        <Text style={[styles.branchItemStatVal, { color: '#EA580C' }]}>
                          {b.stats.occupiedTables}/{b.stats.totalTables}
                        </Text>
                      </View>
                      <View style={styles.branchItemStat}>
                        <Text style={styles.branchItemStatLabel}>{t('staff', 'Staff')}:</Text>
                        <Text style={[styles.branchItemStatVal, { color: '#2563EB' }]}>
                          {b.stats.staffOnDuty}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {navigation && (
              <TouchableOpacity
                style={styles.manageBranchesBtn}
                onPress={() => {
                  setShowBranchModal(false);
                  navigation.navigate('Branches');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.manageBranchesBtnText}>
                  {t('manageBranches', 'View All Branches Full Details →')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================
          MODAL 2: LANGUAGE SELECTOR MODAL (English / मराठी / हिंदी)
      =================================================== */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.langModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe size={20} color="#0D9488" />
                <Text style={styles.modalTitle}>{t('selectLanguage', 'Select Language')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLangModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Choose preferred language for entire dashboard, navigation & receipts.
            </Text>

            <View style={{ gap: 10, marginTop: 6 }}>
              {[
                { code: 'en' as AppLanguage, name: 'English', sub: 'Default POS Display', flag: '🇬🇧' },
                { code: 'mr' as AppLanguage, name: 'मराठी', sub: 'मराठी भाषा (Marathi)', flag: '🚩' },
                { code: 'hi' as AppLanguage, name: 'हिंदी', sub: 'हिंदी भाषा (Hindi)', flag: '🇮🇳' },
              ].map((item) => {
                const isSelected = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langOptionItem, isSelected && styles.langOptionItemSelected]}
                    onPress={() => handleLanguageSelect(item.code)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                      <View>
                        <Text style={[styles.langOptionName, isSelected && styles.langOptionNameSelected]}>
                          {item.name}
                        </Text>
                        <Text style={styles.langOptionSub}>{item.sub}</Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={styles.selectedCircle}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================
          MODAL 3: NOTIFICATIONS MODAL
      =================================================== */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="#EA580C" />
                <Text style={styles.modalTitle}>{t('notifications', 'Notifications')}</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadCounterTag}>
                    <Text style={styles.unreadCounterText}>
                      {language === 'mr'
                        ? `${toDevanagari(unreadCount)} नवीन`
                        : language === 'hi'
                        ? `${toDevanagari(unreadCount)} नए`
                        : `${unreadCount} New`}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs & Quick Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0EBE1' }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: notifTab === 'ALL' ? '#EA580C' : '#F5F5F4',
                  }}
                  onPress={() => setNotifTab('ALL')}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: notifTab === 'ALL' ? '#FFFFFF' : '#78716C' }}>
                    {t('all', 'All')} ({toDevanagari(notifications.length)})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: notifTab === 'UNREAD' ? '#EA580C' : '#F5F5F4',
                  }}
                  onPress={() => setNotifTab('UNREAD')}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: notifTab === 'UNREAD' ? '#FFFFFF' : '#78716C' }}>
                    {t('unread', 'Unread')} ({toDevanagari(unreadCount)})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllNotificationsRead}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{t('markRead', 'Mark Read')}</Text>
                  </TouchableOpacity>
                )}
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={handleClearAllNotifications}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>{t('clear', 'Clear')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={{ maxHeight: 340, marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {notifications
                .filter((n) => (notifTab === 'UNREAD' ? !n.read : true))
                .map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notificationItem, !n.read && styles.notificationItemUnread]}
                    onPress={() => handleNotificationClick(n)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.notifDotBox}>
                      <View style={[styles.notifDot, !n.read && styles.notifDotActive]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                          {translateNotifTitle(n.title, language)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.notifTime}>{translateNotifTime(n.time, language)}</Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleDeleteNotification(n.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={13} color="#A8A29E" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.notifDesc}>{translateNotifDesc(n.desc, language)}</Text>
                      {n.targetScreen && (
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 10, color: '#EA580C', fontWeight: '700' }}>
                            {getOpenScreenActionText(n.targetScreen, language)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

              {notifications.filter((n) => (notifTab === 'UNREAD' ? !n.read : true)).length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Bell size={28} color="#D6D3D1" />
                  <Text style={{ fontSize: 12, color: '#78716C', marginTop: 8, fontWeight: '600' }}>
                    {notifTab === 'UNREAD' ? t('noUnreadNotifications', 'No unread notifications') : t('noNotifications', 'No notifications')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================
          MODAL 4: LIVE DATE & SYSTEM TIME MODAL
      =================================================== */}
      <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}
        >
          <View style={styles.langModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} color="#475569" />
                <Text style={styles.modalTitle}>{t('liveDate', 'System Date & Time')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateCardHighlight}>
              <Text style={styles.dateCardBig}>{localizedDateStr}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Clock size={14} color="#EA580C" />
                <Text style={styles.dateCardClock}>
                  {t('time', 'Time')}: {localizedTimeStr} (IST)
                </Text>
              </View>
            </View>

            <Text style={styles.modalSub}>
              Transactions, KOT tickets and GST billing invoices automatically sync with this live terminal timestamp.
            </Text>

            <TouchableOpacity
              style={styles.dateCloseBtn}
              onPress={() => setShowDateModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.dateCloseBtnText}>{t('close', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================
          MODAL 5: USER PROFILE & QUICK SWITCH MODAL
      =================================================== */}
      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => setShowProfileModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.langModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={20} color="#EA580C" />
                <Text style={styles.modalTitle}>{language === 'mr' ? 'रॉयल पॅलेस हॉटेल' : language === 'hi' ? 'रॉयल पैलेस होटल' : 'Royal Palace Hotel'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileModalDetails}>
              <View style={styles.profileModalAvatar}>
                <Text style={styles.profileModalAvatarText}>R</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileModalName}>{language === 'mr' ? 'राहुल पाटील (प्रशासक)' : language === 'hi' ? 'राहुल पाटिल (व्यवस्थापक)' : 'Rahul Patil (Administrator)'}</Text>
                <Text style={styles.profileModalSub}>{t('active', 'Active')}: {getBranchName(language)}</Text>
                <Text style={styles.profileModalSub}>GSTIN: {activeBranch.gstin}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.profileActionBtn}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowBranchModal(true);
                }}
                activeOpacity={0.8}
              >
                <Building2 size={16} color="#EA580C" />
                <Text style={styles.profileActionText}>{t('switchBranch', 'Switch Active Branch')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileActionBtn}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowLangModal(true);
                }}
                activeOpacity={0.8}
              >
                <Globe size={16} color="#0D9488" />
                <Text style={styles.profileActionText}>
                  {t('language', 'Language')}: {getLanguageLabel(language)}
                </Text>
              </TouchableOpacity>

              {navigation && (
                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => {
                    setShowProfileModal(false);
                    navigation.navigate('SettingsTab');
                  }}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={16} color="#475569" />
                  <Text style={styles.profileActionText}>{t('settings', 'System Settings')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sidebar Drawer Modal for Mobile & Tablets */}
      <Modal
        visible={showSidebarDrawer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSidebarDrawer(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setShowSidebarDrawer(false)}
          />
          <View style={styles.drawerContentBox}>
            <AppSidebar
              activeRouteName="Dashboard"
              isDrawer={true}
              onNavigate={(routeName) => {
                setShowSidebarDrawer(false);
                if (navigation) {
                  navigation.navigate(routeName);
                }
              }}
              onCloseDrawer={() => setShowSidebarDrawer(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  navbarContainer: {
    backgroundColor: '#7C2D12', // Rich Terracotta Hotel Brand Color
    paddingBottom: 6,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },

  /* Line 1: Main Brand & Actions */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  brandBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  liveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
  },
  liveIndicatorText: {
    color: '#86EFAC',
    fontSize: 7.5,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: '#FDBA74',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 0.5,
  },
  topActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  navSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  navMiniBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#EA580C',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C2D12',
  },
  navMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#7C2D12',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  avatarOnlyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  compactRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ribbonDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  clockDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
    marginHorizontal: 5,
  },
  compactTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  compactTrialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  compactTrialText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
    marginRight: 4,
  },
  compactRenewBadge: {
    backgroundColor: '#D97706',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  compactRenewText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ribbonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ribbonPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderRadius: 7,
    borderWidth: 1,
    minHeight: 30,
    minWidth: 0,
  },
  pillIcon: {
    marginRight: 4,
    flexShrink: 0,
  },

  /* Branch Pill */
  branchPill: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    flex: 1.4,
  },
  branchPillText: {
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },

  /* Language Pill */
  langPill: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    flex: 1,
  },
  langPillText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },

  /* Date Pill */
  datePill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    flex: 1.25,
  },
  datePillText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  liveClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 3,
  },
  liveClockText: {
    color: '#5B21B6',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Trial Pill */
  trialPill: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    flex: 1.15,
  },
  trialPillText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  renewBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  renewBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* ================= MODAL STYLES ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  langModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },

  /* Branch Item Card in Modal */
  branchCardItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  branchCardItemSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  branchItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  branchItemNameSelected: {
    color: '#9A3412',
    fontWeight: '800',
  },
  activeCheckTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeCheckText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
  },
  branchItemType: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  branchItemStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  branchItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  branchItemStatLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  branchItemStatVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  manageBranchesBtn: {
    backgroundColor: '#7C2D12',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  manageBranchesBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  /* Language Options */
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  langOptionItemSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  langOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  langOptionNameSelected: {
    color: '#0F766E',
    fontWeight: '800',
  },
  langOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Notifications Modal */
  unreadCounterTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadCounterText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  markReadBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  markReadBtnText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  notificationItemUnread: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
  },
  notifDotBox: {
    paddingTop: 5,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  notifDotActive: {
    backgroundColor: '#EA580C',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#1E293B',
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  notifDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* Date Modal */
  dateCardHighlight: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dateCardBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  dateCardClock: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateCloseBtn: {
    backgroundColor: '#475569',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  dateCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Profile Modal */
  profileModalDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileModalName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  profileModalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  hamburgerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawerContentBox: {
    width: 280,
    maxWidth: '85%',
    height: '100%',
    zIndex: 999,
  },
});
