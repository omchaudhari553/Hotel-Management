import { Platform, Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { toDevanagariNumerals } from '../locales/translations';
import { NativePrinterManager } from '../services/nativePrinterManager';
import { UniversalInvoicePrintData } from '../types/printing';

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
  tableName: string;
  customerName?: string;
  phone?: string;
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

export type PrintFormat = '80mm' | '58mm' | 'a4' | 'A4';

/**
 * Direct Bluetooth / USB Thermal Printer dispatch.
 * In Android & Expo Go:
 * Uses Android Print Spooler (Print.printAsync) which sends directly to the paired
 * Bluetooth thermal printer (POS-80, POS-58, etc.) or USB OTG thermal printer.
 * If print dialog is canceled or unavailable, provides PDF share fallback.
 */
export const directBluetoothPrintAsync = async (html: string, windowTitle: string, lang?: 'en' | 'mr' | 'hi'): Promise<void> => {
  if (Platform.OS === 'web') {
    return executeNativeOrWebPrint(html, windowTitle, lang);
  }

  // 1. Send directly to Android System Print Spooler so user can pick paired Bluetooth or USB printer
  try {
    const printFn =
      (typeof Print?.printAsync === 'function' ? Print.printAsync : null) ||
      (typeof (Print as any)?.default?.printAsync === 'function' ? (Print as any).default.printAsync : null);

    if (printFn) {
      await printFn({ html });
      return;
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('User canceled') || msg.includes('Canceled') || msg.includes('cancelled')) {
      return;
    }
    console.warn('directBluetoothPrintAsync printAsync failed:', err);
    const isMr = lang === 'mr';
    const isHi = lang === 'hi';
    Alert.alert(
      isMr ? 'ब्लूटूथ प्रिंटर' : isHi ? 'ब्लूटूथ प्रिंटर' : 'Bluetooth Printer',
      isMr
        ? 'ब्लूटूथ प्रिंटरवर प्रिंट पाठवता आले नाही. कृपया प्रिंटर पेअर असल्याची खात्री करा किंवा सिस्टिम प्रिंट वापरा.'
        : isHi
          ? 'ब्लूटूथ प्रिंटर पर प्रिंट नहीं भेजा जा सका। कृपया जांचें कि प्रिंटर पेयर है या सिस्टम प्रिंट का उपयोग करें।'
          : 'Could not send print to Bluetooth printer. Please ensure printer is paired or use System Print.'
    );
    return;
  }

  Alert.alert(
    'Print Notification',
    'Print job triggered. If the dialog did not appear, please verify Bluetooth printer is active.'
  );
};

export const safePrintAsync = async (html: string, windowTitle: string, lang?: 'en' | 'mr' | 'hi'): Promise<void> => {
  // 1. Resolve printAsync safely across different bundler / module export formats
  const printFn =
    (typeof Print?.printAsync === 'function' ? Print.printAsync : null) ||
    (typeof (Print as any)?.default?.printAsync === 'function' ? (Print as any).default.printAsync : null);

  if (printFn) {
    try {
      await printFn({ html });
      return;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('User canceled') || msg.includes('Canceled') || msg.includes('cancelled')) {
        return; // User canceled the print dialog intentionally
      }
      console.warn('Native printAsync failed:', err);
      const isMr = lang === 'mr';
      const isHi = lang === 'hi';
      Alert.alert(
        isMr ? 'सिस्टिम प्रिंट' : isHi ? 'सिस्टम प्रिंट' : 'System Print',
        isMr
          ? 'सिस्टिम प्रिंटर संवाद सुरू करता आला नाही. कृपया प्रिंटर सेटिंग तपासा.'
          : isHi
            ? 'सिस्टम प्रिंटर संवाद शुरू नहीं किया जा सका। कृपया प्रिंटर सेटिंग्स जांचें।'
            : 'Could not open system print spooler dialog. Please verify printer settings.'
      );
      return;
    }
  }

  Alert.alert(
    'Print Notification',
    'Print job triggered. If the dialog did not appear, please verify system print spooler is active.'
  );
};

const executeNativeOrWebPrint = async (html: string, windowTitle: string, lang?: 'en' | 'mr' | 'hi'): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.open) {
      const printWindow = window.open('', '_blank', 'width=420,height=650');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
        return;
      }
    }
    const isMr = lang === 'mr';
    Alert.alert(
      isMr ? 'प्रिंट सूचना' : 'Print Notice',
      isMr ? `कृपया ${windowTitle} प्रिंट करण्यासाठी पॉपअप्स अनुमती द्या.` : `Please allow popups to print ${windowTitle}.`
    );
  } else {
    await safePrintAsync(html, windowTitle, lang);
  }
};

/**
 * 58mm Thermal Receipt Generator (2-inch width / 384 dots)
 * Perfectly aligned columns, 0 overflow, zero bottom whitespace
 */
export const printCustomerBill58mm = async (data: BillPrintData, isDirectBluetooth: boolean = false): Promise<void> => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

  const hotelName = data.hotelName || 'AJALKAR HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));
  const discount = Number(data.discount || 0);

  const headerTitle = isDevanagari ? 'कर पावती / TAX INVOICE' : 'TAX INVOICE';
  const invLabel = isDevanagari ? 'पावती:' : 'INV:';
  const tableLabel = isDevanagari ? 'टेबल:' : 'Table:';
  const itemHeader = isDevanagari ? 'पदार्थ' : 'ITEM';
  const qtyHeader = isDevanagari ? 'प्रमाण' : 'QTY';
  const amtHeader = isDevanagari ? 'रक्कम' : 'AMT';
  const subtotalLabel = isDevanagari ? 'उप-एकूण:' : 'Subtotal:';
  const discountLabel = isDevanagari ? 'सूट:' : 'Discount:';
  const grandTotalLabel = isDevanagari ? 'एकूण रक्कम:' : 'GRAND TOTAL:';
  const defaultFooterNote = isDevanagari
    ? (data.language === 'hi' ? 'भोजन के लिए धन्यवाद! फिर पधारें।' : 'भेट दिल्याबद्दल धन्यवाद! पुन्हा या.')
    : 'Thank you for dining with us! Visit again.';

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 2px 0; text-align: left; font-size: 11px; font-weight: bold; word-break: break-word;">${it.name}</td>
        <td style="padding: 2px 0; text-align: center; font-size: 11px; white-space: nowrap;">${fmtNum(it.quantity)}</td>
        <td style="padding: 2px 0; text-align: right; font-size: 11px; white-space: nowrap; font-weight: bold;">${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bill_${data.invoiceNumber}_58mm</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    body {
      width: 58mm !important;
      max-width: 58mm !important;
      margin: 0 auto !important;
      padding: 1.5mm 1.5mm 0.5mm 1.5mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', Courier, monospace !important;
      font-size: 11px;
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .double-divider {
      border-top: 2px dashed #000;
      margin: 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    @media print {
      body {
        width: 58mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="text-center bold" style="font-size: 13px; text-transform: uppercase;">${hotelName}</div>
  <div class="text-center" style="font-size: 8.5px; margin-top: 1px;">${hotelAddress}</div>
  <div class="text-center" style="font-size: 8.5px;">Tel: +91 98765 43210</div>
  <div class="text-center bold" style="font-size: 8.5px;">GSTIN: ${gstin}</div>
  <div class="text-center" style="font-size: 8px;">FSSAI: ${fssai}</div>

  <div class="divider"></div>

  <div class="flex-row">
    <span>${invLabel} #${fmtNum(data.invoiceNumber)}</span>
    <span>${dateStr}</span>
  </div>
  <div class="flex-row">
    <span>${tableLabel} ${fmtNum(data.tableName)}</span>
    <span>${timeStr}</span>
  </div>
  ${data.customerName ? `<div class="flex-row"><span>Guest: ${data.customerName}</span></div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="width: 55%; text-align: left; font-size: 10px; padding-bottom: 2px;">${itemHeader}</th>
        <th style="width: 18%; text-align: center; font-size: 10px; padding-bottom: 2px;">${qtyHeader}</th>
        <th style="width: 27%; text-align: right; font-size: 10px; padding-bottom: 2px;">${amtHeader}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="flex-row">
    <span>${subtotalLabel}</span>
    <span>₹ ${subtotal}</span>
  </div>
  <div class="flex-row">
    <span>CGST (${fmtNum('2.5%')}):</span>
    <span>+ ₹ ${cgst}</span>
  </div>
  <div class="flex-row">
    <span>SGST (${fmtNum('2.5%')}):</span>
    <span>+ ₹ ${sgst}</span>
  </div>
  ${discount > 0
      ? `<div class="flex-row">
          <span>${discountLabel}</span>
          <span>- ₹ ${fmtNum(discount.toFixed(2))}</span>
        </div>`
      : ''
    }

  <div class="double-divider"></div>

  <div class="flex-row bold" style="font-size: 13px;">
    <span>${grandTotalLabel}</span>
    <span>₹ ${total}</span>
  </div>

  <div class="double-divider"></div>

  <div class="flex-row" style="font-size: 10px;">
    <span>Pay: ${data.paymentMode || 'CASH'}</span>
    <span class="bold">[PAID]</span>
  </div>

  <div class="text-center bold" style="font-size: 10px; margin: 2px auto 0 auto; text-align: center; line-height: 1.25;">${(data.footerNote || defaultFooterNote).trim().split('\n').map((l: string) => l.trim()).filter(Boolean).join('<br />')}</div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 500);
      }, 250);
    };
  </script>
</body>
</html>`;

  if (isDirectBluetooth) { await directBluetoothPrintAsync(html, '58mm bill', data.language); } else { await executeNativeOrWebPrint(html, '58mm bill', data.language); }
};

/**
 * 80mm Thermal Receipt Generator (3-inch width / 576 dots)
 */
export const printCustomerBill80mm = async (data: BillPrintData, isDirectBluetooth: boolean = false): Promise<void> => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

  const hotelName = data.hotelName || 'AJALKAR HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));
  const discount = Number(data.discount || 0);

  const headerTitle = isDevanagari ? 'कर पावती / TAX INVOICE' : 'TAX INVOICE / FINAL BILL';
  const invLabel = isDevanagari ? 'पावती क्र. (INV):' : 'INV NO:';
  const tableLabel = isDevanagari ? 'टेबल (TBL):' : 'TABLE:';
  const dateLabel = isDevanagari ? 'तारीख (DATE):' : 'DATE:';
  const timeLabel = isDevanagari ? 'वेळ (TIME):' : 'TIME:';
  const guestLabel = isDevanagari ? 'ग्राहक (GUEST):' : 'GUEST:';
  const payLabel = isDevanagari ? 'पेमेंट (PAY):' : 'PAY:';
  const itemHeader = isDevanagari ? 'पदार्थ (ITEM)' : 'ITEM';
  const qtyHeader = isDevanagari ? 'प्रमाण (QTY)' : 'QTY';
  const rateHeader = isDevanagari ? 'दर (RATE)' : 'RATE';
  const totalHeader = isDevanagari ? 'एकूण (TOTAL)' : 'TOTAL';
  const subtotalLabel = isDevanagari ? 'उप-एकूण (Subtotal)' : 'Subtotal';
  const discountLabel = isDevanagari ? 'सूट (Discount)' : 'Discount';
  const grandTotalLabel = isDevanagari ? 'एकूण देय रक्कम (GRAND TOTAL)' : 'GRAND TOTAL';
  const defaultFooterNote = isDevanagari
    ? (data.language === 'hi' ? 'हमारे यहाँ भोजन करने के लिए धन्यवाद! फिर पधारें।' : 'आमच्याकडे जेवणाचा आनंद घेतल्याबद्दल धन्यवाद! पुन्हा अवश्य भेट द्या.')
    : 'Thank you for dining with us! Visit again.';

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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Bill_${data.invoiceNumber}_80mm</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      padding: 2mm 2mm 0.5mm 2mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', Courier, monospace !important;
      font-size: 12px;
      line-height: 1.3;
    }
    .receipt {
      width: 74mm !important;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px dashed #000;
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    @media print {
      body {
        width: 80mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="text-center bold" style="font-size: 15px; letter-spacing: 0.5px;">${hotelName}</div>
    <div class="text-center" style="font-size: 10px; margin-top: 2px;">${hotelAddress}</div>
    <div class="text-center" style="font-size: 10px;">Tel: +91 98765 43210</div>
    <div class="text-center" style="font-size: 10px;">GSTIN: ${gstin} | FSSAI: ${fssai}</div>
    
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
      <span>${subtotalLabel}</span>
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
    ${discount > 0
      ? `<div class="flex-row">
            <span>${discountLabel}</span>
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

    <div class="text-center bold" style="font-size: 11px; margin: 3px auto 0 auto; text-align: center; line-height: 1.3;">${(data.footerNote || defaultFooterNote).trim().split('\n').map((l: string) => l.trim()).filter(Boolean).join('<br />')}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 500);
      }, 250);
    };
  </script>
</body>
</html>`;

  if (isDirectBluetooth) { await directBluetoothPrintAsync(html, '80mm bill', data.language); } else { await executeNativeOrWebPrint(html, '80mm bill', data.language); }
};

/**
 * A4 Standard Invoice Generator
 */
export const printCustomerBillA4 = async (data: BillPrintData, isDirectBluetooth: boolean = false): Promise<void> => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

  const hotelName = data.hotelName || 'AJALKAR HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));

  const itemsHtml = data.items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${fmtNum(idx + 1)}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${it.name}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${fmtNum(it.quantity)}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">₹ ${fmtNum(Number(it.price).toFixed(2))}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">₹ ${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice_${data.invoiceNumber}_A4</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: sans-serif; margin: 0; padding: 12px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #ccc; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0 0 4px 0;">${hotelName}</h2>
    <div>${hotelAddress}</div>
    <div>GSTIN: ${gstin} | FSSAI: ${fssai}</div>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
    <div><strong>Invoice #:</strong> ${fmtNum(data.invoiceNumber)}<br/><strong>Table:</strong> ${fmtNum(data.tableName)}</div>
    <div style="text-align: right;"><strong>Date:</strong> ${dateStr}<br/><strong>Payment:</strong> ${data.paymentMode || 'PAID'}</div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="margin-top: 16px; width: 280px; margin-left: auto;">
    <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Subtotal:</span><span>₹ ${subtotal}</span></div>
    <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>CGST (2.5%):</span><span>+ ₹ ${cgst}</span></div>
    <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>SGST (2.5%):</span><span>+ ₹ ${sgst}</span></div>
    <div style="display:flex; justify-content:space-between; font-weight: bold; border-top: 2px solid #000; padding: 6px 0; font-size: 16px;">
      <span>Grand Total:</span><span>₹ ${total}</span>
    </div>
  </div>
  <div style="text-align: center; margin-top: 30px; font-size: 13px; color: #555;">
    Thank you for dining with us! Visit again.
  </div>
</body>
</html>`;

  if (isDirectBluetooth) { await directBluetoothPrintAsync(html, 'A4 Invoice'); } else { await executeNativeOrWebPrint(html, 'A4 Invoice'); }
};

/**
 * Universal printCustomerBill dispatcher supporting '58mm', '80mm', and 'A4'
 */
export const printCustomerBill = async (
  data: BillPrintData,
  format: PrintFormat = '80mm',
  isDirectBluetooth: boolean = false
): Promise<void> => {
  const norm = String(format || '80mm').toLowerCase();
  if (norm.includes('58')) {
    return await printCustomerBill58mm(data, isDirectBluetooth);
  } else if (norm.includes('a4')) {
    return await printCustomerBillA4(data, isDirectBluetooth);
  }
  return await printCustomerBill80mm(data, isDirectBluetooth);
};

export const printCustomerBillDirectBluetooth = async (
  data: BillPrintData,
  format: PrintFormat = '80mm'
): Promise<void> => {
  return await printCustomerBill(data, format, true);
};

/**
 * Clean Customer Bill HTML Generator for PDF sharing with Thank You message
 */
export const generateCustomerBillHtml = (
  data: BillPrintData,
  format: PrintFormat = '80mm'
): string => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => (isDevanagari ? toDevanagariNumerals(val) : String(val));
  const is58 = String(format).toLowerCase().includes('58');
  const isA4 = String(format).toLowerCase().includes('a4');

  const hotelName = data.hotelName || 'AJALKAR HOTEL & RESTAURANT';
  const hotelAddress = data.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004';
  const gstin = data.gstin || '27AAKCA1234F1Z5';
  const fssai = data.fssai || '11521034000123';
  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const subtotal = fmtNum(Number(data.subtotal || 0).toFixed(2));
  const cgst = fmtNum(Number(data.cgst || 0).toFixed(2));
  const sgst = fmtNum(Number(data.sgst || 0).toFixed(2));
  const total = fmtNum(Number(data.total || 0).toFixed(2));
  const discount = Number(data.discount || 0);

  const headerTitle = isDevanagari ? 'कर पावती / TAX INVOICE' : 'TAX INVOICE';
  const invLabel = isDevanagari ? 'पावती क्र.:' : 'Invoice:';
  const tableLabel = isDevanagari ? 'टेबल:' : 'Table:';
  const guestLabel = isDevanagari ? 'ग्राहक:' : 'Guest:';
  const subtotalLabel = isDevanagari ? 'उप-एकूण:' : 'Subtotal:';
  const discountLabel = isDevanagari ? 'सूट:' : 'Discount:';
  const grandTotalLabel = isDevanagari ? 'एकूण देय रक्कम:' : 'GRAND TOTAL:';

  const itemsRows = (data.items || [])
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 4px 2px; text-align: left; font-size: ${is58 ? '10.5px' : isA4 ? '13px' : '12px'}; font-weight: 600;">
          ${isA4 ? `${fmtNum(idx + 1)}. ` : ''}${it.name}
        </td>
        <td style="padding: 4px 2px; text-align: center; font-size: ${is58 ? '10.5px' : isA4 ? '13px' : '12px'};">
          ${fmtNum(it.quantity)}
        </td>
        <td style="padding: 4px 2px; text-align: right; font-size: ${is58 ? '10.5px' : isA4 ? '13px' : '12px'};">
          ₹ ${fmtNum(Number(it.price).toFixed(2))}
        </td>
        <td style="padding: 4px 2px; text-align: right; font-size: ${is58 ? '10.5px' : isA4 ? '13px' : '12px'}; font-weight: 700;">
          ₹ ${fmtNum((Number(it.price) * Number(it.quantity)).toFixed(2))}
        </td>
      </tr>`
    )
    .join('');

  const bodyWidth = is58 ? '58mm' : isA4 ? '100%' : '80mm';
  const maxWidth = is58 ? '58mm' : isA4 ? '210mm' : '80mm';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice_${data.invoiceNumber || 'Receipt'}</title>
  <style>
    @page { size: ${is58 ? '58mm auto' : isA4 ? 'A4' : '80mm auto'}; margin: ${isA4 ? '12mm' : '0mm'}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${bodyWidth};
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: ${isA4 ? '16px' : '8px'};
      background: #FFFFFF;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Mukta', 'Noto Sans Devanagari', sans-serif;
      font-size: ${is58 ? '10.5px' : isA4 ? '13px' : '11.5px'};
      line-height: 1.3;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .hotel-name { font-size: ${is58 ? '13px' : isA4 ? '18px' : '15px'}; font-weight: 800; text-transform: uppercase; color: #111827; }
    .divider { border-bottom: 1px dashed #4b5563; margin: 5px 0; }
    .double-divider { border-bottom: 2px solid #111827; margin: 6px 0; }
    .flex-row { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th { font-weight: 700; border-bottom: 1.5px solid #111827; padding: 4px 2px; }
    .thank-you-box {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #6b7280;
      text-align: center;
    }
    .thank-you-title {
      font-size: ${is58 ? '11px' : isA4 ? '14px' : '12.5px'};
      font-weight: 800;
      color: #15803D;
      margin-bottom: 2px;
    }
    .thank-you-sub {
      font-size: ${is58 ? '9.5px' : isA4 ? '12px' : '10.5px'};
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="hotel-name">${hotelName}</div>
    <div style="font-size: ${is58 ? '9px' : '11px'}; color: #374151;">${hotelAddress}</div>
    <div style="font-size: ${is58 ? '9px' : '10.5px'}; color: #4b5563;">GSTIN: ${gstin} | FSSAI: ${fssai}</div>
  </div>

  <div class="divider"></div>
  <div class="text-center bold" style="font-size: ${is58 ? '11px' : '13px'}; color: #111827;">${headerTitle}</div>
  <div class="divider"></div>

  <div class="flex-row">
    <span>${invLabel} <b>#${fmtNum(data.invoiceNumber || 'INV-101')}</b></span>
    <span>${tableLabel} <b>${data.tableName}</b></span>
  </div>
  <div class="flex-row" style="color: #4b5563;">
    <span>${guestLabel} <b>${data.customerName || 'Walk-in Guest'}</b></span>
    <span>${data.paymentMode || 'CASH'}</span>
  </div>
  <div class="flex-row" style="font-size: ${is58 ? '9px' : '10px'}; color: #6b7280;">
    <span>${dateStr}</span>
    <span>${timeStr}</span>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">पदार्थ / ITEM</th>
        <th style="text-align: center;">QTY</th>
        <th style="text-align: right;">RATE</th>
        <th style="text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="flex-row">
    <span>${subtotalLabel}</span>
    <span>₹ ${subtotal}</span>
  </div>
  <div class="flex-row">
    <span>CGST (${fmtNum('2.5%')}):</span>
    <span>+ ₹ ${cgst}</span>
  </div>
  <div class="flex-row">
    <span>SGST (${fmtNum('2.5%')}):</span>
    <span>+ ₹ ${sgst}</span>
  </div>
  ${
    discount > 0
      ? `<div class="flex-row" style="color: #EA580C;">
          <span>${discountLabel}</span>
          <span>- ₹ ${fmtNum(discount.toFixed(2))}</span>
        </div>`
      : ''
  }

  <div class="double-divider"></div>

  <div class="flex-row bold" style="font-size: ${is58 ? '12px' : isA4 ? '16px' : '14px'}; color: #111827;">
    <span>${grandTotalLabel}</span>
    <span>₹ ${total}</span>
  </div>

  <div class="double-divider"></div>

  <div class="flex-row" style="font-size: ${is58 ? '9px' : '10.5px'};">
    <span>Payment Status:</span>
    <span class="bold" style="color: #15803D;">PAID & SETTLED ✓</span>
  </div>

  <div class="thank-you-box">
    <div class="thank-you-title">🙏 भेट दिल्याबद्दल धन्यवाद! पुन्हा अवश्य या.</div>
    <div class="thank-you-sub">Thank you for dining with us! Please visit again.</div>
  </div>
</body>
</html>`;
};

/**
 * Dedicated Share Bill PDF Function
 * Generates PDF with Thank You note and directly opens System Share (WhatsApp, Email, Drive, etc.)
 */
export const shareCustomerBillPdf = async (
  data: BillPrintData,
  format: PrintFormat = '80mm'
): Promise<void> => {
  const html = generateCustomerBillHtml(data, format);

  if (Platform.OS === 'web') {
    await executeNativeOrWebPrint(html, `Bill_${data.invoiceNumber || 'Receipt'}`);
    return;
  }

  try {
    const printToFileFn =
      (typeof Print?.printToFileAsync === 'function' ? Print.printToFileAsync : null) ||
      (typeof (Print as any)?.default?.printToFileAsync === 'function' ? (Print as any).default.printToFileAsync : null);

    if (printToFileFn) {
      // Must request base64 to ensure safe write into FileSystem.cacheDirectory.
      // On Android / Expo Go, direct printToFileAsync temp paths are located outside
      // the FileProvider-scoped directory, which causes:
      // "Call to function ExpoSharing.shareAsync has been rejected -> Not allowed to read file under given URL"
      const fileRes = await printToFileFn({ html, base64: true });
      if (fileRes) {
        let shareUri = fileRes.uri;

        try {
          const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
          if (baseDir) {
            const cleanInv = (data.invoiceNumber || 'Bill').replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetUri = `${baseDir}Bill_${cleanInv}.pdf`;

            if (fileRes.base64) {
              await FileSystem.writeAsStringAsync(targetUri, fileRes.base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              shareUri = targetUri;
            } else if (fileRes.uri) {
              await FileSystem.copyAsync({
                from: fileRes.uri,
                to: targetUri,
              });
              shareUri = targetUri;
            }
          }
        } catch (fsErr) {
          console.warn('Could not relocate PDF to cacheDirectory, trying original uri:', fsErr);
        }

        const isSharingAvailable =
          typeof Sharing?.isAvailableAsync === 'function' ? await Sharing.isAvailableAsync() : false;
        if (isSharingAvailable && typeof Sharing?.shareAsync === 'function' && shareUri) {
          const thanksTitle =
            data.language === 'mr'
              ? `पावती - भेट दिल्याबद्दल धन्यवाद! (${data.invoiceNumber || 'Bill'})`
              : data.language === 'hi'
              ? `रसीद - हमारे यहाँ पधारने के लिए धन्यवाद! (${data.invoiceNumber || 'Bill'})`
              : `Invoice - Thank you for dining with us! (${data.invoiceNumber || 'Bill'})`;

          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: thanksTitle,
            UTI: 'com.adobe.pdf',
          });
          return;
        }
      }
    }
    Alert.alert(
      data.language === 'mr' ? 'शेअर त्रुटी' : data.language === 'hi' ? 'शेयर त्रुटि' : 'Share Error',
      data.language === 'mr'
        ? 'या डिव्हाइसवर शेअरिंग उपलब्ध नाही.'
        : data.language === 'hi'
        ? 'इस डिवाइस पर शेयरिंग उपलब्ध नहीं है।'
        : 'Sharing is not available on this device.'
    );
  } catch (err: any) {
    console.error('shareCustomerBillPdf failed:', err);
    Alert.alert(
      data.language === 'mr' ? 'शेअर त्रुटी' : data.language === 'hi' ? 'शेयर त्रुटि' : 'Share Error',
      data.language === 'mr'
        ? 'बिल PDF शेअर करताना त्रुटी आली.'
        : data.language === 'hi'
        ? 'बिल PDF शेयर करते समय त्रुटि आई।'
        : err?.message || 'Failed to generate PDF for sharing.'
    );
  }
};

/**
 * 58mm Thermal KOT Ticket Generator (2-inch Kitchen Slip)
 */
export const printKotTicket58mm = async (data: KotPrintData, isDirectBluetooth: boolean = false): Promise<void> => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const kotTitle = isDevanagari ? '*** किचन ऑर्डर (KOT) ***' : '*** KITCHEN ORDER ***';

  const itemsHtml = data.items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 2.5px 0; text-align: left; font-size: 12px; font-weight: bold; word-break: break-word;">
          ${fmtNum(idx + 1)}. ${it.name}
          ${it.notes ? `<div style="font-size: 9.5px; font-weight: normal; color: #333;">↳ ${it.notes}</div>` : ''}
        </td>
        <td style="padding: 2.5px 0; text-align: right; font-size: 13px; font-weight: bold; white-space: nowrap;">x${fmtNum(it.quantity)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>KOT_${data.kotNumber}_58mm</title>
  <style>
    @page { size: 58mm auto; margin: 0mm !important; }
    * { box-sizing: border-box !important; margin: 0; padding: 0; }
    body {
      width: 58mm !important;
      max-width: 58mm !important;
      margin: 0 auto !important;
      padding: 1.5mm 1.5mm 0.5mm 1.5mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', Courier, monospace !important;
      font-size: 11px;
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 3px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    .flex-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="divider"></div>

  <div class="flex-row bold" style="font-size: 13px;">
    <span>Table: ${fmtNum(data.tableName)}</span>
    <span>#${fmtNum(data.kotNumber)}</span>
  </div>
  <div class="flex-row" style="font-size: 10px;">
    <span>${data.serverName || 'Counter'}</span>
    <span>${dateStr} ${timeStr}</span>
  </div>

  <div class="double-divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="text-align: left; font-size: 10px; padding: 2px 0;">ITEM</th>
        <th style="text-align: right; font-size: 10px; padding: 2px 0;">QTY</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="divider"></div>

  ${data.instructions
      ? `<div style="margin: 3px 0; font-size: 10px;">
          <strong>NOTE:</strong> ${data.instructions}
        </div>
        <div class="divider"></div>`
      : ''
    }

  <div class="text-center bold" style="font-size: 11px; margin-top: 3px;">
    TOTAL ITEMS: ${data.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 500);
      }, 250);
    };
  </script>
</body>
</html>`;

  if (isDirectBluetooth) { await directBluetoothPrintAsync(html, '58mm KOT'); } else { await executeNativeOrWebPrint(html, '58mm KOT'); }
};

/**
 * 80mm Thermal KOT Ticket Printer Utility
 */
export const printKotTicket80mm = async (data: KotPrintData, isDirectBluetooth: boolean = false): Promise<void> => {
  const isDevanagari = data.language === 'mr' || data.language === 'hi';
  const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

  const dateStr = fmtNum(data.date || new Date().toLocaleDateString('en-IN'));
  const timeStr = fmtNum(data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  const kotTitle = isDevanagari ? '*** किचन ऑर्डर तिकीट (KOT) ***' : '*** KITCHEN ORDER TICKET ***';
  const tableLabel = isDevanagari ? 'टेबल:' : 'TABLE:';
  const waiterLabel = isDevanagari ? 'वेटर:' : 'WAITER:';
  const guestLabel = isDevanagari ? 'ग्राहक:' : 'GUEST:';
  const dateLabel = isDevanagari ? 'तारीख:' : 'DATE:';
  const timeLabel = isDevanagari ? 'वेळ:' : 'TIME:';
  const dishHeader = isDevanagari ? 'पदार्थ (DISH)' : 'DISH / ITEM';
  const qtyHeader = isDevanagari ? 'प्रमाण (QTY)' : 'QTY';

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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>KOT_${data.kotNumber}_80mm</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      padding: 2mm 2mm 0.5mm 2mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', 'Mukta', 'Noto Sans Devanagari', Courier, monospace !important;
      font-size: 13px;
      line-height: 1.3;
    }
    .kot {
      width: 74mm !important;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px dashed #000;
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="kot">
    <div class="divider"></div>

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

    ${data.instructions
      ? `<div style="margin: 4px 0; font-size: 11px;">
            <strong>SPECIAL NOTE:</strong> ${data.instructions}
          </div>
          <div class="divider"></div>`
      : ''
    }

    <div class="text-center bold" style="font-size: 12px; margin-top: 4px;">
      TOTAL ITEMS: ${data.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 500);
      }, 250);
    };
  </script>
</body>
</html>`;

  if (isDirectBluetooth) { await directBluetoothPrintAsync(html, '80mm KOT'); } else { await executeNativeOrWebPrint(html, '80mm KOT'); }
};

/**
 * Universal printKotTicket dispatcher
 */
export const printKotTicket = (
  data: KotPrintData,
  format: PrintFormat = '80mm',
  isDirectBluetooth: boolean = false
) => {
  const norm = String(format || '80mm').toLowerCase();
  if (norm.includes('58')) {
    return printKotTicket58mm(data, isDirectBluetooth);
  }
  return printKotTicket80mm(data, isDirectBluetooth);
};

export const printKotTicketDirectBluetooth = (
  data: KotPrintData,
  format: PrintFormat = '80mm'
) => {
  return printKotTicket(data, format, true);
};

/**
 * Converts BillPrintData to UniversalInvoicePrintData for ESC/POS and Universal Renderers
 */
export const convertToUniversalPrintData = (data: BillPrintData): UniversalInvoicePrintData => {
  return {
    invoiceNumber: data.invoiceNumber || 'INV-001',
    invoiceDate: data.date || new Date().toLocaleDateString('en-IN'),
    hotelName: data.hotelName || 'AJALKAR HOTEL POS',
    hotelAddress: data.hotelAddress,
    hotelPhone: data.phone,
    gstin: data.gstin,
    fssai: data.fssai,
    tableName: data.tableName,
    customerName: data.customerName,
    customerPhone: data.phone,
    items: (data.items || []).map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.price,
      totalPrice: Number(it.price) * Number(it.quantity),
      notes: it.notes,
    })),
    subtotal: Number(data.subtotal || 0),
    totalTax: (Number(data.cgst || 0) + Number(data.sgst || 0)) || 0,
    cgstAmount: Number(data.cgst || 0),
    sgstAmount: Number(data.sgst || 0),
    discountAmount: Number(data.discount || 0),
    grandTotal: Number(data.total || 0),
    paymentMethod: data.paymentMode || 'CASH',
    paymentStatus: 'PAID',
    footerMessage: data.footerNote,
  };
};

/**
 * Universal Wi-Fi Thermal Print Dispatcher
 * Delivers raw ESC/POS to Wi-Fi printer (port 9100) via local server TCP socket
 */
export const printCustomerBillWifi = async (
  data: BillPrintData,
  format: PrintFormat = '80mm',
  targetIp?: string,
  targetPort?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const universalData = convertToUniversalPrintData(data);
    const paperSize = String(format).toLowerCase().includes('58') ? '58mm' : '80mm';
    const base64 = NativePrinterManager.generateBillEscPos(universalData, paperSize, true, false);

    let ip = targetIp;
    let port = targetPort || 9100;

    if (!ip) {
      const defPrinter = await NativePrinterManager.getDefaultPrinter('RECEIPT');
      if (defPrinter && defPrinter.printerType === 'NETWORK') {
        ip = defPrinter.ipAddress;
        port = defPrinter.port || 9100;
      }
    }

    if (!ip) {
      return {
        success: false,
        message: 'वाय-फाय प्रिंटर IP अड्रेस मिळालेला नाही. कृपया Settings > Printer Settings मध्ये जाऊन वाय-फाय प्रिंटर IP जोडा.',
      };
    }

    return await NativePrinterManager.printEscPos('NETWORK', `${ip}:${port}`, base64);
  } catch (err: any) {
    return { success: false, message: err?.message || 'Wi-Fi print failed' };
  }
};

/**
 * Universal USB Thermal Print Dispatcher
 * Works in Expo Go via Android System Spooler / RawBT with thermal 58mm/80mm layout
 */
export const printCustomerBillUsb = async (
  data: BillPrintData,
  format: PrintFormat = '80mm'
): Promise<void> => {
  return await printCustomerBill(data, format, true);
};

/**
 * Wi-Fi Kitchen Order Ticket (KOT) Dispatcher
 */
export const printKotTicketWifi = async (
  data: KotPrintData,
  format: PrintFormat = '80mm',
  targetIp?: string,
  targetPort?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const paperSize = String(format).toLowerCase().includes('58') ? '58mm' : '80mm';
    const base64 = NativePrinterManager.generateKotEscPos(
      {
        orderId: data.kotNumber,
        tableNo: data.tableName,
        waiterName: data.serverName,
        date: data.date,
        time: data.time,
        items: (data.items || []).map((i) => ({ name: i.name, quantity: i.quantity, notes: i.notes })),
      },
      paperSize,
      true
    );

    let ip = targetIp;
    let port = targetPort || 9100;

    if (!ip) {
      const defPrinter = await NativePrinterManager.getDefaultPrinter('KOT');
      if (defPrinter && defPrinter.printerType === 'NETWORK') {
        ip = defPrinter.ipAddress;
        port = defPrinter.port || 9100;
      }
    }

    if (!ip) {
      return {
        success: false,
        message: 'KOT साठी वाय-फाय प्रिंटर सेट केलेला नाही. Settings मध्ये जाऊन KOT प्रिंटर सेट करा.',
      };
    }

    return await NativePrinterManager.printEscPos('NETWORK', `${ip}:${port}`, base64);
  } catch (err: any) {
    return { success: false, message: err?.message || 'Wi-Fi KOT print failed' };
  }
};
