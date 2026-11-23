import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Hotel,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react-native';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('hoteladmin');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);

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

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleLogin = async () => {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter email/username and password');
      return;
    }
    try {
      const res = await login({ usernameOrEmail: usernameOrEmail.trim(), password });
      const loggedInUser = res?.user;
      const accountBizType = (loggedInUser as any)?.businessType || ((loggedInUser as any)?.accountRole === 'ADMIN_OWNER' ? 'MULTI_BRANCH' : 'SINGLE');
      const isSingle = accountBizType === 'SINGLE' || loggedInUser?.role !== 'OWNER';
      await AsyncStorage.setItem('@ajalkar_user_mode', isSingle ? 'SINGLE' : 'MULTI_BRANCH');
      await AsyncStorage.setItem('@ajalkar_selected_role', isSingle ? 'SINGLE_USER' : 'ADMIN_OWNER');
      await AsyncStorage.setItem('@ajalkar_business_type', accountBizType);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to authenticate';
      let title = 'Login Failed';
      let msg = errMsg;

      if (errMsg.toLowerCase().includes('invalid username')) {
        title = 'अवैध युझरनेम / Invalid Username';
        msg = 'युझरनेम सापडले नाही. कृपया नोंदणीकृत युझरनेम किंवा ईमेल तपासा.\n\nUsername not found. Please check your registered username or email.';
      } else if (errMsg.toLowerCase().includes('invalid password')) {
        title = 'चुकीचा पासवर्ड / Invalid Password';
        msg = 'पासवर्ड चुकीचा आहे. कृपया योग्य पासवर्ड प्रविष्ट करा.\n\nIncorrect password. Please enter the correct password.';
      }
      Alert.alert(title, msg);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(usernameOrEmail.trim());
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotStep('request');
    setShowForgotModal(true);
  };

  const handleSendOtp = async () => {
    const raw = forgotEmail.trim();
    if (!raw) {
      Alert.alert('Required', 'Please enter your registered email address or username');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.forgotPassword(raw);
      setMaskedEmail(res.maskedEmail || raw);
      setForgotStep('verify');
      setResendCountdown(60);
      Alert.alert('OTP Sent', `A 6-digit OTP has been sent to ${res.maskedEmail || raw}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async () => {
    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit verification code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.resetPassword(forgotEmail.trim(), cleanOtp, newPassword);
      setForgotStep('success');
      Alert.alert('Success', 'Password reset successfully! You can now log in.');
      setUsernameOrEmail(forgotEmail.trim());
      setPassword('');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
      }, 2500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Hotel size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>AJALKAR POS</Text>
          <Text style={styles.brandSubtitle}>Hotel, Restro & Billing Management</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formHeading}>Sign In to Dashboard</Text>
          <Text style={styles.formSubheading}>Enter your credentials to access operations</Text>

          {/* Email / Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email or Username</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={usernameOrEmail}
                onChangeText={setUsernameOrEmail}
                placeholder="e.g. admin@hotel.com"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input with Forgot Password link */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity onPress={handleOpenForgotModal} activeOpacity={0.8}>
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>Login to POS</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Need an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.switchLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password / OTP Recovery Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!forgotLoading) setShowForgotModal(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!forgotLoading) setShowForgotModal(false);
          }}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.keyIconBadge}>
                  <KeyRound size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>Reset Password</Text>
                  <Text style={styles.modalSubheading}>
                    {forgotStep === 'request'
                      ? 'Receive OTP code on Email'
                      : forgotStep === 'verify'
                        ? 'Verify OTP & Set New Password'
                        : 'Password Reset Successful'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowForgotModal(false)}
                disabled={forgotLoading}
                style={styles.modalCloseBtn}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Step 1: Request OTP */}
            {forgotStep === 'request' && (
              <View style={{ gap: 14 }}>
                <Text style={styles.stepInfoText}>
                  Enter your registered email address or username. We will send a 6-digit OTP code to your mail.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered Email / Username *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="e.g. hoteladmin@royalpalace.com"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSendOtp}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.modalSubmitText}>Send OTP to Mail</Text>
                        <ArrowRight size={15} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 2: Verify OTP & Enter New Password */}
            {forgotStep === 'verify' && (
              <View style={{ gap: 14 }}>
                <View style={styles.infoBanner}>
                  <ShieldCheck size={18} color="#2563EB" />
                  <Text style={styles.infoBannerText}>
                    OTP sent to {maskedEmail || forgotEmail}.
                  </Text>
                </View>

                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.inputLabel}>6-Digit Email OTP *</Text>
                    {resendCountdown > 0 ? (
                      <Text style={styles.resendTimerText}>Resend in {resendCountdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={forgotLoading}>
                        <Text style={styles.resendActiveText}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.otpInput}
                    value={forgotOtp}
                    onChangeText={(t) => setForgotOtp(t.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Min 6 characters"
                      placeholderTextColor={Colors.textLight}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 6 }}>
                      {showNewPassword ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter password"
                      placeholderTextColor={Colors.textLight}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 6 }}>
                      {showConfirmPassword ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setForgotStep('request')}
                    disabled={forgotLoading}
                  >
                    <Text style={styles.modalCancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }]}
                    onPress={handleResetPasswordWithOtp}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.modalSubmitText}>Reset Password</Text>
                        <CheckCircle2 size={15} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Success */}
            {forgotStep === 'success' && (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text style={styles.successHeading}>Password Reset Successfully!</Text>
                <Text style={styles.successSubtext}>
                  Your password has been updated. You can now log in using your new credentials.
                </Text>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { width: '100%', marginTop: 18 }]}
                  onPress={() => {
                    setShowForgotModal(false);
                    setForgotStep('request');
                  }}
                >
                  <Text style={styles.modalSubmitText}>Login Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: Colors.accentLight,
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  formHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textHeading,
  },
  formSubheading: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textBody,
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#090040',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FBFBFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: Colors.textHeading,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  switchText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  switchLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  keyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#090040',
  },
  modalSubheading: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepInfoText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    fontWeight: '600',
  },
  otpInput: {
    height: 48,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#090040',
    backgroundColor: '#F8FAFC',
  },
  resendTimerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  resendActiveText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#090040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
    marginBottom: 12,
  },
  successHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#090040',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
