import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../supabase/config";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PaymentStatusBadge } from "../ui/PaymentStatusBadge";
import { PaymentDashboard } from "./PaymentDashboard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";
import { Dialog } from "../ui/Dialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { ReceiptPreviewDialog } from "./ReceiptPreviewDialog";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { Payment, Invoice } from "../../types";
import { CreditCard, Search, Plus, Calendar, QrCode, Download, Eye, IndianRupee, Trash2, ArrowUpRight } from "lucide-react";

export function PaymentsView() {
  const { user, activeBusiness } = useAuth();
  const toast = useToast();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<Payment | null>(null);
  
  // Stats
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);

  useEffect(() => {
    if (!user || !activeBusiness) return;

    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        let received = 0;
        const mapped = data.map(d => {
          const amt = Number(d.amount || 0);
          if (d.status === 'paid' || d.status === 'partially_paid') received += amt;
          return {
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            invoiceId: d.invoice_id,
            invoiceNumber: d.invoice_number,
            customerId: d.customer_id,
            customerName: d.customer_name,
            amount: amt,
            currency: d.currency || "INR",
            paymentDate: d.payment_date ? new Date(d.payment_date) : new Date(),
            paymentMethod: d.payment_method,
            status: d.status,
            transactionId: d.transaction_id,
            referenceNumber: d.reference_number,
            notes: d.notes,
            recordedBy: d.recorded_by,
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
          } as Payment;
        });
        setPayments(mapped);
        setTotalReceived(received);
      }
    };

    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('doc_type', 'invoice');

      if (!error && data) {
        let outstanding = 0;
        let overdue = 0;
        const now = new Date();

        const mapped = data.map(d => {
          const due = Number(d.amount_due || 0);
          const dueDate = d.due_date ? new Date(d.due_date) : new Date();
          if (d.status !== 'paid' && d.status !== 'void') {
            outstanding += due;
            if (dueDate < now) overdue += due;
          }
          return {
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            invoiceNumber: d.doc_number,
            status: d.status,
            customerId: d.customer_id,
            customerDetails: d.customer_details || {},
            issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
            dueDate,
            items: [],
            subTotal: Number(d.sub_total || 0),
            totalDiscount: Number(d.total_discount || 0),
            totalTaxableAmount: Number(d.total_taxable_amount || 0),
            totalCgst: Number(d.total_cgst || 0),
            totalSgst: Number(d.total_sgst || 0),
            totalIgst: Number(d.total_igst || 0),
            grandTotal: Number(d.grand_total || 0),
            amountPaid: Number(d.amount_paid || 0),
            amountDue: due,
            createdAt: d.created_at ? new Date(d.created_at) : new Date(),
            updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
          } as any;
        });

        setInvoices(mapped.filter(i => i.status !== 'paid' && i.status !== 'void'));
        setTotalOutstanding(outstanding);
        setTotalOverdue(overdue);
      }
    };

    fetchPayments();
    fetchInvoices();

    const channelP = supabase.channel(`payments-${activeBusiness.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchPayments())
      .subscribe();

    const channelI = supabase.channel(`sales_docs-${activeBusiness.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${activeBusiness.id}` }, () => fetchInvoices())
      .subscribe();

    return () => {
      supabase.removeChannel(channelP);
      supabase.removeChannel(channelI);
    };
  }, [user, activeBusiness]);

  
  const handleExport = () => {
    // Generate CSV
    const rows = [
      ["Receipt No", "Invoice", "Customer", "Date", "Method", "Status", "Amount", "Reference"]
    ];
    filteredPayments.forEach(p => {
      rows.push([
        p.id.substring(0,8).toUpperCase(),
        p.invoiceNumber,
        p.customerName,
        p.paymentDate.toLocaleDateString(),
        p.paymentMethod.replace("_", " "),
        p.status,
        p.amount.toString(),
        p.transactionId || ""
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Export Successful", "Payment data has been exported to CSV");
  };

  let filteredPayments = payments.filter(p => {
    const matchesSearch = p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange !== "all") {
      const now = new Date();
      const pDate = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
      if (dateRange === "today") {
        matchesDate = pDate.toDateString() === now.toDateString();
      } else if (dateRange === "this_month") {
        matchesDate = pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      } else if (dateRange === "last_30_days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchesDate = pDate >= thirtyDaysAgo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });
  
  if (sortBy === "date_desc") {
    filteredPayments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  } else if (sortBy === "date_asc") {
    filteredPayments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  } else if (sortBy === "amount_desc") {
    filteredPayments.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === "amount_asc") {
    filteredPayments.sort((a, b) => a.amount - b.amount);
  }
  
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold font-display text-slate-900 dark:text-white">Payments Received</h1>
          <p className="text-sm text-slate-500">Log incoming customer settlements and match transaction IDs against invoices</p>
        </div>
        
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsRecordPaymentOpen(true)}>
          Record Invoice Settlement
        </Button>
      </div>

      <PaymentDashboard 
        totalReceived={totalReceived}
        totalOutstanding={totalOutstanding}
        totalOverdue={totalOverdue}
        payments={payments}
        invoices={invoices}
      />

      
      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Search by client, invoice, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </Select>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-40">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-40">
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </Select>
          <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>


      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-12 h-12 text-slate-400" />}
          title="No Settlements Found"
          description="Your verified customer receipts and UPI bank transaction settlements will appear in this ledger."
          action={<Button variant="primary" onClick={() => setIsRecordPaymentOpen(true)}>Record Settlement</Button>}
        />
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/60 dark:border-slate-800">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/60">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt No.</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice linked</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Name</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Date</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Channel</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Settle Amount</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {paginatedPayments.map((p, index) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.04, 0.4) }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                  >
                    <td className="p-4 text-xs font-bold font-mono text-slate-500">{p.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-4 text-sm font-bold font-mono text-primary-600 dark:text-primary-400">{p.invoiceNumber}</td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.customerName}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{p.paymentDate.toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold text-slate-600 dark:text-slate-400">{p.paymentMethod.replace('_', ' ')}</span>
                      {p.transactionId && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.transactionId}</div>}
                    </td>
                    <td className="p-4">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="p-4 text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => setSelectedPaymentForDetails(p)} icon={<Eye className="w-4 h-4" />}>Details</Button>
                      <Button variant="outline" onClick={() => setSelectedPaymentForReceipt(p)}>Receipt</Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/40">
            {paginatedPayments.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.04, 0.4) }}
                className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.customerName}</div>
                    <div className="text-xs font-mono text-primary-600 dark:text-primary-400 mt-0.5">{p.invoiceNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.paymentDate.toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={p.status} />
                    <span className="capitalize text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                      {p.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setSelectedPaymentForDetails(p)} icon={<Eye className="w-3 h-3" />} />
                    <Button variant="outline" onClick={() => setSelectedPaymentForReceipt(p)}>Receipt</Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredPayments.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredPayments.length}</span> payments
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Prev</Button>
                <div className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">{currentPage} / {totalPages}</div>
                <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>

      )}
      
      {activeBusiness && (
        <RecordPaymentDialog 
          isOpen={isRecordPaymentOpen} 
          onClose={() => setIsRecordPaymentOpen(false)} 
          businessId={activeBusiness.id}
          invoices={invoices}
        />
      )}
    </div>
  );
}
