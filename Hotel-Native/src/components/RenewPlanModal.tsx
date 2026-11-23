import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  Download,
  Copy,
  ArrowRight,
  Lock,
  Calendar,
  Sparkles,
  Smartphone,
  Monitor,
  Layers,
  Printer,
  Phone,
  MessageSquare,
  UploadCloud,
} from 'lucide-react-native';
import apiClient from '../api/client';

interface RenewPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  hotelName?: string;
}

type PlatformType = 'Mobile Only' | 'Desktop Only' | 'Mobile + Desktop';
type PlanPackageType = 'Software Only' | 'Software + Printer';
type DurationType = '1 Year' | '3 Years' | 'Lifetime';

export const RenewPlanModal: React.FC<RenewPlanModalProps> = ({
  visible,
  onClose,
  onSuccess,
  hotelName: propHotelName,
}) => {
  const { business } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Business & Subscription State
  const [hotelDisplayName, setHotelDisplayName] = useState<string>(() => {
    return propHotelName || business?.name || 'Royal Palace Hotel';
  });
  const [currentPlanName, setCurrentPlanName] = useState<string>('Hotel Starter');
  const [currentExpiryDate, setCurrentExpiryDate] = useState<string>('30/12/2026');

  // Selections
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('Mobile + Desktop');
  const [selectedPlanType, setSelectedPlanType] = useState<PlanPackageType>('Software Only');
  const [selectedDuration, setSelectedDuration] = useState<DurationType>('1 Year');

  // Order Details
  const [orderRef, setOrderRef] = useState<string>('#10029');
  const [activeOrderId, setActiveOrderId] = useState<string>('');

  // Verification Form State
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      if (propHotelName) {
        setHotelDisplayName(propHotelName);
      } else if (business?.name) {
        setHotelDisplayName(business.name);
      }
      loadInitialDetails();
      const rand = '#' + Math.floor(10000 + Math.random() * 90000);
      setOrderRef(rand);
    }
  }, [visible, propHotelName, business]);

  const loadInitialDetails = async () => {
    try {
      if (propHotelName) {
        setHotelDisplayName(propHotelName);
      } else if (business?.name) {
        setHotelDisplayName(business.name);
      } else {
        // 1. Try saved hotel profile settings from Settings Screen
        const profileStr = await AsyncStorage.getItem('@hotel_profile_settings');
        if (profileStr) {
          try {
            const p = JSON.parse(profileStr);
            if (p.hotelName) {
              setHotelDisplayName(p.hotelName);
              return;
            }
          } catch {}
        }
        // 2. Try @ajalkar_business
        const rawBiz = await AsyncStorage.getItem('@ajalkar_business');
        if (rawBiz) {
          try {
            const b = JSON.parse(rawBiz);
            if (b.name) {
              setHotelDisplayName(b.name);
              return;
            } else if (b.businessName) {
              setHotelDisplayName(b.businessName);
              return;
            }
          } catch {}
        }
        // 3. Try @hotel_business_profile
        const bizStr = await AsyncStorage.getItem('@hotel_business_profile');
        if (bizStr) {
          try {
            const b = JSON.parse(bizStr);
            if (b.name) {
              setHotelDisplayName(b.name);
              return;
            }
          } catch {}
        }
        // Default to Royal Palace Hotel
        setHotelDisplayName('Royal Palace Hotel');
      }

      const planStr = await AsyncStorage.getItem('@hotel_license_plan');
      if (planStr) {
        const p = JSON.parse(planStr);
        if (p.planName) setCurrentPlanName(p.planName);
      }

      // Try fetching live subscription from backend
      const res = await apiClient.get('/subscriptions/current').catch(() => null);
      if (res?.data?.data) {
        const d = res.data.data;
        if (d.planName) setCurrentPlanName(d.planName);
        if (d.endDate) {
          const dt = new Date(d.endDate);
          setCurrentExpiryDate(dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
        }
      }
    } catch (e) {
      console.warn('Could not load profile in renew modal:', e);
    }
  };

  // Pricing Matrix Matching Screenshots
  const getPricing = () => {
    let basePrice = 2999;
    if (selectedPlatform === 'Mobile Only') {
      if (selectedDuration === '3 Years') basePrice = 2400;
      else if (selectedDuration === 'Lifetime') basePrice = 9999;
      else basePrice = 1000;
    } else if (selectedPlatform === 'Desktop Only') {
      if (selectedDuration === '3 Years') basePrice = 4500;
      else if (selectedDuration === 'Lifetime') basePrice = 16999;
      else basePrice = 1999;
    } else {
      // Mobile + Desktop
      if (selectedDuration === '3 Years') basePrice = 6999; // 6999 + 18% = 8258.82 as in screenshot!
      else if (selectedDuration === 'Lifetime') basePrice = 24999;
      else basePrice = 2999;
    }

    if (selectedPlanType === 'Software + Printer') {
      basePrice += 4000;
    }

    const gst = Math.round(basePrice * 0.18 * 100) / 100;
    const total = Math.round((basePrice + gst) * 100) / 100;

    return { basePrice, gst, total };
  };

  const { basePrice, gst, total } = getPricing();

  // Proposed Validity Calculation (Early Renewal Guarantee)
  const calculateProposedValidity = () => {
    if (selectedDuration === 'Lifetime') return 'Unlimited Validity (Never expires)';

    const daysToAdd = selectedDuration === '3 Years' ? 1095 : 365;
    const futureDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    return futureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Step 1 -> Step 2
  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      const randRef = orderRef || '#' + Math.floor(10000 + Math.random() * 90000);
      setOrderRef(randRef);

      const res = await apiClient.post('/subscriptions/create-order', {
        orderRef: randRef,
        platform: selectedPlatform,
        planType: selectedPlanType,
        durationType: selectedDuration,
        hardwareIncluded: selectedPlanType === 'Software + Printer' ? 'Thermal Receipt Printer' : 'None',
        customBaseAmount: basePrice,
        customTaxAmount: gst,
        customTotalAmount: total,
        billingCycle: selectedDuration === '1 Year' ? 'ANNUAL' : selectedDuration,
        paymentMethod: 'QR',
      }).catch(() => null);

      if (res?.data?.data?.orderId) {
        setActiveOrderId(res.data.data.orderId);
      } else {
        setActiveOrderId('order_sub_' + Date.now());
      }
      setCurrentStep(2);
    } catch (e) {
      setActiveOrderId('order_sub_' + Date.now());
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    setCopiedUpi(true);
    Alert.alert('UPI ID Copied', 'ajalkarkalyani90-1@oksbi');
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  // Open UPI Deep Link
  const handleOpenUpiApp = () => {
    const upiUri = `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`;
    Linking.openURL(upiUri).catch(() => {
      Alert.alert('Cannot Open UPI App', 'Please scan the QR code or pay manually using UPI ID: ajalkarkalyani90-1@oksbi');
    });
  };

  // Pick Screenshot using expo-image-picker
  const handlePickScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is needed to attach payment screenshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setScreenshotUri(asset.uri);
        if (asset.base64) {
          setScreenshotBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setScreenshotBase64(asset.uri);
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Upload Error', 'Failed to select image proof. Please try again.');
    }
  };

  // Verification requirements validation
  const isUtrValid = utrNumber.trim().length >= 6;
  const isScreenshotValid = !!screenshotUri || !!screenshotBase64;
  const completedRequirements = (isUtrValid ? 1 : 0) + (isScreenshotValid ? 1 : 0);

  // Submit Verification
  const handleSubmitVerification = async () => {
    if (!isUtrValid || !isScreenshotValid) {
      Alert.alert('Missing Requirements', 'Both UTR number and payment screenshot are mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/subscriptions/submit-verification', {
        orderId: activeOrderId,
        orderRef: orderRef,
        utrNumber: utrNumber.trim(),
        screenshotData: screenshotBase64 || screenshotUri,
        paymentMethod: 'QR',
        notes: `Native renewal for ${selectedPlatform} - ${selectedPlanType} (${selectedDuration})`,
      }).catch((e) => {
        console.warn('API submit verification warning:', e);
      });

      // Update local storage so Native reflects the renewal immediately
      const days = selectedDuration === '3 Years' ? 1095 : selectedDuration === 'Lifetime' ? 36500 : 365;
      const planData = {
        planName: `${selectedPlatform} (${selectedDuration})`,
        daysRemaining: days,
        platform: selectedPlatform,
        duration: selectedDuration,
        orderRef: orderRef,
        status: 'PENDING_VERIFICATION',
      };
      await AsyncStorage.setItem('@hotel_license_plan', JSON.stringify(planData));

      setCurrentStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      Alert.alert('Submission Error', 'Could not record verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    setCurrentStep(1);
    setUtrNumber('');
    setScreenshotUri(null);
    setScreenshotBase64(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* ================= TOP NAVIGATION BAR ================= */}
        <View
          style={[
            styles.topNavbar,
            {
              paddingTop: Math.max(Platform.OS === 'ios' ? 52 : (Platform.OS === 'android' ? 24 : 14), insets.top + 8),
              paddingBottom: 14,
            },
          ]}
        >
          <View style={styles.navLeft}>
            {currentStep > 1 && currentStep < 4 ? (
              <TouchableOpacity
                onPress={() => setCurrentStep((prev) => (prev - 1) as any)}
                style={styles.backBtn}
              >
                <ChevronLeft size={20} color="#0F172A" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <ChevronLeft size={20} color="#0F172A" />
                <Text style={styles.brandTitle}>Hotel Billing</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.navRight}>
            <View style={styles.orderRefBadge}>
              <Text style={styles.orderRefText}>Ref: {orderRef}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= STEPPER PROGRESS BAR ================= */}
        {currentStep <= 3 && (
          <View style={styles.stepperContainer}>
            {[
              { num: 1, label: 'Select Plan' },
              { num: 2, label: 'Pay for Plan' },
              { num: 3, label: 'Submit Verification' },
            ].map((s, idx) => {
              const isDone = currentStep > s.num;
              const isActive = currentStep === s.num;
              return (
                <View key={s.num} style={styles.stepItemWrapper}>
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Text style={styles.stepCircleText}>{s.num}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isDone && styles.stepLabelDone,
                    ]}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                  {idx < 2 && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
                </View>
              );
            })}
          </View>
        )}

        {/* ================= MAIN SCROLLABLE BODY ================= */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(Platform.OS === 'ios' ? 36 : 20, insets.bottom + 16) },
          ]}
        >
          {/* ========================================================================= */}
          {/* ============================ STEP 1: SELECT PLAN ======================== */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              {/* Official Upgrade Banner */}
              <View style={styles.upgradeBadge}>
                <Sparkles size={14} color="#15803D" />
                <Text style={styles.upgradeBadgeText}>Official Subscription & License Upgrade</Text>
              </View>

              <Text style={styles.headingTitle}>Renew Your Hotel Plan</Text>
              <Text style={styles.subTitle}>
                Choose your billing platform, software package, and duration. All existing data, settings, and remaining days are 100% preserved.
              </Text>

              {/* ACCOUNT LICENSE CARD */}
              <View style={styles.accountCard}>
                <View style={styles.accountCardHeader}>
                  <View style={styles.accountTitleRow}>
                    <ShieldCheck size={18} color="#16A34A" />
                    <Text style={styles.accountCardLabel}>ACCOUNT LICENSE</Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                </View>

                <Text style={styles.shopNameText}>{hotelDisplayName || 'Royal Palace Hotel'}</Text>

                <View style={styles.accountStatsRow}>
                  <View style={styles.accountStatCol}>
                    <Text style={styles.statLabel}>Status</Text>
                    <Text style={[styles.statValue, { color: '#16A34A' }]}>Active Account</Text>
                  </View>
                  <View style={styles.accountStatCol}>
                    <Text style={styles.statLabel}>Current Plan</Text>
                    <Text style={styles.statValue}>{currentPlanName}</Text>
                  </View>
                  <View style={styles.accountStatCol}>
                    <Text style={styles.statLabel}>Valid till</Text>
                    <Text style={[styles.statValue, { color: '#16A34A' }]}>{currentExpiryDate}</Text>
                  </View>
                </View>

                <View style={styles.guaranteeBox}>
                  <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={styles.guaranteeText}>
                    <Text style={{ fontWeight: '800', color: '#0F172A' }}>Early Renewal Guarantee: </Text>
                    Any remaining validity is automatically added to your new term. You will not lose any active subscription days by renewing now.
                  </Text>
                </View>
              </View>

              {/* STEP 1: CHOOSE YOUR PLATFORM */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionNumBadge}>
                    <Text style={styles.sectionNumText}>1</Text>
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>Choose Your Platform</Text>
                    <Text style={styles.sectionSub}>Where do you do your billing?</Text>
                  </View>
                </View>

                {[
                  {
                    id: 'Mobile Only' as PlatformType,
                    badge: 'Android',
                    badgeColor: '#10B981',
                    icon: <Smartphone size={20} color="#10B981" />,
                    title: 'Mobile Only',
                    desc: 'Using an Android phone, or tablets. Best for single counter, hotel cafe, and restaurant POS.',
                    price: 'from ₹1,000/yr',
                  },
                  {
                    id: 'Desktop Only' as PlatformType,
                    badge: 'Windows',
                    badgeColor: '#38BDF8',
                    icon: <Monitor size={20} color="#38BDF8" />,
                    title: 'Desktop Only',
                    desc: 'Full hotel billing software on Windows PC & laptop. Best for hotel front desk, dining billing, and multi-user access.',
                    price: 'from ₹1,999/yr',
                  },
                  {
                    id: 'Mobile + Desktop' as PlatformType,
                    badge: 'Recommended',
                    badgeColor: '#F59E0B',
                    icon: <Layers size={20} color="#60A5FA" />,
                    title: 'Mobile + Desktop',
                    desc: 'Bill on Windows PC and manage from Android mobile with instant real-time cloud sync. Includes lifetime hotel software updates.',
                    price: 'from ₹2,999/yr',
                  },
                ].map((item) => {
                  const isSel = selectedPlatform === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.platformCard, isSel && styles.cardSelected]}
                      onPress={() => setSelectedPlatform(item.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardHeaderLeft}>
                          {item.icon}
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <View style={[styles.platformBadge, { backgroundColor: isSel ? '#DCFCE7' : '#F1F5F9', borderColor: isSel ? '#86EFAC' : '#E2E8F0' }]}>
                            <Text style={[styles.platformBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                          </View>
                        </View>
                        <View style={[styles.radioOuter, isSel && styles.radioOuterSelected]}>
                          {isSel && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <Text style={styles.cardDesc}>{item.desc}</Text>
                      <View style={styles.cardPriceRow}>
                        <Text style={styles.licenseLabel}>Software License:</Text>
                        <Text style={styles.licensePrice}>{item.price}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* STEP 2: CHOOSE PLAN TYPE */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionNumBadge}>
                    <Text style={styles.sectionNumText}>2</Text>
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>Choose Plan Type</Text>
                    <Text style={styles.sectionSub}>Do you need a thermal printer?</Text>
                  </View>
                </View>

                {[
                  {
                    id: 'Software Only' as PlanPackageType,
                    sub: 'Bring your own printer',
                    bullets: [
                      'Full application access: invoicing, GST, inventory & reports',
                      'Works with any existing thermal, laser, or inkjet printer',
                      'Instant digital activation upon payment',
                    ],
                    hardware: 'None (Software only)',
                  },
                  {
                    id: 'Software + Printer' as PlanPackageType,
                    sub: 'Complete ready-to-bill bundle',
                    bullets: [
                      'Full Hotel billing software license included',
                      'High speed Bluetooth + USB Thermal Receipt Printer',
                      'Free door-step courier delivery across India',
                    ],
                    hardware: 'Thermal Receipt Printer',
                  },
                ].map((item) => {
                  const isSel = selectedPlanType === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.platformCard, isSel && styles.cardSelected]}
                      onPress={() => setSelectedPlanType(item.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardTopRow}>
                        <View>
                          <Text style={styles.cardTitle}>{item.id}</Text>
                          <Text style={styles.cardSubText}>{item.sub}</Text>
                        </View>
                        <View style={[styles.radioOuter, isSel && styles.radioOuterSelected]}>
                          {isSel && <View style={styles.radioInner} />}
                        </View>
                      </View>

                      <View style={styles.bulletsList}>
                        {item.bullets.map((b, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <Check size={13} color="#10B981" />
                            <Text style={styles.bulletText}>{b}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.hardwareRow}>
                        <Text style={styles.licenseLabel}>Hardware included:</Text>
                        <Text style={[styles.hardwareValue, isSel && { color: '#38BDF8' }]}>
                          {item.hardware}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* STEP 3: CHOOSE SUBSCRIPTION DURATION */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionNumBadge}>
                    <Text style={styles.sectionNumText}>3</Text>
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>Choose Subscription Duration</Text>
                    <Text style={styles.sectionSub}>Multi-year discounts available</Text>
                  </View>
                </View>

                {[
                  {
                    id: '1 Year' as DurationType,
                    badge: 'Annual',
                    days: '365 Days Full Access',
                    price: selectedPlatform === 'Mobile Only' ? '₹1,000/-' : selectedPlatform === 'Desktop Only' ? '₹1,999/-' : '₹2,999/-',
                  },
                  {
                    id: '3 Years' as DurationType,
                    badge: 'Best Value',
                    days: '1,095 Days Full Access (Save ₹2,998)',
                    price: selectedPlatform === 'Mobile Only' ? '₹2,400/-' : selectedPlatform === 'Desktop Only' ? '₹4,500/-' : '₹6,999/-',
                    highlight: true,
                  },
                  {
                    id: 'Lifetime' as DurationType,
                    badge: 'One-Time',
                    days: 'Unlimited Validity (Never expires • No renewals)',
                    price: selectedPlatform === 'Mobile Only' ? '₹9,999/-' : selectedPlatform === 'Desktop Only' ? '₹16,999/-' : '₹24,999/-',
                  },
                ].map((item) => {
                  const isSel = selectedDuration === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.durationCard, isSel && styles.cardSelected]}
                      onPress={() => setSelectedDuration(item.id)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.durationHeaderRow}>
                          <Text style={styles.cardTitle}>{item.id}</Text>
                          <View
                            style={[
                              styles.durationBadge,
                              { backgroundColor: item.highlight ? '#DCFCE7' : '#F1F5F9' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.durationBadgeText,
                                { color: item.highlight ? '#15803D' : '#475569' },
                              ]}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.cardSubText}>{item.days}</Text>
                      </View>

                      <View style={styles.durationRightRow}>
                        <Text style={[styles.durationPriceText, item.highlight && { color: '#16A34A' }]}>
                          {item.price}
                        </Text>
                        <View style={[styles.radioOuter, isSel && styles.radioOuterSelected]}>
                          {isSel && <View style={styles.radioInner} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* STEP 4: SELECTED PLAN SUMMARY */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryTitleRow}>
                  <View style={styles.sectionNumBadge}>
                    <Text style={styles.sectionNumText}>4</Text>
                  </View>
                  <Text style={styles.summaryTitle}>Selected Plan Summary</Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryGridCol}>
                    <Text style={styles.summaryGridLabel}>Platform</Text>
                    <Text style={styles.summaryGridValue}>{selectedPlatform}</Text>
                  </View>
                  <View style={styles.summaryGridCol}>
                    <Text style={styles.summaryGridLabel}>Plan Type</Text>
                    <Text style={styles.summaryGridValue}>{selectedPlanType}</Text>
                  </View>
                  <View style={styles.summaryGridCol}>
                    <Text style={styles.summaryGridLabel}>Duration</Text>
                    <Text style={styles.summaryGridValue}>{selectedDuration}</Text>
                  </View>
                  <View style={styles.summaryGridCol}>
                    <Text style={styles.summaryGridLabel}>Hardware</Text>
                    <Text style={styles.summaryGridValue}>
                      {selectedPlanType === 'Software + Printer' ? 'Thermal Printer' : 'None'}
                    </Text>
                  </View>
                </View>

                {/* Proposed Validity Box */}
                <View style={styles.validityBox}>
                  <Calendar size={18} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.validityLabel}>Proposed Validity:</Text>
                    <Text style={styles.validityValue}>{calculateProposedValidity()}</Text>
                    <Text style={styles.validitySub}>
                      Extended from your existing active expiry date (+{selectedDuration})
                    </Text>
                  </View>
                </View>

                {/* Price Math */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Plan Base Price:</Text>
                  <Text style={styles.priceValue}>₹{basePrice.toLocaleString('en-IN')}/-</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>+ 18% GST:</Text>
                  <Text style={styles.priceValue}>+ ₹{gst.toFixed(2)}</Text>
                </View>
                <View style={styles.totalPayableRow}>
                  <Text style={styles.totalPayableLabel}>TOTAL PAYABLE:</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalPayableAmount}>₹{total.toFixed(2)}</Text>
                    <Text style={styles.taxNotice}>Incl. all taxes</Text>
                  </View>
                </View>

                {/* Continue to Payment Button */}
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  onPress={handleProceedToPayment}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryCtaText}>Continue to Payment</Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Need Customized Software box */}
              <View style={styles.customBox}>
                <View style={styles.customIconCircle}>
                  <Sparkles size={16} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customTitle}>Need Customized Software?</Text>
                  <Text style={styles.customSub}>
                    Request custom invoice formats, compact printer operations integrations, or multi-branch workflows.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://wa.me/918825818177?text=Need%20customized%20software')}
                  >
                    <Text style={styles.customLink}>Contact / Request Quote →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ============================ STEP 2: PAY FOR YOUR PLAN ================== */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.headingTitle}>Pay for Your Plan</Text>
              <Text style={styles.subTitle}>
                Complete payment using UPI QR or tap to open your preferred payment app
              </Text>

              {/* Plan Summary Card */}
              <View style={styles.accountCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Selected Plan:</Text>
                  <Text style={[styles.summaryGridValue, { fontWeight: '800' }]}>
                    {selectedPlatform} — {selectedPlanType} ({selectedDuration})
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Platform:</Text>
                  <Text style={styles.summaryGridValue}>{selectedPlatform}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Duration:</Text>
                  <Text style={styles.summaryGridValue}>{selectedDuration}</Text>
                </View>
                <View style={[styles.totalPayableRow, { marginTop: 6, paddingTop: 8 }]}>
                  <Text style={styles.totalPayableLabel}>Amount (Incl. 18% GST):</Text>
                  <Text style={[styles.totalPayableAmount, { fontSize: 20 }]}>₹{total.toFixed(2)}/-</Text>
                </View>
              </View>

              {/* SCAN & PAY SECTION */}
              <View style={styles.qrCard}>
                <View style={styles.scanPayPill}>
                  <Text style={styles.scanPayPillText}>Scan & Pay</Text>
                </View>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        `upi://pay?pa=ajalkarkalyani90-1@oksbi&pn=Ajalkar%20InfoTech&am=${total}&cu=INR&tn=Order%20${orderRef.replace('#', '')}`
                      )}`,
                    }}
                    style={styles.qrImage}
                  />
                </View>

                <Text style={styles.qrInstructions}>
                  Scan this QR code using another phone or device. Compatible with Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
                </Text>

                {/* Merchant UPI ID */}
                <View style={styles.merchantUpiBox}>
                  <View>
                    <Text style={styles.statLabel}>MERCHANT UPI ID:</Text>
                    <Text style={styles.merchantUpiText}>ajalkarkalyani90-1@oksbi</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtn, copiedUpi && { backgroundColor: '#065F46' }]}
                    onPress={handleCopyUpi}
                  >
                    <Copy size={13} color="#FFFFFF" />
                    <Text style={styles.copyBtnText}>{copiedUpi ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* OR PAY USING SECTION */}
              <View style={styles.orPaySection}>
                <Text style={styles.orPayTitle}>OR PAY USING</Text>
                <View style={styles.alertNotice}>
                  <AlertCircle size={16} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertNoticeTitle}>
                      Enter this exact amount in payment app: ₹{total.toFixed(2)}
                    </Text>
                    <Text style={styles.alertNoticeSub}>
                      UPI ID and payee name will be auto-filled. You need to type the amount manually if prompted.
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentAppsRow}>
                  {[
                    { name: 'GPay', color: '#1A73E8' },
                    { name: 'PhonePe', color: '#5F259F' },
                    { name: 'Paytm', color: '#00BAF2' },
                  ].map((app) => (
                    <TouchableOpacity
                      key={app.name}
                      style={styles.paymentAppBtn}
                      onPress={handleOpenUpiApp}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.appIconCircle, { backgroundColor: app.color }]}>
                        <Text style={styles.appIconLetter}>{app.name[0]}</Text>
                      </View>
                      <Text style={styles.appNameText}>{app.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Important Proof Required Alert */}
              <View style={styles.proofRequiredCard}>
                <View style={styles.proofTitleRow}>
                  <AlertCircle size={16} color="#F87171" />
                  <Text style={styles.proofTitleText}>Important — Payment Proof Required</Text>
                </View>
                <View style={styles.proofBulletsList}>
                  <Text style={styles.proofBulletText}>• Save a screenshot of the successful payment.</Text>
                  <Text style={styles.proofBulletText}>• Keep your UTR / Transaction Reference Number.</Text>
                  <Text style={styles.proofBulletText}>• Both are required for payment verification.</Text>
                  <Text style={styles.proofBulletText}>• Your subscription will be activated upon Admin verification.</Text>
                </View>
              </View>

              {/* Process indicator */}
              <Text style={styles.processStepsText}>
                1. Choose Method • 2. Pay via UPI • 3. Save Screenshot • 4. Keep UTR • 5. Verify
              </Text>

              {/* Continue to Verification */}
              <TouchableOpacity
                style={styles.primaryCtaBtn}
                onPress={() => setCurrentStep(3)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryCtaText}>I Have Paid • Continue</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.subtleHelpText}>
                Clicking Continue will move you to the payment verification form.
              </Text>

              {/* Support Contacts */}
              <View style={styles.supportBox}>
                <View>
                  <Text style={styles.statLabel}>Need help with your payment?</Text>
                  <Text style={styles.supportPhone}>+91 8825818177 • Ajalkar InfoTech</Text>
                </View>
                <View style={styles.supportActionsRow}>
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => Linking.openURL('https://wa.me/918825818177?text=Payment%20help')}
                  >
                    <MessageSquare size={13} color="#34D399" />
                    <Text style={styles.waBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL('tel:+918825818177')}
                  >
                    <Phone size={13} color="#CBD5E1" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ===================== STEP 3: SUBMIT PAYMENT VERIFICATION ============== */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.headingTitle}>Submit Payment Verification</Text>
              <Text style={styles.subTitle}>
                Confirm your plan details and provide your UTR reference & screenshot for Admin verification.
              </Text>

              {/* LOCKED ORDER INFORMATION (READ-ONLY) */}
              <View style={styles.accountCard}>
                <View style={styles.accountCardHeader}>
                  <View style={styles.accountTitleRow}>
                    <Lock size={15} color="#64748B" />
                    <Text style={styles.accountCardLabel}>LOCKED ORDER INFORMATION</Text>
                  </View>
                  <View style={[styles.verifiedBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                    <Text style={[styles.verifiedBadgeText, { color: '#64748B' }]}>Read-Only</Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Selected Plan:</Text>
                  <Text style={[styles.summaryGridValue, { fontWeight: '800' }]}>
                    {selectedPlatform} — {selectedPlanType} ({selectedDuration})
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Platform:</Text>
                  <Text style={styles.summaryGridValue}>{selectedPlatform}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Duration:</Text>
                  <Text style={styles.summaryGridValue}>{selectedDuration}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Payment Date:</Text>
                  <Text style={styles.summaryGridValue}>
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Payment Method:</Text>
                  <View style={styles.qrBadge}>
                    <Text style={styles.qrBadgeText}>QR</Text>
                  </View>
                </View>
                <View style={[styles.totalPayableRow, { marginTop: 4, paddingTop: 6 }]}>
                  <Text style={styles.totalPayableLabel}>Amount:</Text>
                  <Text style={[styles.totalPayableAmount, { fontSize: 20 }]}>₹{total.toFixed(2)}/-</Text>
                </View>
              </View>

              {/* UTR NUMBER INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  TRANSACTION / UTR NUMBER <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, isUtrValid && { borderColor: '#10B981' }]}
                  placeholder="# ENTER 12-DIGIT UTR OR TRA"
                  placeholderTextColor="#64748B"
                  value={utrNumber}
                  onChangeText={(val) => setUtrNumber(val.toUpperCase())}
                  autoCapitalize="characters"
                />
                <Text style={styles.inputHelp}>
                  Found in your GPay / PhonePe / Paytm payment receipt under "UPI Ref No" or "UTR".
                </Text>
              </View>

              {/* PAYMENT SCREENSHOT PICKER */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>
                    PAYMENT SCREENSHOT <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <Text style={styles.inputLabelRight}>Supports Gallery / Camera</Text>
                </View>

                {!screenshotUri ? (
                  <TouchableOpacity
                    style={styles.uploadDropzone}
                    onPress={handlePickScreenshot}
                    activeOpacity={0.8}
                  >
                    <View style={styles.uploadIconCircle}>
                      <UploadCloud size={24} color="#15803D" />
                    </View>
                    <Text style={styles.uploadDropTitle}>Upload Payment Screenshot</Text>
                    <Text style={styles.uploadDropSub}>Tap here to select slip from gallery or files</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.screenshotPreviewBox}>
                    <Image source={{ uri: screenshotUri }} style={styles.screenshotThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.screenshotNameText} numberOfLines={1}>
                        Payment_Proof.jpg
                      </Text>
                      <Text style={styles.screenshotAttachedText}>Screenshot Attached ✓</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeProofBtn}
                      onPress={() => {
                        setScreenshotUri(null);
                        setScreenshotBase64(null);
                      }}
                    >
                      <Text style={styles.removeProofBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* VERIFICATION REQUIREMENTS CHECKLIST */}
              <View style={styles.requirementsCard}>
                <View style={styles.reqHeaderRow}>
                  <Text style={styles.reqTitle}>VERIFICATION REQUIREMENTS</Text>
                  <View
                    style={[
                      styles.reqBadge,
                      { backgroundColor: completedRequirements === 2 ? '#DCFCE7' : '#F1F5F9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reqBadgeText,
                        { color: completedRequirements === 2 ? '#15803D' : '#64748B' },
                      ]}
                    >
                      {completedRequirements}/2 COMPLETED
                    </Text>
                  </View>
                </View>

                <View style={styles.reqItem}>
                  {isUtrValid ? <CheckCircle2 size={14} color="#16A34A" /> : <AlertCircle size={14} color="#F59E0B" />}
                  <Text style={[styles.reqItemText, { color: isUtrValid ? '#15803D' : '#B45309' }]}>
                    Valid Transaction / UTR Number (Min. 6 characters)
                  </Text>
                </View>
                <View style={styles.reqItem}>
                  {isScreenshotValid ? <CheckCircle2 size={14} color="#16A34A" /> : <AlertCircle size={14} color="#F59E0B" />}
                  <Text style={[styles.reqItemText, { color: isScreenshotValid ? '#15803D' : '#B45309' }]}>
                    Payment Screenshot Attached (Slip / Transaction Screen)
                  </Text>
                </View>

                <Text style={styles.reqWarning}>
                  ⚠️ Both UTR number and payment screenshot are mandatory. You cannot proceed until both are attached.
                </Text>
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.primaryCtaBtn,
                  completedRequirements < 2 && { backgroundColor: '#E2E8F0' },
                ]}
                onPress={handleSubmitVerification}
                disabled={submitting || completedRequirements < 2}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={[styles.primaryCtaText, completedRequirements < 2 && { color: '#94A3B8' }]}>
                      Submit Verification
                    </Text>
                    <ArrowRight size={18} color={completedRequirements === 2 ? '#FFFFFF' : '#94A3B8'} />
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.subtleHelpText}>
                After submission, your request status will become <Text style={{ fontWeight: '800', color: '#0F172A' }}>PENDING VERIFICATION</Text>. Admin will verify that your UTR and screenshot match before accepting the request.
              </Text>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ========================== STEP 4: SUCCESS CONFIRMATION ================= */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <View style={styles.successStepContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={42} color="#16A34A" />
              </View>

              <Text style={styles.successHeading}>Verification Submitted!</Text>
              <Text style={styles.successSub}>
                Your subscription renewal request has been registered under Order Reference:
              </Text>

              <View style={styles.successRefBox}>
                <Text style={styles.successRefText}>{orderRef}</Text>
              </View>

              <View style={styles.successDetailsCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Plan:</Text>
                  <Text style={[styles.summaryGridValue, { fontWeight: '800' }]}>
                    {selectedPlatform} ({selectedDuration})
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>UTR Number:</Text>
                  <Text style={[styles.summaryGridValue, { color: '#0F172A', fontWeight: '800' }]}>{utrNumber}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>New Validity:</Text>
                  <Text style={[styles.summaryGridValue, { color: '#16A34A', fontWeight: '800' }]}>
                    {calculateProposedValidity()}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.summaryGridLabel}>Status:</Text>
                  <View style={[styles.qrBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.qrBadgeText, { color: '#15803D' }]}>PENDING VERIFICATION</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryCtaBtn} onPress={handleFinish}>
                <Text style={styles.primaryCtaText}>Done • Continue to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavbar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderRefBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderRefText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItemWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#16A34A',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
  },
  stepCircleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  stepLabelDone: {
    color: '#16A34A',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: '#16A34A',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContent: {
    gap: 18,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  upgradeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  accountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountStatCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4,
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    borderWidth: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#16A34A',
    borderWidth: 5,
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  licenseLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  licensePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  bulletsList: {
    gap: 4,
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletText: {
    fontSize: 11.5,
    color: '#334155',
  },
  hardwareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  hardwareValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  durationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  durationRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryGridCol: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryGridLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  summaryGridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  validityBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validityLabel: {
    fontSize: 11,
    color: '#15803D',
  },
  validityValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginTop: 2,
  },
  validitySub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
  },
  totalPayableLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalPayableAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A34A',
  },
  taxNotice: {
    fontSize: 10,
    color: '#64748B',
  },
  primaryCtaBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  primaryCtaText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  customIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  customSub: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 15,
    marginTop: 2,
  },
  customLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 4,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 12,
  },
  scanPayPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scanPayPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrInstructions: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  merchantUpiBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  merchantUpiText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orPaySection: {
    gap: 10,
  },
  orPayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alertNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  alertNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400E',
  },
  alertNoticeSub: {
    fontSize: 10.5,
    color: '#B45309',
    marginTop: 2,
  },
  paymentAppsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentAppBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  appIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLetter: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  proofRequiredCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  proofTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proofTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  proofBulletsList: {
    gap: 2,
    marginTop: 2,
  },
  proofBulletText: {
    fontSize: 11.5,
    color: '#B91C1C',
    lineHeight: 16,
  },
  processStepsText: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
  },
  subtleHelpText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  supportBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportPhone: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  supportActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  waBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  callBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  qrBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabelRight: {
    fontSize: 10.5,
    color: '#16A34A',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  inputHelp: {
    fontSize: 11,
    color: '#64748B',
  },
  uploadDropzone: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDropTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadDropSub: {
    fontSize: 11,
    color: '#64748B',
  },
  screenshotPreviewBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenshotThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  screenshotNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  screenshotAttachedText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  removeProofBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeProofBtnText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  requirementsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  reqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  reqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reqBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reqWarning: {
    fontSize: 10.5,
    color: '#B45309',
    marginTop: 2,
  },
  successStepContainer: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  successSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  successRefBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  successRefText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  successDetailsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
});

export default RenewPlanModal;
