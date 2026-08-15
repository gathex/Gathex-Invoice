import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type RoutePath = 
  | "landing"
  | "dashboard" 
  | "businesses"
  | "quotations"
  | "proforma-invoices"
  | "invoices" 
  | "credit-notes"
  | "debit-notes"
  | "delivery-challans"
  | "purchase-orders"
  | "customers" 
  | "products" 
  | "services"
  | "payments" 
  | "reminders"
  | "expenses" 
  | "reports" 
  | "settings" 
  | "profile"
  | "auth-login" 
  | "auth-register" 
  | "auth-forgot"
  | "portal"
  | "public-invoice"
  | "qa-testing";

interface RouterContextType {
  currentRoute: RoutePath;
  navigate: (route: RoutePath) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  // Sync router with hash URL so page refresh and history works beautifully in iframe preview!
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => {
    const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0] as RoutePath;
    const validRoutes: RoutePath[] = [
      "landing", "dashboard", "businesses", "quotations", "proforma-invoices", "invoices", "credit-notes", "debit-notes", "delivery-challans", "purchase-orders", "customers", "products", "services", "payments", "reminders", "expenses", "reports", "settings", "profile",
      "auth-login", "auth-register", "auth-forgot", "portal", "public-invoice", "qa-testing"
    ];
    if (validRoutes.includes(hash)) {
      return hash;
    }
    return "dashboard"; // Default to dashboard (Auth guard will handle auth routes if needed)
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0] as RoutePath;
      const validRoutes: RoutePath[] = [
        "landing", "dashboard", "businesses", "quotations", "proforma-invoices", "invoices", "credit-notes", "debit-notes", "delivery-challans", "purchase-orders", "customers", "products", "services", "payments", "reminders", "expenses", "reports", "settings", "profile",
        "auth-login", "auth-register", "auth-forgot", "portal", "public-invoice", "qa-testing"
      ];
      if (validRoutes.includes(hash)) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (route: RoutePath) => {
    window.location.hash = `#/${route}`;
    setCurrentRoute(route);
  };

  return (
    <RouterContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}
