import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Share,
  KeyboardAvoidingView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Header } from '../../components/Header';
import { AppNavbar } from '../../components/AppNavbar';
import { useBranch } from '../../context/BranchContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient, ensureBackendToken } from '../../api/client';
import { sanitizeMobileInput, validatePhoneNumber } from '../../utils/phoneUtils';
import {
  Users,
  ChefHat,
  UtensilsCrossed,
  Shield,
  Phone,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  IndianRupee,
  TrendingUp,
  Award,
  Filter,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Briefcase,
  ChevronDown,
  CreditCard,
} from 'lucide-react-native';

export type StaffRole = 'Captain' | 'Waiter' | 'Chef' | 'Cashier' | 'Manager' | 'Receptionist' | 'Helper' | 'Cleaner' | 'Security';
export type StaffShift = 'Morning' | 'Evening' | 'Full Day';
export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'OFF';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  shift: StaffShift;
  phone: string;
  status: 'ON_DUTY' | 'OFF_DUTY';
  grossSalary: number;
  deduction: number;
  joiningDate?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  salaryFrequency?: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
}

export const DESIGNATIONS: string[] = [
  'Manager',
  'Receptionist',
  'Waiter',
  'Chef',
  'Helper',
  'Cleaner',
  'Security',
  'Cashier',
];

export const ID_PROOF_TYPES: string[] = [
  'Aadhar Card',
  'PAN Card',
  'Driving License',
  'Voter ID',
];

export const SALARY_FREQUENCIES: string[] = [
  'Monthly',
  'Daily',
  'Weekly',
  'Bi-Weekly',
];

export interface AddStaffFormData {
  name: string;
  phone: string;
  address: string;
  designation: string;
  joiningDate: string;
  idProofType: string;
  idProofNumber: string;
  grossSalary: string;
  salaryFrequency: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
  deduction: string;
}

export const getTodayFormattedDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const validateIdProofNumber = (
  type: string,
  value: string,
  lang: 'en' | 'mr' | 'hi' = 'en'
): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return lang === 'mr' ? 'कृपया ओळखपत्र क्रमांक भरा.' : 'Please fill the ID proof number.';
  }
  switch (type) {
    case 'Aadhar Card':
      if (!/^\d{12}$/.test(trimmed)) {
        return lang === 'mr'
          ? 'आधार कार्ड मध्ये बरोबर १२ अंक असणे आवश्यक आहे.'
          : 'Aadhar Card must contain exactly 12 digits.';
      }
      break;
    case 'PAN Card':
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(trimmed.toUpperCase())) {
        return lang === 'mr'
          ? 'पॅन कार्ड स्वरूप ABCDE1234F प्रमाणे असावे.'
          : 'PAN Card format must be like ABCDE1234F.';
      }
      break;
    case 'Driving License':
      if (!/^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(trimmed.toUpperCase()) && trimmed.length < 10) {
        return lang === 'mr'
          ? 'ड्रायव्हिंग लायसन्स स्वरूप MH1220241234567 प्रमाणे असावे.'
          : 'Driving License format must be like MH1220241234567.';
      }
      break;
    case 'Voter ID':
      if (trimmed.length < 5) {
        return lang === 'mr' ? 'मतदार ओळखपत्र वैध नाही.' : 'Voter ID is invalid.';
      }
      break;
  }
  return '';
};

export interface DayAttendance {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 's1', name: 'Rahul Patil', role: 'Manager', shift: 'Full Day', phone: '+91 98220 12345', status: 'ON_DUTY', grossSalary: 28000, deduction: 1000, joiningDate: '2024-01-15' },
  { id: 's2', name: 'Ramesh Gaikwad', role: 'Waiter', shift: 'Morning', phone: '+91 98221 23456', status: 'ON_DUTY', grossSalary: 18000, deduction: 500, joiningDate: '2024-03-01' },
  { id: 's3', name: 'Suresh Kadam', role: 'Waiter', shift: 'Morning', phone: '+91 98222 34567', status: 'ON_DUTY', grossSalary: 14000, deduction: 500, joiningDate: '2024-05-10' },
  { id: 's4', name: 'Akash Shinde', role: 'Waiter', shift: 'Evening', phone: '+91 98223 45678', status: 'ON_DUTY', grossSalary: 14000, deduction: 0, joiningDate: '2024-06-20' },
  { id: 's5', name: 'Chef Anand', role: 'Chef', shift: 'Full Day', phone: '+91 98224 56789', status: 'ON_DUTY', grossSalary: 32000, deduction: 1500, joiningDate: '2023-11-01' },
  { id: 's6', name: 'Chef Vikram', role: 'Chef', shift: 'Evening', phone: '+91 98225 67890', status: 'OFF_DUTY', grossSalary: 26000, deduction: 1000, joiningDate: '2024-02-15' },
  { id: 's7', name: 'Pooja Jadhav', role: 'Cashier', shift: 'Morning', phone: '+91 98226 78901', status: 'ON_DUTY', grossSalary: 16000, deduction: 500, joiningDate: '2024-04-12' },
];

const STORAGE_STAFF_KEY = '@hotel_staff_list_v2';
const STORAGE_ATTENDANCE_PREFIX = '@hotel_staff_att_';

export const StaffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const { activeBranch } = useBranch();
  const { t, language, formatDate, toDevanagari, formatNumber, localizeGuestName } = useLanguage();
  const insets = useSafeAreaInsets();

  // Navigation tab: 'ROSTER' | 'DAILY' | 'MONTHLY' | 'ADD'
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'DAILY' | 'MONTHLY' | 'ADD'>('MONTHLY');

  // Staff members state
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 640;

  // Month selector for Monthly Reports (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Selected date for Daily Attendance (YYYY-MM-DD)
  const [dailyDate, setDailyDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Attendance store: { [staffId_YYYY-MM-DD]: AttendanceStatus }
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [detailStaff, setDetailStaff] = useState<StaffMember | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [pickerModalType, setPickerModalType] = useState<'DESIGNATION' | 'ID_PROOF' | 'FREQUENCY' | null>(null);

  // Add Staff Form Data (matching Vite web form)
  const [form, setForm] = useState<AddStaffFormData>({
    name: '',
    phone: '',
    address: '',
    designation: 'Chef',
    joiningDate: getTodayFormattedDate(),
    idProofType: 'Aadhar Card',
    idProofNumber: '',
    grossSalary: '',
    salaryFrequency: 'Monthly',
    deduction: '0',
  });
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // Load saved staff & attendance
  useEffect(() => {
    loadSavedData();
    const interval = setInterval(() => {
      loadSavedData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Save attendance when modified
  useEffect(() => {
    if (Object.keys(attendanceMap).length > 0) {
      saveAttendanceData(attendanceMap);
    }
  }, [attendanceMap]);

  const loadSavedData = async () => {
    try {
      // 1. Staff: Fetch live from Spring Boot backend first
      try {
        await ensureBackendToken();
        const res = await apiClient.get('/hotel/staff');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const mapped: StaffMember[] = res.data.data.map((bStaff: any) => ({
            id: 's' + bStaff.id,
            name: bStaff.name,
            role: bStaff.designation || 'Waiter',
            shift: bStaff.shift || 'Morning',
            phone: bStaff.phone || '+91 98000 00000',
            status: bStaff.status === 'INACTIVE' ? 'OFF_DUTY' : 'ON_DUTY',
            grossSalary: Number(bStaff.basicSalary) || 16000,
            deduction: Number(bStaff.deduction) || 0,
            joiningDate: bStaff.joiningDate,
            address: bStaff.address || '',
            idProofType: bStaff.idProofType || 'Aadhar Card',
            idProofNumber: bStaff.idProofNumber || '',
            salaryFrequency: bStaff.salaryFrequency || 'Monthly',
          }));
          setStaffList(mapped);
          await AsyncStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(mapped));
        } else {
          const savedStaff = await AsyncStorage.getItem(STORAGE_STAFF_KEY);
          if (savedStaff) {
            setStaffList(JSON.parse(savedStaff));
          }
        }
      } catch {
        const savedStaff = await AsyncStorage.getItem(STORAGE_STAFF_KEY);
        if (savedStaff) {
          setStaffList(JSON.parse(savedStaff));
        }
      }

      // 2. Attendance
      const savedAtt = await AsyncStorage.getItem(STORAGE_ATTENDANCE_PREFIX + selectedMonth);
      if (savedAtt) {
        setAttendanceMap(JSON.parse(savedAtt));
      } else {
        // Generate baseline demo attendance for the month
        const baseline = generateBaselineAttendance(INITIAL_STAFF, selectedMonth);
        setAttendanceMap(baseline);
      }
    } catch (e) {
      console.log('Error loading staff attendance data', e);
    }
  };

  const saveAttendanceData = async (data: Record<string, AttendanceStatus>) => {
    try {
      await AsyncStorage.setItem(STORAGE_ATTENDANCE_PREFIX + selectedMonth, JSON.stringify(data));
    } catch {}
  };

  // Generate realistic baseline attendance for selected month (strictly past/today only, NO future data)
  const generateBaselineAttendance = (staff: StaffMember[], monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map: Record<string, AttendanceStatus> = {};

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = now.getDate();

    // If future month: return empty map (do not generate any data)
    if (monthStr > currentMonthStr) {
      return map;
    }

    // Only generate up to current day for current month; full month for past months
    const maxDay = monthStr === currentMonthStr ? Math.min(daysInMonth, currentDay) : daysInMonth;

    staff.forEach((s, idx) => {
      for (let day = 1; day <= maxDay; day++) {
        const dateKey = `${monthStr}-${String(day).padStart(2, '0')}`;
        const key = `${s.id}_${dateKey}`;
        const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Sun

        // Realistic pattern: 1 weekly off, mostly present, occasional half-day or absent
        if (dayOfWeek === (idx % 6)) {
          map[key] = 'OFF';
        } else if ((day + idx) % 15 === 0) {
          map[key] = 'ABSENT';
        } else if ((day + idx) % 9 === 0) {
          map[key] = 'HALF_DAY';
        } else {
          map[key] = 'PRESENT';
        }
      }
    });
    return map;
  };

  // Switch month (prevent advancing into future months)
  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (delta > 0 && newMonthStr > currentMonthStr) {
      return; // Prevent navigating to future month
    }

    setSelectedMonth(newMonthStr);

    AsyncStorage.getItem(STORAGE_ATTENDANCE_PREFIX + newMonthStr).then((saved) => {
      if (saved) {
        setAttendanceMap(JSON.parse(saved));
      } else {
        const baseline = generateBaselineAttendance(staffList, newMonthStr);
        setAttendanceMap(baseline);
      }
    });
  };

  // Days in selected month
  const daysInSelectedMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);

  // Month Display Name in English, Marathi, Hindi
  const monthDisplayName = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthsMr = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (language === 'mr') return `${monthsMr[m - 1]} ${toDevanagari(y)}`;
    if (language === 'hi') return `${monthsHi[m - 1]} ${toDevanagari(y)}`;
    return `${monthsEn[m - 1]} ${y}`;
  }, [selectedMonth, language, toDevanagari]);

  // Toggle on/off duty
  const toggleDutyStatus = (id: string) => {
    const updated = staffList.map((s) =>
      s.id === id ? { ...s, status: s.status === 'ON_DUTY' ? ('OFF_DUTY' as const) : ('ON_DUTY' as const) } : s
    );
    setStaffList(updated);
    AsyncStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(updated));
  };

  // Mark single day attendance
  const setStaffAttendance = (staffId: string, date: string, status: AttendanceStatus) => {
    const key = `${staffId}_${date}`;
    setAttendanceMap((prev) => ({
      ...prev,
      [key]: status,
    }));
  };

  // Mark all staff present on a specific date
  const markAllPresent = (date: string) => {
    const updated = { ...attendanceMap };
    staffList.forEach((s) => {
      updated[`${s.id}_${date}`] = 'PRESENT';
    });
    setAttendanceMap(updated);
    Alert.alert(t('success', 'Success'), `Marked all ${staffList.length} staff as Present for ${date}`);
  };

  const translateDesignation = (desig: string) => {
    switch (desig) {
      case 'Manager': return t('Manager', language === 'mr' ? 'व्यवस्थापक' : 'Manager');
      case 'Receptionist': return t('Receptionist', language === 'mr' ? 'स्वागतकर्ता' : 'Receptionist');
      case 'Waiter': return t('Waiter', language === 'mr' ? 'वेटर' : 'Waiter');
      case 'Chef': return t('Chef', language === 'mr' ? 'शेफ' : 'Chef');
      case 'Helper': return t('Helper', language === 'mr' ? 'मदतनीस' : 'Helper');
      case 'Cleaner': return t('Cleaner', language === 'mr' ? 'सफाई कामगार' : 'Cleaner');
      case 'Security': return t('Security', language === 'mr' ? 'सुरक्षा रक्षक' : 'Security');
      case 'Cashier': return t('Cashier', language === 'mr' ? 'कॅशियर' : 'Cashier');
      default: return t(desig, desig);
    }
  };

  const translateIdProof = (type: string) => {
    switch (type) {
      case 'Aadhar Card': return language === 'mr' ? 'आधार कार्ड' : language === 'hi' ? 'आधार कार्ड' : 'Aadhar Card';
      case 'PAN Card': return language === 'mr' ? 'पॅन कार्ड' : language === 'hi' ? 'पैन कार्ड' : 'PAN Card';
      case 'Driving License': return language === 'mr' ? 'ड्रायव्हिंग लायसन्स' : language === 'hi' ? 'ड्राइविंग लाइसेंस' : 'Driving License';
      case 'Voter ID': return language === 'mr' ? 'मतदार ओळखपत्र' : language === 'hi' ? 'मतदाता पहचान पत्र' : 'Voter ID';
      default: return t(type, type);
    }
  };

  const translateSalaryFrequency = (freq: string) => {
    switch (freq) {
      case 'Monthly': return language === 'mr' ? 'मासिक' : language === 'hi' ? 'मासिक' : 'Monthly';
      case 'Daily': return language === 'mr' ? 'दैनिक' : language === 'hi' ? 'दैनिक' : 'Daily';
      case 'Weekly': return language === 'mr' ? 'साप्ताहिक' : language === 'hi' ? 'साप्ताहिक' : 'Weekly';
      case 'Bi-Weekly': return language === 'mr' ? 'पाक्षिक' : language === 'hi' ? 'पाक्षिक' : 'Bi-Weekly';
      default: return t(freq, freq);
    }
  };

  const handlePhoneChange = (text: string) => {
    const sanitized = sanitizeMobileInput(text);
    setForm((prev) => ({ ...prev, phone: sanitized }));
  };

  const handleCancelAddStaff = () => {
    setShowAddModal(false);
    if (activeTab === 'ADD') {
      setActiveTab('ROSTER');
    }
    setFormSubmitted(false);
    setForm({
      name: '',
      phone: '',
      address: '',
      designation: 'Chef',
      joiningDate: getTodayFormattedDate(),
      idProofType: 'Aadhar Card',
      idProofNumber: '',
      grossSalary: '',
      salaryFrequency: 'Monthly',
      deduction: '0',
    });
  };

  // Add staff with Vite-matching fields and validation
  const handleAddStaff = async () => {
    setFormSubmitted(true);

    if (!form.name.trim()) return;

    if (!/^[A-Za-z\u0900-\u097F\s.'-]+$/.test(form.name.trim())) {
      Alert.alert(
        t('error', 'Error'),
        language === 'mr' ? 'कर्मचाऱ्याच्या नावात फक्त अक्षरे असावीत.' : 'Staff name should contain only letters.'
      );
      return;
    }

    const phoneError = validatePhoneNumber(form.phone, language as any);
    if (phoneError) {
      Alert.alert(t('error', 'Error'), phoneError);
      return;
    }

    if (!form.address.trim()) return;

    if (!form.designation.trim()) return;

    if (!form.joiningDate.trim()) return;

    if (!form.idProofType.trim()) return;

    if (!form.idProofNumber.trim()) return;

    const idProofError = validateIdProofNumber(form.idProofType, form.idProofNumber, language as any);
    if (idProofError) {
      Alert.alert(t('error', 'Error'), idProofError);
      return;
    }

    if (!form.grossSalary.trim() || isNaN(Number(form.grossSalary)) || Number(form.grossSalary) <= 0) {
      Alert.alert(
        t('error', 'Error'),
        language === 'mr' ? 'एकूण पगार ० पेक्षा जास्त असावा.' : 'Gross salary must be greater than 0.'
      );
      return;
    }

    if (!form.deduction.trim() || isNaN(Number(form.deduction)) || Number(form.deduction) < 0) {
      Alert.alert(
        t('error', 'Error'),
        language === 'mr' ? 'कपात रक्कम ऋण असू शकत नाही.' : 'Deduction cannot be negative.'
      );
      return;
    }

    setIsSubmittingStaff(true);
    let createdId = 's-' + Date.now();

    // Format joining date to YYYY-MM-DD for backend
    let isoJoiningDate = form.joiningDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(form.joiningDate)) {
      const [d, m, y] = form.joiningDate.split('-');
      isoJoiningDate = `${y}-${m}-${d}`;
    }

    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/staff', {
        branchId: activeBranch?.id || 1,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        designation: form.designation,
        joiningDate: isoJoiningDate,
        idProofType: form.idProofType,
        idProofNumber: form.idProofNumber.trim(),
        basicSalary: Number(form.grossSalary),
        salaryFrequency: form.salaryFrequency,
        deduction: Number(form.deduction),
        active: true,
      });
      if (res.data?.data?.id) {
        createdId = 's' + res.data.data.id;
      }
    } catch (e) {
      console.warn('Backend staff creation sync warning:', e);
    } finally {
      setIsSubmittingStaff(false);
    }

    const newMember: StaffMember = {
      id: createdId,
      name: form.name.trim(),
      role: form.designation as StaffRole,
      shift: 'Morning',
      phone: form.phone.trim(),
      status: 'ON_DUTY',
      grossSalary: Number(form.grossSalary),
      deduction: Number(form.deduction),
      joiningDate: isoJoiningDate,
      address: form.address.trim(),
      idProofType: form.idProofType,
      idProofNumber: form.idProofNumber.trim(),
      salaryFrequency: form.salaryFrequency,
    };
    const updated = [newMember, ...staffList];
    setStaffList(updated);
    AsyncStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(updated));

    // Also populate baseline attendance for new staff
    const copy = { ...attendanceMap };
    for (let day = 1; day <= daysInSelectedMonth; day++) {
      copy[`${newMember.id}_${selectedMonth}-${String(day).padStart(2, '0')}`] = 'PRESENT';
    }
    setAttendanceMap(copy);

    setShowAddModal(false);
    if (activeTab === 'ADD') {
      setActiveTab('ROSTER');
    }
    setForm({
      name: '',
      phone: '',
      address: '',
      designation: 'Chef',
      joiningDate: getTodayFormattedDate(),
      idProofType: 'Aadhar Card',
      idProofNumber: '',
      grossSalary: '',
      salaryFrequency: 'Monthly',
      deduction: '0',
    });
    setFormSubmitted(false);
    Alert.alert(
      t('success', 'Success'),
      language === 'mr'
        ? `${newMember.name} यांना ${newMember.role} म्हणून यशस्वीरीत्या जोडले गेले!`
        : `${newMember.name} added as ${newMember.role} successfully!`
    );
  };

  // Calculate monthly stats for a staff member (only past days up to today, NO future calculations)
  const getStaffMonthlyStats = (staffId: string) => {
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let off = 0;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = now.getDate();

    let maxDay = daysInSelectedMonth;
    if (selectedMonth > currentMonthStr) {
      maxDay = 0;
    } else if (selectedMonth === currentMonthStr) {
      maxDay = Math.min(daysInSelectedMonth, currentDay);
    }

    for (let day = 1; day <= maxDay; day++) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const status = attendanceMap[`${staffId}_${dateKey}`] || 'PRESENT';
      if (status === 'PRESENT') present++;
      else if (status === 'HALF_DAY') halfDay++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'OFF') off++;
    }

    const workingDays = Math.max(1, maxDay - off);
    const effectivePresent = present + halfDay * 0.5;
    const attendanceRate = maxDay > 0 ? Math.round((effectivePresent / workingDays) * 100) : 0;

    const staffObj = staffList.find((s) => s.id === staffId);
    const gross = staffObj?.grossSalary || 15000;
    const deductionAmt = staffObj?.deduction || 0;
    const dailyRate = gross / (daysInSelectedMonth || 30);
    const earnedSalary = Math.round(effectivePresent * dailyRate + off * dailyRate);
    const netSalary = Math.max(0, earnedSalary - deductionAmt);

    return {
      totalDays: maxDay,
      present,
      halfDay,
      absent,
      off,
      workingDays,
      effectivePresent,
      attendanceRate,
      grossSalary: gross,
      deduction: deductionAmt,
      earnedSalary,
      netSalary,
    };
  };

  // Overall monthly aggregate stats
  const overallMonthlyKPI = useMemo(() => {
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    let totalSalaryPayout = 0;
    let totalRateSum = 0;

    staffList.forEach((s) => {
      const stats = getStaffMonthlyStats(s.id);
      totalPresent += stats.present;
      totalHalfDay += stats.halfDay;
      totalAbsent += stats.absent;
      totalSalaryPayout += stats.netSalary;
      totalRateSum += stats.attendanceRate;
    });

    const avgAttendance = staffList.length > 0 ? Math.round(totalRateSum / staffList.length) : 0;

    return {
      totalStaff: staffList.length,
      totalPresent,
      totalHalfDay,
      totalAbsent,
      totalSalaryPayout,
      avgAttendance,
    };
  }, [staffList, attendanceMap, selectedMonth, daysInSelectedMonth]);

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      const matchesRole = selectedRole === 'ALL' || s.role.toUpperCase() === selectedRole.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, selectedRole]);

  // Export report as CSV / text share
  const handleExportMonthlyReport = async () => {
    let csv = `Staff Monthly Attendance & Salary Report - ${monthDisplayName}\n`;
    csv += `Branch: ${activeBranch.name}\n\n`;
    csv += `ID,Name,Role,Phone,Present Days,Half Days,Absent Days,Off Days,Attendance %,Gross Salary,Deduction,Net Payable\n`;

    staffList.forEach((s, idx) => {
      const stats = getStaffMonthlyStats(s.id);
      csv += `${idx + 1},"${s.name}","${s.role}","${s.phone}",${stats.present},${stats.halfDay},${stats.absent},${stats.off},${stats.attendanceRate}%,₹${stats.grossSalary},₹${stats.deduction},₹${stats.netSalary}\n`;
    });

    csv += `\nTotal Staff: ${staffList.length}\n`;
    csv += `Average Attendance: ${overallMonthlyKPI.avgAttendance}%\n`;
    csv += `Total Monthly Payroll Payout: ₹${overallMonthlyKPI.totalSalaryPayout}\n`;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && (window as any).navigator?.clipboard) {
          await (window as any).navigator.clipboard.writeText(csv);
          Alert.alert('Report Copied', 'Full monthly staff payroll report copied to clipboard!');
        } else {
          Alert.alert('Monthly Report', csv);
        }
      } else {
        await Share.share({
          message: csv,
          title: `Staff_Monthly_Report_${selectedMonth}`,
        });
      }
    } catch (e) {
      Alert.alert('Export', 'Report generated successfully.');
    }
  };

  const onDutyCount = staffList.filter((s) => s.status === 'ON_DUTY').length;

  const renderViteAddStaffForm = (isModal: boolean) => {
    return (
      <View style={[styles.viteStaffCard, isWide && styles.viteStaffCardWide]}>
        {/* Card Title Header */}
        <View style={styles.viteFormHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.viteFormIconBadge}>
              <Users size={18} color="#EA580C" />
            </View>
            <Text style={styles.viteFormTitle}>
              {t('addStaff', 'Add Staff')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viteModalCloseBtn}
            onPress={handleCancelAddStaff}
            activeOpacity={0.7}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 1. Basic Information Row */}
        <View style={[styles.fieldRow, isWide && styles.fieldRow3Col]}>
          {/* Staff Name */}
          <View style={[styles.modalField, isWide && { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('staffName', 'Staff Name')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                formSubmitted && (!form.name.trim() || !/^[A-Za-z\u0900-\u097F\s.'-]+$/.test(form.name.trim()))
                  ? styles.inputErrorBorder
                  : null,
              ]}
              value={form.name}
              onChangeText={(text) => setForm((p) => ({ ...p, name: text }))}
              placeholder={t('enterStaffName', 'Enter staff name')}
              placeholderTextColor="#94A3B8"
            />
            {formSubmitted && !form.name.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseFillStaffName', 'Please fill the staff name.')}
              </Text>
            ) : formSubmitted && form.name.trim() && !/^[A-Za-z\u0900-\u097F\s.'-]+$/.test(form.name.trim()) ? (
              <Text style={styles.errorText}>
                {language === 'mr' ? 'नावात फक्त अक्षरे प्रविष्ट करा.' : 'Staff name should contain only letters.'}
              </Text>
            ) : null}
          </View>

          {/* Phone Number with Real-time 10-digit validation */}
          <View style={[styles.modalField, isWide && { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('phoneNumber', 'Phone Number')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[
                  styles.textInput,
                  formSubmitted && validatePhoneNumber(form.phone, language as any) ? styles.inputErrorBorder : null,
                ]}
                value={form.phone}
                onChangeText={handlePhoneChange}
                placeholder={t('enterPhoneNumber', 'Enter 10 digit number')}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Phone size={16} color="#94A3B8" style={styles.inputInnerIcon} />
            </View>
            {formSubmitted && validatePhoneNumber(form.phone, language as any) ? (
              <Text style={styles.errorText}>
                {validatePhoneNumber(form.phone, language as any)}
              </Text>
            ) : null}
          </View>

          {/* Address */}
          <View style={[styles.modalField, isWide && { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('address', 'Address')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                formSubmitted && !form.address.trim() ? styles.inputErrorBorder : null,
              ]}
              value={form.address}
              onChangeText={(text) => setForm((p) => ({ ...p, address: text }))}
              placeholder={t('enterAddress', 'Enter address')}
              placeholderTextColor="#94A3B8"
            />
            {formSubmitted && !form.address.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseFillAddress', 'Please fill the address.')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 2. Job Details Section */}
        <View style={styles.formSectionHeader}>
          <Briefcase size={16} color="#EA580C" />
          <Text style={styles.formSectionTitle}>
            {t('jobDetails', 'Job Details')}
          </Text>
        </View>

        <View style={[styles.fieldRow, { flexDirection: 'row' }]}>
          {/* Designation Dropdown */}
          <View style={[styles.modalField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('designation', 'Designation')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setPickerModalType('DESIGNATION')}
              activeOpacity={0.8}
            >
              <Text style={styles.selectBoxText}>
                {translateDesignation(form.designation)}
              </Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
            {formSubmitted && !form.designation.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseSelectDesignation', 'Please select the designation.')}
              </Text>
            ) : null}
          </View>

          {/* Joining Date */}
          <View style={[styles.modalField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('joiningDate', 'Joining Date')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[
                  styles.textInput,
                  { paddingRight: 36 },
                  formSubmitted && !form.joiningDate.trim() ? styles.inputErrorBorder : null,
                ]}
                value={form.joiningDate}
                onChangeText={(text) => setForm((p) => ({ ...p, joiningDate: text }))}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#94A3B8"
              />
              <Calendar size={16} color="#94A3B8" style={styles.inputInnerIcon} />
            </View>
            {formSubmitted && !form.joiningDate.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseFillJoiningDate', 'Please fill the joining date.')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 3. ID Proof Section */}
        <View style={styles.formSectionHeader}>
          <CreditCard size={16} color="#EA580C" />
          <Text style={styles.formSectionTitle}>
            {t('idProof', 'ID Proof')}
          </Text>
        </View>

        <View style={[styles.fieldRow, { flexDirection: 'row' }]}>
          {/* ID Proof Type Dropdown */}
          <View style={[styles.modalField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('idProofType', 'ID Proof Type')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setPickerModalType('ID_PROOF')}
              activeOpacity={0.8}
            >
              <Text style={styles.selectBoxText}>
                {translateIdProof(form.idProofType)}
              </Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
            {formSubmitted && !form.idProofType.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseSelectIdProofType', 'Please select the ID proof type.')}
              </Text>
            ) : null}
          </View>

          {/* ID Proof Number */}
          <View style={[styles.modalField, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>
              {t('idProofNumber', 'ID Proof Number')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                formSubmitted &&
                (!form.idProofNumber.trim() ||
                  validateIdProofNumber(form.idProofType, form.idProofNumber, language as any))
                  ? styles.inputErrorBorder
                  : null,
              ]}
              value={form.idProofNumber}
              onChangeText={(text) =>
                setForm((p) => ({
                  ...p,
                  idProofNumber:
                    form.idProofType === 'Aadhar Card'
                      ? text.replace(/\D/g, '')
                      : text.toUpperCase(),
                }))
              }
              placeholder={
                form.idProofType === 'Aadhar Card'
                  ? '880990909008'
                  : form.idProofType === 'PAN Card'
                  ? 'ABCDE1234F'
                  : form.idProofType === 'Driving License'
                  ? 'MH1220241234567'
                  : 'ABC1234567'
              }
              placeholderTextColor="#94A3B8"
              keyboardType={form.idProofType === 'Aadhar Card' ? 'numeric' : 'default'}
              maxLength={
                form.idProofType === 'Aadhar Card'
                  ? 12
                  : form.idProofType === 'PAN Card'
                  ? 10
                  : form.idProofType === 'Driving License'
                  ? 15
                  : 10
              }
              autoCapitalize="characters"
            />
            {formSubmitted && !form.idProofNumber.trim() ? (
              <Text style={styles.errorText}>
                {t('pleaseFillIdProofNumber', 'Please fill the ID proof number.')}
              </Text>
            ) : formSubmitted &&
              validateIdProofNumber(form.idProofType, form.idProofNumber, language as any) ? (
              <Text style={styles.errorText}>
                {validateIdProofNumber(form.idProofType, form.idProofNumber, language as any)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 4. Salary Details Section */}
        <View style={styles.formSectionHeader}>
          <IndianRupee size={16} color="#EA580C" />
          <Text style={styles.formSectionTitle}>
            {t('salaryDetails', 'Salary Details')}
          </Text>
        </View>

        {isWide ? (
          <View style={[styles.fieldRow, styles.fieldRow3Col]}>
            {/* Gross Salary */}
            <View style={[styles.modalField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>
                {t('grossSalary', 'Gross Salary')} <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.textInput,
                    { paddingLeft: 30 },
                    formSubmitted && (!form.grossSalary.trim() || Number(form.grossSalary) <= 0)
                      ? styles.inputErrorBorder
                      : null,
                  ]}
                  value={form.grossSalary}
                  onChangeText={(text) =>
                    setForm((p) => ({ ...p, grossSalary: text.replace(/\D/g, '') }))
                  }
                  placeholder={t('enterGrossSalary', 'Enter gross salary')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
                <IndianRupee size={15} color="#94A3B8" style={styles.inputPrefixIcon} />
              </View>
              {formSubmitted && !form.grossSalary.trim() ? (
                <Text style={styles.errorText}>
                  {t('pleaseFillGrossSalary', 'Please fill the gross salary.')}
                </Text>
              ) : formSubmitted &&
                (isNaN(Number(form.grossSalary)) || Number(form.grossSalary) <= 0) ? (
                <Text style={styles.errorText}>
                  {language === 'mr' ? 'एकूण पगार ० पेक्षा जास्त असावा.' : 'Gross salary must be greater than 0.'}
                </Text>
              ) : null}
            </View>

            {/* Salary Frequency Dropdown */}
            <View style={[styles.modalField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>
                {t('salaryFrequency', 'Salary Frequency')}
              </Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setPickerModalType('FREQUENCY')}
                activeOpacity={0.8}
              >
                <Text style={styles.selectBoxText} numberOfLines={1}>
                  {translateSalaryFrequency(form.salaryFrequency)}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Deduction */}
            <View style={[styles.modalField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>
                {t('deduction', 'Deduction')} <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[
                    styles.textInput,
                    { paddingLeft: 30 },
                    formSubmitted && (!form.deduction.trim() || Number(form.deduction) < 0)
                      ? styles.inputErrorBorder
                      : null,
                  ]}
                  value={form.deduction}
                  onChangeText={(text) =>
                    setForm((p) => ({ ...p, deduction: text.replace(/\D/g, '') }))
                  }
                  placeholder={t('enterDeduction', 'Enter deduction')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
                <IndianRupee size={15} color="#94A3B8" style={styles.inputPrefixIcon} />
              </View>
              {formSubmitted && !form.deduction.trim() ? (
                <Text style={styles.errorText}>
                  {t('pleaseFillDeduction', 'Please fill the deduction.')}
                </Text>
              ) : formSubmitted &&
                (isNaN(Number(form.deduction)) || Number(form.deduction) < 0) ? (
                <Text style={styles.errorText}>
                  {language === 'mr' ? 'कपात रक्कम ऋण असू शकत नाही.' : 'Deduction cannot be negative.'}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.fieldRow, { flexDirection: 'row', gap: 10 }]}>
              {/* Gross Salary */}
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  {t('grossSalary', 'Gross Salary')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[
                      styles.textInput,
                      { paddingLeft: 30 },
                      formSubmitted && (!form.grossSalary.trim() || Number(form.grossSalary) <= 0)
                        ? styles.inputErrorBorder
                        : null,
                    ]}
                    value={form.grossSalary}
                    onChangeText={(text) =>
                      setForm((p) => ({ ...p, grossSalary: text.replace(/\D/g, '') }))
                    }
                    placeholder={t('enterGrossSalary', 'Enter gross salary')}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                  <IndianRupee size={15} color="#94A3B8" style={styles.inputPrefixIcon} />
                </View>
                {formSubmitted && !form.grossSalary.trim() ? (
                  <Text style={styles.errorText}>
                    {t('pleaseFillGrossSalary', 'Please fill the gross salary.')}
                  </Text>
                ) : formSubmitted &&
                  (isNaN(Number(form.grossSalary)) || Number(form.grossSalary) <= 0) ? (
                  <Text style={styles.errorText}>
                    {language === 'mr' ? 'एकूण पगार ० पेक्षा जास्त असावा.' : 'Gross salary must be greater than 0.'}
                  </Text>
                ) : null}
              </View>

              {/* Deduction */}
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  {t('deduction', 'Deduction')} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={[
                      styles.textInput,
                      { paddingLeft: 30 },
                      formSubmitted && (!form.deduction.trim() || Number(form.deduction) < 0)
                        ? styles.inputErrorBorder
                        : null,
                    ]}
                    value={form.deduction}
                    onChangeText={(text) =>
                      setForm((p) => ({ ...p, deduction: text.replace(/\D/g, '') }))
                    }
                    placeholder={t('enterDeduction', 'Enter deduction')}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                  <IndianRupee size={15} color="#94A3B8" style={styles.inputPrefixIcon} />
                </View>
                {formSubmitted && !form.deduction.trim() ? (
                  <Text style={styles.errorText}>
                    {t('pleaseFillDeduction', 'Please fill the deduction.')}
                  </Text>
                ) : formSubmitted &&
                  (isNaN(Number(form.deduction)) || Number(form.deduction) < 0) ? (
                  <Text style={styles.errorText}>
                    {language === 'mr' ? 'कपात रक्कम ऋण असू शकत नाही.' : 'Deduction cannot be negative.'}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Salary Frequency Full Width on mobile */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                {t('salaryFrequency', 'Salary Frequency')}
              </Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setPickerModalType('FREQUENCY')}
                activeOpacity={0.8}
              >
                <Text style={styles.selectBoxText} numberOfLines={1}>
                  {translateSalaryFrequency(form.salaryFrequency)}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 5. Save & Cancel Action Buttons */}
        <View style={[styles.formButtonRow, !isWide && styles.formButtonRowMobile]}>
          <TouchableOpacity
            style={[styles.saveStaffBtn, !isWide && { flex: 1 }]}
            onPress={handleAddStaff}
            disabled={isSubmittingStaff}
            activeOpacity={0.85}
          >
            {isSubmittingStaff ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveStaffBtnText}>{t('saveStaff', 'Save Staff')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelStaffBtn, !isWide && { flex: 1 }]}
            onPress={handleCancelAddStaff}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelStaffBtnText}>{t('cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} activeRouteName="Staff" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.webContentContainer,
          { paddingBottom: Math.max(30, insets.bottom + 20) },
        ]}
      >
        <Header
          title={t('staff', 'Staff & HR')}
          subtitle={
            activeTab === 'ADD'
              ? undefined
              : activeTab === 'MONTHLY'
              ? `${t('monthlyStaffReport', 'Monthly Staff Report')} • ${monthDisplayName}`
              : activeTab === 'DAILY'
              ? `${t('dailyAttendance', 'Daily Attendance Roll-Call')} • ${dailyDate}`
              : `${t('staffRoster', 'Staff Roster & Shifts')} (${staffList.length} Staff)`
          }
          rightAction={
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                style={[
                  styles.headerAddBtn,
                  activeTab === 'ADD' && { backgroundColor: '#C2410C' },
                ]}
                onPress={() => setActiveTab((prev) => (prev === 'ADD' ? 'ROSTER' : 'ADD'))}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.headerAddText}>{t('addStaff', 'Add Staff')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerExportBtn}
                onPress={handleExportMonthlyReport}
                activeOpacity={0.8}
              >
                <FileSpreadsheet size={14} color="#FFFFFF" />
                <Text style={styles.headerExportText}>{t('export', 'Export')}</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Main Top Navigation Tabs (Monthly, Daily, Roster) */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'MONTHLY' && styles.subTabItemActive]}
            onPress={() => setActiveTab('MONTHLY')}
            activeOpacity={0.8}
          >
            <Calendar size={22} color={activeTab === 'MONTHLY' ? '#FFFFFF' : '#4F46E5'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'DAILY' && styles.subTabItemActive]}
            onPress={() => setActiveTab('DAILY')}
            activeOpacity={0.8}
          >
            <Clock size={22} color={activeTab === 'DAILY' ? '#FFFFFF' : '#4F46E5'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabItem, (activeTab === 'ROSTER' || activeTab === 'ADD') && styles.subTabItemActive]}
            onPress={() => setActiveTab('ROSTER')}
            activeOpacity={0.8}
          >
            <Users size={22} color={(activeTab === 'ROSTER' || activeTab === 'ADD') ? '#FFFFFF' : '#4F46E5'} />
          </TouchableOpacity>
        </View>

        {/* =========================================================
            ADD STAFF FORM (VITE CARD IN-PAGE VIEW)
        ========================================================= */}
        {activeTab === 'ADD' && (
          <View style={{ marginBottom: 16 }}>
            {renderViteAddStaffForm(false)}
          </View>
        )}

        {/* =========================================================
            TAB 1: MONTHLY STAFF REPORT (PRIMARY REQUEST)
        ========================================================= */}
        {activeTab === 'MONTHLY' && (
          <View>
            {/* Month Selector Bar */}
            <View style={styles.monthSelectorBar}>
              <TouchableOpacity
                style={styles.monthArrowBtn}
                onPress={() => changeMonth(-1)}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color="#4F46E5" />
              </TouchableOpacity>

              <View style={styles.monthDisplayCenter}>
                <Calendar size={18} color="#4F46E5" />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.monthDisplayTitle}>{monthDisplayName}</Text>
                  <Text style={styles.monthDisplaySub}>
                    {toDevanagari(daysInSelectedMonth)} {t('days', 'Days')} • {toDevanagari(staffList.length)} {t('staffCount', 'Staff')}
                  </Text>
                </View>
              </View>

              {(() => {
                const now = new Date();
                const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isFutureBlocked = selectedMonth >= curMonthStr;
                return (
                  <TouchableOpacity
                    style={[styles.monthArrowBtn, isFutureBlocked && { opacity: 0.3 }]}
                    onPress={() => !isFutureBlocked && changeMonth(1)}
                    disabled={isFutureBlocked}
                    activeOpacity={0.7}
                  >
                    <ChevronRight size={20} color={isFutureBlocked ? '#94A3B8' : '#4F46E5'} />
                  </TouchableOpacity>
                );
              })()}
            </View>

            {/* Monthly KPI Summary Cards (4 Cards) */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderColor: '#E0E7FF' }]}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t('totalStaff', 'Total Staff')}</Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Users size={16} color="#4F46E5" />
                  </View>
                </View>
                <Text style={styles.kpiNumber}>{toDevanagari(overallMonthlyKPI.totalStaff)}</Text>
                <Text style={styles.kpiHint}>{toDevanagari(onDutyCount)} {t('onDutyToday', 'On Duty Today')}</Text>
              </View>

              <View style={[styles.kpiCard, { borderColor: '#DCFCE7' }]}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t('averageAttendance', 'Avg Attendance')}</Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <TrendingUp size={16} color="#16A34A" />
                  </View>
                </View>
                <Text style={[styles.kpiNumber, { color: '#15803D' }]}>{toDevanagari(overallMonthlyKPI.avgAttendance)}%</Text>
                <Text style={styles.kpiHint}>{toDevanagari(overallMonthlyKPI.totalPresent)} {t('presentDays', 'Present')} • {toDevanagari(overallMonthlyKPI.totalAbsent)} {t('absentDays', 'Absent')}</Text>
              </View>

              <View style={[styles.kpiCard, { borderColor: '#FEF3C7' }]}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t('totalMonthlySalary', 'Total Monthly Payroll')}</Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#FFFBEB' }]}>
                    <IndianRupee size={16} color="#D97706" />
                  </View>
                </View>
                <Text style={[styles.kpiNumber, { color: '#B45309', fontSize: 18 }]}>
                  ₹ {toDevanagari(overallMonthlyKPI.totalSalaryPayout.toLocaleString('en-IN'))}
                </Text>
                <Text style={styles.kpiHint}>{t('netSalaryPayable', 'Net Salary Payable')}</Text>
              </View>

              <View style={[styles.kpiCard, { borderColor: '#FED7AA' }]}>
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{t('shiftCoverage', 'Shift Coverage')}</Text>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#FFF7ED' }]}>
                    <Clock size={16} color="#EA580C" />
                  </View>
                </View>
                <Text style={[styles.kpiNumber, { color: '#C2410C' }]}>{toDevanagari('100%')}</Text>
                <Text style={styles.kpiHint}>{t('morningEveningActive', 'Morning & Evening active')}</Text>
              </View>
            </View>

            {/* Role Filter Chips & Search Bar */}
            <View style={styles.filterSection}>
              <View style={styles.searchBox}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchStaffPlaceholder', 'Search staff by name or phone...')}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChipsRow}>
                {['ALL', 'MANAGER', 'WAITER', 'CHEF', 'CASHIER'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                    onPress={() => setSelectedRole(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>
                      {r === 'ALL' ? t('allRoles', 'All Roles') : t(r.charAt(0) + r.slice(1).toLowerCase(), r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Staff Monthly Performance Cards */}
            <View style={styles.staffCardsContainer}>
              {filteredStaff.map((staff) => {
                const stats = getStaffMonthlyStats(staff.id);
                return (
                  <View key={staff.id} style={styles.monthlyStaffCard}>
                    {/* Header Row: Avatar, Name, Role, Phone */}
                    <View style={styles.monthlyCardHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarChar}>{staff.name.charAt(0)}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.staffNameText}>{localizeGuestName(staff.name)}</Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{t(staff.role, staff.role)}</Text>
                          </View>
                        </View>
                        <Text style={styles.staffSubText}>{t(staff.shift, staff.shift)} {t('shift', 'Shift')} • {toDevanagari(staff.phone)}</Text>
                      </View>
                    </View>

                    {/* Attendance Metrics Bar */}
                    <View style={styles.attendanceBarContainer}>
                      <View style={styles.attCountBox}>
                        <Text style={[styles.attCountNum, { color: '#16A34A' }]}>{toDevanagari(stats.present)}</Text>
                        <Text style={styles.attCountLabel}>{t('presentDays', 'Present')} (P)</Text>
                      </View>
                      <View style={styles.attDivider} />

                      <View style={styles.attCountBox}>
                        <Text style={[styles.attCountNum, { color: '#D97706' }]}>{toDevanagari(stats.halfDay)}</Text>
                        <Text style={styles.attCountLabel}>{t('halfDays', 'Half-Day')} (HD)</Text>
                      </View>
                      <View style={styles.attDivider} />

                      <View style={styles.attCountBox}>
                        <Text style={[styles.attCountNum, { color: '#DC2626' }]}>{toDevanagari(stats.absent)}</Text>
                        <Text style={styles.attCountLabel}>{t('absentDays', 'Absent')} (A)</Text>
                      </View>
                      <View style={styles.attDivider} />

                      <View style={styles.attCountBox}>
                        <Text style={[styles.attCountNum, { color: '#2563EB' }]}>{toDevanagari(stats.off)}</Text>
                        <Text style={styles.attCountLabel}>{t('offDays', 'Off')} (OFF)</Text>
                      </View>
                    </View>

                    {/* Progress Bar of Attendance */}
                    <View style={styles.progressContainer}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.progressLabel}>{t('attendanceRate', 'Attendance Rate')}</Text>
                        <Text style={[styles.progressVal, { color: stats.attendanceRate >= 85 ? '#16A34A' : stats.attendanceRate >= 70 ? '#D97706' : '#DC2626' }]}>
                          {toDevanagari(stats.attendanceRate)}%
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(100, stats.attendanceRate)}%`,
                              backgroundColor: stats.attendanceRate >= 85 ? '#16A34A' : stats.attendanceRate >= 70 ? '#D97706' : '#DC2626',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Salary & Payout Details */}
                    <View style={styles.salarySection}>
                      <View>
                        <Text style={styles.salaryLabel}>{t('grossSalary', 'Gross Base')}: ₹ {toDevanagari(stats.grossSalary.toLocaleString('en-IN'))}</Text>
                        {stats.deduction > 0 && (
                          <Text style={styles.deductionLabel}>{t('deduction', 'Deductions')}: -₹ {toDevanagari(stats.deduction.toLocaleString('en-IN'))}</Text>
                        )}
                      </View>

                      <View style={styles.netPayoutBadge}>
                        <Text style={styles.netPayoutLabel}>{t('netPayout', 'Net Payout')}</Text>
                        <Text style={styles.netPayoutAmount}>₹ {toDevanagari(stats.netSalary.toLocaleString('en-IN'))}</Text>
                      </View>
                    </View>

                    {/* Action: Open 31-Day Attendance Matrix */}
                    <TouchableOpacity
                      style={styles.openMatrixBtn}
                      onPress={() => setDetailStaff(staff)}
                      activeOpacity={0.8}
                    >
                      <Calendar size={14} color="#4F46E5" />
                      <Text style={styles.openMatrixText}>
                        {t('viewEditDailyMatrix', 'View & Edit')} {monthDisplayName} {t('dailyMatrix', 'Daily Matrix')} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* =========================================================
            TAB 2: DAILY ATTENDANCE ROLL-CALL
        ========================================================= */}
        {activeTab === 'DAILY' && (
          <View>
            {/* Daily Date Selector Bar */}
            <View style={styles.dailyDateBar}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.dailyDateLabel}>{t('attendanceRollCallDate', 'ATTENDANCE ROLL-CALL DATE')}</Text>
                <Text style={styles.dailyDateValue}>{formatDate(dailyDate, { showDayOfWeek: true })}</Text>
              </View>

              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={() => markAllPresent(dailyDate)}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.markAllText}>{t('markAllPresent', 'Mark All Present')}</Text>
              </TouchableOpacity>
            </View>

            {/* Search and Role Filter Chips (Without Captain) */}
            <View style={styles.filterSection}>
              <View style={styles.searchBox}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchStaffPlaceholder', 'Search staff by name or phone...')}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChipsRow}>
                {['ALL', 'MANAGER', 'WAITER', 'CHEF', 'CASHIER'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                    onPress={() => setSelectedRole(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>
                      {r === 'ALL' ? t('allRoles', 'All Roles') : t(r.charAt(0) + r.slice(1).toLowerCase(), r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Daily Roll-Call List (Properly Aligned & Uses filteredStaff) */}
            <View style={styles.staffCardsContainer}>
              {filteredStaff.map((staff) => {
                const currentStatus = attendanceMap[`${staff.id}_${dailyDate}`] || 'PRESENT';

                return (
                  <View key={staff.id} style={styles.dailyStaffCard}>
                    {/* Header Row: Avatar, Name, Role Badge, Shift & Phone */}
                    <View style={styles.dailyCardHeader}>
                      <View style={styles.avatarCircleSmall}>
                        <Text style={styles.avatarCharSmall}>{staff.name.charAt(0)}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <Text style={[styles.staffNameText, { flexShrink: 1 }]} numberOfLines={1}>
                            {localizeGuestName(staff.name)}
                          </Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{t(staff.role, staff.role)}</Text>
                          </View>
                        </View>
                        <Text style={styles.staffSubText} numberOfLines={1}>
                          {t(staff.shift, staff.shift)} {t('shift', 'Shift')} • {toDevanagari(staff.phone)}
                        </Text>
                      </View>
                    </View>

                    {/* Status Pill Selectors (Perfect 4-column alignment) */}
                    <View style={styles.statusPillsRow}>
                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'PRESENT' && styles.statusPillPresent]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'PRESENT')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'PRESENT' && styles.statusPillTextActive]} numberOfLines={1}>
                          ✓ {t('present', 'Present')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'HALF_DAY' && styles.statusPillHalf]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'HALF_DAY')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'HALF_DAY' && styles.statusPillTextActive]} numberOfLines={1}>
                          ½ {t('halfDay', 'Half-Day')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'ABSENT' && styles.statusPillAbsent]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'ABSENT')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'ABSENT' && styles.statusPillTextActive]} numberOfLines={1}>
                          ✕ {t('absent', 'Absent')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'OFF' && styles.statusPillOff]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'OFF')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'OFF' && styles.statusPillTextActive]} numberOfLines={1}>
                          {t('off', 'Off')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* =========================================================
            TAB 3: STAFF ROSTER & SHIFTS
        ========================================================= */}
        {(activeTab === 'ROSTER' || activeTab === 'ADD') && (
          <View>
            {/* Attendance Summary Strip */}
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>{t('todaysOnDutyRoster', "TODAY'S ON-DUTY ROSTER")}</Text>
                <Text style={styles.summaryNumber}>
                  {toDevanagari(onDutyCount)} / {toDevanagari(staffList.length)} <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '800' }}>{t('onDuty', 'On Duty')}</Text>
                </Text>
              </View>
              <View style={styles.usersIconBox}>
                <Users size={24} color="#4F46E5" />
              </View>
            </View>

            {/* Action Row: Search Box & Add Staff Button (Perfect 42px matching height) */}
            <View style={styles.actionRow}>
              <View style={styles.rosterSearchBox}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchByNameOrRole', 'Search staff...')}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setActiveTab((prev) => (prev === 'ADD' ? 'ROSTER' : 'ADD'))}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addStaff', 'Add Staff')}</Text>
              </TouchableOpacity>
            </View>

            {/* Role Filter Chips for Roster (Without Captain) */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChipsRow}>
                {['ALL', 'MANAGER', 'WAITER', 'CHEF', 'CASHIER'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, selectedRole === r && styles.roleChipActive]}
                    onPress={() => setSelectedRole(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextActive]}>
                      {r === 'ALL' ? t('allRoles', 'All Roles') : t(r.charAt(0) + r.slice(1).toLowerCase(), r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Staff Members List (Refined Alignment) */}
            <View style={styles.staffCardsContainer}>
              {filteredStaff.map((member) => (
                <View key={member.id} style={styles.staffCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarChar}>{member.name.charAt(0)}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    {/* Name and On Duty Toggle */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.staffName, { flexShrink: 1 }]} numberOfLines={1}>
                        {localizeGuestName(member.name)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.statusToggleBadge, member.status === 'ON_DUTY' ? styles.statusOn : styles.statusOff]}
                        onPress={() => toggleDutyStatus(member.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusToggleText, member.status === 'ON_DUTY' ? styles.statusOnText : styles.statusOffText]}>
                          {member.status === 'ON_DUTY' ? '● ' + t('onDuty', 'On Duty') : '○ ' + t('offDuty', 'Off Duty')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Role Pill, Shift, and Salary */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      <View style={styles.rolePill}>
                        <Text style={styles.roleText}>{t(member.role, member.role)}</Text>
                      </View>
                      <Text style={styles.shiftText}>• {t(member.shift, member.shift)} {t('shift', 'Shift')}</Text>
                      <Text style={styles.shiftText}>• ₹ {toDevanagari(member.grossSalary.toLocaleString('en-IN'))}/{t('month', 'mo')}</Text>
                    </View>

                    {/* Phone Number */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <Phone size={12} color="#64748B" />
                      <Text style={styles.phoneText}>{toDevanagari(member.phone)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* =========================================================
          MODAL 1: 31-DAY ATTENDANCE MATRIX & CALENDAR FOR STAFF
      ========================================================= */}
      <Modal visible={!!detailStaff} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, Platform.OS === 'web' && { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{localizeGuestName(detailStaff?.name)}</Text>
                <Text style={styles.modalSubtitle}>
                  {t(detailStaff?.role || '', detailStaff?.role)} • {monthDisplayName} {t('attendanceGrid', 'Attendance Grid')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailStaff(null)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {detailStaff && (
              <View style={{ flex: 1 }}>
                {/* Monthly Metrics Header */}
                {(() => {
                  const s = getStaffMonthlyStats(detailStaff.id);
                  return (
                    <View style={styles.matrixMetricsBox}>
                      <View style={styles.matrixMetricItem}>
                        <Text style={styles.matrixMetricNum}>{toDevanagari(s.present)}</Text>
                        <Text style={styles.matrixMetricLabel}>{t('present', 'Present')}</Text>
                      </View>
                      <View style={styles.matrixMetricItem}>
                        <Text style={styles.matrixMetricNum}>{toDevanagari(s.halfDay)}</Text>
                        <Text style={styles.matrixMetricLabel}>{t('halfDay', 'Half Day')}</Text>
                      </View>
                      <View style={styles.matrixMetricItem}>
                        <Text style={styles.matrixMetricNum}>{toDevanagari(s.absent)}</Text>
                        <Text style={styles.matrixMetricLabel}>{t('absent', 'Absent')}</Text>
                      </View>
                      <View style={styles.matrixMetricItem}>
                        <Text style={styles.matrixMetricNum}>{toDevanagari(s.attendanceRate)}%</Text>
                        <Text style={styles.matrixMetricLabel}>{t('attendanceRate', 'Rate')}</Text>
                      </View>
                      <View style={styles.matrixMetricItem}>
                        <Text style={[styles.matrixMetricNum, { color: '#059669' }]}>₹ {toDevanagari(s.netSalary)}</Text>
                        <Text style={styles.matrixMetricLabel}>{t('payout', 'Payout')}</Text>
                      </View>
                    </View>
                  );
                })()}

                <Text style={styles.matrixInstruction}>
                  {t('cycleStatusInstruction', 'Tap any day below to cycle status:')} <Text style={{ color: '#16A34A', fontWeight: '800' }}>P</Text> → <Text style={{ color: '#D97706', fontWeight: '800' }}>HD</Text> → <Text style={{ color: '#DC2626', fontWeight: '800' }}>A</Text> → <Text style={{ color: '#2563EB', fontWeight: '800' }}>OFF</Text>
                </Text>

                {/* Day-by-Day Calendar Grid */}
                <ScrollView contentContainerStyle={styles.calendarGrid}>
                  {(() => {
                    const now = new Date();
                    const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const curDay = now.getDate();
                    const maxDisplayDays = selectedMonth === curMonthStr
                      ? Math.min(daysInSelectedMonth, curDay)
                      : (selectedMonth < curMonthStr ? daysInSelectedMonth : 0);
                    return Array.from({ length: maxDisplayDays }, (_, i) => i + 1);
                  })().map((day) => {
                    const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                    const status = attendanceMap[`${detailStaff.id}_${dateKey}`] || 'PRESENT';

                    const cycleStatus = () => {
                      const next: Record<AttendanceStatus, AttendanceStatus> = {
                        PRESENT: 'HALF_DAY',
                        HALF_DAY: 'ABSENT',
                        ABSENT: 'OFF',
                        OFF: 'PRESENT',
                      };
                      setStaffAttendance(detailStaff.id, dateKey, next[status]);
                    };

                    const [y, m] = selectedMonth.split('-').map(Number);
                    const dayOfWeekIdx = new Date(y, m - 1, day).getDay();
                    const dayName = language === 'mr'
                      ? ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'][dayOfWeekIdx]
                      : language === 'hi'
                      ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'][dayOfWeekIdx]
                      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeekIdx];

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.calDayBox,
                          status === 'PRESENT' && styles.calDayPresent,
                          status === 'HALF_DAY' && styles.calDayHalf,
                          status === 'ABSENT' && styles.calDayAbsent,
                          status === 'OFF' && styles.calDayOff,
                        ]}
                        onPress={cycleStatus}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.calDayNum}>{toDevanagari(day)}</Text>
                        <Text style={styles.calDayName}>{dayName}</Text>
                        <View style={styles.calStatusBadge}>
                          <Text style={styles.calStatusText}>
                            {status === 'PRESENT' ? 'P' : status === 'HALF_DAY' ? 'HD' : status === 'ABSENT' ? 'A' : 'OFF'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeMatrixBtn}
                  onPress={() => setDetailStaff(null)}
                >
                  <Text style={styles.closeMatrixBtnText}>{t('doneSaveAttendance', 'Done / Save Attendance')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 2: ADD STAFF MEMBER (VITE STYLE)
      ========================================================= */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentViteWrapper}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {renderViteAddStaffForm(true)}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SELECTION MODAL (Designation, ID Proof, Salary Frequency) */}
      <Modal visible={pickerModalType !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPickerModalType(null)}
        >
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                {pickerModalType === 'DESIGNATION'
                  ? t('selectDesignation', 'Select Designation')
                  : pickerModalType === 'ID_PROOF'
                  ? t('selectIdProof', 'Select ID Proof')
                  : t('salaryFrequency', 'Salary Frequency')}
              </Text>
              <TouchableOpacity onPress={() => setPickerModalType(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickerModalType === 'DESIGNATION' &&
                DESIGNATIONS.map((desig) => {
                  const isSelected = form.designation === desig;
                  return (
                    <TouchableOpacity
                      key={desig}
                      style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                      onPress={() => {
                        setForm((p) => ({ ...p, designation: desig }));
                        setPickerModalType(null);
                      }}
                    >
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                        {translateDesignation(desig)}
                      </Text>
                      {isSelected ? <Check size={18} color="#EA580C" /> : null}
                    </TouchableOpacity>
                  );
                })}

              {pickerModalType === 'ID_PROOF' &&
                ID_PROOF_TYPES.map((idType) => {
                  const isSelected = form.idProofType === idType;
                  return (
                    <TouchableOpacity
                      key={idType}
                      style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                      onPress={() => {
                        setForm((p) => ({ ...p, idProofType: idType }));
                        setPickerModalType(null);
                      }}
                    >
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                        {translateIdProof(idType)}
                      </Text>
                      {isSelected ? <Check size={18} color="#EA580C" /> : null}
                    </TouchableOpacity>
                  );
                })}

              {pickerModalType === 'FREQUENCY' &&
                SALARY_FREQUENCIES.map((freq) => {
                  const isSelected = form.salaryFrequency === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                      onPress={() => {
                        setForm((p) => ({ ...p, salaryFrequency: freq as any }));
                        setPickerModalType(null);
                      }}
                    >
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                        {translateSalaryFrequency(freq)}
                      </Text>
                      {isSelected ? <Check size={18} color="#EA580C" /> : null}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#161F36' : '#FFFFFF';
  const cardBorder = isDark ? '#2A364F' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#1C1917';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const textMuted = isDark ? '#64748B' : '#A8A29E';
  const dividerColor = isDark ? '#2A364F' : '#F1F5F9';
  const inputBg = isDark ? '#0F172A' : '#FFFFFF';
  const subBg = isDark ? '#1E293B' : '#F8FAFC';

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F19' : '#F8FAFC',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  webContentContainer: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  headerExportBtn: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 5,
  },
  headerExportText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 6,
    marginBottom: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  subTabItem: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabItemActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  branchPillName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A3412',
  },
  branchPillSub: {
    fontSize: 10,
    color: '#C2410C',
  },
  branchBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  branchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  monthArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplayCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthDisplayTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: textPrimary,
  },
  monthDisplaySub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: cardBg,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 9,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: textPrimary,
  },
  kpiHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: textPrimary,
  },
  roleChipsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: cardBorder,
  },
  roleChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  staffCardsContainer: {
    gap: 12,
  },
  monthlyStaffCard: {
    backgroundColor: cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4F46E5',
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: textPrimary,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSecondary,
  },
  staffSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attendanceBarContainer: {
    flexDirection: 'row',
    backgroundColor: subBg,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  attCountBox: {
    alignItems: 'center',
  },
  attCountNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  attCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  attDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  progressVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  salarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  salaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: textSecondary,
  },
  deductionLabel: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  netPayoutBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  netPayoutLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  netPayoutAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803D',
  },
  openMatrixBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  openMatrixText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  // Daily Roll-call
  dailyDateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: cardBorder,
    marginBottom: 12,
  },
  dailyDateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  dailyDateValue: {
    fontSize: 16,
    fontWeight: '900',
    color: textPrimary,
  },
  markAllBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dailyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyStaffCard: {
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCharSmall: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  statusPill: {
    flex: 1,
    minHeight: 32,
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillPresent: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusPillHalf: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusPillAbsent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusPillOff: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  statusPillTextActive: {
    color: textPrimary,
    fontWeight: '900',
  },
  // Staff Roster
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: textPrimary,
    marginTop: 2,
  },
  usersIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rosterSearchBox: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  addBtn: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    padding: 9,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: textPrimary,
  },
  statusToggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusOn: { backgroundColor: '#DCFCE7' },
  statusOff: { backgroundColor: '#F1F5F9' },
  statusToggleText: { fontSize: 10, fontWeight: '700' },
  statusOnText: { color: '#15803D' },
  statusOffText: { color: '#64748B' },
  rolePill: {
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSecondary,
  },
  shiftText: {
    fontSize: 11,
    color: '#64748B',
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
  },
  // Matrix modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentLarge: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  matrixMetricsBox: {
    flexDirection: 'row',
    backgroundColor: subBg,
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-around',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: cardBorder,
  },
  matrixMetricItem: {
    alignItems: 'center',
  },
  matrixMetricNum: {
    fontSize: 15,
    fontWeight: '900',
    color: textPrimary,
  },
  matrixMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 1,
  },
  matrixInstruction: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  calDayBox: {
    width: '22%',
    aspectRatio: 1.1,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cardBg,
  },
  calDayPresent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  calDayHalf: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  calDayAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  calDayOff: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  calDayNum: {
    fontSize: 12,
    fontWeight: '900',
    color: textPrimary,
  },
  calDayName: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  calStatusBadge: {
    marginTop: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  calStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: textPrimary,
  },
  closeMatrixBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeMatrixBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  // Header Add Staff button
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerAddText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Vite Add Staff Card & Modal Styling
  modalContentViteWrapper: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viteStaffCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cardBorder,
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  viteStaffCardWide: {
    padding: 22,
  },
  viteFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: cardBorder,
    marginBottom: 16,
  },
  viteFormIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? '#3E1C0A' : '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viteFormTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: textPrimary,
  },
  viteModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: subBg,
  },
  fieldRow: {
    gap: 12,
    marginBottom: 4,
  },
  fieldRow3Col: {
    flexDirection: 'row',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#1F2937' : '#F1F5F9',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: textPrimary,
  },
  modalField: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: textSecondary,
    marginBottom: 5,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '700',
  },
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 13.5,
    color: textPrimary,
    minHeight: 46,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  inputInnerIcon: {
    position: 'absolute',
    right: 12,
  },
  inputPrefixIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  selectBox: {
    backgroundColor: subBg,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBoxText: {
    fontSize: 13,
    color: textPrimary,
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  formButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: cardBorder,
  },
  formButtonRowMobile: {
    justifyContent: 'space-between',
  },
  saveStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 8,
    shadowColor: '#EA580C',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  saveStaffBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelStaffBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: isDark ? '#334155' : '#64748B',
  },
  cancelStaffBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: cardBorder,
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: textPrimary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: isDark ? '#3E1C0A' : '#FFF7ED',
  },
  pickerItemText: {
    fontSize: 13,
    color: textPrimary,
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: '#EA580C',
    fontWeight: '700',
  },
  });
};
