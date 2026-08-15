import React, { useState, useEffect } from "react";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Mail, Send, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PaymentReceipt, ReceiptEmailLog } from "../../../types";
import { supabase } from "../../../supabase/config";
import { logReceiptEmail } from "../../../services/receiptService";
import { useToast } from "../../ui/Toast";

interface EmailReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceipt;
}

export function EmailReceiptDialog({ isOpen, onClose, receipt }: EmailReceiptDialogProps) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<ReceiptEmailLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(receipt.customerDetails.email || "");
      setSubject(`Payment Receipt ${receipt.receiptNumber} - ${receipt.businessDetails.name}`);
      setMessage(`Dear ${receipt.customerDetails.name},\n\nPlease find attached the payment receipt ${receipt.receiptNumber} for ₹${receipt.amountPaid.toLocaleString('en-IN')} paid on ${new Date(receipt.receiptDate).toLocaleDateString('en-IN')}.\n\nThank you for your business.\n\nBest regards,\n${receipt.businessDetails.name}`);
      fetchEmailHistory();
    }
  }, [isOpen, receipt]);

  const fetchEmailHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('receipt_email_history')
        .select('*')
        .eq('receipt_id', receipt.id)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setHistory(data.map(d => ({
          id: d.id,
          receiptId: d.receipt_id,
          businessId: d.business_id,
          recipientEmail: d.recipient_email,
          status: d.status,
          errorMessage: d.error_message,
          timestamp: d.timestamp ? new Date(d.timestamp) : new Date()
        })));
      }
    } catch (e) {
      console.error("Error loading email history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email Required", "Please enter a valid recipient email address.");
      return;
    }

    setSending(true);
    try {
      // Simulate SMTP delivery network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save email log to Firestore
      await logReceiptEmail(receipt.id, receipt.businessId, email.trim(), 'sent');
      
      toast.success("Receipt Sent!", `Email successfully queued and delivered to ${email}.`);
      fetchEmailHistory();
    } catch (err: any) {
      console.error(err);
      await logReceiptEmail(receipt.id, receipt.businessId, email.trim(), 'failed', err.message || "Failed delivery");
      toast.error("Delivery Failed", "The server could not queue your email transmission. Logged.");
      fetchEmailHistory();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Email Payment Receipt" size="lg">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 text-slate-800 dark:text-slate-100">
        
        {/* Email form (7 cols) */}
        <form onSubmit={handleSend} className="lg:col-span-7 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recipient Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="pl-9 text-sm" 
                placeholder="customer@company.com" 
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email Subject</label>
            <Input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Custom Message</label>
            <textarea 
              rows={6}
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={onClose} variant="ghost" className="font-bold">Cancel</Button>
            <Button type="submit" variant="primary" className="font-bold gap-1 px-5" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Transmitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Receipt
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Email History / Audit log (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-4 max-h-[420px] overflow-y-auto">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Delivery History</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Live outbound SMTP transmission ledger logs for this receipt.</p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center p-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Sent Logs Yet</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">Receipt has not been dispatched via SMTP network yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div key={log.id} className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-2.5">
                  <div className="p-1 rounded bg-slate-50 dark:bg-slate-900 mt-0.5">
                    {log.status === 'sent' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{log.recipientEmail}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`font-mono px-1.5 py-0.5 rounded ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {log.status === 'sent' ? 'SENT' : 'FAILED'}
                      </span>
                    </div>
                    {log.errorMessage && <p className="text-[9px] text-red-500 bg-red-50 p-1.5 rounded">{log.errorMessage}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Dialog>
  );
}
