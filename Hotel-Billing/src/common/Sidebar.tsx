import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useIndustry } from '../context/IndustryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { licenceService, LicenceInfo } from '../services/licenceService';
import { settingsService } from '../services/settingsService';
import { industryService } from '../services/industryService';
import apiClient from '../services/api';
import {
  Building2,
  UtensilsCrossed,
  Coffee,
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  ScrollText,
  Clock,
  Truck,
  ClipboardList,
  Grid,
  ShoppingBag,
  FileText,
  Boxes,
  UserCheck,
  TruckIcon,
  CreditCard,
  BarChart3,
  BadgeIndianRupee,
  Crown,
  ReceiptIndianRupee,
  ShoppingCart,
  Settings as SettingsIcon,
  Sparkles,
  ChefHat,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { activeIndustryCode, selectedIndustry } = useIndustry();
  const { t, toDevanagari } = useLanguage();
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const isBranchUser = Boolean(
    user?.branchId ||
    user?.isBranchUser ||
    (user?.role && !['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(String(user.role).toUpperCase()) && user?.branchId)
  );
  const isOwner =
    user?.isOwner === true ||
    user?.role === 'OWNER' ||
    (!user?.branchId && (user?.roles?.includes('ROLE_OWNER') || user?.roles?.includes('ROLE_ADMIN') || user?.role === 'ADMIN'));

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

  const [platformModulesStatus, setPlatformModulesStatus] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleSync = (e?: any) => {
      try {
        if (e && e.detail) {
          setPlatformModulesStatus(e.detail);
          return;
        }
        const raw = localStorage.getItem('platform_hotel_modules_status');
        setPlatformModulesStatus(raw ? JSON.parse(raw) : {});
      } catch {}
    };

    // Initial fetch from backend
    industryService.getModuleStatuses().then((st) => {
      if (st && Object.keys(st).length > 0) {
        setPlatformModulesStatus(st);
      }
    }).catch(() => {});

    window.addEventListener('platform-modules-updated', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(() => {
      handleSync();
      industryService.getModuleStatuses().then((st) => {
        if (st && Object.keys(st).length > 0) {
          setPlatformModulesStatus(st);
        }
      }).catch(() => {});
    }, 2000);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('hotel_platform_modules');
      bc.onmessage = (event) => {
        if (event && event.data) {
          setPlatformModulesStatus(event.data);
        }
      };
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('platform-modules-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, []);

  const isHotelModuleVisible = (code: string) => {
    let status: Record<string, boolean> = platformModulesStatus;
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      if (raw) status = JSON.parse(raw);
    } catch {}

    if (!status || Object.keys(status).length === 0) return true;
    if (code === 'HOTEL_OVERVIEW') {
      return status['HOTEL_OVERVIEW'] !== false && status['HOTEL_DASHBOARD'] !== false;
    }
    if (code === 'HOTEL_SETTINGS') {
      return status['HOTEL_SETTINGS'] !== false && status['HOTEL_REPORTS'] !== false && status['REPORTS'] !== false;
    }
    if (code === 'HOTEL_KOT') {
      return status['HOTEL_KOT'] !== false && status['KOT'] !== false;
    }
    if (code === 'HOTEL_BILLING') {
      return status['HOTEL_BILLING'] !== false && status['POS_BILLING'] !== false;
    }
    if (code === 'HOTEL_TABLES') {
      return status['HOTEL_TABLES'] !== false && status['TABLE_MGMT'] !== false;
    }
    if (code === 'HOTEL_PAYMENTS') {
      return status['HOTEL_PAYMENTS'] !== false;
    }
    if (code === 'HOTEL_PURCHASE') {
      return status['HOTEL_PURCHASE'] !== false && status['PURCHASE'] !== false && status['INVENTORY'] !== false;
    }
    if (code === 'HOTEL_STAFF') {
      return status['HOTEL_STAFF'] !== false && status['STAFF_PAYROLL'] !== false;
    }
    return status[code] !== false;
  };
  const navigate = useNavigate();
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

  const [businessLogo, setBusinessLogo] = useState<string>(() => localStorage.getItem('business_logo') || '');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const allSettings = await settingsService.getSettings();
        const logoSetting = allSettings.find((s) => s.category === 'BUSINESS' && s.settingKey === 'LOGO');
        if (logoSetting?.settingValue) {
          setBusinessLogo(logoSetting.settingValue);
          localStorage.setItem('business_logo', logoSetting.settingValue);
        }
      } catch {
        // ignore
      }
    };
    fetchLogo();

    const handleBranding = (e: any) => {
      const newLogo = e.detail?.logo !== undefined ? e.detail.logo : (localStorage.getItem('business_logo') || '');
      setBusinessLogo(newLogo);
    };
    window.addEventListener('branding-updated', handleBranding);
    return () => window.removeEventListener('branding-updated', handleBranding);
  }, []);

  // Central Platform Feature Modules Enabled / Disabled Map
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleModuleSync = () => {
      try {
        const raw = localStorage.getItem('platform_hotel_modules_status');
        if (raw) setModuleStatus(JSON.parse(raw));
      } catch {}
    };

    window.addEventListener('platform-modules-updated', handleModuleSync);
    window.addEventListener('storage', handleModuleSync);

    // Initial load from backend for Hotel (Product ID = 1)
    apiClient.get('/superadmin/products/1/modules')
      .then(res => {
        const list = res.data?.data;
        if (Array.isArray(list)) {
          const map: Record<string, boolean> = {};
          list.forEach((m: any) => { map[m.code] = m.active; });
          setModuleStatus(map);
          localStorage.setItem('platform_hotel_modules_status', JSON.stringify(map));
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('platform-modules-updated', handleModuleSync);
      window.removeEventListener('storage', handleModuleSync);
    };
  }, []);

  const isModuleEnabled = (code: string) => {
    // If explicitly set to false, it is disabled across all hotel logins
    return moduleStatus[code] !== false;
  };

  const handleUpgradePlan = () => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: licenceInfo?.trialStatus === 'Expired' ? 'upgrade' : 'renew' },
      })
    );
  };

  const getIndustryTheme = () => {
    switch (activeIndustryCode) {
      case 'HOTEL':
        return {
          title: 'Hotel & Restaurant',
          icon: <Building2 size={20} color="#F59E0B" />,
          accentColor: '#F59E0B',
          badgeClass: 'badge-hotel',
        };
      case 'MESS':
        return {
          title: 'Mess Management',
          icon: <UtensilsCrossed size={20} color="#09331D" />,
          accentColor: '#09331D',
          badgeClass: 'badge-mess',
        };
      case 'CAFE':
        return {
          title: 'Cafe & Bistro',
          icon: <Coffee size={20} color="#C68B5C" />,
          accentColor: '#A56F63',
          badgeClass: 'badge-cafe',
        };
      default:
        return {
          title: 'Hospitality App',
          icon: <Building2 size={20} color="#F59E0B" />,
          accentColor: '#F59E0B',
          badgeClass: 'badge-info',
        };
    }
  };

  const theme = getIndustryTheme();
  const isTrial = !licenceInfo?.subscriptionPlan || licenceInfo?.subscriptionPlan?.toLowerCase().includes('trial') || licenceInfo?.trialStatus?.toLowerCase() === 'active';

  return (
    <aside
      className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a') || target.closest('button')) {
          onCloseMobile?.();
        }
      }}
    >
      {/* Platform Title */}
      <div className="sidebar-header" style={{ padding: '16px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
        {activeIndustryCode === 'MESS' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {/* Floral Logo Icon matching Mess theme */}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#09331D">
                <circle cx="12" cy="7" r="3.5" />
                <circle cx="17" cy="12" r="3.5" />
                <circle cx="12" cy="17" r="3.5" />
                <circle cx="7" cy="12" r="3.5" />
                <circle cx="12" cy="12" r="2.5" fill="#A7F3D0" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em', margin: 0, lineHeight: 1.1 }}>
                {t('brandName', 'AJALKAR')}
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#A7F3D0', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('messManagement', 'MESS MANAGEMENT')}
              </span>
            </div>
          </div>
        ) : activeIndustryCode === 'HOTEL' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: businessLogo ? '#FFFFFF' : 'linear-gradient(135deg, #7C2D12 0%, #B45309 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #FED7AA',
                boxShadow: '0 2px 8px rgba(124, 45, 18, 0.4)',
                overflow: 'hidden',
                padding: businessLogo ? '2px' : 0,
              }}
            >
              {businessLogo ? (
                <img
                  src={businessLogo}
                  alt="Hotel Logo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Building2 size={18} color="#FFFFFF" />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em', margin: 0, lineHeight: 1.1 }}>
                {t('brandName', 'AJALKAR')}
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#FED7AA', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('hotelManagement', 'HOTEL MANAGEMENT')}
              </span>
            </div>
          </div>
        ) : activeIndustryCode === 'CAFE' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.jpg"
              alt="Ajalkar"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(243, 228, 224, 0.4)',
                flexShrink: 0,
              }}
            />
            <div>
              <h2 style={{ fontSize: '1.12rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em', margin: 0, lineHeight: 1.1 }}>
                {t('brandName', 'AJALKAR')}
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#F3E4E0', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('cafeBistroPos', 'CAFE & BISTRO POS')}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.jpg"
              alt="Ajalkar"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            />
            <div>
              <h2 className="sidebar-title" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>{t('brandName', 'AJALKAR')}</h2>
              <span className="sidebar-subtitle">{t('hotelManagement', 'HOTEL MANAGEMENT')}</span>
            </div>
          </div>
        )}
        </div>
        <button
          type="button"
          className="sidebar-mobile-close-btn"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        >
          <X size={20} color="#FFFFFF" />
        </button>
      </div>

      <div className="sidebar-content" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, paddingBottom: '32px' }}>
        {/* Dynamic Isolated Industry Navigation */}
        <nav className="sidebar-nav" style={{ paddingTop: '8px' }}>
          {activeIndustryCode === 'HOTEL' && (
            <>
              {/* Central Super Admin Link for Super Admin */}
              {isSuperAdminViewing ? (
                <NavLink
                  to="/superadmin/dashboard"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundColor: '#4F46E5',
                    border: '1px solid #6366F1',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    textDecoration: 'none'
                  }}
                >
                  <Shield size={18} color="#FFFFFF" />
                  <span>Central Super Admin</span>
                </NavLink>
              ) : isOwner && localStorage.getItem('ajalkar_user_mode') !== 'SINGLE' ? (
                <NavLink
                  to="/owner/dashboard"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundColor: 'rgba(234, 88, 12, 0.15)',
                    border: '1px solid rgba(234, 88, 12, 0.4)',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    color: '#FED7AA',
                    fontWeight: 700,
                  }}
                >
                  <Building2 size={18} color="#F97316" />
                  <span>Owner Admin Panel</span>
                </NavLink>
              ) : null}

              {user?.branchId && (
                <div
                  style={{
                    padding: '6px 12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: '0.75rem',
                    color: '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Building2 size={13} color="#F59E0B" />
                  <span style={{ fontWeight: 600 }}>Branch:</span>
                  <span style={{ color: '#FED7AA', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.branchName || selectedBranch?.name || 'Branch'}
                  </span>
                </div>
              )}

              {/* Central Super Admin Panel Direct Switch */}
              {(user?.role === 'SUPER_ADMIN' || (user as any)?.isSuperAdmin || user?.username === 'superadmin' || (typeof window !== 'undefined' && !!localStorage.getItem('superadmin_token'))) && (
                <NavLink
                  to="/superadmin/dashboard"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#4338CA',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                    marginBottom: '10px',
                    border: '1.5px solid #818CF8',
                    boxShadow: '0 4px 12px rgba(67, 56, 202, 0.35)',
                  }}
                >
                  <ShieldCheck size={18} color="#C7D2FE" />
                  <span>Central Super Admin</span>
                </NavLink>
              )}

              {/* 1. Hotel Dashboard */}
              {isHotelModuleVisible('HOTEL_OVERVIEW') && (
                <NavLink to="/hotel/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <LayoutDashboard size={18} />
                  <span>{t('hotelOverview', 'Hotel Overview')}</span>
                </NavLink>
              )}

              {/* 2. KOT Management */}
              {isHotelModuleVisible('HOTEL_KOT') && (
                <NavLink to="/hotel/kot" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <ChefHat size={18} />
                  <span>{t('kot', 'KOT')}</span>
                </NavLink>
              )}

              {/* 3. Billing / Invoices */}
              {isHotelModuleVisible('HOTEL_BILLING') && (
                <NavLink to="/hotelbilling" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <FileText size={18} />
                  <span>{t('billingAndInvoices', 'Billing / Invoices')}</span>
                </NavLink>
              )}

              {/* 4. Tables Management */}
              {isHotelModuleVisible('HOTEL_TABLES') && (
                <NavLink to="/hotel/Tables" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <BedDouble size={18} />
                  <span>{t('tables', 'Tables')}</span>
                </NavLink>
              )}

              {/* 5. Payments */}
              {isHotelModuleVisible('HOTEL_PAYMENTS') && (
                <NavLink to="/hotelpayment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <CreditCard size={18} />
                  <span>{t('payments', 'Payments')}</span>
                </NavLink>
              )}

              {/* 6. Purchase Management */}
              {isHotelModuleVisible('HOTEL_PURCHASE') && (
                <NavLink to="/purchase" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <ShoppingCart size={18} />
                  <span>{t('purchase', 'Purchase')}</span>
                </NavLink>
              )}

              {/* 7. Staff Management */}
              {isHotelModuleVisible('HOTEL_STAFF') && (
                <NavLink to="/hotel/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Users size={18} />
                  <span>{t('staff', 'Staff')}</span>
                </NavLink>
              )}

              {/* 8. Settings (includes Reports & GST Reports) */}
              {isHotelModuleVisible('HOTEL_SETTINGS') && (
                <NavLink to="/hotel/Settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <SettingsIcon size={18} />
                  <span>{t('settings', 'Settings')}</span>
                </NavLink>
              )}
            </>
          )}

          {activeIndustryCode === 'MESS' && (
            <>
              <NavLink to="/mess/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Members</span>
              </NavLink>
              <NavLink to="/mess/plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ScrollText size={18} />
                <span>Plans & Subscription</span>
              </NavLink>
              <NavLink to="/mess/tiffin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={18} />
                <span>Tiffin</span>
              </NavLink>

              <NavLink to="/mess/menu" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={18} />
                <span>Weekly Menu</span>
              </NavLink>
              <NavLink to="/billing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={18} />
                <span>Billing</span>
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CreditCard size={18} />
                <span>Payments</span>
              </NavLink>
              <NavLink to="/purchase" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShoppingCart size={18} />
                <span>{t('purchases', 'Purchases')}</span>
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Boxes size={18} />
                <span>Inventory</span>
              </NavLink>
              <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <TruckIcon size={18} />
                <span>Suppliers</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ReceiptIndianRupee size={18} />
                <span>Expenses</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Reports</span>
              </NavLink>
              <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCheck size={18} />
                <span>Users</span>
              </NavLink>
              <NavLink to="/Settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <SettingsIcon size={18} />
                <span>Settings</span>
              </NavLink>
            </>
          )}

          {activeIndustryCode === 'CAFE' && (
            <>
              <NavLink to="/cafe/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Cafe Dashboard</span>
              </NavLink>
              <NavLink to="/cafe/tables" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Grid size={18} />
                <span>Floor Table Layout</span>
              </NavLink>
              <NavLink to="/cafe/new-order" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShoppingBag size={18} />
                <span>NewOrder</span>
              </NavLink>
              <NavLink to="/cafe/order-history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShoppingBag size={18} />
                <span>Order History</span>
              </NavLink>
              <NavLink to="/cafe/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShoppingBag size={18} />
                <span>Live POS Billing</span>
              </NavLink>
              <NavLink to="/cafe/menu" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={18} />
                <span>Menu & Pricing</span>
              </NavLink>

              <NavLink to="/cafe/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UtensilsCrossed size={18} />
                <span>Reports</span>
              </NavLink>
              <NavLink to="/plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BadgeIndianRupee size={18} />
                <span>Cafe Plans & Pricing</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Dedicated Pinned Sidebar Footer: 28 Days Free Trial & Upgrade Plan */}
      <div
        className="sidebar-footer"
        style={{
          flexShrink: 0,
          /* no auto margin */
          padding: '12px 14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.16)',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {!isBranchUser && activeIndustryCode === 'HOTEL' && (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.32)',
              border: '1px solid rgba(254, 215, 170, 0.3)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Crown size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isTrial ? t('freeTrial28Days', '28 Days Free Trial') : licenceInfo?.subscriptionPlan}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#FED7AA', marginBottom: '10px', marginTop: '2px', lineHeight: 1.35 }}>
              {isTrial
                ? `${t('trial', 'Trial')}: ${toDevanagari(currentRemainingDays)} ${t('daysLeft', 'Days Left')}`
                : licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0
                  ? t('Trial Expired · Renew Now', '28 Days Trial Expired · Renew Now')
                  : t('28 Days Free Trial Available', '28 Days Free Trial Available')}
            </p>
            <button
              type="button"
              onClick={handleUpgradePlan}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #E96500 0%, #B45309 100%)',
                border: '1px solid #FED7AA',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(233, 101, 0, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              <span>{licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0 ? t('upgradePlanRenew', 'Upgrade Plan / Renew') : t('upgradePlan', 'Upgrade Plan')}</span>
            </button>
          </div>
        )}

        {activeIndustryCode === 'MESS' && (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(167, 243, 208, 0.22)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Crown size={16} color="#10B981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isTrial ? t('freeTrial28Days', '28 Days Free Trial') : licenceInfo?.subscriptionPlan}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#A7F3D0', marginBottom: '10px', marginTop: '2px', lineHeight: 1.35 }}>
              {isTrial
                ? `${t('trial', 'Trial')}: ${toDevanagari(currentRemainingDays)} ${t('daysLeft', 'Days Left')}`
                : licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0
                  ? t('Trial Expired · Renew Now', '28 Days Trial Expired · Renew Now')
                  : t('28 Days Free Trial Available', '28 Days Free Trial Available')}
            </p>
            <button
              type="button"
              onClick={handleUpgradePlan}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                border: '1px solid rgba(167, 243, 208, 0.4)',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              <span>{licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0 ? t('upgradePlanRenew', 'Upgrade Plan / Renew') : t('upgradePlan', 'Upgrade Plan')}</span>
            </button>
          </div>
        )}

        {activeIndustryCode === 'CAFE' && (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(243, 228, 224, 0.2)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Crown size={16} color="#C68B5C" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isTrial ? t('freeTrial28Days', '28 Days Free Trial') : licenceInfo?.subscriptionPlan}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#F3E4E0', marginBottom: '10px', marginTop: '2px', lineHeight: 1.35 }}>
              {isTrial
                ? `${t('trial', 'Trial')}: ${toDevanagari(currentRemainingDays)} ${t('daysLeft', 'Days Left')}`
                : licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0
                  ? t('Trial Expired · Renew Now', '28 Days Trial Expired · Renew Now')
                  : t('28 Days Free Trial Available', '28 Days Free Trial Available')}
            </p>
            <button
              type="button"
              onClick={handleUpgradePlan}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8B3E16 0%, #C68B5C 100%)',
                border: '1px solid #F3E4E0',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(139, 62, 22, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              <span>{licenceInfo?.trialStatus === 'Expired' || currentRemainingDays <= 0 ? t('upgradePlanRenew', 'Upgrade Plan / Renew') : t('upgradePlan', 'Upgrade Plan')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
