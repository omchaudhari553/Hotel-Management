import React, { useEffect, useState } from "react";
import { staffService, StaffAttendance, AttendanceSummary } from "../services/staffService";
import { sanitizeMobileInput, isValidMobile } from "../common/phoneUtils";
import { LocalizedDatePicker } from "../common/LocalizedDatePicker";
import { useBranch } from "../context/BranchContext";
import { useLanguage } from "../context/LanguageContext";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Search,
  Filter,
  Save,
  UserX,
  Sparkles,
  Printer,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Staff {
  id: number;
  name: string;
  phone: string;
  address: string;
  designation: string;
  joiningDate: string;
  idProofType: string;
  idProofNumber: string;
  grossSalary: number;
  salaryFrequency: "Daily" | "Weekly" | "Bi-Weekly" | "Monthly";
  deduction: number;
}

type Tab = "staff" | "add" | "attendance" | "monthlyReport";

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const StaffManagement: React.FC = () => {
  const { selectedBranchId } = useBranch();
  const { t, translateStatus, formatDate, formatNumber, toDevanagari, currentLanguage, localizeGuestName } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("staff");

  const translateDesignation = (desig?: string) => {
    if (!desig) return "";
    const key = desig.trim();
    return t(key, desig);
  };

  const translateSalaryFrequency = (freq?: string) => {
    if (!freq) return "";
    const key = freq.trim();
    return t(key, freq);
  };

  const translateIdProof = (idType?: string) => {
    if (!idType) return "";
    const key = idType.trim();
    return t(key, idType);
  };

  const [staffList, setStaffList] = useState<Staff[]>([
    {
      id: 1,
      name: "Rahul Patil",
      phone: "9876543210",
      address: "Pune",
      designation: "Manager",
      joiningDate: "2026-01-10",
      idProofType: "Aadhar Card",
      idProofNumber: "XXXX-XXXX-1234",
      grossSalary: 25000,
      salaryFrequency: "Monthly",
      deduction: 1000,
    },
    {
      id: 2,
      name: "Kalyani Patil",
      phone: "7867564534",
      address: "Mumbai",
      designation: "Chef",
      joiningDate: "2026-05-10",
      idProofType: "Aadhar Card",
      idProofNumber: "XXXX-XXXX-2345",
      grossSalary: 20000,
      salaryFrequency: "Monthly",
      deduction: 1000,
    },
  ]);

  useEffect(() => {
    let mounted = true;
    staffService
      .getStaff(selectedBranchId)
      .then((res) => {
        if (mounted && res) {
          const loadedStaff: Staff[] = res.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            address: s.address,
            designation: s.designation,
            joiningDate: s.joiningDate,
            idProofType: s.idProofType || "Aadhar Card",
            idProofNumber: s.idProofNumber || "",
            grossSalary: s.basicSalary || 15000,
            salaryFrequency: (s.salaryFrequency as any) || "Monthly",
            deduction: s.deduction || 0,
          }));
          setStaffList(loadedStaff);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend staff:", err);
      });

    return () => {
      mounted = false;
    };
  }, [selectedBranchId]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    designation: "",
    joiningDate: "",
    idProofType: "",
    idProofNumber: "",
    grossSalary: "",
    salaryFrequency: "Monthly",
    deduction: "",
  });

  const [selectedStaff, setSelectedStaff] =
    useState<Staff | null>(null);

  const [editStaff, setEditStaff] =
    useState<Staff | null>(null);

  const [deleteStaff, setDeleteStaff] =
    useState<Staff | null>(null);

  const [popupMessage, setPopupMessage] =
    useState("");

  const [submitted, setSubmitted] = useState(false);

  const [search, setSearch] = useState("");

  const [currentDate, setCurrentDate] =
    useState(getTodayDate());

  /* =========================
     DAILY ATTENDANCE STATE
  ========================= */
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayDate());
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>("ALL");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [savingAttendanceId, setSavingAttendanceId] = useState<number | null>(null);

  /* =========================
     MONTHLY ATTENDANCE STATE
  ========================= */
  const [attendanceViewMode, setAttendanceViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [viewingStaffMonthDetail, setViewingStaffMonthDetail] = useState<Staff | null>(null);
  const [monthlyViewType, setMonthlyViewType] = useState<"summary" | "matrix">("summary");
  const [expandedStaffRowId, setExpandedStaffRowId] = useState<number | null>(null);
  const [monthlySearchQuery, setMonthlySearchQuery] = useState<string>("");
  const [monthlyRoleFilter, setMonthlyRoleFilter] = useState<string>("ALL");
  const [monthlyAttendanceList, setMonthlyAttendanceList] = useState<StaffAttendance[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [monthlySavingStaffDate, setMonthlySavingStaffDate] = useState<string | null>(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState<"summary" | "daily">("summary");
  const [monthlyCurrentPage, setMonthlyCurrentPage] = useState<number>(1);
  const [monthlyPageSize] = useState<number>(8);
  const [isDailyDetailsOpen, setIsDailyDetailsOpen] = useState<boolean>(false);
  const [selectedDailyDetailsStaffId, setSelectedDailyDetailsStaffId] = useState<number | null>(null);

  const getFilteredMonthlyStaff = () => {
    return staffList.filter((s) => {
      const localizedName = localizeGuestName(s.name);
      const localizedDesig = translateDesignation(s.designation);
      const query = monthlySearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        localizedName.toLowerCase().includes(query) ||
        (s.phone && s.phone.includes(query)) ||
        s.designation.toLowerCase().includes(query) ||
        localizedDesig.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (monthlyRoleFilter === "ALL") return true;
      return s.designation.toLowerCase() === monthlyRoleFilter.toLowerCase();
    });
  };

  const [monthlyRecordsMap, setMonthlyRecordsMap] = useState<Record<string, any>>(() => {
    try {
      const currentM = new Date().toISOString().slice(0, 7);
      const raw = localStorage.getItem(`staff_monthly_attendance_1_${currentM}`);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });

  const getDaysInMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const getMonthDisplayName = (monthStr: string, lang: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const monthsMr = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
    const monthsHi = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mName = lang === 'mr' ? monthsMr[m - 1] : lang === 'hi' ? monthsHi[m - 1] : monthsEn[m - 1];
    if (lang === 'mr' || lang === 'hi') {
      return `${mName} ${toDevanagari(y)}`;
    }
    return `${mName} ${y}`;
  };

  const getDayOfWeekInfo = (dayNum: number, monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, dayNum);
    const dayIndex = dateObj.getDay(); // 0 = Sunday
    const enDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const enDaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mrDaysShort = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    const mrDaysFull = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    return {
      dayIndex,
      isSunday: dayIndex === 0,
      shortLabel: currentLanguage === 'mr' ? mrDaysShort[dayIndex] : enDaysShort[dayIndex],
      fullLabel: currentLanguage === 'mr' ? mrDaysFull[dayIndex] : enDaysFull[dayIndex],
    };
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const nextM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextM);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextM);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleYearChange = (year: number) => {
    const [, m] = selectedMonth.split('-');
    setSelectedMonth(`${year}-${m}`);
  };

  const handleMonthNumChange = (monthNum: number) => {
    const [y] = selectedMonth.split('-');
    setSelectedMonth(`${y}-${String(monthNum).padStart(2, '0')}`);
  };

  const loadMonthlyAttendanceData = async (monthStr: string) => {
    setMonthlyLoading(true);
    try {
      const records = await staffService.getAttendance();
      const monthFiltered = (records || []).filter(
        (r: StaffAttendance) => r.date && r.date.startsWith(monthStr)
      );
      setMonthlyAttendanceList(monthFiltered);

      const key = `staff_monthly_attendance_${selectedBranchId || 1}_${monthStr}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        setMonthlyRecordsMap(JSON.parse(raw));
      } else {
        setMonthlyRecordsMap({});
      }
    } catch (err) {
      console.warn("Failed to load monthly attendance from API:", err);
      const key = `staff_monthly_attendance_${selectedBranchId || 1}_${monthStr}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          setMonthlyRecordsMap(JSON.parse(raw));
        } catch (_) { }
      }
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "monthlyReport" || activeTab === "attendance") {
      loadMonthlyAttendanceData(selectedMonth);
    }
  }, [activeTab, selectedMonth, selectedBranchId]);

  const getStaffDayAttendance = (staffId: number, dayNum: number) => {
    const dayStr = String(dayNum).padStart(2, '0');
    const fullDate = `${selectedMonth}-${dayStr}`;

    const backendRecord = monthlyAttendanceList.find(
      (r) => Number(r.staffId) === Number(staffId) && r.date === fullDate
    );
    if (backendRecord) {
      return {
        date: fullDate,
        dayNum,
        status: backendRecord.status || "UNMARKED",
        inTime: backendRecord.checkInTime || "",
        outTime: backendRecord.checkOutTime || "",
        workingHours: backendRecord.workingHours ?? calculateHours(backendRecord.checkInTime, backendRecord.checkOutTime),
        remarks: backendRecord.remarks || "",
        isBackend: true,
      };
    }

    const localKey = `${staffId}_${fullDate}`;
    const localRec = monthlyRecordsMap[localKey];
    if (localRec) {
      return {
        date: fullDate,
        dayNum,
        status: localRec.status || "UNMARKED",
        inTime: localRec.inTime || localRec.checkInTime || "",
        outTime: localRec.outTime || localRec.checkOutTime || "",
        workingHours: localRec.workingHours ?? calculateHours(localRec.inTime || localRec.checkInTime, localRec.outTime || localRec.checkOutTime),
        remarks: localRec.remarks || "",
        isBackend: false,
      };
    }

    if (attendanceDate === fullDate) {
      const dailyRec = attendanceRecords.find((r) => Number(r.staffId) === Number(staffId));
      if (dailyRec) {
        return {
          date: fullDate,
          dayNum,
          status: dailyRec.status || "UNMARKED",
          inTime: dailyRec.checkInTime || "",
          outTime: dailyRec.checkOutTime || "",
          workingHours: dailyRec.workingHours ?? calculateHours(dailyRec.checkInTime, dailyRec.checkOutTime),
          remarks: dailyRec.remarks || "",
          isBackend: false,
        };
      }
    }

    return {
      date: fullDate,
      dayNum,
      status: "UNMARKED",
      inTime: "",
      outTime: "",
      workingHours: undefined,
      remarks: "",
      isBackend: false,
    };
  };

  const getStaffMonthlyStats = (staffId: number) => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;
    let totalHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = getStaffDayAttendance(staffId, d);
      const st = (dayData.status || "").toUpperCase();
      if (st === "PRESENT") {
        presentCount++;
        totalHours += Number(dayData.workingHours != null ? dayData.workingHours : 9.0);
      } else if (st === "HALF_DAY") {
        halfDayCount++;
        totalHours += Number(dayData.workingHours != null ? dayData.workingHours : 4.5);
      } else if (st === "ABSENT") {
        absentCount++;
      } else if (st === "LEAVE" || st === "ON_LEAVE") {
        leaveCount++;
      } else {
        unmarkedCount++;
      }
    }

    const effectivePayableDays = presentCount + halfDayCount * 0.5;
    const markedDays = presentCount + halfDayCount + absentCount + leaveCount;
    const attendanceRate = markedDays > 0 ? Math.round((effectivePayableDays / markedDays) * 100) : 0;

    const staffObj = staffList.find((s) => Number(s.id) === Number(staffId));
    const grossSalary = Number(staffObj?.grossSalary) || 0;
    const deduction = Number(staffObj?.deduction) || 0;
    const perDaySalary = daysInMonth > 0 ? grossSalary / daysInMonth : 0;
    const estimatedPay = Math.max(0, Math.round(effectivePayableDays * perDaySalary - deduction));

    return {
      daysInMonth,
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      unmarkedCount,
      effectivePayableDays,
      totalHours: Number(totalHours.toFixed(1)),
      attendanceRate,
      grossSalary,
      deduction,
      perDaySalary: Number(perDaySalary.toFixed(2)),
      estimatedPay,
    };
  };

  const getOverallMonthlySummary = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalEffectiveDays = 0;
    let totalMarkedDays = 0;

    staffList.forEach((s) => {
      const stats = getStaffMonthlyStats(s.id);
      totalPresent += stats.presentCount;
      totalHalfDay += stats.halfDayCount;
      totalAbsent += stats.absentCount;
      totalLeave += stats.leaveCount;
      totalEffectiveDays += stats.effectivePayableDays;
      totalMarkedDays += stats.presentCount + stats.halfDayCount + stats.absentCount + stats.leaveCount;
    });

    const avgRate = totalMarkedDays > 0 ? Math.round((totalEffectiveDays / totalMarkedDays) * 100) : 0;

    return {
      daysInMonth,
      totalStaff: staffList.length,
      totalPresent,
      totalHalfDay,
      totalAbsent,
      totalLeave,
      avgRate,
    };
  };

  const handleSaveStaffDayStatus = async (
    staffId: number,
    dateStr: string,
    newStatus: string,
    customTimes?: { checkIn?: string; checkOut?: string; hours?: number; remarks?: string }
  ) => {
    const defaultCheckIn =
      newStatus === "PRESENT" || newStatus === "HALF_DAY"
        ? customTimes?.checkIn || "09:30"
        : undefined;
    const defaultCheckOut =
      newStatus === "PRESENT"
        ? customTimes?.checkOut || "18:30"
        : newStatus === "HALF_DAY"
          ? customTimes?.checkOut || "14:00"
          : undefined;
    const workingHours =
      customTimes?.hours ??
      calculateHours(defaultCheckIn, defaultCheckOut) ??
      (newStatus === "PRESENT" ? 9.0 : newStatus === "HALF_DAY" ? 4.5 : 0);

    const remarks = customTimes?.remarks || "";

    const localKey = `${staffId}_${dateStr}`;
    const nextLocalMap = {
      ...monthlyRecordsMap,
      [localKey]: {
        staffId,
        date: dateStr,
        status: newStatus,
        checkInTime: defaultCheckIn,
        checkOutTime: defaultCheckOut,
        workingHours,
        remarks,
      },
    };
    setMonthlyRecordsMap(nextLocalMap);
    try {
      const storageKey = `staff_monthly_attendance_${selectedBranchId || 1}_${selectedMonth}`;
      localStorage.setItem(storageKey, JSON.stringify(nextLocalMap));
    } catch (_) { }

    setMonthlySavingStaffDate(`${staffId}_${dateStr}`);
    try {
      const saved = await staffService.saveAttendance({
        staffId,
        date: dateStr,
        status: newStatus,
        checkInTime: defaultCheckIn,
        checkOutTime: defaultCheckOut,
        workingHours,
        remarks,
      });

      setMonthlyAttendanceList((prev) => {
        const idx = prev.findIndex(
          (r) => Number(r.staffId) === Number(staffId) && r.date === dateStr
        );
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = saved;
          return cp;
        }
        return [...prev, saved];
      });

      if (dateStr === attendanceDate) {
        setAttendanceRecords((prev) => {
          const idx = prev.findIndex((r) => Number(r.staffId) === Number(staffId));
          if (idx >= 0) {
            const cp = [...prev];
            cp[idx] = saved;
            return cp;
          }
          return [...prev, saved];
        });
      }

      showPopup(`Saved ${newStatus} for ${dateStr}`);
    } catch (err: any) {
      showPopup(`Saved locally. (${err.message || 'offline'})`);
    } finally {
      setMonthlySavingStaffDate(null);
    }
  };

  const handleSaveMonthlyAttendance = () => {
    const key = `staff_monthly_attendance_${selectedBranchId || 1}_${selectedMonth}`;
    try {
      localStorage.setItem(key, JSON.stringify(monthlyRecordsMap));
      showPopup(t('monthlySavedSuccess', 'मासिक हजेरी यशस्वीरीत्या सेव्ह झाली! (Monthly attendance saved successfully!)'));
    } catch (e: any) {
      showPopup('Failed to save monthly attendance: ' + e.message);
    }
  };

  const handleExportMonthlyCsv = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const monthDisplayName = getMonthDisplayName(selectedMonth, 'en');
    const targetStaff = getFilteredMonthlyStaff();

    const headers = [
      'Staff ID',
      'Name',
      'Phone',
      'Designation',
      'Gross Salary',
      'Present (P)',
      'Half Day (HD)',
      'Absent (A)',
      'Leave (L)',
      'Unmarked (-)',
      'Payable Days',
      'Total Hours',
      'Attendance %',
      'Estimated Pay',
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(`Day ${d}`);
    }

    const rows = targetStaff.map((s) => {
      const stats = getStaffMonthlyStats(s.id);
      const row = [
        s.id,
        `"${s.name}"`,
        s.phone,
        `"${s.designation}"`,
        stats.grossSalary,
        stats.presentCount,
        stats.halfDayCount,
        stats.absentCount,
        stats.leaveCount,
        stats.unmarkedCount,
        stats.effectivePayableDays,
        stats.totalHours,
        `${stats.attendanceRate}%`,
        stats.estimatedPay,
      ];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayData = getStaffDayAttendance(s.id, d);
        const st = dayData.status || '-';
        row.push(
          st === 'PRESENT'
            ? 'P'
            : st === 'HALF_DAY'
              ? 'HD'
              : st === 'ABSENT'
                ? 'A'
                : st === 'LEAVE'
                  ? 'L'
                  : '-'
        );
      }

      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Attendance_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showPopup(`CSV Exported for ${monthDisplayName}`);
  };

  const handlePrintMonthlyReport = () => {
    const summary = getOverallMonthlySummary();
    const daysInMonth = getDaysInMonth(selectedMonth);
    const monthDisplayName = getMonthDisplayName(selectedMonth, currentLanguage);
    const targetStaff = getFilteredMonthlyStaff();

    const printWin = window.open("", "_blank", "width=1100,height=800");
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = targetStaff.map((s, idx) => {
      const stats = getStaffMonthlyStats(s.id);
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? '#fff' : '#f9fafb'};">
          <td style="padding: 8px 10px; font-weight: 600;">${s.name}</td>
          <td style="padding: 8px 10px;">${s.designation}</td>
          <td style="padding: 8px 10px;">${s.phone}</td>
          <td style="padding: 8px 10px; text-align: center; color: #16a34a; font-weight: 700;">${stats.presentCount}</td>
          <td style="padding: 8px 10px; text-align: center; color: #d97706; font-weight: 700;">${stats.halfDayCount}</td>
          <td style="padding: 8px 10px; text-align: center; color: #dc2626; font-weight: 700;">${stats.absentCount}</td>
          <td style="padding: 8px 10px; text-align: center; color: #2563eb; font-weight: 700;">${stats.leaveCount}</td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 700;">${stats.effectivePayableDays}</td>
          <td style="padding: 8px 10px; text-align: center;">${stats.totalHours} hrs</td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #7c3aed;">${stats.attendanceRate}%</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 700;">₹${stats.estimatedPay.toLocaleString()}</td>
        </tr>
      `;
    }).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Staff Attendance Report - ${selectedMonth}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #b94f08; padding-bottom: 12px; }
          .header h1 { margin: 0; color: #b94f08; font-size: 22px; }
          .header p { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
          .kpi-grid { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
          .kpi-card { flex: 1; min-width: 120px; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fdfdfd; }
          .kpi-card span { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 700; }
          .kpi-card div { font-size: 18px; font-weight: 800; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px; }
          th { background: #fff7ed; color: #9a4210; padding: 10px; text-align: left; border-bottom: 2px solid #fed7aa; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; }
          .sign-box { width: 200px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 12px; font-weight: 600; color: #4b5563; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Hotel Staff Monthly Attendance Report</h1>
          <p><strong>Month:</strong> ${monthDisplayName} (${selectedMonth}) | <strong>Total Days:</strong> ${daysInMonth} | <strong>Branch ID:</strong> ${selectedBranchId || 1}</p>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card"><span>Total Staff</span><div>${targetStaff.length}</div></div>
          <div class="kpi-card"><span>Total Present (P)</span><div style="color:#16a34a">${summary.totalPresent}</div></div>
          <div class="kpi-card"><span>Total Half Day (HD)</span><div style="color:#d97706">${summary.totalHalfDay}</div></div>
          <div class="kpi-card"><span>Total Absent (A)</span><div style="color:#dc2626">${summary.totalAbsent}</div></div>
          <div class="kpi-card"><span>Total Leaves (L)</span><div style="color:#2563eb">${summary.totalLeave}</div></div>
          <div class="kpi-card"><span>Avg Attendance</span><div style="color:#7c3aed">${summary.avgRate}%</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Designation</th>
              <th>Phone</th>
              <th style="text-align: center;">P</th>
              <th style="text-align: center;">HD</th>
              <th style="text-align: center;">A</th>
              <th style="text-align: center;">L</th>
              <th style="text-align: center;">Payable Days</th>
              <th style="text-align: center;">Total Hours</th>
              <th style="text-align: center;">Attendance %</th>
              <th style="text-align: right;">Est. Pay</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">Prepared By (HR / Admin)</div>
          <div class="sign-box">Hotel Manager Signature</div>
          <div class="sign-box">Authorized Signatory</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const handlePrintStaffMonthlySlip = (staff: Staff) => {
    const stats = getStaffMonthlyStats(staff.id);
    const daysInMonth = getDaysInMonth(selectedMonth);
    const monthDisplayName = getMonthDisplayName(selectedMonth, currentLanguage);

    const printWin = window.open("", "_blank", "width=850,height=900");
    if (!printWin) {
      window.print();
      return;
    }

    const dayRowsHtml = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
      const dayData = getStaffDayAttendance(staff.id, d);
      const dayInfo = getDayOfWeekInfo(d, selectedMonth);
      const dayDateStr = `${String(d).padStart(2, '0')}/${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;
      const stColor =
        dayData.status === 'PRESENT'
          ? '#16a34a'
          : dayData.status === 'HALF_DAY'
            ? '#d97706'
            : dayData.status === 'ABSENT'
              ? '#dc2626'
              : dayData.status === 'LEAVE'
                ? '#2563eb'
                : '#9ca3af';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; background: ${dayInfo.isSunday ? '#fffbeb' : '#fff'};">
          <td style="padding: 6px 10px; font-weight: 600;">${dayDateStr}</td>
          <td style="padding: 6px 10px; color: ${dayInfo.isSunday ? '#b45309' : '#4b5563'}; font-weight: ${dayInfo.isSunday ? '700' : '500'};">${dayInfo.fullLabel}</td>
          <td style="padding: 6px 10px; font-weight: 700; color: ${stColor};">${dayData.status || '-'}</td>
          <td style="padding: 6px 10px; text-align: center;">${dayData.inTime || '—'}</td>
          <td style="padding: 6px 10px; text-align: center;">${dayData.outTime || '—'}</td>
          <td style="padding: 6px 10px; text-align: center; font-weight: 600;">${dayData.workingHours != null ? dayData.workingHours + ' hrs' : '—'}</td>
          <td style="padding: 6px 10px; color: #6b7280; font-size: 11px;">${dayData.remarks || ''}</td>
        </tr>
      `;
    }).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Staff Monthly Attendance Slip - ${staff.name} - ${selectedMonth}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #b94f08; padding-bottom: 12px; }
          .header h1 { margin: 0; color: #b94f08; font-size: 20px; }
          .profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; background: #fdfdfd; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
          .profile-grid div strong { color: #374151; }
          .summary-tiles { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
          .tile { flex: 1; min-width: 90px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f8fafc; }
          .tile span { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .tile div { font-size: 16px; font-weight: 800; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          th { background: #fff7ed; color: #9a4210; padding: 8px 10px; text-align: left; border-bottom: 2px solid #fed7aa; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 15px; }
          .sign-box { width: 180px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 5px; font-size: 11px; font-weight: 600; color: #4b5563; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Staff Monthly Attendance & Work Slip</h1>
          <p style="margin: 3px 0 0; color: #6b7280; font-size: 13px;"><strong>Month:</strong> ${monthDisplayName} (${selectedMonth}) | <strong>Branch ID:</strong> ${selectedBranchId || 1}</p>
        </div>

        <div class="profile-grid">
          <div><strong>Staff Name:</strong> ${staff.name}</div>
          <div><strong>Designation:</strong> ${staff.designation}</div>
          <div><strong>Phone:</strong> ${staff.phone}</div>
          <div><strong>Joining Date:</strong> ${staff.joiningDate || '-'}</div>
          <div><strong>ID Proof:</strong> ${staff.idProofType || 'Aadhar'} (${staff.idProofNumber || '-'})</div>
          <div><strong>Gross Salary:</strong> ₹${staff.grossSalary?.toLocaleString() || 0} / month</div>
        </div>

        <div class="summary-tiles">
          <div class="tile"><span>Total Days</span><div>${daysInMonth}</div></div>
          <div class="tile"><span>Present (P)</span><div style="color:#16a34a">${stats.presentCount}</div></div>
          <div class="tile"><span>Half Day (HD)</span><div style="color:#d97706">${stats.halfDayCount}</div></div>
          <div class="tile"><span>Absent (A)</span><div style="color:#dc2626">${stats.absentCount}</div></div>
          <div class="tile"><span>Leaves (L)</span><div style="color:#2563eb">${stats.leaveCount}</div></div>
          <div class="tile"><span>Payable Days</span><div style="font-weight:900;">${stats.effectivePayableDays}</div></div>
          <div class="tile"><span>Total Hours</span><div>${stats.totalHours} hrs</div></div>
          <div class="tile"><span>Attendance %</span><div style="color:#7c3aed">${stats.attendanceRate}%</div></div>
          <div class="tile"><span>Est. Net Pay</span><div style="color:#b94f08">₹${stats.estimatedPay.toLocaleString()}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
              <th style="text-align: center;">In Time</th>
              <th style="text-align: center;">Out Time</th>
              <th style="text-align: center;">Hours</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${dayRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">Staff Signature</div>
          <div class="sign-box">Manager Signature</div>
          <div class="sign-box">Accounts Signature</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };


  const calculateHours = (inTime?: string, outTime?: string): number | undefined => {
    if (!inTime || !outTime) return undefined;
    try {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return undefined;
      const inMinutes = inH * 60 + inM;
      const outMinutes = outH * 60 + outM;
      const diff = outMinutes - inMinutes;
      if (diff <= 0) return 0;
      return Number((diff / 60).toFixed(1));
    } catch {
      return undefined;
    }
  };

  const loadAttendance = async (date: string) => {
    setAttendanceLoading(true);
    try {
      const [records, summary] = await Promise.all([
        staffService.getAttendance({ date }),
        staffService.getAttendanceSummary(date),
      ]);
      setAttendanceRecords(records || []);
      setAttendanceSummary(summary || null);
    } catch (err) {
      console.warn("Could not load attendance:", err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance(attendanceDate);
    }
  }, [activeTab, attendanceDate, selectedBranchId]);

  const handleRecordFieldChange = (staffId: number, field: string, val: any) => {
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => Number(r.staffId) === Number(staffId));
      if (idx >= 0) {
        const updated = [...prev];
        const nextRecord = { ...updated[idx], [field]: val };
        if (field === "checkInTime" || field === "checkOutTime") {
          const inTime = field === "checkInTime" ? val : nextRecord.checkInTime;
          const outTime = field === "checkOutTime" ? val : nextRecord.checkOutTime;
          nextRecord.workingHours = calculateHours(inTime, outTime);
        }
        updated[idx] = nextRecord;
        return updated;
      } else {
        const staffObj = staffList.find((s) => Number(s.id) === Number(staffId));
        const newRecord: StaffAttendance = {
          staffId,
          staffName: staffObj?.name || "",
          designation: staffObj?.designation || "",
          date: attendanceDate,
          status: "PRESENT",
          [field]: val,
        };
        if (field === "checkInTime" || field === "checkOutTime") {
          newRecord.workingHours = calculateHours(newRecord.checkInTime, newRecord.checkOutTime);
        }
        return [...prev, newRecord];
      }
    });
  };

  const handleQuickStatus = async (staffId: number, newStatus: string) => {
    const existing = attendanceRecords.find((r) => Number(r.staffId) === Number(staffId));
    const defaultCheckIn =
      newStatus === "PRESENT" || newStatus === "HALF_DAY"
        ? existing?.checkInTime || "09:30"
        : undefined;
    const defaultCheckOut =
      newStatus === "PRESENT"
        ? existing?.checkOutTime || "18:30"
        : newStatus === "HALF_DAY"
          ? existing?.checkOutTime || "14:00"
          : undefined;
    const workingHours = calculateHours(defaultCheckIn, defaultCheckOut) ?? (newStatus === "PRESENT" ? 9.0 : newStatus === "HALF_DAY" ? 4.5 : 0);

    setSavingAttendanceId(staffId);
    try {
      const saved = await staffService.saveAttendance({
        staffId,
        date: attendanceDate,
        status: newStatus,
        checkInTime: defaultCheckIn,
        checkOutTime: defaultCheckOut,
        workingHours,
        remarks: existing?.remarks || "",
      });

      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => Number(r.staffId) === Number(staffId));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      const summary = await staffService.getAttendanceSummary(attendanceDate);
      setAttendanceSummary(summary);
      showPopup(`Attendance marked as ${newStatus} for staff`);
    } catch (err: any) {
      showPopup(`Failed to save attendance: ${err.message || "Error"}`);
    } finally {
      setSavingAttendanceId(null);
    }
  };

  const handleSaveRecordExplicit = async (staffId: number) => {
    const record = attendanceRecords.find((r) => Number(r.staffId) === Number(staffId));
    setSavingAttendanceId(staffId);
    try {
      const saved = await staffService.saveAttendance({
        staffId,
        date: attendanceDate,
        status: record?.status || "PRESENT",
        checkInTime: record?.checkInTime || "09:30",
        checkOutTime: record?.checkOutTime || "18:30",
        workingHours: record?.workingHours ?? calculateHours(record?.checkInTime, record?.checkOutTime) ?? 9.0,
        remarks: record?.remarks || "",
      });

      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => Number(r.staffId) === Number(staffId));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });

      const summary = await staffService.getAttendanceSummary(attendanceDate);
      setAttendanceSummary(summary);
      showPopup("Attendance record saved to SQL Server");
    } catch (err: any) {
      showPopup(`Failed to save record: ${err.message || "Error"}`);
    } finally {
      setSavingAttendanceId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!staffList.length) return;
    setAttendanceLoading(true);
    try {
      for (const s of staffList) {
        await staffService.saveAttendance({
          staffId: s.id,
          date: attendanceDate,
          status: "PRESENT",
          checkInTime: "09:30",
          checkOutTime: "18:30",
          workingHours: 9.0,
        });
      }
      await loadAttendance(attendanceDate);
      showPopup(`All ${staffList.length} staff marked as PRESENT for ${attendanceDate}`);
    } catch (err: any) {
      showPopup(`Error marking all present: ${err.message}`);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const filteredAttendanceStaff = staffList.filter((s) => {
    const localizedName = localizeGuestName(s.name);
    const localizedDesig = translateDesignation(s.designation);
    const query = attendanceSearch.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(query) ||
      localizedName.toLowerCase().includes(query) ||
      s.designation.toLowerCase().includes(query) ||
      localizedDesig.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (attendanceStatusFilter === "ALL") return true;

    const record = attendanceRecords.find((r) => Number(r.staffId) === Number(s.id));
    const status = record?.status || "UNMARKED";
    return status.toUpperCase() === attendanceStatusFilter.toUpperCase();
  });

  /* =========================
     ID PROOF INPUT ERROR
  ========================= */

  const [idProofInputError, setIdProofInputError] =
    useState("");

  useEffect(() => {
    const updateCurrentDate = () => {
      setCurrentDate(getTodayDate());
    };

    updateCurrentDate();

    const timer = setInterval(
      updateCurrentDate,
      60000
    );

    return () => clearInterval(timer);
  }, []);

  /* =========================
     STYLES
  ========================= */

  const styles: {
    [key: string]: React.CSSProperties;
  } = {
    page: {
      minHeight: "100vh",
      background: "#fffaf5",
      padding: "4px 0 20px",
      fontFamily: "Arial, sans-serif",
      boxSizing: "border-box",
    },

    header: {
      background: "#ffffff",
      borderRadius: "12px",
      padding: "20px 24px",
      marginBottom: "18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "1px solid #f1dfd2",
    },

    title: {
      margin: 0,
      fontSize: "24px",
      fontWeight: 700,
      color: "#1f2937",
    },

    subtitle: {
      margin: "6px 0 0",
      color: "#6b7280",
      fontSize: "14px",
    },

    addButton: {
      background: "#b94f08",
      color: "#fff",
      border: "none",
      borderRadius: "7px",
      padding: "11px 18px",
      cursor: "pointer",
      fontWeight: 600,
    },

    tabs: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      marginBottom: "18px",
    },

    tab: {
      border: "1px solid #e5d5ca",
      background: "#fff",
      color: "#374151",
      padding: "9px 17px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: 600,
    },

    activeTab: {
      background: "#b94f08",
      color: "#fff",
      borderColor: "#b94f08",
    },

    card: {
      background: "#fff",
      borderRadius: "12px",
      padding: "21px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      marginBottom: "20px",
      border: "1px solid #f1dfd2",
    },

    sectionTitle: {
      margin: "0 0 18px",
      fontSize: "18px",
      color: "#1f2937",
    },

    subsection: {
      margin: "25px 0 15px",
      fontSize: "16px",
      color: "#374151",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "10px",
    },

    grid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
    },

    field: {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
    },

    label: {
      fontSize: "13px",
      fontWeight: 600,
      color: "#374151",
    },

    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      outline: "none",
      fontSize: "14px",
      color: "#1f2937",
      background: "#fff",
    },

    dateInput: {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      paddingRight: "40px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      outline: "none",
      fontSize: "14px",
      cursor: "pointer",
      color: "#1f2937",
      background: "#fff",
    },

    historyFilterRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "16px",
    },

    historyDateInput: {
      width: "180px",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      outline: "none",
      fontSize: "14px",
      cursor: "pointer",
      color: "#1f2937",
      background: "#fff",
    },

    allDatesButton: {
      padding: "10px 14px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      background: "#fff",
      color: "#374151",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 600,
      position: "relative",
      zIndex: 10,
      pointerEvents: "auto",
    },

    select: {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      background: "#fff",
      fontSize: "14px",
      color: "#1f2937",
      outline: "none",
      cursor: "pointer",
    },

    saveButton: {
      marginTop: "22px",
      background: "#b94f08",
      color: "#fff",
      border: "none",
      padding: "11px 22px",
      borderRadius: "7px",
      cursor: "pointer",
      fontWeight: 600,
    },

    search: {
      width: "100%",
      maxWidth: "315px",
      padding: "10px 13px",
      border: "1px solid #d9c8bc",
      borderRadius: "7px",
      marginBottom: "16px",
      boxSizing: "border-box",
      outline: "none",
      color: "#1f2937",
    },

    tableWrapper: {
      width: "100%",
      overflowX: "auto",
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
    },

    historyTable: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "700px",
    },

    th: {
      background: "#fffaf5",
      padding: "10px 8px",
      textAlign: "left",
      fontSize: "13px",
      color: "#9a4210",
      borderBottom: "1px solid #eaded5",
    },

    td: {
      padding: "8px 8px",
      borderBottom: "1px solid #eaded5",
      fontSize: "13px",
      color: "#4b5563",
    },

    actionView: {
      width: "34px",
      height: "30px",
      border: "none",
      background: "#eff6ff",
      color: "#2563eb",
      borderRadius: "6px",
      cursor: "pointer",
      marginRight: "5px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },

    actionEdit: {
      width: "34px",
      height: "30px",
      border: "none",
      background: "#fff7ed",
      color: "#ea580c",
      borderRadius: "6px",
      cursor: "pointer",
      marginRight: "5px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },

    actionDelete: {
      width: "34px",
      height: "30px",
      border: "none",
      background: "#fff1f2",
      color: "#e11d48",
      borderRadius: "6px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },

    badge: {
      display: "inline-block",
      padding: "5px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 600,
    },

    reportGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },

    reportCard: {
      background: "#fff",
      borderRadius: "10px",
      padding: "20px",
      boxShadow: "0 2px 7px rgba(0,0,0,0.07)",
      border: "1px solid #f1dfd2",
    },

    reportLabel: {
      fontSize: "14px",
      color: "#6b7280",
    },

    reportValue: {
      marginTop: "8px",
      fontSize: "25px",
      fontWeight: 700,
      color: "#b94f08",
    },

    historyHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "15px",
      flexWrap: "wrap",
      marginBottom: "15px",
    },

    historyTitle: {
      margin: 0,
      fontSize: "17px",
      color: "#1f2937",
    },

    historyCount: {
      background: "#fff3e8",
      color: "#b94f08",
      padding: "5px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 600,
    },
  };

  /* =========================
     POPUP
  ========================= */

  const showPopup = (message: string) => {
    setPopupMessage(t(message, message));

    setTimeout(() => {
      setPopupMessage("");
    }, 2500);
  };

  /* =========================
     ID PROOF VALIDATION
  ========================= */

  const validateIdProofNumber = (
    idProofType: string,
    idProofNumber: string
  ) => {
    const value = idProofNumber.trim();

    if (!value) {
      return "Please fill the ID proof number.";
    }

    switch (idProofType) {
      case "Aadhar Card":
        if (!/^\d{12}$/.test(value)) {
          return "Aadhar Card must contain exactly 12 digits.";
        }
        break;

      case "PAN Card":
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(value)) {
          return "PAN Card format must be like ABCDE1234F.";
        }
        break;

      case "Driving License":
        if (!/^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(value)) {
          return "Driving License format must be like MH1220241234567.";
        }
        break;

      case "Voter ID":
        if (!/^[A-Z]{3}\d{7}$/.test(value)) {
          return "Voter ID format must be like ABC1234567.";
        }
        break;

      default:
        return "Please select the ID proof type.";
    }

    return "";
  };

  /* =========================
     FORM CHANGE
  ========================= */

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "name") {
      if (!/^[A-Za-z\u0900-\u097F\s.'-]*$/.test(value)) {
        return;
      }

      if (
        value.startsWith(" ") ||
        value.includes("  ")
      ) {
        return;
      }
    }

    if (name === "address") {
      if (!/^[A-Za-z0-9\u0900-\u097F\s,./#&-]*$/.test(value)) {
        return;
      }

      if (
        value.startsWith(" ") ||
        value.includes("  ")
      ) {
        return;
      }
    }

    /* =========================
       ID PROOF TYPE CHANGE
    ========================= */

    if (name === "idProofType") {
      setIdProofInputError("");

      setForm({
        ...form,
        [name]: value,
      });

      return;
    }

    /* =========================
       ID PROOF NUMBER CHANGE
    ========================= */

    if (name === "idProofNumber") {
      let isValidCharacter = true;
      let errorMessage = "";

      if (form.idProofType === "Aadhar Card") {
        if (!/^\d*$/.test(value)) {
          isValidCharacter = false;
          errorMessage =
            "Aadhar Card allows numbers only.";
        }
      } else if (
        form.idProofType === "PAN Card" ||
        form.idProofType === "Driving License" ||
        form.idProofType === "Voter ID"
      ) {
        if (!/^[A-Za-z0-9]*$/.test(value)) {
          isValidCharacter = false;
          errorMessage =
            `${form.idProofType} allows letters and numbers only.`;
        }
      }

      if (!isValidCharacter) {
        setIdProofInputError(errorMessage);
        return;
      }

      setIdProofInputError("");

      const upperCaseValue =
        value.toUpperCase();

      setForm({
        ...form,
        [name]: upperCaseValue,
      });

      return;
    }

    if (name === "phone") {
      const sanitized = sanitizeMobileInput(value);
      setForm({
        ...form,
        phone: sanitized,
      });
      return;
    }

    if (
      name === "grossSalary" ||
      name === "deduction"
    ) {
      if (value === "") {
        setForm({
          ...form,
          [name]: value,
        });
        return;
      }

      if (!/^\d*\.?\d*$/.test(value)) {
        return;
      }
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  /* =========================
     ADD STAFF
  ========================= */

  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      return "Please fill the contact number.";
    }

    if (!isValidMobile(phone)) {
      return "Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.";
    }

    if (/^(\d)\1{9}$/.test(phone)) {
      return "Phone number cannot contain the same digit repeatedly.";
    }

    return "";
  };

  const handleAddStaff = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setSubmitted(true);

    if (!form.name.trim()) {
      return;
    }

    if (!/^[A-Za-z\u0900-\u097F\s.'-]+$/.test(form.name.trim())) {
      showPopup(
        "Staff name should contain only letters."
      );
      return;
    }

    if (!form.phone.trim()) {
      return;
    }

    const phoneError = validatePhoneNumber(form.phone);

    if (phoneError) {
      showPopup(phoneError);
      return;
    }

    if (!form.address.trim()) {
      return;
    }

    if (!/^[A-Za-z0-9\u0900-\u097F\s,./#&-]+$/.test(form.address.trim())) {
      showPopup(
        "Address should contain only letters, numbers and spaces."
      );
      return;
    }

    if (!form.designation.trim()) {
      return;
    }

    if (!form.joiningDate.trim()) {
      return;
    }

    if (!form.idProofType.trim()) {
      return;
    }

    if (!form.idProofNumber.trim()) {
      return;
    }

    const idProofError = validateIdProofNumber(
      form.idProofType,
      form.idProofNumber
    );

    if (idProofError) {
      showPopup(idProofError);
      return;
    }

    if (!form.grossSalary.trim()) {
      return;
    }

    if (
      isNaN(Number(form.grossSalary)) ||
      Number(form.grossSalary) <= 0
    ) {
      showPopup(
        "Gross salary must be greater than 0."
      );
      return;
    }

    if (!form.deduction.trim()) {
      return;
    }

    if (
      isNaN(Number(form.deduction)) ||
      Number(form.deduction) < 0
    ) {
      showPopup(
        "Deduction cannot be negative."
      );
      return;
    }

    const newStaff: Staff = {
      id: Date.now(),
      name: form.name.trim(),
      phone: form.phone,
      address: form.address.trim(),
      designation: form.designation,
      joiningDate: form.joiningDate,
      idProofType: form.idProofType,
      idProofNumber: form.idProofNumber.trim(),
      grossSalary: Number(form.grossSalary),
      salaryFrequency:
        form.salaryFrequency as Staff["salaryFrequency"],
      deduction: Number(form.deduction),
    };

    try {
      const created = await staffService.createStaff({
        branchId: selectedBranchId,
        name: newStaff.name,
        phone: newStaff.phone,
        address: newStaff.address,
        designation: newStaff.designation,
        joiningDate: newStaff.joiningDate,
        idProofType: newStaff.idProofType,
        idProofNumber: newStaff.idProofNumber,
        basicSalary: newStaff.grossSalary,
        salaryFrequency: newStaff.salaryFrequency,
        deduction: newStaff.deduction,
      });

      if (created?.id) {
        newStaff.id = created.id;
      }

      setStaffList((prev) => [
        ...prev,
        newStaff,
      ]);

      setForm({
        name: "",
        phone: "",
        address: "",
        designation: "",
        joiningDate: "",
        idProofType: "",
        idProofNumber: "",
        grossSalary: "",
        salaryFrequency: "Monthly",
        deduction: "",
      });

      setIdProofInputError("");
      setSubmitted(false);
      showPopup("Staff added successfully.");
      setActiveTab("staff");
    } catch (err: any) {
      console.error("Failed to save staff to backend:", err);
      showPopup("Failed to save staff to backend: " + (err?.userFriendlyMessage || err?.response?.data?.message || err.message || "Error"));
    }
  };

  const handleCancelAddStaff = () => {
    setForm({
      name: "",
      phone: "",
      address: "",
      designation: "",
      joiningDate: "",
      idProofType: "",
      idProofNumber: "",
      grossSalary: "",
      salaryFrequency: "Monthly",
      deduction: "",
    });

    setIdProofInputError("");

    setSubmitted(false);
    setActiveTab("staff");
  };

  /* =========================
     EDIT STAFF
  ========================= */

  const openEdit = (staff: Staff) => {
    setEditStaff({
      ...staff,
      name: currentLanguage === "en" ? staff.name : localizeGuestName(staff.name),
      address: currentLanguage === "en" ? staff.address : (t(staff.address?.trim() || "", staff.address) || staff.address),
    });
  };

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    if (!editStaff) return;

    const { name, value } = e.target;

    if (
      name === "name" &&
      !/^[A-Za-z\u0900-\u097F\s.'-]*$/.test(value)
    ) {
      return;
    }

    if (name === "phone") {
      const sanitized = sanitizeMobileInput(value);
      setEditStaff({
        ...editStaff,
        phone: sanitized,
      });
      return;
    }

    if (
      name === "grossSalary" ||
      name === "deduction"
    ) {
      if (value === "") {
        setEditStaff({
          ...editStaff,
          [name]: "" as unknown as number,
        });
        return;
      }

      if (!/^\d*\.?\d*$/.test(value)) {
        return;
      }

      setEditStaff({
        ...editStaff,
        [name]: Number(value),
      });

      return;
    }

    setEditStaff({
      ...editStaff,
      [name]: value,
    });
  };

  const saveEdit = () => {
    if (!editStaff) return;

    if (!editStaff.name.trim()) {
      showPopup("Please enter staff name.");
      return;
    }

    if (
      !/^[A-Za-z\u0900-\u097F\s.'-]+$/.test(
        editStaff.name.trim()
      )
    ) {
      showPopup(
        "Staff name should contain only letters."
      );
      return;
    }

    const editPhoneError = validatePhoneNumber(
      editStaff.phone
    );

    if (editPhoneError) {
      showPopup(editPhoneError);
      return;
    }

    if (
      !Number.isFinite(Number(editStaff.grossSalary)) ||
      Number(editStaff.grossSalary) <= 0
    ) {
      showPopup(
        "Gross salary must be greater than 0."
      );
      return;
    }

    if (
      !Number.isFinite(Number(editStaff.deduction)) ||
      Number(editStaff.deduction) < 0
    ) {
      showPopup(
        "Deduction cannot be negative."
      );
      return;
    }

    setStaffList((prev) =>
      prev.map((staff) =>
        staff.id === editStaff.id
          ? editStaff
          : staff
      )
    );

    setEditStaff(null);

    showPopup(
      "Staff updated successfully."
    );
  };

  /* =========================
     DELETE STAFF
  ========================= */

  const confirmDelete = async () => {
    if (!deleteStaff) return;

    try {
      if (deleteStaff.id && deleteStaff.id < 1000000000) {
        await staffService.deleteStaff(deleteStaff.id);
      }
      setStaffList((prev) =>
        prev.filter(
          (staff) =>
            staff.id !== deleteStaff.id
        )
      );
      setDeleteStaff(null);
      showPopup("Staff deleted successfully.");
    } catch (err: any) {
      console.error("Failed to delete staff:", err);
      showPopup("Failed to delete staff from backend");
    }
  };

  /* =========================
     SEARCH
  ========================= */

  const handleSearch = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (!/^[A-Za-z0-9\u0900-\u097F\s.'-]*$/.test(value)) {
      return;
    }

    if (
      value.startsWith(" ") ||
      value.includes("  ")
    ) {
      return;
    }

    setSearch(value);
  };

  const filteredStaff =
    staffList.filter((staff) => {
      const localizedName = localizeGuestName(staff.name);
      const query = search.toLowerCase();
      return (
        staff.name.toLowerCase().includes(query) ||
        localizedName.toLowerCase().includes(query)
      );
    });

  /* =========================
     NET SALARY
  ========================= */

  const getNetSalary = (
    staff: Staff
  ) => {
    return (
      staff.grossSalary -
      staff.deduction
    );
  };

  const totalStaff = staffList.length;

  /* =========================
     UI
  ========================= */

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            👨‍💼 {t('staffManagement', 'Staff Management')}
          </h1>

          <p style={styles.subtitle}>
            {t('manageStaffSubtitle', 'Manage staff profiles, designations, and salary records')}
          </p>
        </div>

        <button
          style={styles.addButton}
          onClick={() =>
            setActiveTab("add")
          }
        >
          + {t('addStaff', 'Add Staff')}
        </button>
      </div>

      {/* TABS */}

      <div style={styles.tabs}>

        <button
          style={{
            ...styles.tab,
            ...(activeTab === "staff"
              ? styles.activeTab
              : {}),
          }}
          onClick={() =>
            setActiveTab("staff")
          }
        >
          👤 {t('staffProfile', 'Staff Profile')}
        </button>

        <button
          style={{
            ...styles.tab,
            ...((activeTab === "attendance" || (activeTab === "monthlyReport" && attendanceSubTab === "daily"))
              ? styles.activeTab
              : {}),
          }}
          onClick={() => {
            setActiveTab("monthlyReport");
            setAttendanceSubTab("daily");
          }}
        >
          📅 {t('dailyAttendance', 'Daily Attendance')}
        </button>

        <button
          style={{
            ...styles.tab,
            ...(activeTab === "monthlyReport" && attendanceSubTab === "summary"
              ? styles.activeTab
              : {}),
          }}
          onClick={() => {
            setActiveTab("monthlyReport");
            setAttendanceSubTab("summary");
          }}
        >
          📊 {t('monthlyAttendanceReport', 'Monthly Attendance Report')}
        </button>

      </div>

      {/* =========================
          ADD STAFF
      ========================= */}

      {activeTab === "add" && (
        <form
          style={styles.card}
          onSubmit={handleAddStaff}
          noValidate
        >

          <h2 style={styles.sectionTitle}>
            👤 {t('addStaff', 'Add Staff')}
          </h2>

          <div style={styles.grid}>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('staffName', 'Staff Name')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                style={{
                  ...styles.input,
                }}
                name="name"
                value={form.name}
                onChange={
                  handleFormChange
                }
                onBlur={() =>
                  setForm({
                    ...form,
                    name: form.name.trim(),
                  })
                }
                placeholder={t('enterStaffName', 'Enter staff name')}
              />

              {submitted && !form.name.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillStaffName', 'Please fill the staff name.')}
                </span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('phoneNumber', 'Phone Number')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                style={styles.input}
                name="phone"
                value={form.phone}
                onChange={
                  handleFormChange
                }
                placeholder={t('enterPhoneNumber', 'Enter 10 digit number')}
                maxLength={10}
                inputMode="numeric"
              />

              {submitted && !form.phone.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillContactNumber', 'Please fill the contact number.')}
                </span>
              )}

              {submitted &&
                form.phone.trim() &&
                validatePhoneNumber(form.phone) && (
                  <span
                    style={{
                      color: "red",
                      fontSize: "12px",
                    }}
                  >
                    {validatePhoneNumber(
                      form.phone
                    )}
                  </span>
                )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('address', 'Address')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                style={{
                  ...styles.input,
                }}
                name="address"
                value={form.address}
                onChange={
                  handleFormChange
                }
                onBlur={() =>
                  setForm({
                    ...form,
                    address: form.address.trim(),
                  })
                }
                placeholder={t('enterAddress', 'Enter address')}
              />

              {submitted && !form.address.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillAddress', 'Please fill the address.')}
                </span>
              )}
            </div>

          </div>

          <h3 style={styles.subsection}>
            💼 {t('jobDetails', 'Job Details')}
          </h3>

          <div style={styles.grid}>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('designation', 'Designation')} <span style={{ color: "red" }}>*</span>
              </label>

              <select
                style={{
                  ...styles.select,
                }}
                name="designation"
                value={
                  form.designation
                }
                onChange={
                  handleFormChange
                }
              >
                <option value="">
                  {t('selectDesignation', 'Select Designation')}
                </option>

                <option value="Manager">
                  {translateDesignation("Manager")}
                </option>

                <option value="Receptionist">
                  {translateDesignation("Receptionist")}
                </option>

                <option value="Waiter">
                  {translateDesignation("Waiter")}
                </option>

                <option value="Chef">
                  {translateDesignation("Chef")}
                </option>

                <option value="Helper">
                  {translateDesignation("Helper")}
                </option>

                <option value="Cleaner">
                  {translateDesignation("Cleaner")}
                </option>

                <option value="Security">
                  {translateDesignation("Security")}
                </option>
              </select>

              {submitted && !form.designation.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseSelectDesignation', 'Please select the designation.')}
                </span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('joiningDate', 'Joining Date')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                type="date"
                style={{
                  ...styles.dateInput,
                }}
                name="joiningDate"
                value={
                  form.joiningDate
                }
                max={currentDate}
                onChange={
                  handleFormChange
                }
              />

              {submitted && !form.joiningDate.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillJoiningDate', 'Please fill the joining date.')}
                </span>
              )}
            </div>

          </div>

          <h3 style={styles.subsection}>
            🪪 {t('idProof', 'ID Proof')}
          </h3>

          <div style={styles.grid}>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('idProofType', 'ID Proof Type')} <span style={{ color: "red" }}>*</span>
              </label>

              <select
                style={{
                  ...styles.select,
                }}
                name="idProofType"
                value={
                  form.idProofType
                }
                onChange={
                  handleFormChange
                }
              >
                <option value="">
                  {t('selectIdProof', 'Select ID Proof')}
                </option>

                <option value="Aadhar Card">
                  {translateIdProof("Aadhar Card")}
                </option>

                <option value="PAN Card">
                  {translateIdProof("PAN Card")}
                </option>

                <option value="Driving License">
                  {translateIdProof("Driving License")}
                </option>

                <option value="Voter ID">
                  {translateIdProof("Voter ID")}
                </option>
              </select>

              {submitted && !form.idProofType.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseSelectIdProofType', 'Please select the ID proof type.')}
                </span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('idProofNumber', 'ID Proof Number')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                style={{
                  ...styles.input,
                }}
                name="idProofNumber"
                value={
                  form.idProofNumber
                }
                onChange={
                  handleFormChange
                }
                onBlur={() =>
                  setForm({
                    ...form,
                    idProofNumber:
                      form.idProofNumber.trim(),
                  })
                }
                placeholder={
                  form.idProofType === "Aadhar Card"
                    ? "Enter 12 digit Aadhar number"
                    : form.idProofType === "PAN Card"
                      ? "Enter PAN like ABCDE1234F"
                      : form.idProofType === "Driving License"
                        ? "Enter DL like MH1220241234567"
                        : form.idProofType === "Voter ID"
                          ? "Enter Voter ID like ABC1234567"
                          : "Enter ID proof number"
                }
                maxLength={
                  form.idProofType === "Aadhar Card"
                    ? 12
                    : form.idProofType === "PAN Card"
                      ? 10
                      : form.idProofType === "Driving License"
                        ? 15
                        : form.idProofType === "Voter ID"
                          ? 10
                          : 50
                }
              />

              {idProofInputError && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {idProofInputError}
                </span>
              )}

              {submitted && !form.idProofNumber.trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillIdProofNumber', 'Please fill the ID proof number.')}
                </span>
              )}

              {submitted &&
                form.idProofNumber.trim() &&
                form.idProofType.trim() &&
                validateIdProofNumber(
                  form.idProofType,
                  form.idProofNumber
                ) && (
                  <span
                    style={{
                      color: "red",
                      fontSize: "12px",
                    }}
                  >
                    {validateIdProofNumber(
                      form.idProofType,
                      form.idProofNumber
                    )}
                  </span>
                )}
            </div>

          </div>

          <h3 style={styles.subsection}>
            💰 {t('salaryDetails', 'Salary Details')}
          </h3>

          <div style={styles.grid}>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('grossSalary', 'Gross Salary')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                type="number"
                step="any"
                style={{
                  ...styles.input,
                }}
                name="grossSalary"
                value={
                  form.grossSalary
                }
                onChange={
                  handleFormChange
                }
                placeholder={t('enterGrossSalary', 'Enter gross salary')}
                min="0"
              />

              {submitted && !String(form.grossSalary).trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillGrossSalary', 'Please fill the gross salary.')}
                </span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('salaryFrequency', 'Salary Frequency')}
              </label>

              <select
                style={styles.select}
                name="salaryFrequency"
                value={form.salaryFrequency}
                onChange={handleFormChange}
              >
                <option value="Daily">{translateSalaryFrequency("Daily")}</option>
                <option value="Weekly">{translateSalaryFrequency("Weekly")}</option>
                <option value="Bi-Weekly">{translateSalaryFrequency("Bi-Weekly")}</option>
                <option value="Monthly">{translateSalaryFrequency("Monthly")}</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {t('deduction', 'Deduction')} <span style={{ color: "red" }}>*</span>
              </label>

              <input
                type="number"
                step="any"
                style={{
                  ...styles.input,
                }}
                name="deduction"
                value={
                  form.deduction
                }
                onChange={
                  handleFormChange
                }
                placeholder={t('enterDeduction', 'Enter deduction')}
                min="0"
              />

              {submitted && !String(form.deduction).trim() && (
                <span
                  style={{
                    color: "red",
                    fontSize: "12px",
                  }}
                >
                  {t('pleaseFillDeduction', 'Please fill the deduction.')}
                </span>
              )}
            </div>

          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            <button
              type="submit"
              style={{
                ...styles.saveButton,
                marginTop: 0,
              }}
            >
              {t('saveStaff', 'Save Staff')}
            </button>

            <button
              type="button"
              style={{
                ...styles.saveButton,
                background: "#6b7280",
                marginTop: 0,
              }}
              onClick={handleCancelAddStaff}
            >
              {t('cancel', 'Cancel')}
            </button>
          </div>

        </form>
      )}

      {/* =========================
          STAFF PROFILE
      ========================= */}

      {(activeTab === "staff" || activeTab === "add") && (
        <div style={styles.card}>

          <h2 style={styles.sectionTitle}>
            👤 {t('staffProfile', 'Staff Profile')}
          </h2>

          <input
            style={styles.search}
            placeholder={`🔍 ${t('searchStaffByName', 'Search staff by name...')}`}
            value={search}
            onChange={handleSearch}
            onBlur={() =>
              setSearch(search.trim())
            }
          />

          <div style={styles.tableWrapper}>

            <table style={styles.table}>

              <thead>
                <tr>
                  <th style={styles.th}>
                    {t('staffName', 'Staff Name')}
                  </th>

                  <th style={styles.th}>
                    {t('phone', 'Phone')}
                  </th>

                  <th style={styles.th}>
                    {t('designation', 'Designation')}
                  </th>

                  <th style={styles.th}>
                    {t('joiningDate', 'Joining Date')}
                  </th>

                  <th style={styles.th}>
                    {t('netSalary', 'Net Salary')}
                  </th>

                  <th style={styles.th}>
                    {t('actions', 'Actions')}
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredStaff.map(
                  (staff) => (
                    <tr key={staff.id}>

                      <td style={styles.td}>
                        <strong>
                          {localizeGuestName(staff.name)}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {toDevanagari(staff.phone)}
                      </td>

                      <td style={styles.td}>
                        {translateDesignation(staff.designation)}
                      </td>

                      <td style={styles.td}>
                        {staff.joiningDate
                          ? formatDate(staff.joiningDate, { showDayOfWeek: false })
                          : "-"}
                      </td>

                      <td style={styles.td}>
                        {formatNumber(getNetSalary(staff), { asCurrency: true, decimals: 0 })}
                      </td>

                      <td style={styles.td}>

                        <button
                          type="button"
                          title="View"
                          style={
                            styles.actionView
                          }
                          onClick={() =>
                            setSelectedStaff(
                              staff
                            )
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />

                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          style={
                            styles.actionEdit
                          }
                          onClick={() =>
                            openEdit(staff)
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          title="Delete"
                          style={
                            styles.actionDelete
                          }
                          onClick={() =>
                            setDeleteStaff(
                              staff
                            )
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>

                      </td>

                    </tr>
                  )
                )}

                {filteredStaff.length ===
                  0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          ...styles.td,
                          textAlign:
                            "center",
                          padding:
                            "25px",
                        }}
                      >
                        {t('noStaffFound', 'No staff found.')}
                      </td>
                    </tr>
                  )}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* ========================================================
          UNIFIED ATTENDANCE MODULE (MONTHLY REPORT & DAILY VIEW)
      ======================================================== */}
      {(activeTab === "monthlyReport" || activeTab === "attendance") && (
        <div style={styles.card}>
          {/* 1. Dual Sub-Tabs: Monthly Summary vs Daily View */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              paddingBottom: "14px",
              borderBottom: "2px solid #FED7AA",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAttendanceSubTab("summary");
                setActiveTab("monthlyReport");
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: attendanceSubTab === "summary" ? "#EA580C" : "#F3F4F6",
                color: attendanceSubTab === "summary" ? "#FFFFFF" : "#4B5563",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
                boxShadow: attendanceSubTab === "summary" ? "0 2px 6px rgba(234,88,12,0.3)" : "none",
              }}
            >
              <BarChart3 size={16} />
              {t('monthlySummaryTab', 'Monthly Summary')}
            </button>

            <button
              type="button"
              onClick={() => setAttendanceSubTab("daily")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: attendanceSubTab === "daily" ? "#EA580C" : "#F3F4F6",
                color: attendanceSubTab === "daily" ? "#FFFFFF" : "#4B5563",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
                boxShadow: attendanceSubTab === "daily" ? "0 2px 6px rgba(234,88,12,0.3)" : "none",
              }}
            >
              <Calendar size={16} />
              {t('dailyViewTab', 'Daily View')}
            </button>
          </div>

          {/* ========================================================
              TAB A: MONTHLY SUMMARY VIEW
          ======================================================== */}
          {attendanceSubTab === "summary" && (
            <div>
              {/* Header: Title, Subtitle & Month/Year Navigator */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ ...styles.sectionTitle, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "#1F2937" }}>
                    <span>📊</span>
                    <span>{t('monthlyAttendance', 'Monthly Attendance')}</span>
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>
                    {t('monthlyAttendanceDescShort', 'Track staff attendance and payable days at a glance.')}
                  </p>
                </div>

                {/* Month Navigator Controls */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#FFF8F2",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: "1px solid #FED7AA",
                  }}
                >
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#C2410C",
                    }}
                    title={t('prevMonth', 'Previous Month')}
                  >
                    ◀ {t('prev', 'Prev')}
                  </button>

                  <select
                    value={Number(selectedMonth.split('-')[1])}
                    onChange={(e) => handleMonthNumChange(Number(e.target.value))}
                    style={{
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1F2937",
                      background: "#FFFFFF",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {[
                      { num: 1, nameEn: "Jan", nameMr: "जानेवारी" },
                      { num: 2, nameEn: "Feb", nameMr: "फेब्रुवारी" },
                      { num: 3, nameEn: "Mar", nameMr: "मार्च" },
                      { num: 4, nameEn: "Apr", nameMr: "एप्रिल" },
                      { num: 5, nameEn: "May", nameMr: "मे" },
                      { num: 6, nameEn: "Jun", nameMr: "जून" },
                      { num: 7, nameEn: "Jul", nameMr: "जुलै" },
                      { num: 8, nameEn: "Aug", nameMr: "ऑगस्ट" },
                      { num: 9, nameEn: "Sep", nameMr: "सप्टेंबर" },
                      { num: 10, nameEn: "Oct", nameMr: "ऑक्टोबर" },
                      { num: 11, nameEn: "Nov", nameMr: "नोव्हेंबर" },
                      { num: 12, nameEn: "Dec", nameMr: "डिसेंबर" },
                    ].map((m) => (
                      <option key={m.num} value={m.num}>
                        {currentLanguage === 'mr' ? m.nameMr : m.nameEn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={Number(selectedMonth.split('-')[0])}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    style={{
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1F2937",
                      background: "#FFFFFF",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {toDevanagari(y)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#C2410C",
                    }}
                    title={t('nextMonth', 'Next Month')}
                  >
                    {t('next', 'Next')} ▶
                  </button>

                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    style={{
                      background: "#C2410C",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {t('thisMonth', 'This Month')}
                  </button>
                </div>
              </div>

              {/* 6 Summary Cards */}
              {(() => {
                const summary = getOverallMonthlySummary();
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "12px",
                      marginBottom: "20px",
                    }}
                  >
                    {/* 1. Total Staff */}
                    <div
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                          {t('totalStaff', 'Total Staff')}
                        </span>
                        <Users size={16} color="#64748B" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
                        {toDevanagari(summary.totalStaff)}
                      </div>
                    </div>

                    {/* 2. Present Days */}
                    <div
                      style={{
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                          {t('presentDays', 'Present Days')}
                        </span>
                        <CheckCircle2 size={16} color="#16A34A" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#16A34A", marginTop: "4px" }}>
                        {toDevanagari(summary.totalPresent)}
                      </div>
                    </div>

                    {/* 3. Half Days */}
                    <div
                      style={{
                        background: "#FFFBEB",
                        border: "1px solid #FDE68A",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                          {t('halfDays', 'Half Days')}
                        </span>
                        <Clock size={16} color="#D97706" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#D97706", marginTop: "4px" }}>
                        {toDevanagari(summary.totalHalfDay)}
                      </div>
                    </div>

                    {/* 4. Absent Days */}
                    <div
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>
                          {t('absentDays', 'Absent Days')}
                        </span>
                        <XCircle size={16} color="#DC2626" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#DC2626", marginTop: "4px" }}>
                        {toDevanagari(summary.totalAbsent)}
                      </div>
                    </div>

                    {/* 5. On Leave */}
                    <div
                      style={{
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E40AF", textTransform: "uppercase" }}>
                          {t('onLeave', 'On Leave')}
                        </span>
                        <AlertCircle size={16} color="#2563EB" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#2563EB", marginTop: "4px" }}>
                        {toDevanagari(summary.totalLeave)}
                      </div>
                    </div>

                    {/* 6. Average Attendance % */}
                    <div
                      style={{
                        background: "#F5F3FF",
                        border: "1px solid #DDD6FE",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#5B21B6", textTransform: "uppercase" }}>
                          {t('avgAttendanceRate', 'Average Attendance %')}
                        </span>
                        <BarChart3 size={16} color="#7C3AED" />
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#7C3AED", marginTop: "4px" }}>
                        {toDevanagari(summary.avgRate)}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filter Toolbar: Search, Role Select, CSV & Print */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                  background: "#FFFBF7",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #FED7AA",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
                  <div style={{ position: "relative", minWidth: "240px", flex: 1, maxWidth: "340px" }}>
                    <Search
                      size={15}
                      color="#9CA3AF"
                      style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                      style={{
                        ...styles.search,
                        margin: 0,
                        paddingLeft: "32px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                      placeholder={t('searchStaffPlaceholder', 'Search staff by name or role...')}
                      value={monthlySearchQuery}
                      onChange={(e) => {
                        setMonthlySearchQuery(e.target.value);
                        setMonthlyCurrentPage(1);
                      }}
                    />
                  </div>

                  <select
                    value={monthlyRoleFilter}
                    onChange={(e) => {
                      setMonthlyRoleFilter(e.target.value);
                      setMonthlyCurrentPage(1);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #D9C8BC",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#374151",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="ALL">{t('allDesignations', 'All Designations')}</option>
                    {Array.from(new Set(staffList.map((s) => s.designation).filter(Boolean))).map((des) => (
                      <option key={des} value={des}>
                        {translateDesignation(des)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CSV & Print Buttons */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleExportMonthlyCsv}
                    style={{
                      background: "#15803D",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "7px",
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    title={t('exportCsv', 'Export Filtered Attendance Records to CSV')}
                  >
                    <Download size={14} />
                    {t('exportCsv', 'Export CSV')}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintMonthlyReport}
                    style={{
                      background: "#1E293B",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "7px",
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    title={t('printReport', 'Print Clean A4 Attendance Report')}
                  >
                    <Printer size={14} />
                    {t('printReport', 'Print Report')}
                  </button>
                </div>
              </div>

              {/* 10-Column Simplified Table */}
              {(() => {
                const filteredStaff = getFilteredMonthlyStaff();
                const totalPages = Math.max(1, Math.ceil(filteredStaff.length / monthlyPageSize));
                const paginatedStaff = filteredStaff.slice(
                  (monthlyCurrentPage - 1) * monthlyPageSize,
                  monthlyCurrentPage * monthlyPageSize
                );

                return (
                  <div>
                    <div style={{ ...styles.tableWrapper, border: "1px solid #E5E7EB", borderRadius: "10px" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={{ background: "#FFF8F2", borderBottom: "2px solid #FED7AA" }}>
                            <th style={styles.th}>{t('staffMember', 'Staff Member')}</th>
                            <th style={styles.th}>{t('designation', 'Designation')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('presentShort', 'Present')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('halfDayShort', 'Half Day')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('absentShort', 'Absent')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('leaveShort', 'On Leave')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('payableDays', 'Payable Days')}</th>
                            <th style={{ ...styles.th, textAlign: "center", minWidth: "130px" }}>{t('attendanceRate', 'Attendance %')}</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>{t('estimatedSalary', 'Estimated Salary')}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t('details', 'Details')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStaff.map((staff) => {
                            const stats = getStaffMonthlyStats(staff.id);

                            return (
                              <tr key={staff.id} style={{ borderBottom: "1px solid #F1F5F9", background: "#FFFFFF" }}>
                                {/* 1. Staff Member (Initials, Name, Phone) */}
                                <td style={styles.td}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background: "#FFE8D6",
                                        color: "#C2410C",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: "13px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {localizeGuestName(staff.name)
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 700, color: "#1F2937", fontSize: "13px" }}>
                                        {localizeGuestName(staff.name)}
                                      </div>
                                      <div style={{ fontSize: "11px", color: "#6B7280" }}>
                                        📱 {toDevanagari(staff.phone)}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Designation */}
                                <td style={styles.td}>
                                  <span
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      background: "#F3F4F6",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: "#374151",
                                    }}
                                  >
                                    {translateDesignation(staff.designation)}
                                  </span>
                                </td>

                                {/* 3. Present Count */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      background: "#DCFCE7",
                                      color: "#166534",
                                      fontWeight: 800,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {toDevanagari(stats.presentCount)}
                                  </span>
                                </td>

                                {/* 4. Half Day Count */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      background: "#FEF3C7",
                                      color: "#92400E",
                                      fontWeight: 800,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {toDevanagari(stats.halfDayCount)}
                                  </span>
                                </td>

                                {/* 5. Absent Count */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      background: "#FEE2E2",
                                      color: "#991B1B",
                                      fontWeight: 800,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {toDevanagari(stats.absentCount)}
                                  </span>
                                </td>

                                {/* 6. On Leave Count */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      background: "#DBEAFE",
                                      color: "#1E40AF",
                                      fontWeight: 800,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {toDevanagari(stats.leaveCount)}
                                  </span>
                                </td>

                                {/* 7. Payable Days */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "13px" }}>
                                    {toDevanagari(stats.effectivePayableDays)}
                                  </span>
                                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                                    /{toDevanagari(stats.daysInMonth)}
                                  </span>
                                </td>

                                {/* 8. Attendance % with Progress Bar */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 800,
                                        color: stats.attendanceRate >= 80 ? "#16A34A" : stats.attendanceRate >= 60 ? "#D97706" : "#DC2626",
                                      }}
                                    >
                                      {toDevanagari(stats.attendanceRate)}%
                                    </span>
                                    <div
                                      style={{
                                        width: "80px",
                                        height: "6px",
                                        background: "#E5E7EB",
                                        borderRadius: "3px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${stats.attendanceRate}%`,
                                          height: "100%",
                                          background: stats.attendanceRate >= 80 ? "#16A34A" : stats.attendanceRate >= 60 ? "#D97706" : "#DC2626",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* 9. Estimated Salary */}
                                <td style={{ ...styles.td, textAlign: "right" }}>
                                  <span style={{ fontWeight: 800, color: "#15803D", fontSize: "13px" }}>
                                    ₹{toDevanagari(stats.estimatedPay.toLocaleString())}
                                  </span>
                                </td>

                                {/* 10. Single View Button */}
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => setViewingStaffMonthDetail(staff)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "6px",
                                      border: "1px solid #EA580C",
                                      background: "#FFF7ED",
                                      color: "#C2410C",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      transition: "all 0.15s ease",
                                    }}
                                    title={t('viewDetailsTooltip', 'View employee attendance details')}
                                  >
                                    <Eye size={13} />
                                    {t('view', 'View')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {filteredStaff.length === 0 && (
                            <tr>
                              <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                  <UserX size={36} color="#9CA3AF" />
                                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#4B5563" }}>
                                    {t('noStaffFound', 'No staff attendance records found')}
                                  </div>
                                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                                    {monthlySearchQuery || monthlyRoleFilter !== "ALL"
                                      ? t('tryAdjustingFilters', 'Try adjusting your search query or designation filter.')
                                      : t('noStaffRegistered', 'No staff members have been added to this hotel branch yet.')}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "16px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>
                        {filteredStaff.length === 0
                          ? t('showingZeroStaff', 'Showing 0 staff members')
                          : `Showing ${(monthlyCurrentPage - 1) * monthlyPageSize + 1} to ${Math.min(
                            monthlyCurrentPage * monthlyPageSize,
                            filteredStaff.length
                          )} of ${filteredStaff.length} staff members`}
                      </div>

                      {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            disabled={monthlyCurrentPage === 1}
                            onClick={() => setMonthlyCurrentPage((p) => Math.max(1, p - 1))}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "1px solid #D1D5DB",
                              background: monthlyCurrentPage === 1 ? "#F3F4F6" : "#FFFFFF",
                              color: monthlyCurrentPage === 1 ? "#9CA3AF" : "#374151",
                              cursor: monthlyCurrentPage === 1 ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            ◀ {t('prev', 'Prev')}
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              type="button"
                              onClick={() => setMonthlyCurrentPage(pg)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                border: pg === monthlyCurrentPage ? "1px solid #EA580C" : "1px solid #D1D5DB",
                                background: pg === monthlyCurrentPage ? "#EA580C" : "#FFFFFF",
                                color: pg === monthlyCurrentPage ? "#FFFFFF" : "#374151",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: pg === monthlyCurrentPage ? 800 : 600,
                              }}
                            >
                              {toDevanagari(pg)}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={monthlyCurrentPage === totalPages}
                            onClick={() => setMonthlyCurrentPage((p) => Math.min(totalPages, p + 1))}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "1px solid #D1D5DB",
                              background: monthlyCurrentPage === totalPages ? "#F3F4F6" : "#FFFFFF",
                              color: monthlyCurrentPage === totalPages ? "#9CA3AF" : "#374151",
                              cursor: monthlyCurrentPage === totalPages ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {t('next', 'Next')} ▶
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Collapsible Daily Details Section */}
              <div
                style={{
                  marginTop: "24px",
                  background: "#FFFFFF",
                  border: "1px solid #FED7AA",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setIsDailyDetailsOpen((prev) => !prev)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    background: isDailyDetailsOpen ? "#FFF8F2" : "#FFFFFF",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: isDailyDetailsOpen ? "1px solid #FED7AA" : "none",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "#FFEDD5",
                        color: "#EA580C",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1F2937" }}>
                        {t('dailyDetailsTitle', 'Daily Details (दिवसानिहाय तपशील)')}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>
                        {t('dailyDetailsSubtitle', 'Chronological day-wise attendance logs, in/out times, and working hours for the selected month')}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: isDailyDetailsOpen ? "#EA580C" : "#F3F4F6",
                      color: isDailyDetailsOpen ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {isDailyDetailsOpen ? t('collapse', 'Collapse ▲') : t('expand', 'Expand ▼')}
                  </span>
                </div>

                {isDailyDetailsOpen && (
                  <div style={{ padding: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "16px",
                        background: "#FFFBF7",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid #FED7AA",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>
                          👤 {t('selectStaffMember', 'Select Staff Member')}:
                        </label>
                        <select
                          value={selectedDailyDetailsStaffId ?? (staffList[0]?.id || "")}
                          onChange={(e) => setSelectedDailyDetailsStaffId(Number(e.target.value))}
                          style={{
                            padding: "7px 12px",
                            borderRadius: "7px",
                            border: "1px solid #FDBA74",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#1F2937",
                            background: "#FFFFFF",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {localizeGuestName(s.name)} ({translateDesignation(s.designation)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const targetId = selectedDailyDetailsStaffId ?? staffList[0]?.id;
                        if (!targetId) return null;
                        const stats = getStaffMonthlyStats(targetId);
                        return (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#DCFCE7", color: "#166534", fontWeight: 700 }}>
                              P: {toDevanagari(stats.presentCount)}
                            </span>
                            <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>
                              HD: {toDevanagari(stats.halfDayCount)}
                            </span>
                            <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#FEE2E2", color: "#991B1B", fontWeight: 700 }}>
                              A: {toDevanagari(stats.absentCount)}
                            </span>
                            <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#DBEAFE", color: "#1E40AF", fontWeight: 700 }}>
                              L: {toDevanagari(stats.leaveCount)}
                            </span>
                            <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#F5F3FF", color: "#6D28D9", fontWeight: 800 }}>
                              Payable: {toDevanagari(stats.effectivePayableDays)}/{toDevanagari(stats.daysInMonth)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {(() => {
                      const targetId = selectedDailyDetailsStaffId ?? staffList[0]?.id;
                      if (!targetId) {
                        return <div style={{ textAlign: "center", color: "#9CA3AF", padding: "20px" }}>No staff selected.</div>;
                      }
                      const daysInMonth = getDaysInMonth(selectedMonth);

                      return (
                        <div style={{ ...styles.tableWrapper, maxHeight: "420px", overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#FFF8F2", position: "sticky", top: 0, zIndex: 1, borderBottom: "2px solid #FED7AA" }}>
                                <th style={{ padding: "10px 12px", textAlign: "left", color: "#9A4210", fontWeight: 700 }}>{t('date', 'Date')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", color: "#9A4210", fontWeight: 700 }}>{t('day', 'Day')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", color: "#9A4210", fontWeight: 700 }}>{t('status', 'Status')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", color: "#9A4210", fontWeight: 700 }}>{t('checkInTime', 'In Time')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", color: "#9A4210", fontWeight: 700 }}>{t('checkOutTime', 'Out Time')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "center", color: "#9A4210", fontWeight: 700 }}>{t('hours', 'Working Hours')}</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", color: "#9A4210", fontWeight: 700 }}>{t('remarks', 'Notes / Remarks')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                const dayData = getStaffDayAttendance(targetId, d);
                                const dayInfo = getDayOfWeekInfo(d, selectedMonth);
                                const st = dayData.status || "UNMARKED";
                                const dateFormatted = `${String(d).padStart(2, '0')}/${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;

                                return (
                                  <tr
                                    key={d}
                                    style={{
                                      borderBottom: "1px solid #F1F5F9",
                                      background: dayInfo.isSunday ? "#FFFBEB" : d % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                                    }}
                                  >
                                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1F2937" }}>
                                      {dateFormatted}
                                    </td>
                                    <td style={{ padding: "8px 12px", color: dayInfo.isSunday ? "#B45309" : "#4B5563", fontWeight: dayInfo.isSunday ? 800 : 500 }}>
                                      {dayInfo.fullLabel} {dayInfo.isSunday && "⭐"}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                      <span
                                        style={{
                                          padding: "3px 10px",
                                          borderRadius: "12px",
                                          fontSize: "11px",
                                          fontWeight: 800,
                                          background:
                                            st === "PRESENT" ? "#DCFCE7" :
                                              st === "HALF_DAY" ? "#FEF3C7" :
                                                st === "ABSENT" ? "#FEE2E2" :
                                                  st === "LEAVE" ? "#DBEAFE" : "#F1F5F9",
                                          color:
                                            st === "PRESENT" ? "#166534" :
                                              st === "HALF_DAY" ? "#92400E" :
                                                st === "ABSENT" ? "#991B1B" :
                                                  st === "LEAVE" ? "#1E40AF" : "#64748B",
                                        }}
                                      >
                                        {st === "PRESENT" && "● " + t('present', 'Present')}
                                        {st === "HALF_DAY" && "◐ " + t('halfDay', 'Half Day')}
                                        {st === "ABSENT" && "✕ " + t('absent', 'Absent')}
                                        {st === "LEAVE" && "✈ " + t('leave', 'Leave')}
                                        {st === "UNMARKED" && "○ " + t('unmarked', 'Not Marked')}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#374151", fontWeight: 600 }}>
                                      {dayData.inTime || "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center", color: "#374151", fontWeight: 600 }}>
                                      {dayData.outTime || "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#1F2937" }}>
                                      {dayData.workingHours != null ? `${toDevanagari(dayData.workingHours)} hrs` : "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", color: "#6B7280" }}>
                                      {dayData.remarks || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB B: DAILY VIEW
          ======================================================== */}
          {attendanceSubTab === "daily" && (
            <div>
              {/* Daily View Controls */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ ...styles.sectionTitle, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📅</span>
                    <span>{t('dailyStaffAttendance', 'Daily Staff Attendance')}</span>
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>
                    {t('dailyAttendanceDesc', 'Mark and review daily check-in, check-out, and attendance status')}
                  </p>
                </div>

                {/* Date Navigator Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#FFF8F2",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    border: "1px solid #FED7AA",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(attendanceDate);
                      d.setDate(d.getDate() - 1);
                      setAttendanceDate(d.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#C2410C",
                    }}
                    title={t('prev', 'Prev')}
                  >
                    ◀ {t('prev', 'Prev')}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={16} color="#C2410C" />
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      style={{
                        border: "1px solid #FDBA74",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1F2937",
                        background: "#FFFFFF",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(attendanceDate);
                      d.setDate(d.getDate() + 1);
                      setAttendanceDate(d.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #FDBA74",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#C2410C",
                    }}
                    title={t('next', 'Next')}
                  >
                    {t('next', 'Next')} ▶
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceDate(getTodayDate())}
                    style={{
                      background: "#C2410C",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {t('today', 'Today')}
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    style={{
                      background: "#15803D",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    title={t('markAllPresent', 'Mark All Present')}
                  >
                    <CheckCircle2 size={14} />
                    {t('markAllPresent', 'Mark All Present')}
                  </button>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ position: "relative", minWidth: "240px", flex: 1, maxWidth: "340px" }}>
                  <Search
                    size={15}
                    color="#9CA3AF"
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    style={{
                      ...styles.search,
                      margin: 0,
                      paddingLeft: "32px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    placeholder={t('searchStaffPlaceholder', 'Search staff by name or role...')}
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["ALL", "PRESENT", "HALF_DAY", "ABSENT", "LEAVE", "UNMARKED"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttendanceStatusFilter(st)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: attendanceStatusFilter === st ? 700 : 500,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: attendanceStatusFilter === st ? "#EA580C" : "#E5E7EB",
                        background: attendanceStatusFilter === st ? "#EA580C" : "#FFFFFF",
                        color: attendanceStatusFilter === st ? "#FFFFFF" : "#4B5563",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {st === "ALL" ? t('allStatus', 'All Status') : translateStatus(st) || st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Attendance Table */}
              <div style={{ ...styles.tableWrapper, border: "1px solid #E5E7EB", borderRadius: "10px" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: "#FFF8F2", borderBottom: "2px solid #FED7AA" }}>
                      <th style={styles.th}>{t('staffMember', 'Staff Member')}</th>
                      <th style={styles.th}>{t('designation', 'Designation')}</th>
                      <th style={styles.th}>{t('checkInTime', 'Check-In Time')}</th>
                      <th style={styles.th}>{t('checkOutTime', 'Check-Out Time')}</th>
                      <th style={styles.th}>{t('hours', 'Hours')}</th>
                      <th style={styles.th}>{t('status', 'Status')}</th>
                      <th style={{ ...styles.th, textAlign: "center" }}>{t('quickAction', 'Quick Action')}</th>
                      <th style={styles.th}>{t('remarks', 'Remarks')}</th>
                      <th style={{ ...styles.th, textAlign: "center" }}>{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendanceStaff.map((staff) => {
                      const record = attendanceRecords.find((r) => Number(r.staffId) === Number(staff.id));
                      const currentStatus = record?.status || "UNMARKED";
                      const inTime = record?.checkInTime || "";
                      const outTime = record?.checkOutTime || "";
                      const hours = record?.workingHours ?? calculateHours(inTime, outTime);
                      const remarks = record?.remarks || "";

                      return (
                        <tr key={staff.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          {/* Name & Avatar */}
                          <td style={styles.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: "#FFE8D6",
                                  color: "#C2410C",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "14px",
                                }}
                              >
                                {localizeGuestName(staff.name)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#1F2937" }}>{localizeGuestName(staff.name)}</div>
                                <div style={{ fontSize: "11px", color: "#6B7280" }}>{toDevanagari(staff.phone)}</div>
                              </div>
                            </div>
                          </td>

                          {/* Designation */}
                          <td style={styles.td}>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "#F3F4F6",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#374151",
                              }}
                            >
                              {translateDesignation(staff.designation)}
                            </span>
                          </td>

                          {/* Check-in */}
                          <td style={styles.td}>
                            <input
                              type="time"
                              value={inTime}
                              onChange={(e) => handleRecordFieldChange(staff.id, "checkInTime", e.target.value)}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "6px",
                                border: "1px solid #D1D5DB",
                                fontSize: "11px",
                                fontWeight: 600,
                                width: "84px",
                                boxSizing: "border-box",
                              }}
                            />
                          </td>

                          {/* Check-out */}
                          <td style={styles.td}>
                            <input
                              type="time"
                              value={outTime}
                              onChange={(e) => handleRecordFieldChange(staff.id, "checkOutTime", e.target.value)}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "6px",
                                border: "1px solid #D1D5DB",
                                fontSize: "11px",
                                fontWeight: 600,
                                width: "84px",
                                boxSizing: "border-box",
                              }}
                            />
                          </td>

                          {/* Working Hours */}
                          <td style={styles.td}>
                            <span style={{ fontWeight: 700, color: "#1F2937" }}>
                              {hours != null ? `${toDevanagari(hours)} ${t('hoursUnit', 'hrs')}` : "—"}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td style={styles.td}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background:
                                  currentStatus === "PRESENT" ? "#DCFCE7" :
                                    currentStatus === "HALF_DAY" ? "#FEF3C7" :
                                      currentStatus === "ABSENT" ? "#FEE2E2" :
                                        currentStatus === "LEAVE" ? "#DBEAFE" : "#F1F5F9",
                                color:
                                  currentStatus === "PRESENT" ? "#166534" :
                                    currentStatus === "HALF_DAY" ? "#92400E" :
                                      currentStatus === "ABSENT" ? "#991B1B" :
                                        currentStatus === "LEAVE" ? "#1E40AF" : "#64748B",
                              }}
                            >
                              {currentStatus === "PRESENT" && `● ${translateStatus("PRESENT")}`}
                              {currentStatus === "HALF_DAY" && `◐ ${translateStatus("HALF_DAY")}`}
                              {currentStatus === "ABSENT" && `✕ ${translateStatus("ABSENT")}`}
                              {currentStatus === "LEAVE" && `✈ ${translateStatus("ON_LEAVE")}`}
                              {currentStatus === "UNMARKED" && `○ ${translateStatus("UNMARKED")}`}
                            </span>
                          </td>

                          {/* Quick Status Buttons */}
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "4px" }}>
                              <button
                                type="button"
                                onClick={() => handleQuickStatus(staff.id, "PRESENT")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #16A34A",
                                  background: currentStatus === "PRESENT" ? "#16A34A" : "#FFFFFF",
                                  color: currentStatus === "PRESENT" ? "#FFFFFF" : "#16A34A",
                                }}
                                title={t('markPresentTooltip', 'Mark Present (09:30 - 18:30)')}
                              >
                                {t('quickPresentShort', 'P')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStatus(staff.id, "HALF_DAY")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #D97706",
                                  background: currentStatus === "HALF_DAY" ? "#D97706" : "#FFFFFF",
                                  color: currentStatus === "HALF_DAY" ? "#FFFFFF" : "#D97706",
                                }}
                                title={t('markHalfDayTooltip', 'Mark Half Day (09:30 - 14:00)')}
                              >
                                {t('quickHalfDayShort', 'HD')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStatus(staff.id, "ABSENT")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #DC2626",
                                  background: currentStatus === "ABSENT" ? "#DC2626" : "#FFFFFF",
                                  color: currentStatus === "ABSENT" ? "#FFFFFF" : "#DC2626",
                                }}
                                title={t('markAbsentTooltip', 'Mark Absent')}
                              >
                                {t('quickAbsentShort', 'A')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStatus(staff.id, "LEAVE")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #2563EB",
                                  background: currentStatus === "LEAVE" ? "#2563EB" : "#FFFFFF",
                                  color: currentStatus === "LEAVE" ? "#FFFFFF" : "#2563EB",
                                }}
                                title={t('markLeaveTooltip', 'Mark On Leave')}
                              >
                                {t('quickLeaveShort', 'L')}
                              </button>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td style={styles.td}>
                            <input
                              type="text"
                              value={currentLanguage === 'en' ? remarks : t(remarks.trim(), remarks)}
                              placeholder={t('addNotePlaceholder', 'Add note...')}
                              onChange={(e) => handleRecordFieldChange(staff.id, "remarks", e.target.value)}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "6px",
                                border: "1px solid #E5E7EB",
                                fontSize: "11px",
                                width: "95px",
                              }}
                            />
                          </td>

                          {/* Action Buttons: Save & View */}
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleSaveRecordExplicit(staff.id)}
                                disabled={savingAttendanceId === staff.id}
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "#B94F08",
                                  fontSize: "11px",
                                  color: "#FFFFFF",
                                  fontWeight: 700,
                                  cursor: savingAttendanceId === staff.id ? "not-allowed" : "pointer",
                                  opacity: savingAttendanceId === staff.id ? 0.6 : 1,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title={t('saveAttendanceTooltip', "Save this staff member's attendance to SQL Server")}
                              >
                                <Save size={13} />
                                {savingAttendanceId === staff.id ? "..." : t('save', 'Save')}
                              </button>

                              <button
                                type="button"
                                onClick={() => setViewingStaffMonthDetail(staff)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #EA580C",
                                  background: "#FFF7ED",
                                  color: "#C2410C",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title={t('viewDetailsTooltip', 'View employee attendance details')}
                              >
                                <Eye size={13} />
                                {t('view', 'View')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAttendanceStaff.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ ...styles.td, textAlign: "center", padding: "30px", color: "#9CA3AF" }}>
                          {t('noStaffMatchingFilter', 'No staff found matching current search or status filter.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================
          VIEW POPUP
      ========================= */}

      {selectedStaff && (
        <div
          onClick={() =>
            setSelectedStaff(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "12px",
              padding: "25px",
              boxSizing:
                "border-box",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >

              <h2
                style={{
                  margin: 0,
                  color: "#1f2937",
                }}
              >
                👤 {t('staffProfile', 'Staff Profile')}
              </h2>

              <button
                onClick={() =>
                  setSelectedStaff(
                    null
                  )
                }
                style={{
                  border: "none",
                  background:
                    "#f3f4f6",
                  width: "35px",
                  height: "35px",
                  borderRadius:
                    "50%",
                  cursor:
                    "pointer",
                  fontSize:
                    "20px",
                }}
              >
                ×
              </button>

            </div>

            <div style={styles.grid}>

              <div>
                <strong>{t('name', 'Name')}</strong>
                <p>
                  {localizeGuestName(selectedStaff.name)}
                </p>
              </div>

              <div>
                <strong>{t('phone', 'Phone')}</strong>
                <p>
                  {toDevanagari(selectedStaff.phone)}
                </p>
              </div>

              <div>
                <strong>{t('address', 'Address')}</strong>
                <p>
                  {selectedStaff.address ? t(selectedStaff.address.trim(), selectedStaff.address) : "-"}
                </p>
              </div>

              <div>
                <strong>
                  {t('designation', 'Designation')}
                </strong>
                <p>
                  {translateDesignation(selectedStaff.designation)}
                </p>
              </div>

              <div>
                <strong>
                  {t('joiningDate', 'Joining Date')}
                </strong>
                <p>
                  {selectedStaff.joiningDate
                    ? formatDate(selectedStaff.joiningDate, { showDayOfWeek: false })
                    : "-"}
                </p>
              </div>

              <div>
                <strong>{t('idProof', 'ID Proof')}</strong>
                <p>
                  {translateIdProof(selectedStaff.idProofType) || "-"}
                </p>
              </div>

              <div>
                <strong>
                  {t('idProofNumber', 'ID Proof Number')}
                </strong>
                <p>
                  {
                    selectedStaff.idProofNumber
                      ? toDevanagari(selectedStaff.idProofNumber)
                      : "-"
                  }
                </p>
              </div>

              <div>
                <strong>
                  {t('grossSalary', 'Gross Salary')}
                </strong>
                <p>
                  {formatNumber(selectedStaff.grossSalary, { asCurrency: true, decimals: 0 })}
                </p>
              </div>

              <div>
                <strong>
                  {t('deduction', 'Deduction')}
                </strong>
                <p>
                  {formatNumber(selectedStaff.deduction, { asCurrency: true, decimals: 0 })}
                </p>
              </div>

              <div>
                <strong>
                  {t('netSalary', 'Net Salary')}
                </strong>
                <p>
                  <strong>
                    {formatNumber(getNetSalary(selectedStaff), { asCurrency: true, decimals: 0 })}
                  </strong>
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* =========================
          EDIT POPUP
      ========================= */}

      {editStaff && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "12px",
              padding: "25px",
              boxSizing:
                "border-box",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >

              <h2
                style={{
                  margin: 0,
                  color: "#1f2937",
                }}
              >
                ✏️ {t('editStaff', 'Edit Staff')}
              </h2>

              <button
                onClick={() =>
                  setEditStaff(null)
                }
                style={{
                  border: "none",
                  background:
                    "#f3f4f6",
                  width: "35px",
                  height: "35px",
                  borderRadius:
                    "50%",
                  cursor:
                    "pointer",
                  fontSize:
                    "20px",
                }}
              >
                ×
              </button>

            </div>

            <div style={styles.grid}>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('staffName', 'Staff Name')}
                </label>

                <input
                  style={styles.input}
                  name="name"
                  value={
                    editStaff.name
                  }
                  onChange={
                    handleEditChange
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('phoneNumber', 'Phone Number')}
                </label>

                <input
                  style={styles.input}
                  name="phone"
                  value={
                    editStaff.phone
                  }
                  onChange={
                    handleEditChange
                  }
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('address', 'Address')}
                </label>

                <input
                  style={styles.input}
                  name="address"
                  value={
                    editStaff.address
                  }
                  onChange={
                    handleEditChange
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('designation', 'Designation')}
                </label>

                <select
                  style={styles.select}
                  name="designation"
                  value={
                    editStaff.designation
                  }
                  onChange={
                    handleEditChange
                  }
                >
                  <option value="Manager">
                    {translateDesignation("Manager")}
                  </option>

                  <option value="Receptionist">
                    {translateDesignation("Receptionist")}
                  </option>

                  <option value="Waiter">
                    {translateDesignation("Waiter")}
                  </option>

                  <option value="Chef">
                    {translateDesignation("Chef")}
                  </option>

                  <option value="Helper">
                    {translateDesignation("Helper")}
                  </option>

                  <option value="Cleaner">
                    {translateDesignation("Cleaner")}
                  </option>

                  <option value="Security">
                    {translateDesignation("Security")}
                  </option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('joiningDate', 'Joining Date')}
                </label>

                <input
                  type="date"
                  style={
                    styles.dateInput
                  }
                  name="joiningDate"
                  value={
                    editStaff.joiningDate
                  }
                  max={currentDate}
                  onChange={
                    handleEditChange
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('grossSalary', 'Gross Salary')}
                </label>

                <input
                  type="number"
                  step="any"
                  style={styles.input}
                  name="grossSalary"
                  value={
                    editStaff.grossSalary
                  }
                  min="0"
                  onChange={
                    handleEditChange
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('salaryFrequency', 'Salary Frequency')}
                </label>

                <select
                  style={styles.select}
                  name="salaryFrequency"
                  value={
                    editStaff.salaryFrequency
                  }
                  onChange={
                    handleEditChange
                  }
                >
                  <option value="Daily">
                    {translateSalaryFrequency("Daily")}
                  </option>

                  <option value="Weekly">
                    {translateSalaryFrequency("Weekly")}
                  </option>

                  <option value="Bi-Weekly">
                    {translateSalaryFrequency("Bi-Weekly")}
                  </option>

                  <option value="Monthly">
                    {translateSalaryFrequency("Monthly")}
                  </option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  {t('deduction', 'Deduction')}
                </label>

                <input
                  type="number"
                  step="any"
                  style={styles.input}
                  name="deduction"
                  value={
                    editStaff.deduction
                  }
                  min="0"
                  onChange={
                    handleEditChange
                  }
                />
              </div>

            </div>

            <button
              onClick={saveEdit}
              style={styles.saveButton}
            >
              {t('updateStaff', 'Update Staff')}
            </button>

          </div>

        </div>
      )}

      {/* =========================
          DELETE CONFIRM POPUP
      ========================= */}

      {deleteStaff && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: "20px",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "#fff",
              borderRadius: "12px",
              padding: "25px",
              textAlign: "center",
              boxSizing:
                "border-box",
            }}
          >

            <div
              style={{
                width: "50px",
                height: "50px",
                margin:
                  "0 auto 15px",
                borderRadius:
                  "50%",
                background:
                  "#fee2e2",
                color:
                  "#dc2626",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize:
                  "22px",
              }}
            >
              🗑️
            </div>

            <h3
              style={{
                margin:
                  "0 0 8px",
                color:
                  "#1f2937",
              }}
            >
              {t('deleteStaff', 'Delete Staff')}?
            </h3>

            <p
              style={{
                margin:
                  "0 0 20px",
                color:
                  "#6b7280",
                fontSize:
                  "14px",
              }}
            >
              {t('confirmDelete', 'Are you sure you want to delete')}{" "}
              <strong>
                {localizeGuestName(deleteStaff.name)}
              </strong>
              ?
            </p>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "center",
                gap:
                  "10px",
              }}
            >

              <button
                onClick={() =>
                  setDeleteStaff(
                    null
                  )
                }
                style={{
                  padding:
                    "9px 18px",
                  borderRadius:
                    "7px",
                  border:
                    "1px solid #d1d5db",
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                  fontWeight:
                    600,
                }}
              >
                {t('cancel', 'Cancel')}
              </button>

              <button
                onClick={
                  confirmDelete
                }
                style={{
                  padding:
                    "9px 18px",
                  borderRadius:
                    "7px",
                  border:
                    "none",
                  background:
                    "#dc2626",
                  color:
                    "#fff",
                  cursor:
                    "pointer",
                  fontWeight:
                    600,
                }}
              >
                {t('delete', 'Delete')}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          STAFF MONTHLY DETAILED SHEET MODAL
      ======================================================== */}
      {viewingStaffMonthDetail && (
        <div
          onClick={() => setViewingStaffMonthDetail(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: "14px",
              padding: "24px",
              boxSizing: "border-box",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #F1DFD2",
                paddingBottom: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#FFE8D6",
                    color: "#C2410C",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "16px",
                  }}
                >
                  {localizeGuestName(viewingStaffMonthDetail.name)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#1F2937", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{localizeGuestName(viewingStaffMonthDetail.name)}</span>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: "#F3F4F6",
                        color: "#4B5563",
                        fontWeight: 600,
                      }}
                    >
                      {translateDesignation(viewingStaffMonthDetail.designation)}
                    </span>
                  </h2>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                    {getMonthDisplayName(selectedMonth, currentLanguage)} {t('monthlyAttendanceReport', 'Monthly Attendance Report')}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handlePrintStaffMonthlySlip(viewingStaffMonthDetail)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#1E293B",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title={t('printSlip', 'Print Staff Monthly Slip')}
                >
                  <Printer size={14} />
                  {t('print', 'Print')}
                </button>

                <button
                  type="button"
                  onClick={() => setViewingStaffMonthDetail(null)}
                  style={{
                    border: "none",
                    background: "#F3F4F6",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "20px",
                    color: "#4B5563",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={t('close', 'Close')}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Staff Details Card */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                background: "#FFFBF7",
                border: "1px solid #FED7AA",
                borderRadius: "10px",
                padding: "14px 18px",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('phone', 'Phone')}:</span>
                <div style={{ fontWeight: 700, color: "#1F2937" }}>{toDevanagari(viewingStaffMonthDetail.phone)}</div>
              </div>
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('address', 'Address')}:</span>
                <div style={{ fontWeight: 700, color: "#1F2937" }}>{viewingStaffMonthDetail.address || "—"}</div>
              </div>
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('joiningDate', 'Joining Date')}:</span>
                <div style={{ fontWeight: 700, color: "#1F2937" }}>
                  {viewingStaffMonthDetail.joiningDate ? formatDate(viewingStaffMonthDetail.joiningDate) : "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('idProof', 'ID Proof')}:</span>
                <div style={{ fontWeight: 700, color: "#1F2937" }}>
                  {translateIdProof(viewingStaffMonthDetail.idProofType)}: {toDevanagari(viewingStaffMonthDetail.idProofNumber || "—")}
                </div>
              </div>
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('grossSalary', 'Gross Salary')}:</span>
                <div style={{ fontWeight: 700, color: "#1F2937" }}>
                  {formatNumber(viewingStaffMonthDetail.grossSalary, { asCurrency: true, decimals: 0 })}
                </div>
              </div>
              <div>
                <span style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{t('netSalary', 'Net Salary')}:</span>
                <div style={{ fontWeight: 700, color: "#15803D" }}>
                  {formatNumber(getNetSalary(viewingStaffMonthDetail), { asCurrency: true, decimals: 0 })}
                </div>
              </div>
            </div>

            {/* Monthly Stats Tiles for this Staff */}
            {(() => {
              const stats = getStaffMonthlyStats(viewingStaffMonthDetail.id);
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700 }}>{t('monthDays', 'MONTH DAYS')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>{toDevanagari(stats.daysInMonth)}</div>
                  </div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#166534", fontWeight: 700 }}>{t('presentShort', 'PRESENT (P)')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#16A34A", marginTop: "2px" }}>{toDevanagari(stats.presentCount)}</div>
                  </div>
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#92400E", fontWeight: 700 }}>{t('halfDayShort', 'HALF DAY (HD)')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#D97706", marginTop: "2px" }}>{toDevanagari(stats.halfDayCount)}</div>
                  </div>
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#991B1B", fontWeight: 700 }}>{t('absentShort', 'ABSENT (A)')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#DC2626", marginTop: "2px" }}>{toDevanagari(stats.absentCount)}</div>
                  </div>
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#1E40AF", fontWeight: 700 }}>{t('leaveShort', 'LEAVES (L)')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#2563EB", marginTop: "2px" }}>{toDevanagari(stats.leaveCount)}</div>
                  </div>
                  <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#5B21B6", fontWeight: 700 }}>{t('payableDays', 'PAYABLE DAYS')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#7C3AED", marginTop: "2px" }}>{toDevanagari(stats.effectivePayableDays)}</div>
                  </div>
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#C2410C", fontWeight: 700 }}>{t('totalHours', 'TOTAL HOURS')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#EA580C", marginTop: "2px" }}>{toDevanagari(stats.totalHours)}h</div>
                  </div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#15803D", fontWeight: 700 }}>{t('estNetPay', 'EST. NET PAY')}</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#16A34A", marginTop: "2px" }}>₹{toDevanagari(stats.estimatedPay.toLocaleString())}</div>
                  </div>
                </div>
              );
            })()}

            {/* Payroll & Salary Calculation Breakdown Box */}
            {(() => {
              const stats = getStaffMonthlyStats(viewingStaffMonthDetail.id);
              return (
                <div
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #86EFAC",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>💰</span>
                    <strong style={{ fontSize: "13px", color: "#166534" }}>
                      {t('payrollCalculationBreakdown', 'Payroll & Salary Calculation Breakdown')}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "10px",
                      fontSize: "12px",
                      color: "#1F2937",
                    }}
                  >
                    <div>
                      <span style={{ color: "#6B7280" }}>{t('perDayFormula', 'Daily Rate Formula')}:</span>
                      <div style={{ fontWeight: 700, color: "#166534" }}>
                        ₹{stats.grossSalary.toLocaleString()} ÷ {stats.daysInMonth} days = ₹{stats.perDaySalary}/day
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280" }}>{t('payableDaysFormula', 'Payable Days Formula')}:</span>
                      <div style={{ fontWeight: 700, color: "#166534" }}>
                        {stats.presentCount} (P) + ({stats.halfDayCount} × 0.5 HD) = {stats.effectivePayableDays} days
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280" }}>{t('grossEarned', 'Gross Earned')}:</span>
                      <div style={{ fontWeight: 700, color: "#166534" }}>
                        {stats.effectivePayableDays} days × ₹{stats.perDaySalary} = ₹{Math.round(stats.effectivePayableDays * stats.perDaySalary).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280" }}>{t('netEstimatedPay', 'Estimated Net Payable')}:</span>
                      <div style={{ fontWeight: 800, color: "#15803D", fontSize: "13px" }}>
                        ₹{Math.round(stats.effectivePayableDays * stats.perDaySalary).toLocaleString()} - ₹{stats.deduction.toLocaleString()} (Deduction) = ₹{stats.estimatedPay.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4B5563", marginTop: "8px", fontStyle: "italic" }}>
                    ℹ️ {t('payrollNote', 'Rules: Half day is calculated at 50% pay. Unapproved leaves/absent days are unpaid. Approved paid leaves follow hotel policy.')}
                  </div>
                </div>
              );
            })()}

            {/* Complete Day-by-Day Monthly Log Table */}
            <div style={{ marginBottom: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "14px", color: "#1F2937", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📅</span>
                  <span>{t('dayByDayDetailedLog', 'Full Month Daily Attendance Log & Work Hours')}:</span>
                </h3>
                <span style={{ fontSize: "11px", color: "#6B7280" }}>
                  {t('quickClickStatus', 'Click P / HD / A / L to quickly mark status')}
                </span>
              </div>

              <div style={{ ...styles.tableWrapper, maxHeight: "380px", overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#FFF8F2", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid #FED7AA" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "#9A4210" }}>{t('date', 'Date')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "#9A4210" }}>{t('day', 'Day')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#9A4210" }}>{t('status', 'Status')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#9A4210" }}>{t('quickAction', 'Quick Action')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#9A4210" }}>{t('checkInTime', 'In Time')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#9A4210" }}>{t('checkOutTime', 'Out Time')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#9A4210" }}>{t('hours', 'Hours')}</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "#9A4210" }}>{t('remarks', 'Remarks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => i + 1).map((d) => {
                      const dayData = getStaffDayAttendance(viewingStaffMonthDetail.id, d);
                      const dayInfo = getDayOfWeekInfo(d, selectedMonth);
                      const st = dayData.status || "UNMARKED";

                      return (
                        <tr
                          key={d}
                          style={{
                            borderBottom: "1px solid #F1F5F9",
                            background: dayInfo.isSunday ? "#FFFBEB" : d % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                          }}
                        >
                          {/* Date */}
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1F2937" }}>
                            {String(d).padStart(2, '0')}/{selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                          </td>

                          {/* Day */}
                          <td style={{ padding: "8px 10px", color: dayInfo.isSunday ? "#B45309" : "#4B5563", fontWeight: dayInfo.isSunday ? 800 : 500 }}>
                            {dayInfo.fullLabel} {dayInfo.isSunday && "⭐"}
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 800,
                                background:
                                  st === "PRESENT"
                                    ? "#DCFCE7"
                                    : st === "HALF_DAY"
                                      ? "#FEF3C7"
                                      : st === "ABSENT"
                                        ? "#FEE2E2"
                                        : st === "LEAVE"
                                          ? "#DBEAFE"
                                          : "#F1F5F9",
                                color:
                                  st === "PRESENT"
                                    ? "#166534"
                                    : st === "HALF_DAY"
                                      ? "#92400E"
                                      : st === "ABSENT"
                                        ? "#991B1B"
                                        : st === "LEAVE"
                                          ? "#1E40AF"
                                          : "#64748B",
                              }}
                            >
                              {st === "PRESENT" && "● " + t('present', 'Present')}
                              {st === "HALF_DAY" && "◐ " + t('halfDay', 'Half Day')}
                              {st === "ABSENT" && "✕ " + t('absent', 'Absent')}
                              {st === "LEAVE" && "✈ " + t('leave', 'Leave')}
                              {st === "UNMARKED" && "○ " + t('unmarked', 'Not Marked')}
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "3px" }}>
                              <button
                                type="button"
                                onClick={() => handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, "PRESENT")}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #16A34A",
                                  background: st === "PRESENT" ? "#16A34A" : "#FFFFFF",
                                  color: st === "PRESENT" ? "#FFFFFF" : "#16A34A",
                                }}
                                title="Mark Present (09:30 - 18:30)"
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, "HALF_DAY")}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #D97706",
                                  background: st === "HALF_DAY" ? "#D97706" : "#FFFFFF",
                                  color: st === "HALF_DAY" ? "#FFFFFF" : "#D97706",
                                }}
                                title="Mark Half Day (09:30 - 14:00)"
                              >
                                HD
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, "ABSENT")}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #DC2626",
                                  background: st === "ABSENT" ? "#DC2626" : "#FFFFFF",
                                  color: st === "ABSENT" ? "#FFFFFF" : "#DC2626",
                                }}
                                title="Mark Absent"
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, "LEAVE")}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: "1px solid #2563EB",
                                  background: st === "LEAVE" ? "#2563EB" : "#FFFFFF",
                                  color: st === "LEAVE" ? "#FFFFFF" : "#2563EB",
                                }}
                                title="Mark Leave"
                              >
                                L
                              </button>
                            </div>
                          </td>

                          {/* In Time */}
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <input
                              type="time"
                              value={dayData.inTime}
                              onChange={(e) => {
                                handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, st === "UNMARKED" ? "PRESENT" : st, {
                                  checkIn: e.target.value,
                                  checkOut: dayData.outTime,
                                  remarks: dayData.remarks,
                                });
                              }}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "4px",
                                border: "1px solid #D1D5DB",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            />
                          </td>

                          {/* Out Time */}
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <input
                              type="time"
                              value={dayData.outTime}
                              onChange={(e) => {
                                handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, st === "UNMARKED" ? "PRESENT" : st, {
                                  checkIn: dayData.inTime,
                                  checkOut: e.target.value,
                                  remarks: dayData.remarks,
                                });
                              }}
                              style={{
                                padding: "4px 6px",
                                borderRadius: "4px",
                                border: "1px solid #D1D5DB",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            />
                          </td>

                          {/* Hours */}
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#1F2937" }}>
                            {dayData.workingHours != null ? `${toDevanagari(dayData.workingHours)}h` : "—"}
                          </td>

                          {/* Remarks */}
                          <td style={{ padding: "8px 10px" }}>
                            <input
                              type="text"
                              value={dayData.remarks}
                              placeholder={t('note', 'Note...')}
                              onChange={(e) => {
                                handleSaveStaffDayStatus(viewingStaffMonthDetail.id, dayData.date, st === "UNMARKED" ? "PRESENT" : st, {
                                  checkIn: dayData.inTime,
                                  checkOut: dayData.outTime,
                                  remarks: e.target.value,
                                });
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #E5E7EB",
                                fontSize: "11px",
                                width: "120px",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "10px", borderTop: "1px solid #E5E7EB" }}>
              <button
                type="button"
                onClick={() => setViewingStaffMonthDetail(null)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "7px",
                  border: "none",
                  background: "#C2410C",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          SUCCESS / VALIDATION POPUP
      ========================= */}

      {popupMessage && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            zIndex: 100001,
            background:
              "#ffffff",
            border:
              popupMessage.toLowerCase().includes("failed") || popupMessage.toLowerCase().includes("error")
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",
            borderLeft:
              popupMessage.toLowerCase().includes("failed") || popupMessage.toLowerCase().includes("error")
                ? "4px solid #ef4444"
                : "4px solid #22c55e",
            borderRadius:
              "8px",
            padding:
              "13px 18px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.15)",
            color:
              popupMessage.toLowerCase().includes("failed") || popupMessage.toLowerCase().includes("error")
                ? "#991b1b"
                : "#166534",
            fontSize:
              "14px",
            fontWeight:
              600,
          }}
        >
          {popupMessage.toLowerCase().includes("failed") || popupMessage.toLowerCase().includes("error") ? "⚠ " : "✓ "}
          {popupMessage}
        </div>
      )}

    </div>
  );
};

export default StaffManagement;