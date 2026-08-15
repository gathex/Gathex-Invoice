import { useState } from "react";
import { Payment } from "../../../types";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { useToast } from "../../ui/Toast";
import { Search, Download, Printer, CheckCircle2, DollarSign, Calendar, Landmark, CreditCard, ChevronDown } from "lucide-react";

export function PortalPayments({ payments, formatINR }: { payments: Payment[], formatINR: (v: number) => string }) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  const filteredPayments = payments.filter(pay => {
    return (
      pay.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pay.transactionId && pay.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case "upi": return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case "bank_transfer": return <Landmark className="w-4 h-4 text-amber-500" />;
      default: return <DollarSign className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "success": return "primary";
      case "processing": return "warning";
      case "failed": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Center</h2>
          <p className="text-xs sm:text-sm text-slate-500">Access payment receipts and transaction records.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-3.5 text-slate-400"><Search className="w-4 h-4" /></span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Invoice number or Transaction ID (UTR)..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment History List */}
        <div className={`${selectedReceipt ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
          <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
            {filteredPayments.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-sm">No payment records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Receipt ID</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Payment Date</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Invoice</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Method</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Settled Amount</th>
                      <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredPayments.map(pay => {
                      const payDate = pay.paymentDate?.toLocaleDateString ? pay.paymentDate.toLocaleDateString() : new Date(pay.paymentDate).toLocaleDateString();
                      
                      return (
                        <tr key={pay.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${selectedReceipt?.id === pay.id ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => setSelectedReceipt(pay)}>
                          <td className="p-4 font-mono font-bold text-indigo-600 text-xs uppercase">{pay.id.substring(0, 10)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{payDate}</td>
                          <td className="p-4 font-mono text-slate-500">{pay.invoiceNumber}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 capitalize text-slate-600 dark:text-slate-400">
                              {getMethodIcon(pay.paymentMethod)}
                              {pay.paymentMethod?.replace('_', ' ') || "UPI"}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-600">{formatINR(pay.amount)}</td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" icon={<ChevronDown className={`w-4 h-4 transition-transform ${selectedReceipt?.id === pay.id ? "rotate-180 text-indigo-500" : ""}`} />}>
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Selected Receipt Details Panel */}
        {selectedReceipt && (
          <div className="lg:col-span-5">
            <Card className="p-6 border-indigo-100 dark:border-slate-800 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full flex items-center justify-center pointer-events-none">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 translate-x-3 -translate-y-3" />
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <Badge variant="primary" className="mb-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">Receipt Verified</Badge>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Official Payment Receipt</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Receipt ID: {selectedReceipt.id.toUpperCase()}</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Date</span>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {selectedReceipt.paymentDate?.toLocaleDateString ? selectedReceipt.paymentDate.toLocaleDateString() : new Date(selectedReceipt.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Settled For</span>
                    <p className="font-mono font-bold text-indigo-600 mt-0.5">{selectedReceipt.invoiceNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Method Type</span>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5 capitalize flex items-center gap-1.5">
                      {getMethodIcon(selectedReceipt.paymentMethod)}
                      {selectedReceipt.paymentMethod?.replace('_', ' ') || "UPI"}
                    </p>
                  </div>
                  {selectedReceipt.transactionId && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Transaction ID / UTR</span>
                      <p className="font-mono text-slate-700 dark:text-slate-300 font-bold mt-0.5 truncate max-w-[150px]" title={selectedReceipt.transactionId}>
                        {selectedReceipt.transactionId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settle Details Summary */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">Billed Currency</span>
                  <span className="font-bold text-slate-900 dark:text-white">INR (Indian Rupee)</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs sm:text-sm">
                  <span className="text-slate-500 font-bold">Total Amount Settled</span>
                  <span className="text-lg font-black text-emerald-600">{formatINR(selectedReceipt.amount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => {
                    window.print();
                  }}
                >
                  Print
                </Button>
                <Button
                  variant="primary"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => {
                    toast.success("Receipt Download", "Generating premium PDF receipt...");
                  }}
                >
                  Download Receipt
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
