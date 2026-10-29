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
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: '40px 20px',
        color: '#090040',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Centered Brand Header */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Link to="/get-started" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '18px' }}>
          <img
            src="/logo.jpg"
            alt="Ajalkar POS-Billing"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3.5px solid #CBD5E1',
              boxShadow: '0 10px 28px rgba(9, 0, 64, 0.2)',
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
      <div style={{ maxWidth: '440px', width: '100%' }} className="animate-fade-in">
        <Outlet />
      </div>

      {/* Bottom Footer Note */}
      <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94A3B8', marginTop: '24px' }}>
        © {new Date().getFullYear()} Ajalkar Software Group. Multi-Industry Restaurant & Lodging Suite.
      </div>
    </div>
  );
};

