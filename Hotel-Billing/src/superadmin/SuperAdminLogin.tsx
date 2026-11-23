import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import './superadmin.css';

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('superadmin');
  const [password, setPassword] = useState('SuperAdmin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please provide your admin username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/auth/login', {
        identifier: identifier.trim(),
        password
      });

      const data = res.data?.data;
      const authToken = data?.token || data?.accessToken;
      if (data && authToken) {
        localStorage.setItem('token', authToken);
        localStorage.setItem('superadmin_token', authToken);
        localStorage.setItem('ajalkar_token', authToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('superadmin_user', JSON.stringify(data.user));
        localStorage.setItem('ajalkar_user', JSON.stringify(data.user));
        if (data.business) {
          localStorage.setItem('business', JSON.stringify(data.business));
          localStorage.setItem('ajalkar_business', JSON.stringify(data.business));
        }
        navigate('/superadmin/dashboard', { replace: true });
      } else {
        setError('Login succeeded but token was not returned.');
      }
    } catch (err: any) {
      console.error('Super Admin login failed:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid Super Admin credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultAdmin = () => {
    setIdentifier('superadmin');
    setPassword('SuperAdmin@123');
    setError(null);
  };

  const fillOwnerAdmin = () => {
    setIdentifier('hoteladmin');
    setPassword('Admin@123');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #070B14 75%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(79, 70, 229, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Accent Glow Circle */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '160px',
            height: '160px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
            }}
          >
            <ShieldCheck style={{ width: '34px', height: '34px', color: '#FFFFFF' }} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Super Admin Portal
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, fontWeight: 500 }}>
            Centralized SaaS Management for Hotel, Mess & Cafe
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#F87171',
              fontSize: '0.8rem',
            }}
          >
            <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', zIndex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '8px' }}>
              Admin Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ width: '18px', height: '18px', color: '#64748B', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="superadmin or admin@platform.com"
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#070B14',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  paddingLeft: '44px',
                  paddingRight: '14px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ width: '18px', height: '18px', color: '#64748B', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#070B14',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  paddingLeft: '44px',
                  paddingRight: '14px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              marginTop: '6px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: '12px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to Super Admin</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </>
            )}
          </button>
        </form>

        {/* Quick Helper Credentials */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #1E293B', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#818CF8' }} />
            Quick Demo Credentials
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fillDefaultAdmin}
              style={{
                fontSize: '0.74rem',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                color: '#C7D2FE',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              superadmin / SuperAdmin@123
            </button>
            <button
              type="button"
              onClick={fillOwnerAdmin}
              style={{
                fontSize: '0.74rem',
                backgroundColor: '#1E293B',
                color: '#94A3B8',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              hoteladmin / Admin@123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
