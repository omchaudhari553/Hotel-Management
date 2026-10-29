import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage, LanguageCode } from '../context/LanguageContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  CheckCircle2,
  Globe,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const rawIndustry = (
    searchParams.get('industry') ||
    location.state?.industry ||
    localStorage.getItem('ajalkar_industry') ||
    'HOTEL'
  ).toUpperCase();

  const industryName = rawIndustry === 'MESS' ? t('mess', 'Mess') : rawIndustry === 'CAFE' ? t('cafe', 'Cafe') : t('hotel', 'Hotel');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedIdentifier = localStorage.getItem('ajalkar_remember_identifier');
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      showToast('error', t('enterIdentifierError', 'Please enter your username, email, or mobile number'));
      return;
    }
    if (!password) {
      showToast('error', t('enterPasswordError', 'Please enter your password'));
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier.trim(), password, rememberMe);
      showToast('success', t('loginSuccess', 'Logged in successfully!'));
      const industry = res?.business?.industryType || (localStorage.getItem('ajalkar_industry') as string);
      if (industry && ['HOTEL', 'MESS', 'CAFE'].includes(industry.toUpperCase())) {
        localStorage.setItem('ajalkar_industry', industry.toUpperCase());
        navigate(`/${industry.toLowerCase()}/dashboard`, { replace: true });
      } else {
        const fallbackInd = (localStorage.getItem('ajalkar_industry') as string) || 'HOTEL';
        navigate(`/get-started?step=2&industry=${fallbackInd}`, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('invalidCredentialsError', 'Invalid credentials. Please check your email/mobile and password.');
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('error', t('enterForgotEmailError', 'Please enter your registered email address'));
      return;
    }
    setForgotSent(true);
    showToast('success', t('resetEmailSent', 'Password reset instructions sent to your email!'));
  };

  return (
    <>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          padding: '32px 28px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
        }}
      >
        {/* Language Selector Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '6px 12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
            <Globe size={15} color="#ea580c" />
            <span>{t('selectLanguage', 'Language')}:</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { code: 'en' as LanguageCode, label: 'English' },
              { code: 'mr' as LanguageCode, label: 'मराठी' },
              { code: 'hi' as LanguageCode, label: 'हिन्दी' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: language === lang.code ? '1.5px solid #ea580c' : '1px solid #E2E8F0',
                  backgroundColor: language === lang.code ? '#ea580c' : '#FFFFFF',
                  color: language === lang.code ? '#FFFFFF' : '#334155',
                  fontSize: '0.8rem',
                  fontWeight: language === lang.code ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: language === lang.code ? '0 2px 4px rgba(234, 88, 12, 0.2)' : 'none',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Segmented Auth Navigation Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '10px',
              textAlign: 'center',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              color: '#090040',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(9, 0, 64, 0.08)',
            }}
          >
            {t('login', 'Login')}
          </div>
          <Link
            to="/signup"
            style={{
              padding: '10px',
              textAlign: 'center',
              borderRadius: '10px',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            {t('newUserSetup', 'Sign Up / Register')}
          </Link>
        </div>

        {/* Header Branding */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#F0EEF8',
              border: '1px solid #D7D0F0',
              color: '#090040',
              fontSize: '0.74rem',
              fontWeight: 800,
              marginBottom: '10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={12} color="#F59E0B" />
            <span>AJALKAR POS-BILLING</span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#090040', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {language === 'mr' ? `${industryName} कार्यक्षेत्रात लॉगिन करा` : language === 'hi' ? `${industryName} कार्यक्षेत्र में लॉगिन करें` : `Login to ${industryName} Workspace`}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '6px' }}>
            {language === 'mr' ? `तुमच्या ${industryName.toLowerCase()} व्यवस्थापनासाठी लॉगिन माहिती प्रविष्ट करा` : language === 'hi' ? `अपने ${industryName.toLowerCase()} संचालन का प्रबंधन करने के लिए अपना विवरण दर्ज करें` : `Enter your credentials to manage your ${industryName.toLowerCase()} operations`}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Email / Mobile Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#090040' }}>
              <span>{t('usernameEmailOrMobile', 'Username, Email Address, or Mobile Number')}</span>
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <div className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }}>
                <Mail size={18} />
              </div>
              <input
                type="text"
                required
                className="form-control"
                style={{
                  height: '48px',
                  paddingLeft: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  fontSize: '0.92rem',
                  backgroundColor: '#FFFFFF',
                  color: '#090040',
                  transition: 'all 0.2s ease',
                }}
                placeholder={t('usernamePlaceholder', 'e.g. admin, owner@hotel.com, or 9876543210')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#090040', marginBottom: 0 }}>
                <span>{t('password', 'Password')}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(identifier.includes('@') ? identifier : '');
                  setForgotSent(false);
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#090040',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('forgotPassword', 'Forgot Password?')}
              </button>
            </div>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <div className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control"
                style={{
                  height: '48px',
                  paddingLeft: '44px',
                  paddingRight: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  fontSize: '0.92rem',
                  backgroundColor: '#F8FAFC',
                  transition: 'all 0.2s ease',
                }}
                placeholder={t('passwordPlaceholder', 'Enter your account password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#090040', width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <span>{t('rememberMe', 'Remember login on this computer')}</span>
            </label>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '4px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 16px -3px rgba(9, 0, 64, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t('authenticatingSession', 'Authenticating Session...')}</span>
              </>
            ) : (
              <>
                <span>{t('loginToDashboard', 'Login to Dashboard')}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Link to New Business Registration */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '0.86rem', color: '#64748B' }}>
            {t('newToAjalkar', 'New to Ajalkar POS-Billing?')}{' '}
          </span>
          <Link
            to="/get-started?step=1"
            style={{
              color: '#090040',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none',
            }}
          >
            {t('startBusinessRegistration', 'Start Business Registration (4 Steps) →')}
          </Link>
        </div>

        {/* Back Link to Welcome */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <Link to="/get-started?step=1" style={{ color: '#64748B', fontSize: '0.84rem', textDecoration: 'none', fontWeight: 600 }}>
            {t('backToBusinessSelection', '← Back to Business Selection')}
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} color="#090040" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#090040' }}>{t('resetPassword', 'Reset Password')}</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
              >
                <X size={20} />
              </button>
            </div>

            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={42} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontWeight: 800, color: '#090040' }}>{t('success', 'Instructions Sent!')}</h4>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '6px' }}>
                  {language === 'mr' ? `आम्ही पासवर्ड रीसेट सूचना ${forgotEmail} वर पाठवल्या आहेत. कृपया तुमचा इनबॉक्स तपासा.` : language === 'hi' ? `हमने पासवर्ड रीसेट निर्देश ${forgotEmail} पर भेज दिए हैं। कृपया अपना इनबॉक्स देखें।` : `We have sent password reset instructions to ${forgotEmail}. Please check your inbox.`}
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  {t('close', 'Return to Login')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.86rem', color: '#475569' }}>
                  {t('resetPasswordInstructions', 'Enter your registered email address or mobile number to receive account recovery instructions.')}
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', color: '#090040' }}>
                    {t('registeredEmailAddress', 'Email or Mobile Number')}
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ borderColor: '#E2E8F0' }}
                    placeholder={t('usernamePlaceholder', 'e.g. admin@ajalkar.com')}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {t('sendResetInstructions', 'Send Recovery')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

