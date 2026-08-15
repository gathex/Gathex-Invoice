import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { Payment } from "../../types";
import { supabase } from "../../supabase/config";

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  businessId: string;
}

export function RefundDialog({ isOpen, onClose, payment, businessId }: RefundDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  if (!payment) return null;

  const handleRefund = async () => {
    if (refundType === "partial" && (!refundAmount || isNaN(Number(refundAmount)))) {
      toast.error("Invalid Amount", "Please enter a valid refund amount");
      return;
    }
    const amountToRefund = refundType === "full" ? payment.amount : Number(refundAmount);
    
    if (amountToRefund <= 0 || amountToRefund > payment.amount) {
      toast.error("Invalid Amount", "Refund amount must be greater than 0 and less than or equal to the original payment");
      return;
    }

    setLoading(true);
    try {
      // 1. Create a refund record in payments
      await supabase.from('payments').insert({
        business_id: businessId,
        owner_uid: payment.ownerUid,
        invoice_id: payment.invoiceId,
        invoice_number: payment.invoiceNumber,
        customer_id: payment.customerId || null,
        customer_name: payment.customerName,
        amount: -amountToRefund,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: payment.paymentMethod,
        status: "refunded",
        transaction_id: reference || `REF-${payment.id}`,
        notes: `Refund for payment ${payment.id}. Reason: ${reason}`
      });

      // 2. Add to payment_transactions
      await supabase.from('payment_transactions').insert({
        business_id: businessId,
        payment_id: payment.id,
        invoice_id: payment.invoiceId,
        owner_uid: payment.ownerUid,
        method_type: payment.paymentMethod,
        amount: amountToRefund,
        notes: reason || null
      });

      // 3. Audit Log
      await supabase.from('payment_audit_logs').insert({
        business_id: businessId,
        payment_id: payment.id,
        invoice_id: payment.invoiceId,
        owner_uid: payment.ownerUid,
        action: "REFUND_ISSUED",
        description: `${refundType === 'full' ? 'Full' : 'Partial'} refund of ${amountToRefund} issued.`
      });

      // 4. Update sales_documents table
      const { data: invData } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('id', payment.invoiceId)
        .single();

      if (invData) {
        const grandTotal = Number(invData.grand_total || 0);
        const currentPaid = Number(invData.amount_paid || 0);
        const newAmountPaid = Math.max(0, currentPaid - amountToRefund);
        const newAmountDue = grandTotal - newAmountPaid;
        let newInvStatus = invData.status;
        if (newAmountDue === grandTotal) {
           newInvStatus = 'sent';
        } else if (newAmountDue > 0) {
           newInvStatus = 'partially_paid';
        }
        await supabase.from('sales_documents').update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          status: newInvStatus
        }).eq('id', payment.invoiceId);
      }

      toast.success("Refund Issued", "The refund has been successfully recorded.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error", "Failed to issue refund.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Issue Refund">
      <div className="space-y-4 pt-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Refund Type</label>
          <Select value={refundType} onChange={(e) => setRefundType(e.target.value as any)}>
            <option value="full">Full Refund (₹{payment.amount})</option>
            <option value="partial">Partial Refund</option>
          </Select>
        </div>
        {refundType === "partial" && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Refund Amount</label>
            <Input 
              type="number" 
              value={refundAmount} 
              onChange={(e) => setRefundAmount(e.target.value)} 
              max={payment.amount}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Overcharged, cancelled..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Reference Number (Optional)</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank Ref..." />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleRefund} loading={loading}>Issue Refund</Button>
        </div>
      </div>
    </Dialog>
  );
}
