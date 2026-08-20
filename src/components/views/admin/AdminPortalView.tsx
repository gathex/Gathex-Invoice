import React, { useEffect, useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import { useRouter } from "../../../context/RouterContext";
import { AdminDashboard } from "./AdminDashboard";
import { AdminUsersView } from "./AdminUsersView";
import { AdminActionLogsView } from "./AdminActionLogsView";
import { 
  Crown, 
  ShieldCheck, 
  Shield, 
  LayoutDashboard, 
  Users, 
  FileText, 
  ArrowLeft, 
  Sparkles,
  Lock
} from "lucide-react";
import { GathexLogo } from "../../ui/GathexLogo";
import { AppLoadingSkeleton } from "../../ui/AppLoadingSkeleton";

export function AdminPortalView() {
  const { isAdmin, adminRole, loading } = useAdmin();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');

  // Strict route guard
  useEffect(() => {
    if (!loading && !isAdmin) {
      console.warn("[Admin Access Guard] Non-admin user attempted to access /admin route. Redirecting to dashboard.");
      navigate("dashboard");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return <AppLoadingSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white space-y-4">
        <div className="p-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display">403 — Unauthorized Access</h2>
        <p className="text-sm text-slate-400 text-center max-w-md">
          Your account does not have administrative privileges. You are being redirected to the business workspace.
        </p>
        <button
          onClick={() => navigate("dashboard")}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("dashboard")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Return to Business Workspace"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight font-display text-white">
                  Super Admin Portal
                </h1>
                {adminRole === 'super_admin' && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 flex items-center gap-1 shadow-sm">
                    <Crown className="w-3.5 h-3.5 fill-current" /> Super Admin
                  </span>
                )}
                {adminRole === 'admin' && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-300 border border-blue-400/40 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </span>
                )}
                {adminRole === 'support' && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-teal-500/30 text-teal-300 border border-teal-400/40 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Support Staff
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Platform analytics, multi-tenant subscription tiers, account suspensions, and team access governance.
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" /> Client Management
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Tab Views */}
      <div>
        {activeTab === 'overview' && <AdminDashboard />}
        {activeTab === 'users' && <AdminUsersView />}
        {activeTab === 'logs' && <AdminActionLogsView />}
      </div>
    </div>
  );
}
