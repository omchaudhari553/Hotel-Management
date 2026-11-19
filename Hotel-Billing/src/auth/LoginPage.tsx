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
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../services/authService';

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
  // Forgot Password / OTP Flow States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'success'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Resend OTP Countdown
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

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
      const loggedInUser = res?.user;
      const isBranchUser = Boolean(loggedInUser?.branchId);
      const isOwner =
        loggedInUser?.isOwner === true ||
        loggedInUser?.role === 'OWNER' ||
        (!isBranchUser && (loggedInUser?.roles?.includes('ROLE_OWNER') || loggedInUser?.roles?.includes('OWNER')));

      if (isOwner && !isBranchUser) {
        navigate('/owner/dashboard', { replace: true });
        return;
      }

      if (isBranchUser && loggedInUser?.branchId) {
        localStorage.setItem('ajalkar_selected_branch_id', String(loggedInUser.branchId));
        localStorage.setItem('ajalkar_selected_main_branch_id', String(loggedInUser.branchId));
        localStorage.setItem('ajalkar_industry', 'HOTEL');
        navigate('/hotel/dashboard', { replace: true });
        return;
      }

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('error', language === 'mr' ? 'कृपया नोंदणीकृत ईमेल किंवा युझरनेम प्रविष्ट करा' : language === 'hi' ? 'कृपया पंजीकृत ईमेल या यूज़रनेम दर्ज करें' : 'Please enter your registered email or username');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.forgotPassword(forgotEmail.trim());
      setMaskedEmail(res.maskedEmail || forgotEmail.trim());
      setForgotStep('verify');
      setResendCountdown(60);
      showToast(
        'success',
        language === 'mr'
          ? `तुमच्या ईमेलवर (${res.maskedEmail || forgotEmail}) ६-अंकी OTP पाठवला आहे!`
          : language === 'hi'
          ? `आपके ईमेल (${res.maskedEmail || forgotEmail}) पर ६-अंकीय OTP भेजा गया है!`
          : `6-digit OTP sent to ${res.maskedEmail || forgotEmail}!`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      showToast('error', language === 'mr' ? 'कृपया पूर्ण ६-अंकी OTP प्रविष्ट करा' : language === 'hi' ? 'कृपया पूरा ६-अंकीय OTP दर्ज करें' : 'Please enter the complete 6-digit OTP');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('error', language === 'mr' ? 'नवीन पासवर्ड किमान ६ वर्णांचा असावा' : language === 'hi' ? 'नया पासवर्ड कम से कम ६ अक्षरों का होना चाहिए' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', language === 'mr' ? 'पासवर्ड जुळत नाहीत, कृपया पुन्हा तपासा' : language === 'hi' ? 'पासवर्ड मेल नहीं खाते, कृपया पुनः जांचें' : 'Passwords do not match');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.resetPassword(forgotEmail.trim(), cleanOtp, newPassword);
      setForgotStep('success');
      showToast('success', language === 'mr' ? 'पासवर्ड यशस्वीरीत्या बदलला!' : language === 'hi' ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया!' : 'Password reset successfully!');
      setIdentifier(forgotEmail.trim());
      setPassword('');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
      }, 2500);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setForgotLoading(false);
    }
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
            to="/get-started?step=1"
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
            {t('newUserSetup', 'New User Setup')}
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
                  setForgotEmail(identifier.trim());
                  setForgotStep('request');
                  setForgotOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
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

      {/* Forgot Password with Email OTP Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => {
            if (!forgotLoading) setShowForgotModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={22} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#090040' }}>
                    {language === 'mr' ? 'पासवर्ड रीसेट करा' : language === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {forgotStep === 'request'
                      ? (language === 'mr' ? 'ईमेलवर OTP मिळवा' : language === 'hi' ? 'ईमेल पर OTP प्राप्त करें' : 'Get OTP on Email')
                      : forgotStep === 'verify'
                      ? (language === 'mr' ? 'OTP पडताळा व नवीन पासवर्ड सेट करा' : language === 'hi' ? 'OTP सत्यापित करें और नया पासवर्ड सेट करें' : 'Verify OTP & set new password')
                      : (language === 'mr' ? 'पासवर्ड यशस्वीरीत्या अपडेट झाला' : language === 'hi' ? 'पासवर्ड सफलतापूर्वक अपडेट हुआ' : 'Password updated')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step 1: Request OTP */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  {language === 'mr'
                    ? 'तुमचा नोंदणीकृत ईमेल किंवा युझरनेम प्रविष्ट करा. आम्ही तुमच्या ईमेलवर ६-अंकी OTP पाठवू.'
                    : language === 'hi'
                    ? 'अपना पंजीकृत ईमेल या यूज़रनेम दर्ज करें। हम आपके ईमेल पर ६-अंकीय OTP भेजेंगे।'
                    : 'Enter your registered email address or username. We will send a 6-digit OTP verification code to your mail.'}
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    {language === 'mr' ? 'नोंदणीकृत ईमेल / युझरनेम' : language === 'hi' ? 'पंजीकृत ईमेल / यूज़रनेम' : 'Registered Email / Username'} *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. hoteladmin@royalpalace.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                      style={{
                        width: '100%',
                        height: '46px',
                        paddingLeft: '44px',
                        paddingRight: '14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.92rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1.3,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #090040 0%, #1A0B66 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(9, 0, 64, 0.25)',
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{language === 'mr' ? 'OTP पाठवत आहे...' : language === 'hi' ? 'OTP भेज रहे हैं...' : 'Sending OTP...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{language === 'mr' ? 'ईमेलवर OTP पाठवा' : language === 'hi' ? 'ईमेल पर OTP भेजें' : 'Send OTP to Mail'}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Verify OTP & Enter New Password */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleResetPasswordWithOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', padding: '12px 14px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.84rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#2563EB" />
                    <span>
                      {language === 'mr'
                        ? `OTP ${maskedEmail || forgotEmail} वर पाठवला आहे.`
                        : language === 'hi'
                        ? `OTP ${maskedEmail || forgotEmail} पर भेजा गया है।`
                        : `OTP sent to ${maskedEmail || forgotEmail}.`}
                    </span>
                  </div>
                </div>

                {/* OTP Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      {language === 'mr' ? '६-अंकी ईमेल OTP' : language === 'hi' ? '६-अंकीय ईमेल OTP' : '6-Digit Email OTP'} *
                    </label>
                    {resendCountdown > 0 ? (
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                        {language === 'mr' ? `पुन्हा पाठवा (${resendCountdown}s)` : language === 'hi' ? `पुनः भेजें (${resendCountdown}s)` : `Resend in ${resendCountdown}s`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={forgotLoading}
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        {language === 'mr' ? 'OTP पुन्हा पाठवा' : language === 'hi' ? 'OTP पुनः भेजें' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="• • • • • •"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={forgotLoading}
                    style={{
                      width: '100%',
                      height: '48px',
                      textAlign: 'center',
                      letterSpacing: '10px',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      border: '2px solid #CBD5E1',
                      boxSizing: 'border-box',
                      color: '#090040',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    {language === 'mr' ? 'नवीन पासवर्ड' : language === 'hi' ? 'नया पासवर्ड' : 'New Password'} *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder={language === 'mr' ? 'किमान ६ वर्ण' : language === 'hi' ? 'कम से कम ६ अक्षर' : 'Min 6 characters'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={forgotLoading}
                      style={{
                        width: '100%',
                        height: '44px',
                        paddingLeft: '44px',
                        paddingRight: '40px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    {language === 'mr' ? 'नवीन पासवर्ड पुन्हा टाका' : language === 'hi' ? 'नया पासवर्ड पुनः दर्ज करें' : 'Confirm New Password'} *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <Lock size={18} />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder={language === 'mr' ? 'पासवर्डची पुष्टी करा' : language === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={forgotLoading}
                      style={{
                        width: '100%',
                        height: '44px',
                        paddingLeft: '44px',
                        paddingRight: '40px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'mr' ? 'मागे जा' : language === 'hi' ? 'पीछे जाएं' : 'Back'}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1.4,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{language === 'mr' ? 'पडताळणी करत आहे...' : language === 'hi' ? 'सत्यापित कर रहे हैं...' : 'Verifying...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{language === 'mr' ? 'पासवर्ड अपडेट करा' : language === 'hi' ? 'पासवर्ड अपडेट करें' : 'Reset Password'}</span>
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success */}
            {forgotStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFDF5', border: '2px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={36} color="#059669" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#090040' }}>
                  {language === 'mr' ? 'पासवर्ड यशस्वीरीत्या बदलला!' : language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल गया!' : 'Password Reset Successfully!'}
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '8px', lineHeight: 1.5 }}>
                  {language === 'mr'
                    ? 'तुमचा पासवर्ड अपडेट झाला आहे. आता तुम्ही नवीन पासवर्डने थेट लॉगिन करू शकता.'
                    : language === 'hi'
                    ? 'आपका पासवर्ड अपडेट हो गया है। अब आप नए पासवर्ड से लॉगिन कर सकते हैं।'
                    : 'Your password has been updated. You can now log in using your new credentials.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotStep('request');
                  }}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#090040',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {language === 'mr' ? 'आता लॉगिन करा' : language === 'hi' ? 'अब लॉगिन करें' : 'Login Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
