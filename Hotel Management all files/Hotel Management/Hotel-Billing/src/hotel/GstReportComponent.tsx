import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { billingService } from '../services/billingService';
import { purchaseService, PurchaseInvoice } from '../services/purchaseService';
import { settingsService } from '../services/settingsService';
import { Invoice } from '../types';
import {
  Settings,
  ShoppingCart,
  Package,
  FileText,
  FileCheck,
  BarChart3,
  Layers,
  Save,
  Check,
  Eye,
  EyeOff,
  Download,
  Printer,
} from 'lucide-react';
import {
  maskGstNumber,
  isValidGstin,
  isMaskedGst,
  resolveGstForSave,
  GST_VALIDATION_MESSAGE,
} from '../common/gstUtils';

export const INDIAN_STATES = [
  'Maharashtra',
  'Andhra Pradesh',
  'Goa',
  'Gujarat',
  'Karnataka',
  'Madhya Pradesh',
  'Delhi',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Rajasthan',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Kerala',
];

export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  isInterstate: boolean;
  supplyType: 'Intra-State' | 'Inter-State';
}

/**
 * Robust GST breakdown calculator for sales invoices.
 * If explicit CGST/SGST/IGST exist, they are preserved.
 * Otherwise, determines interstate vs intrastate from customer GSTIN / state.
 */
export const getInvoiceTaxBreakdown = (
  inv: any,
  businessState: string = 'Maharashtra',
  businessGstin: string = ''
): TaxBreakdown => {
  let cgst = Number(inv.cgst || 0);
  let sgst = Number(inv.sgst || 0);
  let igst = Number(inv.igst || 0);
  const taxAmount = Number(inv.taxAmount || 0);

  if (cgst > 0 || sgst > 0 || igst > 0) {
    const isInterstate = igst > 0 && cgst === 0 && sgst === 0;
    return {
      cgst,
      sgst,
      igst,
      totalTax: Number((cgst + sgst + igst || taxAmount).toFixed(2)),
      isInterstate,
      supplyType: isInterstate ? 'Inter-State' : 'Intra-State',
    };
  }

  if (taxAmount <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      isInterstate: false,
      supplyType: 'Intra-State',
    };
  }

  const custGstin = (inv.guestGstNumber || inv.gstin || inv.customerGstin || '').trim().toUpperCase();
  const custState = (inv.customerState || inv.state || inv.billingState || '').trim();
  const bGstinPrefix = businessGstin ? businessGstin.trim().slice(0, 2) : '27';

  let isInterstate = false;
  if (inv.isInterstate === true || inv.isInterstate === 'true') {
    isInterstate = true;
  } else if (
    custGstin &&
    custGstin.length >= 2 &&
    bGstinPrefix &&
    custGstin.slice(0, 2) !== bGstinPrefix &&
    /^[0-9]{2}/.test(custGstin)
  ) {
    isInterstate = true;
  } else if (custState && businessState && custState.toLowerCase() !== businessState.toLowerCase()) {
    isInterstate = true;
  } else if (inv.igstRate && Number(inv.igstRate) > 0 && (!inv.cgstRate && !inv.sgstRate)) {
    isInterstate = true;
  }

  if (isInterstate) {
    igst = Number(taxAmount.toFixed(2));
    cgst = 0;
    sgst = 0;
  } else {
    cgst = Number((taxAmount / 2).toFixed(2));
    sgst = Number((taxAmount - cgst).toFixed(2));
    igst = 0;
  }

  return {
    cgst,
    sgst,
    igst,
    totalTax: Number((cgst + sgst + igst).toFixed(2)),
    isInterstate,
    supplyType: isInterstate ? 'Inter-State' : 'Intra-State',
  };
};

/**
 * Robust GST breakdown calculator for purchase / expense bills.
 */
export const getPurchaseTaxBreakdown = (
  pur: any,
  businessState: string = 'Maharashtra',
  businessGstin: string = ''
): TaxBreakdown => {
  let cgst = Number(pur.cgst || 0);
  let sgst = Number(pur.sgst || 0);
  let igst = Number(pur.igst || 0);
  const taxAmount = Number(pur.taxAmount || pur.tax || 0);

  if (cgst > 0 || sgst > 0 || igst > 0) {
    const isInterstate = igst > 0 && cgst === 0 && sgst === 0;
    return {
      cgst,
      sgst,
      igst,
      totalTax: Number((cgst + sgst + igst || taxAmount).toFixed(2)),
      isInterstate,
      supplyType: isInterstate ? 'Inter-State' : 'Intra-State',
    };
  }

  if (taxAmount <= 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      isInterstate: false,
      supplyType: 'Intra-State',
    };
  }

  const suppGstin = (pur.vendorGstin || pur.gstin || pur.supplierGstin || '').trim().toUpperCase();
  const suppState = (pur.supplierState || pur.state || pur.vendorState || '').trim();
  const bGstinPrefix = businessGstin ? businessGstin.trim().slice(0, 2) : '27';

  let isInterstate = false;
  if (pur.isInterstate === true || pur.isInterstate === 'true') {
    isInterstate = true;
  } else if (
    suppGstin &&
    suppGstin.length >= 2 &&
    bGstinPrefix &&
    suppGstin.slice(0, 2) !== bGstinPrefix &&
    /^[0-9]{2}/.test(suppGstin)
  ) {
    isInterstate = true;
  } else if (suppState && businessState && suppState.toLowerCase() !== businessState.toLowerCase()) {
    isInterstate = true;
  }

  if (isInterstate) {
    igst = Number(taxAmount.toFixed(2));
    cgst = 0;
    sgst = 0;
  } else {
    cgst = Number((taxAmount / 2).toFixed(2));
    sgst = Number((taxAmount - cgst).toFixed(2));
    igst = 0;
  }

  return {
    cgst,
    sgst,
    igst,
    totalTax: Number((cgst + sgst + igst).toFixed(2)),
    isInterstate,
    supplyType: isInterstate ? 'Inter-State' : 'Intra-State',
  };
};

interface GstReportComponentProps {
  onBack?: () => void;
  initialTab?: 'settings' | 'sales' | 'purchase' | 'gstr1' | 'gstr2' | 'gstr3b' | 'hsn';
}

export const GstReportComponent: React.FC<GstReportComponentProps> = ({ initialTab = 'settings' }) => {
  const navigate = useNavigate();
  const { language, t, formatNumber, formatDate, toDevanagari, translateStatus } = useLanguage();

  // Active Tab state (7 tabs from reference)
  const [activeTab, setActiveTab] = useState<
    'settings' | 'sales' | 'purchase' | 'gstr1' | 'gstr2' | 'gstr3b' | 'hsn'
  >(initialTab);

  // GST Settings Form State
  const [gstConfig, setGstConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('ajalkar_gst_config');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      gstEnabled: true,
      gstin: '',
      businessState: 'Maharashtra',
      registrationType: 'Regular',
      foodSlabRate: '5',
      cgstRate: '2.5',
      sgstRate: '2.5',
      igstRate: '5',
      hsnSac: '9963',
      taxType: 'Exclusive',
      returnPeriod: 'Monthly',
      financialYear: '2026-27',
    };
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [isEditingGstin, setIsEditingGstin] = useState(false);
  const [showUnmaskedGstin, setShowUnmaskedGstin] = useState(false);
  const [gstinError, setGstinError] = useState('');
  const [originalRawGstin, setOriginalRawGstin] = useState(() => {
    try {
      const cached = localStorage.getItem('ajalkar_gst_config');
      if (cached) {
        const p = JSON.parse(cached);
        return p.gstin || '';
      }
    } catch {}
    return '';
  });

  // Date Range state for Reports (Default to first of month to today)
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Real Database Records
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live invoices & purchases from backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, purList] = await Promise.all([
        billingService.getInvoices().catch(() => []),
        purchaseService.getPurchaseInvoices().catch(() => []),
      ]);
      setInvoices(invList || []);
      setPurchases(purList || []);
    } catch (e) {
      console.warn('Failed to load GST data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Fetch saved GST settings from backend
    settingsService
      .getSettings()
      .then((all) => {
        if (Array.isArray(all)) {
          const gstSetting = all.find((s) => s.category === 'gst' && s.settingKey === 'config');
          if (gstSetting?.settingValue) {
            try {
              const parsed = JSON.parse(gstSetting.settingValue);
              setGstConfig((prev: any) => ({ ...prev, ...parsed }));
              if (parsed.gstin) {
                setOriginalRawGstin(parsed.gstin);
              }
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    // 1. Resolve raw unmasked GSTIN
    const rawGst = resolveGstForSave(gstConfig.gstin, originalRawGstin);

    // 2. Validate format if GST is enabled or a GST number is entered
    if (gstConfig.gstEnabled || rawGst) {
      if (rawGst && !isValidGstin(rawGst)) {
        setGstinError(GST_VALIDATION_MESSAGE);
        return;
      }
    }
    setGstinError('');

    setSavingConfig(true);
    try {
      const configToSave = { ...gstConfig, gstin: rawGst };
      localStorage.setItem('ajalkar_gst_config', JSON.stringify(configToSave));
      await settingsService.saveSetting('gst', 'config', JSON.stringify(configToSave));
      setGstConfig(configToSave);
      setOriginalRawGstin(rawGst);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 3000);
    } catch (e) {
      console.warn('Error saving GST settings:', e);
    } finally {
      setSavingConfig(false);
    }
  };

  // Helper date checker within range [fromDate, toDate]
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.split('T')[0];
    if (fromDate && cleanDate < fromDate) return false;
    if (toDate && cleanDate > toDate) return false;
    return true;
  };

  // Filtered Sales Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => isDateInRange((inv as any).issueDate || inv.createdAt));
  }, [invoices, fromDate, toDate]);

  // Filtered Purchase Invoices
  const filteredPurchases = useMemo(() => {
    return purchases.filter((pur) =>
      isDateInRange(pur.invoiceDate || pur.dueDate || (pur as any).createdAt)
    );
  }, [purchases, fromDate, toDate]);

  // Sales Totals with full CGST, SGST, IGST breakdown
  const salesTotals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let gst = 0;
    let total = 0;
    let discount = 0;
    let b2bCount = 0;
    let b2cCount = 0;
    let b2bTaxable = 0;
    let b2cTaxable = 0;

    filteredInvoices.forEach((inv) => {
      const invTotal = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
      const disc = Number((inv as any).discountAmount || 0);
      const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
      const invSub = Number(inv.subtotal || invTotal - b.totalTax);
      const custGstin = (inv as any).guestGstNumber || (inv as any).gstin || '';
      const isB2B = Boolean(custGstin && isValidGstin(custGstin));

      taxable += invSub;
      cgst += b.cgst;
      sgst += b.sgst;
      igst += b.igst;
      gst += b.totalTax;
      total += invTotal;
      discount += disc;

      if (isB2B) {
        b2bCount++;
        b2bTaxable += invSub;
      } else {
        b2cCount++;
        b2cTaxable += invSub;
      }
    });

    return {
      taxable,
      cgst,
      sgst,
      igst,
      gst,
      total,
      discount,
      b2bCount,
      b2cCount,
      b2bTaxable,
      b2cTaxable,
    };
  }, [filteredInvoices, gstConfig.businessState, gstConfig.gstin]);

  // Purchase Totals with full CGST, SGST, IGST breakdown
  const purchaseTotals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let gst = 0;
    let total = 0;
    let interstateCount = 0;
    let intrastateCount = 0;

    filteredPurchases.forEach((pur) => {
      const purTotal = Number(pur.total || 0);
      const b = getPurchaseTaxBreakdown(pur, gstConfig.businessState, gstConfig.gstin);
      const purSub = Number(pur.subtotal || purTotal - b.totalTax);

      taxable += purSub;
      cgst += b.cgst;
      sgst += b.sgst;
      igst += b.igst;
      gst += b.totalTax;
      total += purTotal;

      if (b.isInterstate) {
        interstateCount++;
      } else {
        intrastateCount++;
      }
    });

    return {
      taxable,
      cgst,
      sgst,
      igst,
      gst,
      total,
      interstateCount,
      intrastateCount,
    };
  }, [filteredPurchases, gstConfig.businessState, gstConfig.gstin]);

  // GSTR-3B Computation
  const gstr3bLiability = useMemo(() => {
    const outputCgst = salesTotals.cgst;
    const outputSgst = salesTotals.sgst;
    const outputIgst = salesTotals.igst;
    const outputTax = salesTotals.gst;

    const inputCgst = purchaseTotals.cgst;
    const inputSgst = purchaseTotals.sgst;
    const inputIgst = purchaseTotals.igst;
    const inputTax = purchaseTotals.gst;

    const netCgst = outputCgst - inputCgst;
    const netSgst = outputSgst - inputSgst;
    const netIgst = outputIgst - inputIgst;
    const net = outputTax - inputTax;

    return {
      outputCgst,
      outputSgst,
      outputIgst,
      outputTax,
      inputCgst,
      inputSgst,
      inputIgst,
      inputTax,
      cgstPayable: Math.max(0, netCgst),
      sgstPayable: Math.max(0, netSgst),
      igstPayable: Math.max(0, netIgst),
      netPayable: Math.max(0, net),
      cgstCarryForward: Math.max(0, -netCgst),
      sgstCarryForward: Math.max(0, -netSgst),
      igstCarryForward: Math.max(0, -netIgst),
      itcCarryForward: Math.max(0, -net),
    };
  }, [salesTotals, purchaseTotals]);

  // HSN Summary aggregation
  const hsnSummaryData = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        desc: string;
        qty: number;
        taxable: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalGst: number;
        total: number;
      }
    >();

    filteredInvoices.forEach((inv) => {
      const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
      const items = (inv as any).items || [];
      if (items.length === 0) {
        const code = gstConfig.hsnSac || '9963';
        const desc = 'Restaurant & Food Service';
        const current = map.get(code) || {
          code,
          desc,
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalGst: 0,
          total: 0,
        };
        const total = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
        const sub = Number(inv.subtotal || total - b.totalTax);
        current.qty += 1;
        current.taxable += sub;
        current.cgst += b.cgst;
        current.sgst += b.sgst;
        current.igst += b.igst;
        current.totalGst += b.totalTax;
        current.total += total;
        map.set(code, current);
      } else {
        items.forEach((item: any) => {
          const code = item.hsnCode || item.sacCode || gstConfig.hsnSac || '9963';
          const desc = item.description || item.productName || 'Restaurant Item';
          const current = map.get(code) || {
            code,
            desc,
            qty: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalGst: 0,
            total: 0,
          };
          const qty = Number(item.quantity || 1);
          const price = Number(item.unitPrice || 0);
          const lineTaxable = qty * price;
          const taxRate = Number(item.taxRate || gstConfig.foodSlabRate || 5) / 100;
          const lineTax = lineTaxable * taxRate;

          current.qty += qty;
          current.taxable += lineTaxable;
          if (b.isInterstate) {
            current.igst += lineTax;
          } else {
            const lineCgst = Number((lineTax / 2).toFixed(2));
            current.cgst += lineCgst;
            current.sgst += Number((lineTax - lineCgst).toFixed(2));
          }
          current.totalGst += lineTax;
          current.total += lineTaxable + lineTax;
          map.set(code, current);
        });
      }
    });

    return Array.from(map.values());
  }, [filteredInvoices, gstConfig.hsnSac, gstConfig.businessState, gstConfig.gstin, gstConfig.foodSlabRate]);

  const hsnTotals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalGst = 0;
    let total = 0;
    hsnSummaryData.forEach((h) => {
      taxable += h.taxable;
      cgst += h.cgst;
      sgst += h.sgst;
      igst += h.igst;
      totalGst += h.totalGst;
      total += h.total;
    });
    return { taxable, cgst, sgst, igst, totalGst, total };
  }, [hsnSummaryData]);

  // Pagination States for all GST Reports
  const [salesPage, setSalesPage] = useState<number>(1);
  const [salesPageSize, setSalesPageSize] = useState<number>(10);

  const [purchasePage, setPurchasePage] = useState<number>(1);
  const [purchasePageSize, setPurchasePageSize] = useState<number>(10);

  const [gstr1Page, setGstr1Page] = useState<number>(1);
  const [gstr1PageSize, setGstr1PageSize] = useState<number>(10);

  const [gstr2Page, setGstr2Page] = useState<number>(1);
  const [gstr2PageSize, setGstr2PageSize] = useState<number>(10);

  const [hsnPage, setHsnPage] = useState<number>(1);
  const [hsnPageSize, setHsnPageSize] = useState<number>(10);

  // Auto-reset page numbers on date filter changes
  useEffect(() => {
    setSalesPage(1);
    setPurchasePage(1);
    setGstr1Page(1);
    setGstr2Page(1);
    setHsnPage(1);
  }, [fromDate, toDate]);

  // Memoized Paginated Slices
  const paginatedSalesInvoices = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return filteredInvoices.slice(start, start + salesPageSize);
  }, [filteredInvoices, salesPage, salesPageSize]);

  const paginatedPurchases = useMemo(() => {
    const start = (purchasePage - 1) * purchasePageSize;
    return filteredPurchases.slice(start, start + purchasePageSize);
  }, [filteredPurchases, purchasePage, purchasePageSize]);

  const paginatedGstr1Invoices = useMemo(() => {
    const start = (gstr1Page - 1) * gstr1PageSize;
    return filteredInvoices.slice(start, start + gstr1PageSize);
  }, [filteredInvoices, gstr1Page, gstr1PageSize]);

  const paginatedGstr2Purchases = useMemo(() => {
    const start = (gstr2Page - 1) * gstr2PageSize;
    return filteredPurchases.slice(start, start + gstr2PageSize);
  }, [filteredPurchases, gstr2Page, gstr2PageSize]);

  const paginatedHsnData = useMemo(() => {
    const start = (hsnPage - 1) * hsnPageSize;
    return hsnSummaryData.slice(start, start + hsnPageSize);
  }, [hsnSummaryData, hsnPage, hsnPageSize]);

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    pageSize: number,
    onPageChange: (p: number) => void,
    onPageSizeChange?: (s: number) => void,
    itemLabel: string = "records"
  ) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    };

    return (
      <div
        className="gst-pagination-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          borderRadius: '0 0 10px 10px',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.84rem',
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span>
            {t('showing', 'Showing')}{' '}
            <strong style={{ color: '#0F172A' }}>{toDevanagari(startItem)}</strong> -{' '}
            <strong style={{ color: '#0F172A' }}>{toDevanagari(endItem)}</strong> {t('of', 'of')}{' '}
            <strong style={{ color: '#0F172A' }}>{toDevanagari(totalItems)}</strong> {itemLabel}
          </span>

          {onPageSizeChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('rowsPerPage', 'Rows:')}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {toDevanagari(size)}
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
            onClick={() => onPageChange(1)}
            title={t('firstPage', 'First Page')}
            style={{
              padding: '5px 9px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
              color: currentPage === 1 ? '#94A3B8' : '#334155',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            ««
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            title={t('previousPage', 'Previous Page')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
              color: currentPage === 1 ? '#94A3B8' : '#334155',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          >
            « {t('prev', 'Prev')}
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={'ellipsis-' + idx} style={{ padding: '0 6px', color: '#94A3B8' }}>
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(Number(p))}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: currentPage === p ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                  backgroundColor: currentPage === p ? '#0F766E' : '#FFFFFF',
                  color: currentPage === p ? '#FFFFFF' : '#0F172A',
                  fontWeight: currentPage === p ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {toDevanagari(p)}
              </button>
            )
          )}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title={t('nextPage', 'Next Page')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: currentPage === totalPages ? '#F1F5F9' : '#FFFFFF',
              color: currentPage === totalPages ? '#94A3B8' : '#334155',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          >
            {t('next', 'Next')} »
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            title={t('lastPage', 'Last Page')}
            style={{
              padding: '5px 9px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: currentPage === totalPages ? '#F1F5F9' : '#FFFFFF',
              color: currentPage === totalPages ? '#94A3B8' : '#334155',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            »»
          </button>
        </div>
      </div>
    );
  };

  // Tab Definitions matching the user's requirements
  const TABS = [
    { id: 'settings', label: t('gstSettingsTab', 'GST Settings'), icon: <Settings size={15} /> },
    { id: 'sales', label: t('salesReportTab', 'Sales Report'), icon: <ShoppingCart size={15} /> },
    { id: 'purchase', label: t('purchaseReportTab', 'Purchase Report'), icon: <Package size={15} /> },
    { id: 'gstr1', label: t('gstr1ReportTab', 'GSTR-1 Report'), icon: <FileText size={15} /> },
    { id: 'gstr2', label: t('gstr2ReportTab', 'GSTR-2 Report'), icon: <FileCheck size={15} /> },
    { id: 'gstr3b', label: t('gstr3bReportTab', 'GSTR-3B Report'), icon: <BarChart3 size={15} /> },
    { id: 'hsn', label: t('hsnSummaryReportTab', 'HSN Summary Report'), icon: <Layers size={15} /> },
  ] as const;

  // CSV Export Handler for Active GST Tab with complete CGST, SGST, IGST columns
  const handleExportCSV = () => {
    let filename = `GST_${activeTab.toUpperCase()}_Report_${fromDate || 'all'}_to_${toDate || 'all'}.csv`;
    const rows: (string | number)[][] = [];

    if (activeTab === 'sales' || activeTab === 'gstr1') {
      rows.push([activeTab === 'gstr1' ? 'GSTR-1 OUTWARD SUPPLIES RETURN' : 'GST SALES REGISTER REPORT']);
      rows.push(['Period:', `${fromDate} to ${toDate}`]);
      rows.push(['GSTIN:', gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Unregistered / B2C']);
      rows.push(['Business State:', gstConfig.businessState]);
      rows.push(['Generated On:', new Date().toLocaleString()]);
      rows.push([]);
      rows.push([
        'Invoice Number',
        'Date',
        'Customer Name',
        'Customer GSTIN',
        'Supply Type',
        'Taxable Amount (Rs.)',
        'CGST (Rs.)',
        'SGST (Rs.)',
        'IGST (Rs.)',
        'Total GST (Rs.)',
        'Grand Total (Rs.)',
        'Payment Method',
        'Status',
      ]);

      filteredInvoices.forEach((inv) => {
        const invTotal = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
        const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
        const invSub = Number(inv.subtotal || invTotal - b.totalTax);
        const invDate = ((inv as any).issueDate || inv.createdAt || '').split('T')[0];
        const custName = (inv as any).guestName || (inv as any).customerName || 'Walk-in Guest';
        const custGst = (inv as any).guestGstNumber || (inv as any).gstin || 'B2C';

        rows.push([
          inv.invoiceNumber || String((inv as any).id || ''),
          invDate,
          custName,
          custGst,
          b.supplyType,
          invSub.toFixed(2),
          b.cgst.toFixed(2),
          b.sgst.toFixed(2),
          b.igst.toFixed(2),
          b.totalTax.toFixed(2),
          invTotal.toFixed(2),
          (inv as any).paymentMethod || (inv as any).paymentMode || 'Cash',
          inv.status || 'PAID',
        ]);
      });

      rows.push([]);
      rows.push([
        `TOTAL (${filteredInvoices.length} Invoices)`,
        '-',
        '-',
        '-',
        '-',
        salesTotals.taxable.toFixed(2),
        salesTotals.cgst.toFixed(2),
        salesTotals.sgst.toFixed(2),
        salesTotals.igst.toFixed(2),
        salesTotals.gst.toFixed(2),
        salesTotals.total.toFixed(2),
        '-',
        '-',
      ]);
    } else if (activeTab === 'purchase' || activeTab === 'gstr2') {
      rows.push([activeTab === 'gstr2' ? 'GSTR-2 INWARD SUPPLIES & ITC REPORT' : 'GST PURCHASE REGISTER REPORT']);
      rows.push(['Period:', `${fromDate} to ${toDate}`]);
      rows.push(['GSTIN:', gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Unregistered']);
      rows.push(['Business State:', gstConfig.businessState]);
      rows.push(['Generated On:', new Date().toLocaleString()]);
      rows.push([]);
      rows.push([
        'Bill / Invoice No',
        'Date',
        'Supplier Name',
        'Supplier GSTIN',
        'Supply Type',
        'Category',
        'Taxable Amount (Rs.)',
        'CGST (Rs.)',
        'SGST (Rs.)',
        'IGST (Rs.)',
        'Total Tax (Rs.)',
        'Total Amount (Rs.)',
        'Payment Status',
      ]);

      filteredPurchases.forEach((pur: any) => {
        const purTotal = Number(pur.total || 0);
        const b = getPurchaseTaxBreakdown(pur, gstConfig.businessState, gstConfig.gstin);
        const purSub = Number(pur.subtotal || purTotal - b.totalTax);
        const purDate = (pur.invoiceDate || pur.dueDate || (pur as any).createdAt || '').split('T')[0];
        const suppName = pur.supplierName || (pur as any).vendorName || 'Vendor';
        const suppGst = (pur as any).vendorGstin || pur.gstin || '-';

        rows.push([
          pur.invoiceNumber || String(pur.id || ''),
          purDate,
          suppName,
          suppGst,
          b.supplyType,
          pur.category || 'General',
          purSub.toFixed(2),
          b.cgst.toFixed(2),
          b.sgst.toFixed(2),
          b.igst.toFixed(2),
          b.totalTax.toFixed(2),
          purTotal.toFixed(2),
          pur.paymentStatus || pur.status || 'PAID',
        ]);
      });

      rows.push([]);
      rows.push([
        `TOTAL (${filteredPurchases.length} Bills)`,
        '-',
        '-',
        '-',
        '-',
        '-',
        purchaseTotals.taxable.toFixed(2),
        purchaseTotals.cgst.toFixed(2),
        purchaseTotals.sgst.toFixed(2),
        purchaseTotals.igst.toFixed(2),
        purchaseTotals.gst.toFixed(2),
        purchaseTotals.total.toFixed(2),
        '-',
      ]);
    } else if (activeTab === 'gstr3b') {
      rows.push(['GSTR-3B MONTHLY SUMMARY RETURN']);
      rows.push(['Period:', `${fromDate} to ${toDate}`]);
      rows.push(['GSTIN:', gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Unregistered']);
      rows.push(['Return Period:', gstConfig.returnPeriod || 'Monthly']);
      rows.push(['Financial Year:', gstConfig.financialYear || '2026-27']);
      rows.push([]);
      rows.push([
        'Section',
        'Nature of Supplies',
        'Total Taxable Value (Rs.)',
        'Integrated Tax IGST (Rs.)',
        'Central Tax CGST (Rs.)',
        'State/UT Tax SGST (Rs.)',
        'Total Tax (Rs.)',
      ]);
      rows.push([
        '3.1(a)',
        'Outward Taxable Supplies (Sales)',
        salesTotals.taxable.toFixed(2),
        salesTotals.igst.toFixed(2),
        salesTotals.cgst.toFixed(2),
        salesTotals.sgst.toFixed(2),
        salesTotals.gst.toFixed(2),
      ]);
      rows.push([
        '4(A)',
        'Eligible ITC (Purchases)',
        purchaseTotals.taxable.toFixed(2),
        purchaseTotals.igst.toFixed(2),
        purchaseTotals.cgst.toFixed(2),
        purchaseTotals.sgst.toFixed(2),
        purchaseTotals.gst.toFixed(2),
      ]);
      rows.push([]);
      rows.push([
        '5.1',
        'Net GST Payable in Cash',
        '-',
        gstr3bLiability.igstPayable.toFixed(2),
        gstr3bLiability.cgstPayable.toFixed(2),
        gstr3bLiability.sgstPayable.toFixed(2),
        gstr3bLiability.netPayable.toFixed(2),
      ]);
      rows.push([
        '6.1',
        'ITC Balance Carried Forward',
        '-',
        gstr3bLiability.igstCarryForward.toFixed(2),
        gstr3bLiability.cgstCarryForward.toFixed(2),
        gstr3bLiability.sgstCarryForward.toFixed(2),
        gstr3bLiability.itcCarryForward.toFixed(2),
      ]);
    } else if (activeTab === 'hsn') {
      rows.push(['HSN / SAC SUMMARY REPORT']);
      rows.push(['Period:', `${fromDate} to ${toDate}`]);
      rows.push(['GSTIN:', gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Unregistered']);
      rows.push([]);
      rows.push([
        'HSN / SAC Code',
        'Description',
        'UQC',
        'Total Quantity',
        'Taxable Value (Rs.)',
        'CGST (Rs.)',
        'SGST (Rs.)',
        'IGST (Rs.)',
        'Total GST (Rs.)',
        'Total Value (Rs.)',
      ]);
      hsnSummaryData.forEach((h) => {
        rows.push([
          h.code,
          h.desc,
          'NOS',
          h.qty,
          h.taxable.toFixed(2),
          h.cgst.toFixed(2),
          h.sgst.toFixed(2),
          h.igst.toFixed(2),
          h.totalGst.toFixed(2),
          h.total.toFixed(2),
        ]);
      });
      rows.push([]);
      rows.push([
        `TOTAL (${hsnSummaryData.length} HSN Codes)`,
        '-',
        '-',
        '-',
        hsnTotals.taxable.toFixed(2),
        hsnTotals.cgst.toFixed(2),
        hsnTotals.sgst.toFixed(2),
        hsnTotals.igst.toFixed(2),
        hsnTotals.totalGst.toFixed(2),
        hsnTotals.total.toFixed(2),
      ]);
    } else {
      // GST Settings Tab
      filename = `GST_Configuration_Settings_${new Date().toISOString().split('T')[0]}.csv`;
      rows.push(['GST CONFIGURATION SETTINGS']);
      rows.push(['Exported On:', new Date().toLocaleString()]);
      rows.push([]);
      rows.push(['Setting Field', 'Configured Value']);
      rows.push(['GST Enabled', gstConfig.gstEnabled ? 'Yes' : 'No']);
      rows.push(['Business State', gstConfig.businessState]);
      rows.push(['GSTIN', gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Not Registered']);
      rows.push(['Registration Type', gstConfig.registrationType]);
      rows.push(['Default GST Rate', `${gstConfig.foodSlabRate || 5}%`]);
      rows.push(['CGST Rate', `${gstConfig.cgstRate || 2.5}%`]);
      rows.push(['SGST Rate', `${gstConfig.sgstRate || 2.5}%`]);
      rows.push(['IGST Rate', `${gstConfig.igstRate || 5}%`]);
      rows.push(['HSN / SAC Code', gstConfig.hsnSac || '9963']);
      rows.push(['Tax Type', gstConfig.taxType || 'Exclusive']);
      rows.push(['Return Period', gstConfig.returnPeriod || 'Monthly']);
      rows.push(['Financial Year', gstConfig.financialYear || '2026-27']);
    }

    const csvContent = rows
      .map((row) =>
        row
          .map((val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Professional PDF / Print Handler for GST Reports with CGST, SGST, IGST columns
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const displayGstin = gstConfig.gstin ? originalRawGstin || gstConfig.gstin : 'Unregistered / B2C';
    const reportTitle = TABS.find((t) => t.id === activeTab)?.label || 'GST Report';

    let tableHTML = '';
    let summaryHTML = '';

    if (activeTab === 'sales' || activeTab === 'gstr1') {
      summaryHTML = `
        <div class="kpi-grid" style="grid-template-columns: repeat(6, 1fr);">
          <div class="kpi-card"><div class="kpi-label">Taxable Sales</div><div class="kpi-val">₹${salesTotals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">CGST (Central)</div><div class="kpi-val" style="color: #15803D;">₹${salesTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">SGST (State)</div><div class="kpi-val" style="color: #15803D;">₹${salesTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">IGST (Interstate)</div><div class="kpi-val" style="color: #0284C7;">₹${salesTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total GST Output</div><div class="kpi-val" style="color: #0F766E;">₹${salesTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Gross Sales Total</div><div class="kpi-val" style="color: #1E293B;">₹${salesTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        </div>
      `;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Customer GSTIN</th>
              <th>Supply</th>
              <th style="text-align: right;">Taxable (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">Total GST (₹)</th>
              <th style="text-align: right;">Grand Total (₹)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices
              .map((inv) => {
                const invTotal = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
                const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
                const invSub = Number(inv.subtotal || invTotal - b.totalTax);
                const invDate = ((inv as any).issueDate || inv.createdAt || '').split('T')[0];
                const custName = (inv as any).guestName || (inv as any).customerName || 'Walk-in';
                const custGst = (inv as any).guestGstNumber || (inv as any).gstin || 'B2C';
                return `
                <tr>
                  <td><strong>${inv.invoiceNumber || (inv as any).id || '-'}</strong></td>
                  <td>${invDate}</td>
                  <td>${custName}</td>
                  <td style="font-family: monospace;">${custGst}</td>
                  <td><span class="badge" style="background: #f1f5f9; color: #475569;">${b.supplyType}</span></td>
                  <td style="text-align: right;">₹${invSub.toFixed(2)}</td>
                  <td style="text-align: right; color: #15803D;">₹${b.cgst.toFixed(2)}</td>
                  <td style="text-align: right; color: #15803D;">₹${b.sgst.toFixed(2)}</td>
                  <td style="text-align: right; color: #0284C7;">₹${b.igst.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700; color: #0F766E;">₹${b.totalTax.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">₹${invTotal.toFixed(2)}</td>
                  <td><span class="badge ${inv.status === 'PAID' ? 'paid' : 'pending'}">${inv.status || 'PAID'}</span></td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background: #F1F5F9; font-weight: 800;">
              <td colspan="5">TOTAL (${filteredInvoices.length} Invoices)</td>
              <td style="text-align: right;">₹${salesTotals.taxable.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${salesTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${salesTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; color: #0284C7;">₹${salesTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #0F766E;">₹${salesTotals.gst.toFixed(2)}</td>
              <td style="text-align: right;">₹${salesTotals.total.toFixed(2)}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeTab === 'purchase' || activeTab === 'gstr2') {
      summaryHTML = `
        <div class="kpi-grid" style="grid-template-columns: repeat(6, 1fr);">
          <div class="kpi-card"><div class="kpi-label">Taxable Inward</div><div class="kpi-val">₹${purchaseTotals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Input CGST</div><div class="kpi-val" style="color: #15803D;">₹${purchaseTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Input SGST</div><div class="kpi-val" style="color: #15803D;">₹${purchaseTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Input IGST</div><div class="kpi-val" style="color: #0284C7;">₹${purchaseTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total Input Tax (ITC)</div><div class="kpi-val" style="color: #2563EB;">₹${purchaseTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Gross Purchases</div><div class="kpi-val" style="color: #1E293B;">₹${purchaseTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        </div>
      `;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Bill / PO No</th>
              <th>Date</th>
              <th>Supplier Name</th>
              <th>Supplier GSTIN</th>
              <th>Category</th>
              <th style="text-align: right;">Taxable (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">Total Tax (₹)</th>
              <th style="text-align: right;">Total Amount (₹)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPurchases
              .map((pur: any) => {
                const purTotal = Number(pur.total || 0);
                const b = getPurchaseTaxBreakdown(pur, gstConfig.businessState, gstConfig.gstin);
                const purSub = Number(pur.subtotal || purTotal - b.totalTax);
                const purDate = (pur.invoiceDate || pur.dueDate || (pur as any).createdAt || '').split('T')[0];
                const suppName = pur.supplierName || (pur as any).vendorName || 'Vendor';
                const suppGst = (pur as any).vendorGstin || pur.gstin || '-';
                return `
                <tr>
                  <td><strong>${pur.invoiceNumber || pur.id || '-'}</strong></td>
                  <td>${purDate}</td>
                  <td>${suppName}</td>
                  <td style="font-family: monospace;">${suppGst}</td>
                  <td>${pur.category || 'General'}</td>
                  <td style="text-align: right;">₹${purSub.toFixed(2)}</td>
                  <td style="text-align: right; color: #15803D;">₹${b.cgst.toFixed(2)}</td>
                  <td style="text-align: right; color: #15803D;">₹${b.sgst.toFixed(2)}</td>
                  <td style="text-align: right; color: #0284C7;">₹${b.igst.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700; color: #2563EB;">₹${b.totalTax.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">₹${purTotal.toFixed(2)}</td>
                  <td><span class="badge ${pur.paymentStatus === 'PAID' ? 'paid' : 'pending'}">${pur.paymentStatus || 'PAID'}</span></td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background: #F1F5F9; font-weight: 800;">
              <td colspan="5">TOTAL (${filteredPurchases.length} Bills)</td>
              <td style="text-align: right;">₹${purchaseTotals.taxable.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${purchaseTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${purchaseTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; color: #0284C7;">₹${purchaseTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #2563EB;">₹${purchaseTotals.gst.toFixed(2)}</td>
              <td style="text-align: right;">₹${purchaseTotals.total.toFixed(2)}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (activeTab === 'gstr3b') {
      summaryHTML = `
        <div class="kpi-grid" style="grid-template-columns: repeat(6, 1fr);">
          <div class="kpi-card"><div class="kpi-label">Output GST (Sales)</div><div class="kpi-val" style="color: #0F766E;">₹${gstr3bLiability.outputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Input Tax Credit (ITC)</div><div class="kpi-val" style="color: #2563EB;">₹${gstr3bLiability.inputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Net CGST Payable</div><div class="kpi-val" style="color: #C2410C;">₹${gstr3bLiability.cgstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Net SGST Payable</div><div class="kpi-val" style="color: #C2410C;">₹${gstr3bLiability.sgstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Net IGST Payable</div><div class="kpi-val" style="color: #C2410C;">₹${gstr3bLiability.igstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total Cash Payable</div><div class="kpi-val" style="color: #DC2626;">₹${gstr3bLiability.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        </div>
      `;
      tableHTML = `
        <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 15px; color: #1E293B;">3.1 Details of Outward Supplies (Sales)</h3>
        <table>
          <thead>
            <tr>
              <th>Nature of Supplies</th>
              <th style="text-align: right;">Taxable Value (₹)</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>(a) Outward Taxable Supplies (Sales)</td>
              <td style="text-align: right;">₹${salesTotals.taxable.toFixed(2)}</td>
              <td style="text-align: right; color: #0284C7;">₹${salesTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${salesTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${salesTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700; color: #0F766E;">₹${salesTotals.gst.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 15px; color: #1E293B;">4. Eligible ITC (Purchases)</h3>
        <table>
          <thead>
            <tr>
              <th>Details</th>
              <th style="text-align: right;">Taxable Value (₹)</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">Total ITC (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>(A) All Other ITC (Inward supplies from registered persons)</td>
              <td style="text-align: right;">₹${purchaseTotals.taxable.toFixed(2)}</td>
              <td style="text-align: right; color: #0284C7;">₹${purchaseTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${purchaseTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${purchaseTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700; color: #2563EB;">₹${purchaseTotals.gst.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 15px; color: #1E293B;">5. Net Tax Payable & ITC Carry Forward</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Output Tax Liability</td>
              <td style="text-align: right;">₹${salesTotals.igst.toFixed(2)}</td>
              <td style="text-align: right;">₹${salesTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right;">₹${salesTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700;">₹${salesTotals.gst.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Less: Input Tax Credit (ITC Available)</td>
              <td style="text-align: right; color: #2563EB;">₹${purchaseTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #2563EB;">₹${purchaseTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #2563EB;">₹${purchaseTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700; color: #2563EB;">- ₹${purchaseTotals.gst.toFixed(2)}</td>
            </tr>
            <tr style="background: #FEF2F2; font-weight: 800;">
              <td>Net Tax Payable in Cash</td>
              <td style="text-align: right; color: #DC2626;">₹${gstr3bLiability.igstPayable.toFixed(2)}</td>
              <td style="text-align: right; color: #DC2626;">₹${gstr3bLiability.cgstPayable.toFixed(2)}</td>
              <td style="text-align: right; color: #DC2626;">₹${gstr3bLiability.sgstPayable.toFixed(2)}</td>
              <td style="text-align: right; color: #DC2626;">₹${gstr3bLiability.netPayable.toFixed(2)}</td>
            </tr>
            <tr style="background: #ECFDF5; font-weight: 800;">
              <td>ITC Balance Carried Forward</td>
              <td style="text-align: right; color: #059669;">₹${gstr3bLiability.igstCarryForward.toFixed(2)}</td>
              <td style="text-align: right; color: #059669;">₹${gstr3bLiability.cgstCarryForward.toFixed(2)}</td>
              <td style="text-align: right; color: #059669;">₹${gstr3bLiability.sgstCarryForward.toFixed(2)}</td>
              <td style="text-align: right; color: #059669;">₹${gstr3bLiability.itcCarryForward.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (activeTab === 'hsn') {
      summaryHTML = `
        <div class="kpi-grid" style="grid-template-columns: repeat(6, 1fr);">
          <div class="kpi-card"><div class="kpi-label">Taxable Value</div><div class="kpi-val">₹${hsnTotals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total CGST</div><div class="kpi-val" style="color: #15803D;">₹${hsnTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total SGST</div><div class="kpi-val" style="color: #15803D;">₹${hsnTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total IGST</div><div class="kpi-val" style="color: #0284C7;">₹${hsnTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Total GST</div><div class="kpi-val" style="color: #0F766E;">₹${hsnTotals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div class="kpi-card"><div class="kpi-label">Gross Value</div><div class="kpi-val" style="color: #1E293B;">₹${hsnTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        </div>
      `;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>HSN/SAC</th>
              <th>Description</th>
              <th>UQC</th>
              <th style="text-align: right;">Total Qty</th>
              <th style="text-align: right;">Taxable (₹)</th>
              <th style="text-align: right;">CGST (₹)</th>
              <th style="text-align: right;">SGST (₹)</th>
              <th style="text-align: right;">IGST (₹)</th>
              <th style="text-align: right;">Total GST (₹)</th>
              <th style="text-align: right;">Total Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${hsnSummaryData
              .map(
                (h) => `
              <tr>
                <td style="font-family: monospace; font-weight: 700;">${h.code}</td>
                <td>${h.desc}</td>
                <td>NOS</td>
                <td style="text-align: right;">${h.qty}</td>
                <td style="text-align: right;">₹${h.taxable.toFixed(2)}</td>
                <td style="text-align: right; color: #15803D;">₹${h.cgst.toFixed(2)}</td>
                <td style="text-align: right; color: #15803D;">₹${h.sgst.toFixed(2)}</td>
                <td style="text-align: right; color: #0284C7;">₹${h.igst.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700; color: #0F766E;">₹${h.totalGst.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">₹${h.total.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background: #F1F5F9; font-weight: 800;">
              <td colspan="4">TOTAL (${hsnSummaryData.length} HSN Codes)</td>
              <td style="text-align: right;">₹${hsnTotals.taxable.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${hsnTotals.cgst.toFixed(2)}</td>
              <td style="text-align: right; color: #15803D;">₹${hsnTotals.sgst.toFixed(2)}</td>
              <td style="text-align: right; color: #0284C7;">₹${hsnTotals.igst.toFixed(2)}</td>
              <td style="text-align: right; color: #0F766E;">₹${hsnTotals.totalGst.toFixed(2)}</td>
              <td style="text-align: right;">₹${hsnTotals.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      // GST Settings Tab
      tableHTML = `
        <table>
          <thead>
            <tr><th>Configuration Parameter</th><th>Active Setting Value</th></tr>
          </thead>
          <tbody>
            <tr><td>GST System Status</td><td><strong>${gstConfig.gstEnabled ? 'Enabled' : 'Disabled'}</strong></td></tr>
            <tr><td>Business State</td><td><strong>${gstConfig.businessState}</strong></td></tr>
            <tr><td>GSTIN Number</td><td style="font-family: monospace; font-weight: 700;">${displayGstin}</td></tr>
            <tr><td>Tax Scheme / Registration Type</td><td><strong>${gstConfig.registrationType}</strong></td></tr>
            <tr><td>Default Food GST Rate</td><td><strong>${gstConfig.foodSlabRate || 5}%</strong></td></tr>
            <tr><td>Central GST (CGST)</td><td><strong>${gstConfig.cgstRate || 2.5}%</strong></td></tr>
            <tr><td>State GST (SGST)</td><td><strong>${gstConfig.sgstRate || 2.5}%</strong></td></tr>
            <tr><td>Integrated GST (IGST)</td><td><strong>${gstConfig.igstRate || 5}%</strong></td></tr>
            <tr><td>Default HSN / SAC Code</td><td style="font-family: monospace;">${gstConfig.hsnSac || '9963'}</td></tr>
            <tr><td>Tax Computation Type</td><td>${gstConfig.taxType || 'Exclusive'}</td></tr>
            <tr><td>Return Period</td><td>${gstConfig.returnPeriod || 'Monthly'}</td></tr>
            <tr><td>Financial Year</td><td>${gstConfig.financialYear || '2026-27'}</td></tr>
          </tbody>
        </table>
      `;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - GST Portal</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: -0.02em;
          }
          .report-name {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin-top: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          .meta-box strong { color: #0f172a; }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 9px 12px;
          }
          .kpi-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
          }
          .kpi-val {
            font-size: 15px;
            font-weight: 800;
            margin-top: 4px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 10.5px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            white-space: nowrap;
          }
          td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge.paid { background-color: #dcfce7; color: #166534; }
          .badge.pending { background-color: #fef3c7; color: #92400e; }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
          .action-bar {
            margin-bottom: 16px;
            display: flex;
            gap: 10px;
          }
          .print-btn {
            background: #0f766e;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="action-bar no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="print-btn" style="background: #475569;" onclick="window.close()">✕ Close</button>
        </div>

        <div class="header">
          <div>
            <div class="company-name">HOTEL & RESTAURANT MANAGEMENT</div>
            <div class="report-name">${reportTitle}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
              State: <strong>${gstConfig.businessState}</strong> | Scheme: <strong>${gstConfig.registrationType}</strong>
            </div>
          </div>
          <div class="meta-box">
            <div>GSTIN: <strong>${displayGstin}</strong></div>
            <div>Period: <strong>${formatDate(fromDate)} to ${formatDate(toDate)}</strong></div>
            <div>Generated: <strong>${new Date().toLocaleString()}</strong></div>
          </div>
        </div>

        ${summaryHTML}
        ${tableHTML}

        <div class="footer">
          <div>GST Compliance & Tax Returns • Generated from Live POS Records</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* =========================================================================
          TOP HEADER: GST Settings & Reports + Export & Print / PDF Actions
          ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              {t('gstSettingsAndReports', 'GST Settings & Reports')}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748B' }}>
              {t('gstSubtitle', 'GST configuration, saved sales and purchase records, and return summaries')}
            </p>
          </div>
          {gstConfig.gstin && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
              }}
              title="GSTIN is masked to protect sensitive business PAN"
            >
              <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase' }}>GSTIN:</span>
              <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px', color: '#0F766E' }}>
                {maskGstNumber(gstConfig.gstin)}
              </span>
              <span style={{ fontSize: '0.75rem' }}>🔒</span>
            </div>
          )}
        </div>

        {/* Global Export CSV & Print / PDF Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #10B981',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D1FAE5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
            title="Export CSV data for active tab"
          >
            <Download size={15} />
            <span>{t('exportCsv', 'Export CSV')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
            title="Print or Save PDF report for active tab"
          >
            <Printer size={15} />
            <span>{t('printPdf', 'Print / PDF')}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL PILL TABS BAR
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          alignItems: 'center',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '9px',
                border: isActive ? '1px solid #1E293B' : '1px solid #CBD5E1',
                backgroundColor: isActive ? '#1E293B' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                fontSize: '0.85rem',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(15, 23, 42, 0.18)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          MAIN CARD CONTENT CONTAINER
          ========================================================================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          minHeight: '400px',
        }}
      >
        {/* =====================================================================
            TAB 1: GST SETTINGS
            ===================================================================== */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#111827' }}>
                {t('gstSettings', 'GST Settings')}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                {t('gstSettingsDesc', 'Configure business GST defaults used for reporting.')}
              </p>
            </div>

            {saveSuccessMessage && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '10px 16px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  borderRadius: '8px',
                  color: '#166534',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Check size={16} />
                <span>GST Settings successfully saved and synchronized!</span>
              </div>
            )}

            {/* 12-Field Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px 20px',
              }}
            >
              {/* Row 1 */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('gstEnabled', 'GST Enabled')}
                </label>
                <select
                  value={gstConfig.gstEnabled ? 'true' : 'false'}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, gstEnabled: e.target.value === 'true' }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    {t('gstin', 'GSTIN')}
                  </label>
                  {gstConfig.gstin && (
                    <button
                      type="button"
                      onClick={() => setShowUnmaskedGstin(!showUnmaskedGstin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#64748B',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                      title={showUnmaskedGstin ? 'Mask GST Number' : 'Show Full GST Number'}
                    >
                      {showUnmaskedGstin ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showUnmaskedGstin ? 'Mask' : 'Reveal'}</span>
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={
                      isEditingGstin || showUnmaskedGstin
                        ? gstConfig.gstin || ''
                        : maskGstNumber(gstConfig.gstin)
                    }
                    onFocus={() => setIsEditingGstin(true)}
                    onBlur={() => {
                      setIsEditingGstin(false);
                      const current = (gstConfig.gstin || '').trim().toUpperCase();
                      if (current && !isValidGstin(current)) {
                        setGstinError(GST_VALIDATION_MESSAGE);
                      } else {
                        setGstinError('');
                      }
                    }}
                    onChange={(e) => {
                      const inputVal = e.target.value.toUpperCase().slice(0, 15);
                      if (isMaskedGst(inputVal)) {
                        return;
                      }
                      setGstConfig((prev: any) => ({ ...prev, gstin: inputVal }));
                      if (gstinError && (inputVal.length === 0 || isValidGstin(inputVal))) {
                        setGstinError('');
                      }
                    }}
                    placeholder="e.g. 27AAAAA1111A1Z5"
                    maxLength={15}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 36px 0 12px',
                      borderRadius: '8px',
                      border: gstinError ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#1E293B',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowUnmaskedGstin(!showUnmaskedGstin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showUnmaskedGstin ? 'Mask GST Number' : 'Show Full GST Number'}
                    >
                      {showUnmaskedGstin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {gstinError ? (
                  <div style={{ color: '#DC2626', fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>
                    {gstinError}
                  </div>
                ) : (
                  <div style={{ color: '#64748B', fontSize: '0.72rem', marginTop: '4px' }}>
                    Masked format: <code style={{ color: '#0F766E', fontWeight: 700 }}>27XXXXXXXXXX1Z5</code>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('businessState', 'Business State')}
                </label>
                <select
                  value={gstConfig.businessState}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, businessState: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('registrationType', 'Registration Type')}
                </label>
                <select
                  value={gstConfig.registrationType}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, registrationType: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Regular">{t('regular', 'Regular')}</option>
                  <option value="Composition">{t('composition', 'Composition')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('foodSlabRate', 'Food Slab / Default GST Rate')}
                </label>
                <select
                  value={gstConfig.foodSlabRate}
                  onChange={(e) => {
                    const r = e.target.value;
                    const half = (Number(r) / 2).toString();
                    setGstConfig((prev: any) => ({
                      ...prev,
                      foodSlabRate: r,
                      cgstRate: half,
                      sgstRate: half,
                      igstRate: r,
                    }));
                  }}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('cgstRate', 'CGST Rate (%)')}
                </label>
                <input
                  type="text"
                  value={gstConfig.cgstRate}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, cgstRate: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Row 2 */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('sgstRate', 'SGST Rate (%)')}
                </label>
                <input
                  type="text"
                  value={gstConfig.sgstRate}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, sgstRate: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('igstRate', 'IGST Rate (%)')}
                </label>
                <input
                  type="text"
                  value={gstConfig.igstRate}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, igstRate: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('hsnSac', 'HSN / SAC')}
                </label>
                <input
                  type="text"
                  value={gstConfig.hsnSac}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, hsnSac: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('taxInclusiveExclusive', 'Tax Inclusive / Exclusive')}
                </label>
                <select
                  value={gstConfig.taxType}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, taxType: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Exclusive">{t('exclusive', 'Exclusive')}</option>
                  <option value="Inclusive">{t('inclusive', 'Inclusive')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('returnPeriod', 'Return Period')}
                </label>
                <select
                  value={gstConfig.returnPeriod}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, returnPeriod: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Monthly">{t('monthly', 'Monthly')}</option>
                  <option value="Quarterly">{t('quarterly', 'Quarterly')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t('financialYear', 'Financial Year')}
                </label>
                <select
                  value={gstConfig.financialYear}
                  onChange={(e) => setGstConfig((prev: any) => ({ ...prev, financialYear: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#1E293B',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>
            </div>

            {/* Bottom Right Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                style={{
                  backgroundColor: '#C2410C',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '11px 26px',
                  borderRadius: '9px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(194, 65, 12, 0.28)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Save size={16} />
                <span>{savingConfig ? t('saving', 'Saving...') : t('saveGstSettings', 'Save GST Settings')}</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: SALES REPORT (With CGST, SGST, IGST breakdown)
            ===================================================================== */}
        {activeTab === 'sales' && (
          <div>
            {/* Header row with Date Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('salesReportTab', 'Sales Report')}
                </h3>
                {gstConfig.gstin && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {maskGstNumber(gstConfig.gstin)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔒</span>
                  </div>
                )}
              </div>

              {/* Date Filter (From / To) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Summary Cards with CGST, SGST, IGST Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('taxableValue', 'Taxable Value')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                  {formatNumber(salesTotals.taxable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    {t('cgst', 'CGST')}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px' }}>
                    {gstConfig.cgstRate || '2.5'}%
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(salesTotals.cgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    {t('sgst', 'SGST')}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px' }}>
                    {gstConfig.sgstRate || '2.5'}%
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(salesTotals.sgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    {t('igst', 'IGST')}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#E0F2FE', color: '#0284C7', padding: '1px 6px', borderRadius: '4px' }}>
                    {gstConfig.igstRate || '5'}%
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                  {formatNumber(salesTotals.igst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDFA', borderRadius: '12px', border: '1px solid #99F6E4', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase' }}>
                  {t('totalGst', 'Total GST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  {formatNumber(salesTotals.gst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {t('invoiceTotal', 'Invoice Total')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatNumber(salesTotals.total, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* Data Table with CGST, SGST, IGST columns */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('invoiceNo', 'Invoice #')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('date', 'Date')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('customer', 'Customer')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('subtotal', 'Subtotal')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('discount', 'Discount')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('cgst', 'CGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('sgst', 'SGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('igst', 'IGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0F766E' }}>{t('totalGst', 'Total GST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('total', 'Total')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'center' }}>{t('status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        {t('noInvoiceRecordsFound', 'No invoice records found for the selected date range.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedSalesInvoices.map((inv) => {
                      const total = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
                      const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
                      const discount = Number((inv as any).discountAmount || 0);
                      const subtotal = Number(inv.subtotal || total - b.totalTax);
                      const customerName = (inv as any).guestName || (inv as any).customerName || '—';
                      const dateStr = ((inv as any).issueDate || inv.createdAt || '').split('T')[0];

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: '#334155' }}>
                            {inv.invoiceNumber}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {formatDate(dateStr)}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 500 }}>
                            {customerName}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatNumber(subtotal, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#475569' }}>
                            {formatNumber(discount, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.cgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.sgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: b.igst > 0 ? '#0284C7' : '#94A3B8', fontWeight: b.igst > 0 ? 600 : 400 }}>
                            {formatNumber(b.igst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#0F766E', fontWeight: 700 }}>
                            {formatNumber(b.totalTax, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                            {formatNumber(total, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                color: (inv.status || 'PAID').toUpperCase() === 'PAID' ? '#15803D' : '#D97706',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                              }}
                            >
                              {translateStatus(inv.status || 'PAID')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800, color: '#1E293B' }}>
                    <td style={{ padding: '12px 14px' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(filteredInvoices.length)})
                    </td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatNumber(salesTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                      {formatNumber(salesTotals.discount, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(salesTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(salesTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284C7' }}>
                      {formatNumber(salesTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F766E' }}>
                      {formatNumber(salesTotals.gst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F172A' }}>
                      {formatNumber(salesTotals.total, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>-</td>
                  </tr>
                </tfoot>
                </table>
              </div>
              {renderPagination(salesPage, filteredInvoices.length, salesPageSize, setSalesPage, setSalesPageSize, t('invoices', 'Invoices'))}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: PURCHASE REPORT (With Input CGST, SGST, IGST breakdown)
            ===================================================================== */}
        {activeTab === 'purchase' && (
          <div>
            {/* Header row with Date Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('purchaseReportTab', 'Purchase Report')}
                </h3>
                {gstConfig.gstin && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {maskGstNumber(gstConfig.gstin)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔒</span>
                  </div>
                )}
              </div>

              {/* Date Filter (From / To) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('taxableValue', 'Taxable Purchases')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.taxable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('cgst', 'Input CGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.cgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('sgst', 'Input SGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.sgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  {t('igst', 'Input IGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.igst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  {t('totalGst', 'Total Input GST (ITC)')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.gst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {t('purchaseTotal', 'Purchase Total')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.total, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('invoiceNo', 'Invoice #')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('date', 'Date')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('supplier', 'Supplier')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('subtotal', 'Subtotal')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('cgst', 'Input CGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('sgst', 'Input SGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('igst', 'Input IGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#2563EB' }}>{t('totalTax', 'Total Tax')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('total', 'Total Amount')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'center' }}>{t('status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        {t('noPurchaseRecordsFound', 'No purchase records found for the selected date range.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((pur) => {
                      const total = Number(pur.total || 0);
                      const b = getPurchaseTaxBreakdown(pur, gstConfig.businessState, gstConfig.gstin);
                      const subtotal = Number(pur.subtotal || total - b.totalTax);
                      const supplierName = pur.supplierName || (pur as any).vendorName || '—';
                      const dateStr = (pur.invoiceDate || pur.dueDate || (pur as any).createdAt || '').split('T')[0];

                      return (
                        <tr key={pur.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: '#334155' }}>
                            {pur.invoiceNumber || `PUR-${pur.id}`}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {formatDate(dateStr)}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 500 }}>
                            {supplierName}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatNumber(subtotal, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.cgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.sgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: b.igst > 0 ? '#0284C7' : '#94A3B8', fontWeight: b.igst > 0 ? 600 : 400 }}>
                            {formatNumber(b.igst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                            {formatNumber(b.totalTax, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                            {formatNumber(total, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                color: (pur.paymentStatus || pur.status || 'PAID').toUpperCase() === 'PAID' ? '#15803D' : '#64748B',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                              }}
                            >
                              {translateStatus(pur.paymentStatus || pur.status || 'PAID')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800, color: '#1E293B' }}>
                    <td style={{ padding: '12px 14px' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(filteredPurchases.length)})
                    </td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatNumber(purchaseTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(purchaseTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(purchaseTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284C7' }}>
                      {formatNumber(purchaseTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#2563EB' }}>
                      {formatNumber(purchaseTotals.gst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F172A' }}>
                      {formatNumber(purchaseTotals.total, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>-</td>
                  </tr>
                </tfoot>
                </table>
              </div>
              {renderPagination(purchasePage, filteredPurchases.length, purchasePageSize, setPurchasePage, setPurchasePageSize, t('purchases', 'Purchases'))}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: GSTR-1 REPORT (Outward Supplies Return with CGST, SGST, IGST)
            ===================================================================== */}
        {activeTab === 'gstr1' && (
          <div>
            {/* Header row with Date Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('gstr1ReportTab', 'GSTR-1 Report (Outward Supplies Return)')}
                </h3>
                <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {gstConfig.gstin && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 600 }}>GSTIN:</span>
                      <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                        {maskGstNumber(gstConfig.gstin)}
                      </span>
                    </span>
                  )}
                  <span style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                    B2B Invoices: {toDevanagari(salesTotals.b2bCount)} (₹{salesTotals.b2bTaxable.toFixed(2)})
                  </span>
                  <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                    B2C Invoices: {toDevanagari(salesTotals.b2cCount)} (₹{salesTotals.b2cTaxable.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('taxableValue', 'Taxable Supplies')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                  {formatNumber(salesTotals.taxable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('centralTaxCgst', 'Central Tax (CGST)')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(salesTotals.cgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('stateTaxSgst', 'State Tax (SGST)')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(salesTotals.sgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  {t('integratedTaxIgst', 'Integrated Tax (IGST)')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                  {formatNumber(salesTotals.igst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDFA', borderRadius: '12px', border: '1px solid #99F6E4', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase' }}>
                  {t('totalTax', 'Total Output GST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  {formatNumber(salesTotals.gst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {t('invoiceTotal', 'Gross Invoice Value')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatNumber(salesTotals.total, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* GSTR-1 Data Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('invoiceNo', 'Invoice #')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('date', 'Date')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('customer', 'Customer')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('gstin', 'Customer GSTIN')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('supplyType', 'Supply Type')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('taxableValue', 'Taxable (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('cgst', 'CGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('sgst', 'SGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('igst', 'IGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0F766E' }}>{t('totalTax', 'Total Tax (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('total', 'Invoice Total (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'center' }}>{t('status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        {t('noInvoiceRecordsFound', 'No invoice records found for the selected date range.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedGstr1Invoices.map((inv) => {
                      const total = Number((inv as any).totalAmount || (inv as any).grandTotal || 0);
                      const b = getInvoiceTaxBreakdown(inv, gstConfig.businessState, gstConfig.gstin);
                      const subtotal = Number(inv.subtotal || total - b.totalTax);
                      const customerName = (inv as any).guestName || (inv as any).customerName || '—';
                      const custGst = (inv as any).guestGstNumber || (inv as any).gstin || 'B2C (Consumer)';
                      const isB2B = Boolean((inv as any).guestGstNumber || (inv as any).gstin);
                      const dateStr = ((inv as any).issueDate || inv.createdAt || '').split('T')[0];

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#334155' }}>
                            {inv.invoiceNumber}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {formatDate(dateStr)}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 500 }}>
                            {customerName}
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: isB2B ? '#0F766E' : '#64748B', fontWeight: isB2B ? 700 : 400 }}>
                            {custGst}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: b.isInterstate ? '#E0F2FE' : '#F1F5F9',
                                color: b.isInterstate ? '#0369A1' : '#475569',
                              }}
                            >
                              {b.supplyType}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatNumber(subtotal, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.cgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.sgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: b.igst > 0 ? '#0284C7' : '#94A3B8', fontWeight: b.igst > 0 ? 600 : 400 }}>
                            {formatNumber(b.igst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#0F766E', fontWeight: 700 }}>
                            {formatNumber(b.totalTax, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                            {formatNumber(total, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                color: (inv.status || 'PAID').toUpperCase() === 'PAID' ? '#15803D' : '#D97706',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                              }}
                            >
                              {translateStatus(inv.status || 'PAID')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800, color: '#1E293B' }}>
                    <td style={{ padding: '12px 14px' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(filteredInvoices.length)})
                    </td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatNumber(salesTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(salesTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(salesTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284C7' }}>
                      {formatNumber(salesTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F766E' }}>
                      {formatNumber(salesTotals.gst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F172A' }}>
                      {formatNumber(salesTotals.total, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>-</td>
                  </tr>
                </tfoot>
                </table>
              </div>
              {renderPagination(gstr1Page, filteredInvoices.length, gstr1PageSize, setGstr1Page, setGstr1PageSize, t('gstr1Invoices', 'GSTR-1 Records'))}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 5: GSTR-2 REPORT (Inward Supplies / ITC with CGST, SGST, IGST)
            ===================================================================== */}
        {activeTab === 'gstr2' && (
          <div>
            {/* Header row with Date Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('gstr2ReportTab', 'GSTR-2 Report (Inward Supplies & ITC Auto-Drafted)')}
                </h3>
                {gstConfig.gstin && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {maskGstNumber(gstConfig.gstin)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔒</span>
                  </div>
                )}
              </div>

              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('taxableValue', 'Taxable Inward')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.taxable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('cgst', 'CGST ITC')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.cgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('sgst', 'SGST ITC')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.sgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  {t('igst', 'IGST ITC')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.igst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  {t('totalTax', 'Total ITC Available')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.gst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {t('purchaseTotal', 'Gross Inward Value')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatNumber(purchaseTotals.total, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* GSTR-2 Data Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('invoiceNo', 'Bill / Inv #')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('date', 'Date')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('supplier', 'Supplier Name')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('gstin', 'Supplier GSTIN')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('supplyType', 'Supply Type')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('category', 'Category')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('taxableValue', 'Taxable (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('cgst', 'CGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('sgst', 'SGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('igst', 'IGST (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#2563EB' }}>{t('totalTax', 'Total ITC (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('total', 'Total (₹)')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'center' }}>{t('status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        {t('noPurchaseRecordsFound', 'No inward purchase records found for the selected date range.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedGstr2Purchases.map((pur) => {
                      const total = Number(pur.total || 0);
                      const b = getPurchaseTaxBreakdown(pur, gstConfig.businessState, gstConfig.gstin);
                      const subtotal = Number(pur.subtotal || total - b.totalTax);
                      const supplierName = pur.supplierName || (pur as any).vendorName || '—';
                      const suppGst = (pur as any).vendorGstin || (pur as any).gstin || '-';
                      const dateStr = (pur.invoiceDate || pur.dueDate || (pur as any).createdAt || '').split('T')[0];

                      return (
                        <tr key={pur.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#334155' }}>
                            {pur.invoiceNumber || `PUR-${pur.id}`}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {formatDate(dateStr)}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#1E293B', fontWeight: 500 }}>
                            {supplierName}
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: suppGst !== '-' ? '#0F766E' : '#64748B' }}>
                            {suppGst}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: b.isInterstate ? '#E0F2FE' : '#F1F5F9',
                                color: b.isInterstate ? '#0369A1' : '#475569',
                              }}
                            >
                              {b.supplyType}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569' }}>
                            {(pur as any).category || 'General'}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatNumber(subtotal, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.cgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                            {formatNumber(b.sgst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', color: b.igst > 0 ? '#0284C7' : '#94A3B8', fontWeight: b.igst > 0 ? 600 : 400 }}>
                            {formatNumber(b.igst, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                            {formatNumber(b.totalTax, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                            {formatNumber(total, { asCurrency: true })}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                color: (pur.paymentStatus || pur.status || 'PAID').toUpperCase() === 'PAID' ? '#15803D' : '#64748B',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                              }}
                            >
                              {translateStatus(pur.paymentStatus || pur.status || 'PAID')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800, color: '#1E293B' }}>
                    <td style={{ padding: '12px 14px' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(filteredPurchases.length)})
                    </td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatNumber(purchaseTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(purchaseTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(purchaseTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284C7' }}>
                      {formatNumber(purchaseTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#2563EB' }}>
                      {formatNumber(purchaseTotals.gst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F172A' }}>
                      {formatNumber(purchaseTotals.total, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>-</td>
                  </tr>
                </tfoot>
                </table>
              </div>
              {renderPagination(gstr2Page, filteredPurchases.length, gstr2PageSize, setGstr2Page, setGstr2PageSize, t('gstr2Purchases', 'GSTR-2 Records'))}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 6: GSTR-3B REPORT (Summary & Liability with CGST, SGST, IGST)
            ===================================================================== */}
        {activeTab === 'gstr3b' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('gstr3bReportTab', 'GSTR-3B Report (Monthly Summary & Tax Liability)')}
                </h3>
                {gstConfig.gstin && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {maskGstNumber(gstConfig.gstin)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔒</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F0FDFA', borderRadius: '12px', border: '1px solid #99F6E4', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase' }}>
                  {t('outputGstSales', 'Output GST (Sales)')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.outputTax, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  {t('inputGstItcPurchases', 'Input GST / ITC')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.inputTax, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#FFF7ED', borderRadius: '12px', border: '1px solid #FED7AA', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>
                  {t('cgst', 'Net CGST Payable')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C2410C', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.cgstPayable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#FFF7ED', borderRadius: '12px', border: '1px solid #FED7AA', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>
                  {t('sgst', 'Net SGST Payable')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C2410C', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.sgstPayable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#FFF7ED', borderRadius: '12px', border: '1px solid #FED7AA', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>
                  {t('igst', 'Net IGST Payable')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C2410C', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.igstPayable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                  {t('netTaxLiability', 'Total Net Cash Payable')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                  {formatNumber(gstr3bLiability.netPayable, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* GSTR-3B Statutory Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 16px', fontWeight: 700 }}>{t('supplyDetails', 'Section & Supply Details')}</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'right' }}>{t('taxableAmount', 'Taxable Amount')}</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('integratedTaxIgst', 'Integrated Tax (IGST)')}</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('centralTaxCgst', 'Central Tax (CGST)')}</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('stateTaxSgst', 'State Tax (SGST)')}</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'right', color: '#0F766E' }}>{t('totalTax', 'Total Tax')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 3.1 */}
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {t('outwardTaxableSuppliesSales', '3.1 Outward Taxable Supplies (Sales)')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {formatNumber(salesTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0284C7', fontWeight: 600 }}>
                      {formatNumber(salesTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                      {formatNumber(salesTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                      {formatNumber(salesTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                      {formatNumber(salesTotals.gst, { asCurrency: true })}
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {t('eligibleItcPurchases', '4. Eligible Input Tax Credit (ITC - Purchases)')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {formatNumber(purchaseTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0284C7', fontWeight: 600 }}>
                      {formatNumber(purchaseTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                      {formatNumber(purchaseTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                      {formatNumber(purchaseTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                      {formatNumber(purchaseTotals.gst, { asCurrency: true })}
                    </td>
                  </tr>

                  {/* Row 5 - Net Payable */}
                  <tr style={{ backgroundColor: '#FFF7ED', fontWeight: 800, borderBottom: '1px solid #FED7AA' }}>
                    <td style={{ padding: '12px 16px', color: '#C2410C' }}>
                      {t('netTaxLiabilityPayable', '5. Net Tax Liability (Payable in Cash)')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9A3412' }}>—</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#C2410C' }}>
                      {formatNumber(gstr3bLiability.igstPayable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#C2410C' }}>
                      {formatNumber(gstr3bLiability.cgstPayable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#C2410C' }}>
                      {formatNumber(gstr3bLiability.sgstPayable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#C2410C', fontSize: '0.92rem' }}>
                      {formatNumber(gstr3bLiability.netPayable, { asCurrency: true })}
                    </td>
                  </tr>

                  {/* Row 6 - ITC Carry Forward */}
                  <tr style={{ backgroundColor: '#F0FDF4', fontWeight: 800 }}>
                    <td style={{ padding: '12px 16px', color: '#166534' }}>
                      {t('itcCarryForward', '6. ITC Balance Carried Forward to Next Period')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#166534' }}>—</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(gstr3bLiability.igstCarryForward, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(gstr3bLiability.cgstCarryForward, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(gstr3bLiability.sgstCarryForward, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontSize: '0.92rem' }}>
                      {formatNumber(gstr3bLiability.itcCarryForward, { asCurrency: true })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 7: HSN SUMMARY REPORT (With CGST, SGST, IGST breakdown)
            ===================================================================== */}
        {activeTab === 'hsn' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  {t('hsnSummaryReportTab', 'HSN / SAC Summary Report')}
                </h3>
                {gstConfig.gstin && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GSTIN:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {maskGstNumber(gstConfig.gstin)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>🔒</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('from', 'From')}</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{t('to', 'To')}</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#1E293B',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* 6 Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('taxableValue', 'Taxable Value')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.taxable, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('cgst', 'Total CGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.cgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {t('sgst', 'Total SGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.sgst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  {t('igst', 'Total IGST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.igst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDFA', borderRadius: '12px', border: '1px solid #99F6E4', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase' }}>
                  {t('totalGst', 'Total GST')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.totalGst, { asCurrency: true })}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  {t('totalValue', 'Gross Value')}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {formatNumber(hsnTotals.total, { asCurrency: true })}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('hsnSac', 'HSN / SAC')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700 }}>{t('description', 'Description')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'center' }}>{t('qty', 'Qty')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('taxableValue', 'Taxable Value')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('cgst', 'CGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#15803D' }}>{t('sgst', 'SGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0284C7' }}>{t('igst', 'IGST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right', color: '#0F766E' }}>{t('totalTax', 'Total GST')}</th>
                    <th style={{ padding: '11px 14px', fontWeight: 700, textAlign: 'right' }}>{t('total', 'Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        {t('noHsnDataAvailable', 'No HSN summary data available.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedHsnData.map((row) => (
                      <tr key={row.code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1E293B' }}>{row.code}</td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>{row.desc}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600 }}>{toDevanagari(row.qty)}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600 }}>
                          {formatNumber(row.taxable, { asCurrency: true })}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                          {formatNumber(row.cgst, { asCurrency: true })}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>
                          {formatNumber(row.sgst, { asCurrency: true })}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: row.igst > 0 ? '#0284C7' : '#94A3B8', fontWeight: row.igst > 0 ? 600 : 400 }}>
                          {formatNumber(row.igst, { asCurrency: true })}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                          {formatNumber(row.totalGst, { asCurrency: true })}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                          {formatNumber(row.total, { asCurrency: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800, color: '#1E293B' }}>
                    <td style={{ padding: '12px 14px' }}>
                      {t('total', 'TOTAL')} ({toDevanagari(hsnSummaryData.length)})
                    </td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px' }}>-</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatNumber(hsnTotals.taxable, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(hsnTotals.cgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#15803D' }}>
                      {formatNumber(hsnTotals.sgst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284C7' }}>
                      {formatNumber(hsnTotals.igst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F766E' }}>
                      {formatNumber(hsnTotals.totalGst, { asCurrency: true })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0F172A' }}>
                      {formatNumber(hsnTotals.total, { asCurrency: true })}
                    </td>
                  </tr>
                </tfoot>
                </table>
              </div>
              {renderPagination(hsnPage, hsnSummaryData.length, hsnPageSize, setHsnPage, setHsnPageSize, t('hsnEntries', 'HSN Entries'))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GstReportComponent;
