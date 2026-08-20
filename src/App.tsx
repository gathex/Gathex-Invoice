import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RouterProvider, useRouter } from "./context/RouterContext";
import { ToastProvider } from "./components/ui/Toast";

import { AnimatePresence, motion } from "framer-motion";

// Pages & Components
import { LandingView } from "./components/views/LandingView";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SalesDocumentsView } from "./components/views/SalesDocumentsView";
import { CustomersView } from "./components/views/CustomersView";
import { ProductsView } from "./components/views/ProductsView";
import { PaymentsView } from "./components/views/PaymentsView";
import { RemindersView } from "./components/views/RemindersView";
import { ExpensesView } from "./components/views/ExpensesView";
import { ReportsView } from "./components/views/ReportsView";
import { SettingsView } from "./components/views/SettingsView";
import { BusinessesView } from "./components/views/BusinessesView";
import { ProfileView } from "./components/views/ProfileView";
import { CustomerPortalView } from "./components/views/CustomerPortalView";
import { PublicInvoiceView } from "./components/views/PublicInvoiceView";
import { QATestingView } from "./components/views/QATestingView";
import { AuthView } from "./components/views/AuthView";
import { AdminPortalView } from "./components/views/admin/AdminPortalView";
import { AppLoadingSkeleton } from "./components/ui/AppLoadingSkeleton";

function AppContent() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { currentRoute, navigate } = useRouter();

  // Auth & Admin Guard Routing Checks
  useEffect(() => {
    if (loading || adminLoading) return;

    const isAuthRoute = ["auth-login", "auth-register", "auth-forgot"].includes(currentRoute);
    const isPublicRoute = ["portal", "public-invoice"].includes(currentRoute);
    const isLandingRoute = currentRoute === "landing";

    if (!user) {
      if (!isAuthRoute && !isLandingRoute && !isPublicRoute) {
        // Direct unauthenticated users to landing
        navigate("landing");
      }
    } else {
      if (isAuthRoute || isLandingRoute) {
        // Direct authenticated users to dashboard if trying to view login or landing pages
        navigate("dashboard");
      } else if (currentRoute === "admin" && !isAdmin) {
        // Direct non-admins away from /admin
        console.warn("Access denied to /admin route for non-admin user.");
        navigate("dashboard");
      }
    }
  }, [user, currentRoute, loading, adminLoading, isAdmin, navigate]);

  // Loading Screen with Logo, App Name & UI Skeleton
  if (loading) {
    return <AppLoadingSkeleton />;
  }

  // Auth Layout mapping
  const isAuthRoute = ["auth-login", "auth-register", "auth-forgot"].includes(currentRoute);

  return (
    <AnimatePresence mode="wait">
      {currentRoute === "landing" ? (
        <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <LandingView />
        </motion.div>
      ) : currentRoute === "public-invoice" ? (
        <motion.div key="public-invoice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <PublicInvoiceView />
        </motion.div>
      ) : currentRoute === "portal" ? (
        <motion.div key="portal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <CustomerPortalView />
        </motion.div>
      ) : isAuthRoute ? (
        <motion.div key={currentRoute} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <AuthView mode={currentRoute === "auth-login" ? "login" : currentRoute === "auth-register" ? "register" : "forgot"} />
        </motion.div>
      ) : (
        <motion.div key="app-dashboard-layout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <DashboardLayout>
            {currentRoute === "dashboard" && <Dashboard />}
            {currentRoute === "admin" && <AdminPortalView />}
            {currentRoute === "businesses" && <BusinessesView />}
            {currentRoute === "quotations" && <SalesDocumentsView docType="quotation" />}
            {currentRoute === "proforma-invoices" && <SalesDocumentsView docType="proforma_invoice" />}
            {currentRoute === "invoices" && <SalesDocumentsView docType="invoice" />}
            {currentRoute === "credit-notes" && <SalesDocumentsView docType="credit_note" />}
            {currentRoute === "debit-notes" && <SalesDocumentsView docType="debit_note" />}
            {currentRoute === "delivery-challans" && <SalesDocumentsView docType="delivery_challan" />}
            {currentRoute === "purchase-orders" && <SalesDocumentsView docType="purchase_order" />}
            {currentRoute === "customers" && <CustomersView />}
            {currentRoute === "products" && <ProductsView />}
            {currentRoute === "services" && <ProductsView />}
            {currentRoute === "payments" && <PaymentsView />}
            {currentRoute === "reminders" && <RemindersView />}
            {currentRoute === "expenses" && <ExpensesView />}
            {currentRoute === "reports" && <ReportsView />}
            {currentRoute === "qa-testing" && <QATestingView />}
            {currentRoute === "settings" && <SettingsView />}
            {currentRoute === "profile" && <ProfileView />}
          </DashboardLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AdminProvider>
            <RouterProvider>
              <AppContent />
            </RouterProvider>
          </AdminProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

