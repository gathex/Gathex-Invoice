import React, { useState, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Payment } from "../../types";
import { Badge } from "../ui/Badge";
import { PaymentStatusBadge } from "../ui/PaymentStatusBadge";
import { Button } from "../ui/Button";
import { FileText, RotateCcw, Activity } from "lucide-react";
import { RefundDialog } from "./RefundDialog";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../../supabase/config";

interface PaymentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  businessId: string;
}

export function PaymentDetailsDialog({ isOpen, onClose, payment, businessId }: PaymentDetailsDialogProps) {
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { user } = useAuth();
  const toast = useToast();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!payment || !user) return;
    setIsVerifying(true);
    try {
      await supabase
        .from('payments')
        .update({ status: "paid" })
        .eq('id', payment.id);

      const { data: invData } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('id', payment.invoiceId)
        .single();

      if (invData) {
        const grandTotal = Number(invData.grand_total || 0);
        const currentPaid = Number(invData.amount_paid || 0);
        const currentDue = Number(invData.amount_due || 0);
        const newDue = Math.max(0, currentDue - payment.amount);
        const newPaid = currentPaid + payment.amount;
        let newStatus = invData.status;
        if (newDue <= 0) newStatus = "paid";
        else if (newPaid > 0) newStatus = "partially_paid";

        await supabase
          .from('sales_documents')
          .update({
            amount_paid: newPaid,
            amount_due: newDue,
            status: newStatus
          })
          .eq('id', payment.invoiceId);
      }

      await supabase.from('payment_transactions').insert({
        payment_id: payment.id,
        business_id: businessId,
        invoice_id: payment.invoiceId,
        owner_uid: user.uid,
        method_type: payment.paymentMethod,
        amount: payment.amount,
        notes: "Payment manually verified"
      });

      toast.success("Verified", "Payment verified successfully.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error", "Failed to verify payment.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!payment) return;
    const fetchTimeline = async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', payment.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data.map(d => ({
          id: d.id,
          paymentId: d.payment_id,
          businessId: d.business_id,
          date: d.created_at ? new Date(d.created_at) : new Date(),
          type: d.notes?.includes("verify") ? "verification" : "transaction",
          amount: Number(d.amount || 0),
          description: d.notes || "Transaction logged",
          recordedBy: d.owner_uid
        })));
      }
    };
    fetchTimeline();
  }, [payment, businessId]);


  if (!payment) return null;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Payment Details" size="lg">
      <div className="space-y-6 pt-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              {formatINR(payment.amount)}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {payment.paymentDate ? (new Date(payment.paymentDate)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : "Unknown Date"}
            </p>
          </div>
          <PaymentStatusBadge status={payment.status} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="font-medium text-slate-900 dark:text-white">{payment.customerName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Reference</p>
            <p className="font-medium font-mono text-indigo-600 dark:text-indigo-400">{payment.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
            <p className="font-medium text-slate-900 dark:text-white capitalize">{payment.paymentMethod?.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction ID</p>
            <p className="font-medium font-mono text-slate-900 dark:text-white">{payment.transactionId || "N/A"}</p>
          </div>
        </div>

        {payment.notes && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{payment.notes}</p>
          </div>
        )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Timeline & Audit</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-1">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Payment Recorded</p>
                <p className="text-xs text-slate-500">{payment.createdAt ? (new Date(payment.createdAt)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : "Unknown"}</p>
                {payment.notes && <p className="text-xs text-slate-600 mt-1">Note: {payment.notes}</p>}
              </div>
            </div>
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-1">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{tx.type} Issued</p>
                  <p className="text-xs text-slate-500">{tx.date ? (tx.date?.toDate ? tx.date.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date(tx.date).toLocaleString()) : "Unknown"}</p>
                  <p className="text-xs text-slate-600 mt-1 font-bold">Amount: {formatINR(tx.amount)}</p>
                  {tx.reason && <p className="text-xs text-slate-600">Reason: {tx.reason}</p>}
                  {tx.reference && <p className="text-xs text-slate-600 font-mono">Ref: {tx.reference}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            {payment.status !== 'refunded' && payment.amount > 0 && (
              <Button 
                variant="outline" 
                className="text-rose-600 hover:bg-rose-50 border-rose-200" 
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setIsRefundOpen(true)}
              >
                Issue Refund
              </Button>
            )}
          </div>
            {(payment.status === 'pending' || payment.status === 'processing') && payment.paymentMethod === 'upi' ? (
              <Button 
                variant="primary" 
                className="mr-3"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying..." : "Verify Payment"}
              </Button>
            ) : null}
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
      <RefundDialog 
        isOpen={isRefundOpen} 
        onClose={() => {
          setIsRefundOpen(false);
          onClose(); // maybe close both?
        }} 
        payment={payment} 
        businessId={businessId} 
      />
    </Dialog>
  );
}
