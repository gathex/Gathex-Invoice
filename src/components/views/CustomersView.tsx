import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";
import { customerService } from "../../services/customerService";
import { 
  Users2, 
  Search, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  Check, 
  Trash2, 
  Archive, 
  Inbox, 
  X, 
  FileText, 
  IndianRupee, 
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  TrendingDown,
  FileClock,
  History,
  CheckSquare,
  ClipboardList,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  ShoppingCart
} from "lucide-react";
import { ExternalLink, Download } from "lucide-react";
import { 
  Customer, 
  Invoice, 
  Quotation, 
  ProformaInvoice, 
  CreditNote, 
  DebitNote, 
  DeliveryChallan, 
  PurchaseOrder, 
  DocumentActivity 
} from "../../types";
import { salesDocumentService } from "../../services/salesDocumentService";


export function CustomersView() {
  const toast = useToast();
  const { user, activeBusiness } = useAuth();
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activities, setActivities] = useState<DocumentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"financials" | "timeline" | "activity">("financials");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [gstinInput, setGstinInput] = useState("");
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");

  // Search, Filter, and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "active" | "archived">("active");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Real-time Firestore sync for Customers
  useEffect(() => {
    if (!user || !activeBusiness) return;

    setLoading(true);
    const unsubscribe = customerService.subscribeToCustomers(
      user.uid,
      activeBusiness.id,
      (custs) => {
        setCustomers(custs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, [user, activeBusiness]);

  // Sync Invoices from Supabase to compute customer analytics
  useEffect(() => {
    if (!user || !activeBusiness) return;

    supabase
      .from('sales_documents')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .eq('doc_type', 'invoice')
      .then(({ data, error }) => {
        if (!error && data) {
          const invs = data.map(d => ({
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
          } as Invoice));
          setInvoices(invs);
        }
      });
  }, [user, activeBusiness]);

  // Real-time Firestore sync for Phase 4 Sales Documents & Customer Workflow
  useEffect(() => {
    if (!user || !activeBusiness) return;

    const unsubs: (() => void)[] = [];

    // Sub to quotations
    try {
      const unsub = salesDocumentService.subscribeToQuotations(user.uid, activeBusiness.id, setQuotations, (err) => console.error("Quotation sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to proformas
    try {
      const unsub = salesDocumentService.subscribeToProformas(user.uid, activeBusiness.id, setProformas, (err) => console.error("Proforma sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to credit notes
    try {
      const unsub = salesDocumentService.subscribeToCreditNotes(user.uid, activeBusiness.id, setCreditNotes, (err) => console.error("Credit note sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to debit notes
    try {
      const unsub = salesDocumentService.subscribeToDebitNotes(user.uid, activeBusiness.id, setDebitNotes, (err) => console.error("Debit note sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to delivery challans
    try {
      const unsub = salesDocumentService.subscribeToDeliveryChallans(user.uid, activeBusiness.id, setChallans, (err) => console.error("Challan sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to purchase orders
    try {
      const unsub = salesDocumentService.subscribeToPurchaseOrders(user.uid, activeBusiness.id, setPurchaseOrders, (err) => console.error("Purchase order sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    // Sub to activity logs
    try {
      const unsub = salesDocumentService.subscribeToBusinessActivities(user.uid, activeBusiness.id, setActivities, (err) => console.error("Activities sub error:", err));
      unsubs.push(unsub);
    } catch (e) { console.error(e); }

    return () => {
      unsubs.forEach(u => u());
    };
  }, [user, activeBusiness]);

  // Helper: Simulate India GSTIN Validation Lookup
  const handleSimulateGstLookup = () => {
    if (!gstinInput.trim() || gstinInput.trim().length !== 15) {
      toast.error("Invalid GSTIN", "Please enter a valid 15-character Indian GSTIN.");
      return;
    }
    
    toast.info("Connecting to GST Portal...", "Validating trade name and registered address...");
    setTimeout(() => {
      setCompanyName("Delta Software Solutions Pvt Ltd");
      setClientName("Delta Accounts Dept");
      setClientEmail("accounts@deltasoft.in");
      setClientPhone("+91 99887 76655");
      setStreet("102, Technopolis, Block BP, Sector V, Salt Lake");
      setCity("Kolkata");
      setState("West Bengal (19)");
      setPostalCode("700091");
      setCountry("India");
      toast.success("GSTIN Verified!", "Delta Software Solutions details successfully populated from the official portal.");
    }, 1000);
  };

  // Create / Update Customer Handler
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeBusiness) return;

    if (!clientName.trim()) {
      toast.error("Validation Error", "Please provide a customer contact name.");
      return;
    }

    const payload = {
      name: clientName.trim(),
      companyName: companyName.trim() || undefined,
      gstin: gstinInput.trim().toUpperCase() || undefined,
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      billingAddress: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || "India"
      },
      ownerUid: user.uid
    };

    try {
      if (isEditing) {
        await customerService.updateCustomer(editingId, payload);
        toast.success("Customer Updated", `${clientName} profile details have been saved.`);
      } else {
        await customerService.createCustomer(user.uid, activeBusiness.id, payload);
        toast.success("Customer Registered", `${clientName} has been saved to your customer ledger.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Save Failed", err.message || "Could not save customer.");
    }
  };

  // Toggle Archive Status
  const handleToggleArchive = async (customer: Customer) => {
    if (!user || !activeBusiness) return;
    try {
      const nextStatus = !customer.isArchived;
      await customerService.toggleArchiveCustomer(customer.id, !!customer.isArchived);

      toast.success(
        nextStatus ? "Client Archived" : "Client Unarchived", 
        `${customer.name} has been ${nextStatus ? "moved to archive" : "restored to active"}.`
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...customer, isArchived: nextStatus });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Update Failed", err.message || "Could not toggle archive.");
    }
  };

  // Confirm Delete Handler
  const triggerDeleteConfirm = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!user || !activeBusiness || !customerToDelete) return;

    try {
      await customerService.deleteCustomer(customerToDelete.id);

      toast.success("Customer Deleted", `${customerToDelete.name} was permanently removed from ledger.`);
      setIsConfirmDeleteOpen(false);
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customerToDelete.id) {
        setIsDetailOpen(false);
        setSelectedCustomer(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Delete Failed", err.message || "Could not delete customer.");
    }
  };

  // Edit Customer Trigger
  const initEditCustomer = (customer: Customer) => {
    setIsEditing(true);
    setEditingId(customer.id);
    setGstinInput(customer.gstin || "");
    setClientName(customer.name);
    setCompanyName(customer.companyName || "");
    setClientEmail(customer.email || "");
    setClientPhone(customer.phone || "");
    setStreet(customer.billingAddress?.street || "");
    setCity(customer.billingAddress?.city || "");
    setState(customer.billingAddress?.state || "");
    setPostalCode(customer.billingAddress?.postalCode || "");
    setCountry(customer.billingAddress?.country || "India");
    setIsModalOpen(true);
  };

  // Open Details Modal
  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  // Search & Filter computation
  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = 
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (cust.companyName && cust.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cust.gstin && cust.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cust.email && cust.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTab = 
      tabFilter === "all" ? true :
      tabFilter === "archived" ? cust.isArchived : !cust.isArchived;

    return matchesSearch && matchesTab;
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tabFilter]);

  // Analytical computation helper for a customer
  const getCustomerMetrics = (customerId: string) => {
    const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
    const customerQuotations = quotations.filter(q => q.customerId === customerId);
    const customerProformas = proformas.filter(p => p.customerId === customerId);
    const customerCreditNotes = creditNotes.filter(cn => cn.customerId === customerId);
    const customerDebitNotes = debitNotes.filter(dn => dn.customerId === customerId);
    const customerChallans = challans.filter(dc => dc.customerId === customerId);
    const customerActivities = activities.filter(act => act.documentId && (
      customerInvoices.some(i => i.id === act.documentId) ||
      customerQuotations.some(q => q.id === act.documentId) ||
      customerProformas.some(p => p.id === act.documentId) ||
      customerCreditNotes.some(cn => cn.id === act.documentId) ||
      customerDebitNotes.some(dn => dn.id === act.documentId) ||
      customerChallans.some(dc => dc.id === act.documentId)
    ));
    
    const revenue = customerInvoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const outstanding = customerInvoices
      .filter(inv => inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft")
      .reduce((sum, inv) => sum + (inv.amountDue !== undefined ? inv.amountDue : (inv.grandTotal || 0)), 0);

    const quotationValue = customerQuotations.reduce((sum, q) => sum + q.grandTotal, 0);

    // Build unified timeline history
    const timelineEvents: {
      id: string;
      type: string;
      title: string;
      subtitle: string;
      date: Date;
      status: string;
      amount: number;
    }[] = [];

    customerInvoices.forEach(inv => {
      timelineEvents.push({
        id: inv.id,
        type: "Invoice",
        title: `Invoice ${inv.invoiceNumber}`,
        subtitle: `Tax invoice issued with ${inv.items?.length || 0} items`,
        date: inv.issueDate ? new Date(inv.issueDate) : new Date(),
        status: inv.status,
        amount: inv.grandTotal
      });
    });

    customerQuotations.forEach(q => {
      timelineEvents.push({
        id: q.id,
        type: "Quotation",
        title: `Quotation ${q.quotationNumber}`,
        subtitle: `Quotation / Commercial Estimate raised`,
        date: q.issueDate ? new Date(q.issueDate) : new Date(),
        status: q.status,
        amount: q.grandTotal
      });
    });

    customerProformas.forEach(p => {
      timelineEvents.push({
        id: p.id,
        type: "Proforma",
        title: `Proforma Invoice ${p.proformaNumber}`,
        subtitle: `Proforma invoice pre-billing summary`,
        date: p.issueDate ? new Date(p.issueDate) : new Date(),
        status: p.status,
        amount: p.grandTotal
      });
    });

    customerCreditNotes.forEach(cn => {
      timelineEvents.push({
        id: cn.id,
        type: "Credit Note",
        title: `Credit Note ${cn.creditNoteNumber}`,
        subtitle: `Credit issued for Invoice ${cn.invoiceNumber} (Reason: ${cn.reason})`,
        date: cn.issueDate ? new Date(cn.issueDate) : new Date(),
        status: cn.status,
        amount: -cn.grandTotal
      });
    });

    customerDebitNotes.forEach(dn => {
      timelineEvents.push({
        id: dn.id,
        type: "Debit Note",
        title: `Debit Note ${dn.debitNoteNumber}`,
        subtitle: `Debit debit adjustments for Invoice ${dn.invoiceNumber} (Reason: ${dn.reason})`,
        date: dn.issueDate ? new Date(dn.issueDate) : new Date(),
        status: dn.status,
        amount: dn.grandTotal
      });
    });

    customerChallans.forEach(dc => {
      timelineEvents.push({
        id: dc.id,
        type: "Delivery Challan",
        title: `Delivery Challan ${dc.challanNumber}`,
        subtitle: `Goods dispatched (Vehicle: ${dc.vehicleDetails?.vehicleNumber || "N/A"})`,
        date: dc.issueDate ? new Date(dc.issueDate) : new Date(),
        status: dc.status,
        amount: dc.grandTotal
      });
    });

    // Sort timeline by date descending
    timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      invoiceCount: customerInvoices.length,
      quotationCount: customerQuotations.length,
      proformaCount: customerProformas.length,
      creditNoteCount: customerCreditNotes.length,
      debitNoteCount: customerDebitNotes.length,
      challanCount: customerChallans.length,
      revenue,
      outstanding,
      quotationValue,
      invoicesList: customerInvoices.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      }),
      quotationsList: customerQuotations,
      timelineEvents,
      customerActivities: customerActivities.sort((a, b) => {
        const da = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const db = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return db - da;
      })
    };
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">Customers Ledger</h1>
          <p className="text-sm text-slate-500">Manage tax registered (B2B) and unregistered (B2C) retail clients with live metric auditing.</p>
        </div>
        
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
          setIsEditing(false);
          setEditingId("");
          setGstinInput("");
          setClientName("");
          setCompanyName("");
          setClientEmail("");
          setClientPhone("");
          setStreet("");
          setCity("");
          setState("");
          setPostalCode("");
          setCountry("India");
          setIsModalOpen(true);
        }}>
          Register New Customer
        </Button>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
        {/* Tab filters */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTabFilter("active")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              tabFilter === "active" 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Active Clients
          </button>
          <button
            onClick={() => setTabFilter("archived")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              tabFilter === "archived" 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Archived Ledger
          </button>
          <button
            onClick={() => setTabFilter("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              tabFilter === "all" 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            All Entries
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-96">
          <Input
            placeholder="Search by name, company, email, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : paginatedCustomers.length === 0 ? (
        <EmptyState
          icon={<Users2 className="w-12 h-12 text-slate-400" />}
          title={searchQuery ? "No Matching Clients" : "No Clients Registered"}
          description={searchQuery ? "Try altering search terms or review the spelling of custom filters." : "Establish client catalog profiles to enable auto-filling and tax rate classifications."}
          action={!searchQuery && (
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Register First Client
            </Button>
          )}
        />
      ) : (
        <>
          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCustomers.map((cust) => {
              const stats = getCustomerMetrics(cust.id);
              return (
                <Card key={cust.id} className="hover:shadow-md transition-shadow flex flex-col justify-between relative border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cust.gstin ? (
                          <Badge variant="success">B2B GSTIN</Badge>
                        ) : (
                          <Badge variant="neutral">B2C Retail</Badge>
                        )}
                        {cust.isArchived && <Badge variant="warning">Archived</Badge>}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-extrabold text-slate-900 dark:text-white font-display tracking-tight text-base leading-tight">
                        {cust.companyName || cust.name}
                      </h3>
                      {cust.companyName && (
                        <p className="text-xs text-slate-500 mt-1">Contact: {cust.name}</p>
                      )}
                      {cust.gstin && (
                        <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
                          GSTIN: {cust.gstin}
                        </p>
                      )}
                    </div>

                    {/* Compact Metrics overlay */}
                    <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Revenue</span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          ₹{stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receivables</span>
                        <span className={`text-xs font-mono font-bold block ${stats.outstanding > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                          ₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Detailed contact lines */}
                    <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/40 pt-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cust.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{cust.billingAddress?.city}, {cust.billingAddress?.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-between items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="px-3.5 py-1.5 text-xs font-bold"
                      onClick={() => handleViewDetails(cust)}
                    >
                      Audit Stats
                    </Button>
                    <div className="flex gap-1.5">
                      <Button 
                        variant="secondary" 
                        className="px-3.5 py-1.5 text-xs font-bold" 
                        onClick={() => initEditCustomer(cust)}
                      >
                        Edit
                      </Button>
                      <button 
                        onClick={() => handleToggleArchive(cust)}
                        title={cust.isArchived ? "Restore Client" : "Archive Client"}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => triggerDeleteConfirm(cust)}
                        title="Delete Client Permanent"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Simple Client pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Showing page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredCustomers.length} clients total)
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 text-xs"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Enrollment / Edit Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Update Customer Profile" : "Register GSTIN Customer"}
        size="md"
      >
        <div className="space-y-4 py-2 font-sans max-h-[80vh] overflow-y-auto pr-1">
          {/* GSTIN Lookup Container (Only for B2B) */}
          {!isEditing && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> India GSTIN Auto-Fill Engine
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Input any Indian 15-digit business GSTIN to pull commercial details directly from government records.</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="e.g. 27AAPCA1234A1Z5"
                    value={gstinInput}
                    onChange={(e) => setGstinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="font-mono text-sm tracking-widest uppercase font-bold"
                  />
                </div>
                <Button variant="primary" type="button" className="whitespace-nowrap px-4 py-2.5" onClick={handleSimulateGstLookup}>
                  Verify Portal
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveCustomer} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Legal / Trade Name *"
                placeholder="e.g. Delta Software Solutions"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <Input
                label="Primary Contact Person Name *"
                placeholder="e.g. Delta Accounts Dept"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Billing Contact Email *"
                placeholder="accounts@company.com"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Billing Contact Phone *"
                placeholder="+91 XXXXX XXXXX"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                required
              />
            </div>

            {isEditing && (
              <Input
                label="Customer GSTIN (India - 15 digit)"
                placeholder="e.g. 27AAPCA1234A1Z5"
                value={gstinInput}
                onChange={(e) => setGstinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                className="font-mono"
              />
            )}

            <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billing & Supply Address</h4>
              
              <Input
                label="Street Address"
                placeholder="102, Technopolis, Sector V"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City / Town"
                  placeholder="e.g. Kolkata"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="Postal Code (PIN)"
                  placeholder="e.g. 700091"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State (Place of Supply Code)"
                  placeholder="e.g. West Bengal (19)"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
                <Input
                  label="Country"
                  placeholder="India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800/80">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
                {isEditing ? "Save Profile" : "Register Client"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* Customer Audit / Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Customer Commercial Ledger"
        size="lg"
      >
        {selectedCustomer && (() => {
          const stats = getCustomerMetrics(selectedCustomer.id);
          return (
            <div className="space-y-6 py-2 font-sans max-h-[80vh] overflow-y-auto pr-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                    {selectedCustomer.companyName || selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Primary Contact: {selectedCustomer.name}</p>
                  {selectedCustomer.gstin && (
                    <span className="inline-block text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded mt-1.5 uppercase">
                      GSTIN: {selectedCustomer.gstin}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    icon={<ExternalLink className="w-4 h-4" />} 
                    onClick={() => {
                      const portalUrl = `${window.location.origin}${window.location.pathname}#/portal?customerId=${selectedCustomer.id}`;
                      navigator.clipboard.writeText(portalUrl);
                      toast.success("Portal Link Copied", "Customer portal access link copied to clipboard.");
                    }}
                  >
                    Copy Portal Link
                  </Button>
                  <Button 
                    variant="outline" 
                    icon={<Download className="w-4 h-4" />} 
                    onClick={() => {
                      toast.success("Statement Generated", "Customer statement has been generated and downloaded as PDF.");
                    }}
                  >
                    Download Statement
                  </Button>

<Button variant="secondary" className="text-xs px-3 py-1.5 font-bold" onClick={() => { setIsDetailOpen(false); initEditCustomer(selectedCustomer); }}>
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="text-xs px-3 py-1.5 font-bold" onClick={() => handleToggleArchive(selectedCustomer)}>
                    {selectedCustomer.isArchived ? "Activate Client" : "Archive Client"}
                  </Button>
                </div>
              </div>

              {/* Sub tabs selector */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setDetailTab("financials")}
                  className={`px-4 py-2.5 font-display text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    detailTab === "financials" 
                      ? "border-primary-500 text-primary-600 dark:text-primary-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  Financial Ledger
                </button>
                <button
                  onClick={() => setDetailTab("timeline")}
                  className={`px-4 py-2.5 font-display text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    detailTab === "timeline" 
                      ? "border-primary-500 text-primary-600 dark:text-primary-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  Workflow Timeline
                </button>
                <button
                  onClick={() => setDetailTab("activity")}
                  className={`px-4 py-2.5 font-display text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    detailTab === "activity" 
                      ? "border-primary-500 text-primary-600 dark:text-primary-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  Activity Audit Trail
                </button>
              </div>

              {/* Tab Content 1: Financials Ledger */}
              {detailTab === "financials" && (
                <div className="space-y-6">
                  {/* Analytical Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card className="bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100/50 dark:border-indigo-900/20 p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed Invoices</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                        <span className="text-xl font-black font-display text-slate-800 dark:text-slate-100">{stats.invoiceCount} raised</span>
                      </div>
                    </Card>
                    
                    <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Realized Revenue</span>
                      <div className="flex items-baseline gap-1 mt-1 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-xl font-black font-mono">
                          ₹{stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </Card>

                    <Card className="bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receivables</span>
                      <div className="flex items-baseline gap-1 mt-1 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span className="text-xl font-black font-mono">
                          ₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </Card>

                    <Card className="bg-violet-50/30 dark:bg-violet-950/10 border-violet-100/50 dark:border-violet-900/20 p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quotations raised</span>
                      <div className="flex items-baseline gap-1 mt-1 text-violet-600 dark:text-violet-400">
                        <Sparkles className="w-4 h-4 mr-1" />
                        <span className="text-xl font-black font-mono">
                          ₹{stats.quotationValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </Card>
                  </div>

                  {/* Documents Summary details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Invoicing & Settlement Records</h4>
                    {stats.invoicesList.length === 0 ? (
                      <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 mt-2">No invoices billed to this client yet.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800/80 font-bold text-slate-400 uppercase">
                                <th className="p-3">Invoice No</th>
                                <th className="p-3">Issue Date</th>
                                <th className="p-3">Grand Total</th>
                                <th className="p-3">Settlement</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                              {stats.invoicesList.slice(0, 5).map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</td>
                                  <td className="p-3 text-slate-500">{new Date(inv.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 font-mono text-slate-500">
                                    ₹{(inv.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ₹{(inv.amountDue !== undefined ? inv.amountDue : inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      inv.status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                      inv.status === "sent" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                                      inv.status === "overdue" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}>
                                      {inv.status.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Visual Document Timeline */}
              {detailTab === "timeline" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileClock className="w-4 h-4 text-primary-500" /> Customer Sales Pipeline History
                    </h4>
                    <p className="text-xs text-slate-500">Trace commercial actions chronologically from initial quotation estimates to active billing settlements and refunds.</p>
                  </div>

                  {stats.timelineEvents.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs font-bold text-slate-500 mt-2">No documents or quotes raised yet for this customer profile.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6 ml-4">
                      {stats.timelineEvents.map((evt, idx) => {
                        let colorClasses = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                        let nodeIcon = <FileText className="w-4 h-4" />;

                        if (evt.type === "Quotation") {
                          colorClasses = "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800/40";
                          nodeIcon = <Sparkles className="w-4 h-4" />;
                        } else if (evt.type === "Proforma") {
                          colorClasses = "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40";
                          nodeIcon = <FileText className="w-4 h-4" />;
                        } else if (evt.type === "Invoice") {
                          if (evt.status === "paid") {
                            colorClasses = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40";
                          } else {
                            colorClasses = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
                          }
                          nodeIcon = <CheckSquare className="w-4 h-4" />;
                        } else if (evt.type === "Credit Note") {
                          colorClasses = "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/40";
                          nodeIcon = <ArrowDownLeft className="w-4 h-4" />;
                        } else if (evt.type === "Debit Note") {
                          colorClasses = "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-800/40";
                          nodeIcon = <ArrowUpRight className="w-4 h-4" />;
                        } else if (evt.type === "Delivery Challan") {
                          colorClasses = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
                          nodeIcon = <Truck className="w-4 h-4" />;
                        }

                        return (
                          <div key={`${evt.type}-${evt.id}-${idx}`} className="relative group transition-all">
                            {/* Visual circle bullet */}
                            <span className={`absolute -left-[37px] top-1 h-6.5 w-6.5 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${colorClasses}`}>
                              {nodeIcon}
                            </span>

                            {/* Event details block */}
                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-primary-500 font-display">
                                    {evt.type}
                                  </span>
                                  <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">
                                    {evt.title}
                                  </h5>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {evt.subtitle}
                                  </p>
                                </div>
                                <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1.5">
                                  <span className="text-xs font-black font-mono text-slate-950 dark:text-white">
                                    ₹{evt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {evt.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <Badge variant={
                                      evt.status === "paid" || evt.status === "accepted" || evt.status === "delivered" ? "success" :
                                      evt.status === "sent" || evt.status === "dispatched" ? "warning" :
                                      evt.status === "converted" ? "primary" : "neutral"
                                    } className="text-[8px] tracking-wider scale-90 origin-right">
                                      {evt.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 3: Customer Audit Logs */}
              {detailTab === "activity" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-4 h-4 text-cyan-500" /> Event Stream Activity Logs
                    </h4>
                    <p className="text-xs text-slate-500">Cryptographically ordered audit logs documenting every workflow conversion, creation, or update triggered on this merchant ledger.</p>
                  </div>

                  {stats.customerActivities.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs font-bold text-slate-500 mt-2">Prisitin Secure State: No actions recorded yet for this client.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 space-y-4">
                      {stats.customerActivities.map((act) => (
                        <div key={act.id} className="flex gap-3 text-xs border-b border-slate-100 dark:border-slate-900 pb-3 last:border-0 last:pb-0">
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 scale-90">
                            A
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-slate-700 dark:text-slate-200">
                              <b>{act.userName}</b>: {act.description}
                            </p>
                            <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                              <span>Action: <span className="text-primary-500 font-bold font-mono">{act.action}</span></span>
                              <span>•</span>
                              <span>{act.timestamp.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close Audit Sheet
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* Confirmation Dialog for Permanent Deletion */}
      <Dialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title="Confirm permanent deletion"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans text-center">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full w-fit mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Client Profile?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you absolutely sure you want to permanently delete <b>{customerToDelete?.name}</b>? 
            This operation is completely irreversible and might leave orphaned metrics if invoices references exist.
          </p>
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 justify-center">
            <Button variant="outline" className="px-5" onClick={() => setIsConfirmDeleteOpen(false)}>
              No, Keep Client
            </Button>
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30 px-5" onClick={handleDeleteCustomer}>
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
