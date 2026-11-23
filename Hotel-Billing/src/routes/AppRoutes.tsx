import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../auth/LoginPage';
import { SignupPage } from '../auth/SignupPage';
import { GetStartedPage } from '../onboarding/GetStartedPage';
import { IndustryGuard, SharedModuleGuard } from './IndustryGuard';

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
  const [enabled, setEnabled] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('platform_hotel_modules_status');
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      if (moduleCode === 'HOTEL_OVERVIEW') {
        return parsed['HOTEL_OVERVIEW'] !== false && parsed['HOTEL_DASHBOARD'] !== false;
      }
      if (moduleCode === 'HOTEL_SETTINGS') {
        return parsed['HOTEL_SETTINGS'] !== false && parsed['HOTEL_REPORTS'] !== false;
      }
      return parsed[moduleCode] !== false;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    const handleSync = () => {
      try {
        const raw = localStorage.getItem('platform_hotel_modules_status');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (moduleCode === 'HOTEL_OVERVIEW') {
            setEnabled(parsed['HOTEL_OVERVIEW'] !== false && parsed['HOTEL_DASHBOARD'] !== false);
          } else if (moduleCode === 'HOTEL_SETTINGS') {
            setEnabled(parsed['HOTEL_SETTINGS'] !== false && parsed['HOTEL_REPORTS'] !== false);
          } else {
            setEnabled(parsed[moduleCode] !== false);
          }
        }
      } catch {}
    };
    window.addEventListener('platform-modules-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('platform-modules-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [moduleCode]);

  if (!enabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '24px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '26px' }}>
          🔒
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Module Disabled by Platform Admin</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '420px', lineHeight: 1.5, marginBottom: '20px' }}>
          This feature module ({moduleCode}) has been disabled from the Central Super Admin Panel. Contact your platform administrator to re-enable access.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = '/hotel/dashboard'; }}
          style={{ padding: '8px 20px', backgroundColor: '#4F46E5', color: '#FFFFFF', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
        >
          Return to Hotel Dashboard
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
        <Route path="staff" element={<OwnerStaff />} />
        <Route path="reports" element={<OwnerReports />} />
        <Route path="billing-performance" element={<OwnerBillingPerformance />} />
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
              <HotelModuleRoute moduleCode="HOTEL_REPORTS">
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
              <PurchaseDashboard />
            </SharedModuleGuard>
          }
        />

        <Route
          path="/purchases"
          element={
            <SharedModuleGuard>
              <PurchaseDashboard />
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