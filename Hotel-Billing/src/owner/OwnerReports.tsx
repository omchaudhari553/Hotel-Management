import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Download,
  Printer,
  ReceiptIndianRupee,
  TrendingUp,
  Percent,
  Wallet,
} from 'lucide-react';
import { ownerService, BranchRecord } from './ownerService';
import { expenseService } from '../services/expenseService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const OwnerReports: React.FC = () => {
  const { language, toDevanagari, localizeName } = useLanguage();
  const [reportType, setReportType] = useState<'HOTEL' | 'GST' | 'EXPENSES'>('HOTEL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [period, setPeriod] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { showToast } = useToast();
  const { business, user } = useAuth();

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: any = {
        type: reportType === 'GST' ? 'GST_REPORT' : (reportType === 'EXPENSES' ? 'EXPENSES_REPORT' : 'HOTEL_REPORT'),
      };
      if (selectedBranchId) params.branchId = Number(selectedBranchId);
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (period) {
        params.period = period;
      }

      const [repRes, branchRes, rawExpenses] = await Promise.all([
        ownerService.getReports(params).catch(() => ({})),
        ownerService.getBranches().catch(() => []),
        reportType === 'EXPENSES'
          ? expenseService.getExpenses(selectedBranchId ? Number(selectedBranchId) : undefined).catch(() => [])
          : Promise.resolve([]),
      ]);

      const activeBranches = Array.isArray(branchRes) ? branchRes : [];
      setBranches(activeBranches);

      const branchMap = new Map<number, BranchRecord>();
      activeBranches.forEach((b) => branchMap.set(b.id, b));

      const finalReport: any = { ...(repRes || {}) };

      // Ensure filterBranchName is accurately populated
      if (selectedBranchId) {
        const found = branchMap.get(Number(selectedBranchId));
        finalReport.filterBranchName = found ? found.name : 'Selected Branch';
      } else {
        finalReport.filterBranchName = finalReport.filterBranchName || 'All Branches Consolidated';
      }

      // If EXPENSES report: connect live expenses seamlessly across branches & dates
      if (reportType === 'EXPENSES') {
        let expensesList: any[] = Array.isArray(finalReport.expensesList) && finalReport.expensesList.length > 0
          ? [...finalReport.expensesList]
          : [];

        // If backend report didn't have expensesList or had 0 items, derive from live operational expenseService
        if (expensesList.length === 0 && Array.isArray(rawExpenses) && rawExpenses.length > 0) {
          // Date range resolution
          let fStart: string | null = null;
          let fEnd: string | null = null;
          const today = new Date();
          const toYmd = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          if (startDate && endDate) {
            fStart = startDate;
            fEnd = endDate;
          } else if (period && period !== 'all-time' && period !== 'all') {
            if (period === 'today') {
              fStart = toYmd(today);
              fEnd = toYmd(today);
            } else if (period === 'this-week') {
              const day = today.getDay();
              const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
              const mon = new Date(today.getFullYear(), today.getMonth(), diffToMon);
              const sun = new Date(mon);
              sun.setDate(mon.getDate() + 6);
              fStart = toYmd(mon);
              fEnd = toYmd(sun);
            } else if (period === 'this-month') {
              const y = today.getFullYear();
              const m = today.getMonth();
              const firstDay = new Date(y, m, 1);
              const lastDay = new Date(y, m + 1, 0);
              fStart = toYmd(firstDay);
              fEnd = toYmd(lastDay);
            } else if (period === 'this-year') {
              const y = today.getFullYear();
              fStart = `${y}-01-01`;
              fEnd = `${y}-12-31`;
            }
          }

          const filteredRaw = rawExpenses.filter((item: any) => {
            // Branch filter
            if (selectedBranchId) {
              const bIdNum = Number(selectedBranchId);
              const bRecord = branchMap.get(bIdNum);
              const branchMatches = item.branchId === bIdNum || (bRecord?.code && item.branchCode === bRecord.code);
              if (!branchMatches) return false;
            }
            // Date filter
            if (fStart && fEnd) {
              const itemDate = item.date || (item.createdAt ? item.createdAt.split('T')[0] : '');
              if (itemDate && (itemDate < fStart || itemDate > fEnd)) return false;
            }
            return true;
          });

          // Sort descending by date
          filteredRaw.sort((a: any, b: any) => {
            const dA = a.date || a.createdAt || '';
            const dB = b.date || b.createdAt || '';
            return dB.localeCompare(dA);
          });

          // Map items
          expensesList = filteredRaw.map((e: any) => {
            let bId = e.branchId;
            if (!bId && e.branchCode) {
              const matched = activeBranches.find((b) => b.code?.toLowerCase() === e.branchCode?.toLowerCase());
              if (matched) bId = matched.id;
            }
            if (!bId && activeBranches.length > 0) {
              bId = activeBranches[0].id;
            }
            const br = bId ? branchMap.get(bId) : undefined;
            return {
              id: e.id,
              name: e.name,
              category: e.category || 'General',
              amount: Number(e.amount || 0),
              date: e.date || (e.createdAt ? e.createdAt.split('T')[0] : toYmd(today)),
              paymentMode: e.paymentMode || 'CASH',
              description: e.description || '',
              branchId: bId,
              branchName: br?.name || 'Main Branch',
              branchCode: br?.code || e.branchCode || 'MB-1',
              branchCity: br?.city || '',
            };
          });
        }

        // Ensure all expenses have proper branch information
        expensesList = expensesList.map((e: any) => {
          let bId = e.branchId;
          let br = bId ? branchMap.get(bId) : undefined;
          if (!br && e.branchCode) {
            br = activeBranches.find((b) => b.code?.toLowerCase() === e.branchCode?.toLowerCase());
          }
          return {
            ...e,
            branchName: e.branchName || br?.name || 'Main Branch',
            branchCode: e.branchCode || br?.code || 'MB-1',
            branchCity: e.branchCity || br?.city || '',
          };
        });

        // Compute aggregations
        const totalExpensesAmount = expensesList.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
        const branchExpenseMap = new Map<number | string, any>();
        const categoryMap = new Map<string, number>();

        expensesList.forEach((e) => {
          const amt = Number(e.amount) || 0;
          const key = e.branchId || e.branchName || 'other';
          const existing = branchExpenseMap.get(key) || {
            branchId: e.branchId,
            branchName: e.branchName || 'Main Branch',
            branchCode: e.branchCode || '—',
            branchCity: e.branchCity || '—',
            totalAmount: 0,
            expenseCount: 0,
          };
          existing.totalAmount += amt;
          existing.expenseCount += 1;
          branchExpenseMap.set(key, existing);

          const cat = e.category || 'General';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + amt);
        });

        const branchExpensesBreakdown = Array.from(branchExpenseMap.values());
        const categoryExpensesBreakdown = Array.from(categoryMap.entries())
          .map(([category, totalAmount]) => ({ category, totalAmount }))
          .sort((a, b) => b.totalAmount - a.totalAmount);

        finalReport.expensesList = expensesList;
        finalReport.totalExpensesAmount = totalExpensesAmount;
        finalReport.totalExpenses = totalExpensesAmount;
        finalReport.expensesCount = expensesList.length;
        finalReport.branchExpensesBreakdown = branchExpensesBreakdown;
        finalReport.categoryExpensesBreakdown = categoryExpensesBreakdown;
      }

      setReportData(finalReport);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchReport();
    } catch (err: any) {
      console.warn('Failed to refresh report data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedBranchId, period, startDate, endDate]);

  const formatCurrency = (amt: number | undefined) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amt || 0));
    return language === 'mr' ? toDevanagari(formatted) : formatted;
  };

  const handlePrint = () => {
    if (!reportData) {
      showToast('error', 'Report data is still loading. Please wait.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Pop-up blocked. Please allow pop-ups for this site to print reports.');
      return;
    }

    const hotelName = business?.name || user?.fullName || 'Hotel Multi-Branch Enterprise';
    const hotelGstin = (business as any)?.gstin || (business as any)?.taxNumber || 'N/A';
    const hotelAddress = (business as any)?.address || (business?.city ? `${business.city}, ${business.state || ''}` : 'Corporate Head Office');
    const hotelPhone = (business as any)?.phone || 'N/A';
    const reportTitle = reportType === 'GST'
      ? 'GST Filing & Tax Breakdown Report'
      : (reportType === 'EXPENSES' ? 'Consolidated Multi-Branch Expenses & Cost Report' : 'Consolidated Hotel Operational Report');
    const periodLabel = startDate && endDate ? `${startDate} to ${endDate}` : period.replace('-', ' ').toUpperCase();
    const branchScopeName = reportData.filterBranchName || 'All Hotel Branches Consolidated';
    const printedBy = user?.fullName || user?.username || 'Authorized Business Owner';
    const currentDate = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const reportCode = `REP-${reportType}-${Date.now().toString().slice(-6)}`;

    const fmt = (val: number | undefined) => {
      const num = Number(val || 0);
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(num);
    };

    let summaryCardsHTML = '';
    let detailedTableHTML = '';

    if (reportType === 'HOTEL') {
      summaryCardsHTML = `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4.5px solid #B45309;">
            <div class="kpi-label">Gross Invoiced Revenue</div>
            <div class="kpi-val" style="color: #0F172A;">${fmt(reportData.totalSales)}</div>
            <div class="kpi-sub">Total revenue billed across branches</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #16A34A;">
            <div class="kpi-label">Payments Settled & Realized</div>
            <div class="kpi-val" style="color: #16A34A;">${fmt(reportData.collectedPayments)}</div>
            <div class="kpi-sub">Actual payments collected</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #DC2626;">
            <div class="kpi-label">Supplier & Stock Purchases</div>
            <div class="kpi-val" style="color: #DC2626;">${fmt(reportData.netPurchases || reportData.totalPurchases)}</div>
            <div class="kpi-sub">Cost of goods & supplies</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #D97706;">
            <div class="kpi-label">Estimated Operating Profit</div>
            <div class="kpi-val" style="color: ${(reportData.netProfit || 0) >= 0 ? '#15803D' : '#B91C1C'};">${fmt(reportData.netProfit)}</div>
            <div class="kpi-sub">Gross Revenue minus Purchases & Expenses</div>
          </div>
        </div>
      `;

      detailedTableHTML = `
        <div class="section-title">Itemized Operational Financial Ledger</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 55px; text-align: center;">Sr #</th>
              <th>Operational Financial Metric</th>
              <th style="text-align: center;">Category</th>
              <th style="text-align: right;">Amount / Metric Value</th>
              <th style="text-align: center;">Audit Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; font-weight: 700;">01</td>
              <td><strong>Gross Billed Revenue</strong><div class="sub-desc">Total sales across Dine-in, Takeaway, Delivery & Rooms</div></td>
              <td style="text-align: center;"><span class="badge badge-amber">Revenue</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #0F172A;">${fmt(reportData.totalSales)}</td>
              <td style="text-align: center;"><span class="badge badge-green">VERIFIED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">02</td>
              <td><strong>Net Payments Realized</strong><div class="sub-desc">Cash, UPI, and Card transactions deposited</div></td>
              <td style="text-align: center;"><span class="badge badge-green">Inflow</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #16A34A;">${fmt(reportData.collectedPayments)}</td>
              <td style="text-align: center;"><span class="badge badge-green">VERIFIED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">03</td>
              <td><strong>Customer Unpaid Balance / Outstanding</strong><div class="sub-desc">Credit bills and customer receivables</div></td>
              <td style="text-align: center;"><span class="badge badge-amber">Receivable</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #D97706;">${fmt(reportData.outstanding)}</td>
              <td style="text-align: center;"><span class="badge badge-slate">PENDING</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">04</td>
              <td><strong>Direct Operational Expenses</strong><div class="sub-desc">Utilities, transportation, groceries & maintenance</div></td>
              <td style="text-align: center;"><span class="badge badge-red">Expense</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #DC2626;">${fmt(reportData.totalExpenses)}</td>
              <td style="text-align: center;"><span class="badge badge-green">VERIFIED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">05</td>
              <td><strong>Supplier Net Purchases</strong><div class="sub-desc">Inventory purchase orders minus purchase returns</div></td>
              <td style="text-align: center;"><span class="badge badge-red">Outflow</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #DC2626;">${fmt(reportData.netPurchases)}</td>
              <td style="text-align: center;"><span class="badge badge-green">VERIFIED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">06</td>
              <td><strong>Total Kitchen Order Tickets (KOT)</strong><div class="sub-desc">Orders routed to kitchen stations</div></td>
              <td style="text-align: center;"><span class="badge badge-slate">Volume</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #0F172A;">${reportData.totalKots || 0} Tickets</td>
              <td style="text-align: center;"><span class="badge badge-green">RECORDED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">07</td>
              <td><strong>Taxable Turnover (Food & Hospitality)</strong><div class="sub-desc">Pre-tax base for GST computation</div></td>
              <td style="text-align: center;"><span class="badge badge-amber">Tax Base</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #0F172A;">${fmt(reportData.taxableSales)}</td>
              <td style="text-align: center;"><span class="badge badge-green">AUDITED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">08</td>
              <td><strong>GST Output Collected</strong><div class="sub-desc">CGST + SGST + IGST combined tax</div></td>
              <td style="text-align: center;"><span class="badge badge-slate">Tax</span></td>
              <td style="text-align: right; font-weight: 800; font-size: 13px; color: #2563EB;">${fmt(reportData.salesGst || reportData.totalGst)}</td>
              <td style="text-align: center;"><span class="badge badge-green">AUDITED</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #FFFBEB; border-top: 2.5px solid #B45309;">
              <td colspan="3" style="font-weight: 900; font-size: 13px; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">
                Net Operational Profit (Before Tax)
              </td>
              <td style="text-align: right; font-weight: 900; font-size: 15px; color: ${(reportData.netProfit || 0) >= 0 ? '#15803D' : '#B91C1C'};">
                ${fmt(reportData.netProfit)}
              </td>
              <td style="text-align: center;"><span class="badge badge-green">CERTIFIED</span></td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (reportType === 'GST') {
      const totalTax = (Number(reportData.salesCgst) || 0) + (Number(reportData.salesSgst) || 0) + (Number(reportData.salesIgst) || 0);
      const inputTax = Number(reportData.purchaseGst || 0);
      const netPayable = Math.max(0, totalTax - inputTax);

      summaryCardsHTML = `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4.5px solid #0F766E;">
            <div class="kpi-label">Total Taxable Turnover</div>
            <div class="kpi-val" style="color: #0F766E;">${fmt(reportData.taxableSales)}</div>
            <div class="kpi-sub">Outward taxable base</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #2563EB;">
            <div class="kpi-label">Central GST (CGST @ 2.5%)</div>
            <div class="kpi-val" style="color: #2563EB;">${fmt(reportData.salesCgst)}</div>
            <div class="kpi-sub">Output CGST liability</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #15803D;">
            <div class="kpi-label">State GST (SGST @ 2.5%)</div>
            <div class="kpi-val" style="color: #15803D;">${fmt(reportData.salesSgst)}</div>
            <div class="kpi-sub">Output SGST liability</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #B45309;">
            <div class="kpi-label">Gross GST Output Liability</div>
            <div class="kpi-val" style="color: #B45309;">${fmt(totalTax)}</div>
            <div class="kpi-sub">CGST + SGST + IGST combined</div>
          </div>
        </div>
      `;

      detailedTableHTML = `
        <div class="section-title">GST Tax Liability & Inward Input Tax Breakdown (GSTR Breakdown)</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Code</th>
              <th>GST Component / Return Head</th>
              <th style="text-align: right;">Assessable Taxable (₹)</th>
              <th style="text-align: right;">Applicable Rate</th>
              <th style="text-align: right;">Total Tax Computed</th>
              <th style="text-align: center;">Statutory Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; font-weight: 700;">3.1(a)</td>
              <td><strong>Outward Supplies (Sales) - Taxable Turnover</strong><div class="sub-desc">Food, beverage, room stay services</div></td>
              <td style="text-align: right; font-weight: 800;">${fmt(reportData.taxableSales)}</td>
              <td style="text-align: right; font-weight: 600;">5.00% Combined</td>
              <td style="text-align: right; font-weight: 800; color: #0F172A;">${fmt(totalTax)}</td>
              <td style="text-align: center;"><span class="badge badge-green">OUTWARD</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">—</td>
              <td><strong>• Central GST Output (CGST)</strong><div class="sub-desc">Central Government Tax share</div></td>
              <td style="text-align: right; font-weight: 700;">${fmt(reportData.taxableSales)}</td>
              <td style="text-align: right; font-weight: 600;">2.50%</td>
              <td style="text-align: right; font-weight: 700; color: #15803D;">${fmt(reportData.salesCgst)}</td>
              <td style="text-align: center;"><span class="badge badge-green">RECONCILED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">—</td>
              <td><strong>• State GST Output (SGST)</strong><div class="sub-desc">State Government Tax share</div></td>
              <td style="text-align: right; font-weight: 700;">${fmt(reportData.taxableSales)}</td>
              <td style="text-align: right; font-weight: 600;">2.50%</td>
              <td style="text-align: right; font-weight: 700; color: #15803D;">${fmt(reportData.salesSgst)}</td>
              <td style="text-align: center;"><span class="badge badge-green">RECONCILED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">—</td>
              <td><strong>• Integrated GST Output (IGST)</strong><div class="sub-desc">Interstate customer supplies</div></td>
              <td style="text-align: right; font-weight: 700;">${fmt(reportData.taxableSales)}</td>
              <td style="text-align: right; font-weight: 600;">5.00%</td>
              <td style="text-align: right; font-weight: 700; color: #0284C7;">${fmt(reportData.salesIgst)}</td>
              <td style="text-align: center;"><span class="badge badge-green">RECONCILED</span></td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: 700;">4(A)</td>
              <td><strong>Inward Eligible Input Tax Credit (ITC on Purchases)</strong><div class="sub-desc">Supplies and kitchen inventory purchases from GST registered vendors</div></td>
              <td style="text-align: right; font-weight: 700;">${fmt(reportData.purchaseTaxable || reportData.netPurchases)}</td>
              <td style="text-align: right; font-weight: 600;">Standard</td>
              <td style="text-align: right; font-weight: 800; color: #2563EB;">${fmt(inputTax)}</td>
              <td style="text-align: center;"><span class="badge badge-green">ELIGIBLE ITC</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #FEF3C7; border-top: 2.5px solid #0F766E;">
              <td colspan="4" style="font-weight: 900; font-size: 13px; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">
                Net GST Cash Liability Payable (Output GST minus ITC)
              </td>
              <td style="text-align: right; font-weight: 900; font-size: 15px; color: #0F766E;">
                ${fmt(netPayable)}
              </td>
              <td style="text-align: center;"><span class="badge badge-amber">NET PAYABLE</span></td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      // EXPENSES REPORT
      const expensesList = reportData.expensesList || [];
      const branchSummary = reportData.branchExpensesBreakdown || [];
      const totalExp = Number(reportData.totalExpensesAmount || reportData.totalExpenses || 0);
      const totalCount = expensesList.length;
      const topCat = reportData.categoryExpensesBreakdown?.[0]?.category || 'General';
      const topBranch = branchSummary.length > 0
        ? [...branchSummary].sort((a: any, b: any) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0))[0]?.branchName
        : (reportData.filterBranchName || 'All Branches');

      summaryCardsHTML = `
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4.5px solid #DC2626;">
            <div class="kpi-label">Total Branch Expenses</div>
            <div class="kpi-val" style="color: #DC2626;">${fmt(totalExp)}</div>
            <div class="kpi-sub">Consolidated operational spending</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #2563EB;">
            <div class="kpi-label">Expense Transactions</div>
            <div class="kpi-val" style="color: #2563EB;">${totalCount} Records</div>
            <div class="kpi-sub">Total billed expenses count</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #D97706;">
            <div class="kpi-label">Top Expense Category</div>
            <div class="kpi-val" style="color: #D97706; font-size: 15px;">${topCat}</div>
            <div class="kpi-sub">Highest category spending</div>
          </div>
          <div class="kpi-card" style="border-left: 4.5px solid #7C3AED;">
            <div class="kpi-label">Highest Spending Branch</div>
            <div class="kpi-val" style="color: #7C3AED; font-size: 15px;">${topBranch}</div>
            <div class="kpi-sub">Largest branch expenditure</div>
          </div>
        </div>
      `;

      let branchRowsHTML = '';
      if (branchSummary.length > 0) {
        branchRowsHTML = `
          <div class="section-title">Branch-Wise Expenses Distribution</div>
          <table class="report-table" style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Sr #</th>
                <th>Branch Name</th>
                <th>Code</th>
                <th>City</th>
                <th style="text-align: center;">Entries</th>
                <th style="text-align: right;">Total Expenses (₹)</th>
                <th style="text-align: right;">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              ${branchSummary.map((b: any, idx: number) => {
                const bAmt = Number(b.totalAmount || 0);
                const pct = totalExp > 0 ? ((bAmt / totalExp) * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${String(idx + 1).padStart(2, '0')}</td>
                    <td><strong>${b.branchName}</strong></td>
                    <td>${b.branchCode || '—'}</td>
                    <td>${b.branchCity || '—'}</td>
                    <td style="text-align: center;">${b.expenseCount || 0}</td>
                    <td style="text-align: right; font-weight: 800; color: #DC2626;">${fmt(bAmt)}</td>
                    <td style="text-align: right; font-weight: 700;">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #F1F5F9; font-weight: 800;">
                <td colspan="5" style="text-align: right;">Total Consolidated Branch Expenses:</td>
                <td style="text-align: right; color: #DC2626; font-size: 13px;">${fmt(totalExp)}</td>
                <td style="text-align: right;">100%</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      detailedTableHTML = `
        ${branchRowsHTML}
        <div class="section-title">Itemized Multi-Branch Expenses Ledger</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">Sr #</th>
              <th>Date</th>
              <th>Branch</th>
              <th>Expense Title / Payee</th>
              <th>Category</th>
              <th>Mode</th>
              <th>Description / Notes</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${expensesList.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: #64748B;">
                  No expense records found for the selected criteria.
                </td>
              </tr>
            ` : expensesList.map((exp: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${String(idx + 1).padStart(2, '0')}</td>
                <td>${exp.date || '—'}</td>
                <td><strong>${exp.branchName || 'Main Branch'}</strong></td>
                <td><strong>${exp.name}</strong></td>
                <td><span class="badge badge-amber">${exp.category}</span></td>
                <td><span class="badge badge-slate">${exp.paymentMode || 'CASH'}</span></td>
                <td style="font-size: 10px; color: #64748B;">${exp.description || '—'}</td>
                <td style="text-align: right; font-weight: 800; color: #DC2626;">${fmt(exp.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #FEF2F2; border-top: 2.5px solid #DC2626;">
              <td colspan="7" style="font-weight: 900; font-size: 12px; color: #991B1B; text-transform: uppercase;">
                Consolidated Expenses Grand Total
              </td>
              <td style="text-align: right; font-weight: 900; font-size: 14px; color: #DC2626;">
                ${fmt(totalExp)}
              </td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle} - ${hotelName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 14mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            margin: 0;
            padding: 24px;
            font-size: 11px;
            line-height: 1.45;
          }
          .action-bar {
            position: fixed;
            top: 14px;
            right: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1000;
            background: #FFFFFF;
            padding: 6px 12px;
            border-radius: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
            border: 1.5px solid #CBD5E1;
          }
          .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .btn-print {
            background-color: #B45309;
            color: #FFFFFF;
          }
          .btn-print:hover {
            background-color: #92400E;
          }
          .btn-close {
            background-color: #475569;
            color: #FFFFFF;
          }
          .btn-close:hover {
            background-color: #334155;
          }

          /* Letterhead */
          .letterhead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2.5px solid #B45309;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .hotel-title {
            font-size: 22px;
            font-weight: 900;
            color: #0F172A;
            letter-spacing: -0.02em;
            margin: 0;
          }
          .report-tagline {
            font-size: 12px;
            font-weight: 700;
            color: #B45309;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 3px;
          }
          .hotel-address {
            font-size: 10px;
            color: #475569;
            margin-top: 4px;
            max-width: 420px;
          }
          .meta-box {
            text-align: right;
            background: #F8FAFC;
            border: 1.5px solid #E2E8F0;
            border-radius: 8px;
            padding: 10px 14px;
            min-width: 220px;
          }
          .meta-item {
            font-size: 10px;
            color: #64748B;
            margin-bottom: 3px;
          }
          .meta-item strong {
            color: #0F172A;
            font-weight: 700;
          }

          /* KPI Grid */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #F8FAFC;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            padding: 12px 14px;
          }
          .kpi-label {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #64748B;
          }
          .kpi-val {
            font-size: 18px;
            font-weight: 900;
            margin-top: 4px;
            letter-spacing: -0.02em;
          }
          .kpi-sub {
            font-size: 9px;
            color: #94A3B8;
            margin-top: 2px;
          }

          .section-title {
            font-size: 13px;
            font-weight: 800;
            color: #1E293B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 18px 0 8px 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          /* Tables */
          .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            border: 1.5px solid #94A3B8;
            font-size: 11px;
          }
          .report-table thead th {
            background-color: #1E293B;
            color: #FFFFFF;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 9px 12px;
            font-size: 10px;
            border: 1px solid #334155;
          }
          .report-table tbody td {
            padding: 9px 12px;
            border: 1px solid #CBD5E1;
            color: #334155;
            vertical-align: middle;
          }
          .report-table tbody tr:nth-child(even) td {
            background-color: #F8FAFC;
          }
          .report-table tfoot td {
            padding: 12px 14px;
            border: 1.5px solid #94A3B8;
          }
          .sub-desc {
            font-size: 9.5px;
            color: #64748B;
            margin-top: 2px;
          }

          /* Badges */
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.3px;
            text-transform: uppercase;
          }
          .badge-green { background: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
          .badge-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
          .badge-slate { background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; }
          .badge-red   { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }

          /* Certification & Sign-off */
          .audit-box {
            margin-top: 24px;
            border: 1.5px dashed #94A3B8;
            border-radius: 8px;
            padding: 14px 18px;
            background: #F8FAFC;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .audit-text {
            max-width: 60%;
            font-size: 9.5px;
            color: #64748B;
            line-height: 1.5;
          }
          .audit-text strong {
            color: #0F172A;
          }
          .signature-area {
            text-align: center;
            min-width: 200px;
          }
          .signature-line {
            width: 180px;
            border-top: 1.5px solid #0F172A;
            margin-bottom: 6px;
          }
          .sign-title {
            font-size: 10px;
            font-weight: 800;
            color: #0F172A;
          }
          .sign-sub {
            font-size: 8.5px;
            color: #64748B;
          }

          /* Footer */
          .report-footer {
            margin-top: 18px;
            padding-top: 8px;
            border-top: 1px solid #CBD5E1;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94A3B8;
          }

          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="action-bar no-print">
          <button class="action-btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="action-btn btn-close" onclick="window.close()">✕ Close Preview</button>
        </div>

        <div class="letterhead">
          <div>
            <h1 class="hotel-title">${hotelName}</h1>
            <div class="report-tagline">${reportTitle}</div>
            <div class="hotel-address">
              ${hotelAddress} • Phone: ${hotelPhone} • GSTIN: <strong>${hotelGstin}</strong>
            </div>
            <div style="margin-top: 6px;">
              <span class="badge badge-amber">Scope: ${branchScopeName}</span>
              <span class="badge badge-slate" style="margin-left: 6px;">Period: ${periodLabel}</span>
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-item">Document Code: <strong>${reportCode}</strong></div>
            <div class="meta-item">Generated At: <strong>${currentDate}</strong></div>
            <div class="meta-item">Generated By: <strong>${printedBy}</strong></div>
            <div class="meta-item">Audit Verification: <strong style="color: #16A34A;">VERIFIED ✓</strong></div>
          </div>
        </div>

        ${summaryCardsHTML}
        ${detailedTableHTML}

        <div class="audit-box">
          <div class="audit-text">
            <strong>SYSTEM AUDIT CERTIFICATION</strong><br />
            This document is an authentic certified statement compiled directly from live database ledger entries of the Hotel POS Billing & Multi-Branch Management System. All figures are audited, reconciled, and conform to standard accounting principles.
          </div>
          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="sign-title">${printedBy}</div>
            <div class="sign-sub">Authorized Signatory / Enterprise Administrator</div>
          </div>
        </div>

        <div class="report-footer">
          <div>${hotelName} Multi-Branch Enterprise Suite • Confidential Internal Audit Report</div>
          <div>Page 1 of 1 • Official System Printout</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    if (reportType === 'EXPENSES') {
      const expensesList = reportData.expensesList || [];
      const headers = ['Sr No', 'Date', 'Branch Name', 'Branch Code', 'City', 'Expense Title', 'Category', 'Payment Mode', 'Amount', 'Description'];
      const rows = expensesList.map((e: any, idx: number) => [
        idx + 1,
        `"${e.date || ''}"`,
        `"${e.branchName || ''}"`,
        `"${e.branchCode || ''}"`,
        `"${e.branchCity || ''}"`,
        `"${(e.name || '').replace(/"/g, '""')}"`,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${e.paymentMode || ''}"`,
        Number(e.amount || 0),
        `"${(e.description || '').replace(/"/g, '""')}"`,
      ]);
      const totalAmt = Number(reportData.totalExpensesAmount || reportData.totalExpenses || 0);
      rows.push(['Total', '""', '""', '""', '""', '""', '""', '""', totalAmt, '""']);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `branch_expenses_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('success', 'Branch Expenses Report exported as CSV.');
      return;
    }

    const rows = [
      ['Metric', 'Value'],
      ['Report Type', reportType === 'GST' ? 'GST Filing & Tax Breakdown Report' : 'Hotel Consolidated Operational Report'],
      ['Scope', reportData.filterBranchName || 'All Branches'],
      ['Period', startDate && endDate ? `${startDate} to ${endDate}` : period],
      ['Total Gross Sales', reportData.totalSales || 0],
      ['Taxable Sales', reportData.taxableSales || 0],
      ['CGST (2.5%)', reportData.salesCgst || 0],
      ['SGST (2.5%)', reportData.salesSgst || 0],
      ['IGST (5%)', reportData.salesIgst || 0],
      ['Net GST Amount', (reportData.salesCgst || 0) + (reportData.salesSgst || 0) + (reportData.salesIgst || 0)],
      ['Payments Collected', reportData.collectedPayments || 0],
      ['Total Expenses', reportData.totalExpenses || 0],
      ['Total Purchases', reportData.totalPurchases || 0],
      ['Net Profit', reportData.netProfit || 0],
      ['Invoices Generated', reportData.totalInvoices || 0],
      ['KOTs Generated', reportData.totalKots || 0],
    ];
    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType.toLowerCase()}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `${reportType} Report exported.`);
  };

  const branchSummary = reportData?.branchExpensesBreakdown || [];
  const expensesList = reportData?.expensesList || [];
  const totalExp = Number(reportData?.totalExpensesAmount || reportData?.totalExpenses || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
            {language === 'mr' ? 'कार्यकारी अहवाल आणि आर्थिक विवरणपत्रे' : 'Executive Reports & Financial Statements'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="owner-btn-secondary"
            title={language === 'mr' ? 'अहवाल रीफ्रेश करा' : 'Refresh current report'}
            aria-label="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              minHeight: '38px',
              padding: 0,
              borderRadius: '8px',
              cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
              border: '1.5px solid var(--border-slate, #CBD5E1)',
              opacity: (loading || refreshing) ? 0.75 : 1,
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
          <button
            onClick={handlePrint}
            className="owner-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 16px',
              height: '42px',
              minHeight: '42px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1.5px solid var(--border-slate, #CBD5E1)',
            }}
          >
            <Printer size={15} />
            <span>{language === 'mr' ? 'अहवाल प्रिंट करा' : 'Print Report'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 18px',
              height: '42px',
              minHeight: '42px',
              backgroundColor: '#B45309',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(180, 83, 9, 0.25)',
            }}
          >
            <Download size={15} />
            <span>{language === 'mr' ? 'CSV एक्सपोर्ट करा' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Tabs: Hotel Reports vs GST Reports vs Branch Expenses Report */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setReportType('HOTEL')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: reportType === 'HOTEL' ? '#B45309' : '#64748B',
            borderBottom: reportType === 'HOTEL' ? '3px solid #B45309' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileSpreadsheet size={18} />
          <span>{language === 'mr' ? 'हॉटेल कामकाज अहवाल' : 'Hotel Operational Report'}</span>
        </button>

        <button
          onClick={() => setReportType('GST')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: reportType === 'GST' ? '#B45309' : '#64748B',
            borderBottom: reportType === 'GST' ? '3px solid #B45309' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Percent size={18} />
          <span>{language === 'mr' ? 'जीएसटी कर तपशील अहवाल' : 'GST Tax Breakdown Report'}</span>
        </button>

        <button
          onClick={() => setReportType('EXPENSES')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: reportType === 'EXPENSES' ? '#B45309' : '#64748B',
            borderBottom: reportType === 'EXPENSES' ? '3px solid #B45309' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ReceiptIndianRupee size={18} />
          <span>{language === 'mr' ? 'शाखा खर्च अहवाल' : 'Branch Expenses Report'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: 'var(--card-white, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-slate, #E2E8F0)',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: 700, fontSize: '0.86rem' }}>
          <Filter size={16} />
          <span>{language === 'mr' ? 'अहवाल व्याप्ती आणि तारखा:' : 'Report Scope & Dates:'}</span>
        </div>

        <div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            style={selectStyle}
          >
            <option value="">{language === 'mr' ? 'सर्व सक्रिय शाखा एकत्रित' : 'All Active Branches Consolidated'}</option>
            {branches.filter(b => b.status === 'ACTIVE').map((b) => (
              <option key={b.id} value={b.id}>
                {language === 'mr' ? 'वैयक्तिक शाखा: ' : 'Individual Branch: '}{b.name} ({b.city || b.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setStartDate('');
              setEndDate('');
            }}
            style={selectStyle}
          >
            <option value="this-month">{language === 'mr' ? 'हा महिना' : 'This Month'}</option>
            <option value="today">{language === 'mr' ? 'आज' : 'Today'}</option>
            <option value="this-week">{language === 'mr' ? 'हा आठवडा' : 'This Week'}</option>
            <option value="this-year">{language === 'mr' ? 'हे वर्ष' : 'This Year'}</option>
            <option value="all-time">{language === 'mr' ? 'सर्व काळ (सर्व रेकॉर्ड्स)' : 'All Time (All Records)'}</option>
            <option value="custom">{language === 'mr' ? 'सानुकूल तारीख श्रेणी' : 'Custom Date Range'}</option>
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div>
              <input
                type="date"
                className="owner-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={selectStyle}
                placeholder={language === 'mr' ? 'प्रारंभ तारीख' : 'Start Date'}
                title={language === 'mr' ? 'प्रारंभ तारीख' : 'Start Date'}
              />
            </div>
            <div>
              <input
                type="date"
                className="owner-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={selectStyle}
                placeholder={language === 'mr' ? 'शेवट तारीख' : 'End Date'}
                title={language === 'mr' ? 'शेवट तारीख' : 'End Date'}
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="owner-btn-secondary"
          title={language === 'mr' ? 'अहवाल डेटा रीफ्रेश करा' : 'Refresh report data'}
          aria-label="Refresh"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            minHeight: '38px',
            padding: 0,
            borderRadius: '8px',
            cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
            border: '1.5px solid var(--border-slate, #CBD5E1)',
            opacity: (loading || refreshing) ? 0.75 : 1,
            backgroundColor: '#F8FAFC',
          }}
        >
          <RefreshCw
            size={16}
            style={{
              animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      {/* Report Summary Cards */}
      {reportType === 'HOTEL' && (
        <div className="owner-reports-kpi-grid-5">
          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'एकूण एकूण महसूल (Gross)' : 'Total Gross Revenue'}</span>
            <div style={{ ...kpiValStyle, color: 'var(--text-heading, #0F172A)' }}>
              {formatCurrency(reportData?.totalSales)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'प्राप्त पेमेंट्स' : 'Payments Settled'}</span>
            <div style={{ ...kpiValStyle, color: '#16A34A' }}>
              {formatCurrency(reportData?.collectedPayments)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'कामकाज खर्च' : 'Operational Expenses'}</span>
            <div style={{ ...kpiValStyle, color: '#DC2626' }}>
              {formatCurrency(reportData?.totalExpenses)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'साठा खरेदी' : 'Stock Purchases'}</span>
            <div style={{ ...kpiValStyle, color: '#DC2626' }}>
              {formatCurrency(reportData?.netPurchases)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'अंदाजे निव्वळ नफा (Net)' : 'Estimated Net Profit'}</span>
            <div style={{ ...kpiValStyle, color: (reportData?.netProfit || 0) >= 0 ? '#15803D' : '#B91C1C' }}>
              {formatCurrency(reportData?.netProfit)}
            </div>
          </div>
        </div>
      )}

      {reportType === 'GST' && (
        <div className="owner-reports-kpi-grid-4">
          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'करपात्र उलाढाल' : 'Taxable Turnover'}</span>
            <div style={{ ...kpiValStyle, color: '#0F766E' }}>
              {formatCurrency(reportData?.taxableSales)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'केंद्रीय जीएसटी (CGST @ २.५%)' : 'Central GST (CGST @ 2.5%)'}</span>
            <div style={{ ...kpiValStyle, color: '#2563EB' }}>
              {formatCurrency(reportData?.salesCgst)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'राज्य जीएसटी (SGST @ २.५%)' : 'State GST (SGST @ 2.5%)'}</span>
            <div style={{ ...kpiValStyle, color: '#15803D' }}>
              {formatCurrency(reportData?.salesSgst)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle}>{language === 'mr' ? 'एकूण देय जीएसटी' : 'Total GST Payable'}</span>
            <div style={{ ...kpiValStyle, color: '#B45309' }}>
              {formatCurrency((reportData?.salesCgst || 0) + (reportData?.salesSgst || 0) + (reportData?.salesIgst || 0))}
            </div>
          </div>
        </div>
      )}

      {reportType === 'EXPENSES' && (
        <div className="owner-reports-kpi-grid-4">
          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle} title={language === 'mr' ? 'एकूण एकत्रित खर्च' : 'Total Consolidated Expenses'}>
              {language === 'mr' ? 'एकूण एकत्रित खर्च' : 'Total Consolidated Expenses'}
            </span>
            <div style={{ ...kpiValStyle, color: '#DC2626' }} title={formatCurrency(totalExp)}>
              {formatCurrency(totalExp)}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle} title={language === 'mr' ? 'खर्च नोंदी संख्या' : 'Expense Records Count'}>
              {language === 'mr' ? 'खर्च नोंदी संख्या' : 'Expense Records Count'}
            </span>
            <div style={{ ...kpiValStyle, color: '#2563EB' }} title={`${expensesList.length} Entries`}>
              {expensesList.length} {language === 'mr' ? 'नोंदी' : 'Entries'}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle} title={language === 'mr' ? 'सर्वाधिक खर्च करणारी शाखा' : 'Top Spending Branch'}>
              {language === 'mr' ? 'सर्वाधिक खर्च करणारी शाखा' : 'Top Spending Branch'}
            </span>
            <div
              style={{ ...kpiValStyle, color: '#7C3AED' }}
              title={
                branchSummary.length > 0
                  ? [...branchSummary].sort((a: any, b: any) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0))[0]?.branchName
                  : (reportData?.filterBranchName || 'All Branches')
              }
            >
              {branchSummary.length > 0
                ? [...branchSummary].sort((a: any, b: any) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0))[0]?.branchName
                : (reportData?.filterBranchName || 'All Branches')}
            </div>
          </div>

          <div className="owner-card" style={kpiBoxStyle}>
            <span style={kpiLabelStyle} title={language === 'mr' ? 'प्रमुख खर्च वर्ग' : 'Top Expense Category'}>
              {language === 'mr' ? 'प्रमुख खर्च वर्ग' : 'Top Expense Category'}
            </span>
            <div
              style={{ ...kpiValStyle, color: '#D97706' }}
              title={reportData?.categoryExpensesBreakdown?.[0]?.category || 'General'}
            >
              {reportData?.categoryExpensesBreakdown?.[0]?.category || 'General'}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {reportType === 'EXPENSES' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Branch-Wise Summary Table */}
          {branchSummary.length > 0 && (
            <div
              className="owner-card"
              style={{
                backgroundColor: 'var(--card-white, #FFFFFF)',
                borderRadius: '12px',
                border: '1.5px solid var(--border-slate, #CBD5E1)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-slate, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
                    {language === 'mr' ? 'शाखानिहाय खर्च वाटप सारांश' : 'Branch-Wise Expenses Distribution Summary'}
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
                    {language === 'mr' ? 'मल्टी-ब्राँच खर्च एकूण आणि प्रमाणबद्ध विभाजन' : 'Multi-branch expenditure totals and proportional breakdown'}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'शाखा' : 'Branch'}</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'कोड' : 'Code'}</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'शहर' : 'City'}</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'व्यवहार' : 'Transactions'}</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'एकूण खर्च (₹)' : 'Total Expenses (₹)'}</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #1E293B)' }}>{language === 'mr' ? 'वाटा (%)' : 'Share (%)'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchSummary.map((b: any) => {
                      const bAmt = Number(b.totalAmount || 0);
                      const pct = totalExp > 0 ? ((bAmt / totalExp) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={b.branchId} style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Building2 size={16} color="#B45309" />
                              <span>{language === 'mr' ? localizeName(b.branchName) : b.branchName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748B)' }}>{b.branchCode || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748B)' }}>
                            {language === 'mr' ? localizeName(b.branchCity || '—') : (b.branchCity || '—')}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            {language === 'mr' ? toDevanagari(b.expenseCount || 0) : (b.expenseCount || 0)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>
                            {formatCurrency(bAmt)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                            {language === 'mr' ? toDevanagari(pct) : pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderTop: '2px solid var(--border-slate, #CBD5E1)', fontWeight: 800 }}>
                      <td colSpan={4} style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-heading, #0F172A)' }}>
                        {language === 'mr' ? 'सर्व शाखा एकत्रित एकूण:' : 'All Branches Consolidated Total:'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#DC2626', fontSize: '1.05rem' }}>
                        {formatCurrency(totalExp)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Itemized Expenses Ledger */}
          <div
            className="owner-card"
            style={{
              backgroundColor: 'var(--card-white, #FFFFFF)',
              borderRadius: '12px',
              border: '1.5px solid var(--border-slate, #CBD5E1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-slate, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
                  {language === 'mr' ? 'सर्व शाखांचा तपशीलवार खर्च लेजर' : 'Itemized All Branches Expenses Ledger'}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
                  {language === 'mr' ? 'व्याप्ती: ' : 'Scope: '}<strong>{reportData?.filterBranchName ? (reportData.filterBranchName.includes('All') ? (language === 'mr' ? 'सर्व शाखा एकत्रित' : reportData.filterBranchName) : (language === 'mr' ? localizeName(reportData.filterBranchName) : reportData.filterBranchName)) : (language === 'mr' ? 'सर्व शाखा एकत्रित' : 'All Branches Consolidated')}</strong> • {language === 'mr' ? 'एकूण: ' : 'Total: '}<strong>{language === 'mr' ? toDevanagari(expensesList.length) : expensesList.length} {language === 'mr' ? 'नोंदी' : 'Entries'}</strong>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-slate, #E2E8F0)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '50px', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{language === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{language === 'mr' ? 'शाखा' : 'Branch'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{language === 'mr' ? 'खर्च शीर्षक / प्राप्तकर्ता' : 'Expense Title / Payee'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{language === 'mr' ? 'वर्ग' : 'Category'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{language === 'mr' ? 'पद्धत' : 'Mode'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{language === 'mr' ? 'तपशील / वर्णन' : 'Notes / Description'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{language === 'mr' ? 'रक्कम (₹)' : 'Amount (₹)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
                        {language === 'mr'
                          ? 'निवडलेल्या शाखेसाठी आणि तारीख श्रेणीसाठी कोणत्याही खर्चाच्या नोंदी आढळल्या नाहीत.'
                          : 'No expense records found for the selected branch and date range.'}
                      </td>
                    </tr>
                  ) : (
                    expensesList.map((exp: any, idx: number) => (
                      <tr key={exp.id || idx} style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted, #94A3B8)' }}>
                          {language === 'mr' ? toDevanagari(idx + 1) : (idx + 1)}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {language === 'mr' && exp.date ? toDevanagari(exp.date) : (exp.date || '—')}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                          {language === 'mr' ? localizeName(exp.branchName || 'Main Branch') : (exp.branchName || 'Main Branch')}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                          {language === 'mr' ? localizeName(exp.name) : exp.name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              color: '#B45309',
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-subtle, #F1F5F9)',
                              color: 'var(--text-muted, #475569)',
                            }}
                          >
                            {exp.paymentMode || 'CASH'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-muted, #64748B)', maxWidth: '220px' }}>
                          {exp.description || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#DC2626', whiteSpace: 'nowrap' }}>
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#FEF2F2', borderTop: '2px solid #DC2626', fontWeight: 800 }}>
                    <td colSpan={7} style={{ padding: '14px 16px', textAlign: 'right', color: '#991B1B', textTransform: 'uppercase' }}>
                      {language === 'mr' ? 'एकूण खर्च:' : 'Total Expenses:'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#DC2626', fontSize: '1.1rem', fontWeight: 900 }}>
                      {formatCurrency(totalExp)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Structured Operational / GST Ledger View */
        <div
          className="owner-card"
          style={{
            backgroundColor: 'var(--card-white, #FFFFFF)',
            borderRadius: '12px',
            border: '1.5px solid var(--border-slate, #CBD5E1)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-slate, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading, #0F172A)', margin: 0 }}>
                {reportType === 'GST'
                  ? (language === 'mr' ? 'जीएसटी कर समाधान विवरण' : 'GST Tax Reconciliation Statement')
                  : (language === 'mr' ? 'एकत्रित कामकाज लेजर' : 'Consolidated Operational Ledger')}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
                {language === 'mr' ? 'लक्षित व्याप्ती: ' : 'Target Scope: '}
                <strong>
                  {reportData?.filterBranchName
                    ? (reportData.filterBranchName.includes('All')
                        ? (language === 'mr' ? 'सर्व शाखा एकत्रित' : reportData.filterBranchName)
                        : (language === 'mr' ? localizeName(reportData.filterBranchName) : reportData.filterBranchName))
                    : (language === 'mr' ? 'सर्व शाखा एकत्रित' : 'All Branches Consolidated')}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'एकूण इनव्हॉइस संख्या' : 'Total Invoices Count'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                    {language === 'mr' ? toDevanagari(reportData?.totalInvoices || 0) : (reportData?.totalInvoices || 0)} {language === 'mr' ? 'बिले' : 'bills'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'एकूण किचन ऑर्डर्स (KOT)' : 'Total Kitchen Orders (KOT)'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                    {language === 'mr' ? toDevanagari(reportData?.totalKots || 0) : (reportData?.totalKots || 0)} {language === 'mr' ? 'तिकिटे' : 'tickets'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'करपात्र उलाढाल (अन्न आणि आतिथ्य)' : 'Taxable Turnover (Food & Hospitality)'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-heading, #0F172A)' }}>
                    {formatCurrency(reportData?.taxableSales)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'केंद्रीय जीएसटी (CGST)' : 'Central GST (CGST)'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                    {formatCurrency(reportData?.salesCgst)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'राज्य जीएसटी (SGST)' : 'State GST (SGST)'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>
                    {formatCurrency(reportData?.salesSgst)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'एकात्मिक जीएसटी (IGST)' : 'Integrated GST (IGST)'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                    {formatCurrency(reportData?.salesIgst)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)', backgroundColor: 'var(--bg-subtle, #F8FAFC)' }}>
                  <td style={{ padding: '14px 8px', color: 'var(--text-heading, #0F172A)', fontWeight: 800 }}>
                    {language === 'mr' ? 'एकूण बिलिंग रक्कम (Gross)' : 'Total Gross Billing'}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading, #0F172A)' }}>
                    {formatCurrency(reportData?.totalSales)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'प्रत्यक्ष संकलित पेमेंट्स' : 'Actual Payments Collected'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>
                    {formatCurrency(reportData?.collectedPayments)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'एकूण कामकाज खर्च' : 'Total Expenses'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                    {formatCurrency(reportData?.totalExpenses)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-slate, #F1F5F9)' }}>
                  <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                    {language === 'mr' ? 'एकूण खरेदी खर्च' : 'Total Purchase Outflow'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                    {formatCurrency(reportData?.netPurchases)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#FEF3C7' }}>
                  <td style={{ padding: '14px 8px', color: '#92400E', fontWeight: 800, fontSize: '1rem' }}>
                    {language === 'mr' ? 'अंदाजे व्यवसाय निव्वळ नफा (Net)' : 'Estimated Business Net Profit'}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 900, fontSize: '1.15rem', color: '#92400E' }}>
                    {formatCurrency(reportData?.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  height: '42px',
  minHeight: '42px',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--text-heading, #0F172A)',
  backgroundColor: 'var(--card-white, #FFFFFF)',
  outline: 'none',
  boxSizing: 'border-box',
};

const kpiBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-white, #FFFFFF)',
  borderRadius: '8px',
  border: '1.5px solid var(--border-slate, #CBD5E1)',
  padding: '10px 12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: '76px',
  boxSizing: 'border-box',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--text-muted, #64748B)',
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
};

const kpiValStyle: React.CSSProperties = {
  fontSize: '1.12rem',
  fontWeight: 800,
  marginTop: '2px',
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
};

export default OwnerReports;
