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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Header } from '../../components/Header';
import { AppNavbar } from '../../components/AppNavbar';
import { useBranch } from '../../context/BranchContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient, ensureBackendToken } from '../../api/client';
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
  DollarSign,
  TrendingUp,
  Award,
  Filter,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Briefcase,
} from 'lucide-react-native';

export type StaffRole = 'Captain' | 'Waiter' | 'Chef' | 'Cashier' | 'Manager';
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
}

export interface DayAttendance {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 's1', name: 'Rahul Patil', role: 'Manager', shift: 'Full Day', phone: '+91 98220 12345', status: 'ON_DUTY', grossSalary: 28000, deduction: 1000, joiningDate: '2024-01-15' },
  { id: 's2', name: 'Ramesh Gaikwad', role: 'Captain', shift: 'Morning', phone: '+91 98221 23456', status: 'ON_DUTY', grossSalary: 18000, deduction: 500, joiningDate: '2024-03-01' },
  { id: 's3', name: 'Suresh Kadam', role: 'Waiter', shift: 'Morning', phone: '+91 98222 34567', status: 'ON_DUTY', grossSalary: 14000, deduction: 500, joiningDate: '2024-05-10' },
  { id: 's4', name: 'Akash Shinde', role: 'Waiter', shift: 'Evening', phone: '+91 98223 45678', status: 'ON_DUTY', grossSalary: 14000, deduction: 0, joiningDate: '2024-06-20' },
  { id: 's5', name: 'Chef Anand', role: 'Chef', shift: 'Full Day', phone: '+91 98224 56789', status: 'ON_DUTY', grossSalary: 32000, deduction: 1500, joiningDate: '2023-11-01' },
  { id: 's6', name: 'Chef Vikram', role: 'Chef', shift: 'Evening', phone: '+91 98225 67890', status: 'OFF_DUTY', grossSalary: 26000, deduction: 1000, joiningDate: '2024-02-15' },
  { id: 's7', name: 'Pooja Jadhav', role: 'Cashier', shift: 'Morning', phone: '+91 98226 78901', status: 'ON_DUTY', grossSalary: 16000, deduction: 500, joiningDate: '2024-04-12' },
];

const STORAGE_STAFF_KEY = '@hotel_staff_list_v2';
const STORAGE_ATTENDANCE_PREFIX = '@hotel_staff_att_';

export const StaffScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { activeBranch } = useBranch();
  const { t, language, formatDate, toDevanagari, formatNumber, localizeGuestName } = useLanguage();
  const insets = useSafeAreaInsets();

  // Navigation tab: 'ROSTER' | 'DAILY' | 'MONTHLY'
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'DAILY' | 'MONTHLY'>('MONTHLY');

  // Staff members state
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

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

  // New staff inputs
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<StaffRole>('Waiter');
  const [phone, setPhone] = useState<string>('');
  const [shift, setShift] = useState<StaffShift>('Morning');
  const [grossSalary, setGrossSalary] = useState<string>('15000');
  const [deduction, setDeduction] = useState<string>('500');

  // Load saved staff & attendance
  useEffect(() => {
    loadSavedData();
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

  // Generate realistic baseline attendance for selected month
  const generateBaselineAttendance = (staff: StaffMember[], monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map: Record<string, AttendanceStatus> = {};

    staff.forEach((s, idx) => {
      for (let day = 1; day <= daysInMonth; day++) {
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

  // Switch month
  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

  // Add staff
  const handleAddStaff = async () => {
    if (!name.trim()) {
      Alert.alert(t('error', 'Error'), 'Please enter staff name.');
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      cleanPhone = '9876543210';
    }

    let createdId = 's-' + Date.now();
    try {
      await ensureBackendToken();
      const res = await apiClient.post('/hotel/staff', {
        name: name.trim(),
        phone: cleanPhone,
        address: 'Pune, Maharashtra',
        designation: role,
        joiningDate: new Date().toISOString().slice(0, 10),
        basicSalary: Number(grossSalary) || 15000,
        salaryFrequency: 'MONTHLY',
        deduction: Number(deduction) || 0,
        branchId: 1,
        active: true,
      });
      if (res.data?.data?.id) {
        createdId = 's' + res.data.data.id;
      }
    } catch (e) {
      console.warn('Backend staff creation sync warning:', e);
    }

    const newMember: StaffMember = {
      id: createdId,
      name: name.trim(),
      role,
      phone: cleanPhone,
      shift,
      status: 'ON_DUTY',
      grossSalary: Number(grossSalary) || 15000,
      deduction: Number(deduction) || 0,
      joiningDate: new Date().toISOString().slice(0, 10),
    };
    const updated = [newMember, ...staffList];
    setStaffList(updated);
    AsyncStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(updated));

    // Also populate baseline attendance for new staff
    const addKey = (status: AttendanceStatus) => {
      const copy = { ...attendanceMap };
      for (let day = 1; day <= daysInSelectedMonth; day++) {
        copy[`${newMember.id}_${selectedMonth}-${String(day).padStart(2, '0')}`] = status;
      }
      setAttendanceMap(copy);
    };
    addKey('PRESENT');

    setShowAddModal(false);
    setName('');
    setPhone('');
    setGrossSalary('15000');
    Alert.alert(t('success', 'Success'), `${newMember.name} added as ${newMember.role}!`);
  };

  // Calculate monthly stats for a staff member
  const getStaffMonthlyStats = (staffId: string) => {
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let off = 0;

    for (let day = 1; day <= daysInSelectedMonth; day++) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const status = attendanceMap[`${staffId}_${dateKey}`] || 'PRESENT';
      if (status === 'PRESENT') present++;
      else if (status === 'HALF_DAY') halfDay++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'OFF') off++;
    }

    const workingDays = daysInSelectedMonth - off;
    const effectivePresent = present + halfDay * 0.5;
    const attendanceRate = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 100;

    const staffObj = staffList.find((s) => s.id === staffId);
    const gross = staffObj?.grossSalary || 15000;
    const deductionAmt = staffObj?.deduction || 0;
    const dailyRate = gross / daysInSelectedMonth;
    const earnedSalary = Math.round(effectivePresent * dailyRate + off * dailyRate);
    const netSalary = Math.max(0, earnedSalary - deductionAmt);

    return {
      totalDays: daysInSelectedMonth,
      present,
      halfDay,
      absent,
      off,
      workingDays,
      effectivePresent,
      attendanceRate,
      grossSalary: gross,
      deduction: deductionAmt,
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

  return (
    <View style={styles.container}>
      <AppNavbar navigation={navigation} />

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
            activeTab === 'MONTHLY'
              ? `${t('monthlyStaffReport', 'Monthly Staff Report')} • ${monthDisplayName}`
              : activeTab === 'DAILY'
              ? `${t('dailyAttendance', 'Daily Attendance Roll-Call')} • ${dailyDate}`
              : `${t('staffRoster', 'Staff Roster & Shifts')} (${staffList.length} Staff)`
          }
          rightAction={
            <TouchableOpacity
              style={styles.headerExportBtn}
              onPress={handleExportMonthlyReport}
              activeOpacity={0.8}
            >
              <FileSpreadsheet size={15} color="#FFFFFF" />
              <Text style={styles.headerExportText}>{t('export', 'Export')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Main Top Navigation Tabs (Roster, Daily, Monthly) */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'MONTHLY' && styles.subTabItemActive]}
            onPress={() => setActiveTab('MONTHLY')}
            activeOpacity={0.8}
          >
            <Calendar size={15} color={activeTab === 'MONTHLY' ? '#4F46E5' : '#64748B'} />
            <Text style={[styles.subTabText, activeTab === 'MONTHLY' && styles.subTabTextActive]}>
              {t('monthlyStaffReport', 'Monthly Report')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'DAILY' && styles.subTabItemActive]}
            onPress={() => setActiveTab('DAILY')}
            activeOpacity={0.8}
          >
            <Clock size={15} color={activeTab === 'DAILY' ? '#4F46E5' : '#64748B'} />
            <Text style={[styles.subTabText, activeTab === 'DAILY' && styles.subTabTextActive]}>
              {t('dailyAttendance', 'Daily Roll-Call')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'ROSTER' && styles.subTabItemActive]}
            onPress={() => setActiveTab('ROSTER')}
            activeOpacity={0.8}
          >
            <Users size={15} color={activeTab === 'ROSTER' ? '#4F46E5' : '#64748B'} />
            <Text style={[styles.subTabText, activeTab === 'ROSTER' && styles.subTabTextActive]}>
              {t('staffRoster', 'Staff Roster')}
            </Text>
          </TouchableOpacity>
        </View>

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
                <Calendar size={16} color="#4F46E5" />
                <Text style={styles.monthDisplayTitle}>{monthDisplayName}</Text>
                <Text style={styles.monthDisplaySub}>({daysInSelectedMonth} {t('days', 'Days')})</Text>
              </View>

              <TouchableOpacity
                style={styles.monthArrowBtn}
                onPress={() => changeMonth(1)}
                activeOpacity={0.7}
              >
                <ChevronRight size={20} color="#4F46E5" />
              </TouchableOpacity>
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
                    <DollarSign size={16} color="#D97706" />
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
                {['ALL', 'MANAGER', 'CAPTAIN', 'WAITER', 'CHEF', 'CASHIER'].map((r) => (
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
            {/* Daily Date Selector */}
            <View style={styles.dailyDateBar}>
              <View>
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

            {/* Daily Roll-Call List */}
            <View style={styles.staffCardsContainer}>
              {staffList.map((staff) => {
                const currentStatus = attendanceMap[`${staff.id}_${dailyDate}`] || 'PRESENT';

                return (
                  <View key={staff.id} style={styles.dailyStaffCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.avatarCircleSmall}>
                        <Text style={styles.avatarCharSmall}>{staff.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.staffNameText}>{localizeGuestName(staff.name)}</Text>
                        <Text style={styles.staffSubText}>{t(staff.role, staff.role)} • {t(staff.shift, staff.shift)} {t('shift', 'Shift')}</Text>
                      </View>
                    </View>

                    {/* Status Pill Selectors */}
                    <View style={styles.statusPillsRow}>
                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'PRESENT' && styles.statusPillPresent]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'PRESENT')}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'PRESENT' && styles.statusPillTextActive]}>
                          ✓ {t('present', 'Present')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'HALF_DAY' && styles.statusPillHalf]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'HALF_DAY')}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'HALF_DAY' && styles.statusPillTextActive]}>
                          ½ {t('halfDay', 'Half-Day')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'ABSENT' && styles.statusPillAbsent]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'ABSENT')}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'ABSENT' && styles.statusPillTextActive]}>
                          ✕ {t('absent', 'Absent')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusPill, currentStatus === 'OFF' && styles.statusPillOff]}
                        onPress={() => setStaffAttendance(staff.id, dailyDate, 'OFF')}
                      >
                        <Text style={[styles.statusPillText, currentStatus === 'OFF' && styles.statusPillTextActive]}>
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
        {activeTab === 'ROSTER' && (
          <View>
            {/* Attendance Summary Strip */}
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>{t('todaysOnDutyRoster', "TODAY'S ON-DUTY ROSTER")}</Text>
                <Text style={styles.summaryNumber}>
                  {toDevanagari(onDutyCount)} / {toDevanagari(staffList.length)} <Text style={{ fontSize: 13, color: '#16A34A' }}>{t('onDuty', 'On Duty')}</Text>
                </Text>
              </View>
              <View style={styles.usersIconBox}>
                <Users size={24} color="#4F46E5" />
              </View>
            </View>

            {/* Action & Search */}
            <View style={styles.actionRow}>
              <View style={styles.searchBox}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchByNameOrRole', 'Search by name or role...')}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>{t('addStaff', 'Add Staff')}</Text>
              </TouchableOpacity>
            </View>

            {/* Staff Members List */}
            <View style={styles.staffCardsContainer}>
              {filteredStaff.map((member) => (
                <View key={member.id} style={styles.staffCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarChar}>{member.name.charAt(0)}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.staffName}>{localizeGuestName(member.name)}</Text>
                      <TouchableOpacity
                        style={[styles.statusToggleBadge, member.status === 'ON_DUTY' ? styles.statusOn : styles.statusOff]}
                        onPress={() => toggleDutyStatus(member.id)}
                      >
                        <Text style={[styles.statusToggleText, member.status === 'ON_DUTY' ? styles.statusOnText : styles.statusOffText]}>
                          {member.status === 'ON_DUTY' ? '● ' + t('onDuty', 'On Duty') : '○ ' + t('offDuty', 'Off Duty')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={styles.rolePill}>
                        <Text style={styles.roleText}>{t(member.role, member.role)}</Text>
                      </View>
                      <Text style={styles.shiftText}>• {t(member.shift, member.shift)} {t('shift', 'Shift')}</Text>
                      <Text style={styles.shiftText}>• ₹ {toDevanagari(member.grossSalary.toLocaleString('en-IN'))}/{t('month', 'mo')}</Text>
                    </View>

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
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
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
          MODAL 2: ADD STAFF MEMBER
      ========================================================= */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addNewStaff', 'Add New Staff Member')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>{t('fullName', 'Full Name')} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('namePlaceholder', 'e.g. Ramesh Patil')}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>{t('roleDesignation', 'Role / Designation')}</Text>
                <View style={styles.roleSelector}>
                  {(['Manager', 'Captain', 'Waiter', 'Chef', 'Cashier'] as StaffRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleOption, role === r && styles.roleOptionActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>{t(r, r)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>{t('shiftTiming', 'Shift Timing')}</Text>
                <View style={styles.roleSelector}>
                  {(['Morning', 'Evening', 'Full Day'] as StaffShift[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.roleOption, shift === s && styles.roleOptionActive]}
                      onPress={() => setShift(s)}
                    >
                      <Text style={[styles.roleOptionText, shift === s && styles.roleOptionTextActive]}>{t(s, s)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>{t('phoneNumber', 'Phone Number')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98000 00000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>{t('grossSalary', 'Gross Salary')} (₹/mo)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={grossSalary}
                    onChangeText={setGrossSalary}
                    placeholder="15000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>{t('deductions', 'Deductions')} (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={deduction}
                    onChangeText={setDeduction}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddStaff}>
                <Text style={styles.submitBtnText}>{t('saveStaffMember', 'Save Staff Member')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 12,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  subTabItemActive: {
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#4F46E5',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
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
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
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
    borderColor: '#E2E8F0',
  },
  roleChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  staffCardsContainer: {
    gap: 12,
  },
  monthlyStaffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  staffSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attendanceBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
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
    color: '#475569',
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
    color: '#475569',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dailyStaffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
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
    color: '#0F172A',
    fontWeight: '900',
  },
  // Staff Roster
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1C1917',
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
    gap: 10,
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0EBE1',
    padding: 9,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  matrixMetricsBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-around',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matrixMetricItem: {
    alignItems: 'center',
  },
  matrixMetricNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
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
    color: '#0F172A',
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
  // Add Staff Modal
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
