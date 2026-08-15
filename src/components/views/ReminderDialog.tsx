import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Invoice } from "../../types";
import { Mail, MessageSquare, Send, AlertTriangle } from "lucide-react";
import { useToast } from "../ui/Toast";

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function ReminderDialog({ isOpen, onClose, invoice }: ReminderDialogProps) {
  const toast = useToast();
  const [reminderType, setReminderType] = useState<"upcoming" | "today" | "overdue">("upcoming");
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!invoice) return null;

  const handleSend = () => {
    setIsSending(true);
    // Simulate sending
    setTimeout(() => {
      setIsSending(false);
      toast.success("Reminder Sent", `Payment reminder sent to ${(invoice.customerDetails?.name || (invoice as any).customerName)} via ${method.toUpperCase()}.`);
      onClose();
    }, 1000);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Send Payment Reminder" size="md">
      <div className="space-y-6 py-4">
        {/* Invoice Summary */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-900 dark:text-white">Invoice {invoice.invoiceNumber}</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              ₹{invoice.grandTotal?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            <p>Customer: <span className="font-medium text-slate-700 dark:text-slate-300">{(invoice.customerDetails?.name || (invoice as any).customerName)}</span></p>
            <p>Due Date: <span className="font-medium text-slate-700 dark:text-slate-300">{((invoice.dueDate instanceof Date) ? invoice.dueDate.toLocaleDateString() : (invoice as any).dueDate)}</span></p>
          </div>
        </div>

        {/* Reminder Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Reminder Type</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "upcoming", label: "Upcoming Due", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
              { id: "today", label: "Due Today", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
              { id: "overdue", label: "Overdue", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800" }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setReminderType(type.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  reminderType === type.id 
                    ? `${type.border} ${type.bg}` 
                    : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-transparent"
                }`}
              >
                <AlertTriangle className={`w-5 h-5 mb-1.5 ${reminderType === type.id ? type.color : "text-slate-400"}`} />
                <span className={`text-xs font-bold ${reminderType === type.id ? type.color : "text-slate-500"}`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Method */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Delivery Method</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod("email")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                method === "email"
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-bold">Email</span>
            </button>
            <button
              onClick={() => setMethod("sms")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                method === "sms"
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-bold">SMS</span>
            </button>
          </div>
        </div>

        {/* Custom Message */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Additional Message (Optional)</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a polite note to your customer..."
            className="w-full h-24 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            icon={<Send className="w-4 h-4" />} 
            onClick={handleSend}
            loading={isSending}
          >
            Send Reminder
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
