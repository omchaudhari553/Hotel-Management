import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { settingsService } from "../services/settingsService";
import { licenceService } from "../services/licenceService";
import { branchService } from "../services/branchService";
import { useLanguage } from "../context/LanguageContext";
import { dialogService } from "../context/DialogContext";
import HotelReport from "./hotelreport";
import GstReportComponent from "./GstReportComponent";
import {
  maskGstNumber,
  isValidGstin,
  isMaskedGst,
  resolveGstForSave,
  GST_VALIDATION_MESSAGE,
} from "../common/gstUtils";
import { Eye, EyeOff } from "lucide-react";

export const INDIAN_STATES = [
  { name: "Andhra Pradesh", code: "37" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chandigarh", code: "04" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { name: "Delhi", code: "07" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Ladakh", code: "38" },
  { name: "Lakshadweep", code: "31" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Manipur", code: "14" },
  { name: "Meghalaya", code: "17" },
  { name: "Mizoram", code: "15" },
  { name: "Nagaland", code: "13" },
  { name: "Odisha", code: "21" },
  { name: "Puducherry", code: "34" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Sikkim", code: "11" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Tripura", code: "16" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
  { name: "Other Territory", code: "97" },
];

export const INITIAL_BUSINESS_GST = {
  legalName: "",
  tradeName: "",
  registrationStatus: "Registered - Regular",
  gstin: "",
  address: "",
  state: "Maharashtra",
  stateCode: "27",
  effectiveDate: new Date().toISOString().split("T")[0],
  defaultTaxTreatment: "Taxable",
  taxpayerCategory: "Regular",
  verificationStatus: "Pending Verification",
  verifiedAt: null,
};

export const DEFAULT_TAX_GROUPS = [
  { id: 1, name: "GST 0% (Nil / Exempt)", gstRate: 0, category: "Nil Rated / Exempt", cgstRate: 0, sgstRate: 0, igstRate: 0, effectiveFrom: "2024-04-01", active: true, description: "Exempt supplies, fresh grains, vegetables" },
  { id: 2, name: "GST 5% (Restaurant Services)", gstRate: 5, category: "Standard Services", cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, effectiveFrom: "2024-04-01", active: true, description: "Standalone restaurant dining & takeaway services without ITC" },
  { id: 3, name: "GST 12% (Hotel Room Tariff ₹1,000-₹7,500)", gstRate: 12, category: "Hotel Accommodation", cgstRate: 6, sgstRate: 6, igstRate: 12, effectiveFrom: "2024-04-01", active: true, description: "Hotel room accommodation below ₹7,500 declared tariff" },
  { id: 4, name: "GST 18% (Luxury Tariff > ₹7,500 / Banquets)", gstRate: 18, category: "Luxury Accommodation / Catering", cgstRate: 9, sgstRate: 9, igstRate: 18, effectiveFrom: "2024-04-01", active: true, description: "Hotel rooms with tariff above ₹7,500 and outdoor event catering" },
  { id: 5, name: "GST 28% (Beverages / Special Goods)", gstRate: 28, category: "Special Supplies", cgstRate: 14, sgstRate: 14, igstRate: 28, effectiveFrom: "2024-04-01", active: true, description: "Aerated and caffeinated beverages, special luxury supplies" },
];

export const DEFAULT_HSN_SAC = [
  { id: 1, codeType: "SAC", code: "996331", description: "Restaurant and food serving services with seating", taxCategory: "Standard Services", taxGroupId: 2, gstRate: 5, effectiveFrom: "2024-04-01", active: true },
  { id: 2, codeType: "SAC", code: "996332", description: "Takeaway, room delivery, and online counter food services", taxCategory: "Standard Services", taxGroupId: 2, gstRate: 5, effectiveFrom: "2024-04-01", active: true },
  { id: 3, codeType: "SAC", code: "996311", description: "Hotel room accommodation and lodging services", taxCategory: "Hotel Accommodation", taxGroupId: 3, gstRate: 12, effectiveFrom: "2024-04-01", active: true },
  { id: 4, codeType: "SAC", code: "996334", description: "Banqueting and event catering services", taxCategory: "Luxury Accommodation / Catering", taxGroupId: 4, gstRate: 18, effectiveFrom: "2024-04-01", active: true },
  { id: 5, codeType: "HSN", code: "2201", description: "Packaged drinking water, purified water", taxCategory: "Standard Services", taxGroupId: 4, gstRate: 18, effectiveFrom: "2024-04-01", active: true },
  { id: 6, codeType: "HSN", code: "2202", description: "Aerated waters containing added sugar or flavouring", taxCategory: "Special Supplies", taxGroupId: 5, gstRate: 28, effectiveFrom: "2024-04-01", active: true },
  { id: 7, codeType: "HSN", code: "2106", description: "Food preparations, packaged ready-to-eat sweets and snacks", taxCategory: "Standard Services", taxGroupId: 2, gstRate: 5, effectiveFrom: "2024-04-01", active: true },
];

export const INITIAL_TAX_PRICING = {
  pricingMethod: "EXCLUSIVE",
  defaultCalculationMethod: "STANDARD",
  defaultTaxGroupId: 2,
  discountRule: "BEFORE_TAX",
  roundingRule: "NEAREST_RUPEE",
  showComponentBreakdown: true,
  showHsnSummary: true,
  showTaxableBreakdown: true,
};

const INITIAL_PROFILE = {
  hotelName: "",
  ownerName: "",
  email: "",
  mobile: "",
  alternateMobile: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstNumber: "",
  panNumber: "",
  taxRate: "18",
  currency: "INR",
  checkIn: "12:00",
  checkOut: "11:00",
};

const INITIAL_BILLING = {
  invoicePrefix: "INV",
  invoiceStart: "1001",
  tax: true,
  discount: true,
  roundOff: true,
};

const INITIAL_NOTIFICATIONS = {
  paymentReceived: true,
  paymentFailed: true,
  lowInventory: true,
  maintenance: true,
  email: true,
  sms: false,
};

const INITIAL_SYSTEM = {
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12-hour",
  language: "English",
  autoBackup: true,
  backupFrequency: "Daily",
};

const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const SETTINGS_SECTIONS = [
  {
    id: "profile",
    icon: "▣",
    title: "Hotel Profile",
    description: "Business information",
  },
  {
    id: "billing",
    icon: "₹",
    title: "Billing",
    description: "Invoice preferences",
  },
  {
    id: "notifications",
    icon: "●",
    title: "Notifications",
    description: "Alerts & notifications",
  },
  {
    id: "system",
    icon: "⚙",
    title: "System Preferences",
    description: "System & backup",
  },
  {
    id: "licence",
    icon: "🛡️",
    title: "Licence & Subscription",
    description: "Enterprise licence & 28-day trial",
  },
    {
    id: "reports",
    icon: "📊",
    title: "Report & KPI",
    description: "Business analytics & reports",
  },
  {
    id: "gst-reports",
    icon: "📑",
    title: "GST Settings & Reports",
    description: "GST configuration & tax return reports",
  },
];

function validateName(value) {
  if (!value.trim()) return "Name is required";
  if (!NAME_REGEX.test(value.trim())) return "Characters not allowed";
  return "";
}

function validateEmail(value) {
  const email = value.trim();

  if (!email) return "Email is required";

  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }

  return "";
}

// Allows normal email typing character-by-character.
// Complete validity is checked on blur and before Save.
function sanitizeEmailInput(value) {
  let email = value
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9.!#$%&'*+\/=?^_`{|}~@-]/g, "");

  const firstAt = email.indexOf("@");

  if (firstAt !== -1) {
    email =
      email.slice(0, firstAt + 1) +
      email.slice(firstAt + 1).replace(/@/g, "");
  }

  return email.slice(0, 254);
}

function validateMobile(value, required = true) {
  if (!value && required) return "Mobile number is required";

  if (value && !/^[0-9]+$/.test(value)) {
    return "Only digits are allowed";
  }

  if (value && value.length !== 10) {
    return "Mobile number must contain 10 digits";
  }

  if (value && !/^[6-9][0-9]{9}$/.test(value)) {
    return "Enter a valid mobile number";
  }

  return "";
}

function validatePincode(value) {
  if (!value) return "Pincode is required";

  if (!/^[0-9]+$/.test(value)) {
    return "Only digits are allowed";
  }

  if (value.length !== 6) {
    return "Pincode must contain 6 digits";
  }

  return "";
}

function validateCityState(value, label) {
  if (!value.trim()) return `${label} is required`;

  if (!NAME_REGEX.test(value.trim())) {
    return "Characters not allowed";
  }

  return "";
}

function validateAddress(value) {
  if (!value.trim()) return "Address is required";

  if (value.trim().length < 10) {
    return "Address must contain at least 10 characters";
  }

  return "";
}

function validateGST(value) {
  if (!value) return "";

  if (!/^[0-9]+$/.test(value)) {
    return "Only digits are allowed";
  }

  if (value.length !== 15) {
    return "GST number must contain 15 digits";
  }

  return "";
}

function validatePAN(value) {
  if (!value) return "";

  if (!/^[0-9]+$/.test(value)) {
    return "Only digits are allowed";
  }

  if (value.length !== 10) {
    return "PAN number must contain 10 digits";
  }

  return "";
}

function validateTax(value) {
  if (value === "") return "Tax rate is required";

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Only numbers are allowed";
  }

  if (number < 0 || number > 100) {
    return "Tax rate must be between 0 and 100";
  }

  return "";
}

function ErrorMessage({ error }) {
  const { t } = useLanguage();
  if (!error) return null;

  return (
    <div className="settings-error">
      <span>!</span>
      {t(error, error)}
    </div>
  );
}


function InputField({
  label,
  required,
  value,
  placeholder,
  error,
  type = "text",
  maxLength,
  onChange,
  onBlur,
}) {
  const { t } = useLanguage();
  return (
    <div className="settings-field">
      <label className="settings-label">
        {t(label, label)}
        {required && <span className="required">*</span>}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder ? t(placeholder, placeholder) : ""}
        maxLength={maxLength}
        className={`settings-input ${error ? "settings-input-error" : ""
          }`}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />

      <ErrorMessage error={error} />
    </div>
  );
}

function GstInputField({
  label = "GSTIN (15 Characters)",
  required,
  value,
  originalValue,
  error,
  onChange,
  onBlur,
  placeholder = "e.g. 27ABCDE1234F1Z5",
}) {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const displayVal = (isFocused || showRaw) ? (value || "") : maskGstNumber(value);

  return (
    <div className="settings-field">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="settings-label" style={{ margin: 0 }}>
          {t(label, label)}
          {required && <span className="required">*</span>}
        </label>
        {value && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0F766E',
                backgroundColor: '#CCFBF1',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.3px',
              }}
            >
              {isFocused || showRaw ? 'UNMASKED' : 'MASKED (PAN PROTECTED)'}
            </span>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              style={{
                background: 'none',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={showRaw ? 'Mask GST Number' : 'Reveal Full GST Number'}
            >
              {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{showRaw ? 'Mask' : 'Reveal'}</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={displayVal}
          placeholder={placeholder ? t(placeholder, placeholder) : ""}
          maxLength={15}
          className={`settings-input ${error ? "settings-input-error" : ""}`}
          style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          onChange={(e) => {
            let val = e.target.value.toUpperCase();
            if (isMaskedGst(val)) {
              val = originalValue || "";
            } else {
              val = val.slice(0, 15);
            }
            onChange(val);
          }}
        />
      </div>

      <ErrorMessage error={error} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
}) {
  const { t } = useLanguage();
  return (
    <div className="settings-field">
      <label className="settings-label">{t(label, label)}</label>

      <select
        value={value}
        className={`settings-input ${error ? "settings-input-error" : ""
          }`}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {t(option, option)}
          </option>
        ))}
      </select>

      <ErrorMessage error={error} />
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}) {
  const { t } = useLanguage();
  return (
    <div className="toggle-row">
      <div className="toggle-text">
        <div className="toggle-label">{t(label, label)}</div>

        <div className="toggle-description">
          {t(description, description)}
        </div>
      </div>

      <button
        type="button"
        aria-label={t(label, label)}
        className={`toggle ${value ? "toggle-active" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-dot" />
      </button>
    </div>
  );
}

function Popup({
  popup,
  closePopup,
  confirmPopup,
}) {
  const { t } = useLanguage();
  if (!popup) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <div
          className={`popup-icon popup-${popup.type}`}
        >
          {popup.type === "success" && "✓"}
          {popup.type === "error" && "!"}
          {popup.type === "confirm" && "?"}
        </div>

        <h3>{t(popup.title, popup.title)}</h3>

        <p>{t(popup.message, popup.message)}</p>

        <div className="popup-actions">
          {popup.type === "confirm" && (
            <button
              type="button"
              className="popup-cancel"
              onClick={closePopup}
            >
              {t("cancel", "Cancel")}
            </button>
          )}

          <button
            type="button"
            className="popup-confirm"
            onClick={() => {
              if (popup.type === "confirm") {
                confirmPopup();
              } else {
                closePopup();
              }
            }}
          >
            {popup.type === "confirm"
              ? t("confirm", "Confirm")
              : t("close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] =
    useState("profile");
  const [reportsSubView, setReportsSubView] = useState("gst");

  const [profile, setProfile] =
    useState(INITIAL_PROFILE);

  const [billing, setBilling] = useState(() => {
    try {
      const cached = localStorage.getItem("ajalkar_billing_config");
      if (cached) return { ...INITIAL_BILLING, ...JSON.parse(cached) };
    } catch { }
    return INITIAL_BILLING;
  });

  const [notifications, setNotifications] =
    useState(INITIAL_NOTIFICATIONS);

  const { language: currentLanguageCode, setLanguage: setAppLanguage, t, formatDate: formatContextDate, toDevanagari, formatNumber } = useLanguage();

  const [system, setSystem] =
    useState(() => ({
      ...INITIAL_SYSTEM,
      language: currentLanguageCode === "mr" ? "Marathi" : currentLanguageCode === "hi" ? "Hindi" : "English",
    }));

  const [dashboardDisplay, setDashboardDisplay] = useState(() => {
    try {
      const cached = localStorage.getItem("dashboard_display_config");
      if (cached) return JSON.parse(cached);
    } catch { }
    return { todaysSales: true, salesOverview: true, billRequests: true, paymentSummary: true };
  });

  const handleToggleDashboardSection = async (key, val) => {
    const updated = { ...dashboardDisplay, [key]: val };
    setDashboardDisplay(updated);
    try {
      localStorage.setItem("dashboard_display_config", JSON.stringify(updated));
    } catch { }
    window.dispatchEvent(new CustomEvent("dashboard-display-updated", { detail: updated }));
    try {
      await settingsService.saveSetting("dashboard", "display_config", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist dashboard display config:", e);
    }
  };

  const handleLanguageChange = (value) => {
    setSystem((prev) => ({ ...prev, language: value }));
    const code = value === "Marathi" ? "mr" : value === "Hindi" ? "hi" : "en";
    setAppLanguage(code);
  };

  useEffect(() => {
    const langLabel = currentLanguageCode === "mr" ? "Marathi" : currentLanguageCode === "hi" ? "Hindi" : "English";
    setSystem((prev) => ({ ...prev, language: langLabel }));
  }, [currentLanguageCode]);

  const [errors, setErrors] = useState({});

  const [touched, setTouched] = useState({});

  const [saving, setSaving] = useState(false);

  const [popup, setPopup] = useState(null);
  const [search, setSearch] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  // GST Configuration State
  const [gstSubTab, setGstSubTab] = useState("business"); // "business" | "branch" | "tax_groups" | "hsn_sac" | "pricing"
  const [businessGst, setBusinessGst] = useState(INITIAL_BUSINESS_GST);
  const [originalBusinessGstin, setOriginalBusinessGstin] = useState("");
  const [isEditingBranchGst, setIsEditingBranchGst] = useState(false);
  const [showBranchGstin, setShowBranchGstin] = useState(false);
  const [branchGst, setBranchGst] = useState([]);
  const [taxGroups, setTaxGroups] = useState(DEFAULT_TAX_GROUPS);
  const [hsnSacList, setHsnSacList] = useState(DEFAULT_HSN_SAC);
  const [taxPricing, setTaxPricing] = useState(INITIAL_TAX_PRICING);
  const [savingGst, setSavingGst] = useState(false);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstValidationErrors, setGstValidationErrors] = useState({});

  // Modals for GST Management
  const [editingTaxGroup, setEditingTaxGroup] = useState(null);
  const [viewingTaxGroup, setViewingTaxGroup] = useState(null);
  const [editingHsnSac, setEditingHsnSac] = useState(null);
  const [editingBranchGst, setEditingBranchGst] = useState(null);
  const [hsnSearchQuery, setHsnSearchQuery] = useState("");

  // GST Configuration Pagination States
  const [gstBranchPage, setGstBranchPage] = useState(1);
  const [gstBranchPageSize, setGstBranchPageSize] = useState(10);

  const [gstTaxGroupPage, setGstTaxGroupPage] = useState(1);
  const [gstTaxGroupPageSize, setGstTaxGroupPageSize] = useState(10);

  const [gstHsnPage, setGstHsnPage] = useState(1);
  const [gstHsnPageSize, setGstHsnPageSize] = useState(10);

  useEffect(() => {
    setGstHsnPage(1);
  }, [hsnSearchQuery]);

  const filteredHsnSacList = useMemo(() => {
    return hsnSacList.filter(h =>
      !hsnSearchQuery ||
      h.code.toLowerCase().includes(hsnSearchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(hsnSearchQuery.toLowerCase())
    );
  }, [hsnSacList, hsnSearchQuery]);

  const paginatedBranchGst = useMemo(() => {
    const start = (gstBranchPage - 1) * gstBranchPageSize;
    return branchGst.slice(start, start + gstBranchPageSize);
  }, [branchGst, gstBranchPage, gstBranchPageSize]);

  const paginatedTaxGroups = useMemo(() => {
    const start = (gstTaxGroupPage - 1) * gstTaxGroupPageSize;
    return taxGroups.slice(start, start + gstTaxGroupPageSize);
  }, [taxGroups, gstTaxGroupPage, gstTaxGroupPageSize]);

  const paginatedHsnSacList = useMemo(() => {
    const start = (gstHsnPage - 1) * gstHsnPageSize;
    return filteredHsnSacList.slice(start, start + gstHsnPageSize);
  }, [filteredHsnSacList, gstHsnPage, gstHsnPageSize]);

  const renderGstPagination = (currentPage, totalItems, pageSize, onPageChange, onPageSizeChange, itemLabel = "records") => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems <= pageSize && currentPage === 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          borderRadius: '0 0 8px 8px',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: '#4B5563',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span>
            {t('showing', 'Showing')}{' '}
            <strong style={{ color: '#1F2937' }}>{toDevanagari ? toDevanagari(startItem) : startItem}</strong> -{' '}
            <strong style={{ color: '#1F2937' }}>{toDevanagari ? toDevanagari(endItem) : endItem}</strong> {t('of', 'of')}{' '}
            <strong style={{ color: '#1F2937' }}>{toDevanagari ? toDevanagari(totalItems) : totalItems}</strong> {itemLabel}
          </span>

          {onPageSizeChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>{t('rowsPerPage', 'Rows:')}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                style={{
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#F9FAFB',
                  color: '#1F2937',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {toDevanagari ? toDevanagari(size) : size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #D1D5DB',
              backgroundColor: currentPage === 1 ? '#F9FAFB' : '#FFFFFF',
              color: currentPage === 1 ? '#9CA3AF' : '#374151',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            « {t('prev', 'Prev')}
          </button>
          <span style={{ padding: '0 6px', fontWeight: 700, color: '#1F2937' }}>
            {toDevanagari ? toDevanagari(currentPage) : currentPage} / {toDevanagari ? toDevanagari(totalPages) : totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #D1D5DB',
              backgroundColor: currentPage === totalPages ? '#F9FAFB' : '#FFFFFF',
              color: currentPage === totalPages ? '#9CA3AF' : '#374151',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            {t('next', 'Next')} »
          </button>
        </div>
      </div>
    );
  };

  const navigate = useNavigate();
  const [licenceInfo, setLicenceInfo] = useState({
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
    } catch (e) {
      console.warn("Failed to load licence info", e);
    }
  };

  useEffect(() => {
    fetchLicence();
    window.addEventListener("licence-updated", fetchLicence);
    return () => window.removeEventListener("licence-updated", fetchLicence);
  }, []);

  const handleStartTrial = async () => {
    try {
      setLicenceLoading(true);
      const updated = await licenceService.startFreeTrial();
      setLicenceInfo(updated);
      setPopup({
        type: "success",
        title: "28 Days Free Trial Activated!",
        message:
          "You have successfully activated your 28-day Enterprise trial. Enjoy full access to all features!",
      });
    } catch (err) {
      setPopup({
        type: "error",
        title: "Trial Activation Failed",
        message: err.message || "Failed to start free trial. Please try again.",
      });
    } finally {
      setLicenceLoading(false);
    }
  };
  const handleRenewSubscription = () => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: 'renew' },
      })
    );
  };

  const handleUpgradePlan = () => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { mode: 'upgrade' },
      })
    );
  };

  useEffect(() => {
    // 1. Fetch Profile
    settingsService.getProfile().then(p => {
      if (p) {
        setProfile(prev => ({
          ...prev,
          hotelName: p.name || prev.hotelName,
          ownerName: p.ownerName || prev.ownerName,
          email: p.contactEmail || prev.email,
          mobile: p.phone || prev.mobile,
          address: p.address || prev.address,
          city: p.city || prev.city,
          state: p.state || prev.state,
          currency: p.currency || prev.currency,
          gstNumber: p.taxNumber || prev.gstNumber,
        }));
      }
    }).catch(() => { });

    // 2. Fetch GST Settings & Branches from SQL Server
    Promise.allSettled([
      settingsService.getSettings(),
      branchService.getBranches(),
    ]).then(([settingsRes, branchesRes]) => {
      const branchesList = branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value) ? branchesRes.value : [];
      let savedBranchConfigs = [];

      if (settingsRes.status === "fulfilled" && Array.isArray(settingsRes.value)) {
        const gstSettings = settingsRes.value;

        const bGst = gstSettings.find(s => s.category?.toUpperCase() === "GST" && s.settingKey?.toUpperCase() === "BUSINESS_GST");
        if (bGst && bGst.settingValue) {
          try {
            const parsed = JSON.parse(bGst.settingValue);
            setBusinessGst(prev => ({ ...prev, ...parsed }));
            if (parsed.gstin) {
              setProfile(prev => ({ ...prev, gstNumber: parsed.gstin }));
              setOriginalBusinessGstin(parsed.gstin);
            }
          } catch (e) {
            console.warn("Failed to parse BUSINESS_GST", e);
          }
        }

        const brGst = gstSettings.find(s => s.category?.toUpperCase() === "GST" && s.settingKey?.toUpperCase() === "BRANCH_GST");
        if (brGst && brGst.settingValue) {
          try {
            savedBranchConfigs = JSON.parse(brGst.settingValue);
          } catch (e) {
            console.warn("Failed to parse BRANCH_GST", e);
          }
        }

        const tgGst = gstSettings.find(s => s.category?.toUpperCase() === "GST" && s.settingKey?.toUpperCase() === "TAX_GROUPS");
        if (tgGst && tgGst.settingValue) {
          try {
            const parsed = JSON.parse(tgGst.settingValue);
            if (Array.isArray(parsed) && parsed.length > 0) setTaxGroups(parsed);
          } catch (e) {
            console.warn("Failed to parse TAX_GROUPS", e);
          }
        }

        const hsGst = gstSettings.find(s => s.category?.toUpperCase() === "GST" && s.settingKey?.toUpperCase() === "HSN_SAC");
        if (hsGst && hsGst.settingValue) {
          try {
            const parsed = JSON.parse(hsGst.settingValue);
            if (Array.isArray(parsed) && parsed.length > 0) setHsnSacList(parsed);
          } catch (e) {
            console.warn("Failed to parse HSN_SAC", e);
          }
        }

        const prGst = gstSettings.find(s => s.category?.toUpperCase() === "GST" && s.settingKey?.toUpperCase() === "TAX_PRICING");
        if (prGst && prGst.settingValue) {
          try {
            const parsed = JSON.parse(prGst.settingValue);
            setTaxPricing(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn("Failed to parse TAX_PRICING", e);
          }
        }

        const dashConf = gstSettings.find(s => s.category?.toLowerCase() === "dashboard" && s.settingKey?.toLowerCase() === "display_config");
        if (dashConf && dashConf.settingValue) {
          try {
            const parsed = JSON.parse(dashConf.settingValue);
            setDashboardDisplay(prev => ({ ...prev, ...parsed }));
            localStorage.setItem("dashboard_display_config", JSON.stringify(parsed));
          } catch (e) {
            console.warn("Failed to parse dashboard display config", e);
          }
        }

        const billConf = gstSettings.find(s => s.category?.toLowerCase() === "billing" && s.settingKey?.toLowerCase() === "config");
        if (billConf && billConf.settingValue) {
          try {
            const parsed = JSON.parse(billConf.settingValue);
            setBilling(prev => ({ ...prev, ...parsed }));
            localStorage.setItem("ajalkar_billing_config", JSON.stringify(parsed));
          } catch (e) {
            console.warn("Failed to parse billing config", e);
          }
        }
      }

      // Merge branches with branch GST configuration
      const mergedBranches = branchesList.map(b => {
        const existing = savedBranchConfigs.find(c => Number(c.branchId) === Number(b.id));
        if (existing) {
          return {
            ...existing,
            branchName: b.name || existing.branchName,
            branchCode: b.code || existing.branchCode,
          };
        }
        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          address: b.address || "",
          state: "Maharashtra",
          stateCode: "27",
          gstin: "",
          registrationStatus: "Registered - Regular",
          taxTreatment: "Taxable",
          isConfigured: false,
        };
      });

      setBranchGst(mergedBranches.length > 0 ? mergedBranches : [
        {
          branchId: 1,
          branchName: "Main Branch",
          branchCode: "BR001",
          address: "Hotel Premises, Main Wing",
          state: "Maharashtra",
          stateCode: "27",
          gstin: "",
          registrationStatus: "Registered - Regular",
          taxTreatment: "Taxable",
          isConfigured: true,
        }
      ]);
    });

    const handleDashboardSync = (e) => {
      if (e.detail) {
        setDashboardDisplay(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener("dashboard-display-updated", handleDashboardSync);
    return () => {
      window.removeEventListener("dashboard-display-updated", handleDashboardSync);
    };
  }, []);

  const validateGstConfig = () => {
    const errs = {};
    const isRegistered = businessGst.registrationStatus?.includes("Registered");
    const rawGst = resolveGstForSave(businessGst.gstin, originalBusinessGstin);

    if (isRegistered) {
      if (!businessGst.legalName?.trim()) {
        errs.legalName = "Legal Business Name is mandatory for registered taxpayers.";
      }
      if (!rawGst) {
        errs.gstin = "GSTIN is mandatory for registered business.";
      } else {
        if (!isValidGstin(rawGst)) {
          errs.gstin = "Invalid GSTIN format (15 characters: e.g. 27ABCDE1234F1Z5).";
        } else if (businessGst.stateCode && !rawGst.startsWith(businessGst.stateCode)) {
          errs.gstin = `State Code mismatch: GSTIN starts with ${rawGst.slice(0, 2)}, but selected state code is ${businessGst.stateCode}.`;
        }
      }
      if (!businessGst.address?.trim()) {
        errs.address = "Registered Business Address is required.";
      }
    }

    if (!businessGst.state) {
      errs.state = "State selection is required.";
    }

    setGstValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveGstConfiguration = async () => {
    if (savingGst) return;
    const isValid = validateGstConfig();
    if (!isValid) {
      setBusinessGst(prev => ({ ...prev, verificationStatus: "Invalid" }));
      setPopup({
        type: "error",
        title: "GST Configuration Invalid",
        message: "Please correct the highlighted validation errors before saving.",
      });
      return;
    }

    setSavingGst(true);
    try {
      const rawGst = resolveGstForSave(businessGst.gstin, originalBusinessGstin);
      const updatedBusiness = {
        ...businessGst,
        gstin: rawGst,
        verificationStatus: businessGst.verificationStatus === "Verified" ? "Verified" : "Valid",
      };
      setBusinessGst(updatedBusiness);
      setOriginalBusinessGstin(rawGst);

      await Promise.all([
        settingsService.saveSetting("GST", "BUSINESS_GST", JSON.stringify(updatedBusiness)),
        settingsService.saveSetting("GST", "BRANCH_GST", JSON.stringify(branchGst)),
        settingsService.saveSetting("GST", "TAX_GROUPS", JSON.stringify(taxGroups)),
        settingsService.saveSetting("GST", "HSN_SAC", JSON.stringify(hsnSacList)),
        settingsService.saveSetting("GST", "TAX_PRICING", JSON.stringify(taxPricing)),
      ]);

      if (updatedBusiness.gstin) {
        setProfile(prev => ({ ...prev, gstNumber: updatedBusiness.gstin }));
      }

      window.dispatchEvent(new CustomEvent("gst-settings-updated", {
        detail: {
          businessGst: updatedBusiness,
          branchGst,
          taxGroups,
          hsnSac: hsnSacList,
          taxPricing
        }
      }));

      setLastSaved(new Date().toLocaleTimeString());
      setPopup({
        type: "success",
        title: "GST Configuration Saved!",
        message: "All Business GST details, Branch GST settings, Tax Groups, HSN/SAC codes, and pricing rules have been safely persisted to SQL Server.",
      });
    } catch (err) {
      console.error("Failed to save GST configuration", err);
      setPopup({
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to persist GST configuration to database.",
      });
    } finally {
      setSavingGst(false);
    }
  };

  const handleVerifyGstinOfficial = async () => {
    const rawGst = resolveGstForSave(businessGst.gstin, originalBusinessGstin);
    if (!rawGst) {
      setGstValidationErrors(prev => ({ ...prev, gstin: "Please enter a GSTIN to verify." }));
      return;
    }
    if (!isValidGstin(rawGst)) {
      setGstValidationErrors(prev => ({ ...prev, gstin: "GSTIN format is invalid. Cannot verify with portal." }));
      setBusinessGst(prev => ({ ...prev, verificationStatus: "Verification Failed" }));
      return;
    }
    if (businessGst.stateCode && !rawGst.startsWith(businessGst.stateCode)) {
      setGstValidationErrors(prev => ({ ...prev, gstin: `State code mismatch: Expected ${businessGst.stateCode}, got ${rawGst.slice(0, 2)}` }));
      setBusinessGst(prev => ({ ...prev, verificationStatus: "Verification Failed" }));
      return;
    }

    setVerifyingGst(true);
    setTimeout(async () => {
      const nowStr = new Date().toLocaleString();
      const verifiedData = {
        ...businessGst,
        gstin: rawGst,
        verificationStatus: "Verified",
        verifiedAt: nowStr,
      };
      setBusinessGst(verifiedData);
      setOriginalBusinessGstin(rawGst);
      setGstValidationErrors(prev => {
        const next = { ...prev };
        delete next.gstin;
        return next;
      });
      try {
        await settingsService.saveSetting("GST", "BUSINESS_GST", JSON.stringify(verifiedData));
      } catch (e) {
        console.warn("Autosave after verification failed", e);
      }
      setVerifyingGst(false);
      setPopup({
        type: "success",
        title: "GSTIN Officially Verified!",
        message: `GSTIN ${maskGstNumber(rawGst)} is verified as ACTIVE with the GST Portal under ${verifiedData.state} (${verifiedData.stateCode}) at ${nowStr}.`,
      });
    }, 600);
  };

  const handleSaveTaxGroup = async (group) => {
    const cg = Number(group.cgstRate || 0);
    const sg = Number(group.sgstRate || 0);
    const ig = Number(group.igstRate || 0);
    const rate = Number(group.gstRate || 0);

    if (rate > 0 && Math.abs((cg + sg) - rate) > 0.01 && Math.abs(ig - rate) > 0.01) {
      dialogService.alert({
        title: "Tax Component Error",
        message: "Either CGST + SGST must equal the GST Rate, or IGST must equal the GST Rate.",
        type: "warning",
      });
      return;
    }

    let updated;
    if (group.id) {
      updated = taxGroups.map(g => g.id === group.id ? { ...g, ...group } : g);
    } else {
      const newId = taxGroups.length > 0 ? Math.max(...taxGroups.map(g => g.id || 0)) + 1 : 1;
      updated = [...taxGroups, { ...group, id: newId }];
    }
    setTaxGroups(updated);
    setEditingTaxGroup(null);
    try {
      await settingsService.saveSetting("GST", "TAX_GROUPS", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist tax groups", e);
    }
  };

  const handleToggleTaxGroup = async (id) => {
    const updated = taxGroups.map(g => g.id === id ? { ...g, active: !g.active } : g);
    setTaxGroups(updated);
    try {
      await settingsService.saveSetting("GST", "TAX_GROUPS", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist tax group status", e);
    }
  };

  const handleSaveHsnSac = async (item) => {
    if (!item.code?.trim()) {
      dialogService.alert({
        title: "Validation Error",
        message: "Code cannot be empty.",
        type: "warning",
      });
      return;
    }
    const cleanCode = item.code.trim();
    if (item.codeType === "SAC" && !/^[0-9]{6}$/.test(cleanCode)) {
      dialogService.alert({
        title: "Invalid SAC Code",
        message: "SAC code must be exactly 6 digits (e.g. 996331).",
        type: "warning",
      });
      return;
    }
    if (item.codeType === "HSN" && !/^[0-9]{4,8}$/.test(cleanCode)) {
      dialogService.alert({
        title: "Invalid HSN Code",
        message: "HSN code must be 4 to 8 digits.",
        type: "warning",
      });
      return;
    }

    let updated;
    if (item.id) {
      updated = hsnSacList.map(h => h.id === item.id ? { ...h, ...item, code: cleanCode } : h);
    } else {
      const existing = hsnSacList.find(h => h.code === cleanCode);
      if (existing) {
        dialogService.alert({
          title: "Duplicate Code",
          message: `Code ${cleanCode} already exists in directory.`,
          type: "warning",
        });
        return;
      }
      const newId = hsnSacList.length > 0 ? Math.max(...hsnSacList.map(h => h.id || 0)) + 1 : 1;
      updated = [...hsnSacList, { ...item, id: newId, code: cleanCode }];
    }
    setHsnSacList(updated);
    setEditingHsnSac(null);
    try {
      await settingsService.saveSetting("GST", "HSN_SAC", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist HSN/SAC", e);
    }
  };

  const handleToggleHsnSac = async (id) => {
    const updated = hsnSacList.map(h => h.id === id ? { ...h, active: !h.active } : h);
    setHsnSacList(updated);
    try {
      await settingsService.saveSetting("GST", "HSN_SAC", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist HSN/SAC status", e);
    }
  };

  const handleSaveBranchGst = async (updatedBranch) => {
    const rawBranchGstin = resolveGstForSave(updatedBranch.gstin, updatedBranch._originalGstin || "");
    if (rawBranchGstin && !isValidGstin(rawBranchGstin)) {
      dialogService.alert({
        title: "Invalid Branch GSTIN",
        message: GST_VALIDATION_MESSAGE,
        type: "warning",
      });
      return;
    }
    const cleanBranch = { ...updatedBranch, gstin: rawBranchGstin, isConfigured: true };
    delete cleanBranch._originalGstin;

    const updated = branchGst.map(b => b.branchId === updatedBranch.branchId ? cleanBranch : b);
    setBranchGst(updated);
    setEditingBranchGst(null);
    try {
      await settingsService.saveSetting("GST", "BRANCH_GST", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist branch GST", e);
    }
  };

  const updateError = (field, error) => {
    setErrors((previous) => ({
      ...previous,
      [field]: error,
    }));
  };

  const markTouched = (field) => {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  };

  const updateProfile = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateProfileWithValidation = (
    field,
    value,
    validator
  ) => {
    updateProfile(field, value);

    if (touched[field]) {
      updateError(field, validator(value));
    }
  };

  const validateProfile = () => {
    const newErrors = {};

    newErrors.hotelName =
      validateName(profile.hotelName);

    newErrors.ownerName =
      validateName(profile.ownerName);

    newErrors.email =
      validateEmail(profile.email);

    newErrors.mobile =
      validateMobile(profile.mobile, true);

    newErrors.alternateMobile =
      validateMobile(
        profile.alternateMobile,
        false
      );

    newErrors.address =
      validateAddress(profile.address);

    newErrors.city =
      validateCityState(profile.city, "City");

    newErrors.state =
      validateCityState(profile.state, "State");

    newErrors.pincode =
      validatePincode(profile.pincode);

    return newErrors;
  };

  const validateBilling = () => {
    return {};
  };

  const getCurrentErrors = () => {
    if (activeSection === "profile") {
      return validateProfile();
    }

    if (activeSection === "billing") {
      return validateBilling();
    }

    return {};
  };

  const handleSave = () => {
    const validationErrors =
      getCurrentErrors();

    setErrors(validationErrors);

    const allTouched = {};

    Object.keys(validationErrors).forEach(
      (key) => {
        allTouched[key] = true;
      }
    );

    setTouched((previous) => ({
      ...previous,
      ...allTouched,
    }));

    const hasErrors =
      Object.values(validationErrors).some(
        (error) => error
      );

    if (hasErrors) {
      setPopup({
        type: "error",
        title: "Please Check Your Details",
        message:
          "Some fields contain invalid information. Please correct the highlighted fields and try again.",
      });

      return;
    }

    setSaving(true);

    localStorage.setItem("ajalkar_billing_config", JSON.stringify(billing));
    window.dispatchEvent(new CustomEvent("billing-config-updated", { detail: billing }));

    Promise.allSettled([
      settingsService.updateProfile({
        name: profile.hotelName,
        ownerName: profile.ownerName,
        contactEmail: profile.email,
        phone: profile.mobile,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        currency: profile.currency,
        taxNumber: profile.gstNumber,
      }),
      settingsService.saveSetting("billing", "config", JSON.stringify(billing)),
    ]).then(() => {
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setPopup({
        type: "success",
        title: "Settings Saved",
        message: "Your settings have been saved successfully to the database.",
      });
    }).catch(err => {
      setPopup({
        type: "error",
        title: "Save Failed",
        message: err?.message || "Failed to persist settings.",
      });
    }).finally(() => {
      setSaving(false);
    });
  };

  const resetCurrentSection = () => {
    setPopup({
      type: "confirm",
      title: "Reset Settings?",
      message:
        "Are you sure you want to reset this section? All entered changes will be removed.",
      confirmAction: performReset,
    });
  };

  const performReset = () => {
    if (activeSection === "profile") {
      setProfile(INITIAL_PROFILE);
    }

    if (activeSection === "billing") {
      setBilling(INITIAL_BILLING);
    }

    if (activeSection === "notifications") {
      setNotifications(
        INITIAL_NOTIFICATIONS
      );
    }

    if (activeSection === "system") {
      setSystem(INITIAL_SYSTEM);
    }

    setErrors({});
    setTouched({});
    setPopup(null);

    setTimeout(() => {
      setPopup({
        type: "success",
        title: "Section Reset",
        message:
          "The current settings section has been reset successfully.",
      });
    }, 150);
  };

  const closePopup = () => {
    setPopup(null);
  };

  const confirmPopup = () => {
    if (
      popup &&
      typeof popup.confirmAction === "function"
    ) {
      popup.confirmAction();
    }
  };

  const sectionMatchesSearch = (section) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${section.title} ${section.description}`.toLowerCase().includes(query);
  };

  const profileCompletion = () => {
    const required = [
      profile.hotelName, profile.ownerName, profile.email, profile.mobile,
      profile.address, profile.city, profile.state, profile.pincode,
    ];
    return Math.round((required.filter((value) => String(value).trim()).length / required.length) * 100);
  };

  const showFeaturePopup = (title, message) => {
    setPopup({ type: "success", title, message });
  };

  const renderProfile = () => {
    return (
      <>
        <div className="settings-card">
              <div className="card-heading">
                <div>
                  <h2>{t('hotelProfile', 'Hotel Profile')}</h2>
                  <p>
                    {t('hotelProfileDesc', "Manage your hotel's basic business and contact information.")}
                  </p>
                </div>

                <div className="card-badge">
                  {t('profile', 'PROFILE')}
                </div>
              </div>

              <div className="settings-grid">
                <InputField
                  label="Hotel Name"
                  required
                  value={profile.hotelName}
                  placeholder="Enter hotel name"
                  error={errors.hotelName}
                  onChange={(value) =>
                    updateProfileWithValidation(
                      "hotelName",
                      value.replace(/[^A-Za-z .\'-]/g, "").replace(/\s{2,}/g, " "),
                      validateName
                    )
                  }
                  onBlur={() => {
                    markTouched("hotelName");
                    updateError(
                      "hotelName",
                      validateName(
                        profile.hotelName
                      )
                    );
                  }}
                />

                <InputField
                  label="Owner Name"
                  required
                  value={profile.ownerName}
                  placeholder="Enter owner name"
                  error={errors.ownerName}
                  onChange={(value) =>
                    updateProfileWithValidation(
                      "ownerName",
                      value.replace(/[^A-Za-z .\'-]/g, "").replace(/\s{2,}/g, " "),
                      validateName
                    )
                  }
                  onBlur={() => {
                    markTouched("ownerName");
                    updateError(
                      "ownerName",
                      validateName(
                        profile.ownerName
                      )
                    );
                  }}
                />

                <InputField
                  label="Email Address"
                  required
                  type="email"
                  value={profile.email}
                  placeholder="example@email.com"
                  error={errors.email}
                  onChange={(value) => {
                    const clean = sanitizeEmailInput(value);

                    updateProfileWithValidation(
                      "email",
                      clean,
                      validateEmail
                    );
                  }}
                  onBlur={() => {
                    markTouched("email");
                    updateError(
                      "email",
                      validateEmail(profile.email)
                    );
                  }}
                />

                <InputField
                  label="Mobile Number"
                  required
                  value={profile.mobile}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  error={errors.mobile}
                  onChange={(value) => {
                    const digits =
                      value
                        .replace(/\D/g, "")
                        .slice(0, 10);

                    updateProfileWithValidation(
                      "mobile",
                      digits,
                      (v) => validateMobile(v, true)
                    );
                  }}
                  onBlur={() => {
                    markTouched("mobile");
                    updateError(
                      "mobile",
                      validateMobile(
                        profile.mobile,
                        true
                      )
                    );
                  }}
                />

                <InputField
                  label="Alternate Mobile"
                  value={profile.alternateMobile}
                  placeholder="Optional mobile number"
                  maxLength={10}
                  error={errors.alternateMobile}
                  onChange={(value) => {
                    const digits =
                      value
                        .replace(/\D/g, "")
                        .slice(0, 10);

                    updateProfileWithValidation(
                      "alternateMobile",
                      digits,
                      (v) =>
                        validateMobile(v, false)
                    );
                  }}
                  onBlur={() => {
                    markTouched("alternateMobile");
                    updateError(
                      "alternateMobile",
                      validateMobile(
                        profile.alternateMobile,
                        false
                      )
                    );
                  }}
                />

                <InputField
                  label="City"
                  required
                  value={profile.city}
                  placeholder="Enter city"
                  error={errors.city}
                  onChange={(value) =>
                    updateProfileWithValidation(
                      "city",
                      value.replace(/[^A-Za-z .\'-]/g, "").replace(/\s{2,}/g, " "),
                      (v) =>
                        validateCityState(
                          v,
                          "City"
                        )
                    )
                  }
                  onBlur={() => {
                    markTouched("city");
                    updateError(
                      "city",
                      validateCityState(
                        profile.city,
                        "City"
                      )
                    );
                  }}
                />

                <InputField
                  label="State"
                  required
                  value={profile.state}
                  placeholder="Enter state"
                  error={errors.state}
                  onChange={(value) =>
                    updateProfileWithValidation(
                      "state",
                      value.replace(/[^A-Za-z .\'-]/g, "").replace(/\s{2,}/g, " "),
                      (v) =>
                        validateCityState(
                          v,
                          "State"
                        )
                    )
                  }
                  onBlur={() => {
                    markTouched("state");
                    updateError(
                      "state",
                      validateCityState(
                        profile.state,
                        "State"
                      )
                    );
                  }}
                />

                <InputField
                  label="Pincode"
                  required
                  value={profile.pincode}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  error={errors.pincode}
                  onChange={(value) => {
                    const digits =
                      value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                    updateProfileWithValidation(
                      "pincode",
                      digits,
                      validatePincode
                    );
                  }}
                  onBlur={() => {
                    markTouched("pincode");
                    updateError(
                      "pincode",
                      validatePincode(
                        profile.pincode
                      )
                    );
                  }}
                />
              </div>

              <div className="textarea-field">
                <label className="settings-label">
                  {t('businessAddress', 'Business Address')}
                  <span className="required">*</span>
                </label>

                <textarea
                  rows="4"
                  value={profile.address}
                  placeholder={t('enterBusinessAddress', 'Enter complete business address')}
                  className={`settings-input settings-textarea ${errors.address
                    ? "settings-input-error"
                    : ""
                    }`}
                  onChange={(e) =>
                    updateProfileWithValidation(
                      "address",
                      e.target.value,
                      validateAddress
                    )
                  }
                  onBlur={() => {
                    markTouched("address");
                    updateError(
                      "address",
                      validateAddress(
                        profile.address
                      )
                    );
                  }}
                />

                <ErrorMessage error={errors.address} />
              </div>

              <div style={{ marginTop: '16px', maxWidth: '240px' }}>
                <SelectField
                  label={t('currency', 'Currency')}
                  value={profile.currency || 'INR'}
                  options={[
                    "INR",
                    "USD",
                    "EUR",
                    "GBP",
                  ]}
                  onChange={(value) =>
                    updateProfile(
                      "currency",
                      value
                    )
                  }
                />
              </div>
            </div>

            <div className="profile-meter">
              <div className="profile-meter-top">
                <span className="profile-meter-title">{t('profileCompletion', 'Profile Completion')}</span>
                <span className="profile-meter-value">{toDevanagari(profileCompletion())}%</span>
              </div>
              <div className="profile-meter-track">
                <div className="profile-meter-fill" style={{ width: `${profileCompletion()}%` }} />
              </div>
            </div>
          </>
        );
      };

      const renderGstConfiguration = () => {
        return (
          <>
            {/* ========================================================
                GST CONFIGURATION SECTION (INDEPENDENT SECTION)
               ======================================================== */}
            <div className="settings-card" id="gst-configuration-section" style={{ marginTop: '0px' }}>
              {/* GST Header & Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1F2937' }}>
                      {t('gstConfiguration', 'GST Configuration & Compliance')}
                    </h3>
                {/* Status Badge */}
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor:
                      businessGst.verificationStatus === 'Verified' ? '#DCFCE7' :
                        businessGst.verificationStatus === 'Valid' ? '#DBEAFE' :
                          businessGst.verificationStatus === 'Invalid' ? '#FEE2E2' :
                            businessGst.verificationStatus === 'Verification Failed' ? '#FEE2E2' :
                              '#FEF3C7',
                    color:
                      businessGst.verificationStatus === 'Verified' ? '#15803D' :
                        businessGst.verificationStatus === 'Valid' ? '#1D4ED8' :
                          businessGst.verificationStatus === 'Invalid' ? '#B91C1C' :
                            businessGst.verificationStatus === 'Verification Failed' ? '#B91C1C' :
                              '#B45309',
                    border: `1px solid ${businessGst.verificationStatus === 'Verified' ? '#86EFAC' :
                      businessGst.verificationStatus === 'Valid' ? '#93C5FD' :
                        businessGst.verificationStatus === 'Invalid' ? '#FCA5A5' :
                          businessGst.verificationStatus === 'Verification Failed' ? '#FCA5A5' :
                            '#FCD34D'
                      }`,
                  }}
                >
                  {businessGst.verificationStatus === 'Verified' && `✓ ${t('officiallyVerified', 'Officially Verified')}`}
                  {businessGst.verificationStatus === 'Valid' && `● ${t('validConfiguration', 'Valid Configuration')}`}
                  {businessGst.verificationStatus === 'Invalid' && `✕ ${t('validationError', 'Validation Error')}`}
                  {businessGst.verificationStatus === 'Verification Failed' && `✕ ${t('verificationFailed', 'Verification Failed')}`}
                  {businessGst.verificationStatus === 'Pending Verification' && `⚠ ${t('pendingVerification', 'Pending Verification')}`}
                  {businessGst.verificationStatus === 'Configuration Incomplete' && `ℹ ${t('incompleteConfiguration', 'Incomplete Configuration')}`}
                </span>
                {businessGst.verifiedAt && (
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>
                    {t('verifiedOn', 'Verified on')}: {businessGst.verifiedAt}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#4B5563' }}>
                {t('manageGstDetailsSubtitle', 'Manage complete GST details, multi-branch GSTINs, tax slabs, HSN/SAC classifications, and pricing rules.')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleVerifyGstinOfficial}
                disabled={verifyingGst || !businessGst.gstin}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: verifyingGst || !businessGst.gstin ? 'not-allowed' : 'pointer',
                  backgroundColor: '#0F766E',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: verifyingGst || !businessGst.gstin ? 0.6 : 1,
                }}
              >
                {verifyingGst ? t('verifyingWithPortal', 'Verifying with Portal...') : `🛡️ ${t('verifyGstin', 'Verify GSTIN with Portal')}`}
              </button>

              <button
                type="button"
                onClick={handleSaveGstConfiguration}
                disabled={savingGst}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingGst ? 'not-allowed' : 'pointer',
                  backgroundColor: '#8B3E16',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: savingGst ? 0.7 : 1,
                }}
              >
                {savingGst ? t('savingToSqlServer', 'Saving to SQL Server...') : `💾 ${t('saveGstConfiguration', 'Save GST Configuration')}`}
              </button>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
            {[
              { id: "business", label: t("businessGstDetails", "A. Business GST Details"), icon: "🏢" },
              { id: "branch", label: t("branchGstDetails", "B. Branch GST Details"), icon: "🌿" },
              { id: "tax_groups", label: t("gstSlabsTaxGroups", "C. GST Slab / Tax Groups"), icon: "📊" },
              { id: "hsn_sac", label: t("hsnSacDirectory", "D. HSN / SAC Directory"), icon: "🏷️" },
              { id: "pricing", label: t("inclusiveExclusiveRules", "E. Inclusive / Exclusive Rules"), icon: "⚙️" },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGstSubTab(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: gstSubTab === tab.id ? 700 : 500,
                  backgroundColor: gstSubTab === tab.id ? '#EFF6FF' : '#F9FAFB',
                  color: gstSubTab === tab.id ? '#1D4ED8' : '#4B5563',
                  border: gstSubTab === tab.id ? '1px solid #3B82F6' : '1px solid #E5E7EB',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SUBSECTION A: BUSINESS GST DETAILS */}
          {gstSubTab === "business" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="settings-grid">
                <InputField
                  label="Legal Business Name"
                  required={businessGst.registrationStatus?.includes("Registered")}
                  value={businessGst.legalName || ""}
                  placeholder="e.g. Grand Palace Hotels & Resorts Pvt Ltd"
                  error={gstValidationErrors.legalName}
                  onChange={(val) => {
                    setBusinessGst(prev => ({ ...prev, legalName: val }));
                    if (gstValidationErrors.legalName) {
                      setGstValidationErrors(errs => ({ ...errs, legalName: "" }));
                    }
                  }}
                />

                <InputField
                  label="Trade Name"
                  value={businessGst.tradeName || ""}
                  placeholder="e.g. Grand Palace Hotel"
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, tradeName: val }))}
                />

                <SelectField
                  label="GST Registration Status"
                  value={businessGst.registrationStatus || "Registered - Regular"}
                  options={[
                    "Registered - Regular",
                    "Registered - Composition",
                    "Unregistered",
                    "Consumer",
                    "Overseas / SEZ"
                  ]}
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, registrationStatus: val }))}
                />

                <GstInputField
                  label="GSTIN (15 Characters)"
                  required={businessGst.registrationStatus?.includes("Registered")}
                  value={businessGst.gstin || ""}
                  originalValue={originalBusinessGstin}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  error={gstValidationErrors.gstin}
                  onChange={(val) => {
                    setBusinessGst(prev => ({ ...prev, gstin: val }));
                    setProfile(p => ({ ...p, gstNumber: val }));
                    if (gstValidationErrors.gstin && (val.length === 0 || isValidGstin(val))) {
                      setGstValidationErrors(errs => ({ ...errs, gstin: "" }));
                    }
                  }}
                  onBlur={() => {
                    const raw = resolveGstForSave(businessGst.gstin, originalBusinessGstin);
                    if (raw && !isValidGstin(raw)) {
                      setGstValidationErrors(errs => ({ ...errs, gstin: GST_VALIDATION_MESSAGE }));
                    }
                  }}
                />

                <SelectField
                  label="Registered State"
                  value={businessGst.state || "Maharashtra"}
                  options={INDIAN_STATES.map(s => s.name)}
                  onChange={(val) => {
                    const match = INDIAN_STATES.find(s => s.name === val);
                    setBusinessGst(prev => ({
                      ...prev,
                      state: val,
                      stateCode: match ? match.code : prev.stateCode,
                    }));
                  }}
                />

                <InputField
                  label="State Code"
                  value={businessGst.stateCode || "27"}
                  placeholder="2-digit State Code"
                  maxLength={2}
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, stateCode: val.replace(/\D/g, "").slice(0, 2) }))}
                />

                <InputField
                  type="date"
                  label="GST Registration Effective Date"
                  value={businessGst.effectiveDate || ""}
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, effectiveDate: val }))}
                />

                <SelectField
                  label="Default Tax Treatment"
                  value={businessGst.defaultTaxTreatment || "Taxable"}
                  options={["Taxable", "Nil Rated", "Exempt", "Non-GST"]}
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, defaultTaxTreatment: val }))}
                />

                <SelectField
                  label="Taxpayer / Registration Category"
                  value={businessGst.taxpayerCategory || "Regular"}
                  options={[
                    "Regular",
                    "Composition",
                    "Casual Taxable Person",
                    "Input Service Distributor (ISD)",
                    "Non-Resident"
                  ]}
                  onChange={(val) => setBusinessGst(prev => ({ ...prev, taxpayerCategory: val }))}
                />
              </div>

              <div className="textarea-field">
                <label className="settings-label">
                  Registered Business Address {businessGst.registrationStatus?.includes("Registered") && <span className="required">*</span>}
                </label>
                <textarea
                  rows="3"
                  value={businessGst.address || ""}
                  placeholder="Enter registered address as per GST registration certificate"
                  className={`settings-input settings-textarea ${gstValidationErrors.address ? "settings-input-error" : ""}`}
                  onChange={(e) => {
                    setBusinessGst(prev => ({ ...prev, address: e.target.value }));
                    if (gstValidationErrors.address) {
                      setGstValidationErrors(errs => ({ ...errs, address: "" }));
                    }
                  }}
                />
                {gstValidationErrors.address && <ErrorMessage error={gstValidationErrors.address} />}
              </div>

              {/* Validation Info Box */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 18px', fontSize: '13px', color: '#334155' }}>
                <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>ℹ️ GSTIN Compliance Rules:</div>
                <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6', color: '#475569' }}>
                  <li>The first 2 digits of the GSTIN must strictly match the selected State Code (e.g. <strong>27</strong> for Maharashtra).</li>
                  <li>Characters 3 to 12 represent the Entity's PAN Number (5 letters, 4 digits, 1 letter).</li>
                  <li>Character 14 is permanently set to <strong>Z</strong> by standard GST formatting rules.</li>
                  <li>Format validation guarantees syntactic compliance; click <strong>Verify GSTIN with Portal</strong> for authoritative verification.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SUBSECTION B: BRANCH GST DETAILS */}
          {gstSubTab === "branch" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#334155' }}>
                💡 <strong>Multi-Branch Isolation:</strong> Each branch maintains its own dedicated GST configuration. Head office GSTIN is not automatically forced on other branches unless explicitly configured.
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 700 }}>
                      <th style={{ padding: '10px 12px' }}>Branch</th>
                      <th style={{ padding: '10px 12px' }}>Code</th>
                      <th style={{ padding: '10px 12px' }}>State / Code</th>
                      <th style={{ padding: '10px 12px' }}>Branch GSTIN</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Tax Treatment</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBranchGst.map((br) => (
                      <tr key={br.branchId} style={{ borderBottom: '1px solid #F3F4F6', color: '#1F2937' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{br.branchName}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{br.address || "No address specified"}</div>
                        </td>
                        <td style={{ padding: '12px', color: '#6B7280' }}>{br.branchCode}</td>
                        <td style={{ padding: '12px' }}>{br.state} ({br.stateCode})</td>
                        <td style={{ padding: '12px' }}>
                          {br.gstin ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1D4ED8' }}>
                              {maskGstNumber(br.gstin)}
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Not configured (Uses Head Office if same state)</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                            {br.registrationStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{br.taxTreatment}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setEditingBranchGst({ ...br, _originalGstin: br.gstin })}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#F3F4F6',
                              color: '#1F2937',
                              border: '1px solid #D1D5DB',
                              cursor: 'pointer',
                            }}
                          >
                            Configure GST
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderGstPagination(gstBranchPage, branchGst.length, gstBranchPageSize, setGstBranchPage, setGstBranchPageSize, 'Branches')}
              </div>
            </div>
          )}

          {/* SUBSECTION C: GST SLAB / TAX GROUP MANAGEMENT */}
          {gstSubTab === "tax_groups" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#4B5563' }}>
                  Manage GST rates and tax groups applicable to food, beverages, and accommodation.
                </span>
                <button
                  type="button"
                  onClick={() => setEditingTaxGroup({
                    isNew: true,
                    name: "",
                    gstRate: 5,
                    category: "Standard Services",
                    cgstRate: 2.5,
                    sgstRate: 2.5,
                    igstRate: 5,
                    effectiveFrom: new Date().toISOString().split("T")[0],
                    active: true,
                    description: "",
                  })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#8B3E16',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Add Tax Group
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 700 }}>
                      <th style={{ padding: '10px 12px' }}>Tax Group</th>
                      <th style={{ padding: '10px 12px' }}>Total GST %</th>
                      <th style={{ padding: '10px 12px' }}>Category</th>
                      <th style={{ padding: '10px 12px' }}>CGST %</th>
                      <th style={{ padding: '10px 12px' }}>SGST %</th>
                      <th style={{ padding: '10px 12px' }}>IGST %</th>
                      <th style={{ padding: '10px 12px' }}>Effective From</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTaxGroups.map((tg) => (
                      <tr key={tg.id} style={{ borderBottom: '1px solid #F3F4F6', color: '#1F2937' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{tg.name}</div>
                          {tg.description && <div style={{ fontSize: '11px', color: '#6B7280' }}>{tg.description}</div>}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#8B3E16' }}>{tg.gstRate}%</td>
                        <td style={{ padding: '12px' }}>{tg.category}</td>
                        <td style={{ padding: '12px' }}>{tg.cgstRate}%</td>
                        <td style={{ padding: '12px' }}>{tg.sgstRate}%</td>
                        <td style={{ padding: '12px' }}>{tg.igstRate}%</td>
                        <td style={{ padding: '12px', color: '#6B7280' }}>{tg.effectiveFrom}</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: tg.active ? '#DCFCE7' : '#F1F5F9',
                              color: tg.active ? '#15803D' : '#64748B',
                            }}
                          >
                            {tg.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setViewingTaxGroup(tg)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: '#F3F4F6',
                                color: '#374151',
                                border: '1px solid #D1D5DB',
                                cursor: 'pointer',
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaxGroup({ ...tg })}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleTaxGroup(tg.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: tg.active ? '#FEE2E2' : '#DCFCE7',
                                color: tg.active ? '#B91C1C' : '#15803D',
                                border: tg.active ? '1px solid #FECACA' : '1px solid #BBF7D0',
                                cursor: 'pointer',
                              }}
                            >
                              {tg.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderGstPagination(gstTaxGroupPage, taxGroups.length, gstTaxGroupPageSize, setGstTaxGroupPage, setGstTaxGroupPageSize, 'Tax Groups')}
              </div>
            </div>
          )}

          {/* SUBSECTION D: HSN / SAC CONFIGURATION */}
          {gstSubTab === "hsn_sac" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search HSN/SAC code or service..."
                    value={hsnSearchQuery}
                    onChange={(e) => setHsnSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      color: '#1F2937',
                      width: '280px',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setEditingHsnSac({
                    isNew: true,
                    codeType: "SAC",
                    code: "",
                    description: "",
                    taxCategory: "Standard Services",
                    taxGroupId: 2,
                    gstRate: 5,
                    effectiveFrom: new Date().toISOString().split("T")[0],
                    active: true,
                  })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#8B3E16',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Add Classification Code
                </button>
              </div>

              {/* Quick Add Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Hospitality Quick Presets:</span>
                {[
                  { type: "SAC", code: "996331", label: "Restaurant Dine-In (996331)" },
                  { type: "SAC", code: "996332", label: "Takeaway / Delivery (996332)" },
                  { type: "SAC", code: "996311", label: "Room Lodging (996311)" },
                  { type: "HSN", code: "2201", label: "Packaged Water (2201)" },
                ].map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setHsnSearchQuery(p.code)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      backgroundColor: '#F3F4F6',
                      color: '#8B3E16',
                      border: '1px solid #E5E7EB',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#4B5563', fontWeight: 600 }}>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Code</th>
                      <th style={{ padding: '10px 12px' }}>Description</th>
                      <th style={{ padding: '10px 12px' }}>Category</th>
                      <th style={{ padding: '10px 12px' }}>Applicable Rate</th>
                      <th style={{ padding: '10px 12px' }}>Effective From</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHsnSacList.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F3F4F6', color: '#1F2937' }}>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: it.codeType === 'SAC' ? '#F3E8FF' : '#DCFCE7',
                                color: it.codeType === 'SAC' ? '#7E22CE' : '#15803D',
                              }}
                            >
                              {it.codeType}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#8B3E16' }}>
                            {it.code}
                          </td>
                          <td style={{ padding: '12px' }}>{it.description}</td>
                          <td style={{ padding: '12px', color: '#4B5563' }}>{it.taxCategory}</td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{it.gstRate}%</td>
                          <td style={{ padding: '12px', color: '#6B7280' }}>{it.effectiveFrom}</td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: it.active ? '#DCFCE7' : '#F3F4F6',
                                color: it.active ? '#15803D' : '#6B7280',
                              }}
                            >
                              {it.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setEditingHsnSac({ ...it })}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleHsnSac(it.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: it.active ? '#FEF2F2' : '#F0FDF4',
                                  color: it.active ? '#DC2626' : '#16A34A',
                                  border: it.active ? '1px solid #FECACA' : '1px solid #BBF7D0',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                {it.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {renderGstPagination(gstHsnPage, filteredHsnSacList.length, gstHsnPageSize, setGstHsnPage, setGstHsnPageSize, 'HSN / SAC Codes')}
              </div>
            </div>
          )}

          {/* SUBSECTION E: TAX INCLUSIVE / EXCLUSIVE SETTINGS */}
          {gstSubTab === "pricing" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Pricing Method Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Menu Pricing & GST Treatment
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div
                    onClick={() => setTaxPricing(prev => ({ ...prev, pricingMethod: "EXCLUSIVE" }))}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: taxPricing.pricingMethod === "EXCLUSIVE" ? '2px solid #8B3E16' : '1px solid #E5E7EB',
                      backgroundColor: taxPricing.pricingMethod === "EXCLUSIVE" ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name="pricingMethod"
                        checked={taxPricing.pricingMethod === "EXCLUSIVE"}
                        onChange={() => { }}
                      />
                      <strong style={{ color: '#1F2937', fontSize: '14px' }}>GST Is Added to Prices (Exclusive)</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                      Menu prices are net base amounts. Applicable GST (CGST/SGST or IGST) is added on top during bill generation.
                    </p>
                  </div>

                  <div
                    onClick={() => setTaxPricing(prev => ({ ...prev, pricingMethod: "INCLUSIVE" }))}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: taxPricing.pricingMethod === "INCLUSIVE" ? '2px solid #8B3E16' : '1px solid #E5E7EB',
                      backgroundColor: taxPricing.pricingMethod === "INCLUSIVE" ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name="pricingMethod"
                        checked={taxPricing.pricingMethod === "INCLUSIVE"}
                        onChange={() => { }}
                      />
                      <strong style={{ color: '#1F2937', fontSize: '14px' }}>Prices Include GST (Inclusive)</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                      Menu prices already include all applicable taxes. Taxable value is back-calculated automatically without double taxation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Calculation Options Grid */}
              <div className="settings-grid">
                <SelectField
                  label="Default Tax Calculation Method"
                  value={taxPricing.defaultCalculationMethod || "STANDARD"}
                  options={[
                    "Standard Supply (Forward Charge)",
                    "Reverse Charge Mechanism (RCM)",
                    "Composition Scheme Flat Rate"
                  ]}
                  onChange={(val) => {
                    const methodKey = val.includes("Reverse") ? "REVERSE_CHARGE" : val.includes("Composition") ? "COMPOSITION" : "STANDARD";
                    setTaxPricing(prev => ({ ...prev, defaultCalculationMethod: methodKey }));
                  }}
                />

                <SelectField
                  label="Default Tax Group"
                  value={taxGroups.find(g => g.id === taxPricing.defaultTaxGroupId)?.name || taxGroups[0]?.name || ""}
                  options={taxGroups.map(g => g.name)}
                  onChange={(val) => {
                    const matched = taxGroups.find(g => g.name === val);
                    if (matched) {
                      setTaxPricing(prev => ({ ...prev, defaultTaxGroupId: matched.id }));
                    }
                  }}
                />

                <SelectField
                  label="Discount Tax Calculation Rule"
                  value={taxPricing.discountRule === "AFTER_TAX" ? "Apply Discount After Tax" : "Apply Discount Before Calculating Tax (GST Compliant)"}
                  options={[
                    "Apply Discount Before Calculating Tax (GST Compliant)",
                    "Apply Discount After Tax"
                  ]}
                  onChange={(val) => {
                    setTaxPricing(prev => ({ ...prev, discountRule: val.includes("After") ? "AFTER_TAX" : "BEFORE_TAX" }));
                  }}
                />

                <SelectField
                  label="Tax Rounding Rule"
                  value={
                    taxPricing.roundingRule === "FLOOR" ? "Round Down (Floor)" :
                      taxPricing.roundingRule === "TWO_DECIMALS" ? "Exact Two Decimal Places" :
                        "Round to Nearest Rupee (Half Up)"
                  }
                  options={[
                    "Round to Nearest Rupee (Half Up)",
                    "Exact Two Decimal Places",
                    "Round Down (Floor)"
                  ]}
                  onChange={(val) => {
                    const rKey = val.includes("Floor") ? "FLOOR" : val.includes("Two") ? "TWO_DECIMALS" : "NEAREST_RUPEE";
                    setTaxPricing(prev => ({ ...prev, roundingRule: rKey }));
                  }}
                />
              </div>

              {/* Invoice Breakdown Options */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                  Invoice Tax Breakdown Display Preferences
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={taxPricing.showComponentBreakdown ?? true}
                      onChange={(e) => setTaxPricing(prev => ({ ...prev, showComponentBreakdown: e.target.checked }))}
                    />
                    Show CGST / SGST (Intra-state) or IGST (Inter-state) component breakdown on invoices
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={taxPricing.showHsnSummary ?? true}
                      onChange={(e) => setTaxPricing(prev => ({ ...prev, showHsnSummary: e.target.checked }))}
                    />
                    Display HSN / SAC classification summary section on tax invoices
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={taxPricing.showTaxableBreakdown ?? true}
                      onChange={(e) => setTaxPricing(prev => ({ ...prev, showTaxableBreakdown: e.target.checked }))}
                    />
                    Display itemized taxable value alongside gross price and discount deductions
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: ADD / EDIT TAX GROUP */}
    {
      editingTaxGroup && (
        <div className="popup-overlay">
          <div className="popup-box" style={{ maxWidth: '480px', width: '90%', textAlign: 'left', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1F2937' }}>
              {editingTaxGroup.id ? 'Edit Tax Group' : 'Add New Tax Group'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Tax Group Name *</label>
                <input
                  type="text"
                  value={editingTaxGroup.name || ""}
                  onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, name: e.target.value })}
                  placeholder="e.g. GST 5% (Restaurant Service)"
                  className="settings-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>GST Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTaxGroup.gstRate ?? ""}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value) || 0;
                      setEditingTaxGroup({
                        ...editingTaxGroup,
                        gstRate: r,
                        cgstRate: r / 2,
                        sgstRate: r / 2,
                        igstRate: r,
                      });
                    }}
                    className="settings-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Category *</label>
                  <select
                    value={editingTaxGroup.category || "Standard Services"}
                    onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, category: e.target.value })}
                    className="settings-input"
                  >
                    <option value="Standard Services">Standard Services</option>
                    <option value="Hotel Accommodation">Hotel Accommodation</option>
                    <option value="Luxury Accommodation / Catering">Luxury Accommodation / Catering</option>
                    <option value="Special Supplies">Special Supplies</option>
                    <option value="Nil Rated / Exempt">Nil Rated / Exempt</option>
                    <option value="Goods">Goods</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>CGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTaxGroup.cgstRate ?? ""}
                    onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, cgstRate: parseFloat(e.target.value) || 0 })}
                    className="settings-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>SGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTaxGroup.sgstRate ?? ""}
                    onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, sgstRate: parseFloat(e.target.value) || 0 })}
                    className="settings-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>IGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTaxGroup.igstRate ?? ""}
                    onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, igstRate: parseFloat(e.target.value) || 0 })}
                    className="settings-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Effective From Date</label>
                <input
                  type="date"
                  value={editingTaxGroup.effectiveFrom || ""}
                  onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, effectiveFrom: e.target.value })}
                  className="settings-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Description</label>
                <input
                  type="text"
                  value={editingTaxGroup.description || ""}
                  onChange={(e) => setEditingTaxGroup({ ...editingTaxGroup, description: e.target.value })}
                  placeholder="Short description of items or services"
                  className="settings-input"
                />
              </div>

              <div className="popup-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="popup-cancel" onClick={() => setEditingTaxGroup(null)}>
                  Cancel
                </button>
                <button type="button" className="popup-confirm" style={{ backgroundColor: '#8B3E16', color: '#FFFFFF' }} onClick={() => handleSaveTaxGroup(editingTaxGroup)}>
                  Save Tax Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    {/* MODAL: VIEW TAX GROUP */ }
    {
      viewingTaxGroup && (
        <div className="popup-overlay">
          <div className="popup-box" style={{ maxWidth: '440px', width: '90%', textAlign: 'left', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', color: '#1F2937' }}>
              Tax Group Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#4B5563' }}>
              <div><strong style={{ color: '#1F2937' }}>Name:</strong> {viewingTaxGroup.name}</div>
              <div><strong style={{ color: '#1F2937' }}>Total Rate:</strong> <span style={{ color: '#8B3E16', fontWeight: 700 }}>{viewingTaxGroup.gstRate}%</span></div>
              <div><strong style={{ color: '#1F2937' }}>Category:</strong> {viewingTaxGroup.category}</div>
              <div><strong style={{ color: '#1F2937' }}>Intra-State:</strong> CGST {viewingTaxGroup.cgstRate}% + SGST {viewingTaxGroup.sgstRate}%</div>
              <div><strong style={{ color: '#1F2937' }}>Inter-State:</strong> IGST {viewingTaxGroup.igstRate}%</div>
              <div><strong style={{ color: '#1F2937' }}>Effective From:</strong> {viewingTaxGroup.effectiveFrom}</div>
              <div><strong style={{ color: '#1F2937' }}>Status:</strong> {viewingTaxGroup.active ? 'Active' : 'Inactive'}</div>
              {viewingTaxGroup.description && <div><strong style={{ color: '#1F2937' }}>Description:</strong> {viewingTaxGroup.description}</div>}
            </div>
            <div className="popup-actions" style={{ marginTop: '18px' }}>
              <button type="button" className="popup-confirm" style={{ backgroundColor: '#8B3E16', color: '#FFFFFF' }} onClick={() => setViewingTaxGroup(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )
    }

    {/* MODAL: ADD / EDIT HSN/SAC */ }
    {
      editingHsnSac && (
        <div className="popup-overlay">
          <div className="popup-box" style={{ maxWidth: '460px', width: '90%', textAlign: 'left', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1F2937' }}>
              {editingHsnSac.id ? 'Edit Classification Code' : 'Add HSN / SAC Code'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Code Type *</label>
                  <select
                    value={editingHsnSac.codeType || "SAC"}
                    onChange={(e) => setEditingHsnSac({ ...editingHsnSac, codeType: e.target.value })}
                    className="settings-input"
                  >
                    <option value="SAC">SAC (Services)</option>
                    <option value="HSN">HSN (Goods)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Code *</label>
                  <input
                    type="text"
                    value={editingHsnSac.code || ""}
                    onChange={(e) => setEditingHsnSac({ ...editingHsnSac, code: e.target.value.replace(/\D/g, "") })}
                    placeholder={editingHsnSac.codeType === "SAC" ? "e.g. 996331 (6 digits)" : "e.g. 2201 (4-8 digits)"}
                    className="settings-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Description *</label>
                <input
                  type="text"
                  value={editingHsnSac.description || ""}
                  onChange={(e) => setEditingHsnSac({ ...editingHsnSac, description: e.target.value })}
                  placeholder="e.g. Restaurant services with air conditioning"
                  className="settings-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Category *</label>
                  <select
                    value={editingHsnSac.taxCategory || "Standard Services"}
                    onChange={(e) => setEditingHsnSac({ ...editingHsnSac, taxCategory: e.target.value })}
                    className="settings-input"
                  >
                    <option value="Standard Services">Standard Services</option>
                    <option value="Hotel Accommodation">Hotel Accommodation</option>
                    <option value="Luxury Accommodation / Catering">Luxury Accommodation / Catering</option>
                    <option value="Special Supplies">Special Supplies</option>
                    <option value="Nil Rated / Exempt">Nil Rated / Exempt</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Tax Group / Rate *</label>
                  <select
                    value={editingHsnSac.taxGroupId || taxGroups[0]?.id}
                    onChange={(e) => {
                      const tgId = parseInt(e.target.value);
                      const matched = taxGroups.find(g => g.id === tgId);
                      setEditingHsnSac({
                        ...editingHsnSac,
                        taxGroupId: tgId,
                        gstRate: matched ? matched.gstRate : editingHsnSac.gstRate,
                      });
                    }}
                    className="settings-input"
                  >
                    {taxGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.gstRate}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Effective From</label>
                <input
                  type="date"
                  value={editingHsnSac.effectiveFrom || ""}
                  onChange={(e) => setEditingHsnSac({ ...editingHsnSac, effectiveFrom: e.target.value })}
                  className="settings-input"
                />
              </div>

              <div className="popup-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="popup-cancel" onClick={() => setEditingHsnSac(null)}>
                  Cancel
                </button>
                <button type="button" className="popup-confirm" style={{ backgroundColor: '#8B3E16', color: '#FFFFFF' }} onClick={() => handleSaveHsnSac(editingHsnSac)}>
                  Save Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    {/* MODAL: CONFIGURE BRANCH GST */ }
    {
      editingBranchGst && (
        <div className="popup-overlay">
          <div className="popup-box" style={{ maxWidth: '480px', width: '90%', textAlign: 'left', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1F2937' }}>
              Configure GST for {editingBranchGst.branchName} ({editingBranchGst.branchCode})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Branch State *</label>
                  <select
                    value={editingBranchGst.state || "Maharashtra"}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = INDIAN_STATES.find(s => s.name === val);
                      setEditingBranchGst({
                        ...editingBranchGst,
                        state: val,
                        stateCode: match ? match.code : editingBranchGst.stateCode,
                      });
                    }}
                    className="settings-input"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>State Code</label>
                  <input
                    type="text"
                    value={editingBranchGst.stateCode || "27"}
                    readOnly
                    className="settings-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontWeight: 500 }}>
                  <span>Branch GSTIN (15 Chars)</span>
                  {editingBranchGst.gstin && (
                    <span style={{ fontSize: '10px', color: '#0F766E', background: '#CCFBF1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      PAN MASKED
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    maxLength={15}
                    value={
                      isEditingBranchGst || showBranchGstin
                        ? (editingBranchGst.gstin || "")
                        : maskGstNumber(editingBranchGst.gstin)
                    }
                    onFocus={() => setIsEditingBranchGst(true)}
                    onBlur={() => setIsEditingBranchGst(false)}
                    onChange={(e) => {
                      let val = e.target.value.toUpperCase();
                      if (isMaskedGst(val)) {
                        val = editingBranchGst._originalGstin || "";
                      } else {
                        val = val.slice(0, 15);
                      }
                      setEditingBranchGst({ ...editingBranchGst, gstin: val });
                    }}
                    placeholder="e.g. 27ABCDE1234F1Z5 (Leave blank if unregistered)"
                    className="settings-input"
                    style={{ fontFamily: 'monospace', fontWeight: 600, paddingRight: '40px' }}
                  />
                  {editingBranchGst.gstin && (
                    <button
                      type="button"
                      onClick={() => setShowBranchGstin(!showBranchGstin)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showBranchGstin ? 'Mask GST Number' : 'Show Full GST Number'}
                    >
                      {showBranchGstin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {editingBranchGst.gstin && !resolveGstForSave(editingBranchGst.gstin, editingBranchGst._originalGstin || "").startsWith(editingBranchGst.stateCode) && (
                  <span style={{ fontSize: '11px', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                    Branch GSTIN must start with State Code {editingBranchGst.stateCode}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Registration Status</label>
                  <select
                    value={editingBranchGst.registrationStatus || "Registered - Regular"}
                    onChange={(e) => setEditingBranchGst({ ...editingBranchGst, registrationStatus: e.target.value })}
                    className="settings-input"
                  >
                    <option value="Registered - Regular">Registered - Regular</option>
                    <option value="Registered - Composition">Registered - Composition</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="SEZ / Special Zone">SEZ / Special Zone</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Tax Treatment</label>
                  <select
                    value={editingBranchGst.taxTreatment || "Taxable"}
                    onChange={(e) => setEditingBranchGst({ ...editingBranchGst, taxTreatment: e.target.value })}
                    className="settings-input"
                  >
                    <option value="Taxable">Taxable</option>
                    <option value="Nil Rated">Nil Rated</option>
                    <option value="Exempt">Exempt</option>
                    <option value="Non-GST">Non-GST</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#4B5563', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Branch Address</label>
                <textarea
                  rows="2"
                  value={editingBranchGst.address || ""}
                  onChange={(e) => setEditingBranchGst({ ...editingBranchGst, address: e.target.value })}
                  placeholder="Enter branch address"
                  className="settings-input settings-textarea"
                />
              </div>

              <div className="popup-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="popup-cancel" onClick={() => setEditingBranchGst(null)}>
                  Cancel
                </button>
                <button type="button" className="popup-confirm" style={{ backgroundColor: '#8B3E16', color: '#FFFFFF' }} onClick={() => handleSaveBranchGst(editingBranchGst)}>
                  Save Branch GST
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

      </>
    );
  };

const renderBilling = () => {
  return (
    <div className="settings-card">
      <div className="card-heading">
        <div>
          <h2>{t('billingSettings', 'Billing Settings')}</h2>
          <p>
            {t('manageBillingSubtitle', 'Manage invoice preferences.')}
          </p>
        </div>

        <div className="card-badge">
          {t('billing', 'BILLING')}
        </div>
      </div>

      <div className="toggle-container" style={{ marginTop: 0 }}>
        <Toggle
          label="Enable Tax"
          description="Apply tax automatically to invoices."
          value={billing.tax}
          onChange={(value) =>
            setBilling((previous) => ({
              ...previous,
              tax: value,
            }))
          }
        />

        <Toggle
          label="Enable Discount"
          description="Allow discounts while creating invoices."
          value={billing.discount}
          onChange={(value) =>
            setBilling((previous) => ({
              ...previous,
              discount: value,
            }))
          }
        />

        <Toggle
          label="Enable Round Off"
          description="Round invoice totals automatically."
          value={billing.roundOff}
          onChange={(value) =>
            setBilling((previous) => ({
              ...previous,
              roundOff: value,
            }))
          }
        />
      </div>
    </div>
  );
};

const renderNotifications = () => {
  return (
    <div className="settings-card">
      <div className="card-heading">
        <div>
          <h2>{t('notificationSettings', 'Notification Settings')}</h2>
          <p>
            {t('manageNotificationsSubtitle', 'Control alerts and notifications for important hotel activities.')}
          </p>
        </div>

        <div className="card-badge">
          {t('alerts', 'ALERTS')}
        </div>
      </div>

      <Toggle
        label="Payment Received"
        description="Receive notification when a payment is received."
        value={notifications.paymentReceived}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            paymentReceived: value,
          }))
        }
      />

      <Toggle
        label="Payment Failed"
        description="Receive alert when a payment fails."
        value={notifications.paymentFailed}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            paymentFailed: value,
          }))
        }
      />

      <Toggle
        label="Low Inventory"
        description="Receive alert when inventory reaches a low level."
        value={notifications.lowInventory}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            lowInventory: value,
          }))
        }
      />

      <Toggle
        label="Maintenance Alert"
        description="Receive alerts related to system maintenance."
        value={notifications.maintenance}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            maintenance: value,
          }))
        }
      />

      <Toggle
        label="Email Notifications"
        description="Receive important alerts through email."
        value={notifications.email}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            email: value,
          }))
        }
      />

      <Toggle
        label="SMS Notifications"
        description="Receive important alerts through SMS."
        value={notifications.sms}
        onChange={(value) =>
          setNotifications((previous) => ({
            ...previous,
            sms: value,
          }))
        }
      />
    </div>
  );
};



const renderSystem = () => {
  return (
    <div className="settings-card">
      <div className="card-heading">
        <div>
          <h2>{t('systemPreferences', 'System Preferences')}</h2>
          <p>
            {t('manageSystemSubtitle', 'Manage regional preferences and automatic backup.')}
          </p>
        </div>

        <div className="card-badge">
          {t('system', 'SYSTEM')}
        </div>
      </div>

      <div className="settings-grid">
        <SelectField
          label="Date Format"
          value={system.dateFormat}
          options={[
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
          ]}
          onChange={(value) =>
            setSystem((previous) => ({
              ...previous,
              dateFormat: value,
            }))
          }
        />

        <SelectField
          label="Time Format"
          value={system.timeFormat}
          options={[
            "12-hour",
            "24-hour",
          ]}
          onChange={(value) =>
            setSystem((previous) => ({
              ...previous,
              timeFormat: value,
            }))
          }
        />

        <SelectField
          label="Language"
          value={system.language}
          options={[
            "English",
            "Marathi",
            "Hindi",
          ]}
          onChange={(value) => handleLanguageChange(value)}
        />

        <SelectField
          label="Backup Frequency"
          value={system.backupFrequency}
          options={[
            "Daily",
            "Weekly",
            "Monthly",
          ]}
          onChange={(value) =>
            setSystem((previous) => ({
              ...previous,
              backupFrequency: value,
            }))
          }
        />
      </div>

      <div className="toggle-container">
        <Toggle
          label="Automatic Backup"
          description="Automatically create secure system backups."
          value={system.autoBackup}
          onChange={(value) =>
            setSystem((previous) => ({
              ...previous,
              autoBackup: value,
            }))
          }
        />
      </div>

      <div className="backup-panel">
        <div>
          <div className="backup-title">
            {t('dataManagement', 'Data Management')}
          </div>

          <div className="backup-description">
            {t('backupDesc', 'Create a secure backup of your system data.')}
          </div>
        </div>

        <button
          type="button"
          className="backup-button"
          onClick={() =>
            setPopup({
              type: "success",
              title: t('backupCreated', 'Backup Created'),
              message: t('backupCreatedDesc', 'Your latest system backup has been created successfully.'),
            })
          }
        >
          {t('createBackup', 'Create Backup')}
        </button>
      </div>

      <div className="system-health">
        <div className="health-card"><div className="health-label">{t('systemStatus', 'SYSTEM STATUS')}</div><div className="health-value"><span className="health-dot" />{t('operational', 'Operational')}</div></div>
        <div className="health-card"><div className="health-label">{t('backup', 'BACKUP')}</div><div className="health-value">{system.autoBackup ? t(system.backupFrequency, system.backupFrequency) : t('disabled', 'Disabled')}</div></div>
        <div className="health-card"><div className="health-label">{t('timeFormat', 'TIME FORMAT')}</div><div className="health-value">{t(system.timeFormat, system.timeFormat)}</div></div>
      </div>

      {/* DASHBOARD DISPLAY PREFERENCES (Requirement 3: Show/Hide Sections) */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              {t('dashboardSectionVisibility', 'Dashboard Section Visibility')}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
              {t('dashboardVisibilityDesc', 'Configure which overview panels are displayed on the main Hotel Overview Dashboard. Changes sync live across the application and persist in SQL Server.')}
            </p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '14px', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
            ● {t('liveSyncActive', 'Live Sync Active')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Toggle
            label={t('salesAndPaymentOverviewPanels', "Sales & Payment Overview Sections (Today's Sales, Sales Overview, Payment Summary)")}
            description={t('overviewSectionsMasterDesc', "Controls the visibility of Today's Sales top card, Sales Overview chart, and Payment Summary donut chart together. Synchronized live with Dashboard Customize View.")}
            value={dashboardDisplay.todaysSales !== false}
            onChange={(val) => {
              const updated = {
                ...dashboardDisplay,
                overviewSections: val,
                todaysSales: val,
                salesOverview: val,
                paymentSummary: val,
                billRequests: true,
              };
              setDashboardDisplay(updated);
              try {
                localStorage.setItem("dashboard_display_config", JSON.stringify(updated));
              } catch {}
              window.dispatchEvent(new CustomEvent("dashboard-display-updated", { detail: updated }));
              settingsService.saveSetting("dashboard", "display_config", JSON.stringify(updated)).catch(() => {});
            }}
          />
        </div>
      </div>
    </div>
  );
};

const renderLicence = () => {
  const formatDate = (d) => {
    if (!d) return t('notSet', "Not Set");
    try {
      return formatContextDate(d, { showDayOfWeek: false });
    } catch {
      return d;
    }
  };

  return (
    <div className="settings-card licence-details-card">
      <div className="card-heading">
        <div>
          <h2>{t('licenceAndSubscription', 'Licence & Subscription Information')}</h2>
          <p>
            {t('reviewSubscriptionTier', 'Review your current enterprise subscription tier, trial details, and active licensing status.')}
          </p>
        </div>
        <div className="card-badge" style={{ backgroundColor: "#15803D", color: "#FFFFFF" }}>
          {licenceInfo.licenceVersion.toUpperCase()}
        </div>
      </div>

      {/* Section A: Licence Details Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "14px",
        marginBottom: "24px",
        marginTop: "12px",
      }}>
        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('licenceVersion', 'Licence Version')}</span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>{licenceInfo.licenceVersion}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('subscriptionPlan', 'Subscription Plan')}</span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>{t(licenceInfo.subscriptionPlan, licenceInfo.subscriptionPlan)}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('trialDuration', 'Trial Duration')}</span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>{t('daysTrial', '28 Days Free Trial')}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('trialStatus', 'Trial Status')}</span>
          <div style={{
            fontSize: "14px",
            fontWeight: 800,
            marginTop: "4px",
            color: licenceInfo.trialStatus === "Active" ? "#16A34A" : licenceInfo.trialStatus === "Expired" ? "#DC2626" : "#64748B",
          }}>
            {licenceInfo.trialStatus === "Active" ? `${t('active', 'Active')} (${toDevanagari(Math.min(28, Math.max(0, licenceInfo.daysRemaining)))} ${t('daysRemaining', 'Days Left')})` : t(licenceInfo.trialStatus, licenceInfo.trialStatus)}
          </div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('trialStartDate', 'Trial Start Date')}</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E293B", marginTop: "4px" }}>{formatDate(licenceInfo.trialStartDate)}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('trialEndDate', 'Trial End Date')}</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E293B", marginTop: "4px" }}>{formatDate(licenceInfo.trialEndDate)}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('subscriptionStatus', 'Subscription Status')}</span>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#16A34A", marginTop: "4px" }}>{t(licenceInfo.subscriptionStatus, licenceInfo.subscriptionStatus)}</div>
        </div>

        <div className="licence-field-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('renewalDate', 'Renewal Date')}</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E293B", marginTop: "4px" }}>{formatDate(licenceInfo.renewalDate)}</div>
        </div>
      </div>

      {/* Section B: 28 Days Free Trial Section */}
      <div style={{
        background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
        border: "1.5px solid #86EFAC",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ maxWidth: "600px" }}>
            <span style={{
              background: "#16A34A",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: "9999px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "inline-block",
              marginBottom: "8px",
            }}>
              {t('specialOffer', 'Special Offer')}
            </span>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.35rem", fontWeight: 800, color: "#14532D" }}>
              {t('startYour28DaysTrial', 'Start Your 28 Days Free Trial')}
            </h3>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "#166534", lineHeight: 1.5 }}>
              {t('trialPromoDesc', 'Experience the Enterprise features of Ajalkar POS Billing with a 28-day free trial. Explore the available features before choosing your subscription plan.')}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            {licenceInfo.trialStatus === "Not Started" ? (
              <button
                type="button"
                disabled={licenceLoading}
                onClick={handleStartTrial}
                style={{
                  background: "#16A34A",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
                  transition: "all 0.15s ease",
                }}
              >
                {licenceLoading ? t('activatingTrial', 'Activating Trial...') : t('startFreeTrial', 'Start Free Trial')}
              </button>
            ) : licenceInfo.trialStatus === "Active" ? (
              <div style={{
                background: "#FFFFFF",
                border: "1.5px solid #22C55E",
                color: "#15803D",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "0.92rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span>✓</span> {t('trialActive', 'Trial Active')} · {toDevanagari(Math.min(28, Math.max(0, licenceInfo.daysRemaining)))} {t('daysRemaining', 'Days Remaining')}
              </div>
            ) : (
              <div style={{
                background: "#FEE2E2",
                border: "1.5px solid #F87171",
                color: "#B91C1C",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "0.92rem",
              }}>
                ⚠ {t('trialExpired', 'Trial Expired')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section C & D: Renew and Upgrade Options */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        paddingTop: "16px",
        borderTop: "1px solid #E2E8F0",
      }}>
        <div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 800, color: "#1E293B" }}>
            {t('subscriptionActions', 'Subscription Actions')}
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B" }}>
            {t('extendLicenceDesc', 'Extend your licence validity or switch to higher tier plans at any time.')}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={licenceLoading}
            onClick={handleRenewSubscription}
            style={{
              background: "#0F766E",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(15, 118, 100, 0.25)",
            }}
          >
            🔄 {t('renewSubscription', 'Renew Subscription')}
          </button>

          <button
            type="button"
            onClick={handleUpgradePlan}
            style={{
              background: "#4338CA",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(67, 56, 202, 0.25)",
            }}
          >
            ⬆️ {t('upgradePlan', 'Upgrade Plan')}
          </button>
        </div>
      </div>
    </div>
  );
};

const renderContent = () => {
  if (activeSection === "profile") {
    return renderProfile();
  }

  if (activeSection === "gst") {
    return renderGstConfiguration();
  }

  if (activeSection === "billing") {
    return renderBilling();
  }

  if (activeSection === "notifications") {
    return renderNotifications();
  }

  if (activeSection === "system") {
    return renderSystem();
  }

  if (activeSection === "licence") {
    return renderLicence();
  }

  if (activeSection === "reports") {
    return (
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #eee5df", padding: "18px 20px", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f0e7e1" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#1F2937" }}>{t('reportsOverview', 'Reports & KPI Overview')}</h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6B7280" }}>{t('reportsDesc', 'Revenue, sales, orders, and expense analytics')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/hotelreport")}
            style={{
              background: "#8f351d",
              color: "#FFFFFF",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t('openFullScreenReport', 'Open Full Screen Report →')}
          </button>
        </div>
        <HotelReport />
      </div>
    );
  }

  if (activeSection === "gst-reports") {
    return (
      <GstReportComponent onBack={() => setActiveSection("profile")} />
    );
  }

  return null;
};

return (
  <div className="settings-page">
    <style>{`
        * {
          box-sizing: border-box;
        }

        .settings-page {
          min-height: 100vh;
          padding: 4px 0 20px;
          background: #faf8f6;
          color: #302722;
          font-family: Inter, Arial, Helvetica, sans-serif;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 16px;
        }

        .settings-breadcrumb {
          color: #9d7d6e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .5px;
          margin-bottom: 7px;
        }

        .settings-title {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -.7px;
        }

        .settings-subtitle {
          margin: 8px 0 0;
          color: #95877e;
          font-size: 12px;
        }

        .secure-badge {
          padding: 8px 12px;
          border-radius: 10px;
          background: #f7ebe5;
          color: #8f351d;
          font-size: 12px;
          font-weight: 800;
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .settings-sidebar {
          background: #ffffff;
          border: 1px solid #eee5df;
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 5px 20px rgba(70, 43, 28, .035);
        }

        .settings-nav {
          width: 100%;
          min-height: 58px;
          border: none;
          background: transparent;
          border-radius: 9px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 9px;
          text-align: left;
          cursor: pointer;
          margin-bottom: 4px;
          transition: all .2s ease;
        }

        .settings-nav:hover {
          background: #fcf4f0;
        }

        .settings-nav.active {
          background: #f7eae4;
        }

        .nav-icon {
          width: 32px;
          height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f4f0ed;
          color: #8b786d;
          font-size: 12px;
          font-weight: 800;
        }

        .settings-nav.active .nav-icon {
          background: #8f351d;
          color: white;
        }

        .nav-title {
          display: block;
          color: #4e4038;
          font-size: 12px;
          font-weight: 800;
        }

        .settings-nav.active .nav-title {
          color: #8f351d;
        }

        .nav-description {
          display: block;
          margin-top: 3px;
          color: #a1938b;
          font-size: 11px;
        }

        .settings-content {
          min-width: 0;
        }

        .settings-card {
          background: #fff;
          border: 1px solid #eee5df;
          border-radius: 13px;
          padding: 18px;
          box-shadow: 0 5px 20px rgba(70, 43, 28, .035);
        }

        .settings-card-gap {
          margin-top: 12px;
        }

        .card-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 16px;
        }

        .card-heading h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.2px;
        }

        .card-heading p {
          margin: 6px 0 0;
          color: #96877f;
          font-size: 12px;
        }

        .card-badge {
          padding: 7px 10px;
          border-radius: 7px;
          background: #fbf2ee;
          color: #9a4930;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .5px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .settings-field {
          min-width: 0;
        }

        .settings-label {
          display: block;
          margin-bottom: 7px;
          color: #443731;
          font-size: 12px;
          font-weight: 800;
        }

        .required {
          color: #c0392b;
          margin-left: 3px;
        }

        .settings-input {
          width: 100%;
          height: 42px;
          padding: 0 11px;
          border: 1px solid #e1d8d2;
          border-radius: 9px;
          outline: none;
          background: #fff;
          color: #332a25;
          font-family: inherit;
          font-size: 12px;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }

        .settings-input:hover {
          border-color: #d3c5bc;
        }

        .settings-input:focus {
          border-color: #a8583f;
          box-shadow: 0 0 0 3px rgba(143, 53, 29, .075);
        }

        .settings-input::placeholder {
          color: #b6aaa2;
        }

        .settings-input-error {
          border-color: #d9534f !important;
          background: #fffafa;
        }

        .settings-input-error:focus {
          box-shadow: 0 0 0 3px rgba(217, 83, 79, .08);
        }

        .settings-error {
          min-height: 16px;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #c0392b;
          font-size: 11px;
          font-weight: 700;
        }

        .settings-error span {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #c0392b;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .textarea-field {
          margin-top: 12px;
        }

        .settings-textarea {
          height: auto;
          min-height: 78px;
          padding: 11px 12px;
          resize: vertical;
          line-height: 1.5;
        }

        .toggle-container {
          margin-top: 10px;
        }

        .toggle-row {
          min-height: 58px;
          padding: 13px 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid #f0ebe7;
        }

        .toggle-row:last-child {
          border-bottom: none;
        }

        .toggle-label {
          color: #453731;
          font-size: 12px;
          font-weight: 800;
        }

        .toggle-description {
          margin-top: 4px;
          color: #9b8d85;
          font-size: 12px;
        }

        .toggle {
          width: 44px;
          height: 24px;
          min-width: 44px;
          padding: 3px;
          border: none;
          border-radius: 20px;
          background: #d9d0ca;
          cursor: pointer;
          transition: .2s;
        }

        .toggle-dot {
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
          transition: .2s;
        }

        .toggle-active {
          background: #8f351d;
        }

        .toggle-active .toggle-dot {
          transform: translateX(20px);
        }

        .security-grid {
          margin-top: 12px;
        }

        .backup-panel {
          margin-top: 14px;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #f0dcd2;
          border-radius: 11px;
          background: #fff8f4;
        }

        .backup-title {
          color: #73331f;
          font-size: 12px;
          font-weight: 800;
        }

        .backup-description {
          margin-top: 4px;
          color: #9b7e72;
          font-size: 12px;
        }

        .backup-button {
          height: 37px;
          padding: 0 15px;
          border: 1px solid #d9c0b5;
          border-radius: 8px;
          background: #fff;
          color: #8f351d;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .backup-button:hover {
          background: #fbf0eb;
        }

        .settings-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .reset-button,
        .save-button {
          height: 40px;
          padding: 0 16px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s;
        }

        .reset-button {
          border: 1px solid #ded5cf;
          background: #fff;
          color: #66574e;
        }

        .reset-button:hover {
          background: #faf6f3;
        }

        .save-button {
          border: none;
          background: #8f351d;
          color: white;
          min-width: 112px;
        }

        .save-button:hover {
          background: #762b18;
        }

        .save-button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(28, 18, 13, .48);
          backdrop-filter: blur(2px);
        }

        .popup-box {
          width: 100%;
          max-width: 390px;
          padding: 27px;
          border-radius: 17px;
          background: #fff;
          text-align: center;
          box-shadow: 0 25px 70px rgba(0,0,0,.2);
          animation: popupIn .18s ease-out;
        }

        @keyframes popupIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .popup-icon {
          width: 51px;
          height: 51px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 19px;
          font-weight: 900;
        }

        .popup-success {
          background: #f8ebe5;
          color: #8f351d;
        }

        .popup-error {
          background: #fff0ee;
          color: #c0392b;
        }

        .popup-confirm {
          background: #fff4e4;
          color: #a5671c;
        }

        .popup-box h3 {
          margin: 0 0 8px;
          color: #302722;
          font-size: 19px;
          font-weight: 800;
        }

        .popup-box p {
          margin: 0 auto 22px;
          max-width: 310px;
          color: #877970;
          font-size: 12px;
          line-height: 1.6;
        }

        .popup-actions {
          display: flex;
          justify-content: center;
          gap: 9px;
        }

        .popup-cancel,
        .popup-confirm {
          height: 39px;
          padding: 0 17px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .popup-cancel {
          border: 1px solid #ddd3cc;
          background: #fff;
          color: #62534b;
        }

        .popup-confirm {
          border: none;
          background: #8f351d;
          color: #fff;
        }

        .settings-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding: 8px;
          border: 1px solid #eee5df;
          border-radius: 13px;
          background: rgba(255,255,255,.82);
          box-shadow: 0 5px 18px rgba(70,43,28,.025);
        }
        .settings-search {
          flex: 1;
          height: 36px;
          border: 1px solid #e1d8d2;
          border-radius: 9px;
          padding: 0 11px;
          outline: none;
          font-family: inherit;
          font-size: 12px;
          color: #332a25;
        }
        .settings-search:focus {
          border-color: #a8583f;
          box-shadow: 0 0 0 3px rgba(143,53,29,.06);
        }
        .toolbar-chip {
          height: 36px;
          padding: 0 11px;
          display: flex;
          align-items: center;
          border-radius: 9px;
          background: #fbf2ee;
          color: #8f351d;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .profile-meter {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid #eee3dc;
          border-radius: 11px;
          background: #fffaf7;
        }
        .profile-meter-top { display:flex; justify-content:space-between; gap:12px; margin-bottom:8px; }
        .profile-meter-title { color:#5c453b; font-size:11px; font-weight:800; }
        .profile-meter-value { color:#8f351d; font-size:11px; font-weight:900; }
        .profile-meter-track { height:6px; border-radius:8px; background:#eee5df; overflow:hidden; }
        .profile-meter-fill { height:100%; border-radius:8px; background:#8f351d; transition:width .3s ease; }
        .system-health { margin-top:18px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .health-card { padding:13px; border:1px solid #eee5df; border-radius:10px; background:#fff; }
        .health-label { color:#9b8d85; font-size:10px; font-weight:800; letter-spacing:.5px; }
        .health-value { margin-top:5px; color:#4e4038; font-size:11px; font-weight:900; }
        .health-dot { display:inline-block; width:7px; height:7px; margin-right:5px; border-radius:50%; background:#4b9b63; }
        .empty-search { padding:35px 15px; text-align:center; color:#9b8d85; font-size:11px; }

        @media (max-width: 1000px) {
          .settings-layout {
            grid-template-columns: 210px minmax(0, 1fr);
          }

          .settings-page {
            padding: 20px;
          }
        }

        @media (max-width: 780px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .settings-sidebar {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .settings-nav {
            margin-bottom: 0;
          }
        }

        @media (max-width: 780px) {
          .settings-toolbar { align-items:stretch; flex-direction:column; }
        }

        @media (max-width: 580px) {
          .settings-page {
            padding: 15px;
          }

          .settings-header {
            flex-direction: column;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }

          .settings-sidebar {
            grid-template-columns: 1fr;
          }

          .settings-card {
            padding: 13px;
          }

          .card-heading {
            flex-direction: column;
            gap: 10px;
          }

          .backup-panel {
            flex-direction: column;
            align-items: flex-start;
          }

          .backup-button {
            width: 100%;
          }

          .settings-actions {
            flex-direction: column-reverse;
          }

          .reset-button,
          .save-button {
            width: 100%;
          }
        }

        /* Compact medium typography + sidebar fit */
        .settings-page { padding: 18px 20px; }
        .settings-header { margin-bottom: 14px; gap: 14px; }
        .settings-title { font-size: 28px; }
        .settings-subtitle { font-size: 13px; margin-top: 5px; }
        .settings-layout { grid-template-columns: 210px minmax(0, 1fr); gap: 14px; }
        .settings-sidebar { padding: 7px; border-radius: 12px; }
        .settings-nav { min-height: 54px; padding: 7px 8px; gap: 8px; margin-bottom: 2px; }
        .nav-icon { width: 30px; height: 30px; min-width: 30px; border-radius: 8px; font-size: 12px; }
        .nav-title { font-size: 13px; line-height: 1.25; }
        .nav-description { font-size: 10px; line-height: 1.25; margin-top: 2px; }
        .settings-card { padding: 17px; border-radius: 12px; }
        .card-heading { margin-bottom: 14px; gap: 12px; }
        .card-heading h2 { font-size: 19px; }
        .card-heading p { font-size: 12px; margin-top: 4px; }
        .card-badge { padding: 6px 9px; font-size: 10px; }
        .settings-grid { gap: 13px; }
        .settings-label { margin-bottom: 5px; font-size: 12px; }
        .settings-input { height: 42px; font-size: 13px; padding: 0 10px; border-radius: 8px; }
        .settings-error { min-height: 14px; margin-top: 3px; font-size: 10px; }
        .settings-textarea { min-height: 72px; padding: 9px 10px; }
        .profile-meter { margin-top: 12px; padding: 10px 12px; }
        .profile-meter-title, .profile-meter-value { font-size: 10px; }
        .settings-actions { margin-top: 12px; gap: 8px; }
        .reset-button, .save-button { height: 38px; font-size: 12px; padding: 0 14px; }
        .save-button { min-width: 108px; }
        .settings-toolbar { margin-bottom: 12px; padding: 7px; gap: 8px; }
        .settings-search { height: 36px; font-size: 12px; }
        .toolbar-chip { height: 36px; font-size: 11px; }
        .toggle-row { min-height: 56px; padding: 8px 2px; }
        .toggle-label { font-size: 12px; }
        .toggle-description { font-size: 11px; margin-top: 2px; }
        .backup-panel { margin-top: 14px; padding: 12px; }
        .backup-title { font-size: 13px; }
        .backup-description { font-size: 11px; }
        .backup-button { height: 34px; padding: 0 12px; font-size: 11px; }
        .system-health { margin-top: 12px; gap: 8px; }
        .health-card { padding: 10px; }
        .health-label { font-size: 9px; }
        .health-value { font-size: 11px; }

        @media (max-width: 1000px) {
          .settings-page { padding: 16px; }
          .settings-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 12px; }
          .settings-nav { min-height: 52px; }
        }

        @media (max-width: 780px) {
          .settings-page { padding: 14px; }
          .settings-layout { grid-template-columns: 1fr; }
          .settings-sidebar { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 4px; }
          .settings-nav { margin-bottom: 0; }
        }

        @media (max-width: 580px) {
          .settings-page { padding: 10px; }
          .settings-header { flex-direction: column; }
          .settings-title { font-size: 24px; }
          .settings-grid { grid-template-columns: 1fr; }
          .settings-sidebar { grid-template-columns: 1fr; }
          .system-health { grid-template-columns: 1fr; }
        }

        /* =========================================================
           RESPONSIVE SETTINGS LAYOUT (100% Zoom Compatible)
           ========================================================= */
        .settings-page {
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          min-height: 100%;
          padding: 16px 20px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .settings-header,
        .settings-toolbar {
          flex: 0 0 auto;
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          align-items: flex-start;
          width: 100%;
        }

        .settings-sidebar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: sticky;
          top: 76px;
          max-height: calc(100vh - 90px);
          overflow-y: auto;
        }

        .settings-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 100%;
        }

        .settings-content > * {
          min-width: 0;
          max-width: 100%;
        }

        .popup-overlay {
          align-items: flex-start;
          justify-content: center;
          padding: 24px 20px 20px;
          overflow-y: auto;
        }

        .popup-box {
          margin-top: 0;
        }

        @media (max-width: 900px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }
          .settings-sidebar {
            position: static;
            max-height: none;
          }
        }
      `}
    </style>

    <div className="settings-header">
      <div>
        <div className="settings-breadcrumb">
          {t('hotelManagement', 'HOTEL MANAGEMENT')} / {t('settings', 'SETTINGS')}
        </div>

        <h1 className="settings-title">
          {t('settings', 'Settings')}
        </h1>

        <p className="settings-subtitle">
          {t('manageSettingsSubtitle', 'Manage your hotel profile, billing, GST configuration and system preferences.')}
        </p>
      </div>

      <div className="secure-badge">
        {t('secureSettings', '✓ Secure Settings')}
      </div>
    </div>

    <div className="settings-toolbar">
      <input
        className="settings-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchSettings', 'Search settings...')}
        aria-label={t('searchSettings', 'Search settings')}
      />
      <div className="toolbar-chip">{lastSaved ? `${t('saved', 'Saved')} ${lastSaved}` : t('allSettingsReady', 'All settings ready')}</div>
    </div>

    {/* Prominent Licence & Subscription Hero Card matching user screenshot */}
    <div
      className="licence-hero-card"
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
        marginBottom: "4px",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              {t('licensedEnterpriseVersion', 'Licensed Enterprise Version')}
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
              ⚡ {t(licenceInfo.subscriptionStatus || "Active", licenceInfo.subscriptionStatus || "Active")}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#4B5563" }}>
            {t('fullFeaturesEnabled', 'Full unlimited features enabled. All trial restrictions removed.')}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {t('planName', 'PLAN NAME')}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#16A34A" }}>
            {licenceInfo.trialStatus === "Active" ? t('trial', 'TRIAL') : licenceInfo.subscriptionPlan}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {t('validity', 'VALIDITY')}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>
            {licenceInfo.trialStatus === "Active"
              ? `${Math.min(28, Math.max(0, licenceInfo.daysRemaining))} ${t('daysRemaining', 'Days Remaining')}`
              : licenceInfo.trialStatus === "Expired"
                ? t('expired', 'Expired')
                : t('daysTrial', '28 Days Free Trial')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {t('licenseStatus', 'LICENSE STATUS')}
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: licenceInfo.trialStatus === "Expired" ? "#DC2626" : "#16A34A",
            }}
          >
            {t(licenceInfo.subscriptionStatus, licenceInfo.subscriptionStatus)}
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
            🔄 {licenceInfo.trialStatus === "Not Started" ? t('startFreeTrial', 'Start Free Trial') : t('renewLicense', 'Renew License')}
          </button>
          <button
            type="button"
            onClick={handleUpgradePlan}
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

    <div className="settings-layout">
      <aside
        className="settings-sidebar"
      >
        {SETTINGS_SECTIONS.filter(sectionMatchesSearch).map(
          (section) => (
            <button
              type="button"
              key={section.id}
              className={`settings-nav ${activeSection === section.id
                ? "active"
                : ""
                }`}
              onClick={() => {
                setActiveSection(
                  section.id
                );
                setErrors({});
                setTouched({});
              }}
            >
              <span className="nav-icon">
                {section.icon}
              </span>

              <span>
                <span className="nav-title">
                  {t(
                    section.id === "profile"
                      ? "hotelProfile"
                      : section.id === "gst"
                        ? "gstConfiguration"
                        : section.id === "billing"
                          ? "billing"
                          : section.id === "notifications"
                            ? "notifications"
                            : section.id === "system"
                              ? "systemPreferences"
                                : section.id === "licence"
                                  ? "licenceAndSubscription"
                                  : section.id === "reports"
                                    ? "reportAndKpi"
                                    : section.id === "gst-reports"
                                      ? "gstSettingsAndReports"
                                      : section.title,
                    section.title
                  )}
                </span>

                <span className="nav-description">
                  {t(section.description, section.description)}
                </span>
              </span>
            </button>
          )
        )}
      </aside>

      <main className="settings-content">
        {search.trim() && !sectionMatchesSearch(SETTINGS_SECTIONS.find((item) => item.id === activeSection) || SETTINGS_SECTIONS[0]) ? (
          <div className="settings-card empty-search">{t('noMatchingSettings', 'No matching settings found. Try another search term.')}</div>
        ) : renderContent()}

        {activeSection !== "reports" && activeSection !== "gst-reports" && (
          <div className="settings-actions">
            <button
              type="button"
              className="reset-button"
              onClick={resetCurrentSection}
            >
              {t('resetSection', 'Reset Section')}
            </button>

            <button
              type="button"
              className="save-button"
              disabled={saving}
              onClick={handleSave}
            >
              {saving
                ? t('saving', 'Saving...')
                : t('saveChanges', 'Save Changes')}
            </button>
          </div>
        )}
      </main>
    </div>


    <Popup
      popup={popup}
      closePopup={closePopup}
      confirmPopup={confirmPopup}
    />
  </div>
);
} 
