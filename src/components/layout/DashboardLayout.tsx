import React, { useState, useEffect, ReactNode } from "react";
import { useRouter, RoutePath } from "../../context/RouterContext";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../ui/Toast";
import { businessService } from "../../services/businessService";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  CreditCard, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Building2, 
  ChevronDown, 
  User as UserIcon,
  Plus,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  Search,
  Check,
  Edit,
  Globe,
  Phone,
  FileCode,
  Sliders,
  FolderSync,
  AlertCircle,
  FlaskConical,
  Crown
} from "lucide-react";
import { GathexLogo } from "../ui/GathexLogo";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";
import { notificationService } from "../../services/notificationService";
import { NotificationItem } from "../../types";
import { AnimatePresence, motion } from "framer-motion";

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 5) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { currentRoute, navigate } = useRouter();
  const { user, profile, activeBusiness, logout, setActiveBusiness } = useAuth();
  const { isAdmin, adminRole } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Sync businesses list in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = businessService.subscribeToBusinesses(user.uid, (list) => {
      setBusinesses(list);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync notifications list in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSwitchBusiness = (biz: any) => {
    setActiveBusiness(biz);
    setIsBizModalOpen(false);
    toast.success("Workspace Switched", `Active billing target updated to ${biz.name}.`);
  };

  const navItems = [
    { label: "Dashboard", path: "dashboard" as RoutePath, icon: <LayoutDashboard className="w-5 h-5" /> },
    ...(isAdmin ? [{ label: "Admin Portal", path: "admin" as RoutePath, icon: <Crown className="w-5 h-5 text-purple-500 dark:text-purple-400" /> }] : []),
    { label: "Workspaces", path: "businesses" as RoutePath, icon: <Building2 className="w-5 h-5" /> },
    { label: "Customers", path: "customers" as RoutePath, icon: <Users className="w-5 h-5" /> },
    { label: "Quotations", path: "quotations" as RoutePath, icon: <FileText className="w-5 h-5" /> },
    { label: "Proforma", path: "proforma-invoices" as RoutePath, icon: <FileText className="w-5 h-5 opacity-70" /> },
    { label: "Invoices", path: "invoices" as RoutePath, icon: <FileText className="w-5 h-5" /> },
    { label: "Credit Notes", path: "credit-notes" as RoutePath, icon: <FileCode className="w-5 h-5 opacity-80" /> },
    { label: "Debit Notes", path: "debit-notes" as RoutePath, icon: <FileCode className="w-5 h-5 opacity-80" /> },
    { label: "Delivery Challans", path: "delivery-challans" as RoutePath, icon: <Package className="w-5 h-5" /> },
    { label: "Purchase Orders", path: "purchase-orders" as RoutePath, icon: <Package className="w-5 h-5 opacity-70" /> },
    { label: "Products", path: "products" as RoutePath, icon: <Package className="w-5 h-5" /> },
    { label: "Payments", path: "payments" as RoutePath, icon: <CreditCard className="w-5 h-5" /> },
    { label: "Reminders", path: "reminders" as RoutePath, icon: <Bell className="w-5 h-5" /> },
    { label: "Reports & GST", path: "reports" as RoutePath, icon: <BarChart3 className="w-5 h-5" /> },
    { label: "QA & E2E Testing", path: "qa-testing" as RoutePath, icon: <FlaskConical className="w-5 h-5" /> },
    { label: "Settings", path: "settings" as RoutePath, icon: <Settings className="w-5 h-5" /> },
    { label: "Profile", path: "profile" as RoutePath, icon: <UserIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-full lg:w-3/4 h-96 bg-grid-pattern dark:bg-grid-pattern-dark opacity-10 pointer-events-none z-0" />
      
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex-col justify-between z-20 shadow-sm relative">
        {/* Top header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <GathexLogo variant="full" className="w-9 h-9" />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentRoute === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold" 
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <span className={`transition-colors ${isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User detail */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3 p-2 rounded-xl justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold font-display shrink-0 font-sans">
                {profile?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate font-display">
                  {profile?.displayName || "Partner"}
                </h4>
                <p className="text-xs text-slate-400 truncate font-sans">
                  {profile?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/60 h-18 px-4 lg:px-8 flex items-center justify-between">
          {/* Left: Mobile trigger & Active Business */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </motion.button>

            {/* Business Card Button */}
            {activeBusiness && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsBizModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="p-1 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-md">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {activeBusiness.name}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  {activeBusiness.gstin && (
                    <div className="text-[9px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 block tracking-tight leading-none mt-0.5">
                      GSTIN: {activeBusiness.gstin}
                    </div>
                  )}
                </div>
              </motion.button>
            )}
          </div>

          {/* Right: Actions, search, notifications, theme toggler, user */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Quick Create shortcut */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate("invoices")}
              className="hidden sm:flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-primary-600/10 hover:shadow-primary-600/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                )}
              </motion.button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden font-sans neon-glow-indigo">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              if (!user) return;
                              await notificationService.markAllAsRead(user.uid);
                              toast.success("All read", "Marked all notifications as read.");
                            }}
                            title="Mark all as read"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={async () => {
                              if (!user) return;
                              await notificationService.clearAllNotifications(user.uid);
                              toast.success("Cleared", "All notifications deleted.");
                            }}
                            title="Clear all"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                      {notifications.length === 0 ? (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                          <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 mb-3">
                            <BellOff className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">No recent activity alerts found.</p>
                        </div>
                      ) : (
                        notifications.map((item) => {
                          // Icon and Color based on notification type
                          let IconComp = Info;
                          let iconColorClass = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40";
                          if (item.type === "success") {
                            IconComp = CheckCircle2;
                            iconColorClass = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
                          } else if (item.type === "warning") {
                            IconComp = AlertTriangle;
                            iconColorClass = "text-amber-500 bg-amber-50 dark:bg-amber-950/40";
                          } else if (item.type === "error") {
                            IconComp = XCircle;
                            iconColorClass = "text-rose-500 bg-rose-50 dark:bg-rose-950/40";
                          }

                          return (
                            <div
                              key={item.id}
                              onClick={async () => {
                                if (!item.isRead) {
                                  await notificationService.markAsRead(item.id);
                                }
                                setIsNotificationsOpen(false);
                                if (item.link) {
                                  navigate(item.link as RoutePath);
                                }
                              }}
                              className={`p-3.5 flex gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer relative group ${
                                !item.isRead ? "bg-primary-50/20 dark:bg-primary-950/5" : ""
                              }`}
                            >
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconColorClass}`}>
                                <IconComp className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className={`text-xs font-bold truncate ${
                                    !item.isRead ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                  }`}>
                                    {item.title}
                                  </h5>
                                  <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">
                                    {formatRelativeTime(item.createdAt)}
                                  </span>
                                </div>
                                {item.message && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal line-clamp-2">
                                    {item.message}
                                  </p>
                                )}
                              </div>

                              {/* Dismiss Button */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await notificationService.deleteNotification(item.id);
                                }}
                                title="Dismiss notification"
                                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>

                              {/* Unread indicator dot */}
                              {!item.isRead && (
                                <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-500" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/10">
                  {profile?.displayName?.charAt(0).toUpperCase() || "G"}
                </div>
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5 py-2 font-sans neon-glow-indigo">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 mb-1.5">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate font-display">
                        {profile?.displayName || "Partner"}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("settings");
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4" /> Profile Details
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("settings");
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 cursor-pointer"
                    >
                      <Settings className="w-4 h-4" /> System Settings
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800/60 my-1.5" />
                    
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>

                    

                    
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Drawer Slide-in */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-72 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full p-6 z-10 shadow-2xl">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800/60 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-extrabold font-display text-slate-900 dark:text-white">
                GATHEX
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = currentRoute === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive 
                        ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold" 
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom logout */}
            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-auto">
              <div className="flex items-center gap-3 p-2 rounded-xl justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold font-display shrink-0 font-sans">
                    {profile?.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate font-display">
                      {profile?.displayName || "Partner"}
                    </h4>
                    <p className="text-xs text-slate-400 truncate font-sans">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Business switcher dialog */}
      <Dialog
        isOpen={isBizModalOpen}
        onClose={() => setIsBizModalOpen(false)}
        title="Select Corporate Workspace"
        size="md"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-500">
            Select which corporate ledger and customer catalogs you want to load into your active workspace session:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {businesses.map((biz) => {
              const isSelected = activeBusiness?.id === biz.id;
              return (
                <div
                  key={biz.id}
                  onClick={() => handleSwitchBusiness(biz)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isSelected
                      ? "border-primary-500 bg-primary-50/10 dark:bg-primary-950/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {biz.name}
                      </h4>
                      {biz.gstin && (
                        <p className="text-[9px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          GSTIN: {biz.gstin}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white text-[10px]">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 gap-3">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => {
                setIsBizModalOpen(false);
                navigate("businesses");
              }}
              className="text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" /> Manage All Workspaces
            </Button>
            <Button variant="primary" type="button" onClick={() => setIsBizModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
