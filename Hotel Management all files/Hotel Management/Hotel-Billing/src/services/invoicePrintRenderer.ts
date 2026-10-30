import { UniversalInvoicePrintData, PaperSize } from '../types/printing';

/**
 * Converts numeric amount to Indian Rupee Words (e.g., "One Thousand Two Hundred and Fifty Rupees Only")
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  };

  const convertThreeDigits = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      str += convertTwoDigits(n);
    }
    return str.trim();
  };

  const whole = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - whole) * 100);

  let result = '';
  const crore = Math.floor(whole / 10000000);
  let rem = whole % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundredAndBelow = rem;

  if (crore > 0) result += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) result += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) result += convertThreeDigits(thousand) + ' Thousand ';
  if (hundredAndBelow > 0) result += convertThreeDigits(hundredAndBelow);

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  return result + ' Only';
}

function fmt(n?: number): string {
  if (n === undefined || n === null || isNaN(n)) return '0.00';
  return Number(n).toFixed(2);
}

/**
 * 58mm Thermal Receipt HTML Generator
 * Designed for 2-inch / 48mm printable area (approx 384 dots @ 203 DPI)
 * Monospace, compact, highly legible with 0 horizontal overflow
 */
export function generate58mmHtml(data: UniversalInvoicePrintData): string {
  const itemsRows = (data.items || []).map((it) => {
    const itemTotal = it.totalPrice ?? (it.quantity * it.unitPrice);
    const itemName = it.name || it.description || 'Item';
    return `
      <tr>
        <td style="padding: 2px 0; text-align: left; font-size: 11px; word-break: break-word;">
          ${itemName}
        </td>
        <td style="padding: 2px 0; text-align: center; font-size: 11px; white-space: nowrap;">
          ${it.quantity}
        </td>
        <td style="padding: 2px 0; text-align: right; font-size: 11px; white-space: nowrap; font-weight: bold;">
          ${fmt(itemTotal)}
        </td>
      </tr>
    `;
  }).join('');

  const taxDetails = [];
  if (data.cgstAmount && data.cgstAmount > 0) {
    taxDetails.push(`<div><span>CGST (${data.cgstRate || 2.5}%):</span> <span>+ ₹${fmt(data.cgstAmount)}</span></div>`);
  }
  if (data.sgstAmount && data.sgstAmount > 0) {
    taxDetails.push(`<div><span>SGST (${data.sgstRate || 2.5}%):</span> <span>+ ₹${fmt(data.sgstAmount)}</span></div>`);
  }
  if (data.igstAmount && data.igstAmount > 0) {
    taxDetails.push(`<div><span>IGST (${data.igstRate || 5}%):</span> <span>+ ₹${fmt(data.igstAmount)}</span></div>`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt_${data.invoiceNumber}_58mm</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
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
      padding: 3mm 2mm 5mm 2mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 11px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000000;
      margin: 3px 0;
    }
    .double-divider {
      border-top: 2px dashed #000000;
      margin: 4px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .col-item { width: 55%; }
    .col-qty { width: 18%; }
    .col-amt { width: 27%; }
  </style>
</head>
<body>
  <div class="text-center bold" style="font-size: 14px; text-transform: uppercase;">
    ${data.hotelName || 'HOTEL MANAGEMENT'}
  </div>
  ${data.hotelAddress ? `<div class="text-center" style="font-size: 9px; margin-top: 1px;">${data.hotelAddress}</div>` : ''}
  ${data.hotelPhone ? `<div class="text-center" style="font-size: 9px;">Tel: ${data.hotelPhone}</div>` : ''}
  ${data.gstin ? `<div class="text-center bold" style="font-size: 9px;">GSTIN: ${data.gstin}</div>` : ''}
  ${data.fssai ? `<div class="text-center" style="font-size: 8px;">FSSAI: ${data.fssai}</div>` : ''}

  <div class="double-divider"></div>
  <div class="text-center bold" style="font-size: 11px; letter-spacing: 0.5px;">TAX INVOICE (58mm)</div>
  <div class="divider"></div>

  <div class="flex-row">
    <span>INV: #${data.invoiceNumber}</span>
    <span>${data.invoiceDate}</span>
  </div>
  ${data.tableName ? `<div class="flex-row"><span>Table: ${data.tableName}</span><span>${data.orderNumber ? 'Ord: ' + data.orderNumber : ''}</span></div>` : ''}
  ${data.customerName ? `<div class="flex-row"><span>Guest: ${data.customerName}</span></div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th class="col-item" style="text-align: left; font-size: 10px; padding-bottom: 2px;">ITEM</th>
        <th class="col-qty" style="text-align: center; font-size: 10px; padding-bottom: 2px;">QTY</th>
        <th class="col-amt" style="text-align: right; font-size: 10px; padding-bottom: 2px;">AMT</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="font-size: 11px; line-height: 1.35;">
    <div class="flex-row">
      <span>Subtotal:</span>
      <span>₹${fmt(data.subtotal)}</span>
    </div>
    ${data.discountAmount && data.discountAmount > 0 ? `
      <div class="flex-row">
        <span>Discount:</span>
        <span>- ₹${fmt(data.discountAmount)}</span>
      </div>` : ''}
    ${taxDetails.join('')}
    ${data.roundOff && data.roundOff !== 0 ? `
      <div class="flex-row">
        <span>Round Off:</span>
        <span>${data.roundOff > 0 ? '+' : ''}₹${fmt(data.roundOff)}</span>
      </div>` : ''}
    
    <div class="divider"></div>
    <div class="flex-row bold" style="font-size: 13px;">
      <span>TOTAL:</span>
      <span>₹${fmt(data.grandTotal)}</span>
    </div>
    <div class="divider"></div>
  </div>

  <div class="flex-row" style="font-size: 10px; margin-top: 2px;">
    <span>Pay Mode: ${data.paymentMethod || 'CASH'}</span>
    <span class="bold">[${data.paymentStatus || 'PAID'}]</span>
  </div>

  <div class="double-divider"></div>
  <div class="text-center bold" style="font-size: 10px; margin-top: 3px;">
    ${data.footerMessage || 'Thank you for visiting!'}
  </div>

</body>
</html>`;
}

/**
 * 80mm Thermal Receipt HTML Generator
 * Designed for 3-inch / 72mm printable area (approx 576 dots @ 203 DPI)
 * Standard POS layout with comprehensive metadata and GST tax details
 */
export function generate80mmHtml(data: UniversalInvoicePrintData): string {
  const itemsRows = (data.items || []).map((it, idx) => {
    const itemTotal = it.totalPrice ?? (it.quantity * it.unitPrice);
    const itemName = it.name || it.description || `Item ${idx + 1}`;
    return `
      <tr>
        <td style="padding: 3px 0; text-align: left; font-size: 12px; font-weight: 600;">
          ${itemName}
          ${it.notes ? `<div style="font-size: 10px; color: #555; font-weight: normal;">↳ ${it.notes}</div>` : ''}
        </td>
        <td style="padding: 3px 0; text-align: center; font-size: 12px;">${it.quantity}</td>
        <td style="padding: 3px 0; text-align: right; font-size: 12px;">${fmt(it.unitPrice)}</td>
        <td style="padding: 3px 0; text-align: right; font-size: 12px; font-weight: bold;">${fmt(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt_${data.invoiceNumber}_80mm</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
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
      padding: 4mm 3mm 6mm 3mm !important;
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: 'Courier New', 'Noto Sans Devanagari', monospace !important;
      font-size: 12px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px dashed #000000;
      margin: 6px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .col-item { width: 48%; }
    .col-qty { width: 14%; }
    .col-rate { width: 18%; }
    .col-amt { width: 20%; }
  </style>
</head>
<body>
  <div class="text-center bold" style="font-size: 17px; text-transform: uppercase; letter-spacing: 0.5px;">
    ${data.hotelName || 'HOTEL MANAGEMENT'}
  </div>
  ${data.hotelAddress ? `<div class="text-center" style="font-size: 11px; margin-top: 2px;">${data.hotelAddress}</div>` : ''}
  ${data.hotelPhone ? `<div class="text-center" style="font-size: 10.5px;">Phone: ${data.hotelPhone}</div>` : ''}
  ${data.gstin ? `<div class="text-center bold" style="font-size: 11px;">GSTIN: ${data.gstin}</div>` : ''}
  ${data.fssai ? `<div class="text-center" style="font-size: 9.5px;">FSSAI Lic. No: ${data.fssai}</div>` : ''}

  <div class="double-divider"></div>
  <div class="text-center bold" style="font-size: 13px; letter-spacing: 1px;">TAX INVOICE / BILL OF SUPPLY</div>
  <div class="double-divider"></div>

  <div class="flex-row">
    <span><strong>INV NO:</strong> #${data.invoiceNumber}</span>
    <span><strong>DATE:</strong> ${data.invoiceDate}</span>
  </div>
  <div class="flex-row">
    <span>${data.tableName ? `<strong>TABLE:</strong> ${data.tableName}` : '<strong>TYPE:</strong> Dine-In'}</span>
    <span>${data.orderNumber ? `<strong>ORD:</strong> ${data.orderNumber}` : ''}</span>
  </div>
  ${data.customerName ? `
    <div class="flex-row">
      <span><strong>CUSTOMER:</strong> ${data.customerName}</span>
      <span>${data.customerPhone ? data.customerPhone : ''}</span>
    </div>` : ''}
  ${data.serverName ? `
    <div class="flex-row">
      <span><strong>STEWARD:</strong> ${data.serverName}</span>
    </div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th class="col-item" style="text-align: left; font-size: 11px; padding: 2px 0;">ITEM</th>
        <th class="col-qty" style="text-align: center; font-size: 11px; padding: 2px 0;">QTY</th>
        <th class="col-rate" style="text-align: right; font-size: 11px; padding: 2px 0;">RATE</th>
        <th class="col-amt" style="text-align: right; font-size: 11px; padding: 2px 0;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="font-size: 12px; line-height: 1.35;">
    <div class="flex-row">
      <span>Subtotal:</span>
      <span>₹${fmt(data.subtotal)}</span>
    </div>
    ${data.discountAmount && data.discountAmount > 0 ? `
      <div class="flex-row">
        <span>Discount:</span>
        <span>- ₹${fmt(data.discountAmount)}</span>
      </div>` : ''}
    ${data.taxableAmount ? `
      <div class="flex-row" style="color: #444; font-size: 11px;">
        <span>Taxable Value:</span>
        <span>₹${fmt(data.taxableAmount)}</span>
      </div>` : ''}
    ${data.cgstAmount && data.cgstAmount > 0 ? `
      <div class="flex-row">
        <span>CGST (${data.cgstRate || 2.5}%):</span>
        <span>+ ₹${fmt(data.cgstAmount)}</span>
      </div>` : ''}
    ${data.sgstAmount && data.sgstAmount > 0 ? `
      <div class="flex-row">
        <span>SGST (${data.sgstRate || 2.5}%):</span>
        <span>+ ₹${fmt(data.sgstAmount)}</span>
      </div>` : ''}
    ${data.igstAmount && data.igstAmount > 0 ? `
      <div class="flex-row">
        <span>IGST (${data.igstRate || 5}%):</span>
        <span>+ ₹${fmt(data.igstAmount)}</span>
      </div>` : ''}
    ${data.roundOff && data.roundOff !== 0 ? `
      <div class="flex-row">
        <span>Round Off:</span>
        <span>${data.roundOff > 0 ? '+' : ''}₹${fmt(data.roundOff)}</span>
      </div>` : ''}

    <div class="double-divider"></div>
    <div class="flex-row bold" style="font-size: 15px;">
      <span>GRAND TOTAL:</span>
      <span>₹${fmt(data.grandTotal)}</span>
    </div>
    <div class="double-divider"></div>
  </div>

  <div class="flex-row" style="font-size: 11px;">
    <span>Payment Mode: <strong>${data.paymentMethod || 'CASH'}</strong></span>
    <span>Status: <strong>[${data.paymentStatus || 'PAID'}]</strong></span>
  </div>
  ${data.paidAmount !== undefined ? `
    <div class="flex-row" style="font-size: 11px;">
      <span>Amount Paid: ₹${fmt(data.paidAmount)}</span>
      <span>${data.outstandingAmount && data.outstandingAmount > 0 ? `Due: ₹${fmt(data.outstandingAmount)}` : 'Balance: ₹0.00'}</span>
    </div>` : ''}

  <div class="divider"></div>
  <div class="text-center bold" style="font-size: 12px; margin-top: 4px;">
    ${data.footerMessage || 'Thank you for dining with us! Please visit again.'}
  </div>
  
</body>
</html>`;
}

/**
 * A4 Standard Tax Invoice HTML Generator
 * Designed for standard A4 paper (210mm x 297mm) with proper multi-page support,
 * legal GST compliance, clean corporate layout, and automatic pagination.
 */
export function generateA4Html(data: UniversalInvoicePrintData): string {
  const amountInWords = numberToWordsINR(data.grandTotal);

  const itemsRows = (data.items || []).map((it, idx) => {
    const qty = it.quantity || 1;
    const rate = it.unitPrice || 0;
    const discount = it.discount || 0;
    const taxRate = it.taxRate ?? ((data.cgstRate || 2.5) + (data.sgstRate || 2.5));
    const taxableVal = (qty * rate) - discount;
    const taxAmt = it.taxAmount ?? ((taxableVal * taxRate) / 100);
    const total = it.totalPrice ?? (taxableVal + taxAmt);

    return `
      <tr style="page-break-inside: avoid;">
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: center; font-size: 12px;">${idx + 1}</td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 10px; font-size: 12px;">
          <div style="font-weight: 700; color: #111827;">${it.name || it.description}</div>
          ${it.notes ? `<div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Note: ${it.notes}</div>` : ''}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: center; font-size: 12px; color: #4B5563;">
          ${it.hsnCode || '996331'}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: center; font-size: 12px; font-weight: 600;">
          ${qty}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: right; font-size: 12px;">
          ₹${fmt(rate)}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: right; font-size: 12px; color: #4B5563;">
          ${discount > 0 ? `₹${fmt(discount)}` : '-'}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: right; font-size: 12px;">
          ₹${fmt(taxableVal)}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: center; font-size: 12px;">
          ${taxRate}%
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 8px; text-align: right; font-size: 12px;">
          ₹${fmt(taxAmt)}
        </td>
        <td style="border: 1px solid #D1D5DB; padding: 7px 10px; text-align: right; font-size: 12px; font-weight: 700;">
          ₹${fmt(total)}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Tax_Invoice_${data.invoiceNumber}_A4</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.4;
      padding: 10px 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1E3A8A;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 800;
      color: #1E3A8A;
      letter-spacing: -0.02em;
    }
    .invoice-title-badge {
      text-align: right;
    }
    .title-pill {
      display: inline-block;
      background: #1E3A8A;
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .card-box {
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 10px 14px;
      background: #F9FAFB;
    }
    .card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #6B7280;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 4px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.data-table th {
      background: #1E3A8A;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 11px;
      padding: 8px 6px;
      border: 1px solid #1E3A8A;
      text-transform: uppercase;
    }
    .totals-layout {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      page-break-inside: avoid;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 5px 8px;
      font-size: 12px;
    }
    .grand-total-row {
      background: #EFF6FF;
      font-weight: 800;
      font-size: 15px;
      color: #1E3A8A;
      border-top: 2px solid #1E3A8A;
      border-bottom: 2px solid #1E3A8A;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }
    .status-paid {
      background: #D1FAE5;
      color: #065F46;
    }
    .status-unpaid {
      background: #FEF3C7;
      color: #92400E;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="company-title">${data.hotelName || 'AJALKAR HOTEL & RESORTS'}</div>
      <div style="color: #4B5563; font-size: 12px; margin-top: 2px;">${data.hotelAddress || 'Hotel Premises, Pune, Maharashtra - 411004'}</div>
      <div style="color: #4B5563; font-size: 11px;">
        ${data.hotelPhone ? `Phone: ${data.hotelPhone}` : ''}
        ${data.hotelEmail ? ` • Email: ${data.hotelEmail}` : ''}
      </div>
      <div style="font-weight: 700; font-size: 12px; margin-top: 4px; color: #111827;">
        ${data.gstin ? `GSTIN: ${data.gstin}` : ''}
        ${data.fssai ? ` • FSSAI: ${data.fssai}` : ''}
      </div>
    </div>
    <div class="invoice-title-badge">
      <div class="title-pill">TAX INVOICE</div>
      <div style="font-size: 10px; color: #6B7280; margin-top: 3px;">(Original for Recipient)</div>
      <div style="margin-top: 8px; font-weight: 800; font-size: 15px; color: #111827;">
        #${data.invoiceNumber}
      </div>
      <div style="font-size: 11px; color: #4B5563;">Date: <strong>${data.invoiceDate}</strong></div>
      <div style="margin-top: 4px;">
        <span class="status-badge ${data.paymentStatus === 'PAID' ? 'status-paid' : 'status-unpaid'}">
          ${data.paymentStatus === 'PAID' ? '✓ FULLY PAID' : 'PENDING PAYMENT'}
        </span>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="card-box">
      <div class="card-title">Billed To (Customer Details)</div>
      <div style="font-size: 13px; font-weight: 700; color: #111827;">${data.customerName || 'Walk-in Guest'}</div>
      ${data.customerPhone ? `<div style="font-size: 11.5px; color: #4B5563;">Mobile: ${data.customerPhone}</div>` : ''}
      ${data.customerAddress ? `<div style="font-size: 11.5px; color: #4B5563;">${data.customerAddress}</div>` : ''}
      ${data.customerGstin ? `<div style="font-size: 11.5px; font-weight: 600; color: #1E3A8A; margin-top: 2px;">GSTIN: ${data.customerGstin}</div>` : ''}
    </div>

    <div class="card-box">
      <div class="card-title">Service & Dining Reference</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11.5px;">
        <div>Table / Room: <strong>${data.tableName || 'Counter'}</strong></div>
        <div>Order Ref: <strong>${data.orderNumber || '-'}</strong></div>
        <div>Server / Steward: <strong>${data.serverName || 'Counter'}</strong></div>
        <div>Payment Mode: <strong>${data.paymentMethod || 'CASH'}</strong></div>
      </div>
      ${data.transactionRef ? `<div style="font-size: 10.5px; color: #6B7280; margin-top: 4px;">Txn ID: ${data.transactionRef}</div>` : ''}
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 32%; text-align: left;">Item Description</th>
        <th style="width: 10%;">HSN/SAC</th>
        <th style="width: 6%;">Qty</th>
        <th style="width: 10%; text-align: right;">Rate</th>
        <th style="width: 8%; text-align: right;">Disc</th>
        <th style="width: 10%; text-align: right;">Taxable Val</th>
        <th style="width: 6%;">GST %</th>
        <th style="width: 8%; text-align: right;">GST Amt</th>
        <th style="width: 11%; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-layout">
    <div style="flex: 1;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #4B5563; text-transform: uppercase;">Amount in Words:</div>
        <div style="font-size: 12px; font-weight: 700; color: #1E3A8A; font-style: italic; margin-top: 2px;">
          ${amountInWords}
        </div>
      </div>

      <div class="card-box" style="margin-top: 8px;">
        <div class="card-title">Terms & Conditions</div>
        <ul style="padding-left: 14px; font-size: 10px; color: #4B5563; line-height: 1.4;">
          <li>All prices are in Indian Rupees (INR) inclusive of applicable taxes.</li>
          <li>Goods / Food once served or billed cannot be taken back or refunded.</li>
          <li>Subject to local jurisdiction only.</li>
        </ul>
      </div>
    </div>

    <div>
      <table class="totals-table">
        <tr>
          <td style="color: #4B5563;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${fmt(data.subtotal)}</td>
        </tr>
        ${data.discountAmount && data.discountAmount > 0 ? `
          <tr>
            <td style="color: #4B5563;">Discount:</td>
            <td style="text-align: right; color: #DC2626;">- ₹${fmt(data.discountAmount)}</td>
          </tr>` : ''}
        ${data.taxableAmount ? `
          <tr>
            <td style="color: #4B5563;">Total Taxable Amount:</td>
            <td style="text-align: right;">₹${fmt(data.taxableAmount)}</td>
          </tr>` : ''}
        ${data.cgstAmount && data.cgstAmount > 0 ? `
          <tr>
            <td style="color: #4B5563;">CGST (${data.cgstRate || 2.5}%):</td>
            <td style="text-align: right;">+ ₹${fmt(data.cgstAmount)}</td>
          </tr>` : ''}
        ${data.sgstAmount && data.sgstAmount > 0 ? `
          <tr>
            <td style="color: #4B5563;">SGST (${data.sgstRate || 2.5}%):</td>
            <td style="text-align: right;">+ ₹${fmt(data.sgstAmount)}</td>
          </tr>` : ''}
        ${data.igstAmount && data.igstAmount > 0 ? `
          <tr>
            <td style="color: #4B5563;">IGST (${data.igstRate || 5}%):</td>
            <td style="text-align: right;">+ ₹${fmt(data.igstAmount)}</td>
          </tr>` : ''}
        ${data.roundOff && data.roundOff !== 0 ? `
          <tr>
            <td style="color: #4B5563;">Round Off:</td>
            <td style="text-align: right;">${data.roundOff > 0 ? '+' : ''}₹${fmt(data.roundOff)}</td>
          </tr>` : ''}
        <tr class="grand-total-row">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${fmt(data.grandTotal)}</td>
        </tr>
        ${data.paidAmount !== undefined ? `
          <tr>
            <td style="padding-top: 6px; font-weight: 600; color: #065F46;">Amount Paid:</td>
            <td style="padding-top: 6px; text-align: right; font-weight: 700; color: #065F46;">₹${fmt(data.paidAmount)}</td>
          </tr>` : ''}
        ${data.outstandingAmount && data.outstandingAmount > 0 ? `
          <tr>
            <td style="font-weight: 600; color: #92400E;">Balance Due:</td>
            <td style="text-align: right; font-weight: 700; color: #92400E;">₹${fmt(data.outstandingAmount)}</td>
          </tr>` : ''}
      </table>

      <div style="margin-top: 35px; text-align: center; border-top: 1px solid #9CA3AF; padding-top: 6px; width: 220px; margin-left: auto;">
        <div style="font-weight: 700; font-size: 11px;">For ${data.hotelName || 'HOTEL MANAGEMENT'}</div>
        <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Authorized Signatory</div>
      </div>
    </div>
  </div>

  <div style="margin-top: 25px; border-top: 1px solid #E5E7EB; padding-top: 8px; text-align: center; font-size: 10px; color: #9CA3AF;">
    This is a computer generated invoice and does not require a physical signature unless mandated. Generated via Ajalkar POS.
  </div>
</body>
</html>`;
}

/**
 * Universal dispatcher
 */
export function generateInvoiceHtml(data: UniversalInvoicePrintData, paperSize: PaperSize): string {
  switch (paperSize) {
    case '58mm':
      return generate58mmHtml(data);
    case '80mm':
      return generate80mmHtml(data);
    case 'A4':
    default:
      return generateA4Html(data);
  }
}

