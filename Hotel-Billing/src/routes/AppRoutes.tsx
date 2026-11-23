import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../auth/LoginPage';
import { SignupPage } from '../auth/SignupPage';
import { GetStartedPage } from '../onboarding/GetStartedPage';
import { IndustryGuard, SharedModuleGuard } from './IndustryGuard';
import { industryService } from '../services/industryService';

// Hotel Module
import { HotelDashboard } from '../hotel/HotelDashboard';
import { RoomManagement } from '../hotel/RoomManagement';
import { BookingManagement } from '../hotel/BookingManagement';
import { GuestDirectory } from '../hotel/GuestDirectory';
import HotelReport from '../hotel/hotelreport';
import { PurchaseDashboard } from "../hotel/PurchaseDashboard.jsx";
import Settings from "../hotel/Settings.jsx";
import GstReportComponent from "../hotel/GstReportComponent";
import StaffManagement from '../hotel/StaffManagement';
import { KOTModule } from '../hotel/KOTModule';
// Mess Module
import { MessDashboard } from '../mess/MessDashboard';
import { MealPlans } from '../mess/MealPlans';
import { TiffinDispatch } from '../mess/TiffinDispatch';
import { WeeklyMenu } from '../mess/WeeklyMenu';

import HotelBilling from "../hotel/hotelbilling";
import HotelPayment from "../hotel/hotelpayment";

// Cafe Module
import { CafeDashboard } from '../cafe/CafeDashboard';
import { TableLayout } from '../cafe/TableLayout';
import { LivePOS } from '../cafe/LivePOS';
import CafeMenuManagement from '../cafe/CafeMenuManagement';

import ReportsManagement from "../cafe/ReportsManagement";
import NewOrder from "../cafe/NewOrder";
import OrderHistory from "../cafe/OrderHistory";

// Shared Business Hub Modules
import { BillingModule } from '../billing/BillingModule';
import { InventoryModule } from '../inventory/InventoryModule';
import { CustomerModule } from '../customers/CustomerModule';
import { SupplierModule } from '../suppliers/SupplierModule';
import { PaymentModule } from '../payments/PaymentModule';
import { ReportsModule } from '../reports/ReportsModule';
import { PricingPlansModule } from '../plans/PricingPlansModule';
import SettingsModule from "../Settings/SettingsModule";

// Delivery Module has been completely removed as per requirements
import { Tables } from '../hotel/Tables';

// Owner Admin Panel Modules (Strictly Separate from Branch UI)
import { OwnerGuard } from '../owner/OwnerGuard';
import { OwnerLayout } from '../owner/OwnerLayout';
import { OwnerDashboard } from '../owner/OwnerDashboard';
import { OwnerBranches } from '../owner/OwnerBranches';
import { OwnerBranchCreate } from '../owner/OwnerBranchCreate';
import { OwnerSales } from '../owner/OwnerSales';
import { OwnerProfitAnalysis } from '../owner/OwnerProfitAnalysis';
import { OwnerStaff } from '../owner/OwnerStaff';
import { OwnerReports } from '../owner/OwnerReports';
import { OwnerBillingPerformance } from '../owner/OwnerBillingPerformance';
import { OwnerSettings } from '../owner/OwnerSettings';
import { HotelSubscriptionDashboard } from '../hotel/HotelSubscriptionDashboard';

// Centralized Super Admin Panel Imports
import { SuperAdminGuard } from '../superadmin/SuperAdminGuard';
import { SuperAdminLayout } from '../superadmin/SuperAdminLayout';
import { SuperAdminLogin } from '../superadmin/SuperAdminLogin';
import { SuperAdminDashboardPage } from '../superadmin/pages/SuperAdminDashboardPage';
import { BusinessManagementPage } from '../superadmin/pages/BusinessManagementPage';
import { BranchManagementPage } from '../superadmin/pages/BranchManagementPage';
import { ProductManagementPage } from '../superadmin/pages/ProductManagementPage';
import { SubscriptionManagementPage } from '../superadmin/pages/SubscriptionManagementPage';
import { SubscriptionPlansPage } from '../superadmin/pages/SubscriptionPlansPage';
import { FreeTrialManagementPage } from '../superadmin/pages/FreeTrialManagementPage';
import { PaymentManagementPage } from '../superadmin/pages/PaymentManagementPage';
import { InvoiceManagementPage } from '../superadmin/pages/InvoiceManagementPage';
import { UserRoleManagementPage } from '../superadmin/pages/UserRoleManagementPage';
import { ProductModuleManagementPage } from '../superadmin/pages/ProductModuleManagementPage';
import { BranchSalesPage } from '../superadmin/pages/BranchSalesPage';
import { ProfitAnalysisPage } from '../superadmin/pages/ProfitAnalysisPage';
import { ReportsAnalyticsPage } from '../superadmin/pages/ReportsAnalyticsPage';
import { SupportManagementPage } from '../superadmin/pages/SupportManagementPage';
import { NotificationsPage } from '../superadmin/pages/NotificationsPage';
import { AuditLogsPage } from '../superadmin/pages/AuditLogsPage';
import { SettingsPage } from '../superadmin/pages/SettingsPage';

const DynamicRootRedirect: React.FC = () => {
  return <Navigate to="/choose-industry" replace />;
};

const HotelModuleRoute: React.FC<{ moduleCode: string; children: React.ReactNode }> = ({ moduleCode, children }) => {
  const checkEnabled = (code: string) => {
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      if (code === 'HOTEL_OVERVIEW') {
        return parsed['HOTEL_OVERVIEW'] !== false && parsed['HOTEL_DASHBOARD'] !== false;
      }
      if (code === 'HOTEL_SETTINGS') {
        return parsed['HOTEL_SETTINGS'] !== false && parsed['HOTEL_REPORTS'] !== false && parsed['REPORTS'] !== false;
      }
      if (code === 'HOTEL_KOT') {
        return parsed['HOTEL_KOT'] !== false && parsed['KOT'] !== false;
      }
      if (code === 'HOTEL_BILLING') {
        return parsed['HOTEL_BILLING'] !== false && parsed['POS_BILLING'] !== false;
      }
      if (code === 'HOTEL_TABLES') {
        return parsed['HOTEL_TABLES'] !== false && parsed['TABLE_MGMT'] !== false;
      }
      if (code === 'HOTEL_PAYMENTS') {
        return parsed['HOTEL_PAYMENTS'] !== false;
      }
      if (code === 'HOTEL_PURCHASE') {
        return parsed['HOTEL_PURCHASE'] !== false && parsed['PURCHASE'] !== false && parsed['INVENTORY'] !== false;
      }
      if (code === 'HOTEL_STAFF') {
        return parsed['HOTEL_STAFF'] !== false && parsed['STAFF_PAYROLL'] !== false;
      }
      return parsed[code] !== false;
    } catch {
      return true;
    }
  };

  const [enabled, setEnabled] = React.useState<boolean>(() => checkEnabled(moduleCode));

  React.useEffect(() => {
    const handleSync = () => {
      setEnabled(checkEnabled(moduleCode));
    };

    industryService.getModuleStatuses().then((st) => {
      if (st && Object.keys(st).length > 0) {
        handleSync();
      }
    }).catch(() => {});

    window.addEventListener('platform-modules-updated', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(() => {
      handleSync();
      industryService.getModuleStatuses().then((st) => {
        if (st && Object.keys(st).length > 0) {
          handleSync();
        }
      }).catch(() => {});
    }, 2000);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('hotel_platform_modules');
      bc.onmessage = () => {
        handleSync();
      };
    } catch { }

    return () => {
      clearInterval(interval);
      window.removeEventListener('platform-modules-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      if (bc) {
        try { bc.close(); } catch { }
      }
    };
  }, [moduleCode]);

  if (!enabled) {
  const isOverview = moduleCode === 'HOTEL_OVERVIEW';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center', padding: '32px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '28px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        🔒
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
        हा विभाग सेंट्रल सुपर ॲडमिन कडून डिसेबल (Disabled) केला आहे
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '440px', lineHeight: 1.6, marginBottom: '22px' }}>
        This operational module has been disabled from Product Management in the Central Super Admin Panel. Please contact the platform super administrator to re-enable it.
      </p>
      <button
        type="button"
        onClick={() => { window.location.href = isOverview ? '/choose-industry' : '/hotel/dashboard'; }}
        style={{ padding: '10px 24px', backgroundColor: '#4F46E5', color: '#FFFFFF', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
      >
        {isOverview ? 'उद्योग निवडा (Choose Industry)' : 'हॉटेल डॅशबोर्डवर परत जा (Hotel Dashboard)'}
      </button>
    </div>
  );
}

return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Super Admin Login */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />

      {/* ================= CENTRALIZED SUPER ADMIN PANEL (18 Modules) ================= */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminGuard>
            <SuperAdminLayout />
          </SuperAdminGuard>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="businesses" element={<BusinessManagementPage />} />
        <Route path="branches" element={<BranchManagementPage />} />
        <Route path="products" element={<ProductManagementPage />} />
        <Route path="subscriptions" element={<SubscriptionManagementPage />} />
        <Route path="plans" element={<SubscriptionPlansPage />} />
        <Route path="trials" element={<FreeTrialManagementPage />} />
        <Route path="payments" element={<PaymentManagementPage />} />
        <Route path="invoices" element={<InvoiceManagementPage />} />
        <Route path="users" element={<UserRoleManagementPage />} />
        <Route path="modules" element={<ProductModuleManagementPage />} />
        <Route path="branch-sales" element={<BranchSalesPage />} />
        <Route path="profit-analysis" element={<ProfitAnalysisPage />} />
        <Route path="reports" element={<ReportsAnalyticsPage />} />
        <Route path="support" element={<SupportManagementPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
      </Route>

      <Route path="/owner/login" element={<Navigate to="/login" replace />} />

      {/* ================= OWNER ADMIN PANEL (Completely Separate & Isolated) ================= */}
      <Route
        path="/owner"
        element={
          <OwnerGuard>
            <OwnerLayout />
          </OwnerGuard>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="branches" element={<OwnerBranches />} />
        <Route path="branches/create" element={<OwnerBranchCreate />} />
        <Route path="sales" element={<OwnerSales />} />
        <Route path="profit-analysis" element={<OwnerProfitAnalysis />} />
        <Route path="staff" element={<HotelModuleRoute moduleCode="HOTEL_STAFF"><OwnerStaff /></HotelModuleRoute>} />
        <Route path="reports" element={<HotelModuleRoute moduleCode="HOTEL_SETTINGS"><OwnerReports /></HotelModuleRoute>} />
        <Route path="billing-performance" element={<HotelModuleRoute moduleCode="HOTEL_BILLING"><OwnerBillingPerformance /></HotelModuleRoute>} />
        <Route path="settings" element={<OwnerSettings />} />
        <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
      </Route>

      {/* Authenticated Onboarding & Industry Selection Routes */}
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/welcome" element={<GetStartedPage />} />
      <Route path="/choose-industry" element={<GetStartedPage />} />
      <Route path="/select-industry" element={<GetStartedPage />} />
      <Route path="/business-setup" element={<GetStartedPage />} />
      <Route path="/plan-selection" element={<GetStartedPage />} />
      <Route path="/confirmation" element={<GetStartedPage />} />

      {/* Application Protected Layout */}
      <Route element={<MainLayout />}>

        {/* ================= HOTEL MODULE (Strictly Isolated) ================= */}

        <Route
          path="/hotel/dashboard"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_OVERVIEW">
                <HotelDashboard />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/subscription"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelSubscriptionDashboard />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/rooms"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <RoomManagement />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/bookings"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <BookingManagement />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/guests"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <GuestDirectory />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/plans"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <PricingPlansModule />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotelreport"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_SETTINGS">
                <HotelReport />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/staff"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_STAFF">
                <StaffManagement />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        <Route
          path="/staff"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_STAFF">
                <StaffManagement />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/kot"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_KOT">
                <KOTModule />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/kot"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_KOT">
                <KOTModule />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/purchasedashboard"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_PURCHASE">
                <PurchaseDashboard />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/Tables"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_TABLES">
                <Tables />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/tables"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_TABLES">
                <Tables />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/orders"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <OrderHistory />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/settings"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_SETTINGS">
                <Settings />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/Settings"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_SETTINGS">
                <Settings />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/settings/gst"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_SETTINGS">
                <GstReportComponent />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        {/* HOTEL BILLING */}

        <Route
          path="/hotelbilling"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_BILLING">
                <HotelBilling />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/billing"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_BILLING">
                <HotelBilling />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/invoices"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_BILLING">
                <HotelBilling />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/billing/invoices"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_BILLING">
                <HotelBilling />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        {/* HOTEL PAYMENT */}

        <Route
          path="/hotelpayment"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_PAYMENTS">
                <HotelPayment />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/payment"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_PAYMENTS">
                <HotelPayment />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/payments"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelModuleRoute moduleCode="HOTEL_PAYMENTS">
                <HotelPayment />
              </HotelModuleRoute>
            </IndustryGuard>
          }
        />

        {/* ================= MESS MODULE (Strictly Isolated) ================= */}

        <Route
          path="/mess/dashboard"
          element={
            <IndustryGuard requiredIndustry="MESS">
              <MessDashboard />
            </IndustryGuard>
          }
        />

        <Route
          path="/mess/plans"
          element={
            <IndustryGuard requiredIndustry="MESS">
              <MealPlans />
            </IndustryGuard>
          }
        />

        <Route
          path="/mess/attendance"
          element={<Navigate to="/mess/dashboard" replace />}
        />

        <Route
          path="/mess/tiffin"
          element={
            <IndustryGuard requiredIndustry="MESS">
              <TiffinDispatch />
            </IndustryGuard>
          }
        />

        <Route
          path="/mess/menu"
          element={
            <IndustryGuard requiredIndustry="MESS">
              <WeeklyMenu />
            </IndustryGuard>
          }
        />

        <Route
          path="/mess/plans-pricing"
          element={
            <IndustryGuard requiredIndustry="MESS">
              <PricingPlansModule />
            </IndustryGuard>
          }
        />

        {/* ================= CAFE MODULE (Strictly Isolated) ================= */}

        <Route
          path="/cafe/dashboard"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <CafeDashboard />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/tables"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <TableLayout />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/pos"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <LivePOS />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/menu"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <CafeMenuManagement />
            </IndustryGuard>
          }
        />



        <Route
          path="/cafe/reports"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <ReportsManagement />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/plans"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <PricingPlansModule />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/new-order"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <NewOrder />
            </IndustryGuard>
          }
        />

        <Route
          path="/cafe/order-history"
          element={
            <IndustryGuard requiredIndustry="CAFE">
              <OrderHistory />
            </IndustryGuard>
          }
        />

        {/* ================= SHARED CORE MODULES ================= */}

        <Route
          path="/billing"
          element={
            <SharedModuleGuard>
              <BillingModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/inventory"
          element={
            <SharedModuleGuard>
              <InventoryModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/purchase"
          element={
            <SharedModuleGuard>
              <HotelModuleRoute moduleCode="HOTEL_PURCHASE">
                <PurchaseDashboard />
              </HotelModuleRoute>
            </SharedModuleGuard>
          }
        />

        <Route
          path="/purchases"
          element={
            <SharedModuleGuard>
              <HotelModuleRoute moduleCode="HOTEL_PURCHASE">
                <PurchaseDashboard />
              </HotelModuleRoute>
            </SharedModuleGuard>
          }
        />

        <Route
          path="/customers"
          element={
            <SharedModuleGuard>
              <CustomerModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/suppliers"
          element={
            <SharedModuleGuard>
              <SupplierModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/payments"
          element={
            <SharedModuleGuard>
              <PaymentModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/reports"
          element={
            <SharedModuleGuard>
              <ReportsModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/plans"
          element={
            <SharedModuleGuard>
              <PricingPlansModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/settings"
          element={
            <SharedModuleGuard>
              <SettingsModule />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/settings/gst"
          element={
            <SharedModuleGuard>
              <GstReportComponent />
            </SharedModuleGuard>
          }
        />

        {/* BRANCHES MODULE REMOVED - SAFE REDIRECT TO HOTEL DASHBOARD */}
        <Route
          path="/branches"
          element={<Navigate to="/hotel/dashboard" replace />}
        />

        {/* DELIVERY MODULE REMOVED - SAFE REDIRECT TO DASHBOARD */}
        <Route
          path="/delivery"
          element={<Navigate to="/hotel/dashboard" replace />}
        />

        {/* Fallbacks */}

        <Route
          path="/hotel"
          element={<Navigate to="/hotel/dashboard" replace />}
        />

        <Route
          path="/mess"
          element={<Navigate to="/mess/dashboard" replace />}
        />

        <Route
          path="/cafe"
          element={<Navigate to="/cafe/dashboard" replace />}
        />

      </Route>

      {/* Root & Catch-all */}

      <Route
        path="/"
        element={<DynamicRootRedirect />}
      />

      <Route
        path="*"
        element={<DynamicRootRedirect />}
      />

    </Routes>
  );
};