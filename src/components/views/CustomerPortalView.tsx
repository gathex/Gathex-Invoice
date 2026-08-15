import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";
import { Invoice, Payment, Quotation } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { 
  Loader2, 
  FileText, 
  CreditCard, 
  Download, 
  LogOut, 
  MessageSquare, 
  LayoutDashboard, 
  User as UserIcon, 
  ShieldCheck, 
  Truck, 
  LifeBuoy, 
  Activity, 
  Bell, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { useToast } from "../ui/Toast";
import { PortalInvoices } from "./portal/PortalInvoices";
import { PortalPayments } from "./portal/PortalPayments";
import { PortalQuotations } from "./portal/PortalQuotations";
import { PortalProfile } from "./portal/PortalProfile";
import { PortalDocuments } from "./portal/PortalDocuments";
import { PortalSupport } from "./portal/PortalSupport";
import { mapDocumentItemRow } from "../../services/salesDocumentService";

export function CustomerPortalView() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  
  // Data lists
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "payments" | "quotations" | "documents" | "support" | "profile">("dashboard");
  const toast = useToast();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Invoices & Quotations from sales_documents in Supabase
      const { data: docs } = await supabase
        .from('sales_documents')
        .select('*');

      const invList: Invoice[] = [];
      const quoList: Quotation[] = [];

      (docs || []).forEach(d => {
        const email = d.customer_details?.email;
        if (email && user.email && email.toLowerCase() === user.email.toLowerCase()) {
          const mapped = {
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            invoiceNumber: d.doc_number,
            quotationNumber: d.doc_number,
            status: d.status,
            customerId: d.customer_id,
            customerDetails: d.customer_details || {},
            issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
            dueDate: d.due_date ? new Date(d.due_date) : new Date(),
            expiryDate: d.due_date ? new Date(d.due_date) : new Date(),
            items: [],
            subTotal: Number(d.sub_total || 0),
            totalDiscount: Number(d.total_discount || 0),
            totalTaxableAmount: Number(d.total_taxable_amount || 0),
            grandTotal: Number(d.grand_total || 0),
            amountPaid: Number(d.amount_paid || 0),
            amountDue: Number(d.amount_due || 0),
            notes: d.notes,
            termsConditions: d.terms_conditions,
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
          } as any;

          if (d.doc_type === 'invoice') invList.push(mapped);
          else if (d.doc_type === 'quotation') quoList.push(mapped);
        }
      });

      setInvoices(invList);
      setQuotations(quoList);

      // 2. Fetch Payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_email', user.email);

      if (payData) {
        setPayments(payData.map(p => ({
          id: p.id,
          businessId: p.business_id,
          ownerUid: p.owner_uid,
          invoiceId: p.invoice_id,
          invoiceNumber: p.invoice_number,
          customerId: p.customer_id,
          customerName: p.customer_name,
          amount: Number(p.amount || 0),
          currency: p.currency || "INR",
          paymentDate: p.payment_date ? new Date(p.payment_date) : new Date(),
          paymentMethod: p.payment_method,
          status: p.status,
          transactionId: p.transaction_id,
          referenceNumber: p.reference_number,
          notes: p.notes,
          recordedBy: p.recorded_by
        } as Payment)));
      }

      // 3. Fetch Document Activity Logs
      const { data: actData } = await supabase
        .from('document_activities')
        .select('*')
        .order('timestamp', { ascending: false });

      if (actData) {
        setRecentActivities(actData.map(a => ({
          id: a.id,
          businessId: a.business_id,
          ownerUid: a.owner_uid,
          documentId: a.document_id,
          documentType: a.document_type,
          documentNumber: a.document_number,
          action: a.action,
          description: a.description || "",
          userId: a.user_id,
          userName: a.user_name || "Portal User",
          timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
        })));
      }

      // 5. Generate notifications on the fly based on statuses
      const notifs: any[] = [];
      invList.forEach(inv => {
        if (inv.amountDue > 0 && inv.status === "overdue") {
          notifs.push({
            id: `notif-inv-${inv.id}`,
            type: "error",
            title: "Invoice Overdue",
            message: `Invoice ${inv.invoiceNumber} is past its due date. Outstanding: ${formatINR(inv.amountDue)}.`,
            createdAt: inv.dueDate
          });
        } else if (inv.amountDue > 0) {
          notifs.push({
            id: `notif-inv-${inv.id}`,
            type: "warning",
            title: "Invoice Outstanding",
            message: `Invoice ${inv.invoiceNumber} is awaiting settlement. Due on ${inv.dueDate?.toLocaleDateString()}.`,
            createdAt: inv.issueDate
          });
        }
      });

      quoList.forEach(quo => {
        if (quo.status === "sent") {
          notifs.push({
            id: `notif-quo-${quo.id}`,
            type: "info",
            title: "Quotation Awaiting Review",
            message: `New quotation ${quo.quotationNumber} is ready for your review and approval.`,
            createdAt: quo.issueDate
          });
        }
      });

      // Sort notifications descending
      notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(notifs.slice(0, 5));

    } catch (err) {
      console.error("Portal Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const seedDemoCustomerData = async () => {
    setSeeding(true);
    toast.success("Initializing Demo Suite", "Registering high-fidelity invoices, quotations, payments, and support structures in database...");
    try {
      const demoBizId = crypto.randomUUID();
      const demoUserId = user?.uid || crypto.randomUUID();
      const customerId = crypto.randomUUID();
      const demoInv1Id = crypto.randomUUID();
      const demoInv2Id = crypto.randomUUID();
      const demoQuo1Id = crypto.randomUUID();
      const demoChallan1Id = crypto.randomUUID();
      const demoPayment1Id = crypto.randomUUID();
      const demoTicket1Id = crypto.randomUUID();

      await supabase.from('customers').upsert({
        id: customerId,
        owner_uid: demoUserId,
        business_id: demoBizId,
        name: "Acme Enterprises Pvt Ltd",
        company_name: "Acme Enterprises",
        email: "demo@gathex.in",
        phone: "+91 99887 76655",
        billing_address: {
          street: "12, Commercial Block, Sector 4",
          city: "Navi Mumbai",
          state: "Maharashtra",
          postalCode: "400703",
          country: "India"
        },
        shipping_address: {
          street: "12, Commercial Block, Sector 4",
          city: "Navi Mumbai",
          state: "Maharashtra",
          postalCode: "400703",
          country: "India"
        }
      });

      // Seeding high-fidelity items
      const invoicesToSeed = [
        {
          id: demoInv1Id,
          doc_type: "invoice",
          business_id: demoBizId,
          owner_uid: demoUserId,
          doc_number: "GAT-2026-004",
          status: "sent",
          customer_id: customerId,
          customer_details: {
            name: "Acme Enterprises Pvt Ltd",
            companyName: "Acme Enterprises",
            email: "demo@gathex.in",
            phone: "+91 99887 76655",
            address: {
              street: "12, Commercial Block, Sector 4",
              city: "Navi Mumbai",
              state: "Maharashtra",
              postalCode: "400703",
              country: "India"
            }
          },
          issue_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
          due_date: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
          sub_total: 20000,
          total_discount: 1000,
          total_taxable_amount: 19000,
          total_cgst: 1710,
          total_sgst: 1710,
          total_igst: 0,
          grand_total: 22420,
          amount_paid: 0,
          amount_due: 22420
        },
        {
          id: demoInv2Id,
          doc_type: "invoice",
          business_id: demoBizId,
          owner_uid: demoUserId,
          doc_number: "GAT-2026-003",
          status: "paid",
          customer_id: customerId,
          customer_details: {
            name: "Acme Enterprises Pvt Ltd",
            companyName: "Acme Enterprises",
            email: "demo@gathex.in",
            phone: "+91 99887 76655",
            address: {
              street: "12, Commercial Block, Sector 4",
              city: "Navi Mumbai",
              state: "Maharashtra",
              postalCode: "400703",
              country: "India"
            }
          },
          issue_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          due_date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
          sub_total: 45000,
          total_discount: 5000,
          total_taxable_amount: 40000,
          total_cgst: 3600,
          total_sgst: 3600,
          total_igst: 0,
          grand_total: 47200,
          amount_paid: 47200,
          amount_due: 0
        }
      ];

      for (const inv of invoicesToSeed) {
        await supabase.from('sales_documents').upsert(inv as any);
      }

      // Seed Quotations
      const quotationsToSeed = [
        {
          id: demoQuo1Id,
          doc_type: "quotation",
          business_id: demoBizId,
          owner_uid: demoUserId,
          doc_number: "QUO-2026-005",
          status: "sent",
          customer_id: customerId,
          customer_details: {
            name: "Acme Enterprises Pvt Ltd",
            companyName: "Acme Enterprises",
            email: "demo@gathex.in",
            phone: "+91 99887 76655",
            address: {
              street: "12, Commercial Block, Sector 4",
              city: "Navi Mumbai",
              state: "Maharashtra",
              postalCode: "400703",
              country: "India"
            }
          },
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
          sub_total: 35000,
          total_discount: 0,
          total_taxable_amount: 35000,
          total_cgst: 3150,
          total_sgst: 3150,
          total_igst: 0,
          grand_total: 41300
        }
      ];

      for (const quo of quotationsToSeed) {
        await supabase.from('sales_documents').upsert(quo as any);
      }

      // Seed Delivery Challans
      const challansToSeed = [
        {
          id: demoChallan1Id,
          doc_type: "delivery_challan",
          business_id: demoBizId,
          owner_uid: demoUserId,
          doc_number: "CHL-2026-012",
          status: "dispatched",
          customer_id: customerId,
          customer_details: {
            name: "Acme Enterprises Pvt Ltd",
            companyName: "Acme Enterprises",
            email: "demo@gathex.in",
            phone: "+91 99887 76655",
            address: {
              street: "12, Commercial Block, Sector 4",
              city: "Navi Mumbai",
              state: "Maharashtra",
              postalCode: "400703",
              country: "India"
            }
          },
          issue_date: new Date().toISOString().split('T')[0],
          vehicle_details: {
            vehicleNumber: "MH-43-AG-1024",
            transporterName: "Safe-X Express Logistics",
            lrNumber: "LRN85739"
          },
          delivery_address: {
            street: "Plot No. 45, MIDC, Mahape",
            city: "Navi Mumbai",
            state: "Maharashtra",
            postalCode: "400710",
            country: "India"
          }
        }
      ];

      for (const chl of challansToSeed) {
        await supabase.from('sales_documents').upsert(chl as any);
      }

      // Seed Payments
      const paymentsToSeed = [
        {
          id: demoPayment1Id,
          business_id: demoBizId,
          owner_uid: demoUserId,
          invoice_id: demoInv2Id,
          invoice_number: "GAT-2026-003",
          customer_id: customerId,
          customer_name: "Acme Enterprises Pvt Ltd",
          customer_email: "demo@gathex.in",
          amount: 47200,
          currency: "INR",
          payment_date: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString().split('T')[0],
          payment_method: "upi",
          payment_type: "full",
          status: "paid",
          transaction_id: "UTR857204928104",
          reference_number: "UTR857204928104",
          notes: "Auto-seeded payment receipt.",
          recorded_by: "merchant_owner"
        }
      ];

      for (const pay of paymentsToSeed) {
        await supabase.from('payments').upsert(pay as any);
      }

      // Seed Support Ticket
      const ticketsToSeed = [
        {
          id: demoTicket1Id,
          customerEmail: "demo@gathex.in",
          customerName: "Acme Enterprises Pvt Ltd",
          businessId: demoBizId,
          ownerUid: demoUserId,
          title: "Inquiry about invoice taxation breakdown",
          category: "billing",
          status: "in_progress",
          priority: "medium",
          description: "Hello, we noticed that GST was computed at 18% instead of 12% for the support package. Could you kindly review and adjust?",
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          messages: [
            {
              sender: "customer",
              message: "Hello, we noticed that GST was computed at 18% instead of 12% for the support package. Could you kindly review and adjust?",
              timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
            },
            {
              sender: "support",
              message: "Hi Acme team, thank you for reaching out. We have received your query. Our finance representative is verifying the tax slab with the accounting department and we will post an update shortly.",
              timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
            }
          ]
        }
      ];

      for (const t of ticketsToSeed) {
        await supabase.from('support_tickets').upsert(t as any);
      }

      toast.success("Sandbox Ready!", "Self-service dataset loaded. You can now explore the portal.");
      await fetchData();
    } catch (e) {
      console.error("Seeding error:", e);
      toast.error("Preparation Failed", "Could not seed the demo sandbox data.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Syncing Security Credentials & Invoices...</p>
      </div>
    );
  }

  // Standard login screen if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-white relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 p-8 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">GATHEX Client Portal</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Authenticate securely to review your business quotations, track invoices, pay bills, and coordinate support requests.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  placeholder="e.g. customer@acme.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  disabled
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>
              <Button
                disabled
                className="w-full py-2.5 text-xs text-slate-500 border border-slate-800 bg-slate-900/50 cursor-not-allowed font-bold"
              >
                Log In
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  // Compute stats
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.amountDue || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.grandTotal - (inv.amountDue || 0)), 0);
  const pendingInvoices = invoices.filter(inv => inv.amountDue > 0).length;
  const activeQuotations = quotations.filter(q => q.status === "sent" || q.status === "draft").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex md:flex-col shrink-0 overflow-x-auto md:overflow-y-auto border-r border-slate-800 shadow-xl">
        <div className="p-6 hidden md:block shrink-0 border-b border-slate-800">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-indigo-400" />
            GATHEX CLIENT
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 truncate" title={user.email}>{user.email}</p>
          
          {user.email === "demo@gathex.in" && invoices.length === 0 && (
            <Button
              variant="outline"
              loading={seeding}
              onClick={seedDemoCustomerData}
              className="mt-3 w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/20 text-[10px] py-1"
            >
              Seed Sandbox Data
            </Button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 flex md:flex-col gap-1.5 min-w-max md:min-w-0">
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab("invoices")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Invoices</span>
          </button>

          <button 
            onClick={() => setActiveTab("payments")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Payments History</span>
          </button>

          <button 
            onClick={() => setActiveTab("quotations")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'quotations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <FileText className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Quotations</span>
          </button>

          <button 
            onClick={() => setActiveTab("documents")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <Truck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Challans & Notes</span>
          </button>

          <button 
            onClick={() => setActiveTab("support")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <LifeBuoy className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Support Desk</span>
          </button>

          <button 
            onClick={() => setActiveTab("profile")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>Profile Card</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 hidden md:block">
          {user.email === "demo@example.com" && (
            <div className="mb-4 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs space-y-2">
              <p className="font-bold text-white flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                Merchant Mode
              </p>
              <p className="text-slate-400 text-[10px]">
                You are currently viewing using the primary merchant credentials.
              </p>
              <Button
                variant="primary"
                onClick={seedDemoCustomerData}
                loading={seeding}
                className="w-full py-1 text-[9px] font-black"
              >
                Setup Sandbox Customer
              </Button>
            </div>
          )}

          <button 
            onClick={() => { logout(); window.location.hash = "#portal"; }} 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" /> 
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* CORE WORKSPACE PORTLET */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* DASHBOARD MODULE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Greeting Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-6 sm:p-8 rounded-2xl text-white relative overflow-hidden shadow-lg border border-slate-800">
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Client Desk</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome to GATHEX Desk</h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
                  Inspect outstanding claims, approve pending quotations, and review past payment receipts through our self-service ledger.
                </p>
              </div>
            </div>
            
            {/* Metric Cards Deck */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 border-l-4 border-l-rose-500 border-slate-200/60 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Balance</p>
                <h3 className="text-2xl sm:text-3xl font-black text-rose-500 mt-2">{formatINR(totalOutstanding)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{pendingInvoices} invoices awaiting settlement</p>
              </Card>

              <Card className="p-6 border-l-4 border-l-emerald-500 border-slate-200/60 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Settled</p>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2">{formatINR(totalPaid)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Receipts securely audited</p>
              </Card>

              <Card className="p-6 border-l-4 border-l-amber-500 border-slate-200/60 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Active Offers</p>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">{activeQuotations}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Quotations ready for signature</p>
              </Card>

              <Card className="p-6 border-l-4 border-l-indigo-500 border-slate-200/60 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">My Documents</p>
                <h3 className="text-2xl sm:text-3xl font-black text-indigo-500 mt-2">
                  {invoices.length + quotations.length + payments.length}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Total historical records</p>
              </Card>
            </div>

            {/* Quick Actions Deck */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions Portal</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card 
                  className="p-4 border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-between group"
                  onClick={() => setActiveTab("invoices")}
                >
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Pay Outstanding</h5>
                    <p className="text-[10px] text-slate-400">Scan dynamic UPI QR code</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </Card>

                <Card 
                  className="p-4 border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between group"
                  onClick={() => setActiveTab("quotations")}
                >
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Review Offers</h5>
                    <p className="text-[10px] text-slate-400">Accept or request revisions</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </Card>

                <Card 
                  className="p-4 border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-indigo-400/50 cursor-pointer transition-all flex items-center justify-between group"
                  onClick={() => setActiveTab("support")}
                >
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Contact Support</h5>
                    <p className="text-[10px] text-slate-400">Open a helpdesk ticket</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </Card>
              </div>
            </div>

            {/* Invoices, Alerts, Timeline Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Recent Invoices Ledger */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="p-6 border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Pending Statements
                  </h3>
                  <div className="space-y-3.5">
                    {invoices.filter(inv => inv.amountDue > 0).slice(0, 4).map(inv => (
                      <div key={inv.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/20 dark:border-slate-800">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-slate-400">Due Date: {inv.dueDate?.toLocaleDateString()}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold text-rose-500 text-sm">{formatINR(inv.amountDue)}</p>
                          <Badge variant={inv.status === "overdue" ? "danger" : "warning"}>{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {invoices.filter(inv => inv.amountDue > 0).length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200">
                        All invoices are fully settled. No pending claims!
                      </div>
                    )}
                  </div>
                </Card>

                {/* Real-time Activity Logs Chronology */}
                <Card className="p-6 border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Ledger Audit Chronology
                  </h3>
                  
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 pl-8">
                    {recentActivities.slice(0, 4).map((act, index) => (
                      <div key={index} className="relative space-y-1">
                        <div className="absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-950" />
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{act.action.toUpperCase()} - {act.documentNumber}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{act.description}</p>
                        <p className="text-[10px] text-slate-400">{act.timestamp?.toLocaleDateString()} {act.timestamp?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    ))}

                    {recentActivities.length === 0 && (
                      <div className="pl-0 text-center py-6 text-xs text-slate-400 relative before:hidden">
                        No ledger updates recorded in the log trail yet.
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Alerts & Notifications Board */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-400 animate-pulse" />
                    Notifications Panel
                  </h3>

                  <div className="space-y-3">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-start gap-2.5 border-l-2 border-indigo-500 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-900 dark:text-white">{notif.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-6">All caught up! No notifications.</p>
                    )}
                  </div>
                </Card>
              </div>

            </div>

          </div>
        )}

        {/* SUB-MODULES TABS */}
        {activeTab === 'invoices' && (
          <PortalInvoices 
            invoices={invoices} 
            formatINR={formatINR} 
            onRefresh={fetchData} 
          />
        )}
        
        {activeTab === 'payments' && (
          <PortalPayments 
            payments={payments} 
            formatINR={formatINR} 
          />
        )}
        
        {activeTab === 'quotations' && (
          <PortalQuotations 
            quotations={quotations} 
            formatINR={formatINR} 
            onUpdate={fetchData} 
          />
        )}

        {activeTab === 'documents' && (
          <PortalDocuments 
            formatINR={formatINR} 
          />
        )}

        {activeTab === 'support' && (
          <PortalSupport />
        )}
        
        {activeTab === 'profile' && (
          <PortalProfile />
        )}

      </main>
    </div>
  );
}
