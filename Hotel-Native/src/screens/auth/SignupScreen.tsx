import React, { useState } from 'react';
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
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Hotel,
  Building2,
  UtensilsCrossed,
  Coffee,
  Check,
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GitBranch,
} from 'lucide-react-native';

type IndustryType = 'HOTEL' | 'MESS' | 'CAFE';

interface BusinessOption {
  id: IndustryType;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  features: string[];
  themeColor: string;
  lightBg: string;
}

const BUSINESS_OPTIONS: BusinessOption[] = [
  {
    id: 'HOTEL',
    title: 'Hotel / Restaurant',
    subtitle: 'Rooms, Dine-In Tables, KOT & POS',
    badge: 'Hotel & Restaurant Management',
    description: 'Comprehensive management for Hotels & Restaurants with room check-in/out, dining table maps, kitchen KOT, and combined billing.',
    features: ['Rooms & Guest Check-In/Out', 'Dine-In Tables & Kitchen KOT', 'Food & Beverage Invoices & GST'],
    themeColor: '#7C2D12',
    lightBg: '#FFF7ED',
  },
  {
    id: 'MESS',
    title: 'Mess & Dining',
    subtitle: 'Subscription & Tiffin Service',
    badge: 'Subscriptions & Tiffin',
    description: 'Manage monthly passes, daily meal attendance counters, tiffin route dispatch & customer ledgers.',
    features: ['Monthly Subscriber Passes', 'Daily Attendance Counter', 'Tiffin Route Dispatcher'],
    themeColor: '#09331D',
    lightBg: '#EBF7EE',
  },
  {
    id: 'CAFE',
    title: 'Cafe & Bistro',
    subtitle: 'Table POS & Fast Counter',
    badge: 'Table POS & Kitchen',
    description: 'Visual table layout maps, high-speed touchscreen order counter, KOT & thermal receipts.',
    features: ['Interactive Table Maps', 'Fast Touchscreen POS Counter', 'Instant Kitchen KOT Printing'],
    themeColor: '#A56F63',
    lightBg: '#FCF8F6',
  },
];

export const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { register, isLoading } = useAuth();

  // Wizard Step: 1 = Choose Business, 2 = Business Registration Setup
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Industry Selection
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('HOTEL');

  // Role & Business Type Selection
  const [selectedRole, setSelectedRole] = useState<'SINGLE_USER' | 'ADMIN_OWNER'>('SINGLE_USER');
  const [selectedBusinessType, setSelectedBusinessType] = useState<'SINGLE' | 'MULTI_BRANCH'>('SINGLE');

  // Step 2: Form Inputs
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [gstin, setGstin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const selectedOption = BUSINESS_OPTIONS.find((b) => b.id === selectedIndustry) || BUSINESS_OPTIONS[0];

  const handleStep1Continue = () => {
    setCurrentStep(2);
  };

  const handleRegister = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Business / Enterprise name is required');
      return;
    }
    if (!ownerName.trim()) {
      Alert.alert('Required', 'Owner / Proprietor name is required');
      return;
    }
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid business email address');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Operating physical address is required');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const emailKey = email.trim().toLowerCase();
      const usernameKey = (email.split('@')[0] || '').toLowerCase();
      const meta = {
        role: selectedRole,
        businessType: selectedBusinessType,
        email: emailKey,
        name: ownerName.trim(),
        businessName: businessName.trim(),
        industry: selectedIndustry,
      };

      await AsyncStorage.setItem('@user_meta_' + emailKey, JSON.stringify(meta));
      await AsyncStorage.setItem('@user_meta_' + usernameKey, JSON.stringify(meta));
      await AsyncStorage.setItem('@user_meta_' + ownerName.trim().toLowerCase(), JSON.stringify(meta));
      await AsyncStorage.setItem('@ajalkar_selected_role', selectedRole);
      await AsyncStorage.setItem('@ajalkar_business_type', selectedBusinessType);
      await AsyncStorage.setItem('@ajalkar_industry', selectedIndustry);
      await AsyncStorage.setItem(
        '@ajalkar_user_mode',
        selectedRole === 'SINGLE_USER' || selectedBusinessType === 'SINGLE' ? 'SINGLE' : 'MULTI_BRANCH'
      );

      await register({
        fullName: ownerName.trim(),
        businessName: businessName.trim(),
        email: emailKey,
        phone: cleanMobile,
        address: address.trim(),
        city: city.trim() || 'Pune',
        state: state.trim() || 'Maharashtra',
        gstin: gstin.trim(),
        password,
        industryType: selectedIndustry,
        role: selectedRole,
        businessType: selectedBusinessType,
      });
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Failed to complete registration');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Brand Header */}
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Hotel size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>AJALKAR POS</Text>
          <Text style={styles.brandSubtitle}>Unified Restaurant & Lodging Platform</Text>
        </View>

        {/* Stepper Bar */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.7}
          >
            <View style={[styles.stepCircle, currentStep === 1 ? styles.stepCircleActive : styles.stepCircleCompleted]}>
              {currentStep > 1 ? <Check size={14} color="#FFFFFF" /> : <Text style={styles.stepNumText}>1</Text>}
            </View>
            <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Choose Business</Text>
          </TouchableOpacity>

          <View style={styles.stepDivider} />

          <View style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}>
            <View style={[styles.stepCircle, currentStep === 2 ? styles.stepCircleActive : styles.stepCircleInactive]}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Business Setup</Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* STEP 1: CHOOSE USER BUSINESS                                              */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>Choose Business Type</Text>
            <Text style={styles.formSubheading}>
              Select your hospitality domain to configure tables, billing, and operational workflows.
            </Text>

            <View style={{ gap: 14, marginBottom: 20 }}>
              {BUSINESS_OPTIONS.map((opt) => {
                const isSelected = selectedIndustry === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.industryCard,
                      isSelected && { borderColor: opt.themeColor, borderWidth: 2, backgroundColor: opt.lightBg },
                    ]}
                    onPress={() => setSelectedIndustry(opt.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.industryTopRow}>
                      <View style={[styles.industryIconWrap, { backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9' }]}>
                        {opt.id === 'HOTEL' && <Building2 size={24} color={opt.themeColor} />}
                        {opt.id === 'MESS' && <UtensilsCrossed size={24} color={opt.themeColor} />}
                        {opt.id === 'CAFE' && <Coffee size={24} color={opt.themeColor} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.industryBadge, { color: opt.themeColor }]}>{opt.badge}</Text>
                        <Text style={styles.industryTitle}>{opt.title}</Text>
                        <Text style={styles.industrySubtitle}>{opt.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && { borderColor: opt.themeColor, backgroundColor: opt.themeColor },
                        ]}
                      >
                        {isSelected && <Check size={14} color="#FFFFFF" />}
                      </View>
                    </View>

                    <Text style={styles.industryDesc}>{opt.description}</Text>

                    <View style={styles.featureList}>
                      {opt.features.map((f, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Check size={13} color={opt.themeColor} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: selectedOption.themeColor }]}
              onPress={handleStep1Continue}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Continue to Business Setup</Text>
              <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.switchLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BUSINESS REGISTRATION SETUP (Matching Screenshot)                 */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            {/* Header with selected domain */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: selectedOption.lightBg }]}>
                {selectedIndustry === 'HOTEL' && <Building2 size={24} color={selectedOption.themeColor} />}
                {selectedIndustry === 'MESS' && <UtensilsCrossed size={24} color={selectedOption.themeColor} />}
                {selectedIndustry === 'CAFE' && <Coffee size={24} color={selectedOption.themeColor} />}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.formHeading}>
                  {selectedIndustry === 'HOTEL' && 'Hotel & Restaurant Business Profile'}
                  {selectedIndustry === 'MESS' && 'Mess & Dining Profile Information'}
                  {selectedIndustry === 'CAFE' && 'Cafe & Bistro Profile Information'}
                </Text>
                <Text style={styles.formSubheading}>
                  Configure your business, tables, KOT kitchen, and restaurant profile.
                </Text>
              </View>
            </View>

            {/* SECTION 0: ROLE & BUSINESS TYPE SELECTION */}
            <View style={styles.selectorCard}>
              <View style={{ marginBottom: 12 }}>
                <View style={styles.selectorHeaderRow}>
                  <Text style={styles.selectorLabel}>भूमिका निवडा (Role)</Text>
                  <Text style={styles.selectorBadge}>
                    {selectedRole === 'SINGLE_USER' ? 'सिंगल युझर' : 'अ‍ॅडमिन / ओनर'}
                  </Text>
                </View>
                <View style={styles.selectorBtnRow}>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      selectedRole === 'SINGLE_USER' && styles.selectorBtnActive,
                    ]}
                    onPress={() => {
                      setSelectedRole('SINGLE_USER');
                      setSelectedBusinessType('SINGLE');
                    }}
                    activeOpacity={0.8}
                  >
                    <User
                      size={16}
                      color={selectedRole === 'SINGLE_USER' ? '#EA580C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.selectorBtnText,
                        selectedRole === 'SINGLE_USER' && styles.selectorBtnTextActive,
                      ]}
                    >
                      Single User
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      selectedRole === 'ADMIN_OWNER' && styles.selectorBtnActive,
                    ]}
                    onPress={() => {
                      setSelectedRole('ADMIN_OWNER');
                      setSelectedBusinessType('MULTI_BRANCH');
                    }}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck
                      size={16}
                      color={selectedRole === 'ADMIN_OWNER' ? '#EA580C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.selectorBtnText,
                        selectedRole === 'ADMIN_OWNER' && styles.selectorBtnTextActive,
                      ]}
                    >
                      Admin / Owner
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <View style={styles.selectorHeaderRow}>
                  <Text style={styles.selectorLabel}>व्यवसाय प्रकार (Business Type)</Text>
                  <Text style={[styles.selectorBadge, { color: '#64748B' }]}>
                    {selectedBusinessType === 'SINGLE' ? 'सिंगल' : 'मल्टिपल'}
                  </Text>
                </View>
                <View style={styles.selectorBtnRow}>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      selectedBusinessType === 'SINGLE' && styles.selectorBtnActive,
                    ]}
                    onPress={() => setSelectedBusinessType('SINGLE')}
                    activeOpacity={0.8}
                  >
                    <Building2
                      size={16}
                      color={selectedBusinessType === 'SINGLE' ? '#EA580C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.selectorBtnText,
                        selectedBusinessType === 'SINGLE' && styles.selectorBtnTextActive,
                      ]}
                    >
                      Single
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      selectedBusinessType === 'MULTI_BRANCH' && styles.selectorBtnActive,
                    ]}
                    onPress={() => setSelectedBusinessType('MULTI_BRANCH')}
                    activeOpacity={0.8}
                  >
                    <GitBranch
                      size={16}
                      color={selectedBusinessType === 'MULTI_BRANCH' ? '#EA580C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.selectorBtnText,
                        selectedBusinessType === 'MULTI_BRANCH' && styles.selectorBtnTextActive,
                      ]}
                    >
                      Multiple
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 1. BUSINESS IDENTITY */}
            <Text style={styles.sectionHeader}>1. BUSINESS IDENTITY</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Business / Enterprise Name <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Building2 size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Grand Heritage Hotel & Restaurant"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Owner / Proprietor Name <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="e.g. Rajesh Patil"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            {/* 2. DIRECT CONTACT & VERIFICATION */}
            <Text style={styles.sectionHeader}>2. DIRECT CONTACT & VERIFICATION</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Mobile Number <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <View style={styles.prefixBadge}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Business Email Address <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. contact@grandheritage.com"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 3. LOCATION & STATUTORY DETAILS */}
            <Text style={styles.sectionHeader}>3. LOCATION & STATUTORY DETAILS</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Operating Physical Address <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <MapPin size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. 42 MG Road, Heritage Boulevard"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  City <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Pune"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  State <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={state}
                    onChangeText={setState}
                    placeholder="e.g. Maharashtra"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>GSTIN Number</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <View style={styles.inputWrapper}>
                <FileText size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={gstin}
                  onChangeText={(val) => setGstin(val.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  placeholderTextColor={Colors.textLight}
                  maxLength={15}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* 4. ACCOUNT CREDENTIALS & LOGIN PASSWORD */}
            <Text style={styles.sectionHeader}>4. ACCOUNT CREDENTIALS & LOGIN PASSWORD</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Account Login Password <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create your login password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Confirm Password <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <ShieldCheck size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                  {showConfirmPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Navigation Buttons Row */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setCurrentStep(1)}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <ArrowLeft size={16} color="#475569" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1.6, backgroundColor: selectedOption.themeColor }]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Register & Complete Setup</Text>
                    <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.switchLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090040',
  },
  scroll: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: 18,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  stepItemActive: {
    opacity: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#090040',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stepLabelActive: {
    fontWeight: '800',
    color: '#090040',
  },
  stepDivider: {
    width: 24,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#090040',
  },
  formSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#090040',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  industryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  industryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  industryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  industryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#090040',
    marginTop: 1,
  },
  industrySubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginTop: 10,
  },
  featureList: {
    marginTop: 10,
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 5,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FBFBFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  prefixBadge: {
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  prefixText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  selectorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    marginVertical: 12,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectorBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  selectorBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  selectorBtnActive: {
    borderWidth: 2,
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  selectorBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  selectorBtnTextActive: {
    fontWeight: '700',
    color: '#C2410C',
  },
  primaryBtn: {
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  backBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  switchText: {
    color: '#64748B',
    fontSize: 12,
  },
  switchLink: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '800',
  },
});
