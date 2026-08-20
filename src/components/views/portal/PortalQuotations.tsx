import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../../supabase/config";
import { Quotation } from "../../../types";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { useToast } from "../../ui/Toast";
import { Search, Eye, ThumbsUp, ThumbsDown, Edit3, MessageSquare, Loader2, Calendar, FileText, ChevronRight } from "lucide-react";

export function PortalQuotations({ quotations, formatINR, onUpdate }: { quotations: Quotation[], formatINR: (v: number) => string, onUpdate: () => void }) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuo, setSelectedQuo] = useState<Quotation | null>(null);
  const [revisionModalQuo, setRevisionModalQuo] = useState<Quotation | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const filteredQuotations = quotations.filter(quo => {
    return quo.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStatusUpdate = async (quo: Quotation, newStatus: "accepted" | "rejected") => {
    try {
      setLoadingId(quo.id);
      await supabase
        .from('sales_documents')
        .update({ status: newStatus })
        .eq('id', quo.id);

      // Log Document Activity in Supabase
      await supabase.from('document_activities').insert({
        business_id: quo.businessId,
        owner_uid: quo.ownerUid,
        document_id: quo.id,
        document_type: "quotation",
        document_number: quo.quotationNumber,
        action: newStatus,
        description: `Quotation ${quo.quotationNumber} has been ${newStatus} by the customer.`,
        user_id: "customer-portal",
        user_name: quo.customerDetails?.name || "Customer"
      });

      toast.success("Quotation Updated", `You have successfully ${newStatus} the quotation.`);
      
      // Update local states if needed
      if (selectedQuo?.id === quo.id) {
        setSelectedQuo({ ...quo, status: newStatus });
      }

      onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update", err.message || "Could not update the quotation status.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalQuo || !revisionNotes.trim()) return;

    setRevisionSubmitting(true);
    try {
      await supabase.from('document_activities').insert({
        business_id: revisionModalQuo.businessId,
        owner_uid: revisionModalQuo.ownerUid,
        document_id: revisionModalQuo.id,
        document_type: "quotation",
        document_number: revisionModalQuo.quotationNumber,
        action: "updated",
        description: `Revision requested by customer: "${revisionNotes.trim()}"`,
        user_id: "customer-portal",
        user_name: revisionModalQuo.customerDetails.name
      });

      toast.success("Revision Requested", "Your revision feedback has been logged. Our sales representative will update you.");
      setRevisionModalQuo(null);
      setRevisionNotes("");
      onUpdate();
    } catch (err: any) {
      console.error("Error submitting revision:", err);
      toast.error("Request Failed", "Could not submit revision details.");
    } finally {
      setRevisionSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge variant="primary">Accepted</Badge>;
      case "rejected": return <Badge variant="danger">Rejected</Badge>;
      default: return <Badge variant="warning">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Quotations</h2>
          <p className="text-xs sm:text-sm text-slate-500">Review, approve, or request revisions on commercial offers.</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-3.5 top-3.5 text-slate-400"><Search className="w-4 h-4" /></span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by quotation number (e.g. QUO-002)..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quotations List */}
        <div className={`${selectedQuo ? "lg:col-span-6" : "lg:col-span-12"} space-y-3`}>
          <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
            {filteredQuotations.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-sm">No quotations found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Quotation No.</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Issue Date</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Expiry Date</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Total Amount</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                      <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredQuotations.map(quo => {
                      const issueStr = quo.issueDate?.toLocaleDateString ? quo.issueDate.toLocaleDateString() : new Date(quo.issueDate).toLocaleDateString();
                      const expiryStr = quo.expiryDate?.toLocaleDateString ? quo.expiryDate.toLocaleDateString() : new Date(quo.expiryDate).toLocaleDateString();
                      
                      return (
                        <tr key={quo.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${selectedQuo?.id === quo.id ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => setSelectedQuo(quo)}>
                          <td className="p-4 font-mono font-bold text-indigo-600">{quo.quotationNumber}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{issueStr}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{expiryStr}</td>
                          <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatINR(quo.grandTotal)}</td>
                          <td className="p-4">{getStatusBadge(quo.status)}</td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" icon={<ChevronRight className="w-4 h-4 text-slate-400" />} />
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

        {/* Selected Quotation Details Panel */}
        {selectedQuo && (
          <div className="lg:col-span-6">
            <Card className="p-6 border-indigo-100 dark:border-slate-800 shadow-md space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Commercial Quotation</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Ref: {selectedQuo.quotationNumber}</p>
                </div>
                <div>{getStatusBadge(selectedQuo.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Issue Date</p>
                  <p className="font-medium text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedQuo.issueDate?.toLocaleDateString ? selectedQuo.issueDate.toLocaleDateString() : new Date(selectedQuo.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Valid Until</p>
                  <p className="font-medium text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    {selectedQuo.expiryDate?.toLocaleDateString ? selectedQuo.expiryDate.toLocaleDateString() : new Date(selectedQuo.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Offered Items</p>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedQuo.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs sm:text-sm bg-slate-50/30 dark:bg-slate-900/10">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Qty: {item.quantity} {item.unit || "units"} @ {formatINR(item.price)}</p>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">{formatINR(item.quantity * item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial calculations */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatINR(selectedQuo.subTotal)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs sm:text-sm">
                  <span className="text-slate-500 font-bold">Grand Total (Incl Tax)</span>
                  <span className="text-lg font-black text-indigo-600">{formatINR(selectedQuo.grandTotal)}</span>
                </div>
              </div>

              {/* Interactive Accept / Reject Controls */}
              {(selectedQuo.status === "draft" || selectedQuo.status === "sent") && (
                <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    icon={<Edit3 className="w-3.5 h-3.5 text-indigo-500" />}
                    onClick={() => setRevisionModalQuo(selectedQuo)}
                  >
                    Request Revision
                  </Button>
                  <Button
                    variant="outline"
                    icon={<ThumbsDown className="w-3.5 h-3.5 text-rose-500" />}
                    onClick={() => handleStatusUpdate(selectedQuo, "rejected")}
                    disabled={loadingId === selectedQuo.id}
                  >
                    Reject Offer
                  </Button>
                  <Button
                    variant="primary"
                    icon={<ThumbsUp className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusUpdate(selectedQuo, "accepted")}
                    loading={loadingId === selectedQuo.id}
                  >
                    Approve & Sign
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Request Revision Dialog Modal */}
      <AnimatePresence>
        {revisionModalQuo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setRevisionModalQuo(null)} 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              transition={{ duration: 0.2 }}
              className="relative max-w-md w-full z-10"
            >
              <Card className="w-full p-6 border-slate-800 bg-slate-900 text-white space-y-6 shadow-2xl" hoverable={false}>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold tracking-tight flex items-center justify-center gap-1.5">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                Request Quotation Revision
              </h3>
              <p className="text-slate-400 text-xs">Outline your requested modifications (e.g. price change, extra items, etc.)</p>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Your Feedback / Notes</label>
                <textarea
                  required
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Can we request a 5% discount on line item 1? Or extend the valid until date by 14 days?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setRevisionModalQuo(null); setRevisionNotes(""); }} className="border-slate-800 text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={revisionSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
    </div>
  );
}
