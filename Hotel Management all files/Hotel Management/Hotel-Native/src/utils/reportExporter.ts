import { Platform, Alert, Linking, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Downloads / shares a styled PDF report to web or mobile device
 */
export async function downloadAndSharePdf(title: string, htmlContent: string): Promise<void> {
  try {
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
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
            } catch {
              const printWin = window.open('', '_blank');
              if (printWin) {
                printWin.document.write(htmlContent);
                printWin.document.close();
                printWin.focus();
                printWin.print();
              }
            } finally {
              setTimeout(() => {
                try {
                  document.body.removeChild(printFrame);
                } catch {}
              }, 4000);
            }
          }, 400);
          return;
        }
      } catch (webErr) {
        console.warn('Iframe print error, falling back to window.open', webErr);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(htmlContent);
          win.document.close();
          win.focus();
          win.print();
          return;
        }
      }
    }

    // On mobile device (Android / iOS)
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && uri) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download / Save ${title}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (printErr: any) {
      console.warn('Mobile printToFileAsync failed, trying direct printAsync', printErr);
      await Print.printAsync({ html: htmlContent });
    }
  } catch (error: any) {
    console.error('PDF export error:', error);
    Alert.alert('PDF Export Error', error?.message || 'Could not generate or download PDF.');
  }
}

/**
 * Downloads / shares a CSV file cross-platform
 */
export async function downloadAndShareCsv(filename: string, csvData: string): Promise<void> {
  try {
    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {}
      }, 1000);
      return;
    }

    // Mobile fallback: Try expo-file-system if present, else native Share
    try {
      const FileSystem = require('expo-file-system');
      const targetUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${cleanFilename}`;
      await FileSystem.writeAsStringAsync(targetUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'text/csv',
          dialogTitle: `Download ${cleanFilename}`,
          UTI: 'public.comma-separated-values-text',
        });
        return;
      }
    } catch {
      // Fallback to React Native Share text
      await Share.share({
        title: cleanFilename,
        message: csvData,
      });
    }
  } catch (error: any) {
    console.error('CSV export error:', error);
    Alert.alert('Export Error', error?.message || 'Could not export or download CSV file.');
  }
}

/**
 * Share text or receipt directly to WhatsApp
 */
export async function shareTextToWhatsApp(message: string, phoneNumber?: string): Promise<void> {
  try {
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    const encoded = encodeURIComponent(message);
    const whatsappUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
      return;
    }

    const nativeUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;

    const supported = await Linking.canOpenURL(nativeUrl).catch(() => false);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(whatsappUrl).catch(async () => {
        await Share.share({ message });
      });
    }
  } catch (err: any) {
    console.warn('WhatsApp share failed, using system share:', err);
    await Share.share({ message });
  }
}

// ============================================================================
// EXACT PURCHASE RECEIPT HTML (Matches Screenshot 100%)
// ============================================================================

export interface PurchaseReceiptData {
  receiptNo: string;
  poNumber: string;
  date: string;
  hotelName?: string;
  hotelSubtitle?: string;
  hotelAddress?: string;
  gstin?: string;
  supplierName: string;
  supplierAddress?: string;
  supplierGstin?: string;
  supplierContact?: string;
  transactionType?: string;
  paymentMode?: string;
  bankName?: string;
  transactionId?: string;
  paymentDate?: string;
  items: Array<{
    itemName?: string;
    name?: string;
    hsn?: string;
    quantity?: number;
    qty?: number;
    unit?: string;
    unitPrice?: number;
    rate?: number;
    amount?: number;
  }>;
  subTotal: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  amountInWords: string;
  notes?: string[];
}

export function buildPurchaseReceiptHtml(data: PurchaseReceiptData): string {
  const hotelName = data.hotelName || 'Royal Palace Hotel';
  const hotelSubtitle = data.hotelSubtitle || 'Good Food | Happy People';
  const hotelAddress = data.hotelAddress || 'Shop No. 12, Shree Complex, Pune-Satara Road, Pune - 411028, Maharashtra, India';
  const gstin = data.gstin || '27AAKCA1234F1Z5';

  const defaultNotes = [
    'Goods received in good condition.',
    'Please check the quantity and quality at the time of delivery.',
    'This is a system generated receipt. No signature required.',
  ];
  const notes = data.notes && data.notes.length > 0 ? data.notes : defaultNotes;

  const rows = data.items.map((it, idx) => {
    const name = it.itemName || it.name || 'Raw Material';
    const hsn = it.hsn || `1005${30 + idx * 10}`;
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unit = it.unit || 'Kg';
    const rate = Number(it.unitPrice ?? it.rate ?? 0);
    const amt = Number(it.amount ?? (qty * rate));
    return `
      <tr>
        <td style="text-align: center; padding: 9px 8px; border-bottom: 1px solid #E2E8F0; color: #475569;">${idx + 1}</td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${name}</td>
        <td style="text-align: center; padding: 9px 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${hsn}</td>
        <td style="text-align: center; padding: 9px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${qty}</td>
        <td style="text-align: center; padding: 9px 8px; border-bottom: 1px solid #E2E8F0; color: #475569;">${unit}</td>
        <td style="text-align: right; padding: 9px 8px; border-bottom: 1px solid #E2E8F0;">₹ ${rate.toFixed(2)}</td>
        <td style="text-align: right; padding: 9px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Purchase Receipt - ${data.receiptNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1E293B;
          background: #F8FAFC;
          padding: 24px;
        }
        .receipt-card {
          max-width: 820px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #CBD5E1;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          padding: 28px 32px;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E2E8F0;
        }
        .brand-left {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          border: 2px solid #1E40AF;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1E40AF;
          font-size: 26px;
          font-weight: 900;
        }
        .hotel-title {
          font-size: 22px;
          font-weight: 900;
          color: #1E3A8A;
          letter-spacing: -0.2px;
        }
        .hotel-tagline {
          font-size: 12px;
          font-weight: 600;
          color: #2563EB;
          margin-top: 2px;
        }
        .hotel-addr {
          font-size: 11px;
          color: #64748B;
          margin-top: 4px;
          max-width: 420px;
          line-height: 1.4;
        }
        .hotel-gst {
          font-size: 11px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 4px;
        }
        .header-right {
          text-align: right;
        }
        .badge-receipt {
          display: inline-block;
          background: #1E40AF;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .meta-line {
          font-size: 11px;
          color: #334155;
          margin-top: 4px;
        }
        .meta-line strong {
          color: #0F172A;
          font-weight: 700;
        }

        .cards-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .info-card {
          flex: 1;
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          overflow: hidden;
          background: #FFFFFF;
        }
        .info-card-header {
          background: #E0F2FE;
          color: #0369A1;
          font-size: 12px;
          font-weight: 800;
          padding: 8px 12px;
          border-bottom: 1px solid #BAE6FD;
        }
        .info-card-body {
          padding: 10px 12px;
          font-size: 11px;
          line-height: 1.6;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .info-key {
          color: #64748B;
          width: 110px;
        }
        .info-val {
          flex: 1;
          color: #0F172A;
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11.5px;
        }
        thead th {
          background: #1E40AF;
          color: #FFFFFF;
          font-weight: 700;
          text-align: left;
          padding: 10px 8px;
          font-size: 11px;
          letter-spacing: 0.3px;
        }
        thead th.center { text-align: center; }
        thead th.right { text-align: right; }

        .bottom-grid {
          display: flex;
          gap: 16px;
          margin-top: 10px;
        }
        .bottom-left {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bottom-right {
          flex: 0.9;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .words-box, .notes-box {
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          overflow: hidden;
        }
        .words-header, .notes-header {
          background: #E0F2FE;
          color: #0369A1;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 10px;
          border-bottom: 1px solid #BAE6FD;
        }
        .words-body {
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
          color: #0F172A;
        }
        .notes-body {
          padding: 8px 10px;
          font-size: 10.5px;
          color: #475569;
          line-height: 1.5;
        }
        .notes-body ul {
          padding-left: 16px;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 6px 4px;
          font-size: 12px;
          color: #334155;
          font-weight: 600;
        }
        .total-bar {
          background: #1E40AF;
          color: #FFFFFF;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          margin-top: 8px;
          font-size: 14px;
          font-weight: 900;
        }
        .sign-area {
          margin-top: 24px;
          text-align: right;
          padding-right: 8px;
        }
        .sign-line {
          width: 180px;
          height: 1px;
          background: #64748B;
          margin-left: auto;
          margin-bottom: 4px;
        }
        .sign-label {
          font-size: 11px;
          font-weight: 700;
          color: #1E293B;
        }
        .sign-company {
          font-size: 10px;
          color: #64748B;
        }

        @media print {
          body { background: #FFFFFF; padding: 0; }
          .receipt-card { box-shadow: none; border: none; padding: 12px; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <!-- Header -->
        <div class="header-row">
          <div class="brand-left">
            <div class="logo-icon">&#127859;</div>
            <div>
              <div class="hotel-title">${hotelName}</div>
              <div class="hotel-tagline">${hotelSubtitle}</div>
              <div class="hotel-addr">${hotelAddress}</div>
              <div class="hotel-gst">GSTIN : ${gstin}</div>
            </div>
          </div>
          <div class="header-right">
            <div class="badge-receipt">PURCHASE RECEIPT</div>
            <div class="meta-line">Receipt No &nbsp;: &nbsp;<strong>${data.receiptNo}</strong></div>
            <div class="meta-line">Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<strong>${data.date}</strong></div>
            <div class="meta-line">Supplier Ref. : &nbsp;<strong>${data.poNumber}</strong></div>
          </div>
        </div>

        <!-- 2 Side Cards -->
        <div class="cards-row">
          <div class="info-card">
            <div class="info-card-header">Supplier Details</div>
            <div class="info-card-body">
              <div class="info-row">
                <span class="info-key">Supplier Name</span>
                <span class="info-val">: &nbsp;${data.supplierName}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Address</span>
                <span class="info-val">: &nbsp;${data.supplierAddress || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">GSTIN</span>
                <span class="info-val">: &nbsp;${data.supplierGstin || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Contact No.</span>
                <span class="info-val">: &nbsp;${data.supplierContact || '-'}</span>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-header">Transaction Details</div>
            <div class="info-card-body">
              <div class="info-row">
                <span class="info-key">Transaction Type</span>
                <span class="info-val">: &nbsp;${data.transactionType || 'Purchase Receipt'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Payment Mode</span>
                <span class="info-val">: &nbsp;${data.paymentMode || 'Bank Transfer'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Bank Name</span>
                <span class="info-val">: &nbsp;${data.bankName || 'HDFC Bank'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Transaction ID</span>
                <span class="info-val">: &nbsp;${data.transactionId || 'NEFT112345678'}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Payment Date</span>
                <span class="info-val">: &nbsp;${data.paymentDate || data.date}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <table>
          <thead>
            <tr>
              <th class="center" style="width: 50px;">Sr. No.</th>
              <th>Item Description</th>
              <th class="center" style="width: 80px;">HSN/SAC</th>
              <th class="center" style="width: 70px;">Quantity</th>
              <th class="center" style="width: 60px;">Unit</th>
              <th class="right" style="width: 95px;">Rate (₹)</th>
              <th class="right" style="width: 110px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Bottom Grid -->
        <div class="bottom-grid">
          <div class="bottom-left">
            <div class="words-box">
              <div class="words-header">Amount in Words</div>
              <div class="words-body">${data.amountInWords}</div>
            </div>

            <div class="notes-box">
              <div class="notes-header">Notes</div>
              <div class="notes-body">
                <ul>
                  ${notes.map(n => `<li>${n}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>

          <div class="bottom-right">
            <div class="summary-line">
              <span>Sub Total</span>
              <span>₹ ${data.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>CGST (2.5%)</span>
              <span>₹ ${data.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>SGST (2.5%)</span>
              <span>₹ ${data.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div class="total-bar">
              <span>Total Amount</span>
              <span>₹ ${data.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div class="sign-area">
              <div class="sign-line"></div>
              <div class="sign-label">Authorized Signature</div>
              <div class="sign-company">For ${hotelName}</div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

// ============================================================================
// PURCHASE REPORT HTML & GST AUDIT REPORT HTML
// ============================================================================

export function buildPurchaseReportHtml(params: {
  hotelName: string;
  branchName: string;
  totalPurchases: number;
  totalOrders?: number;
  invoices: Array<any>;
}): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const rows = params.invoices.map((inv, idx) => {
    const invNum = inv.invNumber || inv.inv || `INV-${idx + 1}`;
    const poNum = inv.poNumber || inv.po || '-';
    const date = inv.date || dateStr;
    const supplier = inv.supplier || inv.sup || 'Vendor';
    const gstin = inv.gstin || '-';
    const taxable = Number(inv.taxable ?? 0);
    const tax = Number(inv.tax ?? inv.totTax ?? 0);
    const total = Number(inv.total ?? inv.tot ?? (taxable + tax));
    const status = (inv.status || 'PAID').toUpperCase();

    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">${invNum}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #475569;">${poNum}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${supplier}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${gstin}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹ ${taxable.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #D97706;">₹ ${tax.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; color: #0F172A;">₹ ${total.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        <span style="background: ${status === 'PAID' ? '#DCFCE7' : '#FEF3C7'}; color: ${status === 'PAID' ? '#15803D' : '#B45309'}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">
          ${status}
        </span>
      </td>
    </tr>
  `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Purchase Summary & Tax Audit Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px; background: #FFF; }
        .header { border-bottom: 2px solid #1E40AF; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .hotel-name { font-size: 22px; font-weight: 900; color: #1E3A8A; margin: 0; }
        .sub { font-size: 12px; color: #64748B; margin-top: 4px; }
        .stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
        .stat-box { flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; }
        .stat-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; }
        .stat-val { font-size: 18px; font-weight: 900; color: #0F172A; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1E40AF; color: #FFFFFF; font-weight: 700; text-align: left; padding: 8px; }
        .footer { margin-top: 24px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="hotel-name">${params.hotelName}</h1>
          <div class="sub">${params.branchName} • Purchase Register & GST Tax Breakdown</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #1E40AF;">PURCHASE TAX REGISTER</div>
          <div class="sub">Generated: ${dateStr}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-label">Total Inward Orders</div>
          <div class="stat-val">${params.totalOrders}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Purchase Volume</div>
          <div class="stat-val" style="color: #1E40AF;">₹ ${params.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Inv #</th>
            <th>PO #</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>GSTIN</th>
            <th style="text-align: right;">Taxable (₹)</th>
            <th style="text-align: right;">Tax (₹)</th>
            <th style="text-align: right;">Total (₹)</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        Generated by Ajalkar POS Hotel Management System • Store & Purchasing Audit
      </div>
    </body>
  </html>
  `;
}

// ============================================================================
// EXPENSE REPORT HTML
// ============================================================================

export function buildExpenseReportHtml(params: {
  hotelName: string;
  branchName: string;
  totalExpenses: number;
  expenses: Array<{
    id?: string | number;
    title?: string;
    category?: string;
    amount?: number;
    date?: string;
    paymentMode?: string;
    notes?: string;
    status?: string;
  }>;
}): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const rows = params.expenses.map((e, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${e.title || 'Expense'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${e.category || 'General'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${e.date || dateStr}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${e.paymentMode || 'Cash'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; color: #DC2626;">₹ ${Number(e.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Hotel Expense Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px; background: #FFF; }
        .header { border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .hotel-name { font-size: 22px; font-weight: 900; color: #1E3A8A; margin: 0; }
        .sub { font-size: 12px; color: #64748B; margin-top: 4px; }
        .total-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #DC2626; color: #FFFFFF; font-weight: 700; text-align: left; padding: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="hotel-name">${params.hotelName}</h1>
          <div class="sub">${params.branchName} • Daily Operational Expenses Report</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #DC2626;">EXPENSE SUMMARY</div>
          <div class="sub">Date: ${dateStr}</div>
        </div>
      </div>
      <div class="total-box">
        <span style="font-size: 13px; font-weight: 700; color: #991B1B;">Total Operational Expenses:</span>
        <span style="font-size: 18px; font-weight: 900; color: #991B1B;">₹ ${Number(params.totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 36px; text-align: center;">#</th>
            <th>Description</th>
            <th>Category</th>
            <th>Date</th>
            <th>Mode</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
  </html>`;
}

// ============================================================================
// GST TAX REPORT HTML
// ============================================================================

export function buildGstTaxReportHtml(params: {
  hotelName: string;
  branchName: string;
  totalTurnover: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  invoices: Array<{
    inv?: string;
    invNumber?: string;
    date?: string;
    cust?: string;
    customer?: string;
    sub?: number;
    taxable?: number;
    cgst?: number;
    sgst?: number;
    tgst?: number;
    tax?: number;
    tot?: number;
    total?: number;
    status?: string;
  }>;
}): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const rows = params.invoices.map((inv, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">${inv.inv || inv.invNumber || `INV-${idx + 1}`}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${inv.date || dateStr}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${inv.cust || inv.customer || 'Walk-in'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹ ${Number(inv.sub ?? inv.taxable ?? 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹ ${Number(inv.cgst || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹ ${Number(inv.sgst || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #16A34A; font-weight: 700;">₹ ${Number(inv.tgst ?? inv.tax ?? 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800;">₹ ${Number(inv.tot ?? inv.total ?? 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        <span style="background: #DCFCE7; color: #15803D; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">
          ${inv.status || 'Paid'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>GST Tax & Audit Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px; background: #FFF; }
        .header { border-bottom: 2px solid #0284C7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .hotel-name { font-size: 22px; font-weight: 900; color: #1E3A8A; margin: 0; }
        .sub { font-size: 12px; color: #64748B; margin-top: 4px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px; }
        .stat-card-title { font-size: 11px; font-weight: 700; color: #0369A1; }
        .stat-card-val { font-size: 16px; font-weight: 900; color: #0C4A6E; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0284C7; color: #FFFFFF; font-weight: 700; text-align: left; padding: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="hotel-name">${params.hotelName}</h1>
          <div class="sub">${params.branchName} • GSTR-3B & GST Audit Summary</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #0284C7;">GST TAX AUDIT</div>
          <div class="sub">Generated: ${dateStr}</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-title">Taxable Turnover</div>
          <div class="stat-card-val">₹ ${Number(params.totalTurnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">CGST (2.5%)</div>
          <div class="stat-card-val">₹ ${Number(params.cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">SGST (2.5%)</div>
          <div class="stat-card-val">₹ ${Number(params.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Total GST Output</div>
          <div class="stat-card-val" style="color: #16A34A;">₹ ${Number(params.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Customer</th>
            <th style="text-align: right;">Taxable (₹)</th>
            <th style="text-align: right;">CGST (₹)</th>
            <th style="text-align: right;">SGST (₹)</th>
            <th style="text-align: right;">Total Tax (₹)</th>
            <th style="text-align: right;">Total Amount (₹)</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
  </html>`;
}
