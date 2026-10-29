import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBranch } from '../context/BranchContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedMenuItemName } from '../locales/nameLocalization';
import { supplierService } from '../services/supplierService';
import { purchaseService } from '../services/purchaseService';
import { inventoryService } from '../services/inventoryService';
import { taxCalculationService } from '../services/taxCalculationService';
import notificationService from '../services/notificationService';
import { LocalizedDatePicker } from '../common/LocalizedDatePicker';
import { dialogService } from '../context/DialogContext';
import {
  Users, ShoppingCart, PackageCheck, FileText,
  RotateCcw, CreditCard, Receipt, BarChart3,
  Calendar, Bell, Edit2, Eye, Trash2, Search, ArrowLeft, X, Settings, HelpCircle,
  Printer, MessageSquare, Plus, ArrowRight, Check, AlertCircle, CheckCircle2, ChevronRight,
  Download, Upload, Sparkles, RefreshCw, FileImage, ClipboardList, Camera,
  Save
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { recognizeItemsFromImage } from '../services/receiptOcrService';

export function PurchaseDashboard() {
  const { selectedBranchId, branches } = useBranch();
  const { t, translateStatus, formatDate, currentLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '2026-09-11', endDate: '2026-10-12' });
  // Navbar date filter synchronization
  useEffect(() => {
    const handleNavDate = (e) => {
      const { startDate, endDate } = e.detail || {};
      if (startDate) {
        setDateRange({ startDate, endDate: endDate || startDate });
      }
    };
    const s = localStorage.getItem('navbar_start_date');
    const e = localStorage.getItem('navbar_end_date');
    if (s) {
      setDateRange({ startDate: s, endDate: e || s });
    }
    window.addEventListener('navbar-date-filter-changed', handleNavDate);
    return () => window.removeEventListener('navbar-date-filter-changed', handleNavDate);
  }, []);


  // Context transfer between tabs (e.g. PO -> GRN -> Invoice)
  const [activePoForGrn, setActivePoForGrn] = useState(null);
  const [activeGrnForInvoice, setActiveGrnForInvoice] = useState(null);
  const [activeInvoiceForReturn, setActiveInvoiceForReturn] = useState(null);
  const [viewingReceiptPo, setViewingReceiptPo] = useState(null);

  // Core Data loaded from SQL Server
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [stockProducts, setStockProducts] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPurchaseData = () => {
    supplierService.getSuppliers().then(res => {
      if (res && res.length > 0) {
        setSuppliers(res.map(s => ({
          id: s.id,
          name: s.company || s.name,
          contact: s.name,
          phone: s.phone || 'N/A',
          gstNumber: s.gstNumber || '',
          email: s.email || '',
          address: s.address || '',
          status: s.status === 'ACTIVE' ? 'Active' : 'Inactive',
        })));
      }
    }).catch(e => console.warn('Failed to fetch suppliers', e));

    purchaseService.getPurchaseOrders(selectedBranchId).then(res => {
      if (res && Array.isArray(res)) setPurchaseOrders(res);
      else setPurchaseOrders([]);
    }).catch(e => console.warn('Failed to fetch purchase orders', e));

    purchaseService.getGoodsReceipts().then(res => {
      if (res && Array.isArray(res)) setGoodsReceipts(res);
      else setGoodsReceipts([]);
    }).catch(e => console.warn('Failed to fetch goods receipts', e));

    purchaseService.getPurchaseInvoices().then(res => {
      if (res && Array.isArray(res)) setPurchaseInvoices(res);
      else setPurchaseInvoices([]);
    }).catch(e => console.warn('Failed to fetch purchase invoices', e));

    purchaseService.getPurchaseReturns().then(res => {
      if (res && Array.isArray(res)) setPurchaseReturns(res);
      else setPurchaseReturns([]);
    }).catch(e => console.warn('Failed to fetch purchase returns', e));

    purchaseService.getSupplierPayments().then(res => {
      if (res && Array.isArray(res)) setSupplierPayments(res);
      else setSupplierPayments([]);
    }).catch(e => console.warn('Failed to fetch supplier payments', e));

    inventoryService.getProducts(selectedBranchId || 1).then(res => {
      if (res && Array.isArray(res)) setStockProducts(res);
      else setStockProducts([]);
    }).catch(e => console.warn('Failed to fetch stock products', e));
  };

  const fetchNotifications = () => {
    notificationService.getNotifications().then(res => {
      if (res && Array.isArray(res)) {
        setNotifications(res);
        setUnreadCount(res.filter(n => !n.read).length);
      }
    }).catch(e => console.warn('Failed to fetch notifications', e));
  };

  useEffect(() => {
    fetchPurchaseData();
    fetchNotifications();
  }, [selectedBranchId]);

  const tabNameMap = {
    dashboard: t('dashboard', 'Dashboard'),
    supplier: t('supplierManagement', 'Supplier Management'),
    po: t('purchaseOrders', 'Purchase Orders'),
    grn: t('goodsReceipt', 'Goods Receipt (GRN)'),
    invoice: t('purchaseInvoice', 'Purchase Invoice'),
    return: t('purchaseReturn', 'Purchase Return'),
    payment: t('paymentManagement', 'Payment Management'),
    'record-payment': t('recordPayment', 'Record Payment'),
    reports: t('purchaseReports', 'Purchase Reports')
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    return formatDate(dateStr, { showDayOfWeek: false });
  };

  return (
    <div style={{ padding: '6px 0 24px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header - Matches Reference Image */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {t('purchaseDashboard', 'Purchase Dashboard')}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {t('purchases', 'Purchase')} &gt; {tabNameMap[activeTab] || activeTab.toUpperCase()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          {/* Orange Pill Date Badge matching reference screenshot */}
          <button
            onClick={() => setShowDatePicker(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#ea580c',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
            }}
          >
            <span>{formatDateLabel(dateRange.startDate)} - {formatDateLabel(dateRange.endDate)}</span>
          </button>

          {showDatePicker && (
            <div style={{ position: 'absolute', top: 48, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 10px 25px -3px rgba(0,0,0,.15)', zIndex: 100, width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t('filterDateRange', 'Filter Date Range')}</span>
                <button onClick={() => setShowDatePicker(false)} style={{ border: 0, background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', marginBottom: 2 }}>{t('from', 'From:')}</label>
                  <input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', marginBottom: 2 }}>{t('to', 'To:')}</label>
                  <input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                </div>
                <button onClick={() => setShowDatePicker(false)} style={{ marginTop: 8, backgroundColor: '#ea580c', color: '#fff', border: 0, padding: 8, borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>{t('applyFilter', 'Apply Filter')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Views */}
      {activeTab === 'dashboard' && (
        <DashboardView
          setActiveTab={setActiveTab}
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
          purchaseInvoices={purchaseInvoices}
          purchaseReturns={purchaseReturns}
          supplierPayments={supplierPayments}
          suppliers={suppliers}
          stockProducts={stockProducts}
          onSelectPoForGrn={(po) => {
            setActivePoForGrn(po);
            setActiveTab('grn');
          }}
        />
      )}

      {activeTab === 'supplier' && (
        <SupplierManagementView
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
        />
      )}

      {activeTab === 'po' && (
        <PurchaseOrderView
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          setActiveTab={setActiveTab}
          purchaseOrders={purchaseOrders}
          setPurchaseOrders={setPurchaseOrders}
          purchaseInvoices={purchaseInvoices}
          onRefresh={fetchPurchaseData}
          onReceiveGoods={(po) => {
            setActivePoForGrn(po);
            setActiveTab('grn');
          }}
          onViewPoReceipt={(po) => setViewingReceiptPo(po)}
          branch={branches?.find(b => b.id === selectedBranchId) || { name: 'Royal Palace Hotel', code: 'BR-01', contactPhone: '020-25678900', address: 'Main Road' }}
        />
      )}

      {activeTab === 'grn' && (
        <GoodsReceiptView
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
          preSelectedPo={activePoForGrn}
          onGenerateInvoice={(grn) => {
            setActiveGrnForInvoice(grn);
            setActiveTab('invoice');
          }}
        />
      )}

      {activeTab === 'invoice' && (
        <PurchaseInvoiceView
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
          purchaseInvoices={purchaseInvoices}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
          preSelectedGrn={activeGrnForInvoice}
          onCreateReturn={(inv) => {
            setActiveInvoiceForReturn(inv);
            setActiveTab('return');
          }}
        />
      )}

      {activeTab === 'return' && (
        <PurchaseReturnView
          suppliers={suppliers}
          purchaseInvoices={purchaseInvoices}
          purchaseOrders={purchaseOrders}
          purchaseReturns={purchaseReturns}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
          preSelectedInvoice={activeInvoiceForReturn}
        />
      )}

      {activeTab === 'payment' && (
        <PaymentManagementView
          suppliers={suppliers}
          purchaseInvoices={purchaseInvoices}
          supplierPayments={supplierPayments}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
        />
      )}

      {activeTab === 'record-payment' && (
        <RecordPaymentView
          suppliers={suppliers}
          purchaseInvoices={purchaseInvoices}
          setActiveTab={setActiveTab}
          onRefresh={fetchPurchaseData}
        />
      )}

      {activeTab === 'reports' && (
        <PurchaseReportsView
          setActiveTab={setActiveTab}
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
          purchaseInvoices={purchaseInvoices}
          purchaseReturns={purchaseReturns}
          supplierPayments={supplierPayments}
          suppliers={suppliers}
          stockProducts={stockProducts}
          onViewPoReceipt={(po) => setViewingReceiptPo(po)}
        />
      )}

      {viewingReceiptPo && (
        <PoReceiptModal
          po={viewingReceiptPo}
          supplier={
            viewingReceiptPo.supplier ||
            suppliers.find(s =>
              (s.id && viewingReceiptPo.supplierId && String(s.id) === String(viewingReceiptPo.supplierId)) ||
              (s.company && viewingReceiptPo.supplierName && s.company.trim().toLowerCase() === viewingReceiptPo.supplierName.trim().toLowerCase()) ||
              (s.name && viewingReceiptPo.supplierName && s.name.trim().toLowerCase() === viewingReceiptPo.supplierName.trim().toLowerCase())
            )
          }
          branch={branches?.find(b => b.id === selectedBranchId) || { name: 'Royal Palace Hotel', code: 'BR-01', contactPhone: '020-25678900', address: 'Main Road' }}
          onClose={() => setViewingReceiptPo(null)}
        />
      )}
    </div>
  );
}

// =========================================================================
// SHARED STYLES
// =========================================================================
const backBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer'
};

const inputStyle = (error) => ({
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff'
});

const primaryBtn = {
  backgroundColor: '#6366f1',
  color: '#fff',
  border: 0,
  padding: '8px 18px',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
};

const secondaryBtn = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '8px 18px',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer'
};

const sectionBadge = {
  display: 'inline-block',
  backgroundColor: '#6366f1',
  color: '#fff',
  padding: '6px 16px',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14
};

const subHeading = {
  fontSize: 14,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 12
};

const td = {
  padding: '10px 12px'
};

const tableInput = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box'
};

// =========================================================================
// 1. DASHBOARD VIEW - PRECISELY REPRODUCES REFERENCE IMAGE
// =========================================================================
function DashboardView({
  setActiveTab,
  purchaseOrders = [],
  goodsReceipts = [],
  purchaseInvoices = [],
  purchaseReturns = [],
  supplierPayments = [],
  suppliers = [],
  stockProducts = [],
  onSelectPoForGrn
}) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();

  const totalInvoiceAmt = purchaseInvoices.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalPoAmt = purchaseOrders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalPurchase = totalInvoiceAmt > 0 ? totalInvoiceAmt : totalPoAmt;

  const pendingOrders = purchaseOrders.filter(p => !p.status || p.status === 'PENDING' || p.status === 'ORDERED').length;
  const receiptsPending = purchaseOrders.filter(p => p.status !== 'RECEIVED' && p.status !== 'COMPLETED').length;
  const recentPOs = purchaseOrders.slice(0, 5);

  // 4 Top Stat Cards matching screenshot
  const cards = [
    {
      label: t('totalPurchase', 'Total Purchase'),
      value: formatNumber(totalPurchase, { asCurrency: true, decimals: 2 }),
      bg: '#f3e8ff',
      color: '#9333ea',
      Icon: FileText,
      targetTab: 'reports'
    },
    {
      label: t('pendingOrders', 'Pending Orders'),
      value: toDevanagari(pendingOrders),
      bg: '#fef3c7',
      color: '#d97706',
      Icon: ShoppingCart,
      targetTab: 'po'
    },
    {
      label: t('receiptsPending', 'Receipts Pending'),
      value: toDevanagari(receiptsPending),
      bg: '#e0f2fe',
      color: '#0284c7',
      Icon: PackageCheck,
      targetTab: 'grn'
    },
    {
      label: t('totalSuppliers', 'Total Suppliers'),
      value: toDevanagari(suppliers.length),
      bg: '#dcfce7',
      color: '#16a34a',
      Icon: Users,
      targetTab: 'supplier'
    },
  ];

  // 3 Quick Actions matching screenshot exactly
  const quickActions = [
    {
      id: 'supplier',
      label: t('supplierManagement', 'Supplier Management'),
      icon: Users,
      color: '#9333ea',
      bg: '#faf5ff',
      border: '#f3e8ff'
    },
    {
      id: 'po',
      label: t('purchaseOrder', 'Purchase Order'),
      icon: ShoppingCart,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#dbeafe'
    },
    {
      id: 'reports',
      label: t('purchaseReports', 'Purchase Reports'),
      icon: BarChart3,
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ede9fe'
    },
  ];

  // Suppliers for donut chart
  const topSuppliersList = suppliers.slice(0, 4);
  const supplierColors = ['#10b981', '#f97316', '#ef4444', '#6366f1'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {cards.map(({ label, value, bg, color, Icon, targetTab }) => (
          <div
            key={label}
            onClick={() => setActiveTab(targetTab)}
            style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0', color: '#0f172a' }}>{value}</h2>
            </div>
            <div style={{ width: 42, height: 42, backgroundColor: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Recent POs (Left) + Top Suppliers (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 20 }}>
        {/* Left: Recent Purchase Orders Table */}
        <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {t('recentPurchaseOrders', 'Recent Purchase Orders')}
            </h3>
            {/* Orange pill button matching screenshot */}
            <button
              onClick={() => setActiveTab('po')}
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                border: 0,
                borderRadius: 9999,
                padding: '4px 14px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(234, 88, 12, 0.2)'
              }}
            >
              {t('viewAll', 'View All')}
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 11, borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 12px' }}>{t('poNo', 'PO No.')}</th>
                <th style={{ padding: '8px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '8px 12px' }}>{t('orderDate', 'Order Date')}</th>
                <th style={{ padding: '8px 12px' }}>{t('amount', 'Amount')}</th>
                <th style={{ padding: '8px 12px' }}>{t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 12, color: '#334155' }}>
              {recentPOs.length > 0 ? (
                recentPOs.map((po, idx) => {
                  const isHighlighted = idx === 1; // Tinted row matching screenshot visual
                  return (
                    <tr
                      key={po.id || po.poNumber}
                      onClick={() => onSelectPoForGrn(po)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isHighlighted ? 'rgba(254, 243, 199, 0.35)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{po.poNumber || `PO-${po.id}`}</td>
                      <td style={{ padding: '8px 12px' }}>{t(po.supplierName, po.supplierName || 'Supplier')}</td>
                      <td style={{ padding: '8px 12px' }}>{formatDate(po.poDate || (po.createdAt ? po.createdAt.split('T')[0] : '2026-10-09'), { showDayOfWeek: false })}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatNumber(Number(po.totalAmount) || 0, { asCurrency: true, decimals: 0 })}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          backgroundColor:
                            po.status === 'RECEIVED' || po.status === 'COMPLETED' ? '#dcfce7' :
                            po.status === 'ORDERED' ? '#dbeafe' :
                            po.status === 'PARTIALLY_RECEIVED' ? '#fef3c7' :
                            po.status === 'CANCELLED' ? '#fee2e2' : '#eff6ff',
                          color:
                            po.status === 'RECEIVED' || po.status === 'COMPLETED' ? '#15803d' :
                            po.status === 'ORDERED' ? '#1d4ed8' :
                            po.status === 'PARTIALLY_RECEIVED' ? '#b45309' :
                            po.status === 'CANCELLED' ? '#dc2626' : '#2563eb',
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 600
                        }}>
                          {translateStatus(po.status || 'ORDERED')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('noPoFound', 'No purchase orders yet. Create one in Purchase Orders.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Top Suppliers Card with Donut Chart */}
        <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
            {t('topSuppliers', 'Top Suppliers')}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            {/* SVG Donut Chart ring matching screenshot */}
            <div style={{ width: 88, height: 88, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* 4 Segments */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-25" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-50" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-75" />
              </svg>
            </div>

            {/* Suppliers Legend List with 'Active' status on the right */}
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginLeft: 24 }}>
              {topSuppliersList.length > 0 ? (
                topSuppliersList.map((s, idx) => (
                  <div key={s.id || s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: supplierColors[idx % supplierColors.length], fontSize: 14 }}>●</span>
                      <span style={{ color: '#334155', fontWeight: 500 }}>{t(s.name, s.name)}</span>
                    </div>
                    <strong style={{ color: '#16a34a', fontSize: 12 }}>{t('active', 'Active')}</strong>
                  </div>
                ))
              ) : (
                <div style={{ color: '#94a3b8' }}>{t('noSuppliersFound', 'No suppliers registered.')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions Card with 3 buttons matching screenshot */}
      <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
          {t('quickActions', 'Quick Actions')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => setActiveTab(action.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 12,
                backgroundColor: action.bg,
                border: `1px solid ${action.border}`,
                color: action.color,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <action.icon size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. SUPPLIER MANAGEMENT VIEW
// =========================================================================
export function SupplierManagementView({ suppliers, setSuppliers, setActiveTab, onRefresh }) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ name: '', contact: '', phone: '', address: '', gstNumber: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || '').includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setFormData({ name: '', contact: '', phone: '', address: '', gstNumber: '', status: 'Active' });
    setErrors({});
    setActiveModal('add');
  };

  const handleOpenEdit = supplier => {
    setSelectedSupplier(supplier);
    setFormData({ name: '', contact: '', phone: '', address: '', gstNumber: '', status: 'Active', ...supplier });
    setErrors({});
    setActiveModal('edit');
  };

  const handleOpenView = supplier => {
    setSelectedSupplier(supplier);
    setActiveModal('view');
  };

  const handleOpenDelete = supplier => {
    setSupplierToDelete(supplier);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      if (supplierToDelete.id) {
        await supplierService.deleteSupplier(supplierToDelete.id);
      }
      setSuppliers(suppliers.filter(s => s.id !== supplierToDelete.id));
      setShowDeleteModal(false);
      setSupplierToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      dialogService.alert({
        title: 'Supplier Deletion Failed',
        message: 'Failed to delete supplier from backend: ' + (err?.response?.data?.message || err.message || 'Error'),
        type: 'error',
      });
    }
  };

  const handleSaveFormSubmit = e => {
    e.preventDefault();
    const newErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedContact = formData.contact.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName) newErrors.name = 'Supplier Name is required';
    if (!trimmedContact) newErrors.contact = 'Contact Person is required';
    if (!trimmedPhone) {
      newErrors.phone = 'Phone Number is required';
    } else if (!trimmedPhone.startsWith('6') && !trimmedPhone.startsWith('7') && !trimmedPhone.startsWith('8') && !trimmedPhone.startsWith('9')) {
      newErrors.phone = 'Phone number must start with 6, 7, 8, or 9';
    } else if (trimmedPhone.length !== 10) {
      newErrors.phone = 'Phone Number must be exactly 10 digits';
    }

    if (formData.gstNumber && formData.gstNumber.trim()) {
      const gstinVal = validateGstin(formData.gstNumber);
      if (!gstinVal.isValid) {
        newErrors.gstNumber = gstinVal.message;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setShowSaveConfirmModal(true);
  };

  const confirmSaveAndContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const finalData = {
      ...formData,
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      phone: formData.phone.trim(),
      address: (formData.address || '').trim(),
      gstNumber: (formData.gstNumber || '').trim().toUpperCase()
    };

    try {
      if (activeModal === 'add') {
        const payload = {
          name: finalData.contact || finalData.name,
          company: finalData.name,
          phone: finalData.phone,
          email: finalData.email || '',
          address: finalData.address || '',
          gstNumber: finalData.gstNumber || '',
          status: 'ACTIVE'
        };
        const created = await supplierService.createSupplier(payload);
        setSuppliers([...suppliers, {
          id: created.id || Date.now(),
          name: created.company || created.name,
          company: created.company || created.name,
          contact: created.name,
          phone: created.phone || 'N/A',
          address: created.address || finalData.address || '',
          gstNumber: created.gstNumber || finalData.gstNumber || '',
          status: created.status === 'ACTIVE' ? 'Active' : 'Inactive',
          ...finalData
        }]);
      } else if (activeModal === 'edit' && selectedSupplier) {
        if (selectedSupplier.id) {
          await supplierService.updateSupplier(selectedSupplier.id, {
            name: finalData.contact || finalData.name,
            company: finalData.name,
            phone: finalData.phone,
            email: finalData.email || '',
            address: finalData.address || '',
            gstNumber: finalData.gstNumber || '',
            status: 'ACTIVE'
          });
        }
        setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? { ...s, ...finalData } : s));
      }

      setShowSaveConfirmModal(false);
      setActiveModal(null);
      setSelectedSupplier(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      dialogService.alert({
        title: 'Save Supplier Failed',
        message: 'Failed to save supplier to backend: ' + (err?.response?.data?.message || err.message || 'Error'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={sectionBadge}>
          1. {t('supplierManagement', 'Supplier Management')}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('suppliers', 'Suppliers')}</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', backgroundColor: '#fff', width: 220 }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder={t('searchSupplier', 'Search supplier...')}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 0, background: 'transparent', outline: 0, paddingLeft: 8, fontSize: 13, width: '100%' }}
            />
          </div>
          <button onClick={handleOpenAdd} style={{ backgroundColor: '#6366f1', color: '#fff', border: 0, borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + {t('addSupplier', 'Add Supplier')}
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px 16px' }}>{t('supplierName', 'Supplier Name')}</th>
            <th style={{ padding: '12px 16px' }}>{t('contactPerson', 'Contact Person')}</th>
            <th style={{ padding: '12px 16px' }}>{t('phone', 'Phone')}</th>
            <th style={{ padding: '12px 16px' }}>{t('supplierGstin', 'GSTIN')}</th>
            <th style={{ padding: '12px 16px' }}>{t('status', 'Status')}</th>
            <th style={{ padding: '12px 16px' }}>{t('action', 'Action')}</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: 13, color: '#334155' }}>
          {filteredSuppliers.map(sup => (
            <tr key={sup.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 16px', fontWeight: 500 }}>{sup.name}</td>
              <td style={{ padding: '12px 16px' }}>{sup.contact}</td>
              <td style={{ padding: '12px 16px' }}>{sup.phone}</td>
              <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                {maskGstin(sup.gstNumber) || '-'}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  backgroundColor: sup.status === 'Active' ? '#e6f4ea' : '#fef3c7',
                  color: sup.status === 'Active' ? '#1e7e34' : '#d97706',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {sup.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button title="View" onClick={() => handleOpenView(sup)} style={{ border: 0, background: '#eff6ff', padding: 6, borderRadius: 6, cursor: 'pointer', color: '#3b82f6' }}><Eye size={14} /></button>
                  <button title="Edit" onClick={() => handleOpenEdit(sup)} style={{ border: 0, background: '#eff6ff', padding: 6, borderRadius: 6, cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={14} /></button>
                  <button title="Delete" onClick={() => handleOpenDelete(sup)} style={{ border: 0, background: '#fef2f2', padding: 6, borderRadius: 6, cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
          {!filteredSuppliers.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>{t('noSuppliersFound', 'No suppliers found.')}</td></tr>}
        </tbody>
      </table>

      {(activeModal === 'add' || activeModal === 'edit') && (
        <ModalOverlay zIndex={50}>
          <div style={{ backgroundColor: '#fff', borderRadius: 14, width: 480, padding: 24, boxShadow: '0 20px 25px 5px rgba(0,0,0,.1)' }}>
            <ModalHeader title={activeModal === 'add' ? t('addSupplier', 'Add Supplier') : t('editSupplier', 'Edit Supplier')} onClose={() => setActiveModal(null)} />
            <form onSubmit={handleSaveFormSubmit}>
              <Field label={`${t('supplierName', 'Supplier Name')} *`} error={errors.name}>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle(errors.name)} />
              </Field>
              <Field label={`${t('contactPerson', 'Contact Person')} *`} error={errors.contact}>
                <input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} style={inputStyle(errors.contact)} />
              </Field>
              <Field label={`${t('phone', 'Phone Number')} *`} error={errors.phone}>
                <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} placeholder="10-digit phone" style={inputStyle(errors.phone)} />
              </Field>
              <Field label={t('supplierAddress', 'Supplier Address / Location')}>
                <input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="e.g. Shop No. 5, Market Yard, Pune - 411037" style={inputStyle()} />
              </Field>
              <Field label={`${t('supplierGstin', 'Supplier GSTIN')} (Optional - 15 chars)`} error={errors.gstNumber}>
                <input
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })}
                  maxLength={15}
                  placeholder="27AAAAA1111A1Z5"
                  style={inputStyle(errors.gstNumber)}
                />
                {formData.gstNumber && formData.gstNumber.length === 15 && (
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 700, fontFamily: 'monospace' }}>
                    ✓ Masked Output: {maskGstin(formData.gstNumber)}
                  </div>
                )}
              </Field>
              <Field label={t('status', 'Status')}>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle()}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="submit" disabled={isSubmitting} style={primaryBtn}>{t('saveSupplier', 'Save Supplier')}</button>
                <button type="button" onClick={() => setActiveModal(null)} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {activeModal === 'view' && selectedSupplier && (
        <ModalOverlay zIndex={50}>
          <div style={{ backgroundColor: '#fff', borderRadius: 14, width: 400, padding: 24 }}>
            <ModalHeader title={t('supplierDetails', 'Supplier Details')} onClose={() => setActiveModal(null)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#334155' }}>
              <div><strong>{t('supplierName', 'Supplier Name')}:</strong> {selectedSupplier.company || selectedSupplier.name}</div>
              <div><strong>{t('contactPerson', 'Contact Person')}:</strong> {selectedSupplier.contact}</div>
              <div><strong>{t('phone', 'Phone Number')}:</strong> {selectedSupplier.phone}</div>
              <div><strong>{t('supplierAddress', 'Address')}:</strong> {selectedSupplier.address || 'N/A'}</div>
              <div><strong>{t('supplierGstin', 'GSTIN')}:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{maskGstin(selectedSupplier.gstNumber) || 'N/A'}</span></div>
              <div><strong>{t('status', 'Status')}:</strong> {selectedSupplier.status}</div>
            </div>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setActiveModal(null)} style={primaryBtn}>{t('close', 'Close')}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {showSaveConfirmModal && (
        <ModalOverlay zIndex={100}>
          <WindowsModal onSave={confirmSaveAndContinue} onDontSave={() => { setShowSaveConfirmModal(false); setActiveModal(null); }} onCancel={() => setShowSaveConfirmModal(false)} />
        </ModalOverlay>
      )}

      {showDeleteModal && (
        <ModalOverlay zIndex={100}>
          <DeleteConfirm onCancel={() => setShowDeleteModal(false)} onConfirm={confirmDelete} />
        </ModalOverlay>
      )}
    </div>
  );
}

// =========================================================================
// SHARED PURCHASE RECEIPT & WHATSAPP FORMATTING HELPERS
// =========================================================================

// GSTIN Validation & Privacy Masking (Format: 27XXXXXXXXXX1Z5)
// First 2 digits = state code, next 10 = PAN, last 3 = entity codes
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin) {
  if (!gstin) return { isValid: true, message: '' };
  const trimmed = String(gstin).trim().toUpperCase();
  if (!trimmed || trimmed === 'N/A' || trimmed === '-') return { isValid: true, message: '' };
  if (trimmed.length !== 15) {
    return {
      isValid: false,
      message: 'GST number must have 15 characters (e.g. 27AAAAA1111A1Z5).'
    };
  }
  if (!GSTIN_REGEX.test(trimmed)) {
    return {
      isValid: false,
      message: 'Invalid GST format (e.g. 27AAAAA1111A1Z5): 2-digit state code + 10-char PAN + 3-char entity code.'
    };
  }
  return { isValid: true, message: '' };
}

export function maskGstin(gstin) {
  if (!gstin) return '';
  const trimmed = String(gstin).trim().toUpperCase();
  if (trimmed.length !== 15 || trimmed === 'N/A' || trimmed === '-') return gstin;
  // Mask middle 10 characters (the PAN), leaving state code and ending visible: 27XXXXXXXXXX1Z5
  return `${trimmed.slice(0, 2)}XXXXXXXXXX${trimmed.slice(12)}`;
}

// Helper: Convert Number to Indian Words
export function numberToWordsIndian(amount) {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  let words = inWords(num).trim();
  let result = words ? 'Rupees ' + words : '';
  if (paise > 0) {
    result += (result ? ' and ' : 'Rupees ') + inWords(paise) + ' Paise';
  }
  return (result + ' Only').replace(/\s+/g, ' ');
}

// Helper: Resolve dynamic business details
export function getBusinessDetails(branch) {
  let business = null;
  let user = null;
  let billingConfig = null;
  try {
    const b = localStorage.getItem('ajalkar_business');
    if (b) business = JSON.parse(b);
  } catch {}
  try {
    const u = localStorage.getItem('ajalkar_user');
    if (u) user = JSON.parse(u);
  } catch {}
  try {
    const bc = localStorage.getItem('ajalkar_billing_config');
    if (bc) billingConfig = JSON.parse(bc);
  } catch {}

  const hotelName =
    localStorage.getItem('billing_hotel_name') ||
    billingConfig?.hotelName ||
    billingConfig?.name ||
    business?.name ||
    user?.businessName ||
    (branch?.name && branch.name !== 'Main Branch' && branch.name !== 'Hotel Ajalkar' ? branch.name : null) ||
    'Royal Palace Hotel';

  const hotelAddress =
    localStorage.getItem('billing_address') ||
    billingConfig?.address ||
    business?.address ||
    (branch?.address && branch.address !== 'Station Road' && branch.address !== 'Hotel Premises' ? branch.address : null) ||
    'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028';

  const hotelPhone =
    localStorage.getItem('billing_phone') ||
    billingConfig?.phone ||
    billingConfig?.contactPhone ||
    billingConfig?.contactNumber ||
    business?.phone ||
    business?.contactNumber ||
    user?.phone ||
    user?.mobile ||
    branch?.contactPhone ||
    branch?.phone ||
    '';

  const hotelGst =
    localStorage.getItem('billing_gstin') ||
    billingConfig?.gstin ||
    business?.gstNumber ||
    branch?.gstNumber ||
    '27AAKCA1234F1Z5';

  return { hotelName, hotelAddress, hotelPhone, hotelGst };
}

// Helper: Format WhatsApp link with phone validation
export function formatWhatsAppUrl(phone, encodedMsg) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    return `https://wa.me/91${cleanPhone}?text=${encodedMsg}`;
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  } else if (cleanPhone.length > 6) {
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}

// Helper: Format Purchase Order / Receipt WhatsApp message as the standard acceptance request cover note
export function formatPoReceiptForWhatsApp(data) {
  const { hotelName: defaultHotelName, hotelPhone: defaultHotelPhone } = getBusinessDetails(data?.branch);

  const activeHotelName = data?.hotelName || defaultHotelName || 'Hotel Management';
  const activePhone = data?.hotelPhone || defaultHotelPhone || '';
  const supPhone = (data?.displayContact || data?.supplierPhone || data?.supplier?.phone || '').replace(/[^0-9]/g, '');

  const lines = [
    'Kindly review the order details and confirm your acceptance. Please arrange delivery as per the agreed schedule.',
    '',
    'If you have any questions or need clarification, please feel free to contact us.',
    '',
    'Thank you for your support and cooperation!',
    '',
    'Best Regards,',
    activeHotelName,
    activePhone
  ].filter(line => line !== null && line !== undefined && line !== '').join('\n');

  return {
    message: lines,
    phone: supPhone
  };
}

// Helper: Generate structured printable HTML for PDF generation
export function generateReceiptPrintableInnerHtml(data) {
  const { hotelName, hotelAddress, hotelGst } = getBusinessDetails(data.branch);

  const receiptNo = data.receiptNo || (data.poNumber ? data.poNumber.replace('PO-', 'PR-') : (data.id ? `PR-2026-${String(data.id).padStart(5, '0')}` : 'PR-689524'));
  const supplierRef = data.supplierRef || data.poNumber || (data.id ? `PO-2026-${String(data.id).padStart(4, '0')}` : 'PO-689524');
  const dateStr = data.receiptDateStr || data.poDate || new Date().toISOString().split('T')[0];
  const supName = data.supName || data.supplierName || data.supplier?.company || data.supplier?.name || 'Balaji Traders';
  const displayAddress = data.displayAddress || data.supplierAddress || data.supplier?.address || '-';
  const displayGst = maskGstin(data.displayGst || data.supplierGst || data.supplier?.gstNumber) || '-';
  const displayContact = data.displayContact || data.supplierPhone || data.supplier?.phone || '-';
  const transactionType = data.transactionType || 'Purchase Receipt';
  const paymentMode = data.paymentMode || 'Bank Transfer';
  const bankName = data.bankName || (paymentMode === 'Cash' ? '-' : 'HDFC Bank');
  const transactionId = data.transactionId || 'NEFT123456789';
  const paymentDate = data.paymentDate || dateStr;

  const rawItems = (data.calculatedItems && data.calculatedItems.length > 0)
    ? data.calculatedItems
    : (data.items && data.items.length > 0)
      ? data.items
      : [
          { name: 'Rice (Premium Quality)', hsn: '100630', qty: 50, unit: 'Kg', rate: 40, amount: 2000 },
          { name: 'Toor Dal', hsn: '100640', qty: 20, unit: 'Kg', rate: 120, amount: 2400 },
          { name: 'Cooking Oil (Sunflower)', hsn: '151219', qty: 10, unit: 'Ltr', rate: 160, amount: 1600 },
          { name: 'Wheat Flour (Atta)', hsn: '110100', qty: 30, unit: 'Kg', rate: 32, amount: 960 },
          { name: 'Masala Mix', hsn: '090422', qty: 5, unit: 'Kg', rate: 280, amount: 1400 },
        ];

  let calcSub = 0;
  const validItems = rawItems.filter(it => (it.name || it.itemName || '').trim()).map((it, idx) => {
    const name = (it.name || it.itemName || '').trim();
    const hsn = it.hsnCode || it.hsn || it.sacCode || (100630 + idx * 10).toString();
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unit = it.unit || 'Kg';
    const rate = Number(it.unitPrice ?? it.rate ?? 0);
    const amount = Number(it.amount ?? (qty * rate));
    calcSub += amount;
    return { name, hsn, qty, unit, rate, amount };
  });

  const sub = Number(data.subTotal !== undefined && data.subTotal !== null ? data.subTotal : (data.subtotal !== undefined ? data.subtotal : calcSub));
  const cgst = Number(data.cgstAmt !== undefined ? data.cgstAmt : Math.round(sub * 0.025 * 100) / 100);
  const sgst = Number(data.sgstAmt !== undefined ? data.sgstAmt : Math.round(sub * 0.025 * 100) / 100);
  const total = Number(data.grandTotal !== undefined && data.grandTotal !== null ? data.grandTotal : (data.totalAmount !== undefined ? data.totalAmount : (sub + cgst + sgst)));
  const words = data.amountInWords || numberToWordsIndian(total);
  const tagline = data.tagline || 'Good Food  |  Happy People';
  const dAddress = data.hotelAddress || hotelAddress || 'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028, Maharashtra, India';
  const dGst = data.hotelGst || hotelGst || '27AAKCA1234F1Z5';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; background: #ffffff; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <svg style="width: 48px; height: 48px; color: #1e40af;" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 20C9 20 6 22.5 6 26C6 29 8 31.5 11 32V38C11 39.1 11.9 40 13 40H35C36.1 40 37 39.1 37 38V32C40 31.5 42 29 42 26C42 22.5 39 20 36 20C35.5 20 35 20.1 34.5 20.3C33.5 14 29 9 23 9C18 9 13.8 12.8 12.5 17.5C12.3 17.5 12.2 17.5 12 17.5" stroke="#1e40af" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 26V35M20 25V35M24 24V35M28 25V35M32 26V35" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
            <path d="M11 40H37" stroke="#1e40af" stroke-width="2.8" stroke-linecap="round"/>
          </svg>
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0;">${hotelName}</h1>
            <div style="font-size: 11px; color: #2563eb; font-weight: 600; margin: 2px 0 4px;">${tagline}</div>
            <div style="font-size: 10px; color: #475569; line-height: 1.4; max-width: 380px;">${dAddress}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; margin-top: 3px;">GSTIN : ${dGst}</div>
          </div>
        </div>

        <div>
          <div style="background-color: #1e40af; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 1px; text-align: center; padding: 8px 24px; border-radius: 6px;">PURCHASE RECEIPT</div>
          <table style="margin-top: 10px; font-size: 11px; border-collapse: collapse; width: 230px;">
            <tr>
              <td style="color: #334155; font-weight: 600; padding: 2px 0;">Receipt No</td>
              <td style="width: 14px; text-align: center; font-weight: 700;">:</td>
              <td style="font-weight: 700; color: #0f172a; text-align: right;">${receiptNo}</td>
            </tr>
            <tr>
              <td style="color: #334155; font-weight: 600; padding: 2px 0;">Date</td>
              <td style="width: 14px; text-align: center; font-weight: 700;">:</td>
              <td style="font-weight: 700; color: #0f172a; text-align: right;">${dateStr}</td>
            </tr>
            <tr>
              <td style="color: #334155; font-weight: 600; padding: 2px 0;">Supplier Ref.</td>
              <td style="width: 14px; text-align: center; font-weight: 700;">:</td>
              <td style="font-weight: 700; color: #0f172a; text-align: right;">${supplierRef}</td>
            </tr>
          </table>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        <tr>
          <td style="width: 49%; vertical-align: top;">
            <div style="border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11.5px; padding: 6px 12px;">Supplier Details</div>
              <div style="padding: 8px 12px; font-size: 11px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="width: 110px; color: #334155; font-weight: 600; padding: 3px 0;">Supplier Name</td><td style="width: 12px; font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${supName}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Address</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 500;">${displayAddress}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">GSTIN</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700; font-family: monospace;">${displayGst}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Contact No.</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${displayContact}</td></tr>
                </table>
              </div>
            </div>
          </td>
          <td style="width: 2%;"></td>
          <td style="width: 49%; vertical-align: top;">
            <div style="border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11.5px; padding: 6px 12px;">Transaction Details</div>
              <div style="padding: 8px 12px; font-size: 11px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="width: 110px; color: #334155; font-weight: 600; padding: 3px 0;">Transaction Type</td><td style="width: 12px; font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${transactionType}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Payment Mode</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${paymentMode}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Bank Name</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${bankName}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Transaction ID</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${transactionId}</td></tr>
                  <tr><td style="color: #334155; font-weight: 600; padding: 3px 0;">Payment Date</td><td style="font-weight: 700; text-align: center;">:</td><td style="color: #0f172a; font-weight: 700;">${paymentDate}</td></tr>
                </table>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px;">
        <thead>
          <tr style="background-color: #1e40af; color: #ffffff;">
            <th style="width: 45px; text-align: center; padding: 7px;">Sr.</th>
            <th style="text-align: left; padding: 7px;">Item Description</th>
            <th style="width: 90px; text-align: center; padding: 7px;">HSN/SAC</th>
            <th style="width: 70px; text-align: center; padding: 7px;">Qty</th>
            <th style="width: 55px; text-align: center; padding: 7px;">Unit</th>
            <th style="width: 90px; text-align: right; padding: 7px;">Rate (₹)</th>
            <th style="width: 100px; text-align: right; padding: 7px;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${validItems.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
              <td style="text-align: center; font-weight: 600; padding: 6px;">${idx + 1}</td>
              <td style="font-weight: 600; padding: 6px;">${it.name}</td>
              <td style="text-align: center; font-family: monospace; padding: 6px;">${it.hsn}</td>
              <td style="text-align: center; padding: 6px;">${it.qty}</td>
              <td style="text-align: center; padding: 6px;">${it.unit}</td>
              <td style="text-align: right; padding: 6px;">₹ ${Number(it.rate).toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700; padding: 6px;">₹ ${Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="width: 56%; vertical-align: top;">
            <div style="border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; background: #ffffff; margin-bottom: 10px;">
              <div style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11px; padding: 5px 12px;">Amount in Words</div>
              <div style="padding: 8px 12px; font-size: 11px; font-weight: 800; color: #0f172a;">${words}</div>
            </div>
            <div style="border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11px; padding: 5px 12px;">Notes</div>
              <div style="padding: 8px 12px; font-size: 10.5px; color: #334155; line-height: 1.5;">
                • Goods received in good condition.<br/>
                • Please check the quantity and quality at the time of delivery.<br/>
                • This is a system generated receipt. No signature required.
              </div>
            </div>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 40%; vertical-align: top;">
            <div style="border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; background: #ffffff;">
              <div style="display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155; font-weight: 600;">
                <span>Sub Total</span>
                <span style="font-weight: 700; color: #0f172a;">₹ ${sub.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
                <span>CGST (2.5%)</span>
                <span>₹ ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
                <span>SGST (2.5%)</span>
                <span>₹ ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="background-color: #1e40af; color: #ffffff; font-weight: 800; font-size: 13px; padding: 7px 12px; display: flex; justify-content: space-between;">
                <span>Total Amount</span>
                <span>₹ ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style="margin-top: 28px; text-align: right;">
              <div style="width: 180px; border-top: 1.5px solid #94a3b8; margin-left: auto; margin-bottom: 4px;"></div>
              <div style="font-weight: 700; color: #0f172a; font-size: 11px;">Authorized Signature</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">For ${hotelName}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// Master Helper: Save blob as file download in browser
export function saveBlobAs(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error('Failed to trigger file download:', err);
  }
}

// Master Helper: Create 100% Vector, Non-Blank Purchase Receipt PDF matching onscreen modal
export function createPurchaseReceiptPdf(data) {
  const { hotelName: defaultHotelName, hotelAddress: defaultHotelAddress, hotelGst: defaultHotelGst } = getBusinessDetails(data.branch);

  const hotelName = data.hotelName || defaultHotelName || 'Royal Palace Hotel';
  const tagline = data.tagline || 'Good Food | Happy People';
  const hotelAddress = data.hotelAddress || defaultHotelAddress || 'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411009, Maharashtra, India';
  const hotelGst = data.hotelGst || defaultHotelGst || '27AAKCA1234F1ZX';

  const receiptNo = data.receiptNo || (data.poNumber ? data.poNumber.replace('PO-', 'PR-') : (data.id ? `PR-2026-${String(data.id).padStart(5, '0')}` : 'PR-361409'));
  let receiptDateStr = data.receiptDateStr || data.poDate;
  if (receiptDateStr && typeof receiptDateStr === 'string' && receiptDateStr.includes('T')) {
    receiptDateStr = receiptDateStr.split('T')[0];
  }
  if (!receiptDateStr) {
    receiptDateStr = new Date().toISOString().split('T')[0];
  }
  try {
    const parts = receiptDateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      receiptDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  } catch {}

  const supplierRef = data.supplierRef || data.poNumber || (data.id ? `PO-${String(data.id).padStart(6, '0')}` : 'PO-361409');

  const supName = data.supName || data.supplierName || data.supplier?.company || data.supplier?.name || 'Balaji Traders';
  const displayAddress = data.displayAddress || data.supplierAddress || data.supplier?.address || '--';
  const displayGst = maskGstin(data.displayGst || data.supplierGst || data.supplier?.gstNumber) || '--';
  const displayContact = data.displayContact || data.supplierPhone || data.supplier?.phone || '9999976769';

  const transactionType = data.transactionType || 'Purchase Receipt';
  const paymentMode = data.paymentMode || 'Bank Transfer';
  const bankName = data.bankName || (paymentMode === 'Cash' ? '--' : 'HDFC Bank');
  const transactionId = data.transactionId || (data.id ? `NEFT${data.id}123456789`.slice(0, 13) : 'NEFT123456789');
  const paymentDate = data.paymentDate || receiptDateStr;

  const rawItems = (data.calculatedItems && data.calculatedItems.length > 0)
    ? data.calculatedItems
    : (data.items && data.items.length > 0)
      ? data.items
      : [
          { name: 'Rice (Premium Quality)', hsn: '100630', qty: 50, unit: 'Kg', rate: 40, amount: 2000 },
          { name: 'Toor Dal', hsn: '100640', qty: 20, unit: 'Kg', rate: 120, amount: 2400 },
          { name: 'Cooking Oil (Sunflower)', hsn: '151211', qty: 10, unit: 'Ltr', rate: 160, amount: 1600 },
          { name: 'Wheat Flour (Atta)', hsn: '110100', qty: 20, unit: 'Kg', rate: 49, amount: 980 },
          { name: 'Masala Mix', hsn: '090422', qty: 5, unit: 'Kg', rate: 280, amount: 1400 },
        ];

  let calcSub = 0;
  const items = rawItems.filter(it => (it.name || it.itemName || '').trim()).map((it, idx) => {
    const name = (it.name || it.itemName || '').trim();
    const hsn = it.hsnCode || it.hsn || it.sacCode || (100630 + idx * 10).toString();
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unit = it.unit || 'Kg';
    const rate = Number(it.unitPrice ?? it.rate ?? 0);
    const amount = Number(it.amount ?? (qty * rate));
    calcSub += amount;
    return { name, hsn, qty, unit, rate, amount };
  });

  const subTotal = Number(data.subTotal !== undefined && data.subTotal !== null ? data.subTotal : (data.subtotal !== undefined ? data.subtotal : calcSub));
  const cgstAmt = Number(data.cgstAmt !== undefined ? data.cgstAmt : Math.round(subTotal * 0.025 * 100) / 100);
  const sgstAmt = Number(data.sgstAmt !== undefined ? data.sgstAmt : Math.round(subTotal * 0.025 * 100) / 100);
  const grandTotal = Number(data.grandTotal !== undefined && data.grandTotal !== null ? data.grandTotal : (data.totalAmount !== undefined ? data.totalAmount : (subTotal + cgstAmt + sgstAmt)));
  const amountInWords = data.amountInWords || numberToWordsIndian(grandTotal);

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  // Outer Border
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.roundedRect(10, 10, 190, 277, 3, 3, 'S');

  // --- HEADER ---
  // Chef Hat / Crown Icon
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.6);
  doc.line(16, 31, 28, 31);
  doc.line(17, 24, 17, 30);
  doc.line(20, 23, 20, 30);
  doc.line(22, 22, 22, 30);
  doc.line(24, 23, 24, 30);
  doc.line(27, 24, 27, 30);
  doc.roundedRect(16, 21, 12, 10, 2, 2, 'S');

  // Left: Hotel Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  doc.text(hotelName, 32, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235); // #2563eb
  doc.text(tagline, 32, 27);

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // #475569
  const splitAddr = doc.splitTextToSize(hotelAddress, 90);
  doc.text(splitAddr, 32, 32);

  const gstY = 32 + (splitAddr.length * 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(`GSTIN : ${hotelGst}`, 32, gstY);

  // Right: PURCHASE RECEIPT badge
  doc.setFillColor(30, 64, 175); // #1e40af
  doc.roundedRect(125, 16, 70, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('PURCHASE RECEIPT', 160, 23, { align: 'center' });

  // Right: Metadata Table
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // #334155
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No', 126, 33);
  doc.text(':', 150, 33);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receiptNo, 194, 33, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Date', 126, 38);
  doc.text(':', 150, 38);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receiptDateStr, 194, 38, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Supplier Ref.', 126, 43);
  doc.text(':', 150, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(supplierRef, 194, 43, { align: 'right' });

  // --- TWO CARDS (Supplier Details & Transaction Details) ---
  const cardsY = Math.max(gstY + 5, 48);

  // Supplier Details Card
  doc.setDrawColor(191, 219, 254); // #bfdbfe
  doc.setLineWidth(0.3);
  doc.roundedRect(15, cardsY, 87, 32, 2, 2, 'S');
  doc.setFillColor(224, 242, 254); // #e0f2fe
  doc.rect(15, cardsY, 87, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(3, 105, 161); // #0369a1
  doc.text('Supplier Details', 19, cardsY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Supplier Name', 19, cardsY + 12);
  doc.text(':', 45, cardsY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(supName, 48, cardsY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Address', 19, cardsY + 17);
  doc.text(':', 45, cardsY + 17);
  doc.setTextColor(15, 23, 42);
  doc.text(displayAddress, 48, cardsY + 17);

  doc.setTextColor(51, 65, 85);
  doc.text('GSTIN', 19, cardsY + 22);
  doc.text(':', 45, cardsY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(displayGst, 48, cardsY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Contact No.', 19, cardsY + 27);
  doc.text(':', 45, cardsY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(displayContact, 48, cardsY + 27);

  // Transaction Details Card
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(107, cardsY, 87, 32, 2, 2, 'S');
  doc.setFillColor(224, 242, 254);
  doc.rect(107, cardsY, 87, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(3, 105, 161);
  doc.text('Transaction Details', 111, cardsY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Transaction Type', 111, cardsY + 12);
  doc.text(':', 141, cardsY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(transactionType, 144, cardsY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Payment Mode', 111, cardsY + 17);
  doc.text(':', 141, cardsY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(paymentMode, 144, cardsY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Bank Name', 111, cardsY + 22);
  doc.text(':', 141, cardsY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bankName, 144, cardsY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Transaction ID', 111, cardsY + 27);
  doc.text(':', 141, cardsY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(transactionId, 144, cardsY + 27);

  // --- ITEMS TABLE ---
  const tableY = cardsY + 36;
  const tableData = items.map((it, idx) => [
    idx + 1,
    it.name || it.itemName || 'Item',
    it.hsn || it.hsnCode || '-',
    it.qty || it.quantity || 1,
    it.unit || 'Kg',
    `Rs. ${Number(it.rate || it.unitPrice || 0).toFixed(2)}`,
    `Rs. ${Number(it.amount || ((it.qty || 1) * (it.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: tableY,
    margin: { left: 15, right: 15 },
    head: [['Sr. No.', 'Item Description', 'HSN/SAC', 'Quantity', 'Unit', 'Rate (Rs.)', 'Amount (Rs.)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175], // #1e40af
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240], // #e2e8f0
      lineWidth: 0.2,
      cellPadding: 2.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    }
  });

  const finalY = (doc.lastAutoTable?.finalY || (tableY + 40)) + 6;

  // --- BOTTOM SECTION ---
  // Left: Amount in Words & Notes
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(15, finalY, 100, 16, 2, 2, 'S');
  doc.setFillColor(224, 242, 254);
  doc.rect(15, finalY, 100, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('Amount in Words', 19, finalY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const splitWords = doc.splitTextToSize(amountInWords, 94);
  doc.text(splitWords, 19, finalY + 11);

  // Notes box
  const notesY = finalY + 20;
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(15, notesY, 100, 24, 2, 2, 'S');
  doc.setFillColor(224, 242, 254);
  doc.rect(15, notesY, 100, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('Notes', 19, notesY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Goods received in good condition.', 19, notesY + 11);
  doc.text('• Please check the quantity and quality at the time of delivery.', 19, notesY + 16);
  doc.text('• This is a system generated receipt. No signature required.', 19, notesY + 21);

  // Right: Totals Box
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(122, finalY, 72, 30, 2, 2, 'S');

  // Sub Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Sub Total', 126, finalY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${Number(subTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, finalY + 6, { align: 'right' });

  // CGST
  doc.setDrawColor(226, 232, 240);
  doc.line(122, finalY + 8.5, 194, finalY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('CGST (2.5%)', 126, finalY + 13);
  doc.text(`Rs. ${Number(cgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, finalY + 13, { align: 'right' });

  // SGST
  doc.line(122, finalY + 15.5, 194, finalY + 15.5);
  doc.text('SGST (2.5%)', 126, finalY + 20);
  doc.text(`Rs. ${Number(sgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, finalY + 20, { align: 'right' });

  // Total Amount Blue Banner
  doc.setFillColor(30, 64, 175);
  doc.rect(122, finalY + 22.5, 72, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Total Amount', 126, finalY + 27.5);
  doc.text(`Rs. ${Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, finalY + 27.5, { align: 'right' });

  // Authorized Signature
  const sigY = notesY + 16;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(146, sigY + 14, 192, sigY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signature', 169, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`For ${hotelName}`, 169, sigY + 22, { align: 'center' });

  return doc;
}

// Master Helper: Download Purchase Receipt as non-blank PDF file
export async function downloadPurchaseReceiptPdf(poData) {
  const rNo = poData.receiptNo || (poData.poNumber ? poData.poNumber.replace('PO-', 'PR-') : (poData.id ? `PR-2026-${String(poData.id).padStart(5, '0')}` : 'PR-361409'));
  const filename = `Purchase_Receipt_${rNo}.pdf`;
  const doc = await createPurchaseReceiptPdf(poData);
  const arrayBuffer = doc.output('arraybuffer');
  const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
  saveBlobAs(pdfBlob, filename);
  return { pdfBlob, filename };
}

// Master Helper: Generate Vector Non-Blank PDF of Receipt and Share to WhatsApp
export async function sharePoPdfViaWhatsApp(poData, dialogService) {
  const rNo = poData.receiptNo || (poData.poNumber ? poData.poNumber.replace('PO-', 'PR-') : (poData.id ? `PR-2026-${String(poData.id).padStart(5, '0')}` : 'PR-361409'));
  const filename = `Purchase_Receipt_${rNo}.pdf`;

  let pdfBlob = null;
  let pdfFile = null;

  try {
    const doc = await createPurchaseReceiptPdf(poData);
    const arrayBuffer = doc.output('arraybuffer');
    pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  } catch (err) {
    console.error('Error creating purchase receipt PDF with jsPDF:', err);
  }

  // 1. Prepare receipt text message and phone
  const { message, phone } = formatPoReceiptForWhatsApp(poData);
  const targetPhone = (poData.displayContact || poData.supplierPhone || '').replace(/[^0-9]/g, '') || phone;
  const encoded = encodeURIComponent(message);
  const waUrl = formatWhatsAppUrl(targetPhone, encoded);

  // 2. Try native Web Share with the PDF file directly (shares PDF file without save dialog on mobile / supported devices)
  let sharedDirectly = false;
  if (pdfFile && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Purchase Receipt ${rNo}`,
          text: message
        });
        sharedDirectly = true;
        return;
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return;
      console.warn('Native share fallback to download + wa.me:', shareErr);
    }
  }

  // 3. Fallback for Desktop (Downloads the non-blank PDF and opens WhatsApp Web with the structured receipt)
  if (!sharedDirectly) {
    if (pdfBlob) {
      saveBlobAs(pdfBlob, filename);
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (dialogService && dialogService.alert) {
      dialogService.alert({
        title: 'पावती PDF डाऊनलोड झाली',
        message: `खरेदी पावती PDF (${filename}) डाऊनलोड झाली आहे आणि WhatsApp उघडले आहे! कृपया डाऊनलोड झालेली PDF फाईल WhatsApp चॅटमध्ये पाठवा.`,
        type: 'success'
      });
    }
  }
}

// =========================================================================
// QUICK ONE-CLICK PAYMENT MODAL
// =========================================================================
export function QuickOneClickPaymentModal({
  isOpen,
  onClose,
  data,
  onSuccess
}) {
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(String(data?.amountDue || 0));

  useEffect(() => {
    if (data?.amountDue !== undefined) {
      setCustomAmount(String(data.amountDue));
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const handleConfirmPay = async () => {
    if (isProcessing) return;
    const payAmt = parseFloat(customAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      dialogService.alert({ title: 'Invalid Amount', message: 'Please enter a valid payment amount.', type: 'warning' });
      return;
    }

    try {
      setIsProcessing(true);
      let targetInvoiceId = data.invoiceId;

      // If this is a PO without an existing invoice, auto-create the invoice in backend
      if (!targetInvoiceId && data.type === 'PO') {
        const invPayload = {
          supplierId: data.supplierId || 1,
          purchaseOrderId: data.id,
          invoiceNumber: `PI-${String(data.number || Date.now()).replace('PO-', '')}`,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          total: payAmt,
          items: data.items && data.items.length > 0
            ? data.items.map(it => ({
                itemName: it.itemName || it.name,
                quantity: Number(it.quantity || it.qty || 1),
                unitPrice: Number(it.unitPrice || it.rate || payAmt),
                taxRate: Number(it.taxRate || it.tax || 0),
                total: Number(it.total || it.amount || payAmt)
              }))
            : [{ itemName: `PO Order ${data.number}`, quantity: 1, unitPrice: payAmt, total: payAmt }]
        };
        const createdInv = await purchaseService.createPurchaseInvoice(invPayload);
        targetInvoiceId = createdInv?.id;
      }

      // Record the supplier payment in SQL Server
      if (targetInvoiceId) {
        await purchaseService.recordSupplierPayment({
          supplierId: data.supplierId || 1,
          purchaseInvoiceId: targetInvoiceId,
          amount: payAmt,
          paymentMethod: selectedMethod,
          transactionReference: `PAY-${Date.now().toString().slice(-6)}`,
          paymentDate: new Date().toISOString().split('T')[0]
        });
      }

      // If PO, update status to COMPLETED / RECEIVED
      if (data.type === 'PO' && data.id) {
        try {
          await purchaseService.updatePurchaseOrderStatus(data.id, 'COMPLETED');
        } catch (e) {
          console.warn('Status update fallback:', e);
        }
      }

      // Global sync across all tabs, dashboard & reports
      window.dispatchEvent(new CustomEvent('billing-updated'));
      window.dispatchEvent(new CustomEvent('payment-completed'));
      window.dispatchEvent(new CustomEvent('purchase-updated'));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('One-click payment error:', err);
      dialogService.alert({
        title: 'Payment Error',
        message: 'Failed to process payment: ' + (err?.response?.data?.message || err.message || 'Unknown error'),
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const methods = [
    { id: 'UPI', label: 'UPI / QR', icon: '📱' },
    { id: 'CASH', label: 'Cash', icon: '💵' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
    { id: 'CARD', label: 'Card', icon: '💳' },
  ];

  return (
    <ModalOverlay zIndex={120}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: 18, width: 440, padding: 26, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
        <ModalHeader title={t('oneClickPayment', '⚡ One-Click Payment')} onClose={onClose} />
        
        <div style={{ marginTop: 14, background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{data.type === 'PO' ? 'PO Number' : 'Invoice Number'}:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{data.number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Supplier:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{data.supplierName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>Total Balance Due:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#b91c1c' }}>
              ₹ {Number(data.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
            Select Payment Method:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {methods.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethod(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: selectedMethod === m.id ? '2px solid #059669' : '1.5px solid #e2e8f0',
                  backgroundColor: selectedMethod === m.id ? '#ecfdf5' : '#ffffff',
                  color: selectedMethod === m.id ? '#065f46' : '#475569',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
            Amount to Pay (₹):
          </label>
          <input
            type="number"
            step="0.01"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1.5px solid #cbd5e1',
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={handleConfirmPay}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 0,
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            {isProcessing ? 'Processing Payment...' : `✓ Confirm & Pay ₹ ${Number(customAmount || 0).toLocaleString('en-IN')}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 0,
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// =========================================================================
// 3. PURCHASE ORDER VIEW
// =========================================================================
export function PurchaseOrderView({
  suppliers = [],
  setSuppliers,
  setActiveTab,
  purchaseOrders = [],
  setPurchaseOrders,
  purchaseInvoices = [],
  onRefresh,
  onReceiveGoods,
  onViewPoReceipt,
  branch,
}) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();

  const [quickPayData, setQuickPayData] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [selectedPoId, setSelectedPoId] = useState(null);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [poStatus, setPoStatus] = useState('ORDERED');
  const [notes, setNotes] = useState('');

  const getInitialItems = () => [
    { id: Date.now(), name: '', unit: 'Kg', qty: 1, rate: 0, discount: 0, tax: 5 }
  ];

  const [items, setItems] = useState(() => getInitialItems());

  // Dynamically synchronize item names whenever language changes between mr, hi, en
  useEffect(() => {
    setItems(prevItems => prevItems.map(it => {
      const locName = getLocalizedMenuItemName(it.name, currentLanguage);
      return locName && locName !== it.name ? { ...it, name: locName } : it;
    }));
  }, [currentLanguage]);

  // Unique list of existing purchase orders from database (prevents duplicate PO numbers in dropdown)
  const uniquePOs = useMemo(() => {
    const seen = new Set();
    const list = [];
    purchaseOrders.forEach(po => {
      const num = (po.poNumber || (po.id ? `PO-${po.id}` : '')).trim();
      if (num && !seen.has(num)) {
        seen.add(num);
        list.push(po);
      }
    });
    return list;
  }, [purchaseOrders]);

  // Handler to select an existing PO Number and retrieve its full details from database
  const handlePoSelect = async (selectedVal) => {
    if (!selectedVal) return;

    if (selectedVal === '__NEW__') {
      const freshPoNum = `PO-${Date.now().toString().slice(-6)}`;
      setPoNumber(freshPoNum);
      setSelectedPoId(null);
      setSelectedSupplierId('');
      setPoDate(new Date().toISOString().split('T')[0]);
      setExpectedDelivery('');
      setPoStatus('ORDERED');
      setNotes('');
      setItems(getInitialItems());
      return;
    }

    const matched = uniquePOs.find(p => (p.poNumber || `PO-${p.id}`) === selectedVal || String(p.id) === selectedVal);
    if (matched) {
      const pNum = matched.poNumber || `PO-${matched.id}`;
      setPoNumber(pNum);
      setSelectedPoId(matched.id || null);

      if (matched.supplierId) {
        setSelectedSupplierId(matched.supplierId);
      } else if (matched.supplierName) {
        const foundSup = suppliers.find(s => s.name?.toLowerCase() === matched.supplierName?.toLowerCase());
        if (foundSup) setSelectedSupplierId(foundSup.id);
      }

      if (matched.poDate) {
        setPoDate(matched.poDate.split('T')[0]);
      } else if (matched.createdAt) {
        setPoDate(matched.createdAt.split('T')[0]);
      }

      if (matched.expectedDeliveryDate) {
        setExpectedDelivery(matched.expectedDeliveryDate.split('T')[0]);
      } else {
        setExpectedDelivery('');
      }

      if (matched.status) setPoStatus(matched.status);
      if (matched.notes) setNotes(matched.notes);

      if (Array.isArray(matched.items) && matched.items.length > 0) {
        setItems(matched.items.map((it, idx) => ({
          id: it.id || idx + 1,
          name: it.itemName || it.name || '',
          unit: it.unit || 'Kg',
          qty: Number(it.quantity ?? it.qty ?? 1),
          rate: Number(it.unitPrice ?? it.rate ?? 0),
          discount: Number(it.discount ?? 0),
          tax: Number(it.taxRate ?? it.tax ?? 5),
        })));
      }

      // Fetch full PO details by ID to retrieve all line items accurately
      if (matched.id) {
        try {
          const fullPo = await purchaseService.getPurchaseOrderById(matched.id);
          if (fullPo) {
            if (fullPo.supplierId) setSelectedSupplierId(fullPo.supplierId);
            if (fullPo.poDate) setPoDate(fullPo.poDate.split('T')[0]);
            if (fullPo.expectedDeliveryDate) setExpectedDelivery(fullPo.expectedDeliveryDate.split('T')[0]);
            if (fullPo.status) setPoStatus(fullPo.status);
            if (fullPo.notes) setNotes(fullPo.notes);
            if (Array.isArray(fullPo.items) && fullPo.items.length > 0) {
              setItems(fullPo.items.map((it, idx) => ({
                id: it.id || idx + 1,
                name: it.itemName || it.name || '',
                unit: it.unit || 'Kg',
                qty: Number(it.quantity ?? it.qty ?? 1),
                rate: Number(it.unitPrice ?? it.rate ?? 0),
                discount: Number(it.discount ?? 0),
                tax: Number(it.taxRate ?? it.tax ?? 5),
              })));
            }
          }
        } catch (fetchErr) {
          console.warn('Used cached PO details, backend getById error:', fetchErr);
        }
      }
    } else {
      setPoNumber(selectedVal);
      setSelectedPoId(null);
    }
  };

  const [showSaveToast, setShowSaveToast] = useState(false);
  const [savedPoToast, setSavedPoToast] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add New Supplier Modal State right within the PO Interface
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', contact: '', phone: '', address: '', gstNumber: '' });
  const [newSupplierErrors, setNewSupplierErrors] = useState({});

  // Only resolve current supplier object when explicitly selected by the user
  const currentSupplierObj = suppliers.find(s => String(s.id) === String(selectedSupplierId)) || null;

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    let val = value;
    if (['qty', 'rate', 'discount', 'tax'].includes(field)) {
      val = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    }
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { id: Date.now(), name: '', unit: 'Kg', qty: 1, rate: 0, discount: 0, tax: 5 }
    ]);
  };

  const confirmDeleteItem = () => {
    if (itemToDeleteIndex !== null) {
      setItems(items.filter((_, i) => i !== itemToDeleteIndex));
      setShowDeleteModal(false);
      setItemToDeleteIndex(null);
    }
  };

  // Direct Photo Input & OCR State
  const photoFileInputRef = useRef(null);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [photoScanToast, setPhotoScanToast] = useState(null);
  const [photoScanError, setPhotoScanError] = useState(null);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be picked again
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setPhotoScanError('कृपया वैध फोटो (JPG, PNG, WEBP) निवडा.');
      setTimeout(() => setPhotoScanError(null), 4000);
      return;
    }

    setIsScanningPhoto(true);
    setScanProgress(10);
    setScanStatusText(t('scanningPhoto', 'फोटोमधून वस्तूंची यादी शोधत आहे...'));
    setPhotoScanError(null);
    setPhotoScanToast(null);

    try {
      const result = await recognizeItemsFromImage(file, (pct, status) => {
        setScanProgress(pct);
        setScanStatusText(status);
      });

      if (result.items && result.items.length > 0) {
        const formatted = result.items.map((it, idx) => ({
          id: Date.now() + idx + Math.random(),
          name: it.name || '',
          unit: it.unit || 'Kg',
          qty: Math.max(0.1, Number(it.qty) || 1),
          rate: Math.max(0, Number(it.rate) || 0),
          discount: Number(it.discount) || 0,
          tax: Number(it.tax) || 5,
        }));

        setItems(prev => {
          const hasOnlyBlank = prev.length === 1 && (!prev[0].name || prev[0].name.trim() === '');
          if (hasOnlyBlank) {
            return formatted;
          }
          return [...prev, ...formatted];
        });

        setPhotoScanToast(`${formatted.length} ${t('photoScanSuccess', 'items added from photo!')}`);
        setTimeout(() => setPhotoScanToast(null), 5000);
      } else {
        setPhotoScanError(t('noItemsFoundInPhoto', 'फोटोमध्ये कोणतीही वस्तू स्पष्ट आढळली नाही. कृपया दुसरा फोटो निवडा किंवा मॅन्युअली नोंद करा.'));
        setTimeout(() => setPhotoScanError(null), 6000);
      }
    } catch (err) {
      console.error('Photo OCR error:', err);
      setPhotoScanError('फोटो स्कॅन करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.');
      setTimeout(() => setPhotoScanError(null), 5000);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Tax and total calculation via taxCalculationService
  const subtotal = items.reduce((sum, it) => {
    const q = parseFloat(it.qty) || 0;
    const r = parseFloat(it.rate) || 0;
    const d = parseFloat(it.discount) || 0;
    const gross = q * r;
    return sum + (gross - gross * (d / 100));
  }, 0);

  const taxTotal = items.reduce((sum, it) => {
    const q = parseFloat(it.qty) || 0;
    const r = parseFloat(it.rate) || 0;
    const d = parseFloat(it.discount) || 0;
    const tRate = parseFloat(it.tax) || 0;
    const net = (q * r) * (1 - d / 100);
    return sum + (net * (tRate / 100));
  }, 0);

  const totalAmount = subtotal + taxTotal;

  // Handle Quick Add Supplier from inside the PO interface
  const handleSaveNewSupplier = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newSupplierData.name.trim()) errs.name = 'Supplier Name is required';
    if (!newSupplierData.contact.trim()) errs.contact = 'Contact person is required';
    if (!newSupplierData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (newSupplierData.phone.trim().length !== 10) {
      errs.phone = 'Phone must be exactly 10 digits';
    }

    if (newSupplierData.gstNumber && newSupplierData.gstNumber.trim()) {
      const gstinVal = validateGstin(newSupplierData.gstNumber);
      if (!gstinVal.isValid) {
        errs.gstNumber = gstinVal.message;
      }
    }

    setNewSupplierErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: newSupplierData.contact.trim(),
        company: newSupplierData.name.trim(),
        phone: newSupplierData.phone.trim(),
        address: (newSupplierData.address || '').trim(),
        gstNumber: newSupplierData.gstNumber.trim().toUpperCase(),
        status: 'ACTIVE'
      };
      const created = await supplierService.createSupplier(payload);
      const newSup = {
        id: created.id || Date.now(),
        name: created.company || created.name,
        company: created.company || created.name,
        contact: created.name,
        phone: created.phone,
        address: created.address || (newSupplierData.address || '').trim(),
        gstNumber: created.gstNumber || newSupplierData.gstNumber.trim().toUpperCase(),
        status: 'Active'
      };
      setSuppliers(prev => [newSup, ...prev]);
      setSelectedSupplierId(newSup.id);
      setShowAddSupplierModal(false);
      setNewSupplierData({ name: '', contact: '', phone: '', address: '', gstNumber: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to create new supplier:', err);
      dialogService.alert({
        title: 'Save Supplier Failed',
        message: 'Failed to save supplier: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Save PO to SQL Server
  const handleConfirmSave = async () => {
    setShowUnsavedModal(false);
    if (isSubmitting) return;

    if (!selectedSupplierId) {
      dialogService.alert({
        title: t('supplierRequired', 'Supplier Required / पुरवठादार आवश्यक'),
        message: t('selectSupplierWarning', 'Please select a supplier first. / कृपया आधी पुरवठादार निवडा.'),
        type: 'warning',
      });
      return;
    }

    const trimmedPoNo = (poNumber || '').trim();
    if (!trimmedPoNo) {
      dialogService.alert({
        title: 'PO Number Required',
        message: 'Please select or enter a Purchase Order number.',
        type: 'warning',
      });
      return;
    }

    // Prevent duplicate PO numbers if creating a new PO
    const isDuplicate = uniquePOs.some(p => 
      (p.poNumber || `PO-${p.id}`) === trimmedPoNo && p.id !== selectedPoId
    );
    if (isDuplicate && !selectedPoId) {
      dialogService.alert({
        title: 'Duplicate PO Number',
        message: `Purchase Order Number "${trimmedPoNo}" already exists in the system. Please select it from the dropdown or create a new PO number.`,
        type: 'warning',
      });
      return;
    }

    if (items.length === 0 || !items.some(i => i.name && Number(i.qty) > 0)) {
      dialogService.alert({
        title: 'Items Required',
        message: 'Please add at least one item with a valid name and quantity.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        branchId: 1,
        supplierId: Number(selectedSupplierId),
        poNumber: trimmedPoNo,
        poDate: poDate || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: expectedDelivery || null,
        status: poStatus || 'ORDERED',
        notes: notes || `PO for ${currentSupplierObj?.name || 'Supplier'}`,
        items: items.filter(it => it.name.trim()).map(it => ({
          itemName: it.name.trim(),
          unit: it.unit || 'Kg',
          quantity: Number(it.qty) || 1,
          unitPrice: Number(it.rate) || 0,
          taxRate: Number(it.tax) || 5,
        }))
      };

      let saved;
      if (selectedPoId) {
        saved = await purchaseService.updatePurchaseOrder(selectedPoId, payload);
      } else {
        saved = await purchaseService.createPurchaseOrder(payload);
      }

      if (saved && setPurchaseOrders) {
        setPurchaseOrders(prev => [saved, ...prev.filter(p => p.id !== saved.id && (p.poNumber || `PO-${p.id}`) !== (saved.poNumber || `PO-${saved.id}`))]);
      }
      if (saved) {
        setSelectedPoId(saved.id);
        setPoNumber(saved.poNumber || `PO-${saved.id}`);
        if (saved.supplierId) {
          setSelectedSupplierId(saved.supplierId);
        }
      }

      const savedInfo = {
        id: saved?.id || selectedPoId,
        poNumber: saved?.poNumber || trimmedPoNo,
        poDate: poDate || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: expectedDelivery || null,
        status: poStatus || 'ORDERED',
        supplierId: selectedSupplierId,
        supplierName: currentSupplierObj?.company || currentSupplierObj?.name,
        supplierPhone: currentSupplierObj?.phone,
        supplierAddress: currentSupplierObj?.address,
        supplierGst: currentSupplierObj?.gstNumber,
        supplier: currentSupplierObj,
        notes: notes,
        items: items.filter(it => it.name && it.name.trim()),
        subtotal: subtotal,
        taxTotal: taxTotal,
        totalAmount: totalAmount,
      };

      setSavedPoToast(savedInfo);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 9000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save PO to backend:', err);
      dialogService.alert({
        title: 'Order Save Failed',
        message: 'Failed to save purchase order: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Share PO Handler (Formats as structured Receipt with Default Message)
  const handleShareWhatsApp = async (customPo = null) => {
    if (!customPo && !selectedSupplierId) {
      dialogService.alert({
        title: t('supplierRequired', 'Supplier Required / पुरवठादार आवश्यक'),
        message: t('selectSupplierWarning', 'Please select a supplier first. / कृपया आधी पुरवठादार निवडा.'),
        type: 'warning',
      });
      return;
    }
    let poDataToShare;
    if (customPo && (customPo.poNumber || customPo.id)) {
      const matchSup = suppliers.find(s =>
        (s.id && customPo.supplierId && String(s.id) === String(customPo.supplierId)) ||
        (s.company && customPo.supplierName && s.company.trim().toLowerCase() === customPo.supplierName.trim().toLowerCase()) ||
        (s.name && customPo.supplierName && s.name.trim().toLowerCase() === customPo.supplierName.trim().toLowerCase())
      ) || customPo.supplier || currentSupplierObj;

      const pNum = customPo.poNumber || (customPo.id ? `PO-${customPo.id}` : poNumber);
      const rNum = customPo.receiptNumber || pNum.replace('PO-', 'PR-');

      poDataToShare = {
        receiptNo: rNum,
        supplierRef: pNum,
        poNumber: pNum,
        receiptDateStr: customPo.poDate || customPo.createdAt || poDate,
        poDate: customPo.poDate || customPo.createdAt || poDate,
        supName: matchSup?.company || matchSup?.name || customPo.supplierName || currentSupplierObj?.name,
        displayContact: matchSup?.phone || customPo.supplierPhone || currentSupplierObj?.phone,
        displayAddress: matchSup?.address || customPo.supplierAddress || currentSupplierObj?.address,
        displayGst: matchSup?.gstNumber || customPo.supplierGst || currentSupplierObj?.gstNumber,
        transactionType: 'Purchase Receipt',
        paymentMode: customPo.paymentMethod || customPo.paymentMode || 'Bank Transfer',
        bankName: customPo.bankName || 'HDFC Bank',
        transactionId: customPo.transactionId || (customPo.id ? `NEFT${customPo.id}123456789`.slice(0, 13) : 'NEFT123456789'),
        paymentDate: customPo.poDate || customPo.createdAt || poDate,
        items: (customPo.items && customPo.items.length > 0) ? customPo.items : items.filter(it => it.name && it.name.trim()),
        subTotal: customPo.subtotal !== undefined ? customPo.subtotal : subtotal,
        cgstAmt: customPo.taxTotal !== undefined ? Math.round((customPo.taxTotal / 2) * 100) / 100 : Math.round((taxTotal / 2) * 100) / 100,
        sgstAmt: customPo.taxTotal !== undefined ? Math.round((customPo.taxTotal / 2) * 100) / 100 : Math.round((taxTotal / 2) * 100) / 100,
        grandTotal: customPo.totalAmount !== undefined ? customPo.totalAmount : totalAmount,
        notes: customPo.notes || notes,
        branch
      };
    } else {
      const pNum = poNumber || (selectedPoId ? `PO-${selectedPoId}` : `PO-${Date.now().toString().slice(-6)}`);
      const rNum = pNum.replace('PO-', 'PR-');

      poDataToShare = {
        receiptNo: rNum,
        supplierRef: pNum,
        poNumber: pNum,
        receiptDateStr: poDate || new Date().toISOString().split('T')[0],
        poDate: poDate || new Date().toISOString().split('T')[0],
        supName: currentSupplierObj?.company || currentSupplierObj?.name,
        displayContact: currentSupplierObj?.phone,
        displayAddress: currentSupplierObj?.address,
        displayGst: currentSupplierObj?.gstNumber,
        transactionType: 'Purchase Receipt',
        paymentMode: 'Bank Transfer',
        bankName: 'HDFC Bank',
        transactionId: selectedPoId ? `NEFT${selectedPoId}123456789`.slice(0, 13) : 'NEFT123456789',
        paymentDate: poDate || new Date().toISOString().split('T')[0],
        items: items.filter(it => it.name && it.name.trim()),
        subTotal: subtotal,
        cgstAmt: Math.round((taxTotal / 2) * 100) / 100,
        sgstAmt: Math.round((taxTotal / 2) * 100) / 100,
        grandTotal: totalAmount,
        notes: notes,
        branch
      };
    }

    await sharePoPdfViaWhatsApp(poDataToShare, dialogService);
  };

  const handleViewCurrentPoReceipt = () => {
    if (!selectedSupplierId) {
      dialogService.alert({
        title: t('supplierRequired', 'Supplier Required / पुरवठादार आवश्यक'),
        message: t('selectSupplierWarning', 'Please select a supplier first. / कृपया आधी पुरवठादार निवडा.'),
        type: 'warning',
      });
      return;
    }
    if (onViewPoReceipt) {
      onViewPoReceipt({
        id: selectedPoId,
        poNumber: poNumber || `PO-${Date.now().toString().slice(-6)}`,
        poDate: poDate || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: expectedDelivery || null,
        status: poStatus || 'ORDERED',
        supplierId: selectedSupplierId,
        supplierName: currentSupplierObj?.company || currentSupplierObj?.name,
        supplierPhone: currentSupplierObj?.phone,
        supplierAddress: currentSupplierObj?.address,
        supplierGst: currentSupplierObj?.gstNumber,
        supplier: currentSupplierObj,
        notes: notes,
        items: items.filter(it => it.name && it.name.trim()),
        totalAmount: totalAmount,
      });
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, position: 'relative' }}>
      {showSaveToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          minWidth: 360,
          maxWidth: 440,
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
          borderLeft: '5px solid #16a34a',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {t('poSavedSuccess', 'Purchase Order Saved Successfully!')}
              </div>
            </div>
            <button
              onClick={() => setShowSaveToast(false)}
              style={{ border: 0, background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1 }}
              title="Close"
            >
              ×
            </button>
          </div>

          {savedPoToast && (
            <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
              <div><strong>{savedPoToast.poNumber}</strong> • {savedPoToast.supplierName}</div>
              <div>Estimated Total: <strong>₹{Number(savedPoToast.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <button
              onClick={() => handleShareWhatsApp(savedPoToast)}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 0,
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              <MessageSquare size={14} />
              <span>{t('shareWhatsAppReceipt', 'Share Receipt on WhatsApp (PDF)')}</span>
            </button>

            <button
              onClick={() => {
                setShowSaveToast(false);
                handleViewCurrentPoReceipt();
              }}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Printer size={14} />
              <span>{t('viewReceipt', 'View Receipt')}</span>
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={sectionBadge}>2. {t('purchaseOrders', 'Purchase Order')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('createPurchaseOrderPo', 'Create Purchase Order')}
      </h2>

      <h3 style={subHeading}>{t('poDetails', 'PO Details')}</h3>

      {/* PO Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Supplier Selector with Inline Add Supplier Button */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{t('supplier', 'Supplier')} *</label>
            <button
              type="button"
              onClick={() => setShowAddSupplierModal(true)}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              + {t('addSupplier', 'Add Supplier')}
            </button>
          </div>
          <select
            value={selectedSupplierId || ''}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            style={inputStyle()}
          >
            <option value="">-- {t('selectSupplier', 'Select Supplier')} --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.name, s.name)}
              </option>
            ))}
          </select>
        </div>

        {/* PO Number Dropdown */}
        <Field label={`${t('poNumber', 'PO No.')} *`}>
          <select
            value={poNumber}
            onChange={(e) => handlePoSelect(e.target.value)}
            style={inputStyle()}
          >
            {!uniquePOs.some(p => (p.poNumber || `PO-${p.id}`) === poNumber) && poNumber && (
              <option value={poNumber}>
                + {t('newPurchaseOrder', 'New PO')} ({poNumber})
              </option>
            )}
            <option value="__NEW__">+ {t('createPurchaseOrderPo', 'Create New PO')}</option>
            {uniquePOs.length > 0 && (
              <optgroup label={t('existingPurchaseOrders', 'Existing Purchase Orders')}>
                {uniquePOs.map((p) => {
                  const pNum = p.poNumber || `PO-${p.id}`;
                  return (
                    <option key={p.id || pNum} value={pNum}>
                      {pNum} {p.supplierName ? `• ${p.supplierName}` : ''} ({translateStatus(p.status || 'ORDERED')})
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>
        </Field>

        {/* PO Date */}
        <Field label={`${t('poDate', 'PO Date')} *`}>
          <LocalizedDatePicker
            value={poDate}
            onChange={setPoDate}
            inputStyle={inputStyle()}
          />
        </Field>

        {/* Expected Delivery */}
        <Field label={t('expectedDelivery', 'Expected Delivery')}>
          <LocalizedDatePicker
            value={expectedDelivery}
            onChange={setExpectedDelivery}
            inputStyle={inputStyle()}
          />
        </Field>

        {/* Status */}
        <Field label={`${t('status', 'PO Status')} *`}>
          <select
            value={poStatus}
            onChange={(e) => setPoStatus(e.target.value)}
            style={inputStyle()}
          >
            <option value="ORDERED">{translateStatus('ORDERED')}</option>
            <option value="DRAFT">{translateStatus('DRAFT')}</option>
            <option value="APPROVED">{translateStatus('APPROVED')}</option>
            <option value="RECEIVED">{translateStatus('RECEIVED')}</option>
            <option value="CANCELLED">{translateStatus('CANCELLED')}</option>
          </select>
        </Field>
      </div>

      {/* Items Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ ...subHeading, margin: 0 }}>{t('orderItems', 'Items')}</h3>
        <button
          type="button"
          onClick={addItemRow}
          style={{
            backgroundColor: '#6366f1',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={15} />
          <span>{t('addItem', '+ Add Item')}</span>
        </button>
      </div>

      {/* Hidden File Input for Photo OCR */}
      <input
        type="file"
        ref={photoFileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* Scanning Progress */}
      {isScanningPhoto && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#166534' }}>
              <RefreshCw size={15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>{scanStatusText || t('scanningPhoto', 'फोटोमधून वस्तूंची यादी शोधत आहे...')}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{scanProgress}%</span>
          </div>
          <div style={{ width: '100%', height: 5, backgroundColor: '#dcfce7', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${scanProgress}%`, height: '100%', backgroundColor: '#059669', transition: 'width 0.2s ease' }} />
          </div>
        </div>
      )}

      {/* Scan Success Toast */}
      {photoScanToast && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>✓ {photoScanToast}</span>
        </div>
      )}

      {/* Scan Error Alert */}
      {photoScanError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600
        }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{photoScanError}</span>
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>#</th>
              <th style={{ padding: '10px 12px' }}>{t('itemName', 'Item Name')}</th>
              <th style={{ padding: '10px 12px' }}>{t('unit', 'Unit')}</th>
              <th style={{ padding: '10px 12px' }}>{t('qty', 'Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('rate', 'Rate (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('discount', 'Discount (%)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('tax', 'Tax (%)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('amount', 'Amount (₹)')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('action', 'Action')}</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13, color: '#334155' }}>
            {items.map((it, idx) => {
              const q = parseFloat(it.qty) || 0;
              const r = parseFloat(it.rate) || 0;
              const d = parseFloat(it.discount) || 0;
              const tRate = parseFloat(it.tax) || 0;
              const net = (q * r) * (1 - d / 100);
              const lineTotal = net + (net * (tRate / 100));

              return (
                <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{toDevanagari(idx + 1)}</td>
                  <td style={td}>
                    <input
                      value={it.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      placeholder={t('itemName', 'Item name')}
                      list="common-grocery-items"
                      style={tableInput}
                    />
                  </td>
                  <td style={td}>
                    <select
                      value={it.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      style={tableInput}
                    >
                      <option value="Kg">{t('unitKg', 'Kg')}</option>
                      <option value="Ltr">{t('unitLtr', 'Ltr')}</option>
                      <option value="Pcs">{t('unitPcs', 'Pcs')}</option>
                      <option value="Box">{t('unitBox', 'Box')}</option>
                      <option value="Pack">{t('unitPack', 'Pack')}</option>
                    </select>
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      value={it.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      style={{ ...tableInput, width: 70 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      value={it.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      style={{ ...tableInput, width: 80 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={it.discount}
                      onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                      style={{ ...tableInput, width: 60 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={it.tax}
                      onChange={(e) => handleItemChange(idx, 'tax', e.target.value)}
                      style={{ ...tableInput, width: 60 }}
                    />
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {formatNumber(lineTotal, { asCurrency: true, decimals: 2 })}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setItemToDeleteIndex(idx);
                        setShowDeleteModal(true);
                      }}
                      style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                {t('estimatedPoTotal', 'Estimated PO Total')} (₹):
              </td>
              <td colSpan={2} style={{ padding: '14px 12px', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                {formatNumber(totalAmount, { asCurrency: true, decimals: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
        <datalist id="common-grocery-items">
          <option value={getLocalizedMenuItemName('Rice (Basmati)', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Cooking Oil', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Sugar', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Salt', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Wheat Flour', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Maida', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Milk', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Tea Powder', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Tur Dal', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Chana Dal', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Moong Dal', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Onion', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Potato', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Tomato', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Ginger', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Garlic', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Paneer', currentLanguage)} />
          <option value={getLocalizedMenuItemName('Butter', currentLanguage)} />
        </datalist>
      </div>

      {/* Action Buttons in Icon Form */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
        {/* Save Details */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => setShowUnsavedModal(true)}
            disabled={isSubmitting}
            title={isSubmitting ? t('saving', 'Saving...') : t('saveDetails', 'Save Details')}
            aria-label={t('saveDetails', 'Save Details')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Save size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{t('save', 'Save')}</span>
        </div>

        {/* View / Print PO Receipt Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={handleViewCurrentPoReceipt}
            title={t('viewPoReceipt', 'View / Print PO Receipt')}
            aria-label={t('viewPoReceipt', 'View / Print PO Receipt')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(13, 148, 136, 0.35)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Printer size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{t('receipt', 'Receipt')}</span>
        </div>

        {/* Photo Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => photoFileInputRef.current?.click()}
            disabled={isScanningPhoto}
            title={t('addPhoto', 'Add Photo / Scan Bill')}
            aria-label={t('addPhoto', 'Add Photo')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isScanningPhoto ? 'not-allowed' : 'pointer',
              opacity: isScanningPhoto ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.35)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isScanningPhoto ? (
              <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Camera size={20} />
            )}
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{t('photo', 'Photo')}</span>
        </div>

        {/* WhatsApp Share Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => handleShareWhatsApp(savedPoToast || null)}
            title={t('sharePoWhatsApp', 'Share via WhatsApp (PDF)')}
            aria-label={t('sharePoWhatsApp', 'Share via WhatsApp (PDF)')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <MessageSquare size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>WhatsApp</span>
        </div>

        {/* Receive Goods Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => {
              if (!selectedSupplierId) {
                dialogService.alert({
                  title: t('supplierRequired', 'Supplier Required / पुरवठादार आवश्यक'),
                  message: t('selectSupplierWarning', 'Please select a supplier first. / कृपया आधी पुरवठादार निवडा.'),
                  type: 'warning',
                });
                return;
              }
              onReceiveGoods({ id: poNumber, poNumber, supplierId: selectedSupplierId, supplierName: currentSupplierObj?.name, items });
            }}
            title={t('receiveGoods', 'Receive Goods / Create GRN')}
            aria-label={t('receiveGoods', 'Receive Goods / Create GRN')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <PackageCheck size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{t('receive', 'Receive')}</span>
        </div>

        {/* Cancel Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            title={t('cancel', 'Cancel')}
            aria-label={t('cancel', 'Cancel')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <X size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{t('cancel', 'Cancel')}</span>
        </div>
      </div>

      {/* Saved POs in SQL Server Table */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 28, marginTop: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
          {t('purchaseOrders', 'Saved Purchase Orders in SQL Server')}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 750 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>{t('poNo', 'PO No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Order Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('totalAmount', 'Total Amount')}</th>
                <th style={{ padding: '10px 12px' }}>{t('status', 'Status')}</th>
                <th style={{ padding: '10px 12px' }}>{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {purchaseOrders.map((po) => (
                <tr key={po.id || po.poNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>{po.poNumber || `PO-${po.id}`}</td>
                  <td style={td}>{t(po.supplierName, po.supplierName || 'Supplier')}</td>
                  <td style={td}>{formatDate(po.poDate || (po.createdAt ? po.createdAt.split('T')[0] : 'Today'), { showDayOfWeek: false })}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{formatNumber(Number(po.totalAmount) || 0, { asCurrency: true, decimals: 0 })}</td>
                  <td style={td}>
                    <span style={{
                      backgroundColor: po.status === 'RECEIVED' ? '#dcfce7' : po.status === 'ORDERED' ? '#dbeafe' : '#fef3c7',
                      color: po.status === 'RECEIVED' ? '#15803d' : po.status === 'ORDERED' ? '#1d4ed8' : '#b45309',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {translateStatus(po.status || 'ORDERED')}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handlePoSelect(po.poNumber || `PO-${po.id}`)}
                        style={{ border: 0, backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        title="Load into form"
                      >
                        {t('view', 'Select')}
                      </button>
                      <button
                        onClick={() => {
                          if (onViewPoReceipt) {
                            const matchSup = suppliers.find(s =>
                              (s.id && po.supplierId && String(s.id) === String(po.supplierId)) ||
                              (s.company && po.supplierName && s.company.trim().toLowerCase() === po.supplierName.trim().toLowerCase()) ||
                              (s.name && po.supplierName && s.name.trim().toLowerCase() === po.supplierName.trim().toLowerCase())
                            );
                            onViewPoReceipt({
                              ...po,
                              supplier: matchSup,
                              supplierName: matchSup?.company || matchSup?.name || po.supplierName,
                              supplierAddress: matchSup?.address || po.supplierAddress,
                              supplierGst: matchSup?.gstNumber || po.supplierGst,
                              supplierPhone: matchSup?.phone || po.supplierPhone
                            });
                          }
                        }}
                        style={{ border: 0, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="View PO Receipt"
                      >
                        <Printer size={12} />
                        {t('receipt', 'Receipt')}
                      </button>
                      <button
                        onClick={async () => {
                          let fullPo = po;
                          if (!po.items || po.items.length === 0) {
                            try {
                              const res = await purchaseService.getPurchaseOrderById(po.id);
                              if (res) fullPo = res;
                            } catch (e) {
                              console.warn('Failed to fetch full PO details for whatsapp share:', e);
                            }
                          }
                          handleShareWhatsApp(fullPo);
                        }}
                        style={{ border: 0, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Share PO Receipt on WhatsApp"
                      >
                        <MessageSquare size={12} />
                        <span>{t('whatsapp', 'WhatsApp')}</span>
                      </button>
                      <button
                        onClick={() => onReceiveGoods(po)}
                        style={{ border: 0, backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {t('receiveGoods', 'Receive Goods (GRN)')}
                      </button>
                      {po.status !== 'PAID' && (
                        <button
                          onClick={() => {
                            const matchSup = suppliers.find(s =>
                              (s.id && po.supplierId && String(s.id) === String(po.supplierId)) ||
                              (s.company && po.supplierName && s.company.trim().toLowerCase() === po.supplierName.trim().toLowerCase()) ||
                              (s.name && po.supplierName && s.name.trim().toLowerCase() === po.supplierName.trim().toLowerCase())
                            );
                            const matchingInv = (purchaseInvoices || []).find(i => i.purchaseOrderId === po.id || (po.poNumber && i.poNumber === po.poNumber));
                            setQuickPayData({
                              type: 'PO',
                              id: po.id,
                              number: po.poNumber || `PO-${po.id}`,
                              supplierId: po.supplierId || matchSup?.id,
                              supplierName: matchSup?.company || matchSup?.name || po.supplierName || 'Supplier',
                              amountDue: matchingInv ? (Number(matchingInv.dueAmount) || Number(matchingInv.total)) : Number(po.totalAmount || 0),
                              invoiceId: matchingInv?.id,
                              items: po.items
                            });
                          }}
                          style={{
                            border: 0,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="One-Click Pay Due"
                        >
                          💳 {t('payNow', 'Pay Due')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Supplier Directly inside PO screen */}
      {showAddSupplierModal && (
        <ModalOverlay zIndex={100}>
          <div style={{ backgroundColor: '#fff', borderRadius: 14, width: 440, padding: 24, boxShadow: '0 20px 25px rgba(0,0,0,.15)' }}>
            <ModalHeader title={t('addNewSupplier', '+ Add New Supplier')} onClose={() => setShowAddSupplierModal(false)} />
            <form onSubmit={handleSaveNewSupplier}>
              <Field label={`${t('supplierName', 'Supplier / Business Name')} *`} error={newSupplierErrors.name}>
                <input
                  value={newSupplierData.name}
                  onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  style={inputStyle(newSupplierErrors.name)}
                />
              </Field>
              <Field label={`${t('contactPerson', 'Contact Person')} *`} error={newSupplierErrors.contact}>
                <input
                  value={newSupplierData.contact}
                  onChange={e => setNewSupplierData({ ...newSupplierData, contact: e.target.value })}
                  style={inputStyle(newSupplierErrors.contact)}
                />
              </Field>
              <Field label={`${t('phone', 'Phone Number (10 digits)')} *`} error={newSupplierErrors.phone}>
                <input
                  value={newSupplierData.phone}
                  onChange={e => setNewSupplierData({ ...newSupplierData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  style={inputStyle(newSupplierErrors.phone)}
                />
              </Field>
              <Field label={t('supplierAddress', 'Supplier Address / Location')}>
                <input
                  value={newSupplierData.address || ''}
                  onChange={e => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                  placeholder="e.g. Shop No. 5, Market Yard, Pune - 411037"
                  style={inputStyle()}
                />
              </Field>
              <Field label={`${t('supplierGstin', 'Supplier GSTIN')} (Optional - 15 chars)`} error={newSupplierErrors.gstNumber}>
                <input
                  value={newSupplierData.gstNumber}
                  onChange={e => setNewSupplierData({ ...newSupplierData, gstNumber: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15) })}
                  maxLength={15}
                  placeholder="27AAAAA1111A1Z5"
                  style={inputStyle(newSupplierErrors.gstNumber)}
                />
                {newSupplierData.gstNumber && newSupplierData.gstNumber.length === 15 && (
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 700, fontFamily: 'monospace' }}>
                    ✓ Masked Output: {maskGstin(newSupplierData.gstNumber)}
                  </div>
                )}
              </Field>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" disabled={isSubmitting} style={primaryBtn}>{t('saveSupplier', 'Save Supplier')}</button>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {showUnsavedModal && (
        <ModalOverlay zIndex={100}>
          <WindowsModal
            onSave={handleConfirmSave}
            onDontSave={() => { setShowUnsavedModal(false); setActiveTab('dashboard'); }}
            onCancel={() => setShowUnsavedModal(false)}
          />
        </ModalOverlay>
      )}

      {showDeleteModal && (
        <ModalOverlay zIndex={100}>
          <DeleteConfirm onCancel={() => setShowDeleteModal(false)} onConfirm={confirmDeleteItem} />
        </ModalOverlay>
      )}

      {quickPayData && (
        <QuickOneClickPaymentModal
          isOpen={!!quickPayData}
          data={quickPayData}
          onClose={() => setQuickPayData(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// 4. GOODS RECEIPT NOTE (GRN) VIEW
// =========================================================================
export function GoodsReceiptView({
  suppliers = [],
  purchaseOrders = [],
  goodsReceipts = [],
  setActiveTab,
  onRefresh,
  preSelectedPo,
  onGenerateInvoice
}) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();

  const [supplierId, setSupplierId] = useState(preSelectedPo?.supplierId || '');
  const [poId, setPoId] = useState(preSelectedPo?.id || '');
  const [grnNumber, setGrnNumber] = useState(`GRN-${Date.now().toString().slice(-6)}`);
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('Store Manager');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Filter POs matching selected supplier
  const availablePos = purchaseOrders.filter(po => {
    if (!supplierId) return true;
    return Number(po.supplierId) === Number(supplierId);
  });

  const selectedPo = availablePos.find(po => po.id === Number(poId) || po.poNumber === poId) || availablePos[0];

  useEffect(() => {
    if (preSelectedPo) {
      if (preSelectedPo.supplierId) setSupplierId(preSelectedPo.supplierId);
      if (preSelectedPo.id) setPoId(preSelectedPo.id);
    }
  }, [preSelectedPo]);

  // Load items from PO into GRN
  useEffect(() => {
    if (selectedPo && selectedPo.items && selectedPo.items.length > 0) {
      setItems(
        selectedPo.items.map((it, idx) => {
          const ordQty = Number(it.quantity ?? it.orderedQty) || 0;
          return {
            id: it.id || idx + 1,
            name: it.itemName || it.name,
            unit: it.unit || 'Kg',
            orderedQty: ordQty,
            receivedQty: ordQty,
            acceptedQty: ordQty,
            rejectedQty: 0,
            batchNo: `B-${Date.now().toString().slice(-4)}`,
            expiryDate: '',
          };
        })
      );
    } else {
      setItems([]);
    }
  }, [selectedPo]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    let val = value;
    if (['receivedQty', 'acceptedQty', 'rejectedQty'].includes(field)) {
      val = Math.max(0, parseFloat(value) || 0);
    }
    updated[index] = { ...updated[index], [field]: val };

    if (field === 'receivedQty' || field === 'acceptedQty') {
      const rec = parseFloat(field === 'receivedQty' ? val : updated[index].receivedQty) || 0;
      const acc = parseFloat(field === 'acceptedQty' ? val : updated[index].acceptedQty) || 0;
      updated[index].rejectedQty = Math.max(0, rec - acc);
    }

    setItems(updated);
  };

  const handleSaveGrn = async () => {
    if (isSubmitting) return;
    if (!selectedPo) {
      dialogService.alert({
        title: 'Purchase Order Required',
        message: 'Please select a purchase order with items to receive.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        supplierId: Number(supplierId || selectedPo.supplierId || 1),
        purchaseOrderId: selectedPo.id,
        grnNumber: grnNumber,
        grnDate: grnDate || new Date().toISOString().split('T')[0],
        receivedBy: receivedBy || 'Store Manager',
        status: 'RECEIVED',
        notes: notes || `GRN against PO ${selectedPo.poNumber || selectedPo.id}`,
        items: items.map(it => ({
          itemName: it.name,
          unit: it.unit || 'Kg',
          orderedQty: Number(it.orderedQty) || 0,
          receivedQty: Number(it.receivedQty) || 0,
          acceptedQty: Number(it.acceptedQty) || 0,
          rejectedQty: Number(it.rejectedQty) || 0,
          batchNo: it.batchNo || '',
          expiryDate: it.expiryDate || null,
        }))
      };

      await purchaseService.createGoodsReceipt(payload);

      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save GRN:', err);
      dialogService.alert({
        title: 'Goods Receipt Failed',
        message: 'Failed to save Goods Receipt: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, position: 'relative' }}>
      {showSaveToast && (
        <div style={{ position: 'fixed', top: 28, right: 28, minWidth: 320, backgroundColor: '#fff', borderRadius: 10, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)', borderLeft: '4px solid #16a34a', zIndex: 9999 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', color: '#16a34a', fontSize: 16, fontWeight: 700 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{t('grnCreatedSuccess', 'GRN recorded & stock updated in SQL Server!')}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={sectionBadge}>3. {t('goodsReceipt', 'Goods Receipt / GRN')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('createMaterialReceipt', 'Create Goods Receipt Note (GRN)')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label={`${t('supplier', 'Supplier')} *`}>
          <select value={supplierId || ''} onChange={e => { setSupplierId(e.target.value); setPoId(''); }} style={inputStyle()}>
            <option value="">-- {t('selectSupplier', 'Select Supplier')} --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{t(s.name, s.name)}</option>)}
          </select>
        </Field>

        <Field label={`${t('poNumber', 'Select PO')} *`}>
          <select value={poId} onChange={e => setPoId(e.target.value)} style={inputStyle()}>
            {availablePos.map(p => (
              <option key={p.id} value={p.id}>
                {p.poNumber || `PO-${p.id}`} ({toDevanagari(p.items?.length || 0)} {t('items', 'items')})
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${t('date', 'GRN Date')} *`}>
          <LocalizedDatePicker value={grnDate} onChange={setGrnDate} inputStyle={inputStyle()} />
        </Field>

        <Field label={t('receivedByStaff', 'Received By')}>
          <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Store Manager" style={inputStyle()} />
        </Field>
      </div>

      <h3 style={subHeading}>{t('orderItems', 'Items from Purchase Order (Record Accepted vs Rejected)')}</h3>

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 850 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>{t('itemName', 'Item Name')}</th>
              <th style={{ padding: '10px 12px' }}>{t('orderedQty', 'Ordered Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('newlyReceivedQty', 'Received Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('acceptedQty', 'Accepted Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('rejectedQty', 'Damaged / Rejected')}</th>
              <th style={{ padding: '10px 12px' }}>{t('unit', 'Unit')}</th>
              <th style={{ padding: '10px 12px' }}>{t('batchNo', 'Batch No.')}</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13, color: '#334155' }}>
            {items.map((it, idx) => (
              <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 500 }}>{t(it.name, it.name)}</td>
                <td style={td}>{toDevanagari(it.orderedQty)}</td>
                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    value={it.receivedQty}
                    onChange={(e) => handleItemChange(idx, 'receivedQty', e.target.value)}
                    style={{ ...tableInput, width: 70 }}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    value={it.acceptedQty}
                    onChange={(e) => handleItemChange(idx, 'acceptedQty', e.target.value)}
                    style={{ ...tableInput, width: 70 }}
                  />
                </td>
                <td style={{ ...td, color: it.rejectedQty > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                  {toDevanagari(it.rejectedQty)}
                </td>
                <td style={td}>{t(`unit${it.unit}`, it.unit)}</td>
                <td style={td}>
                  <input
                    type="text"
                    value={it.batchNo}
                    onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                    style={{ ...tableInput, width: 100 }}
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  {t('noPoFound', 'Select a Purchase Order with items above to load.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 32 }}>
        <button onClick={() => setActiveTab('dashboard')} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
        <button
          onClick={handleSaveGrn}
          disabled={isSubmitting || items.length === 0}
          style={{ ...primaryBtn, backgroundColor: '#0284c7', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? t('saving', 'Saving...') : t('confirmGrnAndUpdateStock', 'Save GRN & Update Usable Stock')}
        </button>
      </div>

      {/* Saved Goods Receipts in SQL Server */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
          {t('goodsReceipt', 'Saved Goods Receipts (GRN in SQL Server)')}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>{t('grnNo', 'GRN No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('poNo', 'PO No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('acceptedQty', 'Accepted Qty')}</th>
                <th style={{ padding: '10px 12px' }}>{t('status', 'Status')}</th>
                <th style={{ padding: '10px 12px' }}>{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {goodsReceipts.map((gr) => (
                <tr key={gr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#0284c7' }}>{gr.grnNumber}</td>
                  <td style={td}>{gr.poNumber || (gr.purchaseOrderId ? `PO-${gr.purchaseOrderId}` : '-')}</td>
                  <td style={td}>{t(gr.supplierName, gr.supplierName || 'Supplier')}</td>
                  <td style={td}>{formatDate(gr.grnDate, { showDayOfWeek: false })}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#16a34a' }}>
                    {toDevanagari(gr.totalAcceptedQty ?? gr.items?.reduce((s, i) => s + (Number(i.acceptedQty) || 0), 0) ?? 0)}
                  </td>
                  <td style={td}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {translateStatus(gr.status || 'RECEIVED')}
                    </span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => onGenerateInvoice(gr)}
                      style={{ border: 0, backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t('generatePurchaseInvoice', 'Generate Purchase Invoice')} →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 5. PURCHASE INVOICE VIEW
// =========================================================================
export function PurchaseInvoiceView({
  suppliers = [],
  purchaseOrders = [],
  goodsReceipts = [],
  purchaseInvoices = [],
  setActiveTab,
  onRefresh,
  preSelectedGrn,
  onCreateReturn
}) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();

  const [supplierId, setSupplierId] = useState(preSelectedGrn?.supplierId || '');
  const [poNo, setPoNo] = useState(preSelectedGrn?.poNumber || '');
  const [grnNo, setGrnNo] = useState(preSelectedGrn?.grnNumber || '');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [quickPayData, setQuickPayData] = useState(null);

  useEffect(() => {
    if (preSelectedGrn) {
      if (preSelectedGrn.supplierId) setSupplierId(preSelectedGrn.supplierId);
      if (preSelectedGrn.grnNumber) setGrnNo(preSelectedGrn.grnNumber);
      if (preSelectedGrn.poNumber) setPoNo(preSelectedGrn.poNumber);

      if (preSelectedGrn.items && preSelectedGrn.items.length > 0) {
        setItems(preSelectedGrn.items.map((it, idx) => ({
          id: it.id || idx + 1,
          name: it.itemName || it.name,
          qty: Number(it.acceptedQty ?? it.receivedQty) || 1,
          rate: 100,
          discount: 0,
          gst: 5
        })));
      }
    }
  }, [preSelectedGrn]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    let val = value;
    if (['qty', 'rate', 'discount', 'gst'].includes(field)) {
      val = Math.max(0, parseFloat(value) || 0);
    }
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Tax calculations using taxCalculationService
  const subTotal = items.reduce((sum, it) => {
    const q = parseFloat(it.qty) || 0;
    const r = parseFloat(it.rate) || 0;
    const d = parseFloat(it.discount) || 0;
    const gross = q * r;
    return sum + (gross - gross * (d / 100));
  }, 0);

  const gstTotal = items.reduce((sum, it) => {
    const q = parseFloat(it.qty) || 0;
    const r = parseFloat(it.rate) || 0;
    const d = parseFloat(it.discount) || 0;
    const g = parseFloat(it.gst) || 0;
    const net = (q * r) * (1 - d / 100);
    return sum + (net * (g / 100));
  }, 0);

  const otherChargesNum = parseFloat(otherCharges) || 0;
  const totalAmount = subTotal + gstTotal + otherChargesNum;
  const paidAmountNum = parseFloat(paidAmount) || 0;
  const dueAmount = Math.max(0, totalAmount - paidAmountNum);

  const handleSaveInvoice = async () => {
    if (isSubmitting) return;
    if (items.length === 0) {
      dialogService.alert({
        title: 'Invoice Items Required',
        message: 'Please add invoice items before saving.',
        type: 'warning',
      });
      return;
    }
    if (!invoiceNumber.trim()) {
      dialogService.alert({
        title: 'Invoice Number Required',
        message: 'Please enter supplier invoice number.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const matchedPo = purchaseOrders.find(p => p.poNumber === poNo || String(p.id) === String(poNo));
      const matchedGrn = goodsReceipts.find(g => g.grnNumber === grnNo || String(g.id) === String(grnNo));

      await purchaseService.createPurchaseInvoice({
        supplierId: Number(supplierId || 1),
        purchaseOrderId: matchedPo?.id,
        goodsReceiptId: matchedGrn?.id,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate,
        dueDate: paymentDueDate || null,
        total: totalAmount,
        subtotal: subTotal,
        taxAmount: gstTotal,
        discountAmount: 0,
        notes: notes || '',
        paymentMethod: paymentMethod || 'Bank Transfer',
        items: items.map(it => ({
          itemName: it.name,
          quantity: Number(it.qty) || 1,
          unitPrice: Number(it.rate) || 0,
          discountPercent: Number(it.discount) || 0,
          taxRate: Number(it.gst) || 0,
          total: (Number(it.qty) || 1) * (Number(it.rate) || 0),
        }))
      });

      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save purchase invoice:', err);
      dialogService.alert({
        title: 'Invoice Save Failed',
        message: 'Failed to save purchase invoice: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, position: 'relative' }}>
      {showSaveToast && (
        <div style={{ position: 'fixed', top: 28, right: 28, minWidth: 320, backgroundColor: '#fff', borderRadius: 10, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)', borderLeft: '4px solid #16a34a', zIndex: 9999 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', color: '#16a34a', fontSize: 16, fontWeight: 700 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{t('invoiceCreatedSuccess', 'Purchase Invoice saved to SQL Server!')}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ ...sectionBadge, backgroundColor: '#059669' }}>4. {t('purchaseInvoice', 'Purchase Invoice')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('purchaseInvoice', 'Record / Generate Purchase Invoice')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label={`${t('supplier', 'Supplier')} *`}>
          <select value={supplierId || ''} onChange={e => setSupplierId(e.target.value)} style={inputStyle()}>
            <option value="">-- {t('selectSupplier', 'Select Supplier')} --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{t(s.name, s.name)}</option>)}
          </select>
        </Field>

        <Field label={t('linkedPoNo', 'Linked PO No.')}>
          <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="e.g. PO-12345" style={inputStyle()} />
        </Field>

        <Field label={t('linkedGrnNo', 'Linked GRN No.')}>
          <input type="text" value={grnNo} onChange={e => setGrnNo(e.target.value)} placeholder="e.g. GRN-12345" style={inputStyle()} />
        </Field>

        <Field label={`${t('supplierInvoiceNumber', 'Supplier Invoice No.')} *`}>
          <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle()} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label={`${t('invoiceDate', 'Invoice Date')} *`}>
          <LocalizedDatePicker value={invoiceDate} onChange={setInvoiceDate} inputStyle={inputStyle()} />
        </Field>

        <Field label={t('paymentMethod', 'Payment Method')}>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle()}>
            <option value="Bank Transfer">{t('bankTransfer', 'Bank Transfer')}</option>
            <option value="UPI">{t('upi', 'UPI')}</option>
            <option value="Cash">{t('cash', 'Cash')}</option>
            <option value="Cheque">{t('cheque', 'Cheque')}</option>
          </select>
        </Field>

        <Field label={t('notes', 'Notes')}>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('invoiceRemarksPlaceholder', 'Invoice remarks...')} style={inputStyle()} />
        </Field>
      </div>

      {/* Items & Tax Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginBottom: 24 }}>
        <div>
          <h3 style={subHeading}>{t('orderItems', 'Items')}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
                  <th style={{ padding: '10px 12px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>{t('itemName', 'Item Name')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('qty', 'Qty')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('rate', 'Rate (₹)')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('discount', 'Disc (%)')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('gst', 'GST (%)')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('amount', 'Amount (₹)')}</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13, color: '#334155' }}>
                {items.map((it, idx) => {
                  const q = parseFloat(it.qty) || 0;
                  const r = parseFloat(it.rate) || 0;
                  const d = parseFloat(it.discount) || 0;
                  const net = (q * r) * (1 - d / 100);

                  return (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{toDevanagari(idx + 1)}</td>
                      <td style={{ ...td, fontWeight: 500 }}>{t(it.name, it.name)}</td>
                      <td style={td}>
                        <input type="number" min="0" value={it.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} style={{ ...tableInput, width: 60 }} />
                      </td>
                      <td style={td}>
                        <input type="number" min="0" value={it.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} style={{ ...tableInput, width: 80 }} />
                      </td>
                      <td style={td}>
                        <input type="number" min="0" max="100" value={it.discount} onChange={e => handleItemChange(idx, 'discount', e.target.value)} style={{ ...tableInput, width: 50 }} />
                      </td>
                      <td style={td}>
                        <input type="number" min="0" max="100" value={it.gst} onChange={e => handleItemChange(idx, 'gst', e.target.value)} style={{ ...tableInput, width: 50 }} />
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(net, { asCurrency: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* GST & Totals Summary Panel */}
        <div style={{ backgroundColor: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#475569' }}>
            <span>{t('subtotal', 'Taxable Amount')}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatNumber(subTotal, { asCurrency: true })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#475569' }}>
            <span>{t('totalTax', 'GST Total (CGST + SGST)')}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatNumber(gstTotal, { asCurrency: true })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: '#475569' }}>
            <span>{t('otherCharges', 'Other Charges')}</span>
            <input type="number" min="0" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} style={{ ...tableInput, width: 80, textAlign: 'right' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15, fontWeight: 700, color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
            <span>{t('grandTotal', 'Invoice Total (₹)')}</span>
            <span>{formatNumber(totalAmount, { asCurrency: true })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: '#475569' }}>
            <span>{t('amountPaid', 'Paid Amount')}</span>
            <input type="number" min="0" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} style={{ ...tableInput, width: 80, textAlign: 'right' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: dueAmount > 0 ? '#b91c1c' : '#15803d', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
            <span>{t('balanceDue', 'Outstanding Due')}</span>
            <span>{formatNumber(dueAmount, { asCurrency: true })}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 32 }}>
        <button onClick={() => setActiveTab('dashboard')} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
        <button
          onClick={handleSaveInvoice}
          disabled={isSubmitting}
          style={{ ...primaryBtn, backgroundColor: '#059669', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? t('saving', 'Saving...') : t('save', 'Save Purchase Invoice')}
        </button>
      </div>

      {/* Saved Invoices in SQL Server */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
          {t('purchaseInvoice', 'Saved Purchase Invoices in SQL Server')}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>{t('invoiceNumber', 'Invoice No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('totalAmount', 'Total (₹)')}</th>
                <th style={{ padding: '10px 12px' }}>{t('amountPaid', 'Paid (₹)')}</th>
                <th style={{ padding: '10px 12px' }}>{t('balanceDue', 'Due (₹)')}</th>
                <th style={{ padding: '10px 12px' }}>{t('status', 'Status')}</th>
                <th style={{ padding: '10px 12px' }}>{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {purchaseInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#059669' }}>{inv.invoiceNumber}</td>
                  <td style={td}>{t(inv.supplierName, inv.supplierName || 'Supplier')}</td>
                  <td style={td}>{formatDate(inv.invoiceDate, { showDayOfWeek: false })}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{formatNumber(Number(inv.total) || 0, { asCurrency: true })}</td>
                  <td style={{ ...td, color: '#15803d' }}>{formatNumber(Number(inv.paidAmount) || 0, { asCurrency: true })}</td>
                  <td style={{ ...td, color: '#b91c1c' }}>{formatNumber(Number(inv.dueAmount) || 0, { asCurrency: true })}</td>
                  <td style={td}>
                    <span style={{
                      backgroundColor: inv.paymentStatus === 'PAID' ? '#dcfce7' : inv.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2',
                      color: inv.paymentStatus === 'PAID' ? '#15803d' : inv.paymentStatus === 'PARTIAL' ? '#b45309' : '#dc2626',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {translateStatus(inv.paymentStatus || 'DUE')}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.paymentStatus !== 'PAID' && (Number(inv.dueAmount) > 0 || !inv.dueAmount) && (
                        <button
                          onClick={() => setQuickPayData({
                            type: 'INVOICE',
                            id: inv.id,
                            number: inv.invoiceNumber,
                            supplierId: inv.supplierId,
                            supplierName: inv.supplierName || 'Supplier',
                            amountDue: Number(inv.dueAmount) || Number(inv.total) || 0,
                            invoiceId: inv.id
                          })}
                          style={{
                            border: 0,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="One-Click Pay Due"
                        >
                          💳 {t('payNow', 'Pay Due')}
                        </button>
                      )}
                      <button
                        onClick={() => onCreateReturn(inv)}
                        style={{ border: 0, backgroundColor: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {t('purchaseReturn', 'Return')} →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {quickPayData && (
        <QuickOneClickPaymentModal
          isOpen={!!quickPayData}
          data={quickPayData}
          onClose={() => setQuickPayData(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// 6. PURCHASE RETURN VIEW
// =========================================================================
export function PurchaseReturnView({
  suppliers = [],
  purchaseInvoices = [],
  purchaseReturns = [],
  setActiveTab,
  onRefresh,
  preSelectedInvoice
}) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();

  const [supplierId, setSupplierId] = useState(preSelectedInvoice?.supplierId || '');
  const [invoiceNo, setInvoiceNo] = useState(preSelectedInvoice?.invoiceNumber || '');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const availableInvoices = purchaseInvoices.filter(inv => {
    if (!supplierId) return true;
    return Number(inv.supplierId) === Number(supplierId);
  });

  const selectedInvoice = availableInvoices.find(inv => inv.invoiceNumber === invoiceNo) || availableInvoices[0];

  useEffect(() => {
    if (preSelectedInvoice) {
      if (preSelectedInvoice.supplierId) setSupplierId(preSelectedInvoice.supplierId);
      if (preSelectedInvoice.invoiceNumber) setInvoiceNo(preSelectedInvoice.invoiceNumber);
    }
  }, [preSelectedInvoice]);

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.items && selectedInvoice.items.length > 0) {
      setItems(
        selectedInvoice.items.map((it, idx) => ({
          id: it.id || idx + 1,
          name: it.itemName || it.name,
          invoicedQty: Number(it.quantity ?? it.qty) || 1,
          qty: 1,
          rate: Number(it.unitPrice ?? it.rate) || 0,
          reason: 'Damaged'
        }))
      );
    } else {
      setItems([]);
    }
  }, [selectedInvoice]);

  const handleQtyChange = (id, newQty) => {
    let val = parseFloat(newQty) || 0;
    const it = items.find(i => i.id === id);
    if (it && val > it.invoicedQty) {
      dialogService.alert({
        title: 'Quantity Exceeded',
        message: `Return quantity cannot exceed invoiced quantity (${it.invoicedQty})`,
        type: 'warning',
      });
      val = it.invoicedQty;
    }
    setItems(items.map(i => i.id === id ? { ...i, qty: val } : i));
  };

  const totalReturnAmount = items.reduce((sum, it) => sum + (it.qty * it.rate), 0);

  const handleSaveReturn = async () => {
    if (isSubmitting) return;
    if (items.length === 0 || totalReturnAmount <= 0) {
      dialogService.alert({
        title: 'Return Items Required',
        message: 'Please specify return items with quantity > 0',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const returnNum = `PR-${Date.now().toString().slice(-6)}`;
      await purchaseService.createPurchaseReturn({
        supplierId: Number(supplierId || 1),
        purchaseInvoiceId: selectedInvoice?.id,
        purchaseOrderId: selectedInvoice?.purchaseOrderId,
        returnNumber: returnNum,
        returnDate: returnDate || new Date().toISOString().split('T')[0],
        reason: items[0]?.reason || 'Damaged',
        totalAmount: totalReturnAmount,
        taxAmount: totalReturnAmount * 0.05,
        items: items.filter(it => it.qty > 0).map(it => ({
          itemName: it.name,
          unit: 'Kg',
          quantity: it.qty,
          unitPrice: it.rate,
          totalPrice: it.qty * it.rate,
          reason: it.reason,
        }))
      });

      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to create purchase return:', err);
      dialogService.alert({
        title: 'Purchase Return Failed',
        message: 'Failed to save purchase return: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, position: 'relative' }}>
      {showSaveToast && (
        <div style={{ position: 'fixed', top: 28, right: 28, minWidth: 320, backgroundColor: '#fff', borderRadius: 10, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)', borderLeft: '4px solid #16a34a', zIndex: 9999 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', color: '#16a34a', fontSize: 16, fontWeight: 700 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{t('returnProcessedSuccess', 'Purchase Return recorded & stock reduced!')}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ ...sectionBadge, backgroundColor: '#ea580c' }}>5. {t('purchaseReturn', 'Purchase Return')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('purchaseReturn', 'Create Purchase Return')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label={`${t('supplier', 'Supplier')} *`}>
          <select value={supplierId || ''} onChange={e => { setSupplierId(e.target.value); setInvoiceNo(''); }} style={inputStyle()}>
            <option value="">-- {t('selectSupplier', 'Select Supplier')} --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{t(s.name, s.name)}</option>)}
          </select>
        </Field>

        <Field label={`${t('selectInvoice', 'Select Invoice')} *`}>
          <select value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={inputStyle()}>
            {availableInvoices.map(inv => (
              <option key={inv.id} value={inv.invoiceNumber}>
                {inv.invoiceNumber} ({formatNumber(Number(inv.total) || 0, { asCurrency: true })})
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${t('date', 'Return Date')} *`}>
          <LocalizedDatePicker value={returnDate} onChange={setReturnDate} inputStyle={inputStyle()} />
        </Field>
      </div>

      <h3 style={subHeading}>{t('orderItems', 'Items to Return (Validated Against Invoiced Qty)')}</h3>

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>#</th>
              <th style={{ padding: '10px 12px' }}>{t('itemName', 'Item Name')}</th>
              <th style={{ padding: '10px 12px' }}>{t('invoicedQty', 'Invoiced Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('returnQuantity', 'Return Qty')}</th>
              <th style={{ padding: '10px 12px' }}>{t('rateRupees', 'Rate (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('totalRupees', 'Total (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('returnReason', 'Reason')}</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13, color: '#334155' }}>
            {items.map((it, idx) => (
              <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{toDevanagari(idx + 1)}</td>
                <td style={{ ...td, fontWeight: 500 }}>{t(it.name, it.name)}</td>
                <td style={{ ...td, color: '#64748b' }}>{toDevanagari(it.invoicedQty)}</td>
                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    max={it.invoicedQty}
                    value={it.qty}
                    onChange={e => handleQtyChange(it.id, e.target.value)}
                    style={{ ...tableInput, width: 70 }}
                  />
                </td>
                <td style={td}>{formatNumber(it.rate, { asCurrency: true })}</td>
                <td style={{ ...td, fontWeight: 600 }}>{formatNumber(it.qty * it.rate, { asCurrency: true })}</td>
                <td style={td}>
                  <select
                    value={it.reason}
                    onChange={e => setItems(items.map(i => i.id === it.id ? { ...i, reason: e.target.value } : i))}
                    style={{ ...tableInput, width: 140 }}
                  >
                    <option value="Damaged">{t('damaged', 'Damaged')}</option>
                    <option value="Wrong Item">{t('wrongItem', 'Wrong Item')}</option>
                    <option value="Expired">{t('expired', 'Expired')}</option>
                    <option value="Quality Issue">{t('qualityIssue', 'Quality Issue')}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 32 }}>
        <button onClick={() => setActiveTab('dashboard')} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
        <button
          onClick={handleSaveReturn}
          disabled={isSubmitting || totalReturnAmount <= 0}
          style={{ ...primaryBtn, backgroundColor: '#ea580c', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? t('saving', 'Saving...') : t('processReturn', 'Save Return & Deduct Stock')}
        </button>
      </div>

      {/* Saved Returns Table */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
          {t('purchaseReturns', 'Saved Purchase Returns in SQL Server')}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
                <th style={{ padding: '10px 12px' }}>{t('returnNo', 'Return No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('invoiceNumber', 'Invoice No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('totalRupees', 'Amount (₹)')}</th>
                <th style={{ padding: '10px 12px' }}>{t('returnReason', 'Reason')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {purchaseReturns.map((pr) => (
                <tr key={pr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#ea580c' }}>{pr.returnNumber}</td>
                  <td style={td}>{pr.invoiceNumber || (pr.purchaseInvoiceId ? `INV-${pr.purchaseInvoiceId}` : '-')}</td>
                  <td style={td}>{t(pr.supplierName, pr.supplierName || 'Supplier')}</td>
                  <td style={td}>{formatDate(pr.returnDate, { showDayOfWeek: false })}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{formatNumber(Number(pr.totalAmount) || 0, { asCurrency: true })}</td>
                  <td style={td}>{t(pr.reason?.toLowerCase() || 'damaged', pr.reason || 'Damaged')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 7. PAYMENT MANAGEMENT VIEW
// =========================================================================
export function PaymentManagementView({ suppliers = [], purchaseInvoices = [], supplierPayments = [], setActiveTab, onRefresh }) {
  const { t, translateStatus, formatNumber, toDevanagari, formatDate, currentLanguage } = useLanguage();
  const [selectedSupplier, setSelectedSupplier] = useState('All');
  const [quickPayData, setQuickPayData] = useState(null);

  const filteredInvoices = selectedSupplier === 'All'
    ? purchaseInvoices
    : purchaseInvoices.filter(i => i.supplierName === selectedSupplier || String(i.supplierId) === String(selectedSupplier));

  const totalInvoiced = filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = filteredInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
  const totalDue = filteredInvoices.reduce((s, i) => s + (Number(i.dueAmount) || 0), 0);

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>
        <button onClick={() => setActiveTab('record-payment')} style={{ ...primaryBtn, backgroundColor: '#be185d' }}>
          + {t('recordPayment', 'Record Payment')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ ...sectionBadge, backgroundColor: '#d97706' }}>6. {t('paymentManagement', 'Payment Management')}</div>
        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
          <option value="All">{t('all', 'All Suppliers')}</option>
          {suppliers.map(s => <option key={s.id} value={s.name}>{t(s.name, s.name)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>{t('totalInvoiced', 'Total Invoiced')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{formatNumber(totalInvoiced, { asCurrency: true })}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}>
          <div style={{ fontSize: 12, color: '#16a34a' }}>{t('totalPaid', 'Total Paid')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#15803d', marginTop: 4 }}>{formatNumber(totalPaid, { asCurrency: true })}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
          <div style={{ fontSize: 12, color: '#dc2626' }}>{t('totalDue', 'Total Due')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>{formatNumber(totalDue, { asCurrency: true })}</div>
        </div>
      </div>

      <h3 style={subHeading}>{t('supplierInvoicesBalance', 'Supplier Invoices Balance (Live from SQL Server)')}</h3>
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12 }}>
              <th style={{ padding: '10px 12px' }}>{t('invoiceNumber', 'Invoice No.')}</th>
              <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
              <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
              <th style={{ padding: '10px 12px' }}>{t('totalAmount', 'Total (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('amountPaid', 'Paid (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('balanceDue', 'Due (₹)')}</th>
              <th style={{ padding: '10px 12px' }}>{t('status', 'Status')}</th>
              <th style={{ padding: '10px 12px' }}>{t('action', 'Action')}</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13, color: '#334155' }}>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600, color: '#4338ca' }}>{inv.invoiceNumber}</td>
                <td style={td}>{t(inv.supplierName, inv.supplierName || 'Supplier')}</td>
                <td style={td}>{formatDate(inv.invoiceDate, { showDayOfWeek: false })}</td>
                <td style={{ ...td, fontWeight: 600 }}>{formatNumber(Number(inv.total) || 0, { asCurrency: true })}</td>
                <td style={{ ...td, color: '#15803d' }}>{formatNumber(Number(inv.paidAmount) || 0, { asCurrency: true })}</td>
                <td style={{ ...td, color: '#b91c1c' }}>{formatNumber(Number(inv.dueAmount) || 0, { asCurrency: true })}</td>
                <td style={td}>
                  <span style={{
                    backgroundColor: inv.paymentStatus === 'PAID' ? '#dcfce7' : inv.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2',
                    color: inv.paymentStatus === 'PAID' ? '#15803d' : inv.paymentStatus === 'PARTIAL' ? '#b45309' : '#dc2626',
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {translateStatus(inv.paymentStatus || 'DUE')}
                  </span>
                </td>
                <td style={td}>
                  {inv.paymentStatus !== 'PAID' && (Number(inv.dueAmount) > 0 || !inv.dueAmount) && (
                    <button
                      onClick={() => setQuickPayData({
                        type: 'INVOICE',
                        id: inv.id,
                        number: inv.invoiceNumber,
                        supplierId: inv.supplierId,
                        supplierName: inv.supplierName || 'Supplier',
                        amountDue: Number(inv.dueAmount) || Number(inv.total) || 0,
                        invoiceId: inv.id
                      })}
                      style={{
                        border: 0,
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="One-Click Pay Due"
                    >
                      💳 {t('payNow', 'Pay Due')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quickPayData && (
        <QuickOneClickPaymentModal
          isOpen={!!quickPayData}
          data={quickPayData}
          onClose={() => setQuickPayData(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// 8. RECORD PAYMENT VIEW
// =========================================================================
export function RecordPaymentView({ suppliers = [], purchaseInvoices = [], setActiveTab, onRefresh }) {
  const { t, formatNumber, currentLanguage } = useLanguage();
  const [supplierId, setSupplierId] = useState('');
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNo, setReferenceNo] = useState(`PAY-${Date.now().toString().slice(-6)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const supplierInvoices = purchaseInvoices.filter(i => Number(i.supplierId) === Number(supplierId));
  const selectedInvoice = supplierInvoices.find(i => i.invoiceNumber === selectedInvoiceNo) || supplierInvoices[0];

  useEffect(() => {
    if (selectedInvoice) {
      setAmountPaid(String(selectedInvoice.dueAmount ?? selectedInvoice.total ?? 0));
    }
  }, [selectedInvoice]);

  const handleSavePayment = async () => {
    if (isSubmitting) return;
    if (!selectedInvoice || Number(amountPaid) <= 0) {
      dialogService.alert({
        title: 'Invalid Payment Amount',
        message: 'Please enter valid amount to pay.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await purchaseService.recordSupplierPayment({
        supplierId: selectedInvoice.supplierId || Number(supplierId) || 1,
        purchaseInvoiceId: selectedInvoice.id,
        amount: parseFloat(amountPaid) || 0,
        paymentMethod: paymentMethod,
        transactionReference: referenceNo || `PAY-${Date.now().toString().slice(-6)}`,
        paymentDate: paymentDate,
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to record payment:', err);
      dialogService.alert({
        title: 'Payment Record Failed',
        message: 'Failed to record payment: ' + (err?.response?.data?.message || err.message),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, maxWidth: 850, margin: '0 auto', position: 'relative' }}>
      {showToast && (
        <div style={{ position: 'fixed', top: 28, right: 28, minWidth: 320, backgroundColor: '#fff', borderRadius: 10, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)', borderLeft: '4px solid #16a34a', zIndex: 9999 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', color: '#16a34a', fontSize: 16, fontWeight: 700 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{t('paymentRecordedSuccess', 'Payment saved in SQL Server!')}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('payment')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToPayments', 'Back to Payments')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ ...sectionBadge, backgroundColor: '#be185d' }}>7. {t('recordPayment', 'Record Payment')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('recordPayment', 'Record Supplier Payment')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <Field label={`${t('supplier', 'Supplier')} *`}>
          <select value={supplierId || ''} onChange={e => { setSupplierId(e.target.value); setSelectedInvoiceNo(''); }} style={inputStyle()}>
            <option value="">-- {t('selectSupplier', 'Select Supplier')} --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{t(s.name, s.name)}</option>)}
          </select>
        </Field>

        <Field label={`${t('selectInvoice', 'Select Invoice')} *`}>
          <select value={selectedInvoiceNo} onChange={e => setSelectedInvoiceNo(e.target.value)} style={inputStyle()}>
            {supplierInvoices.map(inv => (
              <option key={inv.id} value={inv.invoiceNumber}>
                {inv.invoiceNumber} (Due: {formatNumber(Number(inv.dueAmount) || 0, { asCurrency: true })})
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${t('date', 'Payment Date')} *`}>
          <LocalizedDatePicker value={paymentDate} onChange={setPaymentDate} inputStyle={inputStyle()} />
        </Field>

        <Field label={t('paymentMethod', 'Payment Method')}>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle()}>
            <option value="Bank Transfer">{t('bankTransfer', 'Bank Transfer')}</option>
            <option value="UPI">{t('upi', 'UPI')}</option>
            <option value="Cash">{t('cash', 'Cash')}</option>
            <option value="Cheque">{t('cheque', 'Cheque')}</option>
          </select>
        </Field>

        <Field label={`${t('amountToPay', 'Amount to Pay (₹)')} *`}>
          <input type="number" min="0" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={inputStyle()} />
        </Field>

        <Field label={t('txnRef', 'Reference / UTR No.')}>
          <input type="text" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="UTR or Cheque No." style={inputStyle()} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
        <button onClick={() => setActiveTab('payment')} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
        <button onClick={handleSavePayment} disabled={isSubmitting} style={{ ...primaryBtn, backgroundColor: '#be185d', padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? t('saving', 'Saving...') : t('confirmAndSavePayment', 'Confirm & Save Payment')}
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 9. PURCHASE REPORTS VIEW
// =========================================================================
export function PurchaseReportsView({
  setActiveTab,
  purchaseOrders = [],
  goodsReceipts = [],
  purchaseInvoices = [],
  purchaseReturns = [],
  supplierPayments = [],
  suppliers = [],
  stockProducts = [],
  onViewPoReceipt
}) {
  const { t, formatNumber, formatDate, toDevanagari, currentLanguage } = useLanguage();
  const [activeReportTab, setActiveReportTab] = useState('summary'); // 'summary' | 'supplier' | 'items' | 'gst'
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all' | 'today' | 'this-week' | 'this-month'
  const [searchTerm, setSearchTerm] = useState('');

  // Date Filtering Helper
  const isDateInFilter = (dateStr) => {
    if (!dateStr || periodFilter === 'all') return true;
    try {
      const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (periodFilter === 'today') {
        return d.toDateString() === todayMidnight.toDateString();
      }
      if (periodFilter === 'this-week') {
        const start = new Date(todayMidnight);
        const day = start.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + mondayOffset);
        return d >= start && d <= todayMidnight;
      }
      if (periodFilter === 'this-month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return d >= start && d <= todayMidnight;
      }
      return true;
    } catch {
      return true;
    }
  };

  // High-level KPI Totals
  const invoiceTotal = purchaseInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const poTotal = purchaseOrders.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
  const totalPurchaseAmt = invoiceTotal > 0 ? invoiceTotal : poTotal;
  const totalPaidAmt = purchaseInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0) + supplierPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalDueAmt = purchaseInvoices.reduce((s, i) => s + (Number(i.dueAmount) || 0), 0);
  const totalReturnAmt = purchaseReturns.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

  // 1. Purchase Summary Rows (Invoices + POs)
  const purchaseSummaryRows = useMemo(() => {
    const list = [];
    purchaseInvoices.forEach(inv => {
      const d = inv.invoiceDate || (inv.createdAt ? inv.createdAt.split('T')[0] : 'Today');
      if (isDateInFilter(d)) {
        const total = Number(inv.total) || 0;
        const tax = Number(inv.taxAmount) || 0;
        const taxable = Number(inv.subtotal) || Math.max(0, total - tax);
        list.push({
          id: `inv-${inv.id}`,
          date: d,
          docNo: inv.invoiceNumber || `INV-${inv.id}`,
          type: 'Invoice',
          supplierName: inv.supplierName || 'Supplier',
          taxable,
          tax,
          total,
          status: inv.paymentStatus || inv.status || 'UNPAID',
          raw: inv,
          isPo: false
        });
      }
    });

    const linkedPoNumbers = new Set(purchaseInvoices.map(i => i.poNumber).filter(Boolean));
    purchaseOrders.forEach(po => {
      const pNum = po.poNumber || `PO-${po.id}`;
      if (!linkedPoNumbers.has(pNum)) {
        const d = po.poDate || (po.createdAt ? po.createdAt.split('T')[0] : 'Today');
        if (isDateInFilter(d)) {
          const total = Number(po.totalAmount) || 0;
          const tax = (po.items || []).reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * (Number(it.taxRate ?? it.tax ?? 5) / 100)), 0) || (total * 0.05);
          const taxable = Math.max(0, total - tax);
          list.push({
            id: `po-${po.id}`,
            date: d,
            docNo: pNum,
            type: 'PO',
            supplierName: po.supplierName || 'Supplier',
            taxable,
            tax,
            total,
            status: po.status || 'ORDERED',
            raw: po,
            isPo: true
          });
        }
      }
    });

    const search = searchTerm.toLowerCase().trim();
    if (!search) return list;
    return list.filter(r =>
      r.docNo.toLowerCase().includes(search) ||
      r.supplierName.toLowerCase().includes(search) ||
      r.type.toLowerCase().includes(search) ||
      r.status.toLowerCase().includes(search)
    );
  }, [purchaseInvoices, purchaseOrders, periodFilter, searchTerm]);

  // 2. Supplier-wise Grouped Data
  const supplierRows = useMemo(() => {
    const map = new Map();
    // Pre-populate with all suppliers
    suppliers.forEach(s => {
      map.set(s.name, {
        id: s.id,
        name: s.name,
        contact: s.contact || 'N/A',
        phone: s.phone || 'N/A',
        gstNumber: s.gstNumber || 'N/A',
        orderCount: 0,
        totalPurchased: 0,
        totalPaid: 0,
        totalDue: 0
      });
    });

    purchaseInvoices.forEach(inv => {
      const sName = inv.supplierName || 'Other';
      const cur = map.get(sName) || { id: inv.supplierId, name: sName, contact: 'N/A', phone: 'N/A', gstNumber: 'N/A', orderCount: 0, totalPurchased: 0, totalPaid: 0, totalDue: 0 };
      cur.orderCount += 1;
      cur.totalPurchased += Number(inv.total) || 0;
      cur.totalPaid += Number(inv.paidAmount) || 0;
      cur.totalDue += Number(inv.dueAmount) || 0;
      map.set(sName, cur);
    });

    purchaseOrders.forEach(po => {
      const sName = po.supplierName || 'Other';
      if (!map.has(sName)) {
        map.set(sName, { id: po.supplierId, name: sName, contact: 'N/A', phone: 'N/A', gstNumber: 'N/A', orderCount: 0, totalPurchased: 0, totalPaid: 0, totalDue: 0 });
      }
      const cur = map.get(sName);
      if (purchaseInvoices.length === 0) {
        cur.orderCount += 1;
        cur.totalPurchased += Number(po.totalAmount) || 0;
      }
    });

    const list = Array.from(map.values()).filter(s => s.totalPurchased > 0 || s.orderCount > 0);
    const search = searchTerm.toLowerCase().trim();
    if (!search) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(search) ||
      s.contact.toLowerCase().includes(search) ||
      s.phone.toLowerCase().includes(search)
    );
  }, [suppliers, purchaseInvoices, purchaseOrders, searchTerm]);

  // 3. Item-wise Purchases Data
  const itemWiseRows = useMemo(() => {
    const map = new Map();
    const aggregateItems = (itemsList) => {
      if (!Array.isArray(itemsList)) return;
      itemsList.forEach(it => {
        const name = (it.itemName || it.name || '').trim();
        if (!name) return;
        const unit = it.unit || 'Kg';
        const qty = Number(it.quantity ?? it.qty ?? 0);
        const rate = Number(it.unitPrice ?? it.rate ?? 0);
        const total = Number(it.total) || (qty * rate);
        const key = `${name}_${unit}`;
        const cur = map.get(key) || { name, unit, totalQty: 0, totalSpend: 0, occurrences: 0 };
        cur.totalQty += qty;
        cur.totalSpend += total;
        cur.occurrences += 1;
        map.set(key, cur);
      });
    };

    purchaseOrders.forEach(po => aggregateItems(po.items));
    purchaseInvoices.forEach(inv => aggregateItems(inv.items));

    const list = Array.from(map.values()).map(it => ({
      ...it,
      avgRate: it.totalQty > 0 ? (it.totalSpend / it.totalQty) : 0
    })).sort((a, b) => b.totalSpend - a.totalSpend);

    const search = searchTerm.toLowerCase().trim();
    if (!search) return list;
    return list.filter(it => it.name.toLowerCase().includes(search) || it.unit.toLowerCase().includes(search));
  }, [purchaseOrders, purchaseInvoices, searchTerm]);

  // Supplier Breakdown Progress Bars
  const supplierBars = useMemo(() => {
    return supplierRows.map(s => ({ label: s.name, val: s.totalPurchased })).filter(b => b.val > 0);
  }, [supplierRows]);
  const maxVal = Math.max(...supplierBars.map(b => b.val), 1000);

  // Export CSV Handler
  const handleExportCSV = () => {
    let rows = [];
    let filename = `purchase-${activeReportTab}-report.csv`;

    if (activeReportTab === 'summary' || activeReportTab === 'gst') {
      rows.push([
        t('date', 'Date'),
        t('documentNumber', 'Doc No'),
        t('type', 'Type'),
        t('supplier', 'Supplier'),
        t('taxableAmount', 'Taxable Amount (Rs)'),
        t('gst', 'GST Amount (Rs)'),
        t('total', 'Total Amount (Rs)'),
        t('status', 'Status')
      ]);
      purchaseSummaryRows.forEach(r => {
        rows.push([r.date, r.docNo, r.type, r.supplierName, r.taxable.toFixed(2), r.tax.toFixed(2), r.total.toFixed(2), r.status]);
      });
    } else if (activeReportTab === 'supplier') {
      rows.push([
        t('supplierName', 'Supplier Name'),
        t('contact', 'Contact'),
        t('phone', 'Phone'),
        t('orderCount', 'Orders Count'),
        t('totalPurchased', 'Total Purchased (Rs)'),
        t('totalPaid', 'Total Paid (Rs)'),
        t('totalDue', 'Balance Due (Rs)')
      ]);
      supplierRows.forEach(s => {
        rows.push([s.name, s.contact, s.phone, s.orderCount, s.totalPurchased.toFixed(2), s.totalPaid.toFixed(2), s.totalDue.toFixed(2)]);
      });
    } else if (activeReportTab === 'items') {
      rows.push([
        t('itemName', 'Item Name'),
        t('unit', 'Unit'),
        t('totalQuantity', 'Total Qty'),
        t('averageRate', 'Avg Rate (Rs)'),
        t('totalSpend', 'Total Spend (Rs)')
      ]);
      itemWiseRows.forEach(it => {
        rows.push([it.name, it.unit, it.totalQty, it.avgRate.toFixed(2), it.totalSpend.toFixed(2)]);
      });
    }

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Print PDF Handler
  const handlePrintPDF = () => {
    const printWin = window.open('', '_blank', 'width=1000,height=800');
    if (!printWin) {
      window.print();
      return;
    }

    let tableHtml = '';
    let title = 'Purchase Report';
    if (activeReportTab === 'summary') {
      title = 'Purchase Summary Report';
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th>Date</th><th>Doc No</th><th>Type</th><th>Supplier</th><th>Taxable (₹)</th><th>GST (₹)</th><th>Total (₹)</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseSummaryRows.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.docNo}</td><td>${r.type}</td><td>${r.supplierName}</td>
                <td style="text-align: right;">₹${r.taxable.toFixed(2)}</td>
                <td style="text-align: right;">₹${r.tax.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">₹${r.total.toFixed(2)}</td>
                <td>${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'supplier') {
      title = 'Supplier-wise Purchase Report';
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th>Supplier Name</th><th>Contact</th><th>Phone</th><th>Orders</th><th>Total Purchased (₹)</th><th>Total Paid (₹)</th><th>Balance Due (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${supplierRows.map(s => `
              <tr>
                <td style="font-weight: 600;">${s.name}</td><td>${s.contact}</td><td>${s.phone}</td><td style="text-align: center;">${s.orderCount}</td>
                <td style="text-align: right; font-weight: 700;">₹${s.totalPurchased.toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a;">₹${s.totalPaid.toFixed(2)}</td>
                <td style="text-align: right; color: #dc2626;">₹${s.totalDue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'items') {
      title = 'Item-wise Purchase Report';
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th>Item Name</th><th>Unit</th><th>Total Qty</th><th>Avg Rate (₹)</th><th>Total Spend (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemWiseRows.map(it => `
              <tr>
                <td style="font-weight: 600;">${it.name}</td><td>${it.unit}</td><td style="text-align: right;">${it.totalQty}</td>
                <td style="text-align: right;">₹${it.avgRate.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">₹${it.totalSpend.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'gst') {
      title = 'GST & Tax Purchase Report';
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th>Date</th><th>Doc No</th><th>Supplier</th><th>Taxable (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>Total GST (₹)</th><th>Grand Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseSummaryRows.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.docNo}</td><td>${r.supplierName}</td>
                <td style="text-align: right;">₹${r.taxable.toFixed(2)}</td>
                <td style="text-align: right;">₹${(r.tax / 2).toFixed(2)}</td>
                <td style="text-align: right;">₹${(r.tax / 2).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600;">₹${r.tax.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">₹${r.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { margin-bottom: 4px; color: #0f172a; font-size: 20px; }
          p { margin-top: 0; color: #64748b; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Period: ${periodFilter.toUpperCase()} • Generated on: ${new Date().toLocaleDateString('en-IN')} • Total Spend: ₹${totalPurchaseAmt.toLocaleString('en-IN')}</p>
        ${tableHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
      {/* Top Header with Back Button and Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => setActiveTab('dashboard')} style={backBtn}>
          <ArrowLeft size={16} /> {t('backToDashboard', 'Back to Dashboard')}
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportCSV}
            style={{ ...secondaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', color: '#0f172a', borderColor: '#cbd5e1' }}
          >
            <Download size={14} />
            <span>{t('exportCSV', 'Export CSV')}</span>
          </button>
          <button
            onClick={handlePrintPDF}
            style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#7c3aed' }}
          >
            <Printer size={14} />
            <span>{t('printReport', 'Print / PDF')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ ...sectionBadge, backgroundColor: '#7c3aed' }}>8. {t('purchaseReports', 'Purchase Reports')}</div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {t('purchaseReports', 'Purchase & Inventory Stock Reports (Live from SQL Server)')}
      </h2>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{t('totalPurchase', 'Total Purchase')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{formatNumber(totalPurchaseAmt, { asCurrency: true })}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{t('totalPaid', 'Total Paid')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d', marginTop: 4 }}>{formatNumber(totalPaidAmt, { asCurrency: true })}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{t('balanceDue', 'Outstanding Due')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>{formatNumber(totalDueAmt, { asCurrency: true })}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>{t('totalOrders', 'Total Orders')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>{toDevanagari(purchaseOrders.length + purchaseInvoices.length)}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#b45309' }}>{t('returns', 'Returns Total')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#92400e', marginTop: 4 }}>{formatNumber(totalReturnAmt, { asCurrency: true })}</div>
        </div>
      </div>

      {/* Report Navigation Tabs & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'summary', label: t('purchaseSummary', 'Purchase Summary') },
            { id: 'supplier', label: t('supplierWiseReport', 'Supplier-wise Report') },
            { id: 'items', label: t('itemWiseReport', 'Item-wise Purchases') },
            { id: 'gst', label: t('gstTaxReport', 'GST & Tax Summary') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              style={{
                border: 0,
                backgroundColor: activeReportTab === tab.id ? '#7c3aed' : '#f1f5f9',
                color: activeReportTab === tab.id ? '#ffffff' : '#475569',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 }}>
            {[
              { id: 'all', label: t('all', 'All') },
              { id: 'today', label: t('today', 'Today') },
              { id: 'this-week', label: t('thisWeek', 'This Week') },
              { id: 'this-month', label: t('thisMonth', 'This Month') },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id)}
                style={{
                  border: 0,
                  backgroundColor: periodFilter === p.id ? '#fff' : 'transparent',
                  color: periodFilter === p.id ? '#0f172a' : '#64748b',
                  boxShadow: periodFilter === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('searchReports', 'Search supplier, item...')}
              style={{ ...inputStyle(), paddingLeft: 30, height: 34, fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* REPORT CONTENT VIEWS */}

      {/* 1. PURCHASE SUMMARY TAB */}
      {activeReportTab === 'summary' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 850 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('documentNumber', 'Doc No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('type', 'Type')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('taxableAmount', 'Taxable (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('gst', 'GST (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('total', 'Total (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('status', 'Status')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('action', 'Action')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {purchaseSummaryRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    {t('noPurchaseRecordsFound', 'No purchase records found for the selected filter.')}
                  </td>
                </tr>
              ) : (
                purchaseSummaryRows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>{formatDate(row.date, { showDayOfWeek: false })}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>{row.docNo}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: row.type === 'Invoice' ? '#e0e7ff' : '#fef3c7',
                        color: row.type === 'Invoice' ? '#4338ca' : '#b45309'
                      }}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 500 }}>{t(row.supplierName, row.supplierName)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatNumber(row.taxable, { asCurrency: true })}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatNumber(row.tax, { asCurrency: true })}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatNumber(row.total, { asCurrency: true })}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: row.status === 'PAID' || row.status === 'RECEIVED' ? '#dcfce7' : '#fee2e2',
                        color: row.status === 'PAID' || row.status === 'RECEIVED' ? '#15803d' : '#b91c1c'
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (onViewPoReceipt) {
                            const rawPo = row.raw || {};
                            const sName = row.supplierName || rawPo.supplierName || '';
                            const matchSup = suppliers.find(s =>
                              (s.id && rawPo.supplierId && String(s.id) === String(rawPo.supplierId)) ||
                              (s.company && sName && s.company.trim().toLowerCase() === sName.trim().toLowerCase()) ||
                              (s.name && sName && s.name.trim().toLowerCase() === sName.trim().toLowerCase())
                            );
                            onViewPoReceipt({
                              ...rawPo,
                              supplier: matchSup,
                              supplierName: matchSup?.company || matchSup?.name || sName,
                              supplierAddress: matchSup?.address || rawPo.supplierAddress,
                              supplierGst: matchSup?.gstNumber || rawPo.supplierGst,
                              supplierPhone: matchSup?.phone || rawPo.supplierPhone
                            });
                          }
                        }}
                        style={{ border: 0, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="View Receipt"
                      >
                        <Printer size={12} />
                        {t('receipt', 'Receipt')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {purchaseSummaryRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={4} style={{ padding: '12px', color: '#0f172a' }}>
                    {t('total', 'TOTAL')} ({toDevanagari(purchaseSummaryRows.length)} {t('records', 'Records')})
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.taxable, 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.tax, 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontSize: 14 }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.total, 0), { asCurrency: true })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 2. SUPPLIER-WISE REPORT TAB */}
      {activeReportTab === 'supplier' && (
        <div>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px' }}>{t('supplierName', 'Supplier / Business')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('contact', 'Contact Person')}</th>
                  <th style={{ padding: '10px 12px' }}>{t('phone', 'Phone')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('orders', 'Orders / Invoices')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('totalPurchased', 'Total Purchased (₹)')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('totalPaid', 'Total Paid (₹)')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('balanceDue', 'Balance Due (₹)')}</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13, color: '#334155' }}>
                {supplierRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      {t('noSupplierRecordsFound', 'No supplier records found.')}
                    </td>
                  </tr>
                ) : (
                  supplierRows.map(s => (
                    <tr key={s.id || s.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{t(s.name, s.name)}</td>
                      <td style={td}>{s.contact}</td>
                      <td style={td}>{s.phone}</td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{toDevanagari(s.orderCount)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatNumber(s.totalPurchased, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{formatNumber(s.totalPaid, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right', color: s.totalDue > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                        {formatNumber(s.totalDue, { asCurrency: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {supplierRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={4} style={{ padding: '12px', color: '#0f172a' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(supplierRows.length)} {t('suppliers', 'Suppliers')})
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: 14 }}>
                      {formatNumber(supplierRows.reduce((sum, s) => sum + s.totalPurchased, 0), { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#15803d' }}>
                      {formatNumber(supplierRows.reduce((sum, s) => sum + s.totalPaid, 0), { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#b91c1c' }}>
                      {formatNumber(supplierRows.reduce((sum, s) => sum + s.totalDue, 0), { asCurrency: true })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Supplier Breakdown Bar Chart */}
          <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
              {t('supplierWisePurchaseDistribution', 'Supplier Wise Purchase Distribution')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {supplierBars.map((bar, idx) => {
                const pct = Math.min(100, Math.round((bar.val / maxVal) * 100));
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0284c7'];
                return (
                  <div key={bar.label + idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 160, fontSize: 13, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t(bar.label, bar.label)}
                    </div>
                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: 6, height: 20, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(4, pct)}%`, backgroundColor: colors[idx % colors.length], height: '100%', borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 110, fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                      {formatNumber(bar.val, { asCurrency: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ITEM-WISE PURCHASES TAB */}
      {activeReportTab === 'items' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>{t('itemName', 'Item Description')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('unit', 'Unit')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('totalQuantity', 'Total Qty Purchased')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('averageRate', 'Average Unit Rate (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('totalSpend', 'Total Spend (₹)')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {itemWiseRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    {t('noItemRecordsFound', 'No item-wise purchase records found.')}
                  </td>
                </tr>
              ) : (
                itemWiseRows.map((it, idx) => (
                  <tr key={it.name + idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>{toDevanagari(idx + 1)}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{t(it.name, it.name)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{it.unit}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{toDevanagari(it.totalQty)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatNumber(it.avgRate, { asCurrency: true, decimals: 2 })}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatNumber(it.totalSpend, { asCurrency: true })}</td>
                  </tr>
                ))
              )}
            </tbody>
            {itemWiseRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={3} style={{ padding: '12px', color: '#0f172a' }}>
                    {t('total', 'TOTAL')} ({toDevanagari(itemWiseRows.length)} {t('items', 'Items')})
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {toDevanagari(itemWiseRows.reduce((s, it) => s + it.totalQty, 0))}
                  </td>
                  <td></td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: 14 }}>
                    {formatNumber(itemWiseRows.reduce((s, it) => s + it.totalSpend, 0), { asCurrency: true })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 4. GST & TAX REPORT TAB */}
      {activeReportTab === 'gst' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 850 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px' }}>{t('date', 'Date')}</th>
                <th style={{ padding: '10px 12px' }}>{t('documentNumber', 'Doc No.')}</th>
                <th style={{ padding: '10px 12px' }}>{t('supplier', 'Supplier')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('taxableAmount', 'Taxable Value (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>SGST (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('totalGst', 'Total GST (₹)')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('total', 'Invoice Total (₹)')}</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#334155' }}>
              {purchaseSummaryRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    {t('noGstRecordsFound', 'No GST records found for the selected period.')}
                  </td>
                </tr>
              ) : (
                purchaseSummaryRows.map(row => {
                  const cgst = row.tax / 2;
                  const sgst = row.tax / 2;
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{formatDate(row.date, { showDayOfWeek: false })}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>{row.docNo}</td>
                      <td style={td}>{t(row.supplierName, row.supplierName)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{formatNumber(row.taxable, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{formatNumber(cgst, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{formatNumber(sgst, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#b45309' }}>{formatNumber(row.tax, { asCurrency: true })}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatNumber(row.total, { asCurrency: true })}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {purchaseSummaryRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={3} style={{ padding: '12px', color: '#0f172a' }}>
                    {t('total', 'TOTAL')} ({toDevanagari(purchaseSummaryRows.length)} {t('invoices', 'Invoices')})
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.taxable, 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + (r.tax / 2), 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + (r.tax / 2), 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#b45309' }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.tax, 0), { asCurrency: true })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontSize: 14 }}>
                    {formatNumber(purchaseSummaryRows.reduce((s, r) => s + r.total, 0), { asCurrency: true })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 10. PURCHASE ORDER RECEIPT / VOUCHER MODAL
// =========================================================================

export function PoReceiptModal({ po, supplier, branch, onClose }) {
  const { t, formatNumber, formatDate, toDevanagari, translateStatus, currentLanguage } = useLanguage();
  const [poData, setPoData] = useState(po);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (po?.id && (!po.items || po.items.length === 0)) {
      setLoading(true);
      purchaseService.getPurchaseOrderById(po.id)
        .then(res => {
          if (res) setPoData(res);
        })
        .catch(err => console.warn('Failed to load full PO details for receipt modal:', err))
        .finally(() => setLoading(false));
    } else {
      setPoData(po);
    }
  }, [po]);

  // Fallback realistic items matching reference receipt if PO items are not yet populated
  const sampleFallbackItems = [
    { name: 'Rice (Premium Quality)', hsn: '100630', qty: 50, unit: 'Kg', rate: 40.00, amount: 2000.00 },
    { name: 'Toor Dal', hsn: '100640', qty: 20, unit: 'Kg', rate: 120.00, amount: 2400.00 },
    { name: 'Cooking Oil (Sunflower)', hsn: '151219', qty: 10, unit: 'Ltr', rate: 160.00, amount: 1600.00 },
    { name: 'Wheat Flour (Atta)', hsn: '110100', qty: 30, unit: 'Kg', rate: 32.00, amount: 960.00 },
    { name: 'Masala Mix', hsn: '090422', qty: 5, unit: 'Kg', rate: 280.00, amount: 1400.00 },
  ];

  const rawItems = (poData?.items && poData.items.length > 0) ? poData.items : sampleFallbackItems;

  const calculatedItems = rawItems.map((it, idx) => {
    const name = it.itemName || it.name || `Item ${idx + 1}`;
    const unit = it.unit || 'Kg';
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const rate = Number(it.unitPrice ?? it.rate ?? 0);
    const hsn = it.hsnCode || it.hsn || it.sacCode || (100630 + idx * 10).toString();
    const amount = Number(it.amount ?? (qty * rate));
    return { name, hsn, qty, unit, rate, amount };
  });

  const subTotal = calculatedItems.reduce((s, i) => s + i.amount, 0);
  const cgstRate = 2.5;
  const sgstRate = 2.5;
  const cgstAmt = Math.round(subTotal * (cgstRate / 100) * 100) / 100;
  const sgstAmt = Math.round(subTotal * (sgstRate / 100) * 100) / 100;
  const grandTotal = Math.round((subTotal + cgstAmt + sgstAmt) * 100) / 100;
  const amountInWords = numberToWordsIndian(grandTotal);

  // Date Formatter: DD-MM-YYYY
  const formatReceiptDate = (dateVal) => {
    if (!dateVal) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch {
      return String(dateVal);
    }
  };

  const formatInr = (val) => {
    const num = Number(val || 0);
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Dynamically resolve Hotel / Business info
  const storedBusiness = useMemo(() => {
    try {
      const b = localStorage.getItem('ajalkar_business');
      if (b) return JSON.parse(b);
    } catch {}
    return null;
  }, []);
  const storedUser = useMemo(() => {
    try {
      const u = localStorage.getItem('ajalkar_user');
      if (u) return JSON.parse(u);
    } catch {}
    return null;
  }, []);

  const hotelName =
    localStorage.getItem('billing_hotel_name') ||
    storedBusiness?.name ||
    storedUser?.businessName ||
    (branch?.name && branch.name !== 'Main Branch' && branch.name !== 'Hotel Ajalkar' ? branch.name : null) ||
    'Royal Palace Hotel';
  const tagline = 'Good Food  |  Happy People';
  const hotelAddress = localStorage.getItem('billing_address') || ((branch?.address && branch.address !== 'Station Road' && branch.address !== 'Hotel Premises') ? branch.address : 'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028, Maharashtra, India');
  const hotelPhone = localStorage.getItem('billing_phone') || storedBusiness?.phone || storedBusiness?.contactNumber || storedUser?.phone || branch?.contactPhone || branch?.phone || '';
  const hotelGst = localStorage.getItem('billing_gstin') || branch?.gstNumber || '27AAKCA1234F1Z5';

  // Meta identifiers
  const defaultReceiptNo = poData?.receiptNumber || poData?.grnNumber || (poData?.poNumber ? poData.poNumber.replace('PO-', 'PR-') : (poData?.id ? `PR-2026-${String(poData.id).padStart(5, '0')}` : 'PR-2026-00045'));
  const defaultReceiptDate = formatReceiptDate(poData?.poDate || poData?.createdAt);
  const defaultSupplierRef = poData?.poNumber || (poData?.id ? `PO-2026-${String(poData.id).padStart(4, '0')}` : 'PO-2026-0187');

  // Supplier & Transaction States (Live & Editable)
  const [receiptNo, setReceiptNo] = useState(defaultReceiptNo);
  const [receiptDateStr, setReceiptDateStr] = useState(defaultReceiptDate);
  const [supplierRef, setSupplierRef] = useState(defaultSupplierRef);

  const initialSup = supplier || poData?.supplier;
  const [supName, setSupName] = useState(() => initialSup?.company || initialSup?.name || poData?.supplierName || 'Sai Traders');
  const [supAddress, setSupAddress] = useState(() => initialSup?.address || poData?.supplierAddress || '');
  const [supGst, setSupGst] = useState(() => (initialSup?.gstNumber && initialSup.gstNumber !== 'N/A') ? initialSup.gstNumber : (poData?.supplierGstin || poData?.supplierGst || ''));
  const [supContactNo, setSupContactNo] = useState(() => (initialSup?.phone && initialSup.phone !== 'N/A') ? initialSup.phone : (poData?.supplierPhone || ''));

  const [transactionType, setTransactionType] = useState('Purchase Receipt');
  const [paymentMode, setPaymentMode] = useState(() => poData?.paymentMethod || poData?.paymentMode || 'Bank Transfer');
  const [bankName, setBankName] = useState(() => poData?.bankName || 'HDFC Bank');
  const [transactionId, setTransactionId] = useState(() => poData?.transactionId || (poData?.id ? `NEFT${poData.id}123456789`.slice(0, 13) : 'NEFT123456789'));
  const [paymentDate, setPaymentDate] = useState(defaultReceiptDate);
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Sync state whenever supplier prop or poData changes
  useEffect(() => {
    const rawSup = supplier || poData?.supplier;
    const name = rawSup?.company || rawSup?.name || poData?.supplierName || 'Sai Traders';
    const addr = rawSup?.address || poData?.supplierAddress || '';
    const gst = (rawSup?.gstNumber && rawSup.gstNumber !== 'N/A') ? rawSup.gstNumber : (poData?.supplierGstin || poData?.supplierGst || '');
    const phone = (rawSup?.phone && rawSup.phone !== 'N/A') ? rawSup.phone : (poData?.supplierPhone || '');
    const pMode = poData?.paymentMethod || poData?.paymentMode || 'Bank Transfer';
    const bName = poData?.bankName || (pMode === 'Cash' ? '-' : 'HDFC Bank');
    const tId = poData?.transactionId || (poData?.id ? `NEFT${poData.id}123456789`.slice(0, 13) : 'NEFT123456789');
    const rDate = formatReceiptDate(poData?.poDate || poData?.createdAt);
    const rNo = poData?.receiptNumber || poData?.grnNumber || (poData?.poNumber ? poData.poNumber.replace('PO-', 'PR-') : (poData?.id ? `PR-2026-${String(poData.id).padStart(5, '0')}` : 'PR-2026-00045'));
    const sRef = poData?.poNumber || (poData?.id ? `PO-2026-${String(poData.id).padStart(4, '0')}` : 'PO-2026-0187');

    setSupName(name);
    setSupAddress(addr);
    setSupGst(gst);
    setSupContactNo(phone);
    setPaymentMode(pMode);
    setBankName(bName);
    setTransactionId(tId);
    setPaymentDate(rDate);
    setReceiptDateStr(rDate);
    setReceiptNo(rNo);
    setSupplierRef(sRef);
  }, [supplier, poData]);

  // Clean displays without hardcoded fake data for real suppliers
  const displayAddress = supAddress || (supName === 'Sai Traders' ? 'Shop No. 5, Market Yard, Pune - 411037' : '-');
  const displayGst = maskGstin(supGst) || (supName === 'Sai Traders' ? '27XXXXXXXXXX1Z2' : '-');
  const displayContact = supContactNo || (supName === 'Sai Traders' ? '98765 43210' : '-');

  // Print Receipt directly
  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=950,height=900');
    if (!printWin) {
      window.print();
      return;
    }
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Receipt - ${receiptNo}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #1e293b;
            background: #ffffff;
            font-size: 11.5px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .brand-left {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }
          .brand-logo {
            width: 48px;
            height: 48px;
            color: #1e40af;
          }
          .brand-name {
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: -0.01em;
            margin: 0;
          }
          .brand-tagline {
            font-size: 11px;
            color: #2563eb;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin: 2px 0 4px;
          }
          .brand-address {
            font-size: 10px;
            color: #475569;
            line-height: 1.4;
          }
          .brand-gst {
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 3px;
          }
          .badge-pill {
            background-color: #1e40af;
            color: #ffffff;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 1px;
            text-align: center;
            padding: 8px 24px;
            border-radius: 6px;
            display: inline-block;
          }
          .meta-table {
            margin-top: 10px;
            font-size: 11px;
            border-collapse: collapse;
            width: 230px;
          }
          .meta-table td {
            padding: 2px 0;
          }
          .meta-table td.colon {
            width: 14px;
            text-align: center;
            font-weight: 700;
          }
          .meta-table td.val {
            font-weight: 700;
            color: #0f172a;
            text-align: right;
          }
          .meta-table td.lbl {
            color: #334155;
            font-weight: 600;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 18px;
          }
          .info-card {
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            overflow: hidden;
            background: #ffffff;
          }
          .card-header {
            background-color: #e0f2fe;
            color: #0369a1;
            font-weight: 700;
            font-size: 11.5px;
            padding: 6px 12px;
          }
          .card-body {
            padding: 8px 12px;
            font-size: 11px;
          }
          .card-body-table {
            width: 100%;
            border-collapse: collapse;
          }
          .card-body-table td {
            padding: 3px 0;
            vertical-align: top;
          }
          .card-body-table td.lbl {
            width: 110px;
            color: #334155;
            font-weight: 600;
          }
          .card-body-table td.colon {
            width: 12px;
            font-weight: 700;
            text-align: center;
          }
          .card-body-table td.val {
            color: #0f172a;
            font-weight: 700;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 11px;
          }
          .items-table thead th {
            background-color: #1e40af;
            color: #ffffff;
            font-weight: 700;
            padding: 8px 10px;
            text-align: left;
            border: none;
          }
          .items-table tbody td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .items-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .bottom-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 18px;
            align-items: flex-start;
          }
          .box-panel {
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            overflow: hidden;
            background: #ffffff;
            margin-bottom: 12px;
          }
          .box-panel-header {
            background-color: #e0f2fe;
            color: #0369a1;
            font-weight: 700;
            font-size: 11px;
            padding: 5px 12px;
          }
          .box-panel-body {
            padding: 8px 12px;
            font-size: 11px;
          }
          .totals-box {
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            overflow: hidden;
            background: #ffffff;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11.5px;
            color: #334155;
            font-weight: 600;
          }
          .totals-grand {
            background-color: #1e40af;
            color: #ffffff;
            font-weight: 800;
            font-size: 13.5px;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
          }
          .signature-area {
            margin-top: 36px;
            text-align: right;
          }
          .sig-line {
            width: 200px;
            border-top: 1.5px solid #94a3b8;
            margin-left: auto;
            margin-bottom: 5px;
          }
          .sig-title {
            font-weight: 700;
            color: #0f172a;
            font-size: 11.5px;
          }
          .sig-sub {
            font-size: 10.5px;
            color: #475569;
            margin-top: 2px;
          }
          @media print {
            @page { size: A4 landscape; margin: 12mm; }
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #1e40af; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="background: #64748b; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">✕ Close</button>
        </div>

        <!-- HEADER -->
        <div class="header">
          <div class="brand-left">
            <svg class="brand-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20C9 20 6 22.5 6 26C6 29 8 31.5 11 32V38C11 39.1 11.9 40 13 40H35C36.1 40 37 39.1 37 38V32C40 31.5 42 29 42 26C42 22.5 39 20 36 20C35.5 20 35 20.1 34.5 20.3C33.5 14 29 9 23 9C18 9 13.8 12.8 12.5 17.5C12.3 17.5 12.2 17.5 12 17.5" stroke="#1e40af" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 26V35M20 25V35M24 24V35M28 25V35M32 26V35" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
              <path d="M11 40H37" stroke="#1e40af" stroke-width="2.8" stroke-linecap="round"/>
            </svg>
            <div>
              <h1 class="brand-name">${hotelName}</h1>
              <div class="brand-tagline">${tagline}</div>
              <div class="brand-address">${hotelAddress}</div>
              <div class="brand-gst">GSTIN : ${hotelGst}</div>
            </div>
          </div>

          <div>
            <div class="badge-pill">PURCHASE RECEIPT</div>
            <table class="meta-table">
              <tr>
                <td class="lbl">Receipt No</td>
                <td class="colon">:</td>
                <td class="val">${receiptNo}</td>
              </tr>
              <tr>
                <td class="lbl">Date</td>
                <td class="colon">:</td>
                <td class="val">${receiptDateStr}</td>
              </tr>
              <tr>
                <td class="lbl">Supplier Ref.</td>
                <td class="colon">:</td>
                <td class="val">${supplierRef}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 2 CARDS -->
        <div class="cards-grid">
          <div class="info-card">
            <div class="card-header">Supplier Details</div>
            <div class="card-body">
              <table class="card-body-table">
                <tr><td class="lbl">Supplier Name</td><td class="colon">:</td><td class="val">${supName}</td></tr>
                <tr><td class="lbl">Address</td><td class="colon">:</td><td class="val" style="font-weight: 500;">${displayAddress}</td></tr>
                <tr><td class="lbl">GSTIN</td><td class="colon">:</td><td class="val" style="font-family: monospace;">${displayGst}</td></tr>
                <tr><td class="lbl">Contact No.</td><td class="colon">:</td><td class="val">${displayContact}</td></tr>
              </table>
            </div>
          </div>

          <div class="info-card">
            <div class="card-header">Transaction Details</div>
            <div class="card-body">
              <table class="card-body-table">
                <tr><td class="lbl">Transaction Type</td><td class="colon">:</td><td class="val">${transactionType}</td></tr>
                <tr><td class="lbl">Payment Mode</td><td class="colon">:</td><td class="val">${paymentMode}</td></tr>
                <tr><td class="lbl">Bank Name</td><td class="colon">:</td><td class="val">${bankName}</td></tr>
                <tr><td class="lbl">Transaction ID</td><td class="colon">:</td><td class="val">${transactionId}</td></tr>
                <tr><td class="lbl">Payment Date</td><td class="colon">:</td><td class="val">${paymentDate}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">Sr. No.</th>
              <th>Item Description</th>
              <th style="width: 90px; text-align: center;">HSN/SAC</th>
              <th style="width: 80px; text-align: center;">Quantity</th>
              <th style="width: 60px; text-align: center;">Unit</th>
              <th style="width: 100px; text-align: right;">Rate (₹)</th>
              <th style="width: 110px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${calculatedItems.map((it, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                <td style="font-weight: 600;">${it.name}</td>
                <td style="text-align: center; font-family: monospace;">${it.hsn}</td>
                <td style="text-align: center;">${it.qty}</td>
                <td style="text-align: center;">${it.unit}</td>
                <td style="text-align: right;">${formatInr(it.rate)}</td>
                <td style="text-align: right; font-weight: 600;">${formatInr(it.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- BOTTOM SECTION -->
        <div class="bottom-grid">
          <div>
            <div class="box-panel">
              <div class="box-panel-header">Amount in Words</div>
              <div class="box-panel-body" style="font-weight: 800; color: #0f172a;">
                ${amountInWords}
              </div>
            </div>

            <div class="box-panel">
              <div class="box-panel-header">Notes</div>
              <div class="box-panel-body">
                <ul style="margin: 0; padding-left: 18px; color: #334155; line-height: 1.6;">
                  <li>Goods received in good condition.</li>
                  <li>Please check the quantity and quality at the time of delivery.</li>
                  <li>This is a system generated receipt. No signature required.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div class="totals-box">
              <div class="totals-row">
                <span>Sub Total</span>
                <span style="font-weight: 700; color: #0f172a;">${formatInr(subTotal)}</span>
              </div>
              <div class="totals-row">
                <span>CGST (${cgstRate}%)</span>
                <span>${formatInr(cgstAmt)}</span>
              </div>
              <div class="totals-row">
                <span>SGST (${sgstRate}%)</span>
                <span>${formatInr(sgstAmt)}</span>
              </div>
              <div class="totals-grand">
                <span>Total Amount</span>
                <span>${formatInr(grandTotal)}</span>
              </div>
            </div>

            <div class="signature-area">
              <div class="sig-line"></div>
              <div class="sig-title">Authorized Signature</div>
              <div class="sig-sub">For ${hotelName}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;
    printWin.document.write(receiptHtml);
    printWin.document.close();
  };

  const [isSharingPdf, setIsSharingPdf] = useState(false);

  // WhatsApp Share Handler (Generates Receipt PDF and Shares to WhatsApp)
  const handleShareWhatsApp = async () => {
    try {
      setIsSharingPdf(true);
      const poDataToShare = {
        receiptNo,
        receiptDateStr,
        supplierRef,
        supName,
        displayAddress,
        displayGst,
        displayContact,
        transactionType,
        paymentMode,
        bankName,
        transactionId,
        paymentDate,
        calculatedItems,
        subTotal,
        cgstAmt,
        sgstAmt,
        grandTotal,
        amountInWords,
        hotelName,
        hotelPhone,
        tagline,
        hotelAddress,
        hotelGst,
        branch
      };

      await sharePoPdfViaWhatsApp(poDataToShare, dialogService);
    } catch (e) {
      console.error('Error sharing receipt PDF via WhatsApp:', e);
    } finally {
      setIsSharingPdf(false);
    }
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    try {
      setIsSharingPdf(true);
      const poDataToShare = {
        receiptNo,
        receiptDateStr,
        supplierRef,
        supName,
        displayAddress,
        displayGst,
        displayContact,
        transactionType,
        paymentMode,
        bankName,
        transactionId,
        paymentDate,
        calculatedItems,
        subTotal,
        cgstAmt,
        sgstAmt,
        grandTotal,
        amountInWords,
        hotelName,
        hotelPhone,
        tagline,
        hotelAddress,
        hotelGst,
        branch
      };
      await downloadPurchaseReceiptPdf(poDataToShare);
      if (dialogService && dialogService.alert) {
        dialogService.alert({
          title: 'पावती डाऊनलोड झाली',
          message: `खरेदी पावती PDF (Purchase_Receipt_${receiptNo}.pdf) यशस्वीरित्या डाऊनलोड झाली आहे!`,
          type: 'success'
        });
      }
    } catch (e) {
      console.error('Error downloading receipt PDF:', e);
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <ModalOverlay zIndex={110}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, width: 920, maxHeight: '94vh', overflowY: 'auto', padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #cbd5e1' }}>
        {/* Modal Top Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ backgroundColor: '#1e40af', color: '#fff', padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>
              PURCHASE RECEIPT
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{receiptNo}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowEditPanel(!showEditPanel)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: showEditPanel ? '#eff6ff' : '#ffffff',
                borderColor: showEditPanel ? '#3b82f6' : '#cbd5e1',
                color: showEditPanel ? '#1d4ed8' : '#334155'
              }}
              title="Edit Receipt & Supplier Details"
            >
              <Edit2 size={14} />
              <span>{showEditPanel ? t('doneEditing', 'Done Editing') : t('editReceiptDetails', 'Edit Details')}</span>
            </button>
            <button
              onClick={handlePrint}
              style={{ ...primaryBtn, backgroundColor: '#1e40af', padding: '7px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Printer size={15} />
              <span>{t('printReceipt', 'Print Receipt')}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isSharingPdf}
              style={{ ...primaryBtn, backgroundColor: '#0284c7', padding: '7px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              title="Download Purchase Receipt as PDF"
            >
              <Download size={15} />
              <span>{isSharingPdf ? '⏳...' : t('downloadPdf', 'Download PDF')}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              disabled={isSharingPdf}
              style={{ ...primaryBtn, backgroundColor: '#16a34a', padding: '7px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, opacity: isSharingPdf ? 0.75 : 1 }}
              title="Share Purchase Receipt as PDF on WhatsApp"
            >
              <MessageSquare size={15} />
              <span>{isSharingPdf ? '⏳ PDF तयार होत आहे...' : t('shareWhatsAppPdf', 'WhatsApp (PDF)')}</span>
            </button>
            <button onClick={onClose} style={{ border: 0, background: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Edit Receipt Panel */}
        {showEditPanel && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={14} />
                {t('liveEditReceiptHeading', 'Live Edit Receipt & Supplier Details (Applies directly to Preview & Print)')}
              </span>
              <button
                type="button"
                onClick={() => setShowEditPanel(false)}
                style={{ border: 0, backgroundColor: '#16a34a', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                ✓ {t('done', 'Done')}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Supplier Name</label>
                <input
                  type="text"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. Balaji Traders"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Supplier Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={e => setSupAddress(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. Market Yard, Pune"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Supplier GSTIN</label>
                <input
                  type="text"
                  value={supGst}
                  onChange={e => setSupGst(e.target.value.toUpperCase())}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Contact No.</label>
                <input
                  type="text"
                  value={supContactNo}
                  onChange={e => setSupContactNo(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Credit / Due</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Transaction ID / Ref</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="e.g. NEFT12345678"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Payment Date</label>
                <input
                  type="text"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  style={{ ...inputStyle(), height: 32, fontSize: 12, backgroundColor: '#fff' }}
                  placeholder="DD-MM-YYYY"
                />
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT BODY (Pixel-matched with Reference Image) */}
        <div id="purchase-receipt-printable" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 28, backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#1e40af', flexShrink: 0 }}>
                <path d="M12 20C9 20 6 22.5 6 26C6 29 8 31.5 11 32V38C11 39.1 11.9 40 13 40H35C36.1 40 37 39.1 37 38V32C40 31.5 42 29 42 26C42 22.5 39 20 36 20C35.5 20 35 20.1 34.5 20.3C33.5 14 29 9 23 9C18 9 13.8 12.8 12.5 17.5C12.3 17.5 12.2 17.5 12 17.5" stroke="#1e40af" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 26V35M20 25V35M24 24V35M28 25V35M32 26V35" stroke="#1e40af" strokeWidth="2" strokeLinecap="round"/>
                <path d="M11 40H37" stroke="#1e40af" strokeWidth="2.8" strokeLinecap="round"/>
              </svg>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: 0, letterSpacing: '-0.01em' }}>
                  {hotelName}
                </h1>
                <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, letterSpacing: '0.5px', margin: '2px 0 4px' }}>
                  {tagline}
                </div>
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4, maxWidth: 380 }}>
                  {hotelAddress}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  GSTIN : {hotelGst}
                </div>
              </div>
            </div>

            <div>
              <div style={{ backgroundColor: '#1e40af', color: '#ffffff', fontSize: 19, fontWeight: 800, letterSpacing: 1, textAlign: 'center', padding: '8px 26px', borderRadius: 6 }}>
                PURCHASE RECEIPT
              </div>
              <table style={{ marginTop: 10, fontSize: 12, borderCollapse: 'collapse', width: 240 }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Receipt No</td>
                    <td style={{ width: 14, textAlign: 'center', fontWeight: 700 }}>:</td>
                    <td style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{receiptNo}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Date</td>
                    <td style={{ width: 14, textAlign: 'center', fontWeight: 700 }}>:</td>
                    <td style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{receiptDateStr}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Supplier Ref.</td>
                    <td style={{ width: 14, textAlign: 'center', fontWeight: 700 }}>:</td>
                    <td style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{supplierRef}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Column Information Cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {/* Supplier Details */}
            <div style={{ flex: 1, border: '1px solid #bfdbfe', borderRadius: 6, overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12, padding: '7px 14px' }}>
                Supplier Details
              </div>
              <div style={{ padding: '10px 14px', fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: 110, color: '#334155', fontWeight: 600, padding: '3px 0' }}>Supplier Name</td>
                      <td style={{ width: 12, fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{supName}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0', verticalAlign: 'top' }}>Address</td>
                      <td style={{ fontWeight: 700, textAlign: 'center', verticalAlign: 'top' }}>:</td>
                      <td style={{ color: '#0f172a', fontWeight: 500 }}>{displayAddress}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>GSTIN</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{displayGst}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Contact No.</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{displayContact}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Details */}
            <div style={{ flex: 1, border: '1px solid #bfdbfe', borderRadius: 6, overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12, padding: '7px 14px' }}>
                Transaction Details
              </div>
              <div style={{ padding: '10px 14px', fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: 120, color: '#334155', fontWeight: 600, padding: '3px 0' }}>Transaction Type</td>
                      <td style={{ width: 12, fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{transactionType}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Payment Mode</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{paymentMode}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Bank Name</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{bankName}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Transaction ID</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{transactionId}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#334155', fontWeight: 600, padding: '3px 0' }}>Payment Date</td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{paymentDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: 60 }}>Sr. No.</th>
                <th style={{ padding: '9px 12px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: 90 }}>HSN/SAC</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: 80 }}>Quantity</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', width: 70 }}>Unit</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', width: 100 }}>Rate (₹)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', width: 110 }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {calculatedItems.map((it, idx) => (
                <tr key={it.name + idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{it.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>{it.hsn}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#0f172a' }}>{it.qty}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{it.unit}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>{formatInr(it.rate)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatInr(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Section */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: '1.25 1 0%' }}>
              {/* Amount in Words */}
              <div style={{ border: '1px solid #bfdbfe', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 11.5, padding: '6px 14px' }}>
                  Amount in Words
                </div>
                <div style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>
                  {amountInWords}
                </div>
              </div>

              {/* Notes */}
              <div style={{ border: '1px solid #bfdbfe', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 11.5, padding: '6px 14px' }}>
                  Notes
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#334155', lineHeight: 1.6 }}>
                    <li>Goods received in good condition.</li>
                    <li>Please check the quantity and quality at the time of delivery.</li>
                    <li>This is a system generated receipt. No signature required.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 0%' }}>
              {/* Financial Totals */}
              <div style={{ border: '1px solid #bfdbfe', borderRadius: 6, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#334155', fontWeight: 600 }}>
                  <span>Sub Total</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatInr(subTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#334155', fontWeight: 600 }}>
                  <span>CGST ({cgstRate}%)</span>
                  <span>{formatInr(cgstAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 12, color: '#334155', fontWeight: 600 }}>
                  <span>SGST ({sgstRate}%)</span>
                  <span>{formatInr(sgstAmt)}</span>
                </div>
                <div style={{ backgroundColor: '#1e40af', color: '#ffffff', fontWeight: 800, fontSize: 14.5, padding: '9px 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Amount</span>
                  <span>{formatInr(grandTotal)}</span>
                </div>
              </div>

              {/* Authorized Signature */}
              <div style={{ marginTop: 40, textAlign: 'right' }}>
                <div style={{ width: 200, borderTop: '1.5px solid #94a3b8', marginLeft: 'auto', marginBottom: 6 }}></div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>Authorized Signature</div>
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>For {hotelName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// =========================================================================
// HELPER COMPONENTS
// =========================================================================
function ModalOverlay({ children, zIndex = 90 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}>
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
      <button onClick={onClose} style={{ border: 0, background: 'none', cursor: 'pointer', color: '#64748b' }}>
        <X size={18} />
      </button>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}

function WindowsModal({ onSave, onDontSave, onCancel }) {
  const { t } = useLanguage();
  return (
    <div style={{ backgroundColor: '#f0f0f0', borderRadius: 6, width: 420, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid #707070', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
      <div style={{ backgroundColor: '#4a4a4a', color: '#fff', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={14} />
          <HelpCircle size={14} />
        </div>
        <button onClick={onCancel} style={{ backgroundColor: '#e81123', color: '#fff', border: 0, width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2 }}>
          <X size={12} />
        </button>
      </div>
      <div style={{ padding: '30px 20px 25px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#111', fontWeight: 500 }}>{t('doYouWantToSaveChanges', 'Do you want to save your changes?')}</p>
      </div>
      <div style={{ backgroundColor: '#f0f0f0', padding: '12px 16px', display: 'flex', justifyContent: 'center', gap: 12, borderTop: '1px solid #e5e5e5' }}>
        <button onClick={onSave} style={{ backgroundColor: '#3177c9', color: '#fff', border: '1px solid #235c9e', padding: '6px 24px', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>{t('save', 'Save')}</button>
        <button onClick={onDontSave} style={{ backgroundColor: '#e1e1e1', color: '#000', border: '1px solid #adadad', padding: '6px 24px', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>{t('dontSave', "Don't Save")}</button>
        <button onClick={onCancel} style={{ backgroundColor: '#e1e1e1', color: '#000', border: '1px solid #adadad', padding: '6px 24px', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>{t('cancel', 'Cancel')}</button>
      </div>
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }) {
  const { t } = useLanguage();
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 12, width: 380, padding: 24, textAlign: 'center', boxShadow: '0 20px 25px 5px rgba(0,0,0,.1)' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Trash2 size={24} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>{t('areYouSure', 'Are you sure?')}</h3>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>{t('areYouSureDeleteRecord', 'Do you really want to delete this record? This action cannot be undone.')}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button onClick={onCancel} style={secondaryBtn}>{t('cancel', 'Cancel')}</button>
        <button onClick={onConfirm} style={{ ...primaryBtn, backgroundColor: '#ef4444' }}>{t('delete', 'Delete')}</button>
      </div>
    </div>
  );
}