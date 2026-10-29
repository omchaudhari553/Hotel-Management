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
import Settings from "../hotel/Settings";
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
import BranchesModule from "../Branches/BranchesModule";

// Delivery Module has been completely removed as per requirements
import { Tables } from '../hotel/Tables';

const DynamicRootRedirect: React.FC = () => {
  return <Navigate to="/choose-industry" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
              <HotelDashboard />
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
              <HotelReport />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/staff"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <StaffManagement />
            </IndustryGuard>
          }
        />

        <Route
          path="/staff"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <StaffManagement />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/kot"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <KOTModule />
            </IndustryGuard>
          }
        />
        <Route
          path="/kot"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <KOTModule />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/purchasedashboard"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <PurchaseDashboard />
            </IndustryGuard>
          }
        />

        <Route
          path="/hotel/Tables"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <Tables />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/tables"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <Tables />
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
              <Settings />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/Settings"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <Settings />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/settings/gst"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <GstReportComponent />
            </IndustryGuard>
          }
        />

        {/* HOTEL BILLING */}

        <Route
          path="/hotelbilling"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelBilling />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/billing"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelBilling />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/invoices"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelBilling />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/billing/invoices"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelBilling />
            </IndustryGuard>
          }
        />

        {/* HOTEL PAYMENT */}

        <Route
          path="/hotelpayment"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelPayment />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/payment"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelPayment />
            </IndustryGuard>
          }
        />
        <Route
          path="/hotel/payments"
          element={
            <IndustryGuard requiredIndustry="HOTEL">
              <HotelPayment />
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

        <Route
          path="/branches"
          element={
            <SharedModuleGuard>
              <BranchesModule />
            </SharedModuleGuard>
          }
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