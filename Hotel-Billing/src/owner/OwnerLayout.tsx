import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SubscriptionModal from '../components/SubscriptionModal';
import {
  LogOut,
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

export const OwnerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Always return to the login screen if logout fails.
    } finally {
      navigate('/login');
    }
  };

  const controlButtonStyle: React.CSSProperties = {
    height: '34px',
    borderRadius: '6px',
    border: '1px solid var(--border-slate, #CBD5E1)',
    backgroundColor: 'var(--card-white, #FFFFFF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
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
      <OwnerSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area (margin handled responsively via CSS) */}
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
            <button
              type="button"
              className="owner-mobile-toggle-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle admin menu"
              title="Open admin navigation"
            >
              <Menu size={20} />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                flexWrap: 'wrap',
              }}
            >
              <span
                className="owner-header-title"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-heading, #0F172A)',
                  letterSpacing: '0.02em',
                }}
              >
                {language === 'mr' ? 'मालक प्रशासन पॅनेल' : 'Owner Administration Panel'}
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
                  {language === 'mr' ? 'मल्टी-ब्राँच सेंट्रल' : 'Multi-Branch Central'}
                </span>
              </span>
            </div>
          </div>

          {/* Right Controls: language, theme, and account */}
          <div
            className="owner-header-right"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {/* Quick Language Toggle Button (preserved from origin/poonam) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'mr' ? 'en' : 'mr')}
              className="owner-lang-toggle-btn"
              title={
                language === 'mr'
                  ? 'इंग्रजीत बदला (Switch to English)'
                  : 'मराठीत बदला (Switch to Marathi)'
              }
              aria-label="Switch language"
              style={{
                ...controlButtonStyle,
                padding: '0 10px',
                gap: '6px',
                color: 'var(--text-heading, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 700,
              }}
            >
              <Globe size={15} color="#D97706" />
              <span>{language === 'mr' ? 'मराठी' : 'English'}</span>
            </button>

            {/* Quick Theme Button */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="owner-theme-toggle-btn"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Theme`}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Theme`}
              style={{
                ...controlButtonStyle,
                width: '34px',
                color: resolvedTheme === 'dark' ? '#F59E0B' : '#64748B',
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
                <div
                  className="owner-profile-meta"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: 'var(--text-heading, #1E293B)',
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.fullName || user?.username || 'Hotel Owner'}
                  </span>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted, #64748B)' }}>
                    {language === 'mr' ? 'व्यवसाय मालक' : 'Business Owner'}
                  </span>
                </div>
              </div>

              <button
                type="button"
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
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = '#EF4444';
                  event.currentTarget.style.color = '#EF4444';
                  event.currentTarget.style.backgroundColor = '#FEF2F2';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = 'var(--border-slate, #CBD5E1)';
                  event.currentTarget.style.color = 'var(--text-heading, #475569)';
                  event.currentTarget.style.backgroundColor = 'var(--card-white, #FFFFFF)';
                }}
                title="Logout from session"
              >
                <LogOut size={15} />
                <span className="owner-logout-text">
                  {language === 'mr' ? 'लॉगआउट' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main
          className="owner-page-content"
          style={{
            flex: 1,
            padding: '24px 28px',
            minWidth: 0,
            backgroundColor: 'var(--bg-page, #F8FAFC)',
          }}
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
