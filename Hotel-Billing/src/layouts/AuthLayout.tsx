import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

export const AuthLayout: React.FC = () => {
  const { user, isAuthenticated, business } = useAuth();
  const { activeIndustryCode } = useIndustry();

  if (isAuthenticated) {
    const isSuperAdmin =
      (user as any)?.isSuperAdmin === true ||
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'PLATFORM_ADMIN' ||
      user?.username === 'superadmin';

    if (isSuperAdmin) {
      return <Navigate to="/superadmin/dashboard" replace />;
    }

    const ind = activeIndustryCode || business?.industryType;
    if (ind && ['HOTEL', 'MESS', 'CAFE'].includes(ind.toUpperCase())) {
      return <Navigate to={`/${ind.toLowerCase()}/dashboard`} replace />;
    }
    return <Navigate to={`/get-started?step=2&industry=${ind || 'HOTEL'}`} replace />;
  }

  return (
    <div
      className="auth-layout-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#F8FAFC',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: '#090040',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
          paddingBottom: '24px',
        }}
      >
        {/* Centered Brand Header */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/get-started" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo.jpg"
              alt="Ajalkar POS-Billing"
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #CBD5E1',
                boxShadow: '0 8px 20px rgba(9, 0, 64, 0.15)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#090040' }}>
                Ajalkar POS-Billing
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                Unified Multi-Industry Suite
              </div>
            </div>
          </Link>
        </div>

        {/* Main Form Box Container */}
        <div style={{ maxWidth: '440px', width: '100%' }} className="animate-fade-in">
          <Outlet />
        </div>

        {/* Bottom Footer Note */}
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94A3B8', marginTop: '20px' }}>
          © {new Date().getFullYear()} Ajalkar Software Group. Multi-Industry Restaurant & Lodging Suite.
        </div>
      </div>
    </div>
  );
};
