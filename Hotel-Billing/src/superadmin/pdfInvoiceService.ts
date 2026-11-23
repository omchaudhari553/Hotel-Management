import html2pdf from 'html2pdf.js';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate?: string;
  businessName: string;
  branchName?: string;
  baseAmount?: number;
  amount?: number;
  gstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount?: number;
  paymentGateway?: string;
  paymentMethod?: string;
  status?: string;
  sacCode?: string;
}

const formatINR = (amt: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt || 0);
};

export const generateInvoiceHtml = (inv: InvoicePdfData): string => {
  const base = inv.baseAmount || inv.amount || 0;
  const cgst = inv.cgstAmount ?? Math.round((base * 9) / 100);
  const sgst = inv.sgstAmount ?? Math.round((base * 9) / 100);
  const total = inv.totalAmount || base + cgst + sgst;
  const dateStr = inv.invoiceDate
    ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1E293B; background: #FFFFFF; padding: 32px 36px; max-width: 800px; margin: 0 auto; box-sizing: border-box; font-size: 13px; line-height: 1.5;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: #1E293B; margin: 0 0 4px 0; letter-spacing: -0.5px;">AJALKAR INFOTECH</h1>
          <p style="margin: 0; color: #64748B; font-size: 12px; font-weight: 500;">Hospitality Tech SaaS Platform</p>
          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 11px;">GSTIN: <strong style="color: #334155;">27AABCA1234F1Z5</strong></p>
          <p style="margin: 2px 0 0 0; color: #64748B; font-size: 11px;">Registered Office: Shivaji Nagar, Pune, Maharashtra - 411005</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background: #EEF2FF; color: #4F46E5; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #C7D2FE; margin-bottom: 8px;">TAX INVOICE</span>
          <p style="margin: 0; font-family: monospace; font-size: 15px; font-weight: 800; color: #1E293B;">${inv.invoiceNumber}</p>
          <p style="margin: 4px 0 0 0; color: #64748B; font-size: 12px;">Date: <strong style="color: #334155;">${dateStr}</strong></p>
        </div>
      </div>

      <!-- Billed To & Payment Meta -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Billed To Customer:</span>
          <p style="margin: 0; font-size: 15px; font-weight: 800; color: #0F172A;">${inv.businessName}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Branch: ${inv.branchName || 'Central Primary Branch'}</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748B;">Place of Supply: Maharashtra (27)</p>
        </div>
        <div style="border-left: 1px solid #E2E8F0; padding-left: 20px;">
          <span style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Settlement Details:</span>
          <p style="margin: 0; font-size: 12px; color: #334155;">Gateway: <strong>${inv.paymentGateway || 'Razorpay Technologies'}</strong></p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #334155;">Method: <strong>${inv.paymentMethod || 'UPI Intent / NetBanking'}</strong></p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #059669; font-weight: 700;">Status: ${inv.status || 'SUCCESS / SETTLED'}</p>
        </div>
      </div>

      <!-- Item Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #F1F5F9; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1;">
            <th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Description of Services</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">SAC Code</th>
            <th style="padding: 10px 14px; text-align: right; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Taxable Value</th>
            <th style="padding: 10px 14px; text-align: right; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">CGST (9%)</th>
            <th style="padding: 10px 14px; text-align: right; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">SGST (9%)</th>
            <th style="padding: 10px 14px; text-align: right; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-weight: 600;">
              Hospitality Management Software Subscription License
              <span style="display: block; font-size: 11px; color: #64748B; font-weight: normal; margin-top: 2px;">Multi-Tenant Hotel/Mess/Cafe Platform Access</span>
            </td>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B; font-family: monospace;">${inv.sacCode || '998314'}</td>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600; color: #1E293B;">${formatINR(base)}</td>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">${formatINR(cgst)}</td>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">${formatINR(sgst)}</td>
            <td style="padding: 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; color: #0F172A;">${formatINR(total)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals Summary -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="width: 320px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #64748B;">
            <span>Taxable Subtotal:</span>
            <span style="font-weight: 600; color: #1E293B;">${formatINR(base)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #64748B;">
            <span>CGST @ 9%:</span>
            <span style="font-weight: 600; color: #1E293B;">${formatINR(cgst)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #64748B;">
            <span>SGST @ 9%:</span>
            <span style="font-weight: 600; color: #1E293B;">${formatINR(sgst)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #CBD5E1; padding-top: 10px; margin-top: 10px; font-size: 16px; font-weight: 800; color: #0F172A;">
            <span>Grand Total:</span>
            <span style="color: #4F46E5;">${formatINR(total)}</span>
          </div>
        </div>
      </div>

      <!-- Signature & Notes -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
        <div style="font-size: 11px; color: #64748B; max-width: 420px;">
          <p style="margin: 0; font-weight: 700; color: #334155; margin-bottom: 2px;">Terms & Conditions:</p>
          <p style="margin: 0;">1. This is a computer-generated tax invoice and requires no physical signature under IT Act 2000.</p>
          <p style="margin: 2px 0 0 0;">2. Subject to Pune jurisdiction.</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 140px; border-bottom: 1px solid #94A3B8; margin-bottom: 6px; height: 35px;"></div>
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #1E293B;">Authorized Signatory</p>
          <p style="margin: 0; font-size: 10px; color: #64748B;">Ajalkar Infotech</p>
        </div>
      </div>
    </div>
  `;
};

export const downloadInvoicePdf = async (inv: InvoicePdfData): Promise<void> => {
  const container = document.createElement('div');
  container.innerHTML = generateInvoiceHtml(inv);
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#FFFFFF';
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 10,
      filename: `${inv.invoiceNumber || 'Invoice'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('Invoice PDF generation failed:', err);
    // Fallback to print window if html2pdf fails
    printInvoiceDirect(inv);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const printInvoiceDirect = (inv: InvoicePdfData): void => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tax Invoice - ${inv.invoiceNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; padding: 0; background: #FFFFFF; }
        </style>
      </head>
      <body>
        ${generateInvoiceHtml(inv)}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
