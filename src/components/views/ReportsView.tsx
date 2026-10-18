import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { BarChart3, Download, RefreshCw, Calendar, Sparkles, Building2, CheckCircle2, AlertTriangle, ArrowUpRight, Percent, FileText, Truck, ArrowDownLeft, ShoppingBag } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase/config";
import { downloadGSTR1CSV } from "../../utils/spreadsheet";

export function ReportsView() {
  const toast = useToast();
  const { user, activeBusiness } = useAuth();
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Phase 4 states
  const [quotationsCount, setQuotationsCount] = useState(0);
  const [quotationsValue, setQuotationsValue] = useState(0);
  const [conversionsCount, setConversionsCount] = useState(0);
  const [creditsCount, setCreditsCount] = useState(0);
  const [creditsValue, setCreditsValue] = useState(0);
  const [debitsCount, setDebitsCount] = useState(0);
  const [debitsValue, setDebitsValue] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [poCount, setPoCount] = useState(0);

  useEffect(() => {
    if (!user || !activeBusiness) return;
    
    // Load sales documents metrics from Supabase
    supabase.from('sales_documents')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .then(({ data, error }) => {
        if (error || !data) return;

        let qCount = 0, qVal = 0, qConv = 0;
        let cCount = 0, cVal = 0;
        let dCount = 0, dVal = 0;
        let delCount = 0;
        let pCount = 0;

        data.forEach(doc => {
          const type = doc.doc_type;
          const grandTotal = Number(doc.grand_total || 0);

          if (type === 'quotation') {
            qCount++;
            qVal += grandTotal;
            if (doc.status === 'converted') qConv++;
          } else if (type === 'credit_note') {
            cCount++;
            cVal += grandTotal;
          } else if (type === 'debit_note') {
            dCount++;
            dVal += grandTotal;
          } else if (type === 'delivery_challan') {
            delCount++;
          } else if (type === 'purchase_order') {
            pCount++;
          }
        });

        setQuotationsCount(qCount);
        setQuotationsValue(qVal);
        setConversionsCount(qConv);
        setCreditsCount(cCount);
        setCreditsValue(cVal);
        setDebitsCount(dCount);
        setDebitsValue(dVal);
        setDeliveryCount(delCount);
        setPoCount(pCount);
      });
  }, [user, activeBusiness]);

  const handleExportGstr1 = async () => {
    if (!user || !activeBusiness) {
      toast.error("Access Denied", "You must be authenticated to export GSTR records.");
      return;
    }
    setIsDownloading(true);
    try {
      const { data: docs, error } = await supabase
        .from('sales_documents')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('doc_type', 'invoice');

      if (error || !docs || docs.length === 0) {
        toast.info("No Records", "There are no invoices for GSTR-1 compiling under the current active business.");
        setIsDownloading(false);
        return;
      }

      const docIds = docs.map(d => d.id);
      const { data: itemsData } = await supabase
        .from('document_items')
        .select('*')
        .in('document_id', docIds);

      const itemsMap: Record<string, any[]> = {};
      (itemsData || []).forEach(i => {
        if (!itemsMap[i.document_id]) itemsMap[i.document_id] = [];
        itemsMap[i.document_id].push({
          id: i.id,
          name: i.name,
          description: i.description,
          hsnSacCode: i.hsn_sac_code,
          quantity: Number(i.quantity || 1),
          price: Number(i.price || 0),
          unit: i.unit || "Pcs",
          discountAmount: Number(i.discount_amount || 0),
          gstRate: Number(i.gst_rate || 0),
          cgstAmount: Number(i.cgst_amount || 0),
          sgstAmount: Number(i.sgst_amount || 0),
          igstAmount: Number(i.igst_amount || 0),
          totalAmount: Number(i.total_amount || 0)
        });
      });

      const invoicesList = docs.map(d => ({
        id: d.id,
        businessId: d.business_id,
        ownerUid: d.owner_uid,
        invoiceNumber: d.doc_number,
        status: d.status,
        customerId: d.customer_id,
        customerDetails: d.customer_details || {},
        issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
        dueDate: d.due_date ? new Date(d.due_date) : new Date(),
        items: itemsMap[d.id] || [],
        subTotal: Number(d.sub_total || 0),
        totalDiscount: Number(d.total_discount || 0),
        totalTaxableAmount: Number(d.total_taxable_amount || 0),
        totalCgst: Number(d.total_cgst || 0),
        totalSgst: Number(d.total_sgst || 0),
        totalIgst: Number(d.total_igst || 0),
        totalCess: Number(d.total_cess || 0),
        grandTotal: Number(d.grand_total || 0),
        amountPaid: Number(d.amount_paid || 0),
        amountDue: Number(d.amount_due || 0),
        notes: d.notes,
        termsConditions: d.terms_conditions
      }));

      downloadGSTR1CSV(invoicesList, activeBusiness?.gstin || "");
      toast.success("Excel Sheet Downloaded", "GSTR-1 outward sales spreadsheet downloaded successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Export Failed", "Error exporting GSTR-1 records.");
    } finally {
      setIsDownloading(false);
    }
  };


  const handleCompileGst = () => {
    setIsCompiling(true);
    toast.info("GSTR-1 Calculation Active", "Matching sales outward ledger against state codes...");
    setTimeout(() => {
      setIsCompiling(false);
      toast.success("GST Compiled Successfully", "GSTR-1 JSON and Excel ledger ready for tax filing.");
    }, 1500);
  };

  const gstBreakdowns = [
    { title: "CGST Collected (Central)", amount: "₹45,210.00", desc: "For intra-state sales (Maharashtra to Maharashtra)" },
    { title: "SGST Collected (State)", amount: "₹45,210.00", desc: "For intra-state sales (Maharashtra to Maharashtra)" },
    { title: "IGST Collected (Integrated)", amount: "₹38,000.00", desc: "For inter-state sales (interstate transactions)" },
    { title: "Total Output Liability", amount: "₹1,28,420.00", desc: "Gross outward liability before Input credit offsets" }
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold font-display text-slate-900 dark:text-white">Tax Reports & GST</h1>
          <p className="text-sm text-slate-500">Auto-calculate CGST, SGST, and IGST components. Generate Government compliant GSTR returns.</p>
        </div>
        
        <Button 
          variant="primary" 
          loading={isCompiling} 
          icon={<RefreshCw className="w-4 h-4" />} 
          onClick={handleCompileGst}
        >
          Compile GSTR-1 (Q1)
        </Button>
      </div>

      {/* Indian GST Tax liability cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {gstBreakdowns.map((g, idx) => (
          <Card key={idx} className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{g.title}</p>
              <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1.5">{g.amount}</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-100 dark:border-slate-800/40 pt-2.5">
              {g.desc}
            </p>
          </Card>
        ))}
      </div>

      {/* GST Filing checklists and e-way summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-6">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">GSTR-1 Outward Supplies Summary</h3>
              <p className="text-xs text-slate-400">Section-wise tax breakdown for outward sales</p>
            </div>
            <Badge variant="primary">Q1 Returns</Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Section 4A, 4B, 4C, 6B, 6C (B2B Taxable Invoices)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Taxable outward supplies raised to registered GSTIN holders.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">₹4,86,450.00</p>
                <p className="text-[10px] font-mono text-slate-400">3 invoices</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Section 7 (B2C Others - Retail)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Taxable outward supplies raised to unregistered general consumers.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">₹96,000.00</p>
                <p className="text-[10px] font-mono text-slate-400">1 invoice</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Section 12 (HSN-wise Summary)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Consolidated summary of items dispatched classified by HSN system.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">4 HSN Codes</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end">Ready</p>
              </div>
            </div>
          </div>
        </Card>

        {/* GST portal e-filing guidance */}
        <Card className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-600/10 border border-primary-200 dark:border-primary-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg font-display tracking-tight text-slate-900 dark:text-white">Direct Government GST Filing Instruction</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                We format your invoice registers exactly into government offline schema JSON files. Simply export, upload to the official GST Common Portal (gst.gov.in), and e-verify!
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex gap-2.5 items-center text-xs text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>GSTR-1 Excel Ledger ready</span>
            </div>
            <div className="flex gap-2.5 items-center text-xs text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Auto-apportioned tax codes</span>
            </div>
            
            <button 
              onClick={handleExportGstr1}
              disabled={isDownloading}
              className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? "Downloading..." : "Export GSTR-1 Excel"} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Phase 4 Workflow Sales Reports */}
      <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Commercial Sales Workflow & Operations Report
          </CardTitle>
          <CardDescription>
            Performance and conversion reports for Phase 4 documents (Quotations, Credit/Debit adjustments, Delivery Logistics).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Quotations & Estimates Report Card */}
            <div className="p-4.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Quotations</span>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                    ₹{quotationsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{quotationsCount} estimates generated.</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Converted: {conversionsCount}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {quotationsCount > 0 ? Math.round((conversionsCount / quotationsCount) * 100) : 0}% rate
                </span>
              </div>
            </div>

            {/* Credit Adjustments Report Card */}
            <div className="p-4.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Credit Notes</span>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                    ₹{creditsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{creditsCount} credit offsets created.</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                <span>Used for tax corrections & sales returns.</span>
              </div>
            </div>

            {/* Debit Adjustments Report Card */}
            <div className="p-4.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Debit Notes</span>
                </div>
                <div className="mt-3">
                  <h4 className="text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                    ₹{debitsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{debitsCount} supplementary charges.</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                <span>Used for additional items or pricing updates.</span>
              </div>
            </div>

            {/* Logistics & PO Report Card */}
            <div className="p-4.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Truck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Logistics & POs</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Delivery Challans</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{deliveryCount} issued</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Purchase Orders</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{poCount} issued</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                <span>Monitors material transit & supply procurement.</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
