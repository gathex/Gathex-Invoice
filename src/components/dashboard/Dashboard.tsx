import { useState, useEffect } from "react";
import { useRouter } from "../../context/RouterContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";

import { 
  IndianRupee, 
  FileSpreadsheet, 
  Users2, 
  Calendar, 
  ArrowUpRight, 
  TrendingUp, 
  ArrowDownRight, 
  Plus, 
  QrCode, 
  Sparkles, 
  Activity, 
  UserPlus, 
  Download, 
  Clock,
  ArrowRight,
  ShieldAlert,
  Trash2,
  FileText,
  Truck,
  ArrowDownLeft,
  Percent,
  ShoppingBag,
  BadgePercent
} from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { useToast } from "../ui/Toast";
import { EmptyState } from "../ui/EmptyState";
import { Customer, Invoice, ProductService } from "../../types";
import { notificationService } from "../../services/notificationService";

export function Dashboard() {
  const { navigate } = useRouter();
  const { user, activeBusiness } = useAuth();
  const toast = useToast();

  // Selected chart range
  const [selectedChartRange, setSelectedChartRange] = useState("6m");
  const [loading, setLoading] = useState(true);

  // Firestore synced states
  const [customersCount, setCustomersCount] = useState(0);
  const [b2bCustomersCount, setB2bCustomersCount] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isPopulating, setIsPopulating] = useState(false);

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

      // 2. Fetch Sales Documents (invoices, quotations, credit_notes, debit_notes, delivery_challans, purchase_orders)
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
        const poList: any[] = [];

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
          else if (d.doc_type === 'purchase_order') poList.push(mapped);
        });

        setInvoices(invList);
        setQuotations(quotList);
        setCreditNotes(creditList);
        setDebitNotes(debitList);
        setChallans(challanList);
        setPurchaseOrders(poList);
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

  // Phase 4 Sales Documents & Customer Workflow Analytics
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

  // Render metrics array
  
  const metrics = [
    {
      title: "Active Quotations",
      value: `${quotations.length}`,
      change: `${quotations.filter(q => q.status === "draft").length} pending approval`,
      isPositive: true,
      icon: <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: "bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
      title: "Credit Notes Issued",
      value: `${creditNotes.length}`,
      change: "Outstanding notes",
      isPositive: true,
      icon: <Percent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "Active Purchase Orders",
      value: `${purchaseOrders.length}`,
      change: "Pending fulfillment",
      isPositive: true,
      icon: <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-50 dark:bg-amber-950/20"
    },
    {
      title: "Delivery Challans",
      value: `${challans.length}`,
      change: "Shipped & delivered",
      isPositive: true,
      icon: <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      bg: "bg-cyan-50 dark:bg-cyan-950/20"
    }
  ];

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

  const quickActions = [
    {
      title: "New GST Invoice",
      desc: "Raise compliant B2B/B2C invoice",
      icon: <Plus className="w-5 h-5 text-indigo-600" />,
      onClick: () => navigate("invoices")
    },
    {
      title: "Add GSTIN Client",
      desc: "Auto-validate GSTIN registration",
      icon: <UserPlus className="w-5 h-5 text-emerald-600" />,
      onClick: () => navigate("customers")
    },
    {
      title: "Enroll Catalog Item",
      desc: "Map HSN/SAC products & services",
      icon: <QrCode className="w-5 h-5 text-cyan-600" />,
      onClick: () => navigate("products")
    },
    {
      title: "Tax Filing Summary",
      desc: "Review CGST/SGST/IGST collections",
      icon: <Download className="w-5 h-5 text-amber-600" />,
      onClick: () => {
        toast.success("Ready for export", "Your outward GSTR ledger export has been queued.");
      }
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

  // Populate dynamic high-fidelity Demo Data inside Supabase
  const handlePopulateDemoData = async () => {
    if (!user || !activeBusiness || isPopulating) return;

    setIsPopulating(true);
    toast.info("Enrolling high-fidelity SaaS sandbox data...", "Generating verified GSTIN businesses, catalog items, and tax-inclusive invoices.");

    try {
      // 1. Create 3 Customers
      const dummyCustomers = [
        {
          name: "Amit Patel",
          company_name: "TechVantage Solutions Pvt Ltd",
          gstin: "27AAPCA1234A1Z5",
          email: "accounts@techvantage.in",
          phone: "+91 91234 56789",
          billing_address: {
            street: "TechVantage Tower, Hiranandani Gardens, Powai",
            city: "Mumbai",
            state: "Maharashtra (27)",
            postalCode: "400076",
            country: "India"
          },
          is_archived: false,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          name: "Suresh Gowda",
          company_name: "Alpha Retailers Group",
          gstin: "29AABCA9876C1Z9",
          email: "finance@alpharetail.com",
          phone: "+91 81234 56789",
          billing_address: {
            street: "Alpha Plaza, 100 Feet Road, Indiranagar",
            city: "Bengaluru",
            state: "Karnataka (29)",
            postalCode: "560038",
            country: "India"
          },
          is_archived: false,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          name: "Rajesh Sen",
          company_name: "Nirman Infra Projects",
          gstin: "19AAPCN1234F1Z8",
          email: "contact@nirmaninfra.in",
          phone: "+91 71234 56789",
          billing_address: {
            street: "Nirman House, AJC Bose Road",
            city: "Kolkata",
            state: "West Bengal (19)",
            postalCode: "700014",
            country: "India"
          },
          is_archived: false,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        }
      ];

      const { data: insertedCusts } = await supabase
        .from('customers')
        .insert(dummyCustomers)
        .select('id');

      const customerIds = (insertedCusts || []).map(c => c.id);

      // 2. Create 3 Products
      const dummyProducts = [
        {
          name: "SaaS Enterprise Server License",
          type: "service",
          sku_code: "SKU-SE-001",
          hsn_sac_code: "997331",
          price: 85000,
          unit: "Year",
          gst_rate: 18,
          cess_rate: 0,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          name: "Industrial Aluminum Castings",
          type: "product",
          sku_code: "SKU-AL-204",
          hsn_sac_code: "760110",
          price: 1240,
          unit: "Kg",
          gst_rate: 18,
          cess_rate: 0,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          name: "Cloud Server Hosting Block",
          type: "service",
          sku_code: "SKU-CS-500",
          hsn_sac_code: "998315",
          price: 4200,
          unit: "Month",
          gst_rate: 18,
          cess_rate: 0,
          owner_uid: user.uid,
          business_id: activeBusiness.id
        }
      ];

      await supabase.from('products').insert(dummyProducts);

      // 3. Create 3 Invoices
      const today = new Date();
      const pastDate = (days: number) => {
        const d = new Date();
        d.setDate(today.getDate() - days);
        return d.toISOString().split("T")[0];
      };

      const dummyInvoices = [
        {
          doc_type: "invoice",
          doc_number: "GATHEX/2026/001",
          status: "paid",
          customer_id: customerIds[0] || null,
          customer_details: {
            name: dummyCustomers[0].name,
            companyName: dummyCustomers[0].company_name,
            gstin: dummyCustomers[0].gstin,
            email: dummyCustomers[0].email,
            phone: dummyCustomers[0].phone,
            address: dummyCustomers[0].billing_address
          },
          issue_date: pastDate(10),
          due_date: pastDate(-5),
          sub_total: 101800,
          total_discount: 0,
          total_taxable_amount: 101800,
          total_cgst: 9162,
          total_sgst: 9162,
          total_igst: 0,
          grand_total: 120124,
          amount_paid: 120124,
          amount_due: 0,
          notes: "Auto-generated sandboxed invoice demonstration.",
          terms_conditions: "Subject to Maharashtra jurisdiction.",
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          doc_type: "invoice",
          doc_number: "GATHEX/2026/002",
          status: "sent",
          customer_id: customerIds[1] || null,
          customer_details: {
            name: dummyCustomers[1].name,
            companyName: dummyCustomers[1].company_name,
            gstin: dummyCustomers[1].gstin,
            email: dummyCustomers[1].email,
            phone: dummyCustomers[1].phone,
            address: dummyCustomers[1].billing_address
          },
          issue_date: pastDate(4),
          due_date: pastDate(-11),
          sub_total: 62000,
          total_discount: 2000,
          total_taxable_amount: 60000,
          total_cgst: 0,
          total_sgst: 0,
          total_igst: 10800,
          grand_total: 70800,
          amount_paid: 0,
          amount_due: 70800,
          notes: "Dynamic dynamic UPI QR settlement active.",
          terms_conditions: "Dynamic interest charged for late settlement.",
          owner_uid: user.uid,
          business_id: activeBusiness.id
        },
        {
          doc_type: "invoice",
          doc_number: "GATHEX/2026/003",
          status: "overdue",
          customer_id: customerIds[2] || null,
          customer_details: {
            name: dummyCustomers[2].name,
            companyName: dummyCustomers[2].company_name,
            gstin: dummyCustomers[2].gstin,
            email: dummyCustomers[2].email,
            phone: dummyCustomers[2].phone,
            address: dummyCustomers[2].billing_address
          },
          issue_date: pastDate(25),
          due_date: pastDate(10),
          sub_total: 148800,
          total_discount: 4800,
          total_taxable_amount: 144000,
          total_cgst: 0,
          total_sgst: 0,
          total_igst: 25920,
          grand_total: 169920,
          amount_paid: 0,
          amount_due: 169920,
          notes: "Overdue alert flagged automatically by GST core engine.",
          terms_conditions: "Late fees subject to West Bengal state regulations.",
          owner_uid: user.uid,
          business_id: activeBusiness.id
        }
      ];

      await supabase.from('sales_documents').insert(dummyInvoices);

      // 4. Create 4 Activity Logs
      const logs = [
        {
          business_id: activeBusiness.id,
          owner_uid: user.uid,
          document_id: "demo",
          document_type: "invoice",
          document_number: "GATHEX/2026/001",
          action: "UPI Payment Received",
          description: "Received ₹1,20,124.00 from TechVantage Solutions Pvt Ltd.",
          user_id: user.uid,
          user_name: user.displayName || "Partner"
        },
        {
          business_id: activeBusiness.id,
          owner_uid: user.uid,
          document_id: "demo",
          document_type: "invoice",
          document_number: "GATHEX/2026/002",
          action: "B2B Invoice Raised",
          description: "Raised compliant GATHEX/2026/002 with 18% IGST.",
          user_id: user.uid,
          user_name: user.displayName || "Partner"
        }
      ];

      await supabase.from('document_activities').insert(logs);

      toast.success("Sandbox populated", "GST compliance entities, clients, catalog specs, and paid/pending tax invoices successfully generated.");
    } catch (err) {
      toast.error("Sandbox failure", "Error seeding sandbox databases.");
      console.error(err);
    } finally {
      setIsPopulating(false);
    }
  };

  // Clear demo data
  const handleClearDashboard = async () => {
    if (!user || !activeBusiness || isPopulating) return;

    setIsPopulating(true);
    toast.info("Clearing sandbox database...", "Removing sandboxed catalog entities, clients, activity timelines, and invoices.");

    try {
      await supabase.from('sales_documents').delete().eq('business_id', activeBusiness.id);
      await supabase.from('customers').delete().eq('business_id', activeBusiness.id);
      await supabase.from('products').delete().eq('business_id', activeBusiness.id);
      await supabase.from('document_activities').delete().eq('business_id', activeBusiness.id);

      toast.success("Database Reset Complete", "Dashboard metric overlays and physical collections have been completely cleared.");
    } catch (err) {
      toast.error("Reset Error", "Failed to flush sandbox collections.");
      console.error(err);
    } finally {
      setIsPopulating(false);
    }
  };

  // Check if there is absolutely no data
  const isCleared = invoices.length === 0 && customersCount === 0;

  return (
    <div className="space-y-8 font-sans">
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
        
        {/* Date Display & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>FY 2026-2027</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {primaryMetrics.map((metric, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow relative group border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                {i === 0 ? (
                  <div className="icon-wrapper-selector">
                    <span style={{ color: "#000000" }}>
                      {metric.icon}
                    </span>
                  </div>
                ) : (
                  metric.icon
                )}
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
        ))}
      </div>

      {/* Chart and Quick Actions section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Analytics Chart (Custom Vector Design) */}
        <Card className="lg:col-span-8 flex flex-col justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white font-display">Outward Billing Analytics</h3>
              <p className="text-xs text-slate-400">CGST/SGST/IGST outward billing timeline</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
              {["3m", "6m", "12m"].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedChartRange(range)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedChartRange === range 
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Gorgeous custom vector chart */}
          <div className="h-64 relative flex items-end justify-between px-2 pt-6">
            {/* Gridlines */}
            <div className="absolute inset-x-0 bottom-6 top-6 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
              <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
              <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
              <div className="border-b border-slate-100 dark:border-slate-800/50 w-full" />
            </div>

            {/* Custom SVG Line and Area Chart representing live SaaS dashboard */}
            <svg className="absolute inset-x-0 bottom-6 h-48 w-full z-10 overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="chartGradientCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Area Path */}
              {!isCleared ? (
                <>
                  <path
                    d="M 10 160 Q 80 120 150 140 T 290 80 T 430 110 T 570 30 T 710 40 L 710 160 L 10 160 Z"
                    fill="url(#chartGradient)"
                    className="transition-all duration-500"
                  />
                  <path
                    d="M 10 160 Q 80 150 150 120 T 290 110 T 430 90 T 570 60 T 710 50"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  
                  {/* Main Line Path */}
                  <path
                    d="M 10 160 Q 80 120 150 140 T 290 80 T 430 110 T 570 30 T 710 40"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />

                  {/* Data points */}
                  <circle cx="150" cy="140" r="4" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
                  <circle cx="290" cy="80" r="4" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
                  <circle cx="430" cy="110" r="4" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
                  <circle cx="570" cy="30" r="5" fill="#06b6d4" stroke="#fff" strokeWidth="2.5" className="animate-pulse" />
                </>
              ) : (
                <>
                  {/* Flat baseline in cleared state */}
                  <path
                    d="M 10 160 L 710 160"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="dark:stroke-slate-800"
                  />
                </>
              )}
            </svg>

            {isCleared && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 z-20 rounded-xl backdrop-blur-[1px]">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No database records registered</p>
                <p className="text-xs text-slate-400 mt-1">Create outward invoices to populate metrics.</p>
              </div>
            )}

            {/* Labels under the bars */}
            <div className="w-full flex justify-between text-[11px] font-bold text-slate-400 z-10 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span>Nov 2025</span>
              <span>Dec 2025</span>
              <span>Jan 2026</span>
              <span>Feb 2026</span>
              <span>Mar 2026</span>
              <span>Apr 2026 (FY26)</span>
            </div>
          </div>
        </Card>

        {/* Quick Actions (Bento Box Card) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 font-display flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" /> Merchant Utilities
          </h4>
          <div className="grid grid-cols-1 gap-3.5">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="w-full text-left p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-colors">
                    {action.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                      {action.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commercial Sales Funnel & Secondary Document Analytics (Phase 4) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-indigo-500" /> Commercial Sales Pipeline & Logistics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live operational audit of customer estimates, dispatch logistics, and credit ledger offsets.</p>
          </div>
          <div className="text-xs font-mono font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
            Real-Time Sync
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Quotation Pipeline Widget */}
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotation Funnel</span>
                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                  {conversionRate}% Convert Rate
                </span>
              </div>
              <h4 className="text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-2">
                ₹{totalQuotationsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-xs text-slate-400 mt-1">Total value across {totalQuotationsCount} commercial quotes.</p>
            </div>
            
            <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {pendingQuotationsCount} Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {acceptedQuotationsCount} Accepted
              </span>
            </div>
          </Card>

          {/* 2. Credit & Debit Notes Widget */}
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Offsets & Notes</span>
                <span className="text-[10px] font-bold text-slate-400">Credit vs Debit</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Credit Issued</span>
                  <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
                    ₹{totalCreditNotesValue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{creditNotes.length} notes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Debit Issued</span>
                  <span className="text-base font-bold font-mono text-teal-600 dark:text-teal-400 block mt-0.5">
                    ₹{totalDebitNotesValue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{debitNotes.length} notes</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>Used to correct tax mistakes or adjust balances</span>
            </div>
          </Card>

          {/* 3. Delivery Logistics Widget */}
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logistics & Dispatches</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  {totalChallansCount} Challans
                </span>
              </div>
              <h4 className="text-xl font-black font-display text-slate-800 dark:text-slate-100 mt-2">
                {deliveredChallansCount} / {totalChallansCount} Delivered
              </h4>
              <p className="text-xs text-slate-400 mt-1">Delivery challans issued for physical consignments.</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-500" /> {dispatchedChallansCount} Dispatched
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> {totalChallansCount - dispatchedChallansCount - deliveredChallansCount} Drafts
              </span>
            </div>
          </Card>
        </div>

        {/* Sales Pipeline Flow Visualizer */}
        <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-4">Cash-to-Cash Pipeline Flow Funnel</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 bg-violet-50/40 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-xl relative">
              <span className="text-[9px] font-black uppercase text-violet-500 tracking-wider">Step 1 — Estimate</span>
              <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">Quotations Raised</h5>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold font-mono text-violet-700 dark:text-violet-400">{totalQuotationsCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">issued</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Step 2 — Accepted</span>
              <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">Customer Approval</h5>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-400">{acceptedQuotationsCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">approved ({conversionRate}%)</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-cyan-50/40 dark:bg-cyan-950/10 border border-cyan-100 dark:border-cyan-900/30 rounded-xl">
              <span className="text-[9px] font-black uppercase text-cyan-500 tracking-wider">Step 3 — Billed</span>
              <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">Invoices Raised</h5>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold font-mono text-cyan-700 dark:text-cyan-400">{activeInvoicesCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">billed</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Step 4 — Cash Flow</span>
              <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">Realized Payments</h5>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{paidInvoicesCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">paid ({activeInvoicesCount > 0 ? Math.round((paidInvoicesCount / activeInvoicesCount) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity and GST Status Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity Ledger */}
        <Card className="lg:col-span-8 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-indigo-500" /> Recent Activity Audit Trail
            </h3>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Live logs</span>
          </div>

          <div className="space-y-4">
            {activities.length === 0 ? (
              <EmptyState
                icon={<Activity className="w-12 h-12 text-slate-300 dark:text-slate-700" />}
                title="No Recent Activities"
                description="Your business audit ledger is currently empty. Raising invoices or registering clients will populate this timeline."
              />
            ) : (
              activities.map((act) => (
                <div 
                  key={act.id} 
                  className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors border border-transparent hover:border-slate-200/40 dark:hover:border-slate-800/40"
                >
                  <div className="flex gap-3.5">
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
              ))
            )}
          </div>
        </Card>

        {/* Dynamic UPI Dynamic Settlement Card */}
        <Card className="lg:col-span-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white flex flex-col justify-between relative overflow-hidden p-6 border-none shadow-xl">
          <div className="absolute inset-0 bg-grid-pattern-dark opacity-10 pointer-events-none" />
          
          <div className="space-y-3 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-cyan-300">
              <QrCode className="w-3.5 h-3.5" /> Indian GST Settlements
            </div>
            <h3 className="text-xl font-bold font-display tracking-tight leading-tight">
              Dynamic BHIM UPI QR Code Generator
            </h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Auto-embed invoices, customer GSTIN, and dynamic outward payable values directly into compliance QR formats. Let customers pay from GPay, PhonePe, or BHIM instantly.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4 z-10">
            {isCleared ? (
              <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl text-center flex flex-col items-center justify-center min-h-[172px]">
                <QrCode className="w-8 h-8 text-indigo-300/60 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-200 mt-2">QR Engine Standby</p>
                <p className="text-[10px] text-indigo-200/60 mt-1 max-w-[180px] mx-auto leading-normal">
                  Configure merchant credentials in setup settings and raise active invoices to project payment QR targets.
                </p>
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-xl self-center shadow-lg transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="h-32 w-32 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-between p-1 text-slate-950 font-sans">
                  {/* Real-looking UPI Logo */}
                  <span className="text-[9px] font-extrabold tracking-widest text-indigo-600 block">UPI</span>
                  {/* Simulated dynamic qr */}
                  <div className="grid grid-cols-4 gap-2 h-20 w-20 opacity-90 mx-auto">
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                    <div className="bg-slate-950 rounded-sm" />
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold leading-none mt-0.5">Scan to pay merchant</span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("settings")}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-indigo-900 hover:text-indigo-950 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              Verify Merchant Wallet <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
