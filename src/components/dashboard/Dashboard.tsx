import { useState, useEffect, useMemo } from "react";
import { useRouter } from "../../context/RouterContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";

import { 
  IndianRupee, 
  FileSpreadsheet, 
  Users2, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Clock,
  ShieldAlert,
  Truck,
  Percent,
  BadgePercent
} from "lucide-react";
import { Card } from "../ui/Card";
import { motion } from "framer-motion";
import { Invoice } from "../../types";

export function Dashboard() {
  const { navigate } = useRouter();
  const { user, activeBusiness } = useAuth();

  // Selected chart range
  const [selectedChartRange, setSelectedChartRange] = useState<"3m" | "6m" | "12m">("6m");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Synced states
  const [customersCount, setCustomersCount] = useState(0);
  const [b2bCustomersCount, setB2bCustomersCount] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);

  // Subscriptions to live Supabase data
  useEffect(() => {
    if (!user || !activeBusiness) return;

    setLoading(true);

    const fetchData = async () => {
      // 1. Fetch Customers
      const { data: custs } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', activeBusiness.id);

      if (custs) {
        setCustomersCount(custs.length);
        setB2bCustomersCount(custs.filter(c => !!c.gstin).length);
      }

      // 2. Fetch Sales Documents
      const { data: docs } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('business_id', activeBusiness.id);

      if (docs) {
        const invList: Invoice[] = [];
        const quotList: any[] = [];
        const creditList: any[] = [];
        const debitList: any[] = [];
        const challanList: any[] = [];

        docs.forEach(d => {
          const mapped = {
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            invoiceNumber: d.doc_number,
            status: d.status,
            customerId: d.customer_id,
            customerDetails: d.customer_details || {},
            issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
            dueDate: d.due_date ? new Date(d.due_date) : new Date(),
            items: [],
            subTotal: Number(d.sub_total || 0),
            totalDiscount: Number(d.total_discount || 0),
            totalTaxableAmount: Number(d.total_taxable_amount || 0),
            totalCgst: Number(d.total_cgst || 0),
            totalSgst: Number(d.total_sgst || 0),
            totalIgst: Number(d.total_igst || 0),
            grandTotal: Number(d.grand_total || 0),
            amountPaid: Number(d.amount_paid || 0),
            amountDue: Number(d.amount_due || 0),
            notes: d.notes,
            termsConditions: d.terms_conditions,
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
          } as any;

          if (d.doc_type === 'invoice') invList.push(mapped);
          else if (d.doc_type === 'quotation') quotList.push(mapped);
          else if (d.doc_type === 'credit_note') creditList.push(mapped);
          else if (d.doc_type === 'debit_note') debitList.push(mapped);
          else if (d.doc_type === 'delivery_challan') challanList.push(mapped);
        });

        setInvoices(invList);
        setQuotations(quotList);
        setCreditNotes(creditList);
        setDebitNotes(debitList);
        setChallans(challanList);
      }

      // 3. Fetch Document Activities
      const { data: acts } = await supabase
        .from('document_activities')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (acts) {
        const logList = acts.map(d => ({
          id: d.id,
          event: d.action,
          detail: d.description,
          time: d.timestamp ? formatRelativeTime(new Date(d.timestamp)) : "Just now",
          type: "info",
          status: "success"
        }));
        setActivities(logList);
      }

      setLoading(false);
    };

    fetchData();

    const channelName = `dashboard-${activeBusiness.id}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_activities', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeBusiness]);

  // Analytical calculations over real-time database state
  const totalRevenue = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const activeInvoicesCount = invoices.filter(inv => inv.status !== "draft" && inv.status !== "void").length;
  const paidInvoicesCount = invoices.filter(inv => inv.status === "paid").length;
  const outstandingInvoicesCount = invoices.filter(inv => inv.status === "sent" || inv.status === "overdue").length;

  const totalOutstanding = invoices
    .filter(inv => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.amountDue !== undefined ? inv.amountDue : (inv.grandTotal || 0)), 0);

  const overdueInvoicesCount = invoices.filter(inv => inv.status === "overdue").length;

  // Commercial Sales Documents & Funnel Analytics
  const totalQuotationsCount = quotations.length;
  const pendingQuotationsCount = quotations.filter(q => q.status === "sent" || q.status === "draft").length;
  const acceptedQuotationsCount = quotations.filter(q => q.status === "accepted" || q.status === "converted").length;
  const convertedQuotationsCount = quotations.filter(q => q.status === "converted").length;
  const totalQuotationsValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const conversionRate = totalQuotationsCount > 0 
    ? Math.round((convertedQuotationsCount / totalQuotationsCount) * 100) 
    : 0;

  const totalCreditNotesValue = creditNotes.reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
  const totalDebitNotesValue = debitNotes.reduce((sum, dn) => sum + (dn.grandTotal || 0), 0);
  const totalChallansCount = challans.length;
  const dispatchedChallansCount = challans.filter(dc => dc.status === "dispatched").length;
  const deliveredChallansCount = challans.filter(dc => dc.status === "delivered").length;

  const primaryMetrics = [
    {
      title: "Total Realized Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      change: paidInvoicesCount > 0 ? `Paid settlement for ${paidInvoicesCount} invoices` : "No outward sales recorded",
      isPositive: paidInvoicesCount > 0,
      icon: <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: "bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
      title: "Active Invoices",
      value: `${activeInvoicesCount} raised`,
      change: `${paidInvoicesCount} paid, ${outstandingInvoicesCount} pending settlement`,
      isPositive: activeInvoicesCount > 0,
      icon: <FileSpreadsheet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      bg: "bg-cyan-50 dark:bg-cyan-950/20"
    },
    {
      title: "Tax Enrolled Clients",
      value: `${customersCount} client${customersCount === 1 ? "" : "s"}`,
      change: `${b2bCustomersCount} B2B registered with GSTIN`,
      isPositive: customersCount > 0,
      icon: <Users2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "Outstanding Receivables",
      value: `₹${totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      change: `${overdueInvoicesCount} invoice${overdueInvoicesCount === 1 ? "" : "s"} flagged as overdue`,
      isPositive: totalOutstanding === 0,
      icon: <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      bg: "bg-rose-50 dark:bg-rose-950/20"
    }
  ];

  // Helper relative time formatter
  function formatRelativeTime(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  // Real-Data Monthly Billing Aggregation
  const rangeMonthsCount = selectedChartRange === "3m" ? 3 : selectedChartRange === "12m" ? 12 : 6;

  const chartData = useMemo(() => {
    const months: {
      label: string;
      fullLabel: string;
      billed: number;
      paid: number;
      count: number;
    }[] = [];

    const now = new Date();
    for (let i = rangeMonthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const fullLabel = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

      const matching = invoices.filter(inv => {
        if (!inv.issueDate || inv.status === "void" || inv.status === "draft") return false;
        const idate = new Date(inv.issueDate);
        return idate.getFullYear() === year && idate.getMonth() === month;
      });

      const billed = matching.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const paid = matching.reduce((sum, inv) => {
        if (inv.status === "paid") return sum + (Number(inv.grandTotal) || 0);
        return sum + (Number(inv.amountPaid) || 0);
      }, 0);

      months.push({
        label: rangeMonthsCount <= 6 ? fullLabel : label,
        fullLabel,
        billed,
        paid,
        count: matching.length
      });
    }

    return months;
  }, [invoices, rangeMonthsCount]);

  const totalBilledInPeriod = useMemo(() => chartData.reduce((sum, m) => sum + m.billed, 0), [chartData]);
  const hasBillingData = totalBilledInPeriod > 0;
  const maxBilled = useMemo(() => Math.max(...chartData.map(m => m.billed), 0), [chartData]);

  // SVG Chart Geometry
  const svgWidth = 1000;
  const baselineY = 170;
  const topY = 25;
  const usableHeight = baselineY - topY;
  const paddingX = 40;

  const points = useMemo(() => {
    return chartData.map((item, index) => {
      const x = paddingX + (index / Math.max(chartData.length - 1, 1)) * (svgWidth - 2 * paddingX);
      const y = hasBillingData && maxBilled > 0
        ? baselineY - (item.billed / maxBilled) * usableHeight * 0.85
        : baselineY;
      return { x, y, item, index };
    });
  }, [chartData, hasBillingData, maxBilled, baselineY, usableHeight, paddingX, svgWidth]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const c1x = curr.x + (next.x - curr.x) / 2;
      const c1y = curr.y;
      const c2x = curr.x + (next.x - curr.x) / 2;
      const c2y = next.y;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0 || !hasBillingData) return "";
    return `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
  }, [linePath, points, hasBillingData, baselineY]);

  return (
    <div className="space-y-6 md:space-y-8 font-sans">
      {/* Dashboard Top Greeting & Status banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-slate-900 dark:text-white">
            {activeBusiness?.name || "Gathex Partner Workspace"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Invoicing System Online</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-slate-400">GST Reg: {activeBusiness?.gstin || "N/A"}</span>
          </p>
        </div>
        
        {/* Date Display */}
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>FY 2026-2027</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {primaryMetrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Card className="hover:shadow-md transition-shadow relative group border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {metric.title}
                  </p>
                  <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1.5 leading-tight tracking-tight">
                    {metric.value}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl ${metric.bg} transition-transform group-hover:scale-105`}>
                  {metric.icon}
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                {metric.isPositive ? (
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  </span>
                ) : (
                  <span className="flex items-center text-rose-500 dark:text-rose-400 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 mr-0.5" />
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {metric.change}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Outward Billing Analytics Chart (Full Width, Truthful Data) */}
      <Card className="flex flex-col justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-base md:text-lg">
                Outward Billing Analytics
              </h3>
              {hasBillingData && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  ₹{totalBilledInPeriod.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Total
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {hasBillingData 
                ? "Monthly outward taxable sales and realized collections based on active tax invoices"
                : "Real-time outward sales timeline based on issued GST tax invoices"}
            </p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg self-start sm:self-auto">
            {(["3m", "6m", "12m"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedChartRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedChartRange === range 
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Vector Chart Area */}
        <div className="h-64 relative flex flex-col justify-between px-4 pt-6 pb-2">
          {/* Subtle Gridlines */}
          <div className="absolute inset-x-4 bottom-12 top-6 flex flex-col justify-between pointer-events-none">
            <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
            <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
            <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
            <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
          </div>

          {/* Dynamic SVG Vector Chart */}
          <div className="relative h-48 w-full">
            <svg 
              className="absolute inset-0 h-full w-full overflow-visible" 
              viewBox={`0 0 ${svgWidth} 200`} 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="realChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {hasBillingData ? (
                <>
                  {/* Shaded Area */}
                  <path
                    d={areaPath}
                    fill="url(#realChartGradient)"
                    className="transition-all duration-300"
                  />

                  {/* Primary Solid Outward Billing Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />

                  {/* Data Points */}
                  {points.map((p) => {
                    const isHovered = hoveredPoint === p.index;
                    return (
                      <g key={p.index} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p.index)} onMouseLeave={() => setHoveredPoint(null)}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill={p.item.billed > 0 ? "#4f46e5" : "#94a3b8"}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 2}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </>
              ) : (
                /* Flat Baseline when there is no billing activity */
                <line
                  x1={paddingX}
                  y1={baselineY}
                  x2={svgWidth - paddingX}
                  y2={baselineY}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  className="dark:stroke-slate-800"
                />
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hasBillingData && hoveredPoint !== null && points[hoveredPoint] && (
              <div 
                className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 font-sans"
                style={{
                  left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
                  top: `${(points[hoveredPoint].y / 200) * 100}%`
                }}
              >
                <div className="font-semibold text-slate-200">{points[hoveredPoint].item.fullLabel}</div>
                <div className="text-emerald-400 font-bold font-mono">
                  ₹{points[hoveredPoint].item.billed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {points[hoveredPoint].item.count} invoice{points[hoveredPoint].item.count === 1 ? "" : "s"} raised
                </div>
              </div>
            )}

            {/* Truthful Empty State Overlay when no billing data exists */}
            {!hasBillingData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 mb-2">
                  <TrendingUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No billing activity yet</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm text-center">
                  Outward billing analytics will dynamically reflect revenue and GST collections once invoices are raised.
                </p>
              </div>
            )}
          </div>

          {/* Actual Timeline Labels */}
          <div className="w-full flex justify-between text-[11px] font-bold text-slate-400 z-10 pt-3 border-t border-slate-100 dark:border-slate-800/80 px-2 sm:px-4">
            {chartData.map((d, idx) => (
              <span 
                key={idx} 
                className={`transition-colors ${hoveredPoint === idx ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}`}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Commercial Sales Pipeline & Funnel (Merged Single Section) */}
      <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-indigo-500" /> Commercial Sales & Cash-Flow Pipeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              End-to-end progression from quotation estimates to approval, billing realization, and consignment dispatches.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
              Real-Time Sync
            </span>
          </div>
        </div>

        {/* Primary View: 4-Step Cash-to-Cash Pipeline Flow Funnel */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Cash-to-Cash Pipeline Flow Funnel
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Step 1: Quotations Raised */}
            <div 
              onClick={() => navigate("quotations")}
              className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl relative hover:border-violet-300 dark:hover:border-violet-800/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider">
                  Step 1 — Estimate
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ₹{totalQuotationsValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Quotations Raised
              </h5>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black font-mono text-violet-700 dark:text-violet-400">
                  {totalQuotationsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  issued ({pendingQuotationsCount} pending)
                </span>
              </div>
            </div>

            {/* Step 2: Customer Approval */}
            <div 
              onClick={() => navigate("quotations")}
              className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl relative hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                  Step 2 — Accepted
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  {conversionRate}% win rate
                </span>
              </div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Customer Approval
              </h5>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-400">
                  {acceptedQuotationsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  approved quotes
                </span>
              </div>
            </div>

            {/* Step 3: Invoices Raised */}
            <div 
              onClick={() => navigate("invoices")}
              className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl relative hover:border-cyan-300 dark:hover:border-cyan-800/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">
                  Step 3 — Billed
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {outstandingInvoicesCount} unpaid
                </span>
              </div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Invoices Raised
              </h5>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-400">
                  {activeInvoicesCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  active bills
                </span>
              </div>
            </div>

            {/* Step 4: Realized Payments */}
            <div 
              onClick={() => navigate("payments")}
              className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl relative hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Step 4 — Cash Flow
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeInvoicesCount > 0 ? Math.round((paidInvoicesCount / activeInvoicesCount) * 100) : 0}% settled
                </span>
              </div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Realized Payments
              </h5>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {paidInvoicesCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  paid (₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Operational Stats: Ledger Offsets & Logistics/Dispatches */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ledger Offsets & Notes */}
          <div 
            onClick={() => navigate("credit-notes")}
            className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ledger Offsets & Notes
                </span>
                <div className="flex items-center gap-3 mt-0.5 text-xs font-mono font-bold">
                  <span className="text-rose-600 dark:text-rose-400">
                    Cr: ₹{totalCreditNotesValue.toLocaleString('en-IN')} <span className="font-sans font-normal text-[10px] text-slate-400">({creditNotes.length} notes)</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    Dr: ₹{totalDebitNotesValue.toLocaleString('en-IN')} <span className="font-sans font-normal text-[10px] text-slate-400">({debitNotes.length} notes)</span>
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
              Tax adjustments
            </span>
          </div>

          {/* Logistics & Dispatches */}
          <div 
            onClick={() => navigate("delivery-challans")}
            className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Logistics & Dispatches
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  <span>{deliveredChallansCount} / {totalChallansCount} Delivered</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-amber-600 dark:text-amber-400 font-sans font-medium text-[11px]">{dispatchedChallansCount} in transit</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-400 font-sans font-medium text-[11px]">{Math.max(0, totalChallansCount - dispatchedChallansCount - deliveredChallansCount)} drafts</span>
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
              Consignments
            </span>
          </div>
        </div>
      </Card>

      {/* Recent Activity Audit Trail (Clean, Compact Empty-State) */}
      <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 text-base md:text-lg">
            <Activity className="w-4.5 h-4.5 text-indigo-500" /> Recent Activity Audit Trail
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Live logs</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-4 px-4 text-center rounded-xl bg-slate-50/60 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800/80 flex items-center justify-center gap-2.5">
            <Activity className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No recent audit activity recorded yet. Invoices, customer registrations, and payments will appear here in real-time.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div 
                key={act.id} 
                className="flex items-start justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors border border-transparent hover:border-slate-200/40 dark:hover:border-slate-800/40"
              >
                <div className="flex gap-3">
                  <div className="mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        act.status === "danger" ? "bg-rose-400" : act.status === "warning" ? "bg-amber-400" : "bg-emerald-400"
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        act.status === "danger" ? "bg-rose-500" : act.status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                      {act.event}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans leading-relaxed">
                      {act.detail}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-4">
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
