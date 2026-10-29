import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';
import { useBranch } from '../context/BranchContext';
import { useLanguage } from '../context/LanguageContext';
import notificationService, { AppNotification } from '../services/notificationService';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { settingsService } from '../services/settingsService';
import SubscriptionModal from '../components/SubscriptionModal';
import CentralServerBadge from '../components/CentralServerBadge';
import { LocalizedDatePicker } from './LocalizedDatePicker';
import {
  LogOut,
  Calendar,
  Bell,
  ChevronDown,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Package,
  Truck,
  X,
  Check,
  RefreshCw,
  Zap,
  Settings,
  Shield,
  User,
  ExternalLink,
  Languages,
  Users,
  FileText,
  Utensils,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, business, logout } = useAuth();
  const { activeIndustryCode } = useIndustry();
  const { language, setLanguage, t, formatDate, toDevanagari } = useLanguage();
  const currentLanguage = language;
  const {
    mainBranches,
    selectedMainBranch,
    mainBranch,
    subBranches,
    selectedSubBranch,
    selectedBranch,
    setSelectedMainBranchId,
    setSelectedSubBranchId,
  } = useBranch();


  // Date Filter & Range State
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => localStorage.getItem('navbar_date_filter') || 'Today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => localStorage.getItem('navbar_start_date') || new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(() => localStorage.getItem('navbar_end_date') || new Date().toISOString().split('T')[0]);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Sync date filter across components if changed elsewhere
  useEffect(() => {
    const handleSyncNavbar = (e: any) => {
      const { filter, startDate, endDate } = e.detail || {};
      if (filter) setSelectedDateFilter(filter);
      if (startDate) setCustomStartDate(startDate);
      if (endDate) setCustomEndDate(endDate);
    };
    window.addEventListener('navbar-date-filter-changed', handleSyncNavbar);
    return () => window.removeEventListener('navbar-date-filter-changed', handleSyncNavbar);
  }, []);

  // Licence & trial status state
  const [licenceInfo, setLicenceInfo] = useState<LicenceInfo | null>(null);

  const fetchLicence = async () => {
    try {
      const data = await licenceService.getLicenceInfo();
      setLicenceInfo(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLicence();
    window.addEventListener('licence-updated', fetchLicence);
    return () => window.removeEventListener('licence-updated', fetchLicence);
  }, []);

  // Dynamic countdown calculation based on actual trial activation date / trial end date
  const [currentRemainingDays, setCurrentRemainingDays] = useState<number>(() => {
    return licenceInfo?.daysRemaining ?? 28;
  });

  useEffect(() => {
    const calculateDays = () => {
      if (licenceInfo?.trialEndDate) {
        const end = new Date(licenceInfo.trialEndDate).getTime();
        const now = Date.now();
        const diff = end - now;
        const days = Math.min(28, Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
        setCurrentRemainingDays(days);
      } else if (licenceInfo?.daysRemaining != null) {
        setCurrentRemainingDays(Math.min(28, licenceInfo.daysRemaining));
      } else {
        setCurrentRemainingDays(28);
      }
    };

    calculateDays();
    const interval = setInterval(calculateDays, 60000); // Dynamic interval update every 60s
    return () => clearInterval(interval);
  }, [licenceInfo?.trialEndDate, licenceInfo?.daysRemaining]);

  // Profile image and business logo state
  const [profileImage, setProfileImage] = useState<string>(() => localStorage.getItem('user_profile_image') || '');
  const [businessLogo, setBusinessLogo] = useState<string>(() => localStorage.getItem('business_logo') || '');

  useEffect(() => {
    const fetchUserAndBrandImages = async () => {
      try {
        const allSettings = await settingsService.getSettings();
        const logoSetting = allSettings.find((s) => s.category === 'BUSINESS' && s.settingKey === 'LOGO');
        if (logoSetting?.settingValue) {
          setBusinessLogo(logoSetting.settingValue);
          localStorage.setItem('business_logo', logoSetting.settingValue);
        }
        const profileKey = 'PROFILE_IMAGE_' + (user?.id || user?.username || 'CURRENT');
        const profileSetting = allSettings.find((s) => s.category === 'USER_PROFILE' && s.settingKey === profileKey);
        if (profileSetting?.settingValue) {
          setProfileImage(profileSetting.settingValue);
          localStorage.setItem('user_profile_image', profileSetting.settingValue);
        }
      } catch {
        // ignore
      }
    };
    fetchUserAndBrandImages();

    const handleProfileUpdated = (e: any) => {
      const img = e.detail?.image !== undefined ? e.detail.image : (localStorage.getItem('user_profile_image') || '');
      setProfileImage(img);
    };
    const handleBrandingUpdated = (e: any) => {
      const logo = e.detail?.logo !== undefined ? e.detail.logo : (localStorage.getItem('business_logo') || '');
      setBusinessLogo(logo);
    };

    window.addEventListener('profile-image-updated', handleProfileUpdated);
    window.addEventListener('branding-updated', handleBrandingUpdated);
    return () => {
      window.removeEventListener('profile-image-updated', handleProfileUpdated);
      window.removeEventListener('branding-updated', handleBrandingUpdated);
    };
  }, [user?.id, user?.username]);

  // Notifications state
  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  // Notification Date Filter state
  const [notifDateFilter, setNotifDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'CUSTOM'>('ALL');
  const [notifCustomDate, setNotifCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Branch dropdown state
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);

  // User Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Language dropdown state
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);

  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from backend
  const fetchNotifications = async (explicitDateFilter?: string) => {
    try {
      setLoadingNotifications(true);

      const todayStr = new Date().toISOString().split('T')[0];
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterdayStr = y.toISOString().split('T')[0];

      let dateQuery: string | undefined = undefined;
      const filterToUse = explicitDateFilter !== undefined ? explicitDateFilter : notifDateFilter;

      if (filterToUse === 'TODAY' || filterToUse === todayStr) {
        dateQuery = todayStr;
      } else if (filterToUse === 'YESTERDAY' || filterToUse === yesterdayStr) {
        dateQuery = yesterdayStr;
      } else if (filterToUse === 'CUSTOM') {
        dateQuery = notifCustomDate;
      } else if (filterToUse && filterToUse !== 'ALL') {
        dateQuery = filterToUse;
      }

      const data = await notificationService.getNotifications(dateQuery);
      setNotifications(data);
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Could not load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const getFilteredNotifications = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split('T')[0];

    if (notifDateFilter === 'ALL') {
      return notifications;
    }

    let targetDateStr = '';
    if (notifDateFilter === 'TODAY') {
      targetDateStr = todayStr;
    } else if (notifDateFilter === 'YESTERDAY') {
      targetDateStr = yesterdayStr;
    } else if (notifDateFilter === 'CUSTOM') {
      targetDateStr = notifCustomDate;
    }

    if (!targetDateStr) return notifications;

    return notifications.filter((n) => {
      if (!n.createdAt) return false;
      return n.createdAt.startsWith(targetDateStr);
    });
  };

  const displayedNotifications = getFilteredNotifications();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 30000); // 30 sec poll
    return () => clearInterval(interval);
  }, [notifDateFilter, notifCustomDate]);


  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setIsLangDropdownOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(target)) {
        setIsDateDropdownOpen(false);
      }
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLangDropdownOpen(false);
        setIsDateDropdownOpen(false);
        setIsNotificationsOpen(false);
        setIsBranchDropdownOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  const handleSelectDateFilter = (filter: string, start?: string, end?: string) => {
    setSelectedDateFilter(filter);
    let s = start || '';
    let e = end || '';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filter === 'Today') {
      s = todayStr;
      e = todayStr;
      setNotifDateFilter('TODAY');
      fetchNotifications('TODAY');
    } else if (filter === 'Yesterday') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      s = y.toISOString().split('T')[0];
      e = s;
      setNotifDateFilter('YESTERDAY');
      fetchNotifications('YESTERDAY');
    } else if (filter === 'This Week') {
      const w = new Date(today);
      w.setDate(today.getDate() - today.getDay());
      s = w.toISOString().split('T')[0];
      e = todayStr;
      setNotifDateFilter('ALL');
      fetchNotifications('ALL');
    } else if (filter === 'This Month') {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      s = m.toISOString().split('T')[0];
      e = todayStr;
      setNotifDateFilter('ALL');
      fetchNotifications('ALL');
    } else if (filter === 'Custom Range') {
      if (s) {
        setNotifDateFilter('CUSTOM');
        setNotifCustomDate(s);
        fetchNotifications(s);
      }
    }

    localStorage.setItem('navbar_date_filter', filter);
    localStorage.setItem('navbar_start_date', s);
    localStorage.setItem('navbar_end_date', e);

    window.dispatchEvent(
      new CustomEvent('navbar-date-filter-changed', {
        detail: { filter, startDate: s, endDate: e },
      })
    );
    setIsDateDropdownOpen(false);
  };

  const handleMarkAsRead = async (id: number) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Format roles gracefully (e.g. 'ROLE_OWNER' -> 'Owner', 'ROLE_ADMIN' -> 'Administrator')
  const formatRole = (role?: string) => {
    if (!role) return t('administrator', 'Administrator');
    const clean = role.replace('ROLE_', '').toLowerCase();
    if (clean === 'owner') return t('owner', 'Owner');
    if (clean === 'admin' || clean === 'administrator') return t('administrator', 'Administrator');
    if (clean === 'manager') return t('manager', 'Manager');
    if (clean === 'staff') return t('staffRole', 'Staff');
    return t(clean, clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
  };

  const isMess = activeIndustryCode === 'MESS';
  const isCafe = activeIndustryCode === 'CAFE';
  const isHotel = activeIndustryCode === 'HOTEL';

  const defaultName = isMess ? 'MK Mess' : isCafe ? 'MG Cafe' : 'Grand Hotel & Restaurant';

  const getDisplayName = () => {
    // Always show original business name regardless of language
    if (business?.name) {
      if (isHotel && business.name.toLowerCase().includes('mess')) {
        return business.name.replace(/mess/gi, 'Hotel & Restaurant');
      }
      if (isMess && business.name.toLowerCase().includes('hotel')) {
        return business.name.replace(/hotel/gi, 'Mess');
      }
      return business.name;
    }
    if (user?.fullName) {
      return user.fullName;
    }
    return defaultName;
  };

  const displayName = getDisplayName();
  const roleTitle = formatRole(user?.roles?.[0] || (user as any)?.role || 'ADMIN');
  const avatarLetter = (business?.name || user?.fullName || 'Royal Palace Hotel').trim().charAt(0).toUpperCase();

  // Navigation route helpers
  const getSettingsPath = () => {
    if (isHotel) return '/hotel/settings';
    return '/settings';
  };

  const getPlansPath = () => {
    if (isHotel) return '/hotel/plans';
    if (isMess) return '/mess/plans-pricing';
    if (isCafe) return '/cafe/plans';
    return '/plans';
  };

  // Format current date: localized according to active language (en/mr/hi)
  const now = new Date();
  const formattedDate = formatDate(now, { showDayOfWeek: true });
  const formattedDateShort = formatDate(now, { showDayOfWeek: false });

  const getNavbarTheme = () => {
    switch (activeIndustryCode) {
      case 'MESS':
        return {
          bg: '#FFFFFF',
          border: '#E2E8F0',
          searchBg: '#F8FAFC',
          searchBorder: '#E2E8F0',
          searchFocusBorder: '#166534',
          searchFocusRing: 'rgba(22, 101, 52, 0.12)',
          searchPlaceholder: 'Search members, meal passes, dining, invoices...',
          searchColor: '#09331D',
          chipBg: '#ECFDF5',
          chipBorder: '#A7F3D0',
          chipText: '#064E3B',
          chipHover: '#D1FAE5',
          trialBg: '#FEF3C7',
          trialBorder: '#FDE68A',
          trialText: '#92400E',
          trialAccent: '#059669',
          dateBg: '#F8FAFC',
          dateBorder: '#E2E8F0',
          dateText: '#475569',
          bellBg: '#F8FAFC',
          bellBorder: '#E2E8F0',
          bellColor: '#334155',
          badgeBg: '#DC2626',
          badgeText: '#FFFFFF',
          avatarBg: 'linear-gradient(135deg, #09331D 0%, #166534 100%)',
          avatarText: '#FFFFFF',
          avatarBorder: '1.5px solid #A7F3D0',
          profileBg: '#F8FAFC',
          profileBorder: '#E2E8F0',
          profileHover: '#F1F5F9',
          businessColor: '#09331D',
          roleColor: '#166534',
          accent: '#166534',
        };
      case 'CAFE':
        return {
          bg: '#FFFFFF',
          border: '#EFE8E5',
          searchBg: '#FAF5F3',
          searchBorder: '#E5D5D0',
          searchFocusBorder: '#A56F63',
          searchFocusRing: 'rgba(165, 111, 99, 0.15)',
          searchPlaceholder: 'Search tables, live KOTs, cafe items, orders...',
          searchColor: '#4A2E2B',
          chipBg: '#F5EBE6',
          chipBorder: '#D7B9B0',
          chipText: '#6F453C',
          chipHover: '#EBDCD6',
          trialBg: '#FEF3C7',
          trialBorder: '#FDE68A',
          trialText: '#92400E',
          trialAccent: '#C68B5C',
          dateBg: '#FAF5F3',
          dateBorder: '#EFE8E5',
          dateText: '#6F453C',
          bellBg: '#FAF5F3',
          bellBorder: '#EFE8E5',
          bellColor: '#6F453C',
          badgeBg: '#DC2626',
          badgeText: '#FFFFFF',
          avatarBg: 'linear-gradient(135deg, #6F453C 0%, #A56F63 100%)',
          avatarText: '#FFFFFF',
          avatarBorder: '1.5px solid #D7B9B0',
          profileBg: '#FAF5F3',
          profileBorder: '#EFE8E5',
          profileHover: '#F5EBE6',
          businessColor: '#4A2E2B',
          roleColor: '#6F453C',
          accent: '#C68B5C',
        };
      case 'HOTEL':
      default:
        return {
          bg: '#FFFFFF',
          border: '#E7E5E4',
          searchBg: '#FAFAF9',
          searchBorder: '#E7E5E4',
          searchFocusBorder: '#B45309',
          searchFocusRing: 'rgba(180, 83, 9, 0.15)',
          searchPlaceholder: 'Search rooms, bookings, folios, tables...',
          searchColor: '#1C1917',
          chipBg: '#FFF7ED',
          chipBorder: '#FED7AA',
          chipText: '#7C2D12',
          chipHover: '#FFEDD5',
          trialBg: '#FEF3C7',
          trialBorder: '#FDE68A',
          trialText: '#92400E',
          trialAccent: '#EA580C',
          dateBg: '#FAFAF9',
          dateBorder: '#E7E5E4',
          dateText: '#57534E',
          bellBg: '#FAFAF9',
          bellBorder: '#E7E5E4',
          bellColor: '#57534E',
          badgeBg: '#DC2626',
          badgeText: '#FFFFFF',
          avatarBg: 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)',
          avatarText: '#FFFFFF',
          avatarBorder: '1.5px solid #FED7AA',
          profileBg: '#FAFAF9',
          profileBorder: '#E7E5E4',
          profileHover: '#F5F5F4',
          businessColor: '#1C1917',
          roleColor: '#B45309',
          accent: '#E96500',
        };
    }
  };

  const navTheme = getNavbarTheme();

  const getNotificationIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ORDER':
      case 'DINE_IN':
      case 'TABLE':
      case 'TABLE_ORDER':
        return <ShoppingBag size={16} color="#2563EB" />;
      case 'KOT':
      case 'KITCHEN':
        return <Utensils size={16} color="#EA580C" />;
      case 'BILLING':
      case 'INVOICE':
      case 'BILL':
        return <FileText size={16} color="#0284C7" />;
      case 'PAYMENT':
      case 'SETTLEMENT':
      case 'PAID':
        return <CreditCard size={16} color="#16A34A" />;
      case 'INVENTORY':
      case 'STOCK':
      case 'PURCHASE':
      case 'LOW_STOCK':
        return <Package size={16} color="#D97706" />;
      case 'STAFF':
      case 'ATTENDANCE':
      case 'SALARY':
        return <Users size={16} color="#0D9488" />;
      case 'ROOM':
      case 'BOOKING':
      case 'GUEST':
        return <Calendar size={16} color="#C2410C" />;
      case 'DELIVERY':
      case 'DISPATCH':
        return <Truck size={16} color="#7C3AED" />;
      case 'SUBSCRIPTION':
      case 'LICENSE':
      case 'PLAN':
        return <Sparkles size={16} color="#9333EA" />;
      default:
        return <Bell size={16} color={navTheme.chipText} />;
    }
  };

  const resolveNotificationTarget = (item: AppNotification): {
    path: string;
    label: string;
    isSubscriptionModal?: boolean;
    modalMode?: 'renew' | 'upgrade';
  } => {
    const type = (item.type || '').toUpperCase();
    const text = `${item.title || ''} ${item.message || ''}`.toUpperCase();

    // 1. Genuine Subscription / Renewal notifications only
    const isGenuineSubscription =
      type === 'SUBSCRIPTION' ||
      type === 'LICENSE' ||
      type === 'PLAN' ||
      text.includes('SUBSCRIPTION EXPIRED') ||
      text.includes('LICENSE EXPIRED') ||
      text.includes('RENEW PLAN') ||
      text.includes('TRIAL EXPIRED');

    if (isGenuineSubscription) {
      if (text.includes('ACTIVATED') || text.includes('SUCCESS')) {
        return { path: getPlansPath(), label: t('plans', 'Plans') };
      }
      return {
        path: getPlansPath(),
        label: t('renewPlan', 'Renew Plan'),
        isSubscriptionModal: true,
        modalMode: text.includes('EXPIRED') ? 'upgrade' : 'renew',
      };
    }

    // 2. Payments & Settlements -> Payments Module
    if (
      type === 'PAYMENT' ||
      type === 'SETTLEMENT' ||
      type === 'PAID' ||
      text.includes('PAYMENT') ||
      text.includes('SETTLED') ||
      text.includes('PAID') ||
      text.includes('UPI') ||
      text.includes('CASH')
    ) {
      const p = isHotel ? '/hotelpayment' : isMess ? '/mess/billing' : isCafe ? '/cafe/order-history' : '/payments';
      return { path: p, label: t('payments', 'Payments') };
    }

    // 3. Billing & Invoices -> Billing Module
    if (
      type === 'BILLING' ||
      type === 'INVOICE' ||
      type === 'BILL' ||
      text.includes('BILL #') ||
      text.includes('INVOICE') ||
      text.includes('BILL GENERATED')
    ) {
      const p = isHotel ? '/hotelbilling' : isMess ? '/mess/billing' : isCafe ? '/cafe/order-history' : '/billing';
      return { path: p, label: t('billing', 'Billing') };
    }

    // 4. KOT / Kitchen -> KOT Module
    if (
      type === 'KOT' ||
      type === 'KITCHEN' ||
      text.includes('KOT') ||
      text.includes('KITCHEN')
    ) {
      const p = isHotel ? '/hotel/kot' : isCafe ? '/cafe/live-pos' : '/hotel/kot';
      return { path: p, label: t('kotKitchen', 'KOT') };
    }

    // 5. Orders / Tables / Dine-in -> Tables / Orders Module
    if (
      type === 'ORDER' ||
      type === 'DINE_IN' ||
      type === 'TABLE' ||
      type === 'TABLE_ORDER' ||
      text.includes('TABLE') ||
      text.includes('ORDER') ||
      text.includes('DINE-IN')
    ) {
      if (text.includes('TABLE')) {
        const p = isHotel ? '/hotel/tables' : isCafe ? '/cafe/tables' : '/mess/dining';
        return { path: p, label: t('tables', 'Tables') };
      }
      const p = isHotel ? '/hotel/orders' : isCafe ? '/cafe/order-history' : '/hotel/orders';
      return { path: p, label: t('orders', 'Orders') };
    }

    // 6. Inventory / Stock / Purchase -> Purchase / Inventory Module
    if (
      type === 'INVENTORY' ||
      type === 'STOCK' ||
      type === 'PURCHASE' ||
      type === 'SUPPLIER' ||
      type === 'LOW_STOCK' ||
      text.includes('STOCK') ||
      text.includes('INVENTORY') ||
      text.includes('PURCHASE') ||
      text.includes('BEANS') ||
      text.includes('THRESHOLD')
    ) {
      const p = isHotel ? '/hotel/purchasedashboard' : '/inventory';
      return { path: p, label: t('inventory', 'Inventory') };
    }

    // 7. Staff & Attendance -> Staff Module
    if (
      type === 'STAFF' ||
      type === 'ATTENDANCE' ||
      type === 'EMPLOYEE' ||
      type === 'SALARY' ||
      text.includes('STAFF') ||
      text.includes('ATTENDANCE') ||
      text.includes('SALARY')
    ) {
      return { path: '/hotel/staff', label: t('staff', 'Staff') };
    }

    // 8. Rooms & Bookings -> Rooms / Bookings Module
    if (
      type === 'ROOM' ||
      type === 'BOOKING' ||
      type === 'GUEST' ||
      text.includes('ROOM') ||
      text.includes('BOOKING') ||
      text.includes('GUEST') ||
      text.includes('CHECK-IN') ||
      text.includes('CHECK-OUT')
    ) {
      const p = text.includes('ROOM') ? '/hotel/rooms' : '/hotel/bookings';
      return { path: p, label: t('bookings', 'Bookings') };
    }

    // 9. Delivery & Dispatch -> Delivery / Orders Module
    if (
      type === 'DELIVERY' ||
      type === 'DISPATCH' ||
      text.includes('DELIVERY') ||
      text.includes('DISPATCHED') ||
      text.includes('RIDER') ||
      text.includes('ZOMATO') ||
      text.includes('SWIGGY')
    ) {
      const p = isHotel ? '/hotel/orders' : isMess ? '/mess/tiffin-dispatch' : '/hotel/orders';
      return { path: p, label: t('delivery', 'Delivery') };
    }

    // 10. Reports & GST -> Reports Module
    if (
      type === 'REPORT' ||
      type === 'GST' ||
      text.includes('REPORT') ||
      text.includes('GST')
    ) {
      return { path: '/hotelreport', label: t('reports', 'Reports') };
    }

    // 11. Settings & Offers -> Settings Module
    if (
      type === 'SETTING' ||
      type === 'SETTINGS' ||
      type === 'OFFER' ||
      text.includes('SETTING') ||
      text.includes('OFFER')
    ) {
      return { path: getSettingsPath(), label: t('settings', 'Settings') };
    }

    // Fallback default based on industry
    const defaultPath = isHotel ? '/hotel/dashboard' : isMess ? '/mess/dashboard' : isCafe ? '/cafe/dashboard' : '/';
    return { path: defaultPath, label: t('dashboard', 'Dashboard') };
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    setIsNotificationsOpen(false);

    // Synchronize navbar date filter to notification's date so target page displays data for this date
    let itemDateStr = '';
    if (item.createdAt) {
      try {
        itemDateStr = item.createdAt.split('T')[0];
      } catch {
        itemDateStr = '';
      }
    }

    if (itemDateStr) {
      setSelectedDateFilter(itemDateStr);
      localStorage.setItem('navbar_date_filter', itemDateStr);
      localStorage.setItem('navbar_start_date', itemDateStr);
      localStorage.setItem('navbar_end_date', itemDateStr);
      window.dispatchEvent(
        new CustomEvent('navbar-date-filter-changed', {
          detail: { filter: itemDateStr, startDate: itemDateStr, endDate: itemDateStr },
        })
      );
    }

    const target = resolveNotificationTarget(item);

    if (target.isSubscriptionModal) {
      window.dispatchEvent(
        new CustomEvent('open-subscription-modal', {
          detail: { mode: target.modalMode || 'renew' },
        })
      );
    } else if (target.path) {
      navigate(target.path, { state: { filterDate: itemDateStr, fromNotification: true } });
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const todayStr = new Date().toISOString().split('T')[0];
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterdayStr = y.toISOString().split('T')[0];
      const itemDateStr = dateStr.split('T')[0];

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (itemDateStr === todayStr) {
        return language === 'mr' ? `आज, ${timeStr}` : language === 'hi' ? `आज, ${timeStr}` : `Today, ${timeStr}`;
      } else if (itemDateStr === yesterdayStr) {
        return language === 'mr' ? `काल, ${timeStr}` : language === 'hi' ? `कल, ${timeStr}` : `Yesterday, ${timeStr}`;
      } else {
        const dateFormatted = d.toLocaleDateString(language === 'mr' || language === 'hi' ? 'hi-IN' : 'en-US', {
          day: '2-digit',
          month: 'short',
        });
        return `${dateFormatted}, ${timeStr}`;
      }
    } catch {
      return dateStr;
    }
  };

  const getLocalizedBranchName = (name?: string) => {
    if (!name || name === 'Main Branch' || name === 'Main') {
      return t('mainBranch', 'Main Branch');
    }
    return name;
  };

  const activeBranchName =
    selectedSubBranch && selectedSubBranch.id !== (selectedMainBranch?.id || mainBranch?.id)
      ? `${getLocalizedBranchName(selectedMainBranch?.name || mainBranch?.name)} → ${selectedSubBranch.name}`
      : getLocalizedBranchName(selectedMainBranch?.name || mainBranch?.name);

  const daysRemaining = currentRemainingDays;

  return (
    <header
      className="top-navbar"
      style={{
        backgroundColor: navTheme.bg,
        borderBottomColor: navTheme.border,
      }}
    >
      {/* ================= LEFT SECTION: Branch Selector ================= */}
      <div className="navbar-left">

        {/* Branch Context Selector Chip */}
        <div ref={branchDropdownRef} className="navbar-branch-wrapper">
          <div
            onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
            title={`Active Branch: ${activeBranchName}. Click to switch branch.`}
            className="navbar-branch-btn"
            style={{
              backgroundColor: navTheme.chipBg,
              border: `1.5px solid ${navTheme.chipBorder}`,
              color: navTheme.chipText,
            }}
          >
            <GitBranch size={15} color={navTheme.chipText} style={{ flexShrink: 0 }} />
            <span className="navbar-branch-name" title={activeBranchName}>
              {activeBranchName}
            </span>
            <ChevronDown
              size={13}
              color={navTheme.chipText}
              style={{
                flexShrink: 0,
                transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          {/* Branch Dropdown Panel */}
          {isBranchDropdownOpen && (
            <div className="navbar-dropdown-card" style={{ left: 0, width: '280px', padding: '8px' }}>
              <div
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#78716C',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('mainBranches', 'Main Branches')}
              </div>

              {mainBranches.map((mb) => {
                const isSelected = selectedMainBranch?.id === mb.id && !selectedSubBranch;
                return (
                  <div
                    key={mb.id}
                    onClick={() => {
                      setSelectedMainBranchId(mb.id);
                      setIsBranchDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isSelected ? 800 : 500,
                      backgroundColor: isSelected ? navTheme.chipBg : 'transparent',
                      color: isSelected ? navTheme.chipText : '#1C1917',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F5F5F4';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>🏢 {getLocalizedBranchName(mb.name)}</span>
                    {isSelected && <Check size={14} color={navTheme.chipText} />}
                  </div>
                );
              })}

              {subBranches.length > 0 && (
                <>
                  <div
                    style={{
                      padding: '8px 10px 4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#78716C',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderTop: '1px solid #F5F2ED',
                      marginTop: '6px',
                    }}
                  >
                    {t('subBranches', 'Sub-Branches')} ({getLocalizedBranchName(selectedMainBranch?.name)})
                  </div>
                  {subBranches.map((sb) => {
                    const isSelected = selectedBranch?.id === sb.id;
                    return (
                      <div
                        key={sb.id}
                        onClick={() => {
                          setSelectedSubBranchId(sb.id);
                          setIsBranchDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isSelected ? 800 : 500,
                          backgroundColor: isSelected ? navTheme.chipBg : 'transparent',
                          color: isSelected ? navTheme.chipText : '#1C1917',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F5F5F4';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ paddingLeft: '8px' }}>↳ {sb.name}</span>
                        {isSelected && <Check size={14} color={navTheme.chipText} />}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT SECTION: Trial Badge, Date, Bell, Profile, Logout ================= */}
      <div className="navbar-right">
        {/* Licence & 28-Day Free Trial Status Pill */}
        {(() => {
          const days = currentRemainingDays;
          const isTrial = licenceInfo?.trialStatus !== 'Not Started' || !licenceInfo?.subscriptionPlan || licenceInfo?.subscriptionPlan?.toLowerCase().includes('trial') || licenceInfo?.isEligibleForTrial === false;
          const isExpired = days <= 0;
          const isExpiringSoon = days > 0 && days <= 3;
          const planTitle = isTrial ? t('freeTrial28Days', '28 Days Free Trial') : (licenceInfo?.subscriptionPlan || 'Hotel Enterprise');

          const localizedDays = toDevanagari(days);
          const localized28 = toDevanagari(28);

          let badgeBg = navTheme.trialBg;
          let badgeBorder = navTheme.trialBorder;
          let badgeText = navTheme.trialText;
          let badgeLabel = isTrial
            ? `${t('freeTrial28Days', '28 Days Free Trial')} • ${localizedDays} ${t('daysLeft', 'days left')}`
            : `${planTitle} • ${localizedDays} ${t('daysLeft', 'days left')}`;
          let shortLabel = isTrial
            ? `${localized28}d ${t('trial', 'Trial')} • ${localizedDays}d`
            : `${localizedDays}d`;
          let statusText = t('active', 'Active');

          if (isExpired) {
            badgeBg = '#FEE2E2';
            badgeBorder = '#FCA5A5';
            badgeText = '#991B1B';
            badgeLabel = t('trialExpired', '28 Days Trial Expired');
            shortLabel = t('expired', 'Expired');
            statusText = t('expired', 'Expired');
          } else if (isExpiringSoon) {
            badgeBg = '#FEF3C7';
            badgeBorder = '#FDE68A';
            badgeText = '#92400E';
            badgeLabel = `${t('expiringSoon', 'Expiring Soon')} • ${localizedDays} ${t('daysLeft', 'days left')}`;
            shortLabel = `${localizedDays}d`;
            statusText = t('expiringSoon', 'Expiring Soon');
          }

          return (
            <div
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-subscription-modal', {
                    detail: { mode: isExpired ? 'upgrade' : 'renew' },
                  })
                );
              }}
              className="navbar-trial-badge"
              style={{
                backgroundColor: badgeBg,
                border: `1.5px solid ${badgeBorder}`,
                color: badgeText,
                cursor: 'pointer',
              }}
              title={`Subscription: ${planTitle} (${statusText}, ${days} Days Remaining). Click to manage plan.`}
            >
              <Zap size={14} fill={isExpired ? '#DC2626' : (isExpiringSoon ? '#D97706' : (navTheme.accent || '#E96500'))} color={isExpired ? '#DC2626' : (isExpiringSoon ? '#D97706' : (navTheme.accent || '#E96500'))} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.80rem', fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                <span className="navbar-trial-text-full">{badgeLabel}</span>
                <span className="navbar-trial-text-short">{shortLabel}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(
                    new CustomEvent('open-subscription-modal', {
                      detail: { mode: isExpired ? 'upgrade' : 'renew' },
                    })
                  );
                }}
                className="navbar-renew-btn"
                style={{
                  backgroundColor: isExpired ? '#DC2626' : (navTheme.accent || '#E96500'),
                  color: '#FFFFFF',
                }}
                title={isExpired ? 'Upgrade Subscription Plan' : 'Renew Subscription Plan'}
              >
                <RefreshCw size={10} style={{ flexShrink: 0 }} />
                <span>{isExpired ? t('upgradePlan', 'Upgrade Plan') : t('renew', 'Renew')}</span>
              </button>
            </div>
          );
        })()}

        {/* Multilingual Language Switcher (English / मराठी / हिंदी) */}
        <div ref={langDropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setIsLangDropdownOpen((prev) => !prev)}
            className="navbar-date-chip"
            style={{
              backgroundColor: navTheme.chipBg || '#FFF7ED',
              border: `1.5px solid ${navTheme.chipBorder || '#FED7AA'}`,
              color: navTheme.chipText || '#7C2D12',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '12px',
              transition: 'all 0.15s ease',
            }}
            title="Switch Language / भाषा निवडा / भाषा चुनें"
          >
            <Languages size={15} color={navTheme.chipText || '#7C2D12'} />
            <span style={{ fontWeight: 800 }}>
              {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}
            </span>
            <ChevronDown
              size={12}
              color={navTheme.chipText || '#7C2D12'}
              style={{
                transform: isLangDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          {isLangDropdownOpen && (
            <div
              className="navbar-dropdown-card"
              style={{
                right: 0,
                width: '160px',
                padding: '6px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18)',
                border: '1px solid #E2E8F0',
                zIndex: 1100,
              }}
            >
              {[
                { code: 'en', label: 'English', sub: 'Default' },
                { code: 'mr', label: 'मराठी', sub: 'Marathi' },
                { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
              ].map(({ code, label, sub }) => {
                const isSelected = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code as any);
                      setIsLangDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSelected ? (navTheme.chipBg || '#FFF7ED') : 'transparent',
                      color: isSelected ? (navTheme.accent || '#E96500') : '#1C1917',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{label}</span>
                    <small style={{ fontSize: '10px', color: isSelected ? (navTheme.accent || '#E96500') : '#A8A29E' }}>
                      {sub}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Central Server & Database Connection Status */}
        <CentralServerBadge variant="navbar" />

        {/* Current Date Chip (Display Only - No Filtering) */}
        <div style={{ position: 'relative' }}>
          <div
            className="navbar-date-chip"
            style={{
              backgroundColor: navTheme.dateBg,
              border: `1.5px solid ${navTheme.dateBorder}`,
              color: navTheme.dateText,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              userSelect: 'none',
            }}
            title={`Current Date: ${formattedDate}`}
          >
            <Calendar size={14} color={navTheme.dateText} style={{ flexShrink: 0 }} />
            <span className="navbar-date-full">{formattedDate}</span>
            <span className="navbar-date-short">{formattedDateShort}</span>
          </div>
        </div>

        {/* Notifications Icon Button & Panel */}
        <div ref={notificationPanelRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              if (!isNotificationsOpen) {
                fetchNotifications();
              }
            }}
            title="Notifications"
            className="navbar-icon-btn"
            style={{
              backgroundColor: navTheme.bellBg,
              borderColor: isNotificationsOpen ? navTheme.accent : navTheme.bellBorder,
              color: navTheme.bellColor,
            }}
          >
            <Bell size={17} color={navTheme.bellColor} />
            {unreadCount > 0 && (
              <span className="navbar-badge-count">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div
              className="navbar-dropdown-card"
              style={{
                right: 0,
                width: '380px',
                maxHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #F0ECE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FAFAF9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={17} color={navTheme.chipText} />
                  <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#1C1917' }}>
                    {t('notifications', 'Notifications')}
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '10px',
                        backgroundColor: navTheme.chipBg,
                        color: navTheme.chipText,
                        fontSize: '0.70rem',
                        fontWeight: 800,
                      }}
                    >
                      {unreadCount} {t('newBadge', 'New')}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: navTheme.accent,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {t('markAllRead', 'Mark all read')}
                  </button>
                )}
              </div>

              {/* Notification Date Filter Bar */}
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} color="#64748B" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
                      {t('filterByDate', 'Filter by Date')}:
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', color: '#94A3B8', fontWeight: 600 }}>
                    {displayedNotifications.length} {t('notifications', 'notifications')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'ALL', label: t('all', 'All') },
                    { key: 'TODAY', label: t('today', 'Today') },
                    { key: 'YESTERDAY', label: t('yesterday', 'Yesterday') },
                    { key: 'CUSTOM', label: t('pickDate', 'Pick Date 📅') },
                  ].map((f) => {
                    const isSel = notifDateFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          const newFilter = f.key as any;
                          setNotifDateFilter(newFilter);
                          if (newFilter === 'ALL') fetchNotifications('ALL');
                          else if (newFilter === 'TODAY') fetchNotifications('TODAY');
                          else if (newFilter === 'YESTERDAY') fetchNotifications('YESTERDAY');
                          else if (newFilter === 'CUSTOM') fetchNotifications(notifCustomDate);
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: isSel ? `1.5px solid ${navTheme.accent || '#E96500'}` : '1px solid #E2E8F0',
                          backgroundColor: isSel ? (navTheme.chipBg || '#FFF7ED') : '#FFFFFF',
                          color: isSel ? (navTheme.accent || '#E96500') : '#475569',
                          fontSize: '0.70rem',
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                {notifDateFilter === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <input
                      type="date"
                      value={notifCustomDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNotifCustomDate(val);
                        fetchNotifications(val);
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.72rem',
                        color: '#1E293B',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Notification List */}
              <div style={{ overflowY: 'auto', maxHeight: '380px', padding: '6px 0' }}>
                {loadingNotifications && notifications.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#78716C', fontSize: '0.85rem' }}>
                    {t('loadingNotifications', 'Loading notifications...')}
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                    <CheckCircle2 size={30} color="#16A34A" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#1C1917', fontSize: '0.9rem' }}>
                      {notifDateFilter === 'ALL'
                        ? t('allCaughtUp', 'All caught up!')
                        : (language === 'mr' ? 'या तारखेसाठी कोणतीही सूचना नाही' : language === 'hi' ? 'इस तारीख के लिए कोई सूचना नहीं है' : 'No notifications for this date')}
                    </div>
                    <div style={{ color: '#78716C', fontSize: '0.78rem', marginTop: '4px' }}>
                      {notifDateFilter === 'ALL'
                        ? t('noNewNotifications', 'No new notifications at this time.')
                        : (language === 'mr' ? 'दुसरी तारीख निवडून पहा किंवा सर्व सूचना तपासा.' : language === 'hi' ? 'अन्य तारीख चुनें या सभी सूचनाएं देखें।' : 'Try selecting another date or view all notifications.')}
                    </div>
                    {notifDateFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotifDateFilter('ALL');
                          fetchNotifications('ALL');
                        }}
                        style={{
                          marginTop: '10px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: navTheme.accent || '#E96500',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {language === 'mr' ? 'सर्व सूचना दाखवा' : language === 'hi' ? 'सभी सूचनाएं देखें' : 'Show All Notifications'}
                      </button>
                    )}
                  </div>
                ) : (
                  displayedNotifications.map((item) => {
                    const target = resolveNotificationTarget(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #F5F2ED',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          backgroundColor: item.read ? '#FFFFFF' : '#FFFBF5',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFF6EC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = item.read ? '#FFFFFF' : '#FFFBF5';
                        }}
                        title={`Click to open ${target.label} module`}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F5EFEB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          {getNotificationIcon(item.type)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: item.read ? 600 : 800,
                                fontSize: '0.84rem',
                                color: '#1C1917',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.title}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#A8A29E', flexShrink: 0 }}>
                              {formatTimestamp(item.createdAt)}
                            </span>
                          </div>

                          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#57534E', lineHeight: 1.35 }}>
                            {item.message}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', gap: '6px', flexWrap: 'wrap' }}>
                            {item.branchName && (
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#E7E5E4',
                                  color: '#44403C',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                }}
                              >
                                {item.branchName}
                              </span>
                            )}

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#FFF7ED',
                                color: '#C2410C',
                                border: '1px solid #FED7AA',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                marginLeft: 'auto',
                              }}
                            >
                              {target.label} →
                            </span>
                          </div>
                        </div>

                        {!item.read && (
                          <div
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: navTheme.accent,
                              flexShrink: 0,
                              marginTop: '6px',
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User / Owner Profile Chip & Dropdown */}
        <div ref={profileDropdownRef} className="navbar-profile-wrapper">
          <div
            onClick={() => setIsProfileOpen((prev) => !prev)}
            title={`Logged in as ${displayName} (${roleTitle})`}
            className="navbar-profile-chip"
            style={{
              backgroundColor: navTheme.profileBg,
              borderColor: isProfileOpen ? navTheme.accent : navTheme.profileBorder,
            }}
          >
            {/* Avatar Squircle Initial or Profile Photo */}
            <div
              className="navbar-avatar"
              style={{
                background: profileImage ? 'transparent' : navTheme.avatarBg,
                color: navTheme.avatarText,
                border: navTheme.avatarBorder,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                avatarLetter
              )}
            </div>

            {/* Display Name & Role */}
            <div className="navbar-profile-text">
              <div
                className="navbar-user-name"
                style={{ color: navTheme.businessColor }}
                title={displayName}
              >
                {displayName}
              </div>
              <div
                className="navbar-user-role"
                style={{ color: navTheme.roleColor }}
              >
                <span>{roleTitle}</span>
                <ChevronDown
                  size={11}
                  color={navTheme.roleColor}
                  style={{
                    transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          {isProfileOpen && (
            <div
              className="navbar-dropdown-card"
              style={{
                right: 0,
                width: '260px',
                padding: '10px',
              }}
            >
              {/* Profile Header */}
              <div
                style={{
                  padding: '8px 10px 12px',
                  borderBottom: '1px solid #F0ECE7',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  className="navbar-avatar"
                  style={{
                    width: '36px',
                    height: '36px',
                    fontSize: '1.05rem',
                    background: profileImage ? 'transparent' : navTheme.avatarBg,
                    color: navTheme.avatarText,
                    border: navTheme.avatarBorder,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    avatarLetter
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: '#1C1917',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.fullName || displayName}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#78716C',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.email || 'admin@pos.local'}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: navTheme.chipBg,
                        color: navTheme.chipText,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                      }}
                    >
                      {roleTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(isHotel ? '/hotel/settings?tab=profile' : '/settings?tab=profile');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1C1917',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={15} color="#57534E" />
                <span>{t('myProfile', 'My Profile')}</span>
              </div>

              <div
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(getSettingsPath());
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1C1917',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Settings size={15} color="#57534E" />
                <span>{t('systemSettings', 'System Settings')}</span>
              </div>

              <div
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(getPlansPath());
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1C1917',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Shield size={15} color="#57534E" />
                <span>{t('plansAndLicencing', 'Plans & Licencing')}</span>
              </div>

              <div
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate('/branches');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1C1917',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <GitBranch size={15} color="#57534E" />
                <span>{t('branchDirectory', 'Branch Directory')}</span>
              </div>

              <div style={{ height: '1px', backgroundColor: '#F0ECE7', margin: '6px 4px' }} />

              <div
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#DC2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={15} color="#DC2626" />
                <span>{t('signOut', 'Sign Out')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Standalone Logout Button */}
        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="navbar-logout-btn"
          style={{
            backgroundColor: navTheme.chipBg,
            borderColor: navTheme.chipBorder,
            color: navTheme.chipText,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Global Subscription Checkout Modal */}
      <SubscriptionModal onSuccess={fetchLicence} />
    </header>
  );
};

export default Navbar;
