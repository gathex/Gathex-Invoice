import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Invoice, BusinessDetails, Payment } from "../../../types";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { useToast } from "../../ui/Toast";
import { supabase } from "../../../supabase/config";
import { Search, Filter, QrCode, Download, CreditCard, CheckCircle2, Eye, ShieldCheck, Loader2, Receipt } from "lucide-react";
import { QRPaymentCard } from "../../ui/QRPaymentCard";
import { createReceiptFromPayment } from "../../../services/receiptService";
import { ReceiptPreviewDialog } from "../ReceiptPreviewDialog";

export function PortalInvoices({ invoices, formatINR, onRefresh }: { invoices: Invoice[], formatINR: (v: number) => string, onRefresh: () => void }) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partially_paid" | "overdue" | "unpaid">("all");
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [utr, setUtr] = useState("");
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Receipt viewing states
  const [activePaymentForReceipt, setActivePaymentForReceipt] = useState<Payment | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [fetchingReceipt, setFetchingReceipt] = useState(false);

  const handleViewReceipt = async (invoiceId: string) => {
    setFetchingReceipt(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .limit(1)
        .single();

      if (data) {
        const paymentObj: Payment = {
          ...data,
          paymentDate: new Date(data.payment_date)
        };
        setActivePaymentForReceipt(paymentObj);
        setIsReceiptOpen(true);
      } else {
        toast.error("Receipt Not Found", "No payment logs could be verified on this invoice ledger.");
      }
    } catch (e) {
      console.error("Error loading receipt:", e);
      toast.error("Verification Error", "Failed to query secure payment ledger.");
    } finally {
      setFetchingReceipt(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "paid") return matchesSearch && inv.status === "paid";
    if (statusFilter === "partially_paid") return matchesSearch && inv.status === "partially_paid";
    if (statusFilter === "overdue") return matchesSearch && inv.status === "overdue";
    if (statusFilter === "unpaid") return matchesSearch && (inv.status === "sent" || inv.status === "draft");
    return matchesSearch;
  });

  // Handle payment simulation
  const handlePaymentSuccess = async () => {
    if (!selectedInvoiceForPayment) return;
    if (!utr.trim()) {
      toast.error("UTR Required", "Please enter the 12-digit transaction reference number (UTR).");
      return;
    }

    setPaymentProcessing(true);
    try {
      const payAmount = selectedInvoiceForPayment.amountDue;
      
      const { data: payRes, error: payErr } = await supabase
        .from('payments')
        .insert({
          business_id: selectedInvoiceForPayment.businessId,
          owner_uid: selectedInvoiceForPayment.ownerUid,
          invoice_id: selectedInvoiceForPayment.id,
          invoice_number: selectedInvoiceForPayment.invoiceNumber,
          customer_id: selectedInvoiceForPayment.customerId || null,
          customer_name: selectedInvoiceForPayment.customerDetails?.name || "Customer",
          customer_email: selectedInvoiceForPayment.customerDetails?.email || null,
          amount: payAmount,
          currency: "INR",
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: "upi",
          payment_type: "full",
          status: "paid",
          transaction_id: utr.trim(),
          reference_number: utr.trim(),
          notes: "UPI payment settled via customer self-service portal.",
          recorded_by: "customer_portal"
        })
        .select('id')
        .single();

      if (payErr) throw payErr;

      // 2. Update Invoice settlement details
      const newAmountPaid = (selectedInvoiceForPayment.amountPaid || 0) + payAmount;
      await supabase
        .from('sales_documents')
        .update({
          amount_paid: newAmountPaid,
          amount_due: 0,
          status: "paid"
        })
        .eq('id', selectedInvoiceForPayment.id);

      // 3. Log Document Activity
      await supabase.from('document_activities').insert({
        business_id: selectedInvoiceForPayment.businessId,
        owner_uid: selectedInvoiceForPayment.ownerUid,
        document_id: selectedInvoiceForPayment.id,
        document_type: "invoice",
        document_number: selectedInvoiceForPayment.invoiceNumber,
        action: "payment_added",
        description: `Payment of ${formatINR(payAmount)} received via UPI. Invoice is now fully settled.`,
        user_id: "customer-portal",
        user_name: selectedInvoiceForPayment.customerDetails.name
      });

      toast.success("Payment Received!", "Your invoice has been successfully settled. A receipt has been issued.");
      setSelectedInvoiceForPayment(null);
      setUtr("");
      onRefresh(); // trigger reload of dashboard
    } catch (err) {
      console.error("Error writing payment:", err);
      toast.error("Payment Failed", "An error occurred while logging the payment transaction.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "primary";
      case "partially_paid": return "warning";
      case "overdue": return "danger";
      case "sent": return "default";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Invoices</h2>
          <p className="text-xs sm:text-sm text-slate-500">Track and settle outstanding invoices securely.</p>
        </div>

        {/* Invoice Filters */}
        <div className="flex flex-wrap gap-2">
          {(["all", "unpaid", "partially_paid", "paid", "overdue"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${statusFilter === f ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"}`}
            >
              {f === "all" ? "All Invoices" : f === "unpaid" ? "Pending" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-3.5 top-3 text-slate-400"><Search className="w-4 h-4" /></span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by invoice number (e.g. GAT-2026-004)..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">No invoices match your selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Invoice No.</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Issue Date</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Due Date</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Grand Total</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Balance Due</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredInvoices.map(inv => {
                  const issueStr = inv.issueDate?.toLocaleDateString ? inv.issueDate.toLocaleDateString() : new Date(inv.issueDate).toLocaleDateString();
                  const dueStr = inv.dueDate?.toLocaleDateString ? inv.dueDate.toLocaleDateString() : new Date(inv.dueDate).toLocaleDateString();
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{issueStr}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{dueStr}</td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatINR(inv.grandTotal)}</td>
                      <td className="p-4 text-right font-mono font-bold text-rose-500">{formatINR(inv.amountDue)}</td>
                      <td className="p-4">
                        <Badge variant={getBadgeVariant(inv.status)}>
                          {inv.status === "sent" ? "unpaid" : inv.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => window.open(`#/public-invoice?id=${inv.id}`, '_blank')}
                        >
                          View/Print
                        </Button>
                        {(inv.status === "paid" || inv.status === "partially_paid" || (inv.amountPaid && inv.amountPaid > 0)) && (
                          <Button
                            variant="outline"
                            icon={fetchingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Receipt className="w-3.5 h-3.5 text-slate-500" />}
                            onClick={() => handleViewReceipt(inv.id)}
                            disabled={fetchingReceipt}
                            className="text-xs font-bold border-slate-200 dark:border-slate-800"
                          >
                            Receipt
                          </Button>
                        )}
                        {inv.amountDue > 0 && (
                          <Button
                            variant="primary"
                            icon={<QrCode className="w-3.5 h-3.5" />}
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dynamic UPI Payment Modal */}
      <AnimatePresence>
        {selectedInvoiceForPayment && (() => {
          const upiId = "gathex@upi";
          const payeeName = "Gathex Invoicing Solution";
          const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${selectedInvoiceForPayment.amountDue}&cu=INR&tn=${encodeURIComponent(`Pay ${selectedInvoiceForPayment.invoiceNumber}`)}`;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setSelectedInvoiceForPayment(null)} 
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                transition={{ duration: 0.2 }}
                className="relative max-w-md w-full z-10"
              >
                <Card className="w-full p-6 border-slate-800 bg-slate-900 text-white space-y-6 shadow-2xl relative" hoverable={false}>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold tracking-tight flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  UPI Invoice Settlement
                </h3>
                <p className="text-slate-400 text-xs">Scan the code with any UPI app (GPay, PhonePe, BHIM) to pay instantly.</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-mono font-bold text-indigo-400">{selectedInvoiceForPayment.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span className="font-bold text-rose-500">{formatINR(selectedInvoiceForPayment.amountDue)}</span>
                </div>
              </div>

              {/* UPI QR Display Component */}
              <div className="flex justify-center py-2">
                <QRPaymentCard
                  upiId={upiId}
                  payeeName={payeeName}
                  upiString={upiString}
                  size={180}
                />
              </div>

            {/* Simulated payment log */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm Your Transaction</p>
              <div>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))} // only digits
                  placeholder="Enter 12-Digit UPI Ref / UTR No."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="outline" onClick={() => { setSelectedInvoiceForPayment(null); setUtr(""); }} className="border-slate-800 text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={paymentProcessing}
                  onClick={handlePaymentSuccess}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Confirm Settlement
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  })()}
</AnimatePresence>

    {/* Receipt Dialog Hook */}
    <ReceiptPreviewDialog 
      isOpen={isReceiptOpen}
      onClose={() => {
        setIsReceiptOpen(false);
        setActivePaymentForReceipt(null);
      }}
      payment={activePaymentForReceipt}
    />

    </div>
  );
}
