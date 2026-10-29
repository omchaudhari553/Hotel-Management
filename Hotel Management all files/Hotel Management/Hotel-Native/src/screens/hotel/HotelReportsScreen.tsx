import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Header } from '../../components/Header';
import { KPICard } from '../../components/KPICard';
import { reportService, DailyReportRow } from '../../api/reportService';
import { KPIStats } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { downloadAndShareCsv, downloadAndSharePdf } from '../../utils/reportExporter';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Layers,
  Calendar,
  Share2,
  FileSpreadsheet,
  FileText,
  Users,
  ChevronRight,
  Award,
  CheckCircle2,
  Download,
} from 'lucide-react-native';

export const HotelReportsScreen: React.FC<{ navigation?: any; hideHeader?: boolean }> = ({
  navigation,
  hideHeader = false,
}) => {
  const { t, toDevanagari } = useLanguage();
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY' | 'GST' | 'STAFF_MONTHLY'>('OVERVIEW');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const [kpi, rows] = await Promise.all([
      reportService.getKPIOverview(),
      reportService.getRecentDaysReport(),
    ]);
    setStats(kpi);
    setDailyRows(rows);
  };

  const handleExportCsv = async () => {
    let csv = `Hotel Analytics & Financial Audit Report\n`;
    csv += `Hotel Name: Royal Palace Hotel\n`;
    csv += `Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
    csv += `KPI SUMMARY\n`;
    csv += `Metric,Amount (₹)\n`;
    csv += `Total Sales,${stats?.totalSales || 56218}\n`;
    csv += `Total Expenses,${stats?.totalExpenses || 18450}\n`;
    csv += `Net Profit,${stats?.netAmount || 37768}\n`;
    csv += `GST Output Tax,${stats?.taxAmount || 2680}\n`;
    csv += `Amount Received,${stats?.amountReceived || 51900}\n`;
    csv += `Pending Udhar,${stats?.pendingAmount || 4318}\n\n`;
    csv += `LAST 5 DAYS AUDIT\n`;
    csv += `Date,Sales,Expenses,Net Profit\n`;
    dailyRows.forEach((r) => {
      csv += `"${r.date}",${r.sales},${r.expenses},${r.net}\n`;
    });
    csv += `\nGST BREAKDOWN\n`;
    csv += `Taxable Sales,53600.00\n`;
    csv += `CGST (2.5%),1340.00\n`;
    csv += `SGST (2.5%),1340.00\n`;
    csv += `Input Tax Credit (ITC),1540.00\n`;
    csv += `Net GST Payable,1140.00\n`;

    await downloadAndShareCsv(`Hotel_Reports_Audit_${Date.now()}.csv`, csv);
  };

  const handleExportPdf = async () => {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Hotel Management Analytics Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1E293B; }
          .header { border-bottom: 2px solid #1E40AF; padding-bottom: 10px; margin-bottom: 16px; }
          .title { font-size: 22px; font-weight: 900; color: #1E3A8A; }
          .sub { font-size: 12px; color: #64748B; margin-top: 2px; }
          .grid { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
          .card { flex: 1; min-width: 140px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; }
          .card-lbl { font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; }
          .card-val { font-size: 18px; font-weight: 900; color: #0F172A; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #1E40AF; color: #FFF; text-align: left; padding: 8px; }
          td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Royal Palace Hotel</div>
          <div class="sub">Financial & GST Audit Summary • ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div class="grid">
          <div class="card"><div class="card-lbl">Total Sales</div><div class="card-val">₹ ${(stats?.totalSales || 56218).toLocaleString('en-IN')}</div></div>
          <div class="card"><div class="card-lbl">Total Expenses</div><div class="card-val" style="color: #DC2626;">₹ ${(stats?.totalExpenses || 18450).toLocaleString('en-IN')}</div></div>
          <div class="card"><div class="card-lbl">Net Profit</div><div class="card-val" style="color: #16A34A;">₹ ${(stats?.netAmount || 37768).toLocaleString('en-IN')}</div></div>
          <div class="card"><div class="card-lbl">GST Output Tax</div><div class="card-val" style="color: #D97706;">₹ ${(stats?.taxAmount || 2680).toLocaleString('en-IN')}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th style="text-align: right;">Sales (₹)</th><th style="text-align: right;">Expenses (₹)</th><th style="text-align: right;">Net Profit (₹)</th></tr>
          </thead>
          <tbody>
            ${dailyRows.map(r => `<tr><td>${r.date}</td><td style="text-align: right;">₹ ${r.sales.toLocaleString('en-IN')}</td><td style="text-align: right; color: #DC2626;">₹ ${r.expenses.toLocaleString('en-IN')}</td><td style="text-align: right; font-weight: 700; color: #16A34A;">₹ ${r.net.toLocaleString('en-IN')}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94A3B8;">
          Generated by Ajalkar POS Hotel Management System
        </div>
      </body>
    </html>`;
    await downloadAndSharePdf(`Hotel_Report_${Date.now()}`, html);
  };

  return (
    <View style={[styles.container, hideHeader && { backgroundColor: 'transparent' }]}>
      <ScrollView contentContainerStyle={[styles.content, Platform.OS === 'web' && styles.webContent]}>
        {!hideHeader && (
          <Header
            title={t('reportsAnalytics', 'Reports & Analytics')}
            subtitle={t('salesExpensesGstStaffSubtitle', 'Sales, Expenses, GST & Staff Monthly Reports')}
            rightAction={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv} activeOpacity={0.8}>
                  <FileSpreadsheet size={14} color="#FFFFFF" />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#1E40AF' }]} onPress={handleExportPdf} activeOpacity={0.8}>
                  <Download size={14} color="#FFFFFF" />
                  <Text style={styles.exportBtnText}>PDF</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
            onPress={() => setActiveTab('OVERVIEW')}
          >
            <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>
              {t('overview', 'Overview')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'DAILY' && styles.tabItemActive]}
            onPress={() => setActiveTab('DAILY')}
          >
            <Text style={[styles.tabText, activeTab === 'DAILY' && styles.tabTextActive]}>
              {t('daily', 'Daily')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'GST' && styles.tabItemActive]}
            onPress={() => setActiveTab('GST')}
          >
            <Text style={[styles.tabText, activeTab === 'GST' && styles.tabTextActive]}>
              {t('gstAudit', 'GST Audit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'STAFF_MONTHLY' && styles.tabItemActive]}
            onPress={() => setActiveTab('STAFF_MONTHLY')}
          >
            <Text style={[styles.tabText, activeTab === 'STAFF_MONTHLY' && styles.tabTextActive]}>
              {t('staffMonthly', 'Staff Monthly')}
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'OVERVIEW' && (
          <View>
            <KPICard
              label={t('totalSales', 'Total Sales')}
              amount={stats?.totalSales || 56218.00}
              icon={<TrendingUp size={20} color={Colors.primary} />}
              subtitle={t('allDiningInvoices', 'All dining + room service + takeaway invoices')}
              color={Colors.primary}
            />

            <KPICard
              label={t('totalExpenses', 'Total Expenses')}
              amount={stats?.totalExpenses || 18450.00}
              icon={<Receipt size={20} color="#DC2626" />}
              subtitle={t('suppliersPayout', 'Suppliers, grocery, dairy & operational payout')}
              color="#DC2626"
            />

            <KPICard
              label={t('netAmountProfit', 'Net Amount (Profit)')}
              amount={stats?.netAmount || 37768.00}
              icon={<DollarSign size={20} color="#16A34A" />}
              subtitle={t('calculatedNetProfit', 'Calculated as (Total Sales - Total Expenses)')}
              color="#16A34A"
            />

            <KPICard
              label={t('gstCollected', 'GST Collected')}
              amount={stats?.taxAmount || 2680.00}
              icon={<Layers size={20} color="#D97706" />}
              subtitle={t('forwardChargeTax', 'Forward charge tax liability to be paid to government')}
              color="#D97706"
            />

            <KPICard
              label={t('amountReceived', 'Amount Received')}
              amount={stats?.amountReceived || 51900.00}
              icon={<TrendingUp size={20} color="#059669" />}
              subtitle={t('cashUpiCardReceipts', 'Cash + UPI + Card receipts recorded')}
              color="#059669"
            />

            <KPICard
              label={t('pendingUdharCredit', 'Pending Udhar / Credit')}
              amount={stats?.pendingAmount || 4318.00}
              icon={<Receipt size={20} color="#EA580C" />}
              subtitle={t('receivablesOutstanding', 'Receivables outstanding from guests')}
              color="#EA580C"
            />
          </View>
        )}

        {activeTab === 'DAILY' && (
          <View style={styles.tableCard}>
            <Text style={styles.tableCardHeading}>{t('last5DaysAudit', 'Last 5 Days Sales & Tax Audit')}</Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 1.5 }]}>{t('date', 'Date')}</Text>
              <Text style={styles.thCell}>{t('sales', 'Sales')}</Text>
              <Text style={styles.thCell}>{t('expenses', 'Expenses')}</Text>
              <Text style={styles.thCell}>{t('net', 'Net')}</Text>
            </View>

            {dailyRows.map((row, index) => (
              <View key={index} style={styles.tableBodyRow}>
                <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '700' }]}>{toDevanagari(row.date)}</Text>
                <Text style={[styles.tdCell, { color: Colors.primary, fontWeight: '700' }]}>
                  ₹ {toDevanagari(row.sales.toLocaleString('en-IN'))}
                </Text>
                <Text style={[styles.tdCell, { color: '#DC2626' }]}>
                  ₹ {toDevanagari(row.expenses.toLocaleString('en-IN'))}
                </Text>
                <Text style={[styles.tdCell, { color: '#16A34A', fontWeight: '800' }]}>
                  ₹ {toDevanagari(row.net.toLocaleString('en-IN'))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'GST' && (
          <View style={styles.tableCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.tableCardHeading}>{t('gstForwardChargeAudit', 'GST Forward Charge Audit')}</Text>
              <View style={[styles.paidBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>GSTR-3B READY</Text>
              </View>
            </View>
            <Text style={styles.tableCardSub}>GSTIN: 27AAKCA1234F1Z5 • Regular 5% Hospitality Slab</Text>

            <View style={styles.gstSummaryRow}>
              <Text style={styles.gstLabel}>Taxable Turnover (Sales)</Text>
              <Text style={styles.gstValue}>₹ {toDevanagari('53,600.00')}</Text>
            </View>

            <View style={styles.gstSummaryRow}>
              <Text style={styles.gstLabel}>{t('cgstCollected', 'CGST Collected (2.5%)')}</Text>
              <Text style={styles.gstValue}>₹ {toDevanagari('1,340.00')}</Text>
            </View>

            <View style={styles.gstSummaryRow}>
              <Text style={styles.gstLabel}>{t('sgstCollected', 'SGST Collected (2.5%)')}</Text>
              <Text style={styles.gstValue}>₹ {toDevanagari('1,340.00')}</Text>
            </View>

            <View style={styles.gstSummaryRow}>
              <Text style={[styles.gstLabel, { fontWeight: '700' }]}>{t('totalGstLiability', 'Total Output GST')}</Text>
              <Text style={[styles.gstValue, { fontWeight: '800', color: '#D97706' }]}>
                ₹ {toDevanagari('2,680.00')}
              </Text>
            </View>

            <View style={styles.gstDivider} />

            <View style={styles.gstSummaryRow}>
              <Text style={styles.gstLabel}>Input Tax Credit (ITC on Purchases)</Text>
              <Text style={[styles.gstValue, { color: '#16A34A' }]}>(-) ₹ {toDevanagari('1,540.00')}</Text>
            </View>

            <View style={styles.gstDivider} />

            <View style={[styles.gstSummaryRow, { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6 }]}>
              <Text style={[styles.gstLabel, { fontWeight: '900', color: '#0F172A', fontSize: 14 }]}>
                Net GST Payable
              </Text>
              <Text style={[styles.gstValue, { fontWeight: '900', color: Colors.primary, fontSize: 15 }]}>
                ₹ {toDevanagari('1,140.00')}
              </Text>
            </View>
          </View>
        )}

        {/* STAFF MONTHLY REPORT TAB */}
        {activeTab === 'STAFF_MONTHLY' && (
          <View>
            <View style={styles.staffMonthlyHeaderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.staffMonthlyTitle}>{t('monthlyStaffPayrollSummary', 'Monthly Staff & Payroll Summary')}</Text>
                </View>
                <View style={styles.staffIconCircle}>
                  <Users size={22} color="#4F46E5" />
                </View>
              </View>

              {/* Quick Metrics Strip */}
              <View style={styles.staffMetricsStrip}>
                <View style={styles.staffMetricItem}>
                  <Text style={styles.staffMetricNum}>{toDevanagari('92.8%')}</Text>
                  <Text style={styles.staffMetricLabel}>{t('avgAttendance', 'Avg Attendance')}</Text>
                </View>
                <View style={styles.staffMetricDivider} />

                <View style={styles.staffMetricItem}>
                  <Text style={[styles.staffMetricNum, { color: '#16A34A' }]}>{toDevanagari(182)}</Text>
                  <Text style={styles.staffMetricLabel}>{t('monthlyPresentDays', 'Present Days')}</Text>
                </View>
                <View style={styles.staffMetricDivider} />

                <View style={styles.staffMetricItem}>
                  <Text style={[styles.staffMetricNum, { color: '#DC2626' }]}>{toDevanagari(8)}</Text>
                  <Text style={styles.staffMetricLabel}>{t('absences', 'Absences')}</Text>
                </View>
                <View style={styles.staffMetricDivider} />

                <View style={styles.staffMetricItem}>
                  <Text style={[styles.staffMetricNum, { color: '#D97706' }]}>₹ {toDevanagari('1,48,500')}</Text>
                  <Text style={styles.staffMetricLabel}>{t('netPayroll', 'Net Payroll')}</Text>
                </View>
              </View>
            </View>

            {/* Department Breakdown */}
            <View style={styles.tableCard}>
              <Text style={styles.tableCardHeading}>{t('deptPayrollDistribution', 'Department-Wise Payroll Distribution')}</Text>

              <View style={styles.deptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{t('kitchenStaffChefsHelpers', 'Kitchen Staff (Chefs & Helpers)')}</Text>
                  <Text style={styles.deptSub}>{toDevanagari(2)} {t('members', 'Members')} • {toDevanagari('95%')} {t('attendance', 'Attendance')}</Text>
                </View>
                <Text style={styles.deptAmount}>₹ {toDevanagari('58,000')}</Text>
              </View>

              <View style={styles.deptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{t('serviceTeamWaiters', 'Service Team (Captains & Waiters)')}</Text>
                  <Text style={styles.deptSub}>{toDevanagari(3)} {t('members', 'Members')} • {toDevanagari('91%')} {t('attendance', 'Attendance')}</Text>
                </View>
                <Text style={styles.deptAmount}>₹ {toDevanagari('46,000')}</Text>
              </View>

              <View style={styles.deptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{t('frontOfficeCashier', 'Front Office & Cashier')}</Text>
                  <Text style={styles.deptSub}>{toDevanagari(1)} {t('members', 'Member')} • {toDevanagari('96%')} {t('attendance', 'Attendance')}</Text>
                </View>
                <Text style={styles.deptAmount}>₹ {toDevanagari('16,000')}</Text>
              </View>

              <View style={[styles.deptRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptName}>{t('managementOperations', 'Management & Operations')}</Text>
                  <Text style={styles.deptSub}>{toDevanagari(1)} {t('members', 'Member')} • {toDevanagari('98%')} {t('attendance', 'Attendance')}</Text>
                </View>
                <Text style={styles.deptAmount}>₹ {toDevanagari('28,000')}</Text>
              </View>

              {/* Action to Jump to Staff Module */}
              <TouchableOpacity
                style={styles.openStaffModuleBtn}
                onPress={() => navigation?.navigate('Staff')}
                activeOpacity={0.8}
              >
                <Text style={styles.openStaffModuleBtnText}>
                  {t('openFullStaffRoster', 'Open Full Staff Roster & 31-Day Matrix')} →
                </Text>
                <ChevronRight size={16} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  webContent: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tableCardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  tableCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  thCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tdCell: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
  },
  gstSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  gstLabel: {
    fontSize: 13,
    color: '#475569',
  },
  gstValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  gstDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  staffMonthlyHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  staffMonthlyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  staffMonthlySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  staffIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffMetricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffMetricItem: {
    alignItems: 'center',
  },
  staffMetricNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  staffMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  staffMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  deptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deptName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  deptSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deptAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
  },
  openStaffModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  openStaffModuleBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },
});
