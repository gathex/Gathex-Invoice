import React, { useEffect, useState } from "react";
import { adminService } from "../../../services/adminService";
import { AdminOverviewStats, SignupGrowthData } from "../../../types/admin";
import { 
  Users, 
  Building2, 
  UserCheck, 
  FileText, 
  IndianRupee, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Crown, 
  Zap, 
  Sparkles,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area 
} from "recharts";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [growthData, setGrowthData] = useState<SignupGrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewStats, growth] = await Promise.all([
        adminService.getOverviewStats(),
        adminService.getSignupGrowth(6)
      ]);
      setStats(overviewStats);
      setGrowthData(growth || []);
    } catch (err: any) {
      console.error("Failed to load admin dashboard stats:", err);
      setError(err?.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 flex flex-col items-center justify-center space-y-4">
        <p className="font-semibold text-center">{error}</p>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry Loading
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.total_users.toLocaleString() ?? "0",
      change: "+Registered",
      icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      border: "border-indigo-100 dark:border-indigo-900/50"
    },
    {
      title: "Total Businesses",
      value: stats?.total_businesses.toLocaleString() ?? "0",
      change: "Active Workspaces",
      icon: <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      border: "border-purple-100 dark:border-purple-900/50"
    },
    {
      title: "Active This Month",
      value: stats?.active_this_month.toLocaleString() ?? "0",
      change: "New / Active Users",
      icon: <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-100 dark:border-emerald-900/50"
    },
    {
      title: "Total Invoices",
      value: stats?.total_invoices.toLocaleString() ?? "0",
      change: "Generated Platform-wide",
      icon: <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-100 dark:border-amber-900/50"
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.total_revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: "Gross Invoiced Paid",
      icon: <IndianRupee className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      border: "border-teal-100 dark:border-teal-900/50"
    },
    {
      title: "Estimated MRR",
      value: `₹${(stats?.estimated_mrr ?? 0).toLocaleString('en-IN')}`,
      change: "Subscription Run Rate",
      icon: <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-100 dark:border-blue-900/50"
    }
  ];

  const tierBreakdown = stats?.tier_breakdown || { free: 0, starter: 0, growth: 0 };
  const totalTierUsers = (tierBreakdown.free + tierBreakdown.starter + tierBreakdown.growth) || 1;
  const freePct = Math.round((tierBreakdown.free / totalTierUsers) * 100);
  const starterPct = Math.round((tierBreakdown.starter / totalTierUsers) * 100);
  const growthPct = Math.round((tierBreakdown.growth / totalTierUsers) * 100);

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${card.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                {card.value}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                <span>{card.change}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup Growth Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-display">
                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                User Signup Growth (Last 6 Months)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Monthly trajectory of new accounts onboarded
              </p>
            </div>
            <span className="px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold text-xs rounded-full border border-primary-200 dark:border-primary-800">
              Realtime Database Metrics
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 12 }} 
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#0f172a", 
                      borderColor: "#1e293b", 
                      borderRadius: "12px", 
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                    }}
                    formatter={(val: any) => [`${val} Signups`, "New Accounts"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#growthGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No signup historical data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Tier Distribution Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-display">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Subscription Tiers
              </h3>
              <span className="text-xs font-medium text-slate-400">
                {stats?.total_users ?? 0} Total
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
              Distribution of active users across SaaS plans
            </p>

            {/* Visual Progress Bar Stack */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6">
              <div 
                style={{ width: `${freePct}%` }} 
                className="bg-slate-400 dark:bg-slate-600 transition-all duration-500" 
                title={`Free Tier: ${tierBreakdown.free} (${freePct}%)`}
              />
              <div 
                style={{ width: `${starterPct}%` }} 
                className="bg-indigo-500 transition-all duration-500" 
                title={`Starter Tier: ${tierBreakdown.starter} (${starterPct}%)`}
              />
              <div 
                style={{ width: `${growthPct}%` }} 
                className="bg-emerald-500 transition-all duration-500" 
                title={`Growth Tier: ${tierBreakdown.growth} (${growthPct}%)`}
              />
            </div>

            {/* Detailed Tier Rows */}
            <div className="space-y-3">
              {/* Free Tier */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Free Tier</h4>
                    <p className="text-[11px] text-slate-400 font-mono">₹0 / month</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-display">
                    {tierBreakdown.free}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">({freePct}%)</span>
                </div>
              </div>

              {/* Starter Tier */}
              <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Starter Tier</h4>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">₹499 / month</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-display">
                    {tierBreakdown.starter}
                  </span>
                  <span className="text-xs text-indigo-400 font-medium ml-1">({starterPct}%)</span>
                </div>
              </div>

              {/* Growth Tier */}
              <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Growth Tier</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">₹1,499 / month</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-display">
                    {tierBreakdown.growth}
                  </span>
                  <span className="text-xs text-emerald-400 font-medium ml-1">({growthPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Monthly Recurring Revenue</span>
              <span className="text-lg font-bold font-display text-emerald-400">
                ₹{(stats?.estimated_mrr ?? 0).toLocaleString('en-IN')}
              </span>
            </div>
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
