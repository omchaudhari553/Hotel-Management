import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, business } = useAuth();
  const { activeIndustryCode } = useIndustry();

  if (isAuthenticated) {
    const ind = activeIndustryCode || business?.industryType;
    if (ind && ['HOTEL', 'MESS', 'CAFE'].includes(ind.toUpperCase())) {
      return <Navigate to={`/${ind.toLowerCase()}/dashboard`} replace />;
    }
    return <Navigate to={`/get-started?step=2&industry=${ind || 'HOTEL'}`} replace />;
  }

  return (
    <div
      className="scrollable-page-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#F8FAFC',
        padding: '36px 16px 48px 16px',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: '#090040',
        fontFamily: 'var(--font-sans)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          margin: 'auto 0',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Centered Brand Header */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/get-started" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo.jpg"
              alt="Ajalkar POS-Billing"
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #CBD5E1',
                boxShadow: '0 8px 24px rgba(9, 0, 64, 0.16)',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#090040' }}>
                Ajalkar POS-Billing
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '3px' }}>
                Unified Multi-Industry Suite
              </div>
            </div>
          </Link>
        </div>

        {/* Main Form Box Container */}
        <div style={{ maxWidth: '460px', width: '100%' }} className="animate-fade-in">
          <Outlet />
        </div>

        {/* Bottom Footer Note */}
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94A3B8', marginTop: '24px' }}>
          © {new Date().getFullYear()} Ajalkar Software Group. Multi-Industry Restaurant & Lodging Suite.
        </div>
      </div>
    </div>
  );
};
