import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { tableService, TableItem } from '../services/tableService';
import { orderService, Order } from '../services/orderService';
import { billingService } from '../services/billingService';
import { paymentService } from '../services/paymentService';
import { kotService, KotItem } from '../services/kotService';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { settingsService } from '../services/settingsService';
import { notificationService } from '../services/notificationService';
import { Invoice, Payment } from '../types';

import { useLanguage } from '../context/LanguageContext';
import { dialogService } from '../context/DialogContext';

import {
  ShoppingBag,
  Table2,
  ReceiptIndianRupee,
  Bike,
  Star,
  Utensils,
  ChefHat,
  Calendar,
  Clock,
  Sparkles,
  Shield,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  Tag,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  Wallet,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface OfferItem {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate: string;
  applicableCategory?: string;
  status: 'ACTIVE' | 'INACTIVE';
  tag?: string;
  isCustom?: boolean;
}

const DEFAULT_OFFERS: OfferItem[] = [
  {
    id: 'off-1',
    name: 'Weekend Offer Active!',
    code: 'WEEKEND10',
    description: 'Get flat 10% discount on all orders above ₹999.',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    applicableCategory: 'All Menu Items',
    status: 'ACTIVE',
    tag: 'WEEKEND SPECIAL',
  },
  {
    id: 'off-2',
    name: 'First Order Special',
    code: 'WELCOME100',
    description: 'Get ₹100 off on first online delivery order above ₹499.',
    discountType: 'FIXED',
    discountValue: 100,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    applicableCategory: 'Online Delivery',
    status: 'ACTIVE',
    tag: 'ONLINE ORDER',
  },
  {
    id: 'off-3',
    name: 'Family Feast Special',
    code: 'FEAST15',
    description: '15% off on dine-in party bookings & bill totals above ₹2,500.',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    applicableCategory: 'Dine-In',
    status: 'ACTIVE',
    tag: 'DINE-IN COMBO',
  },
];

export const HotelDashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const { t, formatNumber, formatDate, toDevanagari, language } = useLanguage();
  const formatMoney = (val: number | string, decimals = 2) => formatNumber(val, { asCurrency: true, decimals });

  const [stats, setStats] = useState<any>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kots, setKots] = useState<KotItem[]>([]);

  // Super Admin view mode check
  const isSuperAdminViewing = useMemo(() => {
    try {
      if (sessionStorage.getItem('superadmin_viewing_hotel') === 'true') return true;
      const raw = localStorage.getItem('superadmin_user') || localStorage.getItem('ajalkar_user') || localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        return Boolean(
          u?.role === 'SUPER_ADMIN' ||
          u?.role === 'PLATFORM_ADMIN' ||
          (u as any)?.isSuperAdmin ||
          u?.roles?.includes('ROLE_SUPER_ADMIN') ||
          u?.username?.toLowerCase() === 'superadmin'
        );
      }
    } catch {}
    return Boolean(
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'PLATFORM_ADMIN' ||
      (user as any)?.isSuperAdmin ||
      user?.roles?.includes('ROLE_SUPER_ADMIN') ||
      user?.username?.toLowerCase() === 'superadmin'
    );
  }, [user]);

  // Navbar Date Filter synchronization
  const [navDateFilter, setNavDateFilter] = useState<{
    filter: string;
    startDate: string;
    endDate: string;
  }>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      filter: localStorage.getItem('navbar_date_filter') || 'Today',
      startDate: localStorage.getItem('navbar_start_date') || todayStr,
      endDate: localStorage.getItem('navbar_end_date') || todayStr,
    };
  });

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Formatted date for visible display badge
  const formattedDashboardDate = useMemo(() => {
    const now = new Date();
    try {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };
      const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      return now.toLocaleDateString(locale, options);
    } catch {
      return now.toDateString();
    }
  }, [language]);

  useEffect(() => {
    const handleNavDate = (e: any) => {
      const { filter, startDate, endDate } = e.detail || {};
      const tStr = new Date().toISOString().split('T')[0];
      setNavDateFilter({
        filter: filter || 'Today',
        startDate: startDate || tStr,
        endDate: endDate || startDate || tStr,
      });
    };
    window.addEventListener('navbar-date-filter-changed', handleNavDate);
    return () => window.removeEventListener('navbar-date-filter-changed', handleNavDate);
  }, []);

  const handleResetDateFilter = () => {
    const tStr = new Date().toISOString().split('T')[0];
    setNavDateFilter({
      filter: 'Today',
      startDate: tStr,
      endDate: tStr,
    });
    localStorage.setItem('navbar_date_filter', 'Today');
    localStorage.setItem('navbar_start_date', tStr);
    localStorage.setItem('navbar_end_date', tStr);
    window.dispatchEvent(
      new CustomEvent('navbar-date-filter-changed', {
        detail: { filter: 'Today', startDate: tStr, endDate: tStr },
      })
    );
  };

  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const clean = dateStr.split('T')[0];
    if (navDateFilter.startDate && navDateFilter.filter && navDateFilter.filter !== 'Today') {
      const from = navDateFilter.startDate.split('T')[0];
      const to = (navDateFilter.endDate || navDateFilter.startDate).split('T')[0];
      if (from && clean < from) return false;
      if (to && clean > to) return false;
      return true;
    }
    // Default: Today
    return clean === todayStr;
  };

  // Configurable Dashboard display options (Requirement 2 & 3: Show/Hide Sections)
  const [displaySettings, setDisplaySettings] = useState<{
    todaysSales: boolean;
    salesOverview: boolean;
    paymentSummary: boolean;
    billRequests: boolean;
  }>(() => {
    try {
      const cached = localStorage.getItem('dashboard_display_config');
      if (cached) return { todaysSales: true, ...JSON.parse(cached) };
    } catch {}
    return { todaysSales: true, salesOverview: true, paymentSummary: true, billRequests: true };
  });

  const isOverviewOn = displaySettings.todaysSales !== false &&
    displaySettings.salesOverview !== false &&
    displaySettings.paymentSummary !== false;

  const handleToggleMasterOverview = async (val: boolean) => {
    const updated = {
      ...displaySettings,
      overviewSections: val,
      todaysSales: val,
      salesOverview: val,
      paymentSummary: val,
      billRequests: true,
    };
    setDisplaySettings(updated as any);
    try {
      localStorage.setItem('dashboard_display_config', JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new CustomEvent('dashboard-display-updated', { detail: updated }));
    try {
      await settingsService.saveSetting('dashboard', 'display_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist dashboard config:', e);
    }
  };

  const handleToggleDisplaySection = async (key: string, val: boolean) => {
    const updated = { ...displaySettings, [key]: val };
    setDisplaySettings(updated as any);
    try {
      localStorage.setItem('dashboard_display_config', JSON.stringify(updated));
    } catch {}
    window.dispatchEvent(new CustomEvent('dashboard-display-updated', { detail: updated }));
    try {
      await settingsService.saveSetting('dashboard', 'display_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist dashboard config:', e);
    }
  };

  // 1B. 28-Day Trial / Subscription State
  const [licenceInfo, setLicenceInfo] = useState<LicenceInfo | null>(null);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [activatingPlan, setActivatingPlan] = useState<boolean>(false);

  // 2. Offers State
  const [offers, setOffers] = useState<OfferItem[]>(DEFAULT_OFFERS);
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [showAddOfferModal, setShowAddOfferModal] = useState<boolean>(false);
  const [savingOffer, setSavingOffer] = useState<boolean>(false);
  const [offerSuccessMsg, setOfferSuccessMsg] = useState<string>('');

  // Add Offer Form State
  const [newOffer, setNewOffer] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    applicableCategory: 'All Menu Items',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  // Load licence / trial from SQL Server database
  const loadLicence = async () => {
    try {
      let info = await licenceService.getLicenceInfo();
      // If trial has never been activated, auto-start the 28-day trial and save to SQL Server
      if (info.trialStatus === 'Not Started' || !info.trialStartDate) {
        info = await licenceService.startFreeTrial();
      }
      setLicenceInfo(info);
    } catch (err) {
      console.warn('Failed to load licence info:', err);
    }
  };

  // Sync display settings from backend SQL Server
  useEffect(() => {
    settingsService.getSettings().then((all) => {
      const match = all.find((s) => s.category === 'dashboard' && s.settingKey === 'display_config');
      if (match?.settingValue) {
        try {
          const parsed = JSON.parse(match.settingValue);
          setDisplaySettings(parsed);
          localStorage.setItem('dashboard_display_config', JSON.stringify(parsed));
        } catch {}
      }
    }).catch(() => {});

    const handleDisplayUpdated = (e: any) => {
      if (e.detail) {
        setDisplaySettings(e.detail);
      }
    };
    window.addEventListener('dashboard-display-updated', handleDisplayUpdated);
    return () => window.removeEventListener('dashboard-display-updated', handleDisplayUpdated);
  }, []);

  // Load offers from SQL Server database
  const loadOffers = async () => {
    try {
      const allSettings = await settingsService.getSettings();
      const match = allSettings.find((s) => s.category === 'offers' && s.settingKey === 'hotel_offers');
      if (match && match.settingValue) {
        const parsed = JSON.parse(match.settingValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOffers(parsed);
          return;
        }
      }
      // If not present in DB yet, persist the default offers into SQL Server
      await settingsService.saveSetting('offers', 'hotel_offers', JSON.stringify(DEFAULT_OFFERS)).catch(() => {});
      setOffers(DEFAULT_OFFERS);
    } catch {
      setOffers(DEFAULT_OFFERS);
    }
  };

  useEffect(() => {
    loadLicence();
    loadOffers();
  }, []);

  // Load main dashboard operational data from backend with auto-refresh
  const fetchDashboardData = useCallback(async (silent = false) => {
    const branchId = selectedBranchId || 1;
    try {
      const [statsRes, tablesRes, ordersRes, invoicesRes, paymentsRes, kotsRes] = await Promise.allSettled([
        reportService.getDashboardStats(branchId),
        tableService.getTables(branchId ? { branchId } : undefined),
        orderService.getOrders(branchId),
        billingService.getInvoices(branchId),
        paymentService.getPayments(branchId),
        kotService.getKots(branchId),
      ]);
      if (statsRes.status === 'fulfilled' && statsRes.value) setStats(statsRes.value);

      let finalInvoices: Invoice[] = invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value) ? [...invoicesRes.value] : [];
      let finalPayments: Payment[] = paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value) ? [...paymentsRes.value] : [];
      let finalKots: KotItem[] = kotsRes.status === 'fulfilled' && Array.isArray(kotsRes.value) ? [...kotsRes.value] : [];

      // Seamlessly merge LocalStorage data from the Billing module (mess_invoices, mess_payments, pending_kots)
      try {
        const rawInv = localStorage.getItem('mess_invoices');
        if (rawInv) {
          const locals: any[] = JSON.parse(rawInv);
          if (Array.isArray(locals)) {
            locals.forEach((li) => {
              if (li.branchId && Number(li.branchId) !== Number(branchId)) return;
              const idx = finalInvoices.findIndex((inv) => Number(inv.id) === Number(li.id) || (li.invoiceNumber && inv.invoiceNumber === li.invoiceNumber));
              if (idx >= 0) {
                finalInvoices[idx] = { ...finalInvoices[idx], ...li };
              } else {
                finalInvoices.push(li as any);
              }
            });
          }
        }
        const rawPay = localStorage.getItem('mess_payments');
        if (rawPay) {
          const locals: any[] = JSON.parse(rawPay);
          if (Array.isArray(locals)) {
            locals.forEach((lp) => {
              if (lp.branchId && Number(lp.branchId) !== Number(branchId)) return;
              const idx = finalPayments.findIndex((p) => Number(p.id) === Number(lp.id) || (lp.invoiceNumber && p.invoiceNumber === lp.invoiceNumber));
              if (idx >= 0) {
                finalPayments[idx] = { ...finalPayments[idx], ...lp };
              } else {
                finalPayments.push(lp as any);
              }
            });
          }
        }

        // Seamlessly include any paid invoices that might not have a separate payment record
        finalInvoices.forEach((inv) => {
          if (inv.status === 'PAID') {
            const hasPayment = finalPayments.some(
              (p) => (p.invoiceId && Number(p.invoiceId) === Number(inv.id)) ||
                     (p.invoiceNumber && inv.invoiceNumber && p.invoiceNumber === inv.invoiceNumber)
            );
            if (!hasPayment) {
              const invAmt = Number(inv.paidAmount ?? inv.total ?? inv.grandTotal) || 0;
              if (invAmt > 0) {
                finalPayments.push({
                  id: `inv-pay-${inv.id || inv.invoiceNumber}`,
                  invoiceId: inv.id,
                  invoiceNumber: inv.invoiceNumber,
                  branchId: (inv as any).branchId || branchId,
                  amount: invAmt,
                  paymentMethod: (inv as any).paymentMethod || (inv as any).paymentMode || 'CASH',
                  paymentDate: inv.createdAt || inv.invoiceDate || new Date().toISOString(),
                  status: 'COMPLETED',
                } as any);
              }
            }
          }
        });
        const rawKot = localStorage.getItem('pending_kots');
        if (rawKot) {
          const locals: any[] = JSON.parse(rawKot);
          if (Array.isArray(locals)) {
            locals.forEach((lk) => {
              if (lk.branchId && Number(lk.branchId) !== Number(branchId)) return;
              const idx = finalKots.findIndex((k) => Number(k.id) === Number(lk.id) || (lk.kotNumber && k.kotNumber === lk.kotNumber));
              if (idx >= 0) {
                finalKots[idx] = { ...finalKots[idx], ...lk };
              } else {
                finalKots.push(lk as any);
              }
            });
          }
        }
      } catch {}

      // Resolve live tables status matching the exact operational logic of Tables.tsx
      const rawTables: TableItem[] = tablesRes.status === 'fulfilled' && Array.isArray(tablesRes.value) ? [...tablesRes.value] : [];
      const rawOrders: Order[] = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? [...ordersRes.value] : [];

      const paidOrderIds = new Set<number>();
      finalInvoices.forEach((inv) => {
        if (inv.status === 'PAID' && inv.orderId) {
          paidOrderIds.add(Number(inv.orderId));
        }
      });

      const activeOrdersByTable = new Map<number, any>();
      rawOrders.forEach((o: any) => {
        const isPaid = paidOrderIds.has(Number(o.id));
        if (
          o.tableId &&
          !isPaid &&
          o.status !== 'COMPLETED' &&
          o.status !== 'CANCELLED' &&
          o.status !== 'PAID' &&
          ((o.items && o.items.length > 0) || Number(o.totalAmount) > 0)
        ) {
          const tId = Number(o.tableId);
          const existing = activeOrdersByTable.get(tId);
          if (!existing || o.id > existing.id) {
            activeOrdersByTable.set(tId, o);
          }
        }
      });

      const nowMs = Date.now();
      const resolvedTables: TableItem[] = rawTables.map((t: any) => {
        const tId = Number(t.id);
        const cleaningKey = `table_cleaning_start_${tId}`;
        const cleaningStart = Number(localStorage.getItem(cleaningKey));

        // 1. Cleaning session check (<= 5 min)
        if (cleaningStart && !isNaN(cleaningStart)) {
          const elapsed = nowMs - cleaningStart;
          if (elapsed < 300000) {
            return {
              ...t,
              status: 'CLEANING' as any,
            };
          } else {
            localStorage.removeItem(cleaningKey);
            tableService.updateTableStatus(tId, 'AVAILABLE').catch(() => {});
          }
        }

        // 2. Active order check
        const activeOrd = activeOrdersByTable.get(tId);
        if (activeOrd) {
          const newStatus = activeOrd.status === 'BILL_REQUESTED' ? 'BILLING' : 'OCCUPIED';
          return {
            ...t,
            status: newStatus as any,
          };
        }

        // 3. No active order and no cleaning session: Table MUST be AVAILABLE
        const rawStatus = (t.status as string) || 'AVAILABLE';
        if (rawStatus === 'CLEANING' || rawStatus === 'OCCUPIED' || rawStatus === 'BILLING') {
          tableService.updateTableStatus(tId, 'AVAILABLE').catch(() => {});
          localStorage.removeItem(cleaningKey);
          return {
            ...t,
            status: 'AVAILABLE' as any,
          };
        }

        return {
          ...t,
          status: rawStatus as any,
        };
      });

      setTables(resolvedTables);
      setOrders(rawOrders);
      setInvoices(finalInvoices);
      setPayments(finalPayments);
      setKots(finalKots);
    } catch (err) {
      if (!silent) console.warn('Failed to load dashboard data:', err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchDashboardData();

    const handleLiveEvent = () => fetchDashboardData(true);
    window.addEventListener('order-updated', handleLiveEvent);
    window.addEventListener('table-status-changed', handleLiveEvent);
    window.addEventListener('payment-completed', handleLiveEvent);
    window.addEventListener('payment-created', handleLiveEvent);
    window.addEventListener('payment-saved', handleLiveEvent);
    window.addEventListener('billing-updated', handleLiveEvent);
    window.addEventListener('invoice-created', handleLiveEvent);
    window.addEventListener('invoice-paid', handleLiveEvent);
    window.addEventListener('kot-created', handleLiveEvent);
    window.addEventListener('kot-updated', handleLiveEvent);
    window.addEventListener('storage', handleLiveEvent);
    window.addEventListener('focus', handleLiveEvent);

    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('order-updated', handleLiveEvent);
      window.removeEventListener('table-status-changed', handleLiveEvent);
      window.removeEventListener('payment-completed', handleLiveEvent);
      window.removeEventListener('payment-created', handleLiveEvent);
      window.removeEventListener('payment-saved', handleLiveEvent);
      window.removeEventListener('billing-updated', handleLiveEvent);
      window.removeEventListener('invoice-created', handleLiveEvent);
      window.removeEventListener('invoice-paid', handleLiveEvent);
      window.removeEventListener('kot-created', handleLiveEvent);
      window.removeEventListener('kot-updated', handleLiveEvent);
      window.removeEventListener('storage', handleLiveEvent);
      window.removeEventListener('focus', handleLiveEvent);
    };
  }, [fetchDashboardData]);

  const displayName = user?.fullName || 'Admin';

  const getLocalizedUserName = (name: string) => {
    if (!name || name === 'Admin') return t('admin', 'Admin');
    if (name === 'Rahul Patil') {
      if (language === 'mr') return 'राहुल पाटील';
      if (language === 'hi') return 'राहुल पाटिल';
    }
    return name;
  };

  const formatTableName = (tableName: string) => {
    if (!tableName) return '';
    if (language === 'mr' || language === 'hi') {
      const tablePrefix = t('table', 'Table');
      let localized = tableName.replace(/Table/gi, tablePrefix);
      localized = toDevanagari(localized);
      return localized;
    }
    return tableName;
  };

  const getLocalizedOfferName = (name?: string) => {
    if (!name) return t('activeOffersDiscounts', 'Active Offers & Discounts');
    const lower = name.trim().toLowerCase();
    if (lower.includes('navratri') || lower.includes('festive')) {
      if (language === 'mr') return 'नवरात्र उत्सव विशेष ऑफर';
      if (language === 'hi') return 'नवरात्रि उत्सव विशेष ऑफ़र';
      return 'Navratri Festive Special';
    }
    if (lower.includes('weekend')) {
      if (language === 'mr') return 'वीकेंड ऑफर सक्रिय!';
      if (language === 'hi') return 'वीकेंड ऑफ़र सक्रिय!';
      return 'Weekend Offer Active!';
    }
    if (lower.includes('first order')) {
      if (language === 'mr') return 'पहिल्या ऑर्डरवर विशेष सवलत';
      if (language === 'hi') return 'पहले ऑर्डर पर विशेष छूट';
      return 'First Order Special';
    }
    if (lower.includes('family feast')) {
      if (language === 'mr') return 'फॅमिली फीस्ट विशेष सवलत';
      if (language === 'hi') return 'फैमिली फीस्ट स्पेशल';
      return 'Family Feast Special';
    }
    return t(name, name);
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };



  /* =========================================================
     CARD & ICON STYLES
  ========================================================= */
  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E7E5E4',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.035)',
  };

  const smallIcon = (bg: string, color: string): React.CSSProperties => ({
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: color,
  });

  // Operational datasets: today's data prioritized with full fallback
  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      const d = o.createdAt ? o.createdAt.split('T')[0] : '';
      return d === todayStr;
    });
    return list.length > 0 ? list : orders;
  }, [orders, todayStr]);

  const filteredInvoices = useMemo(() => {
    const list = invoices.filter((inv) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || '');
      return d === todayStr;
    });
    return list.length > 0 ? list : invoices;
  }, [invoices, todayStr]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const rawDate = p.paymentDate || (p as any).createdAt || (p as any).date || (p as any).paymentTime || '';
      let d = '';
      if (typeof rawDate === 'string' && rawDate) {
        d = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
      } else if (rawDate instanceof Date) {
        d = rawDate.toISOString().split('T')[0];
      }
      return d === todayStr;
    });
  }, [payments, todayStr]);

  // Table statistics
  const totalTablesCount = tables.length > 0 ? tables.length : Number(stats?.totalCafeTables) || 18;
  const occupiedTablesCount =
    tables.length > 0
      ? tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'BILLING').length
      : Number(stats?.occupiedCafeTables) || 0;
  const availableTablesCount =
    tables.length > 0
      ? tables.filter((t) => t.status === 'AVAILABLE').length
      : Math.max(0, totalTablesCount - occupiedTablesCount);
  const availablePercent = totalTablesCount > 0 ? Math.round((availableTablesCount / totalTablesCount) * 100) : 0;
  const occupiedPercent = totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;

  // Dynamic Sales & Payments Calculation matching actual DB
  const todayRevenue = useMemo(() => {
    const todayInvs = invoices.filter((inv) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || '');
      return d === todayStr;
    });
    const invRev = todayInvs.reduce((acc, inv) => acc + (Number(inv.total ?? inv.grandTotal) || 0), 0);
    const ordRev = orders.filter((o) => (o.createdAt || '').startsWith(todayStr)).reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    const backendRev = Number(stats?.todayRevenue ?? stats?.todayCafeSales) || 0;
    return Math.max(invRev, ordRev, backendRev);
  }, [invoices, orders, stats, todayStr]);

  // Orders Count (Strictly Today's Active Orders & Billed/Paid Transactions)
  const totalOrdersCount = useMemo(() => {
    // Map invoice ID to order ID to properly de-duplicate
    const invToOrderMap = new Map<number | string, number | string>();
    invoices.forEach((inv) => {
      if (inv.id && inv.orderId) {
        invToOrderMap.set(inv.id, inv.orderId);
        invToOrderMap.set(String(inv.id), inv.orderId);
      }
    });

    const todayOrderIds = new Set<string | number>();
    orders.forEach((o) => {
      const d = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (d === todayStr) todayOrderIds.add(o.id);
    });
    invoices.forEach((inv) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || '');
      if (d === todayStr) {
        const idKey = inv.orderId || `inv-${inv.id}`;
        todayOrderIds.add(idKey);
      }
    });
    payments.forEach((p) => {
      const rawDate = p.paymentDate || (p as any).createdAt || (p as any).date || '';
      let d = '';
      if (typeof rawDate === 'string' && rawDate) {
        d = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
      }
      if (d === todayStr) {
        const linkedOrderId = (p as any).orderId || (p.invoiceId ? invToOrderMap.get(p.invoiceId) : null);
        if (linkedOrderId) {
          todayOrderIds.add(linkedOrderId);
        } else if (p.invoiceId) {
          todayOrderIds.add(`inv-${p.invoiceId}`);
        } else {
          todayOrderIds.add(`pay-${p.id}`);
        }
      }
    });
    const fallbackCount = todayRevenue > 0 ? 1 : 0;
    return Math.max(todayOrderIds.size, fallbackCount);
  }, [orders, invoices, payments, todayRevenue, todayStr]);

  // Bill Requests matching the exact active flow of the Billing module (pendingKOTs & live orders/invoices)
  const billRequestItems = useMemo(() => {
    const paidOrderIds = new Set<number>();
    invoices.forEach((inv) => {
      if (inv.status === 'PAID' && inv.orderId) {
        paidOrderIds.add(Number(inv.orderId));
      }
    });

    const itemsList: Array<{
      id: string | number;
      orderId?: number;
      tableId?: number;
      invoiceId?: number;
      table: string;
      guestName?: string;
      amount: string;
      rawAmount: number;
      time: string;
      statusBadge: string;
      statusColor: { bg: string; border: string; text: string };
      priority: number;
    }> = [];

    const seenOrderIds = new Set<number>();
    const seenTableIds = new Set<number>();

    // Process active dining orders & KOTs (same flow as Billing module pendingKOTs)
    const activeOrders = orders.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'PAID' && !paidOrderIds.has(Number(o.id))
    );

    activeOrders.forEach((o) => {
      if (seenOrderIds.has(Number(o.id))) return;
      seenOrderIds.add(Number(o.id));
      if (o.tableId) seenTableIds.add(Number(o.tableId));

      const linkedInv = invoices.find((inv) => Number(inv.orderId) === Number(o.id) && inv.status !== 'PAID');
      let total = linkedInv ? (Number(linkedInv.dueAmount ?? linkedInv.grandTotal) || 0) : (Number(o.totalAmount) || 0);
      if (total <= 0 && o.items && o.items.length > 0) {
        total = o.items.reduce((sum: number, it: any) => sum + (Number(it.unitPrice || it.price || 0) * Number(it.quantity || it.qty || 1)), 0);
      }

      const matchedTable = tables.find((tb) => Number(tb.id) === Number(o.tableId));
      const matchedKot = kots.find((k) => Number(k.orderId) === Number(o.id));
      const isExplicitBillRequested = o.status === 'BILL_REQUESTED' || matchedTable?.status === 'BILLING' || matchedKot?.status === 'BILL_REQUESTED';
      const isKotReady = matchedKot?.status === 'READY' || matchedKot?.status === 'SERVED';

      // Strictly Billing Only: Exclude non-billing items with 0 amount unless explicit bill requested or linked invoice exists
      if (total <= 0 && !isExplicitBillRequested && !linkedInv) {
        return;
      }

      let statusBadge = t('pending', 'Pending');
      let statusColor = { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309' };
      let priority = 3;

      if (linkedInv) {
        statusBadge = linkedInv.status === 'PARTIAL' ? t('partial', 'Partial') : t('unpaid', 'Unpaid');
        statusColor = { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' };
        priority = 0;
      } else if (isExplicitBillRequested) {
        statusBadge = t('billRequested', 'Bill Requested');
        statusColor = { bg: '#FFEDD5', border: '#FED7AA', text: '#C2410C' };
        priority = 1;
      } else if (isKotReady) {
        statusBadge = t('readyToBill', 'Ready');
        statusColor = { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' };
        priority = 2;
      }

      const tableName = o.tableName
        ? (o.tableName.startsWith('Table') ? o.tableName : `Table ${o.tableName}`)
        : matchedTable?.name
        ? (matchedTable.name.startsWith('Table') ? matchedTable.name : `Table ${matchedTable.name}`)
        : o.tableId
        ? `Table ${o.tableId}`
        : `Order #${o.id}`;

      itemsList.push({
        id: `ord-${o.id}`,
        orderId: o.id,
        tableId: o.tableId ? Number(o.tableId) : undefined,
        invoiceId: linkedInv ? Number(linkedInv.id) : undefined,
        table: tableName,
        guestName: o.guestName,
        amount: formatMoney(total, 0),
        rawAmount: total,
        time: o.createdAt
          ? formatDate(o.createdAt, { showDayOfWeek: false, showTime: true })
          : isExplicitBillRequested
          ? t('billRequested', 'Bill Requested')
          : t('pending', 'Pending'),
        statusBadge,
        statusColor,
        priority,
      });
    });

    // C) Pending KOTs from localStorage (matching Billing module pending orders)
    let localKots: any[] = [];
    try {
      const raw = localStorage.getItem('pending_kots');
      if (raw) localKots = JSON.parse(raw);
      if (!Array.isArray(localKots)) localKots = [];
    } catch {}

    localKots.forEach((lk: any) => {
      const orderId = lk.orderId ? Number(lk.orderId) : undefined;
      const tableId = lk.tableId ? Number(lk.tableId) : undefined;
      if (orderId && (seenOrderIds.has(orderId) || paidOrderIds.has(orderId))) return;
      if (tableId && seenTableIds.has(tableId)) return;

      const itemsTotal = (lk.items || []).reduce(
        (sum: number, it: any) => sum + Number(it.price || it.unitPrice || 0) * Number(it.quantity || it.qty || 1),
        0
      );

      const linkedInv = orderId ? invoices.find((inv) => Number(inv.orderId) === Number(orderId) && inv.status !== 'PAID') : undefined;

      // Only include if there is actual amount > 0 or linked invoice or bill requested
      if (itemsTotal <= 0 && !linkedInv && lk.status !== 'BILL_REQUESTED') return;

      if (orderId) seenOrderIds.add(orderId);
      if (tableId) seenTableIds.add(tableId);

      itemsList.push({
        id: `kot-${lk.id}`,
        orderId,
        tableId,
        invoiceId: linkedInv ? Number(linkedInv.id) : undefined,
        table: lk.tableNumber
          ? (String(lk.tableNumber).startsWith('Table') ? lk.tableNumber : `Table ${lk.tableNumber}`)
          : tableId
          ? `Table ${tableId}`
          : `KOT #${lk.kotNumber || lk.id}`,
        guestName: lk.customerName,
        amount: formatMoney(itemsTotal, 0),
        rawAmount: itemsTotal,
        time: lk.createdAt ? formatDate(lk.createdAt, { showDayOfWeek: false, showTime: true }) : t('pending', 'Pending'),
        statusBadge: lk.status === 'READY' || lk.status === 'BILL_REQUESTED' ? t('readyToBill', 'Ready') : t('pending', 'Pending'),
        statusColor: lk.status === 'READY' || lk.status === 'BILL_REQUESTED'
          ? { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' }
          : { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309' },
        priority: lk.status === 'READY' ? 2 : 4,
      });
    });

    // Strictly Billing Only: Keep only items that belong to Billing (unpaid invoice, active billable amount > 0, or explicit bill request)
    // Non-billing data (such as dummy/empty occupied dining tables) is completely excluded
    const billingOnlyItems = itemsList.filter(
      (item) => item.invoiceId != null || item.rawAmount > 0 || item.statusBadge === t('billRequested', 'Bill Requested')
    );

    billingOnlyItems.sort((a, b) => a.priority - b.priority || b.rawAmount - a.rawAmount);
    return billingOnlyItems;
  }, [invoices, orders, tables, kots, t, formatMoney, formatDate]);

  // Additional overview metrics (strictly display-only)
  const totalItemsSold = filteredOrders.reduce((sum, o) => sum + (o.items?.reduce((isum, it) => isum + it.quantity, 0) || 0), 0);


  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let others = 0;

    if (filteredPayments && filteredPayments.length > 0) {
      filteredPayments.forEach((p) => {
        const amt = Number(p.amount) || 0;
        const method = (p.paymentMethod || '').toUpperCase();
        if (method === 'CASH') cash += amt;
        else if (method === 'UPI') upi += amt;
        else if (method === 'CARD' || method === 'DEBIT_CARD' || method === 'CREDIT_CARD') card += amt;
        else others += amt;
      });
    }

    const total = cash + upi + card + others;
    return {
      total,
      cash,
      upi,
      card,
      others,
      cashPct: total > 0 ? Math.round((cash / total) * 100) : 0,
      upiPct: total > 0 ? Math.round((upi / total) * 100) : 0,
      cardPct: total > 0 ? Math.round((card / total) * 100) : 0,
      othersPct: total > 0 ? Math.round((others / total) * 100) : 0,
    };
  }, [filteredPayments]);

  // Dynamic proportional Donut Chart segments for Payment Summary:
  const paymentDonutSegments = useMemo(() => {
    const { total, cash, upi, card, others } = paymentBreakdown;
    const r = 48;
    const circumference = 2 * Math.PI * r; // ~301.593
    if (total <= 0) return { segments: [], circumference, r };

    const modes = [
      { key: 'UPI', amount: upi, color: '#2563EB' },
      { key: 'Cash', amount: cash, color: '#16A34A' },
      { key: 'Card', amount: card, color: '#7C3AED' },
      { key: 'Others', amount: others, color: '#78716C' },
    ].filter((m) => m.amount > 0);

    const activeCount = modes.length;
    const gapAngle = activeCount > 1 ? 4 : 0;

    let accumulatedAngle = 0;
    const segments = modes.map((m) => {
      const ratio = m.amount / total;
      const totalDegrees = ratio * 360;
      const visibleDegrees = Math.max(1, totalDegrees - gapAngle);
      const arcLength = (visibleDegrees / 360) * circumference;
      const rotation = -90 + accumulatedAngle + (gapAngle / 2);
      accumulatedAngle += totalDegrees;

      return {
        key: m.key,
        color: m.color,
        strokeDasharray: `${arcLength.toFixed(1)} ${circumference.toFixed(1)}`,
        rotation,
      };
    });

    return { segments, circumference, r };
  }, [paymentBreakdown]);

  const displayBillRequests = billRequestItems;

  // Average Bill Value: Today's Revenue divided by Today's Billed/Order Count
  const avgBillValue = useMemo(() => {
    if (todayRevenue <= 0) return 0;
    const count = Math.max(1, totalOrdersCount);
    return Math.round(todayRevenue / count);
  }, [todayRevenue, totalOrdersCount]);

  // Total Customers: Unique customers served today from Invoices, Orders and Payments
  const totalCustomers = useMemo(() => {
    const custSet = new Set<string>();
    invoices.forEach((inv) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || '');
      if (d === todayStr) {
        const name = (inv.guestName || (inv as any).customerName || '').trim();
        if (name && name.toLowerCase() !== 'walk-in guest' && name.toLowerCase() !== 'guest') {
          custSet.add(name.toLowerCase());
        }
      }
    });
    orders.forEach((o) => {
      const d = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (d === todayStr) {
        const name = (o.guestName || '').trim();
        if (name && name.toLowerCase() !== 'walk-in guest' && name.toLowerCase() !== 'guest') {
          custSet.add(name.toLowerCase());
        }
      }
    });
    payments.forEach((p) => {
      const rawDate = p.paymentDate || (p as any).createdAt || '';
      let d = '';
      if (typeof rawDate === 'string' && rawDate) {
        d = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
      }
      if (d === todayStr) {
        const name = ((p as any).customerName || (p as any).guestName || '').trim();
        if (name && name.toLowerCase() !== 'walk-in guest' && name.toLowerCase() !== 'guest') {
          custSet.add(name.toLowerCase());
        }
      }
    });
    const uniqueKnown = custSet.size;
    return uniqueKnown > 0 ? uniqueKnown : totalOrdersCount;
  }, [invoices, orders, payments, totalOrdersCount, todayStr]);

  // Total Discounts: Actual sum of discounts given on today's invoices and orders
  const totalDiscounts = useMemo(() => {
    let sum = 0;
    invoices.forEach((inv) => {
      const d = inv.createdAt ? inv.createdAt.split('T')[0] : (inv.invoiceDate || '');
      if (d === todayStr) {
        sum += Number(inv.discountAmount || (inv as any).discount || 0);
      }
    });
    orders.forEach((o) => {
      const d = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (d === todayStr) {
        sum += Number(o.discount || 0);
      }
    });
    return Math.round(sum);
  }, [invoices, orders, todayStr]);

  /* =========================================================
     OFFERS HANDLERS (2)
  ========================================================= */
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.name.trim() || !newOffer.code.trim()) {
      dialogService.alert({
        title: 'Incomplete Offer Details',
        message: 'Please provide Offer Name and Offer Code.',
        type: 'warning',
      });
      return;
    }
    const val = Number(newOffer.discountValue);
    if (!val || val <= 0) {
      dialogService.alert({
        title: 'Invalid Discount',
        message: 'Please enter a valid positive discount value.',
        type: 'warning',
      });
      return;
    }

    try {
      setSavingOffer(true);
      const createdItem: OfferItem = {
        id: `off-${Date.now()}`,
        name: newOffer.name.trim(),
        code: newOffer.code.trim().toUpperCase(),
        description: newOffer.description.trim() || `${val}${newOffer.discountType === 'PERCENTAGE' ? '%' : '₹'} discount offer.`,
        discountType: newOffer.discountType,
        discountValue: val,
        startDate: newOffer.startDate,
        endDate: newOffer.endDate,
        applicableCategory: newOffer.applicableCategory,
        status: newOffer.status,
        tag: newOffer.discountType === 'PERCENTAGE' ? `${val}% OFF` : `FLAT ₹${val} OFF`,
        isCustom: true,
      };

      const updated = [createdItem, ...offers];
      // Save directly to SQL Server database
      await settingsService.saveSetting('offers', 'hotel_offers', JSON.stringify(updated));

      // Trigger event notification stored in SQL Server
      await notificationService.createNotification({
        type: 'OFFER',
        title: 'New Offer Published',
        message: `Offer "${createdItem.name}" (${createdItem.code} - ${val}${createdItem.discountType === 'PERCENTAGE' ? '%' : '₹'} OFF) has been successfully activated.`,
      }).catch(() => {});

      setOffers(updated);
      setShowAddOfferModal(false);
      setOfferSuccessMsg(`Offer "${createdItem.name}" saved successfully to SQL Server!`);
      setTimeout(() => setOfferSuccessMsg(''), 4000);

      // Reset form
      setNewOffer({
        name: '',
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        applicableCategory: 'All Menu Items',
        status: 'ACTIVE',
      });
    } catch (err: any) {
      dialogService.alert({
        title: 'Failed to Save Offer',
        message: 'Failed to save offer to database: ' + (err?.message || 'Error'),
        type: 'error',
      });
    } finally {
      setSavingOffer(false);
    }
  };

  const handleToggleOfferStatus = async (offerId: string) => {
    try {
      const updated = offers.map((o) =>
        o.id === offerId ? { ...o, status: (o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE' } : o
      );
      await settingsService.saveSetting('offers', 'hotel_offers', JSON.stringify(updated));
      setOffers(updated);
    } catch (err) {
      console.warn('Failed to toggle offer status:', err);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    const confirmed = await dialogService.confirm({
      title: 'Delete Offer',
      message: 'Are you sure you want to delete this offer? This action cannot be undone.',
      confirmVariant: 'danger',
      confirmText: 'Delete Offer',
    });
    if (!confirmed) return;
    try {
      const updated = offers.filter((o) => o.id !== offerId);
      await settingsService.saveSetting('offers', 'hotel_offers', JSON.stringify(updated));
      setOffers(updated);
    } catch (err) {
      console.warn('Failed to delete offer:', err);
    }
  };

  /* =========================================================
     PLAN / TRIAL ACTIVATION HANDLER (1B)
  ========================================================= */
  const handleActivatePaidPlan = async (planName: string, durationMonths = 12) => {
    try {
      setActivatingPlan(true);
      const updated = await licenceService.renewSubscription(durationMonths);
      await settingsService.saveSetting('licence', 'subscription_plan', planName);
      updated.subscriptionPlan = planName;
      setLicenceInfo(updated);

      await notificationService.createNotification({
        type: 'SUBSCRIPTION',
        title: 'Plan Activated Successfully',
        message: `${planName} has been activated. Validity valid for ${durationMonths * 30} days.`,
      }).catch(() => {});

      setShowPlanModal(false);
      dialogService.alert({
        title: 'Plan Activated',
        message: `Success! ${planName} is now active.`,
        type: 'success',
      });
    } catch (err: any) {
      dialogService.alert({
        title: 'Activation Failed',
        message: 'Failed to activate plan: ' + (err?.message || 'Error'),
        type: 'error',
      });
    } finally {
      setActivatingPlan(false);
    }
  };

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
    const interval = setInterval(calculateDays, 60000);
    return () => clearInterval(interval);
  }, [licenceInfo?.trialEndDate, licenceInfo?.daysRemaining]);

  const formatDisplayDate = (d?: string | null): string => {
    if (!d) return '';
    try {
      return formatDate(d, { showDayOfWeek: false });
    } catch {
      return d.split('T')[0];
    }
  };

  const daysLeft = currentRemainingDays;
  const isTrial = licenceInfo?.trialStatus !== 'Not Started' || !licenceInfo?.subscriptionPlan || licenceInfo?.subscriptionPlan?.toLowerCase().includes('trial') || licenceInfo?.isEligibleForTrial === false;
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;
  const planStatusLabel = isExpired
    ? t('expired', 'Expired')
    : isExpiringSoon
    ? t('expiringSoon', 'Expiring Soon')
    : t('active', 'Active');

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        color: '#1C1917',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        padding: '4px 0 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Super Admin Preview Return Banner */}
      {isSuperAdminViewing && (
        <div
          style={{
            backgroundColor: '#1E1B4B',
            border: '1.5px solid #6366F1',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} color="#A5B4FC" />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF' }}>
                {language === 'mr' ? 'सुपर ॲडमिन हॉटेल व्ह्यू' : 'Super Admin Hotel Preview Mode'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#CBD5E1' }}>
                {language === 'mr'
                  ? 'तुम्ही सध्या सुपर ॲडमिन म्हणून हॉटेलचा थेट डेटा पाहत आहात.'
                  : 'You are viewing live hotel operations in authorized Super Admin preview mode.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem('superadmin_viewing_hotel');
              } catch {}
              window.location.href = '/superadmin/dashboard';
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4338CA'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4F46E5'; }}
          >
            <ArrowLeft size={16} />
            <span>{language === 'mr' ? 'सुपर ॲडमिनकडे परत जा' : 'Back to Super Admin'}</span>
          </button>
        </div>
      )}

      {/* =====================================================
          PAGE HEADER (Clean, Professional - Screenshot 1 Layout)
      ===================================================== */}
      <div
        className="hotel-dashboard-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
              letterSpacing: '-0.03em',
            }}
          >
            {t('dashboard', 'Dashboard')}
          </h1>
        </div>

        <div>
          <button
            type="button"
            role="switch"
            aria-checked={isOverviewOn}
            aria-label={isOverviewOn ? 'Hide Dashboard Overview' : 'Show Dashboard Overview'}
            title={isOverviewOn ? (language === 'mr' ? 'डॅशबोर्ड लपवा' : language === 'hi' ? 'डैशबोर्ड छुपाएं' : 'Hide Dashboard Overview') : (language === 'mr' ? 'डॅशबोर्ड दाखवा' : language === 'hi' ? 'डैशबोर्ड दिखाएं' : 'Show Dashboard Overview')}
            onClick={() => handleToggleMasterOverview(!isOverviewOn)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              borderRadius: '24px',
              border: `1.5px solid ${isOverviewOn ? '#EA580C' : '#CBD5E1'}`,
              backgroundColor: isOverviewOn ? '#FFF7ED' : '#F8FAFC',
              color: isOverviewOn ? '#EA580C' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {isOverviewOn ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      </div>

      {/* Offer Feedback Alert */}
      {offerSuccessMsg && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#065F46',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{offerSuccessMsg}</span>
        </div>
      )}





      {/* =====================================================
          TOP 4 STATISTICS CARDS (Clean, Matching Screenshot 1)
          1: Today's Sales | 2: Today's Orders | 3: Available Tables | 4: Occupied Tables
      ===================================================== */}
      <div
        className="hotel-dashboard-top-cards"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
          marginBottom: '16px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* CARD 1: TODAY'S SALES */}
        {displaySettings.todaysSales !== false && (
          <div
            onClick={() => navigate('/hotel/payments')}
            title={t('clickToViewPayments', "Click to view Payments")}
            style={{
              ...cardStyle,
              padding: '16px',
              minHeight: '88px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = cardStyle.boxShadow || 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dashboard-kpi-icon" style={smallIcon('#F5F5F4', '#1C1917')}>
                <ReceiptIndianRupee size={22} />
              </div>

              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div className="dashboard-kpi-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#57534E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('todaysSales', "Today's Sales")}
                </div>
                <div
                  className="dashboard-kpi-value"
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    marginTop: '3px',
                    color: '#1C1917',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {formatMoney(todayRevenue, 2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARD 2: TODAY'S ORDERS */}
        <div
          onClick={() => navigate('/hotelbilling')}
          title={t('clickToViewBilling', "Click to view Billing & Orders")}
          style={{
            ...cardStyle,
            padding: '16px',
            minHeight: '88px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = cardStyle.boxShadow || 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dashboard-kpi-icon" style={smallIcon('#EFF6FF', '#2563EB')}>
              <ShoppingBag size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div className="dashboard-kpi-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#57534E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('todaysOrders', "Today's Orders")}
              </div>
              <div
                className="dashboard-kpi-value"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  marginTop: '3px',
                  color: '#2563EB',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {toDevanagari(totalOrdersCount)}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: AVAILABLE TABLES */}
        <div
          onClick={() => navigate('/hotel/tables?status=AVAILABLE', { state: { statusFilter: 'AVAILABLE' } })}
          title={t('clickToViewAvailableTables', "Click to view Available Tables")}
          style={{
            ...cardStyle,
            padding: '16px',
            minHeight: '88px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = cardStyle.boxShadow || 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dashboard-kpi-icon" style={smallIcon('#EAF8EF', '#16A34A')}>
              <Table2 size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div className="dashboard-kpi-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#57534E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('availableTables', 'Available Tables')}
              </div>
              <div
                className="dashboard-kpi-value"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  marginTop: '3px',
                  color: '#16A34A',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {toDevanagari(availableTablesCount)} / {toDevanagari(totalTablesCount)}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: OCCUPIED TABLES */}
        <div
          onClick={() => navigate('/hotel/tables?status=OCCUPIED', { state: { statusFilter: 'OCCUPIED' } })}
          title={t('clickToViewOccupiedTables', "Click to view Occupied Tables")}
          style={{
            ...cardStyle,
            padding: '16px',
            minHeight: '88px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = cardStyle.boxShadow || 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dashboard-kpi-icon" style={smallIcon('#FEEFEF', '#E3342F')}>
              <Table2 size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div className="dashboard-kpi-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#57534E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('occupiedTables', 'Occupied Tables')}
              </div>
              <div
                className="dashboard-kpi-value"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  marginTop: '3px',
                  color: '#E3342F',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {toDevanagari(occupiedTablesCount)} / {toDevanagari(totalTablesCount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          MIDDLE SECTION: 3 COLUMNS (Screenshot 1 Layout)
          Col 1: Sales Overview (Today) with Line Chart & 3 summary cards
          Col 2: Bill Requests (Pending Table List)
          Col 3: Payment Summary (Today) with Donut Chart
      ===================================================== */}
      {(() => {
        const showSales = displaySettings.salesOverview !== false;
        const showBills = displaySettings.billRequests !== false;
        const showPayment = displaySettings.paymentSummary !== false;

        if (!showSales && !showBills && !showPayment) return null;

        let gridCols = 'repeat(auto-fit, minmax(280px, 1fr))';
        if (showSales && showBills && showPayment) {
          gridCols = 'minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)';
        } else if (showSales && showBills && !showPayment) {
          gridCols = 'minmax(0, 1.3fr) minmax(0, 1fr)';
        } else if (!showSales && showBills && showPayment) {
          gridCols = 'minmax(0, 1.1fr) minmax(0, 1fr)';
        } else if (showSales && !showBills && showPayment) {
          gridCols = 'minmax(0, 1.3fr) minmax(0, 1fr)';
        } else if ((showSales ? 1 : 0) + (showBills ? 1 : 0) + (showPayment ? 1 : 0) === 1) {
          gridCols = '1fr';
        }

        return (
          <div
            className="hotel-dashboard-main-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* ===================================================
                COLUMN 1: SALES OVERVIEW (Today)
            =================================================== */}
            {showSales && (
              <div
                style={{
                  ...cardStyle,
                  order: 1,
                  padding: '20px',
                  minHeight: '360px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('salesOverview', 'SALES OVERVIEW (Today)')}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '2px' }}>
                {t('totalSales', 'Total Sales')}
              </div>
              <div
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  color: '#EA580C',
                  marginTop: '4px',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatMoney(todayRevenue, 2)}
              </div>

              {/* Clean SVG Area & Line Chart matching Screenshot 1 */}
              <div style={{ width: '100%', height: '170px', marginTop: '12px', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 460 170" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB923C" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#FB923C" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="38" y1="20" x2="450" y2="20" stroke="#F5F5F4" strokeDasharray="3 3" />
                  <line x1="38" y1="60" x2="450" y2="60" stroke="#F5F5F4" strokeDasharray="3 3" />
                  <line x1="38" y1="100" x2="450" y2="100" stroke="#F5F5F4" strokeDasharray="3 3" />
                  <line x1="38" y1="140" x2="450" y2="140" stroke="#E7E5E4" />

                  {/* Y-Axis Labels */}
                  <text x="30" y="24" textAnchor="end" fontSize="10" fill="#A8A29E" fontWeight="600">₹6k</text>
                  <text x="30" y="64" textAnchor="end" fontSize="10" fill="#A8A29E" fontWeight="600">₹4k</text>
                  <text x="30" y="104" textAnchor="end" fontSize="10" fill="#A8A29E" fontWeight="600">₹2k</text>
                  <text x="30" y="144" textAnchor="end" fontSize="10" fill="#A8A29E" fontWeight="600">₹0</text>

                  {/* Area Fill */}
                  <path
                    d="M 45 140 Q 115 130, 160 85 T 270 55 T 370 32 L 445 18 L 445 140 Z"
                    fill="url(#salesGradient)"
                  />

                  {/* Orange Trend Line */}
                  <path
                    d="M 45 140 Q 115 130, 160 85 T 270 55 T 370 32 L 445 18"
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Points on Line */}
                  <circle cx="45" cy="140" r="3.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2.5" />
                  <circle cx="160" cy="85" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />
                  <circle cx="270" cy="55" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />
                  <circle cx="370" cy="32" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />
                  <circle cx="445" cy="18" r="4.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="3" />

                  {/* X-Axis Time Labels */}
                  <text x="45" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">6 AM</text>
                  <text x="125" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">9 AM</text>
                  <text x="205" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">12 PM</text>
                  <text x="285" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">3 PM</text>
                  <text x="365" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">6 PM</text>
                  <text x="445" y="162" textAnchor="middle" fontSize="10" fill="#78716C" fontWeight="600">9 PM</text>
                </svg>
              </div>
            </div>

            {/* 3 Bottom Summary Metrics Cards matching Screenshot 1 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginTop: '16px',
              }}
            >
              {/* Average Bill Value */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#4B5563', fontWeight: 600 }}>
                  {t('averageBillValue', 'Average Bill Value')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                  ₹{formatNumber(avgBillValue, { decimals: 0 })}
                </div>
              </div>

              {/* Total Customers */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#4B5563', fontWeight: 600 }}>
                  {t('totalCustomers', 'Total Customers')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                  {formatNumber(totalCustomers, { decimals: 0 })}
                </div>
              </div>

              {/* Total Discounts */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#4B5563', fontWeight: 600 }}>
                  {t('totalDiscounts', 'Total Discounts')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                  ₹{formatNumber(totalDiscounts, { decimals: 0 })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            COLUMN 2: BILL REQUESTS (Matching Screenshot 1)
        =================================================== */}
        {showBills && (
          <div
            style={{
              ...cardStyle,
              order: (!showSales && !showPayment) ? 1 : 2,
              padding: '20px',
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('billRequests', 'BILL REQUESTS')}
                </h3>
              </div>
              <button
                onClick={() => navigateTo('/hotelbilling')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EA580C',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('viewAll', 'View All')} →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
              {displayBillRequests.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    padding: '30px 10px',
                    textAlign: 'center',
                    color: '#A8A29E',
                  }}
                >
                  <ReceiptIndianRupee size={34} color="#D6D3D1" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#78716C' }}>
                    {language === 'mr' ? 'कोणतीही बिल विनंती प्रलंबित नाही' : language === 'hi' ? 'कोई बिल अनुरोध लंबित नहीं है' : 'No Bill Requests Pending'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#A8A29E', marginTop: '3px' }}>
                    {language === 'mr' ? 'सध्या कोणतीही ऑक्युपाइड टेबल बिल विनंती उपलब्ध नाही.' : language === 'hi' ? 'वर्तमान में कोई बिल अनुरोध उपलब्ध नहीं है।' : 'No occupied-table orders currently waiting for billing.'}
                  </div>
                </div>
              ) : (
                displayBillRequests.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => {
                      if (item.invoiceId) {
                        navigateTo(`/hotelbilling?invoiceId=${item.invoiceId}&orderId=${item.orderId || ''}&tableId=${item.tableId || ''}`);
                      } else if (item.orderId && item.tableId) {
                        navigateTo(`/hotelbilling?orderId=${item.orderId}&tableId=${item.tableId}`);
                      } else if (item.orderId) {
                        navigateTo(`/hotelbilling?orderId=${item.orderId}`);
                      } else if (item.tableId) {
                        navigateTo(`/hotelbilling?tableId=${item.tableId}`);
                      } else {
                        navigateTo('/hotelbilling');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#FAFAF9',
                      border: '1px solid #F5F5F4',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF8F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF9')}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#FFF0ED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ReceiptIndianRupee size={17} color="#E3342F" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span>{formatTableName(item.table)}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C', marginTop: '2px' }}>
                        {t('amount', 'Amount')}: <strong style={{ color: '#1C1917' }}>{toDevanagari(item.amount)}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: item.statusColor?.bg || '#FEF3C7',
                            border: `1px solid ${item.statusColor?.border || '#FDE68A'}`,
                            color: item.statusColor?.text || '#B45309',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.statusBadge || t('pending', 'Pending')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.invoiceId) {
                              navigateTo(`/hotelbilling?invoiceId=${item.invoiceId}&orderId=${item.orderId || ''}&tableId=${item.tableId || ''}`);
                            } else if (item.orderId && item.tableId) {
                              navigateTo(`/hotelbilling?orderId=${item.orderId}&tableId=${item.tableId}`);
                            } else if (item.orderId) {
                              navigateTo(`/hotelbilling?orderId=${item.orderId}`);
                            } else if (item.tableId) {
                              navigateTo(`/hotelbilling?tableId=${item.tableId}`);
                            } else {
                              navigateTo('/hotelbilling');
                            }
                          }}
                          style={{
                            backgroundColor: '#EA580C',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '3px 8px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C2410C')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EA580C')}
                        >
                          {language === 'mr' ? 'बिल करा' : language === 'hi' ? 'बिल बनाएं' : 'Bill'} →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            COLUMN 3: PAYMENT SUMMARY (Today) (Matching Screenshot 1)
        =================================================== */}
        {showPayment && (
          <div
            style={{
              ...cardStyle,
              order: !showSales ? 1 : 3,
              padding: '20px',
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('paymentSummary', 'PAYMENT SUMMARY (Today)')}
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('/hotelpayment')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EA580C',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {t('viewPayments', 'View Payments →')}
                </button>
              </div>

              {/* Donut Chart & Legend Grid */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '10px 0',
                }}
              >
                {/* SVG Donut Chart */}
                <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    {/* Background ring */}
                    <circle
                      cx="65"
                      cy="65"
                      r="48"
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                    />
                    {/* Dynamic Proportional Segments */}
                    {paymentDonutSegments.segments.map((seg) => (
                      <circle
                        key={seg.key}
                        cx="65"
                        cy="65"
                        r="48"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        transform={`rotate(${seg.rotation} 65 65)`}
                      />
                    ))}
                  </svg>
                  {/* Center Text inside Donut Hole */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      padding: '0 4px',
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {t('total', 'TOTAL')}
                    </span>
                    <strong
                      style={{
                        fontSize: formatMoney(paymentBreakdown.total, 0).length > 13
                          ? '0.74rem'
                          : formatMoney(paymentBreakdown.total, 0).length > 10
                          ? '0.82rem'
                          : '0.92rem',
                        fontWeight: 900,
                        color: '#1C1917',
                        maxWidth: '82px',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={formatMoney(paymentBreakdown.total, 0)}
                    >
                      {formatMoney(paymentBreakdown.total, 0)}
                    </strong>
                  </div>
                </div>

                {/* Legend List matching Screenshot 1 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Cash */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                      <span style={{ color: '#44403C', fontWeight: 600 }}>{t('cash', 'Cash')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1C1917' }}>{formatMoney(paymentBreakdown.cash, 0)}</strong>
                      <span style={{ color: '#78716C', minWidth: '38px', textAlign: 'right' }}>({toDevanagari(paymentBreakdown.cashPct)}%)</span>
                    </div>
                  </div>

                  {/* UPI */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
                      <span style={{ color: '#44403C', fontWeight: 600 }}>{t('upi', 'UPI')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1C1917' }}>{formatMoney(paymentBreakdown.upi, 0)}</strong>
                      <span style={{ color: '#78716C', minWidth: '38px', textAlign: 'right' }}>({toDevanagari(paymentBreakdown.upiPct)}%)</span>
                    </div>
                  </div>

                  {/* Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} />
                      <span style={{ color: '#44403C', fontWeight: 600 }}>{t('card', 'Card')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1C1917' }}>{formatMoney(paymentBreakdown.card, 0)}</strong>
                      <span style={{ color: '#78716C', minWidth: '38px', textAlign: 'right' }}>({toDevanagari(paymentBreakdown.cardPct)}%)</span>
                    </div>
                  </div>

                  {/* Others */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#78716C', display: 'inline-block' }} />
                      <span style={{ color: '#44403C', fontWeight: 600 }}>{t('others', 'Others')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1C1917' }}>{formatMoney(paymentBreakdown.others, 0)}</strong>
                      <span style={{ color: '#78716C', minWidth: '38px', textAlign: 'right' }}>({toDevanagari(paymentBreakdown.othersPct)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Total Collection Card */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#FFF8F2',
                border: '1px solid #FED7AA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFE8D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wallet size={16} color="#E96500" />
                </div>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#78716C' }}>
                  {t('totalCollection', 'Total Collection')}
                </span>
              </div>
              <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1C1917' }}>
                {formatMoney(paymentBreakdown.total, 0)}
              </strong>
            </div>
          </div>
        )}
      </div>
    );
  })()}

      {/* Active Offers Banner (Preserved) */}
      <div
        style={{
          ...cardStyle,
          padding: '14px 20px',
          background: '#FFF8EF',
          border: '1px solid #F5DDC6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChefHat size={22} color="#E96500" />
          </div>

          <div>
            <div style={{ color: '#E96500', fontWeight: 800, fontSize: '0.88rem' }}>
              {getLocalizedOfferName(offers[0]?.name)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOfferModal(true)}
          style={{
            border: '1px solid #F3C7A8',
            background: '#FFFFFF',
            color: '#E96500',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {t('viewOffers', 'View Offers')} →
        </button>
      </div>

      {/* =====================================================
          2. OFFERS MODAL (VIEW OFFERS & ADD OFFERS)
      ===================================================== */}
      {showOfferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setShowOfferModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              maxHeight: 'calc(100vh - 60px)',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E7E5E4',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                borderBottom: '1px solid #F5F5F4',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#FFF0E8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Tag size={20} color="#E96500" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                    {t('activeOffersAndPromotions', 'Active Offers & Promotions')}
                  </h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 2. Clearly visible Add Offers Button */}
                <button
                  onClick={() => setShowAddOfferModal(true)}
                  style={{
                    background: '#E96500',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 13px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(233, 101, 0, 0.25)',
                  }}
                >
                  <Plus size={15} />
                  <span>{t('addOffers', 'Add Offers')}</span>
                </button>

                <button
                  onClick={() => setShowOfferModal(false)}
                  style={{
                    border: 'none',
                    background: '#F5F5F4',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#78716C',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List of Offers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {offers.map((off) => {
                const isActive = off.status === 'ACTIVE';
                return (
                  <div
                    key={off.id}
                    style={{
                      border: isActive ? '1.5px solid #FDBA74' : '1px solid #E7E5E4',
                      background: isActive ? '#FFF7ED' : '#FAFAF9',
                      borderRadius: '12px',
                      padding: '14px',
                      opacity: isActive ? 1 : 0.65,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span
                        style={{
                          background: isActive ? '#EA580C' : '#78716C',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {off.tag || (off.discountType === 'PERCENTAGE' ? `${off.discountValue}% OFF` : `₹${off.discountValue} OFF`)}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: isActive ? '#EA580C' : '#78716C' }}>
                          {off.discountType === 'PERCENTAGE' ? `${off.discountValue}% OFF` : `₹${off.discountValue} OFF`}
                        </span>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleOfferStatus(off.id)}
                          style={{
                            border: '1px solid #D6D3D1',
                            background: '#FFFFFF',
                            borderRadius: '5px',
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: isActive ? '#B45309' : '#15803D',
                          }}
                          title="Toggle active status"
                        >
                          {isActive ? t('deactivate', 'Deactivate') : t('activate', 'Activate')}
                        </button>

                        {/* Delete Custom Offer */}
                        {off.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOffer(off.id)}
                            style={{
                              border: 'none',
                              background: '#FEE2E2',
                              borderRadius: '5px',
                              padding: '3px 6px',
                              cursor: 'pointer',
                              color: '#B91C1C',
                            }}
                            title="Delete this offer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 style={{ margin: '4px 0', fontSize: '0.94rem', fontWeight: 700, color: '#1C1917' }}>
                      {getLocalizedOfferName(off.name)}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#57534E' }}>
                      {off.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: isActive ? '1px solid #FFEDD5' : '1px solid #E7E5E4',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#FFFFFF',
                          border: '1px solid #FDBA74',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: '#C2410C',
                        }}
                      >
                        {t('code', 'Code')}: <code>{off.code}</code>
                      </div>

                      <div style={{ fontSize: '0.70rem', color: '#78716C' }}>
                        {t('valid', 'Valid')}: {off.startDate} {t('to', 'to')} {off.endDate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#78716C' }}>
                {t('allOffersStoredPersistently', 'All offers stored persistently in database')}
              </span>
              <button
                onClick={() => setShowOfferModal(false)}
                style={{
                  background: '#1C1917',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          2. ADD OFFERS FORM MODAL
      ===================================================== */}
      {showAddOfferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setShowAddOfferModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 24px 38px rgba(0,0,0,0.2)',
              border: '1px solid #E7E5E4',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1C1917' }}>
                {t('createNewOffer', 'Create New Offer')}
              </h3>
              <button
                onClick={() => setShowAddOfferModal(false)}
                style={{
                  border: 'none',
                  background: '#F5F5F4',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateOffer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                    {t('offerName', 'Offer Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festival Special Discount"
                    value={newOffer.name}
                    onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('promoCode', 'Promo Code')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FEST20"
                      value={newOffer.code}
                      onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('discountType', 'Discount Type')} *
                    </label>
                    <select
                      value={newOffer.discountType}
                      onChange={(e) => setNewOffer({ ...newOffer, discountType: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="PERCENTAGE">{t('percentage', 'Percentage')} (%)</option>
                      <option value="FIXED">{t('fixedAmount', 'Fixed Amount')} (₹)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('discountValue', 'Discount Value')} * ({newOffer.discountType === 'PERCENTAGE' ? '%' : '₹'})
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={newOffer.discountType === 'PERCENTAGE' ? '100' : '10000'}
                      placeholder={newOffer.discountType === 'PERCENTAGE' ? '20' : '150'}
                      value={newOffer.discountValue}
                      onChange={(e) => setNewOffer({ ...newOffer, discountValue: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('applicableCategory', 'Applicable Category')}
                    </label>
                    <select
                      value={newOffer.applicableCategory}
                      onChange={(e) => setNewOffer({ ...newOffer, applicableCategory: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="All Menu Items">{t('allMenuItems', 'All Menu Items')}</option>
                      <option value="Dine-In">{t('dineIn', 'Dine-In')}</option>
                      <option value="Online Delivery">{t('onlineDelivery', 'Online Delivery')}</option>
                      <option value="Beverages">{t('beverages', 'Beverages')}</option>
                      <option value="Main Course">{t('mainCourse', 'Main Course')}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('startDate', 'Start Date')}
                    </label>
                    <input
                      type="date"
                      value={newOffer.startDate}
                      onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {t('endDate', 'End Date')}
                    </label>
                    <input
                      type="date"
                      value={newOffer.endDate}
                      onChange={(e) => setNewOffer({ ...newOffer, endDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                    {t('offerDescription', 'Offer Description')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of how to redeem or minimum spend requirements..."
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddOfferModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    background: '#FFFFFF',
                    color: '#57534E',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={savingOffer}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#E96500',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: savingOffer ? 'wait' : 'pointer',
                    boxShadow: '0 2px 6px rgba(233, 101, 0, 0.3)',
                  }}
                >
                  {savingOffer ? t('saving', 'Saving...') : t('saveAndPublishOffer', 'Save & Publish Offer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          1B. MANAGE SUBSCRIPTION & TRIAL MODAL
      ===================================================== */}
      {showPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setShowPlanModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 24px 38px rgba(0,0,0,0.2)',
              border: '1px solid #E7E5E4',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} color="#E96500" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1C1917' }}>
                  {t('licenceAndSubscription', 'Subscription & Validity')}
                </h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                style={{
                  border: 'none',
                  background: '#F5F5F4',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#9A3412' }}>{t('currentStatus', 'Current Status')}</span>
                <span
                  style={{
                    background: daysLeft > 0 ? '#DCFCE7' : '#FEE2E2',
                    color: daysLeft > 0 ? '#15803D' : '#B91C1C',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                  }}
                >
                  {daysLeft > 0 ? t('active', 'Active Plan') : t('expired', 'Expired')}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EA580C', marginTop: '6px' }}>
                {isTrial ? t('freeTrial28Days', '28 Days Free Trial') : `${licenceInfo?.subscriptionPlan || 'Enterprise'} Edition`}
              </div>
              <div style={{ fontSize: '0.80rem', color: '#78716C', marginTop: '4px' }}>
                {t('daysRemaining', 'Remaining Days')}: <strong>{daysLeft} {t('days', 'Days')}</strong> • {t('validTill', 'Valid until')}: <strong>{formatDisplayDate(licenceInfo?.renewalDate || licenceInfo?.trialEndDate) || formatDisplayDate(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString())}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {/* Option 1: Pro Plan */}
              <div
                style={{
                  border: '1.5px solid #E7E5E4',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#1C1917' }}>{t('proEditionAnnual', 'Pro Edition (Annual)')}</div>
                  <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{t('proEditionDesc', 'Full Billing, Tables, Online Delivery & Invoicing for 1 Year')}</div>
                </div>
                <button
                  type="button"
                  disabled={activatingPlan}
                  onClick={() => handleActivatePaidPlan('Pro Edition', 12)}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: activatingPlan ? 'wait' : 'pointer',
                  }}
                >
                  {t('activatePro', 'Activate Pro')}
                </button>
              </div>

              {/* Option 2: Enterprise Plan */}
              <div
                style={{
                  border: '1.5px solid #FED7AA',
                  background: '#FFFDFC',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#E96500' }}>{t('enterpriseSuiteAnnual', 'Enterprise Suite (Annual)')}</div>
                  <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{t('enterpriseSuiteDesc', 'All Modules, Financials & Reports for 1 Year')}</div>
                </div>
                <button
                  type="button"
                  disabled={activatingPlan}
                  onClick={() => handleActivatePaidPlan('Enterprise Suite', 12)}
                  style={{
                    background: '#E96500',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: activatingPlan ? 'wait' : 'pointer',
                  }}
                >
                  {t('activateEnterprise', 'Activate Enterprise')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPlanModal(false)}
                style={{
                  background: '#F5F5F4',
                  color: '#44403C',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          RESPONSIVE CSS
      ===================================================== */}
      <style>
        {`
          @media (max-width: 1250px) {
            .hotel-dashboard-main-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 1050px) {
            .hotel-dashboard-top-cards {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }
          }

          @media (max-width: 800px) {
            .hotel-dashboard-main-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 768px) {
            .hotel-dashboard-header {
              margin-bottom: 12px !important;
              flex-wrap: nowrap !important;
            }
            .hotel-dashboard-header h1 {
              font-size: 1.35rem !important;
            }
            .hotel-dashboard-header button {
              padding: 6px 12px !important;
            }
            .hotel-dashboard-top-cards {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
            }
            .hotel-dashboard-top-cards > div {
              padding: 8px 10px !important;
              min-height: 60px !important;
              border-radius: 10px !important;
            }
            .hotel-dashboard-top-cards > div .dashboard-kpi-value {
              font-size: 1.15rem !important;
              margin-top: 2px !important;
            }
            .hotel-dashboard-top-cards > div .dashboard-kpi-label {
              font-size: 0.72rem !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .hotel-dashboard-top-cards > div .dashboard-kpi-icon {
              width: 32px !important;
              height: 32px !important;
              min-width: 32px !important;
              min-height: 32px !important;
              border-radius: 8px !important;
            }
            .hotel-dashboard-top-cards > div .dashboard-kpi-icon svg {
              width: 16px !important;
              height: 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HotelDashboard;