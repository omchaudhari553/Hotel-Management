import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  Layers,
  CreditCard,
  FileCheck2,
  Clock,
  DollarSign,
  FileText,
  Users2,
  Grid,
  TrendingUp,
  BarChart3,
  LineChart,
  LifeBuoy,
  Bell,
  History,
  Settings,
  Hotel,
  UtensilsCrossed,
  Coffee,
  ShieldCheck,
  LogOut
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const menuItems: SidebarItem[] = [
  { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
  { name: 'Business Management', path: '/superadmin/businesses', icon: Building2 },
  { name: 'Branch Management', path: '/superadmin/branches', icon: GitBranch },
  { name: 'Product Management', path: '/superadmin/products', icon: Layers },
  { name: 'Subscription Management', path: '/superadmin/subscriptions', icon: CreditCard },
  { name: 'Subscription Plans', path: '/superadmin/plans', icon: FileCheck2 },
  { name: 'Free Trial Management', path: '/superadmin/trials', icon: Clock, badge: '28-Day', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  { name: 'Payment Management', path: '/superadmin/payments', icon: DollarSign },
  { name: 'Invoice Management', path: '/superadmin/invoices', icon: FileText },
  { name: 'User & Role Management', path: '/superadmin/users', icon: Users2 },
  { name: 'Product Module Management', path: '/superadmin/modules', icon: Grid },
  { name: 'Branch-wise Sales', path: '/superadmin/branch-sales', icon: TrendingUp },
  { name: 'Profit Analysis', path: '/superadmin/profit-analysis', icon: BarChart3 },
  { name: 'Reports & Analytics', path: '/superadmin/reports', icon: LineChart },
  { name: 'Support & Complaints', path: '/superadmin/support', icon: LifeBuoy },
  { name: 'Notifications', path: '/superadmin/notifications', icon: Bell },
  { name: 'Audit Logs', path: '/superadmin/audit-logs', icon: History },
  { name: 'Settings', path: '/superadmin/settings', icon: Settings },
];

export const SuperAdminSidebar: React.FC<{ isOpen?: boolean; onClose?: () => void; onLogout?: () => void }> = ({ onLogout }) => {
  return (
    <aside
      className="sa-sidebar select-none shadow-2xl"
      style={{
        width: '16rem',
        backgroundColor: '#0F172A',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 20px',
          borderBottom: '1px solid #1E293B',
          backgroundColor: '#0B1120',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
            flexShrink: 0,
          }}
        >
          <ShieldCheck style={{ width: '22px', height: '22px', color: '#FFFFFF' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
            Super Admin
          </h2>
          <span style={{ fontSize: '0.68rem', color: '#818CF8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Hospitality Hub
          </span>
        </div>
      </div>

      {/* Multi-Product Ecosystem Indicator */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          borderBottom: '1px solid #1E293B',
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 2px' }}>
          Connected Products
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
          <div
            title="Hotel Management Active"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34D399',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            <Hotel style={{ width: '12px', height: '12px' }} />
            <span>Hotel</span>
          </div>
          <div
            title="Mess Management Ready for External Import"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#FBBF24',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            <UtensilsCrossed style={{ width: '12px', height: '12px' }} />
            <span>Mess (Ready)</span>
          </div>
          <div
            title="Cafe Management Ready for External Import"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#38BDF8',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            <Coffee style={{ width: '12px', height: '12px' }} />
            <span>Cafe (Ready)</span>
          </div>
        </div>
      </div>

      {/* Navigation List - FULLY SCROLLABLE WITH EXPLICIT FLEX CONSTRAINTS */}
      <nav
        className="custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '10px 10px 20px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                backgroundColor: isActive ? '#4F46E5' : 'transparent',
                boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.7)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Branding & Logout */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#0B1120',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              try {
                const savedModules = localStorage.getItem('platform_hotel_modules_status');
                localStorage.clear();
                sessionStorage.clear();
                if (savedModules) {
                  localStorage.setItem('platform_hotel_modules_status', savedModules);
                }
              } catch (e) {}
              window.location.replace('/login');
            }
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#F87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
          }}
          title="Sign Out to Login Page"
        >
          <LogOut style={{ width: '14px', height: '14px' }} />
          <span>Sign Out</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Platform v2.5.0</span>
          <span
            title="Central Engine Online"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
        </div>
      </div>
    </aside>
  );
};
