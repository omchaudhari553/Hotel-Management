import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SubscriptionModal from '../components/SubscriptionModal';
import {
  LogOut,
  PlusCircle,
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';

export const OwnerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div
      className={`owner-layout-main ${mobileMenuOpen ? 'mobile-menu-active' : ''}`}
      data-theme={resolvedTheme || (theme === 'dark' ? 'dark' : 'light')}
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page, #F8FAFC)',
        color: 'var(--text-body, #475569)',
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="owner-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close admin menu"
        />
      )}

      {/* Dedicated Owner Sidebar */}
      <OwnerSidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main Content Area (Margin handled responsively via CSS) */}
      <div
        className="owner-main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
          minHeight: '100vh',
        }}
      >
        {/* Owner Header / Navigation Bar */}
        <header
          className="owner-header-bar"
          style={{
            minHeight: '64px',
            backgroundColor: 'var(--card-white, #FFFFFF)',
            borderBottom: '1px solid var(--border-slate, #E2E8F0)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Left Title / Badge with Mobile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="owner-mobile-toggle-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle admin menu"
              title="Open admin navigation"
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
              <span
                className="owner-header-title"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-heading, #0F172A)',
                  letterSpacing: '0.02em',
                }}
              >
                Owner Administration Panel
              </span>
              <span
                className="owner-badge-pill"
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ShieldCheck size={14} color="currentColor" />
                <span className="owner-badge-text" style={{ fontWeight: 700 }}>
                  Multi-Branch Central
                </span>
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="owner-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="owner-theme-toggle-btn"
              title="Refresh Admin Panel"
              aria-label="Refresh Admin Panel"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                border: '1px solid var(--border-slate, #CBD5E1)',
                backgroundColor: 'var(--card-white, #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-body, #64748B)',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <RefreshCw size={15} />
            </button>

            {/* Quick Small Theme Button */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="owner-theme-toggle-btn"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Theme`}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                border: '1px solid var(--border-slate, #CBD5E1)',
                backgroundColor: 'var(--card-white, #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: resolvedTheme === 'dark' ? '#F59E0B' : '#64748B',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Owner Info & Logout */}
            <div
              className="owner-user-cluster"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="owner-profile-meta" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading, #1E293B)', lineHeight: 1.2 }}>
                    {user?.fullName || user?.username || 'Hotel Owner'}
                  </span>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted, #64748B)' }}>Business Owner</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="owner-logout-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'var(--card-white, #FFFFFF)',
                  border: '1px solid var(--border-slate, #CBD5E1)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-heading, #475569)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#EF4444';
                  e.currentTarget.style.color = '#EF4444';
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-slate, #CBD5E1)';
                  e.currentTarget.style.color = 'var(--text-heading, #475569)';
                  e.currentTarget.style.backgroundColor = 'var(--card-white, #FFFFFF)';
                }}
                title="Logout from session"
              >
                <LogOut size={15} />
                <span className="owner-logout-text">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main
          className="owner-page-content"
          style={{ flex: 1, padding: '24px 28px', minWidth: 0, backgroundColor: 'var(--bg-page, #F8FAFC)' }}
        >
          <Outlet />
        </main>

        {/* Global Subscription Modal for Owner Administration */}
        <SubscriptionModal
          onSuccess={() => {
            window.dispatchEvent(new Event('owner-licence-updated'));
          }}
        />
      </div>
    </div>
  );
};

export default OwnerLayout;
