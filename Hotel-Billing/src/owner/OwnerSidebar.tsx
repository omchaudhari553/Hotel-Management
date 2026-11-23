import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  TrendingUp,
  PieChart,
  Users,
  FileSpreadsheet,
  Gauge,
  Settings,
  Building2,
  Crown,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { industryService } from '../services/industryService';

interface OwnerSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const OwnerSidebar: React.FC<OwnerSidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { business, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [platformModulesStatus, setPlatformModulesStatus] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
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

  const isModuleEnabled = (moduleCode: string) => {
    let status: Record<string, boolean> = platformModulesStatus;
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      if (raw) status = JSON.parse(raw);
    } catch {}

    if (!status || Object.keys(status).length === 0) return true;
    if (moduleCode === 'HOTEL_STAFF') {
      return status['HOTEL_STAFF'] !== false && status['STAFF_PAYROLL'] !== false;
    }
    if (moduleCode === 'HOTEL_SETTINGS') {
      return status['HOTEL_SETTINGS'] !== false && status['HOTEL_REPORTS'] !== false && status['REPORTS'] !== false;
    }
    if (moduleCode === 'HOTEL_BILLING') {
      return status['HOTEL_BILLING'] !== false && status['POS_BILLING'] !== false;
    }
    return status[moduleCode] !== false;
  };

  const CENTRAL_ITEMS = [
    {
      to: '/owner/dashboard',
      label: language === 'mr' ? 'डॅशबोर्ड' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/owner/branches',
      label: language === 'mr' ? 'शाखा व्यवस्थापन' : 'Branch Management',
      icon: GitBranch,
    },
    {
      to: '/owner/sales',
      label: language === 'mr' ? 'शाखानिहाय विक्री' : 'Branch-wise Sales',
      icon: TrendingUp,
    },
    {
      to: '/owner/profit-analysis',
      label: language === 'mr' ? 'नफा विश्लेषण' : 'Profit Analysis',
      icon: PieChart,
    },
    {
      to: '/owner/staff',
      label: language === 'mr' ? 'कर्मचारी व्यवस्थापन' : 'Staff Management',
      icon: Users,
    },
    {
      to: '/owner/reports',
      label: language === 'mr' ? 'अहवाल' : 'Reports',
      icon: FileSpreadsheet,
    },
    {
      to: '/owner/billing-performance',
      label: language === 'mr' ? 'बिलिंग कार्यक्षमता' : 'Billing Performance',
      icon: Gauge,
    },
  ];

  const PREFERENCE_ITEMS = [
    {
      to: '/owner/settings',
      label: language === 'mr' ? 'सेटिंग्ज आणि थीम' : 'Settings & Themes',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`owner-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a') || target.closest('button')) {
          onCloseMobile?.();
        }
      }}
      style={{
        backgroundColor: '#1E1B18',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        flexShrink: 0,
        zIndex: 1050,
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Brand Header */}
      <div
        className="owner-sidebar-header"
        style={{
          padding: '18px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(30, 27, 24, 0) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
                border: '1.5px solid #F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.35)',
                flexShrink: 0,
              }}
            >
              <Crown size={22} color="#FDE68A" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  margin: 0,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {business?.name || 'HOTEL OWNER'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#F59E0B',
                    textTransform: 'uppercase',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {language === 'mr' ? 'मालक ॲडमिन' : 'Owner Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="owner-sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close admin menu"
          >
            <X size={20} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Navigation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Section 1: Central Operations */}
        <div>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255, 255, 255, 0.45)',
              padding: '4px 12px 6px',
            }}
          >
            {language === 'mr' ? 'केंद्रीय व्यवस्थापन' : 'Central Management'}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {CENTRAL_ITEMS.filter((item) => {
              if (item.to === '/owner/staff') return isModuleEnabled('HOTEL_STAFF');
              if (item.to === '/owner/reports') return isModuleEnabled('HOTEL_SETTINGS');
              if (item.to === '/owner/billing-performance') return isModuleEnabled('HOTEL_BILLING');
              return true;
            }).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.86rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#FFFFFF' : '#D1D5DB',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%)'
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                    transition: 'all 0.15s ease-in-out',
                  })}
                >
                  <Icon size={17} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Preferences */}
        <div>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255, 255, 255, 0.45)',
              padding: '6px 12px 6px',
            }}
          >
            {language === 'mr' ? 'प्राधान्ये' : 'Preferences'}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {PREFERENCE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.86rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#FFFFFF' : '#D1D5DB',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%)'
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                    transition: 'all 0.15s ease-in-out',
                  })}
                >
                  <Icon size={17} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Switch to Operational Hotel Dashboard link */}
      <div
        className="owner-sidebar-footer"
        style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <button
          onClick={() => navigate('/hotel/dashboard')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#F3F4F6',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          title="Open Hotel Billing & POS application"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="#F59E0B" />
            <span>{language === 'mr' ? 'हॉटेल बिलिंग उघडा' : 'Open Hotel Billing'}</span>
          </div>
          <ExternalLink size={14} color="#9CA3AF" />
        </button>
      </div>
    </aside>
  );
};

export default OwnerSidebar;
