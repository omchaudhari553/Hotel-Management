import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { LogOut, Bell, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SuperAdminPopupProvider } from './SuperAdminPopupContext';
import './superadmin.css';

export const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    try {
      const savedModules = localStorage.getItem('platform_hotel_modules_status');
      localStorage.clear();
      sessionStorage.clear();
      if (savedModules) {
        localStorage.setItem('platform_hotel_modules_status', savedModules);
      }
    } catch (e) {}
    try {
      logout().catch(() => {});
    } catch (e) {}
    window.location.replace('/login');
  };

  const handleGoToHotelDashboard = () => {
    try {
      localStorage.setItem('ajalkar_industry', 'HOTEL');
      sessionStorage.setItem('superadmin_viewing_hotel', 'true');
      if (!localStorage.getItem('ajalkar_selected_branch_id')) {
        localStorage.setItem('ajalkar_selected_branch_id', '1');
      }
      if (!localStorage.getItem('ajalkar_selected_main_branch_id')) {
        localStorage.setItem('ajalkar_selected_main_branch_id', '1');
      }
      const rawUser = localStorage.getItem('superadmin_user') || localStorage.getItem('user');
      if (rawUser && !localStorage.getItem('ajalkar_user')) {
        localStorage.setItem('ajalkar_user', rawUser);
      }
    } catch (e) {}
    window.location.href = '/hotel/dashboard';
  };

  // Convert pathname to readable breadcrumb
  const pathSegments = location.pathname.replace('/superadmin', '').split('/').filter(Boolean);
  const currentTitle = pathSegments.length > 0
    ? pathSegments[0].replace(/-/g, ' ').toUpperCase()
    : 'DASHBOARD';

  const userRaw =
    localStorage.getItem('superadmin_user') ||
    localStorage.getItem('ajalkar_user') ||
    localStorage.getItem('user');
  let username = 'Super Admin';
  let email = 'superadmin@platform.com';
  try {
    if (userRaw) {
      const u = JSON.parse(userRaw);
      username = u.fullName || u.username || 'Super Admin';
      email = u.email || 'superadmin@platform.com';
    }
  } catch (e) {}

  return (
    <SuperAdminPopupProvider>
      <div
        className="superadmin-layout"
        style={{
          minHeight: '100vh',
          backgroundColor: '#070B14',
          color: '#F1F5F9',
          display: 'flex',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* 18-Item Fixed & Scrollable Sidebar with Direct Logout */}
        <SuperAdminSidebar onLogout={handleLogout} />

        {/* Main Content Area */}
        <div
          style={{
            marginLeft: '16rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: '100vh',
            backgroundColor: '#070B14',
          }}
        >
          {/* Top Navbar */}
          <header
            style={{
              height: '64px',
              borderBottom: '1px solid #1E293B',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8' }}>
              <span style={{ color: '#CBD5E1' }}>Super Admin</span>
              <ChevronRight style={{ width: '14px', height: '14px', color: '#64748B' }} />
              <span style={{ color: '#818CF8', fontWeight: 700 }}>{currentTitle}</span>
            </div>

            {/* Right Header Action Items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Operational App Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #1E293B', paddingRight: '14px' }}>
                <button
                  type="button"
                  onClick={handleGoToHotelDashboard}
                  style={{
                    fontSize: '0.74rem',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1E293B',
                    color: '#E2E8F0',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
                  title="Go to Hotel Management Operational Dashboard"
                >
                  <span>🏨 Hotel Dashboard</span>
                </button>
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={() => navigate('/superadmin/notifications')}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title="Platform Notifications"
              >
                <Bell style={{ width: '16px', height: '16px' }} />
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '9999px',
                    backgroundColor: '#6366F1',
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    boxShadow: '0 0 6px #6366F1',
                  }}
                />
              </button>

              {/* Admin User Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  <Shield style={{ width: '16px', height: '16px' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>{username}</p>
                  <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: 0, lineHeight: 1.2 }}>{email}</p>
                </div>
              </div>

              {/* Top Header Logout Action */}
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#F87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginLeft: '4px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.28)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
                title="Sign Out to Login Page"
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Page Content Body */}
          <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SuperAdminPopupProvider>
  );
};
