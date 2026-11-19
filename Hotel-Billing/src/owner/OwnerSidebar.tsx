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

interface OwnerSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const OwnerSidebar: React.FC<OwnerSidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { business, user } = useAuth();
  const navigate = useNavigate();

  const CENTRAL_ITEMS = [
    {
      to: '/owner/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/owner/branches',
      label: 'Branch Management',
      icon: GitBranch,
    },
    {
      to: '/owner/sales',
      label: 'Branch-wise Sales',
      icon: TrendingUp,
    },
    {
      to: '/owner/profit-analysis',
      label: 'Profit Analysis',
      icon: PieChart,
    },
    {
      to: '/owner/staff',
      label: 'Staff Management',
      icon: Users,
    },
    {
      to: '/owner/reports',
      label: 'Reports',
      icon: FileSpreadsheet,
    },
    {
      to: '/owner/billing-performance',
      label: 'Billing Performance',
      icon: Gauge,
    },
  ];

  const PREFERENCE_ITEMS = [
    {
      to: '/owner/settings',
      label: 'Settings & Themes',
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
                  Owner Admin
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
            Central Management
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {CENTRAL_ITEMS.map((item) => {
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
            Preferences
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
            <span>Open Hotel Billing</span>
          </div>
          <ExternalLink size={14} color="#9CA3AF" />
        </button>
      </div>
    </aside>
  );
};

export default OwnerSidebar;
