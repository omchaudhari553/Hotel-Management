import { Platform, Alert } from 'react-native';
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
  tableName: string;
  customerName?: string;
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

/**
 * 80mm Thermal Printer Utility
 * Formats receipt specifically for 80mm (3-inch / 72mm printable width) thermal printers.
 * Ensures 0 blank pages and clean, crisp monospace rendering.
 */
export const printCustomerBill80mm = (data: BillPrintData) => {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (!printWindow) {
      alert('Please allow popups for this site to print 80mm bill receipts.');
      return;
    }

    const isDevanagari = data.language === 'mr' || data.language === 'hi';
    const fmtNum = (val: number | string) => isDevanagari ? toDevanagariNumerals(val) : String(val);

    const hotelName = data.hotelName || 'AJALKAR HOTEL & RESTAURANT';
    const hotelAddress = data.hotelAddress || 'Hotel Premises, Pune - 411004';
    const gstin = data.gstin || '27AABCR1234F1Z5';
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
    const grandTotalLabel = isDevanagari ? 'एकूण देय रक्कम (GRAND TOTAL)' : 'GRAND TOTAL (PAID)';
    const defaultFooterNote = isDevanagari
      ? (data.language === 'hi' ? 'हमारे यहाँ भोजन करने के लिए धन्यवाद! फिर पधारें।' : 'आमच्याकडे जेवणाचा आनंद घेतल्याबद्दल धन्यवाद! पुन्हा अवश्य भेट द्या.')
      : 'Thank you for dining with us! Visit again.';

    const itemsHtml = data.items
      .map(
        (it, idx) => `
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
      padding: 3mm 2mm 5mm 2mm !important;
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
    ${
      discount > 0
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

    <div class="text-center" style="font-size: 11px; margin-top: 6px;">
      ${data.footerNote || defaultFooterNote}
    </div>
    <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #555;">
      [80mm Standard Thermal Slip • Ajalkar POS]
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

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    console.log(`[80mm Thermal Print] Invoice #${data.invoiceNumber} (Table: ${data.tableName}) sent to thermal printer.`);
  }
};

/**
 * 80mm Thermal KOT Ticket Printer Utility
 */
export const printKotTicket80mm = (data: KotPrintData) => {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank', 'width=420,height=600');
    if (!printWindow) {
      alert('Please allow popups for this site to print 80mm KOT tickets.');
      return;
    }

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
      padding: 3mm 2mm 5mm 2mm !important;
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
    <div class="text-center bold" style="font-size: 18px; letter-spacing: 1px;">${kotTitle}</div>
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
            <strong>SPECIAL NOTE:</strong> ${data.instructions}
          </div>
          <div class="divider"></div>`
        : ''
    }

    <div class="text-center bold" style="font-size: 12px; margin-top: 4px;">
      TOTAL ITEMS: ${data.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
    </div>
    <div class="text-center" style="font-size: 9px; margin-top: 4px;">
      [80mm Kitchen Thermal Slip • Ajalkar POS]
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

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    console.log(`[80mm KOT Print] KOT #${data.kotNumber} (Table: ${data.tableName}) sent to kitchen printer.`);
  }
};
