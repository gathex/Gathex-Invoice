import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase/config";
import { useAuth } from "../../context/AuthContext";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { PaymentMethodConfig, Invoice, Payment, PaymentStatus } from "../../types";
import { IndianRupee, Plus, Trash2, Upload } from "lucide-react";
import { createReceiptFromPayment } from "../../services/receiptService";

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  invoices: Invoice[];
  defaultInvoiceId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  businessId,
  invoices,
  defaultInvoiceId,
  onSuccess
}: RecordPaymentDialogProps) {
  const { user, activeBusiness } = useAuth();
  const toast = useToast();
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(defaultInvoiceId || (invoices.length > 0 ? invoices[0].id : ""));
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  
  const [fetchingMethods, setFetchingMethods] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [transactionId, setTransactionId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [walletName, setWalletName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [mixedRows, setMixedRows] = useState<Array<{ methodId: string; amount: number; transactionId?: string }>>([
    { methodId: "", amount: 0 }
  ]);

  useEffect(() => {
    if (defaultInvoiceId) {
      setSelectedInvoiceId(defaultInvoiceId);
    } else if (invoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [defaultInvoiceId, invoices]);

  useEffect(() => {
    if (isOpen && businessId) {
      fetchMethods();
    }
  }, [isOpen, businessId]);

  const fetchMethods = async () => {
    setFetchingMethods(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          methodType: d.method_type,
          displayName: d.display_name,
          description: d.description,
          icon: d.icon,
          isEnabled: !!d.is_enabled,
          displayOrder: d.display_order,
          isDefault: !!d.is_default
        } as PaymentMethodConfig));

        setMethods(mapped);
        const defaultMethod = mapped.find(m => m.isDefault);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (mapped.length > 0) {
          setSelectedMethodId(mapped[0].id);
        }
      } else {
        // Seed standard default payment methods for this business
        const userId = user?.id || user?.uid || "";
        const defaults = [
          { method_type: "cash", display_name: "Cash", description: "Cash payments", is_enabled: true, is_default: false, display_order: 1 },
          { method_type: "upi", display_name: "UPI", description: "Google Pay, PhonePe, Paytm", is_enabled: true, is_default: true, display_order: 2 },
          { method_type: "bank_transfer", display_name: "Bank Transfer", description: "NEFT / RTGS / IMPS", is_enabled: true, is_default: false, display_order: 3 },
          { method_type: "credit_card", display_name: "Credit Card", description: "Visa, Mastercard", is_enabled: true, is_default: false, display_order: 4 },
          { method_type: "debit_card", display_name: "Debit Card", description: "Visa Debit, RuPay", is_enabled: true, is_default: false, display_order: 5 },
          { method_type: "cheque", display_name: "Cheque", description: "Physical Cheque", is_enabled: true, is_default: false, display_order: 6 },
          { method_type: "mixed", display_name: "Mixed Payment", description: "Split across multiple methods", is_enabled: true, is_default: false, display_order: 10 }
        ].map(d => ({
          ...d,
          business_id: businessId,
          owner_uid: userId
        }));

        const { data: inserted } = await supabase.from('payment_methods').insert(defaults).select('*');
        if (inserted && inserted.length > 0) {
          const mapped = inserted.map(d => ({
            id: d.id,
            businessId: d.business_id,
            ownerUid: d.owner_uid,
            methodType: d.method_type,
            displayName: d.display_name,
            description: d.description,
            icon: d.icon,
            isEnabled: !!d.is_enabled,
            displayOrder: d.display_order,
            isDefault: !!d.is_default
          } as PaymentMethodConfig));
          setMethods(mapped);
          const defaultMethod = mapped.find(m => m.isDefault);
          if (defaultMethod) {
            setSelectedMethodId(defaultMethod.id);
          } else if (mapped.length > 0) {
            setSelectedMethodId(mapped[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMethods(false);
    }
  };

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const selectedMethod = methods.find(m => m.id === selectedMethodId);
  const isMixed = selectedMethod?.methodType === "mixed";

  useEffect(() => {
    if (selectedInvoice && !isMixed && amount === "") {
      setAmount(selectedInvoice.amountDue || 0);
    }
  }, [selectedInvoice, isMixed]);

  const totalMixedAmount = mixedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedInvoice || !selectedMethod) return;

    const userId = user.id || user.uid;
    const paymentAmount = isMixed ? totalMixedAmount : Number(amount);
    
    if (paymentAmount <= 0) return toast.error("Invalid Amount", "Payment must be greater than zero.");
    if (paymentAmount > selectedInvoice.amountDue) return toast.error("Overpayment", "Amount exceeds balance.");
    if (isMixed && mixedRows.some(r => !r.methodId || r.amount <= 0)) {
      return toast.error("Invalid Rows", "Please complete all mixed payment rows.");
    }

    setLoading(true);
    try {
      const newDue = selectedInvoice.amountDue - paymentAmount;
      const newPaid = (selectedInvoice.amountPaid || 0) + paymentAmount;
      let newInvoiceStatus: string = selectedInvoice.status;
      if (newDue <= 0) newInvoiceStatus = 'paid';
      else if (newPaid > 0) newInvoiceStatus = 'partially_paid';

      const paymentStatus: PaymentStatus = (selectedMethod.methodType === "upi" && !isMixed) ? "pending" : "paid";

      const { data: payData, error: payErr } = await supabase
        .from('payments')
        .insert({
          business_id: businessId,
          owner_uid: userId,
          invoice_id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoiceNumber,
          customer_id: selectedInvoice.customerId || null,
          customer_name: selectedInvoice.customerDetails?.name || (selectedInvoice as any).customerName || "Customer",
          amount: paymentAmount,
          currency: "INR",
          payment_date: paymentDate,
          payment_method: selectedMethod.methodType,
          payment_type: "incoming",
          status: paymentStatus,
          transaction_id: transactionId || null,
          reference_number: referenceNumber || null,
          notes: notes || null,
          recorded_by: userId
        })
        .select('id')
        .single();

      if (payErr) throw payErr;
      const paymentId = payData.id;

      if (isMixed) {
        for (const row of mixedRows) {
          const rowMethod = methods.find(m => m.id === row.methodId);
          if (!rowMethod) continue;
          await supabase.from('payment_transactions').insert({
            payment_id: paymentId,
            business_id: businessId,
            invoice_id: selectedInvoice.id,
            customer_id: selectedInvoice.customerId || null,
            owner_uid: userId,
            method_type: rowMethod.methodType,
            amount: Number(row.amount),
            currency: "INR",
            transaction_id: row.transactionId || null
          });
        }
      } else {
        await supabase.from('payment_transactions').insert({
          payment_id: paymentId,
          business_id: businessId,
          invoice_id: selectedInvoice.id,
          customer_id: selectedInvoice.customerId || null,
          owner_uid: userId,
          method_type: selectedMethod.methodType,
          amount: paymentAmount,
          currency: "INR",
          transaction_id: transactionId || null,
          reference_number: referenceNumber || null,
          bank_name: bankName || null,
          wallet_name: walletName || null,
          cheque_details: selectedMethod.methodType === 'cheque' ? { chequeNumber, issueDate: new Date(), clearanceStatus: 'pending' } : null,
          card_details: (selectedMethod.methodType === 'credit_card' || selectedMethod.methodType === 'debit_card') ? { cardBrand, last4: cardLast4, authCode: transactionId } : null
        });
      }

      if (paymentStatus === "paid") {
        await supabase
          .from('sales_documents')
          .update({ amount_paid: newPaid, amount_due: newDue, status: newInvoiceStatus })
          .eq('id', selectedInvoice.id);
      }

      await supabase.from('payment_audit_logs').insert({
        payment_id: paymentId,
        business_id: businessId,
        invoice_id: selectedInvoice.id,
        customer_id: selectedInvoice.customerId || null,
        owner_uid: userId,
        action: "RECORD_PAYMENT",
        description: `Logged incoming payment of ₹${paymentAmount} via ${selectedMethod.displayName}`,
        performed_by: userId
      });

      if (paymentStatus === "paid" && activeBusiness) {
        const fullPaymentDoc: Payment = {
          id: paymentId,
          businessId,
          ownerUid: userId,
          invoiceId: selectedInvoice.id,
          invoiceNumber: selectedInvoice.invoiceNumber,
          customerId: selectedInvoice.customerId,
          customerName: selectedInvoice.customerDetails?.name || (selectedInvoice as any).customerName || "Customer",
          amount: paymentAmount,
          currency: "INR",
          paymentDate: new Date(paymentDate),
          paymentMethod: selectedMethod.methodType,
          paymentType: "incoming",
          status: "paid",
          transactionId: transactionId || undefined,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
          recordedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await createReceiptFromPayment(fullPaymentDoc, activeBusiness, selectedInvoice);
      }

      toast.success("Payment Recorded", `Payment of ₹${paymentAmount} recorded successfully.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed", "Error saving payment record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Record Payment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        {fetchingMethods ? (
          <div className="p-8 text-center text-slate-500">Loading configurations...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Select Invoice</label>
                <Select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} required>
                  <option value="">-- Choose Pending Invoice --</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerDetails.name} (Due: ₹{inv.amountDue})
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Payment Method</label>
                <Select value={selectedMethodId} onChange={(e) => setSelectedMethodId(e.target.value)} required>
                  {methods.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isMixed ? (
                    <Input 
                      type="number" 
                      label="Payment Amount (₹) *" 
                      value={amount} 
                      onChange={e => setAmount(Number(e.target.value))} 
                      max={selectedInvoice.amountDue}
                      step="0.01"
                      required 
                    />
                  ) : (
                    <div>
                      <p className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Total Payment</p>
                      <p className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400 py-1">₹{totalMixedAmount}</p>
                    </div>
                  )}
                  <Input 
                    type="date" 
                    label="Payment Date *" 
                    value={paymentDate} 
                    onChange={e => setPaymentDate(e.target.value)} 
                    required 
                  />
                </div>

                {!isMixed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Transaction ID / Reference No" 
                      value={transactionId} 
                      onChange={e => setTransactionId(e.target.value)} 
                    />
                    
                    {selectedMethod?.methodType === "bank_transfer" && (
                      <Input label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
                    )}

                    {selectedMethod?.methodType === "cheque" && (
                      <Input label="Cheque Number" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} />
                    )}

                    {(selectedMethod?.methodType === "credit_card" || selectedMethod?.methodType === "debit_card") && (
                      <>
                        <Input label="Card Brand (e.g. Visa)" value={cardBrand} onChange={e => setCardBrand(e.target.value)} />
                        <Input label="Last 4 Digits" value={cardLast4} onChange={e => setCardLast4(e.target.value)} maxLength={4} />
                      </>
                    )}

                    {selectedMethod?.methodType === "wallet" && (
                      <Input label="Wallet Name" value={walletName} onChange={e => setWalletName(e.target.value)} />
                    )}
                  </div>
                )}

                {isMixed && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Transaction ID</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mixedRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-2">
                              <Select 
                                value={row.methodId} 
                                onChange={e => {
                                  const newRows = [...mixedRows];
                                  newRows[idx].methodId = e.target.value;
                                  setMixedRows(newRows);
                                }}
                                required
                              >
                                <option value="">Select Method</option>
                                {methods.filter(m => m.methodType !== 'mixed').map(m => (
                                  <option key={m.id} value={m.id}>{m.displayName}</option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-2 py-2">
                              <Input 
                                type="number"
                                value={row.amount} 
                                onChange={e => {
                                  const newRows = [...mixedRows];
                                  newRows[idx].amount = Number(e.target.value);
                                  setMixedRows(newRows);
                                }}
                                required
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input 
                                value={row.transactionId} 
                                onChange={e => {
                                  const newRows = [...mixedRows];
                                  newRows[idx].transactionId = e.target.value;
                                  setMixedRows(newRows);
                                }}
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Button 
                                type="button"
                                variant="ghost" 
                                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                onClick={() => setMixedRows(mixedRows.filter((_, i) => i !== idx))}
                                icon={<Trash2 className="w-4 h-4" />}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50">
                      <Button 
                        type="button"
                        variant="outline" 
                        
                        onClick={() => setMixedRows([...mixedRows, { methodId: "", amount: 0, transactionId: "" }])}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Add Payment Split
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Internal Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all resize-none"
                    rows={2}
                    placeholder="E.g., Adjusted against advance payment"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Attachment (Optional)</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:hover:border-slate-600 transition-colors relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-primary-600">Click to upload</span> receipt
                      </p>
                      {file && <p className="text-xs text-emerald-600 font-bold truncate max-w-[200px]">{file.name}</p>}
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" loading={loading} disabled={!selectedInvoiceId || !selectedMethodId}>
                Confirm Settlement
              </Button>
            </div>
          </>
        )}
      </form>
    </Dialog>
  );
}
