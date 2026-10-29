import { settingsService, SettingItem } from './settingsService';

export interface TaxGroup {
  id: number;
  name: string;
  gstRate: number;
  category?: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  effectiveFrom?: string;
  active: boolean;
  description?: string;
}

export interface HsnSacItem {
  id: number;
  codeType: 'HSN' | 'SAC';
  code: string;
  description: string;
  taxCategory?: string;
  taxGroupId?: number;
  gstRate: number;
  effectiveFrom?: string;
  active: boolean;
}

export interface BusinessGstConfig {
  legalName: string;
  tradeName: string;
  registrationStatus: string;
  gstin: string;
  address: string;
  state: string;
  stateCode: string;
  defaultTaxTreatment: string;
  taxpayerCategory: string;
}

export interface TaxPricingConfig {
  pricingMethod: 'EXCLUSIVE' | 'INCLUSIVE';
  defaultCalculationMethod: string;
  defaultTaxGroupId: number;
  discountRule: 'BEFORE_TAX' | 'AFTER_TAX';
  roundingRule: 'NEAREST_RUPEE' | 'NONE';
  showComponentBreakdown: boolean;
  showHsnSummary: boolean;
  showTaxableBreakdown: boolean;
}

export const FALLBACK_TAX_GROUPS: TaxGroup[] = [
  { id: 1, name: "GST 0% (Nil / Exempt)", gstRate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, active: true, description: "Exempt supplies, fresh grains, vegetables" },
  { id: 2, name: "GST 5% (Standard Rate)", gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, active: true, description: "Essential food items, restaurant food" },
  { id: 3, name: "GST 12% (Standard Supplies)", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, active: true, description: "Processed food items, room tariff below ₹7,500" },
  { id: 4, name: "GST 18% (Commercial Rate)", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, active: true, description: "Beverages, hotel services, banquets" },
  { id: 5, name: "GST 28% (Luxury Supplies)", gstRate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, active: true, description: "Aerated drinks, special luxury goods" },
];

export const FALLBACK_BUSINESS_GST: BusinessGstConfig = {
  legalName: "Ajalkar Enterprises",
  tradeName: "Ajalkar POS Billing",
  registrationStatus: "Registered - Regular",
  gstin: "27AABCA1234F1Z5",
  address: "Hotel Premises, Maharashtra",
  state: "Maharashtra",
  stateCode: "27",
  defaultTaxTreatment: "Taxable",
  taxpayerCategory: "Regular",
};

export const FALLBACK_TAX_PRICING: TaxPricingConfig = {
  pricingMethod: "EXCLUSIVE",
  defaultCalculationMethod: "STANDARD",
  defaultTaxGroupId: 2,
  discountRule: "BEFORE_TAX",
  roundingRule: "NEAREST_RUPEE",
  showComponentBreakdown: true,
  showHsnSummary: true,
  showTaxableBreakdown: true,
};

let cachedGstConfig: {
  taxGroups: TaxGroup[];
  hsnSac: HsnSacItem[];
  businessGst: BusinessGstConfig;
  pricing: TaxPricingConfig;
  fetchedAt: number;
} | null = null;

export const taxCalculationService = {
  getGstConfiguration: async (): Promise<{
    taxGroups: TaxGroup[];
    hsnSac: HsnSacItem[];
    businessGst: BusinessGstConfig;
    pricing: TaxPricingConfig;
  }> => {
    const now = Date.now();
    if (cachedGstConfig && now - cachedGstConfig.fetchedAt < 60000) {
      return cachedGstConfig;
    }

    try {
      const settings = await settingsService.getSettings();
      const gstSettings = settings.filter(s => s.category === 'GST');

      let taxGroups = FALLBACK_TAX_GROUPS;
      let hsnSac: HsnSacItem[] = [];
      let businessGst = FALLBACK_BUSINESS_GST;
      let pricing = FALLBACK_TAX_PRICING;

      gstSettings.forEach(s => {
        try {
          if (s.settingKey === 'TAX_GROUPS') taxGroups = JSON.parse(s.settingValue);
          if (s.settingKey === 'HSN_SAC') hsnSac = JSON.parse(s.settingValue);
          if (s.settingKey === 'BUSINESS_GST') businessGst = { ...FALLBACK_BUSINESS_GST, ...JSON.parse(s.settingValue) };
          if (s.settingKey === 'TAX_PRICING') pricing = { ...FALLBACK_TAX_PRICING, ...JSON.parse(s.settingValue) };
        } catch {}
      });

      cachedGstConfig = { taxGroups, hsnSac, businessGst, pricing, fetchedAt: now };
      return cachedGstConfig;
    } catch (e) {
      return {
        taxGroups: FALLBACK_TAX_GROUPS,
        hsnSac: [],
        businessGst: FALLBACK_BUSINESS_GST,
        pricing: FALLBACK_TAX_PRICING,
      };
    }
  },

  isInterState: (supplierGstin?: string, supplierState?: string, businessStateCode = '27'): boolean => {
    if (supplierGstin && supplierGstin.length >= 2) {
      const suppStateCode = supplierGstin.substring(0, 2);
      if (/^\d{2}$/.test(suppStateCode)) {
        return suppStateCode !== businessStateCode;
      }
    }
    if (supplierState && businessStateCode === '27') {
      const s = supplierState.trim().toLowerCase();
      return s !== 'maharashtra' && s !== 'mh' && s !== '27';
    }
    return false;
  },

  calculateLineItem: (params: {
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxRate?: number;
    isTaxInclusive?: boolean;
    isInterState?: boolean;
  }) => {
    const qty = Math.max(0, Number(params.quantity) || 0);
    const rate = Math.max(0, Number(params.unitPrice) || 0);
    const discPct = Math.min(100, Math.max(0, Number(params.discountPercent) || 0));
    const gstRate = Math.max(0, Number(params.taxRate) || 0);
    const inclusive = Boolean(params.isTaxInclusive);
    const interState = Boolean(params.isInterState);

    const grossAmount = qty * rate;
    const discountAmount = grossAmount * (discPct / 100);
    const amountAfterDiscount = grossAmount - discountAmount;

    let taxableAmount = 0;
    let totalTaxAmount = 0;
    let lineTotal = 0;

    if (inclusive && gstRate > 0) {
      taxableAmount = Number((amountAfterDiscount / (1 + gstRate / 100)).toFixed(2));
      totalTaxAmount = Number((amountAfterDiscount - taxableAmount).toFixed(2));
      lineTotal = Number(amountAfterDiscount.toFixed(2));
    } else {
      taxableAmount = Number(amountAfterDiscount.toFixed(2));
      totalTaxAmount = Number((taxableAmount * (gstRate / 100)).toFixed(2));
      lineTotal = Number((taxableAmount + totalTaxAmount).toFixed(2));
    }

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (interState) {
      igstRate = gstRate;
      igstAmount = totalTaxAmount;
    } else {
      cgstRate = gstRate / 2;
      cgstAmount = Number((totalTaxAmount / 2).toFixed(2));
      sgstRate = gstRate / 2;
      sgstAmount = Number((totalTaxAmount - cgstAmount).toFixed(2)); // Preserve exact rounding
    }

    return {
      quantity: qty,
      unitPrice: rate,
      grossAmount,
      discountPercent: discPct,
      discountAmount,
      taxableAmount,
      taxRate: gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTaxAmount,
      lineTotal,
    };
  },

  calculateInvoiceSummary: (
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxRate?: number;
      hsnCode?: string;
      itemName?: string;
    }>,
    options?: {
      isInterState?: boolean;
      isTaxInclusive?: boolean;
    }
  ) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const rateBreakdownMap = new Map<number, {
      taxRate: number;
      taxableAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      totalTaxAmount: number;
    }>();

    items.forEach(it => {
      const calc = taxCalculationService.calculateLineItem({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxRate: it.taxRate,
        isTaxInclusive: options?.isTaxInclusive,
        isInterState: options?.isInterState,
      });

      subtotal += calc.grossAmount;
      totalDiscount += calc.discountAmount;
      totalTaxable += calc.taxableAmount;
      totalCgst += calc.cgstAmount;
      totalSgst += calc.sgstAmount;
      totalIgst += calc.igstAmount;
      totalTax += calc.totalTaxAmount;
      grandTotal += calc.lineTotal;

      const rate = calc.taxRate;
      const current = rateBreakdownMap.get(rate) || {
        taxRate: rate,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
      };

      current.taxableAmount += calc.taxableAmount;
      current.cgstAmount += calc.cgstAmount;
      current.sgstAmount += calc.sgstAmount;
      current.igstAmount += calc.igstAmount;
      current.totalTaxAmount += calc.totalTaxAmount;
      rateBreakdownMap.set(rate, current);
    });

    const roundedGrandTotal = Math.round(grandTotal);
    const roundOff = Number((roundedGrandTotal - grandTotal).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      roundedGrandTotal,
      roundOff,
      rateBreakdowns: Array.from(rateBreakdownMap.values()).map(r => ({
        taxRate: r.taxRate,
        taxableAmount: Number(r.taxableAmount.toFixed(2)),
        cgstAmount: Number(r.cgstAmount.toFixed(2)),
        sgstAmount: Number(r.sgstAmount.toFixed(2)),
        igstAmount: Number(r.igstAmount.toFixed(2)),
        totalTaxAmount: Number(r.totalTaxAmount.toFixed(2)),
      })),
    };
  },
};

export default taxCalculationService;
