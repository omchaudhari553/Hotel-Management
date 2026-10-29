import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toDevanagariNumerals } from '../locales/translations';

export interface PrintItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface BillPrintData {
  language?: 'en' | 'mr' | 'hi';
  invoiceNumber: string;
  hotelName?: string;
  hotelAddress?: string;
  gstin?: string;
  fssai?: string;
  phone?: string;
  tableName: string;
  customerName?: string;
  serverName?: string;
  date?: string;
  time?: string;
  paymentMode?: string;
  items: PrintItem[];
  subtotal: number;
  cgst: number | string;
  sgst: number | string;
  discount?: number;
  total: number;
  footerNote?: string;
}

export interface KotPrintData {
  language?: 'en' | 'mr' | 'hi';
  kotNumber: string;
  orderNumber?: string;
  tableName: string;
  guestName?: string;
  serverName?: string;
  date?: string;
  time?: string;
  items: PrintItem[];
  instructions?: string;
}

export type PrintFormat = '80mm' | '58mm' | 'a4';

/**
 * Converts a number to Indian Rupees words (e.g. 1743 -> One Thousand Seven Hundred Forty-Three Rupees Only)
 */
function numberToWordsINR(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (num: number): string => {
    let current = '';
    if (num >= 100) {
      current += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 10 && num <= 19) {
      current += teens[num - 10] + ' ';
    } else if (num >= 20) {
      current += tens[Math.floor(num / 10)] + ' ';
      if (num % 10 > 0) {
        current += units[num % 10] + ' ';
      }
    } else if (num > 0) {
      current += units[num] + ' ';
    }
    return current;
  };

  const integerPart = Math.floor(amount);
  if (integerPart === 0) return 'Zero Rupees Only';

  let result = '';
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crore > 0) result += convertLessThanOneThousand(crore) + 'Crore ';
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + 'Lakh ';
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + 'Thousand ';
  if (remainder > 0) result += convertLessThanOneThousand(remainder);

  return 'Rupees ' + result.trim() + ' Only';
}

/**
 * Generates HTML for 80mm standard POS thermal printer
 */
export function generateBillHtml80mm(data: BillPrintData): string {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => (isDevanagari ? toDevanagariNumerals(val) : String(val));

  const hotelName = data.hotelName || 'ROYAL PALACE HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Shop No. 12, Shree Complex, Pune - 411028';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const phone = data.phone || '+91 98765 43210';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));
  const discount = Number(data.discount || 0);

  const headerTitle = isDevanagari
    ? data.language === 'hi'
      ? 'कर चालान / TAX INVOICE'
      : 'कर पावती / TAX INVOICE'
    : 'TAX INVOICE / FINAL BILL';
  const invLabel = isDevanagari ? (data.language === 'hi' ? 'चालान सं.:' : 'पावती क्र.:') : 'INV NO:';
  const tableLabel = isDevanagari ? 'टेबल:' : 'TABLE:';
  const dateLabel = isDevanagari ? 'तारीख:' : 'DATE:';
  const timeLabel = isDevanagari ? 'वेळ:' : 'TIME:';
  const guestLabel = isDevanagari ? (data.language === 'hi' ? 'अतिथि:' : 'ग्राहक:') : 'GUEST:';
  const payLabel = isDevanagari ? (data.language === 'hi' ? 'भुगतान:' : 'पेमेंट:') : 'PAY:';
  const itemHeader = isDevanagari ? (data.language === 'hi' ? 'वस्तु' : 'पदार्थ') : 'ITEM';
  const qtyHeader = isDevanagari ? (data.language === 'hi' ? 'मात्रा' : 'प्रमाण') : 'QTY';
  const rateHeader = isDevanagari ? 'दर' : 'RATE';
  const totalHeader = isDevanagari ? (data.language === 'hi' ? 'कुल' : 'एकूण') : 'TOTAL';
  const grandTotalLabel = isDevanagari ? (data.language === 'hi' ? 'कुल देय राशि' : 'एकूण देय रक्कम') : 'GRAND TOTAL';
  const defaultFooterNote = isDevanagari
    ? data.language === 'hi'
      ? 'हमारे यहाँ भोजन करने के लिए धन्यवाद! फिर पधारें।'
      : 'आमच्याकडे जेवणाचा आनंद घेतल्याबद्दल धन्यवाद! पुन्हा अवश्य भेट द्या.'
    : 'Thank you for dining with Royal Palace Hotel! Visit again.';

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 3px 0; text-align: left; font-size: 12px; font-weight: bold;">${it.name}</td>
        <td style="padding: 3px 0; text-align: center; font-size: 12px;">${fmtNum(it.quantity)}</td>
        <td style="padding: 3px 0; text-align: right; font-size: 12px;">${fmtNum(Number(it.price).toFixed(2))}</td>
        <td style="padding: 3px 0; text-align: right; font-size: 12px; font-weight: bold;">${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bill_${data.invoiceNumber}_80mm</title>
  <style>
    @page { size: 80mm auto; margin: 0mm !important; }
    * { box-sizing: border-box !important; margin: 0; padding: 0; }
    body {
      width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important;
      padding: 4mm 3mm 6mm 3mm !important; background: #FFFFFF !important; color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', monospace !important;
      font-size: 12px; line-height: 1.3;
    }
    .receipt { width: 74mm !important; margin: 0 auto; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    .flex-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="text-center bold" style="font-size: 16px; letter-spacing: 0.5px;">${hotelName}</div>
    <div class="text-center" style="font-size: 10px; margin-top: 2px;">${hotelAddress}</div>
    <div class="text-center" style="font-size: 10px;">Phone: ${phone}</div>
    <div class="text-center" style="font-size: 10px;">GSTIN: ${gstin} | FSSAI: ${fssai}</div>
    
    <div class="double-divider"></div>
    <div class="text-center bold" style="font-size: 13px;">${headerTitle}</div>
    <div class="divider"></div>

    <div class="flex-row">
      <span>${invLabel} <strong class="bold">${fmtNum(data.invoiceNumber)}</strong></span>
      <span>${tableLabel} <strong class="bold">${fmtNum(data.tableName)}</strong></span>
    </div>
    <div class="flex-row">
      <span>${dateLabel} ${dateStr}</span>
      <span>${timeLabel} ${timeStr}</span>
    </div>
    <div class="flex-row">
      <span>${guestLabel} ${data.customerName || 'Walk-in'}</span>
      <span>${payLabel} <strong class="bold">${data.paymentMode || 'PAID'}</strong></span>
    </div>

    <div class="divider"></div>

    <table>
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th style="text-align: left; font-size: 11px; padding: 2px 0;">${itemHeader}</th>
          <th style="text-align: center; font-size: 11px; padding: 2px 0;">${qtyHeader}</th>
          <th style="text-align: right; font-size: 11px; padding: 2px 0;">${rateHeader}</th>
          <th style="text-align: right; font-size: 11px; padding: 2px 0;">${totalHeader}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="flex-row">
      <span>Subtotal</span>
      <span>₹ ${subtotal}</span>
    </div>
    <div class="flex-row">
      <span>CGST (${fmtNum('2.5%')})</span>
      <span>₹ ${cgst}</span>
    </div>
    <div class="flex-row">
      <span>SGST (${fmtNum('2.5%')})</span>
      <span>₹ ${sgst}</span>
    </div>
    ${
      discount > 0
        ? `<div class="flex-row">
            <span>Discount</span>
            <span>- ₹ ${fmtNum(discount.toFixed(2))}</span>
          </div>`
        : ''
    }

    <div class="double-divider"></div>

    <div class="flex-row bold" style="font-size: 14px;">
      <span>${grandTotalLabel}</span>
      <span>₹ ${total}</span>
    </div>

    <div class="double-divider"></div>

    <div class="text-center" style="font-size: 11px; margin-top: 6px;">
      ${data.footerNote || defaultFooterNote}
    </div>
    <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #555;">
      [80mm Standard Thermal Slip • Ajalkar POS]
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates HTML for 58mm compact portable Bluetooth POS thermal printer
 */
export function generateBillHtml58mm(data: BillPrintData): string {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => (isDevanagari ? toDevanagariNumerals(val) : String(val));

  const hotelName = data.hotelName || 'ROYAL PALACE HOTEL';
  const hotelAddress = data.hotelAddress || 'Pune - 411028';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));
  const discount = Number(data.discount || 0);

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 2px 0; text-align: left; font-size: 10px; font-weight: bold;">${it.name}</td>
        <td style="padding: 2px 0; text-align: center; font-size: 10px;">${fmtNum(it.quantity)}</td>
        <td style="padding: 2px 0; text-align: right; font-size: 10px; font-weight: bold;">${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bill_${data.invoiceNumber}_58mm</title>
  <style>
    @page { size: 58mm auto; margin: 0mm !important; }
    * { box-sizing: border-box !important; margin: 0; padding: 0; }
    body {
      width: 58mm !important; max-width: 58mm !important; margin: 0 auto !important;
      padding: 2mm 1.5mm 4mm 1.5mm !important; background: #FFFFFF !important; color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', monospace !important;
      font-size: 10px; line-height: 1.25;
    }
    .receipt { width: 52mm !important; margin: 0 auto; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 3px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    .flex-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="text-center bold" style="font-size: 13px;">${hotelName}</div>
    <div class="text-center" style="font-size: 8.5px;">${hotelAddress}</div>
    <div class="text-center" style="font-size: 8px;">GSTIN: ${gstin}</div>

    <div class="double-divider"></div>
    <div class="text-center bold" style="font-size: 11px;">TAX INVOICE (BILL)</div>
    <div class="divider"></div>

    <div class="flex-row" style="font-size: 9.5px;">
      <span>INV: ${fmtNum(data.invoiceNumber)}</span>
      <span>${fmtNum(data.tableName)}</span>
    </div>
    <div class="flex-row" style="font-size: 9px;">
      <span>${dateStr}</span>
      <span>${timeStr}</span>
    </div>
    <div class="flex-row" style="font-size: 9px;">
      <span>${data.customerName || 'Guest'}</span>
      <span class="bold">${data.paymentMode || 'PAID'}</span>
    </div>

    <div class="divider"></div>

    <table>
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th style="text-align: left; font-size: 9.5px; padding: 1px 0;">ITEM</th>
          <th style="text-align: center; font-size: 9.5px; padding: 1px 0;">QTY</th>
          <th style="text-align: right; font-size: 9.5px; padding: 1px 0;">AMT</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="flex-row">
      <span>Subtotal</span>
      <span>₹ ${subtotal}</span>
    </div>
    <div class="flex-row">
      <span>GST (5%)</span>
      <span>₹ ${fmtNum((Number(data.cgst || 0) + Number(data.sgst || 0)).toFixed(2))}</span>
    </div>
    ${
      discount > 0
        ? `<div class="flex-row">
            <span>Discount</span>
            <span>-₹ ${fmtNum(discount.toFixed(2))}</span>
          </div>`
        : ''
    }

    <div class="double-divider"></div>

    <div class="flex-row bold" style="font-size: 12px;">
      <span>TOTAL PAID</span>
      <span>₹ ${total}</span>
    </div>

    <div class="double-divider"></div>
    <div class="text-center" style="font-size: 9px; margin-top: 4px;">Thank you! Visit Again.</div>
    <div class="text-center" style="font-size: 7.5px; color: #555; margin-top: 2px;">[58mm Mini POS • Ajalkar]</div>
  </div>
</body>
</html>`;
}

/**
 * Generates HTML for A4 full-page GST Tax Invoice sheet
 */
export function generateBillHtmlA4(data: BillPrintData): string {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => (isDevanagari ? toDevanagariNumerals(val) : String(val));

  const hotelName = data.hotelName || 'ROYAL PALACE HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Shop No. 12, Shree Complex, Station Road, Pune - 411028, Maharashtra';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const phone = data.phone || '+91 98765 43210';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotalNum = Number(data.subtotal || 0);
  const cgstNum = Number(data.cgst || 0);
  const sgstNum = Number(data.sgst || 0);
  const totalNum = Number(data.total || 0);
  const discountNum = Number(data.discount || 0);

  const subtotal = fmtNum(subtotalNum.toFixed(2));
  const cgst = fmtNum(cgstNum.toFixed(2));
  const sgst = fmtNum(sgstNum.toFixed(2));
  const total = fmtNum(totalNum.toFixed(2));
  const discount = fmtNum(discountNum.toFixed(2));

  const amountInWords = numberToWordsINR(totalNum);

  const itemsHtml = data.items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #E5E7EB; background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAF9'};">
        <td style="padding: 10px 12px; text-align: center; color: #6B7280; font-size: 12px;">${fmtNum(idx + 1)}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #1F2937;">${it.name}</td>
        <td style="padding: 10px 12px; text-align: center; color: #6B7280; font-size: 12px;">996331</td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 700;">${fmtNum(it.quantity)}</td>
        <td style="padding: 10px 12px; text-align: right;">₹ ${fmtNum(Number(it.price).toFixed(2))}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #111827;">₹ ${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>GST_Tax_Invoice_${data.invoiceNumber}_A4</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px; line-height: 1.4; color: #1F2937; background: #FFFFFF; padding: 12px;
    }
    .invoice-card {
      max-width: 820px; margin: 0 auto; border: 2px solid #E5E7EB; border-radius: 12px; padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header-box {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #EA580C; padding-bottom: 18px; margin-bottom: 20px;
    }
    .hotel-name { font-size: 24px; font-weight: 900; color: #C2410C; letter-spacing: 0.5px; }
    .badge-tax-invoice {
      background: #FFF7ED; border: 1.5px solid #F97316; color: #C2410C; padding: 6px 16px;
      border-radius: 8px; font-size: 16px; font-weight: 800; text-align: right;
    }
    .grid-meta {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;
    }
    .table-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table-items th {
      background: #EA580C; color: #FFFFFF; font-size: 12px; font-weight: 800;
      padding: 10px 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .footer-grid { display: flex; justify-content: space-between; gap: 20px; margin-top: 16px; }
    .bank-box {
      flex: 1.2; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; font-size: 12px;
    }
    .totals-box { width: 340px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 8px; font-size: 13px; }
    .totals-row-grand {
      background: #FFF7ED; border-top: 2px solid #EA580C; border-bottom: 2px solid #EA580C;
      font-size: 17px !important; font-weight: 900; color: #C2410C; padding: 10px 8px; margin-top: 6px;
    }
    .sign-row {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: 36px; padding-top: 16px; border-top: 1px dashed #CBD5E1;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-box">
      <div>
        <div class="hotel-name">${hotelName}</div>
        <div style="font-size: 12px; color: #4B5563; margin-top: 4px;">${hotelAddress}</div>
        <div style="font-size: 12px; color: #4B5563;">Phone: ${phone} | Email: billing@royalpalace.com</div>
        <div style="font-size: 12px; font-weight: 700; color: #1E293B; margin-top: 4px;">
          GSTIN: ${gstin} | FSSAI Lic No: ${fssai} | State: Maharashtra (27)
        </div>
      </div>
      <div>
        <div class="badge-tax-invoice">ORIGINAL TAX INVOICE</div>
        <div style="text-align: right; margin-top: 8px; font-size: 13px; font-weight: 700; color: #374151;">
          Invoice No: <span style="color: #EA580C;">${fmtNum(data.invoiceNumber)}</span>
        </div>
        <div style="text-align: right; font-size: 12px; color: #6B7280;">Date: ${dateStr} ${timeStr}</div>
      </div>
    </div>

    <div class="grid-meta">
      <div>
        <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 800;">Billed To / Guest Details</div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">${data.customerName || 'Walk-in Guest'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Table: <strong>${fmtNum(data.tableName)}</strong> (Dine-In Restaurant)</div>
        <div style="font-size: 12px; color: #475569;">POS Terminal: Counter 01 • Main Hall</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 800;">Payment & Order Info</div>
        <div style="font-size: 14px; font-weight: 800; color: #16A34A; margin-top: 2px;">PAID / SETTLED (${data.paymentMode || 'CASH'})</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Place of Supply: Maharashtra (Code: 27)</div>
        <div style="font-size: 12px; color: #475569;">Tax Slabs Applicable: CGST (2.5%) + SGST (2.5%) = 5%</div>
      </div>
    </div>

    <table class="table-items">
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="width: 90px; text-align: center;">HSN/SAC</th>
          <th style="width: 70px; text-align: center;">Qty</th>
          <th style="width: 110px; text-align: right;">Unit Rate (₹)</th>
          <th style="width: 120px; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="footer-grid">
      <div class="bank-box">
        <div style="font-weight: 800; color: #0F172A; margin-bottom: 4px;">Bank & Settlement Details:</div>
        <div>Bank Name: <strong>State Bank of India</strong></div>
        <div>Account Name: <strong>Royal Palace Hotel & Resto</strong></div>
        <div>Account Number: <strong>412389920112</strong></div>
        <div>IFSC Code: <strong>SBIN0001234</strong> (Camp Branch)</div>
        <div>UPI ID: <strong>royalpalace@upi</strong></div>
        <div style="margin-top: 8px; font-weight: 700; color: #059669;">
          Amount in Words: <em>${amountInWords}</em>
        </div>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span style="color: #6B7280;">Subtotal (Taxable Value):</span>
          <span style="font-weight: 700;">₹ ${subtotal}</span>
        </div>
        <div class="totals-row">
          <span style="color: #6B7280;">Central GST (CGST 2.5%):</span>
          <span style="font-weight: 700;">₹ ${cgst}</span>
        </div>
        <div class="totals-row">
          <span style="color: #6B7280;">State GST (SGST 2.5%):</span>
          <span style="font-weight: 700;">₹ ${sgst}</span>
        </div>
        ${
          discountNum > 0
            ? `<div class="totals-row" style="color: #DC2626;">
                <span>Promotional Discount:</span>
                <span style="font-weight: 700;">- ₹ ${discount}</span>
              </div>`
            : ''
        }
        <div class="totals-row totals-row-grand">
          <span>GRAND TOTAL:</span>
          <span>₹ ${total}</span>
        </div>
      </div>
    </div>

    <div class="sign-row">
      <div style="font-size: 11.5px; color: #64748B; max-width: 440px;">
        <strong>Terms & Conditions:</strong><br />
        1. All food & beverages items are billed inclusive of applicable GST taxes.<br />
        2. Computer generated tax invoice, no physical signature required.<br />
        3. Thank you for dining with Royal Palace Hotel! Please visit again.
      </div>
      <div style="text-align: center; width: 220px;">
        <div style="font-size: 11px; color: #64748B; margin-bottom: 35px;">For ${hotelName}</div>
        <div style="border-top: 1px solid #94A3B8; font-weight: 700; font-size: 12px; color: #1E293B; padding-top: 4px;">
          Authorized Signatory
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal print handler that triggers real system printing across Web, Android, and iOS.
 */
export async function executePrint(html: string, title: string = 'Tax Invoice'): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            const printWin = window.open('', '_blank');
            if (printWin) {
              printWin.document.write(html);
              printWin.document.close();
              printWin.focus();
              printWin.print();
            }
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(printFrame);
              } catch {}
            }, 3000);
          }
        }, 350);
        return;
      }
    } catch {
      window.print();
      return;
    }
  }

  // Mobile Device (Android / iOS / Expo Go)
  try {
    await Print.printAsync({ html });
  } catch (err: any) {
    console.warn('[Print] printAsync failed, falling back to printToFileAsync + sharing:', err);
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && uri) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Print / Save ${title}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (shareErr: any) {
      console.error('[Print] Sharing failed:', shareErr);
      Alert.alert('Print Error', shareErr?.message || 'Could not print invoice. Please ensure printer is connected.');
    }
  }
}

/**
 * Prints Customer Bill in selected format ('80mm' | '58mm' | 'a4')
 */
export async function printCustomerBill(data: BillPrintData, format: PrintFormat = '80mm'): Promise<void> {
  let html = '';
  let title = `Bill_${data.invoiceNumber}_${format}`;
  if (format === '58mm') {
    html = generateBillHtml58mm(data);
  } else if (format === 'a4') {
    html = generateBillHtmlA4(data);
    title = `Tax_Invoice_${data.invoiceNumber}_A4`;
  } else {
    html = generateBillHtml80mm(data);
  }

  await executePrint(html, title);
}

export const printCustomerBill80mm = async (data: BillPrintData) => printCustomerBill(data, '80mm');
export const printCustomerBill58mm = async (data: BillPrintData) => printCustomerBill(data, '58mm');
export const printCustomerBillA4 = async (data: BillPrintData) => printCustomerBill(data, 'a4');

/**
 * Generates HTML for 80mm KOT Ticket
 */
export function generateKotHtml80mm(data: KotPrintData): string {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => (isDevanagari ? toDevanagariNumerals(val) : String(val));

  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  const kotTitle = isDevanagari ? '*** किचन ऑर्डर तिकीट (KOT) ***' : '*** KITCHEN ORDER TICKET ***';
  const tableLabel = isDevanagari ? 'टेबल:' : 'TABLE:';
  const waiterLabel = isDevanagari ? 'वेटर:' : 'WAITER:';
  const guestLabel = isDevanagari ? 'ग्राहक:' : 'GUEST:';
  const dateLabel = isDevanagari ? 'तारीख:' : 'DATE:';
  const timeLabel = isDevanagari ? 'वेळ:' : 'TIME:';
  const dishHeader = isDevanagari ? 'पदार्थ' : 'DISH / ITEM';
  const qtyHeader = isDevanagari ? 'प्रमाण' : 'QTY';

  const itemsHtml = data.items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 4px 0; text-align: left; font-size: 13px; font-weight: bold;">
          ${fmtNum(idx + 1)}. ${it.name}
          ${it.notes ? `<div style="font-size: 10px; font-weight: normal; color: #333;">↳ Note: ${it.notes}</div>` : ''}
        </td>
        <td style="padding: 4px 0; text-align: right; font-size: 15px; font-weight: bold;">x ${fmtNum(it.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>KOT_${data.kotNumber}_80mm</title>
  <style>
    @page { size: 80mm auto; margin: 0mm !important; }
    * { box-sizing: border-box !important; margin: 0; padding: 0; }
    body {
      width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important;
      padding: 4mm 3mm 6mm 3mm !important; background: #FFFFFF !important; color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', monospace !important;
      font-size: 13px; line-height: 1.3;
    }
    .kot { width: 74mm !important; margin: 0 auto; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    .flex-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="kot">
    <div class="text-center bold" style="font-size: 17px; letter-spacing: 1px;">${kotTitle}</div>
    <div class="double-divider"></div>

    <div class="flex-row bold" style="font-size: 16px;">
      <span>${tableLabel} ${fmtNum(data.tableName)}</span>
      <span>${fmtNum(data.kotNumber)}</span>
    </div>
    <div class="flex-row">
      <span>${waiterLabel} ${data.serverName || 'Counter'}</span>
      <span>${guestLabel} ${data.guestName || 'Dine-In'}</span>
    </div>
    <div class="flex-row">
      <span>${dateLabel} ${dateStr}</span>
      <span>${timeLabel} ${timeStr}</span>
    </div>

    <div class="double-divider"></div>

    <table>
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th style="text-align: left; font-size: 12px; padding: 2px 0;">${dishHeader}</th>
          <th style="text-align: right; font-size: 12px; padding: 2px 0;">${qtyHeader}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="divider"></div>

    ${
      data.instructions
        ? `<div style="margin: 4px 0; font-size: 11px;">
            <strong>NOTE:</strong> ${data.instructions}
          </div>
          <div class="divider"></div>`
        : ''
    }

    <div class="text-center bold" style="font-size: 12px; margin-top: 4px;">
      TOTAL DISHES: ${data.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
    </div>
    <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #555;">
      [80mm Kitchen Thermal Slip • Ajalkar POS]
    </div>
  </div>
</body>
</html>`;
}

export async function printKotTicket80mm(data: KotPrintData): Promise<void> {
  const html = generateKotHtml80mm(data);
  await executePrint(html, `KOT_${data.kotNumber}`);
}

export const printKotTicket = printKotTicket80mm;
