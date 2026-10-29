import React, { useEffect, useState } from 'react';
import branchService from '../services/branchService';
import staffService from '../services/staffService';
import { Building2, CheckCircle2, Store, IndianRupee, Search, Plus, Eye, Edit, Trash2, ChevronRight, ChevronLeft, X, AlertTriangle, Users, TrendingUp, Download, Mail, Phone, Settings, Check, BarChart3, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBranch } from '../context/BranchContext';
import { sanitizeMobileInput } from '../common/phoneUtils';
import { useLanguage } from '../context/LanguageContext';

export default function BranchesModule() {
  const {
    t,
    translateStatus,
    language,
    currentLanguage,
    setLanguage,
    formatDate,
    formatNumber,
    toDevanagari,
    localizeGuestName,
  } = useLanguage();
  const activeLang = currentLanguage || language || 'en';
  const isDevanagari = activeLang === 'mr' || activeLang === 'hi';

  const localizeBranchName = (name) => {
    if (!name) return '';
    return t(name, name);
  };

  const localizeLocation = (loc) => {
    if (!loc) return '';
    return t(loc, loc);
  };

  const localizeManager = (mgr) => {
    if (!mgr) return '—';
    return localizeGuestName(mgr);
  };

  const {
    selectedBranch,
    selectedBranchId,
    selectedMainBranch,
    selectedMainBranchId,
    subBranches,
    selectedSubBranch,
    selectedSubBranchId,
    setSelectedMainBranchId,
    setSelectedSubBranchId,
    refreshBranches,
  } = useBranch();
  const [activeTab, setActiveTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sectionBranch, setSectionBranch] = useState(null); // Search & Filter States for Outlets & Staff Pages
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [outletStatusFilter, setOutletStatusFilter] = useState('All');
  const [staffStatusFilter, setStaffStatusFilter] = useState('All'); // Sorting States
const [outletSortKey, setOutletSortKey] = useState('name'); const [outletSortOrder, setOutletSortOrder] = useState('asc'); const [staffSortKey, setStaffSortKey] = useState('name'); const [staffSortOrder, setStaffSortOrder] = useState('asc'); const [currentPage, setCurrentPage] = useState(1); const itemsPerPage = 5; const [errors, setErrors] = useState({}); // Toast Popup State
const [toastMessage, setToastMessage] = useState(''); const showToast = (msg) => { setToastMessage(msg); setTimeout(() => { setToastMessage(''); }, 3000); }; // Save Confirmation Popup State for Settings
const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false); const [pendingSaveMessage, setPendingSaveMessage] = useState(''); // === 1. BRANCHES DATA & STATES ===
const [branches, setBranches] = useState([]); const [showAddBranchModal, setShowAddBranchModal] = useState(false); const [viewBranch, setViewBranch] = useState(null); const [editBranch, setEditBranch] = useState(null); const [deleteBranchId, setDeleteBranchId] = useState(null); const [branchForm, setBranchForm] = useState({ name: '', code: '', parentBranchId: '', manager: '', contact: '', status: 'Active', email: '', hours: '', established: '', address: '', totalStaff: '', addOutlet: 'No', outletName: '', outletCode: '', outletType: 'Restaurant', outletContact: '', outletStatus: 'Active', outletStaffCount: '0', staffName: '', staffCode: '', staffContact: '', staffRole: 'Manager', staffStatus: 'Active', staffBranch: 'Main Branch', staffOutletCode: '', staffOutletType: 'Restaurant' }); // === 2. OUTLETS DATA & STATES ===
const [outlets, setOutlets] = useState([]); const [showAddOutletModal, setShowAddOutletModal] = useState(false); const [viewOutlet, setViewOutlet] = useState(null); const [editOutlet, setEditOutlet] = useState(null); const [deleteOutletId, setDeleteOutletId] = useState(null); const [outletForm, setOutletForm] = useState({ name: '', code: '', type: 'Restaurant', contact: '', status: 'Active', staffCount: '0' }); // === 3. STAFF DATA & STATES ===
const [staff, setStaff] = useState([]); const [showAddStaffModal, setShowAddStaffModal] = useState(false); const [viewStaff, setViewStaff] = useState(null); const [editStaff, setEditStaff] = useState(null); const [deleteStaffId, setDeleteStaffId] = useState(null); const [staffForm, setStaffForm] = useState({ name: '', code: '', role: 'Manager', branch: '', outlet: '', outletCode: '', contact: '', status: 'Active' }); useEffect(() => {
  const loadBranchData = async () => {
    try {
      const [branchResult, outletResult, staffResult] = await Promise.allSettled([
        branchService.getBranches(),
        branchService.getOutlets(),
        staffService.getStaff(),
      ]);
      const branchRows = branchResult.status === 'fulfilled' ? (branchResult.value || []) : [];
      const outletRows = outletResult.status === 'fulfilled' ? (outletResult.value || []) : [];
      const staffRows = staffResult.status === 'fulfilled' ? (staffResult.value || []) : [];
      if (branchResult.status === 'rejected') console.error('Failed to load branches:', branchResult.reason);
      if (outletResult.status === 'rejected') console.error('Failed to load outlets:', outletResult.reason);
      if (staffResult.status === 'rejected') console.error('Failed to load staff:', staffResult.reason);
      const analyticsRows = await Promise.all((branchRows || []).map(async (b) => {
        try { return await branchService.getBranchAnalytics(b.id); } catch { return null; }
      }));
      setBranches((branchRows || []).map((b, index) => ({
        ...b,
        parentBranchId: b.parentBranchId ?? null,
        parentBranchName: b.parentBranchName || null,
        isSubBranch: Boolean(b.parentBranchId),
        manager: b.managerName || '',
        contact: b.contactPhone || '',
        status: String(b.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
        established: b.establishedOn || '',
        hours: b.operatingHours || '',
        members: Number(analyticsRows[index]?.activeMembers || 0),
        outletsCount: (outletRows || []).filter((o) => Number(o.branchId) === Number(b.id)).length,
        subBranchCount: (branchRows || []).filter((child) => Number(child.parentBranchId) === Number(b.id)).length,
        staffCount: Number(analyticsRows[index]?.activeStaff || 0),
        todayRevenue: Number(analyticsRows[index]?.todayRevenue || 0).toLocaleString('en-IN'),
      })));
      setOutlets((outletRows || []).map((o) => ({
        ...o,
        contact: o.contactPhone || o.contact || '',
        status: String(o.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
        staffCount: Number(o.staffCount) || 0,
      })));
      setStaff((staffRows || []).map((s) => ({
        ...s,
        code: s.staffCode || s.code || '',
        role: s.designation || s.role || 'Staff',
        branch: s.branch || '',
        outlet: s.outlet || '',
        outletCode: s.outletCode || '',
        contact: s.phone || s.contact || '',
        status: s.active === false ? 'Inactive' : 'Active',
      })));
      setStaffForm((prev) => ({
        ...prev,
        branch: prev.branch || branchRows?.[0]?.name || '',
        outlet: prev.outlet || outletRows?.[0]?.name || '',
      }));
      setBranchForm((prev) => ({
        ...prev,
        staffBranch: prev.staffBranch && branchRows?.some((b) => b.name === prev.staffBranch) ? prev.staffBranch : (branchRows?.[0]?.name || ''),
      }));
    } catch (error) {
      console.error('Failed to load branch page data:', error);
      showToast(t('unableToLoadBranchesDb', 'Unable to load branches and outlets from database'));
    }
  };
  loadBranchData();
}, []);

useEffect(() => {
  let cancelled = false;
  const loadSelectedBranchAnalytics = async () => {
    if (!sectionBranch?.id) {
      if (!cancelled) setBranchAnalytics(null);
      return;
    }
    try {
      const data = await branchService.getBranchAnalytics(Number(sectionBranch.id));
      if (!cancelled) setBranchAnalytics(data || null);
    } catch (error) {
      if (!cancelled) {
        setBranchAnalytics(null);
        console.error('Failed to load branch analytics:', error);
      }
    }
  };
  loadSelectedBranchAnalytics();
  return () => { cancelled = true; };
}, [sectionBranch?.id]);

// === 4. REPORTS INTERACTIVE STATES & DATA ===
const [reportTimeRange, setReportTimeRange] = useState('This Month'); const [reportFrequency, setReportFrequency] = useState('Daily'); const [hoveredPoint, setHoveredPoint] = useState(null); const [branchAnalytics, setBranchAnalytics] = useState(null); const reportGraphData = { 'This Month': { 'Daily': { path: "M 0,160 Q 150,130 300,120 T 600,40 T 800,90 L 1000,50", fillPath: "M 0,160 Q 150,130 300,120 T 600,40 T 800,90 L 1000,50 L 1000,200 L 0,200 Z", labels: ['01 May', '03 May', '05 May', '07 May', '09 May', '11 May', '13 May', '15 May', '17 May', '19 May', '21 May', '23 May', '25 May', '27 May', '29 May'], points: [ { x: 50, y: 155, date: '03 May', val: '35,000' }, { x: 200, y: 130, date: '08 May', val: '42,000' }, { x: 400, y: 90, date: '15 May', val: '68,000' }, { x: 650, y: 40, date: '20 May', val: '1,11,200' }, { x: 800, y: 90, date: '25 May', val: '75,000' }, { x: 950, y: 55, date: '29 May', val: '98,000' }, ] }, 'Weekly': { path: "M 0,140 Q 250,60 500,100 T 1000,30", fillPath: "M 0,140 Q 250,60 500,100 T 1000,30 L 1000,200 L 0,200 Z", labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], points: [ { x: 125, y: 120, date: 'Week 1', val: '2,40,000' }, { x: 375, y: 70, date: 'Week 2', val: '3,10,000' }, { x: 625, y: 90, date: 'Week 3', val: '2,85,000' }, { x: 875, y: 35, date: 'Week 4', val: '4,10,000' }, ] } }, 'Last Month': { 'Daily': { path: "M 0,180 Q 200,100 400,140 T 700,80 T 900,120 L 1000,90", fillPath: "M 0,180 Q 200,100 400,140 T 700,80 T 900,120 L 1000,90 L 1000,200 L 0,200 Z", labels: ['01 Apr', '03 Apr', '05 Apr', '07 Apr', '09 Apr', '11 Apr', '13 Apr', '15 Apr', '17 Apr', '19 Apr', '21 Apr', '23 Apr', '25 Apr', '27 Apr', '29 Apr'], points: [ { x: 50, y: 170, date: '03 Apr', val: '28,000' }, { x: 200, y: 110, date: '08 Apr', val: '52,000' }, { x: 400, y: 140, date: '15 Apr', val: '45,000' }, { x: 650, y: 75, date: '20 Apr', val: '89,000' }, { x: 800, y: 120, date: '25 Apr', val: '60,000' }, { x: 950, y: 90, date: '29 Apr', val: '78,000' }, ] }, 'Weekly': { path: "M 0,150 Q 250,110 500,130 T 1000,60", fillPath: "M 0,150 Q 250,110 500,130 T 1000,60 L 1000,200 L 0,200 Z", labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], points: [ { x: 125, y: 135, date: 'Week 1', val: '2,10,000' }, { x: 375, y: 115, date: 'Week 2', val: '2,50,000' }, { x: 625, y: 125, date: 'Week 3', val: '2,30,000' }, { x: 875, y: 65, date: 'Week 4', val: '3,45,000' }, ] } }, 'This Year': { 'Daily': { path: "M 0,140 Q 180,160 350,90 T 650,110 T 850,30 L 1000,70", fillPath: "M 0,140 Q 180,160 350,90 T 650,110 T 850,30 L 1000,70 L 1000,200 L 0,200 Z", labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], points: [ { x: 80, y: 140, date: 'Jan', val: '4,50,000' }, { x: 250, y: 155, date: 'Mar', val: '3,80,000' }, { x: 420, y: 85, date: 'May', val: '7,20,000' }, { x: 600, y: 110, date: 'Jul', val: '6,10,000' }, { x: 780, y: 30, date: 'Sep', val: '10,50,000' }, { x: 950, y: 70, date: 'Nov', val: '8,90,000' }, ] }, 'Weekly': { path: "M 0,120 Q 250,150 500,80 T 1000,40", fillPath: "M 0,120 Q 250,150 500,80 T 1000,40 L 1000,200 L 0,200 Z", labels: ['Q1', 'Q2', 'Q3', 'Q4'], points: [ { x: 125, y: 130, date: 'Q1', val: '12,50,000' }, { x: 375, y: 100, date: 'Q2', val: '18,20,000' }, { x: 625, y: 70, date: 'Q3', val: '22,40,000' }, { x: 875, y: 45, date: 'Q4', val: '28,90,000' }, ] } } }; // === 5. SETTINGS INTERACTIVE STATES ===
const [settings, setSettings] = useState({ defaultBranch: 'Main Branch', dateFormat: 'DD MMM YYYY', timeFormat: '12 Hour (AM/PM)', currency: 'INR (₹)', language: 'English', timezone: 'Asia/Kolkata (UTC+05:30)', autoBranchCode: true, branchReports: true, interBranchTransfer: true, lowStockAlerts: true, expenseApproval: false,
auditLogs: true,
branchCodePrefix: 'BR',
outletCodePrefix: 'OUT',
staffCodePrefix: 'STF',
invoicePrefix: 'INV',
poPrefix: 'PO',
itemsPerPage: '10',
sessionTimeout: '30',
passwordExpiry: '90',
twoFactorAuth: true,
captcha: false,
}); // PREVENT TYPING / LIVE VALIDATION HANDLERS
const updateLiveError = (field, message) => {
  setErrors((prev) => {
    const next = { ...prev };
    if (message) next[field] = message;
    else delete next[field];
    return next;
  });
};

const sanitizeTextValue = (value) =>
  value
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ');

const handleTextInput = (e, setter, obj, field) => {
  const val = e.target.value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
  setter({ ...obj, [field]: val });

  const messages = {
    hours: 'Operating hours are required',
    address: 'Address is required'
  };
  updateLiveError(field, val.trim() ? '' : messages[field]);
};

const handleCharOnlyInput = (e, setter, obj, field) => {
  const val = sanitizeTextValue(e.target.value);
  setter({ ...obj, [field]: val });

  const requiredMessages = {
    name: 'Name is required',
    manager: 'Manager name is required',
    outletName: 'Outlet name is required',
    staffName: 'Staff name is required'
  };
  updateLiveError(field, val.trim() ? '' : requiredMessages[field]);
};

const handleTextBlur = (setter, obj, field) => {
  const value = String(obj?.[field] || '').trim().replace(/\s{2,}/g, ' ');
  setter({ ...obj, [field]: value });
};

const handleUpperAndNumInput = (e, setter, obj, field) => {
  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  setter({ ...obj, [field]: val });

  const codeMessages = {
    code: 'Code is required',
    outletCode: 'Outlet code is required',
    staffCode: 'Staff code is required',
    staffOutletCode: 'Outlet code is required'
  };
  updateLiveError(field, val ? '' : (codeMessages[field] || 'Code is required'));
};

const handlePhoneInput = (e, setter, obj, field) => {
  const val = sanitizeMobileInput(e.target.value);
  setter({ ...obj, [field]: val });

  if (!val) updateLiveError(field, '10-digit contact number is required');
  else if (val.length < 10) updateLiveError(field, 'Contact number must be 10 digits starting with 6, 7, 8, or 9');
  else updateLiveError(field, '');
};

const handleEmailInput = (e, setter, obj, field = 'email') => {
  let val = e.target.value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._@-]/g, '');
  val = val.replace(/^[^a-zA-Z]+/, '');

  const firstAt = val.indexOf('@');
  if (firstAt >= 0) {
    const localPart = val.slice(0, firstAt);
    const domainPart = val.slice(firstAt + 1).replace(/@/g, '');
    val = `${localPart}@${domainPart}`;
  }

  setter({ ...obj, [field]: val });

  if (!val) updateLiveError(field, 'Email is required');
  else if (!/^[A-Za-z][A-Za-z0-9._-]*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(val)) {
    updateLiveError(field, 'Enter a valid email with one @ symbol');
  } else {
    updateLiveError(field, '');
  }
};

const handleNumericInput = (e, setter, obj, field) => {
  const val = e.target.value.replace(/\D/g, '');
  setter({ ...obj, [field]: val });
};

// FORM VALIDATIONS
const validateBranch = (data) => {
  let errs = {};
  if (!data.name?.trim()) errs.name = t('branchNameRequired', 'Branch name is required');
  if (!data.code?.trim()) errs.code = t('branchCodeRequired', 'Branch code is required');
  if (!data.manager?.trim()) errs.manager = t('managerNameRequired', 'Manager name is required');
  if (!data.contact || data.contact.length !== 10 || !/^[6-9]/.test(data.contact)) {
    errs.contact = t('contactValidationHint', 'Contact number must be 10 digits and start with 6, 7, 8, or 9');
  }
  if (!data.email?.trim()) {
    errs.email = t('emailRequired', 'Email is required');
  } else if (!/^[A-Za-z][A-Za-z0-9._-]*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(data.email) || (data.email.match(/@/g) || []).length !== 1) {
    errs.email = t('validEmailRequired', 'Enter a valid email with exactly one @ symbol');
  }
  if (!data.hours?.trim()) errs.hours = t('operatingHoursRequired', 'Operating hours are required');
  if (!data.established?.trim()) errs.established = t('establishedDateRequired', 'Established date is required');
  if (!data.address?.trim()) errs.address = t('addressRequired', 'Address is required');
  if (data.addOutlet === 'Yes') {
    if (!data.outletName?.trim()) errs.outletName = t('outletNameRequired', 'Outlet name is required');
    if (!data.outletCode?.trim()) errs.outletCode = t('outletCodeRequired', 'Outlet code is required');
    if (!data.outletContact || data.outletContact.length !== 10 || !/^[6-9]/.test(data.outletContact)) {
      errs.outletContact = t('contactValidationHint', 'Contact number must be 10 digits and start with 6, 7, 8, or 9');
    }
  }
  if (data.staffName?.trim()) {
    if (!data.staffCode?.trim()) errs.staffCode = t('staffCodeRequired', 'Staff code is required');
    if (!data.staffContact || data.staffContact.length !== 10 || !/^[6-9]/.test(data.staffContact)) {
      errs.staffContact = t('contactValidationHint', 'Contact number must be 10 digits and start with 6, 7, 8, or 9');
    }
  }
  return errs;
};

const validateOutlet = (data) => {
  let errs = {};
  if (!data.name?.trim()) errs.name = t('outletNameRequired', 'Outlet name is required');
  if (!data.code?.trim()) errs.code = t('outletCodeRequired', 'Outlet code is required');
  if (!data.contact || data.contact.length !== 10 || !/^[6-9]/.test(data.contact)) {
    errs.contact = t('contactValidationHint', 'Contact number must be 10 digits and start with 6, 7, 8, or 9');
  }
  if (data.staffCount === '' || Number(data.staffCount) < 0) {
    errs.staffCount = t('validStaffCountRequired', 'Enter a valid staff count');
  }
  return errs;
};

const validateStaff = (data) => {
  let errs = {};
  if (!data.name?.trim()) errs.name = t('staffNameRequired', 'Staff name is required');
  if (!data.code?.trim()) errs.code = t('staffCodeRequired', 'Staff code is required');
  if (!data.contact || data.contact.length !== 10 || !/^[6-9]/.test(data.contact)) {
    errs.contact = t('contactValidationHint', 'Contact number must be 10 digits and start with 6, 7, 8, or 9');
  }
  return errs;
}; // HANDLERS
const handleAddBranch = async (e) => {
  e.preventDefault();
  const errs = validateBranch(branchForm);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  try {
    const created = await branchService.createBranch({
      name: branchForm.name,
      code: branchForm.code,
      parentBranchId: branchForm.parentBranchId ? Number(branchForm.parentBranchId) : null,
      managerName: branchForm.manager,
      contactPhone: branchForm.contact,
      email: branchForm.email,
      operatingHours: branchForm.hours,
      establishedOn: branchForm.established,
      address: branchForm.address,
      status: branchForm.status,
    });
    const mapped = {
      ...created,
      parentBranchId: created.parentBranchId ?? (branchForm.parentBranchId ? Number(branchForm.parentBranchId) : null),
      parentBranchName: created.parentBranchName || branches.find((b) => Number(b.id) === Number(branchForm.parentBranchId))?.name || null,
      isSubBranch: Boolean(created.parentBranchId ?? branchForm.parentBranchId),
      manager: created.managerName || '',
      contact: created.contactPhone || '',
      status: String(created.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
      established: created.establishedOn || branchForm.established,
      hours: created.operatingHours || branchForm.hours,
      members: 0,
      outletsCount: 0,
      staffCount: 0,
      todayRevenue: '0',
    };
    setBranches(prev => [...prev, mapped]);
    let createdOutlet = null;
    if (branchForm.addOutlet === 'Yes' && branchForm.outletName && branchForm.outletCode) {
      try {
        createdOutlet = await branchService.createOutlet(created.id, {
          name: branchForm.outletName,
          code: branchForm.outletCode,
          type: branchForm.outletType,
          contact: branchForm.outletContact,
          status: branchForm.outletStatus,
        });
        setOutlets(prev => [...prev, {
          ...createdOutlet,
          contact: createdOutlet.contactPhone || '',
          status: String(createdOutlet.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive',
        }]);
      } catch (outletErr) {
        console.error('Outlet creation after branch creation failed:', outletErr);
        showToast(t('branchSavedOutletFailed', 'Branch saved, but outlet could not be saved'));
      }
    }
    if (branchForm.staffName?.trim()) {
      try {
        const staffBranch = branches.find((b) => b.name === branchForm.staffBranch) || mapped;
        const selectedOutlet = createdOutlet || outlets.find((o) => Number(o.branchId) === Number(staffBranch.id) && o.code === branchForm.staffOutletCode);
        const createdStaff = await staffService.createStaff({
          name: branchForm.staffName,
          phone: branchForm.staffContact,
          address: staffBranch.address || 'Hotel Premises',
          designation: branchForm.staffRole,
          joiningDate: new Date().toISOString().split('T')[0],
          basicSalary: 15000,
          salaryFrequency: 'MONTHLY',
          branchId: Number(staffBranch.id),
          outletId: selectedOutlet?.id ? Number(selectedOutlet.id) : undefined,
        });
        setStaff((prev) => [...prev, {
          ...createdStaff,
          code: createdStaff.staffCode || `ST-${createdStaff.id}`,
          role: createdStaff.designation || branchForm.staffRole,
          branch: createdStaff.branch || staffBranch.name,
          outlet: createdStaff.outlet || selectedOutlet?.name || '',
          outletCode: createdStaff.outletCode || selectedOutlet?.code || '',
          contact: createdStaff.phone || branchForm.staffContact,
          status: createdStaff.active === false ? 'Inactive' : 'Active',
        }]);
      } catch (staffErr) {
        console.error('Staff creation after branch creation failed:', staffErr);
        showToast(t('branchSavedStaffFailed', 'Branch saved, but staff member could not be saved'));
      }
    }
    setShowAddBranchModal(false);
    setErrors({});
    setBranchForm({ name: '', code: '', parentBranchId: '', manager: '', contact: '', status: 'Active', email: '', hours: '', established: '', address: '', totalStaff: '', addOutlet: 'No', outletName: '', outletCode: '', outletType: 'Restaurant', outletContact: '', outletStatus: 'Active', outletStaffCount: '0', staffName: '', staffCode: '', staffContact: '', staffRole: 'Manager', staffStatus: 'Active', staffBranch: 'Main Branch', staffOutletCode: '', staffOutletType: 'Restaurant' });
    showToast(t('branchAddedSuccess', 'Branch added successfully to database!'));
  } catch (err) {
    console.error(err);
    showToast(err?.response?.data?.message || t('failedToAddBranch', 'Failed to add branch'));
  }
};

const handleUpdateBranch = async (e) => {
  e.preventDefault();
  const errs = validateBranch(editBranch);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  try {
    const updated = await branchService.updateBranch(editBranch.id, {
      name: editBranch.name,
      code: editBranch.code,
      parentBranchId: editBranch.parentBranchId ? Number(editBranch.parentBranchId) : null,
      managerName: editBranch.manager,
      contactPhone: editBranch.contact,
      email: editBranch.email,
      operatingHours: editBranch.hours,
      address: editBranch.address,
      status: editBranch.status,
    });
    setBranches(prev => prev.map(b => b.id === updated.id ? {
      ...b,
      ...updated,
      parentBranchId: updated.parentBranchId ?? null,
      parentBranchName: updated.parentBranchName || (updated.parentBranchId ? prev.find(p => Number(p.id) === Number(updated.parentBranchId))?.name : null),
      isSubBranch: Boolean(updated.parentBranchId),
      manager: updated.managerName,
      contact: updated.contactPhone,
      status: String(updated.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive'
    } : b));
    setEditBranch(null);
    setErrors({});
    showToast(t('branchUpdatedSuccess', 'Branch updated successfully!'));
  } catch (err) {
    showToast(err?.response?.data?.message || t('failedToUpdateBranch', 'Failed to update branch'));
  }
};

const handleAddOutlet = async (e) => {
  e.preventDefault();
  const errs = validateOutlet(outletForm);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  const branchId = Number(sectionBranch?.id || branches[0]?.id);
  if (!branchId) return showToast(t('selectBranchBeforeOutlet', 'Select a branch before adding an outlet'));
  try {
    const created = await branchService.createOutlet(branchId, outletForm);
    setOutlets(prev => [...prev, { ...created, contact: created.contactPhone || '', status: String(created.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive' }]);
    setShowAddOutletModal(false);
    setOutletForm({ name: '', code: '', type: 'Restaurant', contact: '', status: 'Active', staffCount: '0' });
    setErrors({});
    showToast(t('outletAddedSuccess', 'Outlet added successfully to database!'));
  } catch (err) {
    showToast(err?.response?.data?.message || t('failedToAddOutlet', 'Failed to add outlet'));
  }
};

const handleUpdateOutlet = async (e) => {
  e.preventDefault();
  const errs = validateOutlet(editOutlet);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  try {
    const updated = await branchService.updateOutlet(editOutlet.id, editOutlet);
    setOutlets(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated, contact: updated.contactPhone || '', status: String(updated.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive' } : o));
    setEditOutlet(null);
    setErrors({});
    showToast(t('outletUpdatedSuccess', 'Outlet updated successfully!'));
  } catch (err) {
    showToast(err?.response?.data?.message || t('failedToUpdateOutlet', 'Failed to update outlet'));
  }
};

const handleAddStaff = async (e) => {
  e.preventDefault();
  const errs = validateStaff(staffForm);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  const selectedBranch = branches.find((b) => b.name === staffForm.branch);
  const selectedOutlet = outlets.find((o) => o.name === staffForm.outlet && (!selectedBranch?.id || Number(o.branchId) === Number(selectedBranch.id)));
  if (!selectedBranch?.id) return showToast(t('selectValidBranch', 'Please select a valid branch'));
  try {
    const created = await staffService.createStaff({
      name: staffForm.name,
      phone: staffForm.contact,
      address: selectedBranch.address || 'Hotel Premises',
      designation: staffForm.role,
      joiningDate: new Date().toISOString().split('T')[0],
      basicSalary: 15000,
      salaryFrequency: 'MONTHLY',
      branchId: Number(selectedBranch.id),
      outletId: selectedOutlet?.id ? Number(selectedOutlet.id) : undefined,
    });
    setStaff((prev) => [...prev, {
      ...created,
      code: created.staffCode || `ST-${created.id}`,
      role: created.designation || staffForm.role,
      branch: created.branch || selectedBranch.name,
      outlet: created.outlet || selectedOutlet?.name || '',
      outletCode: created.outletCode || selectedOutlet?.code || '',
      contact: created.phone || staffForm.contact,
      status: created.active === false ? 'Inactive' : 'Active',
    }]);
    setShowAddStaffModal(false);
    setStaffForm({ name: '', code: '', role: 'Manager', branch: selectedBranch.name, outlet: selectedOutlet?.name || '', outletCode: '', contact: '', status: 'Active' });
    setErrors({});
    showToast(t('staffAddedSuccess', 'Staff added successfully to database!'));
  } catch (err) {
    showToast(err?.response?.data?.message || err?.userFriendlyMessage || t('failedToAddStaff', 'Failed to add staff'));
  }
};
const handleUpdateStaff = async (e) => {
  e.preventDefault();
  const errs = validateStaff(editStaff);
  if (Object.keys(errs).length > 0) return setErrors(errs);
  const selectedBranch = branches.find((b) => b.name === editStaff.branch);
  const selectedOutlet = outlets.find((o) => o.name === editStaff.outlet && (!selectedBranch?.id || Number(o.branchId) === Number(selectedBranch.id)));
  if (!selectedBranch?.id) return showToast(t('selectValidBranch', 'Please select a valid branch'));
  try {
    const updated = await staffService.updateStaff(Number(editStaff.id), {
      name: editStaff.name,
      phone: editStaff.contact,
      address: selectedBranch.address || 'Hotel Premises',
      designation: editStaff.role,
      joiningDate: editStaff.joiningDate || new Date().toISOString().split('T')[0],
      basicSalary: Number(editStaff.basicSalary) || 15000,
      salaryFrequency: editStaff.salaryFrequency || 'MONTHLY',
      branchId: Number(selectedBranch.id),
      outletId: selectedOutlet?.id ? Number(selectedOutlet.id) : undefined,
    });
    setStaff((prev) => prev.map((s) => s.id === updated.id ? {
      ...s, ...updated,
      code: updated.staffCode || s.code,
      role: updated.designation || editStaff.role,
      branch: updated.branch || selectedBranch.name,
      outlet: updated.outlet || selectedOutlet?.name || '',
      outletCode: updated.outletCode || selectedOutlet?.code || '',
      contact: updated.phone || editStaff.contact,
      status: updated.active === false ? 'Inactive' : 'Active',
    } : s));
    setEditStaff(null);
    setErrors({});
    showToast(t('staffUpdatedSuccess', 'Staff updated successfully!'));
  } catch (err) {
    showToast(err?.response?.data?.message || err?.userFriendlyMessage || t('failedToUpdateStaff', 'Failed to update staff'));
  }
};
const handleToggleSetting = (key) => { setSettings(prev => ({ ...prev, [key]: !prev[key] })); };
const handleSettingChange = (key, value) => { setSettings(prev => ({ ...prev, [key]: value })); };
const triggerSaveConfirm = (msg) => { setPendingSaveMessage(msg); setShowSaveConfirmModal(true); };
const confirmSaveAction = () => { setShowSaveConfirmModal(false); showToast(pendingSaveMessage); };
const discardSaveAction = () => { setShowSaveConfirmModal(false); showToast(t('changesDiscarded', 'Changes discarded')); };

// MULTI-LANGUAGE EXPORT REPORT GENERATION (CSV & HIGH-RES PRINTABLE PDF)
const handleExportCSV = () => {
  const targetBranch = sectionBranch || selectedBranch || branches[0] || { name: 'Main Branch', code: 'MB-1' };
  const branchName = localizeBranchName(targetBranch.name);
  const branchCode = targetBranch.code || 'MB-1';
  const genDate = formatDate(new Date(), { showTime: true });
  const periodText = t(reportTimeRange, reportTimeRange);
  const freqText = t(reportFrequency, reportFrequency);

  // UTF-8 BOM so Microsoft Excel & Google Sheets render Marathi/Hindi Devanagari properly!
  let csv = '\uFEFF';
  csv += `"${t('branchReportTitle', 'BRANCH PERFORMANCE & ANALYTICS REPORT')}"\n`;
  csv += `"${t('branchName', 'Branch Name')}","${branchName}","${t('branchCode', 'Branch Code')}","${branchCode}"\n`;
  csv += `"${t('generatedOn', 'Generated On')}","${genDate}","${t('reportPeriod', 'Report Period')}","${periodText}"\n`;
  csv += `"${t('frequency', 'Frequency')}","${freqText}"\n\n`;

  // KPI Section
  csv += `"${t('overview', 'Overview')} - KPI"\n`;
  csv += `"${t('totalRevenue', 'Total Revenue')}","${t('totalOrders', 'Total Orders')}","${t('mealsServed', 'Meals Served')}","${t('activeMembers', 'Active Members')}"\n`;
  csv += `"${formatNumber(branchAnalytics?.totalRevenue || 0, { asCurrency: true })}","${toDevanagari(branchAnalytics?.totalOrders || 0)}","${toDevanagari(branchAnalytics?.mealsServed || 0)}","${toDevanagari(branchAnalytics?.activeMembers || 0)}"\n\n`;

  // Revenue Analytics Section
  csv += `"${t('revenueAnalytics', 'Revenue Analytics')}"\n`;
  csv += `"${t('periodOrDate', 'Period / Date')}","${t('revenueGenerated', 'Revenue Generated')}","${t('status', 'Status')}","${t('frequency', 'Frequency')}"\n`;
  const points = branchAnalytics?.dailyRevenue || [];
  if (points.length) {
    points.forEach((p) => {
      csv += `"${formatDate(p.date)}","${formatNumber(p.revenue || 0, { asCurrency: true })}","${translateStatus('Completed')}","${freqText}"\n`;
    });
  } else {
    csv += `"—","${formatNumber(0, { asCurrency: true })}","—","${freqText}"\n`;
  }
  csv += '\n';

  // Outlets Section
  csv += `"${t('outletsManagement', 'Outlets Management')}"\n`;
  csv += `"${t('code', 'Code')}","${t('outletName', 'Outlet Name')}","${t('type', 'Type')}","${t('contact', 'Contact')}","${t('status', 'Status')}","${t('staff', 'Staff')}"\n`;
  if (outlets.length) {
    outlets.forEach((o) => {
      csv += `"${o.code}","${t(o.name, o.name)}","${t(o.type, o.type)}","${toDevanagari(o.contact)}","${translateStatus(o.status)}","${toDevanagari(o.staffCount || 0)}"\n`;
    });
  } else {
    csv += `"—","—","—","—","—","0"\n`;
  }
  csv += '\n';

  // Staff Section
  csv += `"${t('staffOverview', 'Staff Overview')}"\n`;
  csv += `"${t('staffCode', 'Staff Code')}","${t('staffName', 'Staff Name')}","${t('role', 'Role')}","${t('outlet', 'Outlet')}","${t('status', 'Status')}"\n`;
  if (staff.length) {
    staff.forEach((s) => {
      csv += `"${s.code}","${localizeGuestName(s.name)}","${t(s.role, s.role)}","${t(s.outlet || s.branch || '', s.outlet || s.branch || '')}","${translateStatus(s.status)}"\n`;
    });
  } else {
    csv += `"—","—","—","—","—"\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeBranch = String(targetBranch.name).replace(/[^a-zA-Z0-9\u0900-\u097F_-]+/g, '_');
  link.setAttribute('download', `${safeBranch}_${activeLang}_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(t('reportExportedSuccess', 'Report exported successfully!'));
};

const handleExportPDF = () => {
  const targetBranch = sectionBranch || selectedBranch || branches[0] || { name: 'Main Branch', code: 'MB-1' };
  const branchName = localizeBranchName(targetBranch.name);
  const branchCode = targetBranch.code || 'MB-1';
  const parentName = targetBranch.parentBranchName ? localizeBranchName(targetBranch.parentBranchName) : t('topLevelBranch', 'Top-Level Branch');
  const managerName = localizeManager(targetBranch.manager);
  const contactNo = targetBranch.contact ? toDevanagari(targetBranch.contact) : '—';
  const emailAddr = targetBranch.email || '—';
  const hours = targetBranch.hours || '24x7';
  const address = targetBranch.address ? localizeLocation(targetBranch.address) : '—';

  const genDate = formatDate(new Date(), { showTime: true });
  const periodText = t(reportTimeRange, reportTimeRange);
  const freqText = t(reportFrequency, reportFrequency);

  const totalRev = formatNumber(branchAnalytics?.totalRevenue || 0, { asCurrency: true });
  const totalOrders = toDevanagari(branchAnalytics?.totalOrders || 0);
  const mealsServed = toDevanagari(branchAnalytics?.mealsServed || 0);
  const activeMembers = toDevanagari(branchAnalytics?.activeMembers || 0);

  const pointsData = (branchAnalytics?.dailyRevenue || []).map((point) => ({
    date: formatDate(point.date),
    val: formatNumber(point.revenue || 0, { asCurrency: true }),
    status: translateStatus('Completed'),
    freq: freqText,
  }));

  const outletRows = outlets.map(o => ({
    code: o.code,
    name: t(o.name, o.name),
    type: t(o.type, o.type),
    contact: toDevanagari(o.contact),
    status: translateStatus(o.status),
    staff: toDevanagari(o.staffCount || 0),
  }));

  const staffRows = staff.map(s => ({
    code: s.code,
    name: localizeGuestName(s.name),
    role: t(s.role, s.role),
    outlet: t(s.outlet || s.branch || '', s.outlet || s.branch || ''),
    status: translateStatus(s.status),
  }));

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast(t('allowPopupsToast', 'Please allow pop-ups to view/print report'));
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="${activeLang}">
<head>
  <meta charset="UTF-8">
  <title>${branchName} - ${t('branchReportTitle', 'BRANCH PERFORMANCE & ANALYTICS REPORT')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Devanagari', 'Inter', -apple-system, sans-serif;
      background-color: #FAF7F2;
      color: #1C1917;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      border: 1px solid #E7E5E4;
    }
    .print-btn {
      background: #C25E00;
      color: #FFF;
      border: none;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
    .report-card {
      background: #FFFFFF;
      border: 1px solid #E7E5E4;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .header-banner {
      background-color: #2D140D;
      color: #FFFFFF;
      padding: 24px 28px;
      border-bottom: 3px solid #C25E00;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title { font-size: 20px; font-weight: 800; letter-spacing: 0.02em; }
    .header-meta { text-align: right; font-size: 11px; color: #E7E5E4; }
    .info-strip {
      background: #FFFBF7;
      border-bottom: 1px solid #E7E5E4;
      padding: 16px 28px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .info-item { font-size: 12px; }
    .info-label { font-size: 10.5px; color: #78716C; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .info-value { font-weight: 700; color: #2D140D; font-size: 13px; }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 20px 28px;
      background: #FAF7F2;
      border-bottom: 1px solid #E7E5E4;
    }
    .kpi-box {
      background: #FFFFFF;
      border: 1px solid #E7E5E4;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .kpi-label { font-size: 11px; font-weight: 600; color: #78716C; text-transform: uppercase; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #C25E00; margin-top: 4px; }
    .section-container { padding: 20px 28px; }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #2D140D;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1.5px solid #E7E5E4;
      padding-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    th {
      background: #2D140D;
      color: #FFF;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #F5F2ED;
      color: #44403C;
    }
    tr:nth-child(even) td { background: #FAF7F2; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      background: #DCFCE7;
      color: #15803D;
    }
    .footer {
      padding: 16px 28px;
      background: #FAF7F2;
      border-top: 1px solid #E7E5E4;
      display: flex;
      justify-content: space-between;
      color: #78716C;
      font-size: 11px;
    }
    @media print {
      body { background: #FFF; padding: 0; }
      .no-print-bar { display: none !important; }
      .report-card { border: none; box-shadow: none; border-radius: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div><strong>${branchName}</strong> - ${t('branchReportTitle', 'BRANCH PERFORMANCE & ANALYTICS REPORT')} (${periodText})</div>
    <button class="print-btn" onclick="window.print()">🖨️ ${t('printOrSavePdf', 'Print / Save as PDF')}</button>
  </div>
  <div class="report-card">
    <div class="header-banner">
      <div>
        <div class="header-title">${t('branchReportTitle', 'BRANCH PERFORMANCE & ANALYTICS REPORT')}</div>
        <div style="font-size:13px; opacity:0.9; margin-top:2px;">${branchName} (${branchCode})</div>
      </div>
      <div class="header-meta">
        <div>${t('generatedOn', 'Generated On')}: ${genDate}</div>
        <div>${t('reportPeriod', 'Report Period')}: ${periodText} • ${freqText}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-item">
        <div class="info-label">${t('branchName', 'Branch Name')}</div>
        <div class="info-value">${branchName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${t('parentBranch', 'Parent Branch')}</div>
        <div class="info-value">${parentName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${t('branchManager', 'Branch Manager')}</div>
        <div class="info-value">${managerName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${t('contactPhone', 'Contact Phone')}</div>
        <div class="info-value">${contactNo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${t('email', 'Email')}</div>
        <div class="info-value">${emailAddr}</div>
      </div>
      <div class="info-item">
        <div class="info-label">${t('operatingHours', 'Operating Hours')}</div>
        <div class="info-value">${hours}</div>
      </div>
      <div class="info-item" style="grid-column: span 2;">
        <div class="info-label">${t('address', 'Address')}</div>
        <div class="info-value">${address}</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-label">${t('totalRevenue', 'Total Revenue')}</div>
        <div class="kpi-val">${totalRev}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">${t('totalOrders', 'Total Orders')}</div>
        <div class="kpi-val" style="color:#2563EB;">${totalOrders}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">${t('mealsServed', 'Meals Served')}</div>
        <div class="kpi-val" style="color:#EA580C;">${mealsServed}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">${t('activeMembers', 'Active Members')}</div>
        <div class="kpi-val" style="color:#16A34A;">${activeMembers}</div>
      </div>
    </div>

    <div class="section-container">
      <div class="section-title">01 ${t('revenueAnalytics', 'Revenue Analytics')}</div>
      <table>
        <thead>
          <tr>
            <th>${t('periodOrDate', 'Period / Date')}</th>
            <th>${t('revenueGenerated', 'Revenue Generated')}</th>
            <th>${t('status', 'Status')}</th>
            <th>${t('frequency', 'Frequency')}</th>
          </tr>
        </thead>
        <tbody>
          ${pointsData.length ? pointsData.map(p => `
            <tr>
              <td><strong>${p.date}</strong></td>
              <td style="font-weight:700; color:#C25E00;">${p.val}</td>
              <td><span class="badge">${p.status}</span></td>
              <td>${p.freq}</td>
            </tr>
          `).join('') : `<tr><td colspan="4" style="text-align:center; padding:16px;">—</td></tr>`}
        </tbody>
      </table>

      <div class="section-title">02 ${t('outletsManagement', 'Outlet Performance')}</div>
      <table>
        <thead>
          <tr>
            <th style="background:#C25E00;">${t('code', 'Code')}</th>
            <th style="background:#C25E00;">${t('outletName', 'Outlet Name')}</th>
            <th style="background:#C25E00;">${t('type', 'Type')}</th>
            <th style="background:#C25E00;">${t('contact', 'Contact')}</th>
            <th style="background:#C25E00;">${t('status', 'Status')}</th>
            <th style="background:#C25E00;">${t('staff', 'Staff')}</th>
          </tr>
        </thead>
        <tbody>
          ${outletRows.length ? outletRows.map(o => `
            <tr>
              <td><strong>${o.code}</strong></td>
              <td style="font-weight:600;">${o.name}</td>
              <td>${o.type}</td>
              <td>${o.contact}</td>
              <td><span class="badge">${o.status}</span></td>
              <td>${o.staff}</td>
            </tr>
          `).join('') : `<tr><td colspan="6" style="text-align:center; padding:16px;">—</td></tr>`}
        </tbody>
      </table>

      <div class="section-title">03 ${t('staffOverview', 'Staff Overview')}</div>
      <table>
        <thead>
          <tr>
            <th style="background:#166534;">${t('staffCode', 'Staff Code')}</th>
            <th style="background:#166534;">${t('staffName', 'Staff Name')}</th>
            <th style="background:#166534;">${t('role', 'Role')}</th>
            <th style="background:#166534;">${t('outlet', 'Outlet')}</th>
            <th style="background:#166534;">${t('status', 'Status')}</th>
          </tr>
        </thead>
        <tbody>
          ${staffRows.length ? staffRows.map(s => `
            <tr>
              <td><strong>${s.code}</strong></td>
              <td style="font-weight:600;">${s.name}</td>
              <td>${s.role}</td>
              <td>${s.outlet}</td>
              <td><span class="badge">${s.status}</span></td>
            </tr>
          `).join('') : `<tr><td colspan="5" style="text-align:center; padding:16px;">—</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>Hotel Management System • Confidential Business Report</div>
      <div>${genDate} • ${activeLang.toUpperCase()}</div>
    </div>
  </div>
  <script>
    setTimeout(function() {
      window.print();
    }, 400);
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  showToast(t('reportExportedSuccess', 'Report exported successfully!'));
};

const handleExportReport = handleExportPDF;

// Filter & Pagination Logic
 const getBranchById = (id) => branches.find((b) => Number(b.id) === Number(id));
  const isDescendantOf = (branch, parentId) => {
    let cursor = branch;
    const seen = new Set();
    while (cursor?.parentBranchId && !seen.has(Number(cursor.parentBranchId))) {
      if (Number(cursor.parentBranchId) === Number(parentId)) return true;
      seen.add(Number(cursor.parentBranchId));
      cursor = getBranchById(cursor.parentBranchId);
    }
    return false;
  };
  const branchFilterMatches = (branch) =>
    branchFilter === 'All' ||
    Number(branch.id) === Number(branchFilter) ||
    isDescendantOf(branch, branchFilter);

  const searchMatches = (branch) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return String(branch.name || '').toLowerCase().includes(q) ||
      String(branch.code || '').toLowerCase().includes(q) ||
      String(branch.parentBranchName || '').toLowerCase().includes(q);
  };

  const filteredBranches = branches.filter((b) =>
    searchMatches(b) && branchFilterMatches(b)
  );

  const flattenBranchHierarchy = (rows) => {
    const result = [];
    const allowed = new Set(rows.map((b) => Number(b.id)));
    const childrenOf = (parentId) => rows
      .filter((child) => Number(child.parentBranchId) === Number(parentId))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const addNode = (branch, level) => {
      result.push({ ...branch, hierarchyLevel: level });
      childrenOf(branch.id).forEach((child) => addNode(child, level + 1));
    };

    rows
      .filter((b) => !b.parentBranchId || !allowed.has(Number(b.parentBranchId)))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((branch) => addNode(branch, 0));

    return result;
  };

  const hierarchicalBranches = flattenBranchHierarchy(filteredBranches);
  const totalPages = Math.ceil(hierarchicalBranches.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBranches = hierarchicalBranches.slice(indexOfFirstItem, indexOfLastItem); const compareValues = (first, second, key, direction) => { const a = first?.[key] ?? ''; const b = second?.[key] ?? ''; const numericKeys = ['staffCount', 'contact']; const result = numericKeys.includes(key) ? Number(a || 0) - Number(b || 0) : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); return direction === 'asc' ? result : -result; }; const toggleSort = (key, currentKey, currentOrder, setKey, setOrder) => { if (currentKey === key) { setOrder(currentOrder === 'asc' ? 'desc' : 'asc'); } else { setKey(key); setOrder('asc'); } }; const SortArrow = ({ active, direction }) => ( <span style={{ marginLeft: '5px', opacity: active ? 1 : 0.65, fontSize: '12px' }} aria-hidden="true"> {direction === 'asc' ? '↑' : '↓'} </span> ); const filteredOutlets = outlets .filter((outlet) => (outlet.name.toLowerCase().includes(outletSearchQuery.toLowerCase()) || outlet.code.toLowerCase().includes(outletSearchQuery.toLowerCase())) && (outletStatusFilter === 'All' || outlet.status === outletStatusFilter) ) .sort((a, b) => compareValues(a, b, outletSortKey, outletSortOrder)); const filteredStaff = staff .filter((member) => (member.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || member.code.toLowerCase().includes(staffSearchQuery.toLowerCase())) && (staffStatusFilter === 'All' || member.status === staffStatusFilter) ) .sort((a, b) => compareValues(a, b, staffSortKey, staffSortOrder)); const totalRevenue = branches.reduce( (sum, branch) => sum + (Number(String(branch.todayRevenue || 0).replace(/,/g, '')) || 0), 0 ); const formatCurrency = (value) => new Intl.NumberFormat('en-IN').format(value); const BRAND = { darkBg: '#2D140D', darkHover: '#3D1B10', accentOrange: '#C25E00', accentLightOrange: '#D97706', softBg: '#FAF7F2', cardBg: '#FFFFFF', border: '#E7E5E4', textDark: '#1C1917', textMuted: '#78716C', activeBg: '#DCFCE7', activeText: '#15803D', inactiveBg: '#FEE2E2', inactiveText: '#B91C1C', }; const styles = { container: { minHeight: '100%', width: '100%', boxSizing: 'border-box', backgroundColor: BRAND.softBg, color: BRAND.textDark, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', padding: '6px 0 24px' }, wrapper: { width: '100%', maxWidth: '100%', margin: '0', display: 'flex', flexDirection: 'column', gap: '20px' }, card: (clickable) => ({ backgroundColor: BRAND.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${BRAND.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: clickable ? 'pointer' : 'default', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }), buttonPrimary: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: BRAND.accentOrange, color: '#FFFFFF', fontSize: '14px', fontWeight: '600', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(194, 94, 0, 0.25)', transition: 'background-color 0.2s' }, input: { backgroundColor: '#FFFFFF', border: '1px solid #D6D3D1', borderRadius: '8px', padding: '9px 14px', fontSize: '14px', color: BRAND.textDark, outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }, modalInput: { width: '100%', backgroundColor: '#FAF7F2', border: '1px solid #D6D3D1', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: BRAND.textDark, outline: 'none', boxSizing: 'border-box' }, tableContainer: { backgroundColor: '#FFFFFF', borderRadius: '12px', border: `1px solid ${BRAND.border}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }, table: { width: '100%', textAlign: 'left', fontSize: '13px', color: '#44403C', borderCollapse: 'collapse' }, th: { backgroundColor: BRAND.darkBg, color: '#F5F2ED', fontWeight: '600', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 8px', borderBottom: `1px solid ${BRAND.border}`, whiteSpace: 'nowrap', verticalAlign: 'middle', boxSizing: 'border-box' }, tableSortButton: { display: 'inline-flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', padding: 0, cursor: 'pointer' }, td: { padding: '10px 8px', borderBottom: '1px solid #F5F2ED', verticalAlign: 'middle', boxSizing: 'border-box' }, actionBtn: { padding: '0', borderRadius: '6px', backgroundColor: '#FAF7F2', border: '1px solid #E7E5E4', color: '#57534E', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', width: '28px', height: '28px', boxSizing: 'border-box', flexShrink: 0 }, modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(45, 20, 13, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }, modalContentLarge: { backgroundColor: '#FFFFFF', border: `1px solid ${BRAND.border}`, borderRadius: '14px', width: '100%', maxWidth: '1200px', padding: '24px', position: 'relative', color: BRAND.textDark, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }, modalContent: { backgroundColor: '#FFFFFF', border: `1px solid ${BRAND.border}`, borderRadius: '14px', width: '100%', maxWidth: '460px', padding: '24px', position: 'relative', color: BRAND.textDark, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }, pageBtn: (active) => ({ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: active ? BRAND.accentOrange : '#EFEBE4', color: active ? '#FFFFFF' : '#57534E', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }), settingsCard: { backgroundColor: '#FFFFFF', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }, settingsSelect: { width: '100%', backgroundColor: '#FFFFFF', border: '1px solid #D6D3D1', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: BRAND.textDark, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }, btnGreen: { backgroundColor: '#16A34A', color: '#FFFFFF', padding: '9px 18px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }, toggleSwitch: (enabled) => ({ width: '44px', height: '24px', backgroundColor: enabled ? '#16A34A' : '#D6D3D1', borderRadius: '12px', padding: '2px', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-block' }), toggleCircle: (enabled) => ({ width: '20px', height: '20px', backgroundColor: '#FFFFFF', borderRadius: '50%', transform: enabled ? 'translateX(20px)' : 'translateX(0px)', transition: 'all 0.2s' }), toastContainer: { position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#16A34A', color: '#FFFFFF', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', zIndex: 100 }, toggleBtnGroup: { display: 'flex', gap: '8px', marginTop: '6px' }, toggleBtn: (active) => ({ padding: '8px 20px', borderRadius: '6px', border: '1px solid #D6D3D1', backgroundColor: active ? BRAND.accentOrange : '#FFFFFF', color: active ? '#FFFFFF' : BRAND.textDark, fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }) }; const livePoints = (branchAnalytics?.dailyRevenue || []).map((p, index, arr) => {
  const max = Math.max(...arr.map(x => Number(x.revenue) || 0), 1);
  const x = arr.length <= 1 ? 500 : (index / (arr.length - 1)) * 1000;
  const y = 180 - ((Number(p.revenue) || 0) / max) * 145;
  return { x, y, date: String(p.date), val: `₹${Number(p.revenue || 0).toLocaleString('en-IN')}` };
});
const currentChartData = livePoints.length > 0 ? {
  points: livePoints,
  labels: livePoints.map(p => p.date),
  path: livePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' '),
  fillPath: `${livePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')} L 1000,200 L 0,200 Z`,
} : { points: [], labels: [], path: '', fillPath: '' };

const currentMainBranch = selectedMainBranch || branches.find((b) => !b.parentBranchId && (b.id === 1 || String(b.name).toLowerCase().includes('main'))) || branches.find((b) => !b.parentBranchId) || branches[0];
const availableSubBranches = subBranches?.length ? subBranches : branches.filter((b) => currentMainBranch && b.id !== currentMainBranch.id);
const activeSubBranchId = selectedSubBranchId || selectedSubBranch?.id || 0;
const currentSelectedSubBranch = selectedSubBranch || availableSubBranches.find((b) => Number(b.id) === Number(activeSubBranchId)) || availableSubBranches[0] || null;

return ( <div style={styles.container}> {toastMessage && ( <div style={styles.toastContainer}> <Check style={{ width: '18px', height: '18px' }} /> {toastMessage} </div> )} <div style={styles.wrapper}> {viewBranch ? ( /* DETAIL VIEW */
<div>
  <div style={{ marginBottom: '16px' }}>
    <button onClick={() => { setViewBranch(null); setActiveTab('Overview'); }} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
      <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('backToBranches', 'Back to Branches Directory')}
    </button>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>{t('branchDetails', 'Branch Details')}</h2>
    </div>
    <div style={{ display: 'flex', gap: '12px' }}>
      <button onClick={() => { setSectionBranch(viewBranch); setActiveTab('Outlets'); setViewBranch(null); }} style={{ ...styles.buttonPrimary, backgroundColor: '#2563EB' }}>
        <Store style={{ width: '16px', height: '16px' }} /> {t('outlets', 'Outlets')}
      </button>
      <button onClick={() => { setSectionBranch(viewBranch); setActiveTab('Staff'); setViewBranch(null); }} style={{ ...styles.buttonPrimary, backgroundColor: BRAND.accentOrange }}>
        <Users style={{ width: '16px', height: '16px' }} /> {t('staff', 'Staff')}
      </button>
    </div>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: `1px solid ${BRAND.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: BRAND.textDark }}>{localizeBranchName(viewBranch.name)}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#78716C' }}>{viewBranch.code}</span>
          <span style={{ fontSize: '12px', backgroundColor: viewBranch.status === 'Active' ? BRAND.activeBg : BRAND.inactiveBg, color: viewBranch.status === 'Active' ? BRAND.activeText : BRAND.inactiveText, padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
            {translateStatus(viewBranch.status)}
          </span>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
        <div>
          <p style={{ color: '#78716C', margin: '0 0 2px 0', fontSize: '11px' }}>{t('branchManager', 'Branch Manager')}</p>
          <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{localizeManager(viewBranch.manager)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#57534E' }}>
          <Phone style={{ width: '14px', height: '14px' }} /> {toDevanagari(viewBranch.contact)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#57534E' }}>
          <Mail style={{ width: '14px', height: '14px' }} /> {viewBranch.email}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: `1px solid ${BRAND.border}` }}>
        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', color: BRAND.textDark }}>{t('branchInformation', 'Branch Information')}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', fontSize: '13px' }}>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('branchName', 'Branch Name')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{localizeBranchName(viewBranch.name)}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('branchCode', 'Branch Code')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{viewBranch.code}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('parentBranch', 'Parent Branch')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{viewBranch.parentBranchName ? localizeBranchName(viewBranch.parentBranchName) : t('topLevelBranch', 'Top-Level Branch')}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('email', 'Email')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{viewBranch.email}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('phone', 'Phone')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{toDevanagari(viewBranch.contact)}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('operatingHours', 'Operating Hours')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{viewBranch.hours}</p>
          </div>
          <div>
            <p style={{ color: '#78716C', margin: '0 0 4px 0' }}>{t('establishedOn', 'Established On')}</p>
            <p style={{ fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{formatDate(viewBranch.established) || viewBranch.established}</p>
          </div>
        </div>
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${BRAND.border}` }}>
          <p style={{ color: '#78716C', margin: '0 0 4px 0', fontSize: '12px' }}>{t('address', 'Address')}</p>
          <p style={{ fontSize: '13px', margin: 0, color: BRAND.textDark }}>{localizeLocation(viewBranch.address)}</p>
        </div>
      </div>
<div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: `1px solid ${BRAND.border}` }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <div>
      <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: BRAND.textDark }}>{t('subBranches', 'Sub-Branches')}</h4>
      <p style={{ fontSize: '12px', color: '#78716C', margin: '4px 0 0 0' }}>
        {t('branchesOperatingUnder', 'Branches operating under')} {localizeBranchName(viewBranch.name)}
      </p>
    </div>
    <button
      onClick={() => { setBranchForm((prev) => ({ ...prev, parentBranchId: String(viewBranch.id) })); setErrors({}); setShowAddBranchModal(true); }}
      style={styles.buttonPrimary}
    >
      <Plus style={{ width: '15px', height: '15px' }} /> {t('addSubBranch', 'Add Sub-Branch')}
    </button>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {branches.filter((child) => Number(child.parentBranchId) === Number(viewBranch.id)).map((child) => (
      <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: `1px solid ${BRAND.border}`, borderRadius: '8px', backgroundColor: '#FFFCF9' }}>
        <div>
          <div style={{ fontWeight: '700', color: BRAND.textDark }}>↳ {localizeBranchName(child.name)}</div>
          <div style={{ fontSize: '11px', color: '#78716C' }}>{child.code} · {t('parentColon', 'Parent:')} {localizeBranchName(viewBranch.name)}</div>
        </div>
        <button onClick={() => { setSectionBranch(child); setViewBranch(child); }} style={styles.actionBtn} title="View Sub-Branch">
          <Eye style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    ))}
    {branches.filter((child) => Number(child.parentBranchId) === Number(viewBranch.id)).length === 0 && (
      <div style={{ color: '#78716C', fontSize: '13px', padding: '8px 0' }}>{t('noSubBranchesYet', 'No sub-branches yet.')}</div>
    )}
  </div>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
    <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>{t('totalSubBranches', 'Total Sub-Branches')}</p>
    <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#D97706', margin: '4px 0 0 0' }}>{toDevanagari(viewBranch.subBranchCount || 0)}</p>
  </div>
  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
    <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>{t('totalStaff', 'Total Staff')}</p>
    <p style={{ fontSize: '22px', fontWeight: 'bold', color: BRAND.accentOrange, margin: '4px 0 0 0' }}>{toDevanagari(viewBranch.staffCount || 0)}</p>
  </div>
  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
    <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>{t('activeMembers', 'Total Members')}</p>
    <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563EB', margin: '4px 0 0 0' }}>{toDevanagari(viewBranch.members || 0)}</p>
  </div>
  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
    <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>{t('todayRevenue', "Today's Revenue")}</p>
    <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#16A34A', margin: '4px 0 0 0' }}>{formatNumber(branchAnalytics?.todayRevenue || 0, { asCurrency: true })}</p>
  </div>
</div> </div> </div> </div> ) : activeTab === 'Overview' ? ( /* OVERVIEW SCREEN */
<div>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>{t('branchDirectory', 'Branch Directory')}</h2>
      <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: '4px 0 0 0' }}>{t('manageBranchesSubtitle', 'Manage hotel branches, locations, and facilities')}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#78716C', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder={t('searchBranches', 'Search branches...')}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          style={{ ...styles.input, paddingLeft: '36px', width: '220px', height: '40px', boxSizing: 'border-box' }}
        />
      </div>
      <select
        value={branchFilter}
        onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
        style={{ ...styles.input, cursor: 'pointer', minWidth: '160px', height: '40px', boxSizing: 'border-box' }}
      >
        <option value="All">{t('allBranches', 'All Branches')}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.parentBranchId ? `↳ ${localizeBranchName(b.name)}` : localizeBranchName(b.name)}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setErrors({});
          setBranchForm((prev) => ({ ...prev, parentBranchId: '' }));
          setShowAddBranchModal(true);
        }}
        style={{ ...styles.buttonPrimary, height: '40px', boxSizing: 'border-box' }}
      >
        <Plus style={{ width: '16px', height: '16px' }} /> {t('addBranch', 'Add Branch')}
      </button>
    </div>
  </div>

  {/* Active Branch Context Banner */}
  <div style={{
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #BBF7D0',
    borderRadius: '12px',
    padding: '14px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        backgroundColor: '#DCFCE7',
        color: '#15803D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Building2 size={20} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('currentActiveSystemBranch', 'CURRENT ACTIVE SYSTEM BRANCH')}
        </div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: BRAND.textDark }}>
          {localizeBranchName(selectedBranch?.name || 'Main Branch')} <span style={{ fontSize: '13px', fontWeight: '500', color: '#78716C' }}>({selectedBranch?.code || 'BR-MAIN'})</span>
          {selectedSubBranch ? <span style={{ marginLeft: '8px', fontSize: '12px', color: '#C2410C', fontWeight: '600' }}>[{t('subBranchOf', 'Sub-Branch of')} {localizeBranchName(selectedMainBranch?.name)}]</span> : <span style={{ marginLeft: '8px', fontSize: '12px', color: '#15803D', fontWeight: '600' }}>[{t('mainBranch', 'Main Branch')}]</span>}
        </div>
      </div>
    </div>
    <div style={{ fontSize: '13px', color: '#57534E', fontWeight: '500' }}>
      {t('branchBannerDesc', 'All modules (Dashboard, Tables, KOT, Billing, Payments, Reports) reflect this branch.')}
    </div>
  </div>

  {/* Quick KPI Metric Cards */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
    <div style={styles.card(false)}>
      <div>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('totalBranches', 'Total Branches')}</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', color: BRAND.textDark, margin: '6px 0 0 0' }}>{toDevanagari(branches.length)}</p>
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FDF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.accentOrange }}>
        <Building2 style={{ width: '22px', height: '22px' }} />
      </div>
    </div>

    <div style={styles.card(false)}>
      <div>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('activeBranches', 'Active Branches')}</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', color: BRAND.textDark, margin: '6px 0 0 0' }}>
          {toDevanagari(branches.filter((b) => b.status === 'Active').length)}
        </p>
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
        <CheckCircle2 style={{ width: '22px', height: '22px' }} />
      </div>
    </div>

    <div style={styles.card(false)}>
      <div>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('totalSubBranches', 'Total Sub-Branches')}</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', color: BRAND.textDark, margin: '6px 0 0 0' }}>
          {toDevanagari(branches.filter((b) => Boolean(b.parentBranchId)).length)}
        </p>
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
        <Store style={{ width: '22px', height: '22px' }} />
      </div>
    </div>

    <div style={styles.card(false)}>
      <div>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('todayRevenue', "Today's Revenue")}</p>
        <p style={{ fontSize: '26px', fontWeight: 'bold', color: BRAND.textDark, margin: '6px 0 0 0' }}>
          ₹{formatNumber(totalRevenue)}
        </p>
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
        <IndianRupee style={{ width: '22px', height: '22px' }} />
      </div>
    </div>
  </div>

  {/* Branches Directory Table */}
  <div style={styles.tableContainer}>
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.th, textAlign: 'left', minWidth: '160px' }}>{t('branchSubBranch', 'BRANCH / SUB-BRANCH')}</th>
          <th style={{ ...styles.th, textAlign: 'left', minWidth: '90px' }}>{t('branchCode', 'BRANCH CODE')}</th>
          <th style={{ ...styles.th, textAlign: 'left', minWidth: '90px' }}>{t('parentBranch', 'PARENT BRANCH')}</th>
          <th style={{ ...styles.th, textAlign: 'left', minWidth: '90px' }}>{t('manager', 'MANAGER')}</th>
          <th style={{ ...styles.th, textAlign: 'left', minWidth: '95px' }}>{t('contact', 'CONTACT')}</th>
          <th style={{ ...styles.th, textAlign: 'center', width: '75px' }}>{t('status', 'STATUS')}</th>
          <th style={{ ...styles.th, textAlign: 'center', width: '65px' }}>{t('members', 'MEMBERS')}</th>
          <th style={{ ...styles.th, textAlign: 'center', width: '150px' }}>{t('actions', 'ACTION')}</th>
        </tr>
      </thead>
      <tbody>
        {currentBranches.length === 0 ? (
          <tr>
            <td colSpan={8} style={{ ...styles.td, textAlign: 'center', padding: '48px 20px', color: '#78716C' }}>
              <Building2 style={{ width: '38px', height: '38px', color: '#D6D3D1', margin: '0 auto 10px auto', display: 'block' }} />
              <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: BRAND.textDark }}>{t('noBranchesFound', 'No branches found')}</p>
              <p style={{ margin: 0, fontSize: '13px' }}>{t('adjustSearchOrFilter', 'Try adjusting your search query or branch filter.')}</p>
            </td>
          </tr>
        ) : (
          currentBranches.map((branch) => {
            const isSub = Boolean(branch.parentBranchId);
            return (
              <tr key={branch.id} style={{ transition: 'background-color 0.15s' }}>
                <td style={styles.td}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    paddingLeft: branch.hierarchyLevel ? `${branch.hierarchyLevel * 22}px` : '0px'
                  }}>
                    {branch.hierarchyLevel > 0 && (
                      <span style={{
                        color: '#EA580C',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        lineHeight: '18px',
                        display: 'inline-block',
                        flexShrink: 0
                      }}>
                        ↳
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: isSub ? '#FFF7ED' : '#F5F5F4',
                          color: isSub ? '#C2410C' : '#57534E',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          lineHeight: '14px',
                          display: 'inline-block'
                        }}>
                          {isSub ? t('subBranch', 'Sub-Branch') : t('mainBranch', 'Main Branch')}
                        </span>
                        <span style={{ color: BRAND.textDark, fontWeight: '600', fontSize: '13.5px', lineHeight: '18px' }}>
                          {localizeBranchName(branch.name)}
                        </span>
                      </div>
                      {branch.address && (
                        <span style={{ fontSize: '11px', color: '#78716C', paddingLeft: '2px', lineHeight: '14px' }}>
                          {localizeLocation(branch.address)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ ...styles.td, color: '#44403C', fontWeight: '600', fontSize: '12.5px' }}>
                  <span style={{
                    backgroundColor: '#F5F5F4',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #E7E5E4',
                    display: 'inline-block',
                    letterSpacing: '0.02em'
                  }}>
                    {branch.code || '—'}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#57534E', fontSize: '13px' }}>
                  {branch.parentBranchName ? (
                    <span style={{ color: BRAND.textDark, fontWeight: '500' }}>{localizeBranchName(branch.parentBranchName)}</span>
                  ) : (
                    <span style={{ color: '#A8A29E' }}>—</span>
                  )}
                </td>
                <td style={{ ...styles.td, color: BRAND.textDark, fontSize: '13px', fontWeight: '500' }}>
                  {localizeManager(branch.manager)}
                </td>
                <td style={{ ...styles.td, color: '#57534E', fontSize: '13px' }}>
                  {branch.contact ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone style={{ width: '13px', height: '13px', color: '#78716C', flexShrink: 0 }} />
                      <span>{toDevanagari(branch.contact)}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#A8A29E' }}>—</span>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    display: 'inline-block',
                    backgroundColor: branch.status === 'Active' ? BRAND.activeBg : BRAND.inactiveBg,
                    color: branch.status === 'Active' ? BRAND.activeText : BRAND.inactiveText,
                  }}>
                    {translateStatus(branch.status)}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center', color: BRAND.textDark, fontSize: '13px', fontWeight: '600' }}>
                  {toDevanagari(branch.members ?? 0)}
                </td>
                <td style={{ ...styles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', flexWrap: 'nowrap' }}>
                    {Number(selectedBranchId) === Number(branch.id) ? (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        width: '98px',
                        height: '28px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}>
                        {t('activeBadge', '✓ ACTIVE')}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (branch.parentBranchId) {
                            setSelectedMainBranchId(Number(branch.parentBranchId));
                            setSelectedSubBranchId(Number(branch.id));
                          } else {
                            setSelectedMainBranchId(Number(branch.id));
                          }
                          showToast(`${t('switchedActiveBranchTo', 'Switched active branch to')} ${localizeBranchName(branch.name)}`);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #16A34A',
                          backgroundColor: '#FFFFFF',
                          color: '#16A34A',
                          fontWeight: '700',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          width: '98px',
                          height: '28px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                        title={t('selectBranch', 'Set as active system branch')}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F0FDF4'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                      >
                        {t('selectBranch', 'Select Branch')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSectionBranch(branch); setViewBranch(branch); }}
                      style={styles.actionBtn}
                      title={t('branchDetails', 'View Branch Details')}
                    >
                      <Eye style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => { setEditBranch({ ...branch }); setErrors({}); }}
                      style={styles.actionBtn}
                      title={t('editBranch', 'Edit Branch')}
                    >
                      <Edit style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => { setSectionBranch(branch); setViewBranch(null); setActiveTab('Reports'); }}
                      style={{ ...styles.actionBtn, color: '#16A34A' }}
                      title={t('reportsOverview', 'Analytics & Reports')}
                    >
                      <BarChart3 style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => { setSectionBranch(branch); setViewBranch(null); setActiveTab('Settings'); }}
                      style={styles.actionBtn}
                      title={t('generalSettings', 'Branch Settings')}
                    >
                      <Settings style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => setDeleteBranchId(branch.id)}
                      style={{ ...styles.actionBtn, color: '#DC2626' }}
                      title={t('delete', 'Delete Branch')}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination Footer */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px', flexWrap: 'wrap', gap: '12px' }}>
    {activeLang === 'mr' ? (
      <p style={{ margin: 0, fontSize: '13px', color: '#78716C' }}>
        <strong style={{ color: BRAND.textDark }}>{toDevanagari(hierarchicalBranches.length)}</strong> {t('of', 'पैकी')} <strong style={{ color: BRAND.textDark }}>{toDevanagari(hierarchicalBranches.length === 0 ? 0 : indexOfFirstItem + 1)}</strong> {t('to', 'ते')} <strong style={{ color: BRAND.textDark }}>{toDevanagari(Math.min(indexOfLastItem, hierarchicalBranches.length))}</strong> {t('ofBranches', 'शाखा')} {t('showing', 'दर्शवित आहे')}
      </p>
    ) : activeLang === 'hi' ? (
      <p style={{ margin: 0, fontSize: '13px', color: '#78716C' }}>
        <strong style={{ color: BRAND.textDark }}>{toDevanagari(hierarchicalBranches.length)}</strong> {t('of', 'में से')} <strong style={{ color: BRAND.textDark }}>{toDevanagari(hierarchicalBranches.length === 0 ? 0 : indexOfFirstItem + 1)}</strong> {t('to', 'से')} <strong style={{ color: BRAND.textDark }}>{toDevanagari(Math.min(indexOfLastItem, hierarchicalBranches.length))}</strong> {t('ofBranches', 'शाखाएं')} {t('showing', 'प्रदर्शित')}
      </p>
    ) : (
      <p style={{ margin: 0, fontSize: '13px', color: '#78716C' }}>
        Showing <strong style={{ color: BRAND.textDark }}>{hierarchicalBranches.length === 0 ? 0 : indexOfFirstItem + 1}</strong> to <strong style={{ color: BRAND.textDark }}>{Math.min(indexOfLastItem, hierarchicalBranches.length)}</strong> of <strong style={{ color: BRAND.textDark }}>{hierarchicalBranches.length}</strong> branches
      </p>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        style={{
          ...styles.pageBtn(false),
          opacity: currentPage === 1 ? 0.45 : 1,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
          padding: '7px 12px'
        }}
      >
        <ChevronLeft style={{ width: '15px', height: '15px' }} /> {t('previous', 'Previous')}
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => setCurrentPage(pageNum)}
          style={{
            ...styles.pageBtn(currentPage === pageNum),
            fontSize: '13px',
            padding: '7px 12px'
          }}
        >
          {toDevanagari(pageNum)}
        </button>
      ))}

      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        style={{
          ...styles.pageBtn(false),
          opacity: (currentPage === totalPages || totalPages === 0) ? 0.45 : 1,
          cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
          padding: '7px 12px'
        }}
      >
        {t('next', 'Next')} <ChevronRight style={{ width: '15px', height: '15px' }} />
      </button>
    </div>
  </div>
</div> ) : activeTab === 'Outlets' ? ( /* OUTLETS SCREEN */
<div>
  <div style={{ marginBottom: '16px' }}>
    <button onClick={() => { setViewBranch(null); setActiveTab('Overview'); }} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
      <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('backToBranches', 'Back to Branches Directory')}
    </button>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>{t('outletsManagement', 'Outlets Management')}</h2>
      <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: '4px 0 0 0' }}>{t('manageOutletsSubtitle', 'Manage legacy outlets and services linked to the selected branch')}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '11px', width: '16px', height: '16px', color: '#78716C' }} />
        <input type="text" placeholder={t('searchOutlet', 'Search outlet...')} value={outletSearchQuery} onChange={(e) => setOutletSearchQuery(e.target.value)} style={{ ...styles.input, paddingLeft: '36px' }} />
      </div>
      <select value={outletStatusFilter} onChange={(e) => setOutletStatusFilter(e.target.value)} style={styles.input}>
        <option value="All">{t('allStatus', 'All Status')}</option>
        <option value="Active">{t('active', 'Active')}</option>
        <option value="Inactive">{t('inactive', 'Inactive')}</option>
      </select>
      <button onClick={() => { setErrors({}); setShowAddOutletModal(true); }} style={styles.buttonPrimary}>
        <Plus style={{ width: '16px', height: '16px' }} /> {t('addOutlet', 'Add Outlet')}
      </button>
    </div>
  </div>
  <div style={styles.tableContainer}>
    <table style={styles.table}>
      <thead>
        <tr>
          {[
            ['name', t('outletName', 'Outlet Name')],
            ['code', t('outletCode', 'Outlet Code')],
            ['type', t('type', 'Type')],
            ['contact', t('contact', 'Contact')],
            ['status', t('status', 'Status')],
            ['staffCount', t('staff', 'Staff')]
          ].map(([key, label]) => (
            <th key={key} style={styles.th}>
              <button onClick={() => toggleSort(key, outletSortKey, outletSortOrder, setOutletSortKey, setOutletSortOrder)} style={styles.tableSortButton} title={`Sort by ${label}`}>
                {label}<SortArrow active={outletSortKey === key} direction={outletSortOrder} />
              </button>
            </th>
          ))}
          <th style={{ ...styles.th, textAlign: 'center' }}>{t('actions', 'Actions')}</th>
        </tr>
      </thead>
      <tbody>
        {filteredOutlets.map((outlet) => (
          <tr key={outlet.id}>
            <td style={{ ...styles.td, fontWeight: '600', color: BRAND.textDark }}>{t(outlet.name, outlet.name)}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{outlet.code}</td>
            <td style={styles.td}>{t(outlet.type, outlet.type)}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{toDevanagari(outlet.contact)}</td>
            <td style={styles.td}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: outlet.status === 'Active' ? BRAND.activeBg : BRAND.inactiveBg,
                color: outlet.status === 'Active' ? BRAND.activeText : BRAND.inactiveText,
              }}>
                {translateStatus(outlet.status)}
              </span>
            </td>
            <td style={styles.td}>{toDevanagari(outlet.staffCount)}</td>
            <td style={styles.td}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => setViewOutlet(outlet)} style={styles.actionBtn} title={t('view', 'View')}><Eye style={{ width: '16px', height: '16px' }} /></button>
                <button onClick={() => { setEditOutlet({ ...outlet }); setErrors({}); }} style={styles.actionBtn} title={t('edit', 'Edit')}><Edit style={{ width: '16px', height: '16px' }} /></button>
                <button onClick={() => setDeleteOutletId(outlet.id)} style={styles.actionBtn} title={t('delete', 'Delete')}><Trash2 style={{ width: '16px', height: '16px', color: '#DC2626' }} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div> ) : activeTab === 'Staff' ? ( /* STAFF SCREEN */
<div>
  <div style={{ marginBottom: '16px' }}>
    <button onClick={() => { setViewBranch(null); setActiveTab('Overview'); }} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
      <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('backToBranches', 'Back to Branches Directory')}
    </button>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>{t('staffManagement', 'Staff Management')}</h2>
      <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: '4px 0 0 0' }}>{t('manageStaffSubtitleBranches', 'Manage staff roles, assignments, and active directory')}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '11px', width: '16px', height: '16px', color: '#78716C' }} />
        <input type="text" placeholder={t('searchStaff', 'Search staff...')} value={staffSearchQuery} onChange={(e) => setStaffSearchQuery(e.target.value)} style={{ ...styles.input, paddingLeft: '36px' }} />
      </div>
      <select value={staffStatusFilter} onChange={(e) => setStaffStatusFilter(e.target.value)} style={styles.input}>
        <option value="All">{t('allStatus', 'All Status')}</option>
        <option value="Active">{t('active', 'Active')}</option>
        <option value="Inactive">{t('inactive', 'Inactive')}</option>
      </select>
      <button onClick={() => { setErrors({}); setShowAddStaffModal(true); }} style={styles.buttonPrimary}>
        <Plus style={{ width: '16px', height: '16px' }} /> {t('addStaff', 'Add Staff')}
      </button>
    </div>
  </div>
  <div style={styles.tableContainer}>
    <table style={styles.table}>
      <thead>
        <tr>
          {[
            ['name', t('staffName', 'Staff Name')],
            ['code', t('staffCode', 'Staff Code')],
            ['role', t('role', 'Role')],
            ['branch', t('branch', 'Branch')],
            ['outlet', t('outlet', 'Outlet')],
            ['outletCode', t('outletCode', 'Outlet Code')],
            ['contact', t('contact', 'Contact')],
            ['status', t('status', 'Status')]
          ].map(([key, label]) => (
            <th key={key} style={styles.th}>
              <button onClick={() => toggleSort(key, staffSortKey, staffSortOrder, setStaffSortKey, setStaffSortOrder)} style={styles.tableSortButton} title={`Sort by ${label}`}>
                {label}<SortArrow active={staffSortKey === key} direction={staffSortOrder} />
              </button>
            </th>
          ))}
          <th style={{ ...styles.th, textAlign: 'center' }}>{t('actions', 'Actions')}</th>
        </tr>
      </thead>
      <tbody>
        {filteredStaff.map((member) => (
          <tr key={member.id}>
            <td style={{ ...styles.td, fontWeight: '600', color: BRAND.textDark }}>{localizeGuestName(member.name)}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{member.code}</td>
            <td style={styles.td}>{t(member.role, member.role)}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{localizeBranchName(member.branch || 'Main Branch')}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{t(member.outlet, member.outlet)}</td>
            <td style={{ ...styles.td, color: '#78716C', fontWeight: '500' }}>{member.outletCode || 'OUT001'}</td>
            <td style={{ ...styles.td, color: '#78716C' }}>{toDevanagari(member.contact)}</td>
            <td style={styles.td}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: member.status === 'Active' ? BRAND.activeBg : BRAND.inactiveBg,
                color: member.status === 'Active' ? BRAND.activeText : BRAND.inactiveText,
              }}>
                {translateStatus(member.status)}
              </span>
            </td>
            <td style={styles.td}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => setViewStaff(member)} style={styles.actionBtn} title={t('view', 'View')}><Eye style={{ width: '16px', height: '16px' }} /></button>
                <button onClick={() => { setEditStaff({ ...member }); setErrors({}); }} style={styles.actionBtn} title={t('edit', 'Edit')}><Edit style={{ width: '16px', height: '16px' }} /></button>
                <button onClick={() => setDeleteStaffId(member.id)} style={styles.actionBtn} title={t('delete', 'Delete')}><Trash2 style={{ width: '16px', height: '16px', color: '#DC2626' }} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div> ) : activeTab === 'Reports' ? ( /* REPORTS DASHBOARD */
<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
  <div style={{ marginBottom: '16px' }}>
    <button onClick={() => { setViewBranch(null); setActiveTab('Overview'); }} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
      <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('backToBranches', 'Back to Branches Directory')}
    </button>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>
        {t('reportsOverview', 'Reports & Analytics')} {sectionBranch ? `- ${localizeBranchName(sectionBranch.name)}` : ''}
      </h2>
      <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: '4px 0 0 0' }}>{t('trackRevenueSubtitle', 'Track branch revenue performance and operational metrics')}</p>
    </div>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={reportTimeRange} onChange={(e) => setReportTimeRange(e.target.value)} style={{ ...styles.input, cursor: 'pointer' }}>
        <option value="This Month">{t('thisMonth', 'This Month')}</option>
        <option value="Last Month">{t('lastMonth', 'Last Month')}</option>
        <option value="This Year">{t('thisYear', 'This Year')}</option>
      </select>
      <button onClick={handleExportCSV} style={{ ...styles.buttonPrimary, backgroundColor: '#16A34A' }} title={t('exportCsv', 'Export CSV')}>
        <Download style={{ width: '16px', height: '16px' }} /> {t('exportCsv', 'Export CSV')}
      </button>
      <button onClick={handleExportPDF} style={styles.buttonPrimary} title={t('exportPdf', 'Export PDF')}>
        <Download style={{ width: '16px', height: '16px' }} /> {t('exportPdf', 'Export PDF')}
      </button>
    </div>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
    <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('totalRevenue', 'Total Revenue')}</p>
        <div style={{ padding: '6px', backgroundColor: '#FDF8F3', borderRadius: '8px', color: BRAND.accentOrange }}>
          <IndianRupee style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND.textDark, margin: '8px 0 4px 0' }}>{formatNumber(branchAnalytics?.totalRevenue || 0, { asCurrency: true })}</p>
      <p style={{ fontSize: '11px', color: '#16A34A', margin: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#A8A29E' }}>{t('liveDatabase', 'Live database')}</span>
      </p>
    </div>
    <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('totalOrders', 'Total Orders')}</p>
        <div style={{ padding: '6px', backgroundColor: '#DBEAFE', borderRadius: '8px', color: '#2563EB' }}>
          <Store style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND.textDark, margin: '8px 0 4px 0' }}>{toDevanagari(branchAnalytics?.totalOrders || 0)}</p>
      <p style={{ fontSize: '11px', color: '#16A34A', margin: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#A8A29E' }}>{t('liveDatabase', 'Live database')}</span>
      </p>
    </div>
    <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('mealsServed', 'Meals Served')}</p>
        <div style={{ padding: '6px', backgroundColor: '#FFEDD5', borderRadius: '8px', color: '#EA580C' }}>
          <Users style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND.textDark, margin: '8px 0 4px 0' }}>{toDevanagari(branchAnalytics?.mealsServed || 0)}</p>
      <p style={{ fontSize: '11px', color: '#16A34A', margin: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#A8A29E' }}>{t('liveDatabase', 'Live database')}</span>
      </p>
    </div>
    <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: `1px solid ${BRAND.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '13px', color: '#78716C', margin: 0, fontWeight: '500' }}>{t('activeMembers', 'Active Members')}</p>
        <div style={{ padding: '6px', backgroundColor: '#DCFCE7', borderRadius: '8px', color: '#16A34A' }}>
          <CheckCircle2 style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND.textDark, margin: '8px 0 4px 0' }}>{toDevanagari(branchAnalytics?.activeMembers || 0)}</p>
      <p style={{ fontSize: '11px', color: '#16A34A', margin: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#A8A29E' }}>{t('liveDatabase', 'Live database')}</span>
      </p>
    </div>
  </div>
  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: `1px solid ${BRAND.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: BRAND.textDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {t('overview', 'Overview')} <TrendingUp style={{ width: '18px', height: '18px', color: BRAND.accentOrange }} /> {t('revenue', 'Revenue')} ({t(reportTimeRange, reportTimeRange)} - {t(reportFrequency, reportFrequency)})
      </h3>
      <select value={reportFrequency} onChange={(e) => setReportFrequency(e.target.value)} style={{ ...styles.input, padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>
        <option value="Daily">{t('daily', 'Daily')}</option>
        <option value="Weekly">{t('weekly', 'Weekly')}</option>
      </select>
    </div>
    <div style={{ height: '220px', position: 'relative', width: '100%' }}>
      <svg viewBox="0 0 1000 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND.accentOrange} stopOpacity="0.35" />
            <stop offset="100%" stopColor={BRAND.accentOrange} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 50, 100, 150, 200].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="1000" y2={y} stroke="#E7E5E4" strokeDasharray="3 3" />
        ))}
        <path d={currentChartData.fillPath} fill="url(#warmGrad)" />
        <path d={currentChartData.path} fill="none" stroke={BRAND.accentOrange} strokeWidth="3" />
        {currentChartData.points.map((pt, i) => (
          <g key={i} onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
            <circle cx={pt.x} cy={pt.y} r="5" fill={BRAND.accentOrange} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        ))}
      </svg>
      {hoveredPoint && (
        <div style={{ position: 'absolute', left: `${hoveredPoint.x / 10}%`, top: `${hoveredPoint.y - 45}px`, backgroundColor: BRAND.darkBg, color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #44403C', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
          <p style={{ margin: 0, fontSize: '10px', color: '#A8A29E' }}>{hoveredPoint.date}</p>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#FB923C' }}>{hoveredPoint.val}</p>
        </div>
      )}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C', fontSize: '11px', marginTop: '12px' }}>
      {currentChartData.labels.map((d) => (
        <span key={d}>{d}</span>
      ))}
    </div>
  </div>
</div> ) : ( /* GENERAL SETTINGS FORM (5th Image) */
<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
  <div style={{ marginBottom: '16px' }}>
    <button onClick={() => { setViewBranch(null); setActiveTab('Overview'); }} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
      <ArrowLeft style={{ width: '16px', height: '16px' }} /> {t('backToBranches', 'Back to Branches Directory')}
    </button>
  </div>
  <div style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
        <Settings style={{ width: '24px', height: '24px' }} />
      </div>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: BRAND.textDark, margin: 0 }}>{t('generalSettings', 'General Settings')}</h2>
        <p style={{ fontSize: '13px', color: '#78716C', margin: '4px 0 0 0' }}>{t('generalSettingsSubtitle', 'Configure basic branch preferences and operational settings')}</p>
      </div>
    </div>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
    <div style={styles.settingsCard}>
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 20px 0' }}>{t('branchPreferences', 'Branch Preferences')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('defaultBranch', 'Default Branch')}</label>
          <select value={settings.defaultBranch} onChange={(e) => handleSettingChange('defaultBranch', e.target.value)} style={styles.settingsSelect}>
            <option value="Main Branch">{localizeBranchName('Main Branch')}</option>
            <option value="City Center Branch">{localizeBranchName('City Center Branch')}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('dateFormat', 'Date Format')}</label>
          <select value={settings.dateFormat} onChange={(e) => handleSettingChange('dateFormat', e.target.value)} style={styles.settingsSelect}>
            <option value="DD MMM YYYY">DD MMM YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('timeFormat', 'Time Format')}</label>
          <select value={settings.timeFormat} onChange={(e) => handleSettingChange('timeFormat', e.target.value)} style={styles.settingsSelect}>
            <option value="12 Hour (AM/PM)">12 Hour (AM/PM)</option>
            <option value="24 Hour">24 Hour</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('currency', 'Currency')}</label>
          <select value={settings.currency} onChange={(e) => handleSettingChange('currency', e.target.value)} style={styles.settingsSelect}>
            <option value="INR (₹)">INR (₹)</option>
            <option value="USD ($)">USD ($)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('language', 'Language')}</label>
          <select
            value={settings.language}
            onChange={(e) => {
              const val = e.target.value;
              handleSettingChange('language', val);
              if (val === 'Marathi' || val === 'mr') setLanguage('mr');
              else if (val === 'Hindi' || val === 'hi') setLanguage('hi');
              else if (val === 'English' || val === 'en') setLanguage('en');
            }}
            style={styles.settingsSelect}
          >
            <option value="English">English</option>
            <option value="Marathi">मराठी (Marathi)</option>
            <option value="Hindi">हिंदी (Hindi)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('timezone', 'Timezone')}</label>
          <select value={settings.timezone} onChange={(e) => handleSettingChange('timezone', e.target.value)} style={styles.settingsSelect}>
            <option value="Asia/Kolkata (UTC+05:30)">Asia/Kolkata (UTC+05:30)</option>
          </select>
        </div>
        <div style={{ paddingTop: '8px' }}>
          <button onClick={() => triggerSaveConfirm(t('preferencesSavedSuccess', 'Preferences saved successfully!'))} style={styles.btnGreen}>
            {t('savePreferences', '✓ Save Preferences')}
          </button>
        </div>
      </div>
    </div>
    <div style={styles.settingsCard}>
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 20px 0' }}>{t('operationalSettings', 'Operational Settings')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {[
          { key: 'autoBranchCode', label: t('autoBranchCode', 'Auto-generated Branch Code') },
          { key: 'branchReports', label: t('enableBranchReports', 'Enable Branch-wise Reports') },
          { key: 'interBranchTransfer', label: t('interBranchTransfer', 'Allow Inter-Branch Transfer') },
          { key: 'lowStockAlerts', label: t('lowStockAlerts', 'Low Stock Alerts') },
          { key: 'expenseApproval', label: t('expenseApproval', 'Enable Expense Approval') },
          { key: 'auditLogs', label: t('auditLogs', 'Maintain Audit Logs') },
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#44403C' }}>{item.label}</span>
            <div onClick={() => handleToggleSetting(item.key)} style={styles.toggleSwitch(settings[item.key])}>
              <div style={styles.toggleCircle(settings[item.key])}></div>
            </div>
          </div>
        ))}
        <div style={{ paddingTop: '20px' }}>
          <button onClick={() => triggerSaveConfirm(t('operationalSettingsSavedSuccess', 'Operational settings saved successfully!'))} style={styles.btnGreen}>
            {t('saveSettings', '✓ Save Settings')}
          </button>
        </div>
      </div>
    </div>
  </div> 
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
  <div style={styles.settingsCard}>
    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 20px 0' }}>{t('numberingSettings', 'Numbering Settings')}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[
        ['branchCodePrefix', t('branchCodePrefix', 'Branch Code Prefix')],
        ['outletCodePrefix', t('outletCodePrefix', 'Outlet Code Prefix')],
        ['staffCodePrefix', t('staffCodePrefix', 'Staff Code Prefix')],
        ['invoicePrefix', t('invoicePrefix', 'Invoice Prefix')],
        ['poPrefix', t('poPrefix', 'PO Prefix')]
      ].map(([key, label]) => (
        <div key={key}>
          <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{label}</label>
          <input
            type="text"
            value={settings[key]}
            onChange={(e) => handleSettingChange(key, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            style={styles.settingsSelect}
          />
        </div>
      ))}
      <div style={{ paddingTop: '8px' }}>
        <button onClick={() => triggerSaveConfirm(t('numberingPrefixesUpdatedSuccess', 'Numbering prefixes updated successfully!'))} style={styles.btnGreen}>
          {t('updatePrefixes', '✓ Update Prefixes')}
        </button>
      </div>
    </div>
  </div>

  <div style={styles.settingsCard}>
    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 20px 0' }}>{t('otherPreferences', 'Other Preferences')}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('itemsPerPage', 'Items per Page (Table)')}</label>
        <select value={settings.itemsPerPage} onChange={(e) => handleSettingChange('itemsPerPage', e.target.value)} style={styles.settingsSelect}>
          <option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('sessionTimeout', 'Session Timeout (Minutes)')}</label>
        <select value={settings.sessionTimeout} onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)} style={styles.settingsSelect}>
          <option value="15">15</option><option value="30">30</option><option value="60">60</option><option value="120">120</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: '13px', color: '#57534E', display: 'block', marginBottom: '6px' }}>{t('passwordExpiry', 'Password Expiry (Days)')}</label>
        <select value={settings.passwordExpiry} onChange={(e) => handleSettingChange('passwordExpiry', e.target.value)} style={styles.settingsSelect}>
          <option value="30">30</option><option value="60">60</option><option value="90">90</option><option value="180">180</option>
        </select>
      </div>
      {[
        ['twoFactorAuth', t('twoFactorAuth', 'Enable Two-Factor Auth')],
        ['captcha', t('captcha', 'Enable Captcha')]
      ].map(([key, label]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#44403C' }}>{label}</span>
          <button
            type="button"
            aria-label={label}
            onClick={() => handleToggleSetting(key)}
            style={{ ...styles.toggleSwitch(settings[key]), border: 'none' }}
          >
            <div style={styles.toggleCircle(settings[key])}></div>
          </button>
        </div>
      ))}
      <div style={{ paddingTop: '4px' }}>
        <button onClick={() => triggerSaveConfirm(t('otherPreferencesSavedSuccess', 'Other preferences saved successfully!'))} style={styles.btnGreen}>
          {t('savePreferences', '✓ Save Preferences')}
        </button>
      </div>
    </div>
  </div>
</div>

</div>
      )}

      {/* SETTINGS CONFIRMATION POPUP */}
      {showSaveConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <AlertTriangle style={{ width: '48px', height: '48px', color: BRAND.accentOrange, margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 8px 0' }}>
              {t('confirmAction', 'Confirm Action')}
            </h3>
            <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 20px 0' }}>
              {t('saveOrDiscardPrompt', 'Do you want to save changes or discard changes?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={discardSaveAction} style={{ ...styles.buttonPrimary, backgroundColor: '#DC2626' }}>
                {t('discardChanges', 'Discard Changes')}
              </button>
              <button onClick={confirmSaveAction} style={{ ...styles.buttonPrimary, backgroundColor: '#16A34A' }}>
                {t('saveChanges', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 POPUP FORMS MODAL OVERLAY */}
      {showAddBranchModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentLarge}>
            <button
              onClick={() => { setShowAddBranchModal(false); setErrors({}); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '24px', height: '24px' }} />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: BRAND.textDark, marginBottom: '20px' }}>
              {t('addBranchSubBranch', 'Add Branch / Sub-Branch')}
            </h3>
            <form onSubmit={handleAddBranch}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
                {/* 1ST COLUMN: BRANCH DETAILS */}
                <div style={{ border: `1px solid ${BRAND.border}`, padding: '16px', borderRadius: '10px', backgroundColor: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 14px 0', color: BRAND.textDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 style={{ width: '18px', height: '18px', color: BRAND.accentOrange }} />
                    {t('branchDetails', 'Branch Details')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('branchName', 'Branch Name')}</label>
                      <input
                        type="text"
                        value={branchForm.name}
                        onChange={(e) => handleCharOnlyInput(e, setBranchForm, branchForm, 'name')}
                        onBlur={() => handleTextBlur(setBranchForm, branchForm, 'name')}
                        style={styles.modalInput}
                      />
                      {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('branchCode', 'Branch Code')}</label>
                      <input
                        type="text"
                        value={branchForm.code}
                        onChange={(e) => handleUpperAndNumInput(e, setBranchForm, branchForm, 'code')}
                        style={styles.modalInput}
                      />
                      {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.code}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('parentBranchLabel', 'Parent Branch')}</label>
                      <select
                        value={branchForm.parentBranchId || ''}
                        onChange={(e) => setBranchForm({ ...branchForm, parentBranchId: e.target.value })}
                        style={styles.modalInput}
                      >
                        <option value="">{t('mainTopLevelBranch', 'Main / Top-Level Branch')}</option>
                        {branches.filter((b) => !b.parentBranchId).map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {localizeBranchName(parent.name)} ({parent.code})
                          </option>
                        ))}
                      </select>
                      <p style={{ fontSize: '11px', color: '#78716C', margin: '3px 0 0 0' }}>
                        {t('selectParentSubBranchHint', 'Select a parent only when this is a sub-branch.')}
                      </p>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('managerName', 'Manager Name')}</label>
                      <input
                        type="text"
                        value={branchForm.manager}
                        onChange={(e) => handleCharOnlyInput(e, setBranchForm, branchForm, 'manager')}
                        onBlur={() => handleTextBlur(setBranchForm, branchForm, 'manager')}
                        style={styles.modalInput}
                      />
                      {errors.manager && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.manager}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('contactPhone', 'Contact Phone')}</label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder={t('tenDigitNumber', '10-digit number')}
                        value={branchForm.contact}
                        onChange={(e) => handlePhoneInput(e, setBranchForm, branchForm, 'contact')}
                        style={styles.modalInput}
                      />
                      {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.contact}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('email', 'Email')}</label>
                      <input
                        type="email"
                        value={branchForm.email}
                        onChange={(e) => handleEmailInput(e, setBranchForm, branchForm, 'email')}
                        style={{ ...styles.modalInput, appearance: 'none', WebkitAppearance: 'none' }}
                      />
                      {errors.email && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.email}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('operatingHours', 'Operating Hours')}</label>
                      <input
                        type="text"
                        value={branchForm.hours}
                        onChange={(e) => handleTextInput(e, setBranchForm, branchForm, 'hours')}
                        onBlur={() => handleTextBlur(setBranchForm, branchForm, 'hours')}
                        style={styles.modalInput}
                      />
                      {errors.hours && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.hours}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('establishedOn', 'Established On')}</label>
                      <input
                        type="date"
                        value={branchForm.established}
                        onChange={(e) => setBranchForm({ ...branchForm, established: e.target.value })}
                        style={styles.modalInput}
                      />
                      {errors.established && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.established}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('address', 'Address')}</label>
                      <input
                        type="text"
                        value={branchForm.address}
                        onChange={(e) => handleTextInput(e, setBranchForm, branchForm, 'address')}
                        onBlur={() => handleTextBlur(setBranchForm, branchForm, 'address')}
                        style={styles.modalInput}
                      />
                      {errors.address && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.address}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('totalStaff', 'Total Staff')}</label>
                      <input
                        type="number"
                        min="0"
                        value={branchForm.totalStaff}
                        onChange={(e) => handleNumericInput(e, setBranchForm, branchForm, 'totalStaff')}
                        style={styles.modalInput}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('status', 'Status')}</label>
                      <select
                        value={branchForm.status}
                        onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}
                        style={styles.modalInput}
                      >
                        <option value="Active">{translateStatus('Active')}</option>
                        <option value="Inactive">{translateStatus('Inactive')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2ND COLUMN: ADD NEW OUTLET */}
                <div style={{ border: `1px solid ${BRAND.border}`, padding: '16px', borderRadius: '10px', backgroundColor: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 14px 0', color: BRAND.textDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Store style={{ width: '18px', height: '18px', color: '#2563EB' }} />
                    {t('addNewOutlet', 'Add New Outlet')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500', display: 'block' }}>
                        {t('addOutletQuestion', 'Add Outlet?')}
                      </label>
                      <div style={styles.toggleBtnGroup}>
                        <button
                          type="button"
                          onClick={() => setBranchForm({ ...branchForm, addOutlet: 'Yes' })}
                          style={styles.toggleBtn(branchForm.addOutlet === 'Yes')}
                        >
                          {t('yes', 'Yes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBranchForm({ ...branchForm, addOutlet: 'No' })}
                          style={styles.toggleBtn(branchForm.addOutlet === 'No')}
                        >
                          {t('no', 'No')}
                        </button>
                      </div>
                    </div>
                    {branchForm.addOutlet === 'Yes' && (
                      <>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('outletName', 'Outlet Name')}</label>
                          <input
                            type="text"
                            value={branchForm.outletName}
                            onChange={(e) => handleCharOnlyInput(e, setBranchForm, branchForm, 'outletName')}
                            onBlur={() => handleTextBlur(setBranchForm, branchForm, 'outletName')}
                            style={styles.modalInput}
                          />
                          {errors.outletName && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.outletName}</p>}
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('outletCode', 'Outlet Code')}</label>
                          <input
                            type="text"
                            value={branchForm.outletCode}
                            onChange={(e) => handleUpperAndNumInput(e, setBranchForm, branchForm, 'outletCode')}
                            style={styles.modalInput}
                          />
                          {errors.outletCode && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.outletCode}</p>}
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('outletType', 'Outlet Type')}</label>
                          <select
                            value={branchForm.outletType}
                            onChange={(e) => setBranchForm({ ...branchForm, outletType: e.target.value })}
                            style={styles.modalInput}
                          >
                            <option value="Restaurant">{t('Restaurant', 'Restaurant')}</option>
                            <option value="Banquet">{t('Banquet', 'Banquet')}</option>
                            <option value="Cafe">{t('Cafe', 'Cafe')}</option>
                            <option value="Take Away">{t('Take Away', 'Take Away')}</option>
                            <option value="Bar">{t('Bar', 'Bar')}</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('contactPhone', 'Contact Phone')}</label>
                          <input
                            type="text"
                            maxLength={10}
                            placeholder={t('tenDigitNumber', '10-digit number')}
                            value={branchForm.outletContact}
                            onChange={(e) => handlePhoneInput(e, setBranchForm, branchForm, 'outletContact')}
                            style={styles.modalInput}
                          />
                          {errors.outletContact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.outletContact}</p>}
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('staffCount', 'Staff Count')}</label>
                          <input
                            type="number"
                            min="0"
                            value={branchForm.outletStaffCount}
                            onChange={(e) => handleNumericInput(e, setBranchForm, branchForm, 'outletStaffCount')}
                            style={styles.modalInput}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('status', 'Status')}</label>
                          <select
                            value={branchForm.outletStatus}
                            onChange={(e) => setBranchForm({ ...branchForm, outletStatus: e.target.value })}
                            style={styles.modalInput}
                          >
                            <option value="Active">{translateStatus('Active')}</option>
                            <option value="Inactive">{translateStatus('Inactive')}</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3RD COLUMN: ADD STAFF MEMBER */}
                <div style={{ border: `1px solid ${BRAND.border}`, padding: '16px', borderRadius: '10px', backgroundColor: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 14px 0', color: BRAND.textDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users style={{ width: '18px', height: '18px', color: '#EA580C' }} />
                    {t('addStaffMember', 'Add Staff Member')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('branchName', 'Branch Name')}</label>
                      <select
                        value={branchForm.staffBranch}
                        onChange={(e) => setBranchForm({ ...branchForm, staffBranch: e.target.value })}
                        style={styles.modalInput}
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.name}>{localizeBranchName(b.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('staffName', 'Staff Name')}</label>
                      <input
                        type="text"
                        value={branchForm.staffName}
                        onChange={(e) => handleCharOnlyInput(e, setBranchForm, branchForm, 'staffName')}
                        onBlur={() => handleTextBlur(setBranchForm, branchForm, 'staffName')}
                        style={styles.modalInput}
                      />
                      {errors.staffName && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.staffName}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('staffCode', 'Staff Code')}</label>
                      <input
                        type="text"
                        value={branchForm.staffCode}
                        onChange={(e) => handleUpperAndNumInput(e, setBranchForm, branchForm, 'staffCode')}
                        style={styles.modalInput}
                      />
                      {errors.staffCode && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.staffCode}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('outletCode', 'Outlet Code')}</label>
                      <input
                        type="text"
                        placeholder="e.g. OUT001"
                        value={branchForm.staffOutletCode}
                        onChange={(e) => handleUpperAndNumInput(e, setBranchForm, branchForm, 'staffOutletCode')}
                        style={styles.modalInput}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('outletType', 'Outlet Type')}</label>
                      <select
                        value={branchForm.staffOutletType || 'Restaurant'}
                        onChange={(e) => setBranchForm({ ...branchForm, staffOutletType: e.target.value })}
                        style={styles.modalInput}
                      >
                        <option value="Restaurant">{t('Restaurant', 'Restaurant')}</option>
                        <option value="Banquet">{t('Banquet', 'Banquet')}</option>
                        <option value="Cafe">{t('Cafe', 'Cafe')}</option>
                        <option value="Take Away">{t('Take Away', 'Take Away')}</option>
                        <option value="Bar">{t('Bar', 'Bar')}</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('contactPhone', 'Contact Phone')}</label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder={t('tenDigitNumber', '10-digit number')}
                        value={branchForm.staffContact}
                        onChange={(e) => handlePhoneInput(e, setBranchForm, branchForm, 'staffContact')}
                        style={styles.modalInput}
                      />
                      {errors.staffContact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0 0' }}>{errors.staffContact}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('role', 'Role')}</label>
                      <select
                        value={branchForm.staffRole}
                        onChange={(e) => setBranchForm({ ...branchForm, staffRole: e.target.value })}
                        style={styles.modalInput}
                      >
                        <option value="Manager">{t('Manager', 'Manager')}</option>
                        <option value="Supervisor">{t('Supervisor', 'Supervisor')}</option>
                        <option value="Chef">{t('Chef', 'Chef')}</option>
                        <option value="Cashier">{t('Cashier', 'Cashier')}</option>
                        <option value="Waiter">{t('Waiter', 'Waiter')}</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>{t('status', 'Status')}</label>
                      <select
                        value={branchForm.staffStatus}
                        onChange={(e) => setBranchForm({ ...branchForm, staffStatus: e.target.value })}
                        style={styles.modalInput}
                      >
                        <option value="Active">{translateStatus('Active')}</option>
                        <option value="Inactive">{translateStatus('Inactive')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${BRAND.border}` }}>
                <button
                  type="button"
                  onClick={() => { setShowAddBranchModal(false); setErrors({}); }}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('saveAllManagementDetails', 'Save All Management Details')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ADD OUTLET MODAL */}
      {showAddOutletModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setShowAddOutletModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('addNewOutlet', 'Add New Outlet')}
            </h3>
            <form onSubmit={handleAddOutlet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletName', 'Outlet Name')}</label>
                <input
                  type="text"
                  value={outletForm.name}
                  onChange={(e) => handleCharOnlyInput(e, setOutletForm, outletForm, 'name')}
                  onBlur={() => handleTextBlur(setOutletForm, outletForm, 'name')}
                  style={styles.modalInput}
                />
                {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletCode', 'Outlet Code')}</label>
                <input
                  type="text"
                  value={outletForm.code}
                  onChange={(e) => handleUpperAndNumInput(e, setOutletForm, outletForm, 'code')}
                  style={styles.modalInput}
                />
                {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.code}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletType', 'Outlet Type')}</label>
                <select
                  value={outletForm.type}
                  onChange={(e) => setOutletForm({ ...outletForm, type: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Restaurant">{t('Restaurant', 'Restaurant')}</option>
                  <option value="Banquet">{t('Banquet', 'Banquet')}</option>
                  <option value="Cafe">{t('Cafe', 'Cafe')}</option>
                  <option value="Take Away">{t('Take Away', 'Take Away')}</option>
                  <option value="Bar">{t('Bar', 'Bar')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('contactPhone', 'Contact Phone')}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t('tenDigitNumber', '10-digit number')}
                  value={outletForm.contact}
                  onChange={(e) => handlePhoneInput(e, setOutletForm, outletForm, 'contact')}
                  style={styles.modalInput}
                />
                {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.contact}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffCount', 'Staff Count')}</label>
                <input
                  type="number"
                  min="0"
                  value={outletForm.staffCount}
                  onChange={(e) => setOutletForm({ ...outletForm, staffCount: e.target.value })}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('status', 'Status')}</label>
                <select
                  value={outletForm.status}
                  onChange={(e) => setOutletForm({ ...outletForm, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Active">{translateStatus('Active')}</option>
                  <option value="Inactive">{translateStatus('Inactive')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddOutletModal(false)}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('addOutlet', 'Add Outlet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setShowAddStaffModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('addStaffMember', 'Add Staff Member')}
            </h3>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffName', 'Staff Name')}</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => handleCharOnlyInput(e, setStaffForm, staffForm, 'name')}
                  onBlur={() => handleTextBlur(setStaffForm, staffForm, 'name')}
                  style={styles.modalInput}
                />
                {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffCode', 'Staff Code')}</label>
                <input
                  type="text"
                  value={staffForm.code}
                  onChange={(e) => handleUpperAndNumInput(e, setStaffForm, staffForm, 'code')}
                  style={styles.modalInput}
                />
                {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.code}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('role', 'Role')}</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Manager">{t('Manager', 'Manager')}</option>
                  <option value="Supervisor">{t('Supervisor', 'Supervisor')}</option>
                  <option value="Chef">{t('Chef', 'Chef')}</option>
                  <option value="Cashier">{t('Cashier', 'Cashier')}</option>
                  <option value="Waiter">{t('Waiter', 'Waiter')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('branchName', 'Branch Name')}</label>
                <select
                  value={staffForm.branch || ''}
                  onChange={(e) => {
                    const branchName = e.target.value;
                    const branchId = branches.find((b) => b.name === branchName)?.id;
                    const firstOutlet = outlets.find((o) => Number(o.branchId) === Number(branchId));
                    setStaffForm({ ...staffForm, branch: branchName, outlet: firstOutlet?.name || '' });
                  }}
                  style={styles.modalInput}
                >
                  <option value="" disabled>{t('selectBranch', 'Select branch')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>{localizeBranchName(b.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outlet', 'Outlet')}</label>
                <select
                  value={staffForm.outlet}
                  onChange={(e) => setStaffForm({ ...staffForm, outlet: e.target.value })}
                  style={styles.modalInput}
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.name}>{localizeBranchName(o.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletCode', 'Outlet Code')}</label>
                <input
                  type="text"
                  placeholder="e.g. OUT001"
                  value={staffForm.outletCode}
                  onChange={(e) => handleUpperAndNumInput(e, setStaffForm, staffForm, 'outletCode')}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('contactPhone', 'Contact Phone')}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t('tenDigitNumber', '10-digit number')}
                  value={staffForm.contact}
                  onChange={(e) => handlePhoneInput(e, setStaffForm, staffForm, 'contact')}
                  style={styles.modalInput}
                />
                {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.contact}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('status', 'Status')}</label>
                <select
                  value={staffForm.status}
                  onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Active">{translateStatus('Active')}</option>
                  <option value="Inactive">{translateStatus('Inactive')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('addStaff', 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {editBranch && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setEditBranch(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 16px 0' }}>
              {t('editBranch', 'Edit Branch')}
            </h3>
            <form onSubmit={handleUpdateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('branchName', 'Branch Name')}</label>
                <input
                  type="text"
                  value={editBranch.name}
                  onChange={(e) => handleCharOnlyInput(e, setEditBranch, editBranch, 'name')}
                  onBlur={() => handleTextBlur(setEditBranch, editBranch, 'name')}
                  style={styles.modalInput}
                />
                {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('branchCode', 'Branch Code')}</label>
                <input
                  type="text"
                  value={editBranch.code}
                  onChange={(e) => handleUpperAndNumInput(e, setEditBranch, editBranch, 'code')}
                  style={styles.modalInput}
                />
                {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.code}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('parentBranchLabel', 'Parent Branch')}</label>
                <select
                  value={editBranch.parentBranchId || ''}
                  onChange={(e) => setEditBranch({ ...editBranch, parentBranchId: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="">{t('mainTopLevelBranch', 'Main / Top-Level Branch')}</option>
                  {branches.filter((b) => Number(b.id) !== Number(editBranch.id) && !b.parentBranchId).map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {localizeBranchName(parent.name)} ({parent.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('managerName', 'Manager Name')}</label>
                <input
                  type="text"
                  value={editBranch.manager}
                  onChange={(e) => handleCharOnlyInput(e, setEditBranch, editBranch, 'manager')}
                  onBlur={() => handleTextBlur(setEditBranch, editBranch, 'manager')}
                  style={styles.modalInput}
                />
                {errors.manager && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.manager}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('contactPhone', 'Contact Phone')}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t('tenDigitNumber', '10-digit number')}
                  value={editBranch.contact}
                  onChange={(e) => handlePhoneInput(e, setEditBranch, editBranch, 'contact')}
                  style={styles.modalInput}
                />
                {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.contact}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('email', 'Email')}</label>
                <input
                  type="email"
                  value={editBranch.email || ''}
                  onChange={(e) => handleEmailInput(e, setEditBranch, editBranch, 'email')}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('operatingHours', 'Operating Hours')}</label>
                <input
                  type="text"
                  value={editBranch.hours || ''}
                  onChange={(e) => handleTextInput(e, setEditBranch, editBranch, 'hours')}
                  onBlur={() => handleTextBlur(setEditBranch, editBranch, 'hours')}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('establishedOn', 'Established On')}</label>
                <input
                  type="text"
                  value={editBranch.established || ''}
                  onChange={(e) => setEditBranch({ ...editBranch, established: e.target.value })}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('address', 'Address')}</label>
                <input
                  type="text"
                  value={editBranch.address || ''}
                  onChange={(e) => handleTextInput(e, setEditBranch, editBranch, 'address')}
                  onBlur={() => handleTextBlur(setEditBranch, editBranch, 'address')}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('totalStaff', 'Total Staff')}</label>
                <input
                  type="number"
                  min="0"
                  value={editBranch.staffCount ?? editBranch.totalStaff ?? 0}
                  onChange={(e) => setEditBranch({ ...editBranch, staffCount: e.target.value, totalStaff: e.target.value })}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('totalMembers', 'Total Members')}</label>
                <input
                  type="number"
                  min="0"
                  value={editBranch.members ?? editBranch.totalMembers ?? 0}
                  onChange={(e) => setEditBranch({ ...editBranch, members: e.target.value, totalMembers: e.target.value })}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('status', 'Status')}</label>
                <select
                  value={editBranch.status}
                  onChange={(e) => setEditBranch({ ...editBranch, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Active">{translateStatus('Active')}</option>
                  <option value="Inactive">{translateStatus('Inactive')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditBranch(null)}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('updateBranch', 'Update Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BRANCH CONFIRMATION */}
      {deleteBranchId && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <AlertTriangle style={{ width: '48px', height: '48px', color: '#DC2626', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND.textDark, margin: '0 0 8px 0' }}>
              {t('confirmDelete', 'Confirm Delete')}
            </h3>
            <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 20px 0' }}>
              {t('confirmDeleteBranch', 'Are you sure you want to delete this branch?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDeleteBranchId(null)} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  branchService.deleteBranch(deleteBranchId).then(() => {
                    setBranches(prev => prev.filter(b => b.id !== deleteBranchId));
                    setDeleteBranchId(null);
                    showToast(t('branchDeletedSuccess', 'Branch deleted successfully'));
                  }).catch(err => showToast(err?.response?.data?.message || t('failedToDeleteBranch', 'Failed to delete branch')));
                }}
                style={{ ...styles.buttonPrimary, backgroundColor: '#DC2626' }}
              >
                {t('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OUTLET MODAL */}
      {editOutlet && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setEditOutlet(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('editOutlet', 'Edit Outlet')}
            </h3>
            <form onSubmit={handleUpdateOutlet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletName', 'Outlet Name')}</label>
                <input
                  type="text"
                  value={editOutlet.name}
                  onChange={(e) => handleCharOnlyInput(e, setEditOutlet, editOutlet, 'name')}
                  onBlur={() => handleTextBlur(setEditOutlet, editOutlet, 'name')}
                  style={styles.modalInput}
                />
                {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletCode', 'Outlet Code')}</label>
                <input
                  type="text"
                  value={editOutlet.code}
                  onChange={(e) => handleUpperAndNumInput(e, setEditOutlet, editOutlet, 'code')}
                  style={styles.modalInput}
                />
                {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.code}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletType', 'Outlet Type')}</label>
                <select
                  value={editOutlet.type || 'Restaurant'}
                  onChange={(e) => setEditOutlet({ ...editOutlet, type: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Restaurant">{t('Restaurant', 'Restaurant')}</option>
                  <option value="Banquet">{t('Banquet', 'Banquet')}</option>
                  <option value="Cafe">{t('Cafe', 'Cafe')}</option>
                  <option value="Take Away">{t('Take Away', 'Take Away')}</option>
                  <option value="Bar">{t('Bar', 'Bar')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('contactPhone', 'Contact Phone')}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t('tenDigitNumber', '10-digit number')}
                  value={editOutlet.contact}
                  onChange={(e) => handlePhoneInput(e, setEditOutlet, editOutlet, 'contact')}
                  style={styles.modalInput}
                />
                {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.contact}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('status', 'Status')}</label>
                <select
                  value={editOutlet.status}
                  onChange={(e) => setEditOutlet({ ...editOutlet, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Active">{translateStatus('Active')}</option>
                  <option value="Inactive">{translateStatus('Inactive')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffCount', 'Staff Count')}</label>
                <input
                  type="number"
                  min="0"
                  value={editOutlet.staffCount}
                  onChange={(e) => setEditOutlet({ ...editOutlet, staffCount: e.target.value })}
                  style={styles.modalInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditOutlet(null)}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('updateOutlet', 'Update Outlet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW OUTLET MODAL */}
      {viewOutlet && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setViewOutlet(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('outletDetails', 'Outlet Details')}
            </h3>
            <p><strong>{t('name', 'Name')}:</strong> {localizeBranchName(viewOutlet.name)}</p>
            <p><strong>{t('code', 'Code')}:</strong> {viewOutlet.code}</p>
            <p><strong>{t('type', 'Type')}:</strong> {t(viewOutlet.type, viewOutlet.type)}</p>
            <p><strong>{t('contact', 'Contact')}:</strong> {viewOutlet.contact}</p>
            <p><strong>{t('status', 'Status')}:</strong> {translateStatus(viewOutlet.status)}</p>
            <p><strong>{t('staffCount', 'Staff Count')}:</strong> {formatNumber(viewOutlet.staffCount)}</p>
          </div>
        </div>
      )}

      {/* DELETE OUTLET CONFIRMATION */}
      {deleteOutletId && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <AlertTriangle style={{ width: '48px', height: '48px', color: '#DC2626', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {t('confirmDelete', 'Confirm Delete')}
            </h3>
            <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 20px 0' }}>
              {t('confirmDeleteOutlet', 'Are you sure you want to delete this outlet?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDeleteOutletId(null)} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  branchService.deleteOutlet(deleteOutletId).then(() => {
                    setOutlets(prev => prev.filter(o => o.id !== deleteOutletId));
                    setDeleteOutletId(null);
                    showToast(t('outletDeletedSuccess', 'Outlet deleted successfully'));
                  }).catch(err => showToast(err?.response?.data?.message || t('failedToDeleteOutlet', 'Failed to delete outlet')));
                }}
                style={{ ...styles.buttonPrimary, backgroundColor: '#DC2626' }}
              >
                {t('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editStaff && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setEditStaff(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('editStaff', 'Edit Staff')}
            </h3>
            <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffName', 'Staff Name')}</label>
                <input
                  type="text"
                  value={editStaff.name}
                  onChange={(e) => handleCharOnlyInput(e, setEditStaff, editStaff, 'name')}
                  onBlur={() => handleTextBlur(setEditStaff, editStaff, 'name')}
                  style={styles.modalInput}
                />
                {errors.name && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('staffCode', 'Staff Code')}</label>
                <input
                  type="text"
                  value={editStaff.code}
                  onChange={(e) => handleUpperAndNumInput(e, setEditStaff, editStaff, 'code')}
                  style={styles.modalInput}
                />
                {errors.code && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.code}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('contactPhone', 'Contact Phone')}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder={t('tenDigitNumber', '10-digit number')}
                  value={editStaff.contact}
                  onChange={(e) => handlePhoneInput(e, setEditStaff, editStaff, 'contact')}
                  style={styles.modalInput}
                />
                {errors.contact && <p style={{ fontSize: '12px', color: '#DC2626', margin: '4px 0 0 0' }}>{errors.contact}</p>}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('role', 'Role')}</label>
                <select
                  value={editStaff.role}
                  onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Manager">{t('Manager', 'Manager')}</option>
                  <option value="Supervisor">{t('Supervisor', 'Supervisor')}</option>
                  <option value="Chef">{t('Chef', 'Chef')}</option>
                  <option value="Cashier">{t('Cashier', 'Cashier')}</option>
                  <option value="Waiter">{t('Waiter', 'Waiter')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('branch', 'Branch')}</label>
                <select
                  value={editStaff.branch}
                  onChange={(e) => setEditStaff({ ...editStaff, branch: e.target.value })}
                  style={styles.modalInput}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>{localizeBranchName(b.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outlet', 'Outlet')}</label>
                <select
                  value={editStaff.outlet}
                  onChange={(e) => setEditStaff({ ...editStaff, outlet: e.target.value })}
                  style={styles.modalInput}
                >
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.name}>{localizeBranchName(outlet.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('outletCode', 'Outlet Code')}</label>
                <input
                  type="text"
                  value={editStaff.outletCode || ''}
                  onChange={(e) => handleUpperAndNumInput(e, setEditStaff, editStaff, 'outletCode')}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#78716C' }}>{t('status', 'Status')}</label>
                <select
                  value={editStaff.status}
                  onChange={(e) => setEditStaff({ ...editStaff, status: e.target.value })}
                  style={styles.modalInput}
                >
                  <option value="Active">{translateStatus('Active')}</option>
                  <option value="Inactive">{translateStatus('Inactive')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditStaff(null)}
                  style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  {t('updateStaff', 'Update Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STAFF MODAL */}
      {viewStaff && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button
              onClick={() => setViewStaff(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#78716C', cursor: 'pointer' }}
              aria-label="Close"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              {t('staffDetails', 'Staff Details')}
            </h3>
            <p><strong>{t('name', 'Name')}:</strong> {localizeGuestName(viewStaff.name)}</p>
            <p><strong>{t('code', 'Code')}:</strong> {viewStaff.code}</p>
            <p><strong>{t('role', 'Role')}:</strong> {t(viewStaff.role, viewStaff.role)}</p>
            <p><strong>{t('branch', 'Branch')}:</strong> {localizeBranchName(viewStaff.branch)}</p>
            <p><strong>{t('outlet', 'Outlet')}:</strong> {localizeBranchName(viewStaff.outlet)}</p>
            <p><strong>{t('outletCode', 'Outlet Code')}:</strong> {viewStaff.outletCode || 'OUT001'}</p>
            <p><strong>{t('contact', 'Contact')}:</strong> {viewStaff.contact}</p>
            <p><strong>{t('status', 'Status')}:</strong> {translateStatus(viewStaff.status)}</p>
          </div>
        </div>
      )}

      {/* DELETE STAFF CONFIRMATION */}
      {deleteStaffId && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: 'center' }}>
            <AlertTriangle style={{ width: '48px', height: '48px', color: '#DC2626', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {t('confirmDelete', 'Confirm Delete')}
            </h3>
            <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 20px 0' }}>
              {t('confirmDeleteStaff', 'Are you sure you want to delete this staff member?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDeleteStaffId(null)} style={{ ...styles.buttonPrimary, backgroundColor: '#57534E' }}>
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={async () => {
                  try {
                    await staffService.deleteStaff(Number(deleteStaffId));
                    setStaff(prev => prev.filter(s => s.id !== deleteStaffId));
                    setDeleteStaffId(null);
                    showToast(t('staffDeletedSuccess', 'Staff member deleted successfully'));
                  } catch (err) {
                    showToast(err?.response?.data?.message || err?.userFriendlyMessage || t('unableToDeleteStaff', 'Unable to delete staff'));
                  }
                }}
                style={{ ...styles.buttonPrimary, backgroundColor: '#DC2626' }}
              >
                {t('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
