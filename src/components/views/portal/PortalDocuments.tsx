import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/config";
import { useAuth } from "../../../context/AuthContext";
import { CreditNote, DebitNote, DeliveryChallan } from "../../../types";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { useToast } from "../../ui/Toast";
import { FileText, Download, Eye, Truck, ArrowUpRight, ArrowDownLeft, Loader2, Calendar } from "lucide-react";

export function PortalDocuments({ formatINR }: { formatINR: (v: number) => string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"challans" | "credit" | "debit">("challans");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('sales_documents')
          .select('*');

        const challanList: DeliveryChallan[] = [];
        const creditList: CreditNote[] = [];
        const debitList: DebitNote[] = [];

        (data || []).forEach(d => {
          const email = d.customer_details?.email;
          if (email && user.email && email.toLowerCase() === user.email.toLowerCase()) {
            const mapped = {
              id: d.id,
              businessId: d.business_id,
              ownerUid: d.owner_uid,
              challanNumber: d.doc_number,
              creditNoteNumber: d.doc_number,
              debitNoteNumber: d.doc_number,
              status: d.status,
              customerId: d.customer_id,
              customerDetails: d.customer_details || {},
              issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
              items: [],
              subTotal: Number(d.sub_total || 0),
              grandTotal: Number(d.grand_total || 0),
              notes: d.notes,
              createdAt: d.created_at ? new Date(d.created_at) : new Date()
            } as any;

            if (d.doc_type === 'delivery_challan') challanList.push(mapped);
            else if (d.doc_type === 'credit_note') creditList.push(mapped);
            else if (d.doc_type === 'debit_note') debitList.push(mapped);
          }
        });

        setDeliveryChallans(challanList);
        setCreditNotes(creditList);
        setDebitNotes(debitList);
      } catch (err) {
        console.error("Error fetching portal documents:", err);
        toast.error("Fetch Failed", "Could not load related business documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Business Documents</h2>
          <p className="text-xs sm:text-sm text-slate-500">Access related delivery challans and credit/debit notes.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 self-start">
          <button
            onClick={() => { setActiveSubTab("challans"); setSelectedDoc(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === "challans" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Truck className="w-3.5 h-3.5" />
            Challans ({deliveryChallans.length})
          </button>
          <button
            onClick={() => { setActiveSubTab("credit"); setSelectedDoc(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === "credit" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            Credit Notes ({creditNotes.length})
          </button>
          <button
            onClick={() => { setActiveSubTab("debit"); setSelectedDoc(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === "debit" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            Debit Notes ({debitNotes.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document List */}
        <div className={`${selectedDoc ? "lg:col-span-6" : "lg:col-span-12"} space-y-3`}>
          {activeSubTab === "challans" && (
            <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
              {deliveryChallans.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No delivery challans found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Challan No.</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                        <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {deliveryChallans.map(doc => (
                        <tr key={doc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => setSelectedDoc(doc)}>
                          <td className="p-4 font-mono font-bold text-indigo-600">{doc.challanNumber}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{doc.issueDate?.toLocaleDateString()}</td>
                          <td className="p-4">
                            <Badge variant={doc.status === "delivered" ? "primary" : doc.status === "dispatched" ? "warning" : "default"}>
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeSubTab === "credit" && (
            <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
              {creditNotes.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No credit notes found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Credit Note No.</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Reason</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {creditNotes.map(doc => (
                        <tr key={doc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => setSelectedDoc(doc)}>
                          <td className="p-4 font-mono font-bold text-emerald-600">{doc.creditNoteNumber}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{doc.issueDate?.toLocaleDateString()}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{doc.reason}</td>
                          <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatINR(doc.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeSubTab === "debit" && (
            <Card className="p-0 overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm">
              {debitNotes.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No debit notes found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Debit Note No.</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Reason</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {debitNotes.map(doc => (
                        <tr key={doc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => setSelectedDoc(doc)}>
                          <td className="p-4 font-mono font-bold text-rose-600">{doc.debitNoteNumber}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{doc.issueDate?.toLocaleDateString()}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{doc.reason}</td>
                          <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatINR(doc.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Selected Document Details Panel */}
        {selectedDoc && (
          <div className="lg:col-span-6">
            <Card className="p-6 border-indigo-100 dark:border-slate-800 shadow-md space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeSubTab === "challans" ? "Delivery Challan" : activeSubTab === "credit" ? "Credit Note" : "Debit Note"} Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedDoc.challanNumber || selectedDoc.creditNoteNumber || selectedDoc.debitNoteNumber}
                  </p>
                </div>
                <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={() => {
                  toast.success("Download Initialized", "Generating dynamic PDF copy...");
                }}>
                  PDF
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Issue Date</p>
                  <p className="font-medium text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedDoc.issueDate?.toLocaleDateString()}
                  </p>
                </div>
                {selectedDoc.invoiceNumber && (
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Linked Invoice</p>
                    <p className="font-mono font-bold text-indigo-600 mt-1">{selectedDoc.invoiceNumber}</p>
                  </div>
                )}
                {selectedDoc.vehicleDetails && (
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Dispatch Vehicle</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">{selectedDoc.vehicleDetails.vehicleNumber || "N/A"}</p>
                  </div>
                )}
                {selectedDoc.reason && (
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Adjustment Reason</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-1">{selectedDoc.reason}</p>
                  </div>
                )}
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Document Items</p>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDoc.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs sm:text-sm bg-slate-50/30 dark:bg-slate-900/10">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Qty: {item.quantity} {item.unit || "units"}</p>
                      </div>
                      {activeSubTab !== "challans" && (
                        <p className="font-bold text-slate-900 dark:text-white">{formatINR(item.quantity * item.price)}</p>
                      )}
                    </div>
                  ))}
                  {(!selectedDoc.items || selectedDoc.items.length === 0) && (
                    <p className="p-4 text-center text-xs text-slate-500">No individual line items detailed.</p>
                  )}
                </div>
              </div>

              {/* Grand Total for financial docs */}
              {activeSubTab !== "challans" && (
                <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase">Grand Total Adjustment</span>
                  <span className={`text-lg font-black ${activeSubTab === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatINR(selectedDoc.grandTotal)}
                  </span>
                </div>
              )}

              {selectedDoc.notes && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
                  <p className="text-slate-400 font-semibold uppercase text-[10px] mb-1">Remarks & Notes</p>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/20 dark:border-slate-800">
                    {selectedDoc.notes}
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
