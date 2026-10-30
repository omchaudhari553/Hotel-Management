import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { settingsService } from "../services/settingsService";
import { licenceService, LicenceInfo } from "../services/licenceService";
import { sanitizeMobileInput } from "../common/phoneUtils";
import { webBluetoothPrinter } from "../services/webBluetoothPrinter";
import { printService } from "../services/printService";
import { BluetoothPrinterDevice, BluetoothState, PaperSize, PrintMethod } from "../types/printing";
import { ReportsModule } from "../reports/ReportsModule";
import { GstReportComponent } from "../hotel/GstReportComponent";
import { useLanguage } from "../context/LanguageContext";
import {
  maskGstNumber,
  isValidGstin,
  isMaskedGst,
  resolveGstForSave,
} from "../common/gstUtils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArchiveRestore,
  ArrowLeft,
  BarChart3,
  Bluetooth,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileClock,
  FileText,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  Menu,
  MoreHorizontal,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  Users,
  WalletCards,
  X,
  Zap,
  LogOut as LogOutIcon,
} from "lucide-react";

type SettingKey =
  | "dashboard"
  | "profile"
  | "hotel"
  | "users"
  | "roles"
  | "preferences"
  | "rooms"
  | "reservations"
  | "guests"
  | "housekeeping"
  | "restaurant"
  | "billing"
  | "tax"
  | "payments"
  | "notifications"
  | "email"
  | "printer"
  | "localization"
  | "backup"
  | "audit"
  | "maintenance"
  | "licence"
  | "reports"
  | "gstSettings"
  | "gstReport";

type Status = "Active" | "Inactive";

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  branch: string;
  department: string;
  status: Status;
}

interface RoomType {
  id: number;
  name: string;
  code: string;
  baseRate: number;
  capacity: number;
  status: Status;
}

interface TaxRecord {
  id: number;
  name: string;
  type: "Percentage" | "Fixed";
  rate: number;
  appliesTo: string;
  status: Status;
}

interface NotificationSetting {
  id: number;
  name: string;
  description: string;
  channel: "In-App" | "Email" | "SMS" | "WhatsApp";
  enabled: boolean;
}

interface AuditRecord {
  id: number;
  user: string;
  action: string;
  module: string;
  date: string;
  ip: string;
  status: "Success" | "Warning";
}

const NAV_ITEMS: Array<{
  key: SettingKey;
  label: string;
  icon: React.ElementType;
  group?: string;
}> = [
  { key: "dashboard", label: "Settings Dashboard", icon: LayoutDashboard },
  { key: "profile", label: "User Profile", icon: UserCog },
  { key: "hotel", label: "Hotel Profile & Logo", icon: Building2 },
  { key: "users", label: "User Management", icon: Users },
  { key: "roles", label: "Roles & Permissions", icon: Shield },
  { key: "preferences", label: "System Preferences", icon: SlidersHorizontal },
  { key: "rooms", label: "Room Settings", icon: Building2 },
  { key: "reservations", label: "Reservation Settings", icon: CalendarDays },
  { key: "guests", label: "Guest Settings", icon: UserCheck },
  { key: "housekeeping", label: "Housekeeping", icon: RefreshCw },
  { key: "restaurant", label: "Restaurant & POS", icon: WalletCards },
  { key: "billing", label: "Billing & Invoice", icon: FileText },
  { key: "tax", label: "Tax & Charges", icon: Zap },
  { key: "payments", label: "Payment Settings", icon: WalletCards },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "email", label: "Email & SMS", icon: Mail },
  { key: "printer", label: "Printer Settings", icon: Printer },
  { key: "localization", label: "Language & Localization", icon: Globe2 },
  { key: "backup", label: "Backup & Restore", icon: Database },
  { key: "audit", label: "Audit Logs", icon: FileClock },
  { key: "maintenance", label: "System Maintenance", icon: Server },
  { key: "licence", label: "Licence & Subscription", icon: Shield },
  { key: "reports", label: "Reports & KPIs", icon: BarChart3 },
  { key: "gstSettings", label: "GST Settings", icon: Zap },
  { key: "gstReport", label: "GST Report", icon: FileText },
];

const INITIAL_USERS: UserRecord[] = [
  { id: 1, name: "Rohit Sharma", email: "rohit@hotel.com", role: "Hotel Admin", branch: "Main Property", department: "Administration", status: "Active" },
  { id: 2, name: "Pooja Mehta", email: "pooja@hotel.com", role: "Receptionist", branch: "Main Property", department: "Front Desk", status: "Active" },
  { id: 3, name: "Amit Verma", email: "amit@hotel.com", role: "Restaurant Manager", branch: "Main Property", department: "Restaurant", status: "Active" },
  { id: 4, name: "Neha Patil", email: "neha@hotel.com", role: "Housekeeping", branch: "Airport Property", department: "Housekeeping", status: "Inactive" },
];

const INITIAL_ROOMS: RoomType[] = [
  { id: 1, name: "Standard", code: "STD", baseRate: 2500, capacity: 2, status: "Active" },
  { id: 2, name: "Deluxe", code: "DLX", baseRate: 4200, capacity: 3, status: "Active" },
  { id: 3, name: "Executive", code: "EXE", baseRate: 6500, capacity: 3, status: "Active" },
  { id: 4, name: "Suite", code: "STE", baseRate: 9500, capacity: 4, status: "Active" },
];

const INITIAL_TAXES: TaxRecord[] = [
  { id: 1, name: "GST - Room", type: "Percentage", rate: 18, appliesTo: "Room Booking", status: "Active" },
  { id: 2, name: "GST - Restaurant", type: "Percentage", rate: 5, appliesTo: "Restaurant", status: "Active" },
  { id: 3, name: "Service Charge", type: "Percentage", rate: 10, appliesTo: "Restaurant", status: "Active" },
];

const INITIAL_NOTIFICATIONS: NotificationSetting[] = [
  { id: 1, name: "Booking Confirmation", description: "Send confirmation after successful reservation.", channel: "Email", enabled: true },
  { id: 2, name: "Booking Cancellation", description: "Notify guest when a booking is cancelled.", channel: "Email", enabled: true },
  { id: 3, name: "Check-in Reminder", description: "Remind guests before their arrival date.", channel: "SMS", enabled: true },
  { id: 4, name: "Payment Received", description: "Notify staff and guest after payment.", channel: "In-App", enabled: true },
  { id: 5, name: "Room Ready", description: "Alert front desk when room is inspected.", channel: "WhatsApp", enabled: false },
  { id: 6, name: "Low Inventory", description: "Alert restaurant and purchase teams.", channel: "In-App", enabled: true },
];

const INITIAL_AUDIT: AuditRecord[] = [
  { id: 1, user: "Rohit Sharma", action: "Updated hotel profile", module: "Hotel Profile", date: "02 Sep 2026, 10:42 AM", ip: "192.168.1.20", status: "Success" },
  { id: 2, user: "Pooja Mehta", action: "Created reservation", module: "Reservations", date: "02 Sep 2026, 10:25 AM", ip: "192.168.1.22", status: "Success" },
  { id: 3, user: "Amit Verma", action: "Changed KOT printer", module: "Restaurant & POS", date: "02 Sep 2026, 09:48 AM", ip: "192.168.1.31", status: "Warning" },
];

const COLORS = {
  navy: "#4a1d0b",
  navy2: "#6b2b0d",
  purple: "#b85c14",
  purpleDark: "#93470f",
  purpleSoft: "#fff1e6",
  bg: "#f6f7fb",
  card: "#ffffff",
  border: "#e7e8f0",
  text: "#1b2038",
  muted: "#73798d",
  success: "#19a974",
  successSoft: "#eaf9f2",
  danger: "#e24d5b",
  dangerSoft: "#fff0f2",
  warning: "#d99016",
  warningSoft: "#fff7e6",
};

const css = {
  page: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  sidebar: { position: "fixed" as const, left: 0, top: 0, bottom: 0, width: 270, background: `linear-gradient(180deg, ${COLORS.navy} 0%, #151d42 100%)`, color: "#fff", zIndex: 20, overflowY: "auto" as const },
  content: { marginLeft: 270, minHeight: "100vh" },
  header: { height: 76, background: "#fff", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", position: "sticky" as const, top: 0, zIndex: 10 },
  main: { padding: "28px 30px 50px", maxWidth: 1500, margin: "0 auto" },
  card: { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 5px 20px rgba(74, 29, 11, 0.05)" },
  input: { width: "100%", height: 44, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "0 13px", outline: "none", background: "#fff", color: COLORS.text, boxSizing: "border-box" as const },
};

export default function HotelSettingsModule() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business } = useAuth();
  const { t, formatNumber } = useLanguage();
  const [active, setActive] = useState<SettingKey>("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [settingsPopup, setSettingsPopup] = useState<SettingKey | null>(null);
  const [toast, setToast] = useState<string>("");

  const [profileImage, setProfileImage] = useState<string>(
    () => localStorage.getItem("user_profile_image") || ""
  );
  const [profileImgError, setProfileImgError] = useState<string>("");
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const [businessLogoError, setBusinessLogoError] = useState<string>("");

  const [licenceInfo, setLicenceInfo] = useState<LicenceInfo>({
    licenceVersion: "Enterprise",
    subscriptionPlan: "Enterprise",
    trialDurationDays: 28,
    trialStatus: "Active",
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStatus: "Active & Verified",
    renewalDate: null,
    daysRemaining: 28,
    isEligibleForTrial: false,
  });
  const [licenceLoading, setLicenceLoading] = useState(false);

  const fetchLicence = async () => {
    try {
      const data = await licenceService.getLicenceInfo();
      setLicenceInfo(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLicence();
    window.addEventListener("licence-updated", fetchLicence);
    return () => window.removeEventListener("licence-updated", fetchLicence);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") as SettingKey | null;
    if (tab && NAV_ITEMS.some((n) => n.key === tab)) {
      setActive(tab);
      setSettingsPopup(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const loadBackendSettings = async () => {
      try {
        const allSettings = await settingsService.getSettings();
        // Business / Hotel Logo
        const logoSetting = allSettings.find(
          (s) => s.category === "BUSINESS" && s.settingKey === "LOGO"
        );
        if (logoSetting?.settingValue) {
          setHotel((h) => ({ ...h, logoUrl: logoSetting.settingValue }));
          localStorage.setItem("business_logo", logoSetting.settingValue);
        } else {
          const localLogo = localStorage.getItem("business_logo");
          if (localLogo) {
            setHotel((h) => ({ ...h, logoUrl: localLogo }));
          }
        }

        // Profile Image for the logged-in user
        const userProfileKey = "PROFILE_IMAGE_" + (user?.id || user?.username || "CURRENT");
        const profileSetting = allSettings.find(
          (s) => s.category === "USER_PROFILE" && s.settingKey === userProfileKey
        );
        if (profileSetting?.settingValue) {
          setProfileImage(profileSetting.settingValue);
          localStorage.setItem("user_profile_image", profileSetting.settingValue);
        } else {
          const localProfile = localStorage.getItem("user_profile_image");
          if (localProfile) {
            setProfileImage(localProfile);
          }
        }
      } catch (err) {
        console.warn("Could not load backend settings:", err);
      }
    };
    loadBackendSettings();
  }, [user?.id, user?.username]);

  const handleStartTrial = async () => {
    try {
      setLicenceLoading(true);
      const updated = await licenceService.startFreeTrial();
      setLicenceInfo(updated);
      setToast("28 Days Free Trial Activated! Enjoy full Enterprise access.");
    } catch (err: any) {
      setToast(err.message || "Failed to start free trial.");
    } finally {
      setLicenceLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    try {
      setLicenceLoading(true);
      const updated = await licenceService.renewSubscription();
      setLicenceInfo(updated);
      setToast("Enterprise subscription renewed successfully!");
    } catch (err: any) {
      setToast(err.message || "Failed to renew subscription.");
    } finally {
      setLicenceLoading(false);
    }
  };

  const [modal, setModal] = useState<null | "confirm" | "user" | "view_user" | "room" | "tax" | "role" | "backup" | "save" | "password">(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveAction, setSaveAction] = useState<(() => boolean | void) | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const savedSnapshotRef = useRef<any>(null);
  const refreshBaselineRef = useRef(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // User search, filter, export state
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userFilterRole, setUserFilterRole] = useState("All");
  const [userFilterStatus, setUserFilterStatus] = useState("All");

  const [hotel, setHotel] = useState({
    name: "Hotel Sunshine",
    registration: "HS-2026-001",
    gst: "27ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    type: "Luxury Hotel",
    rating: "5 Star",
    phone: "9876543210",
    alternatePhone: "9123456780",
    email: "contact@hotelsunshine.com",
    website: "www.hotelsunshine.com",
    address: "MG Road, Downtown",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001",
    floors: 8,
    rooms: 96,
    checkIn: "02:00 PM",
    checkOut: "11:00 AM",
    grace: "30",
    description: "Premium business and leisure hotel with modern rooms, restaurant, banquet and conference facilities.",
    logoUrl: "",
  });
  const [originalHotelGst, setOriginalHotelGst] = useState("27ABCDE1234F1Z5");
  const [hotelGstFocused, setHotelGstFocused] = useState(false);
  const [hotelGstRevealed, setHotelGstRevealed] = useState(false);

  const [users, setUsers] = useState(INITIAL_USERS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [taxes, setTaxes] = useState(INITIAL_TAXES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [audits, setAudits] = useState(INITIAL_AUDIT);

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [viewedUser, setViewedUser] = useState<UserRecord | null>(null);
  const [userForm, setUserForm] = useState({
    name: "", email: "", role: "Receptionist", branch: "Main Property", department: "Front Desk", status: "Active" as Status,
  });
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [roomForm, setRoomForm] = useState({ name: "", code: "", baseRate: "2500", capacity: "2", status: "Active" as Status });
  const [selectedTax, setSelectedTax] = useState<TaxRecord | null>(null);
  const [taxForm, setTaxForm] = useState({ name: "", type: "Percentage" as "Percentage" | "Fixed", rate: "18", appliesTo: "Room Booking", status: "Active" as Status });
  const [roleName, setRoleName] = useState("Hotel Manager");
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    Dashboard: ["View"], FrontDesk: ["View", "Create", "Edit"], Reservations: ["View", "Create", "Edit", "Cancel"],
    Rooms: ["View", "Edit"], Guests: ["View", "Create", "Edit"], Housekeeping: ["View", "Update"],
    Restaurant: ["View", "Create"], Billing: ["View", "Create", "Edit"], Reports: ["View"], Settings: ["View"],
  });

  const [preferences, setPreferences] = useState({
    autoSave: true, deleteConfirmation: true, sessionTimeout: "30", bookingPrefix: "HSB", bookingAutoNumber: true,
    overbooking: false, idVerification: true, guestSignature: true, depositRequired: true, earlyCheckIn: true, lateCheckOut: true,
    defaultDashboard: "Hotel Dashboard", defaultLanguage: "English",
  });

  const [localization, setLocalization] = useState({
    language: "English", currency: "INR (₹)", dateFormat: "DD/MM/YYYY", timeFormat: "12 Hour", timezone: "Asia/Kolkata",
  });

  const [security, setSecurity] = useState({
    twoFactor: true, passwordExpiry: true, ipRestriction: false, deviceControl: true, failedAttempts: "5", sessionTimeout: "30",
  });

  const [payment, setPayment] = useState({
    cash: true, card: true, upi: true, bank: true, netBanking: true, wallet: false,
    gateway: "Razorpay", merchantId: "rzp_live_hotel_001", connected: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.hotelmail.com", port: "587", username: "noreply@hotelsunshine.com", password: "••••••••",
    senderName: "Hotel Sunshine", senderEmail: "noreply@hotelsunshine.com", tls: true,
  });

  const [printerSettings, setPrinterSettings] = useState({
    invoice: "HP LaserJet Pro", kot: "Epson TM-T82", receipt: "Epson TM-T82", kitchen: "Kitchen Printer 01",
    ip: "192.168.1.45", port: "9100", paper: "80mm", copies: "1",
  });

  const [restaurantSettings, setRestaurantSettings] = useState({
    autoKOT: true, duplicateKOT: false, cancelPermission: "Manager", tablePrefix: "T", orderPrefix: "ORD",
    roomService: true, takeaway: true, dineIn: true, delivery: true,
  });

  const [billingSettings, setBillingSettings] = useState({
    invoicePrefix: "INV", nextNumber: "10045", logo: true, taxDisplay: true, discountDisplay: true,
    footer: "Thank you for staying with Hotel Sunshine.", terms: "All disputes are subject to Mumbai jurisdiction.",
    signature: true,
    printerType: (localStorage.getItem("ajalkar_default_print_method") === "bluetooth" ? "thermal_bt" : "system") as "thermal_bt" | "system",
    paperSize: (localStorage.getItem("ajalkar_default_paper_size") as "80mm" | "58mm" | "A4") || "80mm",
    autoThermalPrint: localStorage.getItem("ajalkar_auto_thermal_print") !== "false",
  });

  const [btDevice, setBtDevice] = useState<BluetoothPrinterDevice | null>(() => webBluetoothPrinter.getConnectedPrinter());
  const [btState, setBtState] = useState<BluetoothState>(() => webBluetoothPrinter.getState());
  const [isConnectingBt, setIsConnectingBt] = useState(false);
  const [isTestingBt, setIsTestingBt] = useState(false);
  const isBtSupported = webBluetoothPrinter.isSupported();

  useEffect(() => {
    const unsub = webBluetoothPrinter.subscribe((st, dev) => {
      setBtState(st);
      setBtDevice(dev);
    });
    return () => unsub();
  }, []);

  const handleConnectBtPrinter = async () => {
    try {
      setIsConnectingBt(true);
      const dev = await webBluetoothPrinter.connect();
      setBtDevice(dev);
      setBillingSettings(s => ({ ...s, printerType: "thermal_bt" }));
      printService.setDefaultPrintMethod("bluetooth");
      localStorage.setItem("ajalkar_default_print_method", "bluetooth");
      localStorage.setItem("ajalkar_printer_type", "thermal_bt");
      showToast(`✓ Connected to ${dev.name || "Bluetooth Printer"} successfully!`);
    } catch (err: any) {
      showToast(err.message || "Failed to connect to Bluetooth printer.");
    } finally {
      setIsConnectingBt(false);
    }
  };

  const handleDisconnectBtPrinter = async () => {
    try {
      await webBluetoothPrinter.disconnect();
      setBtDevice(null);
      showToast("Bluetooth printer disconnected.");
    } catch (err: any) {
      showToast(err.message || "Failed to disconnect Bluetooth printer.");
    }
  };

  const handleTestBtPrint = async () => {
    try {
      setIsTestingBt(true);
      if (btState !== "connected" || !btDevice) {
        showToast("Please connect a Bluetooth thermal printer first.");
        return;
      }
      await webBluetoothPrinter.testPrint(billingSettings.paperSize === "58mm" ? "58mm" : "80mm");
      showToast(`✓ Test print sent to ${btDevice.name || "Thermal Printer"}!`);
    } catch (err: any) {
      showToast(err.message || "Failed to send test print.");
    } finally {
      setIsTestingBt(false);
    }
  };

  const [reservationSettings, setReservationSettings] = useState({
    autoConfirmation: true, overbooking: false, depositRequired: true, noShowCharge: true, noShowPercent: "50",
    cancellationWindow: "24", earlyCheckIn: true, lateCheckOut: true,
  });

  const [guestSettings, setGuestSettings] = useState({
    guestIdAuto: true, vipEnabled: true, corporateEnabled: true, preferences: true, tags: true,
    passport: true, aadhaar: true, driving: true, voter: true,
  });

  const [housekeepingSettings, setHousekeepingSettings] = useState({
    autoTask: true, cleaningDuration: "30", inspection: true, priority: "High", autoAssignment: true,
    dirty: true, cleaning: true, inspected: true, clean: true, maintenance: true,
  });

  const [backupSchedule, setBackupSchedule] = useState({ enabled: true, frequency: "Daily", time: "02:00 AM", retention: "30 days" });

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const askConfirm = (text: string, action: () => void) => {
    setConfirmText(text);
    setConfirmAction(() => action);
    setModal("confirm");
  };

  const addAudit = (action: string, module = "Settings", status: "Success" | "Warning" = "Success") => {
    setAudits(prev => [{
      id: Date.now(), user: "Admin", action, module,
      date: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      ip: "192.168.1.10", status,
    }, ...prev]);
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Please enter current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.");
      return;
    }
    try {
      await authService.changePassword({ currentPassword, newPassword });
      showToast("Password updated successfully!");
      addAudit("Changed account password", "Security");
      setModal(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Failed to update password.");
    }
  };

  const getSettingsSnapshot = () => ({
    hotel, preferences, localization, security, payment, emailSettings, printerSettings,
    restaurantSettings, billingSettings, reservationSettings, guestSettings, housekeepingSettings,
    backupSchedule, rolePermissions, notifications,
  });

  const restoreSettingsSnapshot = (snapshot: any) => {
    if (!snapshot) return;
    setHotel(snapshot.hotel);
    setPreferences(snapshot.preferences);
    setLocalization(snapshot.localization);
    setSecurity(snapshot.security);
    setPayment(snapshot.payment);
    setEmailSettings(snapshot.emailSettings);
    setPrinterSettings(snapshot.printerSettings);
    setRestaurantSettings(snapshot.restaurantSettings);
    setBillingSettings(snapshot.billingSettings);
    setReservationSettings(snapshot.reservationSettings);
    setGuestSettings(snapshot.guestSettings);
    setHousekeepingSettings(snapshot.housekeepingSettings);
    setBackupSchedule(snapshot.backupSchedule);
    setRolePermissions(snapshot.rolePermissions);
    setNotifications(snapshot.notifications);
  };

  const cloneSnapshot = (value: any) => JSON.parse(JSON.stringify(value));

  if (savedSnapshotRef.current === null) {
    savedSnapshotRef.current = cloneSnapshot(getSettingsSnapshot());
  }

  useEffect(() => {
    if (refreshBaselineRef.current) {
      savedSnapshotRef.current = cloneSnapshot(getSettingsSnapshot());
      refreshBaselineRef.current = false;
    }
  });

  const requestSave = (message: string, action: () => boolean | void) => {
    setSaveMessage(message);
    setSaveAction(() => action);
    setModal("save");
  };

  const confirmSave = () => {
    const action = saveAction;
    const result = action?.();
    if (result === false) {
      setModal("save");
      return;
    }
    setSaveAction(null);
    setSaveMessage("");
    setModal(null);
    refreshBaselineRef.current = true;
    showToast("✓ Changes saved successfully.");
  };

  const discardSave = () => {
    restoreSettingsSnapshot(savedSnapshotRef.current);
    setSaveAction(null);
    setSaveMessage("");
    setValidationErrors({});
    setModal(null);
    showToast("Changes discarded.");
  };

  // Validations: Hotel Name (characters & spaces), Phone/Alt Phone (10 digits), Email/Website (lowercase only), GST (15 char breakdown structure)
  const validateHotel = () => {
    const e: Record<string, string> = {};
    if (!hotel.name.trim()) e.name = "Hotel name is required.";
    else if (!/^[A-Za-z\s]+$/.test(hotel.name)) e.name = "Only characters and spaces allowed.";

    if (!/^[6-9]\d{9}$/.test(hotel.phone.trim())) e.phone = "10 digit number starting with 6, 7, 8, or 9 is required.";
    if (hotel.alternatePhone && !/^[6-9]\d{9}$/.test(hotel.alternatePhone.trim())) e.alternatePhone = "10 digit number starting with 6, 7, 8, or 9 is required.";

    if (hotel.email && /[A-Z]/.test(hotel.email)) e.email = "Upper characters are not allowed.";
    else if (hotel.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotel.email.trim())) e.email = "Enter a valid email address.";

    if (hotel.website && /[A-Z]/.test(hotel.website)) e.website = "Upper characters are not allowed.";

    if (hotel.pincode && !/^\d{6}$/.test(hotel.pincode.trim())) e.pincode = "Pincode must be exactly 6 digits.";
    
    // GST 15 char structure validation: 2 digits state + 10 char PAN + 1 char alphanumeric (1-9, A-Z) + Z + 1 checksum char
    const rawGst = resolveGstForSave(hotel.gst, originalHotelGst);
    if (rawGst && !isValidGstin(rawGst)) {
      e.gst = "Invalid GSTIN format. (First 2 digits State, next 10 PAN, 13th 1-9/A-Z, 14th Z, 15th Checksum)";
    } else if (rawGst && rawGst !== hotel.gst) {
      setHotel(h => ({ ...h, gst: rawGst }));
      setOriginalHotelGst(rawGst);
    }
    if (hotel.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(hotel.pan.trim().toUpperCase())) e.pan = "Enter a valid PAN format.";
    setValidationErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = (message: string, module?: string) => {
    addAudit(message, module || activeLabel);
    showToast("✓ " + message);
  };

  const activeLabel = NAV_ITEMS.find(x => x.key === active)?.label || "Settings";

  const openAddUser = () => {
    setSelectedUser(null);
    setValidationErrors({});
    setUserForm({ name: "", email: "", role: "Receptionist", branch: "Main Property", department: "Front Desk", status: "Active" });
    setModal("user");
  };

  const openEditUser = (u: UserRecord) => {
    setSelectedUser(u);
    setValidationErrors({});
    setUserForm({ name: u.name, email: u.email, role: u.role, branch: u.branch, department: u.department, status: u.status });
    setModal("user");
  };

  const openViewUser = (u: UserRecord) => {
    setViewedUser(u);
    setModal("view_user");
  };

  const saveUser = () => {
    const e: Record<string, string> = {};
    if (!userForm.name.trim()) e.userName = "Full name is required.";
    else if (!/^[A-Za-z\s]+$/.test(userForm.name)) e.userName = "Only characters and spaces allowed.";

    if (!userForm.email.trim()) e.userEmail = "Email is required.";
    else if (/[A-Z]/.test(userForm.email)) e.userEmail = "Upper characters are not allowed.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) e.userEmail = "Enter a valid email address.";
    else if (users.some(u => u.email.toLowerCase() === userForm.email.trim().toLowerCase() && u.id !== selectedUser?.id)) e.userEmail = "This email is already assigned to another user.";
    
    setValidationErrors(e);
    if (Object.keys(e).length) return showToast("Please correct the highlighted fields.");
    if (selectedUser) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...userForm } : u));
      save("Updated user", "User Management");
    } else {
      setUsers(prev => [...prev, { id: Date.now(), ...userForm }]);
      save("Created new user", "User Management");
    }
    setModal(null);
  };

  const deleteUser = (id: number) => askConfirm("Delete this user permanently?", () => {
    setUsers(prev => prev.filter(u => u.id !== id));
    addAudit("Deleted user", "User Management", "Warning");
    showToast("User deleted.");
    setModal(null);
  });

  const exportUsersCSV = () => {
    const headers = ["ID", "Name", "Email", "Role", "Branch", "Department", "Status"];
    const rows = filteredUsers.map(u => [u.id, `"${u.name}"`, `"${u.email}"`, `"${u.role}"`, `"${u.branch}"`, `"${u.department}"`, u.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Users exported successfully.");
  };

  const openAddRoom = () => {
    setSelectedRoom(null);
    setValidationErrors({});
    setRoomForm({ name: "", code: "", baseRate: "2500", capacity: "2", status: "Active" });
    setModal("room");
  };

  const openEditRoom = (r: RoomType) => {
    setSelectedRoom(r);
    setValidationErrors({});
    setRoomForm({ name: r.name, code: r.code, baseRate: String(r.baseRate), capacity: String(r.capacity), status: r.status });
    setModal("room");
  };

  const saveRoom = () => {
    const e: Record<string, string> = {};
    if (!roomForm.name.trim()) e.roomName = "Room name is required.";
    if (!/^[A-Z0-9-]{2,10}$/.test(roomForm.code.trim().toUpperCase())) e.roomCode = "Use 2-10 letters, numbers or hyphens.";
    if (rooms.some(r => r.code.toLowerCase() === roomForm.code.trim().toLowerCase() && r.id !== selectedRoom?.id)) e.roomCode = "This room code already exists.";
    if (!roomForm.baseRate || Number(roomForm.baseRate) <= 0) e.baseRate = "Base rate must be greater than 0.";
    if (!roomForm.capacity || Number(roomForm.capacity) < 1 || Number(roomForm.capacity) > 20) e.capacity = "Capacity must be between 1 and 20.";
    setValidationErrors(e);
    if (Object.keys(e).length) return showToast("Please correct the highlighted fields.");
    const record = { id: selectedRoom?.id || Date.now(), name: roomForm.name.trim(), code: roomForm.code.trim().toUpperCase(), baseRate: Number(roomForm.baseRate), capacity: Number(roomForm.capacity), status: roomForm.status };
    setRooms(prev => selectedRoom ? prev.map(r => r.id === selectedRoom.id ? record : r) : [...prev, record]);
    save(selectedRoom ? "Updated room type" : "Created room type", "Room Settings");
    setModal(null);
  };

  const deleteRoom = (id: number) => askConfirm("Delete this room type?", () => {
    setRooms(prev => prev.filter(r => r.id !== id));
    save("Deleted room type", "Room Settings");
    setModal(null);
  });

  const openAddTax = () => {
    setSelectedTax(null);
    setValidationErrors({});
    setTaxForm({ name: "", type: "Percentage", rate: "18", appliesTo: "Room Booking", status: "Active" });
    setModal("tax");
  };

  const openEditTax = (t: TaxRecord) => {
    setSelectedTax(t);
    setValidationErrors({});
    setTaxForm({ name: t.name, type: t.type, rate: String(t.rate), appliesTo: t.appliesTo, status: t.status });
    setModal("tax");
  };

  const saveTax = () => {
    const e: Record<string, string> = {};
    const rate = Number(taxForm.rate);
    if (!taxForm.name.trim()) e.taxName = "Tax / charge name is required.";
    if (taxes.some(t => t.name.toLowerCase() === taxForm.name.trim().toLowerCase() && t.id !== selectedTax?.id)) e.taxName = "This tax / charge name already exists.";
    if (!Number.isFinite(rate) || rate < 0 || (taxForm.type === "Percentage" && rate > 100)) e.taxRate = taxForm.type === "Percentage" ? "Percentage must be between 0 and 100." : "Rate must be 0 or greater.";
    setValidationErrors(e);
    if (Object.keys(e).length) return showToast("Please correct the highlighted fields.");
    const record = { id: selectedTax?.id || Date.now(), name: taxForm.name.trim(), type: taxForm.type, rate, appliesTo: taxForm.appliesTo, status: taxForm.status };
    setTaxes(prev => selectedTax ? prev.map(t => t.id === selectedTax.id ? record : t) : [...prev, record]);
    save(selectedTax ? "Updated tax rule" : "Created tax rule", "Tax & Charges");
    setModal(null);
  };

  const deleteTax = (id: number) => askConfirm("Delete this tax rule?", () => {
    setTaxes(prev => prev.filter(t => t.id !== id));
    save("Deleted tax rule", "Tax & Charges");
    setModal(null);
  });

  const resetAllSettings = () => {
    askConfirm("Reset editable settings to the demo defaults?", () => {
      setPreferences({
        autoSave: true, deleteConfirmation: true, sessionTimeout: "30", bookingPrefix: "HSB", bookingAutoNumber: true,
        overbooking: false, idVerification: true, guestSignature: true, depositRequired: true, earlyCheckIn: true, lateCheckOut: true,
        defaultDashboard: "Hotel Dashboard", defaultLanguage: "English",
      });
      setLocalization({ language: "English", currency: "INR (₹)", dateFormat: "DD/MM/YYYY", timeFormat: "12 Hour", timezone: "Asia/Kolkata" });
      showToast("Settings reset to defaults.");
      setModal(null);
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusinessLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      const msg = "Invalid format. Only PNG, JPG, and JPEG images are supported.";
      setBusinessLogoError(msg);
      showToast(msg);
      if (e.target) e.target.value = "";
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      const msg = "File size exceeds 2MB limit. Please upload a smaller image.";
      setBusinessLogoError(msg);
      showToast(msg);
      if (e.target) e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setHotel((h) => ({ ...h, logoUrl: base64 }));
      localStorage.setItem("business_logo", base64);
      localStorage.setItem("billing_logo", base64);
      try {
        await settingsService.saveSetting("BUSINESS", "LOGO", base64);
        await settingsService.saveSetting("BILLING", "BILL_LOGO", base64);
        showToast("Business logo uploaded & saved persistently!");
        window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logo: base64 } }));
        window.dispatchEvent(new CustomEvent("billing-logo-updated", { detail: { logo: base64 } }));
      } catch (err) {
        console.error("Failed to save logo to backend:", err);
        showToast("Logo saved locally, but failed to sync to backend.");
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    setBusinessLogoError("");
    setHotel((h) => ({ ...h, logoUrl: "" }));
    localStorage.removeItem("business_logo");
    localStorage.removeItem("billing_logo");
    try {
      await settingsService.saveSetting("BUSINESS", "LOGO", "");
      await settingsService.saveSetting("BILLING", "BILL_LOGO", "");
      showToast("Business logo removed successfully.");
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logo: "" } }));
      window.dispatchEvent(new CustomEvent("billing-logo-updated", { detail: { logo: "" } }));
    } catch (err) {
      console.error("Failed to remove logo from backend:", err);
      showToast("Logo removed locally.");
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileImgError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      const msg = "Invalid format. Only PNG, JPG, and JPEG images are supported.";
      setProfileImgError(msg);
      showToast(msg);
      if (e.target) e.target.value = "";
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      const msg = "File size exceeds 2MB limit. Please upload a smaller image.";
      setProfileImgError(msg);
      showToast(msg);
      if (e.target) e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setProfileImage(base64);
      localStorage.setItem("user_profile_image", base64);
      const userProfileKey = "PROFILE_IMAGE_" + (user?.id || user?.username || "CURRENT");
      try {
        await settingsService.saveSetting("USER_PROFILE", userProfileKey, base64);
        showToast("Profile image updated & saved persistently!");
        window.dispatchEvent(new CustomEvent("profile-image-updated", { detail: { image: base64 } }));
      } catch (err) {
        console.error("Failed to save profile image to backend:", err);
        showToast("Profile image saved locally.");
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleRemoveProfileImage = async () => {
    setProfileImgError("");
    setProfileImage("");
    localStorage.removeItem("user_profile_image");
    const userProfileKey = "PROFILE_IMAGE_" + (user?.id || user?.username || "CURRENT");
    try {
      await settingsService.saveSetting("USER_PROFILE", userProfileKey, "");
      showToast("Profile image removed successfully.");
      window.dispatchEvent(new CustomEvent("profile-image-updated", { detail: { image: "" } }));
    } catch (err) {
      console.error("Failed to remove profile image from backend:", err);
      showToast("Profile image removed locally.");
    }
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={label || "Toggle"}
      style={{
        width: 44, height: 24, borderRadius: 20, border: "none", cursor: "pointer", padding: 3,
        background: checked ? COLORS.purple : "#c9ccd7", transition: "0.2s", display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start", alignItems: "center",
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,.18)" }} />
    </button>
  );

  const Button = ({
    children, onClick, variant = "primary", icon, disabled = false, size = "md",
  }: {
    children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost" | "dark";
    icon?: React.ReactNode; disabled?: boolean; size?: "sm" | "md";
  }) => {
    const bg = variant === "primary" ? COLORS.purple : variant === "dark" ? COLORS.navy : variant === "danger" ? COLORS.danger : "#fff";
    const color = ["primary", "dark", "danger"].includes(variant) ? "#fff" : variant === "ghost" ? COLORS.purple : COLORS.text;
    return (
      <button
        type="button" onClick={onClick} disabled={disabled}
        style={{
          height: size === "sm" ? 36 : 42, padding: "0 14px", borderRadius: 10, border: variant === "ghost" ? "none" : `1px solid ${variant === "secondary" ? COLORS.border : bg}`,
          background: variant === "ghost" ? "transparent" : bg, color, fontWeight: 700, fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? .5 : 1,
        }}
      >
        {icon}{children}
      </button>
    );
  };

  const Field = ({ label, required, children, hint, error }: { label: string; required?: boolean; children: React.ReactNode; hint?: string; error?: string }) => (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 7, color: "#40465c" }}>
        {label} {required && <span style={{ color: COLORS.danger }}>*</span>}
      </label>
      {children}
      {error && <div style={{ marginTop: 5, fontSize: 11, color: COLORS.danger, fontWeight: 700 }}>{error}</div>}
      {hint && <div style={{ marginTop: 5, fontSize: 11, color: COLORS.muted }}>{hint}</div>}
    </div>
  );

  const Select = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...css.input, appearance: "auto" }}>
      {children}
    </select>
  );

  const TextInput = ({
    value, onChange, placeholder, type = "text", validationType, disabled,
  }: {
    value: string;
    onChange?: (v: string) => void;
    placeholder?: string;
    type?: string;
    validationType?: "charsOnly" | "digits10" | "noUpper" | "gst";
    disabled?: boolean;
  }) => (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => {
        if (!onChange) return;
        let val = e.target.value;
        if (validationType === "charsOnly") {
          val = val.replace(/[^A-Za-z\s]/g, "");
        } else if (validationType === "digits10") {
          val = sanitizeMobileInput(val);
        } else if (validationType === "noUpper") {
          val = val.toLowerCase();
        } else if (validationType === "gst") {
          val = val.toUpperCase().slice(0, 15);
        }
        onChange(val);
      }}
      style={{
        ...css.input,
        background: disabled ? "#f8f9fc" : "#fff",
        color: disabled ? COLORS.muted : COLORS.text,
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
  );

  const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 15, marginBottom: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, letterSpacing: "-.2px" }}>{title}</h2>
        {subtitle && <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );

  const PageTitle = ({ title, subtitle, icon: Icon = Settings, action }: { title: string; subtitle: string; icon?: React.ElementType; action?: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: COLORS.purpleSoft, color: COLORS.purple, display: "grid", placeItems: "center" }}><Icon size={22} /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-.6px" }}>{title}</h1>
          <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13 }}>{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );

  const SettingRow = ({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ paddingRight: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, note, onClick }: { title: string; value: string; icon: React.ElementType; note: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick} style={{ ...css.card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", border: `1px solid ${COLORS.border}`, cursor: onClick ? "pointer" : "default", color: COLORS.text, background: "#fff" }}>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 25, fontWeight: 900, marginTop: 5 }}>{value}</div>
        <div style={{ color: COLORS.success, fontSize: 11, fontWeight: 700, marginTop: 5 }}>{note}</div>
      </div>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: COLORS.purpleSoft, color: COLORS.purple, display: "grid", placeItems: "center" }}><Icon size={21} /></div>
    </button>
  );

  const Table = ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
        {children}
      </table>
    </div>
  );

  const Th = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, background: "#fafbfc", color: COLORS.muted, fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {children}
    </th>
  );

  const Td = ({ children }: { children: React.ReactNode }) => (
    <td style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, verticalAlign: "middle" }}>
      {children}
    </td>
  );

  const Avatar = ({ name }: { name: string }) => {
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return (
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.purpleSoft, color: COLORS.purple, fontWeight: 800, fontSize: 13, display: "grid", placeItems: "center" }}>
        {initials}
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: Status }) => (
    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: status === "Active" ? COLORS.successSoft : COLORS.dangerSoft, color: status === "Active" ? COLORS.success : COLORS.danger }}>
      {status}
    </span>
  );

  const ActionButtons = ({ onView, onEdit, onDelete }: { onView?: () => void; onEdit?: () => void; onDelete?: () => void }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {onView && <button type="button" onClick={onView} title="View" style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.purple, padding: 4 }}><Eye size={16} /></button>}
      {onEdit && <button type="button" onClick={onEdit} title="Edit" style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.muted, padding: 4 }}><Edit3 size={16} /></button>}
      {onDelete && <button type="button" onClick={onDelete} title="Delete" style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.danger, padding: 4 }}><Trash2 size={16} /></button>}
    </div>
  );

  const SettingsCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div style={{ ...css.card, padding: 22 }}>
      <SectionHeader title={title} />
      <div style={{ display: "grid", gap: 16 }}>
        {children}
      </div>
    </div>
  );

  const HealthCard = ({ title, value, icon: Icon, ok }: { title: string; value: string; icon: React.ElementType; ok: boolean }) => (
    <div style={{ ...css.card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: ok ? COLORS.successSoft : COLORS.warningSoft, color: ok ? COLORS.success : COLORS.warning, display: "grid", placeItems: "center" }}>
        <Icon size={20} />
      </div>
    </div>
  );

  const Modal = ({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,35,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ ...css.card, width: "100%", maxWidth: wide ? 1100 : 540, maxHeight: "90vh", overflowY: "auto", padding: 24, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.muted }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );

  const renderDashboard = () => {
    const query = globalSearch.trim().toLowerCase();
    const categories = NAV_ITEMS.filter(x => x.key !== "dashboard" && (!query || x.label.toLowerCase().includes(query)));
    return (
      <>
        <PageTitle title="Settings" subtitle="Configure and control every part of your hotel management system." action={<Button icon={<Save size={16} />} onClick={() => requestSave("All settings saved", () => save("All settings saved"))}>Save All Changes</Button>} />

        {/* Prominent Licence & Subscription Hero Card matching user screenshot */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1.5px solid #BBF7D0",
            boxShadow: "0 4px 16px rgba(22, 101, 52, 0.06)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "280px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "#DCFCE7",
                border: "2px solid #86EFAC",
                display: "grid",
                placeItems: "center",
                fontSize: "26px",
                color: "#16A34A",
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#166534" }}>
                  Licensed Enterprise Version
                </h3>
                <span
                  style={{
                    background: "#DCFCE7",
                    color: "#15803D",
                    border: "1px solid #86EFAC",
                    borderRadius: "9999px",
                    padding: "2px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  ⚡ {licenceInfo.subscriptionStatus || "Active"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#4B5563" }}>
                Full unlimited features enabled. All trial restrictions removed.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                PLAN NAME
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#16A34A" }}>
                {licenceInfo.trialStatus === "Active" ? "TRIAL" : licenceInfo.subscriptionPlan}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                VALIDITY
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>
                {licenceInfo.trialStatus === "Active"
                  ? `${Math.min(28, Math.max(0, licenceInfo.daysRemaining))} Days Remaining`
                  : licenceInfo.trialStatus === "Expired"
                  ? "Expired"
                  : "28 Days Free Trial"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                LICENSE STATUS
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: licenceInfo.trialStatus === "Expired" ? "#DC2626" : "#16A34A",
                }}
              >
                {licenceInfo.subscriptionStatus}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={licenceLoading}
                onClick={() => {
                  if (licenceInfo.trialStatus === "Not Started") {
                    handleStartTrial();
                  } else {
                    handleRenewSubscription();
                  }
                }}
                style={{
                  background: "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "9px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                }}
              >
                🔄 {licenceInfo.trialStatus === "Not Started" ? t('startFreeTrial', 'Start Free Trial') : t('upgradePlanRenew', 'Renew License / Upgrade Plan')}
              </button>
              <button
                type="button"
                onClick={() => navigate("/hotel/plans")}
                style={{
                  background: "#1E293B",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "9px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ⬆️ {t('upgradePlan', 'Upgrade Plan')}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 22 }}>
          <StatCard title="Hotel Setup" value="95%" icon={Building2} note="Almost complete" onClick={() => { setActive("hotel"); setSettingsPopup("hotel"); }} />
          <StatCard title="Active Users" value={String(users.filter(u => u.status === "Active").length)} icon={Users} note="Access controlled" onClick={() => { setActive("users"); setSettingsPopup("users"); }} />
          <StatCard title="Integrations" value="08" icon={Zap} note="7 connected" onClick={() => { setActive("restaurant"); setSettingsPopup("restaurant"); }} />
          <StatCard title="Licence" value="Active" icon={Shield} note="Trial verified" onClick={() => { setActive("licence"); setSettingsPopup("licence"); }} />
        </div>

        <div style={{ ...css.card, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
            <Search size={18} color={COLORS.muted} />
            <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search settings, users, rooms, billing, system..." style={{ ...css.input, border: "none", paddingLeft: 0, height: 38 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {categories.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.key} type="button" onClick={() => {
                  if (item.key === "reports") {
                    navigate("/settings/gst");
                    return;
                  }
                  setActive(item.key); setSettingsPopup(item.key);
                }}
                  style={{ textAlign: "left", padding: 17, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer", transition: ".2s", minHeight: 132 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.purple; e.currentTarget.style.boxShadow = "0 7px 20px rgba(184,92,20,.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", background: COLORS.purpleSoft, color: COLORS.purple, borderRadius: 10 }}><Icon size={18} /></span>
                    <ChevronRight size={16} color={COLORS.muted} />
                  </div>
                  <div style={{ marginTop: 13, fontWeight: 800, fontSize: 13 }}>{item.label}</div>
                  <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>Configure settings</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 20 }}>
          <div style={{ ...css.card, padding: 20 }}>
            <SectionHeader title="Quick Configuration" subtitle="Most frequently used hotel controls." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SettingRow title="Auto Save" description="Automatically save configuration changes." checked={preferences.autoSave} onChange={v => setPreferences(p => ({ ...p, autoSave: v }))} />
              <SettingRow title="Booking Auto Number" description="Generate reservation numbers automatically." checked={preferences.bookingAutoNumber} onChange={v => setPreferences(p => ({ ...p, bookingAutoNumber: v }))} />
              <SettingRow title="ID Verification" description="Require guest ID during check-in." checked={preferences.idVerification} onChange={v => setPreferences(p => ({ ...p, idVerification: v }))} />
              <SettingRow title="2FA Security" description="Require two-factor authentication." checked={security.twoFactor} onChange={v => setSecurity(s => ({ ...s, twoFactor: v }))} />
            </div>
          </div>
          <div style={{ ...css.card, padding: 20 }}>
            <SectionHeader title="System Health" subtitle="Configuration indicators." />
            {[
              ["Database", "Operational", COLORS.success],
              ["API Services", "7 / 8 Connected", COLORS.success],
              ["Backup", "Last backup today", COLORS.success],
              ["Storage", "32% used", COLORS.warning],
            ].map(([name, status, color]) => (
              <div key={String(name)} style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
                <span style={{ color: String(color), fontWeight: 800, fontSize: 12 }}>{status}</span>
              </div>
            ))}
            <div style={{ marginTop: 18 }}>
              <Button variant="secondary" icon={<Activity size={15} />} onClick={() => { setActive("maintenance"); }}>View System Health</Button>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderHotel = () => (
    <>
      <PageTitle title="Hotel Profile" subtitle="Manage your hotel's identity, contact information and operational timings." icon={Building2} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Hotel profile saved", () => { if (!validateHotel()) return false; save("Hotel profile saved"); return true; })}>Save Changes</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 20 }}>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Basic Information" subtitle="Core hotel registration and business details." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Hotel Name" required error={validationErrors.name}>
              <TextInput value={hotel.name} onChange={v => setHotel(h => ({ ...h, name: v }))} validationType="charsOnly" placeholder="Only characters allowed" />
            </Field>
            <Field label="Hotel Type"><Select value={hotel.type} onChange={v => setHotel(h => ({ ...h, type: v }))}><option>Luxury Hotel</option><option>Business Hotel</option><option>Resort</option><option>Boutique Hotel</option></Select></Field>
            <Field label="Registration Number"><TextInput value={hotel.registration} onChange={v => setHotel(h => ({ ...h, registration: v }))} /></Field>
            <Field label="Star Rating"><Select value={hotel.rating} onChange={v => setHotel(h => ({ ...h, rating: v }))}><option>5 Star</option><option>4 Star</option><option>3 Star</option><option>2 Star</option></Select></Field>
            <Field label="GST Number" error={validationErrors.gst} hint="15 Chars breakdown: State(2) + PAN(10) + Reg(1) + Z(1) + Checksum(1)">
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={
                    hotelGstFocused || hotelGstRevealed
                      ? (hotel.gst || "")
                      : maskGstNumber(hotel.gst)
                  }
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  maxLength={15}
                  onFocus={() => setHotelGstFocused(true)}
                  onBlur={() => {
                    setHotelGstFocused(false);
                    const raw = resolveGstForSave(hotel.gst, originalHotelGst);
                    if (raw && !isValidGstin(raw)) {
                      setValidationErrors(prev => ({
                        ...prev,
                        gst: "Invalid GSTIN format. (First 2 digits State, next 10 PAN, 13th 1-9/A-Z, 14th Z, 15th Checksum)",
                      }));
                    }
                  }}
                  onChange={e => {
                    let val = e.target.value.toUpperCase();
                    if (isMaskedGst(val)) {
                      val = originalHotelGst || hotel.gst;
                    } else {
                      val = val.slice(0, 15);
                    }
                    setHotel(h => ({ ...h, gst: val }));
                    if (validationErrors.gst && (val.length === 0 || isValidGstin(val))) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next.gst;
                        return next;
                      });
                    }
                  }}
                  style={{
                    ...css.input,
                    fontFamily: "monospace",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    paddingRight: 40,
                  }}
                />
                {hotel.gst && (
                  <button
                    type="button"
                    onClick={() => setHotelGstRevealed(!hotelGstRevealed)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: COLORS.muted,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title={hotelGstRevealed ? "Mask GST Number" : "Reveal Full GST Number"}
                  >
                    {hotelGstRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </Field>
            <Field label="PAN Number" error={validationErrors.pan}><TextInput value={hotel.pan} onChange={v => setHotel(h => ({ ...h, pan: v }))} /></Field>
            <Field label="Phone" required error={validationErrors.phone}>
              <TextInput value={hotel.phone} onChange={v => setHotel(h => ({ ...h, phone: v }))} validationType="digits10" placeholder="10 digit number" />
            </Field>
            <Field label="Alternate Phone" error={validationErrors.alternatePhone}>
              <TextInput value={hotel.alternatePhone} onChange={v => setHotel(h => ({ ...h, alternatePhone: v }))} validationType="digits10" placeholder="10 digit number" />
            </Field>
            <Field label="Email" error={validationErrors.email}>
              <TextInput value={hotel.email} onChange={v => setHotel(h => ({ ...h, email: v }))} validationType="noUpper" placeholder="No uppercase allowed" />
            </Field>
            <Field label="Website" error={validationErrors.website}>
              <TextInput value={hotel.website} onChange={v => setHotel(h => ({ ...h, website: v }))} validationType="noUpper" placeholder="No uppercase allowed" />
            </Field>
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionHeader title="Address" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Address"><TextInput value={hotel.address} onChange={v => setHotel(h => ({ ...h, address: v }))} /></Field>
              <Field label="City"><TextInput value={hotel.city} onChange={v => setHotel(h => ({ ...h, city: v }))} /></Field>
              <Field label="State"><TextInput value={hotel.state} onChange={v => setHotel(h => ({ ...h, state: v }))} /></Field>
              <Field label="Country"><TextInput value={hotel.country} onChange={v => setHotel(h => ({ ...h, country: v }))} /></Field>
              <Field label="Pincode" error={validationErrors.pincode}><TextInput value={hotel.pincode} onChange={v => setHotel(h => ({ ...h, pincode: v }))} /></Field>
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionHeader title="Hotel Description" />
            <textarea value={hotel.description} onChange={e => setHotel(h => ({ ...h, description: e.target.value }))} style={{ ...css.input, height: 100, padding: 12, resize: "vertical" }} />
          </div>
        </div>

        <div>
          <div style={{ ...css.card, padding: 22, marginBottom: 20 }}>
            <SectionHeader
              title="Business / Hotel Logo"
              subtitle="Upload business logo for bills, receipts and platform branding (PNG, JPG, JPEG up to 2MB)."
            />
            <div
              style={{
                minHeight: 160,
                border: `1.5px dashed #cfd1dc`,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "#fafaff",
                padding: "20px 14px",
                overflow: "hidden",
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                {hotel.logoUrl ? (
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        maxWidth: 220,
                        maxHeight: 110,
                        margin: "0 auto 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 12px",
                        background: "#fff",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <img
                        src={hotel.logoUrl}
                        alt="Business Logo Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 90,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Upload size={14} />}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Replace Logo
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={handleRemoveLogo}
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 18,
                        margin: "0 auto 10px",
                        background: `linear-gradient(135deg, ${COLORS.purple}, #9b78f5)`,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Building2 size={30} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: COLORS.text }}>
                      No Business Logo Uploaded
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload size={14} />}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Upload Business Logo
                    </Button>
                  </div>
                )}
                {businessLogoError && (
                  <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                    {businessLogoError}
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>
          <div style={{ ...css.card, padding: 22 }}>
            <SectionHeader title="Hotel Operations" />
            <div style={{ display: "grid", gap: 15 }}>
              <Field label="Number of Floors"><TextInput value={String(hotel.floors)} onChange={v => setHotel(h => ({ ...h, floors: Number(v) || 0 }))} type="number" /></Field>
              <Field label="Number of Rooms"><TextInput value={String(hotel.rooms)} onChange={v => setHotel(h => ({ ...h, rooms: Number(v) || 0 }))} type="number" /></Field>
              <Field label="Check-in Time"><TextInput value={hotel.checkIn} onChange={v => setHotel(h => ({ ...h, checkIn: v }))} /></Field>
              <Field label="Check-out Time"><TextInput value={hotel.checkOut} onChange={v => setHotel(h => ({ ...h, checkOut: v }))} /></Field>
              <Field label="Grace Period (minutes)"><TextInput value={hotel.grace} onChange={v => setHotel(h => ({ ...h, grace: v }))} type="number" /></Field>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = userFilterRole === "All" || u.role === userFilterRole;
    const matchesStatus = userFilterStatus === "All" || u.status === userFilterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const renderUsers = () => (
    <>
      <PageTitle title="User Management" subtitle="Create users, assign access and control account status." icon={Users} action={<Button icon={<Plus size={16} />} onClick={openAddUser}>Add User</Button>} />
      <div style={{ ...css.card, padding: 24 }}>
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 280, flex: 1 }}>
            <Search size={17} color={COLORS.muted} />
            <input value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} placeholder="Search users by name or email..." style={{ ...css.input, height: 38 }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={userFilterRole} onChange={e => setUserFilterRole(e.target.value)} style={{ ...css.input, width: 150, height: 38, appearance: "auto" }}>
              <option value="All">All Roles</option>
              <option value="Hotel Admin">Hotel Admin</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Restaurant Manager">Restaurant Manager</option>
              <option value="Housekeeping">Housekeeping</option>
            </select>
            <select value={userFilterStatus} onChange={e => setUserFilterStatus(e.target.value)} style={{ ...css.input, width: 130, height: 38, appearance: "auto" }}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <Button variant="secondary" icon={<Download size={15} />} onClick={exportUsersCSV}>Export</Button>
          </div>
        </div>
        <Table>
          <thead><tr><Th>User</Th><Th>Role</Th><Th>Branch</Th><Th>Department</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {filteredUsers.map(u => <tr key={u.id}>
              <Td><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar name={u.name} /><div><b>{u.name}</b><div style={{ fontSize: 11, color: COLORS.muted }}>{u.email}</div></div></div></Td>
              <Td>{u.role}</Td><Td>{u.branch}</Td><Td>{u.department}</Td><Td><StatusBadge status={u.status} /></Td>
              <Td><ActionButtons onView={() => openViewUser(u)} onEdit={() => openEditUser(u)} onDelete={() => deleteUser(u.id)} /></Td>
            </tr>)}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: COLORS.muted }}>No matching users found.</td></tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );

  const renderRoles = () => {
    const modules = Object.keys(rolePermissions);
    const permissions = ["View", "Create", "Edit", "Delete", "Export", "Approve", "Cancel"];
    const togglePermission = (module: string, perm: string) => {
      setRolePermissions(prev => {
        const current = prev[module] || [];
        return { ...prev, [module]: current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm] };
      });
    };
    return (
      <>
        <PageTitle title="Roles & Permissions" subtitle="Control granular access for every hotel module." icon={Shield} action={<Button icon={<Save size={16} />} onClick={() => requestSave(`Permissions saved for ${roleName}`, () => save(`Permissions saved for ${roleName}`))}>Save Permissions</Button>} />
        <div style={{ display: "grid", gridTemplateColumns: ".3fr .7fr", gap: 20 }}>
          <div style={{ ...css.card, padding: 20 }}>
            <SectionHeader title="Roles" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal("role")}>Add Role</Button>} />
            {["Super Admin", "Hotel Admin", "Manager", "Receptionist", "Housekeeping", "Restaurant Manager", "Cashier", "Accountant", "Custom Role"].map((role, i) => (
              <button key={role} type="button" onClick={() => setRoleName(role)} style={{ width: "100%", padding: "13px 12px", textAlign: "left", border: "none", borderRadius: 10, marginBottom: 5, background: roleName === role ? COLORS.purpleSoft : "transparent", color: roleName === role ? COLORS.purple : COLORS.text, cursor: "pointer", fontWeight: 750, fontSize: 13 }}>
                {role}{i < 2 && <span style={{ float: "right", fontSize: 10, color: COLORS.muted }}>SYSTEM</span>}
              </button>
            ))}
          </div>
          <div style={{ ...css.card, overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><b style={{ fontSize: 17 }}>{roleName}</b><div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Module-level access matrix</div></div>
              <Button variant="secondary" icon={<Check size={15} />} onClick={() => { Object.keys(rolePermissions).forEach(() => {}); save(`Permission changes applied for ${roleName}`); }}>Apply</Button>
            </div>
            <Table>
              <thead><tr><Th>Module</Th>{permissions.map(p => <Th key={p}>{p}</Th>)}</tr></thead>
              <tbody>{modules.map(module => <tr key={module}>
                <Td><b>{module}</b></Td>
                {permissions.map(p => <Td key={p}><button type="button" onClick={() => togglePermission(module, p)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${rolePermissions[module]?.includes(p) ? COLORS.purple : COLORS.border}`, background: rolePermissions[module]?.includes(p) ? COLORS.purple : "#fff", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>{rolePermissions[module]?.includes(p) && <Check size={15} />}</button></Td>)}
              </tr>)}</tbody>
            </Table>
          </div>
        </div>
      </>
    );
  };

  const renderPreferences = () => (
    <>
      <PageTitle title="System Preferences" subtitle="Control booking, check-in, session and automation behavior." icon={SlidersHorizontal} action={<Button icon={<Save size={16} />} onClick={() => requestSave("System preferences saved", () => save("System preferences saved"))}>Save Preferences</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SettingsCard title="General Preferences" icon={Settings}>
          <Field label="Default Dashboard"><Select value={preferences.defaultDashboard} onChange={v => setPreferences(p => ({ ...p, defaultDashboard: v }))}><option>Hotel Dashboard</option><option>Front Desk</option><option>Reservations</option></Select></Field>
          <Field label="Default Language"><Select value={preferences.defaultLanguage} onChange={v => setPreferences(p => ({ ...p, defaultLanguage: v }))}><option>English</option><option>Marathi</option><option>Hindi</option></Select></Field>
          <Field label="Session Timeout (minutes)"><TextInput value={preferences.sessionTimeout} onChange={v => setPreferences(p => ({ ...p, sessionTimeout: v }))} type="number" /></Field>
          <Field label="Booking Prefix"><TextInput value={preferences.bookingPrefix} onChange={v => setPreferences(p => ({ ...p, bookingPrefix: v }))} /></Field>
          <SettingRow title="Auto Save" description="Save changes automatically." checked={preferences.autoSave} onChange={v => setPreferences(p => ({ ...p, autoSave: v }))} />
          <SettingRow title="Delete Confirmation" description="Ask before destructive actions." checked={preferences.deleteConfirmation} onChange={v => setPreferences(p => ({ ...p, deleteConfirmation: v }))} />
          <SettingRow title="Auto Booking Number" description="Generate booking numbers automatically." checked={preferences.bookingAutoNumber} onChange={v => setPreferences(p => ({ ...p, bookingAutoNumber: v }))} />
        </SettingsCard>
        <SettingsCard title="Check-in / Check-out" icon={CalendarDays}>
          <SettingRow title="ID Verification Required" description="Verify guest identity during check-in." checked={preferences.idVerification} onChange={v => setPreferences(p => ({ ...p, idVerification: v }))} />
          <SettingRow title="Guest Signature" description="Collect digital guest signature." checked={preferences.guestSignature} onChange={v => setPreferences(p => ({ ...p, guestSignature: v }))} />
          <SettingRow title="Deposit Required" description="Require deposit before check-in." checked={preferences.depositRequired} onChange={v => setPreferences(p => ({ ...p, depositRequired: v }))} />
          <SettingRow title="Early Check-in" description="Allow authorized early arrivals." checked={preferences.earlyCheckIn} onChange={v => setPreferences(p => ({ ...p, earlyCheckIn: v }))} />
          <SettingRow title="Late Check-out" description="Allow authorized late departures." checked={preferences.lateCheckOut} onChange={v => setPreferences(p => ({ ...p, lateCheckOut: v }))} />
          <SettingRow title="Overbooking Control" description="Allow controlled overbooking." checked={preferences.overbooking} onChange={v => setPreferences(p => ({ ...p, overbooking: v }))} />
        </SettingsCard>
      </div>
    </>
  );

  const renderRooms = () => (
    <>
      <PageTitle title="Room Settings" subtitle="Configure room types, rates, capacities and operational statuses." icon={Building2} action={<Button icon={<Plus size={16} />} onClick={openAddRoom}>Add Room Type</Button>} />
      <div style={{ ...css.card, padding: 20, marginBottom: 20 }}>
        <SectionHeader title="Room Status Configuration" subtitle="These statuses can be used throughout Front Desk and Housekeeping." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {["Available", "Occupied", "Reserved", "Dirty", "Cleaning", "Inspection", "Maintenance", "Out of Order"].map((s, i) => (
            <button key={s} type="button" onClick={() => showToast(`${s} status selected.`)} style={{ padding: 13, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 10, cursor: "pointer", textAlign: "left", fontWeight: 750, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, display: "inline-block", borderRadius: "50%", background: i < 3 ? COLORS.success : i < 6 ? COLORS.warning : COLORS.danger, marginRight: 8 }} />{s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...css.card, overflow: "hidden" }}>
        <div style={{ padding: 20 }}><SectionHeader title="Room Types" subtitle="Define sellable room categories and base rates." /></div>
        <Table>
          <thead><tr><Th>Room Type</Th><Th>Code</Th><Th>Base Rate</Th><Th>Capacity</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>{rooms.map(r => <tr key={r.id}><Td><b>{r.name}</b></Td><Td>{r.code}</Td><Td>₹{r.baseRate.toLocaleString("en-IN")}</Td><Td>{r.capacity} Guests</Td><Td><StatusBadge status={r.status} /></Td><Td><ActionButtons onView={() => showToast(`${r.name} room type opened.`)} onEdit={() => openEditRoom(r)} onDelete={() => deleteRoom(r.id)} /></Td></tr>)}</tbody>
        </Table>
      </div>
    </>
  );

  const renderReservations = () => (
    <>
      <PageTitle title="Reservation Settings" subtitle="Configure booking rules, deposits, cancellation and no-show policies." icon={CalendarDays} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Reservation settings saved", () => save("Reservation settings saved"))}>Save Settings</Button>} />
      <div style={{ ...css.card, padding: 22 }}>
        <SectionHeader title="Booking Rules" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <SettingRow title="Automatic Confirmation" description="Confirm reservations after successful creation." checked={reservationSettings.autoConfirmation} onChange={v => setReservationSettings(s => ({ ...s, autoConfirmation: v }))} />
          <SettingRow title="Overbooking" description="Allow controlled overbooking based on inventory." checked={reservationSettings.overbooking} onChange={v => setReservationSettings(s => ({ ...s, overbooking: v }))} />
          <SettingRow title="Deposit Required" description="Collect deposit during booking." checked={reservationSettings.depositRequired} onChange={v => setReservationSettings(s => ({ ...s, depositRequired: v }))} />
          <SettingRow title="No-show Charge" description="Charge configured amount for no-show bookings." checked={reservationSettings.noShowCharge} onChange={v => setReservationSettings(s => ({ ...s, noShowCharge: v }))} />
          <SettingRow title="Early Check-in" description="Permit early arrival subject to availability." checked={reservationSettings.earlyCheckIn} onChange={v => setReservationSettings(s => ({ ...s, earlyCheckIn: v }))} />
          <SettingRow title="Late Check-out" description="Permit late departure with configured charges." checked={reservationSettings.lateCheckOut} onChange={v => setReservationSettings(s => ({ ...s, lateCheckOut: v }))} />
        </div>
        <div style={{ marginTop: 25, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Field label="Cancellation Window (hours)"><TextInput value={reservationSettings.cancellationWindow} onChange={v => setReservationSettings(s => ({ ...s, cancellationWindow: v }))} type="number" /></Field>
          <Field label="No-show Charge (%)"><TextInput value={reservationSettings.noShowPercent} onChange={v => setReservationSettings(s => ({ ...s, noShowPercent: v }))} type="number" /></Field>
          <Field label="Booking Source"><Select value="Website" onChange={() => {}}><option>Website</option><option>Walk-in</option><option>Phone</option><option>OTA</option><option>Travel Agent</option><option>Corporate</option></Select></Field>
        </div>
      </div>
    </>
  );

  const renderGuests = () => (
    <>
      <PageTitle title="Guest Settings" subtitle="Configure guest identity, preferences, VIP and corporate profiles." icon={UserCheck} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Guest settings saved", () => save("Guest settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SettingsCard title="Guest Profile" icon={UserCheck}>
          <SettingRow title="Auto Guest ID" description="Generate unique guest IDs automatically." checked={guestSettings.guestIdAuto} onChange={v => setGuestSettings(s => ({ ...s, guestIdAuto: v }))} />
          <SettingRow title="VIP Guest" description="Enable VIP tags and special handling." checked={guestSettings.vipEnabled} onChange={v => setGuestSettings(s => ({ ...s, vipEnabled: v }))} />
          <SettingRow title="Corporate Guest" description="Enable corporate guest profiles." checked={guestSettings.corporateEnabled} onChange={v => setGuestSettings(s => ({ ...s, corporateEnabled: v }))} />
          <SettingRow title="Guest Preferences" description="Store room and service preferences." checked={guestSettings.preferences} onChange={v => setGuestSettings(s => ({ ...s, preferences: v }))} />
          <SettingRow title="Guest Tags" description="Use tags for segmentation." checked={guestSettings.tags} onChange={v => setGuestSettings(s => ({ ...s, tags: v }))} />
        </SettingsCard>
        <SettingsCard title="ID Proof Types" icon={FileText}>
          <SettingRow title="Passport" description="Accept passport as identity proof." checked={guestSettings.passport} onChange={v => setGuestSettings(s => ({ ...s, passport: v }))} />
          <SettingRow title="Aadhaar" description="Accept Aadhaar as identity proof." checked={guestSettings.aadhaar} onChange={v => setGuestSettings(s => ({ ...s, aadhaar: v }))} />
          <SettingRow title="Driving License" description="Accept driving license." checked={guestSettings.driving} onChange={v => setGuestSettings(s => ({ ...s, driving: v }))} />
          <SettingRow title="Voter ID" description="Accept voter ID." checked={guestSettings.voter} onChange={v => setGuestSettings(s => ({ ...s, voter: v }))} />
        </SettingsCard>
      </div>
    </>
  );

  const renderHousekeeping = () => (
    <>
      <PageTitle title="Housekeeping Settings" subtitle="Manage room cleaning, inspection, task assignment and maintenance workflows." icon={RefreshCw} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Housekeeping settings saved", () => save("Housekeeping settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SettingsCard title="Task Automation" icon={RefreshCw}>
          <SettingRow title="Auto Create Cleaning Task" description="Create tasks when rooms become dirty." checked={housekeepingSettings.autoTask} onChange={v => setHousekeepingSettings(s => ({ ...s, autoTask: v }))} />
          <SettingRow title="Auto Assignment" description="Assign tasks to available staff." checked={housekeepingSettings.autoAssignment} onChange={v => setHousekeepingSettings(s => ({ ...s, autoAssignment: v }))} />
          <SettingRow title="Inspection Required" description="Room must pass inspection before becoming clean." checked={housekeepingSettings.inspection} onChange={v => setHousekeepingSettings(s => ({ ...s, inspection: v }))} />
          <Field label="Cleaning Duration (minutes)"><TextInput value={housekeepingSettings.cleaningDuration} onChange={v => setHousekeepingSettings(s => ({ ...s, cleaningDuration: v }))} type="number" /></Field>
          <Field label="Default Priority" ><Select value={housekeepingSettings.priority} onChange={v => setHousekeepingSettings(s => ({ ...s, priority: v }))}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></Select></Field>
        </SettingsCard>
        <SettingsCard title="Room Workflow" icon={CheckCircle2}>
          {[
            ["Dirty", "Room needs cleaning.", "dirty"],
            ["Cleaning", "Staff is currently cleaning.", "cleaning"],
            ["Inspection", "Supervisor checks room.", "inspected"],
            ["Clean", "Room is ready for sale.", "clean"],
            ["Maintenance", "Room is unavailable for maintenance.", "maintenance"],
          ].map(([title, desc, key]) => <SettingRow key={key} title={title} description={desc} checked={(housekeepingSettings as any)[key]} onChange={v => setHousekeepingSettings(s => ({ ...s, [key]: v }))} />)}
        </SettingsCard>
      </div>
    </>
  );

  const renderRestaurant = () => (
    <>
      <PageTitle title="Restaurant & POS" subtitle="Configure dining modes, KOT, tables and restaurant billing behavior." icon={WalletCards} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Restaurant & POS settings saved", () => save("Restaurant & POS settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SettingsCard title="Order Types" icon={WalletCards}>
          {[
            ["Dine-in", "dineIn"], ["Takeaway", "takeaway"], ["Room Service", "roomService"], ["Delivery", "delivery"],
          ].map(([label, key]) => <SettingRow key={key} title={label} description={`Allow ${label.toLowerCase()} orders.`} checked={(restaurantSettings as any)[key]} onChange={v => setRestaurantSettings(s => ({ ...s, [key]: v }))} />)}
          <Field label="Table Prefix"><TextInput value={restaurantSettings.tablePrefix} onChange={v => setRestaurantSettings(s => ({ ...s, tablePrefix: v }))} /></Field>
          <Field label="Order Prefix"><TextInput value={restaurantSettings.orderPrefix} onChange={v => setRestaurantSettings(s => ({ ...s, orderPrefix: v }))} /></Field>
        </SettingsCard>
        <SettingsCard title="KOT Settings" icon={Printer}>
          <SettingRow title="Auto KOT" description="Print/send KOT automatically after order creation." checked={restaurantSettings.autoKOT} onChange={v => setRestaurantSettings(s => ({ ...s, autoKOT: v }))} />
          <SettingRow title="Duplicate KOT" description="Allow authorized users to reprint KOT." checked={restaurantSettings.duplicateKOT} onChange={v => setRestaurantSettings(s => ({ ...s, duplicateKOT: v }))} />
          <Field label="Cancel KOT Permission"><Select value={restaurantSettings.cancelPermission} onChange={v => setRestaurantSettings(s => ({ ...s, cancelPermission: v }))}><option>Manager</option><option>Admin</option><option>Manager + Admin</option><option>Never</option></Select></Field>
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}><Button variant="secondary" icon={<Printer size={15} />} onClick={() => showToast("KOT test print sent.")}>Test KOT</Button><Button variant="secondary" icon={<Eye size={15} />} onClick={() => showToast("KOT preview opened.")}>Preview KOT</Button></div>
        </SettingsCard>
      </div>
    </>
  );

  const renderBilling = () => (
    <>
      <PageTitle title="Billing & Invoice" subtitle="Customize invoice numbering, tax display, footer and print behavior." icon={FileText} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Billing settings saved", () => save("Billing settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr .8fr", gap: 20 }}>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Invoice Configuration" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Invoice Prefix"><TextInput value={billingSettings.invoicePrefix} onChange={v => setBillingSettings(s => ({ ...s, invoicePrefix: v }))} /></Field>
            <Field label="Next Invoice Number"><TextInput value={billingSettings.nextNumber} onChange={v => setBillingSettings(s => ({ ...s, nextNumber: v }))} /></Field>
          </div>
          <div style={{ marginTop: 20 }}>
            <SettingRow title="Show Logo" description="Display hotel logo on invoices." checked={billingSettings.logo} onChange={v => setBillingSettings(s => ({ ...s, logo: v }))} />
            <SettingRow title="Show Tax Breakdown" description="Display individual taxes on invoice." checked={billingSettings.taxDisplay} onChange={v => setBillingSettings(s => ({ ...s, taxDisplay: v }))} />
            <SettingRow title="Show Discount" description="Display discounts separately." checked={billingSettings.discountDisplay} onChange={v => setBillingSettings(s => ({ ...s, discountDisplay: v }))} />
            <SettingRow title="Authorized Signature" description="Print authorized signature section." checked={billingSettings.signature} onChange={v => setBillingSettings(s => ({ ...s, signature: v }))} />
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
            <Field label="Invoice Footer"><textarea value={billingSettings.footer} onChange={e => setBillingSettings(s => ({ ...s, footer: e.target.value }))} style={{ ...css.input, height: 75, padding: 12 }} /></Field>
            <Field label="Terms & Conditions"><textarea value={billingSettings.terms} onChange={e => setBillingSettings(s => ({ ...s, terms: e.target.value }))} style={{ ...css.input, height: 75, padding: 12 }} /></Field>
          </div>
        </div>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Invoice Preview" action={<Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => showToast("Sample invoice downloaded.")}>Download</Button>} />
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18, background: "#fcfcff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><b>{hotel.name}</b><div style={{ fontSize: 10, color: COLORS.muted }}>{hotel.address}, {hotel.city}</div></div><FileText size={24} color={COLORS.purple} /></div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "15px 0" }} />
            <div style={{ fontSize: 11, color: COLORS.muted }}>Invoice No.</div><b>{billingSettings.invoicePrefix}-{billingSettings.nextNumber}</b>
            <div style={{ marginTop: 15, display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Room Charges</span><b>₹8,500</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 7 }}><span>GST</span><b>₹1,530</b></div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "15px 0 10px" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>Total</b><b>₹10,030</b></div>
            <div style={{ marginTop: 22, fontSize: 10, color: COLORS.muted }}>{billingSettings.footer}</div>
          </div>
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={async () => {
              if (billingSettings.printerType === 'thermal_bt') {
                if (btState === 'connected' && btDevice) {
                  await handleTestBtPrint();
                } else {
                  showToast("Please connect your Bluetooth thermal printer first.");
                }
              } else {
                showToast("Invoice print job sent to system printer.");
              }
            }}>Print</Button>
        </div>
      </div>

      {/* Bluetooth Thermal Printer Configuration (थर्मल प्रिंटर व ब्लूटूथ कनेक्टिव्हिटी) */}
      <div style={{ ...css.card, padding: 22, marginTop: 20 }}>
        <SectionHeader
          title="Bluetooth Thermal Printer (ब्लूटूथ थर्मल प्रिंटर)"
          action={
            btState === "connected" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: COLORS.successSoft, color: COLORS.success, borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                <CheckCircle2 size={15} /> Connected: {btDevice?.name || "Thermal Printer"}
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: COLORS.warningSoft, color: COLORS.warning, borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                <AlertCircle size={15} /> Disconnected
              </span>
            )
          }
        />

        {/* Setting Toggle: Enable Bluetooth Thermal Printer matching Image 3 */}
        <SettingRow
          title="Bluetooth Thermal Printer (ब्लूटूथ थर्मल प्रिंटर सक्षम करा)"
          description="Directly print all bills, KOT tickets, and payment receipts to your wireless Bluetooth thermal printer."
          checked={billingSettings.printerType === "thermal_bt"}
          onChange={(enabled) => {
            const newType = enabled ? "thermal_bt" : "system";
            const newMethod = enabled ? "bluetooth" : "browser";
            setBillingSettings(s => ({ ...s, printerType: newType }));
            printService.setDefaultPrintMethod(newMethod);
            localStorage.setItem("ajalkar_default_print_method", newMethod);
            localStorage.setItem("ajalkar_printer_type", newType);
            showToast(enabled ? "Bluetooth Thermal Printer enabled." : "System printer selected.");
          }}
        />

        {/* When Enabled: Show Bluetooth Connection Manager matching Image 2 */}
        {billingSettings.printerType === "thermal_bt" && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
            {/* Card: Direct Bluetooth Thermal */}
            <div
              style={{
                border: `2px solid ${COLORS.purple}`,
                background: COLORS.purpleSoft,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.purple, color: "#fff", display: "grid", placeItems: "center" }}>
                    <Bluetooth size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: COLORS.text }}>Direct Bluetooth Thermal (ESC/POS)</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>Pair with 58mm/80mm BLE thermal printers</div>
                  </div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.purple, color: "#fff", display: "grid", placeItems: "center" }}>
                  <Check size={14} strokeWidth={3} />
                </div>
              </div>

              {/* Sub-card matching Image 2 */}
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff", border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <b style={{ fontSize: 12, color: COLORS.text }}>Bluetooth Status</b>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: btState === "connected" ? COLORS.successSoft : "#f1f5f9", color: btState === "connected" ? COLORS.success : COLORS.muted }}>
                    {btState === "connected" ? `Connected: ${btDevice?.name}` : "Disconnected"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {btState === "connected" ? (
                    <Button variant="danger" size="sm" icon={<X size={13} />} onClick={handleDisconnectBtPrinter}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" icon={isConnectingBt ? <Loader2 size={13} className="animate-spin" /> : <Bluetooth size={13} />} onClick={handleConnectBtPrinter} disabled={isConnectingBt || !isBtSupported}>
                      {isConnectingBt ? "Connecting..." : "Discover & Connect"}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={<Printer size={13} />} onClick={handleTestBtPrint} disabled={isTestingBt}>
                    {isTestingBt ? "Printing..." : "Test Print"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Paper Size & Direct Print Setting */}
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, background: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: COLORS.text }}>
                Default Thermal Paper Size:
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { id: "80mm", label: '80mm (3" Standard)' },
                  { id: "58mm", label: '58mm (2" Pocket)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setBillingSettings(s => ({ ...s, paperSize: opt.id as any }));
                      printService.setDefaultPaperSize(opt.id as any);
                      localStorage.setItem("ajalkar_default_paper_size", opt.id);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: billingSettings.paperSize === opt.id ? `2px solid ${COLORS.purple}` : `1px solid ${COLORS.border}`,
                      background: billingSettings.paperSize === opt.id ? COLORS.purpleSoft : "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <SettingRow
                  title="Direct 1-Click Print"
                  description="Immediately send print commands to thermal printer without opening preview dialog."
                  checked={billingSettings.autoThermalPrint}
                  onChange={(v) => {
                    setBillingSettings(s => ({ ...s, autoThermalPrint: v }));
                    localStorage.setItem("ajalkar_auto_thermal_print", String(v));
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderTax = () => (
    <>
      <PageTitle title="Tax & Charges" subtitle="Create and manage GST, service charges and custom fees." icon={Zap} action={<Button icon={<Plus size={16} />} onClick={openAddTax}>Add Tax / Charge</Button>} />
      <div style={{ ...css.card, overflow: "hidden" }}>
        <Table>
          <thead><tr><Th>Tax Name</Th><Th>Type</Th><Th>Rate</Th><Th>Applies To</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>{taxes.map(t => <tr key={t.id}><Td><b>{t.name}</b></Td><Td>{t.type}</Td><Td>{t.type === "Percentage" ? `${t.rate}%` : `₹${t.rate}`}</Td><Td>{t.appliesTo}</Td><Td><StatusBadge status={t.status} /></Td><Td><ActionButtons onView={() => showToast(`${t.name} details opened.`)} onEdit={() => openEditTax(t)} onDelete={() => deleteTax(t.id)} /></Td></tr>)}</tbody>
        </Table>
      </div>
    </>
  );

  const renderPayments = () => (
    <>
      <PageTitle title="Payment Settings" subtitle="Configure accepted payment methods and gateway connectivity." icon={WalletCards} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Payment settings saved", () => save("Payment settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr .75fr", gap: 20 }}>
        <SettingsCard title="Payment Methods" icon={WalletCards}>
          {[
            ["Cash", "cash"], ["Card", "card"], ["UPI", "upi"], ["Bank Transfer", "bank"], ["Net Banking", "netBanking"], ["Wallet", "wallet"],
          ].map(([label, key]) => <SettingRow key={key} title={label} description={`Accept ${label.toLowerCase()} payments.`} checked={(payment as any)[key]} onChange={v => setPayment(s => ({ ...s, [key]: v }))} />)}
        </SettingsCard>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Payment Gateway" />
          <Field label="Gateway"><Select value={payment.gateway} onChange={v => setPayment(p => ({ ...p, gateway: v }))}><option>Razorpay</option><option>Stripe</option><option>PayU</option><option>Other</option></Select></Field>
          <div style={{ marginTop: 15 }}><Field label="Merchant ID"><TextInput value={payment.merchantId} onChange={v => setPayment(p => ({ ...p, merchantId: v }))} /></Field></div>
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: payment.connected ? COLORS.successSoft : COLORS.warningSoft, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><b style={{ fontSize: 13 }}>{payment.connected ? "Connected" : "Not Connected"}</b><div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>Gateway status</div></div>
            <CheckCircle2 size={20} color={payment.connected ? COLORS.success : COLORS.warning} />
          </div>
          <div style={{ marginTop: 15, display: "flex", gap: 8 }}><Button variant={payment.connected ? "danger" : "primary"} onClick={() => { setPayment(p => ({ ...p, connected: !p.connected })); showToast(payment.connected ? "Gateway disconnected." : "Gateway connected."); }}>{payment.connected ? "Disconnect" : "Connect"}</Button><Button variant="secondary" onClick={() => showToast("Connection test successful.")}>Test Connection</Button></div>
        </div>
      </div>
    </>
  );

  const renderNotifications = () => (
    <>
      <PageTitle title="Notification Settings" subtitle="Control alerts across in-app, email, SMS and WhatsApp channels." icon={Bell} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Notification settings saved", () => save("Notification settings saved"))}>Save Settings</Button>} />
      <div style={{ ...css.card, overflow: "hidden" }}>
        <Table>
          <thead><tr><Th>Notification</Th><Th>Description</Th><Th>Channel</Th><Th>Enabled</Th><Th>Action</Th></tr></thead>
          <tbody>{notifications.map(n => <tr key={n.id}><Td><b>{n.name}</b></Td><Td>{n.description}</Td><Td><span style={{ padding: "5px 9px", background: COLORS.purpleSoft, color: COLORS.purple, borderRadius: 7, fontSize: 11, fontWeight: 800 }}>{n.channel}</span></Td><Td><Toggle checked={n.enabled} onChange={v => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, enabled: v } : x))} /></Td><Td><Button size="sm" variant="ghost" icon={<Edit3 size={14} />} onClick={() => showToast(`${n.name} template opened.`)}>Configure</Button></Td></tr>)}</tbody>
        </Table>
      </div>
      <div style={{ ...css.card, padding: 20, marginTop: 20 }}>
        <SectionHeader title="Notification Channels" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {["In-App", "Email", "SMS", "WhatsApp"].map((c, i) => <button key={c} type="button" onClick={() => showToast(`${c} channel configuration opened.`)} style={{ border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 12, padding: 16, textAlign: "left", cursor: "pointer" }}><div style={{ fontWeight: 800, fontSize: 13 }}>{c}</div><div style={{ fontSize: 11, color: i === 3 ? COLORS.warning : COLORS.success, marginTop: 5 }}>{i === 3 ? "Needs configuration" : "Connected"}</div></button>)}
        </div>
      </div>
    </>
  );

  const renderEmail = () => (
    <>
      <PageTitle title="Email & SMS" subtitle="Configure SMTP, sender identity and reusable communication templates." icon={Mail} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Email and SMS settings saved", () => save("Email and SMS settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr .7fr", gap: 20 }}>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="SMTP Configuration" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="SMTP Host"><TextInput value={emailSettings.smtpHost} onChange={v => setEmailSettings(s => ({ ...s, smtpHost: v }))} /></Field>
            <Field label="SMTP Port"><TextInput value={emailSettings.port} onChange={v => setEmailSettings(s => ({ ...s, port: v }))} /></Field>
            <Field label="Username"><TextInput value={emailSettings.username} onChange={v => setEmailSettings(s => ({ ...s, username: v }))} /></Field>
            <Field label="Password"><TextInput value={emailSettings.password} onChange={v => setEmailSettings(s => ({ ...s, password: v }))} type="password" /></Field>
            <Field label="Sender Name"><TextInput value={emailSettings.senderName} onChange={v => setEmailSettings(s => ({ ...s, senderName: v }))} /></Field>
            <Field label="Sender Email"><TextInput value={emailSettings.senderEmail} onChange={v => setEmailSettings(s => ({ ...s, senderEmail: v }))} /></Field>
          </div>
          <div style={{ marginTop: 18 }}><SettingRow title="TLS / SSL" description="Secure the SMTP connection." checked={emailSettings.tls} onChange={v => setEmailSettings(s => ({ ...s, tls: v }))} /></div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}><Button variant="secondary" icon={<Mail size={15} />} onClick={() => showToast("Test email sent successfully.")}>Test Email</Button><Button variant="secondary" icon={<Smartphone size={15} />} onClick={() => showToast("Test SMS sent successfully.")}>Test SMS</Button></div>
        </div>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Templates" />
          {["Booking Confirmation", "Payment Receipt", "Cancellation", "Check-in Reminder", "Check-out", "Invoice", "Password Reset", "Welcome Message"].map(t => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontWeight: 750, fontSize: 12 }}>{t}</span>
              <div style={{ display: "flex", gap: 3 }}><Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => showToast(`${t} preview opened.`)}>Preview</Button><Button size="sm" variant="ghost" icon={<Edit3 size={13} />} onClick={() => showToast(`${t} editor opened.`)}>Edit</Button></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderPrinter = () => (
    <>
      <PageTitle title="Printer Settings" subtitle="Map invoices, KOT, receipts and kitchen outputs to printers." icon={Printer} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Printer settings saved", () => save("Printer settings saved"))}>Save Settings</Button>} />
      <div style={{ ...css.card, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {[
            ["Invoice Printer", "invoice"], ["KOT Printer", "kot"], ["Receipt Printer", "receipt"], ["Kitchen Printer", "kitchen"],
          ].map(([label, key]) => <div key={key} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 13, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><b style={{ fontSize: 13 }}>{label}</b><Printer size={17} color={COLORS.purple} /></div>
            <Field label="Printer"><Select value={(printerSettings as any)[key]} onChange={v => setPrinterSettings(s => ({ ...s, [key]: v }))}><option>HP LaserJet Pro</option><option>Epson TM-T82</option><option>Kitchen Printer 01</option><option>Network Printer</option></Select></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}><Field label="IP Address"><TextInput value={printerSettings.ip} onChange={v => setPrinterSettings(s => ({ ...s, ip: v }))} /></Field><Field label="Port"><TextInput value={printerSettings.port} onChange={v => setPrinterSettings(s => ({ ...s, port: v }))} /></Field></div>
            <div style={{ display: "flex", gap: 7, marginTop: 14 }}><Button size="sm" variant="secondary" icon={<Printer size={13} />} onClick={() => showToast(`${label} test print sent.`)}>Test Print</Button><Button size="sm" variant="secondary" onClick={() => showToast(`${label} connected.`)}>Connect</Button></div>
          </div>)}
        </div>
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Paper Size"><Select value={printerSettings.paper} onChange={v => setPrinterSettings(s => ({ ...s, paper: v }))}><option>80mm</option><option>58mm</option><option>A4</option><option>A5</option></Select></Field>
          <Field label="Copies"><TextInput value={printerSettings.copies} onChange={v => setPrinterSettings(s => ({ ...s, copies: v }))} type="number" /></Field>
        </div>
      </div>
    </>
  );

  const renderLocalization = () => (
    <>
      <PageTitle title="Language & Localization" subtitle="Set language, currency, date, time and timezone defaults." icon={Globe2} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Localization settings saved", () => save("Localization settings saved"))}>Save Settings</Button>} />
      <div style={{ ...css.card, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Field label="Language"><Select value={localization.language} onChange={v => setLocalization(l => ({ ...l, language: v }))}><option>English</option><option>Marathi</option><option>Hindi</option></Select></Field>
          <Field label="Currency"><Select value={localization.currency} onChange={v => setLocalization(l => ({ ...l, currency: v }))}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></Select></Field>
          <Field label="Date Format"><Select value={localization.dateFormat} onChange={v => setLocalization(l => ({ ...l, dateFormat: v }))}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select></Field>
          <Field label="Time Format"><Select value={localization.timeFormat} onChange={v => setLocalization(l => ({ ...l, timeFormat: v }))}><option>12 Hour</option><option>24 Hour</option></Select></Field>
          <Field label="Timezone"><Select value={localization.timezone} onChange={v => setLocalization(l => ({ ...l, timezone: v }))}><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>Asia/Singapore</option><option>Europe/London</option></Select></Field>
        </div>
      </div>
    </>
  );

  const renderSecurity = () => (
    <>
      <PageTitle title="Security Settings" subtitle="Protect accounts, sessions, devices and administrative access." icon={Lock} action={<Button icon={<Save size={16} />} onClick={() => requestSave("Security settings saved", () => save("Security settings saved"))}>Save Settings</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SettingsCard title="Login Security" icon={Lock}>
          <SettingRow title="Two-Factor Authentication" description="Require OTP or authenticator verification." checked={security.twoFactor} onChange={v => setSecurity(s => ({ ...s, twoFactor: v }))} />
          <SettingRow title="Password Expiry" description="Force periodic password changes." checked={security.passwordExpiry} onChange={v => setSecurity(s => ({ ...s, passwordExpiry: v }))} />
          <Field label="Failed Login Attempts"><TextInput value={security.failedAttempts} onChange={v => setSecurity(s => ({ ...s, failedAttempts: v }))} type="number" /></Field>
          <Field label="Session Timeout (minutes)"><TextInput value={security.sessionTimeout} onChange={v => setSecurity(s => ({ ...s, sessionTimeout: v }))} type="number" /></Field>
        </SettingsCard>
        <SettingsCard title="Access Security" icon={Shield}>
          <SettingRow title="IP Restriction" description="Restrict access to approved networks." checked={security.ipRestriction} onChange={v => setSecurity(s => ({ ...s, ipRestriction: v }))} />
          <SettingRow title="Device Control" description="Manage authorized staff devices." checked={security.deviceControl} onChange={v => setSecurity(s => ({ ...s, deviceControl: v }))} />
          <div style={{ marginTop: 18, display: "grid", gap: 9 }}><Button variant="secondary" icon={<Smartphone size={15} />} onClick={() => showToast("Active device list opened.")}>Manage Devices</Button><Button variant="secondary" icon={<LogOutIcon size={15} />} onClick={() => askConfirm("Log out every active session?", () => { showToast("All sessions logged out."); setModal(null); })}>Logout All Devices</Button><Button variant="secondary" icon={<KeyRound size={15} />} onClick={() => setModal("password")}>Change Password</Button></div>
        </SettingsCard>
      </div>
    </>
  );

  const renderBackup = () => (
    <>
      <PageTitle title="Backup & Restore" subtitle="Protect your hotel data with manual and scheduled backups." icon={Database} action={<Button icon={<Database size={16} />} onClick={() => { setModal("backup"); }}>Backup Now</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 20 }}>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Automatic Backup" />
          <SettingRow title="Scheduled Backup" description="Run database backups automatically." checked={backupSchedule.enabled} onChange={v => setBackupSchedule(s => ({ ...s, enabled: v }))} />
          <div style={{ marginTop: 18, display: "grid", gap: 15 }}>
            <Field label="Frequency"><Select value={backupSchedule.frequency} onChange={v => setBackupSchedule(s => ({ ...s, frequency: v }))}><option>Daily</option><option>Weekly</option><option>Monthly</option></Select></Field>
            <Field label="Backup Time"><TextInput value={backupSchedule.time} onChange={v => setBackupSchedule(s => ({ ...s, time: v }))} /></Field>
            <Field label="Retention"><Select value={backupSchedule.retention} onChange={v => setBackupSchedule(s => ({ ...s, retention: v }))}><option>7 days</option><option>30 days</option><option>90 days</option><option>1 year</option></Select></Field>
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 8 }}><Button icon={<Database size={15} />} onClick={() => setModal("backup")}>Backup Now</Button><Button variant="secondary" icon={<Upload size={15} />} onClick={() => restoreInputRef.current?.click()}>Restore File</Button></div>
        </div>
        <div style={{ ...css.card, overflow: "hidden" }}>
          <div style={{ padding: 20 }}><SectionHeader title="Backup History" subtitle="Recent successful and failed backups." /></div>
          <Table>
            <thead><tr><Th>Date</Th><Th>Type</Th><Th>Size</Th><Th>Status</Th><Th>Action</Th></tr></thead>
            <tbody>{[
              ["02 Sep 2026, 02:00 AM", "Automatic", "25.4 MB", "Success"],
              ["01 Sep 2026, 04:20 PM", "Manual", "24.9 MB", "Success"],
              ["31 Aug 2026, 02:00 AM", "Automatic", "24.7 MB", "Success"],
              ["30 Aug 2026, 02:00 AM", "Automatic", "24.5 MB", "Success"],
            ].map((r, i) => <tr key={i}><Td>{r[0]}</Td><Td>{r[1]}</Td><Td>{r[2]}</Td><Td><span style={{ color: COLORS.success, fontWeight: 800 }}>{r[3]}</span></Td><Td><div style={{ display: "flex", gap: 5 }}><Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => showToast("Backup download started.")}>Download</Button><Button size="sm" variant="ghost" icon={<ArchiveRestore size={13} />} onClick={() => askConfirm("Restore this backup?", () => { showToast("Backup restored successfully."); setModal(null); })}>Restore</Button></div></Td></tr>)}</tbody>
          </Table>
        </div>
      </div>
    </>
  );

  const renderAudit = () => (
    <>
      <PageTitle title="Audit Logs" subtitle="Track important changes, user actions and security events." icon={FileClock} action={<Button variant="secondary" icon={<Download size={15} />} onClick={() => showToast("Audit log export prepared.")}>Export Logs</Button>} />
      <div style={{ ...css.card, overflow: "hidden" }}>
        <div style={{ padding: 18, display: "flex", gap: 10, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}><Search size={16} color={COLORS.muted} /><input placeholder="Search audit activity..." style={{ ...css.input, border: "none", paddingLeft: 0 }} /></div>
          <Button variant="secondary" onClick={() => showToast("Date filter opened.")}>Date</Button><Button variant="secondary" onClick={() => showToast("Module filter opened.")}>Module</Button><Button variant="secondary" onClick={() => showToast("User filter opened.")}>User</Button>
        </div>
        <Table>
          <thead><tr><Th>User</Th><Th>Action</Th><Th>Module</Th><Th>Date & Time</Th><Th>IP</Th><Th>Status</Th></tr></thead>
          <tbody>{audits.map(a => <tr key={a.id}><Td><b>{a.user}</b></Td><Td>{a.action}</Td><Td>{a.module}</Td><Td>{a.date}</Td><Td>{a.ip}</Td><Td><span style={{ color: a.status === "Success" ? COLORS.success : COLORS.warning, fontWeight: 800 }}>{a.status}</span></Td></tr>)}</tbody>
        </Table>
      </div>
    </>
  );

  const renderMaintenance = () => (
    <>
      <PageTitle title="System Maintenance" subtitle="Monitor system health, integrations, storage and maintenance mode." icon={Server} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <HealthCard title="Database" value="Operational" icon={Database} ok />
        <HealthCard title="API Services" value="7 / 8 Connected" icon={Zap} ok />
        <HealthCard title="Storage" value="32% Used" icon={Server} ok />
        <HealthCard title="Background Jobs" value="Running" icon={Activity} ok />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Maintenance Tools" />
          <div style={{ display: "grid", gap: 10 }}>
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => showToast("Application cache cleared.")}>Clear Cache</Button>
            <Button variant="secondary" icon={<Database size={15} />} onClick={() => showToast("Database health check completed.")}>Check Database</Button>
            <Button variant="secondary" icon={<Zap size={15} />} onClick={() => showToast("All API endpoints tested.")}>Check APIs</Button>
            <Button variant="secondary" icon={<Activity size={15} />} onClick={() => showToast("Background jobs refreshed.")}>Refresh Jobs</Button>
          </div>
        </div>
        <div style={{ ...css.card, padding: 22 }}>
          <SectionHeader title="Maintenance Mode" />
          <div style={{ padding: 16, borderRadius: 12, background: COLORS.warningSoft, border: "1px solid #f4ddb0" }}>
            <div style={{ display: "flex", gap: 10 }}><AlertTriangle size={20} color={COLORS.warning} /><div><b style={{ fontSize: 13 }}>Use carefully</b><div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Guests and staff may be unable to access the system during maintenance.</div></div></div>
          </div>
          <div style={{ marginTop: 16 }}><Button variant="danger" onClick={() => askConfirm("Enable maintenance mode for the hotel?", () => { showToast("Maintenance mode enabled."); setModal(null); })}>Enable Maintenance Mode</Button></div>
        </div>
      </div>
    </>
  );

  const renderGeneric = (key: SettingKey) => {
    const info: Record<string, { title: string; subtitle: string; icon: React.ElementType; items: string[] }> = {
      dashboard: { title: "Settings", subtitle: "", icon: Settings, items: [] },
      roles: { title: "Roles", subtitle: "", icon: Shield, items: [] },
      preferences: { title: "Preferences", subtitle: "", icon: Settings, items: [] },
      hotel: { title: "Hotel Profile", subtitle: "", icon: Building2, items: [] },
      rooms: { title: "Rooms", subtitle: "", icon: Building2, items: [] },
      reservations: { title: "Reservations", subtitle: "", icon: CalendarDays, items: [] },
      guests: { title: "Guests", subtitle: "", icon: UserCheck, items: [] },
      housekeeping: { title: "Housekeeping", subtitle: "", icon: RefreshCw, items: [] },
      restaurant: { title: "Restaurant", subtitle: "", icon: WalletCards, items: [] },
      billing: { title: "Billing", subtitle: "", icon: FileText, items: [] },
      tax: { title: "Tax", subtitle: "", icon: Zap, items: [] },
      payments: { title: "Payments", subtitle: "", icon: WalletCards, items: [] },
      notifications: { title: "Notifications", subtitle: "", icon: Bell, items: [] },
      email: { title: "Email", subtitle: "", icon: Mail, items: [] },
      printer: { title: "Printer", subtitle: "", icon: Printer, items: [] },
      localization: { title: "Localization", subtitle: "", icon: Globe2, items: [] },
      security: { title: "Security", subtitle: "", icon: Lock, items: [] },
      backup: { title: "Backup", subtitle: "", icon: Database, items: [] },
      audit: { title: "Audit", subtitle: "", icon: FileClock, items: [] },
      maintenance: { title: "Maintenance", subtitle: "", icon: Server, items: [] },
      users: { title: "Users", subtitle: "", icon: Users, items: [] },
    };
    const x = info[key];
    return <PageTitle title={x.title} subtitle={x.subtitle} icon={x.icon} />;
  };

  const renderLicence = () => {
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "Not Set";
      try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    return (
      <>
        <PageTitle title="Licence & Subscription" subtitle="Enterprise licence version, free trial, renewal and upgrade options." icon={Shield} />
        
        {/* Licence Details Grid */}
        <div style={{ ...css.card, padding: 24, marginBottom: 20 }}>
          <SectionHeader title="Enterprise Licence Information" subtitle="Your active business licence and plan details." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginTop: 12 }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Licence Version</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{licenceInfo.licenceVersion}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Subscription Plan</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{licenceInfo.subscriptionPlan}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Trial Duration</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>28 Days Free Trial</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Trial Status</span>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: licenceInfo.trialStatus === "Active" ? "#16A34A" : licenceInfo.trialStatus === "Expired" ? "#DC2626" : "#64748B" }}>
                {licenceInfo.trialStatus === "Active" ? `Active (${Math.min(28, Math.max(0, licenceInfo.daysRemaining))} Days Left)` : licenceInfo.trialStatus}
              </div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Trial Start Date</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{formatDate(licenceInfo.trialStartDate)}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Trial End Date</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{formatDate(licenceInfo.trialEndDate)}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Subscription Status</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#16A34A", marginTop: 4 }}>{licenceInfo.subscriptionStatus}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Renewal Date</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{formatDate(licenceInfo.renewalDate)}</div>
            </div>
          </div>
        </div>

        {/* 28 Days Free Trial Section */}
        <div style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", border: "1.5px solid #86EFAC", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ maxWidth: 600 }}>
              <span style={{ background: "#16A34A", color: "#FFFFFF", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase", display: "inline-block", marginBottom: 8 }}>Special Offer</span>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.35rem", fontWeight: 800, color: "#14532D" }}>Start Your 28 Days Free Trial</h3>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#166534", lineHeight: 1.5 }}>Experience the Enterprise features of Ajalkar POS Billing with a 28-day free trial. Explore the available features before choosing your subscription plan.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {licenceInfo.trialStatus === "Not Started" ? (
                <button type="button" disabled={licenceLoading} onClick={handleStartTrial} style={{ background: "#16A34A", color: "#FFFFFF", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: "0.95rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)" }}>
                  {licenceLoading ? "Activating..." : "Start Free Trial"}
                </button>
              ) : licenceInfo.trialStatus === "Active" ? (
                <div style={{ background: "#FFFFFF", border: "1.5px solid #22C55E", color: "#15803D", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: "0.92rem" }}>
                  ✓ Trial Active · {Math.min(28, Math.max(0, licenceInfo.daysRemaining))} Days Left
                </div>
              ) : (
                <div style={{ background: "#FEE2E2", border: "1.5px solid #F87171", color: "#B91C1C", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: "0.92rem" }}>
                  ⚠ Trial Expired
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 800, color: "#1E293B" }}>Subscription Actions</h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B" }}>Renew or upgrade your subscription plan at any time.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" disabled={licenceLoading} onClick={handleRenewSubscription} style={{ background: "#0F766E", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
              🔄 {t('renewSubscription', 'Renew Subscription')}
            </button>
            <button type="button" onClick={() => navigate("/hotel/plans")} style={{ background: "#4338CA", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
              ⬆️ {t('upgradePlan', 'Upgrade Plan')}
            </button>
          </div>
        </div>
      </>
    );
  };

  const renderProfile = () => {
    const userDisplayName = user?.fullName || user?.username || "Hotel Administrator";
    const userRole = user?.roles?.[0]?.replace("ROLE_", "") || "Admin";
    const userInitial = userDisplayName.trim().charAt(0).toUpperCase();

    return (
      <>
        <PageTitle
          title="User Profile"
          subtitle="Manage your personal profile picture, identity and access details."
          icon={UserCog}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
          {/* Left Card: Profile Image */}
          <div style={{ ...css.card, padding: 24 }}>
            <SectionHeader
              title="Profile Photo"
              subtitle="Personal avatar displayed in the top navigation bar and session chips."
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "24px 16px",
                border: `1.5px dashed #cfd1dc`,
                borderRadius: 16,
                background: "#fafaff",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.purple}`,
                  boxShadow: "0 4px 16px rgba(184, 92, 20, 0.18)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.purple} 100%)`,
                  color: "#fff",
                  marginBottom: 16,
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "2.8rem", fontWeight: 900 }}>{userInitial}</span>
                )}
              </div>

              <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>
                {userDisplayName}
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>
                {user?.email || "user@hotel.com"}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => profileInputRef.current?.click()}
                >
                  {profileImage ? "Replace Photo" : "Upload Photo"}
                </Button>
                {profileImage && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={handleRemoveProfileImage}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>

              {profileImgError && (
                <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 10, fontWeight: 600 }}>
                  {profileImgError}
                </div>
              )}

              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 14 }}>
                Supports PNG, JPG, JPEG (Max 2MB).
              </div>

              <input
                ref={profileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={handleProfileImageUpload}
              />
            </div>
          </div>

          {/* Right Card: User Information */}
          <div style={{ ...css.card, padding: 24 }}>
            <SectionHeader
              title="Account Details"
              subtitle="Your registered credentials and system permissions."
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Full Name">
                <TextInput value={user?.fullName || ""} disabled />
              </Field>
              <Field label="Username">
                <TextInput value={user?.username || ""} disabled />
              </Field>
              <Field label="Email Address">
                <TextInput value={user?.email || ""} disabled />
              </Field>
              <Field label="Phone Number">
                <TextInput value={user?.phone || hotel.phone || "Not Set"} disabled />
              </Field>
              <Field label="System Role">
                <TextInput value={userRole} disabled />
              </Field>
              <Field label="Property / Branch">
                <TextInput value={user?.businessName || business?.name || "Main Property"} disabled />
              </Field>
            </div>

            <div style={{ marginTop: 24, padding: "16px", borderRadius: 12, background: "#f8f9fc", border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: COLORS.text }}>
                Security & Status
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, display: "flex", gap: 20, alignItems: "center", marginTop: 8 }}>
                <div>
                  Status:{" "}
                  <span style={{ color: COLORS.success, fontWeight: 800, padding: "2px 8px", background: COLORS.successSoft, borderRadius: 6 }}>
                    {user?.active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  User ID: <span style={{ fontWeight: 700, color: COLORS.text }}>#{user?.id || 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderContent = () => {
    switch (active) {
      case "dashboard": return renderDashboard();
      case "profile": return renderProfile();
      case "hotel": return renderHotel();
      case "users": return renderUsers();
      case "roles": return renderRoles();
      case "preferences": return renderPreferences();
      case "rooms": return renderRooms();
      case "reservations": return renderReservations();
      case "guests": return renderGuests();
      case "housekeeping": return renderHousekeeping();
      case "restaurant": return renderRestaurant();
      case "billing": return renderBilling();
      case "tax": return renderTax();
      case "payments": return renderPayments();
      case "notifications": return renderNotifications();
      case "email": return renderEmail();
      case "printer": return renderPrinter();
      case "localization": return renderLocalization();
      case "backup": return renderBackup();
      case "audit": return renderAudit();
      case "maintenance": return renderMaintenance();
      case "licence": return renderLicence();
      case "reports": return <ReportsModule />;
      case "gstSettings": return <GstReportComponent initialTab="settings" />;
      case "gstReport": return <GstReportComponent initialTab="sales" />;
      default: return renderGeneric(active);
    }
  };

  return (
    <div style={css.page}>
      <div style={{ ...css.content, marginLeft: 0 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 9, background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "12px 24px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const selected = active === item.key;
            return <button key={item.key} type="button" onClick={() => setActive(item.key)} aria-current={selected ? "page" : undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${selected ? COLORS.purple : COLORS.border}`, background: selected ? COLORS.purpleSoft : "#fff", color: selected ? COLORS.purpleDark : COLORS.text, borderRadius: 9, padding: "9px 12px", cursor: "pointer", fontSize: 12, fontWeight: selected ? 700 : 500 }}>
              <Icon size={15} />{item.label}
            </button>;
          })}
        </div>
        <main style={css.main}>
          {renderContent()}
        </main>
      </div>

      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,.bak,.backup,.zip"
        style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            showToast(`Restore file selected: ${file.name}`);
            addAudit(`Selected restore file ${file.name}`, "Backup & Restore", "Warning");
          }
          e.currentTarget.value = "";
        }}
      />

      {toast && <div style={{ position: "fixed", right: 25, bottom: 25, zIndex: 100, background: COLORS.navy, color: "#fff", padding: "13px 17px", borderRadius: 11, boxShadow: "0 12px 30px rgba(0,0,0,.2)", fontSize: 13, fontWeight: 700 }}>{toast}</div>}

      {settingsPopup && (
        <Modal
          title={NAV_ITEMS.find(item => item.key === settingsPopup)?.label || "Settings"}
          onClose={() => setSettingsPopup(null)}
          wide
        >
          {renderContent()}
        </Modal>
      )}

      {modal === "save" && (
        <Modal title="Save Changes" onClose={discardSave}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.purpleSoft, color: COLORS.purple, display: "grid", placeItems: "center", flexShrink: 0 }}><Save size={21} /></div>
            <div>
              <b style={{ fontSize: 16 }}>Save your changes?</b>
              <p style={{ margin: "7px 0 0", color: COLORS.muted, fontSize: 12, lineHeight: 1.55 }}>Your settings have unsaved changes. Choose <b>Save Changes</b> to apply them or <b>Discard Changes</b> to restore the last saved values.</p>
            </div>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={discardSave}>Discard Changes</Button>
            <Button onClick={confirmSave}>Save Changes</Button>
          </div>
        </Modal>
      )}

      {modal === "confirm" && (
        <Modal title="Confirm Action" onClose={() => setModal(null)}>
          <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.dangerSoft, color: COLORS.danger, display: "grid", placeItems: "center", flexShrink: 0 }}><AlertTriangle size={21} /></div>
            <div>
              <b style={{ fontSize: 15 }}>{confirmText}</b>
              <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 12 }}>This action cannot be undone.</p>
            </div>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmAction?.()}>Confirm</Button>
          </div>
        </Modal>
      )}

      {modal === "user" && (
        <Modal title={selectedUser ? "Edit User" : "Add New User"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gap: 15 }}>
            <Field label="Full Name" required error={validationErrors.userName}>
              <TextInput value={userForm.name} onChange={v => setUserForm(u => ({ ...u, name: v }))} validationType="charsOnly" placeholder="Only characters allowed" />
            </Field>
            <Field label="Email Address" required error={validationErrors.userEmail}>
              <TextInput value={userForm.email} onChange={v => setUserForm(u => ({ ...u, email: v }))} validationType="noUpper" placeholder="No uppercase allowed" />
            </Field>
            <Field label="Role">
              <Select value={userForm.role} onChange={v => setUserForm(u => ({ ...u, role: v }))}>
                <option>Hotel Admin</option>
                <option>Receptionist</option>
                <option>Restaurant Manager</option>
                <option>Housekeeping</option>
              </Select>
            </Field>
            <Field label="Branch">
              <Select value={userForm.branch} onChange={v => setUserForm(u => ({ ...u, branch: v }))}>
                <option>Main Property</option>
                <option>Airport Property</option>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={userForm.department} onChange={v => setUserForm(u => ({ ...u, department: v }))}>
                <option>Administration</option>
                <option>Front Desk</option>
                <option>Restaurant</option>
                <option>Housekeeping</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={userForm.status} onChange={v => setUserForm(u => ({ ...u, status: v as Status }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveUser}>{selectedUser ? "Update User" : "Create User"}</Button>
          </div>
        </Modal>
      )}

      {modal === "view_user" && viewedUser && (
        <Modal title="User Details" onClose={() => setModal(null)}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
            <Avatar name={viewedUser.name} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{viewedUser.name}</h3>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{viewedUser.email}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
            <div><b>Role:</b> {viewedUser.role}</div>
            <div><b>Branch:</b> {viewedUser.branch}</div>
            <div><b>Department:</b> {viewedUser.department}</div>
            <div><b>Status:</b> <StatusBadge status={viewedUser.status} /></div>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {modal === "room" && (
        <Modal title={selectedRoom ? "Edit Room Type" : "Add Room Type"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gap: 15 }}>
            <Field label="Room Type Name" required error={validationErrors.roomName}>
              <TextInput value={roomForm.name} onChange={v => setRoomForm(r => ({ ...r, name: v }))} />
            </Field>
            <Field label="Code" required error={validationErrors.roomCode}>
              <TextInput value={roomForm.code} onChange={v => setRoomForm(r => ({ ...r, code: v }))} placeholder="e.g. DLX" />
            </Field>
            <Field label="Base Rate (₹)" required error={validationErrors.baseRate}>
              <TextInput value={roomForm.baseRate} onChange={v => setRoomForm(r => ({ ...r, baseRate: v }))} type="number" />
            </Field>
            <Field label="Capacity" required error={validationErrors.capacity}>
              <TextInput value={roomForm.capacity} onChange={v => setRoomForm(r => ({ ...r, capacity: v }))} type="number" />
            </Field>
            <Field label="Status">
              <Select value={roomForm.status} onChange={v => setRoomForm(r => ({ ...r, status: v as Status }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveRoom}>Save Room Type</Button>
          </div>
        </Modal>
      )}

      {modal === "tax" && (
        <Modal title={selectedTax ? "Edit Tax Rule" : "Add Tax / Charge"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gap: 15 }}>
            <Field label="Tax Name" required error={validationErrors.taxName}>
              <TextInput value={taxForm.name} onChange={v => setTaxForm(t => ({ ...t, name: v }))} />
            </Field>
            <Field label="Type">
              <Select value={taxForm.type} onChange={v => setTaxForm(t => ({ ...t, type: v as "Percentage" | "Fixed" }))}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (₹)</option>
              </Select>
            </Field>
            <Field label="Rate" required error={validationErrors.taxRate}>
              <TextInput value={taxForm.rate} onChange={v => setTaxForm(t => ({ ...t, rate: v }))} type="number" />
            </Field>
            <Field label="Applies To">
              <Select value={taxForm.appliesTo} onChange={v => setTaxForm(t => ({ ...t, appliesTo: v }))}>
                <option>Room Booking</option>
                <option>Restaurant</option>
                <option>All Services</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={taxForm.status} onChange={v => setTaxForm(t => ({ ...t, status: v as Status }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveTax}>Save Tax Rule</Button>
          </div>
        </Modal>
      )}

      {modal === "role" && (
        <Modal title="Add Custom Role" onClose={() => setModal(null)}>
          <Field label="Role Name" required>
            <TextInput value={roleName} onChange={setRoleName} placeholder="e.g. Assistant Manager" />
          </Field>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => { setModal(null); showToast(`Role '${roleName}' created.`); }}>Create Role</Button>
          </div>
        </Modal>
      )}

      {modal === "backup" && (
        <Modal title="Create Database Backup" onClose={() => setModal(null)}>
          <p style={{ margin: "0 0 15px", fontSize: 13, color: COLORS.muted }}>This will create a full snapshot of your system settings, user records, and operational rules.</p>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => { setModal(null); showToast("Backup created successfully."); addAudit("Manual backup performed", "Backup & Restore"); }}>Start Backup</Button>
          </div>
        </Modal>
      )}

      {modal === "password" && (
        <Modal title="Change Password" onClose={() => setModal(null)}>
          <div style={{ display: "grid", gap: 14 }}>
            <Field label="Current Password" required>
              <TextInput type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter your current password" />
            </Field>
            <Field label="New Password" required>
              <TextInput type="password" value={newPassword} onChange={setNewPassword} placeholder="Enter your new password" />
            </Field>
            <Field label="Confirm New Password" required>
              <TextInput type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your new password" />
            </Field>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleChangePasswordSubmit}>Update Password</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}